import { test, expect } from '@playwright/test';

test.describe('Demo Lab', () => {
  test('should load and render heading', async ({ page }) => {
    await page.goto('./about/');

    await expect(page.locator('#main-content')).toBeVisible();
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /full demo e-commerce setup/i,
      })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /safety console/i })
    ).toBeVisible();
  });

  test('safety console toggles should update DOM attributes', async ({
    page,
  }) => {
    await page.goto('./about/');

    const html = page.locator('html');
    const status = page.getByTestId('demo-safety-status');

    await expect(status).toContainText('pause off');
    await expect(status).toContainText('reduced motion off');
    await expect(status).toContainText('perf mode off');

    await page.locator('button[data-demo-toggle="paused"]').click();
    await expect(html).toHaveAttribute('data-demo-paused', 'true');
    await expect(status).toContainText('pause on');

    await page.locator('button[data-demo-toggle="reduced"]').click();
    await expect(html).toHaveAttribute('data-demo-reduced-motion', 'true');
    await expect(status).toContainText('reduced motion on');

    const perfToggle = page.locator('button[data-demo-toggle="perf"]');
    await perfToggle.click();
    await expect(html).toHaveAttribute('data-demo-perf', 'true');
    await expect(status).toContainText('perf mode on');

    await perfToggle.click();
    await expect(html).toHaveAttribute('data-demo-perf', 'false');
    await expect(status).toContainText('perf mode off');
  });

  test('URL presets should open the intended showcase flow', async ({
    page,
  }) => {
    await page.goto('./about/?demo=cart#shop-experience');

    await expect(page.locator('[data-demo-active-state]')).toContainText(
      /cart review active/i
    );
    await expect(page.locator('[data-ecom="cart"]')).toBeVisible();

    await page.goto('./about/?demo=compare#shop-experience');

    await expect(page.locator('[data-demo-active-state]')).toContainText(
      /compare review active/i
    );
    await expect(page.locator('[data-ecom="compare"]')).toBeVisible();

    await page.goto(
      './about/?demo=checkout&product=aurora-hoodie#shop-experience'
    );

    await expect(page.locator('[data-demo-active-state]')).toContainText(
      /checkout review active/i
    );
    await expect(page.locator('[data-ecom="cart"]')).toBeVisible();
    await expect(page.getByText(/shipping details \(demo\)/i)).toBeVisible();
  });

  test('quick launch buttons should update the URL-backed review state', async ({
    page,
  }) => {
    await page.goto('./about/');

    await page.getByRole('button', { name: /jump to checkout/i }).click();

    await expect(page).toHaveURL(
      /about\/\?demo=checkout&product=aurora-hoodie#shop-experience/
    );
    await expect(page.locator('[data-demo-active-state]')).toContainText(
      /checkout review active/i
    );
    await expect(page.locator('[data-ecom="cart"]')).toBeVisible();

    await page.getByRole('button', { name: /reset launch state/i }).click();

    await expect(page).not.toHaveURL(/demo=checkout/);
    await expect(page.locator('[data-demo-active-state]')).toContainText(
      /default showcase loaded/i
    );
  });
});
