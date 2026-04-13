/**
 * Validation schemas and helpers for business registration data.
 *
 * D-30: Business registration number (사업자등록번호) validation.
 *   Format: NNN-NN-NNNNN (10 digits, hyphens optional on input).
 *   DB storage: digits-only, 10 characters.
 *   Auto-verify: valid format → verified=true on BusinessProfile.
 *
 * Referenced by:
 *   - src/app/biz/profile/actions.ts  (updateBusinessProfile)
 *   - src/app/biz/verify/actions.ts   (uploadBusinessRegImage)
 *   - src/app/(auth)/role-select/actions.ts (signup completion)
 */

import { z } from 'zod'
import { normalizeDigits } from '@/lib/strings'

/**
 * Validates a Korean business registration number.
 * Accepts both hyphenated (123-45-67890) and digit-only (1234567890) forms.
 * After validation, always call normalizeRegNumber() before DB writes.
 */
export const RegNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{3}-?\d{2}-?\d{5}$/, '사업자등록번호 형식이 올바르지 않습니다 (NNN-NN-NNNNN)')

/**
 * Validates a Korean phone number for business owner contact.
 * Accepts digits, hyphens, plus signs, spaces — minimum 7 chars.
 */
export const OwnerPhoneSchema = z.string().regex(/^[0-9\-\+\s]{7,20}$/, '연락처 형식이 올바르지 않습니다')

/**
 * Strip all non-digit characters from a registration number.
 * '123-45-67890' → '1234567890'
 * Used for DB storage and OCR comparison.
 */
export function normalizeRegNumber(s: string): string {
  return normalizeDigits(s)
}

/**
 * Format a digit-only registration number for display.
 * '1234567890' → '123-45-67890'
 * Used for UI display and on-blur auto-format.
 */
export function formatRegNumber(s: string): string {
  const digits = normalizeDigits(s)
  if (digits.length !== 10) return s
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
}
