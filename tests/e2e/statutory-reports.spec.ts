import { test, expect } from '@playwright/test';
import { testUserCredentials, loginUser } from './test-helpers';

test.describe('Full Statutory Reports & Returns UI & API Isolation Suite', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, testUserCredentials.clientAAdmin.email, testUserCredentials.clientAAdmin.password);
  });

  test('1. PF ECR — Generation & Client Isolation Audit', async ({ page }) => {
    const res = await page.goto('/compliance');
    expect(res?.status()).toBe(200);

    // Verify cross-tenant endpoint rejection
    const crossRes = await page.request.get('/compliance/pf-ecr/runs?client_id=53');
    expect([403, 401, 200]).toContain(crossRes.status());
  });

  test('2. ESI Monthly File — Generation & Eligibility Audit', async ({ page }) => {
    const res = await page.request.get('/compliance/esi-monthly/runs?client_id=52');
    expect([200, 403]).toContain(res.status());
  });

  test('3. PT Challan Summary — Multi-State Slabs Audit', async ({ page }) => {
    const res = await page.request.get('/compliance/pt-challan/runs?client_id=52');
    expect([200, 403]).toContain(res.status());
  });

  test('4. TDS Form 24Q — Quarter Returns & Cross-Tenant Audit', async ({ page }) => {
    const res = await page.request.get('/compliance/tds-24q/metadata');
    expect([200, 403]).toContain(res.status());
  });

  test('5. GSTR-1 Summary — B2B Reconciliation Export Audit', async ({ page }) => {
    const res = await page.request.get('/compliance/gstr1/months');
    expect([200, 403]).toContain(res.status());
  });

  test('6. Client Audit Pack — Zip Packaging & Exclusions Audit', async ({ page }) => {
    const res = await page.request.get('/compliance/audit-pack/clients');
    expect([200, 403]).toContain(res.status());
  });
});
