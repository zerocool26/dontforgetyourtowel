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
        name: /Services that make IT feel owned again/i,
      })
    ).toBeVisible();

    await page.goto('contact-hq/');
    await expect(page).toHaveURL(/.*\/contact-hq\/?$/);
    await expect(
      page.getByRole('heading', {
        name: /Send the right context once/i,
      })
    ).toBeVisible();

    await page.goto('about/?demo=cart#shop-experience');
    await expect(page).toHaveURL(/.*\/about\/\?demo=cart#shop-experience$/);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /The best MSP is the one that makes ownership obvious/i,
      })
    ).toBeVisible();
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
      await mobileMenu.getByRole('link', { name: /^what we own$/i }).click();
    } else {
      const headerNav = page.getByRole('navigation', {
        name: /main navigation/i,
      });
      await headerNav.getByRole('link', { name: /^what we own$/i }).click();
    }

    await expect(page).toHaveURL(/.*\/services\/?$/);
  });
});
