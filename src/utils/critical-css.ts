/**
 * Critical CSS Extraction Utility
 * Identifies and extracts critical above-the-fold CSS
 */

export interface CriticalCSSConfig {
  /** Viewport width for critical CSS detection */
  viewportWidth?: number;
  /** Viewport height for critical CSS detection */
  viewportHeight?: number;
  /** Selectors to always include */
  forceInclude?: string[];
  /** Selectors to always exclude */
  forceExclude?: string[];
}

const DEFAULT_CONFIG: Required<CriticalCSSConfig> = {
  viewportWidth: 1920,
  viewportHeight: 1080,
  forceInclude: [
    'html',
    'body',
    ':root',
    '[data-theme]',
    '.dark',
    // Always include layout-critical styles
    'header',
    'nav',
    'main',
    'footer',
  ],
  forceExclude: [
    // Exclude animations for critical CSS
    '@keyframes',
    'animation',
    // Exclude below-fold components
    '.footer',
    '.modal',
    '.dialog',
    '.toast',
  ],
};

/**
 * Extract critical CSS selectors from stylesheet
 */
export function extractCriticalSelectors(
  stylesheet: CSSStyleSheet,
  config: CriticalCSSConfig = {}
): string[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const criticalSelectors: Set<string> = new Set();

  // Add force-included selectors
  cfg.forceInclude.forEach(selector => criticalSelectors.add(selector));

  try {
    const rules = Array.from(stylesheet.cssRules || []);

    for (const rule of rules) {
      if (rule instanceof CSSStyleRule) {
        const selector = rule.selectorText;

        // Skip force-excluded selectors
        if (cfg.forceExclude.some(excluded => selector.includes(excluded))) {
          continue;
        }

        // Include if selector matches critical patterns
        if (isCriticalSelector(selector)) {
          criticalSelectors.add(selector);
        }
      }
    }
  } catch (error) {
    console.warn('Could not access stylesheet rules:', error);
  }

  return Array.from(criticalSelectors);
}

/**
 * Determine if a selector is critical (above-the-fold)
 */
function isCriticalSelector(selector: string): boolean {
  const criticalPatterns = [
    // Layout elements
    /^(html|body|main|header|nav)\b/,
    // Theme and root variables
    /^:root/,
    /^\[data-theme/,
    /^\.dark\b/,
    // Hero/above-fold components
    /\.hero/,
    /\.banner/,
    /\.navbar/,
    /\.header/,
    // Critical UI states
    /:focus/,
    /:focus-visible/,
    // Typography (likely visible)
    /^h[1-3]\b/,
    /^\.text-/,
    /^\.font-/,
  ];

  return criticalPatterns.some(pattern => pattern.test(selector));
}

/**
 * Generate critical CSS string from current document
 */
export function generateCriticalCSS(config: CriticalCSSConfig = {}): string {
  const styleSheets = Array.from(document.styleSheets);
  const criticalRules: string[] = [];

  for (const sheet of styleSheets) {
    try {
      const selectors = extractCriticalSelectors(sheet, config);
      const rules = Array.from(sheet.cssRules || []);

      for (const rule of rules) {
        if (rule instanceof CSSStyleRule) {
          if (selectors.includes(rule.selectorText)) {
            criticalRules.push(rule.cssText);
          }
        } else if (rule instanceof CSSMediaRule) {
          // Include critical media queries (mobile-first)
          if (rule.conditionText.includes('max-width')) {
            criticalRules.push(rule.cssText);
          }
        }
      }
    } catch (error) {
      // CORS or other access errors - skip
      console.warn('Could not process stylesheet:', error);
    }
  }

  return criticalRules.join('\n');
}

/**
 * Inline critical CSS into a <style> tag
 */
export function inlineCriticalCSS(config: CriticalCSSConfig = {}): void {
  const criticalCSS = generateCriticalCSS(config);

  if (!criticalCSS) return;

  const styleElement = document.createElement('style');
  styleElement.id = 'critical-css';
  styleElement.textContent = criticalCSS;

  // Insert before any other stylesheets
  const firstLink = document.querySelector('link[rel="stylesheet"]');
  if (firstLink) {
    firstLink.parentNode?.insertBefore(styleElement, firstLink);
  } else {
    document.head.appendChild(styleElement);
  }
}

/**
 * Build-time critical CSS extraction (for use in build scripts)
 */
export interface BuildCriticalCSSOptions {
  /** HTML content to analyze */
  html: string;
  /** CSS content to extract from */
  css: string;
  /** Configuration */
  config?: CriticalCSSConfig;
}

export function buildCriticalCSS(options: BuildCriticalCSSOptions): string {
  const { html, css, config = {} } = options;
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Extract selectors present in HTML
  const htmlSelectors = extractSelectorsFromHTML(html);

  // Filter CSS to only include critical selectors
  const criticalCSS = css
    .split('}')
    .filter(rule => {
      const selector = rule.split('{')[0]?.trim();
      if (!selector) return false;

      // Check if selector is in HTML or force-included
      return (
        cfg.forceInclude.some(inc => selector.includes(inc)) ||
        htmlSelectors.some(htmlSel => selector.includes(htmlSel)) ||
        isCriticalSelector(selector)
      );
    })
    .join('}');

  return criticalCSS;
}

/**
 * Extract class names and IDs from HTML string
 */
function extractSelectorsFromHTML(html: string): string[] {
  const selectors: Set<string> = new Set();

  // Extract class names
  const classMatches = html.matchAll(/class=["']([^"']+)["']/g);
  for (const match of classMatches) {
    const classes = match[1].split(/\s+/);
    classes.forEach(cls => selectors.add(`.${cls}`));
  }

  // Extract IDs
  const idMatches = html.matchAll(/id=["']([^"']+)["']/g);
  for (const match of idMatches) {
    selectors.add(`#${match[1]}`);
  }

  // Extract data attributes
  const dataMatches = html.matchAll(/data-([a-z-]+)/g);
  for (const match of dataMatches) {
    selectors.add(`[data-${match[1]}]`);
  }

  return Array.from(selectors);
}
