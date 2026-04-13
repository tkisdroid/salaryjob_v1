---
phase: 260413-upw
plan: 01
subsystem: admin-console, biz-verify, biz-posts, biz-profile
tags: [security, pagination, admin, verification, cursor]
dependency_graph:
  requires: []
  provides:
    - admin-jwt-promotion-correct
    - verified-semantic-ocr-only
    - multi-business-verify-gate
    - rate-cursor-pagination-fix
  affects:
    - src/lib/supabase/middleware.ts (admin gate now reachable after seed)
    - src/app/(worker)/posts/[id]/apply/apply-confirm-flow.tsx (verified badge now OCR-confirmed)
tech_stack:
  added: []
  patterns:
    - Composite cursor (rate + createdAt + id) for Prisma keyset pagination with nulls
    - OCR-gated verification semantic (format-valid !== verified)
    - Next 16 Promise-shaped searchParams in Server Components
key_files:
  created:
    - src/lib/db/__tests__/admin-queries-rate-cursor.test.ts
  modified:
    - supabase/migrations/20260414000005_phase6_admin_seed.sql
    - src/app/biz/profile/actions.ts
    - src/app/biz/signup/actions.ts
    - src/app/biz/verify/actions.ts
    - src/app/biz/verify/page.tsx
    - src/app/biz/posts/actions.ts
    - src/lib/db/admin-queries.ts
decisions:
  - "Composite cursor uses 'r:' prefix to distinguish rate-cursor encoding from created-cursor — enables back-compat with existing cursors on created_* sorts without schema or API changes."
  - "verified=true is set ONLY in verify/actions.ts OCR match branch (D-33); format-valid regex pass in profile/actions.ts and signup/actions.ts is storage-only."
  - "Malformed ?businessId= on /biz/verify degrades silently to findFirst (oldest profile) — no error, no data leak."
  - "Malformed rate cursor (no 'r:' prefix) degrades to first page — no throw, consistent with created_* cursor behaviour."
metrics:
  duration: ~18 minutes
  completed: "2026-04-13"
  tasks_completed: 4
  files_changed: 8
---

# Phase 260413-upw Plan 01: Codex Adversarial Review — 4 Findings Summary

One-liner: Closed 4 Codex adversarial findings: JWT admin gate, OCR-gated verified flag, multi-business verify redirect, and composite rate-cursor pagination.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Admin seed SQL promotes BOTH auth.users.raw_app_meta_data AND public.users.role | 6a392a8 | supabase/migrations/20260414000005_phase6_admin_seed.sql |
| 2 | Remove verified=true side-effect from format validation; only OCR match flips verified | 0dba8ba | biz/profile/actions.ts, biz/signup/actions.ts, biz/verify/actions.ts |
| 3 | /biz/verify accepts ?businessId= param; createJob redirect carries it | 3a3f08b | biz/verify/page.tsx, biz/posts/actions.ts |
| 4 | Composite cursor for rate_* sorts + regression test | f7640a9 | src/lib/db/admin-queries.ts, src/lib/db/__tests__/admin-queries-rate-cursor.test.ts |

## What Was Done

### Issue 1 — Admin JWT gate (HIGH)

`middleware.ts` reads `app_metadata.role` from the JWT. The seed SQL previously updated only `public.users.role`, leaving `auth.users.raw_app_meta_data` untouched — so a promoted user could never reach `/admin` even after the migration ran.

Fixed: the documented (still-commented) BEGIN/COMMIT block now includes a second `UPDATE auth.users SET raw_app_meta_data = COALESCE(...) || jsonb_build_object('role','ADMIN')` — mirroring the `role-select/actions.ts` runtime pattern. A re-login instruction was added to HOW TO USE step 5 and as a POST-PROMOTION note.

### Issue 2 — False-positive verified trust signal (HIGH)

`signup/actions.ts` and `profile/actions.ts` both set `verified=true` when a business registration number passed regex format validation. Workers see a "verified" badge on these businesses, but format-valid does not mean OCR-confirmed.

Fixed:
- `signup/actions.ts`: removed `verified: true` from prisma.update — action now stores digit-only regNumber only.
- `profile/actions.ts`: removed `verifiedUpdate = true` on regex-pass branch; clear-to-empty still sets `verifiedUpdate = false` to prevent stale trust.
- `verify/actions.ts`: added `prisma.businessProfile.update({ verified: true })` on the OCR match branch — this is now the sole path that flips `verified`.

### Issue 3 — Multi-business owner stuck at verify gate (MEDIUM)

`createJob` D-31 gate redirected to `/biz/verify` without a `businessId` param. `/biz/verify` always loaded the oldest profile via `findFirst`. Multi-business owners with the oldest profile verified would get redirected to the wrong profile's verify page.

Fixed:
- `posts/actions.ts`: redirect now includes `?businessId=${d.businessId}`.
- `verify/page.tsx`: accepts `Promise<{ businessId?: string }>` searchParams (Next 16 pattern); validates UUID, loads specific profile with `userId: session.id` ownership check; falls back to `findFirst` + `orderBy: createdAt asc` for missing/invalid param.

### Issue 4 — rate_* sort cursor skip/dup bug (MEDIUM)

`getBusinessesPaginated` ordered by `(commissionRate, createdAt, id)` but the cursor WHERE only filtered on `(createdAt, id)`. On page 2+ with mixed null/non-null commissionRates, Postgres could skip or duplicate rows at page boundaries.

Fixed: composite cursor `r:{rateOrNULL}_{createdAtISO}_{uuid}` with `encodeRateCursor`/`decodeRateCursor`. Cursor WHERE for rate sorts now implements full tuple comparison including null-tail handling. created_* sorts unchanged (back-compat).

Regression test added: `src/lib/db/__tests__/admin-queries-rate-cursor.test.ts` — 3 cases (rate_desc NULL boundary, rate_asc tie-break, malformed cursor). Runnable via `npx vitest run`.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None introduced by this plan.

## Threat Flags

None — all changes harden existing trust boundaries (admin gate, verified flag, cross-tenant verify access). No new network endpoints or auth paths introduced.

## Self-Check: PASSED

- supabase/migrations/20260414000005_phase6_admin_seed.sql: FOUND
- src/app/biz/profile/actions.ts: FOUND
- src/app/biz/signup/actions.ts: FOUND
- src/app/biz/verify/actions.ts: FOUND
- src/app/biz/verify/page.tsx: FOUND
- src/app/biz/posts/actions.ts: FOUND
- src/lib/db/admin-queries.ts: FOUND
- src/lib/db/__tests__/admin-queries-rate-cursor.test.ts: FOUND
- Commits 6a392a8, 0dba8ba, 3a3f08b, f7640a9: all present
- tsc --noEmit: no new errors in modified files (pre-existing @ts-expect-error warnings in unrelated test files only)
