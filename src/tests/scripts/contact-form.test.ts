import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  EnhancedContactForm,
  computeKeyboardOffsetPx,
} from '../../scripts/contact-form';

// Mock dependencies
vi.mock('../../utils/a11y', () => ({
  announce: vi.fn(),
  setAriaAttributes: vi.fn(),
}));

vi.mock('../../utils/validation', () => ({
  emailSchema: { safeParse: vi.fn().mockReturnValue({ success: true }) },
  phoneSchema: { safeParse: vi.fn().mockReturnValue({ success: true }) },
}));

vi.mock('../../consts', () => ({
  CONTACT_EMAIL: 'hello@olivechicago.com',
  CONTACT_FORM_ENDPOINT: 'https://crm.example.com/intake',
  CONTACT_CALENDAR_URL: 'https://calendar.example.com/review',
  CONTACT_CRM_LABEL: 'CRM intake',
}));

vi.mock('../../store/index', () => ({
  addNotification: vi.fn(),
  notify: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('EnhancedContactForm', () => {
  let form: HTMLFormElement;
  let submitButton: HTMLButtonElement;
  let statusDiv: HTMLDivElement;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = '';
    form = document.createElement('form');
    form.id = 'contact-form';

    // Helper to create fields
    const createField = (name: string, type = 'text', required = false) => {
      const input = document.createElement('input');
      input.name = name;
      input.type = type;
      if (required) input.required = true;
      form.appendChild(input);
      return input;
    };

    createField('firstName', 'text', true);
    createField('lastName', 'text', true);
    createField('email', 'email', true);
    createField('company');
    createField('phone', 'tel');
    createField('subject', 'text', true);
    createField('budget');
    createField('timeline');
    createField('message', 'text', true); // Should be textarea but input works for basic test
    createField('terms', 'checkbox', true);

    submitButton = document.createElement('button');
    submitButton.type = 'submit';
    form.appendChild(submitButton);

    statusDiv = document.createElement('div');
    statusDiv.className = 'form-status';
    form.appendChild(statusDiv);

    document.body.appendChild(form);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    }) as unknown as typeof fetch;

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('computeKeyboardOffsetPx should return a non-negative integer offset', () => {
    expect(computeKeyboardOffsetPx(800, null)).toBe(0);
    expect(computeKeyboardOffsetPx(800, { height: 800, offsetTop: 0 })).toBe(0);
    expect(computeKeyboardOffsetPx(800, { height: 500, offsetTop: 0 })).toBe(
      300
    );
    expect(computeKeyboardOffsetPx(800, { height: 500, offsetTop: 20 })).toBe(
      280
    );
    // Never negative
    expect(computeKeyboardOffsetPx(500, { height: 600, offsetTop: 0 })).toBe(0);
  });

  it('should install keyboard awareness and set CSS var when VisualViewport is available on coarse pointer devices', () => {
    const addEventListener = vi.fn();
    Object.defineProperty(window, 'visualViewport', {
      value: {
        height: 500,
        offsetTop: 0,
        addEventListener,
      },
      configurable: true,
    });

    // Simulate a touch device
    window.matchMedia = vi.fn().mockImplementation((query: string) => {
      if (query.includes('pointer: coarse')) return { matches: true };
      if (query.includes('prefers-reduced-motion')) return { matches: false };
      return { matches: false };
    });

    // Make the viewport smaller than innerHeight to simulate keyboard open.
    Object.defineProperty(window, 'innerHeight', {
      value: 800,
      configurable: true,
    });

    // Mark the form as keyboard-aware.
    form.setAttribute('data-keyboard-aware', '');

    new EnhancedContactForm();

    // Listener installed
    expect(addEventListener).toHaveBeenCalled();

    // CSS variable set on init (update() runs once during install)
    expect(form.style.getPropertyValue('--keyboard-offset')).toBe('300px');
  });

  it('should initialize correctly', () => {
    const contactForm = new EnhancedContactForm();
    expect(contactForm).toBeDefined();
  });

  it('should validate required fields on submit', async () => {
    new EnhancedContactForm();

    // Submit empty form
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    // Should not redirect
    expect(window.location.href).toBe('');

    // Should show errors (implementation detail: adds .error class or similar)
    // We can check if announce was called with error message
    const { announce } = await import('../../utils/a11y');
    expect(announce).toHaveBeenCalledWith(
      expect.stringContaining('Form has'),
      'assertive'
    );
  });

  it('should submit successfully when valid', async () => {
    new EnhancedContactForm();

    // Fill form
    const setVal = (name: string, val: string) => {
      const el = form.querySelector(`[name="${name}"]`) as HTMLInputElement;
      el.value = val;
    };

    setVal('firstName', 'John');
    setVal('lastName', 'Doe');
    setVal('email', 'john@example.com');
    setVal('subject', 'Test Subject');
    setVal('message', 'This is a long enough message for validation.');

    const terms = form.querySelector('[name="terms"]') as HTMLInputElement;
    terms.checked = true;

    // Submit
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await Promise.resolve();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://crm.example.com/intake',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });
});
