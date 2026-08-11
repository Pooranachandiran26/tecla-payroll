import { test, expect } from '@playwright/test';
import { testUserCredentials, loginUser } from './test-helpers';

test.describe('Client Compliance Details E2E Suite', () => {
  test('1. Super Admin — Opens Client Compliance Details Page & Navigates Back', async ({ page }) => {
    await loginUser(page, testUserCredentials.superAdmin.email, testUserCredentials.superAdmin.password);
    await page.goto('/compliance');

    // Target the View link in the Client-wise Compliance Register table
    const viewBtn = page.locator('a').filter({ hasText: 'View' }).first();
    await expect(viewBtn).toBeVisible();
    await viewBtn.click();
    await page.waitForLoadState('networkidle');

    // Verify URL matches client compliance details
    await expect(page).toHaveURL(/\/compliance\/clients\/\d+/);

    // Verify Header elements
    const backLink = page.locator('a').filter({ hasText: 'Back to Register' });
    await expect(backLink).toBeVisible();

    const pageText = await page.innerText('body');
    expect(pageText).toContain('Headcount:');

    // Click Back to Register
    await backLink.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/compliance/);
  });
});
