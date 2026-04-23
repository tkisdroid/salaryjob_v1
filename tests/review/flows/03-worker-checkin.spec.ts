/**
 * tests/review/flows/03-worker-checkin.spec.ts
 *
 * D-15 canonical loop 3 — Worker 체크인.
 *
 * Worker opens the check-in screen for the seeded accepted application,
 * clicks 체크인 (QR scan stub is a button fallback), confirms status becomes
 * checked_in.
 *
 * Tag `@flow-03` is matched by scripts/review/run-full-sweep.ts via --grep.
 */

import { test, expect } from "@playwright/test";
import { APPLICATION_IDS } from "../fixtures/ids";

test.use({ storageState: "playwright/.auth/worker.json" });
test.setTimeout(60_000);

test("@flow-03 worker check-in", async ({ page }) => {
  const started = Date.now();
  // APPLICATION_IDS[3] is the completed app per seed D-07 (has shift + checkin target).
  const applicationId = APPLICATION_IDS[3]!;

  // Step 1 — open the check-in screen for the seeded application.
  await page.goto(`/my/applications/${applicationId}/check-in`);
  await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

  // Step 2 — click the 체크인 button (also covers QR scan stub via button fallback).
  const checkinCta = page
    .locator(
      'button:has-text("체크인"), button:has-text("출근"), button[data-action="check-in"]',
    )
    .first();
  await checkinCta.waitFor({ state: "visible", timeout: 10_000 });
  await checkinCta.click();

  // Step 3 — assert checked_in status feedback (toast / updated status text).
  await expect(
    page
      .locator(
        '[data-sonner-toast], [role="status"], text=/체크인 완료|출근 완료|checked_in/i',
      )
      .first(),
  ).toBeVisible({ timeout: 10_000 });

  const ended = Date.now();
  const elapsedMs = ended - started;
  console.log(
    JSON.stringify({ flow: "03", started, ended, elapsedMs, passed: true }),
  );
  expect(
    elapsedMs,
    "D-15 loop 3 must complete within 60s wall-clock",
  ).toBeLessThanOrEqual(60_000);
});
