/**
 * Phase 4 SHIFT-03 — Night shift premium calculation.
 *
 * Rule (D-12):
 *   - Night window: 22:00–06:00 Asia/Seoul (wraps midnight)
 *   - Trigger: if the [checkIn, checkOut] interval overlaps the night window for ≥ 4 hours total
 *   - Premium: nightHoursOverlap × hourlyPay × 0.5 (only on the overlap, not the whole shift)
 *   - No premium if overlap < 4 hours
 *
 * Implementation note: Korea does not observe DST, so Asia/Seoul is a fixed UTC+9 offset.
 * We convert each Date to its "Seoul-local minutes since epoch" by adding 9 hours of offset,
 * then walk each candidate local day that the interval touches, accumulating overlap with
 * that day's night window [22:00, next-day 06:00).
 */

const SEOUL_UTC_OFFSET_MIN = 9 * 60;
const MIN_PER_DAY = 24 * 60;
const NIGHT_START_MIN = 22 * 60; // 22:00
const NIGHT_DURATION_MIN = 8 * 60; // 22:00 → 06:00 next day

/**
 * Convert a Date to "minutes since Unix epoch in Seoul-local wallclock terms".
 * Since Seoul is fixed UTC+9 (no DST), we simply add the offset.
 */
function toSeoulLinearMinutes(d: Date): number {
  return Math.floor(d.getTime() / 60000) + SEOUL_UTC_OFFSET_MIN;
}

/**
 * Returns the number of hours (float) that the [checkIn, checkOut) interval
 * overlaps with the Asia/Seoul 22:00–06:00 night window.
 *
 * Handles cross-midnight shifts (e.g., 20:00 → 02:00 next day). Accepts inputs
 * at any UTC offset; conversion to Seoul is internal.
 */
export function computeNightHoursOverlap(checkIn: Date, checkOut: Date): number {
  if (checkOut <= checkIn) return 0;

  const startMin = toSeoulLinearMinutes(checkIn);
  const endMin = toSeoulLinearMinutes(checkOut);

  // Enumerate each Seoul-local day whose night window could overlap.
  // The night window for day D spans [D*1440 + 1320, D*1440 + 1800).
  // Include day-1 because a shift starting early AM still overlaps with
  // "previous day's [22:00 → today 06:00]" window.
  const firstDay = Math.floor(startMin / MIN_PER_DAY);
  const lastDay = Math.floor((endMin - 1) / MIN_PER_DAY);

  let overlapMin = 0;
  for (let day = firstDay - 1; day <= lastDay + 1; day++) {
    const nightStart = day * MIN_PER_DAY + NIGHT_START_MIN;
    const nightEnd = nightStart + NIGHT_DURATION_MIN;
    const lo = Math.max(startMin, nightStart);
    const hi = Math.min(endMin, nightEnd);
    if (hi > lo) overlapMin += hi - lo;
  }
  return overlapMin / 60;
}

/**
 * Phase 4 SHIFT-03 — Compute night shift premium earnings portion.
 *
 * Returns `Math.floor(nightHours * hourlyPay * 0.5)` if the total night overlap
 * is ≥ 4 hours; otherwise returns 0.
 *
 * @param checkIn  Shift start timestamp (any UTC offset, converted to Asia/Seoul internally)
 * @param checkOut Shift end timestamp
 * @param hourlyPay Worker's hourly pay in KRW
 */
export function calculateNightShiftPremium(
  checkIn: Date,
  checkOut: Date,
  hourlyPay: number,
): number {
  const nightHours = computeNightHoursOverlap(checkIn, checkOut);
  if (nightHours < 4) return 0;
  return Math.floor(nightHours * hourlyPay * 0.5);
}
