import { test, expect } from '@playwright/test';

test.describe.skip('Blog Section (decommissioned)', () => {
  // This project has been repurposed into an MSP marketing site.
  // Legacy blog routes are intentionally disabled/redirected.
  test('should load blog index successfully', async ({ page }) => {
    await page.goto('/blog');
    await expect(page).toHaveTitle(/Blog/i);
    await expect(page.locator('h1')).toContainText('Our Blog');
  });

  test('should display blog posts', async ({ page }) => {
    await page.goto('/blog');

    // Check if posts are displayed
    const posts = page
      .locator('.glass-card, .card, article, .glass-panel')
      .filter({ hasText: 'Read Article' });
    // We expect some posts to be visible
    await expect(posts.first()).toBeVisible();

    // Check for "Read Article" buttons
    const readButtons = page.getByRole('link', { name: /Read Article/i });
    await expect(readButtons.first()).toBeVisible();
  });

  test('should navigate to a blog post', async ({ page }) => {
    await page.goto('/blog');

    // Click the first read article button
    await page
      .getByRole('link', { name: /Read Article/i })
      .first()
      .click();

    // Should navigate to a blog post
    await expect(page).toHaveURL(/\/blog\/.+/);
    // Blog posts usually have a title in h1
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should have correct metadata', async ({ page }) => {
    await page.goto('/blog');

    // Check canonical URL
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute('href', /.*\/blog\/?$/);
  });
});
