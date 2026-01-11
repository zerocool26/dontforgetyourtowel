import type { APIRoute } from 'astro';
import { SITE_URL } from '../consts';

export const prerender = true;

export const GET: APIRoute = () => {
  const sitemapUrl = new URL('sitemap-index.xml', SITE_URL).toString();
  const legacyDisallow = [
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

  const body = `User-agent: *
Allow: /
${legacyDisallow.map(p => `Disallow: ${p}/`).join('\n')}

Sitemap: ${sitemapUrl}
`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
