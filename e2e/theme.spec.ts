import { test, expect } from '@playwright/test';

test.describe('Theme commands', () => {
  test('should switch themes from the command palette', async ({ page }) => {
    await page.goto('./');

    await page.keyboard.press('ControlOrMeta+k');
    const input = page.getByRole('combobox', { name: /search commands/i });
    await expect(input).toBeVisible({ timeout: 10000 });

    await input.fill('corporate');
    await page.getByRole('option', { name: /Theme: Corporate/i }).click();
    await expect(page.locator('html')).toHaveAttribute(
      'data-theme',
      'corporate'
    );
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
  });

  test('should persist command palette theme preference', async ({ page }) => {
    await page.goto('./');

    await page.keyboard.press('ControlOrMeta+k');
    const input = page.getByRole('combobox', { name: /search commands/i });
    await expect(input).toBeVisible({ timeout: 10000 });

    await input.fill('terminal');
    await page.getByRole('option', { name: /Theme: Terminal/i }).click();
    await expect(page.locator('html')).toHaveAttribute(
      'data-theme',
      'terminal'
    );

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('html')).toHaveAttribute(
      'data-theme',
      'terminal'
    );
  });
});
