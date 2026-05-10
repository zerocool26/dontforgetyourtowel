import { expect, test } from '@playwright/test';

test.describe('WebGL diagnostics', () => {
  test('renders a completed diagnostics report with support actions', async ({
    page,
  }) => {
    await page.goto('./debug-webgl/');

    await expect(
      page.getByRole('heading', { name: /webgl diagnostics/i })
    ).toBeVisible();
    await expect(page.getByText('Running probes')).toHaveCount(0);

    const report = page.locator('#debug-webgl-root');
    await expect(report.getByText('Probe report')).toBeVisible();
    await expect(
      report.getByRole('button', { name: 'Copy JSON' })
    ).toBeVisible();
    await expect(
      report.getByRole('button', { name: 'Reset offline cache' })
    ).toBeVisible();
    await expect(
      report.getByRole('link', { name: 'Open services' })
    ).toHaveAttribute('href', /\/services\/$/);

    const json = report.locator('pre');
    await expect(json).toContainText('"safeRenderer"');
    await expect(json).toContainText('"contexts"');
    await expect(json).toContainText('"assetChecks"');
  });
});
