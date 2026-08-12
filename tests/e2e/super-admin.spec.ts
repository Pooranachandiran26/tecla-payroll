import { test, expect } from '@playwright/test';

test.describe('Super Admin Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@payroll.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('Super Admin can view clients list', async ({ page }) => {
    await page.goto('/clients');
    await expect(page.locator('h1, h2, title')).toContainText(/Clients/i);
    await expect(page.locator('table, .client-card')).toBeVisible();
  });

  test('Super Admin can onboard a new Client (Client Creation)', async ({ page }) => {
    await page.goto('/clients/create');
    await page.fill('input[name="company_name"]', 'Test Client Corp');
    await page.fill('input[name="legal_name"]', 'Test Client Corp Private Limited');
    await page.fill('input[name="email"]', 'admin@testclient.com');
    
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/clients/);
  });
});
