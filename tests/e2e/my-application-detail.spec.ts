import { expect, test } from "@playwright/test";
import { loginAs } from "../helpers/test-users";

/**
 * Regression for: "my의 확정근무에서 일별 배너를 클릭하면 404 에러가 뜸"
 * (2026-04-11).
 *
 * Root cause: the worker /my page rendered confirmed-shift cards that
 * linked to /my/applications/<id>, but that route had no page.tsx — only
 * the nested /check-in and /review routes existed. Tapping the card went
 * straight to Next.js's notFound() handler.
 *
 * Fix: added src/app/(worker)/my/applications/[id]/page.tsx that renders
 * the job + business header, shift metadata, check-in/out timeline,
 * earnings card, and contextual action buttons (QR check-in, 리뷰 작성,
 * 공고 상세).
 *
 * This test:
 *   1. Logs in as worker (kim-jihoon)
 *   2. Navigates to /my/applications (the list page, which we know works)
 *   3. Clicks the first application link — should reach
 *      /my/applications/<id> with HTTP 2xx, not 404
 *   4. Asserts the detail page rendered the job title + a known label
 *      ("근무 일자" or "근무 상세")
 */

test.describe("/my/applications/[id] detail page", () => {
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL,
    "Requires Supabase env from Plan 02",
  );

  test("worker can open an application detail from /my/applications", async ({
    page,
  }) => {
    test.setTimeout(45_000);

    await loginAs(page, "worker");

    // The /my page is the one that renders confirmed-shift banners
    // linking directly to /my/applications/<id> (the regression entry
    // point). The /my/applications list itself only exposes /check-in
    // nested links on each card, so we scrape hrefs from /my instead.
    //
    // Strategy: visit /my, collect every href, find the first one that
    // matches the detail shape /my/applications/<uuid>, then navigate to
    // it with page.goto so we get a real HTTP response to inspect.
    await page.goto("/my");
    const hrefs = await page
      .locator('a[href^="/my/applications/"]')
      .evaluateAll((els) =>
        els
          .map((el) => (el as HTMLAnchorElement).getAttribute("href"))
          .filter((h): h is string => typeof h === "string"),
      );
    const detailHref = hrefs.find((h) =>
      /^\/my\/applications\/[0-9a-f-]{36}$/.test(h),
    );
    expect(
      detailHref,
      `No detail-shape link found on /my. Hrefs: ${hrefs.join(", ")}`,
    ).toBeTruthy();

    const response = await page.goto(detailHref!);
    expect(response?.status()).toBeLessThan(400);

    // Before the fix this would land on Next's default 404 page which
    // contains "This page could not be found" or a similar string. Now
    // it must render the detail UI we just added.
    const body = await page.locator("body").innerText();
    expect(body).toContain("근무 상세");
    expect(body).toMatch(/근무 일자|근무 시간|근무지/);

    // And it must NOT be a 404 page.
    expect(body).not.toMatch(/404|not found|could not be found/i);
  });
});
