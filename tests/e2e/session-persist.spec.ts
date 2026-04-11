import { expect, test } from "@playwright/test";
import { loginAs } from "../helpers/test-users";

test.describe("AUTH-03 session persistence", () => {
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL,
    "Requires Supabase env from Plan 02",
  );

  test("session persists across reload", async ({ page }) => {
    await loginAs(page, "both");
    await page.reload();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
