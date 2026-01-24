import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load successfully', async ({ page }) => {
    await page.goto('./');
    await expect(page).toHaveTitle(/Landing/i);
  });

  test('should display hero section', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('.hero-explorer')).toBeVisible();
    await expect(page.locator('.hero-explorer canvas')).toBeVisible();
  });

  test('should have working navigation', async ({ page, isMobile }) => {
    await page.goto('./');

    // The portal landing is intentionally isolated (no site header/nav).
    // Validate the primary controls that let a user enter the main site.
    await expect(page.getByRole('link', { name: /enter site/i })).toBeVisible();

    // On mobile we keep the same behavior.
    if (isMobile) {
      await expect(
        page.getByRole('link', { name: /enter site/i })
      ).toBeVisible();
    }
  });

  test('should navigate using main links', async ({ page, isMobile }) => {
    await page.goto('./');

    if (isMobile) {
      test.skip();
    }

    // Enter the classic marketing site, then validate header navigation.
    await Promise.all([
      page.waitForURL(/.*\/home\/?$/, { timeout: 15000 }),
      page.getByRole('link', { name: /enter site/i }).click(),
    ]);

    const headerNav = page.getByRole('navigation', {
      name: /main navigation/i,
    });

    await Promise.all([
      page.waitForURL(/.*\/services\/?$/, { timeout: 15000 }),
      headerNav.getByRole('link', { name: /^services$/i }).click(),
    ]);

    await Promise.all([
      page.waitForURL(/.*\/pricing\/?$/, { timeout: 15000 }),
      headerNav.getByRole('link', { name: /^pricing$/i }).click(),
    ]);

    await Promise.all([
      page.waitForURL(/.*\/about\/?$/, { timeout: 15000 }),
      headerNav.getByRole('link', { name: /^about$/i }).click(),
    ]);
  });

  test('primary CTA should jump to consultation form', async () => {
    test.skip();
  });
});
