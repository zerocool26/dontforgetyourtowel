import { test, expect } from '@playwright/test';

test.describe('Demo Lab', () => {
  test('should load and render heading', async ({ page }) => {
    await page.goto('./demo-lab/');

    await expect(page.locator('#main-content')).toBeVisible();
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /experimental interaction systems/i,
      })
    ).toBeVisible();
    await expect(page.getByTestId('demo-safety-title')).toBeVisible();
  });

  test('safety console toggles should update DOM attributes', async ({
    page,
  }) => {
    await page.goto('./demo-lab/');

    const html = page.locator('html');
    const status = page.getByTestId('demo-safety-status');

    await expect(status).toContainText('pause off');
    await expect(status).toContainText('reduced motion off');
    await expect(status).toContainText('perf mode off');

    const pauseToggle = page.getByTestId('demo-toggle-paused');
    await pauseToggle.click();
    await expect(html).toHaveAttribute('data-demo-paused', 'true');
    await expect(status).toContainText('pause on');

    const reducedToggle = page.getByTestId('demo-toggle-reduced');
    await reducedToggle.click();
    await expect(html).toHaveAttribute('data-demo-reduced-motion', 'true');
    await expect(status).toContainText('reduced motion on');

    const perfToggle = page.getByTestId('demo-toggle-perf');
    await perfToggle.click();
    await expect(html).toHaveAttribute('data-demo-perf', 'true');
    await expect(status).toContainText('perf mode on');

    await perfToggle.click();
    await expect(html).toHaveAttribute('data-demo-perf', 'false');
    await expect(status).toContainText('perf mode off');
  });
});
