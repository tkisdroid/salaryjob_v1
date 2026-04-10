---
status: issues_found
phase: 03-db
depth: standard
reviewed: 2026-04-10
files_reviewed: 22
severity_counts:
  critical: 0
  high: 2
  medium: 9
  low: 10
  note: 3
---

# Phase 3: Code Review Report

**Status:** `issues_found` — no CRITICAL blockers. Recommend addressing HI-01, ME-01, ME-05, ME-09 before Phase 4 merge.

## Summary

Phase 3 landed substantial work: profile CRUD for both roles, Business job CRUD, public read surface with PostGIS distance sort + cursor pagination, Storage avatar uploads with RLS scoping, and pg_cron job expiry. The security-critical layers are solid: Prisma's RLS-bypass risk is explicitly acknowledged and each mutation Server Action pairs a role gate (`requireWorker`/`requireBusiness`) with an application-layer ownership check. Zod whitelisting is implemented correctly — read-only fields (rating, verified, commissionRate, authorId, workHours) are never read from FormData. PostGIS raw SQL uses Prisma tagged templates for parameter binding throughout; no string interpolation.

## High

### HI-01: Storage bucket named `public` with bucket-wide SELECT policy — any future non-avatar object dropped here is world-readable

**File:** `supabase/migrations/20260411000002_storage_setup_avatars.sql:22-37`

The bucket is both named `public` AND marked `public = true`. The `public_avatars_select` policy uses `bucket_id = 'public'` with NO `(storage.foldername(name))[1] = 'avatars'` constraint on SELECT (only on INSERT/UPDATE/DELETE). If Phase 4+ reuses this bucket for business licenses, verification docs, KYC, or chat attachments, they will leak.

**Fix:** Rename bucket to `avatars`, or at minimum constrain SELECT to the avatars subfolder:
```sql
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'avatars')
```
Document in CLAUDE.md: do not upload non-avatar assets to this bucket.

### HI-02: Middleware role gate reads stale JWT claim; just-promoted BOTH users may hit `error=worker_required` before DAL runs

**File:** `src/lib/supabase/middleware.ts:65-100`, `src/lib/dal.ts:7-36`

`verifySession` uses `React.cache` to read role from DB (correct). But middleware reads `user.app_metadata.role` from the JWT only. Middleware redirect fires before the page component runs `verifySession()`, so DAL never corrects a stale claim.

**Fix:** Either trigger `supabase.auth.refreshSession()` client-side after role changes, OR only hard-redirect in middleware when the claim is the *clearly* wrong role; treat ambiguous states as "pass through, let DAL decide."

## Medium

### ME-01: Client-side `workHours` allows overnight shifts (+24h wrap) but server rejects them with `return 0`, causing silent UX mismatch at publish

**File:** `src/app/biz/posts/new/new-job-form.tsx:113-120` vs `src/app/biz/posts/actions.ts:105-112`

Preview step 5 shows "22:00–06:00 = 8시간, 예상 비용 X원" then server rejects on publish with a generic error. Align client to server semantics — disable overnight or make server accept `endMinutes += 24*60` when wrapping.

### ME-02: `deleteJob` Server Action takes a plain string arg — exported action callable from any client with an auth cookie

**File:** `src/app/biz/posts/[id]/page.tsx:80-88`, `src/app/biz/posts/actions.ts:393-425`

Owner check saves this from CRITICAL, but exported primitive-arg Server Actions are an anti-pattern. Either convert to `(_prevState, formData)` signature reading jobId from FormData, or make it a non-exported internal helper called only by inline closures.

### ME-03: `uploadAvatar` upsert creates phantom WorkerProfile with `name = "이름 미설정"` if user uploads avatar before first profile save

**File:** `src/app/(worker)/my/profile/edit/actions.ts:124-137`

First-run footgun — subsequent saves fix it. Fix: require profile save before avatar upload, or use empty-string default and render placeholder in UI.

### ME-04: `workHours Decimal(4,2)` max value is 99.99; no client clamp on shift duration

**File:** `prisma/schema.prisma:142`, `src/app/biz/posts/actions.ts:111`

Absurd time entries (>24h shift) would throw a hard Prisma error. Add `if (workHours > 24) return 0;` in `computeWorkHours`.

### ME-05: pg_cron + lazy filter cast `workDate::timestamp + startTime::time` without specifying timezone — session tz leaks into expiry boundary

**File:** `supabase/migrations/20260411000003_pg_cron_expire_jobs.sql:22-28`, `src/lib/db/queries.ts:494-496`

Cast from TIMESTAMP (naive) to TIMESTAMPTZ uses session `TimeZone` GUC. Korean users pick "09:00 KST" from browser inputs, server stores as naive "09:00" and later interprets in whatever session tz is active. Supabase managed defaults to UTC today, but this is not guaranteed.

**Fix:** Make tz explicit in both cron + lazy filter:
```sql
("workDate"::timestamp + CAST("startTime" AS time)) AT TIME ZONE 'Asia/Seoul' < now()
```
Update `tests/jobs/job-expiry.test.ts` to assert the boundary in Asia/Seoul.

### ME-06: `getCurrentWorker()` silently returns null on unauth — a misconfigured middleware could render "게스트님" to anonymous visitors on `/home` without error

**File:** `src/lib/db/queries.ts:260-291`, `src/app/(worker)/home/page.tsx:29-45`

Inside the worker route group, use `requireWorker()` + `getWorkerProfileByUserId(session.id)` — mirror the `/my/profile/edit/page.tsx` pattern. Reserve `getCurrentWorker()` for the landing page that genuinely wants null-on-unauth.

### ME-07: Cursor pagination Date binding to `timestamp(3)` column — defensive concern if Supabase ever changes session tz

**File:** `src/lib/db/queries.ts:549-551, 617-619`

Low probability but documentable. Add a one-liner comment above `decodeJobCursor` asserting the timezone invariant.

### ME-08: `new-job-form.tsx:186-193` comment claims `createJob`'s `redirect` throw is "unreachable" after `await` — in Next 16 this is technically incorrect

Remove misleading comment; add fallback error message and `isMountedRef` guard. Non-blocking.

### ME-09: `getJobsByDistance` cursor pagination is SEMANTICALLY WRONG — uses `(createdAt, id)` tuple on a distance-ordered result set, producing duplicates/gaps at page boundaries

**File:** `src/lib/db/queries.ts:604-671`

When primary ORDER BY is `distance_m`, correct cursor is `(distance_m, createdAt, id) > (...)`. Current implementation cuts out rows that are BOTH more recent AND farther away than the last emitted row — wrong axis.

**Fix:** Encode distance_m into the cursor:
```ts
distanceCursor = `${distance_m}_${createdAtISO}_${id}`;
// filter
AND (
  ST_Distance(j.location, :userPt) > ${cursor.distance}
  OR (ST_Distance(j.location, :userPt) = ${cursor.distance}
      AND (j."createdAt", j.id) < (${cursor.createdAt}, ${cursor.id}::uuid))
)
```
Or fall back to offset-based pagination for distance mode. Tests should assert no-duplicates-across-pages in distance mode.

## Low

### LO-01: `adaptJob` uses `any` via eslint-disable; `type RawJobRow = any`
**File:** `src/lib/db/queries.ts:47, 70, 107, 319, 676`. Phase 3+ polish — generate types from Prisma schema.

### LO-02: `job-list-infinite.tsx` useEffect includes `isPending` in deps — re-attaches IntersectionObserver mid-load
**File:** `src/components/worker/job-list-infinite.tsx:52-78`. Use `isLoadingRef` ref, drop from deps.

### LO-03: `loadMoreJobs` has no rate-limiting — bot scraping friction-free
**File:** `src/app/(worker)/home/actions.ts:29-45`. Add rate limiter in Phase 4+.

### LO-04: Misleading `!` bang after `??` fallback on Supabase key env
**File:** `src/lib/supabase/middleware.ts:15`. Add explicit `if (!key) throw`.

### LO-05: `URL.createObjectURL` blob URL leak in avatar preview
**File:** `src/app/(worker)/my/profile/edit/worker-profile-edit-form.tsx:53-59`. Revoke in `useEffect` cleanup.

### LO-06: Avatar column is "emoji or URL" union — fragile render logic
**File:** `prisma/schema.prisma:88`. Phase 3+ polish — split into `avatarEmoji` + `avatarUrl`.

### LO-07: `useGeolocation` fallback treats 5s timeout as "denied" — misleading retry banner
**File:** `src/lib/hooks/use-geolocation.ts:52-56`. Split state into `denied` + `timedOut`.

### LO-08: Excessive `revalidatePath` targets on every job write — invalidates landing ISR cache on every biz action
**File:** `src/app/biz/posts/actions.ts:270-272, 374-378, 421-423`. Move to tag-based revalidation.

### LO-09: `getCurrentWorker()` catches any error from `verifySession()` including DB timeouts
**File:** `src/lib/db/queries.ts:260-266`. Narrow with `isRedirectError`.

### LO-10: Biz profile edit exposes raw lat/lng number inputs — dev-only UX
**File:** `src/app/biz/profile/biz-profile-edit-form.tsx:151-190`. Already deferred to Phase 4+ (geocoding).

## Notes (not blocking)

- **NT-01:** pg_cron uses `- INTERVAL '5 minutes'` grace window; lazy filter does not. Comment in queries.ts:489 says "IDENTICAL" — misleading but behavior is intended.
- **NT-02:** `$executeRaw` with `${newJobId}::uuid` is safe because of tagged-template binding. Document in AGENTS.md: always use tagged templates.
- **NT-03:** `JOB_CATEGORIES` duplicated in 3 action files. Move to `src/lib/constants.ts`.

## Clean areas

1. **Application-layer RLS bypass protection** — every mutation Server Action correctly pairs `requireWorker/Business()` with explicit ownership check, generic Korean error, no info disclosure.
2. **PostGIS raw SQL uses parameterized Prisma tagged templates throughout** — zero string interpolation, zero SQL injection surface.
3. **Zod whitelisting** — BIZ-02/WORK-03 read-only fields excluded from schemas; rendered as display-only outside `<form>`.
4. **Storage RLS folder scoping uses `[2]`** — correctly handles 1-based indexing for `avatars/{uid}/avatar.ext`. The exact subtle bug the research flagged.
5. **File upload validation is layered** — 4 independent defenses (client accept, server size check, MIME allow-list, Next bodySizeLimit, Supabase bucket quota).
6. **Auth gate coverage is complete** — every in-scope Server Action starts with `requireWorker/Business()` before DB operations.
7. **pg_cron + lazy filter dual-defense** — sound pattern; ME-05 only flags the timezone concern.
8. **Cursor pagination format** — fixed-length ISO+UUID encoding with validation regex (for time mode; ME-09 flags distance mode).
9. **Error handling in Server Actions** — stable `console.error` prefix, generic Korean messages.
10. **Geolocation UX** — no auto-request on mount (Research Finding 7.2), short timeout, fallback surface.

**Severity totals:** 0 CRITICAL · 2 HIGH · 9 MEDIUM · 10 LOW · 3 NOTE
