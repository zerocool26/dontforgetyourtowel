import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { isLegacyRouteUrl } from '../utils/legacy-routes';
import { tradeProfiles } from '../data/trades';
import {
  getTradeOperations,
  getTradeSubpageOperations,
} from '../data/trade-operations';

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
        'Chicago managed IT homepage for support, security, Microsoft 365, cloud, and premium digital proof',
      category: 'Page',
      url: '/',
      tags: ['home', 'landing', 'managed it', 'security', 'cloud', 'm365'],
    },
    {
      id: 'page-gallery',
      title: 'Design Gallery',
      description:
        'Interactive gallery of cinematic visual studies with filters, view modes, and links back into the live site',
      category: 'Page',
      url: 'gallery/',
      tags: ['gallery', 'design', 'art', 'creative', 'interface', 'premium'],
    },
    {
      id: 'page-about',
      title: 'Experience Lab',
      description:
        'Interactive experience lab with search, compare, cart persistence, and checkout simulation',
      category: 'Page',
      url: 'about/',
      tags: [
        'experience-lab',
        'shop-demo',
        'ecommerce',
        'checkout',
        'filters',
        'cart',
      ],
    },
    {
      id: 'page-about-demo-cart',
      title: 'Experience Lab — Cart Launch',
      description: 'Open the ecommerce demo directly into cart mode',
      category: 'Page',
      url: 'about/?demo=cart#shop-experience',
      tags: ['experience-lab', 'shop-demo', 'cart', 'launch'],
    },
    {
      id: 'page-about-demo-compare',
      title: 'Experience Lab — Compare Launch',
      description: 'Open the ecommerce demo with compare mode active',
      category: 'Page',
      url: 'about/?demo=compare#shop-experience',
      tags: ['experience-lab', 'shop-demo', 'compare', 'launch'],
    },
    {
      id: 'page-about-demo-checkout',
      title: 'Experience Lab — Checkout Launch',
      description: 'Open the ecommerce demo in checkout simulation mode',
      category: 'Page',
      url: 'about/?demo=checkout&product=aurora-hoodie#shop-experience',
      tags: ['experience-lab', 'shop-demo', 'checkout', 'launch'],
    },
    {
      id: 'page-services',
      title: 'Services',
      description:
        'Buyer-focused solution hub for managed IT, security, Microsoft 365, cloud, and premium digital delivery',
      category: 'Page',
      url: 'services/',
      tags: ['services', 'managed it', 'security', 'cloud', 'm365'],
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
    (() => {
      const operations = getTradeOperations(trade.slug);
      return {
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
          operations.operatingModel.toLowerCase(),
          operations.serviceRhythm.toLowerCase(),
          ...operations.ownerOutputs.map(item => item.toLowerCase()),
          ...operations.standards.map(item => item.toLowerCase()),
          ...trade.subpages.map(subpage => subpage.shortLabel.toLowerCase()),
        ],
      };
    })(),
    ...trade.subpages.map(subpage => {
      const operations = getTradeSubpageOperations(trade.slug, subpage.slug);
      return {
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
          ...(operations?.requiredInputs.map(item => item.toLowerCase()) ?? []),
          ...(operations?.fieldChecklist.map(item => item.toLowerCase()) ?? []),
          ...(operations?.ownerDeliverables.map(item => item.toLowerCase()) ??
            []),
        ],
      };
    }),
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
