// NWHA E2E: Health check
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test('health endpoint returns 200', async ({ request }) => {
  const response = await request.get(`${BASE_URL}/health`);
  expect(response.status()).toBe(200);

  const body = await response.json();
  expect(body.status).toBe('ok');
  expect(body.timestamp).toBeDefined();
});

test('homepage loads', async ({ page }) => {
  await page.goto(BASE_URL);
  await expect(page.locator('h1')).toContainText('NWHA');
});
