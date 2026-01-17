/**
 * Enhanced Contact Form Script
 * Uses our utility library for validation, accessibility, and notifications
 */

import { announce, setAriaAttributes } from '../utils/a11y';
import { CONTACT_EMAIL } from '../consts';
import { emailSchema, phoneSchema } from '../utils/validation';
import { addNotification, notify } from '../store/index';

type VisualViewportLike = {
  height: number;
  offsetTop?: number;
  addEventListener: (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions | boolean
  ) => void;
  removeEventListener?: (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: EventListenerOptions | boolean
  ) => void;
};

let activeKeyboardAwareForm: HTMLFormElement | null = null;
let keyboardListenersInstalled = false;

function isCoarsePointer(): boolean {
  try {
    return !!window.matchMedia?.('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

function prefersReducedMotion(): boolean {
  try {
    return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function computeKeyboardOffsetPx(
  innerHeight: number,
  visualViewport: Pick<VisualViewportLike, 'height' | 'offsetTop'> | null
): number {
  if (!visualViewport) return 0;
  const offsetTop = visualViewport.offsetTop ?? 0;
  // When the on-screen keyboard opens, visualViewport.height shrinks.
  const raw = innerHeight - visualViewport.height - offsetTop;
  return Math.max(0, Math.round(raw));
}

function setKeyboardOffsetOnForm(
  form: HTMLFormElement,
  offsetPx: number
): void {
  form.style.setProperty('--keyboard-offset', `${offsetPx}px`);
}

function ensureFieldVisible(field: HTMLElement): void {
  // Avoid surprising scroll behavior on non-touch setups.
  if (!isCoarsePointer()) return;

  const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';
  try {
    field.scrollIntoView({ block: 'center', inline: 'nearest', behavior });
  } catch {
    // Older browsers may throw if options object is not supported.
    try {
      field.scrollIntoView();
    } catch {
      // ignore
    }
  }
}

function installKeyboardAwarenessListeners(): void {
  if (keyboardListenersInstalled) return;
  keyboardListenersInstalled = true;

  if (!isCoarsePointer()) return;

  const vv = (window as unknown as { visualViewport?: VisualViewportLike })
    .visualViewport;
  if (!vv?.addEventListener) return;

  const update = () => {
    const form = activeKeyboardAwareForm;
    if (!form || !form.isConnected) return;
    const offsetPx = computeKeyboardOffsetPx(window.innerHeight, vv);
    setKeyboardOffsetOnForm(form, offsetPx);
  };

  vv.addEventListener('resize', update, { passive: true });
  vv.addEventListener('scroll', update, { passive: true });
  window.addEventListener('orientationchange', update, { passive: true });

  document.addEventListener(
    'focusin',
    event => {
      const target = event.target as HTMLElement | null;
      const form = activeKeyboardAwareForm;
      if (!target || !form || !form.isConnected) return;
      if (!form.contains(target)) return;

      // Only for actual form controls.
      if (
        !(
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement
        )
      ) {
        return;
      }

      // Let the viewport settle (keyboard animation) before scrolling.
      setTimeout(() => {
        update();
        ensureFieldVisible(target);
      }, 60);
    },
    { capture: true }
  );

  // Initial value
  update();
}

interface FormFieldConfig {
  name: string;
  required?: boolean;
  type?: 'text' | 'email' | 'tel' | 'checkbox';
  validate?: (value: string) => { valid: boolean; message?: string };
}

const fieldConfigs: FormFieldConfig[] = [
  {
    name: 'firstName',
    required: true,
    validate: value => ({
      valid: value.length >= 2,
      message: 'First name must be at least 2 characters',
    }),
  },
  {
    name: 'lastName',
    required: true,
    validate: value => ({
      valid: value.length >= 2,
      message: 'Last name must be at least 2 characters',
    }),
  },
  {
    name: 'email',
    required: true,
    type: 'email',
    validate: value => ({
      valid: emailSchema.safeParse(value).success,
      message: 'Please enter a valid email address',
    }),
  },
  { name: 'company', required: false },
  {
    name: 'phone',
    required: false,
    type: 'tel',
    validate: value => {
      if (!value) return { valid: true };
      return {
        valid: phoneSchema.safeParse(value).success,
        message: 'Please enter a valid phone number',
      };
    },
  },
  { name: 'subject', required: true },
  { name: 'budget', required: false },
  { name: 'timeline', required: false },
  {
    name: 'message',
    required: true,
    validate: value => ({
      valid: value.length >= 10,
      message: 'Message must be at least 10 characters',
    }),
  },
  {
    name: 'terms',
    required: true,
    type: 'checkbox',
    validate: () => ({
      valid: true,
      message: 'You must agree to the terms and conditions',
    }),
  },
];

class EnhancedContactForm {
  private form: HTMLFormElement | null;
  private submitButton: HTMLButtonElement | null;
  private statusDiv: HTMLDivElement | null;
  private errors: Map<string, string> = new Map();

  constructor() {
    this.form = document.getElementById(
      'contact-form'
    ) as HTMLFormElement | null;
    this.submitButton = this.form?.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement | null;
    this.statusDiv = this.form?.querySelector(
      '.form-status'
    ) as HTMLDivElement | null;

    if (this.form) {
      this.init();
    }
  }

  private init(): void {
    if (!this.form) return;

    // Make this form the current target for mobile keyboard handling.
    // (Astro view transitions can recreate the form; we keep a single listener.)
    if (this.form.hasAttribute('data-keyboard-aware')) {
      activeKeyboardAwareForm = this.form;
      installKeyboardAwarenessListeners();
    }

    // Set up ARIA attributes for better accessibility
    this.setupAccessibility();

    // Event listeners
    this.form.addEventListener('submit', this.handleSubmit.bind(this));
    this.form.addEventListener('input', this.handleInput.bind(this));
    this.form.addEventListener('blur', this.handleBlur.bind(this), true);
    this.form.addEventListener('focus', this.handleFocus.bind(this), true);

    // Announce form is ready for screen readers
    announce('Contact form is ready', 'polite');
  }

  private setupAccessibility(): void {
    if (!this.form) return;

    // Set form-level ARIA attributes
    setAriaAttributes(this.form, {
      label: 'Contact form',
    });

    // Mark required fields
    fieldConfigs.forEach(config => {
      if (config.required) {
        const field = this.form!.querySelector(`[name="${config.name}"]`);
        if (field) {
          setAriaAttributes(field as HTMLElement, {
            required: true,
          });
        }
      }
    });
  }

  private async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();

    if (!this.validateForm()) {
      // Announce validation errors to screen readers
      const errorCount = this.errors.size;
      announce(
        `Form has ${errorCount} error${errorCount === 1 ? '' : 's'}. Please correct them before submitting.`,
        'assertive'
      );

      // Focus first error field
      const firstErrorField = this.form?.querySelector('.error') as HTMLElement;
      firstErrorField?.focus();

      return;
    }

    this.setLoading(true);
    announce('Submitting form...', 'polite');

    try {
      const formData = new FormData(this.form!);

      // Build contact info
      const name = `${formData.get('firstName')} ${formData.get('lastName')}`;
      const email = formData.get('email') as string;
      const subject =
        (formData.get('subject') as string) || 'Contact Form Submission';
      const message = formData.get('message') as string;
      const company = formData.get('company') as string;
      const phone = formData.get('phone') as string;
      const budget = formData.get('budget') as string;
      const timeline = formData.get('timeline') as string;

      const body = `Name: ${name}
Email: ${email}
${company ? `Company: ${company}\n` : ''}${phone ? `Phone: ${phone}\n` : ''}${budget ? `Budget: ${budget}\n` : ''}${timeline ? `Timeline: ${timeline}\n` : ''}
Subject: ${subject}

Message:
${message}`;

      const mailtoLink = `mailto:${encodeURIComponent(CONTACT_EMAIL)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      // Open mailto
      const mailtoAnchor = document.createElement('a');
      mailtoAnchor.href = mailtoLink;
      mailtoAnchor.rel = 'noreferrer';
      mailtoAnchor.style.display = 'none';
      document.body.appendChild(mailtoAnchor);
      mailtoAnchor.click();
      mailtoAnchor.remove();

      // Show success notification using our store
      notify.success('Opening your email client...');
      addNotification({
        type: 'info',
        title: 'Email Client',
        message: `If nothing happens, please email us directly at ${CONTACT_EMAIL}`,
        duration: 8000,
      });

      this.showStatus(
        'info',
        `Opening your email client... If nothing happens, please email us directly at ${CONTACT_EMAIL}`
      );

      // Announce success
      announce('Form submitted successfully. Opening email client.', 'polite');

      // Reset form after short delay
      setTimeout(() => {
        this.form?.reset();
        this.errors.clear();
        announce('Form has been reset', 'polite');
      }, 2000);
    } catch {
      notify.error('Unable to open email client');
      this.showStatus(
        'error',
        `Unable to open email client. Please email us directly at ${CONTACT_EMAIL}`
      );
      announce('Error submitting form. Please try again.', 'assertive');
    } finally {
      this.setLoading(false);
    }
  }

  private handleInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const fieldName = target.name;

    if (this.isFormField(target)) {
      this.clearError(target);

      // Real-time validation feedback
      const config = fieldConfigs.find(c => c.name === fieldName);
      if (config?.validate) {
        const value =
          target.type === 'checkbox'
            ? String(target.checked)
            : target.value.trim();
        const result = config.validate(value);

        // Update aria-invalid
        setAriaAttributes(target, {
          invalid: !result.valid,
        });
      }
    }
  }

  private handleBlur(event: Event): void {
    const target = event.target as HTMLInputElement;

    if (this.isFormField(target)) {
      this.validateField(target);
    }
  }

  private handleFocus(event: Event): void {
    const target = event.target as HTMLInputElement;
    const fieldName = target.name;

    // Announce field instructions
    const config = fieldConfigs.find(c => c.name === fieldName);
    if (config?.required) {
      announce(`${fieldName} is required`, 'polite');
    }
  }

  private isFormField(element: HTMLElement): boolean {
    return (
      element.classList.contains('form-input') ||
      element.classList.contains('form-textarea') ||
      element.classList.contains('form-select') ||
      element.classList.contains('form-checkbox')
    );
  }

  private validateForm(): boolean {
    this.errors.clear();
    let isValid = true;

    fieldConfigs.forEach(config => {
      const field = this.form?.querySelector(
        `[name="${config.name}"]`
      ) as HTMLInputElement;
      if (field && !this.validateField(field)) {
        isValid = false;
      }
    });

    return isValid;
  }

  private validateField(field: HTMLInputElement): boolean {
    const fieldName = field.name;
    const config = fieldConfigs.find(c => c.name === fieldName);

    if (!config) return true;

    const value = field.type === 'checkbox' ? '' : field.value.trim();
    let isValid = true;
    let errorMessage = '';

    // Required field validation
    if (config.required) {
      if (field.type === 'checkbox') {
        if (!field.checked) {
          isValid = false;
          errorMessage =
            config.validate?.('false').message || 'This field is required';
        }
      } else if (!value) {
        isValid = false;
        errorMessage = 'This field is required';
      }
    }

    // Custom validation
    if (isValid && value && config.validate) {
      const result = config.validate(value);
      if (!result.valid) {
        isValid = false;
        errorMessage = result.message || 'Invalid value';
      }
    }

    if (isValid) {
      this.clearError(field);
      this.errors.delete(fieldName);
    } else {
      this.showError(field, errorMessage);
      this.errors.set(fieldName, errorMessage);
    }

    // Update ARIA attributes
    setAriaAttributes(field, {
      invalid: !isValid,
      describedby: isValid ? '' : `${fieldName}-error`,
    });

    return isValid;
  }

  private showError(field: HTMLInputElement, message: string): void {
    field.classList.add('error');
    const errorDiv = field.parentElement?.querySelector(
      '.form-error'
    ) as HTMLDivElement;

    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.remove('hidden');
      errorDiv.id = `${field.name}-error`;

      // Announce error to screen readers
      announce(`Error: ${message}`, 'assertive');
    }
  }

  private clearError(field: HTMLInputElement): void {
    field.classList.remove('error');
    const errorDiv = field.parentElement?.querySelector(
      '.form-error'
    ) as HTMLDivElement;

    if (errorDiv) {
      errorDiv.textContent = '';
      errorDiv.classList.add('hidden');
    }
  }

  private setLoading(loading: boolean): void {
    if (this.submitButton) {
      this.submitButton.disabled = loading;
      this.submitButton.textContent = loading ? 'Sending...' : 'Send Message';

      setAriaAttributes(this.submitButton, {
        busy: loading,
      });
    }
  }

  private showStatus(
    type: 'success' | 'error' | 'info',
    message: string
  ): void {
    if (this.statusDiv) {
      const alertType =
        type === 'success' ? 'success' : type === 'info' ? 'info' : 'error';
      this.statusDiv.className = `form-status alert alert-${alertType}`;
      this.statusDiv.textContent = message;
      this.statusDiv.classList.remove('hidden');

      // Set appropriate ARIA role
      setAriaAttributes(this.statusDiv, {
        role: type === 'error' ? 'alert' : 'status',
      });

      // Auto-hide after 8 seconds
      setTimeout(() => {
        this.statusDiv?.classList.add('hidden');
      }, 8000);
    }
  }
}

// Initialize on DOM load and Astro page transitions
function initContactForm() {
  const form = document.getElementById(
    'contact-form'
  ) as HTMLFormElement | null;
  if (!form) return;

  // Avoid duplicate listeners when this runs on both initial load and Astro
  // view transitions.
  if (form.hasAttribute('data-contact-form-initialized')) return;
  form.setAttribute('data-contact-form-initialized', '');

  new EnhancedContactForm();
}

const runContactFormInit = () => initContactForm();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runContactFormInit);
} else {
  runContactFormInit();
}

document.addEventListener('astro:page-load', runContactFormInit);

export { EnhancedContactForm };
