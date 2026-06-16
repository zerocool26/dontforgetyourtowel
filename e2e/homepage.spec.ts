import { expect, test } from '@playwright/test';

test.describe('Homepage buyer landing', () => {
  test('loads the current Chicago managed IT homepage', async ({ page }) => {
    await page.goto('./');

    await expect(page).toHaveTitle(/CHICAGOS #1 MSP/i);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /When IT feels ownerless, the business slows down/i,
      })
    ).toBeAttached();
    await expect(
      page.locator('[data-testid="home-orbit-scene"]')
    ).toBeVisible();
  });

  test('exposes primary buyer next steps', async ({ page }) => {
    await page.goto('./');

    await expect(
      page.getByRole('link', { name: /Start fit check/i }).first()
    ).toHaveAttribute('href', /contact-hq\/$/);
    await expect(
      page.getByRole('link', { name: /See pricing logic/i })
    ).toHaveAttribute('href', /pricing\/$/);
    await expect(
      page.getByRole('link', { name: /What we own/i }).first()
    ).toHaveAttribute('href', /services\/$/);
  });

  test('renders the operating proof board in the hero', async ({ page }) => {
    await page.goto('./');

    const board = page.locator('[data-testid="home-orbit-scene"]');
    await expect(board).toBeVisible();
    await expect(board).toContainText(/Operating proof/i);
    await expect(board).toContainText(/Ticket has owner/i);
    await expect(board).toContainText(/Needs review/i);
  });

  test('presents service lanes and operating standard', async ({ page }) => {
    await page.goto('./');

    await expect(page.locator('#services')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Four clear service lanes/i })
    ).toBeVisible();

    for (const label of [
      'Support',
      'Security',
      'Microsoft 365',
      'Continuity',
    ]) {
      await expect(
        page.locator('.home-homepage-lane__label', { hasText: label })
      ).toHaveCount(1);
    }

    await expect(page.locator('#operating-standard')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /first phase should calm/i })
    ).toBeVisible();
    await expect(page.locator('.home-homepage-first30 li')).toHaveCount(3);
  });

  test('keeps the homepage usable without horizontal overflow', async ({
    page,
  }) => {
    await page.goto('./');

    const overflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth - root.clientWidth;
    });

    expect(overflow).toBeLessThanOrEqual(1);
  });
});
