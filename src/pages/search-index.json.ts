import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { isLegacyRouteUrl } from '../utils/legacy-routes';
import { tradeProfiles } from '../data/trades';
import { decisionHandoffLanes } from '../data/decision-handoff';
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

type BlogEntry = CollectionEntry<'blog'>;

export async function GET() {
  const caseStudies: CollectionEntry<'caseStudies'>[] =
    await getCollection('caseStudies');
  const blogPosts = (await getCollection('blog')).filter(
    (entry: BlogEntry) => !entry.data.draft
  );

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

  const blogItems: SearchItem[] = blogPosts.map(entry => ({
    id: `blog-${entry.id}`,
    title: entry.data.title,
    description: entry.data.description,
    category: 'Blog',
    url: `blog/${entry.id}/`,
    date: entry.data.pubDate.toISOString(),
    tags: ['blog', ...(entry.data.tags ?? [])],
  }));

  const decisionHandoffItems: SearchItem[] = decisionHandoffLanes.map(lane => ({
    id: `handoff-${lane.id}`,
    title: `${lane.label} handoff`,
    description: `${lane.pressure} First output: ${lane.firstOutput}`,
    category: 'Decision Handoff',
    url: lane.href,
    date: new Date().toISOString(),
    tags: [
      'decision handoff',
      'intake',
      'buyer path',
      lane.id,
      lane.label.toLowerCase(),
    ],
  }));

  const staticPages = [
    {
      id: 'page-home',
      title: 'Home',
      description:
        'Chicago managed IT homepage for support ownership, security baseline, Microsoft 365, cloud, backup, and buyer-facing digital work',
      category: 'Page',
      url: '/',
      tags: ['home', 'landing', 'managed it', 'security', 'cloud', 'm365'],
    },
    {
      id: 'page-gallery',
      title: 'Design Library',
      description:
        'Interactive design library with visual studies for support, security, infrastructure, commerce, and mobile workflows',
      category: 'Page',
      url: 'gallery/',
      tags: ['gallery', 'design', 'art', 'creative', 'interface', 'proof'],
    },
    {
      id: 'page-blog',
      title: 'Blog',
      description:
        'Practical field notes on managed IT, cybersecurity, Microsoft 365, cloud operations, and buyer-facing digital systems',
      category: 'Page',
      url: 'blog/',
      tags: ['blog', 'managed it', 'security', 'm365', 'cloud', 'operations'],
    },
    {
      id: 'page-news',
      title: 'News + Podcast',
      description:
        'Short episodes and advisory notes for managed IT, security, Microsoft 365, continuity, and digital systems',
      category: 'Page',
      url: 'news/',
      tags: ['news', 'podcast', 'advisory', 'security', 'm365'],
    },
    {
      id: 'page-photos',
      title: 'Photo Library',
      description:
        'Curated photo references for support, infrastructure, cybersecurity, Microsoft 365, and buyer-facing pages',
      category: 'Page',
      url: 'photos/',
      tags: ['photos', 'gallery', 'infrastructure', 'security', 'digital'],
    },
    {
      id: 'page-about',
      title: 'Digital Proof Lab',
      description:
        'Interactive digital proof lab with search, compare, cart persistence, shareable states, and checkout review',
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
      title: 'Digital Proof Lab - Cart Launch',
      description: 'Open the digital proof lab directly into cart mode',
      category: 'Page',
      url: 'about/?demo=cart#shop-experience',
      tags: ['experience-lab', 'shop-demo', 'cart', 'launch'],
    },
    {
      id: 'page-about-demo-compare',
      title: 'Digital Proof Lab - Compare Launch',
      description: 'Open the digital proof lab with compare mode active',
      category: 'Page',
      url: 'about/?demo=compare#shop-experience',
      tags: ['experience-lab', 'shop-demo', 'compare', 'launch'],
    },
    {
      id: 'page-about-demo-checkout',
      title: 'Digital Proof Lab - Checkout Launch',
      description: 'Open the digital proof lab in checkout review mode',
      category: 'Page',
      url: 'about/?demo=checkout&product=aurora-hoodie#shop-experience',
      tags: ['experience-lab', 'shop-demo', 'checkout', 'launch'],
    },
    {
      id: 'page-services',
      title: 'Services',
      description:
        'Buyer-focused solution hub for managed IT, security, Microsoft 365, cloud, backup, onboarding, and digital delivery',
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
      description:
        'Interactive matrix for choosing the best first service lane',
      category: 'Page',
      url: 'services/#service-planner',
      tags: ['services', 'planner', 'comparison', 'matrix', 'roadmap'],
    },
    {
      id: 'page-pricing',
      title: 'Pricing',
      description:
        'Directional plans, SLA comparison, pricing calculator, and ROI model',
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
      description:
        'Project intake, support lanes, provider-transition context, and engagement kickoff',
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
    ...blogItems,
    ...decisionHandoffItems,
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
