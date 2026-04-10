// RED BASELINE (Wave 0): until Plan 04-05 implements isWithinCheckInWindow.
// REQ: SHIFT-01 — 체크인 가능 시간창은 시작시간 -10분 ~ +30분 (boundary inclusive).

import { describe, it, expect } from "vitest";
// @ts-expect-error — Plan 04-05 will create src/lib/shift-validation.ts
import { isWithinCheckInWindow } from "@/lib/shift-validation";

// All times in Asia/Seoul; reference job startTime = 10:00 on 2026-04-11.
function ksDate(hour: number, minute = 0) {
  // 2026-04-11 in KST = 2026-04-10T15:00:00Z (KST = UTC+9)
  const base = new Date("2026-04-11T01:00:00Z"); // = 10:00 KST
  base.setUTCMinutes(base.getUTCMinutes() + (hour - 10) * 60 + minute);
  return base;
}

describe("SHIFT-01 isWithinCheckInWindow boundaries", () => {
  const jobStart = "10:00";
  const workDate = "2026-04-11";

  it("rejects -11 minutes before start", () => {
    const now = ksDate(9, 49);
    expect(isWithinCheckInWindow(now, workDate, jobStart)).toBe(false);
  });

  it("accepts -10 minutes (boundary)", () => {
    const now = ksDate(9, 50);
    expect(isWithinCheckInWindow(now, workDate, jobStart)).toBe(true);
  });

  it("accepts -1 minute", () => {
    const now = ksDate(9, 59);
    expect(isWithinCheckInWindow(now, workDate, jobStart)).toBe(true);
  });

  it("accepts +30 minutes (boundary)", () => {
    const now = ksDate(10, 30);
    expect(isWithinCheckInWindow(now, workDate, jobStart)).toBe(true);
  });

  it("rejects +31 minutes", () => {
    const now = ksDate(10, 31);
    expect(isWithinCheckInWindow(now, workDate, jobStart)).toBe(false);
  });

  it("rejects +100 minutes", () => {
    const now = ksDate(11, 40);
    expect(isWithinCheckInWindow(now, workDate, jobStart)).toBe(false);
  });
});
