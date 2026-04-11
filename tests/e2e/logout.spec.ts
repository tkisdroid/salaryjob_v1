import { expect, test } from "@playwright/test";
import { loginAs } from "../helpers/test-users";

test.describe("AUTH-04 logout", () => {
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL,
    "Requires Supabase env from Plan 02",
  );

  test("worker logout clears auth cookies", async ({ page, context }) => {
    await loginAs(page, "worker2");
    await page.goto("/my");
    await page.getByRole("button", { name: /로그아웃|logout/i }).click();
    await page.waitForURL(/\/login/, { timeout: 10_000 });

    const cookies = await context.cookies();
    const authCookies = cookies.filter((cookie) =>
      /^sb-.*-auth-token$/.test(cookie.name),
    );

    expect(authCookies).toHaveLength(0);
  });

  test("business logout clears auth cookies", async ({ page, context }) => {
    await loginAs(page, "business2");
    await page.goto("/biz/settings");
    await page.getByRole("button", { name: /^로그아웃$/ }).click();
    await page.waitForURL(/\/login/, { timeout: 10_000 });

    const cookies = await context.cookies();
    const authCookies = cookies.filter((cookie) =>
      /^sb-.*-auth-token$/.test(cookie.name),
    );

    expect(authCookies).toHaveLength(0);
  });
});
