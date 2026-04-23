/**
 * tests/review/phase9/tab-bar-occlusion.spec.ts
 *
 * Phase 9 Plan 02 Task 02-04 — QA-05c mobile tab-bar CTA occlusion detector.
 *
 * Runs on mobile-375 ONLY (desktop skipped at runtime via testInfo.skip).
 * For every non-HIDE_TAB_BAR_PATTERNS route in the 54-route manifest, walks
 * all fixed/sticky bottom CTAs and checks whether any visible CTA's bottom
 * pixel-y value overlaps the 66px tab-bar slice (vh - TAB_BAR_HEIGHT).
 *
 * Pitfall 3 — use boundingBox math, not z-index. Two fixed elements can
 * visually overlap regardless of z-order, which is exactly the bug surfaced.
 *
 * Uses browser.newContext() per-test so each route gets persona-correct
 * storageState isolation — the spec iterates mixed personas in one describe,
 * so test.use({ storageState }) at describe level is insufficient.
 *
 * Pitfall 4 — semantic issues stay human-authored; no mechanical fix-loop
 * import. Pitfall 7 — 20s goto + 60s per-test budget.
 */
import { test } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  ROUTES,
  STORAGE_STATE,
  TAB_BAR_HEIGHT,
  isTabBarHidden,
  type Phase9Issue,
} from "./checklist-base";

const slug = (s: string) => s.replace(/[^a-z0-9]/gi, "-");

const issues: Phase9Issue[] = [];

test.describe("@phase9-occlusion", () => {
  test.setTimeout(60_000);

  for (const route of ROUTES) {
    test(`${route.path} [${route.seedAs}] no CTA under tab bar`, async ({
      browser,
    }, info) => {
      if (info.project.name !== "mobile-375") {
        info.skip(true, "occlusion check is mobile-only");
      }
      if (isTabBarHidden(route.path)) {
        info.skip(true, "route intentionally hides tab bar");
      }
      if (!route.mobileOk) {
        info.skip(true, "mobileOk=false in manifest");
      }

      const storage = STORAGE_STATE[route.seedAs];
      const context = await browser.newContext(
        storage ? { storageState: storage } : {},
      );
      const page = await context.newPage();
      try {
        await page.goto(route.path, { waitUntil: "networkidle", timeout: 20_000 });
        const vp = page.viewportSize();
        if (!vp) throw new Error("no viewport");

        // Collect candidate CTAs — fixed/sticky, visible, near the bottom.
        const ctas = await page.evaluate(() => {
          const all = Array.from(
            document.querySelectorAll('button, a[role="button"]'),
          );
          const targets: {
            bottom: number;
            top: number;
            text: string;
            visible: boolean;
          }[] = [];
          for (const el of all) {
            const s = window.getComputedStyle(el);
            if (s.position !== "fixed" && s.position !== "sticky") continue;
            const r = el.getBoundingClientRect();
            if (r.width < 50 || r.height < 20) continue;
            if (r.bottom < window.innerHeight - 120) continue;
            targets.push({
              bottom: r.bottom,
              top: r.top,
              text: (el.textContent ?? "").trim().slice(0, 60),
              visible: s.visibility !== "hidden" && s.display !== "none",
            });
          }
          return targets;
        });

        const occluded = ctas.filter(
          (c) => c.visible && c.bottom > vp.height - TAB_BAR_HEIGHT,
        );
        for (const o of occluded) {
          issues.push({
            id: `q9-occlusion-${slug(route.path)}-${Math.round(o.bottom)}`,
            severity: "high",
            route: route.path,
            viewport: "mobile-375",
            persona: route.seedAs,
            bucket: "tab-bar-occlusion",
            message: `Sticky/fixed CTA bottom=${o.bottom} overlaps tab-bar zone (vh=${vp.height}, tab-h=${TAB_BAR_HEIGHT}): "${o.text}"`,
            evidence: JSON.stringify(o),
          });
        }
      } finally {
        await page.close();
        await context.close();
      }
    });
  }

  test.afterAll(() => {
    mkdirSync(".review", { recursive: true });
    writeFileSync(
      join(".review", "phase9-occlusion-mobile-375.json"),
      JSON.stringify({ issues }, null, 2),
    );
  });
});
