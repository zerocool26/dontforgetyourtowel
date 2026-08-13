import { createDeploymentConfig } from '../config/deployment.js';

const deployment = createDeploymentConfig(
  import.meta.env as unknown as Record<string, string>
);

const readPublicEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = import.meta.env[key as keyof ImportMetaEnv];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

export const SITE_TITLE = 'CHICAGOS #1 MSP';
export const SITE_DESCRIPTION =
  'Technology strategy, custom software, cloud, cybersecurity, and managed IT from one accountable Chicago team.';
export const SITE_URL = deployment.siteUrl;
export const BASE_PATH = import.meta.env.BASE_URL ?? deployment.basePath;
export const CONTACT_EMAIL =
  readPublicEnv('PUBLIC_CONTACT_EMAIL', 'NEXT_PUBLIC_CONTACT_EMAIL') ||
  'hello@chicagos1msp.com';
export const CONTACT_CALENDAR_URL = readPublicEnv(
  'PUBLIC_CONTACT_CALENDAR_URL',
  'NEXT_PUBLIC_CONTACT_CALENDAR_URL'
);
