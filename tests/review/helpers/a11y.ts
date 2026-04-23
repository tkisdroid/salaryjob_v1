/**
 * tests/review/helpers/a11y.ts
 *
 * D-12 + Pitfall 4 — `@axe-core/playwright` has NO built-in severity filter. We must
 * run the full scan and post-filter the violations array by `impact` to keep only
 * critical + serious. This function returns both filtered + unfiltered so callers
 * can log the full violation set for debugging but assert only against `violations`.
 *
 * Tags include WCAG 2.0 AA + 2.1 AA baselines (common axe-core invocation).
 */

import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import type { Result as AxeResult } from "axe-core";

export type A11yScanOutput = {
  violations: AxeResult[];
  allViolations: AxeResult[];
};

export async function runAxeCriticalSerious(
  page: Page,
): Promise<A11yScanOutput> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  // D-12 post-filter: keep only critical + serious.
  const violations = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );

  return { violations, allViolations: results.violations };
}
