import { test, expect } from '@playwright/test';

test.describe('Car Showroom Bug', () => {
  test('should display the 3D model', async ({ page }) => {
    await page.goto('./car-showroom/');

    // Wait for the canvas to be visible
    const canvas = page.locator('[data-car-showroom-canvas]');
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // Check if the model is loaded by inspecting the dataset attribute
    await expect
      .poll(
        async () => {
          const root = await page.locator('[data-car-showroom-root]');
          const isReady = await root.getAttribute('data-car-showroom-ready');
          return isReady === '1';
        },
        { timeout: 30000 }
      )
      .toBe(true);
  });
});
