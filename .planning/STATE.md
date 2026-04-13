---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
last_updated: "2026-04-13T08:29:14.794Z"
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 38
  completed_plans: 36
  percent: 95
---

# State: GigNow (NJob)

**Last updated:** 2026-04-11

## Project Reference

- **Core value:** 이력서·면접 제로. 탭 하나로 확정, 근무 후 즉시 정산.
- **Current focus:** Phase 5 완료 — v1 milestone code complete (HUMAN-UAT 3 시나리오 수동 검증 대기)
- **Exit criterion for current milestone:** ACHIEVED — `src/lib/mock-data.ts` 의존 경로 0개 (grep exit code 1 confirmed)

## Current Position

Phase: 05 (reviews-settlements) — CODE COMPLETE, HUMAN-UAT pending
Plan: 07 of 07

- **Milestone:** v1 MVP
- **Phase:** 05
- **Plan:** Not started
- **Node:** —
- **Status:** Milestone complete
- **Progress:** [██████████] 95%

## Phase Progress

| Phase | Status | Completed |
|-------|--------|-----------|
| 1. 목업 UI 파운데이션 | Completed | 2026-04-10 (commit `55790d1`) |
| 2. Supabase·Prisma·Auth 기반 | Completed | 2026-04-10 (commit `fb06dfd`) |
| 3. 프로필·공고 DB 연결 | Completed | 2026-04-10 (commit `087874e`) |
| 4. 지원·근무 라이프사이클 DB 연결 | Completed | 2026-04-11 (commits `be311af → 864e4e5` + Plan 04-10) |
| 5. 리뷰·정산·목업 제거 | **Code Complete 2026-04-11** (commit `d26e3bc`) — HUMAN-UAT 3 시나리오 대기 | 2026-04-11 (automated gates) |

## Performance Metrics

- **Requirements mapped:** 43/43 (100%) — Phase 4 scope expansion added SEARCH-02/03 + NOTIF-01 partial
- **Phases defined:** 5
- **Phases completed:** 5/5 (code) — HUMAN-UAT pending for Phase 4 (5 scenarios) + Phase 5 (3 scenarios)
- **Plans executed:** 38 (Phase 2: 9, Phase 3: 6, Phase 4: 10, Phase 5: 7, Phase 1 retroactive, doc/planning setups)
- **Nodes verified:** 38
- **Test suite:** 83 files / 238 passing / 10 todo / 0 failing (Phase 5 final run 2026-04-11)
- **Production build:** 37 routes — 0 errors (Phase 5 final run 2026-04-11)
- **mock-data imports in src/:** 0 (DATA-05 exit gate satisfied)

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
| Phase 05 P07 | 45 | 2 tasks | 6 files |
| Phase 06-admin-backoffice P05 | 6 | 3 tasks | 9 files |

### Roadmap Evolution

- Phase 6 added (2026-04-13): Admin Backoffice — 사업장 프로필 검색/정렬, 사업자별 수수료 관리, 가입시 사업자인증, 사업자등록번호/대표자/연락처 노출
- Phase 6 Plan 02 completed (2026-04-13): Schema + Storage migration — 9 new columns (6 BusinessProfile + 3 Application) + private bucket + RLS + 2 indexes

### Open TODOs

- [ ] Phase 5 HUMAN-UAT 3 시나리오 수동 검증 (`.planning/phases/05-reviews-settlements/05-HUMAN-UAT.md`)
  - Scenario 1: 탐색→지원→확정→체크인→체크아웃→리뷰→정산 end-to-end loop ≤ 60초
  - Scenario 2: Mobile 375px layout readability (4 Phase 5 pages)
  - Scenario 3: Review UX feel vs Phase 4 check-in rhythm
- [ ] Phase 4 HUMAN-UAT 5 시나리오 수동 검증 (`.planning/phases/04-db/04-HUMAN-UAT.md`)
  - Kakao Maps / Web Push / Realtime 2-tab / QR 스캔 / Geofence GPS — HTTPS/모바일/외부 키 필요
- [ ] 체크아웃 QR 모달 자동 재생성 로직 수동 동기화 검증 (Plan 04-09 플로우)

### Blockers

- 없음 — v1 코드 완성. HUMAN-UAT만 대기 중.

### Known Risks

- `tests/proxy/redirect.test.ts` + `tests/storage/avatar-upload.test.ts` + `vitest.config.ts` 의 pre-existing TypeScript drift는 Phase 5 dependency upgrade plan으로 이월 (`.planning/phases/04-db/deferred-items.md` 참조)
- Phase 5 e2e spec 파일들(`tests/e2e/*.spec.ts`)이 vitest 글로브에 포함되어 Playwright `test.describe()` 오류 발생 — deferred (별도 vitest config 분리 필요)

## Session Continuity

### Last Session Summary

- Phase 5 7개 plan (Wave 0 RED tests → schema+types → review actions → settlement queries → UI wire-up → mock removal → verification) 모두 완료.
- Plan 05-07 (Phase 5 verification) 결과:
  - vitest: 83 files / 238 passing / 10 todo / 0 test-level failing (Phase 5 신규 20 tests GREEN)
  - `next build` (NODE_ENV=production) 37 routes / 4 Phase 5 신규 dynamic 라우트 확인
  - mock-data import grep exit code 1 (0건)
  - 05-VERIFICATION.md + 05-HUMAN-UAT.md 작성
  - serverExternalPackages fix (commit `e3618f4`) — Prisma 7 Turbopack build regression resolved
- 모든 43/43 v1 요구사항 코드 레벨 완료. HUMAN-UAT 8개 시나리오 (Phase 4: 5개 + Phase 5: 3개) 수동 검증 대기.

### Next Session Starting Point

1. **Phase 6 Plan 03** (`06-03-auth-dal-routing-PLAN.md`): requireAdmin() DAL helper + routing.ts ADMIN branch + middleware admin gate (Wave 2)
2. After Plan 03: Plan 04 libs (OCR + storage-biz-reg + commission helpers), Plan 05 admin console UI, Plan 06 biz/verify OCR rebuild, Plan 07 createJob gate + checkOut commission snapshot
3. Phase 5 HUMAN-UAT still pending (`.planning/phases/05-reviews-settlements/05-HUMAN-UAT.md`)

**DB apply needed:** Run `npx tsx scripts/apply-supabase-migrations.ts` from a machine with Supabase network access to apply the 3 Phase 6 migrations (000001/000002/000003).

### Files of Interest

- `.planning/phases/05-reviews-settlements/05-HUMAN-UAT.md` — Phase 5 3개 수동 UAT 시나리오
- `.planning/phases/05-reviews-settlements/05-VERIFICATION.md` — Phase 5 자동화 게이트 증거 (vitest/build/grep)
- `.planning/REQUIREMENTS.md` — 43개 v1 요구사항 + traceability (43/43 Completed)
- `.planning/ROADMAP.md` — 5-phase 구조 (Phase 5 완료)
- `next.config.ts` — serverExternalPackages (Prisma 7 + pg Turbopack fix, commit `e3618f4`)
- `prisma/schema.prisma` — Phase 2/3/4/5 최종 스키마 (ApplicationStatus.settled, WorkerProfile.reviewCount, PushSubscription 포함)
- `prisma/seed-data.ts` — Phase 6 seed fixtures (mock-data.ts 대체)

## Quick Tasks Completed

| ID | Date | Description | Commits |
|----|------|-------------|---------|
| 260413-fre | 2026-04-13 | Worker apply CTA 가림 + biz 공고상세 버튼 순서 + "+새 공고 등록" 줄바꿈 수정 | `6c74315`, `9e96487`, `0a6cfdf` |
| 260413-g13 | 2026-04-13 | biz 공고등록 Step 1/2 silent-disabled 다음 버튼 — 인라인 경고 + hint 추가 (Step 3 패턴 복제) | `40c01ee` |
| 260413-heo | 2026-04-13 | 시간등록 7일 한 화면 — overflow-x + minWidth 제거, 셀 압축 (W3) | `1a7914b` |

### Known Env Drift (2026-04-13)

- `src/generated/prisma` (gitignored) stale on local — schema의 Phase 3 Job 컬럼(duties/requirements/tags/...)이 client에 미반영되어 공고 생성 시 `PrismaClientValidationError: Unknown argument 'duties'` 발생. `npx prisma generate` 재실행으로 해결. 신규 환경에서 같은 증상이 나오면 먼저 `npm install` 또는 `prisma generate` 실행 (postinstall hook이 `prisma generate` 수행하므로 보통 자동 해결).

---
*State initialized: 2026-04-10*
*Phase 4 completed: 2026-04-11 (Plan 04-10 verification pass)*
*Phase 5 code-complete: 2026-04-11 (Plan 05-07 verification pass — HUMAN-UAT deferred)*
