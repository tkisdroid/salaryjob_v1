/**
 * tests/review/phase9/empty-state.spec.ts
 *
 * Phase 9 Plan 02 Task 02-03 — Empty-state bucket with destructive seed overlay.
 *
 * Runs under BOTH review-desktop + mobile-375 projects. For each entry in
 * config/empty-state-map.json (12 total: 5 worker + 5 biz + 2 admin), opens the
 * route with the correct persona storage, asserts the expected Korean empty-state
 * phrase is visible. Findings written to .review/phase9-empty-${project}.json.
 *
 * Seed lifecycle:
 *   beforeAll → seedEmptyProfile() — deletes fixture applications/jobs/reviews/
 *   settlements so "logged-in user with no history" matches reality.
 *   afterAll → writes shard, then restorePopulatedProfile() to leave the test DB
 *   in the Phase 07.1 MAXIMAL-COVERAGE state for subsequent non-Phase-9 specs.
 *
 * Destructive: ONLY safe on .env.test local Supabase stack per Phase 07.1 D-04.
 * If seedEmptyProfile throws (DB unreachable), the whole spec errors — correct.
 *
 * Pitfall 2 — on the Phase 07.1 seed /my/applications has 5 rows; this spec
 * explicitly overlays an empty profile so the empty-state phrase IS the correct
 * assertion.
 *
 * Pitfall 4 — semantic fixes stay human-authored (no mechanical fix loop
 * import). Pitfall 7 — 20s goto + 90s describe budget.
 */
import { test } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  STORAGE_STATE,
  type Phase9Issue,
  type Phase9Viewport,
} from "./checklist-base";
import {
  seedEmptyProfile,
  restorePopulatedProfile,
} from "./fixtures/empty-state";
import emptyMap from "./config/empty-state-map.json";

type EmptyEntry = {
  path: string;
  persona: "worker" | "biz" | "admin";
  phrase: string;
};
const ENTRIES = emptyMap as EmptyEntry[];

const BY_PERSONA: Record<string, EmptyEntry[]> = {};
for (const e of ENTRIES) {
  (BY_PERSONA[e.persona] ??= []).push(e);
}

const slug = (s: string) => s.replace(/[^a-z0-9]/gi, "-");

const issues: Phase9Issue[] = [];

test.describe("@phase9-empty", () => {
  test.setTimeout(90_000); // seed ops add overhead on top of Pitfall 7 budget

  test.beforeAll(async () => {
    await seedEmptyProfile();
  });

  test.afterAll(async () => {
    const project = test.info().project.name;
    mkdirSync(".review", { recursive: true });
    writeFileSync(
      join(".review", `phase9-empty-${project}.json`),
      JSON.stringify({ issues }, null, 2),
    );
    await restorePopulatedProfile();
  });

  for (const persona of ["worker", "biz", "admin"] as const) {
    const entries = BY_PERSONA[persona] ?? [];
    if (entries.length === 0) continue;
    const storage = STORAGE_STATE[persona];
    test.describe(`persona=${persona}`, () => {
      if (storage) test.use({ storageState: storage });
      for (const e of entries) {
        test(`${e.path} expected empty phrase`, async ({ page }, info) => {
          const project = info.project.name as Phase9Viewport;
          try {
            await page.goto(e.path, { waitUntil: "networkidle", timeout: 20_000 });
            const pattern = new RegExp(e.phrase);
            const locator = page.getByText(pattern, { exact: false });
            const visible = await locator
              .first()
              .isVisible({ timeout: 5_000 })
              .catch(() => false);
            if (!visible) {
              issues.push({
                id: `q9-empty-${persona}-${project}-${slug(e.path)}`,
                severity: "high",
                route: e.path,
                viewport: project,
                persona,
                bucket: "empty-state",
                message: `Expected empty-state phrase /${e.phrase}/ not visible on ${e.path}`,
                evidence: `pattern=${e.phrase}`,
              });
            }
          } catch (err) {
            issues.push({
              id: `q9-empty-err-${persona}-${project}-${slug(e.path)}`,
              severity: "medium",
              route: e.path,
              viewport: project,
              persona,
              bucket: "empty-state",
              message: `Empty-state probe threw: ${(err as Error).message}`,
              evidence: "probe-exception",
            });
          }
        });
      }
    });
  }
});
