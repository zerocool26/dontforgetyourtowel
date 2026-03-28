import { expect, test, type Locator } from '@playwright/test';

async function getCanvasVisiblePixelRatio(locator: Locator) {
  return locator.evaluate(node => {
    if (!(node instanceof HTMLCanvasElement)) {
      return 0;
    }

    const sample = document.createElement('canvas');
    sample.width = 64;
    sample.height = 64;
    const context = sample.getContext('2d');

    if (!context) {
      return 0;
    }

    context.drawImage(node, 0, 0, sample.width, sample.height);
    const { data } = context.getImageData(0, 0, sample.width, sample.height);

    let visiblePixels = 0;
    for (let index = 0; index < data.length; index += 4) {
      const luminance = data[index] + data[index + 1] + data[index + 2];
      if (luminance > 24) {
        visiblePixels += 1;
      }
    }

    return visiblePixels / (sample.width * sample.height);
  });
}

test.describe('Landing page integrity', () => {
  test('should dedicate the viewport to the immersive scene', async ({
    page,
  }) => {
    await page.goto('./');

    const hero = page.locator('[data-olive-universe="ready"]');
    await expect(hero).toBeVisible();

    const heroBox = await hero.boundingBox();
    expect(heroBox?.height ?? 0).toBeGreaterThanOrEqual(660);

    await expect(
      page.getByRole('navigation', { name: /main navigation/i })
    ).toHaveCount(0);
  });

  test('should expose accessible destination links without adding visible chrome', async ({
    page,
  }) => {
    await page.goto('./');

    const linksShell = page.locator('[data-olive-links]');
    await expect(linksShell.locator('a[href$="/services/"]')).toHaveCount(1);
    await expect(linksShell.locator('a[href$="/about/"]')).toHaveCount(1);
    await expect(linksShell.locator('a[href$="/build-studio/"]')).toHaveCount(
      1
    );
    await expect(linksShell.locator('a[href$="/contact-hq/"]')).toHaveCount(1);
  });

  test('desktop rendering should produce visible canvas output', async ({
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

    const canvas = page.locator('canvas[data-hero-canvas="true"]');
    await expect(canvas).toBeVisible();
    await expect
      .poll(async () => getCanvasVisiblePixelRatio(canvas), {
        timeout: 6000,
      })
      .toBeGreaterThan(0.015);

    await context.close();
  });

  test('mobile viewports should keep the scene fullscreen and optimized', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 430, height: 932 },
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage();

    await page.goto(baseURL ?? 'http://localhost:4321/', {
      waitUntil: 'networkidle',
    });

    const hero = page.locator('[data-olive-universe="ready"]');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute('data-olive-mobile-3d', 'optimized');
    await expect(hero).toHaveAttribute('data-olive-mode', 'lite');

    const heroBox = await hero.boundingBox();
    expect(heroBox?.height ?? 0).toBeGreaterThanOrEqual(900);

    await context.close();
  });
});
