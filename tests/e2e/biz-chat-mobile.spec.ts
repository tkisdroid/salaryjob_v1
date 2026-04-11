import { expect, test } from "@playwright/test";
import { loginAs } from "../helpers/test-users";

test.describe("business mobile chat layout", () => {
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL,
    "Requires Supabase env from Plan 02",
  );

  test("chat list keeps full width and shows all bottom-nav items on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await loginAs(page, "business");
    await page.goto("/biz/chat");
    await page.waitForLoadState("networkidle");

    const metrics = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);

    const mobileNav = page
      .locator("nav")
      .filter({ has: page.locator('a[href="/biz/settings"]') })
      .last();
    await expect(mobileNav).toBeVisible();

    const links = await mobileNav.locator("a").evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          href: element.getAttribute("href"),
          left: rect.left,
          right: rect.right,
        };
      }),
    );

    expect(links).toHaveLength(6);
    for (const link of links) {
      expect(link.left).toBeGreaterThanOrEqual(0);
      expect(link.right).toBeLessThanOrEqual(metrics.innerWidth);
    }

    await page.locator('a[href="/biz/chat/c1"]').first().click();
    await page.waitForURL(/\/biz\/chat\/c1/, { timeout: 10_000 });

    const detailMetrics = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(detailMetrics.scrollWidth).toBeLessThanOrEqual(
      detailMetrics.innerWidth,
    );

    await expect(page.locator('nav a[href="/biz/chat"]').last()).toBeVisible();
  });
});
