/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';
import { GET as manifestGET } from '../pages/manifest.webmanifest.ts';
import { GET as robotsGET } from '../pages/robots.txt.ts';
import { GET as securityGET } from '../pages/.well-known/security.txt.ts';
import { GET as rssGET } from '../pages/rss.xml.js';

describe('Runtime routes', () => {
  it('emits a base-aware manifest', async () => {
    const res = await manifestGET({} as any);
    expect(res.status).toBe(200);

    const manifest = await res.json();
    expect(manifest.short_name).toBe('OC');
    expect(manifest.background_color).toBe('#070807');
    expect(typeof manifest.start_url).toBe('string');
    expect(typeof manifest.scope).toBe('string');
    expect(manifest.start_url.startsWith('/')).toBe(true);
    expect(manifest.scope.startsWith('/')).toBe(true);
    expect(manifest.start_url.endsWith('/')).toBe(true);
    expect(manifest.scope.endsWith('/')).toBe(true);
    expect(manifest.icons.every((icon: any) => icon.src.startsWith('/'))).toBe(
      true
    );
    const shortcutUrls = (manifest.shortcuts ?? []).map((s: any) => s.url);
    expect(shortcutUrls.some((u: any) => String(u).includes('services'))).toBe(
      true
    );
    expect(
      shortcutUrls.some((u: any) => String(u).includes('contact-hq'))
    ).toBe(true);
    expect(shortcutUrls.some((u: any) => String(u).includes('about'))).toBe(
      true
    );
  });

  it('emits robots.txt with sitemap pointing to the canonical site', async () => {
    const res = await robotsGET({} as any);
    expect(res.status).toBe(200);

    const text = await res.text();
    expect(text).toContain('Sitemap: ');
    expect(text.trim().endsWith('sitemap-index.xml')).toBe(true);
  });

  it('emits security.txt with a rolling expiry', async () => {
    const res = await securityGET({} as any);
    expect(res.status).toBe(200);

    const text = await res.text();
    const match = text.match(/(?:^|\n)Expires:\s*(.*)/i);
    expect(match).toBeTruthy();

    const expiry = new Date(match?.[1] ?? '');
    expect(expiry.getTime()).toBeGreaterThan(Date.now());
  });

  it('emits the active blog rss.xml feed', async () => {
    const res = await rssGET({
      site: new URL('https://olivechicago.test/'),
    } as any);
    expect(res.status).toBe(200);

    const contentType = res.headers.get('Content-Type') ?? '';
    expect(contentType).toContain('application/xml');

    const text = await res.text();
    expect(text).toContain('<title>Olive Chicago Blog</title>');
    expect(text).toContain('Provider transition checklist');
    expect(text).not.toContain('Draft security note');
  });
});
