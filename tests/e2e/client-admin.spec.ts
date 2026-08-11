import { test, expect } from '@playwright/test';

test.describe('Client Admin Portal Workflows', () => {
  test('Client Admin Login and Dashboard Access', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'clientadmin@clienta.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/client\/dashboard|\/dashboard/);
  });
});
