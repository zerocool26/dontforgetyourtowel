import { createDeploymentConfig } from '../../config/deployment.js';

const deployment = createDeploymentConfig();

const readPublicEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined && value !== '') {
      return value;
    }
  }

  return undefined;
};

const analyticsFlag = readPublicEnv(
  'PUBLIC_ENABLE_ANALYTICS',
  'NEXT_PUBLIC_ENABLE_ANALYTICS'
);
const analyticsEnabled = analyticsFlag === 'true' || analyticsFlag === '1';

export const SITE_TITLE = 'Olive Global Systems';
export const SITE_DESCRIPTION =
  'Chicago-area managed IT, cybersecurity, cloud, Microsoft 365, backup, networking, and digital systems for growth-minded teams.';
export const SITE_URL = deployment.siteUrl;
export const BASE_PATH = deployment.basePath;
export const CONTACT_EMAIL =
  readPublicEnv('PUBLIC_CONTACT_EMAIL', 'NEXT_PUBLIC_CONTACT_EMAIL') ||
  'hello@example.com';

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
  baseUrl: readPublicEnv('PUBLIC_API_URL', 'NEXT_PUBLIC_API_URL') || '',
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
