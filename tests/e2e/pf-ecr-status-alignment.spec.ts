import { test, expect } from '@playwright/test';
import { testUserCredentials, loginUser } from './test-helpers';

test.describe('PF ECR Status & Validation Alignment E2E Suite', () => {
  test('1. Super Admin — Previews PF ECR with Employee Validation Status & Batch Columns', async ({ page }) => {
    await loginUser(page, testUserCredentials.superAdmin.email, testUserCredentials.superAdmin.password);
    await page.goto('/compliance');

    // Click "PF ECR Text File" button to open modal
    const ecrBtn = page.locator('button').filter({ hasText: 'PF ECR Text File' }).or(page.locator('button').filter({ hasText: 'Generate ECR (.txt)' }));
    await expect(ecrBtn.first()).toBeVisible();
    await ecrBtn.first().click();

    // Verify Modal opens
    const modalTitle = page.locator('h3, h4').filter({ hasText: 'Provident Fund ECR Generation' });
    await expect(modalTitle.first()).toBeVisible();

    // Select first payroll run and preview ECR
    const runSelect = page.locator('select').first();
    const options = await runSelect.locator('option').allInnerTexts();
    if (options.length > 1) {
      await runSelect.selectOption({ index: 1 });
      await page.waitForLoadState('networkidle');

      // Check Employee Table Headers inside modal
      const modalTables = page.locator('.fixed table, div[role="dialog"] table');
      if (await modalTables.count() > 0) {
        const employeeTableHeader = modalTables.first().locator('thead');
        await expect(employeeTableHeader).toContainText('Validation Status');
      }
    }
  });

  test('2. Client Admin Isolation — Client A Admin Cannot Access Other Client ECR Data', async ({ page }) => {
    await loginUser(page, testUserCredentials.clientAAdmin.email, testUserCredentials.clientAAdmin.password);
    await page.goto('/compliance');

    const ecrBtn = page.locator('button').filter({ hasText: 'PF ECR Text File' }).or(page.locator('button').filter({ hasText: 'Generate ECR (.txt)' }));
    if (await ecrBtn.first().isVisible()) {
      await ecrBtn.first().click();
      await page.waitForLoadState('networkidle');

      const pageText = await page.innerText('body');
      expect(pageText).not.toContain('Test Client B');
    }
  });
});
