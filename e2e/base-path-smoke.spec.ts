import { test, expect } from '@playwright/test';

test.describe('Base path smoke', () => {
  test('core routes resolve and render under configured base path', async ({
    page,
  }) => {
    await page.goto('./');
    await expect(page.locator('#main-content')).toBeVisible();

    await page.goto('services/');
    await expect(page).toHaveURL(/.*\/services\/?$/);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /choose the right lane across support, security, Microsoft 365, cloud, continuity, and client-facing systems\./i,
      })
    ).toBeVisible();

    await page.goto('contact-hq/');
    await expect(page).toHaveURL(/.*\/contact-hq\/?$/);
    await expect(
      page.getByRole('heading', {
        name: /send the right context once and make the next move obvious\./i,
      })
    ).toBeVisible();

    await page.goto('about/?demo=cart#shop-experience');
    await expect(page).toHaveURL(/.*\/about\/\?demo=cart#shop-experience$/);
    await expect(page.locator('#shop-experience')).toBeVisible();
  });

  test('header navigation keeps users on base-aware internal routes', async ({
    page,
    isMobile,
  }) => {
    await page.goto('./');

    if (isMobile) {
      const menuButton = page.locator('#mobile-menu-button');
      await expect(menuButton).toBeVisible();
      await menuButton.click();

      const mobileMenu = page.locator('#mobile-menu');
      await mobileMenu.getByRole('link', { name: /^solutions$/i }).click();
    } else {
      const headerNav = page.getByRole('navigation', {
        name: /main navigation/i,
      });
      await headerNav.getByRole('link', { name: /^solutions$/i }).click();
    }

    await expect(page).toHaveURL(/.*\/services\/?$/);
  });
});
