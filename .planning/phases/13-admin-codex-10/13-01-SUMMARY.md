---
phase: 13-admin-codex-10
plan: "01"
subsystem: admin
tags: [admin, backoffice, commission, verification, settlements, BUG-A01, BUG-A02, BUG-A03, BUG-A04, BUG-A05]
dependency_graph:
  requires:
    - src/lib/db/admin-queries.ts
    - src/lib/dal.ts
    - src/lib/db/index.ts
    - prisma/schema.prisma
  provides:
    - src/app/admin/settlements/page.tsx
    - src/app/admin/businesses/[id]/commission-form.tsx
    - src/app/admin/businesses/[id]/verify-actions-panel.tsx
    - src/lib/actions/admin-actions.ts
  affects:
    - src/app/admin/admin-sidebar.tsx
    - src/app/admin/page.tsx
    - src/lib/db/admin-queries.ts
    - src/app/admin/businesses/[id]/page.tsx
    - src/app/admin/businesses/[id]/actions.ts
tech_stack:
  added: []
  patterns:
    - React 19 useActionState for server action feedback in client components
    - offset pagination for admin settlements list
    - prevState parameter pattern for useActionState-compatible server actions
key_files:
  created:
    - src/app/admin/settlements/page.tsx
    - src/app/admin/businesses/[id]/commission-form.tsx
    - src/app/admin/businesses/[id]/verify-actions-panel.tsx
    - src/lib/actions/admin-actions.ts
  modified:
    - src/app/admin/admin-sidebar.tsx
    - src/app/admin/page.tsx
    - src/lib/db/admin-queries.ts
    - src/app/admin/businesses/[id]/page.tsx
    - src/app/admin/businesses/[id]/actions.ts
decisions:
  - "BUG-A03/A04: useActionState from react (not react-dom) per React 19 convention"
  - "BUG-A01: /admin/users and /admin/jobs links added but routes do not exist yet — 404 is acceptable, structure established for v2"
  - "BUG-A05: view-only settlements page (no actions) per plan deferred decision"
  - "Rule 1 - Bug: readonly ['settled','completed'] as const caused Prisma type error — fixed by using individual as const casts on each string literal"
metrics:
  duration: "~15m"
  completed_date: "2026-04-21"
  tasks_completed: 2
  files_changed: 9
---

# Phase 13 Plan 01: Admin Backoffice Expansion Summary

Admin backoffice expanded with 5 navigation items, 8-metric dashboard, commission form with React 19 useActionState feedback, business approve/reject verification panel, and a new /admin/settlements paginated oversight page — addressing all 5 Codex audit findings BUG-A01 through BUG-A05.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Expand sidebar (BUG-A01), dashboard stats (BUG-A02), settlements page (BUG-A05) | `7881375` |
| 2 | Commission feedback form (BUG-A03), business verify approve/reject (BUG-A04) | `d8b03fa` |

## What Was Built

### BUG-A01: Admin Sidebar Expanded (5 items)
`src/app/admin/admin-sidebar.tsx` — NAV_LINKS array expanded from 2 to 5 entries. Added `Users` (사용자 -> /admin/users), `Briefcase` (공고 -> /admin/jobs), `Wallet` (정산 -> /admin/settlements) from lucide-react. The two stub routes intentionally 404 until v2 CRUD pages are built.

### BUG-A02: Dashboard with 8 Aggregate Stats
`src/app/admin/page.tsx` — replaced 4-card BusinessProfile-only view with 8 aggregate counts via `Promise.all`: user count, worker count, biz total, biz verified, job total, job active, app total, app settled. Subtitle updated to "플랫폼 현황 요약".

### BUG-A05: /admin/settlements Page
`src/app/admin/settlements/page.tsx` (new) + `getAdminSettlements()` in `src/lib/db/admin-queries.ts` (new). View-only paginated table of all settled/completed applications with columns: 워커, 공고, 사업장, 총 금액, 수수료, 정산액, 체크아웃 일시, 상태. Offset pagination (20/page), prev/next links. `requireAdmin()` gate at top.

### BUG-A03: Commission Form with Feedback
`src/app/admin/businesses/[id]/commission-form.tsx` (new client component) — `useActionState` bound to `updateCommissionRate`, shows green "수수료율이 저장되었습니다" on success and red error text on failure. Field-level error display for the rate input.

`src/app/admin/businesses/[id]/actions.ts` — `updateCommissionRate` signature updated to `(_prevState, formData)` for React 19 useActionState compatibility.

### BUG-A04: Business Verification Approve/Reject
`src/lib/actions/admin-actions.ts` (new) — `updateBusinessVerification` server action with Zod validation (`businessId` UUID + `action` enum), `requireAdmin()` gate, `prisma.businessProfile.update({ verified: action === 'approve' })`, `revalidatePath`.

`src/app/admin/businesses/[id]/verify-actions-panel.tsx` (new client component) — current status badge, two side-by-side form buttons (인증 승인 / 인증 반려), useActionState feedback.

`src/app/admin/businesses/[id]/page.tsx` — inline commission form removed, `CommissionForm` and `VerifyActionsPanel` wired in. New "인증 관리" Section added before the 2-column grid.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `as const` tuple caused Prisma readonly type error**
- **Found during:** Task 1 — first build attempt
- **Issue:** `status: { in: ['settled', 'completed'] as const }` produced a readonly array that Prisma's `ApplicationStatus[]` type rejects (requires mutable array)
- **Fix:** Changed to `['settled' as const, 'completed' as const]` — individual const casts preserve enum literal types without making the array readonly
- **Files modified:** `src/lib/db/admin-queries.ts`
- **Commit:** `7881375`

## Verification Results

```
npx next build: 0 errors

Admin routes confirmed:
  /admin              (dynamic)
  /admin/businesses   (dynamic)
  /admin/businesses/[id]  (dynamic)
  /admin/settlements  (dynamic)

Acceptance criteria: all 14 checks passed
  - admin-sidebar.tsx contains "settlements"
  - page.tsx contains prisma.user.count and prisma.job.count (x2)
  - settlements/page.tsx exists with requireAdmin
  - admin-queries.ts contains getAdminSettlements
  - commission-form.tsx exists with useActionState and "use client"
  - verify-actions-panel.tsx exists with useActionState
  - admin-actions.ts exists with updateBusinessVerification
  - actions.ts contains prevState parameter
```

## Known Stubs

- `/admin/users` and `/admin/jobs` sidebar links resolve to Next.js 404 — intentional navigation stubs. Full CRUD deferred to v2 per BUG-A01 plan decision.

## Self-Check: PASSED
