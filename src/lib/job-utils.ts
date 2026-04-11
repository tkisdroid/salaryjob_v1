/**
 * Job utility functions — earnings calculation, date formatting,
 * category label mapping. Phase 4 added shift-form overloads.
 *
 * These functions have NO DB or network dependencies — safe to import anywhere.
 */

import type { JobCategory, Job } from "@/lib/types/job";

// ============================================================================
// Earnings calculation
// ============================================================================

interface JobEarningsInput {
  hourlyPay: number;
  workHours: number;
  nightShiftAllowance: boolean;
  transportFee: number;
}

interface ShiftEarningsRates {
  hourlyPay: number;
  transportFee: number;
}

/**
 * Phase 4 SHIFT-02 — Total earnings calculation with two calling conventions:
 *
 * 1. **Scheduled (legacy)**: `calculateEarnings(job)` — computes the *expected*
 *    earnings at job-listing time using `workHours * hourlyPay` plus a flat
 *    50% night allowance when the job is marked `nightShiftAllowance`.
 *    Used by the job detail "예상 수입" display and by `check-in-flow.tsx`.
 *
 * 2. **Actual (Phase 4 shift settlement)**: `calculateEarnings(actualHours, rates, nightPremium)` —
 *    computes real payout at check-out time.
 *    base = floor(actualHours * hourlyPay), total = base + nightPremium + transportFee.
 *    `nightPremium` comes from `calculateNightShiftPremium` (src/lib/night-shift.ts).
 *
 * Dispatching between the two is based on the shape of the first argument:
 * a number triggers the shift flow, an object triggers the scheduled flow.
 */
export function calculateEarnings(job: JobEarningsInput): number;
export function calculateEarnings(
  actualHours: number,
  rates: ShiftEarningsRates,
  nightPremium: number,
): number;
export function calculateEarnings(
  jobOrHours: JobEarningsInput | number,
  rates?: ShiftEarningsRates,
  nightPremium?: number,
): number {
  // Phase 4 shift-settlement form: (actualHours, rates, nightPremium)
  if (typeof jobOrHours === "number") {
    const actualHours = jobOrHours;
    const { hourlyPay, transportFee } = rates!;
    const base = Math.floor(actualHours * hourlyPay);
    return base + (nightPremium ?? 0) + transportFee;
  }

  // Legacy scheduled form: (job)
  const job = jobOrHours;
  let base = job.hourlyPay * job.workHours;
  if (job.nightShiftAllowance && job.workHours >= 4) {
    base = Math.floor(base * 1.5); // 야간 할증 50%
  }
  return base + job.transportFee;
}

/**
 * Phase 4 SHIFT-02 D-11 — Actual hours worked, rounded to 0.25 (15-minute) granularity.
 *
 * Rounding rule: `Math.round(minutes / 15) * 15`
 *   - 0 min  → 0.00h
 *   - 7 min  → 0.00h (rounds down)
 *   - 8 min  → 0.25h (rounds up)
 *   - 22 min → 0.25h (rounds down)
 *   - 23 min → 0.50h (rounds up)
 */
export function calculateActualHours(checkInAt: Date, checkOutAt: Date): number {
  if (checkOutAt.getTime() <= checkInAt.getTime()) return 0;
  const rawMinutes = (checkOutAt.getTime() - checkInAt.getTime()) / 60000;
  const roundedMinutes = Math.round(rawMinutes / 15) * 15;
  return roundedMinutes / 60;
}

// ============================================================================
// Date formatting
// ============================================================================

/**
 * Format an ISO date string as a human-readable Korean relative date.
 * Returns "오늘", "내일", or "M/D (요일)".
 */
export function formatWorkDate(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) return "오늘";
  if (isSameDay(date, tomorrow)) return "내일";

  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return `${date.getMonth() + 1}/${date.getDate()} (${weekdays[date.getDay()]})`;
}

// ============================================================================
// Category helpers
// ============================================================================

/** Returns the Korean display label for a job category. */
export function categoryLabel(cat: JobCategory): string {
  const map: Record<JobCategory, string> = {
    food: "음식점·카페",
    retail: "판매·유통",
    logistics: "물류·배송",
    office: "사무·행정",
    event: "행사·이벤트",
    cleaning: "청소·정리",
    education: "교육·과외",
    tech: "IT·디자인",
  };
  return map[cat];
}

/** Returns the emoji icon for a job category. */
export function categoryEmoji(cat: JobCategory): string {
  const map: Record<JobCategory, string> = {
    food: "☕",
    retail: "🛍️",
    logistics: "📦",
    office: "💼",
    event: "🎪",
    cleaning: "✨",
    education: "📚",
    tech: "💻",
  };
  return map[cat];
}
