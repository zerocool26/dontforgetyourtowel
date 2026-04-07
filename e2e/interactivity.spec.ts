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

    test.skip('should navigate to services via command', async ({ page }) => {
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

      // Type "Services"
      await input.fill('Services');

      // Press Enter on the first result
      await page.keyboard.press('Enter');

      // Verify navigation
      await expect(page).toHaveURL(/\/services/);
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

  test.describe('Gallery wall', () => {
    test('should persist curatorial state in the URL and across reloads', async ({
      page,
    }) => {
      await page.goto('gallery/');
      await page.waitForLoadState('domcontentloaded');

      const salonButton = page.getByRole('button', { name: /^salon$/i });
      const categoryButton = page
        .locator('[data-gallery-filter]')
        .filter({ hasText: /material/i })
        .first();

      await salonButton.click();
      await categoryButton.click();

      await expect(page).toHaveURL(
        /gallery\/\?discipline=.*&galleryView=salon|gallery\/\?galleryView=salon&discipline=.*/
      );
      await expect(page.locator('[data-gallery-active-state]')).toContainText(
        /salon view/i
      );
      await expect(
        page.locator('[data-gallery-active-state]')
      ).not.toContainText(/all disciplines/i);

      await page.reload();
      await page.waitForLoadState('domcontentloaded');

      await expect(
        page.getByRole('button', { name: /^salon$/i })
      ).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('[data-gallery-active-state]')).toContainText(
        /salon view/i
      );
    });
  });

  test.describe('Trade execution boards', () => {
    test('should switch the focused execution lane on trade routes', async ({
      page,
    }) => {
      await page.goto('trades/mechanical/retrofit-delivery/');
      await page.waitForLoadState('domcontentloaded');

      const phaseStudio = page.locator('[data-phase-studio]').last();
      await expect(phaseStudio).toBeVisible();

      await expect(
        phaseStudio.locator('[data-phase-studio-status-title]')
      ).toContainText(/required inputs/i);

      await phaseStudio
        .getByRole('button', { name: /field checklist/i })
        .click();

      await expect(
        phaseStudio.locator('[data-phase-studio-status-title]')
      ).toContainText(/field checklist/i);
      await expect(
        phaseStudio.locator(
          '[data-phase-studio-card][data-phase-key="field-checklist"]'
        )
      ).toHaveAttribute('data-state', 'active');
    });
  });

  test.describe('Editorial signal cabinet', () => {
    test('should switch the highlighted trade signal on the landing page', async ({
      page,
    }) => {
      await page.goto('./');
      await page.waitForLoadState('domcontentloaded');

      const cabinet = page.locator('[data-signal-cabinet]').first();
      await expect(cabinet).toBeVisible();

      await expect(
        cabinet.locator('[data-signal-cabinet-title]')
      ).toContainText(/mechanical/i);

      await cabinet.getByRole('button', { name: /electrical/i }).click();

      await expect(
        cabinet.locator('[data-signal-cabinet-title]')
      ).toContainText(/electrical/i);
      await expect(
        cabinet.getByRole('button', { name: /electrical/i })
      ).toHaveAttribute('aria-pressed', 'true');
    });
  });

  test.describe('Trade coordination matrix', () => {
    test('should switch active trade details in the directory matrix', async ({
      page,
    }) => {
      await page.goto('trades/');
      await page.waitForLoadState('domcontentloaded');

      const matrix = page.locator('[data-trade-matrix]').first();
      await expect(matrix).toBeVisible();

      await expect(matrix.locator('[data-trade-matrix-name]')).toContainText(
        /mechanical/i
      );

      await matrix.getByRole('button', { name: /electrical/i }).click();

      await expect(matrix.locator('[data-trade-matrix-name]')).toContainText(
        /electrical/i
      );
      await expect(
        matrix.locator('[data-trade-matrix-operating-model]')
      ).toContainText(/power distribution/i);
      await expect(
        matrix.getByRole('button', { name: /electrical/i })
      ).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
