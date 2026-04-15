---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
last_updated: "2026-04-15T07:18:46.057Z"
progress:
  total_phases: 8
  completed_phases: 4
  total_plans: 38
  completed_plans: 39
  percent: 100
---

# State: GigNow (NJob)

**Last updated:** 2026-04-13

## Project Reference

- **Core value:** 이력서·면접 제로. 탭 하나로 확정, 근무 후 즉시 정산.
- **Current focus:** Phase 6 코드 완료 — HUMAN-UAT 5 시나리오 대기 (DB apply 후 실행 가능), 3 deferred (외부 deps)
- **Exit criterion for current milestone:** ACHIEVED — `src/lib/mock-data.ts` 의존 경로 0개 (grep exit code 1 confirmed)

## Current Position

Phase: 06 (admin-backoffice) — CODE COMPLETE, HUMAN-UAT pending
Plan: 08 of 08

- **Milestone:** v1 MVP
- **Phase:** 06
- **Plan:** 08 (final)
- **Node:** HUMAN CHECKPOINT — awaiting browser UAT (scenarios 1/2/4/5/6)
- **Status:** v1.0 milestone complete
- **Progress:** [██████████] 100%

## Phase Progress

| Phase | Status | Completed |
|-------|--------|-----------|
| 1. 목업 UI 파운데이션 | Completed | 2026-04-10 (commit `55790d1`) |
| 2. Supabase·Prisma·Auth 기반 | Completed | 2026-04-10 (commit `fb06dfd`) |
| 3. 프로필·공고 DB 연결 | Completed | 2026-04-10 (commit `087874e`) |
| 4. 지원·근무 라이프사이클 DB 연결 | Completed | 2026-04-11 (commits `be311af → 864e4e5` + Plan 04-10) |
| 5. 리뷰·정산·목업 제거 | **Code Complete 2026-04-11** (commit `d26e3bc`) — HUMAN-UAT 3 시나리오 대기 | 2026-04-11 (automated gates) |
| 6. Admin Backoffice | **Code Complete 2026-04-13** (commits `4cc274c`, `84869ab`) — HUMAN-UAT 5 대기, 3 deferred. DB 마이그레이션 미적용 | 2026-04-13 (automated gates) |

## Performance Metrics

- **Requirements mapped:** 43/43 v1 (100%) + 17/17 Phase 6 decisions (D-27..D-43)
- **Phases defined:** 6
- **Phases completed:** 6/6 (code) — HUMAN-UAT pending for Phase 4 (5 scenarios) + Phase 5 (3 scenarios) + Phase 6 (5 scenarios, 3 deferred)
- **Plans executed:** 46 (Phase 2: 9, Phase 3: 6, Phase 4: 10, Phase 5: 7, Phase 6: 8, Phase 1 retroactive, doc/planning setups)
- **Nodes verified:** 46
- **Test suite (Phase 6 final run 2026-04-13):** Unit tests 19 GREEN (admin-routing x6 + ocr-parser x7 + dedups); DB-gated tests SKIP (Supabase unreachable)
- **Production build (Phase 6 final run 2026-04-13):** 55 routes — 0 errors; /admin /admin/businesses /admin/businesses/[id] confirmed
- **mock-data imports in src/:** 0 (DATA-05 exit gate satisfied, confirmed 2026-04-13)
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
| Phase 05 P07 | 45 | 2 tasks | 6 files |
| Phase 06-admin-backoffice P05 | 6 | 3 tasks | 9 files |
| Phase 06-admin-backoffice P07 | ~30min | 2 tasks | 7 files |
| Phase 06-admin-backoffice P08 | ~45min | 2 tasks (+ checkpoint) | 5 files |

### Roadmap Evolution

- Phase 6 added (2026-04-13): Admin Backoffice — 사업장 프로필 검색/정렬, 사업자별 수수료 관리, 가입시 사업자인증, 사업자등록번호/대표자/연락처 노출
- Phase 6 Plan 02 completed (2026-04-13): Schema + Storage migration — 9 new columns (6 BusinessProfile + 3 Application) + private bucket + RLS + 2 indexes

### Open TODOs

- [ ] **[URGENT] DB 마이그레이션 적용** — `npx tsx scripts/apply-supabase-migrations.ts` from machine with Supabase access
  - Phase 6 migrations 000001-000005 on disk but NOT applied
  - Admin seed: uncomment UPDATE in `20260414000005_phase6_admin_seed.sql` and apply separately
- [ ] **Phase 6 HUMAN-UAT** (`.planning/phases/06-admin-backoffice/06-HUMAN-UAT.md`) — requires DB applied + ADMIN user seeded
  - Scenario 1: Admin login + dashboard (D-27/28/29)
  - Scenario 2: Admin businesses list search/filter/sort/pagination (D-40/41/42/43)
  - Scenario 4: Admin commission rate edit (D-34/35/36)
  - Scenario 5: Biz regNumber auto-verify (D-30/39)
  - Scenario 6: Biz createJob image gate redirect (D-31)
  - Scenario 3 DEFERRED: Admin detail + signed image (requires uploaded businessRegImageUrl)
  - Scenario 7 DEFERRED: OCR happy path (requires CLOVA_OCR_SECRET)
  - Scenario 8 DEFERRED: OCR mismatch/timeout graceful degradation (requires CLOVA env or net-off)
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

- Phase 6 Plan 08 (verification + UAT + seed + state docs) 완료.
- Plan 06-08 결과:
  - vitest unit: 19 GREEN (admin-routing x6 + ocr-parser x7 + dedup copies); DB-gated: SKIP (Supabase unreachable)
  - `next build` (NODE_ENV=production) 55 routes / /admin /admin/businesses /admin/businesses/[id] 확인
  - MOCK_OCR grep exit code 1 (0건), mock-data grep exit code 1 (0건)
  - 06-VERIFICATION.md 작성 — D-27..D-43 17개 결정 전부 증거 포함
  - 06-HUMAN-UAT.md 작성 — 8개 시나리오 (5 실행 가능, 3 deferred)
  - 20260414000005_phase6_admin_seed.sql 생성 (NO-OP stub with commented UPDATE)
  - STATE.md + ROADMAP.md + REQUIREMENTS.md 업데이트
  - Pre-existing fix: `npm install` for web-push (same state as Phase 5 regression)
- 모든 6개 Phase 코드 레벨 완료. HUMAN-UAT 13개 시나리오 (Phase 4: 5개 + Phase 5: 3개 + Phase 6: 5개 실행가능 + 3 deferred) 수동 검증 대기.

### Next Session Starting Point

1. **DB 마이그레이션 적용:** `npx tsx scripts/apply-supabase-migrations.ts` from a machine with Supabase network access (migrations 000001-000005)
2. **Admin user seed:** Uncomment UPDATE in `supabase/migrations/20260414000005_phase6_admin_seed.sql`, run in Supabase SQL editor
3. **Phase 6 HUMAN-UAT:** Open `06-HUMAN-UAT.md`, run `npm run dev`, execute Scenarios 1/2/4/5/6
4. Phase 5 HUMAN-UAT still pending (`.planning/phases/05-reviews-settlements/05-HUMAN-UAT.md`)

**DB apply needed:** Run `npx tsx scripts/apply-supabase-migrations.ts` from a machine with Supabase network access to apply Phase 6 migrations (000001-000005).

### Files of Interest

- `.planning/phases/06-admin-backoffice/06-HUMAN-UAT.md` — Phase 6 8개 수동 UAT 시나리오 (5 실행가능, 3 deferred)
- `.planning/phases/06-admin-backoffice/06-VERIFICATION.md` — Phase 6 자동화 게이트 증거 (D-27..D-43 전부)
- `.planning/phases/05-reviews-settlements/05-HUMAN-UAT.md` — Phase 5 3개 수동 UAT 시나리오
- `.planning/phases/05-reviews-settlements/05-VERIFICATION.md` — Phase 5 자동화 게이트 증거 (vitest/build/grep)
- `.planning/REQUIREMENTS.md` — 43개 v1 요구사항 + 17개 Phase 6 결정 + traceability
- `.planning/ROADMAP.md` — 6-phase 구조 (Phase 6 코드 완료)
- `supabase/migrations/20260414000005_phase6_admin_seed.sql` — Admin 계정 시드 (NO-OP stub, 주석 해제 후 적용)
- `next.config.ts` — serverExternalPackages (Prisma 7 + pg Turbopack fix, commit `e3618f4`)
- `prisma/schema.prisma` — Phase 2-6 최종 스키마 (BusinessProfile 6 new cols, Application 3 new cols, ADMIN role)
- `src/app/admin/` — /admin route group (layout + dashboard + businesses list + detail + AdminSidebar)
- `src/lib/db/admin-queries.ts` — Admin business list/detail queries with ILIKE + cursor pagination
- `src/lib/commission.ts` — getEffectiveCommissionRate + computeCommissionSnapshot
- `src/lib/ocr.ts` — runBizLicenseOcr (CLOVA OCR wrapper)

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
