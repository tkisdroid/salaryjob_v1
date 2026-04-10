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
