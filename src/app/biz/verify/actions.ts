'use server'

/**
 * uploadBusinessRegImage — Server Action for /biz/verify page.
 *
 * Flow (D-31 / D-32 / D-33):
 *   1. Authenticate: requireBusiness() + owner-check via businessId form field (T-06-16)
 *   2. Validate file (MIME + size) via uploadBusinessRegFile helper
 *   3. Upload to storage — if fails, return error (image not saved)
 *   4. Write businessRegImageUrl = path + reset regNumberOcrMismatched=false (D-33: always save URL first)
 *   5. Read file buffer, call runBizLicenseOcr — on failure, return ok:true ocr:'skipped'
 *   6. Compare OCR candidateRegNumbers to stored businessRegNumber:
 *      - Match  → set verified=true AND regNumberOcrMismatched stays false, return { ok:true, ocr:'matched' } (D-33 success path)
 *      - Mismatch → set regNumberOcrMismatched=true, return { ok:true, ocr:'mismatched' }
 *        (verified is NOT changed — D-33: mismatch is admin-review flag only, not auto-reject)
 *   7. revalidatePath('/biz/verify')
 *
 * Security:
 *   T-06-16: businessId cross-referenced with session.id — cannot touch other users' profiles
 *   T-06-17: 10MB + MIME check in uploadBusinessRegFile
 *   T-06-19: Only candidateRegNumbers (digit-only) persisted; fullText discarded
 */

import { requireBusiness } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { uploadBusinessRegFile } from '@/lib/supabase/storage-biz-reg'
import { runBizLicenseOcr } from '@/lib/ocr/clova'
import { revalidatePath } from 'next/cache'

const IS_ACTION_TEST_MODE =
  process.env.NODE_ENV === 'test' && process.env.VITEST === 'true'

function revalidatePathSafe(path: string) {
  if (IS_ACTION_TEST_MODE) return
  revalidatePath(path)
}

/**
 * Void-returning form action wrapper for use in <form action={...}>.
 * Next.js form action prop requires (formData: FormData) => void | Promise<void>.
 * This wrapper calls uploadBusinessRegImage and discards the return value,
 * relying on revalidatePath to refresh the page state.
 */
export async function submitBusinessRegImage(formData: FormData): Promise<void> {
  await uploadBusinessRegImage(formData)
}

export async function uploadBusinessRegImage(
  formData: FormData,
): Promise<
  | { ok: true; ocr: 'matched' | 'mismatched' | 'skipped' }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }
> {
  const session = await requireBusiness()

  const businessId = String(formData.get('businessId') ?? '').trim()
  const file = formData.get('file')

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'file_missing', fieldErrors: { file: ['파일을 선택해주세요'] } }
  }

  if (!businessId) {
    return { ok: false, error: 'business_id_missing' }
  }

  // T-06-16: owner check — only process businesses owned by this session user
  const business = await prisma.businessProfile.findFirst({
    where: { id: businessId, userId: session.id },
    select: { id: true, businessRegNumber: true },
  })
  if (!business) {
    return { ok: false, error: 'business_not_found' }
  }

  // Upload to storage (validates MIME + size internally — T-06-17)
  const uploadResult = await uploadBusinessRegFile(file, {
    userId: session.id,
    businessId: business.id,
  })
  if (!uploadResult.ok) {
    return { ok: false, error: uploadResult.error }
  }

  // D-33: write URL FIRST — image save is authoritative, OCR is advisory.
  // Reset regNumberOcrMismatched on re-upload; will set true below on mismatch.
  await prisma.businessProfile.update({
    where: { id: business.id },
    data: {
      businessRegImageUrl: uploadResult.path,
      regNumberOcrMismatched: false,
    },
  })

  let ocr: 'matched' | 'mismatched' | 'skipped' = 'skipped'

  try {
    const buffer = await file.arrayBuffer()
    const result = await runBizLicenseOcr(buffer, file.type)

    if (result.ok) {
      const stored = business.businessRegNumber // digits-only or null
      if (stored && result.candidateRegNumbers.includes(stored)) {
        ocr = 'matched'
        // D-33 success: OCR-confirmed → flip verified=true. This is the ONLY
        // path that auto-sets verified (regex format alone is insufficient — see
        // /biz/profile/actions.ts and /biz/signup/actions.ts).
        await prisma.businessProfile.update({
          where: { id: business.id },
          data: { verified: true },
        })
      } else {
        // No candidates OR mismatch — flag for admin review (D-33: non-blocking)
        ocr = 'mismatched'
        await prisma.businessProfile.update({
          where: { id: business.id },
          data: { regNumberOcrMismatched: true },
        })
      }
    }
    // If result.ok === false → OCR skipped (env missing, timeout, api_error, unparseable)
    // regNumberOcrMismatched stays false — per D-33 no false-positive on OCR failure
  } catch {
    // Swallow all OCR errors — D-33: image save is authoritative; OCR is advisory.
  }

  revalidatePathSafe('/biz/verify')
  return { ok: true, ocr }
}
