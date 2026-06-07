import { expect, test } from '@playwright/test';

test.describe('Landing page integrity', () => {
  test('keeps the managed IT hero composition intact', async ({ page }) => {
    await page.goto('./');

    const hero = page.locator('#landing-hero');
    await expect(hero).toBeVisible();

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /CHICAGOS #1 MSP for companies/i,
      })
    ).toBeAttached();
    await expect(
      page.locator('[data-testid="home-orbit-scene"]')
    ).toBeVisible();

    const heroBox = await hero.boundingBox();
    expect(heroBox?.height ?? 0).toBeGreaterThanOrEqual(620);
  });

  test('exposes accessible destination links alongside visible navigation', async ({
    page,
    isMobile,
  }) => {
    await page.goto('./');

    if (isMobile) {
      await page.getByRole('button', { name: /toggle navigation/i }).click();
    }

    const navSurface = isMobile
      ? page.locator('#mobile-menu')
      : page.getByRole('navigation', {
          name: /main navigation/i,
        });
    await expect(
      navSurface.getByRole('link', { name: /^solutions$/i })
    ).toHaveAttribute('href', /\/services\/?$/);
    await expect(
      navSurface.getByRole('link', { name: /^pricing$/i })
    ).toHaveAttribute('href', /\/pricing\/?$/);
    await expect(
      navSurface.getByRole('link', { name: /^contact$/i })
    ).toHaveAttribute('href', /\/contact-hq\/?$/);
  });

  test('desktop rendering should show the operating map without horizontal overflow', async ({
    page,
    isMobile,
  }) => {
    if (isMobile) {
      test.skip();
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('./');

    await expect(
      page.locator('[data-testid="home-orbit-scene"] canvas')
    ).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('mobile viewports keep the hero readable and action-oriented', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./');

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /CHICAGOS #1 MSP for companies/i,
      })
    ).toBeAttached();
    await expect(
      page.locator('[data-testid="home-orbit-scene"] canvas')
    ).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
