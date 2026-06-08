import { withBasePath } from '../utils/helpers';

export type GalleryCategory =
  | 'Spatial'
  | 'Interface'
  | 'Motion'
  | 'Material'
  | 'Operations';

export type GalleryViewSize = 'feature' | 'wide' | 'tall' | 'standard';

export interface GalleryMetric {
  label: string;
  value: string;
}

export interface GalleryInstallation {
  slug: string;
  title: string;
  trade: string;
  category: GalleryCategory;
  medium: string;
  room: string;
  summary: string;
  curatorNote: string;
  palette: [string, string, string];
  tags: string[];
  metrics: GalleryMetric[];
  sourceLabel: string;
  sourceHref: string;
  size: GalleryViewSize;
}

export const galleryInstallations: GalleryInstallation[] = [
  {
    slug: 'meridian-plantroom',
    title: 'Meridian Plantroom',
    trade: 'Operations',
    category: 'Spatial',
    medium: 'Architectural environment study',
    room: 'North Gallery',
    summary:
      'An operations-led composition based on support queues, open issues, aging tickets, vendor escalations, and monthly reporting.',
    curatorNote:
      'The visual language borrows from dispatch boards and infrastructure rooms, so the piece feels tied to real service ownership before it feels decorative.',
    palette: ['#d8f279', '#5bbeb4', '#101819'],
    tags: ['operations', 'command room', 'clarity', 'uptime'],
    metrics: [
      { label: 'Read', value: 'Support heavy' },
      { label: 'Discipline', value: 'Signal flow' },
    ],
    sourceLabel: 'Open Solutions Hub',
    sourceHref: withBasePath('services/'),
    size: 'feature',
  },
  {
    slug: 'copper-pulse-board',
    title: 'Copper Pulse Board',
    trade: 'Security',
    category: 'Interface',
    medium: 'Editorial control surface',
    room: 'East Wall',
    summary:
      'A security interface study built around MFA exceptions, alert routing, endpoint posture, and incident-sequence decisions.',
    curatorNote:
      'This piece leans into inspection readiness, escalation logic, and risk posture, making the page feel precise instead of vaguely technical.',
    palette: ['#ffd56a', '#f1883b', '#121015'],
    tags: ['security', 'controls', 'response', 'inspection'],
    metrics: [
      { label: 'Bias', value: 'Sequence led' },
      { label: 'Detail', value: 'Response ready' },
    ],
    sourceLabel: 'Open Pricing',
    sourceHref: withBasePath('pricing/'),
    size: 'wide',
  },
  {
    slug: 'waterline-monograph',
    title: 'Waterline Monograph',
    trade: 'Cloud',
    category: 'Material',
    medium: 'Tactile systems poster',
    room: 'South Cabinet',
    summary:
      'A cloud-led composition focused on flow, pressure, and routing, using quiet gradients and infrastructure-grade detailing instead of obvious default cloud graphics.',
    curatorNote:
      'The piece is meant to feel precise and durable, like a technical brief upgraded into gallery-grade visual storytelling.',
    palette: ['#8bdcff', '#e6f4fb', '#08151d'],
    tags: ['cloud systems', 'routing', 'resilience', 'testing'],
    metrics: [
      { label: 'Mode', value: 'Stack based' },
      { label: 'Finish', value: 'Resilient handoff' },
    ],
    sourceLabel: 'Open Services Catalog',
    sourceHref: withBasePath('services/#technology-catalog'),
    size: 'tall',
  },
  {
    slug: 'occupied-build-sequence',
    title: 'Occupied Build Sequence',
    trade: 'Delivery',
    category: 'Operations',
    medium: 'Phasing storyboard',
    room: 'Central Hall',
    summary:
      'A delivery concept framed as a spatial storyboard, showing schedule pressure, phased rollout logic, and closeout discipline through bold sectional layering.',
    curatorNote:
      'The composition is intentionally managerial without looking bureaucratic, which is the sweet spot for premium delivery positioning.',
    palette: ['#f0c48f', '#d97652', '#1a1310'],
    tags: ['phasing', 'closeout', 'rollout', 'schedule control'],
    metrics: [
      { label: 'Priority', value: 'Phasing clarity' },
      { label: 'Outcome', value: 'Owner ready handoff' },
    ],
    sourceLabel: 'Open Service Planner',
    sourceHref: withBasePath('services/#service-planner'),
    size: 'wide',
  },
  {
    slug: 'climate-ribbon-array',
    title: 'Climate Ribbon Array',
    trade: 'Performance',
    category: 'Motion',
    medium: 'Atmospheric motion study',
    room: 'Upper Lantern',
    summary:
      'A performance concept that visualizes motion, balancing, and stabilization with elegant ribbons and calibrated signal bands.',
    curatorNote:
      'Instead of default futurist iconography, the piece uses controlled motion and subtle turbulence to express system performance.',
    palette: ['#6ce3d7', '#c7f4df', '#0a1f24'],
    tags: ['balancing', 'flow', 'performance', 'stabilization'],
    metrics: [
      { label: 'Read', value: 'Comfort continuity' },
      { label: 'Signal', value: 'TAB aware' },
    ],
    sourceLabel: 'Open Trust Center',
    sourceHref: withBasePath('trust-center/'),
    size: 'standard',
  },
  {
    slug: 'chassis-memory-wall',
    title: 'Chassis Memory Wall',
    trade: 'Support',
    category: 'Material',
    medium: 'Service-bay identity study',
    room: 'West Bay',
    summary:
      'A premium support composition using service rhythm, ticket labeling, and diagnostic notation to feel trustworthy, operational, and a little cinematic.',
    curatorNote:
      'The aesthetic is tuned for repeat-service credibility, not flashy consumer-tech branding.',
    palette: ['#ff8e7c', '#f1c4bc', '#150d10'],
    tags: ['service desk', 'diagnostics', 'support', 'throughput'],
    metrics: [
      { label: 'Focus', value: 'Diagnostic clarity' },
      { label: 'Flow', value: 'Queue throughput' },
    ],
    sourceLabel: 'Open Contact HQ',
    sourceHref: withBasePath('contact-hq/'),
    size: 'standard',
  },
  {
    slug: 'support-constellation-desk',
    title: 'Support Constellation Desk',
    trade: 'Automation',
    category: 'Interface',
    medium: 'Operations console study',
    room: 'Signal Alcove',
    summary:
      'An automation-led composition that merges service-desk composure, orchestration logic, and systems visibility into a refined operations interface.',
    curatorNote:
      'This is where the technical side stops feeling like a separate brand and starts reading like a mature creative system in its own right.',
    palette: ['#cab7ff', '#8dc8ff', '#0d1020'],
    tags: ['automation', 'monitoring', 'ops', 'managed systems'],
    metrics: [
      { label: 'Position', value: 'Operations first' },
      { label: 'Scope', value: 'Managed trust' },
    ],
    sourceLabel: 'Open Solutions Hub',
    sourceHref: withBasePath('services/'),
    size: 'tall',
  },
  {
    slug: 'chicago-atlas-one',
    title: 'Chicago Atlas One',
    trade: 'Platform',
    category: 'Spatial',
    medium: 'Cross-site synthesis piece',
    room: 'Atrium',
    summary:
      'A cross-platform visual system that ties managed operations, trust, proof routes, and workflow support into one editorial source-of-truth canvas.',
    curatorNote:
      'This reference shows how the homepage can feel like a calm command center without losing clarity.',
    palette: ['#d8f279', '#82dcd1', '#111317'],
    tags: ['platform', 'landing page', 'source of truth', 'architecture'],
    metrics: [
      { label: 'Systems linked', value: 'Managed IT stack' },
      { label: 'Role', value: 'Landing command center' },
    ],
    sourceLabel: 'Return to Landing Page',
    sourceHref: withBasePath('/'),
    size: 'feature',
  },
];

export const galleryCategories: GalleryCategory[] = [
  'Spatial',
  'Interface',
  'Motion',
  'Material',
  'Operations',
];
