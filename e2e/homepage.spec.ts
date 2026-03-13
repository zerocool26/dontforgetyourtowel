import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load successfully', async ({ page }) => {
    await page.goto('./');
    await expect(page).toHaveTitle(/(Astro Demo 2026|Olive Global Systems)/i);
  });

  test('should display hero section', async ({ page }) => {
    await page.goto('./');
    const hero = page.locator('[data-olive-universe="ready"]');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute(
      'data-olive-scene',
      /(staging|booting|interactive|ambient|fallback)/
    );
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /creative technology/i,
      })
    ).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: /story chapters/i })
    ).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: /jump to creative technology studio/i,
      })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /skip immersive intro/i })
    ).toBeVisible();
  });

  test('should let calm-mode users enable immersive scenes', async ({
    page,
    isMobile,
  }) => {
    if (isMobile) {
      test.skip();
    }

    await page.goto('./');

    const hero = page.locator('[data-olive-universe="ready"]');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute('data-olive-mode', 'reduced');

    const enableScenes = page.getByRole('button', {
      name: /enable immersive scenes/i,
    });
    await expect(enableScenes).toBeVisible();
    await enableScenes.click();

    await expect(hero).toHaveAttribute('data-olive-mode', /(immersive|lite)/);
    await expect(hero).toHaveAttribute(
      'data-olive-scene',
      /(staging|booting|interactive)/
    );

    await page
      .getByRole('button', { name: /jump to managed operations/i })
      .click();
    await expect(hero).toHaveAttribute('data-current-chapter', 'signal');
  });

  test('should progress through immersive hero chapters', async ({
    browser,
    baseURL,
    isMobile,
  }) => {
    if (isMobile) {
      test.skip();
    }

    const context = await browser.newContext({
      reducedMotion: 'no-preference',
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    await page.goto(baseURL ?? 'http://localhost:4321/', {
      waitUntil: 'networkidle',
    });

    const hero = page.locator('[data-olive-universe="ready"]');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute('data-olive-mode', /(immersive|lite)/);

    await page
      .getByRole('button', { name: /jump to cloud engineering/i })
      .click();
    await expect(hero).toHaveAttribute('data-current-chapter', 'cloud');

    await page
      .getByRole('button', { name: /jump to start your project/i })
      .click();
    await expect(hero).toHaveAttribute('data-current-chapter', 'singularity');

    await context.close();
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
        mobileMenu!.getByRole('link', { name: /^contact$/i })
      ).toBeVisible();
      await expect(
        mobileMenu!.getByRole('link', { name: /^portfolio$/i })
      ).toBeVisible();
      await expect(
        mobileMenu!.getByRole('link', { name: /^home$/i })
      ).toBeVisible();
    } else {
      await expect(
        headerNav.getByRole('link', { name: /^services$/i })
      ).toBeVisible();
      await expect(
        headerNav.getByRole('link', { name: /^contact$/i })
      ).toBeVisible();
      await expect(
        headerNav.getByRole('link', { name: /^portfolio$/i })
      ).toBeVisible();
    }
  });

  test('should navigate using main links', async ({ page, isMobile }) => {
    await page.goto('./');

    if (isMobile) {
      test.skip();
    }

    const navigateFromHome = async (linkName: RegExp, target: RegExp) => {
      await page.goto('./');

      const headerNav = page.getByRole('navigation', {
        name: /main navigation/i,
      });

      const link = headerNav.getByRole('link', { name: linkName });
      await expect(link).toBeVisible();
      await link.click();
      await expect(page).toHaveURL(target);
    };

    await navigateFromHome(/^services$/i, /.*\/services\/?$/);
    await navigateFromHome(/^contact$/i, /.*\/contact-hq\/?$/);
    await navigateFromHome(/^portfolio$/i, /.*\/about\/?$/);
  });

  test('primary CTA should jump to consultation form', async () => {
    test.skip();
  });
});
