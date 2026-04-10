// RED BASELINE (Wave 0): until Plan 04-07/04-08 ships /home 리스트/지도 토글.
// REQ: SEARCH-02 — Worker는 /home에서 [리스트|지도] 토글로 카카오맵 컨테이너를 본다.

import { test, expect } from "@playwright/test";

test.skip(
  !process.env.NEXT_PUBLIC_KAKAO_MAP_KEY,
  "requires NEXT_PUBLIC_KAKAO_MAP_KEY",
);

test("map toggle renders kakao.maps container", async ({ page }) => {
  await page.goto("/home");
  await page.getByRole("button", { name: "지도" }).click();
  await expect(
    page.locator('[data-testid="kakao-map-container"]'),
  ).toBeVisible({ timeout: 10000 });
});
