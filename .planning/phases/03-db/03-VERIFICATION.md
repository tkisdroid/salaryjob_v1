---
phase: 03-db
verified: 2026-04-10T19:05:00Z
status: human_needed
score: 5/5 success criteria verified (automated)
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 3/5
  previous_verified: 2026-04-10T18:50:00Z
  closure_commit: 7483e48
  gaps_closed:
    - "Generated Prisma client was stale — regenerated, DMMF now contains Phase 3 Job columns (duties/requirements/dressCode/whatToBring/tags/address/addressDetail)"
    - "cleanupTestJobs() raced across parallel test suites (TEST_D06_, TEST_POST06_, TEST_POST0[1-3]_) — now requires a TEST_-prefixed argument and each suite scopes cleanup to its own prefix"
    - "03-VERIFICATION.md was not committed to git — fixed in 7483e48"
  gaps_remaining: []
  regressions: []
requirements_covered:
  - WORK-01
  - WORK-02
  - WORK-03
  - WORK-04
  - BIZ-01
  - BIZ-02
  - BIZ-03
  - POST-01
  - POST-02
  - POST-03
  - POST-04
  - POST-05
  - POST-06
requirements_missing: []
must_haves: 48
must_haves_met: 48
gaps: []
deferred: []
human_verification:
  - test: "End-to-end Worker profile edit (WORK-01..04) — live browser"
    expected: "Log in as worker@dev.gignow.com → /my/profile/edit → change name/nickname/bio/preferredCategories → save → reload page → values persist; upload a 2MB JPG → avatar appears in header + /my; try to upload a 6MB file → client rejects with 5MB error"
    why_human: "React 19 useActionState + FormData + Supabase Storage upsert + @supabase/ssr cookie auth cannot be fully simulated via unit tests. The DAL + Storage RLS combo only executes under real browser cookies."

  - test: "End-to-end Business profile edit (BIZ-01..03) — live browser"
    expected: "Log in as business@dev.gignow.com → /biz/profile → 1 profile visible; edit name/address/category/logo emoji/description/lat/lng → save → reload → values persist; log in as admin@dev.gignow.com → see 6+ BusinessProfile rows and confirm each form isolates fields by profileId"
    why_human: "1:many BusinessProfile rendering per user + per-profile form isolation can only be validated under real multi-profile seed data in the browser."

  - test: "POST-01 createJob end-to-end — full 5-step form (now unblocked)"
    expected: "Log in as business@dev.gignow.com → /biz/posts/new → fill 5-step form with title/category/hourlyPay/transportFee/workDate/startTime/endTime/headcount/address/dressCode/duties/requirements/whatToBring/tags → publish → redirected to /biz/posts/{id} → new job visible on /biz/posts and on public / landing → /posts/{id} detail renders ALL populated Phase 3 sections (주요 업무, 지원 조건, 복장, 준비물, 태그)"
    why_human: "Server Action + FormData + redirect() + revalidatePath chain under real auth session. Prior stale-client bug is fixed; this validates the end-to-end write→read loop."

  - test: "POST-03 updateJob + deleteJob end-to-end"
    expected: "As business@dev.gignow.com, navigate to /biz/posts/{id}/edit → modify duties/requirements/dressCode/whatToBring/tags → save → reload detail page → modifications persist; as business@dev.gignow.com click Delete on /biz/posts/{id} → confirm → redirected to /biz/posts with row removed"
    why_human: "Same Server Action + cookie auth + revalidate loop as POST-01; prior stale-client blocked this path runtime-wise. Now unblocked."

  - test: "Anonymous visitor landing page POST-04 pagination flow"
    expected: "Open `/` in an incognito/unauthenticated browser → see ≥1 job from DB in the list → scroll to bottom → more jobs lazy-load via IntersectionObserver → click a job card → /posts/{id} loads without redirecting to /login → click 원탭 지원 → redirects to /login?next=/posts/{id}"
    why_human: "Middleware isAuthPublic matching + IntersectionObserver + client/SSR cursor handoff require a real browser (jsdom does not provide IntersectionObserver)."

  - test: "Worker /home geolocation + distance sort (D-06)"
    expected: "Log in as worker@dev.gignow.com → /home → click '내 근처 공고 먼저 보기' → browser shows geolocation permission prompt → allow → subsequent scroll shows jobs sorted by distance (closer first); deny permission → Seoul City Hall fallback banner appears; click 위치 권한 다시 요청 → prompt reappears"
    why_human: "navigator.geolocation permission prompt is a browser primitive; cannot be programmatically verified."

  - test: "Worker avatar upload — Storage RLS path scoping"
    expected: "As worker@dev.gignow.com, upload `avatars/{other-user-id}/avatar.png` directly via @supabase/supabase-js → expect 403 (Storage RLS blocks). As worker@dev.gignow.com, upload `avatars/{self}/avatar.png` → expect success."
    why_human: "Storage RLS enforcement under the authenticated JWT only reproduces under real auth session."

  - test: "pg_cron expiry — 5 minute sweep (POST-06 wall-clock)"
    expected: "Insert a test job with workDate = today and startTime 6 minutes in the past → wait ≤ 5 minutes → query the row → status = 'expired'"
    why_human: "pg_cron runs on Supabase's scheduler, not on test invocation. Requires wall-clock waiting. Lazy filter already covers the render-time side."
---

# Phase 3: 프로필·공고 DB 연결 Verification Report (Re-verification)

**Phase Goal:** Worker/Business가 자기 프로필을 실제로 저장·수정하고, Business가 작성한 공고가 실 DB에서 CRUD로 동작한다
**Verified:** 2026-04-10T19:05:00Z (re-verification)
**Prior verification:** 2026-04-10T18:50:00Z — status `gaps_found`, score 3/5
**Status:** human_needed
**Closure commit:** `7483e48 fix(03): close verification gaps — prisma postinstall + test race`

---

## Re-verification Result

Prior verification identified a single root-cause gap — the generated Prisma client at `src/generated/prisma/` was stale relative to the Phase 3 schema — which cascaded into 3 reported gaps: POST-01 createJob runtime crash, POST-03 updateJob runtime crash, and POST-05 silently-empty detail sections. A secondary gap (test race via overly broad `cleanupTestJobs()`) was also identified. Commit `7483e48` addresses all of the above.

**All three gaps are now closed.** Every automated check previously failing now passes. The phase transitions from `gaps_found` to `human_needed` — the remaining items are all UX / browser / wall-clock flows that cannot be validated programmatically.

### Closed Gaps

| # | Prior Gap | Closure Evidence | Status |
|---|---|---|---|
| G1 | Stale Prisma client — `src/generated/prisma/` did not know about Phase 3 Job columns; all `prisma.job.create/update` calls referencing duties/requirements/dressCode/whatToBring/tags/address/addressDetail threw `PrismaClientValidationError` at runtime. Affected POST-01, POST-03, test helper, and (via findUnique/include path) the silent empty-section problem in POST-05. | 1) `package.json:6` now has `"postinstall": "prisma generate"` — any fresh clone or dependency install regenerates the client automatically. 2) `src/generated/prisma/models/Job.ts` now contains `duties`, `requirements`, `dressCode`, `whatToBring`, `tags`, `addressDetail` in the Job aggregate + count + min/max + select types (verified via grep — 40+ hits). 3) Embedded DMMF in `src/generated/prisma/internal/class.ts` (lines 25/37/39) now serializes Phase 3 Job fields. 4) `tests/jobs/job-crud.test.ts` POST-01 test `stores all Phase 3 scalar and array fields` now passes, asserting the round-trip of duties/requirements/dressCode/whatToBring/tags/address/addressDetail through Prisma. 5) Full re-run: `npx vitest run tests/auth tests/data tests/proxy tests/jobs tests/profile tests/storage tests/utils` → 16 files / 54 passed / 0 failed / 5 todo. | **CLOSED** |
| G2 | Test race — `cleanupTestJobs()` ran `deleteMany({ title: { startsWith: "TEST_" } })` and was called from multiple parallel suites, causing job-crud / postgis-distance / job-expiry rows to delete each other mid-suite. | `tests/helpers/test-jobs.ts:60-68` now requires a prefix argument that must start with `TEST_`, throwing otherwise. `tests/jobs/job-crud.test.ts:41-47` cleans up only its own `TEST_POST01_`, `TEST_POST02_`, `TEST_POST03_` prefixes. `tests/jobs/postgis-distance.test.ts:34` and `tests/jobs/job-expiry.test.ts:29` each track their own `createdIds` array and delete by ID — no overlap possible with job-crud's prefixes or with each other. Full test suite runs cleanly 3.27s end-to-end with zero failures. | **CLOSED** |
| G3 | `03-VERIFICATION.md` was not committed to the git tree — prior verification artifact existed only as an uncommitted file. | Commit `7483e48` includes `.planning/phases/03-db/03-VERIFICATION.md` (+320 insertions). Now part of the audit trail. This re-verification overwrites that file in place. | **CLOSED** |

---

## Goal Achievement

The phase goal is **fully met at the automated level**. Profile CRUD for both Worker and Business roles, Business job CRUD (create/update/delete), worker read surface (landing + /home + public detail), PostGIS distance sort, pg_cron expiry schedule, Storage RLS avatar upload, and cursor pagination are all exercised by passing tests that hit the real Supabase database. The prior stale-client blocker on POST-01/POST-03/POST-05 is fully closed, and the silently-empty detail section bug is resolved because Prisma's SELECT now includes all Phase 3 columns.

Human sign-off is still required for 8 UX/browser flows listed in the frontmatter — these are inherent limitations of unit/integration tests (React 19 `useActionState` loops, `IntersectionObserver`, `navigator.geolocation`, real Supabase cookie auth, Storage RLS under a real JWT, pg_cron wall-clock sweep).

### Observable Truths

| # | Truth (from ROADMAP.md Success Criteria) | Status | Evidence |
|---|---|---|---|
| 1 | Worker가 자기 프로필(이름, 닉네임, 사진, 소개글, 선호 카테고리)을 저장하고 다시 열어도 동일 값이 DB에서 복구된다 | VERIFIED | `src/app/(worker)/my/profile/edit/{page.tsx,actions.ts,worker-profile-edit-form.tsx}` wire to `prisma.workerProfile.upsert` via `requireWorker`. `tests/profile/worker-profile.test.ts` 5/5 passing (1 skipped by design). Avatar upload helper `src/lib/supabase/storage.ts` writes to `avatars/{userId}/avatar.{ext}` with size+MIME validation. `tests/storage/avatar-upload.test.ts` 8/8 passing. Browser E2E → human verification item 1. |
| 2 | Worker는 자기 프로필의 뱃지 레벨·평점·근무 횟수·완료율을 실데이터 기반으로 확인하고, 다른 사용자 프로필은 수정할 수 없다 (RLS) | VERIFIED | Read-only fields passed as props to form but NOT in Zod schema — Phase 3 write-path whitelists `{name, nickname, bio, preferredCategories}` only. Owner enforcement via `requireWorker().id` feeds the where clause directly; no form-supplied userId. `worker_profiles` RLS enabled (verified via `pg_class.relrowsecurity = true`). |
| 3 | Business가 상호명·주소·카테고리·로고·설명을 저장하고 평점·리뷰 수·완료율을 실데이터로 확인할 수 있다 | VERIFIED | `src/app/biz/profile/{page.tsx,actions.ts,biz-profile-edit-form.tsx}` present. `updateBusinessProfile` does Zod whitelist, explicit `existing.userId !== session.id` owner check (BIZ-03), Prisma update + `$executeRaw` PostGIS location sync. `tests/profile/biz-profile.test.ts` 6 passing (1 skipped). 1:many profiles rendered per user. `business_profiles` RLS enabled. Browser E2E → human verification item 2. |
| 4 | Business가 새 공고(시급·교통비·인원·주소·드레스코드·준비물 포함)를 작성·수정·삭제하고 자기 공고 목록을 본다 | VERIFIED | **Was FAILED in prior verification.** Prisma client regenerated → `prisma.job.create`/`update` now accept all Phase 3 fields. `tests/jobs/job-crud.test.ts` 9 passing (2 todo) — POST-01 full-payload round-trip, POST-02 owner scoping, POST-03 owner checks + delete round-trip all green. `src/app/biz/posts/actions.ts` `createJob`/`updateJob`/`deleteJob` Server Actions each pair `requireBusiness()` with explicit `existing.authorId !== session.id` owner check. Browser E2E → human verification items 3+4. |
| 5 | Worker가 공고 목록을 페이지네이션으로 보고 상세에서 예상 수입까지 확인하며, workDate가 지난 공고는 자동으로 "만료"로 표시된다 | VERIFIED | **Caveat from prior verification is resolved.** `getJobsPaginated` and `getJobsByDistance` use `$queryRaw` + LAZY_FILTER_SQL with cursor `{createdAtISO}_{uuid}` — bypasses the ORM path entirely. `getJobById` (findUnique + include) now correctly SELECTs Phase 3 columns because the regenerated client knows about them — the silent-empty sections bug is fixed. `tests/jobs/postgis-distance.test.ts` 5 passing, `tests/jobs/job-expiry.test.ts` 4 passing. pg_cron `expire-jobs-every-5-min` scheduled on live DB. GIST index `jobs_location_gist_idx` present. `calculateEarnings` wired on detail page. Browser E2E → human verification items 5+6; pg_cron wall-clock → item 8. |

**Score:** 5/5 truths verified at the automated level. Browser/UX confirmation routed to `human_needed`.

---

## Requirement Coverage

| Requirement | Description | Status | Evidence |
|---|---|---|---|
| **WORK-01** | Worker가 이름, 닉네임, 프로필 사진, 소개글을 등록할 수 있다 | VERIFIED | `src/app/(worker)/my/profile/edit/actions.ts` updateWorkerProfile + uploadAvatar; worker-profile.test.ts passing |
| **WORK-02** | Worker가 선호 카테고리를 저장할 수 있다 | VERIFIED | `preferredCategories` in ProfileSchema + upsert |
| **WORK-03** | Worker가 뱃지/평점/근무 횟수/완료율을 프로필에서 본다 | VERIFIED | page.tsx passes badgeLevel/rating/totalJobs/completionRate as props; Zod schema does NOT read these from FormData |
| **WORK-04** | Worker는 본인 계정 프로필만 수정할 수 있다 (RLS) | VERIFIED | `requireWorker().id` drives upsert where clause; no form userId; worker_profiles RLS ON |
| **BIZ-01** | Business가 상호명/주소/카테고리/로고/설명 등록 | VERIFIED | BizProfileSchema covers all fields; biz-profile.test.ts BIZ-01 passing |
| **BIZ-02** | Business가 평점/리뷰 수/완료율 본다 | VERIFIED | page.tsx passes rating/reviewCount/completionRate/verified to form as display props; Zod schema whitelists only writable fields |
| **BIZ-03** | Business는 본인 계정 프로필만 수정할 수 있다 (RLS) | VERIFIED | explicit `existing.userId !== session.id` check; biz-profile.test.ts BIZ-03 passing |
| **POST-01** | Business가 새 공고(시급/교통비/인원/주소/드레스코드/준비물) 작성·저장 | **VERIFIED (was FAILED)** | Prisma client regenerated; job-crud.test.ts POST-01 full-payload round-trip passes; `createJob` Server Action reaches Prisma without `PrismaClientValidationError`. Browser E2E sign-off pending as human item 3. |
| **POST-02** | Business는 자기 공고 목록을 볼 수 있다 | VERIFIED | `getJobsByBusinessIds` + `/biz/posts/page.tsx` scoped to `profiles.map(p => p.id)`. POST-02 2/2 tests passing. |
| **POST-03** | Business는 공고를 수정하거나 삭제할 수 있다 | **VERIFIED (was FAILED)** | `updateJob` now reaches `prisma.job.update` with Phase 3 fields without throwing. `deleteJob` unchanged (always worked). POST-03 ownership tests pass. Browser E2E → human item 4. |
| **POST-04** | Worker는 로그인 없이 공고 목록을 페이지네이션으로 본다 | VERIFIED | `/` + `/posts/[id]` public via middleware `isAuthPublic`. `getJobsPaginated` uses `$queryRaw` + LAZY_FILTER_SQL + cursor. JobListInfinite IntersectionObserver wrapper present. Browser E2E → human item 5. |
| **POST-05** | Worker는 공고 상세에서 예상 수입 포함 모든 정보 확인 | **VERIFIED (was PARTIAL)** | Regenerated Prisma client now includes Phase 3 columns in findUnique SELECT. `/posts/{id}` and `/biz/posts/{id}` detail pages now receive real duties/requirements/dressCode/whatToBring/tags through adaptJob. `calculateEarnings` wired. Detail-section content validation → human item 3 (includes full detail render assertion). |
| **POST-06** | 공고는 workDate/startTime이 지나면 자동 "만료"로 전환된다 | VERIFIED | pg_cron `expire-jobs-every-5-min` schedule present. LAZY_FILTER_SQL applied in getJobsPaginated + getJobsByDistance. Render-time expiry check in `/posts/[id]/page.tsx` covers pg_cron staleness. job-expiry.test.ts 4/4 passing. Wall-clock sweep → human item 8. |

**Coverage:** 13/13 VERIFIED (automated). 0 FAILED. 0 PARTIAL. 0 orphaned requirements against REQUIREMENTS.md.

---

## Must-Haves Audit (Updated)

Only changes from prior verification are shown. All other must-haves remain VERIFIED from the prior run.

### 03-01 (Wave 0)

| Must-have | Prior | Now | Change Evidence |
|---|---|---|---|
| `prisma generate` regenerated client | **FAILED** | **VERIFIED** | `grep "duties" src/generated/prisma/models/Job.ts` returns 40+ hits across aggregate/count/min/max/select types. Embedded DMMF in `internal/class.ts` now serializes Phase 3 fields. `package.json` has `"postinstall": "prisma generate"` — regenerates automatically on any `npm install`. |

### 03-05 (Wave 3)

| Must-have | Prior | Now | Change Evidence |
|---|---|---|---|
| Business can create job with full Phase 3 payload | **FAILED** | **VERIFIED** | `tests/jobs/job-crud.test.ts` POST-01 full-payload test passes — duties/requirements/dressCode/whatToBring/tags/address/addressDetail all round-trip through `prisma.job.create` + `prisma.job.update` + `getJobById`. |
| Update/delete own jobs | **PARTIAL** | **VERIFIED** | updateJob path now works at runtime. deleteJob unchanged. Owner checks enforced at Server Action layer. |
| job-crud.test.ts ≥ 6 passing | **FAILED** (3/7) | **VERIFIED** (9 passing / 2 todo) | Full suite green. |

### 03-06 (Wave 4)

| Must-have | Prior | Now | Change Evidence |
|---|---|---|---|
| postgis-distance.test.ts ≥ 4 passing | **FAILED** (1/5) | **VERIFIED** (5/5) | `createTestJob` now works; each suite uses scoped cleanup prefixes — no cross-suite races. |
| job-expiry.test.ts ≥ 3 passing | **FAILED** (1/4) | **VERIFIED** (4/4) | Same root cause fix. |

**Updated must-haves total:** 48/48 met at the automated level (was 42/48).

---

## Regression Check (Phase 2)

| Area | Status | Evidence |
|---|---|---|
| Auth tests (magic-link, signup, kakao-oauth, google-oauth, role-select) | PASS | 5/5 files passing |
| DATA tests (seed, postgis, migrations) | PASS | 3/3 files passing (6+2+3 tests) |
| Proxy redirect (AUTH-05) | PASS | 2/2 tests passing |
| worker_profiles / business_profiles RLS | PASS | Still enabled per pg_class query |
| PostGIS extension | PASS | tests/data/postgis.test.ts 2/2 passing |
| No @/lib/mock-data imports in production code | PASS | Only comment references remain in `src/lib/types/job.ts` and `src/lib/job-utils.ts` — no `import` statements |

**Regression verdict:** Zero regressions from Phase 2. All Phase 2 baseline tests still green.

---

## Non-Blocking Review Findings (03-REVIEW.md)

These were identified during code review and remain open for Phase 4+. They do not affect Phase 3 goal achievement but should be addressed before Phase 4 merge:

- **HI-01:** Storage bucket named `public` with bucket-wide SELECT policy. Any future non-avatar object uploaded here will be world-readable. Constrain SELECT to `(storage.foldername(name))[1] = 'avatars'` or rename bucket to `avatars`.
- **HI-02:** Middleware reads stale `app_metadata.role` from JWT; just-promoted BOTH users may hit `error=worker_required` before DAL runs. Trigger `supabase.auth.refreshSession()` after role changes.
- **ME-01:** Client-side `workHours` allows overnight shifts but server rejects them with `return 0` — silent UX mismatch at publish. Align client and server semantics.
- **ME-05:** pg_cron + lazy filter cast `workDate::timestamp + startTime::time` without explicit Asia/Seoul timezone. Works under Supabase UTC default but implicit. Add `AT TIME ZONE 'Asia/Seoul'`.
- **ME-09:** `getJobsByDistance` cursor encodes `(createdAt, id)` but ORDER BY is `distance_m` — produces incorrect pagination at distance-mode page boundaries. Encode `distance_m` into cursor.

Full details in `.planning/phases/03-db/03-REVIEW.md` — 0 CRITICAL, 2 HIGH, 9 MEDIUM, 10 LOW, 3 NOTE.

---

## Behavioral Spot-Checks (Re-run)

| Behavior | Command | Result | Status |
|---|---|---|---|
| Vitest suite runs | `npx vitest run tests/auth tests/data tests/proxy tests/jobs tests/profile tests/storage tests/utils` | 16 files / 54 passed / 0 failed / 5 todo in 3.27s | **PASS** |
| Live DB has Phase 3 job columns | `information_schema.columns` query (prior) | duties, requirements, dressCode, whatToBring, tags, address, addressDetail all present | PASS |
| Jobs RLS enabled | `pg_class.relrowsecurity` | true for jobs | PASS |
| Applications/Reviews RLS disabled (unchanged) | `pg_class.relrowsecurity` | false for both | PASS |
| pg_cron job scheduled | `SELECT * FROM cron.job` | expire-jobs-every-5-min schedule `*/5 * * * *` | PASS |
| GIST index on jobs.location | `pg_indexes` | jobs_location_gist_idx present | PASS |
| Storage public bucket exists | `storage.buckets` | `{id:'public', public:true}` | PASS (HI-01 recommends rename) |
| Storage 4 RLS policies | `pg_policies WHERE schemaname='storage'` | 4 policies present | PASS |
| Jobs 4 RLS policies | `pg_policies WHERE schemaname='public' AND tablename='jobs'` | 4 policies present | PASS |
| Generated Prisma client in sync with schema | `grep -l "duties" src/generated/prisma/models/Job.ts` | exit 0, 40+ matches | **PASS (was FAIL)** |
| package.json has postinstall hook | `grep postinstall package.json` | `"postinstall": "prisma generate"` | **PASS (new)** |
| cleanupTestJobs requires prefix | grep tests/helpers/test-jobs.ts | throws if prefix empty or missing `TEST_` start | **PASS (new)** |
| No @/lib/mock-data imports in production | `grep "from.*mock-data" src/` | 0 import statements (only comments) | PASS |

---

## Human Verification Required

8 items remain (listed in frontmatter). All are browser UX / real-auth / wall-clock flows that cannot be validated via vitest. These do NOT block automated verification but require sign-off before the phase is considered complete in the field:

1. Worker profile edit live UI flow (WORK-01..04)
2. Business profile edit live UI flow (BIZ-01..03)
3. **POST-01 createJob end-to-end (now unblocked)** — full 5-step form including Phase 3 detail sections rendering on /posts/{id}
4. **POST-03 updateJob + deleteJob end-to-end (now unblocked)**
5. Anonymous landing POST-04 pagination + click-through
6. Worker /home geolocation permission + distance sort (D-06)
7. Storage RLS cross-user upload rejection
8. pg_cron wall-clock 5-minute sweep (POST-06)

---

## Gaps Summary

**Prior gaps: closed.** The single root cause (stale generated Prisma client at `src/generated/prisma/`) has been fixed by commit `7483e48`, which added `"postinstall": "prisma generate"` to `package.json` so the client regenerates on every `npm install`. The secondary test-race gap (overly broad `cleanupTestJobs()`) has also been fixed by requiring a scoped prefix argument — all three parallel job suites (`job-crud`, `postgis-distance`, `job-expiry`) now run cleanly in parallel with zero cross-suite interference.

**What is green:**
- All 4 Supabase migrations applied to live DB (GIST, jobs RLS, Storage bucket/policies, pg_cron)
- Worker profile CRUD (WORK-01..04)
- Business profile CRUD (BIZ-01..03)
- Business job CRUD full Phase 3 payload — create, update, delete (POST-01..03)
- Worker read surface — landing, /home, public detail, lazy filter, cursor pagination, distance sort (POST-04..06)
- 16 test files / 54 automated tests / 0 failures / 5 todo
- Zero Phase 2 regressions
- Zero production mock-data imports

**What still needs human sign-off:**
- 8 browser UX / wall-clock items listed in `human_verification:` frontmatter. None of them are coding gaps — they are inherent to browser-only primitives (IntersectionObserver, navigator.geolocation, Supabase cookie auth, Storage RLS under real JWT, pg_cron scheduler).

**Non-blocking follow-ups (03-REVIEW.md):** HI-01 (Storage bucket naming), HI-02 (middleware stale JWT), ME-01 (overnight shift UX), ME-05 (pg_cron timezone), ME-09 (distance cursor). None block Phase 3; all are candidates for Phase 4 pre-merge cleanup.

**Phase 3 is automated-complete.** The goal "Worker/Business가 자기 프로필을 실제로 저장·수정하고, Business가 작성한 공고가 실 DB에서 CRUD로 동작한다" is satisfied at the code + test + DB level. Status: `human_needed` — awaiting sign-off on the 8 browser/UX flows.

---

_Re-verified: 2026-04-10T19:05:00Z_
_Verifier: Claude (gsd-verifier)_
_Prior verification: 2026-04-10T18:50:00Z (gaps_found, 3/5) → now human_needed, 5/5 automated_
