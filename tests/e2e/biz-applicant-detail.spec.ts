import { expect, test } from "@playwright/test";
import { loginAs } from "../helpers/test-users";

function getInternationalAge(birthDate: string, now = new Date()) {
  const birth = new Date(`${birthDate}T00:00:00.000Z`);
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const hasHadBirthdayThisYear =
    now.getUTCMonth() > birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() &&
      now.getUTCDate() >= birth.getUTCDate());

  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

test.describe("business applicant detail flow", () => {
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL,
    "Requires Supabase env from Plan 02",
  );

  test("applicant card opens the applicant detail page", async ({ page }) => {
    await loginAs(page, "business");
    await page.goto("/biz/posts");

    const postLink = page
      .locator(
        'a[href^="/biz/posts/"]:not([href="/biz/posts/new"]):not([href*="/applicants"])',
      )
      .first();
    await expect(postLink).toBeVisible({ timeout: 10_000 });
    await postLink.click();

    const applicantsLink = page.locator('a[href$="/applicants"]').first();
    await expect(applicantsLink).toBeVisible({ timeout: 10_000 });
    await applicantsLink.click();
    await page.waitForURL(/\/biz\/posts\/.+\/applicants$/, { timeout: 10_000 });

    const applicantDetailLink = page
      .locator('a[href*="/applicants/"]:not([href$="/review"])')
      .first();
    await expect(applicantDetailLink).toBeVisible({ timeout: 10_000 });
    await applicantDetailLink.click();

    await page.waitForURL(/\/biz\/posts\/.+\/applicants\/.+$/, {
      timeout: 10_000,
    });
    await expect(
      page.getByRole("link", { name: "지원자 목록으로" }),
    ).toBeVisible();
    await expect(
      page.getByText(`만 ${getInternationalAge("1996-04-18")}세`),
    ).toBeVisible();
  });
});
