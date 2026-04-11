---
phase: "05"
plan: "01"
subsystem: tests
tags: [wave-0, red-tests, fixtures, tdd, reviews, settlements, mock-removal]
dependency_graph:
  requires: [04-10-SUMMARY.md]
  provides: [RED test contracts for Plans 02-06]
  affects: [tests/reviews, tests/settlements, tests/exit, tests/fixtures/phase5]
tech_stack:
  added: []
  patterns: [red-green-refactor, fixture-factory, describe.skipIf, it.todo]
key_files:
  created:
    - tests/fixtures/phase5/index.ts
    - tests/fixtures/phase5/settlements.ts
    - tests/fixtures/phase5/reviews.ts
    - tests/reviews/create-worker-to-biz.test.ts
    - tests/reviews/create-biz-to-worker.test.ts
    - tests/reviews/uniqueness.test.ts
    - tests/reviews/aggregate.test.ts
    - tests/settlements/checkout-settled-transition.test.ts
    - tests/settlements/biz-history.test.ts
    - tests/settlements/worker-aggregates.test.ts
    - tests/exit/mock-removal.test.ts
  modified:
    - .planning/phases/05-reviews-settlements/05-VALIDATION.md
decisions:
  - Wave 0 fixtures use status='completed' (not 'settled') because the enum value doesn't exist until Plan 02
  - checkout-settled-transition uses it.todo() pattern (not real RED it()) to avoid Prisma enum validation error before Plan 02 schema push
  - phase5 fixtures receive prisma as parameter for application.create but delegate user/job creation to Phase 4 factories (which use global @/lib/db singleton)
metrics:
  duration_minutes: ~25
  completed_date: "2026-04-11"
  tasks_completed: 3
  tasks_total: 3
  files_created: 12
  files_modified: 1
---

# Phase 05 Plan 01: Wave 0 RED Test Scaffolding Summary

**One-liner:** Phase 5 Wave 0 RED test foundation — 11 files (8 test files + 3 fixture files) establishing executable contracts for REV-01..04, SETL-01..03, DATA-05 that downstream Plans 02-06 must turn GREEN.

---

## What Was Built

### Task 1: Phase 5 Fixture Factories (`bdcc29b`)

Three files under `tests/fixtures/phase5/`:

- **`index.ts`** — barrel export re-exporting `createSettledApplication`, `createReviewableApplication`, `truncatePhase5Tables` (aliased from Phase 4), `createTestWorker`, `createTestBusiness`, `createTestJob`
- **`settlements.ts`** — `createSettledApplication(prisma, opts?)` creates worker + business + job + application with `status='completed'` (Wave 0 coupling: `'settled'` enum value added in Plan 02, factory updated in Plan 04); `createReviewableApplication(prisma, opts?)` wraps the same with optional `checkOutAt` override
- **`reviews.ts`** — placeholder with `PHASE5_REVIEW_FIXTURES_VERSION = 1` (reserved for future seedReviewRow helpers)

Wave 0 coupling documented in file header comment: status literal must be updated in Plan 04 after Plan 02 pushes the enum.

### Task 2: REV-01..04 RED Tests (`de54426`)

Four files under `tests/reviews/`:

| File | Cases | RED Mechanism |
|------|-------|---------------|
| `create-worker-to-biz.test.ts` | 3 (happy path, not_settled guard, reviewGiven flag) | `Cannot find module @/app/(worker)/my/applications/[id]/review/actions` |
| `create-biz-to-worker.test.ts` | 2 (happy path, ownership failure) | `Cannot find module @/app/biz/posts/[id]/applicants/[applicantId]/review/actions` |
| `uniqueness.test.ts` | 2 (already_reviewed, opposite direction ok) | same module error |
| `aggregate.test.ts` | 3 (count=0 edge, weighted avg, concurrent Promise.all) | same module error |

All 4 files use `describe.skipIf(!process.env.DATABASE_URL)` and `@ts-expect-error` on action imports. 10 total test cases, all RED on module resolution.

### Task 3: SETL-01..03 + DATA-05 RED Tests + VALIDATION.md (`b6cbd49` + `0f4f2af`)

Four test files:

| File | Cases | RED Mechanism |
|------|-------|---------------|
| `checkout-settled-transition.test.ts` | 2 `it.todo()` stubs | todo markers — enum `'settled'` not in schema yet |
| `biz-history.test.ts` | 2 (isolation, nested relations) | `Cannot find module @/lib/db/queries` — `getBizSettlements` |
| `worker-aggregates.test.ts` | 3 (all-time total, KST April in-month, KST May boundary) | `Cannot find module @/lib/db/queries` — `getWorkerSettlementTotals` |
| `mock-removal.test.ts` | 3 (file absent, grep 0, seed detached) | `src/lib/mock-data.ts` still exists → all 3 fail |

**KST boundary literals present:** `'2026-04-30T14:59:59.999Z'` (April 30 23:59 KST) and `'2026-04-30T15:00:01Z'` (May 1 00:00 KST).

**VALIDATION.md updated:**
- `wave_0_complete: false` → `true`
- Per-Task Verification Map: 9 task-ID rows (added `05-03-04`, `05-04-03`)
- File Exists column updated to `✅ created W0` for all Plan 01 files
- Wave 0 Requirements checklist: all 9 items checked
- Wave 0 Completion Evidence section added

---

## Vitest RED State Evidence

```
tests/reviews/        — 4 files FAIL (Cannot find module on action imports)
tests/settlements/    — 3 files FAIL (Cannot find module on query imports + todo markers)
tests/exit/           — 1 file FAIL (src/lib/mock-data.ts still exists, seed still imports it)
```

All failures are expected RED state (Wave 0 design). No production code written in this plan.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Phase 4 factory signature mismatch**
- **Found during:** Task 1
- **Issue:** Plan's code snippet showed `createTestWorker(prisma)` and `createTestBusiness(prisma)` but Phase 4 factories use global `@/lib/db` singleton and accept `opts` (not `prisma`) as first arg. `createTestBusiness()` returns `{ user, profile }` not `{ user, businessProfile }`.
- **Fix:** settlements.ts uses `createTestWorker()` and `const { user: bizUser, profile: bizProfile } = await createTestBusiness()` — aligned with actual Phase 4 signatures. Return shape uses `{ business: { user: bizUser, businessProfile: bizProfile } }` for compatibility with test expectations.
- **Files modified:** `tests/fixtures/phase5/settlements.ts`
- **Commit:** `bdcc29b`

**2. [Rule 3 - Blocking] Edit tool wrote to main repo path instead of worktree path**
- **Found during:** Task 3
- **Issue:** VALIDATION.md edits went to `C:\Users\TG\Desktop\Njobplatform\.planning\...` (main repo) instead of worktree path `C:\Users\TG\Desktop\Njobplatform\.claude\worktrees\agent-ae1fb904\.planning\...`
- **Fix:** Re-applied all VALIDATION.md changes to worktree path using Write tool with correct absolute path; committed from worktree.
- **Files modified:** `.planning/phases/05-reviews-settlements/05-VALIDATION.md`
- **Commit:** `0f4f2af`

---

## Commits

| Hash | Message |
|------|---------|
| `bdcc29b` | feat(05-01): add Phase 5 Wave 0 fixture factories |
| `de54426` | test(05-01): add REV-01..04 RED test scaffolds (Wave 0) |
| `b6cbd49` | test(05-01): add SETL-01..03 + DATA-05 RED tests + finalize VALIDATION.md |
| `0f4f2af` | docs(05-01): finalize VALIDATION.md Wave 0 — wave_0_complete=true, 9+ task-ID rows, completion evidence |

---

## Known Stubs

None — this plan creates test scaffolding only. No production code, no UI stubs.

---

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| `tests/fixtures/phase5/index.ts` exists | FOUND |
| `tests/fixtures/phase5/settlements.ts` exists | FOUND |
| `tests/fixtures/phase5/reviews.ts` exists | FOUND |
| `tests/reviews/create-worker-to-biz.test.ts` exists | FOUND |
| `tests/reviews/create-biz-to-worker.test.ts` exists | FOUND |
| `tests/reviews/uniqueness.test.ts` exists | FOUND |
| `tests/reviews/aggregate.test.ts` exists | FOUND |
| `tests/settlements/checkout-settled-transition.test.ts` exists | FOUND |
| `tests/settlements/biz-history.test.ts` exists | FOUND |
| `tests/settlements/worker-aggregates.test.ts` exists | FOUND |
| `tests/exit/mock-removal.test.ts` exists | FOUND |
| commit `bdcc29b` exists | FOUND |
| commit `de54426` exists | FOUND |
| commit `b6cbd49` exists | FOUND |
| commit `0f4f2af` exists | FOUND |
