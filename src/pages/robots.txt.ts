import type { APIRoute } from 'astro';
import { SITE_URL } from '../consts';
import { LEGACY_ROUTE_BASES } from '../../config/legacyRoutes.js';

export const prerender = true;

export const GET: APIRoute = () => {
  const sitemapUrl = new URL('sitemap-index.xml', SITE_URL).toString();
  const legacyDisallow = LEGACY_ROUTE_BASES;

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
