import { test, expect } from "@playwright/test";

test.describe("POST-04 — public landing page job list", () => {
  test("anonymous visitor to / sees job cards", async ({ page }) => {
    await page.goto("/");

    // The brand wordmark "GigNow" is rendered as a span in the header;
    // the actual h1 is the hero copy. Assert the hero headline is visible.
    await expect(
      page.getByRole("heading", { name: /내가 원할 때/ }),
    ).toBeVisible();

    // Full paginated list section (new in 03-06)
    await expect(
      page.getByRole("heading", { name: /지금 모집 중인 공고/ }),
    ).toBeVisible();

    // At least one job card link with /posts/ href must render
    // (Phase 2 seed has 8 jobs, future-dated — at least one should be active)
    const jobLinks = page.locator('a[href^="/posts/"]');
    await expect(jobLinks.first()).toBeVisible({ timeout: 15000 });
  });

  test("anonymous visitor can click a job card and reach /posts/[id] without login", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("heading", { name: /지금 모집 중인 공고/ })
      .waitFor();

    const firstJob = page.locator('a[href^="/posts/"]').first();
    await firstJob.click();

    // URL MUST be /posts/{uuid} — NOT /login (middleware /posts/ prefix bypass)
    await expect(page).toHaveURL(/\/posts\/[0-9a-f-]{36}/);

    // The public detail page must show the CTA without redirecting to login
    await expect(
      page.getByRole("link", { name: /원탭 지원/ }),
    ).toBeVisible();

    // And that CTA must point at /login?next=/posts/{id}
    const applyLink = page.getByRole("link", { name: /원탭 지원/ });
    const href = await applyLink.getAttribute("href");
    expect(href).toMatch(/\/login\?next=\/posts\//);
  });

  // Infinite scroll E2E requires > 20 seeded jobs to reach the sentinel.
  // Phase 2 seeded 8, so skipping until additional fixtures are added.
  test.skip("infinite scroll loads more jobs on scroll to bottom", async () => {
    // TODO: requires > 20 seeded active future-dated jobs
  });
});
