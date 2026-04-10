---
phase: 04-db
plan: 04
type: execute
wave: 3
depends_on: [2, 3]
files_modified:
  - src/app/(worker)/posts/[id]/apply/actions.ts
  - src/app/biz/posts/[id]/applicants/actions.ts
  - src/app/(worker)/my/applications/actions.ts
  - src/lib/db/queries.ts
  - src/lib/validations/application.ts
  - src/lib/errors/application-errors.ts
autonomous: true
requirements:
  - APPL-01
  - APPL-02
  - APPL-03
  - APPL-04
  - APPL-05

must_haves:
  truths:
    - "Worker가 applyOneTap({jobId})를 호출하면 pending 상태 application이 생성되고 jobs.filled가 원자적으로 증가한다"
    - "Headcount에 도달하면 jobs.status가 같은 트랜잭션에서 'filled'로 전이된다"
    - "동일 Worker의 재지원은 'already_applied' 에러로 거부되고 filled 증가가 롤백된다"
    - "Business가 acceptApplication(id)을 호출하면 status가 pending→confirmed로 전이되고 Worker에게 revalidatePath로 /my/applications가 갱신된다"
    - "Business가 rejectApplication(id)을 호출하면 status가 cancelled로 전이되고 jobs.filled가 -1 차감된다"
    - "Worker가 cancelApplication(id)을 호출하면 24시간 전 조건에 따라 무료/경고 후 cancelled로 전이되고 필요시 noShowCount 가산"
    - "tests/applications/*.test.ts 8개 파일이 GREEN 상태로 전환된다"
  artifacts:
    - path: "src/app/(worker)/posts/[id]/apply/actions.ts"
      provides: "applyOneTap Server Action"
      exports: ["applyOneTap"]
    - path: "src/app/biz/posts/[id]/applicants/actions.ts"
      provides: "acceptApplication, rejectApplication Server Actions"
      exports: ["acceptApplication", "rejectApplication"]
    - path: "src/app/(worker)/my/applications/actions.ts"
      provides: "cancelApplication Server Action (Worker-initiated)"
      exports: ["cancelApplication"]
    - path: "src/lib/db/queries.ts"
      provides: "getApplicationsByWorker (with bucket), getApplicationsByJob"
      contains: "getApplicationsByJob"
  key_links:
    - from: "applyOneTap"
      to: "prisma.$transaction → jobs UPDATE + applications INSERT"
      via: "atomic capacity check"
      pattern: "\\$queryRaw"
    - from: "acceptApplication"
      to: "revalidatePath('/my/applications')"
      via: "Supabase Realtime backs up via postgres_changes"
      pattern: "revalidatePath"
---

<objective>
Phase 4의 핵심 비즈니스 로직 Server Actions를 구현한다: 원탭 지원(atomic concurrency-safe), Business accept/reject, Worker cancel, 그리고 queries.ts 확장. Wave 0의 tests/applications/*.test.ts 8개 파일을 모두 GREEN으로 전환한다.

Purpose: APPL-01~05 요구사항을 코드로 만족. Phase 2/3의 Zod + Prisma + Server Action 패턴을 연장. dal.ts 오너십 체크를 모든 mutation에서 사용.
Output: 3개 actions 파일 + queries.ts 확장 + validation + error mapping, APPL tests GREEN.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/04-db/04-CONTEXT.md
@.planning/phases/04-db/04-RESEARCH.md
@.planning/phases/04-db/04-UI-SPEC.md
@prisma/schema.prisma
@src/lib/dal.ts
@src/lib/db/queries.ts
@src/lib/db/index.ts
@src/app/(worker)/posts/[id]/apply/apply-confirm-flow.tsx
@src/app/biz/posts/actions.ts
@src/app/(auth)/login/actions.ts
@tests/applications/apply-one-tap.test.ts
@tests/applications/apply-race.test.ts
@tests/applications/apply-duplicate.test.ts
@tests/applications/list-worker.test.ts
@tests/applications/list-biz.test.ts
@tests/applications/accept-reject.test.ts
@tests/applications/auto-accept-cron.test.ts
@tests/applications/headcount-fill.test.ts

<interfaces>
Phase 3 Server Action precedent (src/app/biz/posts/actions.ts):
- Files colocated under route folder
- `'use server'` directive
- Returns `{ success: true, data } | { success: false, error: string }`
- Uses `await prisma.$transaction(...)` for multi-step mutations
- `revalidatePath(...)` after mutation

Prisma client access: `import { prisma } from '@/lib/db'`
DAL: `import { requireWorker, requireApplicationOwner, requireJobOwner } from '@/lib/dal'`
Prisma raw SQL: `import { Prisma } from '@/generated/prisma/client'` → `Prisma.sql`

Phase 3 queries.ts current shape:
- `getJobsPaginated(...)`, `getJobsByDistance(...)`, `adaptJob(row)`, `adaptApplication(row)`, `APP_INCLUDE` constant
- Existing include chain picks: `{ job: { include: { business: true } }, worker: { include: { workerProfile: true } } }`
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Zod schemas + error types + Korean mapping</name>
  <files>src/lib/validations/application.ts, src/lib/errors/application-errors.ts</files>
  <read_first>
    - src/lib/validations/ (기존 Zod 스키마 패턴)
    - src/lib/form-state.ts (Phase 3 AuthFormState)
    - .planning/phases/04-db/04-CONTEXT.md D-17, D-18 (에러 코드 컨벤션)
  </read_first>
  <behavior>
    - `applyOneTapSchema`, `acceptApplicationSchema`, `rejectApplicationSchema`, `cancelApplicationSchema` 4개 Zod 스키마 export
    - `ApplicationError` 타입 union: 'job_full' | 'already_applied' | 'job_not_active' | 'application_not_found' | 'application_not_owned' | 'job_not_owned' | 'invalid_state' | 'cancel_too_late' | 'unknown'
    - `applicationErrorToKorean(error: ApplicationError): string` 함수
  </behavior>
  <action>
  **src/lib/validations/application.ts:**
  ```typescript
  import { z } from 'zod'

  export const uuidSchema = z.string().uuid('유효하지 않은 ID 형식입니다')

  export const applyOneTapSchema = z.object({
    jobId: uuidSchema,
  })
  export type ApplyOneTapInput = z.infer<typeof applyOneTapSchema>

  export const acceptApplicationSchema = z.object({
    applicationId: uuidSchema,
  })

  export const rejectApplicationSchema = z.object({
    applicationId: uuidSchema,
  })

  export const cancelApplicationSchema = z.object({
    applicationId: uuidSchema,
    acknowledgedNoShowRisk: z.boolean().optional(),
  })
  ```

  **src/lib/errors/application-errors.ts:**
  ```typescript
  export type ApplicationErrorCode =
    | 'job_full'
    | 'already_applied'
    | 'job_not_active'
    | 'application_not_found'
    | 'application_not_owned'
    | 'job_not_owned'
    | 'invalid_state'
    | 'cancel_too_late'
    | 'check_in_time_window'
    | 'check_in_geofence'
    | 'check_out_time_window'
    | 'check_out_qr_invalid'
    | 'check_out_qr_expired'
    | 'unknown'

  export class ApplicationError extends Error {
    constructor(public readonly code: ApplicationErrorCode, message?: string) {
      super(message ?? code)
      this.name = 'ApplicationError'
    }
  }

  export function applicationErrorToKorean(code: ApplicationErrorCode): string {
    switch (code) {
      case 'job_full':               return '이미 마감된 공고입니다'
      case 'already_applied':        return '이미 지원하신 공고입니다'
      case 'job_not_active':         return '현재 지원할 수 없는 공고입니다'
      case 'application_not_found':  return '지원 내역을 찾을 수 없습니다'
      case 'application_not_owned':  return '본인의 지원만 수정할 수 있습니다'
      case 'job_not_owned':          return '본인의 공고만 관리할 수 있습니다'
      case 'invalid_state':          return '현재 상태에서 수행할 수 없는 작업입니다'
      case 'cancel_too_late':        return '근무 24시간 전이 지나 무료 취소할 수 없습니다'
      case 'check_in_time_window':   return '체크인 가능 시간이 아닙니다 (시작 10분 전 ~ 30분 후)'
      case 'check_in_geofence':      return '현장에 도착한 뒤 다시 시도해주세요'
      case 'check_out_time_window':  return '체크아웃 가능 시간이 아닙니다'
      case 'check_out_qr_invalid':   return 'QR 코드가 유효하지 않습니다. Business에게 QR을 다시 열어달라고 요청하세요'
      case 'check_out_qr_expired':   return 'QR 코드가 만료되었습니다. Business에게 QR을 다시 열어달라고 요청하세요'
      case 'unknown':                return '알 수 없는 오류가 발생했습니다'
    }
  }
  ```
  </action>
  <verify>
    <automated>bash -c 'npx tsc --noEmit src/lib/validations/application.ts src/lib/errors/application-errors.ts 2>&1 | head -20; test -f src/lib/validations/application.ts && test -f src/lib/errors/application-errors.ts && echo OK'</automated>
  </verify>
  <done>
    - 2 파일 존재, TypeScript 컴파일 OK
    - 4 Zod 스키마, ApplicationError class, applicationErrorToKorean 함수
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: queries.ts 확장 — getApplicationsByWorker (bucket) + getApplicationsByJob</name>
  <files>src/lib/db/queries.ts</files>
  <read_first>
    - src/lib/db/queries.ts (현재 APP_INCLUDE, adaptApplication 등)
    - prisma/schema.prisma (Application.status 가능 값)
    - .planning/phases/04-db/04-UI-SPEC.md (6 상태 × 색 매핑)
    - tests/applications/list-worker.test.ts (기대 시그니처)
    - tests/applications/list-biz.test.ts (기대 시그니처)
  </read_first>
  <behavior>
    - `getApplicationsByWorker(workerId: string, opts?: { bucket?: 'upcoming' | 'active' | 'done' })` returns Application[] with worker + job + business relations
    - bucket='upcoming' filters status IN (pending, confirmed), bucket='active' = in_progress, bucket='done' = completed + cancelled, undefined = all
    - `getApplicationsByJob(jobId: string)` returns Application[] with worker + workerProfile, ordered by appliedAt asc
  </behavior>
  <action>
  `src/lib/db/queries.ts` 파일에 기존 export 뒤로 아래 함수 추가:

  ```typescript
  import type { ApplicationStatus } from '@/generated/prisma/client'

  const UPCOMING_STATUSES: ApplicationStatus[] = ['pending', 'confirmed']
  const ACTIVE_STATUSES: ApplicationStatus[] = ['in_progress']
  const DONE_STATUSES: ApplicationStatus[] = ['completed', 'cancelled']

  export type ApplicationBucket = 'upcoming' | 'active' | 'done'

  /**
   * Phase 4 APPL-02: Fetch applications for a worker, optionally filtered by UI bucket.
   * Use bucket='upcoming' for "예정" tab, 'active' for "진행중", 'done' for "완료" tab.
   */
  export async function getApplicationsByWorker(
    workerId: string,
    opts: { bucket?: ApplicationBucket } = {},
  ) {
    const statusFilter =
      opts.bucket === 'upcoming' ? { in: UPCOMING_STATUSES } :
      opts.bucket === 'active'   ? { in: ACTIVE_STATUSES } :
      opts.bucket === 'done'     ? { in: DONE_STATUSES } :
      undefined

    return prisma.application.findMany({
      where: {
        workerId,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      include: {
        job: { include: { business: true } },
      },
      orderBy: [
        { appliedAt: 'desc' },
      ],
    })
  }

  /**
   * Phase 4 APPL-03: Fetch all applications for a specific job (Business view).
   * Ordered by appliedAt ascending so Biz sees oldest first (FIFO fairness).
   */
  export async function getApplicationsByJob(jobId: string) {
    return prisma.application.findMany({
      where: { jobId },
      include: {
        worker: {
          include: { workerProfile: true },
        },
      },
      orderBy: { appliedAt: 'asc' },
    })
  }
  ```

  또한 기존 `adaptApplication` 함수에 'pending' status UI mapping이 이미 반영되어 있는지 확인 — Plan 02 Task 3에서 이미 types/job.ts에 pending을 추가했으므로, `adaptApplication` return object의 status 필드가 string union 타입으로 전달되는지만 확인.
  </action>
  <verify>
    <automated>bash -c 'grep -q "getApplicationsByWorker" src/lib/db/queries.ts && grep -q "getApplicationsByJob" src/lib/db/queries.ts && grep -q "ApplicationBucket" src/lib/db/queries.ts && npx tsc --noEmit 2>&1 | grep "src/lib/db/queries.ts" | head -5 || echo "no queries.ts errors"'</automated>
  </verify>
  <done>
    - 2개 함수 export
    - 타입 호환, 컴파일 OK
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: applyOneTap Server Action — atomic concurrency-safe</name>
  <files>src/app/(worker)/posts/[id]/apply/actions.ts</files>
  <read_first>
    - src/app/(worker)/posts/[id]/apply/apply-confirm-flow.tsx (기존 mock setTimeout)
    - .planning/phases/04-db/04-CONTEXT.md D-04, D-05 (atomic UPDATE 전문)
    - .planning/phases/04-db/04-RESEARCH.md Pattern 1 (Atomic One-Tap Apply code)
    - src/app/biz/posts/actions.ts (Phase 3 Server Action 패턴)
    - tests/applications/apply-one-tap.test.ts, apply-race.test.ts, apply-duplicate.test.ts, headcount-fill.test.ts
    - node_modules/next/dist/docs/01-app/02-guides/server-actions.md (Next 16 Server Actions)
  </read_first>
  <behavior>
    - `applyOneTap({ jobId })` Zod 검증 후 requireWorker 세션 확보
    - `prisma.$transaction` interactive 안에서 Step 1 atomic UPDATE (`filled < headcount AND status='active'` guard + increment + 마감 전이), Step 2 INSERT ON CONFLICT DO NOTHING
    - Step 1 affected=0 → throw ApplicationError('job_full') → 트랜잭션 롤백
    - Step 2 affected=0 (already applied) → throw ApplicationError('already_applied') → 트랜잭션 롤백 (filled 증가도 롤백됨)
    - 성공시 revalidatePath('/my/applications'), `{ success: true, applicationId }`
    - 실패시 `{ success: false, error: ApplicationErrorCode }`
    - Push trigger는 TODO 주석으로 남김 (Plan 06에서 추가)
  </behavior>
  <action>
  파일 생성:

  ```typescript
  'use server'

  import { prisma } from '@/lib/db'
  import { Prisma } from '@/generated/prisma/client'
  import { requireWorker } from '@/lib/dal'
  import { revalidatePath } from 'next/cache'
  import { applyOneTapSchema, type ApplyOneTapInput } from '@/lib/validations/application'
  import { ApplicationError, type ApplicationErrorCode } from '@/lib/errors/application-errors'

  export type ApplyResult =
    | { success: true; applicationId: string }
    | { success: false; error: ApplicationErrorCode }

  /**
   * APPL-01: 원탭 지원 — atomic concurrency-safe.
   *
   * Flow (all inside one prisma.$transaction):
   *   1. UPDATE jobs SET filled = filled + 1, status = (filled+1>=headcount ? 'filled' : status)
   *      WHERE id = $jobId AND filled < headcount AND status = 'active'
   *      RETURNING ...
   *      → 0 rows = throw 'job_full'
   *   2. INSERT INTO applications (..., status='pending') ON CONFLICT (jobId, workerId) DO NOTHING
   *      → 0 rows = throw 'already_applied' → tx rollback = seat released
   *
   * Why raw SQL: Prisma Client cannot express conditional CASE on UPDATE with RETURNING. Raw is
   * the only path that gives both atomicity and ON CONFLICT semantics in a single round-trip per step.
   */
  export async function applyOneTap(input: ApplyOneTapInput): Promise<ApplyResult> {
    const parsed = applyOneTapSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: 'unknown' }
    }
    const { jobId } = parsed.data
    const session = await requireWorker()

    try {
      const applicationId = await prisma.$transaction(async (tx) => {
        // Step 1: atomic capacity check + increment + auto-fill transition
        const seatRows = await tx.$queryRaw<
          { id: string; filled: number; headcount: number; status: string }[]
        >(Prisma.sql`
          UPDATE public.jobs
          SET filled = filled + 1,
              status = CASE WHEN filled + 1 >= headcount THEN 'filled' ELSE status END,
              "updatedAt" = now()
          WHERE id = ${jobId}::uuid
            AND filled < headcount
            AND status = 'active'
          RETURNING id, filled, headcount, status
        `)
        if (seatRows.length === 0) {
          throw new ApplicationError('job_full')
        }

        // Step 2: insert application with ON CONFLICT guard
        const appRows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
          INSERT INTO public.applications (id, "jobId", "workerId", status, "appliedAt")
          VALUES (gen_random_uuid(), ${jobId}::uuid, ${session.id}::uuid, 'pending', now())
          ON CONFLICT ("jobId", "workerId") DO NOTHING
          RETURNING id
        `)
        if (appRows.length === 0) {
          // Compensate: throwing rolls back the filled++ from Step 1
          throw new ApplicationError('already_applied')
        }

        return appRows[0].id
      })

      // Non-DB follow-ups after commit
      revalidatePath('/my/applications')
      revalidatePath(`/posts/${jobId}`)
      // TODO(Plan 06): sendPushToUser(jobAuthorId, { type: 'new-application', jobId })
      //                — notify Biz of new applicant via Web Push

      return { success: true, applicationId }
    } catch (e) {
      if (e instanceof ApplicationError) {
        return { success: false, error: e.code }
      }
      console.error('[applyOneTap] unexpected error', e)
      return { success: false, error: 'unknown' }
    }
  }
  ```

  **주의사항:**
  - `requireWorker()`는 dal.ts가 cache()로 감싼 세션 확보 함수. 이미 `'server-only'` guarded
  - `Prisma.sql` template literal + `::uuid` cast 필수 — string을 uuid 컬럼에 바인드하려면
  - `revalidatePath`는 `next/cache`에서 (Next 16 Previous Model — cacheComponents OFF)
  - `node_modules/next/dist/docs/01-app/02-guides/server-actions.md` 읽고 `'use server'` 위치 확인
  </action>
  <verify>
    <automated>bash -c 'test -f "src/app/(worker)/posts/[id]/apply/actions.ts" && grep -q "use server" "src/app/(worker)/posts/[id]/apply/actions.ts" && grep -q "applyOneTap" "src/app/(worker)/posts/[id]/apply/actions.ts" && grep -q "\\$transaction" "src/app/(worker)/posts/[id]/apply/actions.ts" && npm test -- tests/applications/apply-one-tap tests/applications/apply-race tests/applications/apply-duplicate tests/applications/headcount-fill --run 2>&1 | tail -20'</automated>
  </verify>
  <done>
    - applyOneTap 함수 작성
    - tests/applications/apply-one-tap.test.ts GREEN
    - tests/applications/apply-race.test.ts GREEN (10 concurrent → 5 success / 5 job_full)
    - tests/applications/apply-duplicate.test.ts GREEN
    - tests/applications/headcount-fill.test.ts GREEN
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: acceptApplication + rejectApplication Server Actions</name>
  <files>src/app/biz/posts/[id]/applicants/actions.ts</files>
  <read_first>
    - src/lib/dal.ts (requireJobOwner 사용)
    - .planning/phases/04-db/04-CONTEXT.md D-04 (rejection time filled-- 로직)
    - tests/applications/accept-reject.test.ts
    - src/app/biz/posts/actions.ts (Phase 3 Biz Server Action 패턴)
  </read_first>
  <behavior>
    - `acceptApplication(applicationId)`: 현재 세션이 해당 application의 job.authorId와 일치 확인 → application.status를 pending|confirmed → confirmed 전이 (confirmed면 idempotent). pending에서만 UPDATE 수행, 다른 상태에서는 'invalid_state' 에러
    - `rejectApplication(applicationId)`: pending 또는 confirmed → cancelled 전이 + jobs.filled -1 + (job.status='filled'였으면 'active'로 re-open) 원자적
    - 둘 다 requireJobOwner-equivalent 체크: application의 job을 fetch하고 job.authorId === session.id 확인. 아니면 ApplicationError('job_not_owned')
    - 성공 후 `revalidatePath('/biz/posts/[id]/applicants')` + `revalidatePath('/my/applications')` (Realtime이 Worker side 업데이트를 보완)
  </behavior>
  <action>
  파일 생성:

  ```typescript
  'use server'

  import { prisma } from '@/lib/db'
  import { Prisma } from '@/generated/prisma/client'
  import { requireBusiness } from '@/lib/dal'
  import { revalidatePath } from 'next/cache'
  import { acceptApplicationSchema, rejectApplicationSchema } from '@/lib/validations/application'
  import { ApplicationError, type ApplicationErrorCode } from '@/lib/errors/application-errors'

  export type ActionResult =
    | { success: true }
    | { success: false; error: ApplicationErrorCode }

  async function loadAppAndVerifyOwner(applicationId: string, sessionUserId: string) {
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: { select: { id: true, authorId: true, status: true, filled: true, headcount: true } } },
    })
    if (!app) throw new ApplicationError('application_not_found')
    if (app.job.authorId !== sessionUserId) throw new ApplicationError('job_not_owned')
    return app
  }

  /**
   * APPL-04: Business accepts a pending application → confirmed.
   * Idempotent: calling on already-confirmed application is a no-op success.
   */
  export async function acceptApplication(applicationId: string): Promise<ActionResult> {
    const parsed = acceptApplicationSchema.safeParse({ applicationId })
    if (!parsed.success) return { success: false, error: 'unknown' }
    const session = await requireBusiness()

    try {
      const app = await loadAppAndVerifyOwner(applicationId, session.id)
      if (app.status === 'confirmed') {
        // Already accepted — idempotent
        revalidatePath(`/biz/posts/${app.jobId}/applicants`)
        return { success: true }
      }
      if (app.status !== 'pending') {
        throw new ApplicationError('invalid_state')
      }

      await prisma.application.update({
        where: { id: applicationId },
        data: { status: 'confirmed' },
      })

      revalidatePath(`/biz/posts/${app.jobId}/applicants`)
      revalidatePath('/my/applications')
      // TODO(Plan 06): sendPushToUser(app.workerId, { type: 'accepted', jobTitle: ... })

      return { success: true }
    } catch (e) {
      if (e instanceof ApplicationError) return { success: false, error: e.code }
      console.error('[acceptApplication]', e)
      return { success: false, error: 'unknown' }
    }
  }

  /**
   * APPL-04: Business rejects a pending/confirmed application → cancelled.
   * Atomically decrements jobs.filled and re-opens the job if it was previously marked 'filled'.
   */
  export async function rejectApplication(applicationId: string): Promise<ActionResult> {
    const parsed = rejectApplicationSchema.safeParse({ applicationId })
    if (!parsed.success) return { success: false, error: 'unknown' }
    const session = await requireBusiness()

    try {
      const app = await loadAppAndVerifyOwner(applicationId, session.id)
      if (app.status !== 'pending' && app.status !== 'confirmed') {
        throw new ApplicationError('invalid_state')
      }

      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw(Prisma.sql`
          UPDATE public.applications
          SET status = 'cancelled'
          WHERE id = ${applicationId}::uuid
        `)
        await tx.$executeRaw(Prisma.sql`
          UPDATE public.jobs
          SET filled = GREATEST(filled - 1, 0),
              status = CASE WHEN status = 'filled' THEN 'active' ELSE status END,
              "updatedAt" = now()
          WHERE id = ${app.jobId}::uuid
        `)
      })

      revalidatePath(`/biz/posts/${app.jobId}/applicants`)
      revalidatePath('/my/applications')
      // TODO(Plan 06): sendPushToUser(app.workerId, { type: 'rejected', jobTitle: ... })

      return { success: true }
    } catch (e) {
      if (e instanceof ApplicationError) return { success: false, error: e.code }
      console.error('[rejectApplication]', e)
      return { success: false, error: 'unknown' }
    }
  }
  ```
  </action>
  <verify>
    <automated>bash -c 'test -f "src/app/biz/posts/[id]/applicants/actions.ts" && grep -q "acceptApplication" "src/app/biz/posts/[id]/applicants/actions.ts" && grep -q "rejectApplication" "src/app/biz/posts/[id]/applicants/actions.ts" && npm test -- tests/applications/accept-reject --run 2>&1 | tail -15'</automated>
  </verify>
  <done>
    - 2개 Server Action export
    - tests/applications/accept-reject.test.ts GREEN
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 5: cancelApplication (Worker-initiated) Server Action</name>
  <files>src/app/(worker)/my/applications/actions.ts</files>
  <read_first>
    - src/lib/dal.ts (requireApplicationOwner)
    - .planning/phases/04-db/04-CONTEXT.md D-21 (24h rule), D-22 (noShowCount)
    - tests/applications/accept-reject.test.ts (cancel worker 시나리오가 있으면)
  </read_first>
  <behavior>
    - `cancelApplication(applicationId, opts?)`: Worker만 자기 application에 호출 가능
    - 현재 시각이 workDate + startTime - 24h 이전 → 자유 취소 (status='cancelled' + filled--)
    - 24h 이내 → `acknowledgedNoShowRisk` flag가 true여야 진행 (아니면 'cancel_too_late' 에러로 반환)
    - acknowledgedNoShowRisk=true인 경우: status='cancelled' + filled-- + workerProfile.noShowCount++ (UI에서 경고 모달 표시 후 호출)
    - confirmed/pending 외 상태에서 호출시 'invalid_state'
  </behavior>
  <action>
  파일 생성:

  ```typescript
  'use server'

  import { prisma } from '@/lib/db'
  import { Prisma } from '@/generated/prisma/client'
  import { requireWorker } from '@/lib/dal'
  import { revalidatePath } from 'next/cache'
  import { cancelApplicationSchema } from '@/lib/validations/application'
  import { ApplicationError, type ApplicationErrorCode } from '@/lib/errors/application-errors'

  export type CancelResult =
    | { success: true; noShowCounted: boolean }
    | { success: false; error: ApplicationErrorCode }

  function combineWorkDateTime(workDate: Date, startTime: string): Date {
    // workDate is midnight UTC from prisma, startTime is "HH:MM" local (UTC in DB per Phase 3 seed)
    const [h, m] = startTime.split(':').map(Number)
    const combined = new Date(workDate)
    combined.setUTCHours(h, m, 0, 0)
    return combined
  }

  /**
   * Worker-initiated cancel. D-21 24-hour rule + D-22 noShowCount.
   */
  export async function cancelApplication(
    applicationId: string,
    opts: { acknowledgedNoShowRisk?: boolean } = {},
  ): Promise<CancelResult> {
    const parsed = cancelApplicationSchema.safeParse({ applicationId, ...opts })
    if (!parsed.success) return { success: false, error: 'unknown' }
    const session = await requireWorker()

    try {
      const app = await prisma.application.findUnique({
        where: { id: applicationId },
        include: { job: { select: { id: true, workDate: true, startTime: true } } },
      })
      if (!app) throw new ApplicationError('application_not_found')
      if (app.workerId !== session.id) throw new ApplicationError('application_not_owned')
      if (app.status !== 'pending' && app.status !== 'confirmed') {
        throw new ApplicationError('invalid_state')
      }

      const workStartAt = combineWorkDateTime(app.job.workDate, app.job.startTime)
      const cancelDeadline = new Date(workStartAt.getTime() - 24 * 60 * 60 * 1000)
      const now = new Date()

      const isLate = now > cancelDeadline
      if (isLate && !opts.acknowledgedNoShowRisk) {
        return { success: false, error: 'cancel_too_late' }
      }

      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw(Prisma.sql`
          UPDATE public.applications SET status = 'cancelled' WHERE id = ${applicationId}::uuid
        `)
        await tx.$executeRaw(Prisma.sql`
          UPDATE public.jobs
          SET filled = GREATEST(filled - 1, 0),
              status = CASE WHEN status = 'filled' THEN 'active' ELSE status END,
              "updatedAt" = now()
          WHERE id = ${app.jobId}::uuid
        `)
        if (isLate) {
          await tx.$executeRaw(Prisma.sql`
            UPDATE public.worker_profiles
            SET "noShowCount" = "noShowCount" + 1,
                "updatedAt" = now()
            WHERE "userId" = ${session.id}::uuid
          `)
        }
      })

      revalidatePath('/my/applications')
      revalidatePath(`/biz/posts/${app.jobId}/applicants`)

      return { success: true, noShowCounted: isLate }
    } catch (e) {
      if (e instanceof ApplicationError) return { success: false, error: e.code }
      console.error('[cancelApplication]', e)
      return { success: false, error: 'unknown' }
    }
  }
  ```
  </action>
  <verify>
    <automated>bash -c 'test -f "src/app/(worker)/my/applications/actions.ts" && grep -q "cancelApplication" "src/app/(worker)/my/applications/actions.ts" && grep -q "acknowledgedNoShowRisk" "src/app/(worker)/my/applications/actions.ts" && npx tsc --noEmit 2>&1 | grep "my/applications/actions.ts" | head -5 || echo "no cancel errors"'</automated>
  </verify>
  <done>
    - cancelApplication export
    - 24h rule + noShowCount 분기
    - TypeScript 컴파일 OK
  </done>
</task>

<task type="auto">
  <name>Task 6: list-worker, list-biz, auto-accept-cron tests GREEN 확인</name>
  <files>(verification only)</files>
  <read_first>
    - tests/applications/list-worker.test.ts
    - tests/applications/list-biz.test.ts
    - tests/applications/auto-accept-cron.test.ts
  </read_first>
  <action>
  Task 2가 queries.ts를 확장했으므로 list-worker/list-biz 테스트가 GREEN이어야 한다. auto-accept-cron 테스트는 DB에 직접 INSERT + 수동 SQL UPDATE를 호출하므로 Plan 03의 cron 스케줄이 적용되어 있으면 통과.

  실행:
  ```
  npm test -- tests/applications --run
  ```

  전체 8개 파일이 GREEN이어야 한다. 하나라도 RED면 실패 메시지를 분석:
  - `list-worker.test.ts` RED → queries.ts bucket 매핑 확인
  - `list-biz.test.ts` RED → getApplicationsByJob include shape 확인
  - `auto-accept-cron.test.ts` RED → Plan 03 SQL이 적용되었는지, 테스트 파일이 적용된 cron SQL을 verbatim으로 복사해서 실행하는지 확인

  실패 원인이 applyOneTap/accept/reject 구현 버그이면 해당 Task (3/4/5)로 돌아가 수정.
  </action>
  <verify>
    <automated>npm test -- tests/applications --run 2>&1 | tail -30</automated>
  </verify>
  <done>
    - tests/applications/ 8개 파일 전부 PASS
    - 0 failing
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Client → applyOneTap Server Action | Untrusted input (jobId) → Zod validation → dal requireWorker → raw SQL with parameter binding |
| Worker role → cancel own application only | requireApplicationOwner + explicit workerId match |
| Business role → accept/reject own job's applications only | requireBusiness + job.authorId match |
| pg_cron (trusted internal) → applications | Different threat surface, handled in Plan 03 |

## STRIDE Threat Register

| ID | Category | Component | Disposition | Mitigation |
|----|----------|-----------|-------------|------------|
| T-04-17 | Tampering | jobId parameter spoofing | mitigate | Zod UUID schema + Prisma.sql parameter binding (no string concat) |
| T-04-18 | Elevation of Privilege | Worker trying to accept another worker's application | mitigate | loadAppAndVerifyOwner checks job.authorId === session.id for Biz actions; cancelApplication checks app.workerId === session.id |
| T-04-19 | Race Condition | Concurrent applyOneTap beyond headcount | mitigate | Atomic UPDATE with `filled < headcount` guard + RETURNING (single round-trip lock-free) — tested in apply-race.test.ts |
| T-04-20 | Business Logic Bypass | Worker cancelling confirmed app in work-window | mitigate | cancelApplication throws invalid_state on status != pending/confirmed (once in_progress, only checkOut flow mutates) |
| T-04-21 | Info Disclosure | Error messages leaking internal state | mitigate | ApplicationErrorCode is a finite enum; applicationErrorToKorean returns user-safe messages; no stack traces returned |
| T-04-22 | Denial of Service | applyOneTap spam to inflate filled counter | accept | RLS INSERT policy requires auth.uid()=workerId; unique (jobId, workerId) prevents same-user spam; cross-worker spam limited by account creation rate (Phase 2 supabase-auth rate limit) |
| T-04-23 | Repudiation | Business claiming they never accepted | accept | Application.status + updatedAt provides audit trail; Phase 5 review adds further history |
</threat_model>

<verification>
- `tests/applications/*.test.ts` 8/8 GREEN (the core acceptance criterion for this plan)
- `npx tsc --noEmit` pass for touched files
- Manual sanity: applyOneTap → accept → check `public.applications.status='confirmed'` via prisma studio
</verification>

<success_criteria>
- [x] 3 action files created, all `'use server'`
- [x] queries.ts extended with getApplicationsByWorker(bucket) + getApplicationsByJob
- [x] validation + errors 모듈 생성
- [x] All 8 tests/applications/*.test.ts files GREEN
- [x] No push-related TODOs resolved yet (Plan 06 will wire them)
</success_criteria>

<output>
After completion, create `.planning/phases/04-db/04-04-SUMMARY.md` with:
- 3 action files + signatures
- Link to test GREEN output
- Known TODOs: sendPushToUser wiring (Plan 06), cancel modal UI (Plan 08)
</output>
