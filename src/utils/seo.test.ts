import { describe, it, expect } from 'vitest';
import {
  generateMetaTags,
  generateArticleSchema,
  generateOrganizationSchema,
  generateBreadcrumbSchema,
  getCanonicalUrl,
  truncateMetaDescription,
} from './seo';

describe('generateMetaTags', () => {
  it('generates basic tags', () => {
    const tags = generateMetaTags({
      title: 'Test Title',
      description: 'Test Description',
      url: 'https://example.com',
    });

    expect(tags).toContainEqual({ name: 'title', content: 'Test Title' });
    expect(tags).toContainEqual({
      name: 'description',
      content: 'Test Description',
    });
    expect(tags).toContainEqual({ property: 'og:type', content: 'website' });
    expect(tags).toContainEqual({
      property: 'og:url',
      content: 'https://example.com',
    });
  });

  it('includes image tags when provided', () => {
    const tags = generateMetaTags({
      title: 'Test',
      description: 'Test',
      url: 'https://example.com',
      image: 'https://example.com/image.jpg',
    });

    expect(tags).toContainEqual({
      property: 'og:image',
      content: 'https://example.com/image.jpg',
    });
    expect(tags).toContainEqual({
      name: 'twitter:image',
      content: 'https://example.com/image.jpg',
    });
  });

  it('generates article tags', () => {
    const date = new Date('2023-01-01T00:00:00.000Z');
    const tags = generateMetaTags({
      title: 'Article',
      description: 'Desc',
      url: 'https://example.com/article',
      type: 'article',
      author: 'John Doe',
      publishDate: date,
    });

    expect(tags).toContainEqual({ property: 'og:type', content: 'article' });
    expect(tags).toContainEqual({
      property: 'article:author',
      content: 'John Doe',
    });
    expect(tags).toContainEqual({
      property: 'article:published_time',
      content: date.toISOString(),
    });
  });

  it('includes keywords when provided', () => {
    const tags = generateMetaTags({
      title: 'Test',
      description: 'Test',
      url: 'https://example.com',
      keywords: ['keyword1', 'keyword2'],
    });

    expect(tags).toContainEqual({
      name: 'keywords',
      content: 'keyword1, keyword2',
    });
  });

  it('handles noIndex option', () => {
    const tags = generateMetaTags({
      title: 'Test',
      description: 'Test',
      url: 'https://example.com',
      noIndex: true,
    });

    expect(tags).toContainEqual({
      name: 'robots',
      content: 'noindex, nofollow',
    });
  });

  it('includes site name when provided', () => {
    const tags = generateMetaTags({
      title: 'Test',
      description: 'Test',
      url: 'https://example.com',
      siteName: 'My Site',
    });

    expect(tags).toContainEqual({
      property: 'og:site_name',
      content: 'My Site',
    });
  });

  it('includes twitter handle when provided', () => {
    const tags = generateMetaTags({
      title: 'Test',
      description: 'Test',
      url: 'https://example.com',
      twitterHandle: '@myhandle',
    });

    expect(tags).toContainEqual({
      name: 'twitter:site',
      content: '@myhandle',
    });

    expect(tags).toContainEqual({
      name: 'twitter:creator',
      content: '@myhandle',
    });
  });
});

describe('generateArticleSchema', () => {
  it('generates valid article schema', () => {
    const date = new Date('2023-01-01T00:00:00.000Z');
    const schema = generateArticleSchema({
      title: 'Test Article',
      description: 'Test description',
      author: 'John Doe',
      publishDate: date,
      url: 'https://example.com/article',
    });

    expect(schema).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Test Article',
      description: 'Test description',
      author: {
        '@type': 'Person',
        name: 'John Doe',
      },
      datePublished: date.toISOString(),
      dateModified: date.toISOString(),
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': 'https://example.com/article',
      },
    });
  });

  it('includes image when provided', () => {
    const schema = generateArticleSchema({
      title: 'Test',
      description: 'Test',
      author: 'John',
      publishDate: new Date(),
      url: 'https://example.com',
      image: 'https://example.com/image.jpg',
    });

    expect(schema).toHaveProperty('image');
  });
});

describe('generateOrganizationSchema', () => {
  it('generates valid organization schema', () => {
    const schema = generateOrganizationSchema({
      name: 'My Company',
      url: 'https://example.com',
    });

    expect(schema).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'My Company',
      url: 'https://example.com',
    });
  });

  it('includes optional fields', () => {
    const schema = generateOrganizationSchema({
      name: 'My Company',
      url: 'https://example.com',
      logo: 'https://example.com/logo.png',
      description: 'A great company',
      socialProfiles: ['https://twitter.com/mycompany'],
    });

    expect(schema).toHaveProperty('logo', 'https://example.com/logo.png');
    expect(schema).toHaveProperty('description', 'A great company');
    expect(schema).toHaveProperty('sameAs');
  });
});

describe('generateBreadcrumbSchema', () => {
  it('generates valid breadcrumb schema', () => {
    const schema = generateBreadcrumbSchema([
      { name: 'Home', url: 'https://example.com' },
      { name: 'Services', url: 'https://example.com/services' },
      { name: 'Case Study', url: 'https://example.com/services#case-studies' },
    ]);

    expect(schema).toHaveProperty('@type', 'BreadcrumbList');
    expect(schema).toHaveProperty('itemListElement');
    const items = (schema as { itemListElement: unknown[] }).itemListElement;
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveProperty('position', 1);
  });
});

describe('getCanonicalUrl', () => {
  it('returns absolute URL unchanged', () => {
    const result = getCanonicalUrl(
      'https://example.com/page',
      'https://base.com'
    );
    expect(result).toBe('https://example.com/page');
  });

  it('resolves relative URL against base', () => {
    const result = getCanonicalUrl('/page', 'https://example.com');
    expect(result).toBe('https://example.com/page');
  });
});

describe('truncateMetaDescription', () => {
  it('returns short descriptions unchanged', () => {
    const result = truncateMetaDescription('Short description');
    expect(result).toBe('Short description');
  });

  it('truncates long descriptions at word boundary', () => {
    const longDesc =
      'This is a very long description that needs to be truncated because it exceeds the maximum length allowed for meta descriptions in search results';
    const result = truncateMetaDescription(longDesc, 50);
    expect(result.length).toBeLessThanOrEqual(50);
    expect(result.endsWith('...')).toBe(true);
  });
});
