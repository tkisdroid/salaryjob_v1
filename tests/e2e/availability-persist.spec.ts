import { expect, test } from "@playwright/test";
import { loginAs } from "../helpers/test-users";

/**
 * Regression for: "시간 등록해도 저장이 안되는 문제" (2026-04-11).
 *
 * Root cause: /my/availability was purely client-side state with a
 * hardcoded INITIAL_SLOTS mock and no Server Action / DB write path at
 * all. The page now loads the persisted `WorkerProfile.availabilitySlots`
 * text[] column via loadAvailability() and saves it through the new
 * saveAvailability() server action.
 *
 * This test verifies the round-trip:
 *   1. Log in as worker
 *   2. Visit /my/availability — page renders and hydrates without error
 *   3. Assert the save button is rendered (meaning the editor hydrated
 *      successfully and the server action is wired in)
 *
 * It intentionally does NOT click the save button in this first pass —
 * that would mutate seed state mid-run and poison parallel tests. The
 * key regression here is "the page doesn't crash when loading from the
 * DB" (previous attempt threw PrismaClientValidationError because the
 * dev server was running a stale client without availabilitySlots).
 */

test.describe("availability persistence", () => {
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL,
    "Requires Supabase env from Plan 02",
  );

  test("/my/availability loads persisted slots and renders the save button", async ({
    page,
  }) => {
    test.setTimeout(45_000);

    await loginAs(page, "worker");

    const response = await page.goto("/my/availability");
    expect(response?.status()).toBeLessThan(400);

    // The sticky bottom action bar contains a button labelled "저장".
    // If the Prisma client was stale (pre-regeneration), the page would
    // be a 500 crash and this button would never mount.
    const saveButton = page.getByRole("button", { name: /저장/ });
    await expect(saveButton.first()).toBeVisible({ timeout: 10_000 });

    // Dirty/clean status banner should be visible.
    const status = page.locator("text=/모두 저장됨|저장되지 않은 변경사항/");
    await expect(status.first()).toBeVisible({ timeout: 5_000 });
  });
});
