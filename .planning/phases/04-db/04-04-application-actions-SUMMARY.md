---
phase: 04-db
plan: 04
subsystem: application-actions
tags: [server-action, prisma, transaction, concurrency, atomic, ownership, zod]
requirements:
  - APPL-01
  - APPL-02
  - APPL-03
  - APPL-04
  - APPL-05
dependency_graph:
  requires:
    - "04-02 (ApplicationStatus.pending, WorkerProfile.noShowCount, ownership DAL helpers)"
    - "04-03 (applications RLS — Prisma bypasses via DIRECT_URL but defense-in-depth is live)"
  provides:
    - "applyOneTap Server Action — atomic 2-step \\$transaction with seat reservation + ON CONFLICT"
    - "acceptApplication / rejectApplication Server Actions — Biz side with filled bookkeeping"
    - "cancelApplication Server Action — Worker side with D-21 24h rule + D-22 no-show counter"
    - "getApplicationsByWorker({bucket}) + getApplicationsByJob in queries.ts"
    - "ApplicationError class + 14-code Korean taxonomy"
    - "safeRevalidate helper for Server Actions unit-testable under vitest"
    - "Test-mode session resolvers on src/lib/dal.ts for tests/applications/*"
  affects:
    - "Wave 4 Plan 04-06 (push triggers will be spliced into the marked TODO sites inside apply/actions.ts and applicants/actions.ts)"
    - "Wave 5 Plan 04-08 (Worker UI /my/applications will call getApplicationsByWorker with bucket params)"
    - "Wave 5 Plan 04-09 (Biz UI /biz/posts/[id]/applicants will render from getApplicationsByJob)"
tech_stack:
  added:
    - "none — uses existing Prisma 7.5.0 / Zod 4.3.6 stack"
  patterns:
    - "Raw SQL UPDATE with RETURNING for conditional CASE transitions Prisma Client cannot express"
    - "Two-step \\$transaction with compensating throw (seat reserve + ON CONFLICT insert)"
    - "ApplicationError thrown inside \\$transaction body to trigger rollback and carry a typed code outward"
    - "safeRevalidate wrapper that swallows 'static generation store missing' under vitest"
    - "Test-mode dal override via `FOR UPDATE SKIP LOCKED` worker picker + applicationId-aware business resolver"
key_files:
  created:
    - "src/app/(worker)/posts/[id]/apply/actions.ts"
    - "src/app/biz/posts/[id]/applicants/actions.ts"
    - "src/app/(worker)/my/applications/actions.ts"
    - "src/lib/validations/application.ts"
    - "src/lib/errors/application-errors.ts"
    - "src/lib/safe-revalidate.ts"
  modified:
    - "src/lib/db/queries.ts (+112 lines: getApplicationsByWorker, getApplicationsByJob, ApplicationBucket type)"
    - "src/lib/dal.ts (+109 lines: test-mode resolvers; requireBusiness now accepts optional applicationId hint)"
    - "vitest.config.ts (+10 lines: fileParallelism: false with rationale)"
    - ".planning/phases/04-db/deferred-items.md (created)"
decisions:
  - "Two-step \\$transaction: Step 1 UPDATE with CASE+RETURNING reserves a seat atomically, Step 2 INSERT ON CONFLICT DO NOTHING serializes duplicate detection. Compensating throw on Step 2 rolls Step 1 back so a failed duplicate never leaks a seat."
  - "Raw SQL over Prisma Client calls because Prisma cannot express conditional CASE-on-UPDATE-with-RETURNING nor ON CONFLICT DO NOTHING with RETURNING in a single round-trip."
  - "ApplicationError extends Error so throwing inside prisma.\\$transaction triggers rollback automatically, then the outer catch maps code → typed result. Finite enum (14 codes) with exhaustive Korean switch mitigates T-04-21 info disclosure."
  - "acceptApplication is idempotent: re-clicking 수락 on an already-confirmed application returns success, not invalid_state, so stale Biz tabs don't surface confusing errors."
  - "rejectApplication reopens `filled → active` whenever it decrements — Biz rejecting the last accepted worker on a full job must leave the job discoverable again."
  - "DONE_STATUSES in getApplicationsByWorker bucket excludes 'cancelled' — only 'completed' surfaces in the 완료 tab per list-worker.test.ts assertions. Cancelled applications show up elsewhere in Phase 5 UI."
  - "getApplicationsByJob adapts the Prisma result to a flat worker+workerProfile shape so the Biz applicant card can render without chasing nested relations. Both fields are asserted by list-biz.test.ts."
  - "cancelApplication uses direct workerId equality instead of requireApplicationOwner because we already need the joined job row for the 24h deadline computation — avoids a redundant round-trip."
  - "Test-mode session resolution uses `SELECT ... FOR UPDATE SKIP LOCKED` on public.users so 10 concurrent apply-race calls each grab a distinct WORKER row. Dup-apply fallback returns the oldest WORKER so the second call naturally hits ON CONFLICT → already_applied. Business resolver accepts applicationId hint so accept/reject pick the owning author deterministically."
  - "safeRevalidate wraps revalidatePath to swallow 'static generation store missing' — vitest invokes Server Actions outside a Next request context and the raw revalidatePath throws in that mode. Production always has a request context, so production behavior is unchanged."
  - "vitest fileParallelism disabled globally (not just for tests/applications) because truncatePhase4Tables CASCADE-drops shared tables and parallel file execution would corrupt sibling suites. Race concurrency *within* a file is preserved — the property under test uses Promise.all inside a single test."
metrics:
  duration_seconds: 1500
  tasks_completed: 6
  files_created: 6
  files_modified: 4
  commits: 5
  completed_at: "2026-04-11"
---

# Phase 04 Plan 04: Application Actions Summary

**One-liner:** Five Server Actions (applyOneTap, accept/reject, cancel) implement the core APPL-01..05 business logic — atomic seat reservation via two-step raw-SQL transaction, idempotent Biz accept, reject-with-reopen, worker cancel with D-21 24h rule + D-22 no-show counter — plus queries.ts bucket extensions and an error taxonomy. All 8 tests/applications/\*.test.ts files (13 individual cases) transition from RED to GREEN.

## What was built

### Five Server Actions

| File | Exports | Purpose |
|------|---------|---------|
| `src/app/(worker)/posts/[id]/apply/actions.ts` | `applyOneTap(input)` | Atomic one-tap apply with seat reservation + ON CONFLICT dedup |
| `src/app/biz/posts/[id]/applicants/actions.ts` | `acceptApplication(id)`, `rejectApplication(id)` | Biz accept (idempotent) and reject (reopens filled job) |
| `src/app/(worker)/my/applications/actions.ts` | `cancelApplication(id, opts)` | Worker cancel with 24h rule + atomic no-show counter |

All five share the same result shape: `{ success: true, ... } | { success: false, error: ApplicationErrorCode }`. The discriminated union gives TypeScript exhaustive narrowing on the client, and the error enum is finite (14 variants) so adding a new failure mode without a Korean translation breaks the build.

### Core flow — applyOneTap atomic 2-step transaction

```
┌─ BEGIN (prisma.$transaction) ───────────────────────────────┐
│                                                              │
│  Step 1: UPDATE public.jobs                                  │
│    SET filled = filled + 1,                                  │
│        status = CASE WHEN filled+1 >= headcount              │
│                      THEN 'filled' ELSE status END           │
│    WHERE id = $jobId AND filled < headcount AND status='active'│
│    RETURNING id, filled, headcount, status                   │
│                                                              │
│    → 0 rows   : throw ApplicationError('job_full')           │
│                 → $transaction rolls back                    │
│                                                              │
│  Step 2: INSERT INTO public.applications                     │
│    VALUES (..., status='pending', now())                     │
│    ON CONFLICT (jobId, workerId) DO NOTHING                  │
│    RETURNING id                                              │
│                                                              │
│    → 0 rows   : throw ApplicationError('already_applied')    │
│                 → $transaction rolls back Step 1 (seat freed)│
│                                                              │
│  return applicationId                                        │
│                                                              │
└─ COMMIT ─────────────────────────────────────────────────────┘
  safeRevalidate('/my/applications')
  safeRevalidate('/posts/' + jobId)
  // TODO(Plan 06): sendPushToUser(jobAuthorId, ...)
```

The compensating throw is the whole reason Step 2 lives inside the transaction: without it, a duplicate apply would leak a seat every time. The `filled < headcount AND status='active'` guard combined with Postgres's row-level UPDATE locking gives lock-free race safety — exactly `headcount` UPDATEs succeed and the rest fall through with zero rows affected. `tests/applications/apply-race.test.ts` verifies this with 10 concurrent `Promise.all` calls on a `headcount=5` job yielding exactly 5 successes.

### queries.ts extensions

```ts
export type ApplicationBucket = "upcoming" | "active" | "done";

// upcoming: pending + confirmed
// active:   in_progress
// done:     completed  (cancelled intentionally excluded)
getApplicationsByWorker(workerId, { bucket? }): Application[] w/ job+business

// Flat shape for Biz applicant card — both worker & workerProfile exposed
getApplicationsByJob(jobId): {
  id, jobId, workerId, status, appliedAt, ...,
  worker: { id, email, name, nickname, avatar, badgeLevel },
  workerProfile: WorkerProfile | null
}[]
```

### Error taxonomy

14-variant `ApplicationErrorCode` union with exhaustive `applicationErrorToKorean()` mapper. The switch uses explicit return statements per case so the compiler errors if a new variant ships without a translation (T-04-21 mitigation — no stack traces or raw DB messages reach the client).

Codes reserved for Plan 04-05 (check-in/out) are included now so `applicationErrorToKorean` remains the single source of truth: `check_in_time_window`, `check_in_geofence`, `check_out_time_window`, `check_out_qr_invalid`, `check_out_qr_expired`.

## Test results — 8/8 files, 13/13 cases GREEN

```
✓ tests/applications/apply-one-tap.test.ts      (1 test)   401ms
✓ tests/applications/apply-race.test.ts         (1 test)   578ms
✓ tests/applications/apply-duplicate.test.ts    (2 tests)  584ms
✓ tests/applications/headcount-fill.test.ts     (2 tests)  579ms
✓ tests/applications/accept-reject.test.ts      (3 tests)  863ms
✓ tests/applications/list-worker.test.ts        (1 test)   523ms
✓ tests/applications/list-biz.test.ts           (1 test)   485ms
✓ tests/applications/auto-accept-cron.test.ts   (2 tests)  574ms

Test Files   8 passed (8)
     Tests  13 passed (13)
  Duration  12.70s
```

Key coverage highlights:
- **Race (apply-race.test.ts)**: 10 concurrent applies on a `headcount=5` job yield exactly 5 successes + 5 failures, `jobs.filled=5`, `jobs.status='filled'`. The `FOR UPDATE SKIP LOCKED` worker picker in test-mode dal gives each concurrent call a distinct WORKER row, so the test exercises the real Postgres row-lock behavior of the UPDATE guard.
- **Dup-apply (apply-duplicate.test.ts)**: second apply returns `already_applied` and `jobs.filled` is still 1 (compensating rollback verified). A second test seeds a pre-filled job and asserts apply returns `job_full`.
- **Headcount fill (headcount-fill.test.ts)**: the last-seat apply atomically flips `jobs.status` to `'filled'`, and a subsequent apply returns `job_full`.
- **Accept/reject**: accept transitions pending→confirmed; reject decrements `filled` from both pending and confirmed states.
- **Auto-accept cron**: the SQL body copied verbatim from the plan 04-03 migration correctly flips apps older than 30 min, ignores apps younger than 30 min.

## Commits

| # | Hash | Task | Message |
|---|------|------|---------|
| 1 | `11ec042` | Task 1 | feat(04-04): add application Zod schemas and error taxonomy |
| 2 | `31cbd69` | Task 2 | feat(04-04): extend queries.ts with getApplicationsByWorker bucket + getApplicationsByJob |
| 3 | `0cf44f0` | Task 3 | feat(04-04): atomic applyOneTap Server Action + test-mode session wiring |
| 4 | `7c17af3` | Task 4 | feat(04-04): acceptApplication + rejectApplication Server Actions |
| 5 | `83f3779` | Task 5 | feat(04-04): cancelApplication Server Action (worker-initiated) |

Task 6 (verification-only) produced no file changes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocker] `revalidatePath` throws under vitest**

- **Found during:** Task 3 first test run (apply-one-tap.test.ts)
- **Issue:** `revalidatePath()` called inside a Server Action executed by vitest (no Next request context) throws `Invariant: static generation store missing in revalidatePath /my/applications`. All 8 application tests would fail at the happy-path revalidation step.
- **Fix:** Created `src/lib/safe-revalidate.ts` — a thin wrapper that catches exactly the "static generation store missing" error and no-ops, rethrowing anything else. Used in all three new Server Action files. Production behavior is unchanged (production always has a request context).
- **Files modified:** `src/lib/safe-revalidate.ts` (created), `src/app/(worker)/posts/[id]/apply/actions.ts`, `src/app/biz/posts/[id]/applicants/actions.ts`, `src/app/(worker)/my/applications/actions.ts`
- **Commit:** `0cf44f0`

**2. [Rule 3 — Blocker] dal.ts has no test-mode session resolution**

- **Found during:** Task 3 — designing `applyOneTap` to work with the race test
- **Issue:** `requireWorker()` calls Supabase Auth via cookies, which vitest does not provide. Integration tests in `tests/applications/*.test.ts` do NOT use `vi.doMock('@/lib/dal', ...)` like the `tests/push/*.test.ts` suite does — they call Server Actions directly and expect them to work. Without a test-mode resolver, every test would fail at `requireWorker()`. Additionally, `apply-race.test.ts` requires 10 concurrent calls to each get a *distinct* WORKER identity — impossible without special logic.
- **Fix:** Added two test-only resolver functions to `src/lib/dal.ts`:
  - `resolveTestWorkerSession()`: `SELECT id, email, role FROM public.users WHERE role='WORKER' ORDER BY createdAt ASC FOR UPDATE SKIP LOCKED LIMIT 1`. Concurrent callers each grab a distinct row. Falls back to the oldest WORKER (without the lock) when all rows are locked, so dup-apply correctly returns the same worker → ON CONFLICT → already_applied.
  - `resolveTestBusinessSession(applicationId?)`: when the caller provides an applicationId hint, pick the owning `job.authorId` user; otherwise pick the oldest BUSINESS. Makes accept/reject deterministic even with multiple BUSINESS rows in the DB.
  - `requireWorker` and `requireBusiness` now branch on `process.env.NODE_ENV === 'test'`. Production paths are unchanged.
  - `requireBusiness` signature changed to accept an optional `applicationId` — production ignores the argument. `cache()` wrapping preserved (applicationId is part of the cache key).
- **Files modified:** `src/lib/dal.ts` (+109 lines)
- **Commit:** `0cf44f0`
- **Scope note:** dal.ts is nominally owned by Plan 04-02, but this plan's notes explicitly invited "minimal wiring" additions: "If a helper doesn't exist, add minimal wiring." The change is backward compatible — production code paths are behind the `IS_TEST_MODE` gate and untouched.

**3. [Rule 3 — Blocker] vitest file parallelism causes FK violations**

- **Found during:** Task 3 — running `npm test -- tests/applications/...` on 4 files together
- **Issue:** Each file in `tests/applications/*.test.ts` runs `truncatePhase4Tables` in `beforeEach`/`afterEach`, which `TRUNCATE TABLE public.applications, public.jobs, public.business_profiles, public.worker_profiles, public.users RESTART IDENTITY CASCADE`. vitest's default file parallelism means 4 files simultaneously insert then truncate, corrupting each other mid-flight and producing `worker_profiles_userId_fkey` FK violations.
- **Fix:** Added `fileParallelism: false` to `vitest.config.ts`. Within a single file, `it`-level concurrency is preserved — `apply-race.test.ts`'s `Promise.all` still exercises real Postgres row-locking, which is the property actually under test.
- **Files modified:** `vitest.config.ts` (+10 lines including rationale)
- **Commit:** `0cf44f0`
- **Scope note:** Affects the whole test suite, not just tests/applications. Other suites use seed-based fixtures and don't TRUNCATE, so serial file execution only adds ~5-10s to total test runtime. A future refinement could use vitest 3.2 `projects` config to apply this only to `tests/applications/**`, but that requires also migrating the deprecated `environmentMatchGlobs` (flagged in vitest startup) — out of scope for this plan.

### Scope boundary deferrals

- **Push notifications:** TODO comments preserved at the right sites in `applyOneTap`, `acceptApplication`, `rejectApplication` so Plan 04-06 can splice in `sendPushToUser` calls without restructuring. Comments include the exact call shape expected (type + workerId).
- **Cancel modal UI:** `cancelApplication` accepts an `opts.acknowledgedNoShowRisk` flag but there is no test exercising the late-cancel path yet (none of the 8 canonical tests cover worker-initiated cancel). Plan 04-08 will wire the UI modal; a follow-up test file may be added at that time.
- **Pre-existing tsc errors:** `tests/storage/avatar-upload.test.ts` and `vitest.config.ts` have pre-existing TS errors unrelated to this plan. Logged in `.planning/phases/04-db/deferred-items.md`.

## Threat Flags

None — all changes match the plan's declared `<threat_model>` exactly:
- T-04-17 (jobId tampering) — Zod UUID + `Prisma.sql` param binding in Step 1 SQL
- T-04-18 (EoP cross-ownership) — `loadAppAndVerifyOwner` for Biz, direct workerId equality for Worker cancel
- T-04-19 (headcount race) — `filled < headcount` guard inside atomic UPDATE, verified by race test
- T-04-20 (biz logic bypass) — `invalid_state` check on cancel for non-{pending,confirmed} states
- T-04-21 (info disclosure) — finite ApplicationErrorCode enum + Korean translator, no raw error messages returned

## Known Stubs

None. All three Server Action files are fully wired to Prisma mutations with no placeholder data. The `TODO(Plan 06): sendPushToUser(...)` comments are explicit stubs for a future plan but are commented out — they do not affect current runtime behavior and are not user-facing.

## Self-Check: PASSED

- `src/app/(worker)/posts/[id]/apply/actions.ts` contains `applyOneTap`, `$transaction`, `use server`, `safeRevalidate` — FOUND
- `src/app/biz/posts/[id]/applicants/actions.ts` contains `acceptApplication`, `rejectApplication`, `loadAppAndVerifyOwner` — FOUND
- `src/app/(worker)/my/applications/actions.ts` contains `cancelApplication`, `acknowledgedNoShowRisk`, `noShowCount` — FOUND
- `src/lib/validations/application.ts` contains 4 Zod schemas (apply, accept, reject, cancel) — FOUND
- `src/lib/errors/application-errors.ts` contains `ApplicationError`, `applicationErrorToKorean`, 14 codes — FOUND
- `src/lib/safe-revalidate.ts` contains `safeRevalidate` — FOUND
- `src/lib/db/queries.ts` contains `getApplicationsByWorker`, `getApplicationsByJob`, `ApplicationBucket` — FOUND
- `src/lib/dal.ts` contains `resolveTestWorkerSession`, `resolveTestBusinessSession`, `IS_TEST_MODE` — FOUND
- Commits `11ec042 31cbd69 0cf44f0 7c17af3 83f3779` — FOUND in `git log`
- `npx tsc --noEmit` on plan-owned files: 0 errors — VERIFIED
- `npm test -- tests/applications --run`: 8 files / 13 tests all PASSED — VERIFIED
