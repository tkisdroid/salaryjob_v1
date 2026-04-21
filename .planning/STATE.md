---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: milestone
status: verifying
last_updated: "2026-04-21T14:02:03.289Z"
last_activity: 2026-04-21
progress:
  total_phases: 8
  completed_phases: 2
  total_plans: 9
  completed_plans: 8
  percent: 67
---

# State: GigNow (NJob)

**Last updated:** 2026-04-21

## Project Reference

- **Core value:** 이력서·면접 제로. 탭 하나로 확정, 근무 후 즉시 정산.
- **Current focus:** Phase 12 — business-flow-codex-13-crud
- **Exit criterion for current milestone:** 실 사용자 관점 "탐색→지원→확정→근무→리뷰→정산" 플로우가 브라우저에서 1분 이내 완료 + 13 HUMAN-UAT 시나리오 PASS(또는 MOCK-LOG 기록) + UI/UX QA 체크리스트 0 critical/high 이슈

## Current Position

Phase: 12 (business-flow-codex-13-crud) — EXECUTING
Plan: 3 of 3 (COMPLETE)
Status: Phase complete — ready for verification
Last activity: 2026-04-21
Progress: 6/9 plans complete (67%)

## Phase Progress

| Phase | Status | Completed |
|-------|--------|-----------|
| 1. 목업 UI 파운데이션 | Completed (v1.0) | 2026-04-10 (commit `55790d1`) |
| 2. Supabase·Prisma·Auth 기반 | Completed (v1.0) | 2026-04-10 (commit `fb06dfd`) |
| 3. 프로필·공고 DB 연결 | Completed (v1.0) | 2026-04-10 (commit `087874e`) |
| 4. 지원·근무 라이프사이클 DB 연결 | Completed (v1.0) | 2026-04-11 (commits `be311af → 864e4e5` + Plan 04-10) |
| 5. 리뷰·정산·목업 제거 | Code Complete (v1.0) — HUMAN-UAT 3 → Phase 8 | 2026-04-11 (automated gates) |
| 6. Admin Backoffice | Code Complete (v1.0) — HUMAN-UAT 5+3 → Phase 8, DB apply → Phase 7 | 2026-04-13 (automated gates) |
| **7. DB Migration Apply & Infra Foundation** | **Not started (current)** | — |
| 8. HUMAN-UAT Execution (13 scenarios + E2E Loop) | Not started | — |
| 9. UI/UX Full Sweep (55 routes × Desktop + Mobile 375px) | Not started | — |
| 10. Legacy Cleanup & Milestone Close | Not started | — |

## Performance Metrics

- **Requirements mapped (v1.1):** 20/20 (100%)
- **Phases defined (v1.1):** 4 (Phase 7–10)
- **Phases completed (v1.1):** 0/4 (0%)
- **v1.0 carry-over (code complete, awaiting HUMAN-UAT):** Phase 4 (5 scenarios) + Phase 5 (3 scenarios) + Phase 6 (5 runnable + 3 deferred)
- **Test suite (Phase 6 final run 2026-04-13):** Unit tests 19 GREEN (admin-routing x6 + ocr-parser x7 + dedups); DB-gated tests SKIP (Supabase unreachable)
- **Production build (Phase 6 final run 2026-04-13):** 55 routes — 0 errors; /admin /admin/businesses /admin/businesses/[id] confirmed
- **mock-data imports in src/:** 0 (DATA-05 exit gate satisfied, confirmed 2026-04-13 — to be CI-guarded in Phase 10 LEG-03)
- **MOCK_OCR in src/:** 0 (Phase 6 OCR stub removed in Plan 06-06)

## Accumulated Context

### Key Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| Phase 1은 mock-data.ts로 UI 완성 후 Phase 2에서 DB/API 연결 | 디자인/플로우 실수를 저비용으로 조기 발견 | 2026-04-10 (retroactive) |
| Supabase를 DB + Auth 단일 벤더로 선택 | 한 벤더로 복잡도 최소화 | 2026-04-10 |
| Phase 2 마이그레이션 전략: direct-prisma (pivot from MCP/CLI) | 대상 Supabase 프로젝트가 MCP-linked 계정 밖에 있음 → tsx + pg 클라이언트 fallback | 2026-04-10 |
| 양면 마켓플레이스 구조 (Worker + Business 동시 지원) | Timee 모델 복제. 한쪽만으로는 공급/수요 균형 불가 | 2026-04-10 |
| mock-data.ts 제거(DATA-05)를 Phase 5 최종 exit 기준으로 | 파일 잔존 시 v1 미완료로 간주. Phase 5 종료 직전 grep 검증 — SATISFIED | 2026-04-10 |
| D-01: ApplicationStatus에 `pending` 추가 + default 로 사용 | Timee 자동수락 30분 타이머 지원 — 즉시 confirmed 대신 pg_cron auto-accept 경로 | 2026-04-10 (Phase 4 discuss) |
| D-19: Web Push (VAPID) Phase 4로 부분 승격 | 수락/거절 이벤트 네이티브 OS 알림 — 네이티브 FCM/SMS/알림톡은 여전히 v2 | 2026-04-10 (Phase 4 discuss) |
| D-23: Kakao Maps JavaScript SDK 예외 허용 | /home 리스트/지도 토글 UX — Supabase 단일 벤더 제약의 첫 공식 예외 | 2026-04-10 (Phase 4 discuss) |
| D-24: WorkerProfile.reviewCount column added (Plan 05-02 discovered dependency) | Biz→Worker rating aggregation requires reviewCount on worker side; not in Phase 5 research but added atomically with schema push | 2026-04-11 (Phase 5 Plan 02) |
| D-25: ApplicationStatus.settled via ALTER TYPE ADD VALUE (not prisma db push) | Supabase internal _supabase_migrations table caused data-loss warning in prisma db push; direct SQL used for enum addition | 2026-04-11 (Phase 5 Plan 02) |
| D-26: serverExternalPackages + npm install for Prisma 7 Turbopack build | @prisma/client empty (broken npm state); serverExternalPackages added as future-proof config for Turbopack + Prisma 7 custom output path | 2026-04-11 (Phase 5 Plan 07) |
| D-31: createJob image gate checks businessRegImageUrl IS NOT NULL (not verified flag) | D-39/Pitfall 3 — verified flag is toggled by regNumber format check; image gate is separate | 2026-04-13 (Phase 6 Plan 07) |
| D-34/35/36: commission snapshot written inside prisma.$transaction at checkOut | T-06-20 TOCTOU prevention — rate read + application write atomically; earnings column stays gross | 2026-04-13 (Phase 6 Plan 07) |
| D-27/28/29: ADMIN role gets dedicated /admin route group with standalone AdminSidebar | Separation from biz routes ensures admin UI can evolve independently; middleware gate blocks non-ADMIN | 2026-04-13 (Phase 6 Plan 08) |
| D-30: regNumber format check (NNN-NN-NNNNN) → verified=true; stored digit-only | Auto-verify at signup avoids manual review overhead; OCR is secondary confirmation, not gating | 2026-04-13 (Phase 6 Plan 08) |
| D-33: OCR failure never blocks user — regNumberOcrMismatched flag for admin review | Early operations expect false-positives; graceful degradation > hard rejection | 2026-04-13 (Phase 6 Plan 08) |
| v1.1 MOCK 정책: 외부 키 없는 시나리오는 MOCK-LOG 기록 후 v1.2/v2 이월 | 외부 의존성이 v1.1 close를 차단하지 않도록 함. 재검증 단계는 추적 가능하게 기록 | 2026-04-15 (v1.1 kickoff) |
| v1.1 Phase 번호 7부터 시작 (1–6은 v1.0 histoircal) | `/gsd-new-milestone --reset-phase-numbers` 미사용. 연속 번호로 이력 선형성 유지 | 2026-04-15 (v1.1 kickoff) |
| BUG-B09: Review gate widened to completed OR settled | completed is legacy pre-settlement status; both must allow reviews | 2026-04-21 (Phase 12 Plan 03) |
| BUG-B13: New businesses fall back to all workers (where: {}) | no posted jobs → empty businessCategories → show all workers to avoid empty list | 2026-04-21 (Phase 12 Plan 03) |
| BUG-B12: workers-client.tsx inline ToastState already reads result.message | no sonner import needed; only action message text updated | 2026-04-21 (Phase 12 Plan 03) |
| Phase 11-worker-flow-codex-12-filled P02 | 8 | 2 tasks | 3 files |
| Phase 11 P04 | 5 | 2 tasks | 4 files |
| Phase 11 P01 | 7m | 2 tasks | 4 files |
| Phase 11 P03 | 12 | 2 tasks | 7 files |
| Phase 12-business-flow-codex-13-crud P03 | 8 | 2 tasks | 5 files |
| Phase 12 P01 | 15 | 2 tasks | 5 files |
| Phase 12-business-flow-codex-13-crud P02 | 6 | 2 tasks | 7 files |

### Roadmap Evolution

- 2026-04-21: Phase 11 added: Worker Flow 기능 수정 — Codex 감사 12건 (지원상태/filled/정산/검색/데드버튼)
- 2026-04-21: Phase 12 added: Business Flow 기능 수정 — Codex 감사 13건 (야간검증/리다이렉트/CRUD/결제/설정)
- 2026-04-21: Phase 13 added: Admin + 공통 수정 — Codex 감사 10건 (메뉴확장/타입정리/에러핸들링/레거시정리)
- 2026-04-15: Phase 07.1 inserted after Phase 7: Automated Review Harness & Zero-Error Gate (URGENT) — 자가 완결 QA 하네스 (로컬 Supabase 스택 + Playwright + a11y/perf 게이트 + auto-fix 루프)
- 2026-04-15: v1.1 ROADMAP 생성 — 4 phases (7–10) × 20 REQ-IDs (MIG×4, INFRA×3, UAT×5, QA×5, LEG×3). Phase 7 = DB migration + infra, Phase 8 = HUMAN-UAT, Phase 9 = UI/UX sweep, Phase 10 = legacy cleanup.
- 2026-04-13: Phase 6 Plan 02 completed — Schema + Storage migration 9 columns + private bucket + RLS + 2 indexes (v1.0)
- 2026-04-13: Phase 6 added — Admin Backoffice (v1.0)

### Open TODOs

- [ ] **Phase 7 kickoff:** `/gsd-plan-phase 7` 실행 → DB 마이그레이션 적용 + Admin seed + MOCK-LOG 템플릿 + CLOVA_OCR_SECRET 문서
  - `npx tsx scripts/apply-supabase-migrations.ts` from machine with Supabase access (migrations 000001-000005)
  - Admin seed: uncomment UPDATE in `supabase/migrations/20260414000005_phase6_admin_seed.sql`
- [ ] **Phase 8 HUMAN-UAT (Phase 7 이후):** 13 scenarios across Phase 4/5/6 + E2E 1-min loop 실측 + signed URL TTL 실측
- [ ] **Phase 9 UI/UX Sweep (Phase 7 이후):** Worker+Business+Admin 전 55 routes × Desktop + Mobile 375px 체크리스트
- [ ] **Phase 10 Legacy Cleanup:** `/my/schedule` 로컬 MOCK 제거, stale Clerk TODO 정리, mock-data import CI 가드

### Blockers

- Supabase 네트워크 접근 필요 — Phase 7 MIG-01..04 실행 시점에 Supabase 가용성 전제. 접근 불가 시 Phase 7 진행 불가.

### Known Risks

- `tests/proxy/redirect.test.ts` + `tests/storage/avatar-upload.test.ts` + `vitest.config.ts` 의 pre-existing TypeScript drift (v1.0 이월, v1.2 후보)
- Phase 5 e2e spec 파일들(`tests/e2e/*.spec.ts`)이 vitest 글로브에 포함되어 Playwright `test.describe()` 오류 발생 — v1.2 후보
- 외부 키(CLOVA_OCR_SECRET, Toss 실키 등) 미확보 시 Phase 8 UAT-04 일부 시나리오는 MOCK-LOG로 처리 → v1.2 재검증

## Session Continuity

### Last Session Summary

- 2026-04-15 v1.1 Ship-Ready 밀스톤 kickoff.
- PROJECT.md / REQUIREMENTS.md / MILESTONES.md 정비 후 gsd-roadmapper가 4-phase 로드맵(7–10) 생성.
- 20/20 REQ-ID 매핑, 카테고리별 완전 분리: MIG+INFRA(7) · UAT+INFRA-02(8) · QA(9) · LEG(10).
- 다음 단계: `/gsd-plan-phase 7`로 DB 마이그레이션 적용 + Admin seed + MOCK-LOG 템플릿 + CLOVA_OCR_SECRET 가이드 plan화.

### Next Session Starting Point

1. `/gsd-plan-phase 7` 실행 → Phase 7 plan 구조 도출
2. Supabase 접근 가능 환경에서 `npx tsx scripts/apply-supabase-migrations.ts` 준비
3. `supabase/migrations/20260414000005_phase6_admin_seed.sql`의 UPDATE 블록 주석 해제 전략 결정

### Files of Interest

- `.planning/ROADMAP.md` — v1.1 4-phase 구조 (Phase 7–10)
- `.planning/REQUIREMENTS.md` — v1.1 20 REQ-IDs + traceability
- `.planning/PROJECT.md` — v1.1 Active 스코프
- `.planning/MILESTONES.md` — v1.0 archive 요약
- `.planning/phases/06-admin-backoffice/06-HUMAN-UAT.md` — Phase 6 8 UAT 시나리오 (5 runnable, 3 deferred) — Phase 8에서 실행
- `.planning/phases/05-reviews-settlements/05-HUMAN-UAT.md` — Phase 5 3 UAT 시나리오 — Phase 8에서 실행
- `.planning/phases/04-db/04-HUMAN-UAT.md` — Phase 4 5 UAT 시나리오 — Phase 8에서 실행
- `supabase/migrations/20260414000005_phase6_admin_seed.sql` — Admin 계정 시드 (주석 해제 후 적용) — Phase 7 MIG-03
- `src/app/(worker)/my/schedule/page.tsx` — Phase 1 legacy local MOCK 상수 — Phase 10 LEG-01
- `src/app/api/push/register/route.ts` — stale Clerk TODO — Phase 10 LEG-02
- `prisma/schema.prisma` — Phase 2-6 최종 스키마 (Phase 7에서 migrate status clean 확인)

## Quick Tasks Completed

| ID | Date | Description | Commits |
|----|------|-------------|---------|
| 260413-fre | 2026-04-13 | Worker apply CTA 가림 + biz 공고상세 버튼 순서 + "+새 공고 등록" 줄바꿈 수정 | `6c74315`, `9e96487`, `0a6cfdf` |
| 260413-g13 | 2026-04-13 | biz 공고등록 Step 1/2 silent-disabled 다음 버튼 — 인라인 경고 + hint 추가 (Step 3 패턴 복제) | `40c01ee` |
| 260413-heo | 2026-04-13 | 시간등록 7일 한 화면 — overflow-x + minWidth 제거, 셀 압축 (W3) | `1a7914b` |
| 260413-upw | 2026-04-13 | Codex adversarial review 4 findings: admin app_metadata sync + verified trust boundary + /biz/verify multi-biz + rate cursor pagination | `6a392a8`, `0dba8ba`, `3a3f08b`, `f7640a9` |

### Known Env Drift (2026-04-13)

- `src/generated/prisma` (gitignored) stale on local — schema의 Phase 3 Job 컬럼(duties/requirements/tags/...)이 client에 미반영되어 공고 생성 시 `PrismaClientValidationError: Unknown argument 'duties'` 발생. `npx prisma generate` 재실행으로 해결. 신규 환경에서 같은 증상이 나오면 먼저 `npm install` 또는 `prisma generate` 실행 (postinstall hook이 `prisma generate` 수행하므로 보통 자동 해결).

---
*State initialized: 2026-04-10*
*Phase 4 completed: 2026-04-11 (Plan 04-10 verification pass)*
*Phase 5 code-complete: 2026-04-11 (Plan 05-07 verification pass — HUMAN-UAT deferred)*
*Phase 6 code-complete: 2026-04-13 (Plan 06-08 verification pass — HUMAN-UAT 5 pending, 3 deferred, DB migrations pending)*
*v1.1 ROADMAP created: 2026-04-15 (4 phases 7–10, 20 REQ-IDs mapped, current position Phase 7 Plan 0)*
