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
-- All three happen inside one CTE chain to avoid partial state.
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
