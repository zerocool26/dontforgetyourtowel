import { test, expect } from '@playwright/test';

test.describe('Landing Page Integrity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
  });

  test('should display the primary hero badge and service framing', async ({
    page,
  }) => {
    const heroRegion = page.locator('[data-olive-universe="ready"]');

    await expect(
      heroRegion.getByText(/Creative Technology Studio/i)
    ).toBeVisible();
    await expect(heroRegion.getByText(/AI Systems/i).first()).toBeVisible();
    await expect(
      heroRegion.getByRole('heading', {
        level: 1,
        name: /Creative technology/i,
      })
    ).toBeVisible();
  });

  test('should render the hero headline with correct H1 tag', async ({
    page,
  }) => {
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });

  test('should continue the 3D experience beyond the hero section', async ({
    page,
  }) => {
    const section = page.locator('[data-landing-3d-preview]');

    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
    await expect(section.locator('canvas[data-hero-canvas]')).toBeVisible();
    await expect(
      page.getByRole('heading', {
        level: 2,
        name: /immersive system now keeps working after the hero/i,
      })
    ).toBeVisible();
  });

  test('should let users tune the mid-page 3D runway scene controls', async ({
    page,
  }) => {
    const runway = page.locator('[data-landing-3d-runway]');
    const previewShell = runway.locator('[data-landing-3d-preview-shell]');
    const controls = runway.locator('[data-landing-3d-controls]');

    await runway.scrollIntoViewIfNeeded();

    const previewRoot = previewShell.locator('[data-hero-root]');
    await expect(previewRoot).toHaveAttribute('data-hero-variant', 'nexus');

    await controls.getByRole('button', { name: /neural/i }).click();

    await expect(previewRoot).toHaveAttribute('data-hero-variant', 'neural');
    await expect(
      previewShell.locator('[data-landing-3d-status]')
    ).toContainText(/neural lattice scene active/i);

    await controls.getByRole('button', { name: /surge/i }).click();
    await expect(previewRoot).toHaveAttribute('data-hero-speed', '1.35');

    await controls.getByRole('button', { name: /focused/i }).click();
    await expect(previewRoot).toHaveAttribute('data-hero-zoom', '0.38');

    await controls.getByRole('button', { name: /reset preview/i }).click();

    await expect(previewRoot).toHaveAttribute('data-hero-variant', 'nexus');
    await expect(previewRoot).toHaveAttribute('data-hero-speed', '1');
    await expect(previewRoot).toHaveAttribute('data-hero-zoom', '0');
  });

  test('should stack layout on mobile viewports', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });

    // Check if the grid columns are stacked
    // The grid is defined as: grid gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]
    // On mobile (default), it should be 1 column.

    // Compare the hero heading to the primary CTA to ensure stacking.
    const heroHeading = page.getByRole('heading', { level: 1 }).first();
    const primaryCta = page
      .getByRole('link', { name: /Explore services/i })
      .first();

    const heroBox = await heroHeading.boundingBox();
    const ctaBox = await primaryCta.boundingBox();

    if (heroBox && ctaBox) {
      // In a stacked layout, the hero section should be above the CTA row
      expect(heroBox.y + heroBox.height).toBeLessThanOrEqual(ctaBox.y + 240);

      // They should have similar widths (taking up full width)
      // expect(heroBox.width).toBeCloseTo(ctaBox.width, -1);
    }
  });
});
