-- Phase 6 D-38: Supabase Storage private bucket for business registration documents.
--
-- Bucket: business-reg-docs (PRIVATE — NOT world-readable)
-- Path convention: business-reg-docs/{userId}/{businessId}.{ext}
--   - folder[1] (1-based) = userId — used as the auth.uid() anchor for RLS
--   - folder[2] = businessId
--   - filename = {businessId}.{ext}
--
-- CRITICAL — storage.foldername() index is 1-based (same as Phase 3 avatars migration):
--   For path '{userId}/{businessId}.{ext}', storage.foldername() returns:
--     [1] = '{userId}'    <- THIS is the auth check anchor
--     [2] = (nothing — '{businessId}.{ext}' is the basename, not a folder)
--
-- 4 RLS policies (T-06-02, T-06-04 mitigations):
--   1. biz_reg_owner_insert — authenticated owner can INSERT into their own folder
--   2. biz_reg_owner_update — owner can UPDATE (USING + WITH CHECK)
--   3. biz_reg_owner_select — owner can SELECT their own folder
--   4. biz_reg_admin_select — ADMIN role (verified via public.users JOIN) can SELECT any row
--      Note: T-06-02 requires DB-level join on public.users, not JWT claim alone.
--
-- Security:
--   - T-06-03: file_size_limit=10MB, allowed_mime_types restricts to 3 MIME types
--   - T-06-04: auth.uid() cannot be forged from client
--   - Do NOT use getPublicUrl — bucket is private. Use createSignedUrl at read time.
--
-- Idempotency: ON CONFLICT (id) DO NOTHING on INSERT; DROP POLICY IF EXISTS before CREATE.

-- 1. Create private bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-reg-docs',
  'business-reg-docs',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop-if-exists for idempotency on manual re-apply
DROP POLICY IF EXISTS "biz_reg_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "biz_reg_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "biz_reg_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "biz_reg_admin_select" ON storage.objects;

-- 3. INSERT: authenticated owner can write to their own userId folder
CREATE POLICY "biz_reg_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'business-reg-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. UPDATE: owner can overwrite their own folder (both USING and WITH CHECK)
CREATE POLICY "biz_reg_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'business-reg-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'business-reg-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. SELECT: owner can read their own folder
CREATE POLICY "biz_reg_owner_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'business-reg-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 6. SELECT (admin): ADMIN role can read anything in this bucket.
-- T-06-02: role verified via DB join on public.users — JWT claim alone is insufficient.
CREATE POLICY "biz_reg_admin_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'business-reg-docs'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );
