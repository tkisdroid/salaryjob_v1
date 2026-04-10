---
phase: 04-db
verified: 2026-04-11T03:05:00Z
status: passed
score: 11/11 must-haves verified (code-level) + 5 HUMAN-UAT deferred by external dependency
overrides_applied: 0
verifier: gsd-verifier (goal-backward, code-reading)
gates:
  vitest: 34 files / 109 passing / 5 todo / 0 failing
  next_build: 32/32 static pages, all Phase 4 routes dynamic (verified locally)
  mock_data_imports_in_src: 0 (src/generated/prisma/internal/class.ts and src/lib/{job-utils,types/job}.ts only contain comment references, no actual imports)
deferred:
  - truth: "Kakao Maps renders actual markers for real jobs in viewport"
    addressed_in: "HUMAN-UAT scenario 3"
    evidence: "NEXT_PUBLIC_KAKAO_MAP_KEY is empty at Plan 04-10 execution time; MapView handles missing-key gracefully via Alert placeholder (verified in src/components/worker/map-view.tsx hasKey branch). Unblocks after Kakao Developers console app registration."
  - truth: "Web Push end-to-end delivers OS notification on accept/reject and deletes 410 subscriptions"
    addressed_in: "HUMAN-UAT scenario 2"
    evidence: "Server-side path fully tested (tests/push/subscribe + send-410-cleanup GREEN); browser-side grant/click/unsubscribe requires HTTPS browser session transition outside automation scope."
  - truth: "QR checkout camera scan completes full Worker flow"
    addressed_in: "HUMAN-UAT scenario 1"
    evidence: "JWT sign/verify path fully tested (tests/shift/checkout-jwt.test.ts GREEN, 4 cases incl. tamper/expired/alg-none); getUserMedia requires mobile HTTPS secure context."
  - truth: "Realtime postgres_changes 2-tab round-trip propagates status change within 60s"
    addressed_in: "HUMAN-UAT scenario 4"
    evidence: "Publication ADD TABLE + RLS policies verified in migration 20260412000001/002; subscribe wrappers verified in src/lib/supabase/realtime.ts; actual round-trip requires 2-tab browser session."
  - truth: "Geofence ST_DWithin rejects outside-radius check-in on real GPS"
    addressed_in: "HUMAN-UAT scenario 5"
    evidence: "ST_DWithin SQL verified in src/lib/geofence.ts; tests/shift/geofence.test.ts GREEN against seeded business_profiles.location; real GPS boundary verification requires physical 100m/300m positions."
---

# Phase 4 (지원·근무 라이프사이클 DB 연결) Verification Report

**Phase Goal**: Worker가 실 DB로 원탭 지원·수락·체크인·체크아웃까지 완주하고, Business는 지원자 상태를 실시간으로 관리한다. Scope 확장: Kakao 지도 탐색 + Web Push + 체크아웃 QR.

**Verified**: 2026-04-11 (code-reading + local vitest run + local next build)
**Status**: **PASS** — 자동 검증 가능한 모든 목표 달성. HUMAN-UAT 5 시나리오는 외부 의존성으로 수동 검증 대기.

---

## Verification Method

SUMMARY.md의 주장은 **신뢰하지 않았습니다**. 다음 단계로 goal-backward 검증을 수행했습니다:

1. ROADMAP Success Criteria 8개 및 REQUIREMENTS APPL/SHIFT/SEARCH/NOTIF 11개 ID를 must-haves로 추출
2. 각 must-have를 지원하는 파일(migrations / Server Actions / Client components / libs / tests)을 코드 레벨에서 직접 읽음
3. 실제 구현이 stub인지 확인 (grep: TODO/placeholder/return null/하드코딩 빈 배열) — **0건**
4. Key link wiring을 확인 (Component → Action → DB → Response → UI)
5. vitest 전체 수트 로컬 실행 (82초): **34 files / 109 passing / 5 todo / 0 failing**
6. `NODE_ENV=production npx next build` 로컬 실행: **32/32 static pages success, Phase 4 라우트 전부 dynamic (ƒ) 표시**
7. `mock-data` import 전수 조사: src/ 에서 실제 import **0건** (comment reference만 2건)

---

## Per-Requirement Verification (코드 증거 첨부)

### APPL-01 — One-tap apply (ACHIEVED)

**File**: `src/app/(worker)/posts/[id]/apply/actions.ts`
- `applyOneTap(input)` Server Action이 Zod 검증 → `requireWorker()` → `prisma.$transaction` 내부에서 두 단계 원시 SQL 수행:
  - Step 1: `UPDATE jobs SET filled = filled + 1, status = CASE WHEN filled + 1 >= headcount THEN 'filled' ELSE status END WHERE id=$jobId AND filled < headcount AND status='active' RETURNING id` — `filled < headcount` 가드가 Postgres row-level lock과 결합되어 원자적 좌석 예약
  - Step 2: `INSERT INTO applications (..., status='pending') ... ON CONFLICT (jobId, workerId) DO NOTHING RETURNING id` — 중복시 throw → Step 1 보상 롤백
- `status='pending'` 기본값: `prisma/schema.prisma` line 178 `status ApplicationStatus @default(pending)` 확인
- 테스트: `tests/applications/apply-race.test.ts` — 10 concurrent workers on headcount=5 job → 정확히 5 successes + 5 failures ("job_full"/"already_applied"), `jobs.filled=5`, `jobs.status='filled'`. 실제 `applyOneTap` 호출 통합 테스트.
- 추가 테스트: `apply-one-tap.test.ts`, `apply-duplicate.test.ts` 모두 PASS

### APPL-02 — Worker sees upcoming/active/done buckets (ACHIEVED)

**File**: `src/app/(worker)/my/applications/page.tsx` + `applications-client.tsx`
- page.tsx는 `getApplicationsByWorker(session.id, { bucket })` 3회 병렬 호출 (upcoming/active/done) — 실 DB 쿼리, mock-data 미사용
- applications-client.tsx는 `subscribeApplicationsForWorker(workerId, onChange, onStatusChange)`로 Supabase Realtime 구독 + CHANNEL_ERROR/TIMED_OUT 시 60초 polling fallback (`pollingActive` state)
- 테스트: `tests/applications/list-worker.test.ts` PASS

### APPL-03 — Business sees applicants list (ACHIEVED)

**File**: `src/app/biz/posts/[id]/applicants/page.tsx` + `applicants-client.tsx`
- page.tsx가 `requireJobOwner(id)` (ownership gate via redirect) → `getApplicationsByJob(id)` — 실 DB
- applicants-client.tsx가 `subscribeApplicationsForJob(jobId, ...)` Realtime + 폴링 fallback + optimistic INSERT/UPDATE/DELETE merge
- 테스트: `tests/applications/list-biz.test.ts` PASS

### APPL-04 — Accept / Reject / Cancel with state reflection (ACHIEVED)

**Files**:
- `src/app/biz/posts/[id]/applicants/actions.ts` — `acceptApplication` + `rejectApplication`
  - Ownership via `loadAppAndVerifyOwner` (job.authorId === session.id)
  - accept: pending → confirmed, idempotent on already-confirmed
  - reject: pending/confirmed → cancelled **+ jobs.filled decrement (GREATEST 0)** in single `$transaction`, re-opens job if was filled
- `src/app/(worker)/my/applications/actions.ts` — `cancelApplication`
  - 24h rule via `combineWorkDateTime` + cancelDeadline → `cancel_too_late` if late without `acknowledgedNoShowRisk`
  - Late cancel: transaction atomically cancels application, decrements filled, **increments worker_profiles.noShowCount** (D-22)
- Realtime reflection: 양쪽 UI 모두 `subscribeApplications*` + polling fallback
- 테스트: `tests/applications/accept-reject.test.ts` PASS

### APPL-05 — Auto-fill on headcount reach + 30-min auto-accept cron (ACHIEVED)

- **Atomic fill transition**: `applyOneTap` Step 1의 `CASE WHEN filled+1 >= headcount THEN 'filled'` → 마지막 지원자 커밋 시점에 `jobs.status='filled'` 전환 (race-safe)
- **Auto-accept cron**: `supabase/migrations/20260412000003_pg_cron_auto_accept_applications.sql` → `cron.schedule('auto-accept-applications-every-min', '* * * * *', $$ UPDATE applications SET status='confirmed' WHERE status='pending' AND appliedAt < now() - INTERVAL '30 minutes' $$)` — 매분 실행, 30분 후 pending→confirmed
- **No-show cron**: `20260412000004_pg_cron_detect_no_show_applications.sql` → 매 5분, `confirmed` + `checkInAt IS NULL` + workStart+30min 지난 row를 cancelled + jobs.filled decrement + worker_profiles.noShowCount++ **단일 CTE chain**으로 처리
- 테스트: `tests/applications/headcount-fill.test.ts`, `auto-accept-cron.test.ts` PASS

### SHIFT-01 — Check-in with time window + PostGIS geofence (ACHIEVED)

**Files**:
- `src/app/(worker)/my/applications/[id]/check-in/actions.ts` — `checkIn(applicationId, coords)`
  - Gates: requireApplicationOwner → status==='confirmed' → `isWithinCheckInWindow(now, workDate, startTime)` → `await isWithinGeofence(businessId, coords)`
  - 성공 시 status='in_progress', checkInAt=now
- `src/lib/shift-validation.ts` — 시간 윈도우 `[startTime-10min, startTime+30min]` 순수 함수, Asia/Seoul 고정 UTC+9 오프셋 처리 (no DST)
- `src/lib/geofence.ts` — `prisma.$queryRaw` ST_DWithin against `business_profiles.location::geography`, 기본 radius 200m, location IS NULL fallback에 warning
- 테스트: `tests/shift/check-in-time-window.test.ts` (6 boundary cases), `tests/shift/geofence.test.ts` PASS

### SHIFT-02 — Check-out with JWT QR + actual hours + earnings (ACHIEVED)

**Files**:
- `src/app/(worker)/my/applications/[id]/check-in/actions.ts` — `checkOut(applicationId, qrToken)`
  - Gates: requireApplicationOwner → status==='in_progress' → checkInAt set → `isWithinCheckOutWindow` → `verifyCheckoutToken(qrToken)` → payload.jobId === job.id AND payload.businessId === job.businessId
  - Computes `actualHours` (15-min round) + `nightPremium` + `earnings = floor(actualHours * hourlyPay) + nightPremium + transportFee`
  - Writes status='completed', checkOutAt, actualHours (Decimal), earnings
- `src/lib/qr.ts` — `jose` HS256 sign/verify, `APPLICATION_JWT_SECRET` as 64-char hex or UTF-8, default TTL 10min, `jwtVerify` with `algorithms:['HS256']` blocks alg:none downgrade
- `src/app/biz/posts/[id]/actions.ts` — `generateCheckoutQrToken(jobId)` Server Action, `requireJobOwner` + in-process 30s rate limit + nonce=randomUUID
- `src/components/biz/checkout-qr-modal.tsx` — QR SVG render, 10min countdown, 10s-before-expiry auto-regenerate
- `src/components/worker/qr-scanner.tsx` (존재 확인) — html5-qrcode 기반
- 테스트: `tests/shift/checkout-jwt.test.ts` (4 cases 탬퍼/만료/alg), `actual-hours.test.ts` (7 cases), `earnings.test.ts` (3 cases) PASS

### SHIFT-03 — Night shift premium 50% for ≥4h in 22:00–06:00 (ACHIEVED)

**File**: `src/lib/night-shift.ts`
- `computeNightHoursOverlap(checkIn, checkOut)` — Asia/Seoul linear minutes 변환 + 매 로컬 day의 `[22:00, next-day 06:00)` 윈도우와 교집합 누적, cross-midnight 처리
- `calculateNightShiftPremium(checkIn, checkOut, hourlyPay)` — overlap < 4h → 0; otherwise `Math.floor(nightHours * hourlyPay * 0.5)`
- `checkOut` Server Action이 이 결과를 earnings에 합산 (위 SHIFT-02 참조)
- 테스트: `tests/shift/night-shift.test.ts` — 6 boundary cases (fixed Asia/Seoul offset) PASS

### SEARCH-02 — /home list/map toggle with Kakao markers (ACHIEVED, graceful missing-key)

**Files**:
- `src/app/(worker)/home/page.tsx` — searchParams 파싱(view/radius/preset/buckets), `getJobsByDistance` 호출(timePreset/timeBuckets 전달), `kakaoAvailable = Boolean(process.env.NEXT_PUBLIC_KAKAO_MAP_KEY && trim !== '')` 계산
- `src/app/(worker)/home/home-client.tsx` (존재 확인) — list|map 토글
- `src/components/worker/map-view.tsx` — `useKakaoMapsSDK()` lazy bootstrap, `hasKey=false` 경로는 Alert placeholder 렌더 (스크립트 주입 안 함, 네트워크 요청 없음), marker + Circle + preview card 로직
- 테스트: `tests/e2e/map-view.spec.ts`는 KAKAO_MAP_KEY 비어 있으면 `test.skip`으로 skip (documented in 04-10 SUMMARY)

**NOTE**: 실제 Kakao marker 렌더는 `.env.local`에 `NEXT_PUBLIC_KAKAO_MAP_KEY`가 비어 있어 HUMAN-UAT 3번으로 이월. 코드 경로 자체는 완성되어 있음 (deferred items 참조).

### SEARCH-03 — Time preset + bucket + distance stepper filter (ACHIEVED)

**Files**:
- `src/lib/time-filters.ts` — `TimePreset = 오늘|내일|이번주`, `TimeBucket = 오전|오후|저녁|야간`, `isTimePreset`/`isTimeBucket` type guards, `doesTimeBucketMatch` (야간 wraps midnight), `buildTimeFilterSQL` 반환 `{whereClause, params}` 모두 SQL constants only
- `src/lib/db/queries.ts` line 514 `buildTimeFilterPrismaSql` — 동일 semantic을 `Prisma.Sql`로 재생성, `Prisma.join` 사용, `getJobsPaginated`/`getJobsByDistance` 두 함수 모두 WHERE 절에 `${timeFilter}` 합성 (line 655, 711)
- `src/components/worker/home-filter-bar.tsx` (존재 확인) — URL state (radius stepper 1/3/5/10km + preset chips + bucket multi-select)
- 테스트: `tests/search/time-filter.test.ts` (4 cases WHERE fragment 파싱), `time-bucket.test.ts` (7 cases 경계값 — 06:00→오전, 22:00→야간, 05:00→야간 midnight wrap) PASS

### NOTIF-01 partial — Web Push (ACHIEVED)

**Files**:
- `prisma/schema.prisma` line 217 — `model PushSubscription { userId, endpoint @unique, p256dh, auth, lastUsedAt }`
- `public/sw.js` — install/activate/push/notificationclick handlers. Push event → `registration.showNotification(title, options)` with data.url. Click → focus existing tab via `client.navigate(url)` or `openWindow(url)`
- `src/lib/push.ts` — `sendPushToUser(userId, payload)` via `web-push` with VAPID, `Promise.allSettled`, **410/404 → `prisma.pushSubscription.delete`** (dead endpoint cleanup), 기타 에러는 swallow + log, VAPID 미설정시 warning + no-op
- `src/lib/actions/push-actions.ts` — `subscribePush(input)` Zod schema {endpoint url, keys.p256dh/auth} → `requireWorker()` → upsert by endpoint. `unsubscribePush(endpoint)` → deleteMany {endpoint, userId}
- `src/components/worker/push-permission-banner.tsx` — Notification.requestPermission → pushManager.subscribe({applicationServerKey: urlBase64ToUint8Array(vapidPublic).buffer}) → subscribePush Server Action
- Push triggers wired:
  - `applyOneTap` → `sendPushToUser(job.authorId, {type:'new-application', ...})`
  - `acceptApplication` → `sendPushToUser(app.workerId, {type:'accepted', url:/my/applications/[id]})`
  - `rejectApplication` → `sendPushToUser(app.workerId, {type:'rejected', url:/my/applications})`
- 테스트: `tests/push/subscribe.test.ts`, `tests/push/send-410-cleanup.test.ts` — 실제 410 throw 시 row delete 통합 테스트 PASS

---

## Migrations Verification (직접 SQL 읽음)

| Migration | Verdict | Evidence |
|---|---|---|
| `20260412000001_applications_rls_phase4.sql` | VERIFIED | 5 policies: applications_select_worker (`auth.uid()=workerId`), applications_select_business (EXISTS jobs join on authorId), applications_insert_worker, applications_update_worker, applications_update_business. RLS enabled via `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. Reviews 의도적으로 disabled (Phase 5 scope). |
| `20260412000002_applications_realtime_publication.sql` | VERIFIED | `ALTER PUBLICATION supabase_realtime ADD TABLE public.applications` + `REPLICA IDENTITY DEFAULT`. DO block makes re-run idempotent. |
| `20260412000003_pg_cron_auto_accept_applications.sql` | VERIFIED | `cron.schedule('auto-accept-applications-every-min', '* * * * *', UPDATE ... WHERE status='pending' AND appliedAt < now() - INTERVAL '30 minutes')`. Unschedule-if-exists 가드. |
| `20260412000004_pg_cron_detect_no_show_applications.sql` | VERIFIED | 매 5분. CTE chain: no_show_rows (confirmed + checkInAt NULL + workStart+30min 지남) → cancelled_apps → decremented_jobs (filled-1 + filled→active 전환) → noShowCount++. 단일 트랜잭션 내에서 부분 상태 없음. |

---

## Mock Removal Progress (DATA-05 exit gate 사전 점검)

Phase 5 종료 조건이지만 Phase 4에서 실질적으로 조기 달성:

```bash
grep -rn "from ['\"]@/lib/mock-data['\"]" src/  → 0 matches
grep -rn "from ['\"]\.\./.*mock-data['\"]" src/  → 0 matches
```

`mock-data`를 참조하는 src/ 파일 2건은 **주석 내 언급만**:
- `src/lib/job-utils.ts` line 3: `* Copied (not moved) from mock-data.ts so that seed.ts keeps working.`
- `src/lib/types/job.ts` lines 3-5: `* These are copied (not moved) from mock-data.ts ...`

실제 import 0건. `src/lib/mock-data.ts` 파일 자체는 아직 존재(21kb, 766 lines) — `prisma/seed.ts`가 시드 데이터 소스로 사용. Phase 5 exit 시 seed.ts 리팩터 후 삭제 가능.

---

## Anti-Pattern Scan (Phase 4 산출물 파일 전수 grep)

Scanned: `src/app/(worker)/posts/[id]/apply/*`, `src/app/(worker)/my/applications/**`, `src/app/biz/posts/[id]/**`, `src/lib/{push,qr,geofence,night-shift,shift-validation,time-filters}.ts`, `src/lib/supabase/realtime.ts`, `src/lib/actions/push-actions.ts`, `src/components/worker/{map-view,push-permission-banner,qr-scanner,home-filter-bar,cancel-application-dialog}.tsx`, `src/components/biz/checkout-qr-modal.tsx`, `public/sw.js`.

| Pattern | Matches | Severity | Impact |
|---|---|---|---|
| TODO/FIXME/XXX/HACK/PLACEHOLDER | 0 | — | none |
| `return null` (early returns) | 발견됨 in push-permission-banner (조건부 mount만, stub 아님) | ℹ️ Info | intentional guard |
| `=\s*\[\]` (hardcoded empty) | 0 as display data | — | none |
| console.log stubs | 0 | — | none |
| Empty onClick/onSubmit handlers | 0 | — | none |

**Stub/placeholder: 0 blocker, 0 warning.**

---

## Build / Test Runs (이 검증 세션에서 로컬 실행)

| Command | Result | Evidence |
|---|---|---|
| `npx vitest run` (wc -l 80) | **34 files / 109 passing / 5 todo / 0 failing** | Duration 82.14s |
| `NODE_ENV=production npx next build` | **PASS** — 32/32 static pages, 모든 Phase 4 라우트 dynamic (ƒ) | 빌드 출력 route table 확인 |
| `grep mock-data imports in src/` | **0 matches** (생성된 prisma + 주석 언급 제외) | — |

---

## Integration Concerns Found

### Minor / Informational

1. **`combineWorkDateTime` duplication (intentional)**: `cancelApplication` (server) 및 `applications-client.tsx` (client) 모두 동일한 `combineWorkDateTime` 헬퍼를 정의. 주석에서 명시적으로 "keep logic identical so the client 24h check matches the server-side rule" 표기. **정당한 duplication** (server side authoritative, client side는 UX hint). Phase 5에서 `src/lib/time.ts`로 추출 권장 — 블로커 아님.

2. **Test resolver test-mode**: `src/lib/dal.ts`가 vitest 환경에서 cookie path 대신 `@test.local` 이메일 worker/business를 찾아 session으로 사용 (Plan 04-10이 명시). 이는 통합 테스트가 실제 Supabase cookie 없이 Server Action을 직접 호출할 수 있게 해주지만, **프로덕션 경로와 다른 세션 해결 경로**를 taking. NODE_ENV guard가 확실히 걸려있는지 확인: `src/lib/dal.ts`가 `NODE_ENV==='test'` 브랜치로만 test resolvers 호출 — **안전**.

3. **In-process rate limit** `generateCheckoutQrToken`: `Map<userId, lastTime>` 30s 제한. Serverless multi-instance에서는 각 instance가 별도 map이므로 N-fold 요청 가능. Phase 5에서 Redis/DB로 이관 권장. **Phase 4 목표(Biz가 shift당 1회 모달 열기)에는 충분**.

4. **Kakao Maps KEY empty state**: `.env.local`에 `NEXT_PUBLIC_KAKAO_MAP_KEY=` 비어 있음. `MapView`는 `hasKey=false` 분기로 Alert placeholder 렌더. **Graceful degradation 검증됨**. Kakao Developers 앱 등록 후 키만 채우면 동작.

5. **`src/generated/prisma/internal/class.ts` mock-data reference**: Prisma가 생성한 internal 파일에 `mock-data` 문자열 포함 — grep 결과는 false positive (generated code, touched by `prisma generate`). **DATA-05 grep에는 `src/generated/` 제외 필요** — Phase 5 exit check에 반영 권장.

### Blockers

**없음.** 모든 APPL/SHIFT/SEARCH/NOTIF must-haves에 대한 구현이 실제로 코드베이스에 존재하며, 자동 테스트 기반 검증 완료.

---

## Final Verdict: **PASS**

Phase 4 (지원·근무 라이프사이클 DB 연결 + Kakao/Web Push/QR scope 확장)는 자동 검증 가능한 모든 목표를 달성했습니다.

- ✅ APPL-01..05: Server Actions + atomic transactions + RLS + pg_cron 전부 구현 + 통합 테스트 PASS
- ✅ SHIFT-01..03: time-window + PostGIS geofence + JWT QR + 야간 할증 전부 구현 + 테스트 PASS
- ✅ SEARCH-02/03: time-filters lib + queries 합성 + Kakao lazy SDK + HomeFilterBar URL state 전부 구현 (Kakao key만 empty)
- ✅ NOTIF-01 partial: VAPID + sw.js + subscribe/unsubscribe + push triggers on apply/accept/reject + 410 cleanup 전부 구현
- ✅ vitest 34/34 files, 109 tests PASS (0 failing)
- ✅ next build 32/32 static pages PASS
- ✅ src/ 내 실제 mock-data import 0건 (Phase 5 exit criterion 사전 만족)

**HUMAN-UAT 5 시나리오**(Kakao key / Web Push browser grant / QR 카메라 / Realtime 2-tab / GPS 물리 위치)는 **외부 의존성으로 인한 deferred**이며, 코드 경로 자체는 단위/통합 테스트로 검증되어 있습니다. Phase 5 시작에 블로커가 되지 않습니다.

---

## Next Session Recommendations

1. **`/gsd-plan-phase 5`** 실행 — 리뷰·정산·목업 제거 계획 수립
2. Phase 5 exit gate grep에 `src/generated/` 제외 필터 추가 (false positive 방지)
3. HUMAN-UAT 5 시나리오는 배포 전 수동 실행 (특히 시나리오 1 QR 체크아웃 + 4 Realtime 2-tab)

---
*Verified: 2026-04-11T03:05:00Z*
*Verifier: Claude (gsd-verifier)*
*Method: goal-backward code reading + local vitest + local next build + direct SQL migration inspection*
