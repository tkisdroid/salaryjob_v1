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
