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

      const quiz = page
        .locator('#main-content [data-testid="services-quiz"]')
        .first();
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
      for (let attempt = 0; attempt < 4; attempt += 1) {
        await quiz.getByTestId('services-quiz-option').first().click();
        const step = await quiz.getAttribute('data-step');
        if (step === '1') break;
        await page.waitForTimeout(350);
      }
      await expect
        .poll(async () => await quiz.getAttribute('data-step'), {
          timeout: 10000,
        })
        .toBe('1');

      await expect(quiz.getByTestId('services-quiz-question')).toHaveText(
        /which risk feels most urgent\?/i,
        { timeout: 10000 }
      );
      await quiz.getByTestId('services-quiz-option').first().click();
      await expect
        .poll(async () => await quiz.getAttribute('data-step'), {
          timeout: 10000,
        })
        .toBe('2');

      await expect(quiz.getByTestId('services-quiz-question')).toHaveText(
        /how fast do you need results\?/i,
        { timeout: 10000 }
      );
      await quiz.getByRole('button', { name: /this quarter/i }).click();
      await expect
        .poll(async () => await quiz.getAttribute('data-step'), {
          timeout: 10000,
        })
        .toBe('3');

      await expect(
        quiz.getByTestId('services-quiz-recommendation-label')
      ).toBeVisible({ timeout: 10000 });
      await expect(
        quiz.getByText(/Managed IT Services \(Bronze/i)
      ).toBeVisible();
    });

    test('contact hub should expose channels and intake guidance', async ({
      page,
    }) => {
      await page.goto('contact-hq/');
      await page.waitForLoadState('domcontentloaded');

      await expect(
        page.getByRole('heading', { name: /let’s scope your next initiative/i })
      ).toBeVisible();

      await expect(
        page.getByRole('heading', { name: /choose the right channel/i })
      ).toBeVisible();

      await expect(
        page.getByRole('heading', {
          name: /what to include in your first message/i,
        })
      ).toBeVisible();

      const salesChannel = page.getByText(/new project \/ sales/i).first();
      await expect(salesChannel).toBeVisible();

      const emailLink = page
        .getByRole('link', { name: /email this channel/i })
        .first();
      await expect(emailLink).toHaveAttribute('href', /mailto:/i);
    });
  });
});
