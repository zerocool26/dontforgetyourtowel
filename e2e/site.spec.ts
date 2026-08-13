import { expect, test } from '@playwright/test';

const coreRoutes = [
  '/',
  '/services/',
  '/software/',
  '/pricing/',
  '/trust-center/',
  '/about/',
  '/blog/',
  '/chicago/',
  '/contact-hq/',
  '/privacy/',
  '/terms/',
];

test.describe('premium public site', () => {
  for (const route of coreRoutes) {
    test(`${route} renders a focused page`, async ({ page }) => {
      const response = await page.goto(`.${route}`);
      expect(response?.ok()).toBeTruthy();
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('body')).not.toContainText('Lorem ipsum');

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test('homepage keeps the primary buyer path clear', async ({ page }) => {
    await page.goto('./');
    await expect(
      page.getByRole('heading', {
        name: 'Your technology should pull its weight.',
      })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Bring us the problem' }).first()
    ).toBeVisible();
    await expect(page.locator('.editorial-hero__media img')).toBeVisible();

    const landingImages = page.locator(
      '.editorial-hero__media img, .editorial-handoff__media img, .editorial-cta__media img'
    );
    await expect(landingImages).toHaveCount(3);
    for (const image of await landingImages.all()) {
      await image.evaluate(element =>
        element.scrollIntoView({ block: 'center' })
      );
      await expect
        .poll(() => image.evaluate(element => element.naturalWidth))
        .toBeGreaterThan(0);
    }

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('pricing estimator updates the planning range', async ({ page }) => {
    await page.goto('./pricing/');
    const estimator = page.getByTestId('pricing-estimator');
    await expect(estimator).toBeVisible();
    const island = page.locator('astro-island').filter({ has: estimator });
    await expect(island).not.toHaveAttribute('ssr', '');
    const users = estimator.getByLabel('Users');
    await users.fill('100');
    await expect(users).toHaveValue('100');
    await expect(estimator).toContainText('$13,500–$17,500');
  });

  test('contact route provides a real direct handoff', async ({ page }) => {
    await page.goto('./contact-hq/');
    const email = page.getByRole('link', { name: 'hello@chicagos1msp.com' });
    await expect(email).toHaveAttribute(
      'href',
      'mailto:hello@chicagos1msp.com'
    );
    await expect(
      page.getByRole('link', { name: 'Start an email' })
    ).toHaveAttribute('href', /mailto:hello@chicagos1msp.com/);
  });

  test('mobile navigation stays keyboard and touch accessible', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./');
    await page.locator('.mobile-menu summary').click();
    const mobileNav = page.getByRole('navigation', {
      name: 'Mobile navigation',
    });
    await expect(mobileNav).toBeVisible();
    await expect(
      mobileNav.getByRole('link', { name: 'Services' })
    ).toBeVisible();
  });

  test('retired demo routes are gone', async ({ page }) => {
    const response = await page.goto('./demo/');
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole('heading', { name: 'This page is no longer here.' })
    ).toBeVisible();
  });
});
