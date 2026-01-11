import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';
import astroPlugin from 'eslint-plugin-astro';
import astroParser from 'astro-eslint-parser';
import tailwind from 'eslint-plugin-tailwindcss';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  // Base JS/TS recommended configs
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    plugins: {
      '@typescript-eslint': tseslint,
    },
    languageOptions: {
      parser,
      globals: {
        ...globals.node,
        ...globals.browser,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-expressions': 'warn',
      'no-console': 'off',
      'no-undef': 'off', // TypeScript handles this
    },
  },
  // Astro specific parsing + rules
  {
    files: ['**/*.astro'],
    languageOptions: {
      parser: astroParser,
      globals: {
        ...globals.node,
        ...globals.browser,
      },
      parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.astro'],
      },
    },
    plugins: {
      astro: astroPlugin,
    },
    rules: {
      ...astroPlugin.configs.recommended.rules,
      'astro/no-set-html-directive': 'warn',
      'no-undef': 'off', // Astro components can use globals
    },
  },
  // Tailwind utility class linting
  {
    plugins: { tailwind },
    rules: {
      'tailwindcss/no-custom-classname': 'off',
    },
  },
  // Ignore generated & build output
  {
    ignores: [
      'dist',
      '.astro',
      'node_modules',
      'coverage',
      'playwright-report',
      'test-results',
      // Legacy/demo routes kept only for compatibility or archives
      'src/pages/blog/**',
      'src/pages/components.astro',
      'src/pages/dashboard.astro',
      'src/pages/dashboard-v2.astro',
      'src/pages/demo.astro',
      'src/pages/error-dashboard.astro',
      'src/pages/offline.astro',
      'src/pages/showcase.astro',
      'src/pages/ultimate-3d-gallery.astro',
      'src/pages/utility-demo.astro',
      'src/pages/visual-showcase.astro',
      'src/pages/rss.xml.js',
    ],
  },
  // Prettier last to disable stylistic conflicts
  prettier,
];
