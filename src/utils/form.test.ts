/**
 * Tests for form utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createForm,
  validators,
  serializeForm,
  formToSearchParams,
  formToJSON,
  populateForm,
  watchForm,
  createFormAutoSave,
  type ValidationRule,
} from './form';

describe('form utilities', () => {
  describe('validators', () => {
    describe('required', () => {
      it('should fail for empty string', () => {
        const rule = validators.required();
        expect(rule.validate('', {})).toBe('This field is required');
      });

      it('should fail for null', () => {
        const rule = validators.required();
        expect(rule.validate(null, {})).toBe('This field is required');
      });

      it('should fail for undefined', () => {
        const rule = validators.required();
        expect(rule.validate(undefined, {})).toBe('This field is required');
      });

      it('should fail for empty array', () => {
        const rule = validators.required();
        expect(rule.validate([], {})).toBe('This field is required');
      });

      it('should pass for non-empty string', () => {
        const rule = validators.required();
        expect(rule.validate('hello', {})).toBe(null);
      });

      it('should use custom message', () => {
        const rule = validators.required('Custom message');
        expect(rule.validate('', {})).toBe('Custom message');
      });
    });

    describe('minLength', () => {
      it('should fail for short string', () => {
        const rule = validators.minLength(5);
        expect(rule.validate('hi', {})).toBe('Must be at least 5 characters');
      });

      it('should pass for long enough string', () => {
        const rule = validators.minLength(5);
        expect(rule.validate('hello', {})).toBe(null);
      });

      it('should pass for empty string (use required for that)', () => {
        const rule = validators.minLength(5);
        expect(rule.validate('', {})).toBe(null);
      });
    });

    describe('maxLength', () => {
      it('should fail for long string', () => {
        const rule = validators.maxLength(5);
        expect(rule.validate('hello world', {})).toBe(
          'Must be no more than 5 characters'
        );
      });

      it('should pass for short string', () => {
        const rule = validators.maxLength(5);
        expect(rule.validate('hi', {})).toBe(null);
      });
    });

    describe('email', () => {
      it('should fail for invalid email', () => {
        const rule = validators.email();
        expect(rule.validate('not-an-email', {})).toBe('Invalid email address');
      });

      it('should pass for valid email', () => {
        const rule = validators.email();
        expect(rule.validate('test@example.com', {})).toBe(null);
      });
    });

    describe('pattern', () => {
      it('should fail when pattern does not match', () => {
        const rule = validators.pattern(/^[A-Z]+$/);
        expect(rule.validate('abc', {})).toBe('Invalid format');
      });

      it('should pass when pattern matches', () => {
        const rule = validators.pattern(/^[A-Z]+$/);
        expect(rule.validate('ABC', {})).toBe(null);
      });
    });

    describe('min', () => {
      it('should fail for number below minimum', () => {
        const rule = validators.min(10);
        expect(rule.validate(5, {})).toBe('Must be at least 10');
      });

      it('should pass for number at or above minimum', () => {
        const rule = validators.min(10);
        expect(rule.validate(10, {})).toBe(null);
        expect(rule.validate(15, {})).toBe(null);
      });
    });

    describe('max', () => {
      it('should fail for number above maximum', () => {
        const rule = validators.max(10);
        expect(rule.validate(15, {})).toBe('Must be no more than 10');
      });

      it('should pass for number at or below maximum', () => {
        const rule = validators.max(10);
        expect(rule.validate(10, {})).toBe(null);
        expect(rule.validate(5, {})).toBe(null);
      });
    });

    describe('url', () => {
      it('should fail for invalid URL', () => {
        const rule = validators.url();
        expect(rule.validate('not-a-url', {})).toBe('Invalid URL');
      });

      it('should pass for valid URL', () => {
        const rule = validators.url();
        expect(rule.validate('https://example.com', {})).toBe(null);
      });
    });

    describe('matches', () => {
      it('should fail when values do not match', () => {
        const rule = validators.matches('password');
        const passwordKey = 'password' as const;
        const values = { [passwordKey]: 'example' };
        expect(rule.validate('different', values)).toBe('Must match password');
      });

      it('should pass when values match', () => {
        const rule = validators.matches('password');
        const passwordKey = 'password' as const;
        const values = { [passwordKey]: 'example' };
        expect(rule.validate('example', values)).toBe(null);
      });
    });

    describe('custom', () => {
      it('should use custom validation function', async () => {
        const rule = validators.custom<string>(
          value => value.startsWith('test'),
          'Must start with test'
        );

        expect(await rule.validate('hello', {})).toBe('Must start with test');
        expect(await rule.validate('testing', {})).toBe(null);
      });

      it('should allow returning string as error', async () => {
        const rule = validators.custom<string>(value =>
          value.length < 3 ? 'Too short!' : true
        );

        expect(await rule.validate('ab', {})).toBe('Too short!');
        expect(await rule.validate('abc', {})).toBe(null);
      });
    });
  });

  describe('createForm', () => {
    it('should create form with initial state', () => {
      const form = createForm({
        fields: {
          email: { initialValue: '' },
          password: { initialValue: '' },
        },
      });

      expect(form.getValue('email')).toBe('');
      expect(form.getValue('password')).toBe('');
    });

    it('should update values', () => {
      const form = createForm({
        fields: {
          name: { initialValue: '' },
        },
      });

      form.setValue('name', 'John');
      expect(form.getValue('name')).toBe('John');
    });

    it('should track dirty state', () => {
      const form = createForm({
        fields: {
          name: { initialValue: 'Initial' },
        },
      });

      expect(form.getState().isDirty).toBe(false);

      form.setValue('name', 'Changed');
      expect(form.getState().isDirty).toBe(true);
    });

    it('should validate fields', async () => {
      const form = createForm({
        fields: {
          email: {
            initialValue: '',
            rules: [
              validators.required(),
              validators.email() as ValidationRule,
            ],
          },
        },
        validateOnChange: false,
      });

      const errors = await form.validateField('email');
      expect(errors).toContain('This field is required');
    });

    it('should validate all fields', async () => {
      const form = createForm({
        fields: {
          email: {
            initialValue: '',
            rules: [validators.required()],
          },
          password: {
            initialValue: '',
            rules: [validators.required()],
          },
        },
        validateOnChange: false,
      });

      const errors = await form.validate();
      expect(errors).toHaveProperty('email');
      expect(errors).toHaveProperty('password');
    });

    it('should submit valid form', async () => {
      const onSubmit = vi.fn();

      const form = createForm({
        fields: {
          name: { initialValue: 'John' },
        },
        onSubmit,
      });

      const success = await form.submit();

      expect(success).toBe(true);
      expect(onSubmit).toHaveBeenCalledWith({ name: 'John' });
    });

    it('should not submit invalid form', async () => {
      const onSubmit = vi.fn();
      const onError = vi.fn();

      const form = createForm({
        fields: {
          email: {
            initialValue: '',
            rules: [validators.required()],
          },
        },
        onSubmit,
        onError,
      });

      const success = await form.submit();

      expect(success).toBe(false);
      expect(onSubmit).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalled();
    });

    it('should reset form', () => {
      const form = createForm({
        fields: {
          name: { initialValue: 'Initial' },
        },
      });

      form.setValue('name', 'Changed');
      form.reset();

      expect(form.getValue('name')).toBe('Initial');
      expect(form.getState().isDirty).toBe(false);
    });

    it('should subscribe to state changes', () => {
      const callback = vi.fn();

      const form = createForm({
        fields: {
          name: { initialValue: '' },
        },
        validateOnChange: false, // Disable to have predictable call count
      });

      const unsubscribe = form.subscribe(callback);

      form.setValue('name', 'Test');
      expect(callback).toHaveBeenCalled();

      const callCountBeforeUnsubscribe = callback.mock.calls.length;
      unsubscribe();
      form.setValue('name', 'Another');
      // Should not be called again after unsubscribe
      expect(callback).toHaveBeenCalledTimes(callCountBeforeUnsubscribe);
    });

    it('should set and clear errors', () => {
      const form = createForm({
        fields: {
          name: { initialValue: '' },
        },
      });

      form.setErrors('name', ['Custom error']);
      expect(form.getErrors('name')).toContain('Custom error');

      form.clearErrors();
      expect(form.getErrors('name')).toHaveLength(0);
    });

    it('should mark fields as touched', () => {
      const form = createForm({
        fields: {
          name: { initialValue: '' },
        },
      });

      expect(form.getState().fields.name.touched).toBe(false);

      form.setTouched('name', true);
      expect(form.getState().fields.name.touched).toBe(true);
    });

    it('should set multiple values at once', () => {
      const form = createForm({
        fields: {
          firstName: { initialValue: '' },
          lastName: { initialValue: '' },
        },
        validateOnChange: false,
      });

      form.setValues({ firstName: 'John', lastName: 'Doe' });

      expect(form.getValue('firstName')).toBe('John');
      expect(form.getValue('lastName')).toBe('Doe');
    });
  });

  describe('serializeForm', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('should serialize simple form', () => {
      document.body.innerHTML = `
        <form>
          <input name="name" value="John" />
          <input name="email" value="john@example.com" />
        </form>
      `;

      const form = document.querySelector('form')!;
      const data = serializeForm(form);

      expect(data.name).toBe('John');
      expect(data.email).toBe('john@example.com');
    });

    it('should handle multiple values with same name', () => {
      document.body.innerHTML = `
        <form>
          <input type="checkbox" name="colors" value="red" checked />
          <input type="checkbox" name="colors" value="blue" checked />
        </form>
      `;

      const form = document.querySelector('form')!;
      const data = serializeForm(form);

      expect(data.colors).toEqual(['red', 'blue']);
    });
  });

  describe('formToSearchParams', () => {
    it('should convert form to URLSearchParams', () => {
      document.body.innerHTML = `
        <form>
          <input name="q" value="test" />
          <input name="page" value="1" />
        </form>
      `;

      const form = document.querySelector('form')!;
      const params = formToSearchParams(form);

      expect(params.get('q')).toBe('test');
      expect(params.get('page')).toBe('1');
    });
  });

  describe('formToJSON', () => {
    it('should convert form to JSON string', () => {
      document.body.innerHTML = `
        <form>
          <input name="name" value="John" />
        </form>
      `;

      const form = document.querySelector('form')!;
      const json = formToJSON(form);

      expect(JSON.parse(json)).toEqual({ name: 'John' });
    });
  });

  describe('populateForm', () => {
    it('should populate text inputs', () => {
      document.body.innerHTML = `
        <form>
          <input name="name" />
          <input name="email" />
        </form>
      `;

      const form = document.querySelector('form')!;
      populateForm(form, { name: 'John', email: 'john@example.com' });

      expect(form.elements.namedItem('name')).toHaveProperty('value', 'John');
      expect(form.elements.namedItem('email')).toHaveProperty(
        'value',
        'john@example.com'
      );
    });

    it('should populate checkboxes', () => {
      document.body.innerHTML = `
        <form>
          <input type="checkbox" name="agree" />
        </form>
      `;

      const form = document.querySelector('form')!;
      populateForm(form, { agree: true });

      expect(
        (form.elements.namedItem('agree') as HTMLInputElement).checked
      ).toBe(true);
    });

    it('should populate select elements', () => {
      document.body.innerHTML = `
        <form>
          <select name="country">
            <option value="us">US</option>
            <option value="uk">UK</option>
          </select>
        </form>
      `;

      const form = document.querySelector('form')!;
      populateForm(form, { country: 'uk' });

      expect(
        (form.elements.namedItem('country') as HTMLSelectElement).value
      ).toBe('uk');
    });

    it('should populate textarea', () => {
      document.body.innerHTML = `
        <form>
          <textarea name="message"></textarea>
        </form>
      `;

      const form = document.querySelector('form')!;
      populateForm(form, { message: 'Hello world' });

      expect(
        (form.elements.namedItem('message') as HTMLTextAreaElement).value
      ).toBe('Hello world');
    });
  });

  describe('watchForm', () => {
    it('should watch form for changes', () => {
      document.body.innerHTML = `
        <form>
          <input name="name" />
        </form>
      `;

      const form = document.querySelector('form')!;
      const callback = vi.fn();

      watchForm(form, callback);

      // Trigger input event
      const input = form.elements.namedItem('name') as HTMLInputElement;
      input.value = 'Test';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Test' })
      );
    });

    it('should return cleanup function', () => {
      document.body.innerHTML = `
        <form>
          <input name="name" />
        </form>
      `;

      const form = document.querySelector('form')!;
      const callback = vi.fn();

      const cleanup = watchForm(form, callback);
      cleanup();

      const input = form.elements.namedItem('name') as HTMLInputElement;
      input.value = 'Test';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('createFormAutoSave', () => {
    it('should save form data to storage', () => {
      document.body.innerHTML = `
        <form>
          <input name="name" value="John" />
        </form>
      `;

      const form = document.querySelector('form')!;
      const storage = {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      } as unknown as Storage;

      createFormAutoSave(form, 'test-form', { storage, debounce: 0 });

      // Trigger change
      const input = form.elements.namedItem('name') as HTMLInputElement;
      input.dispatchEvent(new Event('change', { bubbles: true }));

      // Wait for debounce
      return new Promise<void>(resolve => {
        setTimeout(() => {
          expect(storage.setItem).toHaveBeenCalledWith(
            'test-form',
            expect.any(String)
          );
          resolve();
        }, 10);
      });
    });

    it('should restore form data from storage', () => {
      document.body.innerHTML = `
        <form>
          <input name="name" />
        </form>
      `;

      const form = document.querySelector('form')!;
      const storage = {
        getItem: vi.fn().mockReturnValue('{"name":"Saved Name"}'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      } as unknown as Storage;

      const autoSave = createFormAutoSave(form, 'test-form', { storage });
      autoSave.restore();

      expect((form.elements.namedItem('name') as HTMLInputElement).value).toBe(
        'Saved Name'
      );
    });

    it('should clear saved data', () => {
      document.body.innerHTML = '<form></form>';

      const form = document.querySelector('form')!;
      const storage = {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      } as unknown as Storage;

      const autoSave = createFormAutoSave(form, 'test-form', { storage });
      autoSave.clear();

      expect(storage.removeItem).toHaveBeenCalledWith('test-form');
    });
  });
});
