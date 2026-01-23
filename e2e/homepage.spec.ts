import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load successfully', async ({ page }) => {
    await page.goto('./');
    await expect(page).toHaveTitle(
      /Next.?gen digital ops, engineered for motion and intelligence/i
    );
  });

  test('should display hero section', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('.hero-explorer')).toBeVisible();
  });

  test('should have working navigation', async ({ page, isMobile }) => {
    await page.goto('./');

    if (isMobile) {
      const mobileNav = page.getByRole('navigation', {
        name: /primary navigation/i,
      });
      await expect(
        mobileNav.getByRole('link', { name: /^about$/i })
      ).toBeVisible();
      await expect(
        mobileNav.getByRole('link', { name: /^services$/i })
      ).toBeVisible();
      await expect(
        mobileNav.getByRole('link', { name: /^pricing$/i })
      ).toBeVisible();
      await expect(page.locator('#mobile-menu-button')).toBeVisible();
      return;
    }

    // Desktop header nav links
    const headerNav = page.getByRole('navigation', {
      name: /main navigation/i,
    });
    await expect(
      headerNav.getByRole('link', { name: /^about$/i })
    ).toBeVisible();
    await expect(
      headerNav.getByRole('link', { name: /^services$/i })
    ).toBeVisible();
    await expect(
      headerNav.getByRole('link', { name: /^pricing$/i })
    ).toBeVisible();
    await expect(
      headerNav.getByRole('link', { name: /free consultation/i })
    ).toBeVisible();
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
