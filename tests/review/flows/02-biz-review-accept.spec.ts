/**
 * tests/review/flows/02-biz-review-accept.spec.ts
 *
 * D-15 canonical loop 2 — Business 지원자 확인 → 확정.
 *
 * Biz owner opens the applicants list for a job, selects first pending applicant,
 * clicks 확정/수락, confirms the status transition to accepted/confirmed.
 *
 * Tag `@flow-02` is matched by scripts/review/run-full-sweep.ts via --grep.
 */

import { test, expect } from "@playwright/test";
import { JOB_IDS } from "../fixtures/ids";

test.use({ storageState: "playwright/.auth/biz.json" });
test.setTimeout(60_000);

test("@flow-02 business applicant review -> confirm", async ({ page }) => {
  const started = Date.now();
  const jobId = JOB_IDS[0]!;

  // Step 1 — open applicants list for seed job 0.
  await page.goto(`/biz/posts/${jobId}/applicants`);
  await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

  // Step 2 — open first applicant card.
  const firstApplicant = page
    .locator('a[href*="/applicants/"], [data-testid="applicant-row"]')
    .first();
  await firstApplicant.waitFor({ state: "visible", timeout: 10_000 });
  await firstApplicant.click();

  // Step 3 — click 확정/수락 CTA.
  const confirmCta = page
    .locator(
      'button:has-text("확정"), button:has-text("수락"), button[data-action="confirm"]',
    )
    .first();
  await confirmCta.waitFor({ state: "visible", timeout: 10_000 });
  await confirmCta.click();

  // Step 4 — assert confirmed status appears.
  await expect(
    page
      .locator('[data-sonner-toast], [role="status"], text=/확정|수락|승인/')
      .first(),
  ).toBeVisible({ timeout: 10_000 });

  const ended = Date.now();
  const elapsedMs = ended - started;
  console.log(
    JSON.stringify({ flow: "02", started, ended, elapsedMs, passed: true }),
  );
  expect(
    elapsedMs,
    "D-15 loop 2 must complete within 60s wall-clock",
  ).toBeLessThanOrEqual(60_000);
});
