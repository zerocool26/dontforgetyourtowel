// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

import { createDeploymentConfig } from '../config/deployment.js';

/**
 * Site Configuration Constants
 * Central location for all site-wide configuration values
 */
const DEPLOYMENT = createDeploymentConfig(
  import.meta.env as unknown as Record<string, string>
);
const analyticsFlag =
  typeof import.meta.env !== 'undefined'
    ? import.meta.env.PUBLIC_ENABLE_ANALYTICS
    : process.env.PUBLIC_ENABLE_ANALYTICS;
const analyticsEnabled =
  analyticsFlag === 'true' || analyticsFlag === '1' || analyticsFlag === true;

// MSP/IT services branding (safe defaults; customise as needed)
export const SITE_TITLE = 'Olive Global Systems';
export const SITE_DESCRIPTION =
  'Elite-tier IT architecture, autonomous AI engineering, and next-gen cybersecurity for global enterprises. Leading the 2026 technology transition.';
export const SITE_URL = DEPLOYMENT.siteUrl;
export const BASE_PATH = import.meta.env.BASE_URL ?? DEPLOYMENT.basePath;
export const DEPLOYMENT_CONFIG = DEPLOYMENT;

// Static site contact: uses a mailto: link (configurable via env for later)
export const CONTACT_EMAIL =
  (import.meta.env.PUBLIC_CONTACT_EMAIL as string | undefined) ||
  'hello@example.com';

export const SITE_CONFIG = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  author: 'Olive Chicago',
  defaultLanguage: 'en-US',
  // Social links
  social: {
    github: DEPLOYMENT.repoUrl || 'https://github.com',
  },
  // SEO
  seo: {
    ogImage: '/og-image.png',
    twitterCard: 'summary_large_image' as const,
  },
  // Navigation
  nav: {
    maxMenuItems: 8,
    showSearchInHeader: true,
  },
} as const;

/**
 * Theme configuration
 */
export const THEME_CONFIG = {
  defaultTheme: 'dark' as const,
  storageKey: 'ep-theme-preference',
  supportedThemes: ['light', 'dark', 'system'] as const,
} as const;

/**
 * API/Integration configuration
 */
export const API_CONFIG = {
  baseUrl: import.meta.env.PUBLIC_API_URL || '',
  timeout: 10000,
  retryAttempts: 3,
} as const;

/**
 * Performance budgets (in bytes)
 */
export const PERFORMANCE_BUDGETS = {
  maxBundleSize: 250_000, // 250KB
  maxImageSize: 200_000, // 200KB
  maxFontSize: 100_000, // 100KB
} as const;

/**
 * Feature flags
 */
export const FEATURES = {
  enableAnalytics: analyticsEnabled,
  enablePWA: true,
  enableDarkMode: true,
  enableSearch: true,
  // MSP site: no blog/RSS by default (can be re-enabled later)
  enableRSS: false,
} as const;
