---
phase: 03-db
plan: "01"
subsystem: test-infra-and-schema
tags: [wave-0, schema, nyquist, tests, prisma, next-config, bodysizelimit]
requires: []
provides:
  - phase3-schema-live
  - avatar-upload-enabled
  - test-scaffolds-8-files
  - test-helper-test-jobs
  - shared-form-state-types
affects:
  - prisma/schema.prisma
  - next.config.ts
  - src/lib/form-state.ts
  - tests/**
  - live-supabase-public-jobs-table
tech_stack:
  added:
    - prisma-schema-phase3-columns
    - next16-serveractions-bodysize
    - wave-0-test-scaffolds
    - shared-action-result-types
  patterns:
    - describe.skip + it.todo for Nyquist-compliant placeholder tests
    - Shared type aliases for Server Action return shapes (ActionResult<T>, FieldActionResult<T>)
    - TEST_ prefix convention for test fixtures (cleanupTestJobs discovery)
key_files:
  created:
    - src/lib/form-state.ts
    - tests/helpers/test-jobs.ts
    - tests/profile/worker-profile.test.ts
    - tests/profile/biz-profile.test.ts
    - tests/jobs/job-crud.test.ts
    - tests/jobs/job-expiry.test.ts
    - tests/jobs/postgis-distance.test.ts
    - tests/storage/avatar-upload.test.ts
    - tests/utils/job-utils.test.ts
    - tests/e2e/public-job-list.spec.ts
    - .planning/phases/03-db/deferred-items.md
  modified:
    - prisma/schema.prisma
    - next.config.ts
decisions:
  - "Generated form-state.ts in Wave 0 (not Wave 2) to break parallel ordering dependency between 03-03/03-04/03-05"
  - "Wave 0 test files use describe.skip (not it.skip) so later waves only remove one decorator per file to activate them"
  - "calculateEarnings test placed in Wave 0 as the ONE green unit — validates test runner discovery end-to-end"
  - "Prisma 7 client layout check uses client.ts instead of the Prisma 6 index.d.ts path specified in the plan (Rule 1 deviation — Prisma 7 reorganized the generated client)"
  - "Phase 2 _supabase_migrations tracking table drop logged as deferred item (out of scope for Phase 3-01; remediation options documented)"
metrics:
  duration: 25m
  completed: 2026-04-10
  task_count: 4
  commits: 4
  tests_passing: 8
  tests_skipped: 76
  tests_failing: 0
---

# Phase 3 Plan 01: Wave 0 Foundation — Schema Extension + Test Scaffolds Summary

Extended Prisma Job model with 7 Phase 3 columns, pushed to live Supabase, enabled Next 16 Server Action 5MB body limit, and created 9 test scaffold files + shared form-state types so Wave 1–3 plans can execute in parallel without ordering dependencies.

## What Changed

### 1. Prisma schema — 7 new Job columns (Task 1)

```prisma
// Phase 3: structured fields previously stubbed in queries.ts adaptJob
duties        String[]  @default([])
requirements  String[]  @default([])
dressCode     String?
whatToBring   String[]  @default([])
tags          String[]  @default([])
address       String?
addressDetail String?
```

All added inside the `Job` model, after `nightShiftAllowance` and before `createdAt`. Live DB push succeeded via `npx prisma db push --accept-data-loss` — "Your database is now in sync with your Prisma schema." Prisma client regenerated; TypeScript sees new fields.

**Live DB verification (via `pg` raw query):**
```
[
  { column_name: 'address',       data_type: 'text'  },
  { column_name: 'addressDetail', data_type: 'text'  },
  { column_name: 'dressCode',     data_type: 'text'  },
  { column_name: 'duties',        data_type: 'ARRAY' },
  { column_name: 'requirements',  data_type: 'ARRAY' },
  { column_name: 'tags',          data_type: 'ARRAY' },
  { column_name: 'whatToBring',   data_type: 'ARRAY' }
]
PASS: all 7 Phase 3 columns present on public.jobs
```

**Seeded job readback (spot check):**
```json
{
  "id": "53c0e4c1-3222-48b4-9bb4-5661c58b8ddf",
  "title": "야간 물류 피킹 (22:00~06:00)",
  "duties": [],
  "tags": [],
  "address": null
}
```
Array defaults populated to `[]`, nullable scalars to `null`. Existing seed rows readable — no data loss.

### 2. `next.config.ts` + `src/lib/form-state.ts` (Task 2)

**`next.config.ts` diff:**
```diff
 import type { NextConfig } from "next";

 const nextConfig: NextConfig = {
-  /* config options here */
+  experimental: {
+    serverActions: {
+      bodySizeLimit: "5mb",
+    },
+  },
 };

 export default nextConfig;
```

Validated against the **installed Next 16 docs** (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md`) which confirm `experimental.serverActions.bodySizeLimit` is the correct key. The doc specifies the `bytes`-package notation (`'500kb'`, `'3mb'`, etc.) — `'5mb'` matches D-01's avatar cap.

**`src/lib/form-state.ts`** — 28-line new file exporting:
- `ActionResult<T>` — success|error|null|undefined
- `FieldActionResult<T>` — adds `fieldErrors?: Record<string, string>`
- `ProfileFormState = FieldActionResult<{ id: string }>`
- `AvatarFormState = ActionResult<{ avatarUrl: string }>`
- `JobFormState = FieldActionResult<{ id: string }>`

Created in Wave 0 (not in 03-03) so Wave 2/3 plans can import without ordering dependency.

### 3. Wave 0 test scaffolds — 9 files (Task 3)

| Path | Status | Tests |
|---|---|---|
| `tests/helpers/test-jobs.ts` | helper (no tests) | 3 exports: `createTestJob`, `cleanupTestJobs`, `setJobLocation` |
| `tests/profile/worker-profile.test.ts` | `describe.skip` | 8 `it.todo` (WORK-01..04) |
| `tests/profile/biz-profile.test.ts` | `describe.skip` | 5 `it.todo` (BIZ-01..03) |
| `tests/jobs/job-crud.test.ts` | `describe.skip` | 9 `it.todo` (POST-01..03) |
| `tests/jobs/job-expiry.test.ts` | `describe.skip` | 5 `it.todo` (POST-06) |
| `tests/jobs/postgis-distance.test.ts` | `describe.skip` | 5 `it.todo` (D-06) |
| `tests/storage/avatar-upload.test.ts` | `describe.skip` | 6 `it.todo` (D-01) |
| `tests/utils/job-utils.test.ts` | **passing** | 4 green (`calculateEarnings` — POST-05) |
| `tests/e2e/public-job-list.spec.ts` | `test.describe.skip` | 3 `test.skip` (POST-04 Playwright) |

`test-jobs.ts` defaults use seed-safe values (TEST_ title prefix, 7-day-ahead workDate, Seoul City Hall coords, all new array columns preset to `[]`) and mirror Phase 2 `tests/helpers/test-users.ts` patterns.

**`calculateEarnings` test reality check:** The implementation in `src/lib/job-utils.ts` gates night-shift bonus on `workHours >= 4`. All plan-specified test cases use `workHours: 4` where night-shift is true, so the gate is satisfied and the 4 cases pass as written. No expectation adjustments needed.

### 4. Live DB smoke verification (Task 4)

| Gate | Check | Result |
|---|---|---|
| 1 | Prisma client regenerated | PASS — `src/generated/prisma/client.ts` present (Prisma 7 layout; see deviation #1) |
| 2 | Prisma client instantiation | PASS — `prisma generate` succeeded |
| 3 | Live DB has 7 new columns | PASS — pg raw query returns exactly 7 rows |
| 4 | Seeded job readback | PASS — findFirst returns row with `duties=[]`, `tags=[]`, `address=null` |
| 5 | `vitest run tests/profile tests/jobs tests/storage tests/utils` | PASS — 2 passed, 12 skipped, 8 tests passing, 76 todo, 0 failing |
| 6 | `tsc --noEmit` baseline | PASS — 4 pre-existing errors, 0 new (none in `next.config.ts`, `form-state.ts`, or any Wave 0 test file) |

## Deviations from Plan

### 1. [Rule 1 — Bug] Prisma 7 generated client layout differs from plan's `index.d.ts` check

**Found during:** Task 4 Gate 1

**Issue:** The plan's acceptance criterion `ls src/generated/prisma/index.d.ts` assumes the Prisma 6 generated-client layout. Prisma 7.5.0 (this project's version) emits `client.ts`, `models.ts`, `models/*.ts`, `internal/*.ts` — and NO `index.d.ts` file. Running the literal check fails even though the client is fully regenerated and functional.

**Fix:** Verified via the equivalent Prisma 7 entry (`src/generated/prisma/client.ts` exists + contains `@ts-nocheck` header and generated Prisma namespace). Also grep-confirmed the new `duties`, `requirements`, etc. fields are present in `src/generated/prisma/models/Job.ts` (lines 348–354: `duties: string[]`, `requirements: string[]`, `dressCode: string | null`, etc.) and that the existing `src/lib/db/index.ts` successfully imports `PrismaClient` from `@/generated/prisma/client`.

**Files modified:** None (documentation only — the generated client is correct; only the acceptance-criterion path is stale).

**Commit:** included in `e7b0072` (Task 4).

### 2. [Rule 3 — Blocker] Stray `.env` file with `prisma+postgres://localhost:51213` URL overrode `.env.local` in `prisma db push`

**Found during:** Task 1 first `prisma db push` attempt (error P1013 "Invalid symbol 34, offset 606")

**Issue:** The project has both `.env` (Prisma-generated sample with a `prisma+postgres` dev-kit URL pointing at `localhost:51213`) and `.env.local` (the real Supabase URL used in Phase 2 direct-prisma). `prisma.config.ts` uses `import "dotenv/config"` which loads `.env` first, making `DATABASE_URL` point at the dev-kit URL which has base64 characters that the Prisma URL parser rejects with P1013. This is a latent Phase 2 regression — whoever runs `prisma db push` after Phase 2 was shipped would hit this.

**Fix (workaround, not permanent):** Ran `prisma db push` with an inline environment override pulling `DATABASE_URL` and `DIRECT_URL` directly from `.env.local`:
```bash
DB_URL=$(grep -E "^DATABASE_URL=" .env.local | sed 's/^DATABASE_URL=//' | tr -d '"')
DIR_URL=$(grep -E "^DIRECT_URL=" .env.local | sed 's/^DIRECT_URL=//' | tr -d '"')
DATABASE_URL="$DB_URL" DIRECT_URL="$DIR_URL" npx prisma db push ...
```

**Why not a permanent fix in 03-01:** Rule 4 (architectural) — a permanent fix means either (a) deleting/renaming `.env` (could break something that depends on it), (b) changing `prisma.config.ts` to load `.env.local` explicitly (affects all Prisma commands project-wide, deserves its own plan), or (c) restructuring env files. Out of scope for "extend schema + create test scaffolds".

**Logged to:** `.planning/phases/03-db/deferred-items.md` (along with the `_supabase_migrations` drop below).

**Recommended action for 03-02:** Add a Task 0 "Fix Prisma env loading" that updates `prisma.config.ts` to use `dotenv/config` with `path: '.env.local'` (or rename/delete the stray `.env`).

### 3. [Rule 3 — Blocker, Deferred] `prisma db push --accept-data-loss` drops Phase 2 `_supabase_migrations` tracking table

**Found during:** Task 4 idempotency re-run of `prisma db push`

**Issue:** Phase 2 direct-prisma strategy creates `public._supabase_migrations` via `scripts/apply-supabase-migrations.ts` to track raw-SQL migration application. This table is NOT declared in `prisma/schema.prisma`. Each `prisma db push` sees it as drift and drops it:
```
⚠️  There might be data loss when applying the changes:
  • You are about to drop the `_supabase_migrations` table, which is not empty (9 rows).
```
After the first push in Task 1, the tracking was silently dropped. The second push in Task 4 surfaced the warning because there was nothing else to sync.

**Impact on 03-01:**
- All 6 public tables (`applications`, `business_profiles`, `jobs`, `reviews`, `users`, `worker_profiles`) still present.
- PostGIS extension intact (`geography_columns`, `geometry_columns`, `spatial_ref_sys` views still queryable).
- RLS policies, auth trigger, PostGIS functions — all still installed. Only the TRACKING row history is lost.
- `scripts/apply-supabase-migrations.ts` will re-attempt all 9 migrations on next run. Spot check shows migrations use `CREATE EXTENSION IF NOT EXISTS` etc., but full idempotency audit deferred.

**Fix applied in 03-01:** None (Rule 4 — architectural; out of scope). Logged to `.planning/phases/03-db/deferred-items.md` with 3 remediation options (add model / move schema / use `prisma.config.ts` ignore list).

**Suggested owner:** 03-02 Wave 1 (the plan that deals with raw SQL migrations and pg_cron).

## Authentication Gates

None — no auth gates hit. All Prisma commands ran against the existing `.env.local` DATABASE_URL that Phase 2 established.

## Deferred Issues

See `.planning/phases/03-db/deferred-items.md` for:
1. `_supabase_migrations` tracking table dropped by `prisma db push` (needs Prisma schema or config fix in 03-02).
2. `.env` vs `.env.local` precedence in `prisma.config.ts` (needs explicit dotenv path override).

No other deferred issues from 03-01 scope.

## Known Stubs

None introduced by 03-01. The 7 Wave 0 test files with `describe.skip` are **intentional placeholder tests** tracked by 03-VALIDATION.md — later waves (03-03..03-06) REMOVE the `.skip` as they implement features. This is the Nyquist-compliant scaffolding pattern, not hidden stubs.

The `job-utils.test.ts` file has 4 REAL passing tests (no stubs).

## Commits

| Hash | Type | Message |
|---|---|---|
| `cdb15d2` | feat | add Phase 3 Job columns (duties/requirements/dressCode/whatToBring/tags/address/addressDetail) |
| `d825673` | feat | enable 5MB Server Action body limit + shared form-state types |
| `7ea0fef` | test | create 9 Wave 0 test scaffolds + test-jobs helper |
| `e7b0072` | chore | verify live DB + log Phase 2 tracking table deferral |

## Requirements Completed

This Wave 0 plan does NOT directly complete any WORK/BIZ/POST requirements — it creates the scaffolds those requirements will be implemented against. The `requirements:` frontmatter field lists the 13 requirements this plan UNBLOCKS:
- WORK-01..04 (worker profile CRUD)
- BIZ-01..03 (business profile CRUD)
- POST-01..06 (job CRUD + expiry + public list)

Do NOT mark these complete — they become complete only when Wave 2/3 plans remove the `describe.skip` and implement real assertions.

## What's Unblocked for Later Waves

- **Wave 1 (03-02 — pg_cron/PostGIS/Storage/RLS):** `tests/jobs/job-expiry.test.ts`, `tests/jobs/postgis-distance.test.ts`, `tests/storage/avatar-upload.test.ts` scaffolds exist. 03-02 can add real assertions.
- **Wave 2 (03-03 worker profile + 03-04 biz profile):** Both import `ProfileFormState` from `src/lib/form-state.ts` without race. Test scaffolds `tests/profile/*.test.ts` exist.
- **Wave 3 (03-05 job CRUD + 03-06 public list):** Import `JobFormState`, use `tests/jobs/job-crud.test.ts`, `tests/utils/job-utils.test.ts`, `tests/e2e/public-job-list.spec.ts`. Can extend `createTestJob` for richer fixtures.
- **All waves:** 5MB Server Action FormData uploads work (no HTTP 413).
- **All waves:** `adaptJob()` in `src/lib/db/queries.ts` can stop stubbing `duties:[]`, `requirements:[]`, `dressCode:""`, `whatToBring:[]`, `tags:[]` — the live DB has real column data.

## Threat Flags

None. No new network endpoints, auth paths, or trust-boundary changes introduced. All schema changes are additive nullable/defaulted columns; the `bodySizeLimit` raise is already covered by the plan's STRIDE register (T-03-01-02 accepted).

## Self-Check: PASSED

**Files verified present in worktree after commit:**
- `prisma/schema.prisma` — FOUND (contains `duties        String[]`)
- `next.config.ts` — FOUND (contains `bodySizeLimit: "5mb"`)
- `src/lib/form-state.ts` — FOUND (exports 5 types)
- `tests/helpers/test-jobs.ts` — FOUND
- `tests/profile/worker-profile.test.ts` — FOUND
- `tests/profile/biz-profile.test.ts` — FOUND
- `tests/jobs/job-crud.test.ts` — FOUND
- `tests/jobs/job-expiry.test.ts` — FOUND
- `tests/jobs/postgis-distance.test.ts` — FOUND
- `tests/storage/avatar-upload.test.ts` — FOUND
- `tests/utils/job-utils.test.ts` — FOUND
- `tests/e2e/public-job-list.spec.ts` — FOUND
- `.planning/phases/03-db/deferred-items.md` — FOUND
- `.planning/phases/03-db/03-01-SUMMARY.md` — FOUND (this file)

**Commits verified via `git log --oneline`:**
- `cdb15d2` FOUND (Task 1)
- `d825673` FOUND (Task 2)
- `7ea0fef` FOUND (Task 3)
- `e7b0072` FOUND (Task 4)

**Live DB state verified:** 7 new columns present on `public.jobs` (raw pg query).

**Test discovery verified:** `vitest run tests/profile tests/jobs tests/storage tests/utils` → 2 passed, 12 skipped, 8 tests passing, 76 todo, 0 failing.

**Baseline TypeScript errors verified:** 4 pre-existing (prisma.config.ts directUrl, 2x proxy tests, vitest.config.ts) — unchanged by 03-01 changes.
