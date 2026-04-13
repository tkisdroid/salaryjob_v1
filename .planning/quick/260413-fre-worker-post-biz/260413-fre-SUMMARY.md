---
phase: quick-260413-fre
plan: 01
subsystem: ui
tags: [bugfix, mobile-tab-bar, biz-posts, layout]
dependency_graph:
  requires: []
  provides: [worker-apply-cta-visible, biz-action-order-correct, biz-new-post-nowrap]
  affects: [src/components/shared/mobile-tab-bar.tsx, src/app/biz/posts/[id]/page.tsx, src/app/biz/posts/page.tsx]
tech_stack:
  added: []
  patterns: [HIDE_TAB_BAR_PATTERNS regex hide, flex ml-auto push, whitespace-nowrap shrink-0]
key_files:
  modified:
    - src/components/shared/mobile-tab-bar.tsx
    - src/app/biz/posts/[id]/page.tsx
    - src/app/biz/posts/page.tsx
decisions:
  - "Hide MobileTabBar on apply route (same pattern as check-in) rather than raising CTA z-index, to preserve focused conversion flow and prevent tab navigation escape"
metrics:
  duration: ~10min
  completed: 2026-04-13
---

# Quick Fix 260413-fre: Worker Apply CTA + Biz Post UI Bugs

**One-liner:** Hide MobileTabBar on /posts/[id]/apply via HIDE_TAB_BAR_PATTERNS, reorder biz post detail action buttons primary-first, and prevent 새 공고 등록 button text wrap with whitespace-nowrap + shrink-0.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| W2 | Hide MobileTabBar on apply route | `6c74315` | `src/components/shared/mobile-tab-bar.tsx` |
| B1 | Reorder biz post detail action buttons | `9e96487` | `src/app/biz/posts/[id]/page.tsx` |
| B2 | Fix 새 공고 등록 button text wrap | `0a6cfdf` | `src/app/biz/posts/page.tsx` |

## Changes Summary

### W2 — MobileTabBar hidden on /posts/[id]/apply

**Before:**
```ts
const HIDE_TAB_BAR_PATTERNS: readonly RegExp[] = [
  /^\/my\/applications\/[^/]+\/check-in$/,
];
```

**After:**
```ts
const HIDE_TAB_BAR_PATTERNS: readonly RegExp[] = [
  /^\/my\/applications\/[^/]+\/check-in$/, // 체크인/체크아웃 플로우
  /^\/posts\/[^/]+\/apply$/, // 지원 확정 플로우 — sticky CTA가 tab bar에 가려지지 않도록 숨김
];
```

Root cause: apply-confirm-flow.tsx CTA is `fixed bottom-0 z-40`; MobileTabBar is `fixed bottom-0 z-50` — tab bar always rendered on top. Solution reuses the existing focused-flow hide pattern identical to check-in.

### B1 — Biz post detail action button order

**Before:** `[삭제] [퇴근 QR] ... ml-auto [지원자 보기]`

**After:** `[지원자 보기 (teal, primary)] [퇴근 QR (brand)] ... ml-auto [삭제 (destructive)]`

`ml-auto` moved from Button wrapper to the delete `<form>` element. No handler/logic changes.

### B2 — 새 공고 등록 button wrap prevention

**Before:**
```tsx
<Link href="/biz/posts/new" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-teal px-4 ...">
  <Plus className="h-4 w-4" />
  새 공고 등록
</Link>
```

**After:**
```tsx
<Link href="/biz/posts/new" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-teal px-4 ...">
  <Plus className="h-4 w-4 shrink-0" />
  <span>새 공고 등록</span>
</Link>
```

Added `whitespace-nowrap` (prevents text wrap), `shrink-0` on link (prevents compression in flex justify-between header), `shrink-0` on icon, text wrapped in `<span>` for consistent gap-2 spacing.

## Deviations from Plan

None — plan executed exactly as written.

## TypeScript Check

`npx tsc --noEmit` produced errors only in pre-existing unrelated files:
- `src/app/biz/posts/[id]/applicants/[applicantId]/page.tsx` — pre-existing `noShowCount`/`birthDate` type drift
- `src/app/biz/posts/[id]/applicants/actions.ts` — pre-existing `ApplicationStatus` enum drift
- `src/app/biz/posts/actions.ts` — pre-existing `duties` field type mismatch

Zero errors in the 3 files modified by this quick fix. Pre-existing errors are out of scope (deferred per `.planning/phases/04-db/deferred-items.md`).

## Known Stubs

None.

## Threat Flags

None — pure UI layout changes, no new network endpoints, auth paths, or schema changes.

## Self-Check: PASSED

- [x] `src/components/shared/mobile-tab-bar.tsx` modified — `posts.*apply` pattern confirmed via grep
- [x] `src/app/biz/posts/[id]/page.tsx` modified — button order and ml-auto position confirmed via grep
- [x] `src/app/biz/posts/page.tsx` modified — `whitespace-nowrap` confirmed via grep
- [x] Commit `6c74315` exists — W2
- [x] Commit `9e96487` exists — B1
- [x] Commit `0a6cfdf` exists — B2
