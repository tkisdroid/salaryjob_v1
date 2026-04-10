// REQ: AUTH-04 — Logout clears Supabase session cookies (sb-*-auth-token)
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/test-users';

test.describe('AUTH-04 logout', () => {
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL,
    'Requires Supabase env from Plan 02'
  );

  test('logout clears auth cookies', async ({ page, context }) => {
    await loginAs(page, 'worker');
    // Click logout button
    await page.getByRole('button', { name: /로그아웃|logout/i }).click();
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    const cookies = await context.cookies();
    const authCookies = cookies.filter((c) => /^sb-.*-auth-token$/.test(c.name));
    expect(authCookies.length).toBe(0);
  });
});
