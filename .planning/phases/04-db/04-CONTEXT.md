---
phase: 04-db
phase_name: 지원·근무 라이프사이클 DB 연결 + 탐색 고도화
gathered: 2026-04-10
status: Ready for planning
discuss_mode: interactive
decisions_count: 28
scope_expansion: true
---

# Phase 4: 지원·근무 라이프사이클 DB 연결 — Context

**Goal (ROADMAP.md):** Worker가 실 DB로 원탭 지원·수락·체크인·체크아웃까지 완주하고, Business는 지원자 상태를 실시간으로 관리한다

**Requirements in scope (original):** APPL-01, APPL-02, APPL-03, APPL-04, APPL-05, SHIFT-01, SHIFT-02, SHIFT-03

**Requirements added via scope expansion (discuss-phase 2026-04-10):**
- `SEARCH-02` — 카카오맵 연동 공고 지도 표시 (v2→v1 승격)
- `SEARCH-03` — 시간 프리셋 + 시간대 버킷 필터 (신설)
- Web Push 알림 채널 (PROJECT.md "Push v2" 경계 부분 완화)

<scope_expansion_notice>
## ⚠️ Phase 4 Scope Expansion Notice

이 CONTEXT.md는 **ROADMAP.md와 REQUIREMENTS.md의 동기화되지 않은 상태**를 반영합니다. Discuss-phase 중 사용자가 명시적으로 3가지 scope 확장을 승인했습니다:

1. **지원 모델 변경** — `pending → accept` 플로우 사용 (Prisma enum `pending` 추가)
   - PROJECT.md "지원→대기→면접→채용 패턴 out of scope" 항목을 **"면접·판단 심사 out of scope. 자동 수락 타이머 기반 pending→accept는 허용"** 으로 재정의 필요
2. **카카오맵 지도 탐색** (REQUIREMENTS.md의 SEARCH-02 v2→v1 승격)
   - 단일 벤더 Supabase 원칙의 **첫 예외** — Kakao Developers 외부 의존성 추가
3. **Web Push 알림** (PROJECT.md "Push 알림 Phase 4+"의 부분 활성화)
   - VAPID 기반 브라우저 내장 push만 Phase 4. SMS / 카카오 알림톡 / 네이티브 FCM은 여전히 v2

**이 문서들을 Phase 4 실행 전/중에 업데이트해야 합니다:**
- `.planning/PROJECT.md` — "Out of Scope" 섹션 재정의 (pending 모델, Kakao Maps, Web Push 문구)
- `.planning/ROADMAP.md` — Phase 4 Success Criteria에 지도 뷰 + 시간/거리 필터 + Web Push 추가
- `.planning/REQUIREMENTS.md` — `SEARCH-02` v1로 승격, `SEARCH-03` 신설, `NOTIF-01` 부분 활성화
- 이 업데이트 자체는 Phase 4의 첫 plan (04-01-PLAN.md)에 `[BLOCKING]` 태스크로 포함되어야 함

</scope_expansion_notice>

<domain>
## Phase Boundary

**IN scope — Phase 4 (확장 후):**
- **Application 라이프사이클**: pending → confirmed → in_progress/checked_in → completed (+ cancelled)
- **원탭 지원 Server Action**: Worker가 공고 상세에서 "원탭 지원" → DB 레벨 headcount 원자적 차감
- **자동수락 타이머**: 30분 후 Business 미응답시 pending → confirmed 자동 전이 (pg_cron)
- **Business 지원자 관리**: /biz/posts/[id]/applicants에서 수락/거절 (거절은 cancelled 매핑)
- **Headcount 자동 마감**: (pending + confirmed) == headcount 도달시 jobs.status='filled'
- **체크인**: 시간창(시작 10분 전 ~ 30분 후) + PostGIS ST_DWithin 200m geofence 검증
- **체크아웃**: html5-qrcode 카메라 스캔 + JWT payload 서명 검증 + 시간창 검증
- **실근무시간 계산**: 15분 단위 반올림, 정직한 시간 지급 (조퇴도 실근무만큼만)
- **야간할증 계산**: 22:00-06:00 구간 4시간+ 근무시 50% 가산 (TypeScript 함수)
- **Applications RLS**: Worker 본인 + Business via jobs JOIN (Phase 2 D-05의 임시 비활성화 해제)
- **Realtime 동기화**: Supabase `postgres_changes` 구독 (Worker/Biz 양측, 60s polling 폴백)
- **Worker 취소 정책**: 근무 24시간 전까지 무료 취소, 이후는 noShowCount 누적
- **Web Push 알림**: VAPID + Service Worker + PushSubscription Prisma 모델 + Server Action sender
- **Kakao Maps 탐색**: /home에 리스트/지도 토글, html 기반 kakao.maps SDK, marker 렌더
- **시간 필터**: 오늘/내일/이번주 프리셋 + 오전/오후/저녁/야간 시간대 버킷
- **거리 필터**: 1/3/5/10km 스테퍼 (리스트/지도 공유)
- **mock-data.ts 의존 경로 해제**: `/my/applications` + `/biz/posts/[id]/applicants` 인라인 목업 제거
- **PROJECT.md/ROADMAP.md/REQUIREMENTS.md 문서 동기화** (scope 확장 명시)

**OUT of scope — Phase 5+:**
- Review system (REV-01..04) — 완료된 application에 대한 리뷰 UI는 Phase 1 목업 유지
- Settlement 실연동 (SETL-01..03) — earnings 계산만 Phase 4, 실제 정산 플로우는 Phase 5
- `src/lib/mock-data.ts` 파일 삭제 (Phase 5 최종 exit 기준)
- 네이티브 FCM/APNs push
- SMS / 카카오 알림톡
- Toss Payments 실연동
- 원천징수 3.3%
- 국세청 사업자번호 검증
- 카카오 SSO (Supabase Auth 기본 유지)
- Worker 가용시간 캘린더 (WorkerAvailability 모델)
- 즐겨찾기/찜
- Job 키워드 검색 (카테고리+거리+시간대만)
- 지도 marker clustering (초기 구현에서는 단순 marker만, 성능 이슈시 Phase 5+에서 tuning)

</domain>

<carry_forward>
## Phase 2/3에서 이월·유지되는 결정

| 출처 | 결정 | Phase 4 적용 |
|------|------|-------------|
| Phase 2 D-01 | Supabase 단일 벤더 (Auth + DB + Storage + Realtime) | **유지 + Kakao Maps만 예외** (scope 확장 승인) |
| Phase 2 D-02 | Prisma 7 datasource url/directUrl은 `prisma.config.ts` | 유지 |
| Phase 2 D-03 | Hybrid SSOT (Prisma=모델, supabase/migrations=RLS/trigger/extension) | **Phase 4 applications RLS는 `supabase/migrations/*.sql`에 추가**. 자동수락 pg_cron도 마이그레이션으로 |
| Phase 2 D-05 | jobs/applications/reviews는 Phase 2 시점 RLS OFF | **Phase 4 D-17에서 applications RLS 재활성화** (reviews는 Phase 5) |
| Phase 2 D-06 | `src/proxy.ts` 낙관적 + `src/lib/dal.ts` 엄격 2중 방어 | 유지 + D-18에서 dal.ts에 requireApplicationOwner/requireJobOwner 추가 |
| Phase 2 D-07 | `.env.local` 12개 키 | **Phase 4에서 4개 키 추가**: `NEXT_PUBLIC_KAKAO_MAP_KEY`, `WEB_PUSH_VAPID_PUBLIC_KEY`, `WEB_PUSH_VAPID_PRIVATE_KEY`, `APPLICATION_JWT_SECRET` (QR payload 서명용; Supabase JWT secret 재사용 검토) |
| Phase 3 D-02 | Jobs RLS 재활성화 (public SELECT + owner INSERT/UPDATE/DELETE) | applications RLS가 jobs와 JOIN할 때 이 정책 활용 |
| Phase 3 D-04 | pg_cron 만료 자동화 + LAZY_FILTER_SQL 중복 방어 | **동일 패턴으로 자동수락 타이머 cron 추가**. `auto_accept_applications_every_min` 스케줄 |
| Phase 3 D-05 | Cursor 페이지네이션 (SSR 첫 페이지 + client cursor 무한 스크롤) | 유지. /home 지도 뷰에서는 cursor 대신 `ST_DWithin` 반경 내 전량 로드 |
| Phase 3 D-06 | PostGIS `$queryRaw` + `ST_DWithin` + `ST_Distance` | **체크인 geofence 검증에 동일 `ST_DWithin` 재사용** |

## Phase 2/3 자산 (재사용 가능, 다시 만들지 말 것)

**Data layer (완성):**
- `prisma/schema.prisma` — User, WorkerProfile, BusinessProfile, Job, Application, Review 정의됨
  - **Phase 4가 변경**: `ApplicationStatus` enum에 `pending` 추가 (맨 앞), `Application.status` 기본값을 `pending`으로 변경, 새 모델 `PushSubscription` 추가
- `src/lib/db/queries.ts` — getJobs/getJobById/getApplications/getApplicationById/getJobsPaginated/getJobsByDistance/adaptApplication 등
  - **Phase 4가 확장**: `getApplicationsByJob(jobId)` (biz 지원자 목록), `getApplicationsByWorker` → status 필터 추가, `getJobsByDistance`에 시간 필터 파라미터 추가
- `src/lib/dal.ts` — verifySession/requireWorker/requireBusiness
  - **Phase 4가 추가**: `requireApplicationOwner(applicationId)`, `requireJobOwner(jobId)`

**Auth & RLS 패턴 (완성):**
- Phase 2 direct-prisma migration runner: `scripts/apply-supabase-migrations.ts` — Phase 4 새 마이그레이션도 동일 경로
- Phase 3 jobs RLS 패턴 (`supabase/migrations/20260411000001_jobs_rls_phase3.sql`) — applications RLS가 동일 스타일로 작성

**UI 자산 (Phase 1 목업, Phase 4에서 wire할 대상):**
- `src/app/(worker)/posts/[id]/apply/apply-confirm-flow.tsx` — 원탭 지원 UX (현재 `MockJob` 타입, setTimeout 모킹). Phase 4에서 실제 Server Action 호출로 교체
- `src/app/(worker)/my/applications/page.tsx` — **인라인 하드코드 목업** (mock-data.ts 아님, 파일 안 APPLICATIONS 상수). Phase 4에서 `getApplicationsByWorker` + status tabs 매핑
- `src/app/(worker)/my/applications/[id]/check-in/check-in-flow.tsx` — QR 모킹 UI. Phase 4에서 체크인은 geofence + 시간창, 체크아웃은 실제 html5-qrcode 카메라 통합
- `src/app/biz/posts/[id]/applicants/page.tsx` — **인라인 하드코드 목업** (APPLICANTS 상수). Phase 4에서 `getApplicationsByJob` + 수락/거절/Realtime
- `src/app/biz/posts/[id]/page.tsx` — 공고 상세. Phase 4에서 "퇴근 QR 열기" 버튼 + 모달 추가
- `src/app/(worker)/home/page.tsx` — Phase 3에서 PostGIS 거리 정렬 + 페이지네이션 완성. **Phase 4에서 리스트/지도 토글 + 시간/거리 필터 추가**

**Legacy 자산 (Phase 4가 삭제/재작성):**
- `src/app/api/push/register/route.ts` — Phase 1 스캐폴드 스텁 (`mock-user-id` 하드코딩, Clerk TODO 주석, FCM 용어). **Phase 4에서 삭제하고 Server Action + VAPID Web Push로 재작성**

</carry_forward>

<decisions>
## Implementation Decisions

### Application Lifecycle

#### D-01 지원 라이프사이클 모델
**Decision:** `pending → confirmed` 플로우 사용, Business "수락" 필요 (자동수락 타이머 포함)
**Rationale:** 사용자 명시적 요청. "지원시 바로 대기 상태로 넘어가고 수락시 컨펌되고 워커에게 알림이 가고 마이페이지의 스케쥴 등에 반영". 절차는 간소화하되 pending 단계 자체는 제거하지 않음.
**Schema change:** `ApplicationStatus` enum에 `pending` 추가 (맨 앞 위치), `Application.status` 기본값을 `@default(pending)`으로 변경.
**PROJECT.md 재정의 필요:** "지원→대기→면접→채용 패턴 out of scope"를 **"면접·판단 심사·고용주 임의 거절 out of scope. 자동수락 타이머 기반 간소화된 pending→accept는 Timee 철학과 양립"** 으로 명시.
**Enum 순서 (migration 요망):**
```prisma
enum ApplicationStatus {
  pending       // NEW — default state after one-tap apply
  confirmed     // Business accepted OR auto-accept timer elapsed
  in_progress   // Worker checked in, work started
  checked_in    // (legacy alias of in_progress; Phase 4 결정: in_progress만 사용, checked_in deprecate)
  completed     // Worker checked out, earnings calculated
  cancelled     // Worker self-cancel OR Business reject OR no-show
}
```
Claude 재량: `checked_in`은 현재 사용처가 없으므로 deprecate 주석만 달고 enum에 남겨둠 (DB 마이그레이션 없이). Phase 5에서 제거 여부 재검토.

#### D-02 Business 수락 인터페이스
**Decision:** 자동수락 타이머 기반 간소화 — Business가 N분 내 응답 안하면 자동 confirmed 전이
**Why:** 사용자 명시 "절차는 최대한 간소화". Business에게 수동 수락 버튼도 제공하되, 미응답시 자동 전이로 Worker "매칭 실패" 두려움 제거.
**UX:** /biz/posts/[id]/applicants에 지원자 카드 + "수락" 버튼(teal) + "거절" 버튼(outline). Auto-accept 타이머가 돌고 있으면 카드에 "X분 후 자동 수락" 표시.

#### D-03 자동수락 타이머 기본값
**Decision:** 30분
**Implementation:** Supabase `pg_cron` 1분 주기 스케줄로 pending 상태이고 `appliedAt < now() - interval '30 minutes'`인 application을 `confirmed`로 전환.
```sql
SELECT cron.schedule(
  'auto-accept-applications-every-min',
  '* * * * *',
  $$
    UPDATE public.applications
    SET status = 'confirmed'
    WHERE status = 'pending'
      AND "appliedAt" < now() - interval '30 minutes';
  $$
);
```
**Business 수동 cancel/reject도 동일 테이블 UPDATE** — pending에서 cancelled로 전이 + job.filled 원자적 차감.
**Realtime 반영:** 이 UPDATE가 Supabase Realtime `postgres_changes`로 Worker 클라이언트에 즉시 푸시됨.

#### D-04 Headcount 정원 계산 모델
**Decision:** `pending + confirmed + in_progress + checked_in + completed` 합이 headcount 소진 기준 (cancelled는 제외)
**Implementation:** `jobs.filled` 컬럼을 이 합으로 유지. 지원시 +1, cancel/reject시 -1. 이미 `jobs.filled` 컬럼이 스키마에 있음 (기본값 0).
**자동 마감 전이:** `jobs.filled == jobs.headcount` 도달시 트리거 없이 **동일 Server Action 내부에서** `jobs.status = 'filled'`로 UPDATE (explicit control, 테스트 용이).
**Why no trigger:** Phase 3에 Postgres 함수/트리거 선례 없음. Server Action 내부 explicit flow가 `prisma.$queryRaw` 패턴과 일관됨.

#### D-05 동시 지원 경합 해결
**Decision:** Atomic UPDATE 조건부 + 영향 행수 재해석
**SQL pattern:**
```sql
-- Step 1: Atomic capacity check + increment
UPDATE public.jobs
SET filled = filled + 1,
    status = CASE WHEN filled + 1 >= headcount THEN 'filled' ELSE status END,
    "updatedAt" = now()
WHERE id = $jobId
  AND filled < headcount
  AND status = 'active'
RETURNING id, headcount, filled, status;
```
- 영향 행수 = 1 → 자리 확보 성공 → Step 2로
- 영향 행수 = 0 → 이미 마감 또는 status != active → 에러 반환 "이미 마감된 공고입니다"

```sql
-- Step 2: Insert application (if Step 1 succeeded)
INSERT INTO public.applications (id, "jobId", "workerId", status, "appliedAt")
VALUES (gen_random_uuid(), $jobId, $workerId, 'pending', now())
ON CONFLICT ("jobId", "workerId") DO NOTHING
RETURNING id;
```
- ON CONFLICT = 이미 같은 Worker가 지원한 경우 → Step 3: Step 1의 filled++를 롤백 (compensation)

**Transaction wrapping:** `prisma.$transaction` interactive 사용. Step 1 raw + Step 2 raw 같은 트랜잭션 안에서. Step 2 실패시 Step 1도 롤백됨.
**Why not SELECT FOR UPDATE:** 단일 UPDATE 조건부가 더 원자적이고 lock hold time이 짧음.
**Why not Postgres function:** Phase 3에 함수 선례 없음. `$queryRaw` 패턴과 일관성 유지.

### Status Sync

#### D-06 Worker 상태 동기화
**Decision:** Supabase Realtime `postgres_changes` 구독
**Implementation:**
```ts
// src/app/(worker)/my/applications/page.tsx (client component wrapper)
const channel = supabase
  .channel(`applications:${userId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'applications',
    filter: `workerId=eq.${userId}`,
  }, (payload) => {
    // React Query cache invalidation 또는 optimistic update
    queryClient.invalidateQueries({ queryKey: ['my-applications'] });
  })
  .subscribe();
```
**RLS 호환:** Supabase Realtime은 RLS 정책을 존중함. D-17의 applications RLS가 workerId=auth.uid() 체크를 포함하므로 자동 필터링.
**Subscription lifecycle:** 페이지 unmount 시 `supabase.removeChannel(channel)`.

#### D-07 Business 지원자 목록 Realtime
**Decision:** /biz/posts/[id]/applicants도 동일 패턴으로 구독
**Filter:** `jobId=eq.${jobId}` (Business는 자기 job의 지원자만 볼 수 있으므로 RLS가 자동 필터링).
**이벤트 필요:** INSERT(신규 지원), UPDATE(auto-accept, status 변경).

#### D-08 Realtime 폴백 전략
**Decision:** 60초 간격 polling 폴백, channel 상태 추적
**Implementation:**
```ts
channel.on('system', { event: 'status' }, (status) => {
  if (status === 'SUBSCRIBED') stopPolling();
  else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') startPolling(60000);
});
```
**React Query 통합:** `useQuery({ refetchInterval: pollingActive ? 60000 : false })`.

### Check-in / Check-out

#### D-09 체크인 검증 방식
**Decision:** 시간창 + PostGIS ST_DWithin geofence
**시간창:** `startTime - 10분` ~ `startTime + 30분` (Asia/Seoul 타임존)
**Geofence:** Worker의 현재 `navigator.geolocation.getCurrentPosition()` 결과와 BusinessProfile `location` (geography Point 4326) 간 ST_DWithin 200m (D-10)
**Check-in Server Action flow:**
1. `requireApplicationOwner(applicationId)` — Phase 4 dal.ts 신규
2. application status ∈ {confirmed} 검증 (pending은 아직 수락 전이므로 불가)
3. 현재 시각 ∈ [startTime-10min, startTime+30min] 검증
4. `$queryRaw` ST_DWithin 검증
5. 통과시 Application.status = 'in_progress', checkInAt = now()
6. revalidatePath(`/my/applications/${applicationId}`)

**QR 불필요 (체크인):** D-13 결정대로 체크아웃만 QR 사용. 체크인은 geofence로 현장 증거 확보.

#### D-10 Geofence 반경
**Decision:** 200m
**Rationale:** GPS 오차 20-50m + 건물 규모 감안 3배 배수. 도심형 매장 (카페/편의점) 현실적.

#### D-11 실근무 시간 라운딩 & 수입 계산
**Decision:** 15분 단위 반올림, 정직한 시간 지급
**Formula:**
```ts
function calculateActualHours(checkInAt: Date, checkOutAt: Date): number {
  const rawMinutes = (checkOutAt.getTime() - checkInAt.getTime()) / 60000;
  const roundedMinutes = Math.round(rawMinutes / 15) * 15;
  return roundedMinutes / 60; // hours (0.25 step)
}

function calculateEarnings(actualHours: number, job: Job): number {
  const base = Math.floor(actualHours * job.hourlyPay);
  const nightPremium = calculateNightShiftPremium(checkInAt, checkOutAt, job.hourlyPay);
  return base + nightPremium + job.transportFee;
}
```
**조퇴/지각 처리:** 패널티 없음. 실근무 시간만큼만 지급. 지각으로 인한 노쇼 카운트는 D-22 참조.
**교통비:** actualHours 무관하게 전액 지급 (계약 시 명시된 금액).

#### D-12 야간할증 (SHIFT-03) 계산 위치
**Decision:** Server Action 내부 TypeScript 함수 `calculateNightShiftPremium`
**Location:** `src/lib/job-utils.ts` (Phase 1의 pure function 컬렉션 — 기존 calculateEarnings와 함께 거주)
**Logic:**
```ts
/**
 * 야간할증 계산 — SHIFT-03
 * 22:00-06:00 (Asia/Seoul) 구간 안에 4시간 이상 겹치면 50% 할증
 * 겹치는 시간만 할증하는게 아니라 전체 4시간+ 겹침을 트리거로 전체 야간 시간에 50% 가산
 */
export function calculateNightShiftPremium(
  checkIn: Date,
  checkOut: Date,
  hourlyPay: number,
): number {
  const nightHours = computeNightHoursOverlap(checkIn, checkOut); // in Asia/Seoul
  if (nightHours < 4) return 0;
  return Math.floor(nightHours * hourlyPay * 0.5);
}
```
**Why TS, not Postgres function:** Phase 2/3에 Postgres 함수 선례 없음. `job-utils.ts` pattern과 일관됨. Vitest unit tests 쉬움. Server Action checkOut 안에서만 계산되면 DB 쓰기는 1회.
**Why not trigger:** debug 어려움, 마이그레이션 쓰기 난이도 증가.

#### D-13 QR 코드 사용 범위
**Decision:** 체크아웃에만 QR 사용 (체크인은 D-09 geofence+시간창)
**Rationale:** 사용자 명시적 요청: "근무 끝난 후 카메라로 회사계정에서 생성된 qr을 스캔하면 db에 근무를 완료한 것으로 기록". 체크인은 도착 입증 (geofence로 충분), 체크아웃은 현장 이탈 전 최종 확인 (QR + 시간창).

#### D-14 QR 라이브러리 선택
**Decision:** `html5-qrcode`
**Rationale:** 사용자 선택. @zxing/browser보다 경량, 모바일 브라우저 호환성 집중, 설치 설명서 간결.
**Install:** `npm i html5-qrcode`
**Integration point:** `src/app/(worker)/my/applications/[id]/check-in/check-in-flow.tsx`의 `handleScan` 함수를 실제 카메라 세션으로 교체.

#### D-15 QR payload 서명 전략
**Decision:** JWT — `{ jobId, businessId, nonce, iat, exp }` (HS256, 10분 만료)
**Sign:** Business 측 `/biz/posts/[id]` 페이지에서 "퇴근 QR 열기" 버튼 → Server Action `generateCheckoutQrToken(jobId)` → `jose.SignJWT` with `APPLICATION_JWT_SECRET` env → QR payload = JWT string
**Verify:** Worker 측 checkout Server Action → `jose.jwtVerify(payload, secret)` → payload 검증:
- `jobId`가 Worker의 application.jobId와 일치
- `businessId`가 job.businessId와 일치
- `exp`가 현재 시각보다 미래
- `iat`가 현재 시각 10분 이내
**Env var:** `APPLICATION_JWT_SECRET` (Supabase JWT secret과 분리. 32 byte hex random. Vercel/로컬 모두 `.env.local`).
**Library:** `jose` (Node.js crypto 기반, Next.js 16 App Router 호환).
**Install:** `npm i jose`

#### D-16 Biz QR 생성 UI
**Decision:** `/biz/posts/[id]` 상세 페이지에 "퇴근 QR 열기" 버튼 → 모달에 QR 표시 + 10분 자동 재생성 타이머
**Implementation:**
- 버튼 클릭 시 Server Action이 JWT 생성 후 반환
- 클라이언트에서 `qrcode` npm 패키지로 SVG 렌더 (또는 서버에서 SVG 생성 후 반환 — Claude 재량)
- 모달 안에 카운트다운 "남은 시간 9:58" 표시, 만료 10초 전 재생성 호출
- 모달 닫을 때 타이머 클린업

**Install:** `npm i qrcode @types/qrcode` (SVG 생성용)

### RLS & Server Action 경계

#### D-17 applications RLS 정책
**Decision:** 엄격 — Worker 본인 + Business via jobs JOIN
**Migration:** `supabase/migrations/{timestamp}_applications_rls_phase4.sql`
```sql
-- Enable RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- SELECT: worker sees own applications, business sees applications for their jobs
CREATE POLICY "applications_select_worker" ON public.applications
  FOR SELECT USING (auth.uid() = "workerId");

CREATE POLICY "applications_select_business" ON public.applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = "jobId" AND j."authorId" = auth.uid()
    )
  );

-- INSERT: worker inserts own applications
CREATE POLICY "applications_insert_worker" ON public.applications
  FOR INSERT WITH CHECK (auth.uid() = "workerId");

-- UPDATE: worker updates own (cancel only, via Server Action guards),
--         business updates via jobs JOIN (accept/reject/auto-accept)
CREATE POLICY "applications_update_worker" ON public.applications
  FOR UPDATE USING (auth.uid() = "workerId")
  WITH CHECK (auth.uid() = "workerId");

CREATE POLICY "applications_update_business" ON public.applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = "jobId" AND j."authorId" = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = "jobId" AND j."authorId" = auth.uid()
    )
  );

-- DELETE: never allowed (cancelled status = soft delete)
-- (no policy → default deny)
```
**Phase 2 D-05 변경 기록:** `supabase/migrations/20260410000004_disable_rls_jobs_applications_reviews.sql`의 `applications disable row level security` 를 이 마이그레이션이 overwrite.
**Realtime 호환:** Phase 4 D-06/07의 postgres_changes 구독은 이 RLS 정책을 자동 존중. Worker는 자기 applications만, Business는 자기 jobs의 applications만 받음.

#### D-18 dal.ts 확장
**Decision:** `requireApplicationOwner(applicationId)` + `requireJobOwner(jobId)` 헬퍼 신규 추가
**Rationale:** Phase 2/3 기존 `requireWorker`/`requireBusiness` 패턴 연장. Server Action마다 인라인 체크하는 대신 중앙 헬퍼로 일관성 확보.
**Signatures:**
```ts
// src/lib/dal.ts
export async function requireApplicationOwner(
  applicationId: string,
): Promise<{ session: Session; application: Application }> {
  const session = await requireWorker();
  const application = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!application || application.workerId !== session.id) {
    throw new Error("application_not_owned");
  }
  return { session, application };
}

export async function requireJobOwner(
  jobId: string,
): Promise<{ session: Session; job: Job }> {
  const session = await requireBusiness();
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.authorId !== session.id) {
    throw new Error("job_not_owned");
  }
  return { session, job };
}
```
**Error mapping:** Phase 3의 AuthFormState 패턴 재사용 — error string을 한국어 UX로 매핑 (예: "application_not_owned" → "본인의 지원만 수정할 수 있습니다").
**2중 방어:** DB RLS (D-17) + dal.ts 앱 레벨 체크가 중복. Phase 2 D-06 철학 (낙관적 proxy + 엄격 dal) 연장.

### 알림 채널

#### D-19 알림 체널 수준
**Decision:** Realtime 인앱 배너 + Web Push API (VAPID 기반 브라우저 내장 push)
**Phase 4 scope 확장:** PROJECT.md의 "Push 알림 Phase 4+"를 "**Web Push Phase 4, 네이티브 FCM/APNs/SMS/카카오 알림톡은 v2**"로 세분화.
**Realtime 부분:** Worker 페이지가 열려 있을 때 toast/banner 표시 (Sonner 또는 Radix Toast — Claude 재량, shadcn 호환 우선).
**Web Push 부분:** 페이지가 닫혀 있어도 OS 알림 발송. VAPID 키로 서명, Service Worker가 수신 후 `self.registration.showNotification` 호출.

#### D-20 Web Push 인프라
**Decision:** Prisma `PushSubscription` 모델 + Server Action (`subscribePush`, `unsubscribePush`) + `web-push` 라이브러리 발송자
**Schema addition:**
```prisma
model PushSubscription {
  id         String   @id @default(uuid()) @db.Uuid
  userId     String   @db.Uuid
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  endpoint   String   @unique
  p256dh     String
  auth       String
  createdAt  DateTime @default(now())
  lastUsedAt DateTime?

  @@index([userId])
  @@map("push_subscriptions")
}
```
User 모델에 역관계 `pushSubscriptions PushSubscription[]` 추가.

**Service worker:** `public/sw.js` (Next.js 16 App Router에서 public 디렉토리 서빙). Notification handler + click handler → deep link `/my/applications/[id]`.

**VAPID 키 생성:** `npx web-push generate-vapid-keys` 1회 → `.env.local`에 저장.

**Server-side sender:**
```ts
// src/lib/push.ts
import webpush from "web-push";
webpush.setVapidDetails("mailto:dev@gignow.com", VAPID_PUB, VAPID_PRIV);

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.allSettled(
    subs.map(sub => webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    ).catch(err => {
      // 410 Gone → subscription 만료, DB에서 삭제
      if (err.statusCode === 410) return prisma.pushSubscription.delete({ where: { id: sub.id } });
      throw err;
    })
  ));
}
```

**Trigger points:** pending→confirmed 전이시 Worker에게 push ("지원하신 '{공고명}'이 수락되었습니다"), cancelled 전이시 push, 근무 1시간 전 리마인더 (pg_cron → Server Action → sendPushToUser).

**Legacy cleanup:** `src/app/api/push/register/route.ts` 삭제 (Phase 1 FCM 스텁).

### Worker 취소 정책

#### D-21 Worker 무료 취소 시간 윈도우
**Decision:** 근무 24시간 전까지 무료 취소
**Logic:** `workDate + startTime - 24h > now()`이면 무료 취소, 이후는 노쇼 위험 고지 후 가능.
**UI:** 목업의 "취소는 근무 24시간 전까지만 무료로 가능합니다" 문구 그대로 유지. 취소 버튼 클릭시 경고 모달.

#### D-22 노쇼 페널티
**Decision:** 금전적 페널티 없음. WorkerProfile에 `noShowCount` 컬럼 추가 + `completionRate` 자동 재계산.
**Schema change:**
```prisma
model WorkerProfile {
  // ... existing fields ...
  noShowCount  Int @default(0)
  // completionRate 는 이미 있음 — Phase 4에서 자동 계산 로직 추가
}
```
**계산 공식:** `completionRate = (totalJobs - noShowCount) / totalJobs * 100`
**UI feedback:** Worker /my 페이지에 "완료율 98%" 표시. 노쇼 3회 누적시 프로필에 경고 배지.
**자동 노쇼 감지:** pg_cron 스케줄 — 근무 시작 시간 + 30분이 지났는데 checkInAt이 null인 confirmed application을 cancelled + noShowCount++ 처리.

### 탐색 고도화 (Scope Expansion)

#### D-23 SEARCH-02 카카오맵 승격
**Decision:** REQUIREMENTS.md의 `SEARCH-02` (v2) → v1 승격, Phase 4 범위에 포함
**문서 업데이트 (Phase 4 첫 plan에 포함):**
- `REQUIREMENTS.md`: `SEARCH-02`를 v2 섹션에서 v1 섹션으로 이동. Traceability 테이블에 Phase 4 매핑 추가.
- `REQUIREMENTS.md`: `SEARCH-03` 신설 — "Worker는 오늘/내일/이번주 프리셋과 오전/오후/저녁/야간 시간대 버킷으로 공고를 필터할 수 있다"
- `ROADMAP.md` Phase 4 Success Criteria 추가: "6. Worker는 /home에서 리스트/지도 토글로 공고를 탐색할 수 있고, 카카오맵에 현재 viewport 내 공고 marker가 표시된다. 7. Worker는 시간 프리셋과 거리 필터(1/3/5/10km)를 조합해 공고를 필터할 수 있다."

#### D-24 카카오맵 SDK 키 발급
**Decision:** 사용자(독발) 수동 발급 — Claude는 코드만 구현
**User action required:**
1. https://developers.kakao.com → 로그인 → 내 애플리케이션 → 앱 생성
2. 플랫폼 > Web > 도메인에 `http://localhost:3000` + 프로덕션 도메인 등록
3. JavaScript 키 발급 → `.env.local`에 `NEXT_PUBLIC_KAKAO_MAP_KEY=...`
4. 카카오맵 JavaScript API는 **free tier 300,000 calls/day** (dev + prod 공유)

**Fallback for missing key:** 키 없이도 빌드는 통과 (런타임 체크). 키 없으면 /home의 지도 토글 버튼 disable + "지도 기능을 사용하려면 관리자에게 문의하세요" 안내.

#### D-25 Map 탐색 UX
**Decision:** /home에 `[리스트|지도]` 토글 버튼
**Layout:**
- /home 상단 sticky에 Tabs 또는 ToggleGroup (shadcn)
- 리스트 모드: 기존 Phase 3 cursor 페이지네이션 유지
- 지도 모드: 카카오맵 컴포넌트 + 현재 viewport 내 marker + 사이드/하단 drawer에 선택된 공고 카드
- Marker 클릭 → 하단 preview card (모바일) 또는 사이드 drawer (데스크톱)
- Preview card 클릭 → /posts/{id} 상세 페이지

**기존 /home 유지:** 상태 토글 외 시각적 변경 최소화.

#### D-26 시간 필터 (SEARCH-03)
**Decision:** 날짜 프리셋 + 시간대 버킷
**Presets:**
- 오늘, 내일, 이번주 (월~일 기준 Asia/Seoul)
**Time buckets:** (`startTime` 기준으로 필터)
- 오전: 06:00-12:00
- 오후: 12:00-18:00
- 저녁: 18:00-22:00
- 야간: 22:00-06:00 (day boundary crossing)

**UI:** 필터 drawer 또는 상단 chip row. 다중 선택 허용 (오전+오후 가능).
**Query integration:** `getJobsPaginated` + `getJobsByDistance`에 `timePreset`/`timeBuckets` 파라미터 추가. WHERE 절에 `workDate BETWEEN ... AND ...` + `startTime` substring match 추가.

#### D-27 거리 필터
**Decision:** 1/3/5/10km 스테퍼 버튼 (리스트/지도 공유)
**Implementation:**
- 버튼 그룹 UI (shadcn ToggleGroup)
- 선택된 값을 query param으로 URL에 보존 (`?radius=3`)
- 리스트 모드: `getJobsByDistance({ radiusM: radiusKm * 1000 })` 직접 호출
- 지도 모드: 동일 쿼리 + 지도 viewport에 선택 반경 원 그리기 (`kakao.maps.Circle`)
- 기본값: 3km (Claude 재량)
- 10km 초과는 Phase 4 scope 아님 (Phase 5+에서 "전국" 옵션 검토)

#### D-28 지도 marker 및 성능
**Decision:** 단순 marker만 (clustering 미적용)
**Rationale:** 초기 베타에서 Seoul 지역 공고 밀도는 낮음. Marker 100개 미만 가정. Clustering 필요시 Phase 5+에서 tuning.
**Marker data:** `getJobsByDistance` 결과 재사용 — 리스트와 동일 query. 지도 모드에서는 `limit`을 50으로 고정하고 cursor 페이지네이션 비활성화.
**Info window:** Marker 클릭시 카카오맵 기본 InfoWindow 대신 React portal로 하단 preview card 렌더 (브랜드 일관성).

</decisions>

<discretion>
## Claude's Discretion (planner가 알아서 결정)

- **`checked_in` enum 값 deprecation**: 현재 사용처 없음. Phase 4에서는 deprecate 주석만 달고 enum에 남김. Phase 5에서 제거 여부 재검토. (D-01 참고)
- **Business 수락 후 Push 메시지 본문**: "지원하신 '{공고명}' 이(가) 수락되었습니다" 정도. 문구는 planner가 copywriting.
- **Realtime channel 이름 규칙**: `applications:worker:{userId}` vs `applications:job:{jobId}`. 일관된 컨벤션 planner가 결정.
- **Auto-accept pg_cron 주기**: 1분 vs 30초 vs 5분. 기본 1분 권장.
- **노쇼 자동 감지 pg_cron 주기**: 5분 권장.
- **Application Server Action 파일 구조**: `src/lib/actions/applications.ts` 단일 파일 vs `src/lib/actions/application/*.ts` 분리. 단일 파일 우선 권장 (Phase 2/3 컨벤션).
- **`generateCheckoutQrToken` Server Action의 rate limit**: Business가 QR을 계속 재생성하는 악용 방지. Supabase Auth 기본 rate limit 또는 추가 throttle 결정.
- **html5-qrcode permission UX**: 카메라 권한 거부시 fallback UI 메시지.
- **Kakao map lazy loading**: SDK script tag를 document head에 한 번만 삽입 vs 지도 모드 진입시에만. 성능 관점에서 lazy 권장.
- **Map marker 아이콘**: 기본 카카오 마커 vs custom SVG (brand color 브랜드 핀). Brand 강화 차원에서 custom 권장.
- **지도 모드에서 RLS 호환성**: getJobsByDistance는 public query 이므로 anon key로도 가능. 주의 — Worker 로그인 전 /home은 이미 public이므로 변경 없음.
- **Service worker 등록 위치**: Next.js 16 App Router에서 `public/sw.js` + client-side `navigator.serviceWorker.register('/sw.js')` 호출. Root layout useEffect 또는 별도 provider component.
- **Web Push 권한 요청 타이밍**: 가입 직후 강요 X. /my 페이지 첫 방문시 dismissable banner "알림을 켜서 빠르게 수락 소식을 받아보세요". 누르면 `Notification.requestPermission()`.
- **지원 버튼 비활성화 조건**: 본인 이미 지원한 경우 (status !== cancelled), job.status !== active, Worker 계정이 완료율 너무 낮은 경우 (D-22와 연계, 3회 이상 노쇼시 차단 검토 — 또는 경고만)
- **체크인/체크아웃 실패 UX**: geofence 실패시 "현장에 도착한 뒤 다시 시도해주세요", QR 만료시 "Business에게 QR을 다시 열어달라고 요청하세요"
- **Phase 4 첫 plan의 문서 동기화 태스크**: PROJECT.md/ROADMAP.md/REQUIREMENTS.md 업데이트를 하나의 `[BLOCKING]` 태스크로 묶기 vs 각 문서 별도 태스크로 분리. Planner가 결정.

</discretion>

<deferred>
## Phase 5+ 또는 v2로 이월

### Phase 5 (리뷰·정산·목업 제거)
- Review system (REV-01..04) — 완료된 application에 양방향 리뷰 작성
- Settlement (SETL-01..03) — Toss Payments 실연동 또는 시뮬레이션 정산
- `src/lib/mock-data.ts` 파일 삭제 (Phase 5 최종 exit 기준)
- `prisma/seed.ts`의 mock-data import 제거
- `checked_in` enum 값 제거 여부 재검토

### v2 / 이후
- 네이티브 FCM / APNs push (PROJECT.md v2 유지)
- SMS 알림 (aligo/toast)
- 카카오 알림톡 (카카오 Biz)
- Toss Payments 실연동 + 원천징수
- 국세청 사업자번호 검증 API
- 카카오 SSO 로그인
- Worker 가용 시간 캘린더 (WorkerAvailability 모델)
- Job 키워드 검색 (현재는 카테고리+거리+시간대만)
- 즐겨찾기/찜
- 지도 marker clustering (현재 단순 marker만)
- 지도 "전국" 옵션 (10km 초과)
- AI 매칭 알고리즘 (Claude+Gemini 게이트웨이)

### Phase 4 scope에서 명시적으로 제외
- Worker 가용시간 캘린더 (WorkerAvailability 모델)
- 리뷰 작성 UI (목업 그대로 Phase 5)
- Settlement 실연동 (earnings 계산만, 실 지급은 Phase 5)
- Worker 완료 후 수입 집계 (thisMonthEarnings / totalEarnings는 Phase 5에서 Application에서 집계)
- Business 정산 히스토리 페이지 (Phase 5)

### Scope creep 경계 (이번 discuss-phase에서 기각된 아이디어)
- 채팅 실시간 메시징 (CHAT-01/02 — v2)
- Worker-to-Worker 팀 근무
- 지원 거절 사유 입력 필드 (간소화 원칙 위배)
- Business가 Worker 프로필을 판단 기준으로 사용 (면접 대체 패턴 — PROJECT.md 위배)

</deferred>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 프로젝트 문서 (필독)
- `.planning/PROJECT.md` — 핵심 가치, 테크 스택 락, Out of Scope. **Phase 4가 업데이트 대상** (D-01, D-19, D-23)
- `.planning/ROADMAP.md` — Phase 4 Goal + Success Criteria 원문. **Phase 4가 업데이트 대상** (D-23, D-25 ~ D-27)
- `.planning/REQUIREMENTS.md` — APPL-01..05, SHIFT-01..03 상세 + SEARCH-02 현재 v2. **Phase 4가 업데이트 대상** (D-23)
- `./CLAUDE.md` — Project-wide rules, Next.js 16 breaking changes 경고, mock-data 제약
- `./AGENTS.md` — "This is NOT the Next.js you know" — docs 선 읽기 원칙
- `node_modules/next/dist/docs/` — Next.js 16 공식 문서 (writing code 전 필독)

### Phase 2/3 context (이월·재사용 참조)
- `.planning/phases/02-supabase-prisma-auth/02-CONTEXT.md` — D-01..07 원문 (Supabase 단일 벤더, 환경변수, dal 패턴)
- `.planning/phases/02-supabase-prisma-auth/02-02-SUMMARY.md` — DB 스키마 결정 기록
- `.planning/phases/02-supabase-prisma-auth/02-03-SUMMARY.md` — @supabase/ssr 3-file 패턴 (client/server/middleware)
- `.planning/phases/02-supabase-prisma-auth/02-04-SUMMARY.md` — Server Action 패턴, ALLOWED_NEXT_PATHS
- `.planning/phases/03-db/03-CONTEXT.md` — Phase 3 D-01..06 (Storage, jobs RLS, pg_cron, 페이지네이션, PostGIS)
- `.planning/phases/03-db/03-04-SUMMARY.md` — jobs RLS 재활성화 구현 디테일
- `.planning/phases/03-db/03-06-SUMMARY.md` — PostGIS $queryRaw cursor 페이지네이션 구현 (Phase 4가 재사용)
- `.planning/phases/03-db/03-HUMAN-UAT.md` — Phase 3 수동 검증 항목 (Phase 4 시작 전 배포 검증 필요)

### 현재 코드 (Phase 4 작업 기준점)
- `prisma/schema.prisma` — 6 models + 5 enums. **Phase 4 스키마 변경**: ApplicationStatus pending 추가, WorkerProfile noShowCount, PushSubscription 신규
- `src/lib/db/queries.ts` — getJobsPaginated / getJobsByDistance / adaptApplication / APP_INCLUDE. **Phase 4가 확장**
- `src/lib/dal.ts` — requireWorker / requireBusiness / verifySession. **Phase 4가 추가** (D-18)
- `src/lib/supabase/{client,server,middleware}.ts` — Supabase SSR 패턴
- `src/proxy.ts` — Next 16 proxy + ALLOWED_NEXT_PATHS
- `src/lib/job-utils.ts` — calculateEarnings / formatWorkDate (Phase 4가 calculateNightShiftPremium 추가)
- `src/lib/types/job.ts` — Application 인터페이스. **Phase 4에서 pending 상태 추가**
- `src/app/(worker)/posts/[id]/apply/apply-confirm-flow.tsx` — 원탭 지원 UX (mock setTimeout). Phase 4가 Server Action 호출로 교체
- `src/app/(worker)/my/applications/page.tsx` — **인라인 APPLICATIONS 상수 제거 대상**
- `src/app/(worker)/my/applications/[id]/check-in/check-in-flow.tsx` — QR mock 제거, geofence + html5-qrcode 통합
- `src/app/biz/posts/[id]/applicants/page.tsx` — **인라인 APPLICANTS 상수 제거 대상**, /biz Realtime 구독 추가
- `src/app/biz/posts/[id]/page.tsx` — "퇴근 QR 열기" 버튼 추가 지점
- `src/app/(worker)/home/page.tsx` — 리스트/지도 토글 + 필터 UI 추가 지점
- `src/app/api/push/register/route.ts` — **Phase 4에서 삭제** (Phase 1 FCM 스텁)
- `supabase/migrations/20260410000004_disable_rls_jobs_applications_reviews.sql` — Phase 4 applications RLS 재활성화가 overwrite
- `supabase/migrations/20260411000003_pg_cron_expire_jobs.sql` — 동일 pg_cron 패턴 재사용 (자동 수락 타이머)
- `scripts/apply-supabase-migrations.ts` — direct-prisma 마이그레이션 러너 (Phase 2/3 경로 유지)
- `prisma/seed.ts` — kim-jihoon 5 Applications 시드. **Phase 4에서 pending 상태 application 추가 시드 고려**

### 외부 문서 (Context7 또는 공식 문서 직접 참조 필요)
- **Supabase Realtime `postgres_changes`**: https://supabase.com/docs/guides/realtime/postgres-changes
- **Supabase Realtime + RLS**: https://supabase.com/docs/guides/realtime/authorization
- **pg_cron**: https://supabase.com/docs/guides/database/extensions/pg_cron (Phase 3에 이미 활성)
- **PostGIS `ST_DWithin` geography 변환**: https://postgis.net/docs/ST_DWithin.html
- **Kakao Maps JavaScript API**: https://apis.map.kakao.com/web/guide/ — 반드시 Context7 또는 공식 문서 직접 조회
- **Kakao Developers 앱 등록**: https://developers.kakao.com/console/app
- **html5-qrcode**: https://github.com/mebjas/html5-qrcode + README scanning examples
- **web-push Node library**: https://github.com/web-push-libs/web-push (VAPID 생성 + sendNotification)
- **Web Push Protocol (MDN)**: https://developer.mozilla.org/en-US/docs/Web/API/Push_API
- **Service Worker registration (Next.js 16 App Router)**: Next.js 공식 문서 또는 `node_modules/next/dist/docs/`
- **jose (JWT)**: https://github.com/panva/jose (Next.js 16 Edge 호환)
- **qrcode npm**: https://github.com/soldair/node-qrcode (SVG QR 생성)
- **Prisma $queryRaw + Prisma.sql**: Phase 3 D-06에서 이미 사용 중 — 동일 패턴

### MCP integrations 가용성
- **Supabase MCP**: **미가용** (프로젝트 `lkntomgdhfvxzvnzmlct` 은 linked 계정 밖). Phase 2/3 direct-prisma 경로 유지.
- **Context7 MCP**: 가용 — 외부 라이브러리 실시간 문서 조회에 활용 권장 (especially `kakao.maps`, `html5-qrcode`, `web-push`, `jose`)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (Phase 4가 확장/재사용)
- `getJobsByDistance` (Phase 3 D-06): 리스트 모드 + 지도 모드 공통 query source. 시간 필터 파라미터만 추가하면 양쪽에서 사용 가능
- `LAZY_FILTER_SQL` (queries.ts): pg_cron gap 방어 패턴. Phase 4의 자동 수락 타이머에도 동일 패턴 적용
- `adaptApplication` (queries.ts): Prisma → UI 매핑 함수. pending 상태 추가 매핑만 필요
- `verifySession / requireWorker / requireBusiness` (dal.ts): 새 헬퍼 (requireApplicationOwner / requireJobOwner) 가 이 위에 빌드
- Phase 3 direct-prisma 마이그레이션 러너 (`scripts/apply-supabase-migrations.ts`): 새 applications RLS + push_subscriptions 테이블 + pg_cron 스케줄도 동일 경로로 적용

### Established Patterns (Phase 4가 준수)
- **Server Action 파일 구조**: `src/lib/actions/*-actions.ts` (Phase 2/3 컨벤션)
- **Zod 검증 + 재검증**: 클라이언트 + 서버 이중 검증 (Phase 2 D-06)
- **Prisma interactive transaction**: `prisma.$transaction([...])` 원자성 확보 (Phase 3 D-05)
- **$queryRaw for raw SQL**: Prisma.sql template literal 패턴 (Phase 3 D-06, 번쩍 테스트 있음)
- **Hybrid SSOT**: Prisma 모델 정의 + supabase/migrations RLS/trigger/extension
- **Korean error UX**: 영어 error code → 한국어 UX 매핑 (Phase 3 UI polish에서 carried forward)

### Integration Points (Phase 4가 연결)
- `/home` 리스트 → 지도 토글 + 필터 (클라이언트 state, URL query param 동기화)
- `/posts/[id]/apply` → 원탭 지원 Server Action (concurrency-safe)
- `/my/applications` → Realtime subscribe + 상태 tabs (pending/confirmed/in_progress/completed)
- `/my/applications/[id]/check-in` → Server Actions (checkIn / checkOut) + geofence + html5-qrcode
- `/biz/posts/[id]` → 퇴근 QR 모달 버튼
- `/biz/posts/[id]/applicants` → Realtime subscribe + 수락/거절 Server Actions
- `public/sw.js` + root layout → Service Worker 등록
- `src/app/api/push/register/route.ts` → 삭제
- `supabase/migrations/*.sql` → 새 4개 파일 (applications RLS, auto-accept pg_cron, push_subscriptions 테이블, no-show detection pg_cron)
- `prisma/schema.prisma` → 3가지 변경 (ApplicationStatus pending, WorkerProfile noShowCount, PushSubscription 신규)
- `.env.local` → 4개 키 추가 (NEXT_PUBLIC_KAKAO_MAP_KEY, WEB_PUSH_VAPID_PUBLIC_KEY, WEB_PUSH_VAPID_PRIVATE_KEY, APPLICATION_JWT_SECRET)

### Creative Options Enabled by Architecture
- Phase 3가 PostGIS + $queryRaw를 깔아놓아서 geofence 검증이 3줄 쿼리로 가능
- Supabase Realtime이 RLS를 존중하므로 Worker/Business 구독 필터 별도 구현 불필요
- Phase 3 pg_cron 선례가 있어 자동 수락/노쇼 감지 구현이 복제 수준
- html5-qrcode는 React wrapper 없이도 useEffect로 직접 통합 가능 (의존성 최소)

</code_context>

<specifics>
## Specific User Ideas (discussion 중 포착)

- **"지원시 바로 대기 상태로 넘어가고 수락시 컨펌되고 워커에게 알림이 가고 마이페이지의 스케쥴 등에 반영"** — D-01 근거
- **"절차는 최대한 간소화하고 사용자가 쉽게 지원하고 일을 할 수 있다는 본연의 목적"** — D-02, D-03 근거 (자동 수락 타이머 30분)
- **"qr코드 확인이 어떻게 구현되어있는지 확인이 필요합니다. worker가 근무 끝난 후 카메라로 회사계정에서 생성된 qr을 스캔하면 db에 근무를 완료한 것으로 기록"** — D-13, D-14, D-15, D-16 근거
- **"worker가 일자리를 찾을 때 원하는 시간을 지정할 수 있게 되어있는데, 여기에 더해서 카카오 지도 api 연동해서 내 주변의 일자리를 지도 상에서도 찾을 수 있게 해주세요. 거리 설정 별 일자리가 필터링 되어서 쉽게 지원할 수 있어야 함"** — D-23, D-25, D-26, D-27, D-28 근거 (scope 확장)

</specifics>

## 다음 단계

1. `.planning/phases/04-db/04-DISCUSSION-LOG.md` 자동 생성 (감사용)
2. `.planning/phases/04-db/04-DISCUSS-CHECKPOINT.json` 삭제 (없으면 skip)
3. commit: `docs(04): capture phase context with scope expansion`
4. `/gsd-plan-phase 4` 실행 — researcher + planner 스폰, CONTEXT.md + RESEARCH.md → 세부 plan 작성

**경고: Phase 4는 Phase 3보다 scope가 큽니다.** 28개 결정, 3개 scope 확장, 4개 새 환경변수, 3개 새 외부 라이브러리 (kakao-maps SDK, html5-qrcode, web-push, jose, qrcode), 2개 새 Prisma 모델 변경. Planner가 plan 파일을 6-10개 범위로 분할할 것으로 예상됨 (Phase 3는 6개 plan).
