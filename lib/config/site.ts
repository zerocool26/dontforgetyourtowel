import { createDeploymentConfig } from './deployment';

const deployment = createDeploymentConfig();

const analyticsFlag = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS;
const analyticsEnabled = analyticsFlag === 'true' || analyticsFlag === '1';

export const SITE_TITLE = 'Olive Chicago';
export const SITE_DESCRIPTION =
  'Enterprise-grade managed IT, cybersecurity, cloud, and AI consulting for growing businesses.';
export const SITE_URL = deployment.siteUrl;
export const BASE_PATH = deployment.basePath;
export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'hello@example.com';

export const SITE_CONFIG = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  author: 'Olive Chicago',
  defaultLanguage: 'en-US',
  social: {
    github: deployment.repo.url || 'https://github.com',
  },
  seo: {
    ogImage: '/og-image.png',
    twitterCard: 'summary_large_image' as const,
  },
} as const;

export const THEME_CONFIG = {
  defaultTheme: 'dark' as const,
  storageKey: 'ep-theme-preference',
  supportedThemes: ['light', 'dark', 'system'] as const,
} as const;

export const API_CONFIG = {
  baseUrl: deployment.apiUrl,
  timeout: 10000,
  retryAttempts: 3,
} as const;

export const FEATURES = {
  enableAnalytics: analyticsEnabled,
  enablePWA: true,
  enableDarkMode: true,
  enableSearch: true,
  enableRSS: false,
} as const;
