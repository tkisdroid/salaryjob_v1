/**
 * Commission math for GigNow settlement snapshots.
 *
 * Design decisions (D-34 / D-35 / D-36):
 *   - Rate is stored as a PERCENTAGE: 5.00 = 5% → divide by 100 before multiply
 *   - All arithmetic via Prisma.Decimal to avoid IEEE 754 float drift (T-06-11)
 *   - ROUND_HALF_UP for KRW (no fractional currency units)
 *   - Env unset / empty / invalid → 0% rate → commissionAmount=0, netEarnings=gross
 *     (D-35: graceful default; platform starts at 0% commission)
 *   - Past-settled rows are IMMUTABLE — this module is called only at checkOut time
 *     to produce the snapshot written once. Do NOT recompute for existing rows.
 *
 * Sanity check:
 *   computeCommissionSnapshot(10000, new Prisma.Decimal('5.00'))
 *   → { rate: Decimal('5.00'), commissionAmount: 500, netEarnings: 9500 }
 */

import { Prisma } from '@/generated/prisma/client'

const ZERO = new Prisma.Decimal(0)

/**
 * Resolve the effective commission rate for a business.
 *
 * Priority:
 *   1. BusinessProfile.commissionRate (explicit override set by admin)
 *   2. process.env.PLATFORM_DEFAULT_COMMISSION_RATE (global default)
 *   3. 0% (safest fallback — no commission charged)
 *
 * @param businessRate - Value from BusinessProfile.commissionRate (nullable Decimal)
 * @returns Prisma.Decimal representing the commission percentage (e.g. Decimal('5.00') = 5%)
 */
export function getEffectiveCommissionRate(
  businessRate: Prisma.Decimal | null | undefined,
): Prisma.Decimal {
  // 1. Business-level override
  if (businessRate != null) {
    return new Prisma.Decimal(businessRate)
  }

  // 2. Environment variable fallback
  const raw = process.env.PLATFORM_DEFAULT_COMMISSION_RATE
  if (!raw || raw.trim() === '') return ZERO
  try {
    return new Prisma.Decimal(raw)
  } catch {
    // Invalid decimal string in env — fall through to 0
    return ZERO
  }
}

/**
 * Compute the commission snapshot for a single settlement.
 *
 * Formula:
 *   commissionAmount = ROUND_HALF_UP(floor(gross) * rate / 100)  [KRW integer]
 *   netEarnings      = floor(gross) - commissionAmount            [KRW integer]
 *
 * @param gross - Gross earnings in KRW (integer; fractional part is truncated)
 * @param rate  - Effective commission rate as percentage Decimal (e.g. Decimal('5.00'))
 * @returns Snapshot object with integer KRW amounts and the rate used
 */
export function computeCommissionSnapshot(
  gross: number,
  rate: Prisma.Decimal,
): { rate: Prisma.Decimal; commissionAmount: number; netEarnings: number } {
  // Use Math.trunc to ensure integer KRW — no sub-unit carry
  const grossDec = new Prisma.Decimal(Math.trunc(gross))

  // commissionAmount = ROUND_HALF_UP(gross * rate / 100)
  // T-06-11: Decimal throughout avoids floating-point drift
  const commissionDec = grossDec
    .mul(rate)
    .div(100)
    .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP)

  const commissionAmount = commissionDec.toNumber()
  const netEarnings = Math.trunc(gross) - commissionAmount

  return { rate, commissionAmount, netEarnings }
}
