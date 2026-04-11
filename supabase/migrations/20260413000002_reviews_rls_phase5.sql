-- Phase 5 D-02: Re-enable RLS on public.reviews with strict bilateral policies.
-- Overrides the reviews portion of 20260410000004_disable_rls_jobs_applications_reviews.sql.
--
-- Policy model:
--   SELECT: reviewer sees own (reviewerId=auth.uid()), reviewee sees own
--           (revieweeId=auth.uid()), job owner sees reviews on their jobs via
--           EXISTS join on applicationId → jobId → authorId.
--   INSERT: blocked for authenticated role — only Server Actions running via
--           DIRECT_URL / service_role may insert. RLS holds back anon/auth clients.
--   UPDATE: blocked entirely — reviews are immutable after creation.
--   DELETE: blocked entirely — abuse/appeal flow (future) would use a separate
--           moderated deletion pathway, not direct DELETE.
--
-- Defense in depth: Prisma bypasses RLS (service_role), so Server Actions still
-- enforce ownership via src/lib/dal.ts. RLS is the second gate for any future
-- @supabase/supabase-js anon/auth client access AND Realtime publications.

-- Drop-if-exists guards for idempotent re-application
DROP POLICY IF EXISTS "reviews_select_reviewer"    ON public.reviews;
DROP POLICY IF EXISTS "reviews_select_reviewee"    ON public.reviews;
DROP POLICY IF EXISTS "reviews_select_job_owner"   ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_blocked"     ON public.reviews;
DROP POLICY IF EXISTS "reviews_update_blocked"     ON public.reviews;
DROP POLICY IF EXISTS "reviews_delete_blocked"     ON public.reviews;

-- Enable RLS (was disabled in 20260410000004)
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- SELECT: the reviewer can see their own reviews
CREATE POLICY "reviews_select_reviewer"
  ON public.reviews
  FOR SELECT
  TO authenticated
  USING (auth.uid() = "reviewerId");

-- SELECT: the reviewee can see reviews written about them
CREATE POLICY "reviews_select_reviewee"
  ON public.reviews
  FOR SELECT
  TO authenticated
  USING (auth.uid() = "revieweeId");

-- SELECT: the owner of the job that the application belongs to can see all
-- reviews on that application. Covers biz side reading worker-side reviews on
-- their own jobs for analytics/history pages.
CREATE POLICY "reviews_select_job_owner"
  ON public.reviews
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.jobs j ON j.id = a."jobId"
      WHERE a.id = public.reviews."applicationId"
        AND j."authorId" = auth.uid()
    )
  );

-- INSERT: blocked for authenticated role.
-- Server Actions use the service_role connection (DIRECT_URL) which bypasses RLS.
-- Any anon/auth client hitting Supabase REST or Realtime cannot insert reviews.
CREATE POLICY "reviews_insert_blocked"
  ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- UPDATE: reviews are immutable after creation.
CREATE POLICY "reviews_update_blocked"
  ON public.reviews
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- DELETE: reviews cannot be deleted via client-side access.
-- Future abuse/moderation flow will run through a dedicated admin Server Action.
CREATE POLICY "reviews_delete_blocked"
  ON public.reviews
  FOR DELETE
  TO authenticated
  USING (false);
