import { test, expect } from '@playwright/test';

test.describe('3D Gallery', () => {
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

    await page.goto('./gallery/', { waitUntil: 'domcontentloaded' });

    // Boot breadcrumb from the boot module.
    await expect
      .poll(
        async () =>
          page.evaluate(
            () => document.documentElement.dataset.galleryBoot ?? '0'
          ),
        {
          timeout: 15_000,
        }
      )
      .toBe('1');

    // Canvas exists and should be visible.
    await expect(page.locator('[data-tower3d-canvas]')).toBeVisible({
      timeout: 15_000,
    });

    // The loader should be hidden/removed shortly after boot.
    await expect(page.locator('[data-gallery-loader]')).toHaveCount(0, {
      timeout: 15_000,
    });

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
          'Gallery error overlay detected.',
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
