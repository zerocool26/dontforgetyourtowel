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
    expect(urls).toContain('trust-center/');
    expect(urls).toContain('blog/');
    expect(urls).toContain('pricing/#plans');
    expect(urls).toContain('services/#service-tracks');
    expect(urls).toContain('services/#research-radar');

    expect(urls).not.toContain('dashboard/');
    expect(urls).not.toContain('dashboard-v2/');
    expect(urls).not.toContain('demo/');
    expect(urls).not.toContain('demo-lab/');
    expect(urls).not.toContain('shop-demo/');
    expect(urls).not.toContain('utility-demo/');
    expect(urls).not.toContain('about/?demo=cart#shop-experience');
  });

  test('contains expected searchable metadata for the trust center', async ({
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

    const trustCenter = items.find(item => item.url === 'trust-center/');
    expect(trustCenter).toBeTruthy();
    expect(trustCenter?.id).toContain('trust-center');
    expect(trustCenter?.title).toContain('Trust Center');
    expect(
      (trustCenter?.tags ?? []).some(tag =>
        /trust|proof|backup|customer excellence/i.test(tag)
      )
    ).toBe(true);
  });

  test('indexes buyer decision handoff lanes', async ({ request }) => {
    const response = await request.get('./search-index.json');
    expect(response.ok()).toBeTruthy();

    const items = (await response.json()) as Array<{
      category?: string;
      title?: string;
      tags?: string[];
      url?: string;
    }>;

    const handoffs = items.filter(item => item.category === 'Decision Handoff');
    expect(handoffs).toHaveLength(4);
    expect(handoffs.map(item => item.url)).toEqual(
      expect.arrayContaining([
        'services/#service-tracks',
        'services/#technology-catalog',
        'pricing/#plans',
        'services/#service-planner',
      ])
    );
    expect(handoffs.map(item => item.title)).toEqual(
      expect.arrayContaining([
        'Support ownership handoff',
        'Security baseline handoff',
        'Budget and scope handoff',
        'Workflow trust handoff',
      ])
    );
  });

  test('indexes 2026 research radar resources', async ({ request }) => {
    const response = await request.get('./search-index.json');
    expect(response.ok()).toBeTruthy();

    const items = (await response.json()) as Array<{
      category?: string;
      title?: string;
      tags?: string[];
      url?: string;
    }>;

    const radarItems = items.filter(item => item.category === 'Research Radar');
    expect(radarItems.length).toBeGreaterThanOrEqual(10);
    expect(new Set(radarItems.map(item => item.url))).toEqual(
      new Set(['services/#research-radar'])
    );
    expect(radarItems.map(item => item.title)).toEqual(
      expect.arrayContaining([
        '@astrojs/check',
        'Lighthouse CI',
        'Proof badges and partner signals',
        'Measurable service promises',
        'Accessible polish as a default, not an afterthought',
        'Workflow-first interface density',
        'Core Web Vitals and INP-minded UI',
        'AI-ready content governance',
      ])
    );
    expect(
      radarItems.some(item =>
        (item.tags ?? []).some(tag =>
          /downloaded now|technology radar/i.test(tag)
        )
      )
    ).toBe(true);
  });

  test('uses production blog slugs instead of starter article URLs', async ({
    request,
  }) => {
    const response = await request.get('./search-index.json');
    expect(response.ok()).toBeTruthy();

    const items = (await response.json()) as Array<{ url?: string }>;
    const urls = items
      .map(item => item.url)
      .filter((url): url is string => typeof url === 'string');

    expect(urls).toEqual(
      expect.arrayContaining([
        'blog/managed-it-provider-first-30-days/',
        'blog/chicago-smb-security-baseline/',
        'blog/microsoft-365-cleanup-business-project/',
        'blog/competent-msp-website-signals/',
        'blog/client-intake-workflow-review-before-build/',
      ])
    );
    expect(urls).not.toContain('blog/ecommerce-demo-review-before-build/');
    expect(urls).not.toContain('blog/first-post/');
    expect(urls).not.toContain('blog/second-post/');
    expect(urls).not.toContain('blog/third-post/');
    expect(urls).not.toContain('blog/markdown-style-guide/');
    expect(urls).not.toContain('blog/using-mdx/');
  });
});
