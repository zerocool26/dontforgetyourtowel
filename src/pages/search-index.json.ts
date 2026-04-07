import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { isLegacyRouteUrl } from '../utils/legacy-routes';
import { tradeProfiles } from '../data/trades';

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
      description:
        'Immersive landing page for the seven-trade delivery platform and retained digital showcase',
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
      description:
        'Cross-trade services hub with the retained MSP, security, cloud, AI, and digital systems catalog',
      category: 'Page',
      url: 'services/',
      tags: ['services', 'msp', 'security', 'cloud', 'ai'],
    },
    {
      id: 'page-trades',
      title: 'Trade Directory',
      description:
        'Browse all seven trade lanes across mechanical, electrical, plumbing, general contracting, HVAC, auto repair, and MSP services',
      category: 'Page',
      url: 'trades/',
      tags: [
        'trades',
        'mechanical',
        'electrical',
        'plumbing',
        'general contracting',
        'commercial hvac',
        'auto repair',
        'msp',
      ],
    },
    {
      id: 'page-services-planner',
      title: 'Services Planner',
      description: 'Interactive matrix for choosing the best service lane',
      category: 'Page',
      url: 'services/#service-planner',
      tags: ['services', 'planner', 'comparison', 'matrix', 'roadmap'],
    },
    {
      id: 'page-pricing',
      title: 'Pricing',
      description:
        'Live plans, SLA comparison, pricing calculator, and ROI model',
      category: 'Page',
      url: 'pricing/',
      tags: ['pricing', 'plans', 'quote', 'sla', 'calculator'],
    },
    {
      id: 'page-pricing-estimate',
      title: 'Pricing Estimate Tools',
      description: 'Jump directly to the pricing calculator and ROI model',
      category: 'Page',
      url: 'pricing/#estimate',
      tags: ['pricing', 'estimate', 'roi', 'calculator', 'budget'],
    },
    {
      id: 'page-build-studio',
      title: 'Build Studio',
      description:
        'Flagship interactive showroom for configuring premium digital systems with live planning, investment, and launch logic',
      category: 'Page',
      url: 'build-studio/#studio',
      tags: ['build-studio', 'flagship', 'showcase', 'planner', 'brief'],
    },
    {
      id: 'page-build-studio-ai',
      title: 'Build Studio — AI Operations Room',
      description:
        'Open the Build Studio with the AI operations preset and flagship urgency already applied',
      category: 'Page',
      url: 'build-studio/?preset=ai-operations-room&urgency=flagship#studio',
      tags: ['build-studio', 'ai', 'automation', 'operations', 'flagship'],
    },
    {
      id: 'page-build-studio-commerce',
      title: 'Build Studio — Commerce Cinematic',
      description:
        'Open the premium commerce preset with launch planning and interactive showroom positioning',
      category: 'Page',
      url: 'build-studio/?preset=commerce-cinematic#studio',
      tags: ['build-studio', 'commerce', 'showroom', 'pricing', 'conversion'],
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

  const tradeItems: SearchItem[] = tradeProfiles.flatMap(trade => [
    {
      id: `trade-${trade.slug}`,
      title: trade.name,
      description: trade.summary,
      category: 'Page',
      url: `trades/${trade.slug}/`,
      date: new Date().toISOString(),
      tags: [
        'trade',
        trade.name.toLowerCase(),
        trade.shortName.toLowerCase(),
        ...trade.subpages.map(subpage => subpage.shortLabel.toLowerCase()),
      ],
    },
    ...trade.subpages.map(subpage => ({
      id: `trade-${trade.slug}-${subpage.slug}`,
      title: `${trade.name} — ${subpage.title}`,
      description: subpage.description,
      category: 'Page',
      url: `trades/${trade.slug}/${subpage.slug}/`,
      date: new Date().toISOString(),
      tags: [
        'trade',
        trade.name.toLowerCase(),
        subpage.title.toLowerCase(),
        subpage.shortLabel.toLowerCase(),
      ],
    })),
  ]);

  const searchItems: SearchItem[] = [
    ...caseStudyItems,
    ...staticPages,
    ...tradeItems,
  ].filter(item => !isLegacyRouteUrl(item.url));

  return new Response(JSON.stringify(searchItems), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
