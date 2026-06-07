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
    cardCta: 'View mechanical scope',
    stageLabel: 'Delivery focus',
    stageValue: 'Retrofit sequencing',
    stageCopy:
      'Mechanical work is framed around access planning, prefab release, shutdown windows, and commissioning-ready handoff.',
    stageBullets: [
      'Access and shutdown planning',
      'Prefab release control',
      'Commissioning turnover',
    ],
    subpageLabel: 'Division overview',
    themeClass: 'trade-experience--mechanical',
  },
  electrical: {
    navLabel: 'Electrical',
    cardCta: 'View electrical scope',
    stageLabel: 'Delivery focus',
    stageValue: 'Controlled energization',
    stageCopy:
      'Electrical scope is organized around outage planning, device readiness, controls coordination, and inspection flow.',
    stageBullets: [
      'Feeders and panels staged',
      'Controls coordination clear',
      'Inspection flow managed',
    ],
    subpageLabel: 'Division overview',
    themeClass: 'trade-experience--electrical',
  },
  plumbing: {
    navLabel: 'Plumbing',
    cardCta: 'View plumbing scope',
    stageLabel: 'Delivery focus',
    stageValue: 'Fixture turnover planning',
    stageCopy:
      'Plumbing work is explained through riser coordination, testing discipline, and finish-ready fixture delivery.',
    stageBullets: [
      'Core and riser planning',
      'Fixture release control',
      'Testing before turnover',
    ],
    subpageLabel: 'Division overview',
    themeClass: 'trade-experience--plumbing',
  },
  'general-contracting': {
    navLabel: 'General Contracting',
    cardCta: 'View GC scope',
    stageLabel: 'Delivery focus',
    stageValue: 'Phased project control',
    stageCopy:
      'General contracting is positioned around site logistics, issue ownership, schedule visibility, and occupancy-ready closeout.',
    stageBullets: [
      'Site logistics live',
      'Three-week look-aheads',
      'Occupancy handoff control',
    ],
    subpageLabel: 'Division overview',
    themeClass: 'trade-experience--gc',
  },
  'commercial-hvac': {
    navLabel: 'Commercial HVAC',
    cardCta: 'View HVAC scope',
    stageLabel: 'Delivery focus',
    stageValue: 'Comfort continuity',
    stageCopy:
      'Commercial HVAC is framed around startup readiness, controls integration, balancing, and stable occupant comfort after handoff.',
    stageBullets: [
      'Startup readiness',
      'Controls integration',
      'Balancing stability',
    ],
    subpageLabel: 'Division overview',
    themeClass: 'trade-experience--hvac',
  },
  'auto-repair': {
    navLabel: 'Auto Repair',
    cardCta: 'View auto repair scope',
    stageLabel: 'Delivery focus',
    stageValue: 'Fleet throughput',
    stageCopy:
      'Auto repair is presented through bay flow, diagnostics clarity, maintenance cadence, and predictable return-to-service timing.',
    stageBullets: [
      'Bay flow sequencing',
      'Diagnostic clarity',
      'Fleet maintenance rhythm',
    ],
    subpageLabel: 'Division overview',
    themeClass: 'trade-experience--auto',
  },
  'msp-tech-services': {
    navLabel: 'MSP / Tech',
    cardCta: 'View MSP / tech scope',
    stageLabel: 'Delivery focus',
    stageValue: 'Integrated technology operations',
    stageCopy:
      'MSP and tech services remain deep, but they are now framed as an operational division connected to the same delivery model as the physical trades.',
    stageBullets: [
      'Managed ops still live',
      'Security and cloud lanes',
      'AI and workflow support',
    ],
    subpageLabel: 'Division overview',
    themeClass: 'trade-experience--msp',
  },
};

export function getTradeVisual(slug: string) {
  return tradeVisuals[slug] ?? tradeVisuals['msp-tech-services'];
}
