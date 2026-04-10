// GREEN (Plan 04-07): src/lib/time-filters.ts implements buildTimeFilterSQL.
// REQ: SEARCH-03 — 시간 프리셋(오늘/내일/이번주)을 SQL WHERE 절 조각으로 변환.

import { describe, it, expect } from "vitest";
import { buildTimeFilterSQL } from "@/lib/time-filters";

describe("SEARCH-03 buildTimeFilterSQL presets", () => {
  it("preset 오늘 → workDate = current_date", () => {
    const result = buildTimeFilterSQL({ preset: "오늘" });
    expect(result.whereClause).toMatch(/workDate"?\s*=\s*current_date/i);
  });

  it("preset 내일 → workDate = current_date + 1 day", () => {
    const result = buildTimeFilterSQL({ preset: "내일" });
    expect(result.whereClause).toMatch(/current_date\s*\+\s*(interval\s*'1 day'|1)/i);
  });

  it("preset 이번주 → workDate BETWEEN week-start AND week-start+6", () => {
    const result = buildTimeFilterSQL({ preset: "이번주" });
    expect(result.whereClause).toMatch(/BETWEEN/i);
    expect(result.whereClause).toMatch(/date_trunc\(\s*'week'/i);
  });

  it("returns object with { whereClause, params } shape", () => {
    const result = buildTimeFilterSQL({ preset: "오늘" });
    expect(result).toHaveProperty("whereClause");
    expect(result).toHaveProperty("params");
    expect(Array.isArray(result.params)).toBe(true);
  });
});
