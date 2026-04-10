// RED BASELINE (Wave 0): until Plan 04-05 extends calculateEarnings to accept night premium.
// REQ: SHIFT-02 — 수입 = (시급 × 실근무시간) + 교통비 + 야간할증.

import { describe, it, expect } from "vitest";
import { calculateEarnings } from "@/lib/job-utils";

describe("SHIFT-02 calculateEarnings composition", () => {
  it("computes base earnings without night premium", () => {
    const result = calculateEarnings(
      4,
      { hourlyPay: 12000, transportFee: 2000 },
      0,
    );
    expect(result).toBe(50000); // 12000*4 + 2000
  });

  it("adds night premium to base", () => {
    const result = calculateEarnings(
      4,
      { hourlyPay: 12000, transportFee: 2000 },
      12000,
    );
    expect(result).toBe(62000); // 50000 + 12000
  });

  it("zero hours → only transport fee", () => {
    const result = calculateEarnings(
      0,
      { hourlyPay: 12000, transportFee: 2000 },
      0,
    );
    expect(result).toBe(2000);
  });
});
