import { test, expect } from '@playwright/test';

type ModelFetchInfo = {
  url: string;
  ok: boolean;
  status: number;
  contentLength: string | null;
  contentType: string | null;
  error?: string;
};

test.describe.skip('Porsche Showroom (scene17)', () => {
  test('should load the external GLB and report showroom breadcrumbs', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      // Keep the suite resilient to unrelated optional-asset 404 noise.
      const isOptional404 =
        text.includes('404') || text.includes('Failed to load resource');
      if (!isOptional404) consoleErrors.push(text);
    });

    await page.goto('./gallery/', { waitUntil: 'domcontentloaded' });

    // Wait for the gallery boot module to run and UI wiring to be attached.
    await expect
      .poll(
        async () =>
          page.evaluate(
            () => document.documentElement.dataset.galleryBoot ?? '0'
          ),
        { timeout: 15_000 }
      )
      .toBe('1');

    await expect(page.locator('[data-gallery-loader]')).toHaveCount(0, {
      timeout: 15_000,
    });

    // Ensure auto-play can't fight the test.
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__galleryAutoPlay?.stop?.();
    });

    // Switch to the showroom scene using the gallery's debug hooks.
    await expect
      .poll(
        async () =>
          page.evaluate(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            () => typeof (window as any).__goToSceneImmediate
          ),
        {
          timeout: 10_000,
        }
      )
      .toBe('function');

    const targetSceneId = await page.evaluate(() => {
      const last =
        document.documentElement.dataset.towerSceneLastId ?? 'scene17';
      const lastMatch = last.match(/scene(\d+)/);
      const lastIndex = lastMatch ? Number(lastMatch[1]) : 17;
      const target = Math.min(17, lastIndex);
      return `scene${target}`;
    });

    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__goToSceneImmediate?.(17);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__TOWER__?.jumpToSceneIndex?.(17);
    });

    // Sanity-check that the model URL is actually reachable (helps pinpoint base-path issues).
    const modelFetchInfo: ModelFetchInfo = await page.evaluate(async () => {
      const pathname = window.location.pathname;
      const idx = pathname.indexOf('/gallery');
      const basePath = idx >= 0 ? pathname.slice(0, idx + 1) : '/';
      const url = `${basePath}models/porsche-911-gt3rs.glb`;
      try {
        const res = await fetch(url, { cache: 'no-store' });
        return {
          url,
          ok: res.ok,
          status: res.status,
          contentLength: res.headers.get('content-length'),
          contentType: res.headers.get('content-type'),
        };
      } catch (e) {
        return {
          url,
          ok: false,
          status: -1,
          contentLength: null,
          contentType: null,
          error: String(e),
        };
      }
    });
    expect(
      modelFetchInfo.ok,
      `Expected Porsche GLB to be fetchable. Info: ${JSON.stringify(modelFetchInfo)}`
    ).toBeTruthy();

    // Confirm director switched scenes.
    await expect
      .poll(
        async () =>
          page.evaluate(
            () =>
              document.querySelector<HTMLElement>('[data-tower3d-root]')
                ?.dataset.towerScene ?? ''
          ),
        { timeout: 20_000 }
      )
      .toBe(targetSceneId);

    // Confirm the external model actually loaded (or fail fast on parse/load error).
    await page.waitForFunction(
      () => {
        const ds = document.documentElement.dataset;
        return (
          ds.wrapShowroomModelLoaded === '1' ||
          ds.wrapShowroomModelError === '1' ||
          ds.wrapShowroomModelMissing === '1'
        );
      },
      null,
      { timeout: 45_000 }
    );

    const breadcrumbs = await page.evaluate(() => ({
      requested:
        document.documentElement.dataset.wrapShowroomModelRequested ?? '0',
      url: document.documentElement.dataset.wrapShowroomModelUrl ?? '',
      loaded: document.documentElement.dataset.wrapShowroomModelLoaded ?? '0',
      error: document.documentElement.dataset.wrapShowroomModelError ?? '0',
      errorMessage:
        document.documentElement.dataset.wrapShowroomModelErrorMessage ?? '',
      missing: document.documentElement.dataset.wrapShowroomModelMissing ?? '0',
      mode: document.documentElement.dataset.wrapShowroomMode ?? '',
    }));

    expect(
      breadcrumbs.error,
      `Showroom model parse/load error breadcrumb set: ${JSON.stringify(breadcrumbs)}`
    ).not.toBe('1');
    expect(
      breadcrumbs.missing,
      `Showroom model was reported missing: ${JSON.stringify(breadcrumbs)}`
    ).not.toBe('1');
    expect(
      breadcrumbs.loaded,
      `Showroom model never reported as loaded: ${JSON.stringify(breadcrumbs)}`
    ).toBe('1');

    expect(breadcrumbs.mode).toBeTruthy();

    // Should not show the error overlay.
    await expect(page.locator('.tower3d-error-overlay')).toHaveCount(0);

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });
});
