---
phase: 3
slug: db
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-10
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from 03-RESEARCH.md §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 (unit + integration), Playwright 1.59 (E2E) |
| **Config file** | `vitest.config.ts` (root), `playwright.config.ts` (root) |
| **Quick run command** | `npx vitest run tests/profile tests/jobs tests/storage` |
| **Full suite command** | `npx vitest run && npx playwright test` |
| **Estimated runtime** | Vitest ~15s, Playwright ~60s |

---

## Sampling Rate

- **After every task commit:** Run the test file covering that task's requirement (e.g., `npx vitest run tests/profile/worker-profile.test.ts`)
- **After every plan wave:** Run `npx vitest run` (all integration tests, no Playwright)
- **Before `/gsd-verify-work 3`:** Full suite must be green (`npx vitest run && npx playwright test`)
- **Max feedback latency:** 30 seconds (vitest single file), 90 seconds (full suite)

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| WORK-01 | Worker 프로필 저장 (name, nickname, avatar URL, bio) | integration | `npx vitest run tests/profile/worker-profile.test.ts` | ❌ Wave 0 | ⬜ pending |
| WORK-02 | preferredCategories 저장/조회 | integration | `npx vitest run tests/profile/worker-profile.test.ts` | ❌ Wave 0 | ⬜ pending |
| WORK-03 | badge/rating/totalJobs read-only 노출 | integration | `npx vitest run tests/profile/worker-profile.test.ts` | ❌ Wave 0 | ⬜ pending |
| WORK-04 | 타 사용자 프로필 수정 불가 (RLS via DAL re-verify) | integration | `npx vitest run tests/profile/worker-profile.test.ts` | ❌ Wave 0 | ⬜ pending |
| BIZ-01 | Business 프로필 저장 (name, category, logo, address, description) | integration | `npx vitest run tests/profile/biz-profile.test.ts` | ❌ Wave 0 | ⬜ pending |
| BIZ-02 | rating/reviewCount/completionRate read-only 노출 | integration | `npx vitest run tests/profile/biz-profile.test.ts` | ❌ Wave 0 | ⬜ pending |
| BIZ-03 | 타 사용자 biz 프로필 수정 불가 | integration | `npx vitest run tests/profile/biz-profile.test.ts` | ❌ Wave 0 | ⬜ pending |
| POST-01 | Job 생성 DB 저장 (title, category, hourlyPay, workDate, headcount, 주소, dressCode, whatToBring) | integration | `npx vitest run tests/jobs/job-crud.test.ts` | ❌ Wave 0 | ⬜ pending |
| POST-02 | Business 자기 공고 목록 조회 | integration | `npx vitest run tests/jobs/job-crud.test.ts` | ❌ Wave 0 | ⬜ pending |
| POST-03 | Job 수정/삭제 (owner only, RLS via Server Action auth check) | integration | `npx vitest run tests/jobs/job-crud.test.ts` | ❌ Wave 0 | ⬜ pending |
| POST-04 | 비로그인 랜딩 페이지 공고 목록 + 페이지네이션 접근 | e2e | `npx playwright test tests/e2e/public-job-list.spec.ts` | ❌ Wave 0 | ⬜ pending |
| POST-05 | 공고 상세 예상 수입 계산 표시 | unit | `npx vitest run tests/utils/job-utils.test.ts` | ❌ Wave 0 | ⬜ pending |
| POST-06 | 만료 자동 전환 (pg_cron 5분 스케줄 + lazy WHERE filter) | integration | `npx vitest run tests/jobs/job-expiry.test.ts` | ❌ Wave 0 | ⬜ pending |
| D-01 | Supabase Storage avatar 업로드 + RLS (own path only) | integration | `npx vitest run tests/storage/avatar-upload.test.ts` | ❌ Wave 0 | ⬜ pending |
| D-06 | PostGIS ST_DWithin + ST_Distance 거리 정렬 | integration | `npx vitest run tests/jobs/postgis-distance.test.ts` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Test infrastructure files to be created BEFORE any Phase 3 implementation work begins:

- [ ] `tests/profile/worker-profile.test.ts` — WORK-01..04 integration tests (create/update/select via Prisma + Server Action)
- [ ] `tests/profile/biz-profile.test.ts` — BIZ-01..03 integration tests
- [ ] `tests/jobs/job-crud.test.ts` — POST-01..03 integration tests (create/read/update/delete via Prisma + owner auth check)
- [ ] `tests/jobs/job-expiry.test.ts` — POST-06 pg_cron + lazy filter verification (insert past-dated job, assert lazy filter hides it; manually trigger cron unschedule+schedule for test)
- [ ] `tests/jobs/postgis-distance.test.ts` — D-06 PostGIS raw SQL verification (insert jobs with known lat/lng, query from reference point, assert distance_m column + ORDER BY)
- [ ] `tests/storage/avatar-upload.test.ts` — D-01 Supabase Storage upload + download + RLS denial for other user
- [ ] `tests/utils/job-utils.test.ts` — POST-05 calculateEarnings pure function (already exists in src/lib/job-utils.ts, needs test coverage)
- [ ] `tests/e2e/public-job-list.spec.ts` — POST-04 Playwright E2E (anonymous browser → `/` → scroll → load more → click job → `/posts/{id}` public view)

**Setup requirements:**
- Test user creation helper (reuse `tests/helpers/test-users.ts` from Phase 2)
- Vitest environment: `tests/storage/` + `tests/jobs/` + `tests/profile/` run in `node` env (DB access, no DOM)
- Playwright: reuse `playwright.config.ts` from Phase 2, add storage state for authenticated test user

**Framework install:** None — Vitest 3 + Playwright 1.59 already installed in Phase 2.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 실 브라우저 avatar 업로드 UX (file picker, preview, upload progress) | D-01 | file input / preview / drag behavior는 DOM 환경 필요, Playwright 가능하지만 비용 대비 효과 낮음 | 브라우저에서 `/my/profile/edit` → 파일 선택 → 미리보기 확인 → 저장 → /my 페이지에서 avatar 반영 확인 |
| 실 geolocation 권한 프롬프트 UX | D-06 | 브라우저 permission API는 headless 환경에서 재현 어려움 | `/home` 접근 → "내 주변" 버튼/배너 → 권한 프롬프트 허용 → 거리 정렬 확인. 이어서 시크릿 창에서 거부 → fallback (서울시청) 동작 확인 |
| Kakao Map 또는 기타 지도 미리보기 (공고 위치) | POST-05 (일부) | Phase 3에서는 지도 미리보기 scope OUT — 주소 text만 표시 | N/A (Phase 3 deferred) |
| pg_cron 실제 스케줄 실행 (5분 대기) | POST-06 | cron 트리거가 실제 시간 경과 기반 | 과거 workDate 공고 INSERT → 6분 대기 → `SELECT * FROM cron.job_run_details` + `SELECT status FROM jobs` 확인 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (8 test files + seed helper reuse)
- [ ] No watch-mode flags (CI-safe)
- [ ] Feedback latency < 30s per task, < 90s for full suite
- [ ] `nyquist_compliant: true` set in frontmatter once Wave 0 tests exist and all tasks have automated verification

**Approval:** pending

---

## Notes

- **Prisma bypasses RLS** (uses DIRECT_URL = service role key per Phase 2 direct-prisma path). Integration tests via Prisma verify business logic and Server Action auth checks, NOT database-layer RLS enforcement. True RLS enforcement is verified in `tests/e2e/` with actual `@supabase/supabase-js` anonymous/authenticated clients.
- **Test data isolation**: Phase 3 tests reuse Phase 2 seeded data (6 users, 8 jobs, 8 businesses, 5 applications). Each test should NOT mutate seed rows — create test-specific rows with UUID prefixes and clean up in afterEach.
- **pg_cron test**: testing the actual scheduler requires a 5-minute wait. For fast feedback, tests should verify the SQL body of the migration via `SELECT command FROM cron.job WHERE jobname = 'expire-jobs-every-5-min'` AND separately run the SQL body inline against a past-dated test job. Real cron trigger is a "Manual-Only" verification.
