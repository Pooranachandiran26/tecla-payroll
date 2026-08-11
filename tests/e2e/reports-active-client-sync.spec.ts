import { test, expect } from '@playwright/test';
import { testUserCredentials, loginUser } from './test-helpers';

test.describe('Reports & Compliance Active Client Synchronization E2E Suite', () => {
  test('1. Super Admin — Active Client Selector Scopes Monthly Payroll Register & Exports', async ({ page }) => {
    await loginUser(page, testUserCredentials.superAdmin.email, testUserCredentials.superAdmin.password);
    await page.goto('/employees');

    const topSelector = page.locator('select[title="Global Active Client Selector"]');
    await expect(topSelector).toBeVisible();

    // Select Client A (ID: 52)
    await topSelector.selectOption('52');
    await page.waitForLoadState('networkidle');

    // Navigate to Monthly Payroll Register report (/admin/reports/show/payroll_register)
    await page.goto('/admin/reports/show/payroll_register');
    await page.waitForLoadState('networkidle');

    // Page local Client Partner select should pre-select 52
    const pageClientSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'All Scoped Clients' }) });
    await expect(pageClientSelect).toHaveValue('52');
  });

  test('2. Super Admin — Active Client Selector Scopes Statutory Compliance Center', async ({ page }) => {
    await loginUser(page, testUserCredentials.superAdmin.email, testUserCredentials.superAdmin.password);
    await page.goto('/employees');

    const topSelector = page.locator('select[title="Global Active Client Selector"]');
    await expect(topSelector).toBeVisible();

    // Select Client A (ID: 52)
    await topSelector.selectOption('52');
    await page.waitForLoadState('networkidle');

    // Navigate to Compliance (/compliance)
    await page.goto('/compliance');
    await page.waitForLoadState('networkidle');

    // Table should display Test Client A and NOT Test Client B in the register table
    const tableText = await page.locator('table').innerText();
    expect(tableText).toContain('Test Client A');
    expect(tableText).not.toContain('Test Client B');
  });
});
