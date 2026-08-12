import { test, expect } from '@playwright/test';
import { testUserCredentials, loginUser } from './test-helpers';

test.describe('Critical Multi-Tenant Client Data Isolation Security Audit', () => {
  let xsrfToken: string | null = null;

  test.beforeEach(async ({ page }) => {
    // Authenticate as Client A Admin User
    xsrfToken = await loginUser(page, testUserCredentials.clientAAdmin.email, testUserCredentials.clientAAdmin.password);
  });

  test('SECURITY TEST 1: Direct URL Manipulation (Client A accessing Client B profile URL)', async ({ page }) => {
    const response = await page.goto(`/clients/${testUserCredentials.clientBAdmin.clientId}`);
    // Expected: 403 Forbidden or 404 Not Found
    expect([403, 404]).toContain(response?.status());
  });

  test('SECURITY TEST 2: Record ID Manipulation (Client A accessing Client B Employee Profile ID)', async ({ page }) => {
    const response = await page.goto(`/employees/${testUserCredentials.clientBAdmin.employeeId}`);
    // Expected: 403 Forbidden or 404 Not Found
    expect([403, 404]).toContain(response?.status());
  });

  test('SECURITY TEST 3: Global Search / Autosuggest Isolation Audit', async ({ request, page }) => {
    // Perform autosuggest query for Client B Employee code
    const response = await request.get(`/employees/suggestions?q=EMP-TEST-B`, {
      headers: {
        'Accept': 'application/json',
        'X-XSRF-TOKEN': xsrfToken || '',
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    
    // Verify zero Client B employee records are leaked in response
    const leakedClientBRecords = data.filter((emp: any) => emp.id === testUserCredentials.clientBAdmin.employeeId || emp.client_id === testUserCredentials.clientBAdmin.clientId);
    expect(leakedClientBRecords.length).toBe(0);
  });

  test('SECURITY TEST 4: AJAX / Internal API Isolation', async ({ request }) => {
    const response = await request.get(`/clients/${testUserCredentials.clientBAdmin.clientId}/active-employees`, {
      headers: {
        'Accept': 'application/json',
        'X-XSRF-TOKEN': xsrfToken || '',
      }
    });
    // Expected: 403 Forbidden or 404 Not Found
    expect([403, 404]).toContain(response.status());
  });

  test('SECURITY TEST 5: Employee Export Cross-Client Payload Manipulation', async ({ request }) => {
    const response = await request.post('/export/employees', {
      data: {
        client_id: testUserCredentials.clientBAdmin.clientId,
        status: 'active'
      },
      headers: {
        'Accept': 'application/json',
        'X-XSRF-TOKEN': xsrfToken || '',
      }
    });

    // Expected: 403 Forbidden
    expect([403, 401]).toContain(response.status());
  });

  test('SECURITY TEST 6: Resend Invitation IDOR Route Protection', async ({ request }) => {
    const response = await request.post(`/employees/${testUserCredentials.clientBAdmin.employeeId}/resend-invitation`, {
      headers: {
        'Accept': 'application/json',
        'X-XSRF-TOKEN': xsrfToken || '',
      }
    });

    // Expected: 403 Forbidden or 404 Not Found
    expect([403, 404]).toContain(response.status());
  });
});
