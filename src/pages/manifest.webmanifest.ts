import type { APIRoute } from 'astro';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { withBasePath } from '../utils/url';

export const prerender = true;

export const GET: APIRoute = () => {
  const manifest = {
    name: SITE_TITLE,
    short_name: 'GPP',
    description: SITE_DESCRIPTION,
    start_url: withBasePath(''),
    scope: withBasePath(''),
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#6366f1',
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
        name: 'Contact',
        short_name: 'Contact',
        description: 'Email us about a project',
        url: `${withBasePath('services/')}#contact`,
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
