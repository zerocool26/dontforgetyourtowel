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
      name: 'Olive Global Systems',
      description:
        'Integrated trade platform across seven trade divisions, a premium design gallery, and retained digital systems.',
    },
    routes: {
      home: '/',
      about: 'company/',
      gallery: 'gallery/',
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
