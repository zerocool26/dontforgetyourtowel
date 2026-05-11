import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      'astro:content': fileURLToPath(
        new URL('./src/tests/mocks/astro-content.ts', import.meta.url)
      ),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/tests/vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // Keep resource usage predictable on CI/Windows by avoiding many forked Node processes.
    pool: 'threads',
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/'],
    },
  },
});
