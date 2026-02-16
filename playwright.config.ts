import { defineConfig, devices } from '@playwright/test';
import { createDeploymentConfig } from './config/deployment.js';

// Ensure Playwright uses the site's configured base path so tests work
// both for repos served at root and for GitHub Pages-style repo bases.
const { basePath } = createDeploymentConfig();

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
    baseURL: `http://localhost:4321${basePath}`,
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
          use: {
            ...devices['Desktop Chrome'],
            launchOptions: {
              args: [
                '--enable-webgl',
                '--ignore-gpu-blocklist',
                '--use-gl=swiftshader',
              ],
            },
          },
        },
      ]
    : [
        {
          name: 'chromium',
          use: {
            ...devices['Desktop Chrome'],
            launchOptions: {
              args: [
                '--enable-webgl',
                '--ignore-gpu-blocklist',
                '--use-gl=swiftshader',
              ],
            },
          },
        },
        {
          name: 'Mobile Chrome',
          use: { ...devices['Pixel 5'] },
        },
        ...(process.env.PLAYWRIGHT_ENABLE_FIREFOX === '1'
          ? [
              {
                name: 'firefox',
                use: { ...devices['Desktop Firefox'] },
              },
            ]
          : []),
        ...(process.platform === 'win32' ||
        process.env.PLAYWRIGHT_ENABLE_WEBKIT !== '1'
          ? []
          : [
              {
                name: 'webkit',
                use: { ...devices['Desktop Safari'] },
              },
              {
                name: 'Mobile Safari',
                use: { ...devices['iPhone 12'] },
              },
            ]),
      ],

  webServer: {
    command: 'npm run dev',
    port: 4321,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
