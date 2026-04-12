import type { APIRoute } from 'astro';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { withBasePath } from '../utils/url';

export const prerender = true;

export const GET: APIRoute = () => {
  const manifest = {
    name: SITE_TITLE,
    short_name: 'OGS',
    description: SITE_DESCRIPTION,
    start_url: withBasePath(''),
    scope: withBasePath(''),
    display: 'standalone',
    background_color: '#070807',
    theme_color: '#d7f75b',
    orientation: 'portrait-primary',
    categories: ['business', 'productivity', 'portfolio'],
    icons: [
      {
        src: withBasePath('favicon-192.png'),
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: withBasePath('favicon-512.png'),
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Services',
        short_name: 'Services',
        description: 'Explore service offerings',
        url: withBasePath('services/'),
        icons: [{ src: withBasePath('favicon-192.png'), sizes: '192x192' }],
      },
      {
        name: 'Contact',
        short_name: 'Contact',
        description: 'Start project intake and support routing',
        url: withBasePath('contact-hq/'),
        icons: [{ src: withBasePath('favicon-192.png'), sizes: '192x192' }],
      },
      {
        name: 'Portfolio Demo',
        short_name: 'Portfolio',
        description: 'Open interactive ecommerce portfolio experience',
        url: withBasePath('about/#shop-experience'),
        icons: [{ src: withBasePath('favicon-192.png'), sizes: '192x192' }],
      },
    ],
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      'Content-Type': 'application/manifest+json',
    },
  });
};
