// REQ: AUTH-03 — Browser refresh preserves session
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/test-users';

test.describe('AUTH-03 session persistence', () => {
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL,
    'Requires Supabase env from Plan 02'
  );

  test('session persists across reload', async ({ page }) => {
    await loginAs(page, 'worker');
    await page.reload();
    await expect(page).not.toHaveURL(/\/login/);
  });
});
