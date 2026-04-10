---
phase: 03-db
plan: "04"
subsystem: business-profile-crud
tags: [wave-2, business-profile, server-actions, zod, postgis, 1-many, react-19, useActionState]
requires:
  - phase3-schema-live
  - shared-form-state-types
provides:
  - business-profile-crud
  - biz-profile-edit-page
  - business-profile-queries
  - updateBusinessProfile-server-action
affects:
  - src/lib/db/queries.ts
  - src/app/biz/profile/page.tsx
  - src/app/biz/profile/actions.ts
  - src/app/biz/profile/biz-profile-edit-form.tsx
  - tests/profile/biz-profile.test.ts
tech_stack:
  added:
    - zod-biz-profile-schema
    - postgis-raw-sql-location-update
    - prisma-businessProfile-findMany-findUnique
  patterns:
    - Mirror 03-03 Server Action shape (Zod safeParse then fieldErrors projection then Korean errors)
    - Application-layer owner check because Prisma bypasses Supabase RLS
    - PostGIS geography Point update via prisma executeRaw tagged template
    - Per-profile htmlFor IDs so multiple forms on one page do not collide
    - afterAll originalSnapshots Map restores every mutated row after test run
key_files:
  created:
    - src/app/biz/profile/actions.ts
    - src/app/biz/profile/biz-profile-edit-form.tsx
  modified:
    - src/lib/db/queries.ts
    - src/app/biz/profile/page.tsx
    - tests/profile/biz-profile.test.ts
metrics:
  task_count: 3
  commits: 3
  tests_added: 5
  tests_todo: 1
  duration_minutes: 18
  completed: 2026-04-10
requirements:
  - BIZ-01
  - BIZ-02
  - BIZ-03
---

# Phase 3 Plan 04: Business Profile CRUD Summary

Wired /biz/profile to the real DB with an updateBusinessProfile Server Action, Zod whitelist, application-layer owner check, and PostGIS location sync. Mirrors the 03-03 worker-profile pattern but adds 1:many handling (admin holds multiple profiles) and the geography(Point) raw-SQL write. 5 passing tests against the live Supabase DB.

## What Shipped

### 1. src/lib/db/queries.ts — APPEND (2 new functions, 30 LOC)

- getBusinessProfilesByUserId(userId) returns raw BusinessProfile array — NEVER null, always an array (even empty) — so the page component can branch on length 0 cleanly.
- getBusinessProfileById(id) returns a single nullable row. Used by the test round-trip assertion.
- Neither calls verifySession. Same library-vs-DAL boundary as 03-03 getWorkerProfileByUserId.
- getBusinessById (UI-adapted Business type) and all other existing exports untouched.

### 2. src/app/biz/profile/actions.ts — NEW (158 LOC)

Single Server Action updateBusinessProfile(_prevState, formData) guarded by requireBusiness().

**Zod whitelist (BizProfileSchema):** profileId (UUID), name (1-100), category (JobCategory enum), logo (10 chars max, optional), address (1-200), addressDetail (100 max, optional), lat (coerce number -90..90), lng (coerce number -180..180), description (500 max, optional).

**BIZ-02 read-only enforcement:** rating, reviewCount, completionRate, verified are NOT in the schema. z.object drops unknown keys, so any hidden form field is silently ignored. Static regex test asserts formData.get for these fields is never called.

**BIZ-03 owner check:** Reads the profile by profileId, returns a Korean "not found" error if missing, returns a Korean "no permission" error if existing.userId does not equal session.id. Primary defense because Prisma uses the service role and bypasses Supabase RLS. Server-side warn log on failure captures attempted cross-user writes.

**Two-step write:**
1. prisma.businessProfile.update for all scalar columns.
2. prisma.executeRaw for the location column using ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography. Prisma tagged templates parameterize the values — no injection risk; lat and lng are numeric after Zod coercion.

**Error handling:** Everything inside try/catch. On failure returns a generic Korean message and logs the full error to server console (never to client).

**Revalidation:** revalidatePath for /biz/profile and /biz on success.

### 3. src/app/biz/profile/page.tsx — REPLACED (mock to real, 56 LOC)

Previous page was a Phase 1 mock with a hardcoded BUSINESS object and no DB access. Replaced wholesale. Pure Server Component, handles the 1:many case by rendering one BizProfileEditForm per owned profile, empty-state branch tells the user to log in as a Phase 2 seed account or contact admin, converts Decimal to Number at the Server/Client boundary for lat/lng/rating. All 13 mock-data fields (phone, website, operating hours, photos, etc.) removed.

### 4. src/app/biz/profile/biz-profile-edit-form.tsx — NEW (242 LOC)

Client Component using React 19 useActionState (identical pattern to 03-03 worker form).

- Per-profile unique IDs: htmlFor uses a profileId template literal — prevents label collisions when admin (who has multiple profiles) sees several forms on one page.
- Hidden profileId input: the ONLY identity the Server Action trusts.
- Category select: native HTML select with emoji prefixes. Unlike the worker form multi-select button grid, business category is a single required choice.
- lat/lng number inputs: step 0.0000001 matches the Prisma Decimal(10, 7) precision.
- Read-only metrics section: aria-label with dashed border — displays rating, reviewCount, completionRate, verified but never submitted back.
- Field-level errors rendered next to each input via err.fieldErrors.
- Top-level errors and success: role alert aria-live polite for errors, role status for success.

### 5. tests/profile/biz-profile.test.ts — CONVERTED scaffold to 5 passing tests (175 LOC)

| # | Test | Covers |
|---|------|--------|
| 1 | persists all scalar fields via prisma.businessProfile.update | BIZ-01 round-trip |
| 2 | returns numeric rating + integer counters + boolean verified | BIZ-02 read-only types |
| 3 | different users see only their own BusinessProfile rows | BIZ-03 cross-user isolation |
| 4 | updateBusinessProfile owner check (static source scan) | BIZ-03 code-level guard |
| 5 | admin user has at least 1 business profile | D-02 1:many preservation |
| todo | E2E: Playwright form submission | future |

Seed isolation via afterAll: originalSnapshots is a Map populated inside each test that mutates a row. afterAll restores every snapshot via prisma.businessProfile.update. Test suite passed and no seed corruption remained.

Static source scan (Test 4): Reads actions.ts from disk and asserts it contains requireBusiness, matches the owner-check regex, and does NOT contain formData.get for rating/reviewCount/completionRate/verified/userId.

Seed lookup by email (not hardcoded UUID) — test survives reseeding.

## Verification Results

### Task-level gates

All acceptance criteria from the plan verified via Node-driven grep counts:

- Task 1: 4 target exports present in queries.ts (getBusinessProfilesByUserId, getBusinessProfileById, getBusinessById unchanged, getWorkerProfileByUserId from 03-03 preserved). 0 new TypeScript errors.
- Task 2: 1 use-server directive in actions.ts; 1 use-client in form, 0 in page; requireBusiness called twice in actions.ts; owner check expression present; ST_SetSRID and ST_MakePoint present; executeRaw present; revalidatePath appears 3 times; formData.get for rating/reviewCount/completionRate/verified count = 0; getBusinessProfilesByUserId imported in page; 0 mock-data imports; useActionState in form; hidden profileId input present. 0 new TypeScript errors.
- Task 3: vitest run passes with 5 it + 1 it.todo, 0 describe.skip. No regression.

### Full-suite regression

vitest run tests/profile tests/storage tests/utils: 4 test files passed, 20 tests passed, 3 todo, 0 failed.

### TypeScript baseline

5 pre-existing errors (prisma.config.ts directUrl, 2x proxy/redirect.test.ts, avatar-upload.test.ts Uint8Array, vitest.config.ts Vite plugin type mismatch). Unchanged by 03-04. Zero new errors from 03-04 source files.

## Deviations from Plan

### 1. [Environment] Worktree bootstrap — node_modules junction, env files, Prisma client, npm install

**Found during:** Task 1 first tsc attempt.

**Issue:** This worktree was created without node_modules, .env.local, .env, or a generated Prisma client. Additionally the main repo node_modules only contained .cache (packages not installed). All are gitignored.

**Fix:**
- Copied .env.local from main repo to both .env.local and .env in the worktree.
- Ran npm install in the main repo (925 packages, 43s).
- Created a Windows junction via mklink /J node_modules with the absolute path to the main repo node_modules (the relative-path variant aimed at a nonexistent path initially).
- Ran prisma generate with inlined DATABASE_URL and DIRECT_URL from .env.local.

Files modified: None tracked by git (all bootstrap artifacts are gitignored). Not a behavioral deviation — worktree bootstrap is an orchestrator responsibility.

### 2. [Rule 3 — Blocker] Edit/Write tool CRLF file visibility mismatch

**Found during:** Task 1 first Edit attempt on src/lib/db/queries.ts.

**Issue:** The worktree source files use CRLF line endings (Windows default). Edit and Write tools reported success but the changes were NOT persisted to disk:
- Edit on queries.ts reported success; bash grep returned 0 matches for the added function.
- Write on actions.ts and form.tsx reported success; Node fs.existsSync returned false.
- Subsequent Read calls returned stale in-memory content showing duplicated additions from multiple failed Edit attempts.

Root cause appears to be a tool/filesystem path/line-ending interaction specific to Windows + git worktree + CRLF files.

**Fix:** All file writes performed via Node scripts that explicitly convert LF to CRLF before writing. Bypasses the Edit/Write tool layer entirely. Verified each write landed on disk via a Node fs.readFileSync probe before committing.

**Files affected (all written via Node):** queries.ts (append), actions.ts (create), biz-profile-edit-form.tsx (create), page.tsx (replace), biz-profile.test.ts (replace).

Not a behavioral deviation from the plan — every file contains exactly the code the plan prescribed, just delivered through a different mechanism.

### 3. [Rule 1 — Bug] Regex literal backslashes collapsed in first test-file heredoc

**Found during:** Task 3 first vitest run — test file failed to parse with SyntaxError: Invalid regular expression (Invalid group).

**Issue:** My initial Node heredoc that built the test file used escape sequences which the bash heredoc + Node template-string interaction double-processed, collapsing backslash-dot to dot, backslash-s to s, backslash-question to question mark. The static source-scan assertion regex became syntactically invalid.

**Fix:** Rewrote the test file via a two-step pipeline: write the raw source to a temp file with a cat single-quoted-EOF heredoc (no shell expansion, backslashes preserved literally), then have Node read that file, convert LF to CRLF, and write it to the final destination. Regex literal arrives intact.

**Commit:** 55723e8 (Task 3).

## Authentication Gates

None. All three tasks ran against the existing .env.local DATABASE_URL inherited from Phase 2 and the Supabase service role key used by Prisma. No user interaction required.

## Deferred Issues

None new from 03-04. Carried forward from earlier plans (already in deferred-items.md):
1. prisma.config.ts vs .env.local — dotenv/config loads the stale .env file (worked around via inlined DATABASE_URL).
2. _supabase_migrations tracking table drift (from 03-01).
3. tests/data/migrations.test.ts DATA-03 stale RLS-disabled-on-jobs assertion (from 03-03).

## Known Stubs

None in 03-04 code. All files wired to real implementations:
- updateBusinessProfile uses real Prisma update + real PostGIS executeRaw
- getBusinessProfilesByUserId uses real prisma.businessProfile.findMany
- getBusinessProfileById uses real prisma.businessProfile.findUnique
- page.tsx uses real DAL + real query; mock data removed wholesale
- Form uses real Server Action via useActionState

The Phase 2 seed mock-data helper @/lib/mock-data is no longer imported by any file under src/app/biz/profile/ (grep verified: 0 matches).

Out of scope (explicitly deferred by plan):
- Kakao Map address to lat/lng lookup (Phase 3 UX deferred in 03-CONTEXT.md)
- Business logo image upload (Phase 4+; Phase 3 keeps emoji per D-01 scope)
- BusinessProfile creation from the edit page (empty-state directs user to seed accounts/admin)
- Optimistic concurrency control (T-03-04-07 accepted: last-write-wins)

## Commits

| # | Hash | Type | Message |
|---|------|------|---------|
| 1 | 0aa71c6 | feat | feat(03-04): add getBusinessProfilesByUserId + getBusinessProfileById queries |
| 2 | 8cb74a9 | feat | feat(03-04): business profile edit page + Server Action (BIZ-01..03) |
| 3 | 55723e8 | test | test(03-04): convert biz-profile scaffold to 5 passing tests (BIZ-01..03) |

## Requirements Completed

- **BIZ-01** (Business profile: name, address, category, logo emoji, description) — updateBusinessProfile persists all 5 + lat/lng + addressDetail. Round-trip verified by Test 1 via prisma.businessProfile.update followed by getBusinessProfileById.
- **BIZ-02** (rating / reviewCount / completionRate / verified read-only exposure) — Form displays all 4 under an aria-label. Zod schema excludes them. Static source scan asserts 0 formData.get calls for these fields. Test 2 confirms type shapes (Decimal to Number, Int, Boolean).
- **BIZ-03** (owner-only edit, 1:many aware) — Application-layer owner check runs before every update. Test 3 verifies result-set isolation across two real seed users (business + admin) with no id overlap. Test 4 statically verifies the owner-check string exists in the action source file.

**1:many preservation (Phase 2 D-02 carry-forward):** Page renders one form per owned profile, admin with multiple profiles can edit any of them, each form has per-profile unique htmlFor IDs. Test 5 asserts admin has at least 1 profile.

## What Is Unblocked

- **03-05 (Job CRUD):** Business users now have real, editable profile rows to attach jobs to. prisma.businessProfile.findUnique by businessId is a proven pattern in actions.ts that Job creation can reuse for the business ownership check on new jobs.
- **Phase 3 UAT:** /biz/profile is now a real route that a human tester can exercise end-to-end against the live Supabase DB.
- **Phase 2 mock removal:** src/lib/mock-data.ts no longer has any consumers under src/app/biz/profile/. Remaining consumers (jobs pages, applicant pages, etc.) are future plan scope.

## Threat Flags

None. Surface introduced matches the plan threat_model exactly:
- T-03-04-01 (profileId spoofing) — mitigated by application-layer owner check
- T-03-04-02 (read-only field elevation) — mitigated by Zod whitelist
- T-03-04-03 (userId re-ownership) — mitigated by schema omission
- T-03-04-04 (PostGIS raw-SQL injection) — mitigated by Prisma tagged template + numeric coercion
- T-03-04-05 (DB error leak) — mitigated by try/catch + generic Korean message
- T-03-04-06 (unbounded description) — mitigated by Zod max(500)
- T-03-04-07 (concurrent update) — accepted
- T-03-04-08 (cross-user enumeration) — mitigated by write-only owner check (reads public by design)

No new network endpoints, auth paths, or trust-boundary surfaces introduced outside the register.

## Self-Check: PASSED

**Files verified present in worktree after commits (via node fs.existsSync):**
- src/lib/db/queries.ts — FOUND (448 lines, contains getBusinessProfilesByUserId + getBusinessProfileById + preserved 03-03 getWorkerProfileByUserId)
- src/app/biz/profile/actions.ts — FOUND (158 lines, use server + requireBusiness + owner check + executeRaw)
- src/app/biz/profile/biz-profile-edit-form.tsx — FOUND (242 lines, use client + useActionState + hidden profileId input)
- src/app/biz/profile/page.tsx — FOUND (56 lines, Server Component, no use client, no mock-data import)
- tests/profile/biz-profile.test.ts — FOUND (175 lines, 5 it + 1 it.todo, 0 describe.skip)

**Commits verified via git log --oneline:**
- 0aa71c6 — FOUND (Task 1)
- 8cb74a9 — FOUND (Task 2)
- 55723e8 — FOUND (Task 3)

**Test run verified:**
- vitest run tests/profile/biz-profile.test.ts: 5 passed, 1 todo, 0 fail
- Full suite vitest run tests/profile tests/storage tests/utils: 20 passed, 3 todo, 0 fail (4 test files)

**TypeScript baseline verified:** 5 pre-existing errors, unchanged. Zero new errors from 03-04 source files.
