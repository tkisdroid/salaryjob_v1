# Roadmap — Milestone v1.1 Ship-Ready

**Milestone:** v1.1 Ship-Ready — Gap Fill & Full QA Sweep
**Created:** 2026-04-15
**Last updated:** 2026-04-23 (Phase 07.1 insertion + QA-06..QA-11 registration)
**Granularity:** standard
**Phase numbering:** Phase 7 onward (continuing from v1.0 which closed at Phase 6)
**Coverage:** 26/26 REQ-IDs mapped (100%) — cross-checked against REQUIREMENTS.md traceability table.

## Milestone Goal

v1.0 close 시점에 남은 모든 gap을 메우고 실 사용자 플로우가 전 경로에서 완벽하게 동작하도록 검증·수정한다. 신규 기능 추가 없이 **검증·정리·스테빌라이즈**만 수행.

**Exit gate:** "탐색 → 지원 → 확정 → 근무 → 리뷰 → 정산" 루프가 실 DB + 실 브라우저에서 1분 이내 완료 + 13 HUMAN-UAT 시나리오 PASS(또는 MOCK-LOG 기록) + UI/UX QA 체크리스트 0 critical/high + Phase 1 legacy 잔재 제거.

## Phases

- [ ] **Phase 7: DB Migration Apply & Infra Foundation** — Phase 6 마이그레이션 적용 + Admin seed + 외부 키/MOCK 인프라 확립 (모든 후속 phase의 전제)
- [ ] **Phase 07.1: Automated Review Harness & Zero-Error Gate (INSERTED 2026-04-15)** — 자체 부팅 Supabase 스택 + 108 route-scenario + 7 E2E 루프 + 16-gate zero-error + D-19/D-20 auto-fix 루프 + `production_ready` REVIEW.md
- [ ] **Phase 8: HUMAN-UAT Execution (13 scenarios + E2E Loop)** — Phase 4/5/6 브라우저 UAT + 1-min end-to-end 플로우 실측
- [ ] **Phase 9: UI/UX Full Sweep (55 routes × Desktop + Mobile 375px)** — Worker·Business·Admin 전 라우트 체크리스트 PASS + critical/high 이슈 fix
- [x] **Phase 10: Legacy Cleanup & Milestone Close** — Phase 1 legacy MOCK 제거 + stale 주석 정리 + CI 회귀 가드 (완료 2026-04-22)

## Phase Details

### Phase 7: DB Migration Apply & Infra Foundation
**Goal:** Phase 6 DB 마이그레이션과 Admin seed가 실제 Supabase에 적용되고, MOCK-LOG 및 외부 키 프로비저닝 인프라가 확립되어 후속 HUMAN-UAT와 QA가 실 DB 위에서 동작할 수 있다.
**Depends on:** Nothing (first phase of v1.1; Supabase network access required)
**Requirements:** MIG-01, MIG-02, MIG-03, MIG-04, INFRA-01, INFRA-03
**Success Criteria** (what must be TRUE):
  1. `npx prisma migrate status` + `npx prisma validate` + `npx prisma generate`가 drift/pending 0건으로 clean하게 끝난다
  2. Business 사용자가 `business-reg-docs` bucket에 등록증 이미지를 업로드하면 Admin이 signed URL로 해당 이미지를 브라우저에서 열람할 수 있다 (RLS authenticated write + signed read 경로 검증)
  3. 시드된 Admin 계정(regNumber + ADMIN role)으로 `/admin` 대시보드에 로그인하면 /admin · /admin/businesses · /admin/businesses/[id] 3개 라우트에 접근 가능하다
  4. 신규 개발자가 `.env.example` + `docs/`를 참조하여 `CLOVA_OCR_SECRET` 발급·등록을 5분 내 완료할 수 있다
  5. `.planning/phases/*/MOCK-LOG.md` 템플릿이 (mocked path / reason / real-key re-verify step / target milestone) 4필드를 포함한 표준 형태로 확립되어 있다
**Plans:** 2 plans
- [x] 07-01-PLAN.md — Prep: MOCK-LOG infra (template + index + README + Phase 6 instance) + docs/external-keys.md + .env.example annotation (INFRA-01, INFRA-03; network-free)
- [ ] 07-02-PLAN.md — Apply: admin_seed uncomment + commit + apply-supabase-migrations + prisma validate/status/generate + /admin login + signed URL RLS round-trip + VERIFICATION.md (MIG-01..04; Supabase network required) — RELOCATED TO PHASE 8 DAY 1 per Phase 07.1 D-02

### Phase 07.1: Automated Review Harness & Zero-Error Gate (INSERTED 2026-04-15)

**Goal:** Self-contained QA harness that boots local Supabase, seeds deterministic fixtures, drives Playwright over 108 route-scenarios + 7 E2E loops, enforces 16-gate zero-error policy, auto-fixes within whitelisted scope, and reports `production_ready: true|false` in `07.1-REVIEW.md`.
**Requirements:** QA-06, QA-07, QA-08, QA-09, QA-10, QA-11
**Depends on:** Phase 7 (07-01 prep only; 07-02 relocated to Phase 8 Day 1 per D-02)
**Plans:** 1/2 plans executed

Plans:
- [x] 07.1-01-PLAN.md — Review Harness Infrastructure (local Supabase stack + deterministic seed + 54-route manifest + Playwright mobile-375 + quality-gate wiring) — Wave 1, autonomous (QA-06, QA-07, QA-08, QA-09)
- [ ] 07.1-02-PLAN.md — Full Sweep + Auto-Fix Loop (108 route-scenarios + 7 E2E loops + D-19/D-20/D-21/D-22 auto-fix loop + REVIEW.md report) — Wave 2, checkpointed (QA-08, QA-09, QA-10, QA-11)

### Phase 8: HUMAN-UAT Execution (13 scenarios + E2E Loop)
**Goal:** v1.0이 코드-레벨에서 완성한 Worker/Business/Admin 플로우가 실 브라우저 + 실 DB 환경에서 13개 HUMAN-UAT 시나리오를 통해 기능적으로 동작함을 증명하고, 핵심 end-to-end 루프가 1분 이내 완료됨을 실측 기록한다.
**Depends on:** Phase 7 (DB 마이그레이션 적용 + Admin 계정 필요)
**Requirements:** UAT-01, UAT-02, UAT-03, UAT-04, UAT-05, INFRA-02
**Success Criteria** (what must be TRUE):
  1. Worker가 Kakao Maps 지도 탐색 / Web Push 알림 수신 / Realtime 2-tab 동기화 / 체크아웃 QR 스캔 / Geofence GPS 블록 5개 시나리오를 브라우저에서 실행한 PASS·FAIL·MOCK 결과가 `04-HUMAN-UAT.md`에 기록되어 있다
  2. Phase 5 3개 시나리오(E2E 1분 루프 / 모바일 375px 가독성 / 리뷰 UX taste)가 PASS로 `05-HUMAN-UAT.md`에 기록되어 있다
  3. Admin/Business 사용자가 Phase 6 5개 실행 가능 시나리오(admin 로그인 / businesses 검색·필터·정렬·페이지네이션 / commission rate 편집 / biz regNumber 자동 인증 / createJob 이미지 게이트)를 PASS로 `06-HUMAN-UAT.md`에 기록하고, 3개 deferred 시나리오(admin detail signed image / OCR happy path / OCR mismatch)는 MOCK 경로로 검증 + `MOCK-LOG.md`에 재검증 단계가 기록되어 있다
  4. "Worker 탐색 → 원탭 지원 → Business 확정 → Worker 체크인 → 체크아웃 → 상호 리뷰 → 월말 정산 집계" end-to-end 루프가 실 브라우저 + 실 DB에서 60초 이내 완료되는 타임스탬프 증거(로그 또는 녹화본)가 존재한다
  5. Phase 6 등록증 열람 시나리오에서 Supabase signed URL TTL 실측치가 `06-HUMAN-UAT.md` 또는 MOCK-LOG에 숫자로 기록되어 있다
**Plans:** TBD

### Phase 9: UI/UX Full Sweep (55 routes × Desktop + Mobile 375px)
**Goal:** Worker·Business·Admin 전 55 라우트가 Desktop + Mobile 375px 두 뷰포트에서 버튼 중복/오동작, 빈 상태, 에러 토스트, 네비게이션, shadcn 토큰 드리프트를 기준으로 체크리스트 0 critical/high 상태로 수렴한다.
**Depends on:** Phase 7 (실 DB 없이는 빈 상태/로딩/에러 경로를 끝까지 볼 수 없음); Phase 8과는 논리적으로 병렬이지만 단일 개발자 컨텍스트에서 순차 진행 권장
**Requirements:** QA-01, QA-02, QA-03, QA-04, QA-05
**Success Criteria** (what must be TRUE):
  1. Worker 전 라우트(home · search · job detail · apply · my/schedule · my/applications · my/shifts · reviews · settlements · profile · auth 흐름)가 Desktop + Mobile 375px 체크리스트(버튼 중복/오동작/비활성 · 빈 상태 · 에러 토스트 · 네비게이션 누락) 전 항목 PASS이며 스크린샷 또는 체크 기록이 남아있다
  2. Business 전 라우트(dashboard · jobs CRUD · applications inbox · shifts monitoring · reviews · profile · biz verify · settlements)가 동일 체크리스트 전 항목 PASS이다
  3. Admin 전 라우트(/admin 대시보드 · /admin/businesses list + detail · commission edit · 등록증 열람)가 동일 체크리스트 전 항목 PASS이다
  4. sweep 중 발견된 모든 critical·high 등급 이슈는 close 전에 수정되어 fix 커밋이 이슈 항목에 링크되어 있고, low/info 등급만 백로그 todo로 이월되어 있다
  5. shadcn 디자인 토큰(spacing/typography/color) 드리프트, 동일 액션에 대한 중복 버튼, 모바일 하단 탭바로 가려진 CTA가 Worker·Business·Admin 전 화면에서 0건이다
**Plans:** TBD
**UI hint**: yes

### Phase 10: Legacy Cleanup & Milestone Close
**Goal:** Phase 1 legacy 잔재(`/my/schedule` 로컬 MOCK · stale Clerk TODO)를 제거하고, `src/lib/mock-data` 재도입을 막는 CI 가드를 설치해 v1.0이 잡은 "실 DB 위에서 동작" 원칙이 v1.1 이후에도 기계적으로 유지되도록 마무리한다.
**Depends on:** Phase 7 (실 DB wiring 필요); Phase 8/9와 순서 독립적이나 cleanup 후 회귀가 나지 않도록 UAT/QA 뒤에 두는 것이 안전
**Requirements:** LEG-01, LEG-02, LEG-03
**Success Criteria** (what must be TRUE):
  1. Worker가 `/my/schedule`에 접근하면 본인의 실제 availability + 지원·매치 이력이 Supabase 쿼리 결과로 표시되며 로컬 MOCK 상수 흔적이 UI/소스 어디에도 없다
  2. `src/app/api/push/register/route.ts`에 Clerk 관련 TODO 주석이 0건이며, 현재 인증 컨텍스트(Supabase Auth)를 반영한 주석 또는 주석 삭제 상태로 정리되어 있다
  3. `src/lib/mock-data` 경로에 대한 import가 재도입되면 CI(또는 pre-commit 훅)가 즉시 실패하는 grep 게이트가 설치되어 있고 설치 확인 로그/스크린샷이 남아있다
**Plans:** 1/1 (inline — 3 atomic tasks in Phase 10 executor)

Plans:
- [x] 10-SUMMARY.md — Inline executor-planned Phase 10: LEG-01 /my/schedule verification + LEG-02 push/register verification + LEG-03 mock-data grep gate install (completed 2026-04-22, commits d75164d, 61d981f, 8e2e9bc)

## Requirements Coverage

The table below lists **every REQ-ID registered in `REQUIREMENTS.md`** (v1.1 formal scope: 26 entries). Phase 11/12/13 BUG-* rows are listed afterwards as supplementary traceability helpers — they are not part of the v1.1 REQUIREMENTS.md registration and do not count toward `Total mapped`.

### v1.1 Registered Requirements (from REQUIREMENTS.md)

| REQ-ID | Phase | Category |
|--------|-------|----------|
| MIG-01 | Phase 7 | DB Migration |
| MIG-02 | Phase 7 | DB Migration |
| MIG-03 | Phase 7 | DB Migration |
| MIG-04 | Phase 7 | DB Migration |
| INFRA-01 | Phase 7 | Infra |
| INFRA-03 | Phase 7 | Infra |
| QA-06 | Phase 07.1 | QA Harness — Setup Docs |
| QA-07 | Phase 07.1 | QA Harness — Deterministic Seed |
| QA-08 | Phase 07.1 | QA Harness — Browser Verification |
| QA-09 | Phase 07.1 | QA Harness — Zero-Error Gate |
| QA-10 | Phase 07.1 | QA Harness — Auto-Fix Loop |
| QA-11 | Phase 07.1 | QA Harness — REVIEW.md Report |
| UAT-01 | Phase 8 | HUMAN-UAT |
| UAT-02 | Phase 8 | HUMAN-UAT |
| UAT-03 | Phase 8 | HUMAN-UAT |
| UAT-04 | Phase 8 | HUMAN-UAT |
| UAT-05 | Phase 8 | HUMAN-UAT |
| INFRA-02 | Phase 8 | Infra (signed URL TTL 실측) |
| QA-01 | Phase 9 | UI/UX QA |
| QA-02 | Phase 9 | UI/UX QA |
| QA-03 | Phase 9 | UI/UX QA |
| QA-04 | Phase 9 | UI/UX QA |
| QA-05 | Phase 9 | UI/UX QA |
| LEG-01 | Phase 10 | Legacy Cleanup |
| LEG-02 | Phase 10 | Legacy Cleanup |
| LEG-03 | Phase 10 | Legacy Cleanup |

**Total mapped:** 26/26 (100%) — matches REQUIREMENTS.md traceability-table row count.
**Orphaned:** 0
**Duplicates:** 0

### Supplementary Phase 11–13 BUG Traceability (not in REQUIREMENTS.md v1.1)

| REQ-ID | Phase | Category |
|--------|-------|----------|
| BUG-W01..BUG-W12 (12) | Phase 11 | Worker Flow Bug Fix |
| BUG-B01..BUG-B13 (13) | Phase 12 | Business Flow Bug Fix |
| BUG-A01..BUG-A05 (5)  | Phase 13 | Admin Feature Expansion |
| BUG-C01..BUG-C05 (5)  | Phase 13 | Code Quality |

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 7. DB Migration Apply & Infra Foundation | 0/2 | Not started | — |
| 07.1. Automated Review Harness & Zero-Error Gate | 1/2 (Plan 02 partial: 4/6 auto tasks shipped; Task 4 + Task 6 human checkpoints deferred) | In Progress |  |
| 8. HUMAN-UAT Execution | 0/TBD | Not started | — |
| 9. UI/UX Full Sweep | 0/TBD | Not started | — |
| 10. Legacy Cleanup & Milestone Close | 1/1 (3/3 LEG requirements) | Complete | 2026-04-22 |
| 11. Worker Flow Codex 12 | 4/4 | Complete | 2026-04-21 |
| 12. Business Flow Codex 13 | 3/3 | Complete | 2026-04-21 |
| 13. Admin + Common Codex 10 | 2/2 | Complete   | 2026-04-21 |

## Phase Dependency Graph

```
Phase 7 (DB + Infra) ──> Phase 07.1 (Review Harness) ──┬─> Phase 8 (HUMAN-UAT)
                                                       ├─> Phase 9 (UI/UX Sweep)
                                                       └─> Phase 10 (Legacy Cleanup)

Phase 10 ──> Phase 11 (Worker Codex) ──> Phase 12 (Biz Codex) ──> Phase 13 (Admin+Common Codex)
```

Phase 7은 hard prerequisite. Phase 07.1은 Phase 7 07-01(prep) 완료 후 바로 실행 가능 (07-02 apply는 Phase 8 Day 1으로 relocate됨, D-02). Phase 8/9/10은 Phase 07.1이 production_ready=true 선언한 후 실제로는 병렬 가능하나, 단일 개발자 컨텍스트에서 순차 권장 (8 → 9 → 10). Phase 10은 cleanup 후 회귀 감지를 위해 UAT/QA 후순위에 두는 것이 안전.

## MOCK Policy (milestone-wide)

외부 API 키(CLOVA OCR, 결제 등) 없이 완료 불가한 시나리오는:
1. MOCK 경로로 검증 실행
2. 해당 phase의 `MOCK-LOG.md`에 기록 (템플릿: mocked path / reason / real-key re-verify step / target milestone)
3. 재검증은 v1.2 또는 v2로 이월

이 정책은 Phase 8 UAT-04와 Phase 7 INFRA-03에서 명시적으로 운용된다.

### Phase 11: Worker Flow 기능 수정 — Codex 감사 12건 (지원상태/filled/정산/검색/데드버튼)

**Goal:** Worker 역할의 기능적 버그 12건(지원 상태 모델, filled 카운터, 정산 금액 표시, 검색/탐색 서버 필터링, 하드코딩 제거, 데드 라우트 정리, 인증 부트스트랩)을 수정하여 Worker 플로우가 기능적으로 올바르게 동작한다.
**Requirements**: BUG-W01, BUG-W02, BUG-W03, BUG-W04, BUG-W05, BUG-W06, BUG-W07, BUG-W08, BUG-W09, BUG-W10, BUG-W11, BUG-W12
**Depends on:** Phase 10
**Plans:** 4/4 plans complete

Plans:
- [x] 11-01-PLAN.md — Apply flow fix: filled increment moved to accept, pending-aware UI, server-side guards (BUG-W01, W02, W03)
- [x] 11-02-PLAN.md — My page status filters, checked_in STATUS_CONFIG, getCurrentWorker real aggregation (BUG-W04, W05, W06, W08)
- [x] 11-03-PLAN.md — Net earnings display, dead route cleanup, auth bootstrap fix (BUG-W07, W09, W10, W12)
- [x] 11-04-PLAN.md — Search/explore server-side filtering via searchParams (BUG-W11)

### Phase 12: Business Flow 기능 수정 — Codex 감사 13건 (야간검증/리다이렉트/CRUD/결제/설정)

**Goal:** Business 역할의 기능적 버그 13건(야간 시간 검증, verify_required 리다이렉트, 공고 수정 CRUD, 삭제 피드백, 지원자 취소, 채팅 연동, QR 상태 가드, 리뷰 상태 게이트, 정산 안내, 설정 페이지, 워커 제안, 워커 필터링)을 수정하여 Business 플로우가 기능적으로 올바르게 동작한다.
**Requirements**: BUG-B01, BUG-B02, BUG-B03, BUG-B04, BUG-B05, BUG-B06, BUG-B07, BUG-B08, BUG-B09, BUG-B10, BUG-B11, BUG-B12, BUG-B13
**Depends on:** Phase 11
**Plans:** 3/3 plans complete

Plans:
- [x] 12-01-PLAN.md — Night-shift validation fix, verify_required redirect, job edit page (BUG-B01, B02, B03)
- [x] 12-02-PLAN.md — Delete feedback, confirmed cancel, chat+push on accept, QR guards, QR error messages (BUG-B04, B05, B06, B07, B08)
- [x] 12-03-PLAN.md — Review status gate, settlement info, settings messaging, offer feedback, worker filtering (BUG-B09, B10, B11, B12, B13)

### Phase 13: Admin + 공통 수정 — Codex 감사 10건 (메뉴확장/타입정리/에러핸들링/레거시정리)

**Goal:** Admin 역할의 기능 확장(사이드바/대시보드/수수료 피드백/인증 승인·반려/정산 조회)과 코드베이스 공통 품질 수정(any 타입 제거, 인증 에러 전파, env 검증, 레거시 파일 정리, 에러 로깅)을 완료하여 Admin 운영 역량과 코드 건전성을 확보한다.
**Requirements**: BUG-A01, BUG-A02, BUG-A03, BUG-A04, BUG-A05, BUG-C01, BUG-C02, BUG-C03, BUG-C04, BUG-C05
**Depends on:** Phase 12
**Plans:** 2/2 plans complete

Plans:
- [x] 13-01-PLAN.md — Admin feature expansion: sidebar menus, dashboard stats, settlements page, commission feedback, verify approve/reject (BUG-A01, A02, A03, A04, A05)
- [x] 13-02-PLAN.md — Code quality: any type removal, auth error propagation, env validation, legacy cleanup, error logging (BUG-C01, C02, C03, C04, C05)

---

*Roadmap created: 2026-04-15 by gsd-roadmapper. Phase numbering continues from v1.0 close (Phase 6) per milestone policy.*
*Updated 2026-04-23: Phase 07.1 (Automated Review Harness & Zero-Error Gate) inserted between Phase 7 and Phase 8; QA-06..QA-11 registered in REQUIREMENTS.md; Requirements Coverage recounted to 26/26.*
