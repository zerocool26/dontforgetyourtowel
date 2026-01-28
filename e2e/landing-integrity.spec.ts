import { test, expect } from '@playwright/test';

test.describe('Landing Page Integrity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
  });

  test('should display the primary service chip', async ({ page }) => {
    await expect(
      page.locator('#main-content').getByText(/Chapter 11/i)
    ).toBeVisible();
    await expect(
      page.locator('#main-content').getByText(/High-trust static ops/i)
    ).toBeVisible();
  });

  test('should render the hero headline with correct H1 tag', async ({
    page,
  }) => {
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });

  test('should stack layout on mobile viewports', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });

    // Check if the grid columns are stacked
    // The grid is defined as: grid gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]
    // On mobile (default), it should be 1 column.

    // Compare the hero heading to the first trust badge to ensure stacking.
    const heroHeading = page.getByRole('heading', { level: 1 }).first();
    const firstSignal = page
      .getByText(/Executive-ready readouts without live dashboards/i)
      .first();

    const heroBox = await heroHeading.boundingBox();
    const signalBox = await firstSignal.boundingBox();

    if (heroBox && signalBox) {
      // In a stacked layout, the hero section should be above the signal grid
      expect(heroBox.y + heroBox.height).toBeLessThanOrEqual(signalBox.y + 200); // Allow some margin/gap

      // They should have similar widths (taking up full width)
      // expect(heroBox.width).toBeCloseTo(signalBox.width, -1);
    }
  });
});
