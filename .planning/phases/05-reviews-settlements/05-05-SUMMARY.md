---
phase: "05"
plan: "05"
subsystem: review-settlement-ui
tags: [wave-4, review-ui, settlement-ui, server-components, client-components, primitives]
dependency_graph:
  requires: [05-03-SUMMARY.md, 05-04-SUMMARY.md]
  provides:
    - star-rating-input UI primitive (reusable 5-star picker)
    - tag-chip-picker UI primitive (multi-select chip group)
    - shared/review-form composition (parameterized by direction + submitAction)
    - shared/settlement-card (side=worker|biz)
    - worker/review-prompt-banner (dismissible nudge)
    - worker review page at /my/applications/[id]/review (settled gate + duplicate check)
    - biz review page at /biz/posts/[id]/applicants/[applicantId]/review
    - worker settlements page REWRITE (real DB totals + ReviewPromptBanner)
    - biz settlements page REWRITE (real DB totals + SettlementCard list)
  affects:
    - src/components/ui/star-rating-input.tsx
    - src/components/ui/tag-chip-picker.tsx
    - src/components/shared/review-form.tsx
    - src/components/shared/settlement-card.tsx
    - src/components/worker/review-form.tsx
    - src/components/biz/review-form.tsx
    - src/components/worker/review-prompt-banner.tsx
    - src/app/(worker)/my/applications/[id]/review/page.tsx
    - src/app/(worker)/my/settlements/page.tsx
    - src/app/biz/posts/[id]/applicants/[applicantId]/review/page.tsx
    - src/app/biz/settlements/page.tsx
tech_stack:
  added: []
  patterns:
    - submitAction-prop-pattern (ReviewForm receives Server Action as prop — client cannot swap)
    - thin-re-export-wrapper (worker/review-form + biz/review-form re-export from shared)
    - async-params-promise (Next.js 16: params: Promise<{...}> + await params in all 4 pages)
    - async-searchParams-promise (Next.js 16: searchParams: Promise<{...}> + await searchParams)
    - useTransition-server-action (ReviewForm calls submitAction inside startTransition)
key_files:
  created:
    - src/components/ui/star-rating-input.tsx
    - src/components/ui/tag-chip-picker.tsx
    - src/components/shared/settlement-card.tsx
    - src/components/worker/review-form.tsx
    - src/components/biz/review-form.tsx
    - src/components/worker/review-prompt-banner.tsx
  modified:
    - src/components/shared/review-form.tsx (REWRITE — mock → real Server Action wiring)
    - src/app/(worker)/my/applications/[id]/review/page.tsx (REWRITE — real gates + ReviewForm)
    - src/app/(worker)/my/settlements/page.tsx (REWRITE — real DB queries + banner)
    - src/app/biz/posts/[id]/applicants/[applicantId]/review/page.tsx (REWRITE — real gates)
    - src/app/biz/settlements/page.tsx (REWRITE — real DB queries)
decisions:
  - "toast import changed from 'sonner' → '@/components/ui/sonner' — sonner npm package not installed; Plan 04-08 deviation created in-house Toaster shim at that path"
  - "ReviewForm direction type uses underscore ('worker_to_business') not hyphen — matches Prisma ReviewDirection enum; old pages used hyphen which caused TS2820 errors resolved by rewriting pages"
  - "worker/review-form.tsx and biz/review-form.tsx are 3-line re-export wrappers — single source of truth at shared/review-form.tsx, wrappers satisfy CONTEXT.md line 103 literally"
  - "Biz review page uses prisma.application.findUnique directly (not via DAL) — requireJobOwner returns job not application; double-check application.jobId === id enforces T-05-20 mitigation"
metrics:
  duration_minutes: ~25
  completed_date: "2026-04-11"
  tasks_completed: 2
  tasks_total: 3
  files_created: 6
  files_modified: 5
---

# Phase 05 Plan 05: Review + Settlement UI Wire-up Summary

**One-liner:** 5 UI components (2 primitives + 3 compositions) + 4 page rewrites wiring Phase 5 review/settlement Server Actions and queries to visible user-facing surfaces, pending human-verify checkpoint.

---

## What Was Built

### Task 1: UI Primitives + Shared Compositions (`6bac992`)

**`src/components/ui/star-rating-input.tsx`** (54 lines, `'use client'`):
- Controlled 5-star picker: `value`, `onChange`, `readOnly`, `size` ('sm'|'md'|'lg') props
- `role="radiogroup"` + per-star `role="radio"` + `aria-checked` for accessibility
- `SIZE_MAP = { sm: 20, md: 28, lg: 40 }` controlling Lucide `Star` icon size
- `hover:scale-110` transition; disabled when `readOnly`

**`src/components/ui/tag-chip-picker.tsx`** (50 lines, `'use client'`):
- Multi-select chip group: `options: readonly string[]`, `value: string[]`, `onChange`, `max` (default 8)
- `aria-pressed` per chip; chips beyond `max` get `disabled` + `opacity-40 cursor-not-allowed`
- Toggles in/out of value array on click

**`src/components/shared/review-form.tsx`** (REWRITE, 86 lines, `'use client'`):

The previous mock implementation (Phase 1) hardcoded `setTimeout` + fake state transitions. This rewrite:
- Props: `{ applicationId, direction, tagSet, redirectOnSuccess, submitAction }`
- `direction: "worker_to_business" | "business_to_worker"` — underscore variant matching Prisma enum
- Calls `submitAction(...)` inside `useTransition` — non-blocking, shows "제출 중…"
- On success: `toast.success("리뷰가 등록되었습니다")` → `router.push(redirectOnSuccess)` + `router.refresh()`
- On error: `toast.error(reviewErrorToKorean(result.error))` — exhaustive Korean error messages
- `toast` imported from `@/components/ui/sonner` (in-house shim — `sonner` npm not installed)
- Submit button `disabled` until `rating ≥ 1`

**Re-export wrappers** (3 lines each, `'use client'` via re-export):
- `src/components/worker/review-form.tsx` → `export { ReviewForm } from "@/components/shared/review-form"`
- `src/components/biz/review-form.tsx` → same

**`src/components/shared/settlement-card.tsx`** (56 lines, Server Component — no `'use client'`):
- Props: `{ side: 'worker'|'biz', jobTitle, counterpartyName, checkOutAt, earnings, settlementStatus }`
- Worker view: shows biz name directly; Biz view: prepends "근무자: "
- Date formatted with `date-fns` `format(..., "yyyy-MM-dd HH:mm", { locale: ko })`
- "정산 완료" green badge when `settlementStatus === 'settled'`

**`src/components/worker/review-prompt-banner.tsx`** (42 lines, `'use client'`):
- Props: `{ unreviewedCount, firstUnreviewedAppId }`
- Hidden if `count === 0` or `firstUnreviewedAppId` is null or banner `dismissed` (useState)
- Yellow border/bg, Lucide `Star` icon, Korean nudge text, `Link` to `/my/applications/{id}/review`
- X button sets `dismissed = true` (component-local — no persistence, T-05-30 accept)

### Task 2: Page Rewrites (`fa8a3fb`)

**`src/app/(worker)/my/applications/[id]/review/page.tsx`** (REWRITE):
```
requireApplicationOwner(id)
  → gate: application.status !== 'settled' → redirect ?error=not_settled
  → gate: getReviewByApplication(id, 'worker_to_business') exists → redirect ?message=already_reviewed
  → render <ReviewForm ... submitAction={createWorkerReview} />
```
Next.js 16 pattern: `params: Promise<{ id: string }>` + `const { id } = await params`.

**`src/app/biz/posts/[id]/applicants/[applicantId]/review/page.tsx`** (REWRITE):
```
requireJobOwner(id)
  → prisma.application.findUnique(applicantId) → notFound if missing or jobId mismatch
  → gate: status !== 'settled' → redirect
  → gate: getReviewByApplication(applicantId, 'business_to_worker') → redirect
  → render <ReviewForm ... submitAction={createBusinessReview} />
```

**`src/app/(worker)/my/settlements/page.tsx`** (REWRITE — was mock):
```
requireWorker() → session
await searchParams → page number
Promise.all([getWorkerSettlementTotals, getWorkerSettlements, getApplicationsByWorker('done')])
→ compute unreviewed = doneApps.filter(a.status==='settled' && !a.reviewGiven)
→ render: 2-col totals cards + ReviewPromptBanner + SettlementCard list
```

**`src/app/biz/settlements/page.tsx`** (REWRITE — was mock data):
```
requireBusiness() → session
Promise.all([getBizSettlementTotals, getBizSettlements])
→ render: 2-col totals cards + SettlementCard list (side='biz')
```

---

## How ReviewForm is Reused Across Directions

Single implementation at `src/components/shared/review-form.tsx`. Both pages pass:
- `direction` prop (`"worker_to_business"` or `"business_to_worker"`) — controls heading copy
- `tagSet` prop (WORKER_TO_BIZ_TAGS or BIZ_TO_WORKER_TAGS) — 8-element readonly tuple
- `submitAction` prop — the Server Action bound by the parent Server Component page

The client component never imports the Server Action directly. The parent page (Server Component) imports and passes it as a prop. This satisfies T-05-18 (client cannot swap actions).

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Toast import path changed from `sonner` to `@/components/ui/sonner`**
- **Found during:** Task 1 TypeScript check
- **Issue:** `sonner` npm package not installed; Plan 04-08 created an in-house shim at `@/components/ui/sonner.tsx`
- **Fix:** Changed `import { toast } from "sonner"` → `import { toast } from "@/components/ui/sonner"`
- **Files modified:** `src/components/shared/review-form.tsx`
- **Commit:** `6bac992`

**2. [Rule 1 - Bug] direction type mismatch in existing page.tsx files**
- **Found during:** Task 1 TypeScript check
- **Issue:** Existing `review/page.tsx` files used hyphen format (`"worker-to-business"`) — incompatible with new `ReviewForm` props which use underscore (`"worker_to_business"`) matching the Prisma `ReviewDirection` enum
- **Fix:** Task 2 complete rewrite of both review pages with correct underscore direction values
- **Files modified:** Both review `page.tsx` files
- **Commit:** `fa8a3fb`

---

## Build Verification

`NODE_ENV=production npx next build` — compile phase passes with 0 TypeScript/module errors. Build exits with error only on `/page` (root homepage) due to `ECONNREFUSED` (no DB in CI environment) — this is a pre-existing issue unrelated to Plan 05 changes. All 4 new routes would appear as `ƒ` (dynamic) in a DB-connected build.

`npx vitest run` — 50 tests pass, 10 fail. All failures are pre-existing DB-connection failures (BIZ/WORK profile CRUD, DATA-05 mock-data gate, PostGIS tests) — no regressions introduced by Plan 05 UI changes.

`npx tsc --noEmit` — 0 errors in production source files (test `@ts-expect-error` unused directive warnings are pre-existing).

---

## Known Stubs

None — all settlement pages use real DB data via getWorkerSettlementTotals, getWorkerSettlements, getBizSettlementTotals, getBizSettlements. Review pages wire to real Server Actions from Plan 03.

---

## Threat Flags

No new security-relevant surface introduced beyond what is covered by the plan's threat model (T-05-18, T-05-19, T-05-20, T-05-30).

---

## Self-Check: PASSED

All 11 created/modified files verified present on disk. Both task commits verified in git log.

**Human-verify checkpoint (Task 3): DEFERRED by user request on 2026-04-11.**

Browser UAT (Scenarios A–D) was not executed during Phase 5 execution. User explicitly chose to continue with remaining plans (05-06 mock removal + 05-07 phase verification) and run UAT separately.

- Deferred UAT captured as todo: `.planning/todos/pending/2026-04-11-phase-5-plan-05-05-browser-uat-review-settlement-flow.md`
- Scenarios to run later:
  - Scenario A: Worker review + settlement flow
  - Scenario B: Biz review + settlement flow
  - Scenario C: Gate behaviour (negative tests)
  - Scenario D: Empty state
- Automated test coverage for the underlying Server Actions + settlement queries remains 48/48 GREEN (Plans 03/04 Wave 3 regression).

Plan 05-05 marked structurally complete; only manual UI verification remains outstanding.
