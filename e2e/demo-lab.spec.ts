import { test, expect } from '@playwright/test';

test.describe('Demo Lab', () => {
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

    const html = page.locator('html');
    const firstModule = page.locator('[data-demo-module="advanced-3d"]');

    // Default state (set by progressive enhancement script)
    await expect(html).toHaveAttribute('data-demo-paused', 'false');
    // Module-level pause depends on whether it is offscreen. Make it visible
    // so we can assert its baseline state deterministically.
    await firstModule.scrollIntoViewIfNeeded();
    await expect(firstModule).toHaveAttribute('data-demo-offscreen', 'false');
    await expect(firstModule).toHaveAttribute('data-demo-paused', 'false');
    await expect(firstModule).toHaveAttribute(
      'data-demo-reduced-motion',
      'false'
    );
    await expect(firstModule).toHaveAttribute('data-demo-perf', 'false');

    await page.getByRole('button', { name: /^pause$/i }).click();
    await expect(html).toHaveAttribute('data-demo-paused', 'true');
    await expect(firstModule).toHaveAttribute('data-demo-paused', 'true');

    await page.getByRole('button', { name: /^reduced motion$/i }).click();
    await expect(html).toHaveAttribute('data-demo-reduced-motion', 'true');
    await expect(firstModule).toHaveAttribute(
      'data-demo-reduced-motion',
      'true'
    );

    await page.getByRole('button', { name: /^perf mode$/i }).click();
    await expect(html).toHaveAttribute('data-demo-perf', 'true');
    await expect(firstModule).toHaveAttribute('data-demo-perf', 'true');
  });
});
