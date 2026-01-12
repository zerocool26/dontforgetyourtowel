/**
 * Legacy / internal-only routes that should not be indexed and should not appear
 * in the public sitemap. Keep this list in sync across robots.txt, sitemap
 * filtering, and any other route-truth sources.
 */

export const LEGACY_ROUTE_BASES = [
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

const trimTrailingSlashes = value =>
  value === '/' ? '/' : String(value).replace(/\/+$/, '');

/**
 * Returns true if a pathname is considered legacy.
 *
 * Important: match by *segment boundary*.
 * Example: '/demo' matches '/demo' and '/demo/', but NOT '/demo-lab/'.
 */
export const isLegacyRoutePath = pathname => {
  const normalized = trimTrailingSlashes(pathname);
  return LEGACY_ROUTE_BASES.some(
    base => normalized === base || normalized.startsWith(`${base}/`)
  );
};
