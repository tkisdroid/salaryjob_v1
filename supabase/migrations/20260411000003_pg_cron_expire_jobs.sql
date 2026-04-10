-- Phase 3 D-04: pg_cron schedule to expire jobs 5 minutes after start time.
-- Every 5 minutes, UPDATE jobs where (workDate + startTime) is past.
-- Combined with lazy WHERE filter in queries.ts (03-06), max UI staleness ~5 min.
--
-- Timezone handling (Finding #7):
-- Supabase Postgres stores UTC by default. workDate is DATE, startTime is
-- VARCHAR("HH:MM"). Combine into timestamptz and compare against now() (UTC).
-- Phase 2 seed inserted with UTC semantics, so direct comparison is correct.

-- 1. Enable pg_cron (Supabase hosted has this pre-installed)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Unschedule any existing job with the same name (idempotent re-run)
SELECT cron.unschedule('expire-jobs-every-5-min')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-jobs-every-5-min');

-- 3. Schedule the expiry job: every 5 minutes
SELECT cron.schedule(
  'expire-jobs-every-5-min',
  '*/5 * * * *',
  $$
    UPDATE public.jobs
    SET status = 'expired'
    WHERE status = 'active'
      AND (
        "workDate"::timestamp + CAST("startTime" AS time)
      )::timestamptz < now() - INTERVAL '5 minutes';
  $$
);
