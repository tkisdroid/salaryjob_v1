import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase Storage helpers for Phase 3.
 *
 * Bucket: 'public' (created in 03-02 migration 20260411000002_storage_setup_avatars.sql)
 * Path convention: avatars/{userId}/avatar.{ext}
 *
 * RLS (from 03-02):
 *   - SELECT: anyone (bucket is public)
 *   - INSERT/UPDATE/DELETE: (storage.foldername(name))[2] = auth.uid()::text
 *     → callers MUST pass the authenticated userId matching the session; the
 *       Supabase client attaches the auth JWT automatically via cookies.
 */

export const AVATAR_BUCKET = "public" as const;
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB (matches next.config.ts bodySizeLimit)
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
] as const);

export type UploadAvatarResult =
  | { publicUrl: string }
  | { error: string };

/**
 * Upload a user's avatar to Supabase Storage with server-side validation.
 *
 * Validation layers (per 03-RESEARCH.md §1.3 + §9.2):
 *   1. File present + non-empty
 *   2. Size ≤ 5MB
 *   3. MIME type in allow-list (JPEG, PNG, WebP)
 *
 * Writes to: avatars/{userId}/avatar.{ext}
 * Uses upsert: true so re-uploads overwrite the previous file at the same path
 * (no cleanup needed — per research §1.5 fixed-path strategy).
 */
export async function uploadAvatarFile(
  userId: string,
  file: File,
): Promise<UploadAvatarResult> {
  if (!file || file.size === 0) {
    return { error: "파일을 선택해주세요" };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { error: "파일 크기는 5MB 이하여야 합니다" };
  }
  if (!ALLOWED_MIME.has(file.type as "image/jpeg" | "image/png" | "image/webp")) {
    return { error: "JPEG, PNG, WebP 파일만 업로드 가능합니다" };
  }

  const ext = file.type === "image/jpeg" ? "jpg"
            : file.type === "image/png" ? "png"
            : "webp";
  const path = `avatars/${userId}/avatar.${ext}`;

  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (uploadError) {
    return { error: "업로드에 실패했습니다: " + uploadError.message };
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);

  // Add a cache-busting query so <img src> updates immediately after upsert
  const publicUrl = `${data.publicUrl}?v=${Date.now()}`;
  return { publicUrl };
}

/**
 * Extract the public URL for a given avatar path. Used by read paths if the
 * stored avatar value is a relative path instead of a full URL.
 */
export async function getAvatarPublicUrl(path: string): Promise<string> {
  const supabase = await createClient();
  return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
}
