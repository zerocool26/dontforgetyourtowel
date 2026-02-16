import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { isLegacyRouteUrl } from '../utils/legacy-routes';

type SearchItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  // NOTE: URLs in this index should be base-agnostic.
  // Consumers (e.g. CommandPalette) must apply withBasePath() to navigate.
  url: string;
  date: string;
  tags: string[];
};

export async function GET() {
  const caseStudies: CollectionEntry<'caseStudies'>[] =
    await getCollection('caseStudies');
  const blogPosts: CollectionEntry<'blog'>[] = await getCollection('blog');

  const caseStudyItems: SearchItem[] = caseStudies.map(entry => ({
    id: `case-${entry.id}`,
    title: entry.data.title,
    description: entry.data.summary,
    category: 'Case Study',
    // NOTE: URLs in this index should be base-agnostic.
    // Consumers (e.g. CommandPalette) must apply withBasePath() to navigate.
    url: 'services/#case-studies',
    date: (entry.data.published ?? new Date()).toISOString(),
    tags: ['case-study', entry.data.industry, ...(entry.data.tags ?? [])],
  }));

  const blogItems: SearchItem[] = blogPosts
    .filter(entry => !entry.data.draft)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
    .map(entry => ({
      id: `blog-${entry.id}`,
      title: entry.data.title,
      description: entry.data.description,
      category: 'Page',
      // Base-agnostic URL (consumer applies withBasePath)
      url: `blog/${entry.id}/`,
      date: entry.data.pubDate.toISOString(),
      tags: ['blog', ...(entry.data.tags ?? [])],
    }));

  const staticPages = [
    {
      id: 'page-home',
      title: 'Home',
      description: 'Enterprise IT solutions that scale with your business',
      category: 'Page',
      url: '/',
      tags: ['home', 'landing'],
    },
    {
      id: 'page-about',
      title: 'About Us',
      description: 'Company story, leadership, and certifications',
      category: 'Page',
      url: 'about/',
      tags: ['about', 'team'],
    },
    {
      id: 'page-services',
      title: 'Services',
      description: 'Managed IT, cybersecurity, cloud, and AI consulting',
      category: 'Page',
      url: 'services/',
      tags: ['services', 'msp', 'security', 'cloud', 'ai'],
    },
    {
      id: 'page-pricing',
      title: 'Pricing',
      description: 'Transparent tiers and calculators for planning',
      category: 'Page',
      url: 'pricing/',
      tags: ['pricing', 'tiers', 'calculator'],
    },
    {
      id: 'page-contact',
      title: 'Contact',
      description: 'Get in touch for a consultation or support',
      category: 'Page',
      url: 'contact/',
      tags: ['contact', 'email', 'support'],
    },
    {
      id: 'page-shop-demo',
      title: 'Shop Demo',
      description: 'A realistic e-commerce shopping experience demo',
      category: 'Page',
      url: 'shop-demo/',
      tags: ['demo', 'shop', 'ecommerce', 'cart', 'checkout'],
    },
    {
      id: 'page-privacy',
      title: 'Privacy Policy',
      description: 'How we handle data and privacy',
      category: 'Page',
      url: 'privacy/',
      tags: ['privacy', 'legal'],
    },
    {
      id: 'page-terms',
      title: 'Terms of Service',
      description: 'Service terms and conditions',
      category: 'Page',
      url: 'terms/',
      tags: ['terms', 'legal'],
    },
  ].map(
    (page): SearchItem => ({
      ...page,
      date: new Date().toISOString(),
    })
  );

  const searchItems: SearchItem[] = [
    ...caseStudyItems,
    ...blogItems,
    ...staticPages,
  ].filter(item => !isLegacyRouteUrl(item.url));

  return new Response(JSON.stringify(searchItems), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
