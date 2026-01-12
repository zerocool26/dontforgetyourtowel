import { describe, it, expect } from 'vitest';

import { isLegacyRouteUrl, normalizePathnameFromUrlish } from './legacy-routes';

describe('legacy routes (URL normalization)', () => {
  it('normalizes base-agnostic routes into pathnames', () => {
    expect(normalizePathnameFromUrlish('services/#case-studies')).toBe(
      '/services/'
    );
    expect(normalizePathnameFromUrlish('blog/my-post/')).toBe('/blog/my-post/');
    expect(normalizePathnameFromUrlish('/pricing/')).toBe('/pricing/');
  });

  it('normalizes absolute URLs into pathnames', () => {
    expect(normalizePathnameFromUrlish('https://example.com/demo/')).toBe(
      '/demo/'
    );
  });

  it('detects legacy routes using segment-boundary matching', () => {
    expect(isLegacyRouteUrl('demo/')).toBe(true);
    expect(isLegacyRouteUrl('/demo')).toBe(true);
    expect(isLegacyRouteUrl('/demo/anything')).toBe(true);

    // Important: should not match /demo-lab.
    expect(isLegacyRouteUrl('/demo-lab/')).toBe(false);
  });
});
