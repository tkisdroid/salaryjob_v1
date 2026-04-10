---
phase: 04-db
plan: 01-foundation
subsystem: foundation
tags: [phase4, wave0, deps, tests, docs, scope-expansion]
requires: []
provides:
  - jose-html5qrcode-webpush-qrcode-deps
  - phase4-version-lock
  - phase4-env-placeholders
  - phase4-doc-scope-expansion
  - phase4-wave0-fixtures
  - phase4-wave0-red-tests
  - phase4-human-uat-checklist
affects:
  - .planning/PROJECT.md (Out of Scope re-defined)
  - .planning/REQUIREMENTS.md (43/43 v1 with SEARCH-02/03 + NOTIF-01 partial)
  - .planning/ROADMAP.md (already in sync from planning step)
tech-stack:
  added:
    - jose@^6.2.2 (HS256 JWT for checkout QR — D-15)
    - web-push@^3.6.7 (VAPID server-side push — D-20)
    - html5-qrcode@^2.3.8 (camera QR scan — D-14)
    - qrcode@^1.5.4 (server SVG QR generation — D-16)
    - "@types/web-push@^3.6.4, @types/qrcode@^1.5.6 (ambient types)"
  patterns:
    - "RED-baseline test contract: imports of unimplemented modules with @ts-expect-error annotations, executable describe/it blocks, skipIf(noSupabase) for integration suites"
    - "Threat T-04-03 mitigation: truncatePhase4Tables aborts when DATABASE_URL contains 'prod'/'production'"
key-files:
  created:
    - .planning/phases/04-db/04-VERSION-LOCK.md
    - .planning/phases/04-db/04-HUMAN-UAT.md
    - tests/fixtures/phase4/index.ts
    - tests/fixtures/phase4/users.ts
    - tests/fixtures/phase4/jobs.ts
    - tests/fixtures/phase4/push.ts
    - tests/applications/apply-one-tap.test.ts
    - tests/applications/apply-race.test.ts
    - tests/applications/apply-duplicate.test.ts
    - tests/applications/list-worker.test.ts
    - tests/applications/list-biz.test.ts
    - tests/applications/accept-reject.test.ts
    - tests/applications/auto-accept-cron.test.ts
    - tests/applications/headcount-fill.test.ts
    - tests/shift/check-in-time-window.test.ts
    - tests/shift/geofence.test.ts
    - tests/shift/checkout-jwt.test.ts
    - tests/shift/actual-hours.test.ts
    - tests/shift/earnings.test.ts
    - tests/shift/night-shift.test.ts
    - tests/search/time-filter.test.ts
    - tests/search/time-bucket.test.ts
    - tests/push/subscribe.test.ts
    - tests/push/send-410-cleanup.test.ts
    - tests/e2e/map-view.spec.ts
  modified:
    - package.json
    - package-lock.json
    - .env.example
    - .planning/PROJECT.md
    - .planning/REQUIREMENTS.md
decisions:
  - "Top-level pin of jose@6.2.2 even though it pre-existed as transitive dep — semver ownership for D-15 JWT path"
  - "tests/fixtures/phase4 is a separate fixture module from existing tests/helpers/test-* — Phase 4 fixtures depend on PostGIS Point updates and ApplicationStatus.pending which are Phase 4-specific"
  - "RED tests use @ts-expect-error on unimplemented imports rather than vi.todo() so vitest collects them as 'failing' (not 'todo'), giving Plan 04-04..07 a concrete completion gate"
  - "Checkpoint Task 9 (외부 키 발급) deferred to user-side prior to Plan 04-07 UAT — does not block Wave 1-3 schema/server-action work"
metrics:
  duration: ~50min
  completed: 2026-04-10
---

# Phase 4 Plan 1: Foundation Summary

**One-liner:** Phase 4 Wave 0 인프라 배치 — 5 deps locked, 19 RED 테스트 + 4 fixtures 작성, 3 문서 scope 확장, HUMAN-UAT 5 시나리오 + .env.example 4 키 placeholder.

## What Shipped

### 1. Dependency lock (Task 1)

- 4 runtime + 2 dev 패키지 설치, `04-VERSION-LOCK.md`에 정확한 buildtime 버전 기록.
- `jose@^6.2.2` (D-15 JWT), `web-push@^3.6.7` (D-20 VAPID), `html5-qrcode@^2.3.8` (D-14 카메라), `qrcode@^1.5.4` (D-16 서버 SVG).
- `@types/web-push@^3.6.4`, `@types/qrcode@^1.5.6` devDeps.
- `package-lock.json` 갱신 (957 packages added/audited).

### 2. Environment placeholders (Task 2)

`.env.example`에 4개 키 추가 (값은 비어있음, 주석으로 발급 절차 기술):
- `NEXT_PUBLIC_KAKAO_MAP_KEY` — Kakao Developers > JavaScript 키
- `WEB_PUSH_VAPID_PUBLIC_KEY` / `WEB_PUSH_VAPID_PRIVATE_KEY` — `npx web-push generate-vapid-keys`
- `APPLICATION_JWT_SECRET` — `node -e "crypto.randomBytes(32).toString('hex')"`

### 3. Document scope sync (Task 3)

3개 문서를 Phase 4 discuss-phase scope 확장에 맞춰 동기화. **기존 [x] checked 항목 무손상**.

| 문서 | 변경 |
|------|------|
| `PROJECT.md` | Out of Scope: "면접·판단 심사" 문구 + "자동수락 타이머는 허용" 단서 명시. Web Push (VAPID) 부분 활성화. Auth provider constraint에 "Kakao Maps SDK는 첫 외부 의존성 예외" 주석 |
| `REQUIREMENTS.md` | v1에 `Advanced Search (SEARCH-02 v2→v1, SEARCH-03 신설)` + `Notifications partial v1 (NOTIF-01 Web Push)` 섹션 신설. v2 NOTIF/SEARCH에 승격 주석. Traceability 테이블 +3 entries. Coverage 40 → **43** |
| `ROADMAP.md` | 변경 없음 (planning 단계에서 이미 8개 success criteria + 10 plans + 43 coverage가 동기화되어 있었음). Task 3 verification grep `리스트|지도` 통과 |

### 4. Wave 0 fixtures (Task 4)

`tests/fixtures/phase4/`에 4개 파일 작성:
- `users.ts` — `createTestWorker` / `createTestBusiness` (PostGIS Point 업데이트 포함)
- `jobs.ts` — `createTestJob` (geography column raw SQL update + 시간/날짜 offset 옵션)
- `push.ts` — `MOCK_PUSH_KEYS` + `buildMockSubscription`
- `index.ts` — barrel export + `truncatePhase4Tables` (T-04-03 prod URL guard)

### 5. RED-baseline test suite (Tasks 5-7)

총 19개 vitest 파일 + 1개 playwright spec 작성. 모두 RED 상태 (자동검증으로 18 vitest files failing 확인됨; e2e는 Kakao key 부재로 skip).

| 영역 | 파일 수 | 커버 요구사항 |
|------|---------|--------------|
| `tests/applications/` | 8 | APPL-01..05 (one-tap, race, duplicate, list-worker, list-biz, accept-reject, auto-accept-cron, headcount-fill) |
| `tests/shift/` | 6 | SHIFT-01..03 (time-window 6 boundaries, geofence ST_DWithin, JWT 4 attacks, actual-hours rounding 7 cases, earnings composition, night-shift 6 boundaries) |
| `tests/search/` | 2 | SEARCH-03 (time-filter SQL, time-bucket boundaries) |
| `tests/push/` | 2 | NOTIF-01 (subscribe, send-410-cleanup) |
| `tests/e2e/` | 1 | SEARCH-02 Playwright placeholder (skipped without `NEXT_PUBLIC_KAKAO_MAP_KEY`) |

각 파일은 상단 RED BASELINE 주석 + 미구현 모듈 import에 `@ts-expect-error` 마커. Plan 04-04..07이 구현하면 `@ts-expect-error`가 unused가 되어 typecheck fail → 강제 GREEN 전환.

### 6. HUMAN-UAT checklist (Task 8)

`.planning/phases/04-db/04-HUMAN-UAT.md` — 5 시나리오:
1. Check-out QR 카메라 스캔 풀 플로우 (SHIFT-02)
2. Web Push 구독 + accept 알림 + 클릭 + 410 cleanup (NOTIF-01)
3. Kakao Maps 지도 탐색 + 필터 (SEARCH-02)
4. Realtime postgres_changes 두 탭 (APPL-04)
5. Geofence 실 GPS 200m 경계 (SHIFT-01)

각 항목 전제·단계·성공 기준 + Sign-Off 체크박스 포함.

## Files

### Created (25)

**Planning docs (3):**
- `.planning/phases/04-db/04-VERSION-LOCK.md`
- `.planning/phases/04-db/04-HUMAN-UAT.md`
- `.planning/phases/04-db/04-01-foundation-SUMMARY.md` (this file)

**Test fixtures (4):**
- `tests/fixtures/phase4/{index,users,jobs,push}.ts`

**Test files (19):**
- `tests/applications/{apply-one-tap,apply-race,apply-duplicate,list-worker,list-biz,accept-reject,auto-accept-cron,headcount-fill}.test.ts`
- `tests/shift/{check-in-time-window,geofence,checkout-jwt,actual-hours,earnings,night-shift}.test.ts`
- `tests/search/{time-filter,time-bucket}.test.ts`
- `tests/push/{subscribe,send-410-cleanup}.test.ts`
- `tests/e2e/map-view.spec.ts`

### Modified (5)

- `package.json` — 4 runtime + 2 dev deps
- `package-lock.json` — full lockfile refresh
- `.env.example` — 4 placeholders
- `.planning/PROJECT.md` — Out of Scope 재정의
- `.planning/REQUIREMENTS.md` — v1 SEARCH/NOTIF 신설 + traceability + coverage 43

## Commits

| Hash | Subject |
|------|---------|
| `2b5b587` | chore(04-01): lock Phase 4 deps (jose/web-push/html5-qrcode/qrcode) |
| `5e06b07` | chore(04-01): add Phase 4 env placeholders (Kakao/VAPID/JWT) |
| `6adc964` | docs(04-01): sync PROJECT/REQUIREMENTS to Phase 4 scope expansion |
| `7d1fe39` | test(04-01): add Phase 4 Wave 0 shared fixtures (users/jobs/push) |
| `462bda2` | test(04-01): add 8 RED baseline tests for application lifecycle (APPL-01..05) |
| `ab0278a` | test(04-01): add 6 RED baseline tests for shift lifecycle (SHIFT-01..03) |
| `239a555` | test(04-01): add 5 RED baseline tests for search/push (SEARCH-02/03, NOTIF-01) |
| `0c0c0f8` | docs(04-01): add Phase 4 HUMAN-UAT checklist (5 scenarios) |

## Verification Results

| Check | Result |
|-------|--------|
| `node -e` runtime deps existence | OK (jose, web-push, html5-qrcode, qrcode) |
| `node -e` dev deps existence | OK (@types/web-push, @types/qrcode) |
| `grep` PROJECT.md scope expansion | OK (자동수락 타이머 / Web Push (VAPID / Kakao Maps JavaScript SDK) |
| `grep` REQUIREMENTS.md SEARCH-02/03 + NOTIF-01 | OK |
| `grep` ROADMAP.md `리스트|지도` | OK |
| `test -f` 19 test files + 4 fixtures + HUMAN-UAT | OK |
| `npm test -- tests/applications tests/shift tests/search tests/push --run` | **18 test files failed (RED, expected)** |
| Existing Phase 1/2/3 `[x]` checkboxes preserved (ROADMAP) | OK (13 retained) |

## Deviations from Plan

### Adjustments / Notes

**1. [Note] Test file count: 19 vitest + 1 playwright = 20 test/spec files (plan must_haves stated "21")**
- Plan `files_modified` frontmatter listed exactly 19 test entries (8 apps + 6 shift + 2 search + 2 push + 1 e2e) + 1 fixtures `index.ts` = 20 entries.
- Plan `must_haves.truths` claimed "21 Vitest/Playwright" but the explicit file list contains 19 test files. Resolved to deliver the explicit list (planner appears to have miscounted in the truths summary). All 8 APPL + 6 SHIFT + 4 SEARCH/NOTIF scenarios from VALIDATION.md are covered.

**2. [Rule 2 - Critical] truncatePhase4Tables prod URL guard added (T-04-03 mitigation)**
- Threat register T-04-03 mandated a sanity check; the helper now aborts if `DATABASE_URL` contains `prod`/`production`. Implemented in `tests/fixtures/phase4/index.ts` per threat model.

**3. [Note] ROADMAP.md unchanged**
- Phase 4 planning step (a6bb894) had already populated 8 success criteria, 10 plans, and the 43-coverage Note. Task 3 verification grep `리스트|지도` already passed before any edit. No additional ROADMAP modifications needed.

**4. [Note] tests/fixtures/phase4/users.ts uses any-cast for noShowCount**
- WorkerProfile.noShowCount field is added by Plan 04-02 (Prisma schema extension). To make the fixture compile in Wave 0 before that schema push, `noShowCount` is passed via an as-cast escape hatch when caller supplies it. This is a documented temporary pattern.

### Auto-fixed Issues

None — Tasks 1-8 ran clean against the existing Phase 3 baseline.

## Authentication / External Setup Gates

### Task 9 — Checkpoint (deferred to user, non-blocking for parallel waves)

**Status:** PENDING (parallel-execution context — orchestrator cannot run user-side actions; this checkpoint is gated `human-verify` with `kakao-later` allowance per resume-signal contract).

**External setup required before Plan 04-07 (Kakao Maps) and Plan 04-06 UAT (Web Push):**

1. **Kakao Developers app registration**
   - https://developers.kakao.com → 내 애플리케이션 → 앱 추가하기
   - 플랫폼 > Web > 사이트 도메인 `http://localhost:3000` 등록
   - JavaScript 키 → `.env.local`의 `NEXT_PUBLIC_KAKAO_MAP_KEY`

2. **VAPID 키 페어 생성**
   ```
   npx web-push generate-vapid-keys
   ```
   - Public Key → `WEB_PUSH_VAPID_PUBLIC_KEY`
   - Private Key → `WEB_PUSH_VAPID_PRIVATE_KEY`

3. **APPLICATION_JWT_SECRET 생성**
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   - → `APPLICATION_JWT_SECRET`

**Impact analysis:**
- Plans 04-02, 04-03, 04-04, 04-05 can proceed WITHOUT these keys (schema/RLS/server actions don't import Kakao or web-push at module level).
- Plan 04-06 (Web Push) requires VAPID keys at runtime — keys must be set before integration smoke test, but compile/test phases can use mock subscriptions from `tests/fixtures/phase4/push.ts`.
- Plan 04-07 (Kakao Maps) requires `NEXT_PUBLIC_KAKAO_MAP_KEY` for Plan 07 manual UAT scenario #3 only.
- Plan 04-10 final HUMAN-UAT cannot complete scenarios #1, #2, #3 without all 3 secrets.

**Recommendation:** User runs the 3 commands above any time before Wave 4 starts (`/gsd-execute-phase` orchestrator can prompt at that wave boundary). This plan has documented the exact procedure in HUMAN-UAT.md and `.env.example` comments.

## Known Stubs

None. All RED tests are intentional contracts for Plans 04-02..04-07; they are NOT runtime stubs that would render fake data to UI. The `noShowCount` cast in `users.ts` fixture is a typed any-cast for a field added one plan downstream, not a user-facing stub.

## Threat Flags

None. No new attack surface introduced beyond the threat_model already enumerated in PLAN.md (T-04-01 version pinning, T-04-02 env example placeholder, T-04-03 truncate guard, T-04-04 supply chain). Mitigation T-04-03 implemented in `tests/fixtures/phase4/index.ts`.

## Self-Check: PASSED

**Files verified to exist:**
- FOUND: .planning/phases/04-db/04-VERSION-LOCK.md
- FOUND: .planning/phases/04-db/04-HUMAN-UAT.md
- FOUND: tests/fixtures/phase4/{index,users,jobs,push}.ts (4)
- FOUND: tests/applications/*.test.ts (8)
- FOUND: tests/shift/*.test.ts (6)
- FOUND: tests/search/*.test.ts (2)
- FOUND: tests/push/*.test.ts (2)
- FOUND: tests/e2e/map-view.spec.ts (1)

**Commits verified:**
- FOUND: 2b5b587 (deps lock)
- FOUND: 5e06b07 (env placeholders)
- FOUND: 6adc964 (doc scope sync)
- FOUND: 7d1fe39 (fixtures)
- FOUND: 462bda2 (8 application RED tests)
- FOUND: ab0278a (6 shift RED tests)
- FOUND: 239a555 (5 search/push RED tests)
- FOUND: 0c0c0f8 (HUMAN-UAT checklist)

**RED baseline verified:**
- `npm test -- tests/applications tests/shift tests/search tests/push --run` → 18 test files failing (intentional)
- Pattern: import errors on unimplemented modules + assertion failures on stub implementations
- Wave 3-4 plans flip these to GREEN by implementing the imported symbols
