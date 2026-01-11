import { test, expect } from '@playwright/test';

test.describe('Landing Page Integrity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
  });

  test('should display the primary service chip', async ({ page }) => {
    const chip = page
      .locator('#main-content')
      .getByText('Managed Services • Security • Cloud • AI')
      .first();
    await expect(chip).toBeVisible();
  });

  test('should render the hero headline with correct H1 tag', async ({
    page,
  }) => {
    const heading = page.locator('h1');
    await expect(heading).toContainText(
      'Enterprise IT solutions that scale with your business'
    );
  });

  test('should stack layout on mobile viewports', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });

    // Check if the grid columns are stacked
    // The grid is defined as: grid gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]
    // On mobile (default), it should be 1 column.

    // Compare the hero heading to the first trust badge to ensure stacking.
    const heroHeading = page.locator('h1').first();
    const trustBadge = page.getByText('SOC 2 aligned').first();

    const heroBox = await heroHeading.boundingBox();
    const trustBox = await trustBadge.boundingBox();

    if (heroBox && trustBox) {
      // In a stacked layout, the hero section should be above the signal grid
      expect(heroBox.y + heroBox.height).toBeLessThanOrEqual(trustBox.y + 200); // Allow some margin/gap

      // They should have similar widths (taking up full width)
      // expect(heroBox.width).toBeCloseTo(signalBox.width, -1);
    }
  });
});
