---
phase: 04-db
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - package-lock.json
  - .env.example
  - .planning/PROJECT.md
  - .planning/ROADMAP.md
  - .planning/REQUIREMENTS.md
  - .planning/phases/04-db/04-HUMAN-UAT.md
  - .planning/phases/04-db/04-VERSION-LOCK.md
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
  - tests/fixtures/phase4/index.ts
autonomous: false
requirements:
  - APPL-01
  - APPL-02
  - APPL-03
  - APPL-04
  - APPL-05
  - SHIFT-01
  - SHIFT-02
  - SHIFT-03

must_haves:
  truths:
    - "npm 의존성 jose, web-push, html5-qrcode, qrcode, @types/web-push, @types/qrcode가 package.json에 고정 버전으로 등록되어 있다"
    - "PROJECT.md Out of Scope, ROADMAP.md Phase 4 Success Criteria, REQUIREMENTS.md (SEARCH-02 v1 승격, SEARCH-03 신설, NOTIF-01 부분 활성화) 3개 문서가 Phase 4 scope 확장을 반영한다"
    - "21개 Vitest/Playwright 테스트 파일이 RED 상태로 존재하고 (`npm test -- tests/applications` 실행시 fail) 파일이 전부 커밋되어 있다"
    - "04-HUMAN-UAT.md에 5개 수동 검증 항목(QR, Push, Kakao Maps, Realtime, Geofence)이 체크리스트 형태로 문서화되어 있다"
    - ".env.example에 NEXT_PUBLIC_KAKAO_MAP_KEY, WEB_PUSH_VAPID_PUBLIC_KEY, WEB_PUSH_VAPID_PRIVATE_KEY, APPLICATION_JWT_SECRET 4개 키 placeholder가 추가되어 있다"
  artifacts:
    - path: "package.json"
      provides: "5 new runtime deps + 2 new devDeps"
      contains: "jose"
    - path: ".planning/phases/04-db/04-HUMAN-UAT.md"
      provides: "Manual UAT checklist for camera/push/map/realtime/geofence"
    - path: "tests/fixtures/phase4/index.ts"
      provides: "Shared Worker/Business/Job/PushSubscription fixtures"
    - path: ".planning/REQUIREMENTS.md"
      provides: "SEARCH-02 v1 entry + SEARCH-03 new requirement + NOTIF-01 partial note"
  key_links:
    - from: "package.json"
      to: "npm install"
      via: "lockfile"
      pattern: "\"jose\":"
    - from: "tests/**"
      to: "vitest run"
      via: "RED baseline"
      pattern: "describe\\("
---

<objective>
Phase 4 실행 이전에 **Wave 0 기반 인프라**를 구축한다: (1) scope 확장된 프로젝트 문서(PROJECT/ROADMAP/REQUIREMENTS) 동기화, (2) 5개 새 npm 의존성 설치 + 버전 락, (3) 21개 Vitest/Playwright 테스트 파일을 RED 상태로 작성, (4) 수동 UAT 체크리스트 작성, (5) `.env.example` 키 추가.

Purpose: Nyquist 원칙(모든 후속 task는 이미 존재하는 테스트를 GREEN으로 만드는 작업)을 성립시키기 위해 테스트와 의존성을 wave 1에서 확보한다. 이렇게 해야 Wave 3~5의 Server Action/UI 작업이 "test-driven"이 된다.
Output: 의존성 락 파일, 21개 failing 테스트, 문서 3개 동기화, HUMAN-UAT 체크리스트.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/04-db/04-CONTEXT.md
@.planning/phases/04-db/04-RESEARCH.md
@.planning/phases/04-db/04-UI-SPEC.md
@.planning/phases/04-db/04-VALIDATION.md
@package.json
@AGENTS.md
@CLAUDE.md

<interfaces>
<!-- Key types the tests will reference once Wave 3+ plans implement them -->
<!-- Executor: these tests are RED baselines. They MUST import symbols that don't exist yet; -->
<!-- tests should use vitest `describe.todo()` or skip-marker for symbols that don't exist, -->
<!-- but describe intended behavior verbatim so Wave 3 planners can unlock by implementing. -->

Future Server Action signatures (implemented in Plan 04/05/06):
```typescript
// src/app/(worker)/posts/[id]/apply/actions.ts (Plan 04)
export type ApplyResult =
  | { success: true; applicationId: string }
  | { success: false; error: 'job_full' | 'already_applied' | 'job_not_active' | 'unauthorized' | 'unknown' }
export async function applyOneTap(input: { jobId: string }): Promise<ApplyResult>

// src/app/biz/posts/[id]/applicants/actions.ts (Plan 04)
export async function acceptApplication(applicationId: string): Promise<{ success: boolean; error?: string }>
export async function rejectApplication(applicationId: string): Promise<{ success: boolean; error?: string }>

// src/app/(worker)/my/applications/[id]/check-in/actions.ts (Plan 05)
export async function checkIn(applicationId: string, coords: { lat: number; lng: number }): Promise<{ success: boolean; error?: string }>
export async function checkOut(applicationId: string, qrToken: string): Promise<{ success: boolean; earnings?: number; actualHours?: number; error?: string }>

// src/app/biz/posts/[id]/actions.ts (Plan 05)
export async function generateCheckoutQrToken(jobId: string): Promise<{ token: string; expiresAt: Date }>

// src/lib/night-shift.ts (Plan 05)
export function calculateNightShiftPremium(checkIn: Date, checkOut: Date, hourlyPay: number): number
export function computeNightHoursOverlap(checkIn: Date, checkOut: Date): number

// src/lib/job-utils.ts EXTEND (Plan 05)
export function calculateActualHours(checkInAt: Date, checkOutAt: Date): number
export function calculateEarnings(actualHours: number, job: { hourlyPay: number; transportFee: number }, nightPremium: number): number
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: 의존성 설치 + 버전 락 기록</name>
  <files>package.json, package-lock.json, .planning/phases/04-db/04-VERSION-LOCK.md</files>
  <read_first>
    - package.json (현재 deps 확인)
    - .planning/phases/04-db/04-RESEARCH.md (Standard Stack > New Dependencies 섹션)
    - .planning/phases/04-db/04-CONTEXT.md (D-14 html5-qrcode, D-15 jose, D-16 qrcode, D-20 web-push)
  </read_first>
  <action>
  Windows bash에서:
  1. `npm view jose version`, `npm view web-push version`, `npm view html5-qrcode version`, `npm view qrcode version`, `npm view @types/web-push version`, `npm view @types/qrcode version` — 각 명령 stdout 캡처
  2. 아래 파일 생성: `.planning/phases/04-db/04-VERSION-LOCK.md` — 테이블에 각 패키지와 "locked version at 2026-04-10"을 기록
  3. `npm install jose@<locked> web-push@<locked> html5-qrcode@<locked> qrcode@<locked>` (캐럿 prefix `^` 포함)
  4. `npm install -D @types/web-push@<locked> @types/qrcode@<locked>`
  5. `npm ls jose web-push html5-qrcode qrcode` 로 설치 확인

  `jose`는 CONTEXT.md D-15 (JWT HS256 checkout QR payload, APPLICATION_JWT_SECRET), `web-push`는 D-20 (VAPID sender), `html5-qrcode`는 D-14 (체크아웃 카메라), `qrcode`는 D-16 (SVG 생성) 용도다. 이미 transitive dep으로 존재해도 명시적 top-level deps로 추가해야 한다 (RESEARCH Standard Stack "jose는 이미 node_modules/jose@6.2.2 존재하나 package.json에 명시적 추가 필요" 참조).
  </action>
  <verify>
    <automated>node -e "const p=require('./package.json'); const need=['jose','web-push','html5-qrcode','qrcode']; const miss=need.filter(x=>!p.dependencies[x]); if(miss.length){console.error('MISSING',miss);process.exit(1)} const dev=['@types/web-push','@types/qrcode'].filter(x=>!p.devDependencies[x]); if(dev.length){console.error('MISSING dev',dev);process.exit(1)} console.log('OK')"</automated>
  </verify>
  <done>
    - `package.json` dependencies에 jose, web-push, html5-qrcode, qrcode 존재
    - `package.json` devDependencies에 @types/web-push, @types/qrcode 존재
    - `04-VERSION-LOCK.md`에 각 패키지 버전 기록
    - `npm ls` exit 0
  </done>
</task>

<task type="auto">
  <name>Task 2: .env.example 키 추가</name>
  <files>.env.example</files>
  <read_first>
    - .env.example (현재 12개 키 형식 확인)
    - .planning/phases/04-db/04-CONTEXT.md (Phase 2/3 자산 > 환경변수 D-07)
  </read_first>
  <action>
  `.env.example` 파일 끝에 아래 4개 라인 추가 (각 placeholder 주석 포함):

  ```
  # Phase 4 — Kakao Maps JavaScript SDK key (D-23, D-24)
  # Issue at https://developers.kakao.com → 내 애플리케이션 → JavaScript 키
  # Add http://localhost:3000 and production domain to "플랫폼 > Web > 도메인"
  NEXT_PUBLIC_KAKAO_MAP_KEY=

  # Phase 4 — Web Push VAPID keys (D-19, D-20)
  # Generate once: npx web-push generate-vapid-keys
  WEB_PUSH_VAPID_PUBLIC_KEY=
  WEB_PUSH_VAPID_PRIVATE_KEY=

  # Phase 4 — Checkout QR JWT signing secret (D-15)
  # 32-byte hex random, e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  APPLICATION_JWT_SECRET=
  ```
  </action>
  <verify>
    <automated>bash -c 'grep -q NEXT_PUBLIC_KAKAO_MAP_KEY .env.example && grep -q WEB_PUSH_VAPID_PUBLIC_KEY .env.example && grep -q WEB_PUSH_VAPID_PRIVATE_KEY .env.example && grep -q APPLICATION_JWT_SECRET .env.example && echo OK'</automated>
  </verify>
  <done>
    - 4개 키가 `.env.example`에 주석과 함께 존재
    - 기존 Phase 2/3 키 변경 없음
  </done>
</task>

<task type="auto">
  <name>Task 3: 프로젝트 문서 3개 동기화 (PROJECT/ROADMAP/REQUIREMENTS) [BLOCKING]</name>
  <files>.planning/PROJECT.md, .planning/ROADMAP.md, .planning/REQUIREMENTS.md</files>
  <read_first>
    - .planning/PROJECT.md (현재 Out of Scope 섹션)
    - .planning/ROADMAP.md (Phase 4 Success Criteria 1-5)
    - .planning/REQUIREMENTS.md (SEARCH-02 v2 현재 위치, NOTIF-01 v2)
    - .planning/phases/04-db/04-CONTEXT.md `<scope_expansion_notice>` 블록 (D-01, D-19, D-23)
  </read_first>
  <action>
  3개 문서를 Phase 4 scope 확장에 맞춰 업데이트한다. 단일 태스크로 묶어 원자성 확보 ([BLOCKING]).

  **1. PROJECT.md — "Out of Scope" 섹션:**
  - "지원→대기→면접→채용 패턴 out of scope" 항목을 다음으로 교체:
    > "면접·판단 심사·고용주 임의 거절은 out of scope. 단, 자동수락 타이머(30분) 기반 간소화된 pending→confirmed 플로우는 Timee 철학과 양립하므로 Phase 4에서 허용 (D-01, D-02, D-03)."
  - "Push 알림 Phase 4+" 항목을 다음으로 교체:
    > "Web Push (VAPID 기반 브라우저 내장 push)는 Phase 4에서 활성화. 네이티브 FCM/APNs, SMS, 카카오 알림톡은 여전히 v2 (D-19)."
  - "Supabase 단일 벤더" 언급 뒤에 다음 주석 추가:
    > "예외: Kakao Maps JavaScript SDK는 /home 지도 탐색 UX를 위해 Phase 4에서 허용된 첫 외부 의존성 (D-23)."

  **2. ROADMAP.md — Phase 4 Success Criteria:**
  기존 1-5번 Criteria 아래에 다음 2개 추가:
  ```
    6. Worker는 /home 에서 `[리스트|지도]` 토글로 공고를 탐색할 수 있고, 카카오맵에 현재 viewport 내 공고 marker가 표시되며, marker 클릭시 preview card/drawer가 열린다
    7. Worker는 시간 프리셋(오늘/내일/이번주) + 시간대 버킷(오전/오후/저녁/야간) + 거리 스테퍼(1/3/5/10km)를 조합해 리스트/지도 모두 필터할 수 있다
    8. Worker가 `/my`에서 Web Push 권한을 허용하면, Business가 수락/거절시 OS 알림이 표시되고 알림 클릭시 `/my/applications/[id]`로 이동한다
  ```
  Requirements 줄도 업데이트: `APPL-01..05, SHIFT-01..03, SEARCH-02, SEARCH-03, NOTIF-01(부분)`
  Plans 카운트는 10 plans로 설정.

  **3. REQUIREMENTS.md:**
  - v1 > Advanced Search (SEARCH) 서브섹션 신설 (기존 v2 SEARCH를 일부 v1 이동):
    ```
    ### Advanced Search (SEARCH)
    - [ ] **SEARCH-02**: Worker는 /home에서 리스트/지도 토글로 공고를 탐색할 수 있고, 카카오맵에 viewport 내 marker가 표시된다 (Phase 4, v2→v1 승격)
    - [ ] **SEARCH-03**: Worker는 날짜 프리셋(오늘/내일/이번주) + 시간대 버킷(오전/오후/저녁/야간) + 거리 스테퍼(1/3/5/10km)로 공고를 필터할 수 있다 (Phase 4, 신설)
    ```
  - v1 > Notifications (NOTIF) 서브섹션 신설:
    ```
    ### Notifications (NOTIF) — partial v1
    - [ ] **NOTIF-01**: Web Push 알림 (VAPID + Service Worker)이 Worker에게 수락/거절 이벤트를 전달한다. 네이티브 FCM/SMS/알림톡은 v2 (Phase 4, 부분)
    ```
  - v2 Advanced Search 섹션에서 SEARCH-02 제거 (SEARCH-01은 v2 유지)
  - v2 Notifications 섹션에서 NOTIF-01 제거 주석 추가 ("부분 v1으로 승격, 나머지 v2")
  - Traceability 테이블에 3개 엔트리 추가:
    ```
    | SEARCH-02 | Phase 4 | Pending |
    | SEARCH-03 | Phase 4 | Pending |
    | NOTIF-01 (partial) | Phase 4 | Pending |
    ```
  - Coverage Summary 총수를 40 → 43으로 업데이트 (40 + SEARCH-02 + SEARCH-03 + NOTIF-01)

  **중요: 기존 completed 체크박스 `[x]`는 절대 건드리지 말 것.** Phase 1/2/3 완료 status 손상 금지.

  이 3개 파일은 discuss-phase에서 사용자가 명시적으로 승인한 scope 확장(D-01/D-19/D-23)을 반영하는 작업이며, Phase 4 실행 전에 반드시 완료되어야 한다.
  </action>
  <verify>
    <automated>bash -c 'grep -q "자동수락 타이머" .planning/PROJECT.md && grep -q "Web Push (VAPID" .planning/PROJECT.md && grep -q "Kakao Maps JavaScript SDK" .planning/PROJECT.md && grep -q "SEARCH-02.*카카오맵" .planning/REQUIREMENTS.md && grep -q "SEARCH-03" .planning/REQUIREMENTS.md && grep -q "NOTIF-01.*Web Push" .planning/REQUIREMENTS.md && grep -q "리스트|지도" .planning/ROADMAP.md && echo OK'</automated>
  </verify>
  <done>
    - 3개 문서에 scope 확장 반영
    - 기존 Phase 1/2/3 `[x]` status 유지
    - REQUIREMENTS.md coverage 43/43
  </done>
</task>

<task type="auto">
  <name>Task 4: Wave 0 test fixtures 공유 인프라 작성</name>
  <files>tests/fixtures/phase4/index.ts, tests/fixtures/phase4/users.ts, tests/fixtures/phase4/jobs.ts, tests/fixtures/phase4/push.ts</files>
  <read_first>
    - tests/fixtures/ (Phase 2/3 fixture 패턴)
    - prisma/schema.prisma (현재 ApplicationStatus, WorkerProfile 모양)
    - src/lib/db/queries.ts (adaptApplication 패턴)
  </read_first>
  <action>
  아래 4개 fixture 파일 작성.

  **tests/fixtures/phase4/users.ts:**
  ```typescript
  import { prisma } from '@/lib/db'
  import { randomUUID } from 'node:crypto'

  export async function createTestWorker(overrides?: { email?: string; name?: string }) {
    const id = randomUUID()
    const email = overrides?.email ?? `worker-${id.slice(0, 8)}@test.local`
    const user = await prisma.user.create({
      data: { id, email, role: 'WORKER' },
    })
    await prisma.workerProfile.create({
      data: {
        userId: id,
        name: overrides?.name ?? `Worker ${id.slice(0, 4)}`,
        preferredCategories: ['food', 'retail'],
      },
    })
    return user
  }

  export async function createTestBusiness(overrides?: { email?: string; name?: string }) {
    const id = randomUUID()
    const email = overrides?.email ?? `biz-${id.slice(0, 8)}@test.local`
    const user = await prisma.user.create({
      data: { id, email, role: 'BUSINESS' },
    })
    const profile = await prisma.businessProfile.create({
      data: {
        userId: id,
        name: overrides?.name ?? `Biz ${id.slice(0, 4)}`,
        category: 'food',
        address: '서울 강남구 테헤란로 212',
        lat: 37.4979,
        lng: 127.0276,
      },
    })
    // location geography Point (Unsupported column) — raw SQL
    await prisma.$executeRawUnsafe(
      `UPDATE public.business_profiles SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography WHERE id = $3`,
      127.0276, 37.4979, profile.id,
    )
    return { user, profile }
  }
  ```

  **tests/fixtures/phase4/jobs.ts:**
  ```typescript
  import { prisma } from '@/lib/db'
  import { randomUUID } from 'node:crypto'

  type Opts = {
    businessId: string
    authorId: string
    headcount?: number
    startHour?: number          // Asia/Seoul hour, default 10
    workDateOffsetDays?: number // default 0 (today)
    hourlyPay?: number
    lat?: number
    lng?: number
  }

  export async function createTestJob(opts: Opts) {
    const id = randomUUID()
    const workDate = new Date()
    workDate.setUTCDate(workDate.getUTCDate() + (opts.workDateOffsetDays ?? 0))
    workDate.setUTCHours(0, 0, 0, 0)
    const h = opts.startHour ?? 10
    const startTime = `${String(h).padStart(2, '0')}:00`
    const endTime = `${String((h + 4) % 24).padStart(2, '0')}:00`
    const lat = opts.lat ?? 37.4979
    const lng = opts.lng ?? 127.0276

    const job = await prisma.job.create({
      data: {
        id,
        businessId: opts.businessId,
        authorId: opts.authorId,
        title: `Test Job ${id.slice(0, 4)}`,
        category: 'food',
        description: 'fixture',
        hourlyPay: opts.hourlyPay ?? 12000,
        transportFee: 2000,
        workDate,
        startTime,
        endTime,
        workHours: 4,
        headcount: opts.headcount ?? 1,
        lat,
        lng,
        status: 'active',
      },
    })
    await prisma.$executeRawUnsafe(
      `UPDATE public.jobs SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography WHERE id = $3`,
      lng, lat, id,
    )
    return job
  }
  ```

  **tests/fixtures/phase4/push.ts:**
  ```typescript
  // Mock VAPID subscription keys (valid format, not usable for real delivery)
  export const MOCK_PUSH_KEYS = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/TEST-ENDPOINT-1234',
    p256dh: 'BEl62iUYgUivxIkv69yViEuiBIa40HI80NM9LdNnC7WNnmJMPs2X6kCbDSYvP0xu4rFBw5E0OLKrTx2rXo0Hq0c',
    auth: 'tBHItJI5svbpez7KI4CCXg',
  }
  ```

  **tests/fixtures/phase4/index.ts:**
  ```typescript
  export * from './users'
  export * from './jobs'
  export * from './push'
  ```

  Prisma 전제: 이 fixture는 Plan 02가 `prisma db push`로 pending/noShowCount/PushSubscription을 적용한 이후 실행 가능. Wave 1-2 이전에는 runtime에 import 실패할 수 있으므로 그 점을 주석으로 명시.
  </action>
  <verify>
    <automated>bash -c 'test -f tests/fixtures/phase4/index.ts && test -f tests/fixtures/phase4/users.ts && test -f tests/fixtures/phase4/jobs.ts && test -f tests/fixtures/phase4/push.ts && npx tsc --noEmit tests/fixtures/phase4/index.ts 2>&1 | tail -20 && echo DONE'</automated>
  </verify>
  <done>
    - 4개 fixture 파일 존재, `import` syntax 에러 없음
    - createTestWorker / createTestBusiness / createTestJob / MOCK_PUSH_KEYS 모두 export
  </done>
</task>

<task type="auto">
  <name>Task 5: Application Wave 0 RED tests (8 files)</name>
  <files>tests/applications/apply-one-tap.test.ts, tests/applications/apply-race.test.ts, tests/applications/apply-duplicate.test.ts, tests/applications/list-worker.test.ts, tests/applications/list-biz.test.ts, tests/applications/accept-reject.test.ts, tests/applications/auto-accept-cron.test.ts, tests/applications/headcount-fill.test.ts</files>
  <read_first>
    - tests/data/ (Phase 3 integration test 패턴 — Prisma 직접 쿼리 + truncate teardown)
    - .planning/phases/04-db/04-VALIDATION.md (Per-Task Verification Map: APPL rows)
    - .planning/phases/04-db/04-CONTEXT.md (D-05 atomic UPDATE, D-03 auto-accept, D-22 no-show)
    - .planning/phases/04-db/04-RESEARCH.md (Pattern 1: Atomic One-Tap Apply)
  </read_first>
  <action>
  각 파일은 Vitest `describe/it` 구조이며, 미구현 Server Action을 import해서 호출한다 (import 실패시 vitest는 파일 자체가 RED가 됨 — 이는 의도적 "Nyquist RED baseline"). 각 테스트는 실제 Prisma DB를 사용 (벤치마킹용 local Supabase or .env DATABASE_URL)하고 `afterEach`에 truncate 로직을 포함한다.

  **각 파일 공통 스켈레톤:**
  ```typescript
  import { describe, it, expect, beforeEach, afterEach } from 'vitest'
  import { prisma } from '@/lib/db'
  import { createTestWorker, createTestBusiness, createTestJob } from '../fixtures/phase4'
  // 아래 import는 Plan 04가 구현할 때까지 파일이 존재하지 않음 → RED
  import { applyOneTap } from '@/app/(worker)/posts/[id]/apply/actions'

  async function truncate() {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE public.applications, public.jobs, public.worker_profiles, public.business_profiles, public.users RESTART IDENTITY CASCADE')
  }
  ```

  **tests/applications/apply-one-tap.test.ts** (APPL-01 happy path)
  - `it('creates application with pending status and increments job.filled')` — worker + job(headcount=3, filled=0) 생성 → applyOneTap({jobId}) → result.success=true, application.status='pending', job.filled=1

  **tests/applications/apply-race.test.ts** (APPL-01 concurrency)
  - `it('allows exactly headcount successes out of N concurrent apply attempts')` — headcount=5, 10 workers, `Promise.all(workers.map(w => applyOneTap({jobId})))` → exactly 5 results with success=true, 5 with success=false error='job_full'
  - Also assert `jobs.filled == 5 AND jobs.status == 'filled'`

  **tests/applications/apply-duplicate.test.ts** (APPL-01 ON CONFLICT + status='filled' rejection)
  - `it('rejects duplicate apply from same worker')` — applyOneTap twice with same worker → 2nd result.error='already_applied', job.filled still 1 (compensation rollback)
  - `it('rejects apply when job.status=filled')` — prefill jobs.status='filled' → applyOneTap → error='job_not_active' or 'job_full'

  **tests/applications/list-worker.test.ts** (APPL-02)
  - import `getApplicationsByWorker` from `@/lib/db/queries`
  - `it('returns worker applications filtered by status bucket 예정/진행중/완료')` — seed 1 pending + 1 confirmed + 1 in_progress + 1 completed + 1 cancelled, then query `getApplicationsByWorker(workerId, { bucket: 'upcoming' })` returns [pending, confirmed], bucket='active' returns [in_progress], bucket='done' returns [completed]

  **tests/applications/list-biz.test.ts** (APPL-03)
  - import `getApplicationsByJob` from `@/lib/db/queries`
  - `it('returns all applications for a business job joined with worker profile')` — seed 3 applications → query returns array of 3 with `worker.name` and `workerProfile.rating` fields

  **tests/applications/accept-reject.test.ts** (APPL-04)
  - import `acceptApplication`, `rejectApplication`
  - `it('accept transitions pending → confirmed')` — pending app → acceptApplication(id) → status='confirmed'
  - `it('reject transitions pending → cancelled and decrements job.filled')` — pending app (filled=1) → rejectApplication(id) → status='cancelled', job.filled=0
  - `it('reject on confirmed also decrements filled')` — seed pending->confirmed then reject → filled decrement

  **tests/applications/auto-accept-cron.test.ts** (APPL-04 auto-accept)
  - No application action import (direct SQL test of pg_cron UPDATE)
  - `it('transitions pending apps older than 30 minutes to confirmed')` — insert application with appliedAt = now() - 31 minutes, status='pending' → execute the exact SQL from pg_cron schedule (copied verbatim from migration file) → assert status now 'confirmed'
  - `it('does NOT transition pending apps younger than 30 minutes')` — appliedAt = now() - 29 minutes → run SQL → status still 'pending'

  **tests/applications/headcount-fill.test.ts** (APPL-05)
  - `it('marks job as filled atomically when last seat taken')` — headcount=1, apply once → job.status='filled', job.filled=1
  - `it('subsequent apply after fill returns job_full')` — continuation

  각 파일 상단에 `// RED BASELINE (Wave 0): this test will fail until Plan 04 implements actions.` 주석.

  **중요:** RED baseline 단계에서는 `npm test -- tests/applications/` 실행시 모든 파일이 실패해야 한다. 이는 Plan 04 완료 후 GREEN으로 전환된다.
  </action>
  <verify>
    <automated>bash -c 'for f in apply-one-tap apply-race apply-duplicate list-worker list-biz accept-reject auto-accept-cron headcount-fill; do test -f tests/applications/$f.test.ts || { echo MISSING $f; exit 1; }; done; npm test -- tests/applications --run 2>&1 | tail -30 && echo "expected RED"'</automated>
  </verify>
  <done>
    - 8개 테스트 파일 생성
    - 각 파일 `describe`/`it` 블록이 RESEARCH.md 시나리오 전부 커버
    - `npm test -- tests/applications` 은 import error 또는 assertion 실패로 RED (의도적)
  </done>
</task>

<task type="auto">
  <name>Task 6: Shift Wave 0 RED tests (6 files)</name>
  <files>tests/shift/check-in-time-window.test.ts, tests/shift/geofence.test.ts, tests/shift/checkout-jwt.test.ts, tests/shift/actual-hours.test.ts, tests/shift/earnings.test.ts, tests/shift/night-shift.test.ts</files>
  <read_first>
    - .planning/phases/04-db/04-VALIDATION.md (Per-Task Verification Map: SHIFT rows)
    - .planning/phases/04-db/04-CONTEXT.md (D-09 시간창, D-10 geofence 200m, D-11 15분 반올림, D-12 야간할증, D-15 JWT HS256)
    - .planning/phases/04-db/04-RESEARCH.md (Pattern 2/3/4 체크인/체크아웃/JWT)
    - src/lib/job-utils.ts (기존 calculateEarnings)
  </read_first>
  <action>
  **tests/shift/check-in-time-window.test.ts** (SHIFT-01 6 boundary cases)
  - import `isWithinCheckInWindow` from `@/lib/time-filters` OR `@/lib/shift-validation` (planner 재량 — 파일 네이밍 일치 유지)
  - Base: `startTime = '10:00'` on 2026-04-11
  - 6 cases: -11 min (false), -10 min (true, boundary), -1 min (true), +30 min (true, boundary), +31 min (false), +100 min (false)
  - pure unit, no DB

  **tests/shift/geofence.test.ts** (SHIFT-01 PostGIS)
  - import `isWithinGeofence` from `@/lib/geofence`
  - Real DB integration: biz에 location Point(127.0276, 37.4979) 생성
  - 199m 떨어진 좌표 (37.49975, 127.0276 approximately) → true
  - 201m 떨어진 좌표 → false
  - Uses `prisma.$queryRaw` ST_DWithin internally

  **tests/shift/checkout-jwt.test.ts** (SHIFT-02 JWT 4 attack cases)
  - import `signCheckoutToken`, `verifyCheckoutToken` from `@/lib/qr`
  - process.env.APPLICATION_JWT_SECRET = 'test-secret-32bytes-hex-placeholder'
  - Valid case: sign {jobId, businessId, nonce, exp=+5min} → verify returns payload
  - Expired case: sign with exp=-1min → verify throws
  - Tampered case: flip a char in signature → verify throws
  - Alg confusion: attempt jwt with alg=none → verify rejects

  **tests/shift/actual-hours.test.ts** (SHIFT-02 15분 반올림)
  - import `calculateActualHours` from `@/lib/job-utils`
  - Cases: 0min→0, 7min→0.0 (round down to 0 × 15), 8min→0.25, 15min→0.25, 22min→0.25, 23min→0.5, 37min→0.5
  - Note: clarify rounding rule — `Math.round(min/15)*15` → 7/15=0.47→round=0, 8/15=0.53→round=1→15min=0.25h

  **tests/shift/earnings.test.ts** (SHIFT-02 composition)
  - import `calculateEarnings`
  - hourlyPay=12000, transportFee=2000, actualHours=4, nightPremium=0 → 12000*4 + 2000 = 50000
  - hourlyPay=12000, transportFee=2000, actualHours=4, nightPremium=12000 → 62000

  **tests/shift/night-shift.test.ts** (SHIFT-03 6 boundary)
  - import `calculateNightShiftPremium`, `computeNightHoursOverlap` from `@/lib/night-shift`
  - Cases (all in Asia/Seoul):
    1. **fully-inside**: 23:00-04:00 (5h overlap, ≥4h) → premium = 5 * hourlyPay * 0.5
    2. **straddle-left**: 20:00-02:00 (overlap 22-02 = 4h, ≥4h) → premium = 4 * 0.5 * hp
    3. **straddle-right**: 04:00-10:00 (overlap 04-06 = 2h, <4h) → premium = 0
    4. **cross-midnight boundary**: 22:00-next 06:00 (8h overlap) → premium = 8 * 0.5 * hp
    5. **no-overlap**: 08:00-16:00 → premium = 0
    6. **<4h overlap**: 23:00-02:00 (3h overlap) → premium = 0 (threshold 엄격)
  - Use `hourlyPay=10000` for easy math
  - Assert `computeNightHoursOverlap` independently for each case
  </action>
  <verify>
    <automated>bash -c 'for f in check-in-time-window geofence checkout-jwt actual-hours earnings night-shift; do test -f tests/shift/$f.test.ts || { echo MISSING $f; exit 1; }; done; npm test -- tests/shift --run 2>&1 | tail -20 && echo "expected RED"'</automated>
  </verify>
  <done>
    - 6 shift test files exist
    - Each describes exact boundary cases from VALIDATION.md
    - All RED at this point
  </done>
</task>

<task type="auto">
  <name>Task 7: Search/Push Wave 0 RED tests (4 files) + e2e placeholder</name>
  <files>tests/search/time-filter.test.ts, tests/search/time-bucket.test.ts, tests/push/subscribe.test.ts, tests/push/send-410-cleanup.test.ts, tests/e2e/map-view.spec.ts</files>
  <read_first>
    - .planning/phases/04-db/04-VALIDATION.md (SEARCH / NOTIF-01 rows)
    - .planning/phases/04-db/04-CONTEXT.md (D-26 시간 필터, D-27 거리, D-20 web-push 410 cleanup)
    - playwright.config.ts (existing e2e pattern)
  </read_first>
  <action>

  **tests/search/time-filter.test.ts** (SEARCH-03 SQL WHERE)
  - import `buildTimeFilterSQL` from `@/lib/time-filters`
  - Cases: `{ preset: '오늘' }` → SQL fragment with `workDate = current_date`, `{ preset: '내일' }` → `workDate = current_date + 1`, `{ preset: '이번주' }` → `workDate BETWEEN date_trunc('week', now())::date AND date_trunc('week', now())::date + 6`
  - Returns `{ whereClause: string; params: any[] }` structure

  **tests/search/time-bucket.test.ts** (SEARCH-03 시간대 버킷 unit)
  - import `doesTimeBucketMatch` from `@/lib/time-filters`
  - Cases: startTime='10:00' matches '오전' (06:00-12:00), startTime='13:00' matches '오후' (12:00-18:00), startTime='20:00' matches '저녁' (18:00-22:00), startTime='23:00' matches '야간' (22:00-06:00), startTime='05:00' also matches '야간' (day boundary crossing)

  **tests/push/subscribe.test.ts** (NOTIF-01)
  - import `subscribePush`, `unsubscribePush` from `@/app/(worker)/my/actions` or `@/lib/actions/push-actions` (콜로케이션 준수)
  - integration: createTestWorker → mock session → subscribePush(MOCK_PUSH_KEYS) → assert prisma.pushSubscription 1 row with matching endpoint
  - unsubscribePush(endpoint) → assert deleted

  **tests/push/send-410-cleanup.test.ts** (NOTIF-01)
  - Use `vi.mock('web-push', () => ({ default: { sendNotification: vi.fn() } }))`
  - `sendNotification` mock throws `{ statusCode: 410, body: 'Gone' }` on first call
  - import `sendPushToUser` from `@/lib/push`
  - Seed 1 subscription, call sendPushToUser(userId, {title, body}), assert prisma.pushSubscription.count() === 0 after

  **tests/e2e/map-view.spec.ts** (SEARCH-02 Playwright)
  ```typescript
  import { test, expect } from '@playwright/test'

  test.skip(!process.env.NEXT_PUBLIC_KAKAO_MAP_KEY, 'requires Kakao key')

  test('map toggle renders kakao.maps container', async ({ page }) => {
    await page.goto('/home')
    await page.getByRole('button', { name: '지도' }).click()
    await expect(page.locator('[data-testid="kakao-map-container"]')).toBeVisible()
  })
  ```

  모든 파일 상단에 `// RED BASELINE (Wave 0)` 주석.
  </action>
  <verify>
    <automated>bash -c 'test -f tests/search/time-filter.test.ts && test -f tests/search/time-bucket.test.ts && test -f tests/push/subscribe.test.ts && test -f tests/push/send-410-cleanup.test.ts && test -f tests/e2e/map-view.spec.ts && echo OK'</automated>
  </verify>
  <done>
    - 5 new test files (4 vitest + 1 playwright) exist with full describe blocks
    - RED baseline as expected
  </done>
</task>

<task type="auto">
  <name>Task 8: 04-HUMAN-UAT.md 체크리스트 작성</name>
  <files>.planning/phases/04-db/04-HUMAN-UAT.md</files>
  <read_first>
    - .planning/phases/04-db/04-VALIDATION.md (Manual-Only Verifications 섹션)
    - .planning/phases/04-db/04-CONTEXT.md (D-09, D-15, D-19, D-23)
    - .planning/phases/03-db/03-HUMAN-UAT.md (Phase 3 UAT 형식 참조)
  </read_first>
  <action>
  5개 수동 검증 시나리오를 체크박스 형식으로 작성. 각 시나리오는: 목적, 전제조건(env/HTTPS/device), 단계(numbered), 성공 기준, 실패시 기록.

  ```markdown
  ---
  phase: 04-db
  status: draft
  items: 5
  created: 2026-04-10
  ---

  # Phase 4 Human UAT Checklist

  5 scenarios that cannot be automated (camera/HTTPS/real device/real API key/two-browser-tab Realtime).
  Checker: run these before /gsd-verify-work closure.

  ## 1. Check-out QR 카메라 스캔 풀 플로우 (SHIFT-02)

  **전제:** `.env.local`에 `APPLICATION_JWT_SECRET`. 모바일 브라우저 HTTPS (prod deploy or ngrok) 권장.

  **단계:**
  1. Biz 계정 로그인 → `/biz/posts/[jobId]` → "퇴근 QR 열기" 버튼 클릭 → 모달에 QR SVG + 카운트다운 표시됨 확인
  2. Worker 계정 로그인 → `/my/applications/[id]/check-in` → 체크아웃 탭으로 전환 → 카메라 권한 허용
  3. Worker 카메라로 Biz 모달 QR 스캔 → 인식 성공 후 confirm 화면
  4. DB 확인: `applications.status='completed'`, `checkOutAt is not null`, `earnings > 0`
  5. Worker 화면에 "완료" 탭에서 해당 application 표시 확인

  **성공 기준:** 5단계 모두 통과.
  **실패 기록:** ( ) Pass / ( ) Fail, 실패시 스크린샷 첨부.

  ## 2. Web Push 구독 + 수락 알림 + 클릭 + 410 cleanup (NOTIF-01)

  **전제:** HTTPS, Chrome/Edge, 알림 권한 미리 차단 안된 상태.

  **단계:**
  1. Worker 로그인 → `/my` 첫 방문 → "알림을 켜보세요" 배너 확인 → 클릭 → `Notification.requestPermission()` 허용
  2. DevTools → Application → Service Workers에 `/sw.js` active 상태 확인
  3. Prisma Studio 또는 SQL: `SELECT * FROM public.push_subscriptions WHERE userId=<worker>` 1행 확인
  4. 다른 탭에서 Biz가 해당 Worker의 application을 accept
  5. OS 알림 "지원하신 '{공고명}'이 수락되었습니다" 표시 확인
  6. 알림 클릭 → `/my/applications/[id]` 로 이동 확인
  7. (cleanup 테스트) DevTools → Application → Push → Unsubscribe → 다시 Biz accept → DB의 push_subscriptions 해당 row 삭제 확인 (410 Gone 경로)

  **성공 기준:** 1~7 모두 통과.

  ## 3. Kakao Maps 지도 탐색 + 필터 (SEARCH-02)

  **전제:** `NEXT_PUBLIC_KAKAO_MAP_KEY` 설정, localhost:3000 Kakao 플랫폼에 등록.

  **단계:**
  1. `/home` 접속 → "리스트" 기본 활성 확인
  2. "지도" 토글 클릭 → 카카오맵 컨테이너 렌더 + 서울 중심 표시 + 공고 marker 1개 이상 렌더
  3. 거리 필터 3km → 10km 변경 → marker 개수 증가 확인
  4. Marker 클릭 → 하단 preview card (모바일) 또는 side drawer (데스크톱) 렌더
  5. Preview card "상세보기" 클릭 → `/posts/[id]` 이동
  6. 시간 필터 "내일" 프리셋 선택 → marker 목록이 내일 workDate 공고만 남는지 확인

  **성공 기준:** 1~6 통과.

  ## 4. Realtime postgres_changes 두 탭 (APPL-04)

  **전제:** 동일 브라우저의 2개 탭 또는 2개 다른 브라우저. Worker + Biz 2개 계정.

  **단계:**
  1. Tab A: Worker로 `/my/applications` 열기 → pending 상태 application 1개 표시 확인
  2. Tab B: Biz로 `/biz/posts/[jobId]/applicants` 열기
  3. Tab B에서 "수락" 버튼 클릭
  4. Tab A 화면이 자동으로 "수락됨" (confirmed) 으로 전이 확인 (60초 이내, polling fallback 기준)
  5. Sonner toast 또는 배지 알림 표시 확인
  6. Supabase SQL: `SELECT pubname, tablename FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='applications'` 에 1행 확인

  **성공 기준:** 1~6 모두.

  ## 5. Geofence 실제 GPS (SHIFT-01)

  **전제:** HTTPS 모바일 기기. 매장 좌표를 알고 있는 테스트 Business.

  **단계:**
  1. 테스트 Business 매장 반경 100m 안에서 Worker가 confirmed application의 `/check-in` 진입
  2. "체크인" 클릭 → geolocation 허용 → 서버 ST_DWithin 통과 → 상태 `in_progress` 전이 확인
  3. 매장 반경 300m 밖에서 재시도 (취소 후 새 application, 또는 DB reset)
  4. "체크인" 클릭 → 에러 "현장에 도착한 뒤 다시 시도해주세요" 표시 확인

  **성공 기준:** 3, 4 모두 (geofence 200m 경계 내부/외부 차이).

  ---

  ## Sign-Off

  - [ ] 1. QR 체크아웃 — Pass/Fail
  - [ ] 2. Web Push + 410 cleanup — Pass/Fail
  - [ ] 3. Kakao Maps + 필터 — Pass/Fail
  - [ ] 4. Realtime 두 탭 — Pass/Fail
  - [ ] 5. Geofence 실 GPS — Pass/Fail

  **Checker:** _______________
  **Date:** _______________
  ```
  </action>
  <verify>
    <automated>bash -c 'test -f .planning/phases/04-db/04-HUMAN-UAT.md && grep -q "5 scenarios" .planning/phases/04-db/04-HUMAN-UAT.md && grep -q "ST_DWithin" .planning/phases/04-db/04-HUMAN-UAT.md && grep -q "Realtime" .planning/phases/04-db/04-HUMAN-UAT.md && echo OK'</automated>
  </verify>
  <done>
    - 04-HUMAN-UAT.md 존재, 5 시나리오 상세
    - 각 시나리오가 VALIDATION.md manual-only table과 매칭
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 9: 사용자 외부 설정 checkpoint (Kakao Maps + VAPID + JWT secret)</name>
  <files>(checkpoint — no files modified)</files>
  <action>See <how-to-verify> below. Checker performs the listed manual steps and responds via <resume-signal>.</action>
  <verify>
    <automated>echo "human verify required — see how-to-verify block"</automated>
  </verify>
  <done>Checker responds with approved / partial / failed per resume-signal contract.</done>
  <what-built>
    - `package.json`: jose / web-push / html5-qrcode / qrcode / @types/* 설치 완료
    - `.env.example`: 4개 새 키 placeholder 추가
    - PROJECT/ROADMAP/REQUIREMENTS 3개 문서 scope 확장 동기화
    - 21개 RED 테스트 파일 + 4개 fixture 파일
    - `04-HUMAN-UAT.md` 5 시나리오 체크리스트
  </what-built>
  <how-to-verify>
    이 checkpoint는 **사용자만 수행 가능한 4가지 외부 설정**을 Wave 2 시작 전에 확보하기 위함이다. Claude가 자동화할 수 없는 항목:

    1. **Kakao Developers 앱 등록 (D-24)**
       - https://developers.kakao.com → 로그인 → 내 애플리케이션 → "앱 추가하기"
       - 플랫폼 > Web > 사이트 도메인에 `http://localhost:3000` 추가
       - JavaScript 키 복사 → `.env.local`에 `NEXT_PUBLIC_KAKAO_MAP_KEY=...`
       - (프로덕션 도메인은 Phase 5 배포시 추가)

    2. **VAPID 키 생성**
       ```
       npx web-push generate-vapid-keys
       ```
       출력의 Public Key → `.env.local`의 `WEB_PUSH_VAPID_PUBLIC_KEY`
       Private Key → `.env.local`의 `WEB_PUSH_VAPID_PRIVATE_KEY`

    3. **APPLICATION_JWT_SECRET 생성**
       ```
       node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
       ```
       → `.env.local`의 `APPLICATION_JWT_SECRET`

    4. **(선택) Kakao 키가 없으면 SEARCH-02 관련 화면은 toggle이 disable 상태로 표시됨** — 개발/UAT 단계 동안 키 없이 계속할 수 있으나, Plan 07 실행 후 수동 UAT #3은 수행 불가.

    확인 후 answer:
    - [ ] `.env.local`에 4개 키 모두 세팅됨
    - [ ] 또는 Kakao 키는 나중에 추가하기로 결정 (Plan 07 UAT 연기)
  </how-to-verify>
  <resume-signal>"approved" 또는 "kakao-later" 또는 이슈 설명</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Developer → repo | Locked versions + docs sync must not introduce supply-chain surprises |
| Test fixtures → production DB | Fixtures run against DATABASE_URL — must NEVER be pointed at prod |
| .env.example → .env.local | Template must not leak real secrets |

## STRIDE Threat Register

| ID | Category | Component | Disposition | Mitigation |
|----|----------|-----------|-------------|------------|
| T-04-01 | Tampering | npm dependency versions | mitigate | Pin exact version in 04-VERSION-LOCK.md, commit package-lock.json |
| T-04-02 | Info Disclosure | .env.example | mitigate | Only placeholder values, no real secrets; enforce `=` empty in example |
| T-04-03 | DoS | test truncate on wrong DB | mitigate | fixtures use `prisma.$executeRawUnsafe('TRUNCATE ...')` only; DATABASE_URL in CI must be test DB; add sanity check in truncate helper (abort if DATABASE_URL contains 'prod' or 'production') |
| T-04-04 | Supply chain | new libs (jose, web-push, html5-qrcode, qrcode) | accept | All ≥1k GitHub stars, actively maintained; VERSION-LOCK provides rollback target |
</threat_model>

<verification>
- `node -e` 검증이 4개 runtime deps 존재 확인
- `grep` 검증이 3개 문서 scope 확장 텍스트 확인
- `test -f` 검증이 21개 테스트 파일 + 4개 fixture + HUMAN-UAT 존재 확인
- `npm test -- tests/applications tests/shift tests/search tests/push --run` 은 RED (expected baseline)
</verification>

<success_criteria>
- [x] 5개 새 runtime deps + 2개 devDeps 설치, 버전 락 문서화
- [x] PROJECT/ROADMAP/REQUIREMENTS 3문서 scope 확장 반영, 기존 completed status 보존
- [x] 21개 Vitest + 1개 Playwright 테스트 파일 RED baseline 생성
- [x] 04-HUMAN-UAT.md 5 시나리오 체크리스트
- [x] .env.example 4개 키 placeholder
- [x] Checkpoint: 사용자 외부 설정 확보 (Kakao/VAPID/JWT secret)
</success_criteria>

<output>
After completion, create `.planning/phases/04-db/04-01-SUMMARY.md` with:
- 설치된 패키지와 버전
- 21개 테스트 파일 목록 (linked from VALIDATION.md)
- 3문서 scope 확장 diff 요약
- `.env.local` 외부 설정 완료 여부
</output>
