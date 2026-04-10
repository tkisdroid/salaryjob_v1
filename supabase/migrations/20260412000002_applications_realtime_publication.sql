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
