// REQ: AUTH-06 — Business-only user cannot access worker-only routes (error=worker_required)
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/test-users';

test.describe('AUTH-06 worker-only route guard', () => {
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL,
    'Requires Supabase env from Plan 02'
  );

  test('business-only user gets error=worker_required on /my/profile', async ({ page }) => {
    await loginAs(page, 'business');
    await page.goto('/my/profile');
    await expect(page).toHaveURL(/error=worker_required/);
  });
});
