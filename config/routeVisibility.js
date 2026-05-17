const HIDDEN_PUBLIC_ROUTE_PATTERNS = [
  /^\/(?:debug-webgl|dashboard(?:-v2)?|demo(?:-lab)?|hero-lab|utility-demo|visual-showcase|ultimate-3d-gallery|components|error-dashboard|mobile-features-demo|showcase|shop-demo)(?:\/|$)/,
  /^\/(?:gallery|photos)(?:\/|$)/,
  /^\/trades(?:\/|$)/,
];

function normalizeRouteInput(value) {
  try {
    const parsed = new URL(value, 'https://olivechicago.local');
    return parsed.pathname.replace(/\/+$/, '') || '/';
  } catch {
    return String(value).replace(/\/+$/, '') || '/';
  }
}

export function isHiddenPublicRoutePath(value) {
  const path = normalizeRouteInput(value);
  return HIDDEN_PUBLIC_ROUTE_PATTERNS.some(pattern => pattern.test(path));
}

export { HIDDEN_PUBLIC_ROUTE_PATTERNS };
