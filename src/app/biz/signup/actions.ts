'use server'

/**
 * verifyBusinessRegNumber — standalone Server Action for D-30 auto-verify.
 *
 * Accepts a FormData with:
 *   - businessId (UUID of the BusinessProfile)
 *   - regNumber  (raw user input, hyphenated or digit-only)
 *
 * On valid format:
 *   - Writes digit-only regNumber to businessRegNumber column
 *   - Sets verified=true atomically (D-30)
 *   - Returns { success: true }
 *
 * On invalid format:
 *   - Returns { success: false, error: string } — no DB write
 *
 * Security (T-06-16):
 *   - requireBusiness() confirms session and BUSINESS role
 *   - Owner check: findFirst({ id, userId: session.id }) before any write
 */

import { requireBusiness } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { RegNumberSchema, normalizeRegNumber } from '@/lib/validations/business'

export async function verifyBusinessRegNumber(
  formData: FormData,
): Promise<
  | { success: true }
  | { success: false; error: string; fieldErrors?: Record<string, string> }
> {
  const session = await requireBusiness()

  const businessId = String(formData.get('businessId') ?? '').trim()
  const rawRegNumber = String(formData.get('regNumber') ?? '').trim()

  // Validate format
  const parsed = RegNumberSchema.safeParse(rawRegNumber)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? '사업자등록번호 형식이 올바르지 않습니다'
    return {
      success: false,
      error: msg,
      fieldErrors: { regNumber: msg },
    }
  }

  // T-06-16 owner check
  const business = await prisma.businessProfile.findFirst({
    where: { id: businessId, userId: session.id },
    select: { id: true },
  })
  if (!business) {
    return { success: false, error: '사업장을 찾을 수 없습니다' }
  }

  const digitOnly = normalizeRegNumber(parsed.data)

  try {
    await prisma.businessProfile.update({
      where: { id: business.id },
      data: {
        businessRegNumber: digitOnly,
        verified: true, // D-30 auto-approve
      },
    })
    return { success: true }
  } catch (e) {
    console.error('verifyBusinessRegNumber error', e)
    return { success: false, error: '저장에 실패했습니다. 잠시 후 다시 시도해주세요' }
  }
}
