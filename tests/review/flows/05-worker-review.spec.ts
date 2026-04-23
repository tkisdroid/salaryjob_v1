/**
 * tests/review/flows/05-worker-review.spec.ts
 *
 * D-15 canonical loop 5 — Worker 리뷰 작성.
 *
 * D-16: folds todo 2026-04-11-phase-5-plan-05-05-browser-uat-review-settlement-flow.md
 *   Rationale: the pending "Phase 5 Plan 05-05 브라우저 UAT — 리뷰+정산 UI 4개 시나리오"
 *   is a subset of D-15 loops 5 (this file), 6, 7. Reaching GREEN on this spec
 *   closes that folded todo; Plan 02 SUMMARY.md back-references the closure.
 *
 * Worker submits 5-star rating + short comment for completed application, asserts
 * the review is persisted (toast / status / success text).
 *
 * Tag `@flow-05` is matched by scripts/review/run-full-sweep.ts via --grep.
 */

import { test, expect } from "@playwright/test";
import { APPLICATION_IDS } from "../fixtures/ids";

test.use({ storageState: "playwright/.auth/worker.json" });
test.setTimeout(60_000);

test("@flow-05 worker writes review", async ({ page }) => {
  const started = Date.now();
  const applicationId = APPLICATION_IDS[3]!;

  // Step 1 — open the worker review page for the completed application.
  await page.goto(`/my/applications/${applicationId}/review`);
  await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

  // Step 2 — submit 5-star rating. Tolerant to different rating UIs.
  const fiveStar = page
    .locator(
      'input[name="rating"][value="5"], button[data-rating="5"], [aria-label*="5 stars"], [aria-label*="5점"]',
    )
    .first();
  await fiveStar.waitFor({ state: "visible", timeout: 10_000 });
  await fiveStar.click();

  // Step 3 — fill optional comment textarea (tolerant — fall through if absent).
  const commentBox = page.locator('textarea, [contenteditable="true"]').first();
  if (await commentBox.isVisible().catch(() => false)) {
    await commentBox.fill("잘 부탁드립니다. 감사합니다.");
  }

  // Step 4 — submit.
  const submit = page.locator('button[type="submit"]').first();
  await submit.waitFor({ state: "visible", timeout: 10_000 });
  await submit.click();

  // Step 5 — assert persisted.
  await expect(
    page
      .locator(
        '[data-sonner-toast], [role="status"], text=/리뷰 저장|저장 완료|등록 완료/',
      )
      .first(),
  ).toBeVisible({ timeout: 10_000 });

  const ended = Date.now();
  const elapsedMs = ended - started;
  console.log(
    JSON.stringify({ flow: "05", started, ended, elapsedMs, passed: true }),
  );
  expect(
    elapsedMs,
    "D-15 loop 5 (Phase 5 Plan 05-05 folded) must complete within 60s wall-clock",
  ).toBeLessThanOrEqual(60_000);
});
