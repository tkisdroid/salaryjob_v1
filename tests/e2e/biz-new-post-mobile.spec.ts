import { expect, test } from "@playwright/test";
import { loginAs } from "../helpers/test-users";

test.describe("business mobile new-post flow", () => {
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL,
    "Requires Supabase env from Plan 02",
  );

  test.use({ viewport: { width: 390, height: 844 } });

  test("step CTA stays visible above the mobile nav and advances", async ({
    page,
  }) => {
    await loginAs(page, "business");
    await page.goto("/biz/posts/new");

    const nextButton = page.getByTestId("job-form-next-button");
    await expect(nextButton).toBeVisible({ timeout: 10_000 });

    await page.getByTestId("job-title-input").fill("주말 카페 바리스타");
    await page.getByTestId("job-category-food").click();
    await page
      .getByTestId("job-description-input")
      .fill("주문 응대와 음료 제조 보조, 마감 정리를 함께 해주실 분을 찾습니다.");

    await expect(nextButton).toBeEnabled();
    await nextButton.click();

    await expect(page.getByText("2/5 단계")).toBeVisible({ timeout: 10_000 });
  });
});
