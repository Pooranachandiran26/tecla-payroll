import { test, expect } from '@playwright/test';
import { testUserCredentials, loginUser } from './test-helpers';

test.describe('Authentication Lifecycle', () => {
  test('Super Admin Login and Logout', async ({ page }) => {
    await loginUser(page, testUserCredentials.superAdmin.email, testUserCredentials.superAdmin.password);
    await expect(page).toHaveURL(/\/dashboard/);

    // Perform Logout
    await page.click('button:has-text("Logout"), a:has-text("Logout")');
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test('Client Admin A Login and Dashboard', async ({ page }) => {
    await loginUser(page, testUserCredentials.clientAAdmin.email, testUserCredentials.clientAAdmin.password);
    await expect(page).toHaveURL(/\/client\/dashboard|\/dashboard/);
  });

  test('Client Admin B Login and Dashboard', async ({ page }) => {
    await loginUser(page, testUserCredentials.clientBAdmin.email, testUserCredentials.clientBAdmin.password);
    await expect(page).toHaveURL(/\/client\/dashboard|\/dashboard/);
  });

  test('Invalid Credentials Failure', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'invalid@test.local');
    await page.fill('input[name="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    // DOM validation for Inertia error alert message
    await expect(page.locator('text=/invalid/i, text=/credentials/i, text=/these credentials do not match/i')).toBeVisible();
  });
});
