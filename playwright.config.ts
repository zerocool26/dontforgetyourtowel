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
  timeout: process.env.CI ? 60_000 : 45_000,
  expect: {
    timeout: process.env.CI ? 10_000 : 7_000,
  },
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
        const noSlashes = trimmed.replace(/^\/+/, '').replace(/\/+$/g, '');
        return `/${noSlashes}/`;
      };

      const basePath = normalizeBasePath(
        process.env.E2E_BASE_PATH ?? '/dontforgetyourtowel/'
      );
      const fallback = `http://localhost:4321${basePath === '/' ? '/' : basePath}`;

      const override = process.env.PLAYWRIGHT_BASE_URL;
      if (!override) return fallback;

      // Some runners set PLAYWRIGHT_BASE_URL to a host-only URL (e.g. http://localhost:4321).
      // If Astro is configured with a non-root basePath, that would cause tests to hit / and get 404.
      // Auto-append basePath only when the override URL is rooted at '/'.
      try {
        const url = new URL(override);
        const pathname =
          url.pathname && url.pathname !== '/' ? url.pathname : '/';
        if (pathname === '/' && basePath !== '/') {
          url.pathname = basePath;
        } else if (!url.pathname.endsWith('/')) {
          url.pathname = `${url.pathname}/`;
        }
        return url.toString();
      } catch {
        return override;
      }
    })(),
    // `reducedMotion` is a browser context option; keep it nested so TS stays happy
    // across Playwright type versions.
    contextOptions: {
      reducedMotion: 'reduce',
    },
    actionTimeout: process.env.CI ? 15_000 : 10_000,
    navigationTimeout: process.env.CI ? 30_000 : 20_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: process.env.CI
    ? [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
      ]
    : [
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
    url: (() => {
      const normalizeBasePath = (value: string) => {
        const trimmed = String(value || '').trim();
        if (!trimmed || trimmed === '/') return '/';
        const noSlashes = trimmed.replace(/^\/+/, '').replace(/\/+$/g, '');
        return `/${noSlashes}/`;
      };

      const basePath = normalizeBasePath(
        process.env.E2E_BASE_PATH ?? '/dontforgetyourtowel/'
      );
      const fallback = `http://localhost:4321${basePath === '/' ? '/' : basePath}`;

      const override = process.env.PLAYWRIGHT_BASE_URL;
      if (!override) return fallback;

      try {
        const url = new URL(override);
        const pathname =
          url.pathname && url.pathname !== '/' ? url.pathname : '/';
        if (pathname === '/' && basePath !== '/') {
          url.pathname = basePath;
        } else if (!url.pathname.endsWith('/')) {
          url.pathname = `${url.pathname}/`;
        }
        return url.toString();
      } catch {
        return override;
      }
    })(),
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
