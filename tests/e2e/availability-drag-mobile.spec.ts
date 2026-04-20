import { expect, test } from "@playwright/test";
import { loginAs } from "../helpers/test-users";

/**
 * Regression for: "모바일 브라우저라 드래그가 안되는거임? 드래그와 저장버튼
 * 아직도 다 안됨. 여러개 시간을 드래그로 선택해야 하는데 동작 안함"
 * (2026-04-11).
 *
 * Runs under iPhone 12 device emulation with touch enabled so the pointer
 * events go through the actual touch code path (not mouse emulation). The
 * test:
 *   1. Clears any persisted availability for worker@dev.gignow.com.
 *   2. Opens /my/availability on a simulated iPhone viewport.
 *   3. Performs a touch drag across several cells in the same row.
 *   4. Verifies that every cell the finger passed over became
 *      aria-pressed="true" (i.e. drag-selected).
 *   5. Clicks 저장 and asserts the success banner appears.
 *   6. Reloads the page and asserts the same cells are still pressed,
 *      proving DB persistence round-trip.
 */

// Chromium mobile emulation (iPhone 12-ish). Playwright's bundled
// devices["iPhone 12"] forces webkit which is not installed on this
// machine (playwright.config.ts only ships chromium), so we apply the
// equivalent viewport + touch + mobile flags manually against chromium.
test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 3,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});

test.describe("availability mobile drag + save", () => {
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL,
    "Requires Supabase env from Plan 02",
  );

  test("touch drag selects multiple cells and save persists them", async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await loginAs(page, "worker");

    // Start from a known-empty state so the drag selection is observable
    // and the save assertion is deterministic. Click 초기화 to clear any
    // persisted slots from a prior test run, then click Save so the
    // empty state is committed to the DB. Only then does the actual
    // drag-select-and-save flow below run against a clean baseline.
    await page.goto("/my/availability");
    const resetButton = page.getByRole("button", { name: /초기화/ });
    await resetButton.click();
    const saveBtn = page.getByRole("button", { name: /^저장/ });
    if (await saveBtn.isEnabled().catch(() => false)) {
      await saveBtn.click();
      await expect(page.locator("text=/저장되었어요|모두 저장됨/").first())
        .toBeVisible({ timeout: 10_000 });
    }
    // Force a fresh page load so the initialSlots from the server are []
    // and the dirty/clean baseline matches.
    await page.goto("/my/availability");

    // Grab four adjacent cells in the 월요일 column (dayKey=mon, hours 9..12).
    const cells = [
      page.locator('[data-slot-key="mon-9"]'),
      page.locator('[data-slot-key="mon-10"]'),
      page.locator('[data-slot-key="mon-11"]'),
      page.locator('[data-slot-key="mon-12"]'),
    ];
    for (const cell of cells) {
      await expect(cell).toBeVisible({ timeout: 10_000 });
    }

    // Compute the center of each cell so the touch path lands on them.
    const boxes = await Promise.all(cells.map((c) => c.boundingBox()));
    for (const box of boxes) {
      expect(box).not.toBeNull();
    }

    // Dispatch real TouchEvents in the browser context. React's
    // onTouchStart/onTouchMove/onTouchEnd handlers listen for these
    // exact events, which is the code path a real phone Chrome uses.
    // Using TouchEvent here (not PointerEvent) exercises the mobile
    // drag path end-to-end including e.preventDefault on touchmove.
    const points = boxes.map((b) => ({
      x: b!.x + b!.width / 2,
      y: b!.y + b!.height / 2,
    }));
    await page.evaluate((coords) => {
      const targetAt = (xy: { x: number; y: number }) =>
        document.elementFromPoint(xy.x, xy.y) as Element;
      const makeTouch = (target: Element, xy: { x: number; y: number }) =>
        new Touch({
          identifier: 1,
          target,
          clientX: xy.x,
          clientY: xy.y,
          screenX: xy.x,
          screenY: xy.y,
          pageX: xy.x,
          pageY: xy.y,
          radiusX: 10,
          radiusY: 10,
          rotationAngle: 0,
          force: 0.5,
        });
      const dispatch = (
        type: "touchstart" | "touchmove" | "touchend",
        target: Element,
        xy: { x: number; y: number },
      ) => {
        const touch = makeTouch(target, xy);
        const init: TouchEventInit = {
          bubbles: true,
          cancelable: true,
          composed: true,
          touches: type === "touchend" ? [] : [touch],
          targetTouches: type === "touchend" ? [] : [touch],
          changedTouches: [touch],
        };
        target.dispatchEvent(new TouchEvent(type, init));
      };

      const firstTarget = targetAt(coords[0]);
      dispatch("touchstart", firstTarget, coords[0]);
      // Touch events fire on the INITIAL target for the whole gesture
      // (DOM touch target capture), so we keep dispatching on firstTarget
      // even when the finger is over later cells. Our handler reads
      // touch.clientX/clientY and uses elementFromPoint so the slot at
      // the current coordinate flips, not the initial target.
      for (let i = 1; i < coords.length; i++) {
        dispatch("touchmove", firstTarget, coords[i]);
      }
      dispatch("touchend", firstTarget, coords[coords.length - 1]);
    }, points);

    // Every cell the drag passed over must now be aria-pressed="true".
    for (const cell of cells) {
      await expect(cell).toHaveAttribute("aria-pressed", "true", {
        timeout: 5_000,
      });
    }

    // Save — the button should become enabled once isDirty flips to true.
    const saveButton = page.getByRole("button", { name: /^저장/ });
    await expect(saveButton).toBeEnabled({ timeout: 5_000 });
    await saveButton.click();

    // Success banner fires once the server action returns.
    const successBanner = page.locator("text=/저장되었어요/");
    await expect(successBanner).toBeVisible({ timeout: 10_000 });

    // Reload and verify persistence.
    await page.reload();
    for (const cell of cells) {
      await expect(cell).toHaveAttribute("aria-pressed", "true", {
        timeout: 10_000,
      });
    }
  });
});
