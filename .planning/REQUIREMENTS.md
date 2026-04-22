# Requirements — Milestone v1.1 Ship-Ready

**Milestone goal:** v1.0 close 시점에 남은 모든 gap을 메우고 실 사용자 플로우가 전 경로에서 완벽하게 동작하도록 검증·수정한다.

**Acceptance gate:** "탐색 → 지원 → 확정 → 근무 → 리뷰 → 정산" 루프가 실 DB + 실 브라우저에서 1분 이내 완료 + 13 HUMAN-UAT 시나리오 PASS(또는 MOCK-LOG 기록) + UI/UX QA 체크리스트 0 critical/high 이슈.

**MOCK 정책:** 외부 API 키(CLOVA, 결제 등) 없이 완료할 수 없는 시나리오는 MOCK 경로로 검증한 뒤 `.planning/phases/*/MOCK-LOG.md`에 "무엇을 mock했는지 + 실 키 확보 후 재검증 단계" 필수 기록. 재검증은 v1.2 또는 v2로 이월.

---

## v1.1 Requirements (mapped)

### MIG — DB 마이그레이션 적용

- [ ] **MIG-01**: Admin이 Phase 6 마이그레이션 000001-000005를 대상 Supabase에 적용하고 schema drift 0건임을 `prisma migrate status` + table introspection으로 증명할 수 있다
- [ ] **MIG-02**: Business 사용자가 `business-reg-docs` bucket에 등록증 이미지를 업로드하고, Admin이 signed URL로 해당 이미지를 열람할 수 있다 (RLS authenticated write + signed read 동작)
- [ ] **MIG-03**: 시드된 Admin 계정(regNumber + ADMIN role)으로 `/admin` 대시보드 로그인이 성공한다
- [ ] **MIG-04**: `npx prisma validate` + `npx prisma migrate status`가 pending/missing 0건으로 clean하고 `npx prisma generate`가 drift 없이 성공한다

### UAT — HUMAN-UAT 13 시나리오 실행

- [ ] **UAT-01**: Worker가 Phase 4 브라우저 UAT 5 시나리오(Kakao Maps 지도 탐색 / Web Push 푸시 수신 / Realtime 2-tab 동기화 / 체크아웃 QR 스캔 / Geofence GPS 블록)를 실행하고 각 시나리오의 PASS·FAIL·MOCK-LOG 결과가 `04-HUMAN-UAT.md`에 기록되어 있다
- [ ] **UAT-02**: Phase 5 시나리오 3건(E2E 1분 루프 / 모바일 375px 가독성 / 리뷰 UX taste)이 PASS이며 결과가 `05-HUMAN-UAT.md`에 기록되어 있다
- [ ] **UAT-03**: Admin/Business 사용자가 Phase 6 시나리오 5건(admin 로그인 / businesses 검색·필터·정렬·페이지네이션 / commission rate 편집 / biz regNumber 자동 인증 / createJob 이미지 게이트 리다이렉트)을 실행하고 결과가 `06-HUMAN-UAT.md`에 기록되어 있다
- [ ] **UAT-04**: Phase 6 deferred 3 시나리오(admin detail signed image / OCR happy path / OCR mismatch graceful degradation)는 MOCK 경로로 검증되고 `.planning/phases/06-admin-backoffice/MOCK-LOG.md`에 mocked path + 실 키 확보 후 재검증 단계가 기록되어 있다
- [ ] **UAT-05**: "Worker 탐색 → 원탭 지원 → Business 확정 → Worker 체크인 → 체크아웃 → 상호 리뷰 → 월말 정산 집계"까지의 End-to-End 플로우가 실 브라우저 + 실 DB에서 1분 이내 완료되는 증거(타임스탬프 로그 또는 녹화본)가 존재한다

### QA — UI/UX Full Sweep

- [ ] **QA-01**: Worker 전 라우트(home, search, job detail, apply, my/schedule, my/applications, my/shifts, reviews, settlements, profile, auth 흐름)가 Desktop + Mobile 375px에서 체크리스트(버튼 중복/오동작/비활성, 빈 상태, 에러 토스트, 네비게이션 누락) 전 항목 PASS
- [ ] **QA-02**: Business 전 라우트(dashboard, jobs CRUD, applications inbox, shifts monitoring, reviews, profile, biz verify, settlements)가 Desktop + Mobile 체크리스트 전 항목 PASS
- [ ] **QA-03**: Admin 전 라우트(/admin dashboard, /admin/businesses list + detail, commission edit, 등록증 열람)가 Desktop + Mobile 체크리스트 전 항목 PASS
- [ ] **QA-04**: QA 과정에서 발견된 모든 critical·high 등급 이슈가 close 전 수정 완료되고 fix 커밋이 이슈에 링크되어 있다 (low/info는 백로그 todo로 이월 가능)
- [ ] **QA-05**: shadcn 디자인 토큰(spacing/typography/color) 드리프트, 동일 액션에 대한 중복 버튼, 모바일 하단 탭바로 가려진 CTA가 Worker/Business/Admin 전 화면에서 0건임이 체크리스트로 증명된다

### QA — Automated Review Harness (Phase 07.1)

- [x] **QA-06**: `docs/review-harness.md` + `.env.test` infrastructure + `supabase` devDep enable `npm run review:stack` to boot the local Supabase CLI stack with Docker Desktop (D-01, D-03, D-04) and a new developer can follow the Windows/WSL2/Docker checklist to green in < 15 minutes
- [x] **QA-07**: Deterministic seed script (`scripts/review/seed-test-data.ts`) + `tests/review/fixtures/ids.ts` insert 3 workers + 3 biz + 1 admin + 10 jobs + 5 applications + 2 shifts + 3 reviews + 1 settlement with fixed UUIDs per D-06/D-07/D-08
- [x] **QA-08**: Browser-driven verification (Playwright mobile-375 project + D-11 5-assertion helper + D-13 CTA probe + axe critical/serious + 54-route manifest) enforces content + interaction correctness per D-11/D-12/D-13/D-14
- [x] **QA-09**: Zero-error gate aggregation across G1..G16 (D-17) runs without short-circuit and reports `07.1-REVIEW.md` with per-gate observed value + threshold + PASS/FAIL
- [ ] **QA-10**: Auto-fix loop (`scripts/review/auto-fix-loop.ts`) respects D-19 WHITELIST + D-20 DENY list + D-21 progress-aware iteration (max 3, extend to 10 on strict decrease) + D-22 functional-correctness override
- [ ] **QA-11**: `07.1-REVIEW.md` report writer emits frontmatter `production_ready: true|false` + all 16 gate results + all 11 Success Criteria evidence per D-17 + SC #1..#11

### LEG — Phase 1 Legacy 잔재 정리

- [ ] **LEG-01**: `src/app/(worker)/my/schedule/page.tsx`의 로컬 MOCK 상수(availability/match history)가 제거되고 실 DB 쿼리로 대체되어 실제 사용자의 예약·지원 이력이 표시된다
- [ ] **LEG-02**: `src/app/api/push/register/route.ts`의 stale Clerk TODO 주석이 Supabase Auth 기반 주석으로 대체되거나 제거된다
- [ ] **LEG-03**: `src/lib/mock-data` import 회귀를 막는 grep 게이트가 CI(또는 pre-commit 훅)에서 자동 실행되어 재발을 방지한다

### INFRA — 외부 키 / 인프라 보완

- [ ] **INFRA-01**: `CLOVA_OCR_SECRET` 프로비저닝 가이드가 `.env.example` + `docs/` (또는 README) 에 문서화되어 신규 개발자가 키 발급·등록 절차를 5분 내 완료할 수 있다
- [ ] **INFRA-02**: Supabase signed URL TTL이 Phase 6 등록증 열람 시나리오에서 실측되어 `06-HUMAN-UAT.md` 또는 MOCK-LOG에 기록된다
- [ ] **INFRA-03**: `.planning/phases/*/MOCK-LOG.md` 템플릿이 확립되어 "mocked path / reason / real-key re-verify step / target milestone" 필수 필드를 포함한다

---

## Future Requirements (Deferred to v1.2+)

- Real-key 재UAT — CLOVA OCR 실 키 확보 후 Phase 6 OCR 3 시나리오 재검증
- signed URL TTL tuning — 실측치 기반 만료 시간 재조정
- Pre-existing vitest/playwright drift 수정 (tests/proxy/redirect, tests/storage/avatar-upload, tests/e2e/*)

## Deferred to v2

- AI 매칭 고도화 (AIMATCH-01..04)
- Toss Payments 실결제 + 원천징수 (PAY-01..04)
- SMS / 카카오 알림톡 / 네이티브 FCM (NOTIF 확장)
- 고급 키워드 검색 (SEARCH-01)
- 1:1 채팅 (CHAT-01/02)
- 사업자 하트 / 스카우트 알림 (999.1)

## Out of Scope (v1.1)

- 신규 기능 추가 — v1.1은 gap fill + QA 검증 밀스톤. 스코프 확장은 반려하고 v1.2/v2로 이월.
- Design system 전면 개편 — 현재 드리프트만 수정. shadcn 기반 토큰 구조 변경 금지.
- 대대적 리팩토링 — LEG-01 범위 외의 구조 변경 금지. "고치는 김에" 변경 반려.

---

## Traceability

| REQ-ID | Phase | Plan | Status |
|--------|-------|------|--------|
| MIG-01 | Phase 7 | TBD | pending |
| MIG-02 | Phase 7 | TBD | pending |
| MIG-03 | Phase 7 | TBD | pending |
| MIG-04 | Phase 7 | TBD | pending |
| UAT-01 | Phase 8 | TBD | pending |
| UAT-02 | Phase 8 | TBD | pending |
| UAT-03 | Phase 8 | TBD | pending |
| UAT-04 | Phase 8 | TBD | pending |
| UAT-05 | Phase 8 | TBD | pending |
| QA-01  | Phase 9 | TBD | pending |
| QA-02  | Phase 9 | TBD | pending |
| QA-03  | Phase 9 | TBD | pending |
| QA-04  | Phase 9 | TBD | pending |
| QA-05  | Phase 9 | TBD | pending |
| QA-06  | Phase 07.1 | 07.1-01 | pending |
| QA-07  | Phase 07.1 | 07.1-01 | pending |
| QA-08  | Phase 07.1 | 07.1-01, 07.1-02 | pending |
| QA-09  | Phase 07.1 | 07.1-01, 07.1-02 | pending |
| QA-10  | Phase 07.1 | 07.1-02 | pending |
| QA-11  | Phase 07.1 | 07.1-02 | pending |
| LEG-01 | Phase 10 | TBD | pending |
| LEG-02 | Phase 10 | TBD | pending |
| LEG-03 | Phase 10 | TBD | pending |
| INFRA-01 | Phase 7 | TBD | pending |
| INFRA-02 | Phase 8 | TBD | pending |
| INFRA-03 | Phase 7 | TBD | pending |

**Total mapped:** 26/26 (100%) — 0 orphaned, 0 duplicate.

Plan 컬럼은 `/gsd-plan-phase {N}` 실행 시 해당 REQ-ID가 포함된 plan 번호로 채워진다.

---

*Last updated: 2026-04-23 — Phase 07.1 QA-06..QA-11 추가 (Automated Review Harness & Zero-Error Gate). 6 categories, 26 REQ-IDs, 5 phases (7, 07.1, 8–10).*
