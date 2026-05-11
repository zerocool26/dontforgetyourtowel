import { test } from '@playwright/test';

test.describe('Shop demo legacy route', () => {
  test('redirects to the digital proof lab experience', async ({ page }) => {
    await page.goto('./shop-demo/');
    await page.waitForURL(/\/about\/#shop-experience$/);
  });
});
