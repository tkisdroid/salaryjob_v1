import { expect, test, type Page } from "@playwright/test";

async function getFirstPostPath(page: Page): Promise<string> {
  await page.goto("/");
  const firstPost = page.locator('a[href^="/posts/"]').first();
  await expect(firstPost).toBeVisible({ timeout: 10_000 });

  const href = await firstPost.getAttribute("href");
  expect(href).toMatch(/^\/posts\/[0-9a-f-]{36}$/);
  return href!;
}

test.describe("public post back navigation", () => {
  test("direct entry falls back to the home list", async ({ page }) => {
    const postPath = await getFirstPostPath(page);

    await page.goto(postPath);
    await page.getByRole("button", { name: "공고 목록으로 돌아가기" }).click();

    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
  });

  test("internal navigation returns to the previous page", async ({ page }) => {
    await page.goto("/");
    const firstPost = page.locator('a[href^="/posts/"]').first();
    await firstPost.click();

    await page.getByRole("button", { name: "공고 목록으로 돌아가기" }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
  });
});
