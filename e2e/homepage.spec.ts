import { expect, test } from '@playwright/test';

test.describe('Homepage buyer landing', () => {
  test('loads the current Chicago managed IT homepage', async ({ page }) => {
    await page.goto('./');

    await expect(page).toHaveTitle(/Olive Global Systems/i);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Support that answers/i,
      })
    ).toBeVisible();
    await expect(
      page.getByText(/Chicago managed IT and cybersecurity/i)
    ).toBeVisible();
    await expect(page.getByText(/Built for Chicago uptime/i)).toBeVisible();
  });

  test('exposes primary buyer next steps', async ({ page }) => {
    await page.goto('./');

    await expect(
      page.getByRole('link', { name: /Start strategy intake/i })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Explore services/i })
    ).toHaveAttribute('href', /services\/$/);

    await expect(
      page.getByRole('link', { name: /View solutions/i })
    ).toHaveAttribute('href', /services\/$/);
    await expect(
      page.getByRole('link', { name: /See pricing/i })
    ).toHaveAttribute('href', /pricing\/$/);
    await expect(
      page.getByRole('link', { name: /Open roadmap/i })
    ).toHaveAttribute('href', /build-studio\/$/);
  });

  test('presents service lanes and operating standard', async ({ page }) => {
    await page.goto('./');

    await expect(page.locator('#services')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Four lanes/i })
    ).toBeVisible();

    for (const label of ['Operate', 'Protect', 'Modernize', 'Present']) {
      await expect(
        page.locator('.home-homepage-lane__label', { hasText: label })
      ).toHaveCount(1);
    }

    await expect(page.locator('#operating-standard')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /first phase/i })
    ).toBeVisible();
    await expect(page.getByText(/First 30 days/i)).toBeVisible();
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
