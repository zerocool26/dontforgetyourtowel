import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';
import astroPlugin from 'eslint-plugin-astro';
import * as astroParser from 'astro-eslint-parser';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    plugins: { '@typescript-eslint': tseslint },
    languageOptions: {
      parser,
      globals: { ...globals.node, ...globals.browser },
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      'no-console': 'off',
      'no-undef': 'off',
    },
  },
  {
    files: ['**/*.astro'],
    languageOptions: {
      parser: astroParser,
      globals: { ...globals.node, ...globals.browser },
      parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.astro'],
      },
    },
    plugins: { astro: astroPlugin },
    rules: {
      ...astroPlugin.configs.recommended.rules,
      'no-undef': 'off',
    },
  },
  {
    ignores: [
      'dist/**',
      '.astro/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  prettier,
];
