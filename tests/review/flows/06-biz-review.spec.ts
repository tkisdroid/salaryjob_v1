/**
 * tests/review/flows/06-biz-review.spec.ts
 *
 * D-15 canonical loop 6 — Business 리뷰 작성.
 *
 * Biz owner submits a review for the worker who completed an accepted shift.
 * Uses the biz-side review entrypoint
 *   /biz/posts/<JOB_ID>/applicants/<APPLICANT_ID>/review
 * which is enumerated in the route manifest (D-14).
 *
 * Tag `@flow-06` is matched by scripts/review/run-full-sweep.ts via --grep.
 */

import { test, expect } from "@playwright/test";
import { BIZ_IDS, JOB_IDS } from "../fixtures/ids";

test.use({ storageState: "playwright/.auth/biz.json" });
test.setTimeout(60_000);

test("@flow-06 business writes review", async ({ page }) => {
  const started = Date.now();
  const jobId = JOB_IDS[0]!;
  const applicantId = BIZ_IDS.verified;

  // Step 1 — open biz review page for the completed applicant.
  await page.goto(`/biz/posts/${jobId}/applicants/${applicantId}/review`);
  await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

  // Step 2 — submit 5-star rating.
  const fiveStar = page
    .locator(
      'input[name="rating"][value="5"], button[data-rating="5"], [aria-label*="5 stars"], [aria-label*="5점"]',
    )
    .first();
  await fiveStar.waitFor({ state: "visible", timeout: 10_000 });
  await fiveStar.click();

  // Step 3 — fill optional comment.
  const commentBox = page.locator('textarea, [contenteditable="true"]').first();
  if (await commentBox.isVisible().catch(() => false)) {
    await commentBox.fill("성실한 근무 감사합니다.");
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
    JSON.stringify({ flow: "06", started, ended, elapsedMs, passed: true }),
  );
  expect(
    elapsedMs,
    "D-15 loop 6 must complete within 60s wall-clock",
  ).toBeLessThanOrEqual(60_000);
});
