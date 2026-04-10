// RED BASELINE (Wave 0): until Plan 04-05 implements src/lib/night-shift.ts.
// REQ: SHIFT-03 — 22:00-06:00 KST 구간에 4시간+ 근무한 경우만 50% 가산.
// 6 boundary cases per VALIDATION.md.

import { describe, it, expect } from "vitest";
// @ts-expect-error — Plan 04-05 creates this module
import {
  calculateNightShiftPremium,
  computeNightHoursOverlap,
} from "@/lib/night-shift";

// Helper: build a Date in KST (UTC+9)
function ks(date: string, hour: number, minute = 0) {
  // date format YYYY-MM-DD; produce a UTC date that == that KST wallclock
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour - 9, minute));
}

const HP = 10000;

describe("SHIFT-03 night shift premium (22:00-06:00, ≥4h)", () => {
  it("fully-inside: 23:00-04:00 (5h overlap, ≥4h) → 5 * hp * 0.5", () => {
    const start = ks("2026-04-11", 23);
    const end = ks("2026-04-12", 4);
    expect(computeNightHoursOverlap(start, end)).toBeCloseTo(5, 5);
    expect(calculateNightShiftPremium(start, end, HP)).toBe(5 * HP * 0.5);
  });

  it("straddle-left: 20:00-02:00 (overlap 22-02 = 4h, ≥4h) → 4 * hp * 0.5", () => {
    const start = ks("2026-04-11", 20);
    const end = ks("2026-04-12", 2);
    expect(computeNightHoursOverlap(start, end)).toBeCloseTo(4, 5);
    expect(calculateNightShiftPremium(start, end, HP)).toBe(4 * HP * 0.5);
  });

  it("straddle-right: 04:00-10:00 (overlap 04-06 = 2h, <4h) → 0", () => {
    const start = ks("2026-04-11", 4);
    const end = ks("2026-04-11", 10);
    expect(computeNightHoursOverlap(start, end)).toBeCloseTo(2, 5);
    expect(calculateNightShiftPremium(start, end, HP)).toBe(0);
  });

  it("cross-midnight 22:00-next 06:00 (8h overlap) → 8 * hp * 0.5", () => {
    const start = ks("2026-04-11", 22);
    const end = ks("2026-04-12", 6);
    expect(computeNightHoursOverlap(start, end)).toBeCloseTo(8, 5);
    expect(calculateNightShiftPremium(start, end, HP)).toBe(8 * HP * 0.5);
  });

  it("no-overlap: 08:00-16:00 → 0", () => {
    const start = ks("2026-04-11", 8);
    const end = ks("2026-04-11", 16);
    expect(computeNightHoursOverlap(start, end)).toBeCloseTo(0, 5);
    expect(calculateNightShiftPremium(start, end, HP)).toBe(0);
  });

  it("3h overlap (<4h threshold): 23:00-02:00 → 0", () => {
    const start = ks("2026-04-11", 23);
    const end = ks("2026-04-12", 2);
    expect(computeNightHoursOverlap(start, end)).toBeCloseTo(3, 5);
    expect(calculateNightShiftPremium(start, end, HP)).toBe(0);
  });
});
