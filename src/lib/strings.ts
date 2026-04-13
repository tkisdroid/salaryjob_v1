/**
 * String utility helpers shared across search, OCR comparison, and input normalization.
 */

/**
 * Remove all non-digit characters from a string.
 *
 * Usage:
 *   - OCR: normalize OCR-extracted reg numbers before DB comparison
 *   - Search: normalize phone/reg-number query inputs for ILIKE search on digit-only columns
 *   - Input: strip hyphens from user-entered business reg numbers (NNN-NN-NNNNN → 10 digits)
 *
 * @example
 *   normalizeDigits('123-45-67890') // '1234567890'
 *   normalizeDigits('010-1234-5678') // '01012345678'
 *   normalizeDigits('홍길동 123') // '123'
 */
export function normalizeDigits(s: string): string {
  return s.replace(/\D/g, '')
}
