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
      await expect(page.locator('body')).toHaveClass(/editorial-site/);
      await expect(page.locator('main')).toHaveClass(/editorial-page/);

      if (route !== '/') {
        await expect(page.locator('.page-hero')).toBeVisible();
      }

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

  test('shared editorial components propagate without broken media', async ({
    page,
  }) => {
    const representativeRoutes = [
      '/services/',
      '/software/',
      '/trust-center/',
      '/chicago/',
    ];

    for (const route of representativeRoutes) {
      await page.goto(`.${route}`);
      await expect(
        page.locator('.editorial-band, .media-interlude').first()
      ).toBeVisible();

      const heroImage = page.locator('.page-hero__media img');
      await expect(heroImage).toBeVisible();
      await expect
        .poll(() => heroImage.evaluate(element => element.naturalWidth))
        .toBeGreaterThan(0);

      const chapterImage = page.locator('.media-interlude__figure img');
      if ((await chapterImage.count()) > 0) {
        await chapterImage.evaluate(element =>
          element.scrollIntoView({ block: 'center' })
        );
        await expect
          .poll(() => chapterImage.evaluate(element => element.naturalWidth))
          .toBeGreaterThan(0);
      }

      const ctaImage = page.locator('.cta-band__media img');
      if ((await ctaImage.count()) > 0) {
        await ctaImage.evaluate(element =>
          element.scrollIntoView({ block: 'center' })
        );
        await expect
          .poll(() => ctaImage.evaluate(element => element.naturalWidth))
          .toBeGreaterThan(0);
      }
    }

    await page.goto('./blog/software-production-handoff-checklist/');
    const articleCover = page.locator('.article-cover img');
    await expect(articleCover).toBeVisible();
    await expect
      .poll(() => articleCover.evaluate(element => element.naturalWidth))
      .toBeGreaterThan(0);

    const designTokens = await page.evaluate(() => {
      const styles = getComputedStyle(document.body);
      return {
        accent: styles.getPropertyValue('--color-accent').trim(),
        background: styles.getPropertyValue('--color-background').trim(),
        ink: styles.getPropertyValue('--color-text').trim(),
      };
    });

    expect(designTokens).toEqual({
      accent: '#163bff',
      background: '#ffffff',
      ink: '#101114',
    });
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

  test('every route carries a distinct section shape', async ({ page }) => {
    const signatures = new Map<string, string>();
    const routes = [
      '/',
      '/services/',
      '/software/',
      '/pricing/',
      '/trust-center/',
      '/about/',
      '/contact-hq/',
    ];

    for (const route of routes) {
      await page.goto(`.${route}`);
      const shape = await page.evaluate(() =>
        [
          '.signal-rail',
          '.handoff-diagram',
          '.comparison',
          '.arc',
          '.spec-ledger',
          '.pull-quote',
          '.media-interlude',
        ]
          .filter(selector => document.querySelector(selector))
          .join('+')
      );
      const clash = [...signatures].find(([, value]) => value === shape);
      expect(clash, `${route} repeats the shape of ${clash?.[0]}`).toBe(
        undefined
      );
      signatures.set(route, shape);
    }
  });

  test('the handoff diagram is legible at both sizes', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('./');
    const diagram = page.locator('.handoff-diagram');
    await expect(diagram).toBeVisible();
    await expect(diagram.locator('.handoff-diagram__svg')).toBeVisible();
    await expect(diagram.locator('.handoff-diagram__compact')).toBeHidden();
    await expect(diagram.locator('svg[role="img"]')).toHaveAccessibleName(
      /fragmented delivery/i
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(diagram.locator('.handoff-diagram__svg')).toBeHidden();
    await expect(diagram.locator('.handoff-diagram__compact')).toBeVisible();
  });

  test('the comparison keeps its final column visible on mobile', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./services/');
    const winning = page.locator('.comparison__table td.is-highlight').first();
    await winning.scrollIntoViewIfNeeded();
    await expect(winning).toBeInViewport();

    const box = await winning.boundingBox();
    const width = page.viewportSize()?.width ?? 0;
    expect(box).not.toBeNull();
    expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);

    await expect(winning).toHaveText('One lead, through production');
  });

  test('accent text stays readable on the near-black bands', async ({
    page,
  }) => {
    await page.goto('./software/');
    const emphasis = page.locator('.pull-quote--ink p em');
    await emphasis.scrollIntoViewIfNeeded();
    await expect(emphasis).toHaveCSS('color', 'rgb(143, 166, 255)');
  });

  test('retired demo routes are gone', async ({ page }) => {
    const response = await page.goto('./demo/');
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole('heading', { name: 'This page is no longer here.' })
    ).toBeVisible();
  });
});
