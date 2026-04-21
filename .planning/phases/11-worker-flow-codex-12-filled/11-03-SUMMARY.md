---
phase: 11
plan: 03
subsystem: worker-flow
tags: [bug-fix, earnings, settlement, auth, cleanup]
dependency_graph:
  requires: []
  provides: [net-earnings-display, auth-bootstrap, dead-route-removal]
  affects: [check-in-flow, settlements-page, role-select, favorites]
tech_stack:
  added: []
  patterns: [prisma-upsert-guard, snapshotNet-threading]
key_files:
  created: []
  modified:
    - src/app/(worker)/my/applications/[id]/check-in/actions.ts
    - src/app/(worker)/my/applications/[id]/check-in/check-in-flow.tsx
    - src/app/(worker)/my/settlements/page.tsx
    - src/lib/db/queries.ts
    - src/app/(worker)/my/favorites/page.tsx
    - src/app/(auth)/role-select/actions.ts
  deleted:
    - src/app/(worker)/posts/new/page.tsx
decisions:
  - "Thread snapshotNet out of prisma.$transaction by declaring variable before the block and assigning inside — avoids leaking Prisma internals to the return type"
  - "Use (s as any).netEarnings fallback in settlements page for backward-compat with legacy rows that have no netEarnings"
  - "prisma.user.upsert with email: null for social users — email is nullable in schema and will be populated by webhook if provider returns it later"
metrics:
  duration_minutes: 12
  completed_date: "2026-04-21"
  tasks_completed: 2
  files_changed: 7
---

# Phase 11 Plan 03: Settlement Net Earnings, Dead Routes, Auth Bootstrap Summary

Net earnings now displayed throughout the Worker post-shift flow; dead `posts/new` route removed; social/magic-link auth now guarantees prisma user + worker profile rows exist before role selection.

## Tasks Completed

| # | Name | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Fix earnings display to show net amounts in check-in flow and settlements page | `59d8439` | actions.ts, check-in-flow.tsx, settlements/page.tsx, queries.ts |
| 2 | Clean up dead routes and fix auth bootstrap | `0786f57` | favorites/page.tsx, posts/new/page.tsx (deleted), role-select/actions.ts |

## What Was Built

### BUG-W07: Net Earnings Display

**`check-in/actions.ts`** — `CheckOutResult` success type now includes `netEarnings: number` and `commissionAmount: number`. A `snapshotNet` variable is declared before `prisma.$transaction` and assigned inside the transaction after `computeCommissionSnapshot` runs, then threaded into the return value.

**`check-in-flow.tsx`** — `result` state type extended with `netEarnings` and `commissionAmount`. Done screen now shows `실지급액` label, `formatMoney(netEarnings)` as the hero amount, and a conditional commission row (`-{formatMoney(result.commissionAmount)}`) between the hours and night-premium rows.

**`queries.ts`** — `getWorkerSettlementTotals` raw SQL uses `SUM("netEarnings")` for both `all_time_total` and the monthly `CASE` expression. (This change was already present from a parallel Plan 11-02 fix in commit `5b3ef2e` — confirmed via git log, Edit was a no-op.)

**`settlements/page.tsx`** — Label `총수입` changed to `총 실수령액`. `SettlementCard` earnings prop uses `(s as any).netEarnings ?? s.earnings ?? 0` for backward compat with legacy rows.

### BUG-W09: Favorites Coming-Soon Clarity

`favorites/page.tsx` — Description changed from `저장한 공고 목록 UI는 준비 중입니다` to `관심 있는 공고를 저장하는 기능은 / 다음 업데이트에서 만나볼 수 있어요`. Link target changed from `/search` to `/home`. Link text changed from `공고 탐색하기` to `공고 둘러보기`.

### BUG-W10: posts/new Dead Route Removal

`src/app/(worker)/posts/new/page.tsx` deleted. Worker posting is not part of the GigNow business model. Next.js returns 404 on navigation to `/posts/new`.

### BUG-W12: Social/Magic-Link Auth Bootstrap

`role-select/actions.ts` — `prisma.user.update` replaced with `prisma.user.upsert` (create branch: `id`, `email: null`, `role`). After the upsert, when role is `WORKER` or `BOTH`, a `workerProfile.findUnique` guard check prevents duplicate creation, and `workerProfile.create` bootstraps the profile with `name: '사용자'` and empty `preferredCategories`.

## Deviations from Plan

None — plan executed exactly as written.

Note: `queries.ts` edit for `getWorkerSettlementTotals` was a confirmed no-op because a parallel Plan 11-02 agent had already applied the identical change in commit `5b3ef2e`. The Edit call succeeded (file matched expected content) but produced no net diff. Both the all-time and monthly-CASE SQL already used `"netEarnings"`.

## Known Stubs

None. All changes wire real data — `netEarnings` comes from the DB snapshot written at `checkOut` time, the favorites page is intentionally static (v2 placeholder), and the auth bootstrap creates real DB rows.

## Self-Check: PASSED

- `src/app/(worker)/my/applications/[id]/check-in/actions.ts` — contains `netEarnings: number` in CheckOutResult: CONFIRMED
- `src/app/(worker)/my/applications/[id]/check-in/check-in-flow.tsx` — contains `실지급액` and `netEarnings` (4 matches): CONFIRMED
- `src/app/(worker)/my/settlements/page.tsx` — contains `총 실수령액`: CONFIRMED
- `src/app/(worker)/my/favorites/page.tsx` — contains `다음 업데이트`, `href="/home"`, no `준비 중`: CONFIRMED
- `src/app/(worker)/posts/new/page.tsx` — DELETED: CONFIRMED
- `src/app/(auth)/role-select/actions.ts` — contains `prisma.user.upsert`, `workerProfile.findUnique`, `workerProfile.create`, no `prisma.user.update`: CONFIRMED
- TypeScript `src/` errors: 0: CONFIRMED
- Commits exist: `59d8439`, `0786f57`: CONFIRMED via git log
