import { test, expect } from '@playwright/test';

test.describe('SEO + deployment coherence', () => {
  test('robots disallows legacy routes and keeps sitemap discoverable', async ({
    request,
  }) => {
    const response = await request.get('./robots.txt');
    expect(response.ok()).toBeTruthy();

    const body = await response.text();

    expect(body).toContain('Allow: /');
    expect(body).toContain('Sitemap:');

    expect(body).toContain('Disallow: /dashboard/');
    expect(body).toContain('Disallow: /demo/');

    // Demo lab is a current route and must not be blocked by robots rules.
    expect(body).not.toContain('Disallow: /demo-lab/');
  });

  test('search index includes demo-lab and excludes legacy routes', async ({
    request,
  }) => {
    const searchIndexResponse = await request.get('./search-index.json');
    expect(searchIndexResponse.ok()).toBeTruthy();

    const payload = (await searchIndexResponse.json()) as Array<{
      url?: string;
    }>;

    const urls = payload
      .map(item => item.url)
      .filter((url): url is string => typeof url === 'string');

    expect(urls).toContain('demo-lab/');
    expect(urls).not.toContain('dashboard/');
    expect(urls).not.toContain('demo/');
  });
});
