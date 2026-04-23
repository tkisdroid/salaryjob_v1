/**
 * tests/review/flows/01-worker-explore-apply.spec.ts
 *
 * D-15 canonical loop 1 — Worker 탐색 → 원탭 지원.
 *
 * Success criteria: complete the explore-to-apply loop in <= 60s wall-clock.
 * Tag `@flow-01` is matched by scripts/review/run-full-sweep.ts via --grep.
 *
 * Evidence: emits one-line JSON to stdout so run-full-sweep.ts can parse
 * the start/end timestamps + elapsedMs into the aggregate report (SC #4).
 */

import { test, expect } from "@playwright/test";

test.use({ storageState: "playwright/.auth/worker.json" });
test.setTimeout(60_000);

test("@flow-01 worker explore -> one-tap apply", async ({ page }) => {
  const started = Date.now();

  // Step 1 — land on worker home / explore feed.
  await page.goto("/home");
  await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

  // Step 2 — open the first available job card.
  const firstJob = page.locator('a[href^="/posts/"]').first();
  await firstJob.waitFor({ state: "visible", timeout: 10_000 });
  await firstJob.click();

  // Step 3 — enter the apply flow (one-tap 지원하기 button).
  const applyCta = page
    .locator('a[href*="/apply"], button:has-text("지원"), button:has-text("지원하기")')
    .first();
  await applyCta.waitFor({ state: "visible", timeout: 10_000 });
  await applyCta.click();

  // Step 4 — confirm submission (either a submit button on the apply page or a
  // toast/modal on the detail page for instant-apply flows).
  const submitButton = page.locator('button[type="submit"]').first();
  if (await submitButton.isVisible().catch(() => false)) {
    await submitButton.click();
  }

  // Step 5 — assert completion signal: toast, status change, or explicit text.
  await expect(
    page
      .locator(
        '[data-sonner-toast], [role="status"], [role="dialog"], text=/지원 완료|지원 완료되었|신청 완료/',
      )
      .first(),
  ).toBeVisible({ timeout: 10_000 });

  const ended = Date.now();
  const elapsedMs = ended - started;
  console.log(
    JSON.stringify({ flow: "01", started, ended, elapsedMs, passed: true }),
  );
  expect(
    elapsedMs,
    "D-15 loop 1 must complete within 60s wall-clock",
  ).toBeLessThanOrEqual(60_000);
});
