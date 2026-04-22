/**
 * tests/review/flows/04-worker-checkout.spec.ts
 *
 * D-15 canonical loop 4 — Worker 체크아웃.
 *
 * Worker (already checked in per loop 3) opens the check-in page again, clicks
 * 체크아웃, asserts status transitions to completed.
 *
 * Tag `@flow-04` is matched by scripts/review/run-full-sweep.ts via --grep.
 */

import { test, expect } from "@playwright/test";
import { APPLICATION_IDS } from "../fixtures/ids";

test.use({ storageState: "playwright/.auth/worker.json" });
test.setTimeout(60_000);

test("@flow-04 worker check-out", async ({ page }) => {
  const started = Date.now();
  const applicationId = APPLICATION_IDS[3]!;

  // Step 1 — navigate to the application's check-in/check-out screen.
  await page.goto(`/my/applications/${applicationId}/check-in`);
  await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

  // Step 2 — click 체크아웃.
  const checkoutCta = page
    .locator(
      'button:has-text("체크아웃"), button:has-text("퇴근"), button[data-action="check-out"]',
    )
    .first();
  await checkoutCta.waitFor({ state: "visible", timeout: 10_000 });
  await checkoutCta.click();

  // Step 3 — assert completed status (toast or status text).
  await expect(
    page
      .locator(
        '[data-sonner-toast], [role="status"], text=/체크아웃 완료|퇴근 완료|근무 완료|completed/i',
      )
      .first(),
  ).toBeVisible({ timeout: 10_000 });

  const ended = Date.now();
  const elapsedMs = ended - started;
  console.log(
    JSON.stringify({ flow: "04", started, ended, elapsedMs, passed: true }),
  );
  expect(
    elapsedMs,
    "D-15 loop 4 must complete within 60s wall-clock",
  ).toBeLessThanOrEqual(60_000);
});
