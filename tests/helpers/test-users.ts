import type { Page } from '@playwright/test';

export const DEV_USERS = {
  worker:    { email: 'worker+test@gignow.dev',    password: 'gignowdev', role: 'WORKER'   as const },
  worker2:   { email: 'worker2+test@gignow.dev',   password: 'gignowdev', role: 'WORKER'   as const },
  business:  { email: 'business+test@gignow.dev',  password: 'gignowdev', role: 'BUSINESS' as const },
  business2: { email: 'business2+test@gignow.dev', password: 'gignowdev', role: 'BUSINESS' as const },
  both:      { email: 'both+test@gignow.dev',      password: 'gignowdev', role: 'BOTH'     as const },
  admin:     { email: 'admin+test@gignow.dev',     password: 'gignowdev', role: 'ADMIN'    as const },
} as const;

export type DevUserKey = keyof typeof DEV_USERS;

/**
 * Plays the login flow for a dev account via the /login page.
 * Requires:
 *   - Plan 04 Server Action `signInWithPassword` wired
 *   - Plan 05 seed run (auth.users exist)
 * Wave 0 stubs that call this MUST skip if ENV incomplete.
 */
export async function loginAs(page: Page, key: DevUserKey): Promise<void> {
  const { email, password } = DEV_USERS[key];
  await page.goto('/login');
  await page.getByLabel(/이메일|email/i).fill(email);
  await page.getByLabel(/비밀번호|password/i).fill(password);
  await page.getByRole('button', { name: /로그인/ }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 10_000 });
}
