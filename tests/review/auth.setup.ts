/**
 * tests/review/auth.setup.ts
 *
 * Playwright setup-project spec (D-09 Pattern 2). One login per persona; the resulting
 * `playwright/.auth/{persona}.json` storageState is then shared across both the
 * `review-desktop` and `mobile-375` projects via `dependencies: ['setup-worker', ...]`.
 *
 * Result: 3 logins total (worker + biz + admin) regardless of how many viewports or
 * how many route-scenarios the sweep runs.
 *
 * Source: RESEARCH.md Pattern 2 (Playwright project-dependencies).
 */

import { test as setup } from "@playwright/test";
import { WORKER_EMAIL, BIZ_EMAIL, ADMIN_EMAIL } from "./fixtures/ids";

type Persona = "worker" | "biz" | "admin";

const EMAILS: Record<Persona, string> = {
  worker: WORKER_EMAIL,
  biz: BIZ_EMAIL,
  admin: ADMIN_EMAIL,
};

setup("auth", async ({ page }, testInfo) => {
  // Project `metadata.persona` is set in playwright.config.ts for each setup-* project.
  // Playwright's `use` object has a strict type — we use `metadata` to pass custom data.
  const rawPersona = (testInfo.project.metadata as { persona?: Persona } | undefined)
    ?.persona;
  if (!rawPersona) {
    throw new Error(
      `auth.setup: project ${testInfo.project.name} missing metadata.persona`,
    );
  }
  const persona: Persona = rawPersona;

  await page.goto("/login");
  await page.fill('[name="email"]', EMAILS[persona]);
  await page.fill(
    '[name="password"]',
    process.env["SEED_DEV_PASSWORD"] ?? "gignowdev",
  );
  await page.click('button[type="submit"]');

  // Wait for post-login navigation. Worker -> /home, biz -> /biz, admin -> /admin.
  await page.waitForURL(/\/(home|biz|admin)/, { timeout: 15_000 });

  await page.context().storageState({
    path: `playwright/.auth/${persona}.json`,
  });
});
