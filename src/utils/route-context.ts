import { BASE_PATH, CONTACT_EMAIL } from '../consts';
import { tradeProfiles } from '../data/trades';
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
    accent: '#ccff00',
    kicker: 'Site Atlas',
    title: 'One connected route system for every trade and platform page.',
    description:
      'The site now behaves like a structured platform. Use this atlas to keep moving through related routes instead of bouncing between disconnected pages.',
    currentTitle: 'Current route',
    currentDescription:
      'You are inside the live seven-trade platform with shared navigation, search, and route-aware UX.',
    currentCategory: 'Platform',
    suggestions: [
      {
        label: 'Open trade directory',
        detail: 'Jump straight into the seven-trade map.',
        href: withBasePath('trades/'),
      },
      {
        label: 'Enter design gallery',
        detail:
          'Study the premium visual experiments tied back to live routes.',
        href: withBasePath('gallery/'),
      },
      {
        label: 'Read platform story',
        detail:
          'See how the site is structured from landing page to trade vertical.',
        href: withBasePath('company/'),
      },
    ],
  };

  if (currentPath.startsWith('/gallery')) {
    context = {
      accent: '#7dd3fc',
      kicker: 'Gallery Atlas',
      title: 'Gallery concepts stay wired into the real site map.',
      description:
        'The gallery is not isolated art direction. It routes directly back into the working trades, services, and build experiences.',
      currentTitle: 'Design Gallery',
      currentDescription:
        'Interactive gallery mode for premium visual studies, curatorial filters, and route-linked concepts.',
      currentCategory: 'Gallery',
      suggestions: [
        {
          label: 'Browse trade directory',
          detail:
            'Move from visual studies into the live seven-trade structure.',
          href: withBasePath('trades/'),
        },
        {
          label: 'Open Build Studio',
          detail:
            'Shift from gallery thinking into a flagship interactive planning route.',
          href: withBasePath('build-studio/#studio'),
        },
        {
          label: 'Read platform architecture',
          detail: 'See how the gallery fits the broader site system.',
          href: withBasePath('company/'),
        },
      ],
    };
  } else if (currentPath.startsWith('/services')) {
    context = {
      accent: '#ccff00',
      kicker: 'Services Atlas',
      title:
        'Trade delivery and retained tech systems now share one service map.',
      description:
        'The services hub is the bridge between the field-facing trades and the deeper digital catalog. The route logic should stay visible here.',
      currentTitle: 'Services Hub',
      currentDescription:
        'Cross-trade bridge page for MSP, cloud, AI, pricing, planning tools, and seven-trade routing.',
      currentCategory: 'Services',
      suggestions: [
        {
          label: 'Open planner',
          detail: 'Jump to the live matrix and recommendation tooling.',
          href: withBasePath('services/#service-planner'),
        },
        {
          label: 'Browse all trades',
          detail: 'Move from broad service mapping into specific trade worlds.',
          href: withBasePath('trades/'),
        },
        {
          label: 'Start intake',
          detail: 'Route a trade-aware or services-aware project brief.',
          href: withBasePath('contact-hq/'),
        },
      ],
    };
  } else if (currentPath.startsWith('/company')) {
    context = {
      accent: '#f59e0b',
      kicker: 'Platform Atlas',
      title:
        'The about page explains the operating logic behind the whole site.',
      description:
        'This page holds the higher-level structure so the landing page can stay expressive and the trade routes can stay specialized.',
      currentTitle: 'About The Platform',
      currentDescription:
        'Broader site architecture, trade positioning, and system logic for the seven-trade build.',
      currentCategory: 'About',
      suggestions: [
        {
          label: 'Return to landing page',
          detail: 'Go back to the creative front door and platform overview.',
          href: withBasePath('/'),
        },
        {
          label: 'Study the gallery',
          detail:
            'See the design system stretched into higher-expression territory.',
          href: withBasePath('gallery/'),
        },
        {
          label: 'Browse trade worlds',
          detail:
            'Move from platform logic into the specialized vertical pages.',
          href: withBasePath('trades/'),
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
                'See how this trade links back into the retained digital systems.',
              href: withBasePath('services/'),
            },
          ],
    };
  } else if (currentPath.startsWith('/trades')) {
    context = {
      accent: '#ccff00',
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
            'See the bridge between trade lanes and retained digital systems.',
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

  const buildMailto = (subject: string) =>
    `mailto:${encodeURIComponent(CONTACT_EMAIL)}?subject=${encodeURIComponent(subject)}`;

  let cta: RouteStickyCTA = {
    accent: '#ccff00',
    eyebrow: 'Project intake',
    copy: 'Want a flagship build brief in two minutes?',
    detail: 'Launch the build studio or route directly into intake.',
    secondaryHref: withBasePath('build-studio/#studio'),
    secondaryLabel: 'Launch studio',
    primaryHref: buildMailto('Premium project inquiry'),
    primaryLabel: 'Start brief',
  };

  if (currentPath === '/' || currentPath.startsWith('/gallery')) {
    cta = currentPath.startsWith('/gallery')
      ? {
          accent: '#7dd3fc',
          eyebrow: 'Gallery route',
          copy: 'Want one of these gallery directions translated into a live build?',
          detail:
            'The gallery stays connected to the trade platform instead of living as isolated art direction.',
          secondaryHref: '#gallery-wall',
          secondaryLabel: 'View wall',
          primaryHref: `${withBasePath('contact-hq/')}?tradePage=${encodeURIComponent('Design Gallery')}&brief=${encodeURIComponent('I want to discuss a gallery-inspired site direction.')}`,
          primaryLabel: 'Discuss concept',
        }
      : {
          accent: '#ccff00',
          eyebrow: 'Landing intake',
          copy: 'Use the command center to route into the right trade or flagship build path.',
          detail:
            'Trades, gallery, services, and studio stay tied together instead of branching into disconnected funnels.',
          secondaryHref: withBasePath('build-studio/#studio'),
          secondaryLabel: 'Launch studio',
          primaryHref: `${withBasePath('contact-hq/')}?brief=${encodeURIComponent('I want to scope a premium multi-trade website or project.')}`,
          primaryLabel: 'Start brief',
        };
  } else if (currentPath.startsWith('/services')) {
    cta = {
      accent: '#ccff00',
      eyebrow: 'Services intake',
      copy: 'Need the right mix of trade delivery, retained systems, and technical support?',
      detail:
        'The services hub, planner, and seven-trade structure all feed the same intake path.',
      secondaryHref: withBasePath('services/#service-planner'),
      secondaryLabel: 'Open planner',
      primaryHref: `${withBasePath('contact-hq/')}?trade=${encodeURIComponent('msp-tech-services')}&tradePage=${encodeURIComponent('Services Hub')}`,
      primaryLabel: 'Start service intake',
    };
  } else if (currentPath.startsWith('/company')) {
    cta = {
      accent: '#f59e0b',
      eyebrow: 'Platform discussion',
      copy: 'Want to turn this platform architecture into a live rollout?',
      detail:
        'The company route explains the structure. Intake turns it into a concrete brief.',
      secondaryHref: withBasePath('trades/'),
      secondaryLabel: 'Browse trades',
      primaryHref: `${withBasePath('contact-hq/')}?brief=${encodeURIComponent('I want to discuss the multi-trade platform structure and rollout.')}`,
      primaryLabel: 'Discuss platform',
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
      primaryHref: `${withBasePath('contact-hq/')}?trade=${encodeURIComponent(activeTrade.slug)}&tradePage=${encodeURIComponent(tradePageLabel)}`,
      primaryLabel: activeSubpage
        ? 'Start this route'
        : `Start ${activeTrade.shortName}`,
    };
  }

  return cta;
}
