import { expect, test } from '@playwright/test';

test.describe('Homepage buyer landing', () => {
  test('loads the current Chicago managed IT homepage', async ({ page }) => {
    await page.goto('./');

    await expect(page).toHaveTitle(/CHICAGOS #1 MSP/i);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /CHICAGOS #1 MSP for companies/i,
      })
    ).toBeAttached();
    await expect(
      page.locator('[data-testid="home-orbit-scene"]')
    ).toBeVisible();
  });

  test('exposes primary buyer next steps', async ({ page }) => {
    await page.goto('./');

    await expect(
      page.getByRole('link', { name: /View solutions/i })
    ).toHaveAttribute('href', /services\/$/);
    await expect(
      page.getByRole('link', { name: /See pricing/i })
    ).toHaveAttribute('href', /pricing\/$/);
    await expect(
      page.getByRole('link', { name: /Start fit check/i })
    ).toHaveAttribute('href', /contact-hq\/$/);
  });

  test('renders a nonblank 3D hero canvas', async ({ page }) => {
    await page.goto('./');

    const canvas = page.locator('[data-testid="home-orbit-scene"] canvas');
    await expect(canvas).toBeVisible();

    const litPixels = await canvas.evaluate((node: HTMLCanvasElement) => {
      const sample = document.createElement('canvas');
      sample.width = 40;
      sample.height = 40;
      const ctx = sample.getContext('2d', { willReadFrequently: true });
      if (!ctx) return 0;

      ctx.drawImage(node, 0, 0, sample.width, sample.height);
      const data = ctx.getImageData(0, 0, sample.width, sample.height).data;
      let count = 0;

      for (let index = 0; index < data.length; index += 4) {
        if (
          data[index + 3] > 4 &&
          data[index] + data[index + 1] + data[index + 2] > 24
        ) {
          count += 1;
        }
      }

      return count;
    });

    expect(litPixels).toBeGreaterThan(80);
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
