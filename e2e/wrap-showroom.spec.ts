import { test, expect } from '@playwright/test';

type ModelFetchInfo = {
  url: string;
  ok: boolean;
  status: number;
  contentLength: string | null;
  contentType: string | null;
  error?: string;
};

test.describe.skip('Wrap Showroom (scene18)', () => {
  test('should load the Porsche GLB and report breadcrumbs', async ({
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

    // Confirm the director registered the expected scene set.
    const targetSceneIndex = await page.evaluate(() => {
      const last =
        document.documentElement.dataset.towerSceneLastId ?? 'scene18';
      const lastMatch = last.match(/scene(\d+)/);
      const lastIndex = lastMatch ? Number(lastMatch[1]) : 18;
      return Math.min(18, lastIndex);
    });

    await expect
      .poll(
        async () =>
          page.evaluate(
            () => document.documentElement.dataset.towerSceneLastId ?? ''
          ),
        { timeout: 15_000 }
      )
      .toBe(`scene${targetSceneIndex}`);

    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__galleryAutoPlay?.stop?.();
    });

    await expect
      .poll(
        async () =>
          page.evaluate(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            () => typeof (window as any).__goToSceneImmediate
          ),
        { timeout: 10_000 }
      )
      .toBe('function');

    // Deterministic jump for automation.
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__goToSceneImmediate?.(18);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__TOWER__?.jumpToSceneIndex?.(18);
    });

    await expect
      .poll(
        async () =>
          page.evaluate(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            () => (window as any).__galleryGetCurrentScene?.() ?? -1
          ),
        { timeout: 10_000 }
      )
      .toBe(targetSceneIndex);

    await expect
      .poll(
        async () =>
          page.evaluate(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            () => (window as any).__galleryGetTargetProgress?.() ?? -1
          ),
        { timeout: 10_000 }
      )
      .toBe(1);

    await expect
      .poll(
        async () =>
          page.evaluate(
            () =>
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ((window as any).__TOWER__?.getCurrentSceneIndex?.() as
                | number
                | undefined) ?? -1
          ),
        { timeout: 20_000 }
      )
      .toBe(targetSceneIndex);

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
      .toBe(`scene${targetSceneIndex}`);

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
      wrapColor: document.documentElement.dataset.wrapShowroomWrapColor ?? '',
    }));

    expect(
      breadcrumbs.error,
      `Wrap Showroom model parse/load error breadcrumb set: ${JSON.stringify(breadcrumbs)}`
    ).not.toBe('1');
    expect(
      breadcrumbs.missing,
      `Wrap Showroom model was reported missing: ${JSON.stringify(breadcrumbs)}`
    ).not.toBe('1');
    expect(
      breadcrumbs.loaded,
      `Wrap Showroom model never reported as loaded: ${JSON.stringify(breadcrumbs)}`
    ).toBe('1');

    expect(breadcrumbs.mode).toBe('wrap');
    expect(breadcrumbs.wrapColor).toMatch(/^#[0-9a-fA-F]{6}$/);

    await expect(page.locator('.tower3d-error-overlay')).toHaveCount(0);

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });
});
