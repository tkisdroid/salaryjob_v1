// RED BASELINE (Wave 0): until Plan 04-05 extends src/lib/job-utils.ts with calculateActualHours.
// REQ: SHIFT-02 — 실근무 시간은 15분 단위로 반올림되어 정직한 시간 지급을 보장한다.
// Rounding rule: Math.round(minutes / 15) * 15.

import { describe, it, expect } from "vitest";
// @ts-expect-error — Plan 04-05 will extend job-utils.ts
import { calculateActualHours } from "@/lib/job-utils";

function dt(minutesFromBase: number) {
  const base = new Date("2026-04-11T01:00:00Z");
  base.setUTCMinutes(base.getUTCMinutes() + minutesFromBase);
  return base;
}

describe("SHIFT-02 calculateActualHours 15-min rounding", () => {
  const start = dt(0);

  it("0 minutes → 0 hours", () => {
    expect(calculateActualHours(start, dt(0))).toBe(0);
  });

  it("7 minutes → 0 hours (rounds down)", () => {
    expect(calculateActualHours(start, dt(7))).toBe(0);
  });

  it("8 minutes → 0.25 hours (rounds up)", () => {
    expect(calculateActualHours(start, dt(8))).toBe(0.25);
  });

  it("15 minutes → 0.25 hours", () => {
    expect(calculateActualHours(start, dt(15))).toBe(0.25);
  });

  it("22 minutes → 0.25 hours (rounds down)", () => {
    expect(calculateActualHours(start, dt(22))).toBe(0.25);
  });

  it("23 minutes → 0.5 hours (rounds up)", () => {
    expect(calculateActualHours(start, dt(23))).toBe(0.5);
  });

  it("37 minutes → 0.5 hours", () => {
    expect(calculateActualHours(start, dt(37))).toBe(0.5);
  });
});
