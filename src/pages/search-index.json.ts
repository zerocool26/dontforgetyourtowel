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
      title: 'Portfolio Shop Demo',
      description:
        'Interactive e-commerce portfolio lab with search, compare, cart persistence, and checkout simulation',
      category: 'Page',
      url: 'about/',
      tags: [
        'portfolio',
        'shop-demo',
        'ecommerce',
        'checkout',
        'filters',
        'cart',
      ],
    },
    {
      id: 'page-about-demo-cart',
      title: 'Portfolio Demo — Cart Launch',
      description: 'Open the ecommerce demo directly into cart mode',
      category: 'Page',
      url: 'about/?demo=cart#shop-experience',
      tags: ['portfolio', 'shop-demo', 'cart', 'launch'],
    },
    {
      id: 'page-about-demo-compare',
      title: 'Portfolio Demo — Compare Launch',
      description: 'Open the ecommerce demo with compare mode active',
      category: 'Page',
      url: 'about/?demo=compare#shop-experience',
      tags: ['portfolio', 'shop-demo', 'compare', 'launch'],
    },
    {
      id: 'page-about-demo-checkout',
      title: 'Portfolio Demo — Checkout Launch',
      description: 'Open the ecommerce demo in checkout simulation mode',
      category: 'Page',
      url: 'about/?demo=checkout&product=aurora-hoodie#shop-experience',
      tags: ['portfolio', 'shop-demo', 'checkout', 'launch'],
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
      id: 'page-contact-hq',
      title: 'Contact',
      description: 'Project intake, support channels, and engagement kickoff',
      category: 'Page',
      url: 'contact-hq/',
      tags: ['contact', 'intake', 'support', 'project'],
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

  const searchItems: SearchItem[] = [...caseStudyItems, ...staticPages].filter(
    item => !isLegacyRouteUrl(item.url)
  );

  return new Response(JSON.stringify(searchItems), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
