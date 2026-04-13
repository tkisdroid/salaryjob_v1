// T-06-07 mitigation: server-only prevents client bundle import.
import 'server-only'

import { createClient } from '@/lib/supabase/server'

/**
 * Supabase Storage helpers for business registration documents.
 *
 * Bucket: 'business-reg-docs' (private — no public URL; access via signed URLs)
 * Path convention: {userId}/{businessId}.{ext}
 *
 * RLS policy (set in 06-02 migration):
 *   - SELECT: auth.uid()::text = (storage.foldername(name))[1]   (owner)
 *             OR public.users.role = 'ADMIN'                       (admin)
 *   - INSERT/UPDATE: auth.uid()::text = (storage.foldername(name))[1] (owner only)
 *   - DELETE: owner only
 *
 * File constraints (app-layer, matches T-06-10 MIME allowlist):
 *   - MIME: image/jpeg, image/png, application/pdf
 *   - Size: ≤ 10MB
 *
 * Wave 4 callers must use this module — do NOT call supabase.storage directly
 * in Server Actions to avoid repeating validation logic.
 */

export const BUSINESS_REG_BUCKET = 'business-reg-docs' as const

// T-06-10: MIME allowlist (app-layer guard; bucket RLS adds storage-layer guard)
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'application/pdf'] as const
type AllowedMime = (typeof ALLOWED_MIME)[number]

const MAX_BYTES = 10 * 1024 * 1024 // 10MB

function extFromMime(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/png') return 'png'
  if (mime === 'application/pdf') return 'pdf'
  return 'bin'
}

/**
 * Upload a business registration document to the private bucket.
 *
 * Path: `{userId}/{businessId}.{ext}`
 * Uses upsert:true — re-uploading a new doc for the same business overwrites
 * the previous file at the same path (no accumulation of stale docs).
 *
 * Returns the storage path (NOT a full URL). Wave 4 callers should store
 * this path in BusinessProfile.businessRegImageUrl and derive URLs via
 * createSignedBusinessRegUrl() at read time.
 */
export async function uploadBusinessRegFile(
  file: File,
  opts: { userId: string; businessId: string },
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  // MIME allowlist check (T-06-10)
  if (!ALLOWED_MIME.includes(file.type as AllowedMime)) {
    return { ok: false, error: 'unsupported_mime' }
  }

  // Size check (T-06-10)
  if (file.size > MAX_BYTES) {
    return { ok: false, error: 'too_large' }
  }

  const ext = extFromMime(file.type)
  // Path convention: {userId}/{businessId}.{ext}
  // The RLS policy on the bucket checks (storage.foldername(name))[1] = auth.uid()
  // which maps to the first folder segment = userId.
  const path = `${opts.userId}/${opts.businessId}.${ext}`

  try {
    const supabase = await createClient()
    const { error } = await supabase.storage
      .from(BUSINESS_REG_BUCKET)
      .upload(path, file, {
        upsert: true,
        contentType: file.type,
      })

    if (error) return { ok: false, error: error.message }
    return { ok: true, path }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'upload_failed'
    return { ok: false, error: message }
  }
}

/**
 * Generate a time-limited signed URL for admin or owner access to a stored
 * business registration document.
 *
 * TTL: default 3600s (1 hour) — per D-38 / T-06-07 signed URL policy.
 * Do NOT log or cache the returned URL; treat it as a one-time read token.
 *
 * @param path - Storage path as returned by uploadBusinessRegFile (e.g. "{userId}/{businessId}.jpg")
 * @param ttlSeconds - Expiry in seconds (default 3600 = 1h)
 * @returns Signed URL string, or null on error
 */
export async function createSignedBusinessRegUrl(
  path: string,
  ttlSeconds = 3600,
): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.storage
      .from(BUSINESS_REG_BUCKET)
      .createSignedUrl(path, ttlSeconds)

    if (error || !data) return null
    return data.signedUrl
  } catch {
    return null
  }
}
