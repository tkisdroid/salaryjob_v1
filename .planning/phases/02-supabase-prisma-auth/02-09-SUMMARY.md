---
phase: 02-supabase-prisma-auth
plan: "09"
subsystem: legacy-cleanup
gap_closure: true
tags: [cleanup, dead-code, phase-1-removal, schema-drift]
dependency_graph:
  requires:
    - "02-02 (DB schema migration that orphaned these files)"
    - "02-07 (mock-data UI swap that surfaced the type errors)"
  provides:
    - "tsc baseline reduced from 86 errors → 24 errors"
    - "src/_legacy/ directory for preserved carry-over work"
    - "tsconfig exclude for src/_legacy/**"
key_files:
  deleted:
    - src/lib/services/checkout.ts
    - src/lib/services/favorite.ts
    - src/lib/services/instant-matching.ts
    - src/lib/services/settlement.ts
    - src/lib/services/__tests__/ai-matching-demo.ts
    - src/lib/actions/availability-actions.ts
    - src/lib/actions/matching-actions.ts
    - src/lib/actions/post-actions.ts
    - src/lib/actions/settlement-actions.ts
    - src/app/api/cron/expire-urgent/route.ts
    - src/app/api/cron/auto-approve/route.ts
    - src/app/api/webhooks/toss/route.ts
    - src/app/api/webhooks/clerk/ (whole directory)
    - src/app/api/matching/accept/route.ts
    - src/app/api/matching/urgent/route.ts
    - src/components/worker/urgent-match-card.tsx
    - src/components/biz/urgent-trigger-button.tsx
  moved:
    - "src/lib/services/ai-matching.ts → src/_legacy/services/ai-matching.ts"
    - "src/lib/services/ai-matching-config.ts → src/_legacy/services/ai-matching-config.ts"
  modified:
    - tsconfig.json (exclude src/_legacy/**)
metrics:
  duration: "~5 minutes (inline orchestrator execution, no executor agent)"
  completed_date: "2026-04-10"
  files_deleted: 17
  files_moved: 2
  tsc_errors_before: 86
  tsc_errors_after: 24
  error_reduction: "72%"
---

# Plan 02-09 — Phase 1 Legacy Cleanup Summary

**One-liner:** Deleted 17 dead Phase 1 files referencing removed Prisma models (Settlement, Post, WorkerAvailability, etc.) and moved 2 carry-over AI matching files to `src/_legacy/` for future Phase 3+ resurrection. 86 → 24 tsc errors (72% reduction).

## Why this plan exists

Plan 02-02 redesigned the Prisma schema (User, WorkerProfile, BusinessProfile, Job, Application, Review) but **never deleted the Phase 1 service layer** that used the old schema (Settlement, Notification, Post, PostTag, Tag, WorkerAvailability). No Phase 2 plan ran `tsc` against the full repo, so the orphan files went unnoticed until plan 02-07 verification surfaced them.

## What was done

### Truly orphan dead code — DELETED

**API routes (5 files):**
- `src/app/api/cron/auto-approve/route.ts` — Phase 1 settlement auto-approver
- `src/app/api/cron/expire-urgent/route.ts` — Phase 1 urgent post expirer
- `src/app/api/matching/accept/route.ts` — Phase 1 instant matching accept
- `src/app/api/matching/urgent/route.ts` — Phase 1 urgent matching trigger
- `src/app/api/webhooks/toss/route.ts` — Phase 1 Toss Payments webhook

**Service files (4 files + 1 test):**
- `src/lib/services/checkout.ts` — Phase 1 checkout/settlement
- `src/lib/services/favorite.ts` — Phase 1 favorites
- `src/lib/services/instant-matching.ts` — Phase 1 instant matching (referenced removed models)
- `src/lib/services/settlement.ts` — Phase 1 settlement processing
- `src/lib/services/__tests__/ai-matching-demo.ts` — orphan test for moved ai-matching service

**Action files (4 files):**
- `src/lib/actions/availability-actions.ts` — used `prisma.workerAvailability` (removed)
- `src/lib/actions/matching-actions.ts` — used `prisma.post`, `prisma.workerAvailability` (removed)
- `src/lib/actions/post-actions.ts` — used `prisma.post`, `prisma.postTag`, `prisma.tag` (removed)
- `src/lib/actions/settlement-actions.ts` — used `prisma.settlement` (removed)

**React components (2 files):**
- `src/components/worker/urgent-match-card.tsx` — Phase 1 UI for urgent matching, no callers
- `src/components/biz/urgent-trigger-button.tsx` — Phase 1 biz trigger button, no callers

**Empty directory:**
- `src/app/api/webhooks/clerk/` — Phase 1 Clerk webhook directory (already empty after migration to Supabase Auth in Phase 2). CONTEXT.md D-01 explicitly removes Clerk; this directory was a leftover.

### Carry-over work — MOVED to `src/_legacy/`

**AI matching files (2 files, 942 lines total):**
- `src/lib/services/ai-matching.ts` (734 lines) — user's pre-Phase-2 in-flight work
- `src/lib/services/ai-matching-config.ts` (208 lines) — companion config

**Reason for preservation:** Committed by user as carry-over work (commit `13cc9dd`) before GitHub push. Per CLAUDE.md, AI matching is part of the Vercel AI Gateway integration planned for later phases. The implementation references removed Prisma models (`MatchResult` type) and would need to be rewritten against the new Phase 2 schema, but the prompt engineering and config logic are valuable to preserve.

**`tsconfig.json` exclude added:**
```json
"exclude": ["node_modules", "src/_legacy/**"]
```

This removes the legacy files from type-checking and Next.js builds while keeping them in the git tree. Phase 3+ can resurrect by moving files back to `src/lib/services/` and rewriting against current schema.

## Files NOT deleted (intentional)

- `src/lib/mock-data.ts` — Plan 02-05 seed.ts still imports from it (locked by D-04)
- `src/lib/services/auto-scheduling.ts` — used by `src/app/(worker)/my/schedule/page.tsx`, doesn't reference removed Prisma models
- `src/lib/services/push-notification.ts` — Firebase Cloud Messaging utility, no Prisma dependency, may be reused in Phase 3+
- `src/app/api/push/register/` — push notification registration endpoint, still functional

## Verification

Before:
```
$ npx tsc --noEmit --skipLibCheck 2>&1 | grep -E "^src/" | wc -l
86
```

After:
```
$ npx tsc --noEmit --skipLibCheck 2>&1 | grep -E "^src/" | wc -l
24
```

The remaining 24 errors are all in the 3 auth pages (login/signup/role-select) and are addressed by Plan 02-08 (next).

## Commits

| Commit | Files | Purpose |
|--------|-------|---------|
| (single batch) | 17 deletes + 2 moves + tsconfig | Mechanical cleanup, no logic changes |

## Self-Check: PASSED

- [x] All deleted files were verified orphan (no production code imports them or transitively)
- [x] Moved files preserved with `git mv` (history intact)
- [x] tsconfig exclude path matches the new directory
- [x] tsc error count dropped from 86 → 24 (only Category A auth bugs remain)
- [x] No Phase 2 production code files modified
- [x] mock-data.ts and seed.ts left untouched
