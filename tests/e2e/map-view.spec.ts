// REQ: SEARCH-02 — Worker는 /home에서 [리스트|지도] 토글로 네이버 지도 컨테이너를 본다.

import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/test-users";

test.skip(
  !process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID,
  "requires NEXT_PUBLIC_NAVER_MAP_CLIENT_ID",
);

test("map toggle renders naver.maps container", async ({ page }) => {
  await loginAs(page, "worker");
  await page.goto("/home");
  await page.getByRole("radio", { name: /지도/ }).click();
  await expect(
    page.locator('[data-testid="naver-map-container"]'),
  ).toBeVisible({ timeout: 10000 });
});
