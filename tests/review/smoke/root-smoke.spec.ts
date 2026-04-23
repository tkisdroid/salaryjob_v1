/**
 * tests/review/smoke/root-smoke.spec.ts
 *
 * Phase 07.1 Plan 01 Task 4 — single-route smoke spec tagged `@smoke`.
 * Exercises 9 of the 16 D-17 gates on the `/` route:
 *   - D-11 five assertions (checkPageReady → G13)
 *   - G1 jsErrors, G2 consoleErrors, G3 consoleWarnings via hookErrorCollectors
 *   - G4/G5 bad responses (with D-18 allow-list filtered via ../config/allowed-4xx.json)
 *   - G8 axe-core critical + serious (D-12)
 *   - G14 CTA interaction probe (D-13 white-screen guard from D-22)
 *
 * Gates NOT exercised in smoke (covered by runner or Plan 02):
 *   G6 tsc, G7 eslint, G9..G12 Lighthouse (separate subprocess), G15 E2E loops, G16 vitest.
 */

import { test, expect } from "@playwright/test";
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

test("@smoke root route passes all D-11/D-12/D-13 gates", async ({ page }) => {
  const collectors = hookErrorCollectors(page);
  const ready = await checkPageReady(page, "/", /GigNow|긱나우|로그인|탐색/i);

  // D-11 five assertions (independently FAIL-capable per closing note)
  expect(ready.a_status, ready.a_status_msg).toBe(true);
  expect(ready.b_loaded, ready.b_loaded_msg).toBe(true);
  expect(ready.c_content, ready.c_content_msg).toBe(true);
  expect(ready.d_textLen, ready.d_textLen_msg).toBe(true);
  expect(ready.e_noSkeleton, ready.e_noSkeleton_msg).toBe(true);

  // G1/G2/G3 zero
  expect(collectors.jsErrors, "G1 runtime JS errors").toHaveLength(0);
  expect(collectors.consoleErrors, "G2 console errors").toHaveLength(0);
  expect(collectors.consoleWarnings, "G3 console warnings").toHaveLength(0);

  // G4/G5 zero (except D-18 allow-list — e.g., /auth/whoami anon 401)
  const allowList = allowed4xx as Allow4xxEntry[];
  const unexpected4xx = collectors.badResponses.filter((r) => {
    if (r.status >= 500) return true;
    return !allowList.some(
      (a) => r.url.includes(a.route) && a.status === r.status,
    );
  });
  expect(
    unexpected4xx,
    `unexpected 4xx/5xx: ${JSON.stringify(unexpected4xx)}`,
  ).toHaveLength(0);

  // G8 axe critical + serious
  const { violations } = await runAxeCriticalSerious(page);
  expect(
    violations,
    `axe critical+serious: ${violations.map((v) => v.id).join(", ")}`,
  ).toHaveLength(0);

  // G13 enforced above via checkPageReady; G14 = CTA probe (D-22 white-screen guard)
  const cta = await probeCta(
    page,
    'a[href="/login"], a[href="/home"], a[href="/signup"], button',
  );
  expect(cta, "D-13 interaction probe (D-22 white-screen guard)").not.toBe(
    "no-response",
  );
});
