import { expect, test, type Page } from "@playwright/test";
import { DEV_USERS, loginAs } from "../helpers/test-users";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getFirstPostPath(page: Page): Promise<string> {
  await page.goto("/");
  const firstPost = page.locator('a[href^="/posts/"]').first();
  await expect(firstPost).toBeVisible({ timeout: 10_000 });
  const href = await firstPost.getAttribute("href");
  expect(href).toMatch(/^\/posts\/[0-9a-f-]{36}$/);
  return href!;
}

test.describe("login destination recovery", () => {
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL,
    "Requires Supabase env from Plan 02",
  );

  test("anonymous one-tap login returns to the apply page", async ({ page }) => {
    const postPath = await getFirstPostPath(page);

    await page.goto(postPath);
    await page.getByRole("link", { name: /지원하기/i }).click();
    await page.waitForURL(/\/login\?next=/, { timeout: 10_000 });

    await page.locator("#email").fill(DEV_USERS.worker2.email);
    await page.locator("#password").fill(DEV_USERS.worker2.password);
    await page.locator("form").first().locator('button[type="submit"]').click();

    await page.waitForURL(new RegExp(`${escapeRegExp(postPath)}/apply$`), {
      timeout: 15_000,
    });
  });

  test("authenticated worker is redirected away from /login back to next", async ({
    page,
  }) => {
    const postPath = await getFirstPostPath(page);
    await loginAs(page, "worker");

    await page.goto(`/login?next=${encodeURIComponent(`${postPath}/apply`)}`);
    await expect(page).toHaveURL(new RegExp(`${escapeRegExp(postPath)}/apply$`), {
      timeout: 10_000,
    });
  });

  test("business user can open public post detail without being bounced to login", async ({
    page,
  }) => {
    const postPath = await getFirstPostPath(page);
    await loginAs(page, "business");

    await page.goto(postPath);
    await expect(page).toHaveURL(new RegExp(`${escapeRegExp(postPath)}$`), {
      timeout: 10_000,
    });
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5_000 });
  });
});
