/**
 * Internationalization (i18n) Utilities
 * @module utils/i18n
 * @description Internationalization helpers including locale formatting,
 * pluralization, relative time, number/currency formatting, and message interpolation.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Supported locale type
 */
export type LocaleCode = string; // e.g., 'en-US', 'fr-FR', 'ja-JP'

/**
 * Plural category
 */
export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/**
 * Plural rules for a locale
 */
export interface PluralRules {
  locale: LocaleCode;
  select: (n: number) => PluralCategory;
}

/**
 * Translation message with pluralization
 */
export interface PluralMessage {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

/**
 * Translation dictionary
 */
export type TranslationDictionary = Record<string, string | PluralMessage>;

/**
 * i18n configuration
 */
export interface I18nConfig {
  defaultLocale: LocaleCode;
  fallbackLocale?: LocaleCode;
  translations: Record<LocaleCode, TranslationDictionary>;
}

// ============================================================================
// Locale Detection
// ============================================================================

/**
 * Get browser's preferred locale
 * @returns Best matching locale code
 */
export function getBrowserLocale(): LocaleCode {
  if (typeof navigator === 'undefined') {
    return 'en-US';
  }

  return (
    navigator.language ||
    (navigator.languages && navigator.languages[0]) ||
    'en-US'
  );
}

/**
 * Parse locale code into components
 * @param locale - Locale code (e.g., 'en-US', 'fr-FR')
 */
export function parseLocale(locale: LocaleCode): {
  language: string;
  region?: string;
  script?: string;
} {
  const parts = locale.split('-');
  const result: { language: string; region?: string; script?: string } = {
    language: parts[0].toLowerCase(),
  };

  if (parts.length > 1) {
    // Check if second part is script (4 letters) or region (2 letters)
    if (parts[1].length === 4) {
      result.script =
        parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();
      if (parts[2]) {
        result.region = parts[2].toUpperCase();
      }
    } else {
      result.region = parts[1].toUpperCase();
    }
  }

  return result;
}

/**
 * Get best matching locale from available locales
 * @param requested - Requested locale
 * @param available - Available locales
 * @param fallback - Fallback locale
 */
export function matchLocale(
  requested: LocaleCode,
  available: LocaleCode[],
  fallback: LocaleCode = 'en'
): LocaleCode {
  // Exact match
  if (available.includes(requested)) {
    return requested;
  }

  const { language, region } = parseLocale(requested);

  // Try language-region match
  if (region) {
    const withRegion = `${language}-${region}`;
    if (available.includes(withRegion)) {
      return withRegion;
    }
  }

  // Try language only
  const languageMatch = available.find(locale => {
    const parsed = parseLocale(locale);
    return parsed.language === language;
  });

  if (languageMatch) {
    return languageMatch;
  }

  // Fallback
  return available.includes(fallback) ? fallback : available[0] || fallback;
}

// ============================================================================
// Number Formatting
// ============================================================================

/**
 * Format number according to locale
 * @param value - Number to format
 * @param locale - Locale code
 * @param options - Intl.NumberFormat options
 */
export function formatNumber(
  value: number,
  locale: LocaleCode = 'en-US',
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Format currency
 * @param value - Amount
 * @param currency - Currency code (e.g., 'USD', 'EUR')
 * @param locale - Locale code
 */
export function formatCurrency(
  value: number,
  currency: string,
  locale: LocaleCode = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Format percentage
 * @param value - Value (0-1 or 0-100 depending on options)
 * @param locale - Locale code
 * @param decimals - Number of decimal places
 */
export function formatPercent(
  value: number,
  locale: LocaleCode = 'en-US',
  decimals = 0
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format number in compact notation (e.g., 1K, 1M)
 * @param value - Number to format
 * @param locale - Locale code
 */
export function formatCompact(
  value: number,
  locale: LocaleCode = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(value);
}

/**
 * Parse localized number string back to number
 * @param str - Localized number string
 * @param locale - Locale code
 */
export function parseLocalizedNumber(
  str: string,
  locale: LocaleCode = 'en-US'
): number {
  // Get locale-specific separators
  const parts = new Intl.NumberFormat(locale).formatToParts(1234.5);
  const groupSep = parts.find(p => p.type === 'group')?.value || ',';
  const decimalSep = parts.find(p => p.type === 'decimal')?.value || '.';

  // Normalize the string
  let normalized = str.replace(new RegExp(`\\${groupSep}`, 'g'), '');
  normalized = normalized.replace(decimalSep, '.');

  return parseFloat(normalized);
}

// ============================================================================
// Date/Time Formatting
// ============================================================================

/**
 * Format date according to locale
 * @param date - Date to format
 * @param locale - Locale code
 * @param options - Intl.DateTimeFormat options
 */
export function formatDate(
  date: Date | number | string,
  locale: LocaleCode = 'en-US',
  options?: Intl.DateTimeFormatOptions
): string {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(locale, options).format(d);
}

/**
 * Format time according to locale
 * @param date - Date/time to format
 * @param locale - Locale code
 * @param options - Additional options
 */
export function formatTime(
  date: Date | number | string,
  locale: LocaleCode = 'en-US',
  options?: { hour12?: boolean; showSeconds?: boolean }
): string {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    second: options?.showSeconds ? '2-digit' : undefined,
    hour12: options?.hour12,
  }).format(d);
}

/**
 * Format relative time (e.g., "2 days ago", "in 3 hours")
 * @param date - Date to compare
 * @param locale - Locale code
 * @param baseDate - Base date for comparison (default: now)
 */
export function formatRelativeTime(
  date: Date | number | string,
  locale: LocaleCode = 'en-US',
  baseDate?: Date
): string {
  const d = date instanceof Date ? date : new Date(date);
  const base = baseDate || new Date();
  const diffMs = d.getTime() - base.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  const diffWeek = Math.round(diffDay / 7);
  const diffMonth = Math.round(diffDay / 30);
  const diffYear = Math.round(diffDay / 365);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (Math.abs(diffSec) < 60) {
    return rtf.format(diffSec, 'second');
  } else if (Math.abs(diffMin) < 60) {
    return rtf.format(diffMin, 'minute');
  } else if (Math.abs(diffHour) < 24) {
    return rtf.format(diffHour, 'hour');
  } else if (Math.abs(diffDay) < 7) {
    return rtf.format(diffDay, 'day');
  } else if (Math.abs(diffWeek) < 4) {
    return rtf.format(diffWeek, 'week');
  } else if (Math.abs(diffMonth) < 12) {
    return rtf.format(diffMonth, 'month');
  } else {
    return rtf.format(diffYear, 'year');
  }
}

/**
 * Get localized day names
 * @param locale - Locale code
 * @param format - Name format
 */
export function getDayNames(
  locale: LocaleCode = 'en-US',
  format: 'long' | 'short' | 'narrow' = 'long'
): string[] {
  const baseDate = new Date(2024, 0, 7); // A Sunday
  const days: string[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + i);
    days.push(
      new Intl.DateTimeFormat(locale, { weekday: format }).format(date)
    );
  }

  return days;
}

/**
 * Get localized month names
 * @param locale - Locale code
 * @param format - Name format
 */
export function getMonthNames(
  locale: LocaleCode = 'en-US',
  format: 'long' | 'short' | 'narrow' = 'long'
): string[] {
  const months: string[] = [];

  for (let i = 0; i < 12; i++) {
    const date = new Date(2024, i, 1);
    months.push(
      new Intl.DateTimeFormat(locale, { month: format }).format(date)
    );
  }

  return months;
}

// ============================================================================
// Pluralization
// ============================================================================

/**
 * Get plural category for a number
 * @param n - Number to check
 * @param locale - Locale code
 */
export function getPluralCategory(
  n: number,
  locale: LocaleCode = 'en-US'
): PluralCategory {
  const rules = new Intl.PluralRules(locale);
  return rules.select(n) as PluralCategory;
}

/**
 * Select pluralized message
 * @param n - Count
 * @param messages - Plural messages
 * @param locale - Locale code
 */
export function pluralize(
  n: number,
  messages: PluralMessage,
  locale: LocaleCode = 'en-US'
): string {
  const category = getPluralCategory(n, locale);
  return messages[category] ?? messages.other;
}

/**
 * Create a pluralization function for a locale
 * @param locale - Locale code
 */
export function createPluralizer(
  locale: LocaleCode
): (n: number, messages: PluralMessage) => string {
  return (n: number, messages: PluralMessage) => pluralize(n, messages, locale);
}

// ============================================================================
// Message Interpolation
// ============================================================================

/**
 * Interpolate variables into a message string
 * @param message - Message with placeholders (e.g., "Hello, {name}!")
 * @param values - Values to interpolate
 */
export function interpolate(
  message: string,
  values: Record<string, string | number | boolean>
): string {
  return message.replace(/\{(\w+)\}/g, (_, key) => {
    return key in values ? String(values[key]) : `{${key}}`;
  });
}

/**
 * Interpolate with formatting
 * @param message - Message with placeholders
 * @param values - Values to interpolate
 * @param formatters - Custom formatters
 */
export function interpolateFormatted(
  message: string,
  values: Record<string, unknown>,
  formatters?: Record<string, (value: unknown) => string>
): string {
  // Pattern: {key} or {key, format} or {key, format, options}
  return message.replace(
    /\{(\w+)(?:,\s*(\w+)(?:,\s*([^}]+))?)?\}/g,
    (_, key, format, _options) => {
      const value = values[key];
      if (value === undefined) return `{${key}}`;

      if (format && formatters?.[format]) {
        return formatters[format](value);
      }

      return String(value);
    }
  );
}

// ============================================================================
// Translation System
// ============================================================================

/**
 * Create a translator function
 * @param config - i18n configuration
 */
export function createTranslator(config: I18nConfig) {
  let currentLocale = config.defaultLocale;

  function getTranslation(
    key: string,
    locale: LocaleCode
  ): string | PluralMessage | undefined {
    const dict = config.translations[locale];
    if (dict && key in dict) {
      return dict[key];
    }

    // Try fallback
    if (config.fallbackLocale && locale !== config.fallbackLocale) {
      const fallbackDict = config.translations[config.fallbackLocale];
      if (fallbackDict && key in fallbackDict) {
        return fallbackDict[key];
      }
    }

    return undefined;
  }

  return {
    /**
     * Get current locale
     */
    getLocale(): LocaleCode {
      return currentLocale;
    },

    /**
     * Set current locale
     */
    setLocale(locale: LocaleCode): void {
      if (config.translations[locale]) {
        currentLocale = locale;
      }
    },

    /**
     * Get available locales
     */
    getAvailableLocales(): LocaleCode[] {
      return Object.keys(config.translations);
    },

    /**
     * Translate a key
     * @param key - Translation key
     * @param values - Interpolation values
     */
    t(key: string, values?: Record<string, string | number | boolean>): string {
      const translation = getTranslation(key, currentLocale);

      if (!translation) {
        return key; // Return key as fallback
      }

      let message: string;

      if (typeof translation === 'string') {
        message = translation;
      } else {
        // Plural message - need count in values
        const count = values?.count ?? values?.n ?? 0;
        message = pluralize(Number(count), translation, currentLocale);
      }

      return values ? interpolate(message, values) : message;
    },

    /**
     * Translate with explicit locale
     * @param key - Translation key
     * @param locale - Locale to use
     * @param values - Interpolation values
     */
    tl(
      key: string,
      locale: LocaleCode,
      values?: Record<string, string | number | boolean>
    ): string {
      const translation = getTranslation(key, locale);

      if (!translation) {
        return key;
      }

      let message: string;

      if (typeof translation === 'string') {
        message = translation;
      } else {
        const count = values?.count ?? values?.n ?? 0;
        message = pluralize(Number(count), translation, locale);
      }

      return values ? interpolate(message, values) : message;
    },

    /**
     * Check if a translation key exists
     */
    has(key: string): boolean {
      return getTranslation(key, currentLocale) !== undefined;
    },
  };
}

// ============================================================================
// List Formatting
// ============================================================================

/**
 * Format a list according to locale
 * @param items - List items
 * @param locale - Locale code
 * @param type - List type
 */
export function formatList(
  items: string[],
  locale: LocaleCode = 'en-US',
  type: 'conjunction' | 'disjunction' | 'unit' = 'conjunction'
): string {
  return new Intl.ListFormat(locale, { type }).format(items);
}

// ============================================================================
// Display Names
// ============================================================================

/**
 * Get display name for a locale in another locale
 * @param localeCode - Locale code to get name for
 * @param displayLocale - Locale to display in
 */
export function getLocaleName(
  localeCode: LocaleCode,
  displayLocale: LocaleCode = 'en-US'
): string {
  const names = new Intl.DisplayNames([displayLocale], { type: 'language' });
  return names.of(localeCode) || localeCode;
}

/**
 * Get display name for a region
 * @param regionCode - Region code (e.g., 'US', 'FR')
 * @param displayLocale - Locale to display in
 */
export function getRegionName(
  regionCode: string,
  displayLocale: LocaleCode = 'en-US'
): string {
  const names = new Intl.DisplayNames([displayLocale], { type: 'region' });
  return names.of(regionCode) || regionCode;
}

/**
 * Get display name for a currency
 * @param currencyCode - Currency code (e.g., 'USD', 'EUR')
 * @param displayLocale - Locale to display in
 */
export function getCurrencyName(
  currencyCode: string,
  displayLocale: LocaleCode = 'en-US'
): string {
  const names = new Intl.DisplayNames([displayLocale], { type: 'currency' });
  return names.of(currencyCode) || currencyCode;
}

// ============================================================================
// Text Direction
// ============================================================================

/**
 * RTL languages
 */
const RTL_LANGUAGES = new Set([
  'ar',
  'arc',
  'arz',
  'az',
  'dv',
  'fa',
  'ha',
  'he',
  'khw',
  'ks',
  'ku',
  'mzn',
  'nqo',
  'pnb',
  'ps',
  'sd',
  'ug',
  'ur',
  'yi',
]);

/**
 * Check if locale is right-to-left
 * @param locale - Locale code
 */
export function isRTL(locale: LocaleCode): boolean {
  const { language } = parseLocale(locale);
  return RTL_LANGUAGES.has(language);
}

/**
 * Get text direction for locale
 * @param locale - Locale code
 */
export function getTextDirection(locale: LocaleCode): 'ltr' | 'rtl' {
  return isRTL(locale) ? 'rtl' : 'ltr';
}

// ============================================================================
// Collation & Sorting
// ============================================================================

/**
 * Create a locale-aware string comparator
 * @param locale - Locale code
 * @param options - Collator options
 */
export function createCollator(
  locale: LocaleCode = 'en-US',
  options?: Intl.CollatorOptions
): (a: string, b: string) => number {
  const collator = new Intl.Collator(locale, options);
  return (a: string, b: string) => collator.compare(a, b);
}

/**
 * Sort strings according to locale
 * @param strings - Strings to sort
 * @param locale - Locale code
 * @param options - Collator options
 */
export function sortLocale(
  strings: string[],
  locale: LocaleCode = 'en-US',
  options?: Intl.CollatorOptions
): string[] {
  const comparator = createCollator(locale, options);
  return [...strings].sort(comparator);
}

/**
 * Case-insensitive locale-aware string comparison
 * @param a - First string
 * @param b - Second string
 * @param locale - Locale code
 */
export function localeEquals(
  a: string,
  b: string,
  locale: LocaleCode = 'en-US'
): boolean {
  const collator = new Intl.Collator(locale, { sensitivity: 'accent' });
  return collator.compare(a, b) === 0;
}

// ============================================================================
// Segmentation
// ============================================================================

/**
 * Segment text by words
 * @param text - Text to segment
 * @param locale - Locale code
 */
export function segmentWords(
  text: string,
  locale: LocaleCode = 'en-US'
): string[] {
  if (typeof Intl.Segmenter === 'undefined') {
    // Fallback for environments without Intl.Segmenter
    return text.split(/\s+/).filter(Boolean);
  }

  const segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
  const segments = segmenter.segment(text);
  const words: string[] = [];

  for (const { segment, isWordLike } of segments) {
    if (isWordLike) {
      words.push(segment);
    }
  }

  return words;
}

/**
 * Segment text by sentences
 * @param text - Text to segment
 * @param locale - Locale code
 */
export function segmentSentences(
  text: string,
  locale: LocaleCode = 'en-US'
): string[] {
  if (typeof Intl.Segmenter === 'undefined') {
    // Fallback
    return text.split(/[.!?]+/).filter(s => s.trim());
  }

  const segmenter = new Intl.Segmenter(locale, { granularity: 'sentence' });
  const segments = segmenter.segment(text);
  const sentences: string[] = [];

  for (const { segment } of segments) {
    const trimmed = segment.trim();
    if (trimmed) {
      sentences.push(trimmed);
    }
  }

  return sentences;
}

/**
 * Segment text by graphemes (visual characters)
 * @param text - Text to segment
 * @param locale - Locale code
 */
export function segmentGraphemes(
  text: string,
  locale: LocaleCode = 'en-US'
): string[] {
  if (typeof Intl.Segmenter === 'undefined') {
    // Fallback using spread operator
    return [...text];
  }

  const segmenter = new Intl.Segmenter(locale, { granularity: 'grapheme' });
  const segments = segmenter.segment(text);
  const graphemes: string[] = [];

  for (const { segment } of segments) {
    graphemes.push(segment);
  }

  return graphemes;
}

/**
 * Get grapheme count (handles emoji and combined characters)
 * @param text - Text to count
 * @param locale - Locale code
 */
export function graphemeCount(
  text: string,
  locale: LocaleCode = 'en-US'
): number {
  return segmentGraphemes(text, locale).length;
}
