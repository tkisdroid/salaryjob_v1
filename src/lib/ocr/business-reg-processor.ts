// T-06-07 mitigation: server-only prevents client bundling.
import 'server-only'

import { revalidatePath } from 'next/cache'

import { prisma } from '@/lib/db'
import { verifyBusinessStatus } from '@/lib/biz-verification'
import { runBizLicenseOcr } from '@/lib/ocr/gemini'

const IS_ACTION_TEST_MODE =
  process.env.NODE_ENV === 'test' ||
  process.env.VITEST === 'true' ||
  process.env.VITEST === '1'

function revalidatePathSafe(path: string) {
  if (IS_ACTION_TEST_MODE) return
  revalidatePath(path)
}

type ProcessBusinessRegOcrResult = 'matched' | 'mismatched' | 'skipped'

export async function processBusinessRegOcr(input: {
  businessId: string
  uploadedPath: string
  uploadedAt: Date
  fileBuffer: ArrayBuffer
  mimeType: string
}): Promise<ProcessBusinessRegOcrResult> {
  const { businessId, uploadedPath, uploadedAt, fileBuffer, mimeType } = input

  try {
    const business = await prisma.businessProfile.findFirst({
      where: {
        id: businessId,
        businessRegImageUrl: uploadedPath,
        updatedAt: uploadedAt,
      },
      select: {
        id: true,
        businessRegNumber: true,
      },
    })

    if (!business) {
      console.log(
        '[biz-verify] Background OCR skipped: upload was replaced after enqueue',
      )
      return 'skipped'
    }

    const ocrResult = await runBizLicenseOcr(fileBuffer, mimeType)
    if (!ocrResult.ok) {
      console.log('[biz-verify] OCR skipped:', ocrResult.reason)
      return 'skipped'
    }

    const storedRegNumber = business.businessRegNumber

    // OCR mismatch or no candidate reg number — request admin review.
    if (!storedRegNumber || !ocrResult.candidateRegNumbers.includes(storedRegNumber)) {
      const update = await prisma.businessProfile.updateMany({
        where: {
          id: businessId,
          businessRegImageUrl: uploadedPath,
          updatedAt: uploadedAt,
        },
        data: {
          regNumberOcrMismatched: true,
        },
      })

      if (update.count === 0) {
        console.log(
          '[biz-verify] Background OCR update skipped: business row changed after enqueue',
        )
        return 'skipped'
      }
      return 'mismatched'
    }

    const statusResult = await verifyBusinessStatus(storedRegNumber)
    if (statusResult.ok && statusResult.status === 'operating') {
      const update = await prisma.businessProfile.updateMany({
        where: {
          id: businessId,
          businessRegImageUrl: uploadedPath,
          updatedAt: uploadedAt,
        },
        data: {
          verified: true,
          regNumberOcrMismatched: false,
        },
      })

      if (update.count === 0) {
        console.log(
          '[biz-verify] Background OCR verification update skipped: business row changed after enqueue',
        )
        return 'skipped'
      }
      return 'matched'
    }

    const update = await prisma.businessProfile.updateMany({
      where: {
        id: businessId,
        businessRegImageUrl: uploadedPath,
        updatedAt: uploadedAt,
      },
      data: {
        regNumberOcrMismatched: true,
      },
    })

    if (update.count === 0) {
      console.log(
        '[biz-verify] Background OCR status update skipped: business row changed after enqueue',
      )
      return 'skipped'
    }

    return 'mismatched'
  } catch (err) {
    console.error(
      '[biz-verify] Background OCR processing failed:',
      err instanceof Error ? err.message : err,
    )
    return 'skipped'
  } finally {
    revalidatePathSafe('/biz/verify')
  }
}
