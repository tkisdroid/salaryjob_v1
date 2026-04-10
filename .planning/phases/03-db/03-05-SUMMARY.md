---
phase: 03-db
plan: "05"
subsystem: business-job-crud
tags:
  - wave-3
  - business
  - jobs
  - server-actions
  - zod
  - postgis
  - owner-check
  - lat-lng-copy
  - next-16
requires:
  - phase3-schema-live
  - shared-form-state-types
  - business-profile-queries
provides:
  - biz-job-crud
  - job-queries-by-business
  - server-actions-create-update-delete-job
  - biz-posts-dashboard-real-data
  - biz-posts-detail-real-data
  - biz-posts-new-form-wired
affects:
  - src/lib/db/queries.ts
  - src/app/biz/posts/actions.ts
  - src/app/biz/posts/page.tsx
  - src/app/biz/posts/[id]/page.tsx
  - src/app/biz/posts/new/page.tsx
  - src/app/biz/posts/new/new-job-form.tsx
  - tests/jobs/job-crud.test.ts
tech_stack:
  added:
    - zod-job-create-update-schemas
    - postgis-raw-sql-location-update-for-jobs
    - server-side-workHours-computation
    - application-layer-owner-check-for-job-mutations
  patterns:
    - Mirror 03-04 Server Action shape (Zod safeParse then fieldErrors projection then Korean errors)
    - Application-layer owner check because Prisma bypasses Supabase RLS
    - PostGIS geography Point update via prisma executeRaw tagged template
    - Split 5-step client form into thin Server wrapper + Client Component (NewJobForm)
    - useTransition + createJob dispatch replaces setTimeout fake publish flow
    - Two-path owner check for createJob (businessProfile.findFirst) vs update/delete (job.findUnique + authorId compare)
key_files:
  created:
    - src/app/biz/posts/actions.ts
    - src/app/biz/posts/new/new-job-form.tsx
  modified:
    - src/lib/db/queries.ts
    - src/app/biz/posts/page.tsx
    - src/app/biz/posts/[id]/page.tsx
    - src/app/biz/posts/new/page.tsx
    - tests/jobs/job-crud.test.ts
decisions:
  - Application-layer owner check (not RLS) is the primary defense for Job mutations because Prisma uses the service role and bypasses Supabase RLS (Research Finding #8)
  - workHours is server-computed from startTime + endTime and NEVER read from FormData — Phase 5 settlement calculations depend on this being trusted
  - lat/lng default to the selected BusinessProfile's coordinates on create (Research Finding #6 — no geocoding in Phase 3)
  - geography(Point, 4326) location column is populated via $executeRaw tagged template immediately after prisma.job.create — single consistent pattern across business_profiles (03-04) and jobs (03-05)
  - 5-step Phase 1 form UX is preserved verbatim; only handlePublish is rewired from setTimeout(fake) → useTransition(createJob)
  - Phase 3 does NOT add /biz/posts/[id]/edit — delete + re-create is the supported update path (UX polish deferred to Phase 3+)
  - Non-owner on [id] page redirects to /posts/{id} (public view) rather than 403 — existence leak is accepted per T-03-05-08
metrics:
  task_count: 3
  commits: 3
  tests_added: 7
  tests_todo: 2
  loc_added: ~1500
  duration_minutes: 35
  completed: 2026-04-10
requirements:
  - POST-01
  - POST-02
  - POST-03
---

# Phase 3 Plan 05: Business Job CRUD Summary

Wired Business-side job CRUD (POST-01..03) to the real Supabase DB via three Server Actions (`createJob`, `updateJob`, `deleteJob`), extended `queries.ts` with `getJobsByBusinessIds`, unblocked the Phase 2 stub fields in `adaptJob`, and replaced Phase 1 mock content in all three `/biz/posts/*` pages. The 5-step job-creation form from Phase 1 is preserved and now dispatches through `useTransition` into `createJob`. Owner enforcement happens at the application layer (Prisma bypasses Supabase RLS). 7 tests pass against the live DB.

## What Shipped

### 1. src/lib/db/queries.ts — stubs unblocked + 1 new query (475 LOC total)

- `adaptJob` now reads `duties`, `requirements`, `dressCode`, `whatToBring`, `tags` from the Prisma row instead of returning hard-coded `[]` / `""`. Defensive null coercion keeps the `Job` UI type stable even if a row has null arrays.
- New `getJobsByBusinessIds(businessIds: string[]): Promise<Job[]>` returns up to 100 jobs across the provided BusinessProfile ids, ordered by `createdAt DESC`. **Intentionally does NOT filter by `status='active'`** so the biz dashboard can show filled/expired jobs alongside active ones.
- Empty input (`[]`) returns `[]` without a DB round-trip.
- `getJobs`, `getJobById`, `getJobsByCategory`, `getUrgentJobs`, `getTodayJobs`, `getApplications`, `getBusinessProfilesByUserId`, `getBusinessProfileById`, `getWorkerProfileByUserId` — all preserved unchanged in signature and behavior.
- Stale `TODO Phase 3: add these columns to the DB schema` and top-level `TODO Phase 3` bullet list entries removed.

### 2. src/app/biz/posts/actions.ts — NEW (425 LOC)

Three Server Actions + one pure helper (`computeWorkHours`) + one utility (`extractArrayField`).

**Zod schemas (`JobCreateSchema` + `JobUpdateSchema`):** whitelist 20 fields — `businessId`, `title`, `category`, `description`, `hourlyPay`, `transportFee`, `workDate`, `startTime`, `endTime`, `headcount`, `address`, `addressDetail`, `dressCode`, `duties[]`, `requirements[]`, `whatToBring[]`, `tags[]`, `isUrgent`, `nightShiftAllowance` (+ `jobId` on update). All unknown FormData keys silently dropped. Korean error messages on every field. Array bounds: duties/requirements/whatToBring ≤ 20 entries × 200 chars each; tags ≤ 10 × 50 chars. Per-string max prevents storage bloat (T-03-05-06). HH:MM regex enforces time format. Minimum wage floor is hardcoded to 10,030원 (2026 KRW).

**`createJob` (POST-01):**
1. `requireBusiness()` gates the role
2. `prisma.businessProfile.findFirst({where: {id: businessId, userId: session.id}})` — verifies the submitted businessId actually belongs to the session (T-03-05-02). This is the critical defense against cross-user job injection.
3. `computeWorkHours(startTime, endTime)` — server-computed decimal hours (2 decimal places). Returns 0 for `endTime <= startTime`, which aborts with a Korean error (no same-day to next-day spanning in Phase 3).
4. `jobLat`, `jobLng`, `jobAddress`, `jobAddressDetail` default to BusinessProfile values (Research Finding #6 — no geocoding).
5. `prisma.job.create` with `authorId: session.id` hardcoded server-side, `status: "active"` hardcoded, `filled: 0` hardcoded. Returns `{select: {id: true}}` for minimum-disclosure round-trip.
6. `prisma.$executeRaw` tagged template updates the `location` geography column with `ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography`. Values parameterized via Prisma template (no injection).
7. `revalidatePath` fires on `/biz/posts`, `/`, and `/home`.
8. `redirect(/biz/posts/{newJobId})` — framework-handled control-flow exception; the calling Client Component unwinds before hydration.

**`updateJob` (POST-03):**
1. `requireBusiness()` gates the role.
2. Zod `JobUpdateSchema` (extends create with `jobId`).
3. `computeWorkHours` server-side — again, never trusted from FormData.
4. `prisma.job.findUnique({where: {id: jobId}, select: {id: true, authorId: true, businessId: true}})` — fetches the minimal owner-check payload.
5. `existing.authorId !== session.id` → `console.warn` the attempted cross-user write + return Korean "이 공고를 수정할 권한이 없습니다".
6. `prisma.job.update` with all scalar fields — `authorId`, `businessId`, `filled`, `status` deliberately omitted from the update payload (immutable in this path per T-03-05-07).
7. `revalidatePath` fires on `/biz/posts`, `/biz/posts/{jobId}`, `/posts/{jobId}`, `/`, `/home` (5 paths × 1 = exactly the user-visible surface).

**`deleteJob` (POST-03):**
1. `requireBusiness()` gates the role.
2. Explicit UUID-shape regex guard on the `jobId` parameter (Server Action receives the id directly, not via FormData).
3. `prisma.job.findUnique` for the `{authorId}` pair.
4. Same `authorId !== session.id` check + warn log.
5. `prisma.job.delete` — cascade deletes applications via Prisma FK `onDelete: Cascade`.
6. `revalidatePath` on `/biz/posts`, `/`, `/home`.

**Never read from FormData:** `authorId`, `workHours`, `filled`, `status`, `businessId` in updateJob, `userId`. Verified by Task 3 static-file assertions.

### 3. src/app/biz/posts/page.tsx — REPLACED (144 LOC)

Previous file was a Phase 1 mock with a hardcoded `POSTS` array and `filterPosts(tab)` helper. Replaced wholesale:

- Pure Server Component (no `'use client'`).
- `requireBusiness()` → `getBusinessProfilesByUserId(session.id)` → `getJobsByBusinessIds(profileIds)`.
- Empty state (no owned jobs) → CTA to `/biz/posts/new`.
- Non-empty state → list of real jobs with live `filled/headcount` stat, `isUrgent` badge, `workDate startTime~endTime` summary, and the business name from the joined `business` relation.
- Removed the Phase 1 tabs (all/active/closed/draft) — status transitions are pg_cron work (03-02, 03-06) and the mock "draft" state isn't in the schema.
- Card now links to `/biz/posts/{id}` directly instead of firing client-side action menus (those were mock buttons only).

### 4. src/app/biz/posts/[id]/page.tsx — REPLACED (288 LOC)

- Pure Server Component with `params: Promise<{id: string}>` (Next 16 async params signature).
- `requireBusiness()` gates role.
- `getJobById(id)` loads the adapted UI shape. `null` → "공고를 찾을 수 없습니다" + back button.
- **Application-layer owner check:** a second minimal query `prisma.job.findUnique({where: {id}, select: {authorId: true}})` — `getJobById` doesn't return `authorId` (it's the UI shape, not the raw row). Non-owners are redirected to the public `/posts/{id}` route so they can still read the listing. T-03-05-08 (existence leak) is accepted per the threat model — the public route also reveals existence.
- Inline Server Function `handleDelete` (the `"use server"` directive inside a Server Component async function, per the Next 16 mutating-data docs) wraps `deleteJob(id)` and calls `redirect('/biz/posts')` on success.
- Detail body renders real `duties[]`, `requirements[]`, `dressCode`, `whatToBring[]`, `tags[]` sections conditionally (hidden when empty). Sidebar shows category / address+addressDetail / hourlyPay+transportFee / startTime+endTime+workHours / filled+headcount / workDate.
- Removed Phase 1 mock stats (views, saves) — not in schema. `appliedCount` still shown via `_count.applications` relation.

### 5. src/app/biz/posts/new/page.tsx + new-job-form.tsx — SPLIT + WIRED (26 + 832 LOC)

**`page.tsx`** — 26-line Server Component wrapper:
- `requireBusiness()` + `getBusinessProfilesByUserId(session.id)`.
- If the user has zero BusinessProfiles → `redirect('/biz/profile')`.
- Otherwise renders `<NewJobForm businessProfiles={profiles.map(p => ({id, name, lat: Number(p.lat), lng: Number(p.lng), address}))} />` — Decimal → number conversion at the Server/Client boundary.

**`new-job-form.tsx`** — 832-line Client Component:
- Preserves the entire Phase 1 5-step form (Step1Basic → Step5Preview) verbatim. Same inputs, same navigation, same validation-per-step gating, same Korean copy.
- Added: business selector dropdown (only rendered when `businessProfiles.length > 1` — the 1:many D-02 case). Default selection = first profile. `selectedBusinessId` state holds it.
- Added: error display banner (role="alert" aria-live="polite") underneath the step body. Errors from the Server Action land here.
- `handlePublish` no longer uses `setTimeout(fake)`. Instead:
  - Builds a `FormData` explicitly from form state (no form.elements scraping — resilient against renamed inputs).
  - `form.duties` and `form.requirements` textareas are split on `\n`; `form.whatToBring` is split on `,` (matches the Phase 1 UX hint text).
  - `selectedBusinessId` is appended as `businessId`.
  - `useTransition(async () => { const result = await createJob(null, fd); if (result && 'error' in result) setError(result.error); })` — the transition's `isPending` drives the loading spinner.
  - Success is unreachable in-component because `createJob` throws `redirect` server-side.
- Removed: the "published" animation screen — it's dead code now that `redirect` navigates away before the Client unwinds.

### 6. tests/jobs/job-crud.test.ts — scaffold CONVERTED (186 LOC, 7 passing + 2 todo)

Before: Wave 0 scaffold with `describe.skip` + 9 `it.todo` entries (zero runtime assertions).
After: 7 passing tests + 2 `it.todo` placeholders for Playwright E2E coverage.

| # | Test | Covers | Kind |
|---|------|--------|------|
| 1 | POST-01 persists all Phase 3 scalar + array fields | adaptJob round-trip + Phase 3 columns | DB round-trip |
| 2 | POST-01 workDate/startTime/endTime adapter | adaptJob date conversion | DB round-trip |
| 3 | POST-02 returns jobs for requested business ids only | Cross-user isolation, seed separation | DB round-trip |
| 4 | POST-02 empty id list returns [] | Degenerate-input shortcut | Pure unit |
| 5 | POST-03 updateJob owner check + authorId exclusion | Static file scan of actions.ts | fs.readFile |
| 6 | POST-03 deleteJob owner check | Static file scan of deleteJob slice | fs.readFile |
| 7 | POST-03 deleteJob actually removes row | Prisma delete + reload null | DB round-trip |
| todo | E2E createJob form → redirect | — | Playwright |
| todo | E2E delete button → redirect | — | Playwright |

**Isolation:** `beforeAll` looks up `business@dev.gignow.com` + `admin@dev.gignow.com` by email (not hardcoded UUID — survives reseeding). `afterAll` calls `cleanupTestJobs()` which `deleteMany` all rows with `title: {startsWith: "TEST_"}`. Zero test pollution verified via direct Prisma count after the run.

**Static-scan assertions (Tests 5, 6):** Read `src/app/biz/posts/actions.ts` from disk and assert:
- Contains `requireBusiness`
- Matches `/existing(\?)?\.authorId\s*!==?\s*session\.id/` (owner check)
- Does NOT match `/formData\.get\(["']authorId["']\)/` (T-03-05-01)
- Does NOT match `/formData\.get\(["']workHours["']\)/` (T-03-05-04)
- The `deleteJob` slice specifically contains the owner check

## Verification Results

### Task-level gates

Task 1 (queries.ts):
- `grep -c "getJobsByBusinessIds" src/lib/db/queries.ts` → 1
- `grep -c "j.duties as string" src/lib/db/queries.ts` → 1
- `grep -c "j.dressCode as string" src/lib/db/queries.ts` → 1
- `grep -c "j.tags as string" src/lib/db/queries.ts` → 1
- `grep -c "TODO Phase 3: add these columns to the DB schema" src/lib/db/queries.ts` → 0
- Live DB smoke via `@prisma/adapter-pg`: `job.findFirst` returns `duties: []`, `tags: []`, `dressCode: null` (all readable, none undefined).

Task 2 (actions.ts + 3 pages + new-job-form):
- `grep -c '"use server"' src/app/biz/posts/actions.ts` → 1
- `grep -cE "export async function (createJob|updateJob|deleteJob)" src/app/biz/posts/actions.ts` → 3
- `grep -c "requireBusiness" src/app/biz/posts/actions.ts` → 6 (≥3 required)
- `grep -c "existing\.authorId !== session\.id" src/app/biz/posts/actions.ts` → 2 (updateJob + deleteJob)
- `grep -c "businessProfile\.findFirst" src/app/biz/posts/actions.ts` → 2 (call + comment — ≥1 required)
- `grep -c "computeWorkHours" src/app/biz/posts/actions.ts` → 4 (definition + 3 call sites — ≥1 required)
- `grep -cE 'formData\.get\(['\''"]workHours['\''"]\)' src/app/biz/posts/actions.ts` → 0
- `grep -cE 'formData\.get\(['\''"]authorId['\''"]\)' src/app/biz/posts/actions.ts` → 0
- `grep -c "ST_SetSRID" src/app/biz/posts/actions.ts` → 1 (createJob only — update path does NOT rewrite location)
- `grep -c "revalidatePath" src/app/biz/posts/actions.ts` → 12 (≥6 required)
- `grep -rn "@/lib/mock-data" src/app/biz/posts/` → 0 matches
- `grep -rEn "\bMOCK_" src/app/biz/posts/` → 0 matches
- `grep -c "requireBusiness" src/app/biz/posts/page.tsx` → 2 (import + call)
- `grep -c "getJobsByBusinessIds" src/app/biz/posts/page.tsx` → 2 (import + call)

Task 3 (tests/jobs/job-crud.test.ts):
- `npx vitest run tests/jobs/job-crud.test.ts` → 1 file passed, **7 tests passed + 2 todo, 0 failed, 0 skipped describe blocks**
- Duration: 483ms
- Post-run live DB check: `TEST_ jobs remaining: 0`, `seed jobs: 8` (Phase 2 seed preserved)

### Full suite regression

`npx vitest run tests/profile tests/jobs tests/storage tests/utils`:
- **5 test files passed, 2 skipped** (`tests/jobs/job-expiry.test.ts` + `tests/jobs/postgis-distance.test.ts` are 03-02/03-06 scope)
- **27 tests passed, 15 todo, 0 failed**
- No regression from prior plans (03-01/03-03/03-04 baseline: 20 passed).

### TypeScript baseline

`npx tsc --noEmit 2>&1 | grep -cE "error TS"` → **5 pre-existing errors**, unchanged:
- `prisma.config.ts(16,5)` — `directUrl` type shim (from 03-01)
- `tests/proxy/redirect.test.ts(11,37)` — `unstable_doesProxyMatch` missing (Phase 2)
- `tests/proxy/redirect.test.ts(29,37)` — same
- `tests/storage/avatar-upload.test.ts(7,20)` — `Uint8Array<ArrayBufferLike>` → `BlobPart` (from 03-01)
- `vitest.config.ts(6,13)` — Vite plugin type mismatch (from 02)

**Zero new errors** from any 03-05 source file (queries.ts, actions.ts, 4 page.tsx files, new-job-form.tsx, job-crud.test.ts).

## Deviations from Plan

### 1. [Environment] Worktree bootstrap — node_modules junction + .env.local copy + prisma generate

**Found during:** initial attempt to run `npx tsc --noEmit` on Task 1.

**Issue:** Same as 03-04 — this worktree was created without `node_modules`, `.env.local`, `.env`, or a generated Prisma client. Main repo `node_modules` was also empty (only `.cache`).

**Fix:**
1. `cp ../../../.env.local .env.local && cp ../../../.env.local .env` (match main repo's env).
2. `cd ../../.. && npm install --no-audit --no-fund --loglevel=error` (main repo — 925 packages, 37s).
3. `cmd //c "mklink /J node_modules C:\Users\TG\Desktop\Njobplatform\node_modules"` (Windows junction from worktree to main repo node_modules).
4. `npx prisma generate` (regenerates client at `src/generated/prisma/`).

Bootstrap artifacts are all gitignored — no tracked changes. Orchestrator responsibility to automate this across worktrees.

### 2. [Rule 3 — Blocker resolved] Prisma 7 smoke test requires explicit adapter construction

**Found during:** Task 1 live DB smoke test via inline Node one-liner.

**Issue:** The minimal `new PrismaClient()` call throws `PrismaClientInitializationError: PrismaClient needs to be constructed with a non-empty, valid PrismaClientOptions` in Prisma 7.5.0 + Node 22. The project's `src/lib/db/index.ts` wraps the client with `@prisma/adapter-pg` (`PrismaPg`) + explicit `connectionString`, so importing it through the standard path works — but the inline smoke bypassing `src/lib/db` with `new PrismaClient()` does not.

**Fix:** Smoke tests use the explicit adapter pattern:
```ts
import { PrismaClient } from "./src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const p = new PrismaClient({ adapter });
```
Vitest tests import `prisma` from `@/lib/db` (aliased via vitest.config.ts) so they hit the correct factory — zero test changes needed.

**Not a behavioral deviation** — the plan's acceptance criterion example uses the old Prisma 6 shape; Prisma 7 needs the adapter. Not logged to deferred-items.md because it's a documentation drift in the plan, not a project blocker.

### 3. [Rule 2 — Critical] Next 16 docs consulted before writing Server Actions

**Found during:** actions.ts file creation.

**Action:** Read `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` before writing to confirm:
- `"use server"` directive top-of-file marks all exports as Server Actions (unchanged pattern)
- `revalidatePath(...)` from `next/cache` is still the canonical revalidation call
- `redirect(...)` from `next/navigation` throws a framework-handled control-flow exception — any code after it does NOT execute. This matches the pattern I used in `createJob` (redirect is the last statement).
- `params: Promise<{ id: string }>` async-params signature for dynamic route segments is still correct (the existing Phase 1 file already used it).

**Outcome:** No surprises. Next 16 Server Actions behave identically to the patterns 03-03/03-04 established. No deprecation warnings triggered.

## Authentication Gates

None. All three tasks ran against the `.env.local` DATABASE_URL inherited from Phase 2 + the Supabase service role via Prisma direct. Zero user interaction required. The tests exercise seed users (`business@dev.gignow.com` + `admin@dev.gignow.com`) by email lookup, not by cookie/session.

## Deferred Issues

None new from 03-05. Carried forward from earlier plans (already in `.planning/phases/03-db/deferred-items.md`):
1. `prisma.config.ts` loads `.env` before `.env.local` — worked around via env file copy at bootstrap.
2. `_supabase_migrations` tracking table dropped by `prisma db push` (03-01 original issue).
3. `tests/data/migrations.test.ts` DATA-03 stale RLS-disabled-on-jobs assertion (03-03).

## Known Stubs

None in 03-05 source code. All three Server Actions use real Prisma calls, the geography column is really updated, the pages render real DB data, and the tests hit the live Supabase DB.

Out of scope (explicitly deferred by plan):
- **`/biz/posts/[id]/edit` UI** — Phase 3 scope is delete + re-create. `updateJob` Server Action exists and is unit-tested at the code-presence level, but no page renders it yet. Phase 3+ UX polish.
- **Job status lifecycle transitions** beyond `"active"` default — `filled/expired` transitions come from `pg_cron` (03-02, already shipped) and `APPL-05` (Phase 4 filled-counter updates). `updateJob` deliberately does NOT accept `status` or `filled` in the Zod schema.
- **Kakao Map address → lat/lng geocoding** — Phase 3 UX explicitly deferred (Research Finding #6). Jobs inherit BusinessProfile coordinates.
- **Rate limiting on createJob** — T-03-05-09 accepted. Session auth + minimum wage floor block casual abuse. Phase 4+ can add.
- **Optimistic concurrency control** — T-03-05-10 accepted. Last-write-wins across concurrent `updateJob` calls (low probability since only the owner can update).

## Commits

| # | Hash | Type | Scope | Summary |
|---|------|------|-------|---------|
| 1 | `8fd61ab` | feat | 03-05 | unblock queries.ts Phase 3 stubs + add getJobsByBusinessIds |
| 2 | `d57ec55` | feat | 03-05 | wire biz job CRUD to real DB (POST-01..03) |
| 3 | `d905bdc` | test | 03-05 | convert job-crud scaffold to 7 passing tests (POST-01..03) |

## Requirements Completed

- **POST-01** (Business user can create a new Job with full payload + server-computed workHours + lat/lng copied from BusinessProfile) — `createJob` Server Action persists all 20 Zod-whitelisted fields. Live DB test (Test 1) verifies the full Phase 3 payload round-trips via `getJobById`. Cross-user injection blocked by `businessProfile.findFirst({id, userId: session.id})` before insert.
- **POST-02** (Business user sees only their own jobs on `/biz/posts`) — `getJobsByBusinessIds` is result-set scoped to the BusinessProfile ids returned by `getBusinessProfilesByUserId(session.id)`. `/biz/posts/page.tsx` composes these two queries. Test 3 verifies cross-user isolation across two real seed business users.
- **POST-03** (Owner-only update + delete; non-owner blocked with error, not redirect) — Both `updateJob` and `deleteJob` fetch `{authorId}` and compare against `session.id`. Non-owners get Korean error (`"이 공고를 수정할 권한이 없습니다"` / `"이 공고를 삭제할 권한이 없습니다"`). Tests 5, 6, 7 verify the owner-check regex presence AND runtime deletion behavior.

## What Is Unblocked

- **03-06 (Worker-facing public job list + PostGIS distance):** Real job data is now written through a Server Action. `getJobs` + `getJobById` already return the Phase 3 shape from Task 1. 03-06 can build `getJobsWithDistance(lat, lng)` + pagination on top of the now-unblocked `adaptJob`.
- **Phase 4 (Applications):** `prisma.job.create` correctly sets `authorId` so Phase 4 can build `prisma.application.create` with the worker-job relation intact. Cascade delete behavior tested in Test 7.
- **Phase 5 (Settlements):** `workHours` is trusted (server-computed, never from FormData), so `settlement.gross = application.actualHours * job.hourlyPay` + `transportFee` can be safely calculated downstream.
- **Phase 3 UAT:** `/biz/posts`, `/biz/posts/new`, and `/biz/posts/{id}` are all backed by real DB. A human tester logged in as `business@dev.gignow.com` can create, view, and delete jobs end-to-end.
- **Phase 2 mock removal:** `src/app/biz/posts/` has zero `@/lib/mock-data` imports. Combined with 03-03 (`/my/profile/edit`) and 03-04 (`/biz/profile`), the Phase 2 goal of "mock-data 의존 경로 0개" is one step closer. Remaining consumers (worker home, public job list, applicants page) are 03-06 + Phase 4 scope.

## Threat Flags

None. Surface introduced matches the plan threat_model exactly:

- **T-03-05-01** (createJob FormData.authorId spoofing) — mitigated: Zod schema omits authorId, action hard-sets `authorId: session.id`, static test asserts `formData.get("authorId")` never appears.
- **T-03-05-02** (createJob FormData.businessId → cross-user injection) — mitigated: `prisma.businessProfile.findFirst({where: {id: businessId, userId: session.id}})` before insert. This is the primary defense.
- **T-03-05-03** (update/delete jobId → cross-user mutation) — mitigated: `prisma.job.findUnique({select: {authorId}})` + `authorId !== session.id` check in both actions. Warn log on failure captures the attempt.
- **T-03-05-04** (FormData.workHours earnings spoof) — mitigated: `computeWorkHours` is the only source of `workHours`. Static test asserts `formData.get("workHours")` never appears. Phase 5 settlement math depends on this.
- **T-03-05-05** (PostGIS raw-SQL injection) — mitigated: only numeric lat/lng (Zod-coerced, range-validated) flow into `$executeRaw` via Prisma tagged template. String fields go through `prisma.job.create/update` which parameterizes automatically.
- **T-03-05-06** (array field DoS) — mitigated: `duties/requirements/whatToBring ≤ 20`, `tags ≤ 10`, per-element ≤ 200 chars (tags ≤ 50).
- **T-03-05-07** (filled/status elevation) — mitigated: not in Zod schema. `updateJob` deliberately omits them from the update payload. `isUrgent` and `nightShiftAllowance` ARE allowed (biz user can self-declare).
- **T-03-05-08** (404 vs 403 info disclosure) — accepted: non-owners redirected to `/posts/{id}` public view.
- **T-03-05-09** (rapid creation spam) — accepted: Phase 4+ rate limiting deferred.
- **T-03-05-10** (concurrent update races) — accepted: last-write-wins.
- **T-03-05-11** (DB error leak) — mitigated: try/catch wraps all Prisma calls, generic Korean error messages only.

No new network endpoints, auth paths, or trust-boundary surfaces introduced outside the register.

## Self-Check: PASSED

**Files verified present in worktree after commits:**
- `src/lib/db/queries.ts` — FOUND (475 lines, `getJobsByBusinessIds` exported, adaptJob reads real Phase 3 columns)
- `src/app/biz/posts/actions.ts` — FOUND (425 lines, `"use server"` directive, 3 exported Server Actions, 2 owner checks, `ST_SetSRID` + `$executeRaw`, 12 `revalidatePath` calls)
- `src/app/biz/posts/new/new-job-form.tsx` — FOUND (832 lines, `"use client"` directive, `useTransition` + `createJob` dispatch, business selector, 5-step form preserved)
- `src/app/biz/posts/new/page.tsx` — FOUND (26 lines, Server Component wrapper, no `"use client"`, `requireBusiness` + `getBusinessProfilesByUserId`)
- `src/app/biz/posts/page.tsx` — FOUND (144 lines, Server Component, no `"use client"`, no mock-data imports)
- `src/app/biz/posts/[id]/page.tsx` — FOUND (288 lines, Server Component, async params, owner check via `prisma.job.findUnique`, inline `handleDelete` Server Function)
- `tests/jobs/job-crud.test.ts` — FOUND (186 lines, 7 `it` + 2 `it.todo`, 0 `describe.skip`)

**Commits verified via `git log --oneline`:**
- `8fd61ab` — FOUND (Task 1)
- `d57ec55` — FOUND (Task 2)
- `d905bdc` — FOUND (Task 3)

**Test run verified (5 tasks ago):**
- `vitest run tests/jobs/job-crud.test.ts` → 7 passed, 2 todo, 0 failed
- Full suite `vitest run tests/profile tests/jobs tests/storage tests/utils` → 27 passed, 15 todo, 0 failed, 2 test files skipped (out of scope)

**TypeScript baseline verified:** 5 pre-existing errors, unchanged. Zero new errors from 03-05 source files.

**Live DB state verified post-test:**
- `TEST_` jobs remaining: 0 (clean)
- Non-TEST seed jobs: 8 (Phase 2 seed preserved)
