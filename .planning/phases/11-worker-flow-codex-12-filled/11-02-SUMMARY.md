---
phase: 11-worker-flow-codex-12-filled
plan: "02"
subsystem: database
tags: [prisma, postgresql, worker, applications, earnings, aggregation]

# Dependency graph
requires:
  - phase: 11-worker-flow-codex-12-filled
    provides: "Phase 11 plan 01 — preceding plan in same phase"
provides:
  - "getCurrentWorker() returning real noShowCount from WorkerProfile"
  - "getCurrentWorker() aggregating totalEarnings and thisMonthEarnings from settled/completed applications via raw SQL"
  - "My page recentCompleted filter includes settled applications"
  - "My page 전체 보기 link pointing to /my/applications?tab=done"
  - "ApplicationsClient STATUS_CONFIG and AppRow union safe for legacy checked_in status rows"
affects: [settlements, worker-my-page, applications-client]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Raw SQL aggregation via prisma.$queryRaw for earnings that lack ORM-level columns"
    - "Exhaustive STATUS_CONFIG Record keyed on AppRow status union to avoid runtime crash on unknown statuses"

key-files:
  created: []
  modified:
    - src/lib/db/queries.ts
    - src/app/(worker)/my/page.tsx
    - src/app/(worker)/my/applications/applications-client.tsx

key-decisions:
  - "Use prisma.$queryRaw with date_trunc('month', ... AT TIME ZONE 'Asia/Seoul') to compute thisMonthEarnings at DB level rather than filtering in application code"
  - "Filter on both settled and completed statuses for earnings aggregation — consistent with how recentCompleted filter was also fixed"
  - "checked_in maps to same pill style as in_progress (bg-surface-2 text-ink) since it represents an active/in-progress state"

patterns-established:
  - "Earnings aggregation: always SUM(netEarnings) not earnings — net is what the worker receives after commission"

requirements-completed: [BUG-W04, BUG-W05, BUG-W06, BUG-W08]

# Metrics
duration: 8min
completed: 2026-04-21
---

# Phase 11 Plan 02: Worker My Page Bug Fixes Summary

**Fixed 4 Codex audit bugs: real DB earnings aggregation in getCurrentWorker, settled apps in recent completed, correct tab=done link, and checked_in crash guard in ApplicationsClient**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-21T13:30:00Z
- **Completed:** 2026-04-21T13:33:56Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `getCurrentWorker()` now reads `noShowCount` from `WorkerProfile.noShowCount` (was hardcoded `0`)
- `getCurrentWorker()` now computes `totalEarnings` and `thisMonthEarnings` via `prisma.$queryRaw` `SUM("netEarnings")` on settled/completed applications (was hardcoded `0`)
- My page `recentCompleted` filter includes `status === "settled"` in addition to `"completed"` — settled applications were invisible before
- "전체 보기" link corrected from `?tab=completed` (non-existent tab) to `?tab=done`
- `AppRow.status` union in `ApplicationsClient` extended with `"checked_in"` to prevent runtime crash when `STATUS_CONFIG[app.status]` was `undefined` for legacy DB rows

## Task Commits

1. **Task 1: Fix getCurrentWorker DB aggregation** - `5b3ef2e` (fix)
2. **Task 2: Fix My page filter, link, and STATUS_CONFIG** - `f794d30` (fix)

## Files Created/Modified

- `src/lib/db/queries.ts` - Added raw SQL earnings aggregation query; noShowCount reads from profile
- `src/app/(worker)/my/page.tsx` - recentCompleted filter includes settled; 전체 보기 link fixed to tab=done
- `src/app/(worker)/my/applications/applications-client.tsx` - checked_in added to AppRow union, STATUS_CONFIG, and statusPillClasses switch

## Decisions Made

- Used `prisma.$queryRaw` matching the pattern already established in `getWorkerSettlementTotals` in the same file — consistent aggregation approach
- Earnings aggregated on `netEarnings` (post-commission amount) per BUG-W08 context: "totalEarnings는 Settlement.netEarnings SUM"
- Monthly boundary computed at DB level with `date_trunc('month', ... AT TIME ZONE 'Asia/Seoul')` to avoid timezone drift in server-side JS

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors exist in `tests/` files (stale `@ts-expect-error` directives) and `src/app/(worker)/search/page.tsx` (prop mismatch). None of the 3 modified files have TypeScript errors. These are out-of-scope pre-existing issues not introduced by this plan.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- BUG-W04, W05, W06, W08 resolved; Plan 03 can proceed with settlements page net-vs-gross display fix
- No blockers

---
*Phase: 11-worker-flow-codex-12-filled*
*Completed: 2026-04-21*
