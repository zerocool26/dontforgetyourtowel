import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['html'], ['list'], ['github']]
    : [['html'], ['list']],
  use: {
    // NOTE: Do not use BASE_URL here.
    // This repo's deployment config treats BASE_URL as a *base path* hint,
    // so setting it to a full URL would break Astro's `base`.
    baseURL: (() => {
      const normalizeBasePath = (value: string) => {
        const trimmed = String(value || '').trim();
        if (!trimmed || trimmed === '/') return '/';
        const noSlashes = trimmed.replace(/^\/+/g, '').replace(/\/+$/g, '');
        return `/${noSlashes}/`;
      };

      const basePath = normalizeBasePath(
        process.env.E2E_BASE_PATH ?? '/dontforgetyourtowel/'
      );
      const fallback = `http://localhost:4321${basePath === '/' ? '/' : basePath}`;
      return process.env.PLAYWRIGHT_BASE_URL || fallback;
    })(),
    // `reducedMotion` is a browser context option; keep it nested so TS stays happy
    // across Playwright type versions.
    contextOptions: {
      reducedMotion: 'reduce',
    },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    ...(process.platform === 'win32'
      ? []
      : [
          {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
          },
        ]),
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    ...(process.platform === 'win32'
      ? []
      : [
          {
            name: 'Mobile Safari',
            use: { ...devices['iPhone 12'] },
          },
        ]),
  ],

  webServer: {
    // Build + preview the static output so E2E is deterministic.
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4321',
    url:
      process.env.PLAYWRIGHT_BASE_URL ||
      `http://localhost:4321${
        (process.env.E2E_BASE_PATH ?? '/dontforgetyourtowel/')
          .toString()
          .startsWith('/')
          ? (process.env.E2E_BASE_PATH ?? '/dontforgetyourtowel/')
          : `/${process.env.E2E_BASE_PATH ?? 'dontforgetyourtowel'}/`
      }`,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
