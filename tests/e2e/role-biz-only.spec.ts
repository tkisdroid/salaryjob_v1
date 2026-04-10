// REQ: AUTH-07 — Worker-only user cannot access biz routes (error=business_required)
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/test-users';

test.describe('AUTH-07 biz-only route guard', () => {
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL,
    'Requires Supabase env from Plan 02'
  );

  test('worker user gets error=business_required on /biz/posts', async ({ page }) => {
    await loginAs(page, 'worker');
    await page.goto('/biz/posts');
    await expect(page).toHaveURL(/error=business_required/);
  });
});
