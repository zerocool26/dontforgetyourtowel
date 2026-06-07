import { BASE_PATH } from '../consts';
import { tradeProfiles } from '../data/trades';
import { buildContactHqHref } from './contact';
import { withBasePath } from './helpers';

export interface RouteContextLink {
  label: string;
  detail: string;
  href: string;
}

export interface RouteContext {
  accent: string;
  kicker: string;
  title: string;
  description: string;
  currentTitle: string;
  currentDescription: string;
  currentCategory: string;
  suggestions: RouteContextLink[];
}

export interface RouteStickyCTA {
  accent: string;
  eyebrow: string;
  copy: string;
  detail: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
}

export const normalizeContextPath = (value: string) => {
  const strippedBase =
    BASE_PATH && BASE_PATH !== '/' ? value.replace(BASE_PATH, '/') : value;
  const trimmed = strippedBase.replace(/\/+$/, '');
  return trimmed.length ? trimmed : '/';
};

export function getRouteContext(pathname: string): RouteContext {
  const currentPath = normalizeContextPath(pathname);
  const pathSegments = currentPath.split('/').filter(Boolean);
  const activeTrade =
    pathSegments[0] === 'trades'
      ? tradeProfiles.find(trade => trade.slug === pathSegments[1])
      : undefined;
  const activeSubpage =
    activeTrade && pathSegments[2]
      ? activeTrade.subpages.find(subpage => subpage.slug === pathSegments[2])
      : undefined;

  let context: RouteContext = {
    accent: '#d1b37a',
    kicker: 'Site Atlas',
    title:
      'A calmer route system for Chicago operations, managed IT, security, and customer-excellence proof.',
    description:
      'Use this atlas to move between solutions, pricing, proof, trust, and intake routes without falling into bloated brochure navigation.',
    currentTitle: 'Landing page',
    currentDescription:
      'Chicago-focused managed IT shell with route-aware navigation, proof surfaces, and mobile-first buyer flows.',
    currentCategory: 'Home',
    suggestions: [
      {
        label: 'Explore solutions',
        detail:
          'Open the managed IT, security, Microsoft 365, and cloud solutions hub.',
        href: withBasePath('services/'),
      },
      {
        label: 'Review pricing',
        detail: 'Compare plans, SLAs, and planning tools without guesswork.',
        href: withBasePath('pricing/'),
      },
      {
        label: 'Open trust center',
        detail:
          'Review customer excellence, security posture, backup evidence, and response ownership.',
        href: withBasePath('trust-center/'),
      },
    ],
  };

  if (currentPath.startsWith('/gallery')) {
    context = {
      accent: '#7dd3fc',
      kicker: 'Gallery Atlas',
      title: 'Gallery concepts stay wired into the real client experience map.',
      description:
        'This gallery is not isolated art direction. It routes back into managed IT, trust, services, and intake surfaces that actually sell the work.',
      currentTitle: 'Design Gallery',
      currentDescription:
        'Interactive gallery mode for cinematic visual studies, curatorial filters, and route-linked concepts.',
      currentCategory: 'Gallery',
      suggestions: [
        {
          label: 'Explore solutions',
          detail: 'Move from visual studies into the live solution stack.',
          href: withBasePath('services/'),
        },
        {
          label: 'Open service planner',
          detail:
            'Shift from gallery thinking into the practical solution planning matrix.',
          href: withBasePath('services/#service-planner'),
        },
        {
          label: 'Open trust center',
          detail:
            'See the proof route that connects customer excellence to buyer confidence.',
          href: withBasePath('trust-center/'),
        },
      ],
    };
  } else if (currentPath.startsWith('/services')) {
    context = {
      accent: '#d1b37a',
      kicker: 'Services Atlas',
      title:
        'One solution hub for operations, security, Microsoft 365, cloud, backup, and workflow support.',
      description:
        'The services hub leads with buyer pressure and keeps the deeper catalog available only when it is genuinely useful.',
      currentTitle: 'Services Hub',
      currentDescription:
        'Solution hub for managed IT, security, Microsoft 365, cloud, pricing, and planning tools.',
      currentCategory: 'Services',
      suggestions: [
        {
          label: 'Open planner',
          detail: 'Jump to the live matrix and recommendation tooling.',
          href: withBasePath('services/#service-planner'),
        },
        {
          label: 'Compare pricing',
          detail: 'Review plans, SLAs, and budget-shaping drivers.',
          href: withBasePath('pricing/'),
        },
        {
          label: 'Open trust center',
          detail:
            'See the proof route behind the customer-excellence standard.',
          href: withBasePath('trust-center/'),
        },
        {
          label: 'Start intake',
          detail: 'Route a project brief with the right context attached.',
          href: withBasePath('contact-hq/'),
        },
      ],
    };
  } else if (activeTrade) {
    context = {
      accent: activeTrade.accent,
      kicker: `${activeTrade.shortName} Atlas`,
      title: activeSubpage
        ? `${activeSubpage.title} sits inside a bigger ${activeTrade.shortName} route system.`
        : `${activeTrade.shortName} is treated like its own premium vertical, not a generic services page.`,
      description: activeSubpage
        ? 'Use the atlas to move back to the overview, branch into related routes, or jump into intake with the context preserved.'
        : 'Overview, subpages, services integration, and intake now behave like one coordinated route family.',
      currentTitle: activeSubpage ? activeSubpage.title : activeTrade.name,
      currentDescription: activeSubpage
        ? activeSubpage.description
        : activeTrade.summary,
      currentCategory: activeSubpage ? 'Trade Route' : 'Trade Overview',
      suggestions: activeSubpage
        ? [
            {
              label: `Open ${activeTrade.shortName} overview`,
              detail:
                'Step back to the main vertical and service architecture for this trade.',
              href: withBasePath(`trades/${activeTrade.slug}/`),
            },
            ...activeTrade.subpages
              .filter(subpage => subpage.slug !== activeSubpage.slug)
              .slice(0, 1)
              .map(subpage => ({
                label: subpage.title,
                detail: 'Jump laterally into the sibling route for this trade.',
                href: withBasePath(
                  `trades/${activeTrade.slug}/${subpage.slug}/`
                ),
              })),
            {
              label: 'Start trade intake',
              detail:
                'Carry this route directly into contact with trade context attached.',
              href: `${withBasePath('contact-hq/')}?trade=${encodeURIComponent(activeTrade.slug)}&tradePage=${encodeURIComponent(activeSubpage.title)}`,
            },
          ]
        : [
            ...activeTrade.subpages.slice(0, 2).map(subpage => ({
              label: subpage.title,
              detail:
                'Open a more specialized route inside this trade vertical.',
              href: withBasePath(`trades/${activeTrade.slug}/${subpage.slug}/`),
            })),
            {
              label: 'Open services hub',
              detail:
                'See how this trade links back into support, security, backup, and workflow services.',
              href: withBasePath('services/'),
            },
          ],
    };
  } else if (currentPath.startsWith('/trades')) {
    context = {
      accent: '#d7f75b',
      kicker: 'Trade Atlas',
      title: 'The trade directory is the source map for the seven verticals.',
      description:
        'Use the directory to branch into trade-specific worlds, then come back through shared services, gallery, and intake routes.',
      currentTitle: 'Trade Directory',
      currentDescription:
        'Browse all seven trade overviews and supporting subpages from one structured index.',
      currentCategory: 'Trade Directory',
      suggestions: [
        {
          label: 'Return to landing page',
          detail:
            'Move back to the main command center and broader platform framing.',
          href: withBasePath('/'),
        },
        {
          label: 'Open services hub',
          detail:
            'See the bridge between trade lanes and the shared MSP service architecture.',
          href: withBasePath('services/'),
        },
        {
          label: 'Study gallery ideas',
          detail:
            'See the trade worlds translated into more art-forward interface experiments.',
          href: withBasePath('gallery/'),
        },
      ],
    };
  }

  return context;
}

export function getRouteStickyCTA(pathname: string): RouteStickyCTA {
  const currentPath = normalizeContextPath(pathname);
  const pathSegments = currentPath.split('/').filter(Boolean);
  const activeTrade =
    pathSegments[0] === 'trades'
      ? tradeProfiles.find(trade => trade.slug === pathSegments[1])
      : undefined;
  const activeSubpage =
    activeTrade && pathSegments[2]
      ? activeTrade.subpages.find(subpage => subpage.slug === pathSegments[2])
      : undefined;

  let cta: RouteStickyCTA = {
    accent: '#d7f75b',
    eyebrow: 'Project intake',
    copy: 'Need a clearer next move for operations, security, backup, or workflow support?',
    detail: 'Review the service hub or route directly into structured intake.',
    secondaryHref: withBasePath('services/'),
    secondaryLabel: 'Explore solutions',
    primaryHref: buildContactHqHref({
      brief:
        'I want to scope managed IT, security, Microsoft 365, backup, or workflow support.',
    }),
    primaryLabel: 'Start brief',
  };

  if (currentPath === '/' || currentPath.startsWith('/gallery')) {
    cta = currentPath.startsWith('/gallery')
      ? {
          accent: '#7dd3fc',
          eyebrow: 'Gallery route',
          copy: 'Want this direction translated into a live client experience?',
          detail:
            'The gallery stays connected to real proof and solution routes instead of floating as isolated art direction.',
          secondaryHref: withBasePath('trust-center/'),
          secondaryLabel: 'Open proof',
          primaryHref: buildContactHqHref({
            tradePage: 'Design Gallery',
            brief: 'I want to discuss a gallery-inspired site direction.',
          }),
          primaryLabel: 'Discuss concept',
        }
      : {
          accent: '#d1b37a',
          eyebrow: 'Strategy intake',
          copy: 'Need calmer operations, better security, or a stronger client-facing workflow that actually converts?',
          detail:
            'Solutions, pricing, proof, and intake stay tied together instead of branching into disconnected funnels.',
          secondaryHref: withBasePath('services/'),
          secondaryLabel: 'Explore solutions',
          primaryHref: buildContactHqHref({
            brief:
              'I want to scope managed IT, security, cloud, Microsoft 365, or a premium client-facing workflow.',
          }),
          primaryLabel: 'Start brief',
        };
  } else if (currentPath.startsWith('/services')) {
    cta = {
      accent: '#d1b37a',
      eyebrow: 'Services intake',
      copy: 'Need the right mix of support, security, Microsoft 365, cloud, and project delivery?',
      detail:
        'The solution hub, planner, and pricing routes all feed the same intake path.',
      secondaryHref: withBasePath('pricing/'),
      secondaryLabel: 'Review pricing',
      primaryHref: buildContactHqHref({
        service: 'msp',
        brief:
          'I want to discuss support, security, Microsoft 365, cloud, or a custom delivery plan.',
      }),
      primaryLabel: 'Start service intake',
    };
  } else if (activeTrade) {
    const tradePageLabel = activeSubpage
      ? activeSubpage.title
      : `${activeTrade.name} overview`;

    cta = {
      accent: activeTrade.accent,
      eyebrow: `${activeTrade.shortName} intake`,
      copy: activeSubpage
        ? `Ready to scope ${activeSubpage.shortLabel.toLowerCase()} inside ${activeTrade.shortName}?`
        : `Need a ${activeTrade.shortName.toLowerCase()} route with real field setup and owner outputs?`,
      detail: activeSubpage
        ? 'This route flows directly into a trade-aware intake with page context preserved.'
        : 'Overview, subpages, and intake behave like one working vertical instead of a thin marketing shell.',
      secondaryHref: withBasePath(`trades/${activeTrade.slug}/`),
      secondaryLabel: activeSubpage ? 'Trade overview' : 'Open route',
      primaryHref: buildContactHqHref({
        trade: activeTrade.slug,
        tradePage: tradePageLabel,
      }),
      primaryLabel: activeSubpage
        ? 'Start this route'
        : `Start ${activeTrade.shortName}`,
    };
  }

  return cta;
}
