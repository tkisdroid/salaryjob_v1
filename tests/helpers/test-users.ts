import type { Page } from "@playwright/test";

export const DEV_USERS = {
  worker: {
    email: "worker@dev.gignow.com",
    password: "gignowdev",
    role: "WORKER" as const,
  },
  worker2: {
    email: "worker2@dev.gignow.com",
    password: "gignowdev",
    role: "WORKER" as const,
  },
  business: {
    email: "business@dev.gignow.com",
    password: "gignowdev",
    role: "BUSINESS" as const,
  },
  business2: {
    email: "business2@dev.gignow.com",
    password: "gignowdev",
    role: "BUSINESS" as const,
  },
  both: {
    email: "both@dev.gignow.com",
    password: "gignowdev",
    role: "BOTH" as const,
  },
  admin: {
    email: "admin@dev.gignow.com",
    password: "gignowdev",
    role: "ADMIN" as const,
  },
} as const;

export type DevUserKey = keyof typeof DEV_USERS;

export async function loginAs(page: Page, key: DevUserKey): Promise<void> {
  const { email, password, role } = DEV_USERS[key];

  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page
    .getByTestId("password-login-form")
    .locator('button[type="submit"]')
    .click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 15_000,
  });

  if (page.url().includes("/role-select")) {
    await page
      .locator(
        `form:has(input[name="role"][value="${role}"]) button[type="submit"]`,
      )
      .click();
    await page.waitForURL((url) => !url.pathname.startsWith("/role-select"), {
      timeout: 15_000,
    });
  }

  await page.waitForLoadState("networkidle");
}
