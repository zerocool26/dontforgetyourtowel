import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate to all main pages', async ({ page, isMobile }) => {
    await page.goto('./');

    const openMobileMenuIfNeeded = async () => {
      if (!isMobile) return;
      const menuButton = page.locator('#mobile-menu-button');
      await expect(menuButton).toBeVisible();
      await menuButton.click();

      const mobileMenu = page.locator('#mobile-menu');
      await expect(mobileMenu).toBeVisible();
      return mobileMenu;
    };

    const headerNav = page.getByRole('navigation', {
      name: /main navigation/i,
    });

    // About page
    if (isMobile) {
      const mobileMenu = await openMobileMenuIfNeeded();
      await mobileMenu!.getByRole('link', { name: /^about$/i }).click();
    } else {
      await headerNav.getByRole('link', { name: /^about$/i }).click();
    }
    await expect(page).toHaveURL(/.*\/about\/?$/);
    await expect(page.locator('h1')).toBeVisible();

    // Services page
    await page.goto('./');
    if (isMobile) {
      const mobileMenu = await openMobileMenuIfNeeded();
      await mobileMenu!.getByRole('link', { name: /^services$/i }).click();
    } else {
      await headerNav.getByRole('link', { name: /^services$/i }).click();
    }
    await expect(page).toHaveURL(/.*\/services\/?$/);

    // Pricing page
    await page.goto('./');
    if (isMobile) {
      const mobileMenu = await openMobileMenuIfNeeded();
      await mobileMenu!.getByRole('link', { name: /^pricing$/i }).click();
    } else {
      await headerNav.getByRole('link', { name: /^pricing$/i }).click();
    }
    await expect(page).toHaveURL(/.*\/pricing\/?$/);
  });

  test('should handle mobile menu', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    await page.goto('./');

    // Open mobile menu
    const menuButton = page.locator('#mobile-menu-button');
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    // Check menu is visible
    const mobileMenu = page.locator('#mobile-menu');
    await expect(mobileMenu).toBeVisible();

    // Close menu
    await menuButton.click();
    await expect(mobileMenu).not.toBeVisible();
  });
});
