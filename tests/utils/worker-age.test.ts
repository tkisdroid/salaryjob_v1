import { describe, expect, it } from "vitest";
import { formatBirthDate, getInternationalAge } from "@/lib/worker-age";

describe("worker age helpers", () => {
  it("calculates 만 나이 correctly before the birthday", () => {
    expect(
      getInternationalAge("1996-04-18", new Date("2026-04-12T00:00:00.000Z")),
    ).toBe(29);
  });

  it("calculates 만 나이 correctly after the birthday", () => {
    expect(
      getInternationalAge("1996-04-18", new Date("2026-04-20T00:00:00.000Z")),
    ).toBe(30);
  });

  it("formats a stored birth date as a Korean date string", () => {
    expect(formatBirthDate("1996-04-18")).toContain("1996");
  });
});
