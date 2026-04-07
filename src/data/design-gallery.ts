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
    trade: 'Mechanical',
    category: 'Spatial',
    medium: 'Architectural environment study',
    room: 'North Gallery',
    summary:
      'A mechanical-system composition that turns retrofit coordination into a calm, premium control room with layered circulation, equipment geometry, and service-clearance logic.',
    curatorNote:
      'The visual language borrows from plantroom sequencing instead of showroom cliches, so the piece feels engineered before it feels decorative.',
    palette: ['#d8f279', '#5bbeb4', '#101819'],
    tags: ['retrofit', 'plantroom', 'coordination', 'uptime'],
    metrics: [
      { label: 'Read', value: 'Retrofit heavy' },
      { label: 'Discipline', value: 'Equipment flow' },
    ],
    sourceLabel: 'Open Mechanical',
    sourceHref: withBasePath('trades/mechanical/'),
    size: 'feature',
  },
  {
    slug: 'copper-pulse-board',
    title: 'Copper Pulse Board',
    trade: 'Electrical',
    category: 'Interface',
    medium: 'Editorial control surface',
    room: 'East Wall',
    summary:
      'An electrical interface study using conductor tones, relay-like typography, and energization sequencing to feel more like a precision instrument than a brochure.',
    curatorNote:
      'This piece leans into inspection readiness, outage planning, and control logic, making the page feel exclusive to electrical work rather than generally “techy.”',
    palette: ['#ffd56a', '#f1883b', '#121015'],
    tags: ['energization', 'controls', 'panel logic', 'inspection'],
    metrics: [
      { label: 'Bias', value: 'Sequence led' },
      { label: 'Detail', value: 'Control ready' },
    ],
    sourceLabel: 'Open Electrical',
    sourceHref: withBasePath('trades/electrical/'),
    size: 'wide',
  },
  {
    slug: 'waterline-monograph',
    title: 'Waterline Monograph',
    trade: 'Plumbing',
    category: 'Material',
    medium: 'Tactile systems poster',
    room: 'South Cabinet',
    summary:
      'A plumbing-led composition focused on water, pressure, and core routing, using quiet gradients and fixture-grade detailing instead of obvious blue contractor graphics.',
    curatorNote:
      'The piece is meant to feel precise and durable, like a specification sheet upgraded into gallery-grade visual storytelling.',
    palette: ['#8bdcff', '#e6f4fb', '#08151d'],
    tags: ['water systems', 'core routing', 'fixture turnover', 'testing'],
    metrics: [
      { label: 'Mode', value: 'Area based' },
      { label: 'Finish', value: 'Leak free turnover' },
    ],
    sourceLabel: 'Open Plumbing',
    sourceHref: withBasePath('trades/plumbing/'),
    size: 'tall',
  },
  {
    slug: 'occupied-build-sequence',
    title: 'Occupied Build Sequence',
    trade: 'General Contracting',
    category: 'Operations',
    medium: 'Phasing storyboard',
    room: 'Central Hall',
    summary:
      'A general-contracting concept framed as a spatial storyboard, showing schedule pressure, occupied renovation logic, and closeout discipline through bold sectional layering.',
    curatorNote:
      'The composition is intentionally managerial without looking bureaucratic, which is the sweet spot for premium GC positioning.',
    palette: ['#f0c48f', '#d97652', '#1a1310'],
    tags: ['phasing', 'closeout', 'occupied renovation', 'schedule control'],
    metrics: [
      { label: 'Priority', value: 'Phasing clarity' },
      { label: 'Outcome', value: 'Owner ready handoff' },
    ],
    sourceLabel: 'Open General Contracting',
    sourceHref: withBasePath('trades/general-contracting/'),
    size: 'wide',
  },
  {
    slug: 'climate-ribbon-array',
    title: 'Climate Ribbon Array',
    trade: 'Commercial HVAC',
    category: 'Motion',
    medium: 'Atmospheric motion study',
    room: 'Upper Lantern',
    summary:
      'A commercial HVAC concept that visualizes air movement, balancing, and stabilization with elegant motion ribbons and calibrated signal bands.',
    curatorNote:
      'Instead of default “cool air” iconography, the piece uses controlled motion and subtle turbulence to express system performance.',
    palette: ['#6ce3d7', '#c7f4df', '#0a1f24'],
    tags: ['balancing', 'airflow', 'comfort', 'stabilization'],
    metrics: [
      { label: 'Read', value: 'Comfort continuity' },
      { label: 'Signal', value: 'TAB aware' },
    ],
    sourceLabel: 'Open Commercial HVAC',
    sourceHref: withBasePath('trades/commercial-hvac/'),
    size: 'standard',
  },
  {
    slug: 'chassis-memory-wall',
    title: 'Chassis Memory Wall',
    trade: 'Auto Repair',
    category: 'Material',
    medium: 'Service-bay identity study',
    room: 'West Bay',
    summary:
      'A premium automotive service composition using shop-floor rhythm, parts labeling, and diagnostic notation to feel trustworthy, operational, and a little cinematic.',
    curatorNote:
      'The aesthetic is tuned for fleet and repeat-service credibility, not flashy consumer auto branding.',
    palette: ['#ff8e7c', '#f1c4bc', '#150d10'],
    tags: ['service bay', 'diagnostics', 'fleet', 'throughput'],
    metrics: [
      { label: 'Focus', value: 'Diagnostic clarity' },
      { label: 'Flow', value: 'Bay throughput' },
    ],
    sourceLabel: 'Open Auto Repair',
    sourceHref: withBasePath('trades/auto-repair/'),
    size: 'standard',
  },
  {
    slug: 'support-constellation-desk',
    title: 'Support Constellation Desk',
    trade: 'MSP / Tech',
    category: 'Interface',
    medium: 'Operations console study',
    room: 'Signal Alcove',
    summary:
      'A managed-services composition that merges service-desk composure, security posture, and systems visibility into a refined operations interface.',
    curatorNote:
      'This is where the tech side stops feeling like a separate brand and starts reading like a trade with the same design maturity as the physical disciplines.',
    palette: ['#cab7ff', '#8dc8ff', '#0d1020'],
    tags: ['support', 'security', 'monitoring', 'managed operations'],
    metrics: [
      { label: 'Position', value: 'Operations first' },
      { label: 'Scope', value: 'Managed trust' },
    ],
    sourceLabel: 'Open MSP / Tech',
    sourceHref: withBasePath('trades/msp-tech-services/'),
    size: 'tall',
  },
  {
    slug: 'olive-atlas-one',
    title: 'Olive Atlas One',
    trade: 'Platform',
    category: 'Spatial',
    medium: 'Cross-site synthesis piece',
    room: 'Atrium',
    summary:
      'A cross-platform visual system that ties all seven trades, retained commerce, and interactive product work into one editorial source-of-truth canvas.',
    curatorNote:
      'This installation exists to prove the homepage can be both a command center and a design object without losing clarity.',
    palette: ['#d8f279', '#82dcd1', '#111317'],
    tags: ['platform', 'landing page', 'source of truth', 'architecture'],
    metrics: [
      { label: 'Trades linked', value: '7 divisions' },
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
