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
      "/my/settings",
      "/my/favorites",
      "/my/applications",
      "/my/settlements",
      // /my/applications/<id> detail page — regression for 404 when tapping
      // a confirmed-shift banner on /my. The detail route below is resolved
      // dynamically by fetching the worker's first application id from the
      // /my/applications list page, so there is no static id to include
      // here. Coverage for the new detail page is in the E2E spec
      // `authenticated-flows` step that navigates from /my.
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
      "/biz/posts/new",
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

  test("public informational routes render without errors", async ({ page }) => {
    const pageErrors = trackPageErrors(page);

    for (const path of ["/terms", "/privacy", "/licenses"]) {
      await expectRouteOk(page, path);
    }

    expect(pageErrors).toEqual([]);
  });
});
