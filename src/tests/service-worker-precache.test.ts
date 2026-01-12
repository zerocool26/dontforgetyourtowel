import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { isLegacyRoutePath } from '../../config/legacyRoutes.js';

const projectRoot = process.cwd();

function extractStaticAssetPaths(swSource: string): string[] {
  // Matches: const STATIC_ASSET_PATHS = [ ... ];
  const match = swSource.match(
    /const\s+STATIC_ASSET_PATHS\s*=\s*\[(?<body>[\s\S]*?)\];/m
  );
  if (!match?.groups?.body) {
    throw new Error('Could not find STATIC_ASSET_PATHS in public/sw.js');
  }

  // Extract string literals only (single or double quotes)
  const items = Array.from(match.groups.body.matchAll(/['"]([^'"]*)['"]/g))
    .map(m => m[1])
    .filter(v => typeof v === 'string');

  if (items.length === 0) {
    throw new Error('STATIC_ASSET_PATHS appears to be empty or unparseable');
  }
  return items;
}

describe('service worker precache list', () => {
  it('does not include legacy/robots-disallowed route prefixes', () => {
    const swPath = path.join(projectRoot, 'public', 'sw.js');
    const source = fs.readFileSync(swPath, 'utf8');
    const paths = extractStaticAssetPaths(source);

    // Only validate route-like entries (directories and root). Assets like favicon.png are fine.
    const routeLike = paths.filter(p => p === '' || p.endsWith('/'));

    const violations = routeLike.filter(p => {
      const normalized = p === '' ? '/' : `/${p.replace(/^\/+/, '')}`;
      return isLegacyRoutePath(normalized);
    });

    expect(violations).toEqual([]);
  });
});
