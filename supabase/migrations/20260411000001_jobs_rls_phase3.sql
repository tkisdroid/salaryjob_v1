-- Phase 3 D-02: Re-enable RLS on public.jobs with public SELECT + owner writes.
-- Reverses the jobs portion of 20260410000004. applications and reviews REMAIN disabled.
--
-- Policy model:
--   SELECT: anyone (anon + authenticated) for POST-04 public job list
--   INSERT/UPDATE/DELETE: only the authoring user (auth.uid() = authorId)
--
-- Prisma bypasses RLS (DIRECT_URL = service role). Server Actions using Prisma
-- enforce auth via DAL requireBusiness + explicit owner check (03-05). RLS here
-- is defense-in-depth for any future @supabase/supabase-js anon/auth client access.

-- Drop-if-exists (CREATE POLICY IF NOT EXISTS is not supported in PostgreSQL).
-- _supabase_migrations tracking makes this unnecessary on first run but safe for
-- manual re-application scenarios.
DROP POLICY IF EXISTS "jobs_public_select" ON public.jobs;
DROP POLICY IF EXISTS "jobs_owner_insert" ON public.jobs;
DROP POLICY IF EXISTS "jobs_owner_update" ON public.jobs;
DROP POLICY IF EXISTS "jobs_owner_delete" ON public.jobs;

-- Enable RLS (was disabled in 20260410000004)
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- SELECT: public (anon + authenticated)
CREATE POLICY "jobs_public_select"
  ON public.jobs
  FOR SELECT
  USING (true);

-- INSERT: only the authoring user
CREATE POLICY "jobs_owner_insert"
  ON public.jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = "authorId");

-- UPDATE: only the authoring user
CREATE POLICY "jobs_owner_update"
  ON public.jobs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = "authorId")
  WITH CHECK (auth.uid() = "authorId");

-- DELETE: only the authoring user
CREATE POLICY "jobs_owner_delete"
  ON public.jobs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = "authorId");

-- applications and reviews remain DISABLED — do NOT touch them.
