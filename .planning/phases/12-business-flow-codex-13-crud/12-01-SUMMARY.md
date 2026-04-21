---
phase: 12
plan: "01"
subsystem: biz-posts
tags: [bug-fix, night-shift, redirect, crud, edit-page]
dependency_graph:
  requires: []
  provides: [night-shift-aware-computeWorkHours, verify_required-redirect, job-edit-page]
  affects: [src/app/biz/posts/actions.ts, src/app/biz/posts/new/new-job-form.tsx, src/app/biz/posts/[id]/edit/]
tech_stack:
  added: []
  patterns: [overnight-time-wrap, redirectTo-sentinel, single-page-edit-form]
key_files:
  created:
    - src/app/biz/posts/[id]/edit/page.tsx
    - src/app/biz/posts/[id]/edit/edit-job-form.tsx
  modified:
    - src/app/biz/posts/actions.ts
    - src/app/biz/posts/new/new-job-form.tsx
    - src/app/biz/posts/[id]/page.tsx
decisions:
  - "Edit form uses flat single-page layout (not 5-step wizard) to avoid duplicating 500+ lines of step components"
  - "Import path corrected to ../../actions (plan had ../../../actions which resolved one level too high)"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-21"
  tasks: 2
  files: 5
requirements: [BUG-B01, BUG-B02, BUG-B03]
---

# Phase 12 Plan 01: Job Create/Edit Flow Fixes Summary

Night-shift-aware `computeWorkHours`, `verify_required` redirect handling in the new-job form, and a complete job edit page at `/biz/posts/[id]/edit`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix night-shift validation + verify_required redirect (BUG-B01, BUG-B02) | `0952947` | actions.ts, new-job-form.tsx |
| 2 | Create job edit page + add edit link to detail page (BUG-B03) | `3704972` | edit/page.tsx, edit/edit-job-form.tsx, [id]/page.tsx |

## What Was Built

**BUG-B01 — Night-shift `computeWorkHours`:** Replaced the same-day-only logic with an overnight-wrap formula. When `endMinutes <= startMinutes` the function now computes `(24*60 - startMinutes) + endMinutes` instead of returning 0. A 22:00-06:00 shift correctly yields 8 hours. The zero-hours error message was updated to "근무 시간이 0시간입니다. 시간을 확인해주세요" in both `createJob` and `updateJob`.

**BUG-B02 — `verify_required` redirect:** `new-job-form.tsx` now imports `useRouter` and checks `result.redirectTo` before falling through to `setError`. When `createJob` returns the D-31 image-gate sentinel, the form navigates to `/biz/verify?businessId=...` instead of displaying the raw `"verify_required"` string.

**BUG-B03 — Job edit page:** Created `src/app/biz/posts/[id]/edit/` with two files:
- `page.tsx` — server component that loads the job via Prisma, asserts `authorId === session.id`, and passes a serialized `EditableJob` to the client form.
- `edit-job-form.tsx` — client component with 4 sections (Basic Info, Schedule & Personnel, Compensation, Details), all fields pre-populated from the `job` prop. Submits via `updateJob` server action. On success navigates to `/biz/posts/{id}`. Handles `redirectTo` sentinel same as BUG-B02.

The job detail page (`[id]/page.tsx`) gains a `Pencil` + "수정" link in the Actions bar linking to the edit page.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wrong relative import path in edit-job-form.tsx**
- **Found during:** Task 2 TypeScript verification
- **Issue:** Plan specified `import { updateJob } from "../../../actions"` — three levels up from `[id]/edit/` resolves to `src/app/biz/actions` (non-existent). The correct path is two levels up.
- **Fix:** Changed import to `../../actions` which correctly resolves to `src/app/biz/posts/actions.ts`
- **Files modified:** `src/app/biz/posts/[id]/edit/edit-job-form.tsx` line 7
- **Commit:** `3704972`

## Known Stubs

None — all fields are wired to real state; `updateJob` is the live server action.

## Self-Check: PASSED

- `src/app/biz/posts/[id]/edit/page.tsx` — FOUND
- `src/app/biz/posts/[id]/edit/edit-job-form.tsx` — FOUND
- Commit `0952947` — FOUND (fix: night-shift + redirect)
- Commit `3704972` — FOUND (feat: edit page)
- `grep "24 * 60 - startMinutes" actions.ts` — FOUND line 121
- `grep "redirectTo" new-job-form.tsx` — FOUND lines 196-197
- `grep "Pencil" [id]/page.tsx` — FOUND lines 15, 119
- TypeScript errors in modified files — 0 (pre-existing test/generated errors unchanged)
