---
phase: 04-db
plan: 03
type: execute
wave: 2
depends_on: [2]
files_modified:
  - supabase/migrations/20260412000001_applications_rls_phase4.sql
  - supabase/migrations/20260412000002_applications_realtime_publication.sql
  - supabase/migrations/20260412000003_pg_cron_auto_accept_applications.sql
  - supabase/migrations/20260412000004_pg_cron_detect_no_show_applications.sql
  - scripts/apply-supabase-migrations.ts
autonomous: false
requirements:
  - APPL-01
  - APPL-02
  - APPL-03
  - APPL-04
  - APPL-05
  - SHIFT-01

must_haves:
  truths:
    - "public.applications 테이블에 RLS가 활성화되어 있고, Worker 본인 SELECT/INSERT/UPDATE + Business via jobs JOIN SELECT/UPDATE 정책이 적용되었다"
    - "supabase_realtime publication에 public.applications 테이블이 추가되어 postgres_changes 이벤트가 발행된다"
    - "pg_cron 스케줄 'auto-accept-applications-every-min'이 존재하며 매분 pending 30분 경과 건을 confirmed로 전이한다"
    - "pg_cron 스케줄 'detect-no-show-applications-every-5-min'이 존재하며 근무 시작 +30분 경과 후 checkInAt null인 confirmed 건을 cancelled + noShowCount++ + jobs.filled-- 처리한다"
    - "모든 새 SQL 마이그레이션이 supabase_migrations.schema_migrations 테이블에 기록되어 있다 (idempotent 재적용 가능)"
  artifacts:
    - path: "supabase/migrations/20260412000001_applications_rls_phase4.sql"
      provides: "applications RLS re-enable overriding Phase 2 D-05 disable"
      contains: "ENABLE ROW LEVEL SECURITY"
    - path: "supabase/migrations/20260412000002_applications_realtime_publication.sql"
      provides: "ALTER PUBLICATION supabase_realtime ADD TABLE + REPLICA IDENTITY check"
      contains: "supabase_realtime"
    - path: "supabase/migrations/20260412000003_pg_cron_auto_accept_applications.sql"
      provides: "30min auto-accept cron (D-03)"
      contains: "auto-accept-applications-every-min"
    - path: "supabase/migrations/20260412000004_pg_cron_detect_no_show_applications.sql"
      provides: "no-show detection cron (D-22)"
      contains: "detect-no-show-applications-every-5-min"
  key_links:
    - from: "supabase/migrations/*.sql"
      to: "Supabase Postgres"
      via: "scripts/apply-supabase-migrations.ts OR supabase db push"
      pattern: "cron.schedule"
    - from: "postgres_changes (supabase_realtime)"
      to: "client subscribe"
      via: "RLS-respecting filter"
      pattern: "ALTER PUBLICATION"
---

<objective>
Phase 4에 필요한 Supabase Postgres DDL/cron/publication 4개 SQL 마이그레이션을 작성하고 DB에 적용한다.

Purpose: Phase 2 D-05에서 임시 비활성화된 applications RLS를 엄격 정책으로 재활성화하고, Realtime publication에 테이블을 추가하며, 자동수락/노쇼 감지 백그라운드 작업을 pg_cron으로 구성한다. 이 모든 것이 Wave 3 Server Actions (applyOneTap/accept/checkIn/checkOut)의 전제조건이다.
Output: 4개 .sql 마이그레이션 파일 + Supabase DB에 반영.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/04-db/04-CONTEXT.md
@.planning/phases/04-db/04-RESEARCH.md
@prisma/schema.prisma
@supabase/migrations/20260410000004_disable_rls_jobs_applications_reviews.sql
@supabase/migrations/20260411000001_jobs_rls_phase3.sql
@supabase/migrations/20260411000003_pg_cron_expire_jobs.sql
@scripts/apply-supabase-migrations.ts
@.planning/phases/03-db/03-02-SUMMARY.md

<interfaces>
Phase 3 migration applier signature (script):
```typescript
// scripts/apply-supabase-migrations.ts
// Runs each .sql file in supabase/migrations/ sequentially via prisma.$executeRawUnsafe
// Tracks applied migrations in supabase_migrations.schema_migrations (same table supabase CLI uses)
```

Phase 3 jobs RLS pattern (reference — reuse policy naming convention):
```sql
CREATE POLICY "jobs_public_select" ON public.jobs FOR SELECT USING (true);
CREATE POLICY "jobs_owner_insert" ON public.jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = "authorId");
```

Phase 3 pg_cron pattern (reference — reuse unschedule + schedule):
```sql
SELECT cron.unschedule('expire-jobs-every-5-min') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-jobs-every-5-min');
SELECT cron.schedule('expire-jobs-every-5-min', '*/5 * * * *', $$ UPDATE ... $$);
```

Phase 2 disable migration that Phase 4 overrides:
```sql
-- 20260410000004_disable_rls_jobs_applications_reviews.sql
alter table public.applications disable row level security;
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: applications RLS phase4 마이그레이션 파일 작성</name>
  <files>supabase/migrations/20260412000001_applications_rls_phase4.sql</files>
  <read_first>
    - supabase/migrations/20260411000001_jobs_rls_phase3.sql (동일 스타일 reuse)
    - supabase/migrations/20260410000004_disable_rls_jobs_applications_reviews.sql (overwrite 대상)
    - .planning/phases/04-db/04-CONTEXT.md D-17 (policy 전문)
  </read_first>
  <behavior>
    - ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY 실행
    - 4개 정책 생성: applications_select_worker, applications_select_business, applications_insert_worker, applications_update_worker, applications_update_business
    - DELETE 정책 없음 (기본 deny)
    - 모든 CREATE POLICY 전에 DROP POLICY IF EXISTS (idempotent)
    - 파일 상단 주석에 "이 마이그레이션이 20260410000004_disable_rls_jobs_applications_reviews.sql의 applications 부분을 overwrite함" 기록
  </behavior>
  <action>
  아래 내용으로 `supabase/migrations/20260412000001_applications_rls_phase4.sql` 파일 작성:

  ```sql
  -- Phase 4 D-17: Re-enable RLS on public.applications with strict worker+business policies.
  -- Overrides the applications portion of 20260410000004_disable_rls_jobs_applications_reviews.sql.
  --
  -- Policy model:
  --   SELECT: worker sees own (workerId=auth.uid()), business sees applications for their jobs (via EXISTS join)
  --   INSERT: worker inserts own only (workerId=auth.uid())
  --   UPDATE: worker updates own (cancel flow), business updates via jobs JOIN (accept/reject/auto-accept)
  --   DELETE: no policy → default deny (soft-delete via status='cancelled' instead)
  --
  -- Defense in depth: Prisma bypasses RLS (DIRECT_URL service role), so Server Actions still
  -- enforce ownership via src/lib/dal.ts requireApplicationOwner / requireJobOwner helpers.
  -- RLS is the second gate for any future @supabase/supabase-js anon/auth client access AND
  -- Realtime postgres_changes publication (which respects RLS per Supabase docs).

  -- Drop-if-exists guards for idempotent re-application
  DROP POLICY IF EXISTS "applications_select_worker"  ON public.applications;
  DROP POLICY IF EXISTS "applications_select_business" ON public.applications;
  DROP POLICY IF EXISTS "applications_insert_worker"  ON public.applications;
  DROP POLICY IF EXISTS "applications_update_worker"  ON public.applications;
  DROP POLICY IF EXISTS "applications_update_business" ON public.applications;

  -- Enable RLS (was disabled in 20260410000004)
  ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

  -- SELECT: worker sees own applications
  CREATE POLICY "applications_select_worker"
    ON public.applications
    FOR SELECT
    TO authenticated
    USING (auth.uid() = "workerId");

  -- SELECT: business sees applications for their jobs
  CREATE POLICY "applications_select_business"
    ON public.applications
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.jobs j
        WHERE j.id = public.applications."jobId"
          AND j."authorId" = auth.uid()
      )
    );

  -- INSERT: worker inserts own only
  CREATE POLICY "applications_insert_worker"
    ON public.applications
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = "workerId");

  -- UPDATE: worker updates own (cancel via Server Action guards state machine)
  CREATE POLICY "applications_update_worker"
    ON public.applications
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = "workerId")
    WITH CHECK (auth.uid() = "workerId");

  -- UPDATE: business updates via jobs JOIN (accept / reject / auto-accept cron)
  CREATE POLICY "applications_update_business"
    ON public.applications
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.jobs j
        WHERE j.id = public.applications."jobId"
          AND j."authorId" = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.jobs j
        WHERE j.id = public.applications."jobId"
          AND j."authorId" = auth.uid()
      )
    );

  -- reviews remain DISABLED until Phase 5 — do NOT touch.
  ```
  </action>
  <verify>
    <automated>bash -c 'test -f supabase/migrations/20260412000001_applications_rls_phase4.sql && grep -c "CREATE POLICY" supabase/migrations/20260412000001_applications_rls_phase4.sql | grep -q "^5$" && grep -q "ENABLE ROW LEVEL SECURITY" supabase/migrations/20260412000001_applications_rls_phase4.sql && echo OK'</automated>
  </verify>
  <done>
    - 파일 존재, 5개 CREATE POLICY, ENABLE RLS 포함
    - reviews 테이블 손대지 않음
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: applications Realtime publication 마이그레이션</name>
  <files>supabase/migrations/20260412000002_applications_realtime_publication.sql</files>
  <read_first>
    - .planning/phases/04-db/04-RESEARCH.md (Summary #1 — publication + REPLICA IDENTITY 요구)
    - .planning/phases/04-db/04-CONTEXT.md (D-06/07 postgres_changes)
  </read_first>
  <behavior>
    - public.applications 테이블이 supabase_realtime publication에 추가된다
    - REPLICA IDENTITY가 DEFAULT인지 확인 (DEFAULT면 아무것도 안함, 다른 값이면 DEFAULT로 SET)
    - Idempotent: 이미 publication에 있어도 에러 없음
  </behavior>
  <action>
  아래 내용으로 파일 작성:

  ```sql
  -- Phase 4 D-06 / D-07: Enable Supabase Realtime postgres_changes for public.applications.
  -- Required because supabase_realtime publication does NOT automatically include newly RLS-enabled tables.
  --
  -- Per Supabase docs (https://supabase.com/docs/guides/realtime/postgres-changes):
  --   1. Table must be in supabase_realtime publication (ALTER PUBLICATION ADD TABLE)
  --   2. REPLICA IDENTITY should be DEFAULT (primary key) for UPDATE events to include old.* → new.* diff
  --   3. RLS policies (from 20260412000001) gate which rows the subscriber receives
  --
  -- This migration is safe to re-run (idempotent via DO block).

  -- Step 1: Add public.applications to supabase_realtime publication (if not already a member)
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'applications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;
    END IF;
  END $$;

  -- Step 2: Ensure REPLICA IDENTITY DEFAULT (primary key). This is the Postgres default,
  -- but we set it explicitly for clarity and future-proofing.
  ALTER TABLE public.applications REPLICA IDENTITY DEFAULT;

  -- Verification query (run manually to confirm):
  --   SELECT pubname, schemaname, tablename FROM pg_publication_tables
  --   WHERE pubname = 'supabase_realtime' AND tablename = 'applications';
  ```
  </action>
  <verify>
    <automated>bash -c 'test -f supabase/migrations/20260412000002_applications_realtime_publication.sql && grep -q "ALTER PUBLICATION supabase_realtime ADD TABLE" supabase/migrations/20260412000002_applications_realtime_publication.sql && grep -q "REPLICA IDENTITY DEFAULT" supabase/migrations/20260412000002_applications_realtime_publication.sql && echo OK'</automated>
  </verify>
  <done>
    - 파일 존재
    - ADD TABLE + REPLICA IDENTITY DEFAULT 둘 다 포함
    - DO block으로 idempotent
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: pg_cron auto-accept applications 마이그레이션</name>
  <files>supabase/migrations/20260412000003_pg_cron_auto_accept_applications.sql</files>
  <read_first>
    - supabase/migrations/20260411000003_pg_cron_expire_jobs.sql (pg_cron 패턴 reuse)
    - .planning/phases/04-db/04-CONTEXT.md D-03 (30분, pg_cron 주기 1분)
  </read_first>
  <behavior>
    - cron.schedule 'auto-accept-applications-every-min' 존재
    - 매분 실행, pending + appliedAt < now() - 30min 건을 confirmed로 전이
    - unschedule + schedule 패턴으로 idempotent
    - Phase 3 expire-jobs cron과 동일 스타일
  </behavior>
  <action>
  ```sql
  -- Phase 4 D-03: Auto-accept pending applications after 30 minutes of inactivity.
  -- Runs every minute (1 min granularity, minimal DB load — UPDATE only targets pending rows).
  --
  -- Business may still manually accept before timer → transitions pending→confirmed immediately,
  -- this cron only catches the "business forgot/unavailable" path to keep Worker's UX promise of
  -- "near-instant confirmation" (Timee 철학).
  --
  -- Timezone handling: appliedAt is DateTime @default(now()) (timestamptz internally via Supabase default),
  -- compared against now() in UTC. "30 minutes" is wall-clock, not Asia/Seoul-specific.
  --
  -- Dependencies: Plan 02 adds 'pending' to ApplicationStatus enum, Plan 02 Prisma db push
  -- propagates it to Supabase — THIS migration MUST run after Plan 02.

  -- 1. Ensure pg_cron extension exists (already enabled by Phase 3, guarded here)
  CREATE EXTENSION IF NOT EXISTS pg_cron;

  -- 2. Unschedule any existing job with the same name (idempotent re-run)
  SELECT cron.unschedule('auto-accept-applications-every-min')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-accept-applications-every-min');

  -- 3. Schedule: every minute, transition stale pending → confirmed
  SELECT cron.schedule(
    'auto-accept-applications-every-min',
    '* * * * *',
    $$
      UPDATE public.applications
      SET status = 'confirmed'
      WHERE status = 'pending'
        AND "appliedAt" < now() - INTERVAL '30 minutes';
    $$
  );
  ```
  </action>
  <verify>
    <automated>bash -c 'test -f supabase/migrations/20260412000003_pg_cron_auto_accept_applications.sql && grep -q "auto-accept-applications-every-min" supabase/migrations/20260412000003_pg_cron_auto_accept_applications.sql && grep -q "INTERVAL '"'"'30 minutes'"'"'" supabase/migrations/20260412000003_pg_cron_auto_accept_applications.sql && grep -q "status = '"'"'confirmed'"'"'" supabase/migrations/20260412000003_pg_cron_auto_accept_applications.sql && echo OK'</automated>
  </verify>
  <done>
    - 파일 존재, cron.schedule + '30 minutes' interval + status=confirmed 전이
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: pg_cron no-show detection 마이그레이션</name>
  <files>supabase/migrations/20260412000004_pg_cron_detect_no_show_applications.sql</files>
  <read_first>
    - supabase/migrations/20260411000003_pg_cron_expire_jobs.sql (workDate + startTime 결합 timestamp 패턴)
    - .planning/phases/04-db/04-CONTEXT.md D-22 (노쇼 페널티 + 5분 주기 + filled--)
  </read_first>
  <behavior>
    - cron.schedule 'detect-no-show-applications-every-5-min' 존재
    - 5분 주기 실행
    - 조건: status='confirmed' AND workDate + startTime + 30min < now() AND checkInAt IS NULL
    - 액션: 해당 application을 cancelled로 전이, jobs.filled -1, worker_profiles.noShowCount +1
    - 원자성: 단일 CTE 또는 DO block 트랜잭션
  </behavior>
  <action>
  ```sql
  -- Phase 4 D-22: Detect no-show workers and cascade state.
  -- Runs every 5 minutes.
  --
  -- Criteria (all must be true for a row to be marked no-show):
  --   1. status = 'confirmed' (worker was accepted but never checked in)
  --   2. (workDate + startTime) + 30 minutes has passed (grace window closed — matches D-09 check-in window)
  --   3. checkInAt IS NULL (confirmed transition happened via checkIn)
  --
  -- Cascading effects:
  --   A. application.status = 'cancelled'
  --   B. job.filled = filled - 1 (frees seat for Worker 재지원 or general marketplace rebalance)
  --   C. worker_profiles.noShowCount = noShowCount + 1 (affects completionRate displayed on profile)
  --
  -- All three happen inside one DO block to avoid partial state.
  --
  -- Note: This cron handles the case where Worker was accepted but ghosted. The D-03 auto-accept
  -- cron handles the complementary case where Business didn't respond. Together they keep the
  -- lifecycle moving without indefinite pending/confirmed stalls.
  --
  -- Timezone: workDate DATE + startTime "HH:MM" → combined as timestamp in DB-local (UTC for Supabase).
  -- Phase 2 seed inserted UTC-consistent workDates so direct comparison is correct.

  CREATE EXTENSION IF NOT EXISTS pg_cron;

  SELECT cron.unschedule('detect-no-show-applications-every-5-min')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'detect-no-show-applications-every-5-min');

  SELECT cron.schedule(
    'detect-no-show-applications-every-5-min',
    '*/5 * * * *',
    $$
      WITH no_show_rows AS (
        SELECT a.id, a."jobId", a."workerId"
        FROM public.applications a
        JOIN public.jobs j ON j.id = a."jobId"
        WHERE a.status = 'confirmed'
          AND a."checkInAt" IS NULL
          AND (
            j."workDate"::timestamp + CAST(j."startTime" AS time)
          )::timestamptz < now() - INTERVAL '30 minutes'
      ),
      cancelled_apps AS (
        UPDATE public.applications a
        SET status = 'cancelled'
        FROM no_show_rows ns
        WHERE a.id = ns.id
        RETURNING a.id, a."jobId", a."workerId"
      ),
      decremented_jobs AS (
        UPDATE public.jobs j
        SET filled = GREATEST(filled - 1, 0),
            status = CASE WHEN j.status = 'filled' THEN 'active' ELSE j.status END,
            "updatedAt" = now()
        FROM cancelled_apps ca
        WHERE j.id = ca."jobId"
        RETURNING j.id
      )
      UPDATE public.worker_profiles wp
      SET "noShowCount" = wp."noShowCount" + 1,
          "updatedAt" = now()
      FROM cancelled_apps ca
      WHERE wp."userId" = ca."workerId";
    $$
  );
  ```

  **Note on job re-open (`status='filled' → 'active'`):** Explicit re-open is conservative. If the job's workDate has already passed (expire-jobs cron should have handled this) this branch is a safety net. executor 재량으로 이 re-open 로직을 제거할 수 있음 — 단 제거시 Plan 04 tests/applications/apply-duplicate.test.ts의 re-fill 시나리오와 일치하는지 확인.
  </action>
  <verify>
    <automated>bash -c 'test -f supabase/migrations/20260412000004_pg_cron_detect_no_show_applications.sql && grep -q "detect-no-show-applications-every-5-min" supabase/migrations/20260412000004_pg_cron_detect_no_show_applications.sql && grep -q "noShowCount" supabase/migrations/20260412000004_pg_cron_detect_no_show_applications.sql && grep -q "GREATEST(filled - 1, 0)" supabase/migrations/20260412000004_pg_cron_detect_no_show_applications.sql && echo OK'</automated>
  </verify>
  <done>
    - 파일 존재, CTE 체인으로 cancelled + filled-- + noShowCount++ 원자 처리
  </done>
</task>

<task type="auto">
  <name>Task 5: [BLOCKING] apply-supabase-migrations 실행 + 검증</name>
  <files>supabase/migrations/*.sql (read only)</files>
  <read_first>
    - scripts/apply-supabase-migrations.ts (Phase 2/3 runner 로직)
    - .planning/phases/03-db/03-02-SUMMARY.md (Phase 3 apply 패턴)
  </read_first>
  <action>
  **[BLOCKING]** 이 태스크는 Wave 3 Server Action 태스크 전에 반드시 완료되어야 한다.

  1. `npm run db:apply-migrations` 또는 `tsx scripts/apply-supabase-migrations.ts` 실행 (package.json script 네이밍은 실제 파일을 확인해서 결정)
     - 만약 npm script가 없으면: `npx tsx scripts/apply-supabase-migrations.ts` 직접 실행
  2. 4개 새 SQL 파일이 순차 적용되는지 출력 확인
  3. 만약 `supabase db push` CLI가 연결되어 있으면 대안으로:
     ```
     supabase db push
     ```
     (SUPABASE_ACCESS_TOKEN 환경변수 필요)

  **검증 SQL 5개** (모두 `npx prisma db execute --stdin`으로 실행):

  ```sql
  -- 1. RLS enabled
  SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'applications';
  -- 기대: relrowsecurity = t

  -- 2. 5 policies exist
  SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'applications' ORDER BY policyname;
  -- 기대: applications_insert_worker, applications_select_business, applications_select_worker, applications_update_business, applications_update_worker

  -- 3. Realtime publication contains applications
  SELECT pubname, schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'applications';
  -- 기대: 1행

  -- 4. auto-accept cron scheduled
  SELECT jobname, schedule FROM cron.job WHERE jobname = 'auto-accept-applications-every-min';
  -- 기대: schedule = '* * * * *'

  -- 5. no-show cron scheduled
  SELECT jobname, schedule FROM cron.job WHERE jobname = 'detect-no-show-applications-every-5-min';
  -- 기대: schedule = '*/5 * * * *'
  ```

  실행 결과 스냅샷을 04-03-SUMMARY.md에 기록.

  **실패시:**
  - RLS 활성화 실패 → Phase 2 D-05 disable 마이그레이션이 이미 적용되어 있어야 하며, override는 단순 ALTER TABLE ENABLE이므로 에러가 드묾
  - Publication 추가 실패 → supabase_realtime publication이 Supabase 프로젝트에 존재하는지 확인 (Supabase 기본 제공)
  - cron.schedule 실패 → pg_cron 확장이 active인지 확인 (Phase 3에서 이미 enabled)
  - non-TTY 에러 → direct psql 실행: `psql $DATABASE_URL -f supabase/migrations/20260412000001_applications_rls_phase4.sql`
  </action>
  <verify>
    <automated>bash -c 'npx prisma db execute --stdin <<< "SELECT count(*) FROM pg_policies WHERE schemaname='"'"'public'"'"' AND tablename='"'"'applications'"'"';" 2>&1 && npx prisma db execute --stdin <<< "SELECT count(*) FROM cron.job WHERE jobname IN ('"'"'auto-accept-applications-every-min'"'"', '"'"'detect-no-show-applications-every-5-min'"'"');" 2>&1 && npx prisma db execute --stdin <<< "SELECT count(*) FROM pg_publication_tables WHERE pubname='"'"'supabase_realtime'"'"' AND tablename='"'"'applications'"'"';" 2>&1'</automated>
  </verify>
  <done>
    - 5 policies on public.applications
    - 2 cron jobs scheduled
    - supabase_realtime includes applications
    - applications has RLS enabled (relrowsecurity = t)
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 6: Supabase DB 상태 수동 확인 checkpoint</name>
  <files>(checkpoint — no files modified)</files>
  <action>See <how-to-verify> below. Checker performs the listed manual steps and responds via <resume-signal>.</action>
  <verify>
    <automated>echo "human verify required — see how-to-verify block"</automated>
  </verify>
  <done>Checker responds with approved / partial / failed per resume-signal contract.</done>
  <what-built>
    - `supabase/migrations/20260412000001_applications_rls_phase4.sql` (5 policies)
    - `supabase/migrations/20260412000002_applications_realtime_publication.sql`
    - `supabase/migrations/20260412000003_pg_cron_auto_accept_applications.sql`
    - `supabase/migrations/20260412000004_pg_cron_detect_no_show_applications.sql`
    - 모든 마이그레이션 Supabase DB 적용 완료
  </what-built>
  <how-to-verify>
    Supabase Dashboard 또는 psql에서 아래 5가지 수동 확인 (Wave 3 진입 전 안전망):

    1. **Database → Tables → applications** → RLS 토글이 "Enabled" 상태
    2. **Database → Tables → applications → Policies** 탭에 5개 정책 목록 확인
    3. **Database → Replication → supabase_realtime** publication에 `applications` 테이블이 포함됨
    4. **Database → Extensions**에 `pg_cron` active
    5. Cron job 확인 (SQL Editor):
       ```sql
       SELECT jobname, schedule, active FROM cron.job;
       ```
       `auto-accept-applications-every-min` + `detect-no-show-applications-every-5-min` 둘 다 active=true

    **만약 MCP 또는 CLI 접근이 없다면:** Supabase Dashboard를 수동으로 확인.

    **완료 후 signal:**
    - [ ] 5개 항목 모두 확인됨 → "approved"
    - [ ] 일부 실패 → 실패 항목 설명
  </how-to-verify>
  <resume-signal>"approved" 또는 이슈 설명</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Any authenticated user → public.applications | RLS is the ONLY gate for direct supabase-js/realtime subscription paths |
| pg_cron job → applications/jobs/worker_profiles | Runs as postgres superuser, bypasses RLS — must have conservative WHERE clauses |
| Supabase Realtime → client subscribers | RLS policies filter per-row visibility during postgres_changes dispatch |

## STRIDE Threat Register

| ID | Category | Component | Disposition | Mitigation |
|----|----------|-----------|-------------|------------|
| T-04-10 | Info Disclosure | applications RLS SELECT | mitigate | Worker policy uses `auth.uid()=workerId`; Business policy uses EXISTS join on jobs.authorId — no cross-user leakage |
| T-04-11 | Elevation of Privilege | Application update outside state machine | mitigate | RLS UPDATE allows workers/businesses to touch own rows, but Server Actions (Plan 04/05) validate transitions (pending→confirmed→in_progress→completed); DB has no CHECK constraint on transitions — accepted risk, tests cover |
| T-04-12 | Tampering | pg_cron auto-accept race with manual accept | mitigate | Both paths set status='confirmed'; race is no-op; worst case 2 UPDATEs with same end state |
| T-04-13 | DoS | cron scheduled every minute on growing applications table | mitigate | WHERE clause uses indexed (`@@index([workerId, status])`) + time bound; partial index opportunity for Phase 5 if table > 1M rows |
| T-04-14 | Repudiation | no-show detection false positive | accept | Grace window is 30 min after startTime (matches D-09 check-in window). If Worker checked in but clock drift — checkInAt is set BEFORE grace window expires. Risk low. |
| T-04-15 | Tampering | Realtime delivering over-scoped rows | mitigate | RLS policies apply to Realtime dispatch; Task 5 verification confirms publication+RLS combination |
| T-04-16 | Info Disclosure | Business sees applications for jobs they don't own via EXISTS injection | mitigate | Policy uses parameterized `j.id = public.applications."jobId"` — no user-provided SQL |
</threat_model>

<verification>
- 4개 SQL 파일 존재, 내용이 CONTEXT.md D-17/D-03/D-22 + RESEARCH.md Summary #1과 일치
- Supabase DB에 RLS + publication + 2 cron jobs 적용 확인 (5개 검증 SQL 통과)
- Phase 2 D-05 disable 마이그레이션과의 상호작용 검증 (applications만 re-enable, reviews/jobs 상태 유지)
</verification>

<success_criteria>
- [x] 4개 SQL 마이그레이션 파일 작성, Phase 2/3 네이밍/스타일 일치
- [x] scripts/apply-supabase-migrations.ts (또는 supabase db push) 로 DB에 적용
- [x] 5개 검증 SQL이 모두 기대값 반환
- [x] 수동 checkpoint에서 Supabase Dashboard 상태 확인
</success_criteria>

<output>
After completion, create `.planning/phases/04-db/04-03-SUMMARY.md` with:
- 4개 마이그레이션 파일 리스트 + 각 요약
- 5개 검증 SQL 실행 결과 스냅샷
- Phase 2 D-05 overrides 기록 (reviews 영향 없음 명시)
- Known follow-up: Plan 04 test가 RLS bypass 여부 (Prisma service role) 확인
</output>
