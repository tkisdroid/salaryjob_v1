---
phase: 12-business-flow-codex-13-crud
plan: "02"
subsystem: ui
tags: [react, nextjs, prisma, toast, chat, qr, push-notification]

requires:
  - phase: 12-business-flow-codex-13-crud/12-01
    provides: BUG-B01..B03 fixes (job create/edit flow)

provides:
  - DeleteJobButton client component with toast.error on delete failure (BUG-B04)
  - canCancel button for confirmed applicants in ApplicantCard (BUG-B05)
  - ensureThreadForApplication exported and called on acceptApplication (BUG-B06)
  - QR generation active worker guard returning no_active_worker (BUG-B07)
  - QR modal maps rate_limited/no_active_worker to Korean messages (BUG-B08)

affects:
  - 12-03 (remaining biz bugs — review/settlements/settings/workers)
  - Phase 8 HUMAN-UAT (accept/QR flows now testable end-to-end)

tech-stack:
  added: []
  patterns:
    - "Extract inline server-action delete to client component for toast feedback"
    - "Fire-and-forget chat thread creation on application accept"
    - "QR error code to Korean message lookup table in modal"

key-files:
  created:
    - src/app/biz/posts/[id]/delete-job-button.tsx
  modified:
    - src/app/biz/posts/[id]/page.tsx
    - src/app/biz/posts/[id]/applicants/applicants-client.tsx
    - src/app/biz/posts/[id]/applicants/actions.ts
    - src/app/biz/posts/[id]/actions.ts
    - src/components/biz/checkout-qr-modal.tsx
    - src/lib/services/chat.ts

key-decisions:
  - "DeleteJobButton extracted as client component — server component cannot call toast()"
  - "canCancel reuses rejectApplication (already handles confirmed status) — no new action needed"
  - "ensureThreadForApplication is fire-and-forget — chat failure must not block accept flow"
  - "QR active worker guard placed before rate-limit check — avoids burning the 30s window on a doomed request"

patterns-established:
  - "Pattern: QR error codes mapped in a local Record<string,string> before falling back to applicationErrorToKorean"
  - "Pattern: safeRevalidate('/messages') + safeRevalidate('/biz/messages') after accept to bust chat list caches"

requirements-completed: [BUG-B04, BUG-B05, BUG-B06, BUG-B07, BUG-B08]

duration: 6min
completed: 2026-04-21
---

# Phase 12 Plan 02: Applicant Management and QR Flow Fixes Summary

**Five biz-side bugs fixed: delete error toast via extracted client component, confirmed-applicant cancel button, chat thread creation on accept, QR active-worker guard, and QR-specific Korean error messages.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-21T13:55:13Z
- **Completed:** 2026-04-21T14:00:31Z
- **Tasks:** 2
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments

- BUG-B04: `DeleteJobButton` client component now shows `toast.error` on delete failure instead of silent no-op; page.tsx `handleDelete` server action removed
- BUG-B05: `ApplicantCard` splits `canAct` into `canActPending` (수락/거절) and `canCancel` (수락 취소) — confirmed applicants now show a cancel button that calls the existing `rejectApplication` action
- BUG-B06: `ensureThreadForApplication` exported from `chat.ts`; called fire-and-forget in `acceptApplication` after push notify; `/messages` and `/biz/messages` revalidated
- BUG-B07: `generateCheckoutQrToken` now counts `in_progress`/`checked_in` applications and returns `{ error: "no_active_worker" }` when none found
- BUG-B08: `checkout-qr-modal.tsx` maps `rate_limited` to "잠시 후 다시 시도해주세요 (30초 제한)" and `no_active_worker` to "현재 근무 중인 워커가 없습니다" before falling back to `applicationErrorToKorean`

## Task Commits

1. **Task 1: Delete error feedback + confirmed cancel button + QR error mapping (BUG-B04, B05, B08)** - `96fb673` (fix)
2. **Task 2: Accept triggers chat thread + push, QR guards active worker status (BUG-B06, B07)** - `a85f049` (fix)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `src/app/biz/posts/[id]/delete-job-button.tsx` - New client component: useTransition + toast.error on deleteJob failure
- `src/app/biz/posts/[id]/page.tsx` - Removed inline handleDelete server action and form; added DeleteJobButton import and usage
- `src/app/biz/posts/[id]/applicants/applicants-client.tsx` - Replaced canAct with canActPending + canCancel; added 수락 취소 button block
- `src/app/biz/posts/[id]/applicants/actions.ts` - Added ensureThreadForApplication import; fire-and-forget call + messages revalidation in acceptApplication
- `src/app/biz/posts/[id]/actions.ts` - Added prisma import; extended QrTokenResult with no_active_worker; inserted active worker count guard
- `src/components/biz/checkout-qr-modal.tsx` - Added qrErrorMessages lookup table mapping rate_limited and no_active_worker to Korean text
- `src/lib/services/chat.ts` - Exported ensureThreadForApplication (was private)

## Decisions Made

- `DeleteJobButton` extracted as a separate client component because the page is a server component and cannot call `toast()` directly.
- `canCancel` reuses `rejectApplication` — that action already handles `confirmed` status (checks `pending || confirmed`), so no new server action was needed.
- Chat thread creation is fire-and-forget: a chat failure should never block the business from confirming a worker.
- Active worker guard placed before rate-limit check to avoid consuming the 30-second QR window when the guard would reject anyway.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 12-03 can proceed: review/settlements/settings/workers bugs (BUG-B09..B13)
- Phase 8 HUMAN-UAT: accept flow and QR flow now have correct behavior for manual testing

---
*Phase: 12-business-flow-codex-13-crud*
*Completed: 2026-04-21*

## Self-Check: PASSED

- FOUND: src/app/biz/posts/[id]/delete-job-button.tsx
- FOUND: .planning/phases/12-business-flow-codex-13-crud/12-02-SUMMARY.md
- FOUND commit: 96fb673 (Task 1)
- FOUND commit: a85f049 (Task 2)
