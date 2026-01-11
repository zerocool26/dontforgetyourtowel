// @ts-check
import 'dotenv/config';

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import preact from '@astrojs/preact';
import solid from '@astrojs/solid-js';
import { defineConfig } from 'astro/config';

import { createDeploymentConfig } from './config/deployment.js';

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
        const legacyPrefixes = [
          '/blog',
          '/components',
          '/dashboard',
          '/dashboard-v2',
          '/demo',
          '/error-dashboard',
          '/showcase',
          '/ultimate-3d-gallery',
          '/utility-demo',
          '/visual-showcase',
        ];
        return !legacyPrefixes.some(prefix => page.startsWith(prefix));
      },
    }),
    tailwind({
      applyBaseStyles: false,
      configFile: './tailwind.config.ts',
    }),
    preact(),
    solid(),
  ],
});
