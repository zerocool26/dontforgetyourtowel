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

    // Pricing page from the streamlined homepage navigation
    if (isMobile) {
      const mobileMenu = await openMobileMenuIfNeeded();
      await mobileMenu!.getByRole('link', { name: /^pricing$/i }).click();
    } else {
      await headerNav.getByRole('link', { name: /^pricing$/i }).click();
    }
    await expect(page).toHaveURL(/.*\/pricing\/?$/);
    await expect(page.locator('main')).toBeVisible();

    // E Commerce Demo page from the full navigation
    if (isMobile) {
      const mobileMenu = await openMobileMenuIfNeeded();
      await mobileMenu!
        .getByRole('link', { name: /^e commerce demo$/i })
        .click();
    } else {
      await headerNav.getByRole('link', { name: /^e commerce demo$/i }).click();
    }
    await expect(page).toHaveURL(/.*\/about\/?$/);

    // Services page
    await page.goto('./');
    if (isMobile) {
      const mobileMenu = await openMobileMenuIfNeeded();
      await mobileMenu!.getByRole('link', { name: /^solutions$/i }).click();
    } else {
      await headerNav.getByRole('link', { name: /^solutions$/i }).click();
    }
    await expect(page).toHaveURL(/.*\/services\/?$/);

    // Contact page (canonical contact-hq route)
    await page.goto('./');
    if (isMobile) {
      const mobileMenu = await openMobileMenuIfNeeded();
      await mobileMenu!.getByRole('link', { name: /^contact$/i }).click();
    } else {
      await headerNav.getByRole('link', { name: /^contact$/i }).click();
    }
    await expect(page).toHaveURL(/.*\/contact-hq\/?$/);
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

  test('should expose jump rails and buyer-entry shortcuts on services and pricing', async ({
    page,
  }) => {
    await page.goto('./services/');

    await page.getByRole('link', { name: /^catalog$/i }).click();
    await expect(page).toHaveURL(/\/services\/#technology-catalog$/);
    await expect(page.locator('#technology-catalog')).toBeVisible();

    await page.getByRole('link', { name: /open capability catalog/i }).click();
    await expect(page).toHaveURL(/\/services\/#technology-catalog$/);

    await page.goto('./pricing/');

    await page.getByRole('link', { name: /^sla matrix$/i }).click();
    await expect(page).toHaveURL(/\/pricing\/#sla$/);
    await expect(page.locator('#sla')).toBeVisible();

    await page.getByRole('link', { name: /^estimate$/i }).click();
    await expect(page).toHaveURL(/\/pricing\/#estimate$/);
    await expect(page.locator('#estimate')).toBeVisible();
  });

  test('should expose calmer jump rails on contact HQ', async ({ page }) => {
    await page.goto('./contact-hq/');

    await page.getByRole('link', { name: /^faq$/i }).click();
    await expect(page).toHaveURL(/\/contact-hq\/#faq$/);
    await expect(page.locator('#faq')).toBeVisible();

    await page.getByRole('link', { name: /^message checklist$/i }).click();
    await expect(page).toHaveURL(/\/contact-hq\/#intake$/);
    await expect(page.locator('#intake')).toBeVisible();
  });
});
