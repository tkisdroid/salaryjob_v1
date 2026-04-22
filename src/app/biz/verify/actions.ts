'use server'

/**
 * uploadBusinessRegImage — Server Action for /biz/verify page.
 *
 * Flow:
 *   1. Authenticate: requireBusiness() + owner-check via businessId form field
 *   2. Validate file (MIME + size) via uploadBusinessRegFile helper
 *   3. Upload to storage — if fails, return error (image not saved)
 *   4. Write businessRegImageUrl = path + reset regNumberOcrMismatched=false
 *   5. Revalidate /biz/verify immediately so upload state appears without delay
 *   6. Enqueue background OCR/status update job with fileBuffer + metadata
 *      - Missing GOOGLE_GEMINI_API_KEY → return ok:true ocr:'skipped' + ocrSkipReason
 *      - Empty/invalid input / OCR failure in background → helper logs + no hard error
 *   8. revalidatePath('/biz/verify')
 */

import { requireBusiness } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { uploadBusinessRegFile } from '@/lib/supabase/storage-biz-reg'
import { hasGeminiApiKey } from '@/lib/ocr/gemini'
import { processBusinessRegOcr } from '@/lib/ocr/business-reg-processor'
import { after } from 'next/server'
import { revalidatePath } from 'next/cache'

const IS_ACTION_TEST_MODE =
  process.env.NODE_ENV === 'test' ||
  process.env.VITEST === 'true' ||
  process.env.VITEST === '1'

function revalidatePathSafe(path: string) {
  if (IS_ACTION_TEST_MODE) return
  revalidatePath(path)
}

export async function uploadBusinessRegImage(
  formData: FormData,
): Promise<
  | { ok: true; ocr: 'queued'; ocrSkipReason?: undefined }
  | { ok: true; ocr: 'skipped'; ocrSkipReason: 'missing_api_key' | 'file_read_failed' }
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
    console.error('[biz-verify] Upload failed:', uploadResult.error)
    return { ok: false, error: uploadResult.error }
  }

  const uploadedBusiness = await prisma.businessProfile.update({
    where: { id: business.id },
    data: {
      businessRegImageUrl: uploadResult.path,
      regNumberOcrMismatched: false,
    },
    select: {
      updatedAt: true,
    },
  })

  revalidatePathSafe('/biz/verify')
  revalidatePathSafe('/biz/profile')

  if (!hasGeminiApiKey()) {
    return {
      ok: true,
      ocr: 'skipped',
      ocrSkipReason: 'missing_api_key',
    }
  }

  let fileBuffer: ArrayBuffer
  try {
    fileBuffer = await file.arrayBuffer()
  } catch (err) {
    console.error(
      '[biz-verify] Cannot read uploaded file for background OCR:',
      err instanceof Error ? err.message : err,
    )
    return { ok: true, ocr: 'skipped', ocrSkipReason: 'file_read_failed' }
  }

  const processInput = {
    businessId: business.id,
    uploadedPath: uploadResult.path,
    uploadedAt: uploadedBusiness.updatedAt,
    fileBuffer,
    mimeType: file.type,
  }

  const enqueueErrorMessage =
    '[biz-verify] Failed to enqueue background OCR workflow:'
  if (IS_ACTION_TEST_MODE) {
    console.log(
      '[biz-verify] TEST mode: background OCR is intentionally not run by action return path',
    )
  } else {
    try {
      after(async () => {
        await processBusinessRegOcr(processInput)
      })
    } catch (err) {
      console.error(
        enqueueErrorMessage,
        err instanceof Error ? err.message : err,
      )
      // Final fallback so OCR still runs if after() can't be registered in this environment.
      void processBusinessRegOcr(processInput).catch((callbackErr) => {
        console.error(
          '[biz-verify] Background OCR fallback failed:',
          callbackErr instanceof Error ? callbackErr.message : callbackErr,
        )
      })
    }
  }

  return { ok: true, ocr: 'queued' }
}
