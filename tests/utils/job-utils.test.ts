import { describe, it, expect } from "vitest";
import { calculateEarnings } from "@/lib/job-utils";
import type { Job } from "@/lib/types/job";

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "test",
    businessId: "biz",
    business: {
      id: "biz",
      name: "Test Biz",
      category: "food",
      logo: "🍔",
      address: "Seoul",
      addressDetail: "",
      lat: 37.5665,
      lng: 126.978,
      rating: 0,
      reviewCount: 0,
      completionRate: 0,
      photos: [],
      verified: false,
      description: "",
    },
    title: "Test Job",
    category: "food",
    description: "",
    duties: [],
    requirements: [],
    dressCode: "",
    whatToBring: [],
    hourlyPay: 12000,
    transportFee: 0,
    workDate: "2026-04-17",
    startTime: "10:00",
    endTime: "14:00",
    workHours: 4,
    headcount: 1,
    filled: 0,
    isUrgent: false,
    isNew: false,
    distanceM: 0,
    appliedCount: 0,
    tags: [],
    nightShiftAllowance: false,
    ...overrides,
  };
}

describe("POST-05 — calculateEarnings", () => {
  it("returns hourlyPay * workHours + transportFee for a regular shift", () => {
    const job = makeJob({ hourlyPay: 12000, workHours: 4, transportFee: 3000 });
    // 12000 * 4 + 3000 = 51000
    expect(calculateEarnings(job)).toBe(51000);
  });

  it("adds 50% night shift allowance when nightShiftAllowance is true", () => {
    const job = makeJob({
      hourlyPay: 10000,
      workHours: 4,
      transportFee: 0,
      nightShiftAllowance: true,
    });
    // 10000 * 4 * 1.5 = 60000
    expect(calculateEarnings(job)).toBe(60000);
  });

  it("returns zero for a zero-hour job (edge case)", () => {
    const job = makeJob({ hourlyPay: 12000, workHours: 0, transportFee: 0 });
    expect(calculateEarnings(job)).toBe(0);
  });

  it("handles transport fee only when workHours is positive", () => {
    const job = makeJob({ hourlyPay: 0, workHours: 4, transportFee: 5000 });
    expect(calculateEarnings(job)).toBe(5000);
  });
});
