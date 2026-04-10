---
phase: 04-db
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - prisma/schema.prisma
  - src/lib/dal.ts
  - src/lib/types/job.ts
  - src/generated/prisma
autonomous: true
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
    - "ApplicationStatus enum에 pending이 첫 번째 값으로 추가되었고, Application.status 기본값이 pending이다"
    - "WorkerProfile 모델에 noShowCount Int @default(0) 컬럼이 추가되었다"
    - "PushSubscription Prisma 모델이 생성되어 User 1:N 관계를 가진다"
    - "npx prisma db push가 성공하고 Supabase DB에 스키마가 반영되어 있다 (drift 0)"
    - "src/lib/dal.ts에 requireApplicationOwner(applicationId)와 requireJobOwner(jobId) 함수가 export된다"
    - "src/lib/types/job.ts의 Application 인터페이스 status 타입에 'pending'이 포함된다"
  artifacts:
    - path: "prisma/schema.prisma"
      provides: "ApplicationStatus.pending, WorkerProfile.noShowCount, PushSubscription model"
      contains: "model PushSubscription"
    - path: "src/lib/dal.ts"
      provides: "requireApplicationOwner, requireJobOwner helpers"
      exports: ["requireApplicationOwner", "requireJobOwner"]
    - path: "src/generated/prisma"
      provides: "prisma client with new enum value + PushSubscription delegate"
  key_links:
    - from: "src/lib/dal.ts"
      to: "prisma.application / prisma.job"
      via: "owner lookup"
      pattern: "findUnique"
    - from: "prisma/schema.prisma"
      to: "Supabase Postgres"
      via: "npx prisma db push"
      pattern: "ApplicationStatus"
---

<objective>
Prisma 스키마 3가지 변경(ApplicationStatus.pending, WorkerProfile.noShowCount, PushSubscription 모델)을 적용하고, src/lib/dal.ts에 2개 오너십 헬퍼를 추가하며, 마지막에 `npx prisma db push`로 Supabase에 동기화한다.

Purpose: Wave 2의 Supabase SQL 마이그레이션(applications RLS, pg_cron)이 enum 값 'pending'을 참조하므로 먼저 Prisma push가 완료되어야 한다. dal.ts 확장은 Wave 3의 Server Actions이 오너십 체크를 중앙 헬퍼로 호출할 수 있게 한다.
Output: 3가지 스키마 변경 반영된 Prisma 스키마 + generated client + Supabase DB, dal.ts 확장.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/04-db/04-CONTEXT.md
@.planning/phases/04-db/04-RESEARCH.md
@prisma/schema.prisma
@src/lib/dal.ts
@src/lib/types/job.ts
@src/generated/prisma/client.ts
@.planning/phases/02-supabase-prisma-auth/02-02-SUMMARY.md
@.planning/phases/03-db/03-01-SUMMARY.md

<interfaces>
Current ApplicationStatus enum (before Phase 4):
```prisma
enum ApplicationStatus {
  confirmed
  in_progress
  checked_in  // legacy, unused
  completed
  cancelled
}
```

Current WorkerProfile model has: id, userId, name, nickname, avatar, bio, preferredCategories, badgeLevel, rating, totalJobs, completionRate, createdAt, updatedAt.

Current dal.ts exports: `verifySession`, `requireWorker`, `requireBusiness` (all `cache()`-wrapped, redirect-based).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Prisma schema — ApplicationStatus.pending + default</name>
  <files>prisma/schema.prisma</files>
  <read_first>
    - prisma/schema.prisma (현재 enum ApplicationStatus + Application model)
    - .planning/phases/04-db/04-CONTEXT.md (D-01 enum 순서, default pending)
  </read_first>
  <behavior>
    - enum ApplicationStatus의 첫 번째 값이 `pending`이다
    - enum에 기존 5개 값(confirmed, in_progress, checked_in, completed, cancelled)이 모두 보존된다
    - `checked_in`에 `// deprecated - use in_progress (Phase 5 removal candidate)` 주석이 달린다
    - Application 모델의 `status ApplicationStatus @default(confirmed)` 가 `@default(pending)`로 변경된다
  </behavior>
  <action>
  `prisma/schema.prisma` 파일을 열고:

  1. `enum ApplicationStatus { confirmed ... }` 블록을 아래로 교체:
     ```prisma
     enum ApplicationStatus {
       pending       // NEW Phase 4 — default state after one-tap apply (auto-accept timer or manual accept → confirmed)
       confirmed
       in_progress
       checked_in    // deprecated - use in_progress (Phase 5 removal candidate)
       completed
       cancelled
     }
     ```

  2. `model Application { ... }` 블록 안에서 아래 라인을 변경:
     - 이전: `status          ApplicationStatus  @default(confirmed)`
     - 이후: `status          ApplicationStatus  @default(pending)`

  3. `npx prisma format` 실행 (indent 정리)
  4. `npx prisma validate` 실행 (스키마 유효성)

  아직 `prisma generate`나 `db push`는 실행하지 않는다 (Task 3/5에서 batch).
  </action>
  <verify>
    <automated>bash -c 'grep -n "pending\s*//" prisma/schema.prisma && grep -q "@default(pending)" prisma/schema.prisma && npx prisma validate 2>&1 | tail -5'</automated>
  </verify>
  <done>
    - enum 첫 줄이 `pending` + 주석
    - Application.status 기본값이 pending
    - `prisma validate` exit 0
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Prisma schema — WorkerProfile.noShowCount + PushSubscription model + User 역관계</name>
  <files>prisma/schema.prisma</files>
  <read_first>
    - prisma/schema.prisma (현재 WorkerProfile, User model)
    - .planning/phases/04-db/04-CONTEXT.md (D-20 PushSubscription 정의, D-22 noShowCount)
  </read_first>
  <behavior>
    - WorkerProfile 모델에 `noShowCount Int @default(0)` 필드가 존재한다
    - PushSubscription 모델이 존재하며 id/userId/endpoint(unique)/p256dh/auth/createdAt/lastUsedAt?/user 관계 필드를 가진다
    - User 모델에 `pushSubscriptions PushSubscription[]` 역관계가 추가된다
    - `@@index([userId])` 와 `@@map("push_subscriptions")` 적용
  </behavior>
  <action>
  `prisma/schema.prisma` 파일에서:

  1. **WorkerProfile 모델**: `completionRate Int @default(0)` 줄 바로 아래에 추가
     ```prisma
       noShowCount         Int         @default(0)   // Phase 4 D-22 — auto-incremented by pg_cron no-show detection
     ```

  2. **User 모델**: 기존 관계 필드들 아래 (예: `reviewsReceived ...` 다음 줄)에 추가:
     ```prisma
       pushSubscriptions PushSubscription[]
     ```

  3. **Review 모델 뒤에** (파일 끝에 가까운 위치에) 새 모델 추가:
     ```prisma
     // ============================================================================
     // Phase 4 D-20 — Web Push subscriptions
     // ============================================================================

     model PushSubscription {
       id         String    @id @default(uuid()) @db.Uuid
       userId     String    @db.Uuid
       user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
       endpoint   String    @unique
       p256dh     String
       auth       String
       createdAt  DateTime  @default(now())
       lastUsedAt DateTime?

       @@index([userId])
       @@map("push_subscriptions")
     }
     ```

  4. `npx prisma format` 실행
  5. `npx prisma validate` 실행
  </action>
  <verify>
    <automated>bash -c 'grep -q "noShowCount\s*Int\s*@default(0)" prisma/schema.prisma && grep -q "model PushSubscription" prisma/schema.prisma && grep -q "pushSubscriptions PushSubscription\[\]" prisma/schema.prisma && grep -q "@@map(\"push_subscriptions\")" prisma/schema.prisma && npx prisma validate 2>&1 | tail -5'</automated>
  </verify>
  <done>
    - 3가지 변경 모두 존재
    - prisma validate exit 0
  </done>
</task>

<task type="auto">
  <name>Task 3: Prisma generate + Application 타입 업데이트</name>
  <files>src/generated/prisma (auto), src/lib/types/job.ts</files>
  <read_first>
    - src/lib/types/job.ts (현재 Application/ApplicationStatus 타입 정의)
    - src/lib/db/queries.ts (adaptApplication 함수 — status mapping)
  </read_first>
  <action>
  1. `npx prisma generate` 실행 — `src/generated/prisma/` 갱신

  2. `src/lib/types/job.ts` 열어서 UI용 Application status 타입에 'pending'을 추가한다. 기존 파일을 검사해서 `export type ApplicationStatus = 'confirmed' | 'in_progress' | 'checked_in' | 'completed' | 'cancelled'` 같은 string literal union이 있으면 `'pending'`을 맨 앞에 추가:
     ```typescript
     export type ApplicationStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
     // checked_in intentionally omitted from UI type — deprecated, see prisma schema comment
     ```

  3. `ApplicationStatusBucket` (예정/진행중/완료) 혹은 이에 해당하는 bucket type이 있으면 pending을 "예정" 버킷에 매핑:
     ```typescript
     // UI bucket mapping — D-01, UI-SPEC 6 상태 x 색 매핑
     export const STATUS_TO_BUCKET: Record<ApplicationStatus, 'upcoming' | 'active' | 'done'> = {
       pending: 'upcoming',     // "대기 중" - auto-accept timer running
       confirmed: 'upcoming',   // "수락됨"
       in_progress: 'active',   // "근무 중"
       completed: 'done',       // "완료"
       cancelled: 'done',       // "취소됨" - shown in done tab for history
     }
     ```
     만약 기존 파일에 bucket mapping이 없다면 새로 추가한다. 기존 매핑이 있으면 pending 행만 추가한다.

  4. `npx tsc --noEmit` 실행 — TypeScript 에러 없음 확인 (만약 다른 파일에서 ApplicationStatus switch 문이 non-exhaustive로 에러를 내면 이 plan의 범위는 아니므로 기록만 하고 Plan 08/09에서 해결).
  </action>
  <verify>
    <automated>bash -c 'test -d src/generated/prisma && grep -q "pending" src/generated/prisma/client.ts 2>/dev/null || grep -rq "pending" src/generated/prisma/ && grep -q "pending" src/lib/types/job.ts && echo OK'</automated>
  </verify>
  <done>
    - `src/generated/prisma/` 에 ApplicationStatus.pending 반영
    - `src/lib/types/job.ts` UI 타입 pending 포함
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: dal.ts 확장 — requireApplicationOwner + requireJobOwner</name>
  <files>src/lib/dal.ts</files>
  <read_first>
    - src/lib/dal.ts (현재 verifySession / requireWorker / requireBusiness)
    - .planning/phases/04-db/04-CONTEXT.md (D-18 signatures)
    - src/generated/prisma/client.ts (Application, Job 타입)
  </read_first>
  <behavior>
    - `requireApplicationOwner(applicationId: string)` 는 현재 세션이 application.workerId와 일치하면 {session, application}을 반환하고, 아니면 redirect('/login?error=application_not_owned')
    - `requireJobOwner(jobId: string)` 는 현재 세션이 job.authorId와 일치하면 {session, job}을 반환하고, 아니면 redirect('/login?error=job_not_owned')
    - 둘 다 React `cache()` 로 감싸진다 (Phase 2 패턴 일치)
    - 기존 exports (verifySession, requireWorker, requireBusiness)는 변경하지 않는다
  </behavior>
  <action>
  `src/lib/dal.ts` 파일 끝에 아래 헬퍼 2개를 추가한다. 기존 코드는 그대로 유지.

  ```typescript
  import type { Application, Job } from '@/generated/prisma/client'

  /**
   * Phase 4 D-18 — Ensure the current session owns the application.
   * Used by: checkIn, checkOut, cancelApplication Server Actions (Worker side).
   * Redirects to /login?error=application_not_owned if not owned or not found.
   */
  export const requireApplicationOwner = cache(async (applicationId: string): Promise<{ session: Awaited<ReturnType<typeof verifySession>>; application: Application }> => {
    const session = await requireWorker()
    const application = await prisma.application.findUnique({ where: { id: applicationId } })
    if (!application) {
      redirect('/login?error=application_not_found')
    }
    if (application.workerId !== session.id) {
      redirect('/login?error=application_not_owned')
    }
    return { session, application }
  })

  /**
   * Phase 4 D-18 — Ensure the current session owns the job (as author).
   * Used by: acceptApplication, rejectApplication, generateCheckoutQrToken (Business side).
   */
  export const requireJobOwner = cache(async (jobId: string): Promise<{ session: Awaited<ReturnType<typeof verifySession>>; job: Job }> => {
    const session = await requireBusiness()
    const job = await prisma.job.findUnique({ where: { id: jobId } })
    if (!job) {
      redirect('/login?error=job_not_found')
    }
    if (job.authorId !== session.id) {
      redirect('/login?error=job_not_owned')
    }
    return { session, job }
  })
  ```

  **중요:**
  - `redirect()` 후 코드는 unreachable이므로 TypeScript에게 narrow를 알려주기 위해 redirect 다음에 `return` 없이 바로 throw는 하지 않는다 (Next.js redirect는 내부적으로 throw). 위 코드는 그대로 작동.
  - import에 `Application, Job` 추가 (이미 `prisma`는 import 되어 있음).
  - TypeScript 에러 발생시 `Awaited<ReturnType<typeof verifySession>>` 대신 `{ id: string; email: string | null; role: UserRole }` 구체 타입을 인라인으로 쓸 것 (executor 판단).
  </action>
  <verify>
    <automated>bash -c 'grep -q "requireApplicationOwner" src/lib/dal.ts && grep -q "requireJobOwner" src/lib/dal.ts && grep -q "application_not_owned" src/lib/dal.ts && npx tsc --noEmit 2>&1 | grep "src/lib/dal.ts" | head -5 || echo "no dal.ts errors"'</automated>
  </verify>
  <done>
    - 2개 새 함수 export
    - TypeScript 컴파일 에러 없음 (dal.ts 파일 한정)
  </done>
</task>

<task type="auto">
  <name>Task 5: [BLOCKING] Prisma db push to Supabase</name>
  <files>prisma/schema.prisma</files>
  <read_first>
    - prisma/schema.prisma (최종 상태 — Task 1/2 후)
    - prisma.config.ts (datasource/directUrl 확인)
    - .env.local (DATABASE_URL / DIRECT_URL 설정 확인)
    - .planning/phases/02-supabase-prisma-auth/02-02-SUMMARY.md (Phase 2 initial push 로그 참고)
  </read_first>
  <action>
  **[BLOCKING] 이 태스크는 Wave 2 Supabase SQL 마이그레이션이 실행되기 전에 반드시 완료되어야 한다.**

  1. `.env.local`에 DATABASE_URL이 설정되어 있는지 확인 (없으면 중단하고 에러 리포트).
  2. 실행:
     ```
     npx prisma db push
     ```
  3. 출력에서 다음을 확인:
     - `ApplicationStatus` enum 변경이 reflected
     - `push_subscriptions` 테이블 생성
     - `worker_profiles.noShowCount` 컬럼 추가
     - "Your database is now in sync with your Prisma schema." 메시지
  4. 드리프트 확인:
     ```
     npx prisma db pull --print
     ```
     출력이 현재 schema.prisma와 의미적으로 같음을 확인 (format 차이는 무시).
  5. 검증 SQL (optional, 안전망):
     ```
     npx prisma db execute --stdin <<EOF
     SELECT column_name FROM information_schema.columns WHERE table_name='push_subscriptions' AND table_schema='public';
     EOF
     ```
     id, userId, endpoint, p256dh, auth, createdAt, lastUsedAt 7개 컬럼 기대.

  **실패시 (non-TTY 환경):** `db push`가 interactive confirmation을 요청할 수 있음. `--accept-data-loss` 플래그는 사용하지 않는다 (모든 변경은 additive, 데이터 손실 없음). 만약 destructive 경고가 나오면 절대 무시하지 말고 스키마 변경을 재확인한다.

  **ApplicationStatus enum 추가의 호환성:** Postgres에서 enum에 새 값 추가는 `ALTER TYPE ... ADD VALUE`로 수행되며 existing data와 호환된다. 기본값 변경은 `ALTER TABLE applications ALTER COLUMN status SET DEFAULT 'pending'`로 수행된다. 이 두 변경은 Prisma db push가 알아서 처리한다.
  </action>
  <verify>
    <automated>bash -c 'npx prisma db execute --stdin <<< "SELECT 1 FROM information_schema.tables WHERE table_schema='"'"'public'"'"' AND table_name='"'"'push_subscriptions'"'"';" 2>&1 && npx prisma db execute --stdin <<< "SELECT 1 FROM information_schema.columns WHERE table_name='"'"'worker_profiles'"'"' AND column_name='"'"'noShowCount'"'"';" 2>&1 && echo "schema push verified"'</automated>
  </verify>
  <done>
    - `prisma db push` exit 0
    - `push_subscriptions` 테이블 존재
    - `worker_profiles.noShowCount` 컬럼 존재
    - `applications.status` 기본값 'pending'
    - 드리프트 없음
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Prisma → Supabase Postgres | db push executes DDL as service role |
| dal.ts → Server Actions | requireApplicationOwner/requireJobOwner are the ONLY place that confirms ownership before mutations |

## STRIDE Threat Register

| ID | Category | Component | Disposition | Mitigation |
|----|----------|-----------|-------------|------------|
| T-04-05 | Elevation of Privilege | dal.ts helpers | mitigate | Both helpers call `requireWorker`/`requireBusiness` before DB lookup; redirect (not return) on mismatch to prevent accidental "falsy return accepted" in callers |
| T-04-06 | Tampering | Prisma schema drift | mitigate | Task 5 `prisma db pull --print` confirms Supabase = schema.prisma; RLS migration in Plan 03 depends on this |
| T-04-07 | Info Disclosure | dal error codes in URL | accept | Error codes ("application_not_owned") do not leak resource content; they are design-level UX affordances |
| T-04-08 | Denial of Service | ALTER TYPE ADD VALUE on busy enum | mitigate | Additive enum change is fast in Postgres; Phase 4 is not in prod; Phase 5 should coordinate downtime window if applicable |
| T-04-09 | Spoofing | noShowCount manipulation | mitigate | Column only writable via pg_cron (Plan 03) and internal Server Actions; no direct client path; RLS will cover from Plan 03 |
</threat_model>

<verification>
- Prisma generate 성공, src/generated/prisma/ 에 ApplicationStatus.pending + PushSubscription delegate 반영
- TypeScript 컴파일 pass (dal.ts 한정)
- Supabase DB에 push_subscriptions 테이블 + worker_profiles.noShowCount + applications.status default 'pending' 반영
</verification>

<success_criteria>
- [x] prisma/schema.prisma: 3가지 변경 (enum + noShowCount + PushSubscription)
- [x] src/generated/prisma/ regenerated
- [x] src/lib/types/job.ts: ApplicationStatus에 pending 포함, STATUS_TO_BUCKET 매핑
- [x] src/lib/dal.ts: requireApplicationOwner + requireJobOwner exports
- [x] Supabase DB schema push 완료, drift 0
</success_criteria>

<output>
After completion, create `.planning/phases/04-db/04-02-SUMMARY.md` with:
- Prisma diff 요약
- prisma db push 출력 로그 요약
- dal.ts helper signatures
- Known follow-ups (e.g., exhaustive switch 경고 파일 목록 — Plan 08/09에서 해결)
</output>
