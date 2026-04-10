---
phase: 4
slug: db
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-10
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `04-RESEARCH.md` → `## Validation Architecture` section.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 (unit + integration) + Playwright 1.59.1 (E2E) |
| **Config file** | `vitest.config.ts` (root) + `playwright.config.ts` |
| **Quick run command** | `npm test -- <pattern>` (targeted Vitest run) |
| **Full suite command** | `npm test` (Vitest full) → `npm run test:all` (Vitest + Playwright) for phase gate |
| **Estimated runtime** | Targeted < 30s; full Vitest ~1–2min; full suite ~3–5min |

**Present already (no install needed):**
- `vitest.config.ts` with `environmentMatchGlobs` (tests/data=node, tests/components=jsdom, default=node)
- `tests/setup.ts` (testing-library jest-dom)
- `tests/stubs/server-only.ts` (server-only module stub for DAL tests)
- 15s timeout for DB-backed integration tests

---

## Sampling Rate

- **After every task commit:** `npm test -- <specific file pattern>` (<30s)
- **After every plan wave:** `npm test` (full Vitest, ~1–2min)
- **Before `/gsd-verify-work`:** `npm run test:all` (Vitest + Playwright) green + `04-HUMAN-UAT.md` checklist complete
- **Max feedback latency:** 30 seconds per task commit

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| APPL-01 | 원탭 지원 happy path | integration (Prisma direct) | `npm test -- tests/applications/apply-one-tap.test.ts` | ❌ W0 | ⬜ pending |
| APPL-01 | 동시 지원 경합 (10 concurrent, headcount=5) | integration | `npm test -- tests/applications/apply-race.test.ts` | ❌ W0 | ⬜ pending |
| APPL-01 | 재지원 차단 (ON CONFLICT) | integration | `npm test -- tests/applications/apply-duplicate.test.ts` | ❌ W0 | ⬜ pending |
| APPL-01 | 마감 공고 지원 차단 (status='filled') | integration | `npm test -- tests/applications/apply-duplicate.test.ts` | ❌ W0 | ⬜ pending |
| APPL-02 | Worker applications 목록 + 상태 탭 필터 | integration | `npm test -- tests/applications/list-worker.test.ts` | ❌ W0 | ⬜ pending |
| APPL-03 | Business applicants 목록 (jobs JOIN) | integration | `npm test -- tests/applications/list-biz.test.ts` | ❌ W0 | ⬜ pending |
| APPL-04 | accept/reject Server Action + compensation | integration | `npm test -- tests/applications/accept-reject.test.ts` | ❌ W0 | ⬜ pending |
| APPL-04 | Auto-accept pg_cron 30분 경과 전이 | integration (direct SQL) | `npm test -- tests/applications/auto-accept-cron.test.ts` | ❌ W0 | ⬜ pending |
| APPL-04 | Realtime postgres_changes 이벤트 수신 | **manual UAT** | `04-HUMAN-UAT.md → Realtime` | — | ⬜ manual |
| APPL-05 | headcount 도달시 jobs.status='filled' 원자 전이 | integration | `npm test -- tests/applications/headcount-fill.test.ts` | ❌ W0 | ⬜ pending |
| SHIFT-01 | 체크인 시간창 validation (6 boundary: -11, -10, -1, +30, +31, +100) | unit | `npm test -- tests/shift/check-in-time-window.test.ts` | ❌ W0 | ⬜ pending |
| SHIFT-01 | 체크인 geofence validation (inside 199m / outside 201m) | integration (PostGIS) | `npm test -- tests/shift/geofence.test.ts` | ❌ W0 | ⬜ pending |
| SHIFT-02 | 체크아웃 JWT verify (valid/expired/tampered/alg-confused) | unit | `npm test -- tests/shift/checkout-jwt.test.ts` | ❌ W0 | ⬜ pending |
| SHIFT-02 | 15분 반올림 계산 (0, 7, 8, 15, 22, 23, 37 분) | unit | `npm test -- tests/shift/actual-hours.test.ts` | ❌ W0 | ⬜ pending |
| SHIFT-02 | earnings 계산 (base + night premium + transportFee) | unit | `npm test -- tests/shift/earnings.test.ts` | ❌ W0 | ⬜ pending |
| SHIFT-03 | 야간할증 6 boundary cases (fully-inside, straddle-left, straddle-right, cross-midnight, no-overlap, <4h overlap) | unit | `npm test -- tests/shift/night-shift.test.ts` | ❌ W0 | ⬜ pending |
| SEARCH-02 | Kakao Maps SDK 로드 + marker 렌더 | **manual UAT** (HTTPS + API key) | `04-HUMAN-UAT.md → Map` | — | ⬜ manual |
| SEARCH-02 | Marker viewport 렌더 + click (mockable) | E2E (Playwright) | `npx playwright test tests/e2e/map-view.spec.ts` | ❌ W0 | ⬜ pending |
| SEARCH-03 | 시간 프리셋 SQL WHERE 생성 (오늘/내일/이번주) | integration | `npm test -- tests/search/time-filter.test.ts` | ❌ W0 | ⬜ pending |
| SEARCH-03 | 시간대 버킷 overlap 계산 (오전/오후/저녁/야간) | unit | `npm test -- tests/search/time-bucket.test.ts` | ❌ W0 | ⬜ pending |
| NOTIF-01 | subscribePush/unsubscribePush Server Action | integration | `npm test -- tests/push/subscribe.test.ts` | ❌ W0 | ⬜ pending |
| NOTIF-01 | sendPushToUser 410 Gone → DB cleanup | unit (mocked web-push) | `npm test -- tests/push/send-410-cleanup.test.ts` | ❌ W0 | ⬜ pending |
| NOTIF-01 | Service Worker 등록 + notification click deep link | **manual UAT** | `04-HUMAN-UAT.md → Push` | — | ⬜ manual |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

**Directory creation + test file stubs (all MISSING — planner must assign to Wave 0/1 tasks):**

- [ ] `tests/applications/` (7 files)
  - `apply-one-tap.test.ts` — APPL-01 happy path
  - `apply-race.test.ts` — APPL-01 concurrency (10 parallel Promise.all, headcount=5, expect exactly 5 success + 5 rejections)
  - `apply-duplicate.test.ts` — APPL-01 ON CONFLICT + status='filled' rejection
  - `list-worker.test.ts` — APPL-02 tabs 필터
  - `list-biz.test.ts` — APPL-03 jobs JOIN
  - `accept-reject.test.ts` — APPL-04 compensation
  - `auto-accept-cron.test.ts` — APPL-04 direct SQL (bypass cron schedule with manual UPDATE mimic)
  - `headcount-fill.test.ts` — APPL-05 atomic fill transition

- [ ] `tests/shift/` (6 files)
  - `check-in-time-window.test.ts` — SHIFT-01 pure unit
  - `geofence.test.ts` — SHIFT-01 PostGIS integration (real DB)
  - `checkout-jwt.test.ts` — SHIFT-02 jose sign/verify + tampering
  - `actual-hours.test.ts` — SHIFT-02 15-min rounding
  - `earnings.test.ts` — SHIFT-02 calculateEarnings composition
  - `night-shift.test.ts` — SHIFT-03 6 boundary cases

- [ ] `tests/search/` (2 files)
  - `time-filter.test.ts` — SEARCH-03 SQL WHERE generation
  - `time-bucket.test.ts` — SEARCH-03 unit

- [ ] `tests/push/` (2 files)
  - `subscribe.test.ts` — Server Action integration
  - `send-410-cleanup.test.ts` — mock web-push, assert prisma delete on 410

- [ ] `tests/e2e/` (1 Playwright spec)
  - `map-view.spec.ts` — /home toggle → map container render (skip if `NEXT_PUBLIC_KAKAO_MAP_KEY` absent)

- [ ] `.planning/phases/04-db/04-HUMAN-UAT.md` — manual verification checklist (see below)

- [ ] `tests/fixtures/phase4/` (shared fixtures)
  - Worker/Business user pairs with verified status
  - Job with geography Point (Seoul 강남역) for geofence tests
  - PushSubscription mock keys (p256dh/auth)

**Framework install:** NONE — Vitest 3.2.4 + Playwright 1.59.1 already present in `package.json`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 실제 카메라로 QR 스캔 → checkout 완주 | SHIFT-02 | html5-qrcode requires real camera + HTTPS; Playwright cannot grant camera permission | 1) Biz가 `/biz/posts/[id]` → "퇴근 QR 열기" 클릭. 2) Worker가 `/my/applications/[id]/check-in` → 카메라 허용 → 스캔. 3) 상태가 completed로 전이되고 earnings가 표시되는지 확인. |
| Web Push 구독 + 발송 + 클릭 + 410 cleanup | NOTIF-01 | Notification API requires real browser + user gesture | 1) Worker 로그인 → /my → 푸시 허용 배너 클릭 → 권한 허용. 2) 다른 탭에서 Biz가 accept 클릭. 3) OS 알림 표시 확인. 4) 클릭 → `/my/applications/[id]`로 이동. 5) DevTools → Application → Push 구독 해제 → 다시 accept → DB에서 PushSubscription 레코드 삭제 확인. |
| Kakao Maps SDK 로드 + marker click + panning + 필터 변경 | SEARCH-02 | Requires real Kakao API key + browser + HTTPS | 1) `.env.local`에 `NEXT_PUBLIC_KAKAO_MAP_KEY` 설정. 2) `/home` → 지도 토글 클릭. 3) 지도 컨테이너 렌더 + Seoul 중심 표시 확인. 4) Marker 클릭 → preview card 표시. 5) 거리 필터 3km → 10km 변경 시 marker 개수 변화 확인. |
| Realtime 이벤트 두 브라우저 tab 수동 비교 | APPL-04 | Realtime + RLS EXISTS JOIN 호환성이 Open Question #4 — 공식 docs 미확정 | 1) Tab A: Worker가 `/my/applications` 열기. 2) Tab B: Biz가 해당 application을 accept. 3) Tab A의 상태가 자동으로 "수락됨"으로 변경되는지 (폴링 60s 이전에) 확인. 4) `supabase_realtime` publication에 applications 테이블이 포함되어 있는지 SQL로 확인. |
| Geofence 실제 GPS 테스트 | SHIFT-01 | navigator.geolocation requires real device + HTTPS | 1) 모바일에서 HTTPS 배포 URL 접속. 2) Worker가 confirmed application → 체크인 시도. 3) 매장 반경 200m 밖에서 실패, 안에서 성공하는지 확인. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (21 test files + 1 HUMAN-UAT.md)
- [ ] No watch-mode flags (use `vitest run` not `vitest`)
- [ ] Feedback latency < 30s per task commit
- [ ] `nyquist_compliant: true` set in frontmatter after all W0 files committed

**Approval:** pending
