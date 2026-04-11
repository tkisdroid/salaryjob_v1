import { expect, test } from "@playwright/test";

test.describe("POST-04 public landing page job list", () => {
  test("anonymous visitor to / sees job cards", async ({ page }) => {
    await page.goto("/");

    const jobLinks = page.locator('a[href^="/posts/"]');
    await expect(jobLinks.first()).toBeVisible({ timeout: 15_000 });
  });

  test("anonymous visitor can click a job card and reach /posts/[id] without login", async ({
    page,
  }) => {
    await page.goto("/");

    const firstJob = page.locator('a[href^="/posts/"]').first();
    await firstJob.scrollIntoViewIfNeeded();

    const href = await firstJob.getAttribute("href");
    expect(href).toMatch(/^\/posts\/[0-9a-f-]{36}$/);

    await Promise.all([
      page.waitForURL(/\/posts\/[0-9a-f-]{36}/, { timeout: 10_000 }),
      firstJob.click(),
    ]);

    const applyLink = page.locator('a[href^="/login?next=%2Fposts%2F"]');
    await expect(applyLink).toBeVisible();
  });

  test.skip("infinite scroll loads more jobs on scroll to bottom", async () => {
    // TODO: requires > 20 seeded active future-dated jobs
  });
});
