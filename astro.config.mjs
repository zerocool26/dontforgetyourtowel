// @ts-check
import 'dotenv/config';

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import preact from '@astrojs/preact';
import solid from '@astrojs/solid-js';
import { defineConfig } from 'astro/config';

import { createDeploymentConfig } from './config/deployment.js';
import { isLegacyRoutePath } from './config/legacyRoutes.js';

const { basePath, siteUrl } = createDeploymentConfig();

export default defineConfig({
  // Base + site are now derived automatically from env/repo for GitHub Pages or any host
  base: basePath,
  site: siteUrl,
  output: 'static',
  integrations: [
    mdx(),
    sitemap({
      filter: page => {
        return !isLegacyRoutePath(page);
      },
    }),
    tailwind({
      applyBaseStyles: false,
      configFile: './tailwind.config.ts',
    }),
    // Avoid ambiguous JSX renderer selection when multiple frameworks are enabled.
    // We intentionally keep both integrations, but scope them to distinct directories.
    preact({
      include: ['src/components/**/*.jsx', 'src/components/**/*.tsx'],
      exclude: ['src/components/solid/**'],
    }),
    solid({
      include: ['src/components/solid/**/*'],
    }),
  ],
});
