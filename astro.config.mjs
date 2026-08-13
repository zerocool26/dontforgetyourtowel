// @ts-check
import 'dotenv/config';

import mdx from '@astrojs/mdx';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

import { createDeploymentConfig } from './config/deployment.js';

const { basePath, siteUrl } = createDeploymentConfig();

export default defineConfig({
  base: basePath,
  site: siteUrl,
  output: 'static',
  devToolbar: { enabled: false },
  integrations: [
    mdx(),
    sitemap(),
    preact({ include: ['src/components/**/*.tsx'] }),
  ],
});
