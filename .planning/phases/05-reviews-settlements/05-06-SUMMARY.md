---
phase: 05-reviews-settlements
plan: "06"
subsystem: mock-removal
tags: [data, exit-gate, cleanup, seed]
dependency_graph:
  requires: [05-03, 05-04, 05-05]
  provides: [DATA-05]
  affects: [prisma/seed.ts, src/lib/types/job.ts, src/lib/job-utils.ts]
tech_stack:
  added: []
  patterns: [seed-data extraction, pure Node.js fs scan for CI assertion]
key_files:
  created:
    - prisma/seed-data.ts
    - tests/exit/mock-removal.test.ts
  modified:
    - prisma/seed.ts
    - src/lib/types/job.ts
    - src/lib/job-utils.ts
    - src/app/(worker)/posts/[id]/apply/apply-confirm-flow.tsx
  deleted:
    - src/lib/mock-data.ts
decisions:
  - "Option B (separate prisma/seed-data.ts) chosen over inline — keeps seed.ts under 400 lines and clearly separates fixture data from orchestration logic"
  - "Exit gate test uses pure Node.js fs recursion instead of execSync grep — Windows path handling in git-bash produces exit code 255, not 1, making grep-based assertions unreliable cross-platform"
  - "Past-job application fixtures changed from 'completed' to 'settled' in seed-data.ts per Plan 02 ApplicationStatus enum alignment"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-11"
  tasks_completed: 2
  files_changed: 7
requirements: [DATA-05]
---

# Phase 5 Plan 06: Mock Removal Exit Gate Summary

**One-liner:** Atomic deletion of src/lib/mock-data.ts — prisma/seed.ts detached to self-contained seed-data.ts, Mock* aliases stripped, DATA-05 exit gate test 3/3 GREEN.

## What Was Built

Phase 5 exit criterion satisfied: `src/lib/mock-data.ts` deleted with zero remaining import references in `src/`. The seed script is now fully self-contained inside `prisma/`.

## Task Summary

### Task 1: Detach prisma/seed.ts (commit `04529e6`)

**Approach:** Option B — extracted to `prisma/seed-data.ts` (separate sibling file).

- Created `prisma/seed-data.ts` with self-contained type aliases (`SeedBusiness`, `SeedJob`, `SeedApplication`, `SeedWorker`) and the 4 data constants (`MOCK_BUSINESSES`, `MOCK_JOBS`, `MOCK_APPLICATIONS`, `MOCK_CURRENT_WORKER`)
- Updated `prisma/seed.ts` import from `"../src/lib/mock-data"` → `"./seed-data"`
- Changed `mockApp.status` cast to include `"settled"` (Phase 5 alignment)
- Past-job application fixtures (`app-past-1`, `app-past-2`, `app-past-3`) status changed from `"completed"` → `"settled"`
- Result: `grep "mock-data" prisma/seed.ts` → 0 matches

### Task 2: Delete + clean (commit `6e94385`)

- Deleted `src/lib/mock-data.ts` via `git rm`
- Removed Backward-compat aliases section from `src/lib/types/job.ts` (`MockJob`, `MockApplication`, `MockWorker`, `MockBusiness`, `MockReview`, `MockBizApplicant` — 6 type aliases)
- Updated `src/lib/types/job.ts` header comment — removed "copied from mock-data.ts" reference
- Updated `src/lib/job-utils.ts` header comment — removed "Copied from mock-data.ts so that seed.ts keeps working" line
- Fixed `apply-confirm-flow.tsx`: `MockJob` import → `Job` (Rule 2 — pre-existing consumer of now-deleted alias)
- Created `tests/exit/mock-removal.test.ts` — 3-assertion DATA-05 exit gate

## Exit Gate Test Evidence

```
✓ DATA-05 exit gate: mock-data.ts permanently removed
  ✓ src/lib/mock-data.ts does not exist (ENOENT)              2ms
  ✓ no src/ file imports from @/lib/mock-data or relative mock-data path  30ms
  ✓ prisma/seed.ts does not import from ../src/lib/mock-data   1ms

Test Files  1 passed (1)
Tests       3 passed (3)
Duration    562ms
```

## Test Suite Before/After

| Metric | Before Plan 06 | After Plan 06 |
|--------|---------------|---------------|
| Test files passing | 10/35 | 10/35 (+1 exit gate) |
| Tests passing | 51 | 54 (+3 exit gate) |
| Failing files | 16 (pre-existing Prisma runtime issue) | 16 (same pre-existing) |

The 16 failing test files are pre-existing deferred issues documented in STATE.md Known Risks — `@prisma/client/runtime/client` Vite resolution failure affecting tests that import from `src/lib/db/index.ts`. Not caused by Plan 06.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing fix] apply-confirm-flow.tsx used MockJob alias**
- **Found during:** Task 2 pre-flight Mock* alias scan
- **Issue:** `src/app/(worker)/posts/[id]/apply/apply-confirm-flow.tsx` imported `MockJob` from `@/lib/types/job` — a consumer of the alias being deleted
- **Fix:** Changed import and prop type from `MockJob` to `Job` (the canonical underlying type)
- **Files modified:** `src/app/(worker)/posts/[id]/apply/apply-confirm-flow.tsx`
- **Commit:** `6e94385`

**2. [Rule 1 - Bug] execSync grep exit code 255 on Windows**
- **Found during:** Task 2 exit gate test run
- **Issue:** `execSync` with `grep` and Windows absolute paths (e.g., `C:\Users\...`) returns exit code 255 in git-bash, not 1 (no matches). The test was incorrectly asserting `exitCode === 1`
- **Fix:** Replaced `execSync` + grep with pure Node.js `fs.readdir` recursive scan + `RegExp.test()` — cross-platform and deterministic
- **Files modified:** `tests/exit/mock-removal.test.ts`
- **Commit:** `6e94385`

## Verification Checklist

- [x] `src/lib/mock-data.ts` does not exist
- [x] `grep -rn "from.*mock-data" src/` returns 0 matches
- [x] `grep -rn "MockJob|MockApplication|..." src/` returns 0 matches (aliases gone)
- [x] `prisma/seed-data.ts` exists with `MOCK_BUSINESSES`, `MOCK_JOBS`, `MOCK_APPLICATIONS`, `MOCK_CURRENT_WORKER`
- [x] `prisma/seed.ts` imports from `./seed-data` (zero `src/lib/mock-data` references)
- [x] `tests/exit/mock-removal.test.ts` → 3/3 passed
- [x] Full vitest suite: no regressions from Plan 06 work (pre-existing failures unchanged)
- [x] 2 atomic commits with `--no-verify`

## Known Stubs

None — this plan performs pure deletion and cleanup. No UI rendering or data flow stubs introduced.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced. Deletion only.

## Self-Check: PASSED

- `prisma/seed-data.ts` exists: FOUND
- `tests/exit/mock-removal.test.ts` exists: FOUND
- `src/lib/mock-data.ts` absent: CONFIRMED (ENOENT)
- Commit `04529e6` exists: FOUND
- Commit `6e94385` exists: FOUND
