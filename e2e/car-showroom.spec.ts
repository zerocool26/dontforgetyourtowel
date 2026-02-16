import { test, expect } from '@playwright/test';

test.describe.skip('Car Showroom', () => {
  test('should boot and show the canvas UI', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        // Also print errors immediately to aid debugging in CI logs.
        console.error('[PAGE][console][error]', text);
        // Ignore 404s for optional 3D model files - these are expected to be missing in test environments
        // Also ignore generic "Failed to load resource" 404s which can be from optional assets
        const isOptional404 =
          text.includes('404') || text.includes('Failed to load resource');
        if (!isOptional404) {
          consoleErrors.push(text);
        }
      }
      if (msg.type() === 'warning') {
        console.warn('[PAGE][console][warning]', text);
        consoleWarnings.push(text);
      }
    });

    await page.goto('./car-showroom/', { waitUntil: 'domcontentloaded' });

    // Boot breadcrumb from the dedicated showroom runtime.
    await expect
      .poll(
        async () =>
          page.evaluate(
            () => document.documentElement.dataset.carShowroomBoot ?? '0'
          ),
        { timeout: 15_000 }
      )
      .toBe('1');

    const webglBoot = await page.evaluate(
      () => document.documentElement.dataset.carShowroomWebgl ?? '0'
    );
    if (webglBoot !== '1') {
      test.skip(
        true,
        'WebGL renderer could not initialize in this environment'
      );
    }

    // Canvas exists and should be visible.
    await expect(page.locator('[data-sr-canvas]')).toBeVisible({
      timeout: 15_000,
    });

    // v3 UI: there are two panel toggles (top bar + dock). Assert the top-bar one.
    await expect(
      page.getByRole('button', { name: 'Panel', exact: true })
    ).toBeVisible();
    await expect(page.locator('[data-sr-panel]')).toHaveCount(1);

    // Ensure the default Porsche model actually loads.
    // The runtime sets dataset flags on the root element.
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const root = document.querySelector<HTMLElement>('[data-sr-root]');
            if (!root) return false;
            const ds = root.dataset;
            const ready = ds.carShowroomReady ?? '0';
            const loading = ds.carShowroomLoading ?? '0';
            const error = (ds.carShowroomLoadError ?? '').trim();
            const model = (ds.carShowroomModel ?? '').trim();
            const okModel =
              model.includes('porsche-911-gt3rs.glb') ||
              model.includes('free_porsche_911_carrera_4s_LOD3_low.glb');
            return ready === '1' && loading === '0' && error === '' && okModel;
          }),
        { timeout: 20_000 }
      )
      .toBe(true);

    // Should not show the error overlay. If it does, surface details.
    const overlay = page.locator('.tower3d-error-overlay');
    const overlayCount = await overlay.count();
    if (overlayCount > 0) {
      const overlayText = (
        await overlay
          .first()
          .innerText()
          .catch(() => '')
      )
        .trim()
        .slice(0, 4000);
      throw new Error(
        [
          'Car showroom error overlay detected.',
          overlayText ? `Overlay:\n${overlayText}` : 'Overlay: (no text)',
          consoleErrors.length
            ? `Console errors:\n${consoleErrors.join('\n')}`
            : 'Console errors: (none)',
          consoleWarnings.length
            ? `Console warnings:\n${consoleWarnings.join('\n')}`
            : 'Console warnings: (none)',
        ].join('\n\n')
      );
    }

    // If there were console errors, surface them.
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });

  test('guided overlay should drive the tour on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('./car-showroom/', { waitUntil: 'domcontentloaded' });

    await expect
      .poll(
        async () =>
          page.evaluate(
            () => document.documentElement.dataset.carShowroomBoot ?? '0'
          ),
        { timeout: 15_000 }
      )
      .toBe('1');

    const webglBoot = await page.evaluate(
      () => document.documentElement.dataset.carShowroomWebgl ?? '0'
    );
    if (webglBoot !== '1') {
      test.skip(
        true,
        'WebGL renderer could not initialize in this environment'
      );
    }

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const root = document.querySelector<HTMLElement>('[data-sr-root]');
            if (!root) return false;
            const ds = root.dataset;
            const ready = ds.carShowroomReady ?? '0';
            const loading = ds.carShowroomLoading ?? '0';
            const error = (ds.carShowroomLoadError ?? '').trim();
            return ready === '1' && loading === '0' && error === '';
          }),
        { timeout: 25_000 }
      )
      .toBe(true);

    // Open quick menu and enable Guided.
    await page.locator('[data-sr-quick-toggle]').click();
    await expect(page.locator('[data-sr-quick-menu]')).toBeVisible();
    await page.locator('[data-sr-quick-guided]').check();

    // Close the menu so it doesn't intercept overlay clicks.
    await page.mouse.click(10, 10);
    await expect(page.locator('[data-sr-quick-menu]')).toBeHidden();

    const guide = page.locator('[data-sr-guide]');
    await expect(guide).toBeVisible({ timeout: 10_000 });

    // Start the tour from the overlay and assert step progression.
    const title = page.locator('[data-sr-guide-title]');
    const progress = page.locator('[data-sr-guide-progress]');
    const toggle = page.locator('[data-sr-guide-toggle]');
    const next = page.locator('[data-sr-guide-next]');
    const exit = page.locator('[data-sr-guide-exit]');

    await toggle.click();
    await expect(progress).toHaveText(/1\//, { timeout: 10_000 });
    await next.click();
    await expect(progress).toHaveText(/\d+\//, { timeout: 10_000 });
    const t2 = (await title.textContent())?.trim() ?? '';
    expect(t2.length).toBeGreaterThan(0);

    await exit.click();
    await expect(exit).toBeDisabled();
    await expect(toggle).toHaveText(/start/i);
  });

  test('should restore tour step from URL params', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./car-showroom/?tour=porsche&step=0&tp=0', {
      waitUntil: 'domcontentloaded',
    });

    await expect
      .poll(
        async () =>
          page.evaluate(
            () => document.documentElement.dataset.carShowroomBoot ?? '0'
          ),
        { timeout: 15_000 }
      )
      .toBe('1');

    const webglBoot = await page.evaluate(
      () => document.documentElement.dataset.carShowroomWebgl ?? '0'
    );
    if (webglBoot !== '1') {
      test.skip(
        true,
        'WebGL renderer could not initialize in this environment'
      );
    }

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const root = document.querySelector<HTMLElement>('[data-sr-root]');
            if (!root) return false;
            const ds = root.dataset;
            const ready = ds.carShowroomReady ?? '0';
            const loading = ds.carShowroomLoading ?? '0';
            const error = (ds.carShowroomLoadError ?? '').trim();
            return ready === '1' && loading === '0' && error === '';
          }),
        { timeout: 25_000 }
      )
      .toBe(true);

    // Tour step=0 should show the first step.
    const guide = page.locator('[data-sr-guide]');
    await expect(guide).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-sr-guide-progress]')).toHaveText(/1\//);
  });

  test('copy link should roundtrip tour state (tour/step/tp)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./car-showroom/', { waitUntil: 'domcontentloaded' });

    await expect
      .poll(
        async () =>
          page.evaluate(
            () => document.documentElement.dataset.carShowroomBoot ?? '0'
          ),
        { timeout: 15_000 }
      )
      .toBe('1');

    const webglBoot = await page.evaluate(
      () => document.documentElement.dataset.carShowroomWebgl ?? '0'
    );
    if (webglBoot !== '1') {
      test.skip(
        true,
        'WebGL renderer could not initialize in this environment'
      );
    }

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const root = document.querySelector<HTMLElement>('[data-sr-root]');
            if (!root) return false;
            const ds = root.dataset;
            const ready = ds.carShowroomReady ?? '0';
            const loading = ds.carShowroomLoading ?? '0';
            const error = (ds.carShowroomLoadError ?? '').trim();
            return ready === '1' && loading === '0' && error === '';
          }),
        { timeout: 25_000 }
      )
      .toBe(true);

    // Enable Guided from the quick menu.
    await page.locator('[data-sr-quick-toggle]').click();
    await expect(page.locator('[data-sr-quick-menu]')).toBeVisible();
    await page.locator('[data-sr-quick-guided]').check();
    await page.mouse.click(10, 10);
    await expect(page.locator('[data-sr-quick-menu]')).toBeHidden();

    const guide = page.locator('[data-sr-guide]');
    await expect(guide).toBeVisible({ timeout: 10_000 });

    const progress = page.locator('[data-sr-guide-progress]');
    const toggle = page.locator('[data-sr-guide-toggle]');
    const next = page.locator('[data-sr-guide-next]');

    // Start playing and move to step 2/N.
    await toggle.click();
    await expect(toggle).toHaveText(/pause/i, { timeout: 10_000 });
    await expect(progress).toHaveText(/1\//, { timeout: 10_000 });
    await next.click();
    await expect(progress).toHaveText(/\d+\//, { timeout: 10_000 });

    const currentProgress = (await progress.textContent())?.trim() ?? '1/1';
    const currentStep =
      Number(currentProgress.match(/^(\d+)\//)?.[1] ?? '1') - 1;

    // Manual step navigation pauses; resume so tp=1 is encoded.
    await toggle.click();
    await expect(toggle).toHaveText(/pause/i, { timeout: 10_000 });

    // Copy link to clipboard.
    const origin = new URL(page.url()).origin;
    await page
      .context()
      .grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
    await page.locator('[data-sr-share]').first().click({ force: true });

    let shareUrl = '';
    await expect
      .poll(
        async () => {
          shareUrl = await page.evaluate(() => navigator.clipboard.readText());
          return shareUrl;
        },
        { timeout: 7_000 }
      )
      .toMatch(/\btour=/);

    const u = new URL(shareUrl);
    expect(u.searchParams.get('tour')).toBeTruthy();
    expect(Number(u.searchParams.get('step') ?? '0')).toBe(currentStep);
    expect(u.searchParams.get('tp')).toBe('1');

    // Roundtrip: load the shared URL and ensure the overlay restores.
    await page.goto(u.toString(), { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-sr-guide]')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('[data-sr-guide-progress]')).toHaveText(/\d+\//);
    await expect(page.locator('[data-sr-guide-toggle]')).toHaveText(/pause/i);
  });
});
