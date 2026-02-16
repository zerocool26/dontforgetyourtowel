import { test, expect } from '@playwright/test';

test.describe.skip('Search Functionality (decommissioned)', () => {
  // Search UI was tied to the legacy blog experience.
  // The MSP marketing site focuses on Services/Contact/Portfolio + consultation CTA.
  test('should display search component on blog page', async ({ page }) => {
    await page.goto('/blog/');

    const searchInput = page.locator('#search-input');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', /search/i);
  });

  test('should search and display results', async ({ page }) => {
    await page.goto('/blog/');

    const searchInput = page.locator('#search-input');
    await searchInput.fill('markdown');

    // Wait for results
    await page.waitForTimeout(300);

    const results = page.locator('#search-results');
    await expect(results).toBeVisible();

    // Check results contain search term
    const resultItems = page.locator('#results-list a');
    const count = await resultItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should handle keyboard shortcuts', async ({ page }) => {
    await page.goto('/blog/');

    // Press Cmd+K (or Ctrl+K)
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+K' : 'Control+K'
    );

    // Search input should be focused
    const searchInput = page.locator('#search-input');
    await expect(searchInput).toBeFocused();
  });

  test('should navigate with arrow keys', async ({ page }) => {
    await page.goto('/blog/');

    const searchInput = page.locator('#search-input');
    await searchInput.fill('post');
    await page.waitForTimeout(300);

    // Press arrow down
    await searchInput.press('ArrowDown');

    // First result should be highlighted
    const firstResult = page.locator('#results-list a').first();
    await expect(firstResult).toHaveClass(/bg-slate-700/);
  });
});
