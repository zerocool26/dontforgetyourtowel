import { test, expect } from '@playwright/test';

test.describe('Car Showroom', () => {
  test('should boot and show the canvas UI', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore 404s for optional 3D model files - these are expected to be missing in test environments
        // Also ignore generic "Failed to load resource" 404s which can be from optional assets
        const isOptional404 =
          text.includes('404') || text.includes('Failed to load resource');
        if (!isOptional404) {
          consoleErrors.push(text);
        }
      }
      if (msg.type() === 'warning') consoleWarnings.push(msg.text());
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

    // Canvas exists and should be visible.
    await expect(page.locator('[data-car-showroom-canvas]')).toBeVisible({
      timeout: 15_000,
    });

    // Options button exists.
    await expect(page.locator('[data-csr-toggle-panel]')).toBeVisible();

    // Ensure the default Porsche model actually loads.
    // The runtime sets dataset flags on the root element.
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const root = document.querySelector<HTMLElement>(
              '[data-car-showroom-root]'
            );
            if (!root) return false;
            const ds = root.dataset;
            const ready = ds.carShowroomReady ?? '0';
            const loading = ds.carShowroomLoading ?? '0';
            const error = (ds.carShowroomLoadError ?? '').trim();
            const model = (ds.carShowroomModel ?? '').trim();
            const okModel = model.includes('porsche-911-gt3rs.glb');
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
});
