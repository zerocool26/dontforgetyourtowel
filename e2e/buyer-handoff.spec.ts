import { expect, test } from '@playwright/test';

const handoffRoutes = [
  { path: './', activeLane: 'support-ownership' },
  { path: './services/', activeLane: 'support-ownership' },
  { path: './pricing/', activeLane: 'budget-scope' },
  { path: './contact-hq/', activeLane: 'budget-scope' },
];

test.describe('Buyer decision handoff', () => {
  for (const route of handoffRoutes) {
    test(`renders the handoff model on ${route.path}`, async ({ page }) => {
      await page.goto(route.path);

      const handoff = page.locator('[data-decision-handoff]').first();
      await expect(handoff).toBeVisible();

      await expect(handoff.locator('[data-handoff-lane]')).toHaveCount(4);
      await expect(
        handoff.locator(`[data-handoff-lane="${route.activeLane}"]`)
      ).toHaveClass(/is-active/);

      await expect(
        handoff.getByText(/Evidence to bring/i).first()
      ).toBeVisible();
      await expect(
        handoff.getByText(/First useful output/i).first()
      ).toBeVisible();
    });
  }

  test('keeps handoff route links base-path safe and buyer-oriented', async ({
    page,
  }) => {
    await page.goto('./services/');

    const handoff = page.locator('[data-decision-handoff]').first();
    await expect(
      handoff.getByRole('link', { name: /Open support track/i })
    ).toHaveAttribute('href', /services\/#service-tracks$/);
    await expect(
      handoff.getByRole('link', { name: /Compare pricing logic/i })
    ).toHaveAttribute('href', /pricing\/#plans$/);
    await expect(
      handoff.getByRole('link', { name: /Open workflow planning/i })
    ).toHaveAttribute('href', /services\/#service-planner$/);
  });
});
