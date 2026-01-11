/**
 * Internationalization (i18n) Utilities Tests
 */
import { describe, it, expect } from 'vitest';
import {
  getBrowserLocale,
  parseLocale,
  matchLocale,
  formatNumber,
  formatCurrency,
  formatPercent,
  formatCompact,
  parseLocalizedNumber,
  formatDate,
  formatTime,
  formatRelativeTime,
  getDayNames,
  getMonthNames,
  getPluralCategory,
  pluralize,
  createPluralizer,
  interpolate,
  interpolateFormatted,
  createTranslator,
  formatList,
  getLocaleName,
  getRegionName,
  getCurrencyName,
  isRTL,
  getTextDirection,
  createCollator,
  sortLocale,
  localeEquals,
  segmentWords,
  segmentSentences,
  segmentGraphemes,
  graphemeCount,
} from '../utils/i18n';

describe('i18n Utilities', () => {
  describe('getBrowserLocale', () => {
    it('should return a locale string', () => {
      const locale = getBrowserLocale();
      expect(typeof locale).toBe('string');
      expect(locale.length).toBeGreaterThan(0);
    });
  });

  describe('parseLocale', () => {
    it('should parse simple locale', () => {
      const result = parseLocale('en');
      expect(result.language).toBe('en');
      expect(result.region).toBeUndefined();
    });

    it('should parse locale with region', () => {
      const result = parseLocale('en-US');
      expect(result.language).toBe('en');
      expect(result.region).toBe('US');
    });

    it('should parse locale with script', () => {
      const result = parseLocale('zh-Hans-CN');
      expect(result.language).toBe('zh');
      expect(result.script).toBe('Hans');
      expect(result.region).toBe('CN');
    });

    it('should normalize case', () => {
      const result = parseLocale('EN-us');
      expect(result.language).toBe('en');
      expect(result.region).toBe('US');
    });
  });

  describe('matchLocale', () => {
    it('should return exact match', () => {
      const result = matchLocale('en-US', ['en', 'en-US', 'fr']);
      expect(result).toBe('en-US');
    });

    it('should return language match', () => {
      const result = matchLocale('en-GB', ['en', 'fr', 'de']);
      expect(result).toBe('en');
    });

    it('should return fallback if no match', () => {
      const result = matchLocale('ja', ['en', 'fr'], 'en');
      expect(result).toBe('en');
    });

    it('should handle language-region variant', () => {
      const result = matchLocale('en-US', ['en-GB', 'fr']);
      expect(result).toBe('en-GB');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers according to locale', () => {
      const result = formatNumber(1234.56, 'en-US');
      expect(result).toContain('1');
      expect(result).toContain('234');
    });

    it('should handle different locales', () => {
      const de = formatNumber(1234.56, 'de-DE');
      expect(de).toBeDefined();
    });

    it('should accept format options', () => {
      const result = formatNumber(1234.5, 'en-US', {
        minimumFractionDigits: 2,
      });
      expect(result).toContain('.50');
    });
  });

  describe('formatCurrency', () => {
    it('should format currency', () => {
      const result = formatCurrency(99.99, 'USD', 'en-US');
      expect(result).toContain('$');
      expect(result).toContain('99');
    });

    it('should handle different currencies', () => {
      const eur = formatCurrency(100, 'EUR', 'de-DE');
      expect(eur).toContain('€');
    });
  });

  describe('formatPercent', () => {
    it('should format percentage', () => {
      const result = formatPercent(0.75, 'en-US');
      expect(result).toContain('75');
      expect(result).toContain('%');
    });

    it('should handle decimal places', () => {
      const result = formatPercent(0.7567, 'en-US', 2);
      expect(result).toContain('75.67');
    });
  });

  describe('formatCompact', () => {
    it('should format large numbers compactly', () => {
      const result = formatCompact(1500000, 'en-US');
      expect(result.toLowerCase()).toContain('m');
    });

    it('should format thousands', () => {
      const result = formatCompact(1500, 'en-US');
      expect(result.toLowerCase()).toContain('k');
    });
  });

  describe('parseLocalizedNumber', () => {
    it('should parse localized number', () => {
      expect(parseLocalizedNumber('1,234.56', 'en-US')).toBe(1234.56);
    });

    it('should handle different locales', () => {
      expect(parseLocalizedNumber('1.234,56', 'de-DE')).toBe(1234.56);
    });
  });

  describe('formatDate', () => {
    it('should format date', () => {
      const date = new Date(2024, 0, 15);
      const result = formatDate(date, 'en-US');
      expect(result).toBeDefined();
    });

    it('should accept date options', () => {
      const date = new Date(2024, 0, 15);
      const result = formatDate(date, 'en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      expect(result).toContain('January');
      expect(result).toContain('2024');
    });

    it('should handle timestamps', () => {
      const result = formatDate(1705363200000, 'en-US');
      expect(result).toBeDefined();
    });

    it('should handle ISO strings', () => {
      const result = formatDate('2024-01-15', 'en-US');
      expect(result).toBeDefined();
    });
  });

  describe('formatTime', () => {
    it('should format time', () => {
      const date = new Date(2024, 0, 15, 14, 30);
      const result = formatTime(date, 'en-US');
      expect(result).toContain('30');
    });

    it('should handle 12-hour format', () => {
      const date = new Date(2024, 0, 15, 14, 30);
      const result = formatTime(date, 'en-US', { hour12: true });
      expect(result).toContain('PM');
    });

    it('should show seconds when specified', () => {
      const date = new Date(2024, 0, 15, 14, 30, 45);
      const result = formatTime(date, 'en-US', { showSeconds: true });
      expect(result).toContain('45');
    });
  });

  describe('formatRelativeTime', () => {
    it('should format past times', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(yesterday, 'en-US', now);
      expect(result.toLowerCase()).toContain('yesterday');
    });

    it('should format future times', () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(tomorrow, 'en-US', now);
      expect(result.toLowerCase()).toContain('tomorrow');
    });

    it('should handle seconds', () => {
      const now = new Date();
      const fewSecondsAgo = new Date(now.getTime() - 30 * 1000);
      const result = formatRelativeTime(fewSecondsAgo, 'en-US', now);
      expect(result.toLowerCase()).toContain('second');
    });

    it('should handle months', () => {
      const now = new Date();
      const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(twoMonthsAgo, 'en-US', now);
      expect(result.toLowerCase()).toContain('month');
    });
  });

  describe('getDayNames', () => {
    it('should return all day names', () => {
      const days = getDayNames('en-US');
      expect(days).toHaveLength(7);
      expect(days).toContain('Sunday');
    });

    it('should return short names', () => {
      const days = getDayNames('en-US', 'short');
      expect(days).toHaveLength(7);
      expect(days.some(d => d.length <= 3)).toBe(true);
    });

    it('should return narrow names', () => {
      const days = getDayNames('en-US', 'narrow');
      expect(days).toHaveLength(7);
      expect(days.some(d => d.length === 1)).toBe(true);
    });
  });

  describe('getMonthNames', () => {
    it('should return all month names', () => {
      const months = getMonthNames('en-US');
      expect(months).toHaveLength(12);
      expect(months).toContain('January');
      expect(months).toContain('December');
    });

    it('should return short names', () => {
      const months = getMonthNames('en-US', 'short');
      expect(months).toHaveLength(12);
    });
  });

  describe('getPluralCategory', () => {
    it('should return correct category for English', () => {
      expect(getPluralCategory(0, 'en-US')).toBe('other');
      expect(getPluralCategory(1, 'en-US')).toBe('one');
      expect(getPluralCategory(2, 'en-US')).toBe('other');
    });
  });

  describe('pluralize', () => {
    it('should select correct plural form', () => {
      const messages = {
        one: '{n} item',
        other: '{n} items',
      };

      expect(pluralize(1, messages, 'en-US')).toBe('{n} item');
      expect(pluralize(2, messages, 'en-US')).toBe('{n} items');
    });

    it('should fallback to other', () => {
      const messages = {
        other: 'many items',
      };

      expect(pluralize(100, messages, 'en-US')).toBe('many items');
    });
  });

  describe('createPluralizer', () => {
    it('should create locale-bound pluralizer', () => {
      const pluralizeEn = createPluralizer('en-US');
      const messages = { one: 'one', other: 'other' };

      expect(pluralizeEn(1, messages)).toBe('one');
    });
  });

  describe('interpolate', () => {
    it('should interpolate variables', () => {
      const result = interpolate('Hello, {name}!', { name: 'World' });
      expect(result).toBe('Hello, World!');
    });

    it('should handle multiple variables', () => {
      const result = interpolate('{greeting}, {name}!', {
        greeting: 'Hello',
        name: 'World',
      });
      expect(result).toBe('Hello, World!');
    });

    it('should keep unmatched placeholders', () => {
      const result = interpolate('Hello, {name}!', {});
      expect(result).toBe('Hello, {name}!');
    });

    it('should handle numbers and booleans', () => {
      const result = interpolate('Count: {count}, Active: {active}', {
        count: 42,
        active: true,
      });
      expect(result).toBe('Count: 42, Active: true');
    });
  });

  describe('interpolateFormatted', () => {
    it('should apply formatters', () => {
      const result = interpolateFormatted(
        'Price: {price, currency}',
        { price: 99.99 },
        { currency: v => `$${v}` }
      );
      expect(result).toBe('Price: $99.99');
    });
  });

  describe('createTranslator', () => {
    it('should translate keys', () => {
      const t = createTranslator({
        defaultLocale: 'en',
        translations: {
          en: { greeting: 'Hello' },
          es: { greeting: 'Hola' },
        },
      });

      expect(t.t('greeting')).toBe('Hello');
    });

    it('should interpolate values', () => {
      const t = createTranslator({
        defaultLocale: 'en',
        translations: {
          en: { greeting: 'Hello, {name}!' },
        },
      });

      expect(t.t('greeting', { name: 'World' })).toBe('Hello, World!');
    });

    it('should handle pluralization', () => {
      const t = createTranslator({
        defaultLocale: 'en',
        translations: {
          en: {
            items: { one: '{count} item', other: '{count} items' },
          },
        },
      });

      expect(t.t('items', { count: 1 })).toBe('1 item');
      expect(t.t('items', { count: 5 })).toBe('5 items');
    });

    it('should change locale', () => {
      const t = createTranslator({
        defaultLocale: 'en',
        translations: {
          en: { greeting: 'Hello' },
          es: { greeting: 'Hola' },
        },
      });

      t.setLocale('es');
      expect(t.getLocale()).toBe('es');
      expect(t.t('greeting')).toBe('Hola');
    });

    it('should fall back to fallback locale', () => {
      const t = createTranslator({
        defaultLocale: 'es',
        fallbackLocale: 'en',
        translations: {
          en: { greeting: 'Hello', farewell: 'Goodbye' },
          es: { greeting: 'Hola' },
        },
      });

      expect(t.t('farewell')).toBe('Goodbye');
    });

    it('should return key for missing translation', () => {
      const t = createTranslator({
        defaultLocale: 'en',
        translations: { en: {} },
      });

      expect(t.t('missing.key')).toBe('missing.key');
    });

    it('should check if translation exists', () => {
      const t = createTranslator({
        defaultLocale: 'en',
        translations: {
          en: { existing: 'Yes' },
        },
      });

      expect(t.has('existing')).toBe(true);
      expect(t.has('missing')).toBe(false);
    });

    it('should get available locales', () => {
      const t = createTranslator({
        defaultLocale: 'en',
        translations: {
          en: {},
          es: {},
          fr: {},
        },
      });

      expect(t.getAvailableLocales()).toEqual(['en', 'es', 'fr']);
    });

    it('should translate with explicit locale', () => {
      const t = createTranslator({
        defaultLocale: 'en',
        translations: {
          en: { greeting: 'Hello' },
          es: { greeting: 'Hola' },
        },
      });

      expect(t.tl('greeting', 'es')).toBe('Hola');
    });
  });

  describe('formatList', () => {
    it('should format conjunction list', () => {
      const result = formatList(
        ['apples', 'oranges', 'bananas'],
        'en-US',
        'conjunction'
      );
      expect(result).toContain('apples');
      expect(result).toContain('and');
    });

    it('should format disjunction list', () => {
      const result = formatList(
        ['red', 'blue', 'green'],
        'en-US',
        'disjunction'
      );
      expect(result).toContain('or');
    });

    it('should handle single item', () => {
      const result = formatList(['apple'], 'en-US');
      expect(result).toBe('apple');
    });
  });

  describe('getLocaleName', () => {
    it('should return locale display name', () => {
      const name = getLocaleName('en', 'en-US');
      expect(name.toLowerCase()).toBe('english');
    });

    it('should return name in different locale', () => {
      const name = getLocaleName('en', 'es');
      expect(name.toLowerCase()).toBe('inglés');
    });
  });

  describe('getRegionName', () => {
    it('should return region display name', () => {
      const name = getRegionName('US', 'en-US');
      expect(name).toBe('United States');
    });
  });

  describe('getCurrencyName', () => {
    it('should return currency display name', () => {
      const name = getCurrencyName('USD', 'en-US');
      expect(name).toBe('US Dollar');
    });
  });

  describe('isRTL', () => {
    it('should identify RTL languages', () => {
      expect(isRTL('ar')).toBe(true);
      expect(isRTL('he')).toBe(true);
      expect(isRTL('fa')).toBe(true);
    });

    it('should identify LTR languages', () => {
      expect(isRTL('en')).toBe(false);
      expect(isRTL('es')).toBe(false);
      expect(isRTL('zh')).toBe(false);
    });

    it('should handle locale with region', () => {
      expect(isRTL('ar-SA')).toBe(true);
      expect(isRTL('en-US')).toBe(false);
    });
  });

  describe('getTextDirection', () => {
    it('should return rtl for RTL languages', () => {
      expect(getTextDirection('ar')).toBe('rtl');
    });

    it('should return ltr for LTR languages', () => {
      expect(getTextDirection('en')).toBe('ltr');
    });
  });

  describe('createCollator', () => {
    it('should create locale-aware comparator', () => {
      const compare = createCollator('en-US');

      expect(compare('a', 'b')).toBeLessThan(0);
      expect(compare('b', 'a')).toBeGreaterThan(0);
      expect(compare('a', 'a')).toBe(0);
    });
  });

  describe('sortLocale', () => {
    it('should sort strings by locale', () => {
      const sorted = sortLocale(['banana', 'Apple', 'cherry'], 'en-US');
      expect(sorted[0].toLowerCase()).toBe('apple');
    });

    it('should handle case sensitivity option', () => {
      const sorted = sortLocale(['b', 'A', 'c'], 'en-US', {
        sensitivity: 'base',
      });
      expect(sorted[0]).toBe('A');
    });
  });

  describe('localeEquals', () => {
    it('should compare strings locale-aware', () => {
      expect(localeEquals('café', 'cafe', 'en-US')).toBe(false);
      expect(localeEquals('hello', 'HELLO', 'en-US')).toBe(true);
    });
  });

  describe('segmentWords', () => {
    it('should segment text into words', () => {
      const words = segmentWords('Hello world', 'en-US');
      expect(words).toContain('Hello');
      expect(words).toContain('world');
    });
  });

  describe('segmentSentences', () => {
    it('should segment text into sentences', () => {
      const sentences = segmentSentences('Hello. World!', 'en-US');
      expect(sentences.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('segmentGraphemes', () => {
    it('should segment into graphemes', () => {
      const graphemes = segmentGraphemes('hello', 'en-US');
      expect(graphemes).toEqual(['h', 'e', 'l', 'l', 'o']);
    });

    it('should handle emoji', () => {
      const graphemes = segmentGraphemes('👨‍👩‍👧‍👦', 'en-US');
      // Family emoji should be 1 grapheme (if Intl.Segmenter is supported)
      expect(graphemes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('graphemeCount', () => {
    it('should count graphemes', () => {
      expect(graphemeCount('hello', 'en-US')).toBe(5);
    });

    it('should handle combined characters', () => {
      // café with combining accent (e + combining acute)
      // The combining accent attaches to 'e' making it one grapheme 'é'
      const count = graphemeCount('cafe\u0301', 'en-US');
      expect(count).toBe(4); // c, a, f, é (e with accent is 1 grapheme)
    });
  });
});
