---
phase: 03-db
verified: 2026-04-10T18:50:00Z
status: gaps_found
score: 3/5 success criteria verified
overrides_applied: 0
requirements_covered:
  - WORK-01
  - WORK-02
  - WORK-03
  - WORK-04
  - BIZ-01
  - BIZ-02
  - BIZ-03
  - POST-02
  - POST-04
  - POST-06
requirements_missing:
  - POST-01
  - POST-03
  - POST-05
must_haves: 48
must_haves_met: 42
gaps:
  - truth: "Business user can create a new Job with title + category + description + hourlyPay + transportFee + workDate + startTime + endTime + headcount + address + dressCode + duties[] + requirements[] + whatToBring[] + tags[]"
    status: failed
    reason: "Generated Prisma client is stale. `src/generated/prisma/` was NOT regenerated after the Phase 3 schema additions in 03-01. The live DB has every new column (verified via information_schema), but `prisma.job.create({ data: { duties, requirements, dressCode, whatToBring, tags, address, addressDetail } })` throws `PrismaClientValidationError: Unknown argument 'duties'` at runtime. Confirmed both via `tests/jobs/job-crud.test.ts` (4 failing) and a runtime probe showing `prisma.job.findFirst()` returns only Phase 2 keys (no duties/dressCode/etc). `createJob` in `src/app/biz/posts/actions.ts` will crash on every invocation. 03-01 SUMMARY explicitly claimed `npx prisma generate` was run; it was not — or was reverted/replaced before commit."
    artifacts:
      - path: "src/generated/prisma/models/Job.ts"
        issue: "Missing Phase 3 fields in Job aggregates, Min/Max outputs, and select/include types"
      - path: "src/generated/prisma/internal/class.ts"
        issue: "Embedded schema (line 25) still contains Phase 2 `model Job` definition with no duties/requirements/dressCode/whatToBring/tags/address/addressDetail"
      - path: "src/app/biz/posts/actions.ts:226"
        issue: "createJob calls prisma.job.create with Phase 3 fields — throws at runtime"
      - path: "src/app/biz/posts/actions.ts:345"
        issue: "updateJob calls prisma.job.update with Phase 3 fields — throws at runtime"
      - path: "tests/helpers/test-jobs.ts:25"
        issue: "createTestJob.prisma.job.create includes duties/requirements/whatToBring/tags — throws at runtime (cause of 11 failing tests)"
    missing:
      - "Run `npx prisma generate` (or equivalent Prisma 7 generator command) to regenerate `src/generated/prisma/` from the current `prisma/schema.prisma`"
      - "Re-run `npx vitest run tests/jobs` and confirm job-crud, job-expiry, and postgis-distance test files pass"
      - "Manually verify: log in as business@dev.gignow.com → /biz/posts/new → submit form → confirms redirect to /biz/posts/{id} without 500 error"

  - truth: "Business user can update and delete their own jobs via Server Action"
    status: partial
    reason: "deleteJob path works (doesn't touch Phase 3 fields). updateJob path is BROKEN for identical stale-client reason — any update submission throws PrismaClientValidationError. Owner-check code is correct; it is the update payload that crashes."
    artifacts:
      - path: "src/app/biz/posts/actions.ts:345"
        issue: "prisma.job.update data includes duties/requirements/dressCode/whatToBring/tags/address/addressDetail — stale client rejects"
    missing:
      - "After prisma generate, re-run tests/jobs/job-crud.test.ts and verify updateJob E2E flow manually"

  - truth: "Worker on /posts/[id] sees all job information (duties, requirements, dressCode, whatToBring, tags) plus predicted earnings"
    status: partial
    reason: "POST-05 earnings display works (workHours and hourlyPay come through via Phase 2 columns the stale client knows about). BUT the public job detail page `src/app/posts/[id]/page.tsx` reads duties/requirements/dressCode/whatToBring/tags via `getJobById()` → `prisma.job.findUnique({ include: JOB_INCLUDE })` → `adaptJob()`. The stale Prisma client generates SQL that SELECTs only Phase 2 columns, so those fields arrive as undefined and adaptJob defaults them to empty arrays / empty string. Runtime probe confirms: `prisma.job.findFirst()` returns keys `['id','businessId','authorId','title','category','description','hourlyPay','transportFee','workDate','startTime','endTime','workHours','headcount','filled','lat','lng','status','isUrgent','nightShiftAllowance','createdAt','updatedAt']` — no Phase 3 fields. Therefore public/biz detail pages silently render empty duties/requirements/tags sections. Earnings + core info are OK."
    artifacts:
      - path: "src/lib/db/queries.ts:147-169"
        issue: "getJobs/getJobById use `include: JOB_INCLUDE` + Prisma findUnique — stale client drops Phase 3 columns from SELECT"
      - path: "src/app/posts/[id]/page.tsx:116-175"
        issue: "Renders job.duties, job.requirements, job.dressCode, job.whatToBring, job.tags — all silently empty"
      - path: "src/app/biz/posts/[id]/page.tsx"
        issue: "Same adaptJob path — biz detail page also silently empty"
    missing:
      - "Run prisma generate so findUnique/findMany pull the new columns"
      - "After regeneration, verify /posts/{id} shows duties/requirements/tags/dressCode for a seeded job that has them populated"

deferred: []
human_verification:
  - test: "End-to-end Worker profile edit (WORK-01..04) — live browser"
    expected: "Log in as worker@dev.gignow.com → /my/profile/edit → change name/nickname/bio/preferredCategories → save → reload page → values persist; upload a 2MB JPG → avatar appears in header + /my; try to upload a 6MB file → client rejects with 5MB error"
    why_human: "React 19 useActionState + FormData + Supabase Storage upsert + @supabase/ssr cookie auth cannot be fully simulated via unit tests. The DAL + Storage RLS combo only executes under real browser cookies."

  - test: "End-to-end Business profile edit (BIZ-01..03) — live browser"
    expected: "Log in as business@dev.gignow.com → /biz/profile → 1 profile visible; edit name/address/category/logo emoji/description/lat/lng → save → reload → values persist; log in as admin@dev.gignow.com → see 6+ BusinessProfile rows and confirm each form isolates fields by profileId"
    why_human: "1:many BusinessProfile rendering per user + per-profile form isolation can only be validated under real multi-profile seed data in the browser."

  - test: "Anonymous visitor landing page POST-04 pagination flow"
    expected: "Open `/` in an incognito/unauthenticated browser → see ≥1 job from DB in the list → scroll to bottom → more jobs lazy-load via IntersectionObserver → click a job card → /posts/{id} loads without redirecting to /login → click 원탭 지원 → redirects to /login?next=/posts/{id}"
    why_human: "Middleware isAuthPublic matching + IntersectionObserver + client/SSR cursor handoff require a real browser (jsdom does not provide IntersectionObserver)."

  - test: "Worker /home geolocation + distance sort (D-06)"
    expected: "Log in as worker@dev.gignow.com → /home → click '내 근처 공고 먼저 보기' → browser shows geolocation permission prompt → allow → subsequent scroll shows jobs sorted by distance (closer first); deny permission → Seoul City Hall fallback banner appears; click 위치 권한 다시 요청 → prompt reappears"
    why_human: "navigator.geolocation permission prompt is a browser primitive; cannot be programmatically verified."

  - test: "Worker avatar upload — Storage RLS path scoping"
    expected: "As worker@dev.gignow.com, upload `avatars/{other-user-id}/avatar.png` directly via @supabase/supabase-js → expect 403 (Storage RLS blocks). As worker@dev.gignow.com, upload `avatars/{self}/avatar.png` → expect success."
    why_human: "Storage RLS enforcement under the authenticated JWT only reproduces under real auth session."

  - test: "pg_cron expiry — 5 minute sweep"
    expected: "Insert a test job with workDate = today and startTime 6 minutes in the past → wait ≤ 5 minutes → query the row → status = 'expired'"
    why_human: "pg_cron runs on Supabase's scheduler, not on test invocation. Requires wall-clock waiting."

  - test: "POST-01 createJob end-to-end AFTER prisma regenerate"
    expected: "AFTER fixing the stale Prisma client, log in as business@dev.gignow.com → /biz/posts/new → fill 5-step form with duties/requirements/dressCode/whatToBring/tags → publish → redirected to /biz/posts/{id} → new job visible on /biz/posts and on public / landing → detail page renders all populated fields"
    why_human: "The write-path gap (stale Prisma client) must be closed before this can be validated; once closed, only a live browser session can confirm end-to-end wiring."
---

# Phase 3: 프로필·공고 DB 연결 Verification Report

**Phase Goal:** Worker/Business가 자기 프로필을 실제로 저장·수정하고, Business가 작성한 공고가 실 DB에서 CRUD로 동작한다
**Verified:** 2026-04-10T18:50:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

The phase goal is **partially met**. Profile CRUD for both roles (Worker and Business) is fully functional end-to-end: schema, Server Actions, owner checks, tests, and UI wiring all verified against the live DB. Avatar upload to Supabase Storage works with correct RLS subfolder scoping. Read paths for jobs (public landing list, /home infinite scroll, PostGIS distance sort, pg_cron expiry lazy filter) are wired via `prisma.$queryRaw` and bypass the stale client problem — they work.

**But the job WRITE half of the phase (POST-01 createJob, POST-03 updateJob) is broken at runtime.** The Phase 3 schema extension landed in `prisma/schema.prisma` and was pushed to the live DB (all 7 new columns verified present in `information_schema.columns`), but `src/generated/prisma/` was never regenerated. Any call to `prisma.job.create` or `prisma.job.update` that includes `duties`, `requirements`, `dressCode`, `whatToBring`, `tags`, `address`, or `addressDetail` throws `PrismaClientValidationError: Unknown argument` at runtime. 03-01 SUMMARY claims "Prisma client regenerated" — this is contradicted by direct inspection of the generated files. 11 Phase 3 tests fail from the exact same root cause, including the POST-01/POST-03/POST-06/D-06 tests.

The read side is silently degraded: `getJobById` and `getJobsByBusinessIds` use Prisma's ORM path (findUnique/findMany + include), so they rely on the stale client's model metadata. The SELECT statements emitted skip Phase 3 columns entirely, which means detail pages render empty `duties`/`requirements`/`tags`/`dressCode`/`whatToBring` even when DB rows contain them. Earnings, hourlyPay, workHours — which live in Phase 2 columns — come through correctly.

### Observable Truths

| # | Truth (from ROADMAP.md Success Criteria) | Status | Evidence |
|---|---|---|---|
| 1 | Worker가 자기 프로필(이름, 닉네임, 사진, 소개글, 선호 카테고리)을 저장하고 다시 열어도 동일 값이 DB에서 복구된다 | VERIFIED | `src/app/(worker)/my/profile/edit/{page.tsx,actions.ts,worker-profile-edit-form.tsx}` all exist and wire to `prisma.workerProfile.upsert` via `requireWorker`. `tests/profile/worker-profile.test.ts` 5/5 passing. Avatar upload helper `src/lib/supabase/storage.ts` writes to `avatars/{userId}/avatar.{ext}` with size+MIME validation. `tests/storage/avatar-upload.test.ts` 8/8 passing. |
| 2 | Worker는 자기 프로필의 뱃지 레벨·평점·근무 횟수·완료율을 실데이터 기반으로 확인하고, 다른 사용자 프로필은 수정할 수 없다 (RLS) | VERIFIED | Read-only fields passed as props to form but NOT in Zod schema (actions.ts:23-28) — Phase 3 write-path explicitly whitelists `{name, nickname, bio, preferredCategories}` only. Owner enforcement via `requireWorker().id` feeds the where clause directly; no form-supplied userId. worker_profiles RLS enabled (verified via `pg_class.relrowsecurity = true`). |
| 3 | Business가 상호명·주소·카테고리·로고·설명을 저장하고 평점·리뷰 수·완료율을 실데이터로 확인할 수 있다 | VERIFIED | `src/app/biz/profile/{page.tsx,actions.ts,biz-profile-edit-form.tsx}` present. `updateBusinessProfile` does Zod whitelist, explicit `existing.userId !== session.id` owner check (BIZ-03), Prisma update + `$executeRaw` PostGIS location sync. `tests/profile/biz-profile.test.ts` 6/6 passing. 1:many profiles rendered per user. business_profiles RLS enabled. |
| 4 | Business가 새 공고(시급·교통비·인원·주소·드레스코드·준비물 포함)를 작성·수정·삭제하고 자기 공고 목록을 본다 | FAILED | `createJob` and `updateJob` Server Actions reference Phase 3 columns in their `prisma.job.{create,update}` payloads. Generated Prisma client is stale (Phase 2 shape only). Both actions will throw `PrismaClientValidationError: Unknown argument 'duties'` on invocation. Confirmed via 4 failing tests in `tests/jobs/job-crud.test.ts`. `deleteJob` works (no Phase 3 fields touched). List view `/biz/posts` works but silently drops Phase 3 fields during render. |
| 5 | Worker가 공고 목록을 페이지네이션으로 보고 상세에서 예상 수입까지 확인하며, workDate가 지난 공고는 자동으로 "만료"로 표시된다 | VERIFIED (with caveat) | `getJobsPaginated` and `getJobsByDistance` use `$queryRaw` that explicitly SELECTs Phase 3 columns — bypasses stale client. Cursor format `{createdAtISO}_{uuid}` + LAZY_FILTER_SQL applied. `src/app/page.tsx` (landing) + `src/app/(worker)/home/page.tsx` (worker) + `src/app/posts/[id]/page.tsx` (public detail outside (worker) group) all wired. pg_cron `expire-jobs-every-5-min` scheduled on live DB. GIST index `jobs_location_gist_idx` present. `calculateEarnings` used directly on detail page. **Caveat:** Detail page also renders duties/requirements/dressCode/whatToBring/tags via `getJobById` which uses the ORM path — those sections will be empty even after pagination shows the card. Core earnings info (hourlyPay × workHours + transport + nightShift) works because those are Phase 2 columns. |

**Score:** 3/5 truths fully verified, 1/5 partial (truth 5 is downgraded to partial-VERIFIED because detail renders silently-empty Phase 3 sections), 1/5 FAILED (truth 4 — the write half).

---

## Requirement Coverage

Phase 3 declared requirements in each PLAN frontmatter; I cross-referenced against REQUIREMENTS.md.

| Requirement | Description | Status | Evidence |
|---|---|---|---|
| **WORK-01** | Worker가 이름, 닉네임, 프로필 사진, 소개글을 등록할 수 있다 | VERIFIED | `src/app/(worker)/my/profile/edit/actions.ts` updateWorkerProfile + uploadAvatar; worker-profile.test.ts passing |
| **WORK-02** | Worker가 선호 카테고리를 저장할 수 있다 | VERIFIED | `preferredCategories` in ProfileSchema + upsert (actions.ts:27, 76) |
| **WORK-03** | Worker가 뱃지/평점/근무 횟수/완료율을 프로필에서 본다 | VERIFIED | page.tsx passes badgeLevel/rating/totalJobs/completionRate as props (edit/page.tsx:48-52); Zod schema does NOT read these from FormData — they are display-only. |
| **WORK-04** | Worker는 본인 계정 프로필만 수정할 수 있다 (RLS) | VERIFIED | `requireWorker().id` drives upsert where clause; no form userId read; worker_profiles RLS ON; worker-profile.test.ts WORK-04 assertions pass |
| **BIZ-01** | Business가 상호명/주소/카테고리/로고/설명 등록 | VERIFIED | `src/app/biz/profile/actions.ts:22-56` BizProfileSchema covers all fields; biz-profile.test.ts BIZ-01 passing |
| **BIZ-02** | Business가 평점/리뷰 수/완료율 본다 | VERIFIED | page.tsx passes rating/reviewCount/completionRate/verified to form as display props; Zod schema whitelists only writable fields |
| **BIZ-03** | Business는 본인 계정 프로필만 수정할 수 있다 (RLS) | VERIFIED | `actions.ts:104-116` explicit `existing.userId !== session.id` check; generic Korean error; log-warns drift; biz-profile.test.ts BIZ-03 passing |
| **POST-01** | Business가 새 공고(시급/교통비/인원/주소/드레스코드/준비물) 작성·저장 | **FAILED** | Server Action exists and Zod schema covers all required fields, but `prisma.job.create` throws at runtime because generated client lacks Phase 3 columns. Confirmed via 2 failing POST-01 tests in tests/jobs/job-crud.test.ts |
| **POST-02** | Business는 자기 공고 목록을 볼 수 있다 | VERIFIED | `getJobsByBusinessIds` + `/biz/posts/page.tsx` scoped to `profiles.map(p => p.id)`. 2/3 POST-02 tests passing (1 fails because helper uses createTestJob which hits the stale-client bug — not a POST-02 logic failure) |
| **POST-03** | Business는 공고를 수정하거나 삭제할 수 있다 | **FAILED (partial)** | `updateJob` reaches `prisma.job.update` which includes Phase 3 fields → throws. `deleteJob` works (deletes row; owner check verified). Code-level owner check tests pass (source-grep). Runtime update is broken. |
| **POST-04** | Worker는 로그인 없이 공고 목록을 페이지네이션으로 본다 | VERIFIED | `/` (src/app/page.tsx) + `/posts/[id]` are public via middleware `isAuthPublic` prefix check. `getJobsPaginated` uses `$queryRaw` + LAZY_FILTER_SQL + cursor `{createdAtISO}_{uuid}`. JobListInfinite IntersectionObserver wrapper present. `tests/e2e/public-job-list.spec.ts` exists (2 Playwright tests, not run by vitest). |
| **POST-05** | Worker는 공고 상세에서 예상 수입 포함 모든 정보 확인 | **PARTIAL** | `calculateEarnings` call wired; workHours/hourlyPay come through. BUT the detail page renders `job.duties.map`, `job.requirements.map`, `job.whatToBring.map`, `job.tags.map`, `job.dressCode` — and `adaptJob()` returns empty defaults for all of these because the stale Prisma client does not SELECT them. Result: detail page shows title, category, earnings, location, description — but "주요 업무", "지원 조건", "복장", "준비물", tags sections are empty even when DB has data. |
| **POST-06** | 공고는 workDate/startTime이 지나면 자동 "만료"로 전환된다 | VERIFIED | pg_cron `expire-jobs-every-5-min` schedule present in cron.job (verified via live query). LAZY_FILTER_SQL identical expression applied in getJobsPaginated + getJobsByDistance. Render-time expiry check in `/posts/[id]/page.tsx:36-37` covers pg_cron staleness. **Caveat:** 3 automated job-expiry tests fail — but all via createTestJob helper hitting the stale-client bug, not an expiry logic issue. The pg_cron schedule row itself exists; the lazy filter SQL is correct. |

**Coverage:** 10/13 VERIFIED, 2/13 FAILED (POST-01, POST-03), 1/13 PARTIAL (POST-05). The Phase scope claimed 13 requirements; no orphaned requirements found in REQUIREMENTS.md for Phase 3.

---

## Must-Haves Audit

Combined must_haves across all six plan frontmatters:

### 03-01 (Wave 0 — schema + test scaffolds)
| Must-have | Status | Note |
|---|---|---|
| 8 Wave 0 test files exist | VERIFIED | All 8 present in tests/{profile,jobs,storage,e2e,utils,helpers} |
| Prisma schema has Phase 3 columns | VERIFIED | `prisma/schema.prisma:152-158` has duties/requirements/dressCode/whatToBring/tags/address/addressDetail |
| next.config.ts bodySizeLimit 5mb | VERIFIED | `next.config.ts:6` |
| `prisma db push` applied columns to live DB | VERIFIED | Live `information_schema.columns` shows all 7 new columns |
| **`prisma generate` regenerated client** | **FAILED** | `src/generated/prisma/` contains Phase 2 shape only. `grep -r 'duties' src/generated/prisma/` returns 0 hits. Embedded DMMF in `class.ts:25` shows Phase 2 Job model. Runtime probe confirms `prisma.job.findFirst()` returns Phase 2 keys only. **This is the root blocker.** |
| Test files discoverable by vitest/playwright | VERIFIED | vitest finds 16 test files; playwright config present |
| form-state.ts exports | VERIFIED | ActionResult, FieldActionResult, ProfileFormState, AvatarFormState, JobFormState all exported (`src/lib/form-state.ts`) |

### 03-02 (Wave 1 — Supabase migrations)
| Must-have | Status | Note |
|---|---|---|
| Jobs RLS ENABLED, public SELECT + owner writes | VERIFIED | pg_class.relrowsecurity=true for jobs; 4 policies present: jobs_public_select, jobs_owner_insert, jobs_owner_update, jobs_owner_delete |
| Applications/Reviews RLS remain DISABLED | VERIFIED | pg_class.relrowsecurity=false for applications, reviews |
| storage.buckets has `public` bucket with public=true | VERIFIED | Live query returned `{id:'public', name:'public', public:true}` |
| 4 storage.objects RLS policies | VERIFIED | public_avatars_select, own_avatar_{insert,update,delete} present. **Caveat (HI-01 from 03-REVIEW):** SELECT policy is bucket-wide, not avatars-prefix-constrained — any future non-avatar object uploaded here will be world-readable. Documented in 03-REVIEW, not fixed. |
| pg_cron scheduled expire-jobs-every-5-min | VERIFIED | `cron.job` row present with `'*/5 * * * *'` |
| jobs_location_gist_idx exists | VERIFIED | pg_indexes query confirms |
| apply-supabase-migrations.ts idempotent | VERIFIED | script exists; deferred-items.md logs a pre-existing drift |

### 03-03 (Wave 2 — Worker profile + avatar)
| Must-have | Status | Note |
|---|---|---|
| Worker persists name/nickname/bio/preferredCategories | VERIFIED | upsert pattern, tests passing |
| Avatar upload ≤5MB JPEG/PNG/WebP persisted to workerProfile.avatar | VERIFIED | uploadAvatarFile 3-layer validation; avatar-upload.test.ts passing |
| Re-upload upserts file | VERIFIED | `upsert: true` flag + fixed path |
| Server Action uses requireWorker() session.id | VERIFIED | actions.ts:43, 112 |
| Worker cannot update another user's profile | VERIFIED | where clause uses session.id; no form userId |
| WORK-03 read-only fields NOT in FormData | VERIFIED | Zod schema does not include them |
| worker-profile.test.ts ≥ 4 passing | VERIFIED | 4 passing + 1 todo |
| avatar-upload.test.ts ≥ 3 passing | VERIFIED | 8 passing (exceeds claim) |

### 03-04 (Wave 2 — Business profile)
| Must-have | Status | Note |
|---|---|---|
| Business saves name/address/category/logo/description/lat/lng | VERIFIED | BizProfileSchema covers all; biz-profile.test.ts passing |
| Round-trip read returns same values | VERIFIED | biz-profile.test.ts BIZ-01 round-trip test passing |
| Read-only fields (rating/reviewCount/completionRate/verified) not in FormData | VERIFIED | Zod whitelist excludes them |
| Server Action uses requireBusiness() session.id | VERIFIED | actions.ts:73 |
| 1:many multi-profile handling | VERIFIED | page.tsx:30 renders .map; per-profile htmlFor IDs |
| biz-profile.test.ts ≥ 4 passing | VERIFIED | 5 passing + 1 skipped |

### 03-05 (Wave 3 — Biz job CRUD)
| Must-have | Status | Note |
|---|---|---|
| Business can create job with full Phase 3 payload | **FAILED** | Stale Prisma client rejects `duties` argument at runtime |
| lat/lng default from BusinessProfile | VERIFIED (code) | actions.ts:217-222 — logic is correct but unreachable due to stale client |
| List scoped to owner businessIds | VERIFIED | `/biz/posts/page.tsx` |
| Update/delete own jobs | **PARTIAL** | updateJob broken (same cause); deleteJob works |
| Non-owner update/delete blocked | VERIFIED (code) | `existing.authorId !== session.id` in both updateJob and deleteJob |
| workHours computed server-side | VERIFIED | `computeWorkHours` called before Prisma write; not read from FormData |
| location column written via $executeRaw | VERIFIED | actions.ts:260-264 |
| job-crud.test.ts ≥ 6 passing | **FAILED** | 3 passing / 4 failing / 2 skipped — all failures traced to stale client |

### 03-06 (Wave 4 — Worker read surface)
| Must-have | Status | Note |
|---|---|---|
| Anonymous visitor sees jobs from DB on / | VERIFIED | `src/app/page.tsx:24` calls getJobsPaginated; middleware `/` is isAuthPublic |
| Anonymous click /posts/{id} opens without login | VERIFIED | middleware isAuthPublic includes `/posts/` prefix; public route file exists outside (worker) group |
| 원탭 지원 without session → /login?next=/posts/{id} | VERIFIED | `/posts/[id]/page.tsx:190` |
| Logged-in worker sees distance sort when geolocation granted | VERIFIED | HomeJobList + useGeolocation + loadMoreJobs dispatch to getJobsByDistance |
| Geolocation denied fallback → Seoul City Hall + banner | VERIFIED | home-job-list.tsx:60-84 + use-geolocation.ts SEOUL_CITY_HALL constant |
| Cursor format {createdAtISO}_{uuid} stable | VERIFIED | encodeJobCursor/decodeJobCursor + 24+1+36 length invariant |
| LAZY_FILTER_SQL hides expired jobs | VERIFIED | Applied in both getJobsPaginated and getJobsByDistance |
| postgis-distance.test.ts ≥ 4 passing | **FAILED** | 1 passing / 4 failing — all failures are createTestJob stale-client not PostGIS logic |
| job-expiry.test.ts ≥ 3 passing | **FAILED** | 1 passing / 3 failing — same root cause |
| public-job-list.spec.ts ≥ 2 Playwright tests | VERIFIED (file exists) | Not executed in this verification (no playwright run); Playwright suite not in vitest scope |

---

## Regression Check

Phase 2 baseline: 11/11 automated must-haves verified in `02-VERIFICATION.md`.

| Area | Status | Evidence |
|---|---|---|
| Auth tests (magic-link, signup, kakao-oauth, google-oauth, role-select) | PASS | 5/5 files passing in vitest run |
| DATA tests (seed, postgis, migrations) | PASS | 3/3 files passing (including the RLS-on-jobs assertion that deferred-items.md flagged — appears to have been silently fixed later) |
| Proxy redirect (AUTH-05) | PASS | 2/2 tests passing |
| worker_profiles / business_profiles RLS | PASS | Still enabled per pg_class query |
| PostGIS extension | PASS | tests/data/postgis.test.ts 2/2 passing |
| No regression in Phase 2 paths | PASS | No Phase 2 test file failed |

**Regression verdict:** Zero regressions from Phase 2 detected. All Phase 2 baseline tests still green.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `src/app/biz/posts/actions.ts` | 226, 345 | `prisma.job.create/update` with fields absent from generated client | Blocker | Runtime crash on every create/update invocation |
| `tests/helpers/test-jobs.ts` | 25-52 | Same issue in test helper | Blocker | 11 test failures |
| `src/lib/db/queries.ts` | 96 | `distanceM: 0, // TODO Phase 3` (legacy adaptJob) | Warning | adaptJob used for biz dashboard only; distance not shown there anyway |
| `src/lib/db/queries.ts` | 79-82, 98 | `(j.duties as string[] \|\| null) ?? []` — silently defaults to empty when stale client doesn't SELECT the column | Warning | Silent data loss at render time for /posts/[id] and /biz/posts/[id] |
| `src/generated/prisma/internal/class.ts` | 25 | Embedded DMMF still Phase 2 shape | Blocker | Root cause of all runtime failures |
| 03-01-SUMMARY.md | frontmatter | Claims `npx prisma generate` was run | Info | Summary vs. reality mismatch — summary overstated completion |
| `supabase/migrations/20260411000002_storage_setup_avatars.sql` | 34-37 | Bucket-wide SELECT policy without avatars prefix constraint (HI-01) | Warning | Any future non-avatar object becomes world-readable; not blocking Phase 3 goal but should be fixed before Phase 4 |
| `src/lib/supabase/middleware.ts` | 65-100 | Stale JWT claim role check can redirect just-promoted BOTH users before DAL runs (HI-02) | Warning | Edge case during role transitions; not blocking |
| `src/app/biz/posts/actions.ts` | 393-425 | `deleteJob` takes a plain string arg — callable by any client with auth cookie (ME-02) | Warning | Owner check saves it; still an anti-pattern |
| `src/app/(worker)/my/profile/edit/actions.ts` | 124-137 | uploadAvatar upsert creates phantom WorkerProfile with name "이름 미설정" if uploaded before first profile save (ME-03) | Warning | First-run footgun, non-blocking |
| `supabase/migrations/20260411000003_pg_cron_expire_jobs.sql` | 22-28 | Naive timestamp cast without explicit Asia/Seoul tz (ME-05) | Warning | Works correctly under Supabase UTC default but implicit |
| `src/lib/db/queries.ts` | 604-671 | `getJobsByDistance` cursor uses `(createdAt, id)` tuple on distance-ordered results (ME-09) | Warning | Produces incorrect pagination across page boundaries in distance mode |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Vitest suite runs | `npx vitest run` | 3 test files failed, 13 passed; 11 tests failed, 43 passed, 5 todo | FAIL |
| Live DB has Phase 3 job columns | `information_schema.columns` query | duties, requirements, dressCode, whatToBring, tags, address, addressDetail all present | PASS |
| Jobs RLS enabled | `pg_class.relrowsecurity` | true for jobs | PASS |
| Applications/Reviews RLS disabled (unchanged) | `pg_class.relrowsecurity` | false for both | PASS |
| pg_cron job scheduled | `SELECT * FROM cron.job` | expire-jobs-every-5-min schedule `*/5 * * * *` | PASS |
| GIST index on jobs.location | `pg_indexes` | jobs_location_gist_idx present | PASS |
| Storage public bucket exists | `storage.buckets` | `{id:'public', public:true}` | PASS |
| Storage 4 RLS policies | `pg_policies WHERE schemaname='storage'` | 4 policies present | PASS |
| Jobs 4 RLS policies | `pg_policies WHERE schemaname='public' AND tablename='jobs'` | 4 policies present | PASS |
| Generated Prisma client in sync with schema | `grep -r 'duties' src/generated/prisma/` | 0 matches | FAIL |
| Runtime Prisma.job.findFirst keys | Inline vitest probe | Returns only Phase 2 keys (no duties/requirements/dressCode/etc) | FAIL |
| No @/lib/mock-data imports in scoped src | `grep -r 'from.*mock-data' src/` | 0 hits | PASS |

---

## Human Verification Required

Listed inline in frontmatter `human_verification:` — 7 items covering Worker profile UI flow, Business profile UI flow, anonymous landing pagination, geolocation/distance sort, Storage RLS enforcement, pg_cron real-time sweep, and a post-fix createJob E2E validation.

---

## Gaps Summary

**Single root cause, multiple symptoms:** The generated Prisma client at `src/generated/prisma/` was not regenerated after Phase 3 schema changes in 03-01. One command — `npx prisma generate` — would unblock the entire write half of the phase and the majority of failing tests.

**What works:**
- All 4 Supabase migrations applied correctly to live DB (GIST, jobs RLS, Storage bucket/policies, pg_cron)
- Worker profile CRUD (WORK-01..04) — passing tests, DAL gates, Storage RLS scoping correct
- Business profile CRUD (BIZ-01..03) — passing tests, 1:many handling, owner check, PostGIS raw SQL
- Landing page, /home distance sort, public /posts/[id], lazy filter, cursor pagination — all use `$queryRaw` and bypass the stale client
- deleteJob, list pages, Phase 2 regression — all green

**What's broken:**
- `createJob` (POST-01) — runtime crash
- `updateJob` (POST-03 update path) — runtime crash
- Public + biz job detail pages silently render empty duties/requirements/tags/dressCode/whatToBring sections even when DB has the data (POST-05 partial)
- 11/59 automated tests failing

**Recommended closure plan:**
1. Run `npx prisma generate` (or whatever Prisma 7's generator command is — check `prisma/schema.prisma` generator block which says `provider = "prisma-client"`)
2. Commit the regenerated `src/generated/prisma/` tree
3. Re-run `npx vitest run` — expect 54+ passing (11 currently failing tests should go green)
4. Manually E2E-validate POST-01 create flow in browser (see Human Verification item 7)
5. Verify `/posts/{id}` detail page now renders duties/requirements/tags/dressCode/whatToBring when the underlying row has them populated
6. (Non-blocking) Address HI-01 (bucket SELECT policy) and ME-05 (pg_cron explicit tz) from 03-REVIEW before Phase 4

**After those 5 steps complete, Phase 3 should move from `gaps_found` to `human_needed` (for the remaining in-browser UX confirmations).**

---

_Verified: 2026-04-10T18:50:00Z_
_Verifier: Claude (gsd-verifier)_
