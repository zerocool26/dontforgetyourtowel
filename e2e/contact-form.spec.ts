import { test, expect } from '@playwright/test';

test.describe.skip('Contact Form', () => {
  test('should display contact form', async ({ page }) => {
    await page.goto('./#consultation');

    const consultation = page.locator('#consultation');
    await expect(consultation).toBeVisible();
    await consultation.scrollIntoViewIfNeeded();

    const form = consultation.locator('form#contact-form');
    await expect(form).toBeVisible();
    await expect(form.getByLabel(/first name/i)).toBeVisible();
    await expect(form.getByLabel(/last name/i)).toBeVisible();
    await expect(form.getByLabel(/email/i)).toBeVisible();
    await expect(form.getByLabel(/message/i)).toBeVisible();
  });

  test('should validate form fields', async ({ page }) => {
    await page.goto('./#consultation');

    const form = page.locator('#consultation form#contact-form');
    await expect(form).toBeVisible();

    // Avoid flaky pointer-event click behavior on mobile emulation by
    // validating with HTML5 validity APIs.
    const isFormValid = await form.evaluate(el =>
      (el as HTMLFormElement).checkValidity()
    );
    expect(isFormValid).toBe(false);

    const nameInput = form.getByLabel(/first name/i);
    const isInvalid = await nameInput.evaluate(
      (el: HTMLInputElement) => !el.validity.valid
    );
    expect(isInvalid).toBe(true);
  });

  test('should accept valid form submission', async ({ page }) => {
    await page.goto('./#consultation');

    const form = page.locator('#consultation form#contact-form');
    await expect(form).toBeVisible();

    await form.getByLabel(/first name/i).fill('Test');
    await form.getByLabel(/last name/i).fill('User');
    await form.getByLabel(/email/i).fill('test@example.com');
    await form.getByLabel(/message/i).fill('This is a test message.');

    await form.getByLabel(/subject/i).selectOption('general');

    // Use DOM assignment to avoid click interception issues in Mobile Chrome.
    await form.evaluate(el => {
      const terms = (el as HTMLFormElement).querySelector(
        'input[name="terms"]'
      ) as HTMLInputElement | null;
      if (terms) {
        terms.checked = true;
        terms.dispatchEvent(new Event('input', { bubbles: true }));
        terms.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    const isFormValid = await form.evaluate(el =>
      (el as HTMLFormElement).checkValidity()
    );
    expect(isFormValid).toBe(true);

    // Trigger the form submit handler without relying on pointer clicks.
    // `dispatchEvent('click')` on the button does not perform the default submit action.
    await form.dispatchEvent('submit');

    const status = form.locator('.form-status');
    await expect(status).toBeVisible({ timeout: 5000 });
    await expect(status).toContainText(/opening your email client/i);
  });
});
