---
phase: 11-worker-flow-codex-12-filled
plan: "01"
subsystem: worker-apply-flow
tags: [bug-fix, apply, filled, pending, server-guard]
dependency_graph:
  requires: []
  provides: [correct-filled-increment, pending-aware-apply-ui, apply-page-server-guards]
  affects: [src/app/(worker)/posts/[id]/apply, src/app/biz/posts/[id]/applicants]
tech_stack:
  added: []
  patterns: [SELECT FOR UPDATE, prisma.$transaction, Next.js redirect server guard]
key_files:
  created: []
  modified:
    - src/app/(worker)/posts/[id]/apply/actions.ts
    - src/app/biz/posts/[id]/applicants/actions.ts
    - src/app/(worker)/posts/[id]/apply/apply-confirm-flow.tsx
    - src/app/(worker)/posts/[id]/apply/page.tsx
decisions:
  - "SELECT FOR UPDATE for capacity check at apply time — no side effects, still serializes concurrent applies"
  - "filled increment moved to acceptApplication inside prisma.$transaction — matches Timee pending→confirmed model"
  - "Apply page server-guards with requireWorker() before rendering — auth and duplicate-apply enforced server-side"
metrics:
  duration: "~7 minutes"
  completed: "2026-04-21T13:36:54Z"
  tasks_completed: 2
  files_changed: 4
---

# Phase 11 Plan 01: Worker Apply Flow — filled/pending/guard Fixes Summary

Fixed three Codex audit bugs (BUG-W01, BUG-W02, BUG-W03): removed premature filled increment at apply time, updated UI to reflect pending status with correct Korean copy, and added server-side guards blocking full/already-applied jobs from reaching the apply page.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Remove filled increment from applyOneTap; add atomic increment to acceptApplication | `83c4c42` | `apply/actions.ts`, `applicants/actions.ts` |
| 2 | Fix apply confirmation UI copy + server-side guards on apply page | `e275ad8` | `apply-confirm-flow.tsx`, `apply/page.tsx` |

## What Was Built

### Task 1 — Correct filled increment timing (BUG-W02)

**`src/app/(worker)/posts/[id]/apply/actions.ts` — applyOneTap:**
- Replaced `UPDATE jobs SET filled = filled + 1 ... RETURNING` with `SELECT id FROM public.jobs WHERE ... FOR UPDATE`
- Jobs row is locked without mutation — concurrent applies are serialized without side effects
- Application inserted with `status = 'pending'` (unchanged)
- Updated JSDoc to describe new flow

**`src/app/biz/posts/[id]/applicants/actions.ts` — acceptApplication:**
- Replaced single `prisma.application.update` call with `prisma.$transaction` wrapping both:
  1. `tx.application.update({ status: "confirmed" })`
  2. Raw SQL: `UPDATE public.jobs SET filled = filled + 1, status = CASE WHEN filled+1 >= headcount THEN 'filled' ELSE status END WHERE filled < headcount RETURNING id`
- Race guard: if job already at capacity when accept fires, increment is skipped with `console.warn`

### Task 2 — Pending-aware UI + server guards (BUG-W01, BUG-W03)

**`src/app/(worker)/posts/[id]/apply/apply-confirm-flow.tsx`:**
- Confirmed-step heading: `지원 확정!` → `지원 완료!`
- Confirmed-step description: immediate-confirm copy → `지원이 접수되었어요. 사업자 확인 후 자동 확정됩니다.`
- Sticky header: `지원 확정` → `지원하기`
- Sparkles badge: `면접 없음 · 원탭 확정` → `면접 없음 · 원탭 지원`
- Intro heading: `지원을 확정할까요?` → `지원할까요?`
- Intro description: `버튼을 누르는 즉시 근무가 확정됩니다` → `버튼을 누르면 지원이 접수됩니다`
- CTA button: `${formatMoney(earnings)} 원탭 지원` → `${formatMoney(earnings)} 지원하기`
- Bottom helper: `버튼을 누르면 즉시 근무가 확정됩니다` → `지원 후 사업자 확인을 거쳐 자동 확정됩니다`

**`src/app/(worker)/posts/[id]/apply/page.tsx`:**
- Added imports: `redirect`, `requireWorker`, `prisma`
- Guard 1: `if (job.filled >= job.headcount) redirect('/posts/${id}?error=full')`
- Guard 2: `const session = await requireWorker()` (auth enforcement)
- Guard 3: `prisma.application.findUnique({ jobId_workerId })` → `redirect('/my/applications?tab=upcoming')`

## Verification Results

| Check | Result |
|-------|--------|
| `apply/actions.ts` has no `SET filled = filled + 1` | PASS (0 matches) |
| `apply/actions.ts` contains `FOR UPDATE` | PASS |
| `apply/actions.ts` contains `'pending'` in INSERT | PASS |
| `applicants/actions.ts` contains `filled = filled + 1` | PASS (1 match) |
| `applicants/actions.ts` contains `$transaction` in acceptApplication | PASS |
| `apply-confirm-flow.tsx` contains `지원 완료!`, no `지원 확정!` | PASS |
| `apply-confirm-flow.tsx` contains `자동 확정됩니다` | PASS (2 matches) |
| `apply-confirm-flow.tsx` contains `지원할까요?`, no `지원을 확정할까요?` | PASS |
| `apply-confirm-flow.tsx` contains `지원하기` in CTA area | PASS (2 matches) |
| `apply/page.tsx` contains `requireWorker` | PASS (2 matches) |
| `apply/page.tsx` contains `jobId_workerId` | PASS |
| `apply/page.tsx` contains `redirect(` at least twice | PASS (2 matches) |
| TypeScript — 0 errors in modified files | PASS |

## Deviations from Plan

### Parallel Agent Overlap (not a bug)

**Found during:** Task 1 commit
**Issue:** Parallel agent executing plan 11-04 committed changes to `apply/actions.ts` and `applicants/actions.ts` (commit `83c4c42`) concurrently. The edits were identical to this plan's specification.
**Resolution:** Task 1 changes already landed correctly. No re-commit needed. Task 2 proceeded as planned.
**Impact:** None — correctness unaffected.

## Known Stubs

None — all four files contain real logic wired to the database.

## Self-Check: PASSED

- `src/app/(worker)/posts/[id]/apply/actions.ts` exists, contains `FOR UPDATE`
- `src/app/biz/posts/[id]/applicants/actions.ts` exists, contains `filled = filled + 1` in acceptApplication
- `src/app/(worker)/posts/[id]/apply/apply-confirm-flow.tsx` exists, contains `지원 완료!`
- `src/app/(worker)/posts/[id]/apply/page.tsx` exists, contains `requireWorker` and two `redirect(` calls
- Commit `83c4c42` — Task 1 (parallel agent, same changes)
- Commit `e275ad8` — Task 2 (this agent)
