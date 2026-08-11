import { test, expect } from '@playwright/test';
import { testUserCredentials, loginUser } from './test-helpers';

test.describe('Full Payroll Functional & Calculation E2E Suite', () => {
  test('1. Super Admin — Full Payroll Admin Portal Access', async ({ page }) => {
    await loginUser(page, testUserCredentials.superAdmin.email, testUserCredentials.superAdmin.password);
    const empRes = await page.goto('/employees');
    expect(empRes?.status()).toBe(200);

    const procRes = await page.goto('/payroll/processing');
    expect(procRes?.status()).toBe(200);
  });

  test('2. Client Admin — Client Portal Access & Role Gate Security', async ({ page }) => {
    await loginUser(page, testUserCredentials.clientAAdmin.email, testUserCredentials.clientAAdmin.password);
    const dashRes = await page.goto('/client/dashboard');
    expect([200, 302]).toContain(dashRes?.status());

    // Role Gate Check: Client role is denied access to admin-only employee suggestions route
    const status = await page.evaluate(async () => {
      const res = await fetch('/employees/suggestions?q=EMP-TEST-A', {
        headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
      });
      return res.status;
    });

    expect([403, 401]).toContain(status);
  });

  test('3. Salary Calculation Preview API Audit', async ({ page }) => {
    await loginUser(page, testUserCredentials.superAdmin.email, testUserCredentials.superAdmin.password);
    await page.goto('/employees');

    const resData = await page.evaluate(async () => {
      const token = document.cookie.split('; ').find(row => row.startsWith('XSRF-TOKEN='))?.split('=')[1];
      const res = await fetch('/employees/calculate-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-XSRF-TOKEN': decodeURIComponent(token || ''),
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          basic_pay: 30000,
          hra: 15000,
          conveyance: 2000,
          da: 0,
          medical_allowance: 1500,
          special_allowance: 5000,
          pf_applicable: true,
          esi_applicable: false,
        })
      });
      return await res.json();
    });

    expect(resData.gross_monthly_salary).toBe(53500);
  });
});
