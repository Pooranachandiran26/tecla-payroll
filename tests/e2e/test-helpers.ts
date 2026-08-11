import { test as baseTest, expect, Page } from '@playwright/test';

export const testUserCredentials = {
  superAdmin: {
    email: 'superadmin@test.local',
    password: 'TestPassword123!',
  },
  clientAAdmin: {
    email: 'clientadmina@test.local',
    password: 'TestPassword123!',
    clientId: 52,
    employeeId: 328,
  },
  clientBAdmin: {
    email: 'clientadminb@test.local',
    password: 'TestPassword123!',
    clientId: 53,
    employeeId: 329,
  },
};

export async function loginUser(page: Page, email: string, password: string): Promise<string | null> {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');

  // Return CSRF token cookie if present
  const cookies = await page.context().cookies();
  const csrfCookie = cookies.find(c => c.name === 'XSRF-TOKEN');
  return csrfCookie ? decodeURIComponent(csrfCookie.value) : null;
}
