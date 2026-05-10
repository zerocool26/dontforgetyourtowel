import { tradeProfiles } from '../data/trades';
import {
  getTradeOperations,
  getTradeSubpageOperations,
} from '../data/trade-operations';
import { galleryInstallations } from '../data/design-gallery';

export async function GET() {
  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    platform: {
      name: 'Olive Chicago',
      description:
        'Chicago managed IT platform for support ownership, security, Microsoft 365, cloud, backup confidence, commerce lab, and visual references.',
      experienceModes: [
        {
          id: 'cinematic',
          label: 'Cinematic',
          intent:
            'High-atmosphere default with stronger glow, depth, and exhibition energy.',
        },
        {
          id: 'editorial',
          label: 'Editorial',
          intent:
            'Calmer surface treatment with cleaner pacing and softer visual noise.',
        },
        {
          id: 'blueprint',
          label: 'Blueprint',
          intent:
            'Sharper technical framing with stronger grid language and systems emphasis.',
        },
      ],
    },
    routes: {
      home: '/',
      about: 'about/',
      commerceLab: 'about/',
      gallery: 'gallery/',
      blog: 'blog/',
      news: 'news/',
      photos: 'photos/',
      galleryStateQueryParams: ['discipline', 'galleryView'],
      services: 'services/',
      pricing: 'pricing/',
      contact: 'contact-hq/',
      trades: 'trades/',
    },
    trades: tradeProfiles.map(trade => {
      const operations = getTradeOperations(trade.slug);
      return {
        slug: trade.slug,
        name: trade.name,
        shortName: trade.shortName,
        route: `trades/${trade.slug}/`,
        accent: trade.accent,
        operatingModel: operations.operatingModel,
        serviceRhythm: operations.serviceRhythm,
        standards: operations.standards,
        ownerOutputs: operations.ownerOutputs,
        subpages: trade.subpages.map(subpage => ({
          slug: subpage.slug,
          title: subpage.title,
          route: `trades/${trade.slug}/${subpage.slug}/`,
          description: subpage.description,
          operations: getTradeSubpageOperations(trade.slug, subpage.slug),
        })),
      };
    }),
    gallery: galleryInstallations.map(item => ({
      slug: item.slug,
      title: item.title,
      trade: item.trade,
      category: item.category,
      route: 'gallery/',
      sourceHref: item.sourceHref,
      tags: item.tags,
    })),
    intake: {
      contactRoute: 'contact-hq/',
      supportedQueryParams: [
        'trade',
        'tradePage',
        'service',
        'solution',
        'brief',
        'workspaceTitle',
        'workspaceSummary',
        'workspaceRoutes',
      ],
    },
  };

  return new Response(JSON.stringify(manifest), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
