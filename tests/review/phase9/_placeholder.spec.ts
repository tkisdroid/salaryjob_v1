/**
 * tests/review/phase9/_placeholder.spec.ts
 *
 * Phase 9 Wave 0 placeholder — registers the tests/review/phase9/ directory
 * with the existing Playwright review-desktop + mobile-375 projects so
 * `npx playwright test tests/review/phase9/ --list` exits 0 instead of
 * erroring with "No tests found" (Playwright 1.59 returns exit 1 when the
 * glob yields zero spec files).
 *
 * Plan 02 replaces this file with real checklist specs
 * (worker-checklist.spec.ts, biz-checklist.spec.ts, admin-checklist.spec.ts,
 * empty-state.spec.ts, tab-bar-occlusion.spec.ts). At that point this file
 * SHOULD be deleted — keeping it would add a no-op skipped test to every
 * sweep.
 */
import { test } from "@playwright/test";

test.describe("@phase9-placeholder", () => {
  test.skip("Phase 9 Wave 0 placeholder — replaced by Plan 02 specs", () => {
    // Intentionally empty. Plan 02 removes this file.
  });
});
