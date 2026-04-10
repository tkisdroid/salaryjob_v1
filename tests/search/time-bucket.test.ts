// GREEN (Plan 04-07): src/lib/time-filters.ts implements doesTimeBucketMatch.
// REQ: SEARCH-03 — 시간대 버킷 (오전 06-12, 오후 12-18, 저녁 18-22, 야간 22-06).

import { describe, it, expect } from "vitest";
import { doesTimeBucketMatch } from "@/lib/time-filters";

describe("SEARCH-03 doesTimeBucketMatch", () => {
  it("startTime 10:00 matches 오전 (06-12)", () => {
    expect(doesTimeBucketMatch("10:00", "오전")).toBe(true);
    expect(doesTimeBucketMatch("10:00", "오후")).toBe(false);
  });

  it("startTime 13:00 matches 오후 (12-18)", () => {
    expect(doesTimeBucketMatch("13:00", "오후")).toBe(true);
    expect(doesTimeBucketMatch("13:00", "오전")).toBe(false);
  });

  it("startTime 20:00 matches 저녁 (18-22)", () => {
    expect(doesTimeBucketMatch("20:00", "저녁")).toBe(true);
    expect(doesTimeBucketMatch("20:00", "야간")).toBe(false);
  });

  it("startTime 23:00 matches 야간 (22-06 wrap-around)", () => {
    expect(doesTimeBucketMatch("23:00", "야간")).toBe(true);
    expect(doesTimeBucketMatch("23:00", "저녁")).toBe(false);
  });

  it("startTime 05:00 also matches 야간 (day boundary crossing)", () => {
    expect(doesTimeBucketMatch("05:00", "야간")).toBe(true);
    expect(doesTimeBucketMatch("05:00", "오전")).toBe(false);
  });

  it("startTime 06:00 (boundary) matches 오전, not 야간", () => {
    expect(doesTimeBucketMatch("06:00", "오전")).toBe(true);
    expect(doesTimeBucketMatch("06:00", "야간")).toBe(false);
  });

  it("startTime 22:00 (boundary) matches 야간, not 저녁", () => {
    expect(doesTimeBucketMatch("22:00", "야간")).toBe(true);
    expect(doesTimeBucketMatch("22:00", "저녁")).toBe(false);
  });
});
