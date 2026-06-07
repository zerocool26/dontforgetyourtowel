/**
 * Source of truth for retired public route forwarding.
 *
 * Keys: legacy public paths (without trailing slash)
 * Values: maintained destination paths (can include query/hash)
 */
export const LEGACY_REDIRECT_DESTINATIONS = {
  '/components': '/services/',
  '/dashboard': '/',
  '/dashboard-v2': '/',
  '/demo': '/about/',
  '/demo-lab': '/about/#shop-experience',
  '/error-dashboard': '/',
  '/hero-lab': '/gallery/',
  '/mobile-features-demo': '/about/',
  '/showcase': '/gallery/',
  '/shop-demo': '/about/#shop-experience',
  '/ultimate-3d-gallery': '/about/#shop-experience',
  '/utility-demo': '/about/',
  '/visual-showcase': '/gallery/',
};
