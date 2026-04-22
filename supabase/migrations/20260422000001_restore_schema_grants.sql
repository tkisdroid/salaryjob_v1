-- Restore Supabase default schema grants that were missing.
--
-- Root cause observed during /biz/verify PDF upload debug on 2026-04-22:
--   whoami() RPC returned "permission denied for schema public" under the
--   authenticated role, and Supabase Storage RLS evaluation failed with
--   "new row violates row-level security policy" because biz_reg_admin_select
--   (on storage.objects) references public.users via an EXISTS subquery that
--   could not be evaluated by the authenticated role.
--
-- Fix: restore the baseline grants every Supabase project is expected to have
-- for PostgREST + Storage to operate under authenticated/anon JWTs.
--
-- Safety: RLS is still enforced at the row level. Table-level SELECT does not
-- bypass RLS. Only roles that already exist in the cluster are touched.

-- 1. Schema USAGE — lets authenticated/anon reach objects in public.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. public.users SELECT for authenticated — required by the
--    biz_reg_admin_select storage policy's EXISTS check against public.users.
--    RLS on public.users (if any) still filters rows; this grant only unlocks
--    the table at the ACL layer.
GRANT SELECT ON public.users TO authenticated;
