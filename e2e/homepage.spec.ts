import { expect, test } from '@playwright/test';

test.describe('Homepage immersive landing', () => {
  test('should load the fullscreen immersive experience', async ({ page }) => {
    await page.goto('./');

    await expect(page).toHaveTitle(/Olive Global Systems/i);

    const hero = page.locator('[data-olive-universe="ready"]');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute('data-current-chapter', 'singularity');
    await expect(hero).toHaveAttribute(
      'data-olive-runtime',
      /(default|stability)/
    );
    await expect(hero).toHaveAttribute(
      'data-olive-scene',
      /(booting|interactive|ambient|fallback)/
    );
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /immersive landing experience/i
    );
  });

  test('desktop sessions should resolve the 3D scene', async ({
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
    await expect(hero.locator('canvas[data-hero-canvas="true"]')).toBeVisible();
    await expect
      .poll(async () => hero.getAttribute('data-olive-scene'), {
        timeout: 6000,
      })
      .toBe('interactive');

    await context.close();
  });

  test('reduced-motion sessions should use the calm presentation', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      reducedMotion: 'reduce',
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    await page.goto(baseURL ?? 'http://localhost:4321/', {
      waitUntil: 'networkidle',
    });

    const hero = page.locator('[data-olive-universe="ready"]');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute('data-olive-mode', 'reduced');
    await expect(hero).toHaveAttribute('data-olive-scene', 'ambient');

    await context.close();
  });

  test('low-memory sessions should switch into optimized 3D mode', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      reducedMotion: 'no-preference',
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, 'deviceMemory', {
        configurable: true,
        get: () => 2,
      });
    });

    await page.goto(baseURL ?? 'http://localhost:4321/', {
      waitUntil: 'networkidle',
    });

    const hero = page.locator('[data-olive-universe="ready"]');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute('data-olive-mobile-3d', 'optimized');
    await expect(hero).toHaveAttribute('data-olive-mode', 'lite');

    await context.close();
  });

  test('direct interaction should trigger a scene burst', async ({
    browser,
    baseURL,
  }) => {
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

    await hero.click({ position: { x: 220, y: 260 }, force: true });
    await expect(hero).toHaveAttribute('data-olive-interaction', 'burst');

    await expect
      .poll(async () => hero.getAttribute('data-olive-interaction'), {
        timeout: 4000,
      })
      .toBe('idle');

    await context.close();
  });

  test('forced stability assist should downgrade runtime mode', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      reducedMotion: 'no-preference',
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    await page.addInitScript(() => {
      (
        window as Window & {
          __OLIVE_FORCE_STABILITY_ASSIST__?: boolean;
        }
      ).__OLIVE_FORCE_STABILITY_ASSIST__ = true;
    });

    await page.goto(baseURL ?? 'http://localhost:4321/', {
      waitUntil: 'networkidle',
    });

    const hero = page.locator('[data-olive-universe="ready"]');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute('data-olive-runtime', 'stability');
    await expect(hero).toHaveAttribute('data-olive-mode', 'lite');

    await context.close();
  });
});
