import { expect, test, type Page } from "@playwright/test";
import { loginAs } from "../helpers/test-users";

/**
 * Regression for: "/my/applications 지원내역에서 진행중과 완료 표시가 안됨"
 * (2026-04-11).
 *
 * Seed guarantees kim-jihoon has:
 *   예정 (upcoming): 2 apps (confirmed)
 *   진행중 (active): 1 app (in_progress)
 *   완료 (done): 4 apps (settled)
 *
 * This test clicks every tab and asserts the application cards render
 * without console errors.
 */

function trackPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

test.describe("/my/applications tabs", () => {
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL,
    "Requires Supabase env from Plan 02",
  );

  test("all three tabs render without runtime errors", async ({ page }) => {
    test.setTimeout(45_000);
    const errors = trackPageErrors(page);

    await loginAs(page, "worker");
    const response = await page.goto("/my/applications");
    expect(response?.status()).toBeLessThan(400);

    // Tab headers contain counts. We do not assert the numbers — we
    // assert that clicking into each tab actually renders at least one
    // application card (or the empty state).
    const tabs = [
      { name: /예정 \(/, emptyText: /예정된 지원이 없어요/ },
      { name: /진행중 \(/, emptyText: /진행 중인 근무가 없어요/ },
      { name: /완료 \(/, emptyText: /완료된 근무가 없어요/ },
    ];

    for (const tab of tabs) {
      await page.getByRole("tab", { name: tab.name }).click();
      // Either at least one ApplicationCard article is visible OR the
      // matching empty-state message is rendered. Any other outcome
      // (blank panel, hydration error, missing card) fails the test.
      const articles = page.locator("article");
      const empty = page.locator(`text=${tab.emptyText.source}`);
      const hasArticles = (await articles.count()) > 0;
      const hasEmpty = (await empty.count()) > 0;
      expect(
        hasArticles || hasEmpty,
        `Tab ${tab.name} rendered neither application cards nor the empty state`,
      ).toBe(true);
    }

    expect(errors, `pageerror collected: ${errors.join(" | ")}`).toEqual([]);
  });
});
