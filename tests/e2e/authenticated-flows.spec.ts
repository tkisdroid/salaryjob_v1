import { expect, test, type Page } from "@playwright/test";
import { loginAs } from "../helpers/test-users";

function trackPageErrors(page: Page) {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  return pageErrors;
}

async function expectRouteOk(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response, `${path} did not produce a response`).not.toBeNull();
  expect(
    response!.status(),
    `${path} returned HTTP ${response!.status()}`,
  ).toBeLessThan(400);
}

test.describe("authenticated route smoke", () => {
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL,
    "Requires Supabase env from Plan 02",
  );

  test("worker routes render without runtime errors", async ({ page }) => {
    test.setTimeout(90_000);
    const pageErrors = trackPageErrors(page);

    await loginAs(page, "worker");

    for (const path of [
      "/home",
      "/explore",
      "/search",
      "/notifications",
      "/chat",
      "/chat/chat-1",
      "/my",
      "/my/profile",
      "/my/profile/edit",
      "/my/favorites",
      "/my/applications",
      "/my/settlements",
      "/my/schedule",
      "/my/availability",
    ]) {
      await expectRouteOk(page, path);
    }

    expect(pageErrors).toEqual([]);
  });

  test("business routes render without runtime errors", async ({ page }) => {
    test.setTimeout(90_000);
    const pageErrors = trackPageErrors(page);

    await loginAs(page, "business");

    for (const path of [
      "/biz",
      "/biz/posts",
      "/biz/settlements",
      "/biz/chat",
      "/biz/chat/c1",
      "/biz/workers",
      "/biz/settings",
      "/biz/settings/notifications",
      "/biz/settings/payment",
      "/biz/settings/commission",
      "/biz/settings/support",
    ]) {
      await expectRouteOk(page, path);
    }

    expect(pageErrors).toEqual([]);
  });

  test("admin session can use business dashboard routes", async ({ page }) => {
    test.setTimeout(45_000);
    const pageErrors = trackPageErrors(page);

    await loginAs(page, "admin");

    for (const path of ["/biz", "/biz/posts", "/biz/settings"]) {
      await expectRouteOk(page, path);
    }

    expect(pageErrors).toEqual([]);
  });
});
