/**
 * Phase 4 SHIFT-01/SHIFT-02 — Pure time-window validators for check-in / check-out.
 *
 * These functions have NO DB dependencies and are safe to call from anywhere
 * (Server Action, RSC, or test). They treat `workDate` + `startTime` as an
 * Asia/Seoul wallclock composition and produce a UTC instant for comparison.
 *
 * Korea does not observe DST, so the wallclock-to-UTC conversion is constant
 * (-9h), removing any timezone-library dependency.
 */

const SEOUL_UTC_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * Parse `workDate` into a UTC midnight epoch millis.
 *
 * Accepts either:
 *   - a string `"YYYY-MM-DD"` (interpreted as Asia/Seoul calendar date)
 *   - a `Date` instance (Prisma `@db.Date` columns come back as Date at UTC midnight)
 *
 * For a string, we construct the Asia/Seoul wallclock 00:00 of that day and
 * convert to UTC by subtracting the fixed +9h offset. For a Date we return its
 * raw getTime() (Prisma stores Date columns as UTC midnight already).
 */
function workDateToUtcMs(workDate: string | Date): number {
  if (typeof workDate === "string") {
    const [y, m, d] = workDate.split("-").map(Number);
    // Asia/Seoul midnight on YYYY-MM-DD === UTC (YYYY-MM-(D-1)) 15:00
    return Date.UTC(y, m - 1, d) - SEOUL_UTC_OFFSET_MS;
  }
  return workDate.getTime();
}

/**
 * Compose a UTC instant for "workDate + startTime" interpreted in Asia/Seoul.
 * startTime is "HH:MM" wallclock.
 */
function jobStartUtcMs(workDate: string | Date, startTime: string): number {
  const [h, m] = startTime.split(":").map(Number);
  const baseUtc = workDateToUtcMs(workDate);
  return baseUtc + (h * 60 + m) * 60 * 1000;
}

/**
 * Phase 4 SHIFT-01 D-09 — Check-in time window validator.
 *
 * Window: `[jobStart - 10min, jobStart + 30min]` (both bounds inclusive).
 *
 * Parameter order matches tests/shift/check-in-time-window.test.ts:
 *   `isWithinCheckInWindow(now, workDate, startTime)`
 *
 * @param now      Current time (any UTC offset)
 * @param workDate Job's work date as "YYYY-MM-DD" or Date
 * @param startTime Job's start wallclock "HH:MM" (Asia/Seoul)
 */
export function isWithinCheckInWindow(
  now: Date,
  workDate: string | Date,
  startTime: string,
): boolean {
  const startMs = jobStartUtcMs(workDate, startTime);
  if (Number.isNaN(startMs)) return false;
  const openAt = startMs - 10 * 60 * 1000;
  const closeAt = startMs + 30 * 60 * 1000;
  const t = now.getTime();
  return t >= openAt && t <= closeAt;
}

/**
 * Phase 4 SHIFT-02 — Check-out time window validator.
 *
 * Loose upper bound of 12 hours after job start; strict enforcement comes from
 * the JWT QR token's 10-minute expiry (D-15). The lower bound is simply the
 * worker's actual checkInAt timestamp.
 */
export function isWithinCheckOutWindow(
  now: Date,
  workDate: string | Date,
  startTime: string,
  checkInAt: Date,
): boolean {
  if (now.getTime() < checkInAt.getTime()) return false;
  const startMs = jobStartUtcMs(workDate, startTime);
  if (Number.isNaN(startMs)) return false;
  const latest = startMs + 12 * 60 * 60 * 1000;
  return now.getTime() <= latest;
}
