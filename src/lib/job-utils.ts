/**
 * Pure utility functions for job-related computations.
 * Copied (not moved) from mock-data.ts so that seed.ts keeps working.
 *
 * These functions have NO DB or network dependencies — safe to import anywhere.
 */

import type { JobCategory, Job } from "@/lib/types/job";

// ============================================================================
// Earnings calculation
// ============================================================================

/**
 * Calculate total expected earnings for a job including night-shift allowance
 * and transport fee.
 */
export function calculateEarnings(job: {
  hourlyPay: number;
  workHours: number;
  nightShiftAllowance: boolean;
  transportFee: number;
}): number {
  let base = job.hourlyPay * job.workHours;
  if (job.nightShiftAllowance && job.workHours >= 4) {
    base = Math.floor(base * 1.5); // 야간 할증 50%
  }
  return base + job.transportFee;
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
