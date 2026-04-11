import { expect, test } from "@playwright/test";
import { loginAs } from "../helpers/test-users";

/**
 * Regression for: "worker가 원탭지원하기를 누르면 다시 로그아웃된 상태로
 * 로그인 페이지로 가는 에러가 있음" (2026-04-11).
 *
 * Root cause was a broken @supabase/ssr setAll callback signature in
 * src/lib/supabase/middleware.ts — calling Object.entries(headers) on an
 * undefined second argument threw a TypeError whenever Supabase attempted
 * a token refresh, which wiped the session mid-flow and bounced the next
 * protected action to /login.
 *
 * This test walks the happy-path apply flow end-to-end against the live
 * dev server:
 *   1. Log in as worker
 *   2. Navigate to a public post detail page
 *   3. Click through to /posts/<id>/apply
 *   4. Assert the apply page rendered (not redirected to /login)
 *
 * The test intentionally does NOT submit applyOneTap — kim-jihoon is
 * already seeded with applications against every job, so the action
 * would return 'already_applied' and that's a separate assertion. What
 * matters here is that navigating the worker-only /posts/<id>/apply
 * sub-route never boots the user back to /login because of a stale
 * session refresh.
 */

test.describe("apply flow session regression", () => {
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL,
    "Requires Supabase env from Plan 02",
  );

  test("worker stays authenticated when navigating to /posts/<id>/apply", async ({
    page,
  }) => {
    test.setTimeout(45_000);

    await loginAs(page, "worker");

    // Land on the public job list and grab the first post link.
    await page.goto("/home");
    const firstPostLink = page.locator('a[href^="/posts/"]').first();
    await expect(firstPostLink).toBeVisible({ timeout: 10_000 });
    const href = await firstPostLink.getAttribute("href");
    expect(href).toMatch(/^\/posts\/[^/]+$/);

    // Navigate to the post detail then to /apply.
    await page.goto(href!);
    const applyUrl = `${href}/apply`;
    const applyResponse = await page.goto(applyUrl);

    // The critical assertion: we must NOT have been redirected to /login.
    // Before the setAll fix, the middleware crashed on token refresh and
    // Supabase SSR dropped the auth cookies, so this page either 307'd to
    // /login or rendered a 500 page.
    expect(applyResponse, `${applyUrl} did not produce a response`).not.toBeNull();
    const status = applyResponse!.status();
    expect(status, `${applyUrl} returned HTTP ${status}`).toBeLessThan(400);

    const finalUrl = new URL(page.url());
    expect(
      finalUrl.pathname,
      "worker was redirected away from the apply page — session was dropped",
    ).toMatch(/\/apply$/);
    expect(finalUrl.pathname).not.toBe("/login");
  });
});
