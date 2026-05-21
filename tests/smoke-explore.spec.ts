import { test, expect } from '@playwright/test';

test.describe('Smoke Explore', () => {
  test('seed', async ({ page }) => {
    await page.goto('http://localhost:8000');
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  });
});
