import { test, expect } from '@playwright/test';

test.describe('Demo Lab', () => {
  test('should load and render heading', async ({ page }) => {
    await page.goto('./about/');

    await expect(page.locator('#main-content')).toBeVisible();
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /full demo e-commerce setup/i,
      })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /safety console/i })
    ).toBeVisible();
  });

  test('safety console toggles should update DOM attributes', async ({
    page,
  }) => {
    await page.goto('./about/');

    const html = page.locator('html');
    const status = page.getByTestId('demo-safety-status');

    await expect(status).toContainText('pause off');
    await expect(status).toContainText('reduced motion off');
    await expect(status).toContainText('perf mode off');

    await page.locator('button[data-demo-toggle="paused"]').click();
    await expect(html).toHaveAttribute('data-demo-paused', 'true');
    await expect(status).toContainText('pause on');

    await page.locator('button[data-demo-toggle="reduced"]').click();
    await expect(html).toHaveAttribute('data-demo-reduced-motion', 'true');
    await expect(status).toContainText('reduced motion on');

    const perfToggle = page.locator('button[data-demo-toggle="perf"]');
    await perfToggle.click();
    await expect(html).toHaveAttribute('data-demo-perf', 'true');
    await expect(status).toContainText('perf mode on');

    await perfToggle.click();
    await expect(html).toHaveAttribute('data-demo-perf', 'false');
    await expect(status).toContainText('perf mode off');
  });
});
