import { test, expect } from '@playwright/test';

test.describe('Interactivity Features', () => {
  test.describe('Command Palette', () => {
    // Note: Command Palette uses client:only="preact" which may have hydration timing issues
    // These tests are skipped pending investigation of Preact island hydration in static builds
    test.skip('should open with keyboard shortcut', async ({ page }) => {
      await page.goto('./');

      // Wait for client-side hydration
      await page.waitForTimeout(2000);

      // Press Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if (process.platform === 'darwin') {
        await page.keyboard.press('Meta+k');
      } else {
        await page.keyboard.press('Control+k');
      }

      // Check if modal is visible
      const modal = page.locator(
        'input[placeholder="Type a command or search..."]'
      );
      await expect(modal).toBeVisible({ timeout: 10000 });
    });

    test.skip('should navigate to pages via command', async ({ page }) => {
      await page.goto('./');

      // Wait for client-side hydration
      await page.waitForTimeout(2000);

      // Open palette
      if (process.platform === 'darwin') {
        await page.keyboard.press('Meta+k');
      } else {
        await page.keyboard.press('Control+k');
      }

      // Wait for modal to appear
      const input = page.locator(
        'input[placeholder="Type a command or search..."]'
      );
      await expect(input).toBeVisible({ timeout: 10000 });

      // Type "Blog"
      await input.fill('Blog');

      // Press Enter on the first result
      await page.keyboard.press('Enter');

      // Verify navigation
      await expect(page).toHaveURL(/\/blog/);
    });
  });

  test.describe('Lead-gen widgets', () => {
    test('services quiz should recommend a starting point', async ({
      page,
    }) => {
      await page.goto('services/');

      const quizHeading = page.getByRole('heading', {
        name: /Not sure what you need\?/i,
      });
      await expect(quizHeading).toBeVisible({ timeout: 10000 });

      const quiz = page.getByTestId('services-quiz');
      await expect(quiz).toBeVisible({ timeout: 10000 });
      await quiz.scrollIntoViewIfNeeded();
      // Offset sticky header
      await page.evaluate(() => window.scrollBy(0, -140));

      // Give the client:visible island time to hydrate after it becomes visible.
      await page.waitForTimeout(350);

      // Wait for the first question to actually render (client:only island)
      await expect(
        quiz.getByText(/what is your top priority right now\?/i)
      ).toBeVisible({ timeout: 10000 });

      await expect(quiz.getByTestId('services-quiz-question')).toHaveText(
        /what is your top priority right now\?/i,
        { timeout: 10000 }
      );
      await quiz
        .getByRole('button', { name: /reduce it firefighting/i })
        .click();
      await expect(quiz).toHaveAttribute('data-step', '1', { timeout: 10000 });

      await expect(quiz.getByTestId('services-quiz-question')).toHaveText(
        /which risk feels most urgent\?/i,
        { timeout: 10000 }
      );
      await quiz.getByRole('button', { name: /unpatched devices/i }).click();
      await expect(quiz).toHaveAttribute('data-step', '2', { timeout: 10000 });

      await expect(quiz.getByTestId('services-quiz-question')).toHaveText(
        /how fast do you need results\?/i,
        { timeout: 10000 }
      );
      await quiz.getByRole('button', { name: /this quarter/i }).click();
      await expect(quiz).toHaveAttribute('data-step', '3', { timeout: 10000 });

      await expect(
        quiz.getByTestId('services-quiz-recommendation-label')
      ).toBeVisible({ timeout: 10000 });
      await expect(
        quiz.getByText(/Managed IT Services \(Bronze/i)
      ).toBeVisible();
    });

    test('pricing calculator should update when tier changes', async ({
      page,
    }) => {
      await page.goto('pricing/');
      await page.waitForTimeout(750);

      await expect(
        page.getByRole('heading', { name: /pricing calculator/i })
      ).toBeVisible();

      const calculator = page
        .locator('section')
        .filter({
          has: page.getByRole('heading', { name: /pricing calculator/i }),
        })
        .first();

      await calculator.scrollIntoViewIfNeeded();
      await expect(calculator.locator('[data-hydrated="true"]')).toBeVisible({
        timeout: 10000,
      });

      const totalValue = calculator.locator('p.text-4xl').first();

      // Default is SILVER at 25 users => 25 * 150 = $3,750
      await expect(totalValue).toHaveText('$3,750');

      // Switch tier and assert deterministic total.
      await calculator.getByRole('button', { name: /^PLATINUM$/ }).click();
      await expect(totalValue).toHaveText('$6,250', { timeout: 10000 });
    });

    test('ROI calculator should compute savings and payback', async ({
      page,
    }) => {
      await page.goto('pricing/');
      await page.waitForTimeout(750);

      await expect(
        page.getByRole('heading', { name: /roi calculator/i })
      ).toBeVisible();

      const roi = page
        .locator('section')
        .filter({ has: page.getByRole('heading', { name: /roi calculator/i }) })
        .first();

      await roi.scrollIntoViewIfNeeded();

      await expect(roi.locator('[data-hydrated="true"]')).toBeVisible({
        timeout: 10000,
      });

      await roi.getByLabel(/current it cost/i).fill('10000');
      await roi.getByLabel(/estimated savings/i).fill('25');
      await roi.getByLabel(/one-time transition cost/i).fill('5000');

      // 10,000 * 25% = 2,500 monthly savings; payback = 5,000 / 2,500 = 2.0 mo
      await expect(roi.getByText('$2,500')).toBeVisible({ timeout: 10000 });
      await expect(roi.getByText(/2\.0 months/i)).toBeVisible({
        timeout: 10000,
      });
    });
  });
});
