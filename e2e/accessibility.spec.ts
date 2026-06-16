import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('homepage should not have any automatically detectable accessibility issues', async ({
    page,
  }) => {
    await page.goto('./');
    await page.waitForLoadState('domcontentloaded');
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /When IT feels ownerless, the business slows down/i,
      })
    ).toBeAttached();
    await expect(
      page.locator('[data-testid="home-orbit-scene"]')
    ).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('services page should be accessible', async ({ page }) => {
    await page.goto('services/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('contact hub page should be accessible', async ({ page }) => {
    await page.goto('contact-hq/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('primary homepage service section should be accessible', async ({
    page,
  }) => {
    await page.goto('./');
    await page.waitForLoadState('domcontentloaded');
    await expect(
      page.getByRole('heading', {
        name: /Four clear service lanes/i,
      })
    ).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
