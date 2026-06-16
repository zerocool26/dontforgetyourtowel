import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { isLegacyRouteUrl } from '../utils/legacy-routes';
import { tradeProfiles } from '../data/trades';
import { decisionHandoffLanes } from '../data/decision-handoff';
import {
  competitiveProofPatterns2026,
  designQualityPrinciples2026,
  marketSignals2026,
  resourceRecommendations2026,
  technologyRadar2026,
} from '../data/research-radar';
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

  const indexedAt = new Date().toISOString();
  const slugify = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  const sourceTags = (
    sources: Array<{ label: string; type: string }>
  ): string[] =>
    sources.flatMap(source => [
      source.type,
      source.label.toLowerCase(),
      ...source.label.toLowerCase().split(/\s+/).filter(Boolean),
    ]);

  const researchRadarItems: SearchItem[] = [
    ...marketSignals2026.map(item => ({
      id: `radar-market-${slugify(item.title)}`,
      title: item.title,
      description: `${item.buyerReality} Site move: ${item.siteMove}`,
      category: 'Research Radar',
      url: 'services/#research-radar',
      date: indexedAt,
      tags: [
        'research radar',
        'market signal',
        'buyer reality',
        ...sourceTags(item.sources),
      ],
    })),
    ...competitiveProofPatterns2026.map(item => ({
      id: `radar-proof-${slugify(item.pattern)}`,
      title: item.pattern,
      description: `${item.whatBuyersExpect} Proof rule: ${item.proofRule}`,
      category: 'Research Radar',
      url: 'services/#research-radar',
      date: indexedAt,
      tags: [
        'research radar',
        'competitive proof',
        'proof pattern',
        ...sourceTags(item.sources),
      ],
    })),
    ...designQualityPrinciples2026.map(item => ({
      id: `radar-design-${slugify(item.principle)}`,
      title: item.principle,
      description: `${item.whatMatureTeamsDo} Site application: ${item.siteApplication}`,
      category: 'Research Radar',
      url: 'services/#research-radar',
      date: indexedAt,
      tags: [
        'research radar',
        'design quality',
        'accessibility',
        ...sourceTags(item.sources),
      ],
    })),
    ...technologyRadar2026.map(item => ({
      id: `radar-technology-${slugify(item.title)}`,
      title: item.title,
      description: `${item.fit} Project use: ${item.projectUse}`,
      category: 'Research Radar',
      url: 'services/#research-radar',
      date: indexedAt,
      tags: [
        'research radar',
        'technology radar',
        item.status.toLowerCase(),
        ...sourceTags(item.sources),
      ],
    })),
    ...resourceRecommendations2026.map(item => ({
      id: `radar-resource-${slugify(item.name)}`,
      title: item.name,
      description: `${item.whyItHelps} Adoption note: ${item.adoptionNote}`,
      category: 'Research Radar',
      url: 'services/#research-radar',
      date: indexedAt,
      tags: [
        'research radar',
        'resource recommendation',
        item.status.toLowerCase(),
        ...sourceTags(item.sources),
      ],
    })),
  ];

  const staticPages = [
    {
      id: 'page-home',
      title: 'Home',
      description:
        'Chicago managed IT homepage for support ownership, security baseline, Microsoft 365, cloud, backup, and workflow support',
      category: 'Page',
      url: '/',
      tags: ['home', 'landing', 'managed it', 'security', 'cloud', 'm365'],
    },
    {
      id: 'page-gallery',
      title: 'Visual References',
      description:
        'Visual references for infrastructure, support, security, and service communication',
      category: 'Page',
      url: 'gallery/',
      tags: ['gallery', 'visuals', 'infrastructure', 'security', 'support'],
    },
    {
      id: 'page-blog',
      title: 'Blog',
      description:
        'Practical field notes on managed IT, cybersecurity, Microsoft 365, cloud operations, backup, and service ownership',
      category: 'Page',
      url: 'blog/',
      tags: ['blog', 'managed it', 'security', 'm365', 'cloud', 'operations'],
    },
    {
      id: 'page-news',
      title: 'News + Podcast',
      description:
        'Short episodes and advisory notes for managed IT, security, Microsoft 365, continuity, and service decisions',
      category: 'Page',
      url: 'news/',
      tags: ['news', 'podcast', 'advisory', 'security', 'm365'],
    },
    {
      id: 'page-photos',
      title: 'Photo Library',
      description:
        'Curated photo references for support, infrastructure, cybersecurity, and Microsoft 365',
      category: 'Page',
      url: 'photos/',
      tags: ['photos', 'gallery', 'infrastructure', 'security', 'digital'],
    },
    {
      id: 'page-trust-center',
      title: 'Trust Center',
      description:
        'Security posture, backup review, incident coordination, data handling, and support accountability',
      category: 'Page',
      url: 'trust-center/',
      tags: [
        'trust',
        'proof',
        'backup',
        'security',
        'incident response',
        'customer excellence',
      ],
    },
    {
      id: 'page-services',
      title: 'Services',
      description:
        'Managed IT, security, Microsoft 365, cloud, backup, onboarding, and workflow support',
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
    ...researchRadarItems,
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
