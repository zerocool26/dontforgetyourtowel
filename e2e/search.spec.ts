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
    expect(urls).toContain('about/');
    expect(urls).toContain('about/?demo=cart#shop-experience');

    expect(urls).not.toContain('dashboard/');
    expect(urls).not.toContain('dashboard-v2/');
    expect(urls).not.toContain('demo/');
    expect(urls).not.toContain('demo-lab/');
    expect(urls).not.toContain('shop-demo/');
    expect(urls).not.toContain('utility-demo/');
  });

  test('contains expected searchable metadata for portfolio demo', async ({
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

    const portfolioDemo = items.find(
      item => item.url === 'about/?demo=cart#shop-experience'
    );
    expect(portfolioDemo).toBeTruthy();
    expect(portfolioDemo?.id).toContain('about-demo-cart');
    expect(
      (portfolioDemo?.tags ?? []).some(tag =>
        /portfolio|demo|ecommerce|cart/i.test(tag)
      )
    ).toBe(true);
  });
});
