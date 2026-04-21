---
phase: 13-admin-codex-10
plan: "02"
subsystem: code-quality
tags: [type-safety, error-handling, repo-hygiene, prisma, any-removal]
dependency_graph:
  requires: []
  provides: [typed-query-adapters, explicit-env-validation, clean-git-history, observable-catch-blocks]
  affects: [src/lib/db/queries.ts, src/app/(auth)/role-select/actions.ts, src/lib/db/index.ts, src/app/biz/verify/actions.ts, src/lib/ocr/clova.ts, src/lib/supabase/storage-biz-reg.ts]
tech_stack:
  added: []
  patterns: [Prisma.XGetPayload inference types, explicit env null-check with throw, git rm --cached for untracking]
key_files:
  created: []
  modified:
    - src/lib/db/queries.ts
    - src/app/(auth)/role-select/actions.ts
    - src/lib/db/index.ts
    - src/app/biz/verify/actions.ts
    - src/lib/ocr/clova.ts
    - src/lib/supabase/storage-biz-reg.ts
    - .gitignore
decisions:
  - "BUG-C01: Prisma payload type inference (BusinessProfileGetPayload/JobGetPayload/ApplicationGetPayload) replaces any in adapter functions; JOB_INCLUDE/APP_INCLUDE moved above adapters so typeof works at type level"
  - "BUG-C02: getApplications() try-catch removed entirely; verifySession() already redirects on auth failure so the catch was silently masking real errors"
  - "BUG-C03: process.env non-null assertions replaced with explicit null checks that throw descriptive errors; db/index.ts uses ?? '' (unreachable branch guarded by hasDatabaseUrl())"
  - "BUG-C04: legacy files removed from git tracking with git rm --cached; gitignore entries prevent re-tracking"
  - "BUG-C05: console.error added to three silent catch blocks while preserving fail-open semantics (D-33)"
metrics:
  duration: "6m 23s"
  completed_date: "2026-04-21"
  tasks_completed: 2
  files_modified: 7
---

# Phase 13 Plan 02: Code Quality Fixes (BUG-C01 through BUG-C05) Summary

**One-liner:** Prisma payload types replace `any` in query adapters, auth error swallowing removed from `getApplications()`, env non-null assertions replaced with throw-on-missing guards, 26+ legacy prototype files removed from git tracking, and three silent catch blocks gain `console.error` logging.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Replace any types, fix auth/env (BUG-C01/C02/C03) | `084fb9f` | queries.ts, role-select/actions.ts, db/index.ts |
| 2 | Remove legacy files, add error logging (BUG-C04/C05) | `e1f2bd5` | .gitignore, biz/verify/actions.ts, storage-biz-reg.ts, clova.ts |

## What Was Built

### BUG-C01: `any` Types Replaced in `queries.ts`

Three Prisma payload type aliases defined immediately after the include constants:

```typescript
type BusinessProfileRow = Prisma.BusinessProfileGetPayload<{}>
type JobWithBusiness    = Prisma.JobGetPayload<{ include: typeof JOB_INCLUDE }>
type ApplicationWithJob = Prisma.ApplicationGetPayload<{ include: typeof APP_INCLUDE }>
```

`JOB_INCLUDE` and `APP_INCLUDE` moved before the adapter functions (previously located between `adaptApplication` and the job queries section) so `typeof JOB_INCLUDE` resolves at type-check time.

All `as string`, `as boolean`, `as number` casts removed from `adaptBusiness`, `adaptJob`, `adaptApplication`. `Number()` wraps kept for Decimal fields (`lat`, `lng`, `rating`, `hourlyPay`, `transportFee`, `workHours`).

`type RawJobRow = any` replaced with a 27-field explicit interface covering all columns projected by the `$queryRaw` JOIN query.

`getReviews()` map callback `(r: any)` replaced with inferred `(r)`.

All four `eslint-disable @typescript-eslint/no-explicit-any` comments removed.

### BUG-C02: Auth Failure No Longer Swallowed in `getApplications()`

Previous code wrapped `verifySession()` in a try-catch that returned `[]` on any error, masking auth failures as empty data. The try-catch was removed entirely. `verifySession()` already calls Next.js `redirect()` on failure, so callers that need graceful unauthenticated fallback should use `getApplicationsByWorker()` directly.

### BUG-C03: Env Non-Null Assertions Replaced

`src/app/(auth)/role-select/actions.ts`: `process.env.NEXT_PUBLIC_SUPABASE_URL!` and `process.env.SUPABASE_SERVICE_ROLE_KEY!` replaced with explicit null check that throws a descriptive error with `.env.example` reference.

`src/lib/db/index.ts`: `process.env.DATABASE_URL!` replaced with `process.env.DATABASE_URL ?? ''`. The empty string fallback is unreachable because `createPrismaClient` is only called when `hasDatabaseUrl()` returns true.

### BUG-C04: Legacy Files Removed from Git Tracking

Removed from git index via `git rm --cached` (files remain on disk, now untracked):
- `_design_review/` — 110+ design review HTML/PNG/CSS/JSX/WebP files across v0/v1/v2/main subdirs
- `src/_legacy/services/` — 2 obsolete AI matching TypeScript files
- `salaryjob*.html` (3 files), `salaryjob*.zip` (4 files), `salaryjob*_files/` (3 dirs, 20+ files)

Gitignore entries added at end of `.gitignore` to prevent re-tracking:

```
_design_review/
src/_legacy/
salaryjob*.html
salaryjob*.zip
salaryjob*_files/
```

### BUG-C05: Error Logging Added to Silent Catch Blocks

Three catch blocks updated with `console.error` while preserving fail-open behavior:

1. `src/app/biz/verify/actions.ts` OCR outer catch: logs `[biz-verify] OCR processing failed:` (D-33 advisory path — still returns `{ ok: true, ocr }`)
2. `src/lib/supabase/storage-biz-reg.ts` signed URL catch: logs `[storage] signed URL creation failed:` (still returns `null`)
3. `src/lib/ocr/clova.ts` JSON parse catch: logs `[ocr] response JSON parse failed:` (still returns `{ ok: false, reason: 'unparseable' }`)

Patterns NOT changed per plan: `src/lib/push.ts` `.catch()` blocks, which are documented best-effort with inline comments.

## Verification Evidence

```
Build: npx next build — 55 routes, 0 TypeScript errors (verified after Task 1 and Task 2)

grep -rc "no-explicit-any" src/lib/db/queries.ts      = 0  (required: 0)
grep -c "= any" src/lib/db/queries.ts                  = 0  (required: 0)
grep -c "BusinessProfileRow|JobWithBusiness|..." queries.ts = 6 (required: >= 3)
grep -c "SUPABASE_URL!" role-select/actions.ts          = 0  (required: 0)
grep -c "throw new Error" role-select/actions.ts        = 1  (required: >= 1)
grep -c "DATABASE_URL!" src/lib/db/index.ts             = 0  (required: 0)
grep -c "_design_review" .gitignore                     = 1  (required: >= 1)
grep -c "src/_legacy" .gitignore                        = 1  (required: >= 1)
grep -c "salaryjob" .gitignore                          = 3  (required: >= 1)
git ls-files _design_review/                            = 0  (required: 0)
console.error in biz/verify/actions.ts                  = 1  (required: >= 1)
console.error in storage-biz-reg.ts                     = 1  (required: >= 1)
console.error.*parse in clova.ts                        = 1  (required: >= 1)
```

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all changes are type-safety and error-handling quality fixes with no UI data rendering impact.

## Self-Check: PASSED
