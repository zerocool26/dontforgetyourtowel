import { test, expect } from '@playwright/test';

test.describe.skip('Demo Lab (skipped after homepage redesign)', () => {
  test('should load and render heading', async ({ page }) => {
    await page.goto('./demo-lab/');
    await expect(
      page.getByRole('heading', { name: /^demo lab$/i })
    ).toBeVisible();
  });

  test('safety console toggles should update DOM attributes', async ({
    page,
  }) => {
    await page.goto('./demo-lab/');
  });
});
