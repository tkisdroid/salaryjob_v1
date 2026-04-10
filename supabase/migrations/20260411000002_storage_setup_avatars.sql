-- Phase 3 D-01: Supabase Storage setup for Worker avatar uploads.
-- Creates the 'public' bucket and 4 RLS policies on storage.objects.
--
-- Path structure (03-RESEARCH.md Finding #3 + §1.5):
-- Uploads MUST use avatars/{user_id}/avatar.{ext} subfolder pattern.
--
-- CRITICAL — storage.foldername() index is 1-based, NOT 0-based:
--   For path 'avatars/{userId}/avatar.{ext}', storage.foldername() returns:
--     [1] = 'avatars'    <- literal folder name
--     [2] = '{userId}'   <- THIS is the auth check anchor
--     [3] = (nothing — 'avatar.{ext}' is the basename, not a folder)
--
--   Research §1 example uses [1] because it assumed a FLAT path like
--   'avatars/{userId}.ext' where {userId} is the FIRST segment. We use a
--   SUBFOLDER path, so the auth check MUST use [2], not [1].
--
--   DO NOT "fix" [2] to [1] — that would let every authenticated user write
--   to other users' folders, breaking the RLS guarantee entirely.
--
-- CONTEXT.md D-01 originally said flat path; research upgraded to subfolder.

-- 1. Create the public bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('public', 'public', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop-if-exists for idempotency on manual re-apply
DROP POLICY IF EXISTS "public_avatars_select" ON storage.objects;
DROP POLICY IF EXISTS "own_avatar_insert" ON storage.objects;
DROP POLICY IF EXISTS "own_avatar_update" ON storage.objects;
DROP POLICY IF EXISTS "own_avatar_delete" ON storage.objects;

-- 3. SELECT: anyone can read files in the public bucket
CREATE POLICY "public_avatars_select"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'public');

-- 4. INSERT: authenticated user can write to avatars/{their_uid}/*
CREATE POLICY "own_avatar_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'public'
    AND (storage.foldername(name))[1] = 'avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- 5. UPDATE: authenticated user can overwrite their own avatar
CREATE POLICY "own_avatar_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'public'
    AND (storage.foldername(name))[1] = 'avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'public'
    AND (storage.foldername(name))[1] = 'avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- 6. DELETE: authenticated user can delete their own avatar
CREATE POLICY "own_avatar_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'public'
    AND (storage.foldername(name))[1] = 'avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
