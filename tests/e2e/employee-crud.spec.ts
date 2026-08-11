import { test, expect } from '@playwright/test';

test.describe('Employee Lifecycle & CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@payroll.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
  });

  test('Employee List Navigation', async ({ page }) => {
    await page.goto('/employees');
    await expect(page.locator('h1, h2')).toContainText(/Employee/i);
  });

  test('Create Employee Record', async ({ page }) => {
    await page.goto('/employees/create');
    await page.fill('input[name="first_name"]', 'John');
    await page.fill('input[name="last_name"]', 'Doe');
    await page.fill('input[name="personal_email"]', 'john.doe@example.com');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/employees/);
  });
});
