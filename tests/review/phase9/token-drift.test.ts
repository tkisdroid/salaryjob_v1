/**
 * tests/review/phase9/token-drift.test.ts
 *
 * Phase 9 Plan 02 Task 02-05 — QA-05a static token-drift analysis (vitest)
 * + 54-route manifest sanity (Pitfall 1 — route count is 54 not 55).
 *
 * This is a `.test.ts` file (vitest), NOT a `.spec.ts` file (playwright).
 * Runs via `npx vitest run tests/review/phase9/token-drift.test.ts`.
 *
 * Sanity counts (54/20/20/4/10) snapshot the manifest on 2026-04-23. If someone
 * adds a route without a Phase 9 re-plan, this fires loudly.
 *
 * The token-drift analyzer lives in scripts/review/phase9-token-drift.ts
 * (Plan 01 Task 01-03); this test just calls scanDrift and records the JSON
 * shard for Plan 03 aggregation.
 *
 * Pitfall 4 — semantic issues are human-authored; no mechanical fix-loop call.
 */
import { describe, it, expect } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { scanDrift } from "../../../scripts/review/phase9-token-drift";
import { routesForPersona, ROUTES } from "./checklist-base";

describe("Phase 9 — 54-route manifest sanity", () => {
  it("total route count is 54", () => {
    expect(ROUTES.length).toBe(54);
  });
  it("worker persona has 20 routes", () => {
    expect(routesForPersona("worker").length).toBe(20);
  });
  it("biz persona has 20 routes", () => {
    expect(routesForPersona("biz").length).toBe(20);
  });
  it("admin persona has 4 routes", () => {
    expect(routesForPersona("admin").length).toBe(4);
  });
  it("anon persona has 10 routes", () => {
    expect(routesForPersona("anon").length).toBe(10);
  });
});

describe("Phase 9 — QA-05a token-drift static analysis", () => {
  it("walks src/ and writes findings to .review/phase9-token-drift.json", async () => {
    const issues = await scanDrift("src");
    mkdirSync(".review", { recursive: true });
    writeFileSync(
      ".review/phase9-token-drift.json",
      JSON.stringify(issues, null, 2),
    );
    // Record-only: no critical severity expected from static token-drift.
    const critical = issues.filter((i) => i.severity === "critical");
    expect(critical).toHaveLength(0);
    // High findings surface in console but do not fail the test — Plan 03 triages.
    const high = issues.filter((i) => i.severity === "high");
    if (high.length > 0) {
      console.warn(
        `[token-drift] ${high.length} high-severity finding(s) — see .review/phase9-token-drift.json`,
      );
    }
    expect(Array.isArray(issues)).toBe(true);
  });
});
