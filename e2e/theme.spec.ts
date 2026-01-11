import { test, expect } from '@playwright/test';

test.describe('Theme Toggle', () => {
  test('should toggle between light and dark themes', async ({
    page,
    isMobile,
  }) => {
    if (isMobile) {
      test.skip();
    }

    await page.goto('./');

    const themeToggle = page.locator('#theme-toggle').first();
    await expect(themeToggle).toBeVisible();

    // Open menu and select Corporate (light)
    await themeToggle.click();
    const menu = page.locator('#theme-menu');
    await expect(menu).toBeVisible();

    await page.locator('[data-theme="corporate"]').click();
    await page.waitForTimeout(150);

    await expect(page.locator('html')).toHaveAttribute(
      'data-theme',
      'corporate'
    );
    // Corporate theme is the only one that removes Tailwind's dark class
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
  });

  test('should persist theme preference', async ({ page, isMobile }) => {
    if (isMobile) {
      test.skip();
    }

    await page.goto('./');

    // Set theme
    const themeToggle = page.locator('#theme-toggle').first();
    await themeToggle.click();
    await page.locator('[data-theme="terminal"]').click();
    await page.waitForTimeout(150);

    const theme = await page.locator('html').getAttribute('data-theme');

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check theme persisted
    const persistedTheme = await page
      .locator('html')
      .getAttribute('data-theme');
    expect(persistedTheme).toBe(theme);
  });
});
