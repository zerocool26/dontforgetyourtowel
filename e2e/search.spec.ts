import { test, expect } from '@playwright/test';

test.describe('Search index discoverability', () => {
  test('serves searchable route inventory', async ({ request }) => {
    const response = await request.get('./search-index.json');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test('includes live priority routes and excludes legacy routes', async ({
    request,
  }) => {
    const response = await request.get('./search-index.json');
    expect(response.ok()).toBeTruthy();

    const items = (await response.json()) as Array<{ url?: string }>;
    const urls = items
      .map(item => item.url)
      .filter((url): url is string => typeof url === 'string');

    expect(urls).toContain('services/');
    expect(urls).toContain('contact-hq/');
    expect(urls).toContain('demo-lab/');
    expect(urls).toContain('about/');

    expect(urls).not.toContain('dashboard/');
    expect(urls).not.toContain('dashboard-v2/');
    expect(urls).not.toContain('demo/');
    expect(urls).not.toContain('utility-demo/');
  });

  test('contains expected searchable metadata for demo-lab', async ({
    request,
  }) => {
    const response = await request.get('./search-index.json');
    expect(response.ok()).toBeTruthy();

    const items = (await response.json()) as Array<{
      id?: string;
      title?: string;
      tags?: string[];
      url?: string;
    }>;

    const demoLab = items.find(item => item.url === 'demo-lab/');
    expect(demoLab).toBeTruthy();
    expect(demoLab?.id).toContain('demo-lab');
    expect((demoLab?.tags ?? []).some(tag => /demo|lab|3d/i.test(tag))).toBe(
      true
    );
  });
});
