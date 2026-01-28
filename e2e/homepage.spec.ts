import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load successfully', async ({ page }) => {
    await page.goto('./');
    await expect(page).toHaveTitle(/Astro Demo 2026/i);
  });

  test('should display hero section', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page.locator('[data-hero-canvas]')).toBeVisible();
  });

  test('should have working navigation', async ({ page, isMobile }) => {
    await page.goto('./');

    const headerNav = page.getByRole('navigation', {
      name: /main navigation/i,
    });
    await expect(headerNav).toBeVisible();

    const openMobileMenuIfNeeded = async () => {
      if (!isMobile) return null;
      const menuButton = page.locator('#mobile-menu-button');
      await expect(menuButton).toBeVisible();
      await menuButton.click();

      const mobileMenu = page.locator('#mobile-menu');
      await expect(mobileMenu).toBeVisible();
      return mobileMenu;
    };

    // Spot-check primary links exist on desktop and mobile.
    if (isMobile) {
      const mobileMenu = await openMobileMenuIfNeeded();
      await expect(
        mobileMenu!.getByRole('link', { name: /^services$/i })
      ).toBeVisible();
      await expect(
        mobileMenu!.getByRole('link', { name: /^pricing$/i })
      ).toBeVisible();
      await expect(
        mobileMenu!.getByRole('link', { name: /^about$/i })
      ).toBeVisible();
      await expect(
        mobileMenu!.getByRole('link', { name: /^home$/i })
      ).toBeVisible();
    } else {
      await expect(
        headerNav.getByRole('link', { name: /^services$/i })
      ).toBeVisible();
      await expect(
        headerNav.getByRole('link', { name: /^pricing$/i })
      ).toBeVisible();
      await expect(
        headerNav.getByRole('link', { name: /^about$/i })
      ).toBeVisible();
    }
  });

  test('should navigate using main links', async ({ page, isMobile }) => {
    await page.goto('./');

    if (isMobile) {
      test.skip();
    }

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
