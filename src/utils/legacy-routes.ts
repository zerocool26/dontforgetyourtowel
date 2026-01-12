import { isLegacyRoutePath } from '../../config/legacyRoutes.js';

function stripHashAndQuery(value: string): string {
  const noHash = value.split('#')[0] ?? '';
  return noHash.split('?')[0] ?? '';
}

/**
 * Normalizes a base-agnostic route-ish string (e.g. `services/`, `/demo-lab/`,
 * `services/#case-studies`, or a full URL) into a pathname for legacy matching.
 */
export function normalizePathnameFromUrlish(urlish: string): string {
  const raw = String(urlish ?? '').trim();

  if (raw === '' || raw === '#') return '/';

  // Handle absolute URLs when available.
  try {
    const asUrl = new URL(raw);
    const pathname = asUrl.pathname || '/';
    return pathname.startsWith('/') ? pathname : `/${pathname}`;
  } catch {
    // Not an absolute URL; treat as base-agnostic route.
  }

  const stripped = stripHashAndQuery(raw);
  if (stripped === '' || stripped === '/') return '/';

  const leading = stripped.startsWith('/') ? stripped : `/${stripped}`;
  return leading.replace(/\/{2,}/g, '/');
}

export function isLegacyRouteUrl(urlish: string): boolean {
  const pathname = normalizePathnameFromUrlish(urlish);
  return isLegacyRoutePath(pathname);
}
