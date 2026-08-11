import { test, expect } from '@playwright/test';
import { testUserCredentials, loginUser } from './test-helpers';

test.describe('Global Active Client Selector Sync E2E Suite', () => {
  test('1. Super Admin — Global Active Client Selector Syncs Dashboard', async ({ page }) => {
    await loginUser(page, testUserCredentials.superAdmin.email, testUserCredentials.superAdmin.password);
    await page.goto('/dashboard');

    const topSelector = page.locator('select[title="Global Active Client Selector"]');
    await expect(topSelector).toBeVisible();

    // Select Client A (ID: 52)
    await topSelector.selectOption('52');
    await page.waitForLoadState('networkidle');

    // Dashboard title/header should display Test Client A
    const dashHeader = page.locator('h1, h2, span').filter({ hasText: 'Test Client A' });
    await expect(dashHeader.first()).toBeVisible();
  });

  test('2. Super Admin — Global Active Client Selector Syncs Employees Directory', async ({ page }) => {
    await loginUser(page, testUserCredentials.superAdmin.email, testUserCredentials.superAdmin.password);
    await page.goto('/employees');

    const topSelector = page.locator('select[title="Global Active Client Selector"]');
    await expect(topSelector).toBeVisible();

    // Select Client A (ID: 52)
    await topSelector.selectOption('52');
    await page.waitForLoadState('networkidle');

    // Page filter dropdown (title="Select Client")
    const pageFilterSelect = page.locator('select[title="Select Client"]');
    await expect(pageFilterSelect).toHaveValue('52');
  });

  test('3. Super Admin — Global Active Client Selector Syncs Attendance Review', async ({ page }) => {
    await loginUser(page, testUserCredentials.superAdmin.email, testUserCredentials.superAdmin.password);
    await page.goto('/payroll/live-monitor');

    const topSelector = page.locator('select[title="Global Active Client Selector"]');
    await expect(topSelector).toBeVisible();

    // Select Client A (ID: 52)
    await topSelector.selectOption('52');
    await page.waitForLoadState('networkidle');

    // Click "Attendance Review ->"
    await page.goto('/payroll/attendance-review');
    await page.waitForLoadState('networkidle');

    // Verify row for Client A is rendered and Client B is filtered out
    const tableText = await page.locator('table').innerText();
    expect(tableText).toContain('Test Client A');
    expect(tableText).not.toContain('Test Client B');
  });
});
