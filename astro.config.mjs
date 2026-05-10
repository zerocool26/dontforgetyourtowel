// @ts-check
import 'dotenv/config';

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import preact from '@astrojs/preact';
import react from '@astrojs/react';
import { defineConfig } from 'astro/config';

import { createDeploymentConfig } from './config/deployment.js';
import { isLegacyRoutePath } from './config/legacyRoutes.js';

const { basePath, siteUrl } = createDeploymentConfig();

export default defineConfig({
  // Base + site are now derived automatically from env/repo for GitHub Pages or any host
  base: basePath,
  site: siteUrl,
  output: 'static',
  vite: {
    build: {
      chunkSizeWarningLimit: 800,
    },
  },
  integrations: [
    mdx(),
    sitemap({
      filter: page => {
        return !isLegacyRoutePath(page);
      },
    }),
    // Avoid ambiguous JSX renderer selection when multiple frameworks are enabled.
    // We intentionally keep both integrations, but scope them to distinct directories.
    preact({
      include: ['src/components/**/*.jsx', 'src/components/**/*.tsx'],
      exclude: ['src/components/react/**'],
    }),
    react({
      include: ['src/components/react/**/*.jsx', 'src/components/react/**/*.tsx'],
    }),
  ],
});
