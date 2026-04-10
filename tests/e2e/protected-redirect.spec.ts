// REQ: AUTH-05 — Unauthenticated access to protected routes redirects to /login
import { test, expect } from '@playwright/test';

test.describe('AUTH-05 protected redirect', () => {
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL,
    'Requires Supabase env from Plan 02'
  );

  test('unauthenticated user is redirected from /home to /login', async ({ page }) => {
    // Fresh context (no cookies/storage) — no login
    await page.goto('/home');
    await expect(page).toHaveURL(/\/login/);
  });
});
