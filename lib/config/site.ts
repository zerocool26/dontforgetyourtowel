import { createDeploymentConfig } from '../../config/deployment.js';

const deployment = createDeploymentConfig();

const analyticsFlag = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS;
const analyticsEnabled = analyticsFlag === 'true' || analyticsFlag === '1';

export const SITE_TITLE = 'Olive Global Systems';
export const SITE_DESCRIPTION =
  'Integrated trade platform across mechanical, electrical, plumbing, general contracting, commercial HVAC, auto repair, and MSP services.';
export const SITE_URL = deployment.siteUrl;
export const BASE_PATH = deployment.basePath;
export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'hello@example.com';

export const SITE_CONFIG = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  author: 'Olive Global Systems',
  defaultLanguage: 'en-US',
  social: {
    github: deployment.repoUrl || 'https://github.com',
  },
  seo: {
    ogImage: '/og-image.png',
    twitterCard: 'summary_large_image' as const,
  },
} as const;

export const THEME_CONFIG = {
  defaultTheme: 'ops-center' as const,
  storageKey: 'olive-theme-preference',
  supportedThemes: ['ops-center', 'corporate', 'terminal'] as const,
} as const;

export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || '',
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
