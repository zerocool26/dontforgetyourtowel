export interface TradeVisual {
  navLabel: string;
  cardCta: string;
  stageLabel: string;
  stageValue: string;
  stageCopy: string;
  stageBullets: string[];
  subpageLabel: string;
  themeClass: string;
}

export const tradeVisuals: Record<string, TradeVisual> = {
  mechanical: {
    navLabel: 'Mechanical',
    cardCta: 'Explore mechanical',
    stageLabel: 'Fabrication cadence',
    stageValue: 'Retrofit sequence live',
    stageCopy:
      'Mechanical is presented like a retrofit command surface with access logic, prefab release, and commissioning flow visible at once.',
    stageBullets: [
      'Shutdown windows tracked',
      'Prefab release logic',
      'Commissioning handoff',
    ],
    subpageLabel: 'Mechanical vertical',
    themeClass: 'trade-experience--mechanical',
  },
  electrical: {
    navLabel: 'Electrical',
    cardCta: 'Explore electrical',
    stageLabel: 'Power map',
    stageValue: 'Energization controlled',
    stageCopy:
      'Electrical reads like a power-and-controls site with outage sequencing, device readiness, and inspection logic up front.',
    stageBullets: [
      'Feeders and panels staged',
      'Controls dependencies visible',
      'Inspection pressure managed',
    ],
    subpageLabel: 'Electrical vertical',
    themeClass: 'trade-experience--electrical',
  },
  plumbing: {
    navLabel: 'Plumbing',
    cardCta: 'Explore plumbing',
    stageLabel: 'Water route',
    stageValue: 'Fixture turnover planned',
    stageCopy:
      'Plumbing is styled around flow, riser coordination, and finish-ready fixture delivery instead of generic contractor copy.',
    stageBullets: [
      'Core and riser planning',
      'Fixture release control',
      'Testing before turnover',
    ],
    subpageLabel: 'Plumbing vertical',
    themeClass: 'trade-experience--plumbing',
  },
  'general-contracting': {
    navLabel: 'General Contracting',
    cardCta: 'Explore GC',
    stageLabel: 'Field command',
    stageValue: 'Phases aligned',
    stageCopy:
      'General contracting feels like an execution dashboard with logistics, look-aheads, owner communication, and closeout pressure all in frame.',
    stageBullets: [
      'Site logistics live',
      'Three-week look-aheads',
      'Occupancy handoff control',
    ],
    subpageLabel: 'GC vertical',
    themeClass: 'trade-experience--gc',
  },
  'commercial-hvac': {
    navLabel: 'Commercial HVAC',
    cardCta: 'Explore HVAC',
    stageLabel: 'Climate array',
    stageValue: 'Comfort continuity',
    stageCopy:
      'Commercial HVAC gets its own climate-system identity with startup, controls, balancing, and occupant comfort treated as the headline.',
    stageBullets: [
      'Startup readiness',
      'Controls integration',
      'Balancing stability',
    ],
    subpageLabel: 'HVAC vertical',
    themeClass: 'trade-experience--hvac',
  },
  'auto-repair': {
    navLabel: 'Auto Repair',
    cardCta: 'Explore auto repair',
    stageLabel: 'Bay status',
    stageValue: 'Fleet throughput',
    stageCopy:
      'Auto repair is framed as a premium service-bay operation with diagnostics, maintenance rhythm, and return-to-service visibility.',
    stageBullets: [
      'Bay flow sequencing',
      'Diagnostic clarity',
      'Fleet maintenance rhythm',
    ],
    subpageLabel: 'Auto vertical',
    themeClass: 'trade-experience--auto',
  },
  'msp-tech-services': {
    navLabel: 'MSP / Tech',
    cardCta: 'Explore MSP / Tech',
    stageLabel: 'Ops console',
    stageValue: 'Digital systems retained',
    stageCopy:
      'MSP and tech services retain the original digital depth, but now read like a premium operations vertical instead of a separate mini-site.',
    stageBullets: [
      'Managed ops still live',
      'Security and cloud lanes',
      'AI and commerce support',
    ],
    subpageLabel: 'Tech vertical',
    themeClass: 'trade-experience--msp',
  },
};

export function getTradeVisual(slug: string) {
  return tradeVisuals[slug] ?? tradeVisuals['msp-tech-services'];
}
