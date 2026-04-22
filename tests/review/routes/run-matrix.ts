/**
 * tests/review/routes/run-matrix.ts
 *
 * Phase 07.1 Plan 02 Task 1 — 108-scenario expansion of the 54-route manifest
 * (D-14) times 2 viewport projects (D-09: review-desktop + mobile-375).
 *
 * Each scenario exercises 8 of the 16 D-17 gates synchronously inside one
 * Playwright `test()` body, so the 54 route entries run independently under each
 * project and the aggregator in scripts/review/run-full-sweep.ts can count the
 * pass/fail tallies per gate from the single `tests/review/_results.json` JSON
 * reporter output (wired in playwright.config.ts).
 *
 * Gates exercised here:
 *   G1  runtime JS errors         — hookErrorCollectors
 *   G2  console errors            — hookErrorCollectors
 *   G3  console warnings          — hookErrorCollectors
 *   G4  network 4xx (allow aware) — hookErrorCollectors + allowed-4xx.json
 *   G5  network 5xx               — hookErrorCollectors
 *   G8  axe-core critical+serious — runAxeCriticalSerious
 *   G13 D-11 five assertions      — checkPageReady
 *   G14 D-13 CTA probe (D-22 white-screen guard) — probeCta
 *
 * Gates NOT exercised here (aggregator fills them from other subprocesses):
 *   G6 tsc, G7 eslint, G9..G12 Lighthouse, G15 E2E flows, G16 vitest.
 *
 * Project visibility:
 *   This file lives under `./tests/review/` and is picked up by the
 *   `review-desktop` + `mobile-375` projects (testDir `./tests/review`).
 *   Dispatch happens twice — once per project. `testInfo.project.name`
 *   decides desktopOk / mobileOk skip gates per D-14.
 */

import { test, expect } from "@playwright/test";
import { ROUTES } from "./manifest";
import { checkPageReady } from "../helpers/page-ready";
import { probeCta } from "../helpers/cta-probe";
import { hookErrorCollectors } from "../helpers/errors";
import { runAxeCriticalSerious } from "../helpers/a11y";
import allowed4xx from "../config/allowed-4xx.json";

type Allow4xxEntry = {
  route: string;
  persona: string;
  status: number;
  reason: string;
};

const ALLOW_LIST = allowed4xx as Allow4xxEntry[];

// Persona → storageState mapping produced by auth.setup.ts (one JSON per persona).
const STORAGE_STATE: Record<string, string | undefined> = {
  worker: "playwright/.auth/worker.json",
  biz: "playwright/.auth/biz.json",
  admin: "playwright/.auth/admin.json",
  anon: undefined, // no storageState — unauthenticated
};

for (const route of ROUTES) {
  const personaStorage = STORAGE_STATE[route.seedAs];

  test.describe(`@matrix ${route.seedAs} ${route.path}`, () => {
    if (personaStorage) {
      test.use({ storageState: personaStorage });
    }

    test(`${route.path} [${route.seedAs}]`, async ({ page }, testInfo) => {
      const projectName = testInfo.project.name;

      // D-14 desktopOk / mobileOk gate: skip if the route opted out of this viewport.
      const skipReason =
        !route.desktopOk && projectName === "review-desktop"
          ? "desktopOk=false"
          : !route.mobileOk && projectName === "mobile-375"
            ? "mobileOk=false"
            : null;
      if (skipReason) testInfo.skip(true, skipReason);

      // G1..G5 collectors — attach BEFORE navigation so pageerror + console fire.
      const collectors = hookErrorCollectors(page);

      // G13 — D-11 five assertions (checkPageReady navigates to route.path)
      const ready = await checkPageReady(page, route.path, route.contentAssertion);
      expect(ready.a_status, `G13a status ${route.path}: ${ready.a_status_msg}`).toBe(true);
      expect(ready.b_loaded, `G13b loaded ${route.path}: ${ready.b_loaded_msg}`).toBe(true);
      expect(ready.c_content, `G13c content ${route.path}: ${ready.c_content_msg}`).toBe(true);
      expect(ready.d_textLen, `G13d textLen ${route.path}: ${ready.d_textLen_msg}`).toBe(true);
      expect(ready.e_noSkeleton, `G13e skeleton ${route.path}: ${ready.e_noSkeleton_msg}`).toBe(true);

      // G1 / G2 / G3 — zero tolerance
      expect(collectors.jsErrors, `G1 runtime JS errors on ${route.path}`).toHaveLength(0);
      expect(collectors.consoleErrors, `G2 console errors on ${route.path}`).toHaveLength(0);
      expect(collectors.consoleWarnings, `G3 console warnings on ${route.path}`).toHaveLength(0);

      // G4 / G5 — network status filter with D-18 allow-list.
      const unexpected = collectors.badResponses.filter((r) => {
        if (r.status >= 500) return true; // G5 — no 5xx allow-list
        return !ALLOW_LIST.some(
          (a) =>
            r.url.includes(a.route) &&
            a.persona === route.seedAs &&
            a.status === r.status,
        );
      });
      expect(
        unexpected,
        `G4/G5 unlisted bad responses on ${route.path}: ${JSON.stringify(unexpected)}`,
      ).toHaveLength(0);

      // G8 — axe critical + serious
      const { violations } = await runAxeCriticalSerious(page);
      expect(
        violations,
        `G8 axe critical+serious on ${route.path}: ${violations.map((v) => v.id).join(",")}`,
      ).toHaveLength(0);

      // G14 — D-13 CTA probe (D-22 white-screen override: numeric gates can all
      // pass but if the primary CTA yields zero response the whole scenario FAILs).
      const cta = await probeCta(page, route.primaryCta);
      expect(
        cta,
        `G14/D-22 no-response on ${route.path} CTA=${route.primaryCta}`,
      ).not.toBe("no-response");
    });
  });
}
