export interface PricingTier {
  id: string;
  name: string;
  price: string;
  description: string;
  bestFor: string;
  responseSla: string;
  highlight?: boolean;
  ctaLabel: string;
  perks: string[];
}

export interface FAQEntry {
  title: string;
  content: string;
}

export interface SlaComparisonRow {
  capability: string;
  essentials: string;
  growth: string;
  securePlus: string;
  custom: string;
}

export interface TrustSignal {
  label: string;
  sublabel: string;
}

export const pricingTiers: PricingTier[] = [
  {
    id: 'core-coverage',
    name: 'Core Coverage',
    price: '$95-$125 / user / mo',
    description:
      'Directional range for firms that need dependable support, patching, endpoint oversight, and a calmer operating baseline.',
    bestFor: 'Smaller teams or first-time MSP buyers standardizing support',
    responseSla: 'Business-hours support with documented escalation',
    ctaLabel: 'Start with Core Coverage',
    perks: [
      'Help desk, monitoring, and patch management',
      'User onboarding and offboarding workflows',
      'Endpoint inventory, device hygiene, and warranty notes',
      'Basic documentation, backup oversight, and vendor coordination',
    ],
  },
  {
    id: 'secure-operations',
    name: 'Secure Operations',
    price: '$135-$175 / user / mo',
    description:
      'Directional range for companies that need stronger identity, security baselines, Microsoft 365 governance, and strategic review rhythm.',
    bestFor:
      'Hybrid teams that need proactive IT plus stronger security posture',
    responseSla: 'Priority response with regular review cadence',
    highlight: true,
    ctaLabel: 'Choose Secure Operations',
    perks: [
      'Everything in Core Coverage',
      'Identity, MFA, and access policy support',
      'Email security, awareness support, and risky-forwarding checks',
      'Quarterly roadmap, lifecycle planning, and Microsoft 365 governance',
    ],
  },
  {
    id: 'co-managed',
    name: 'Co-Managed and Regulated',
    price: '$165-$215 / user / mo',
    description:
      'Directional range for internal IT partnerships, regulated environments, and teams that need deeper coverage, documentation, and recovery discipline.',
    bestFor: 'Healthcare, finance, manufacturing, and co-managed IT teams',
    responseSla:
      'Faster response, tighter escalation, and security-aware triage',
    ctaLabel: 'Move to Co-Managed',
    perks: [
      'Everything in Secure Operations',
      'Co-managed support for internal IT or operations staff',
      'Compliance readiness, evidence habits, and audit support coordination',
      'Recovery runbooks, restore testing, and stronger change discipline',
    ],
  },
  {
    id: 'custom',
    name: 'Custom',
    price: 'Quoted after assessment',
    description:
      'Built for multi-site operations, cloud-heavy estates, dedicated security programs, office projects, or client-facing digital work.',
    bestFor:
      'Complex environments with layered delivery, vCISO, or project work',
    responseSla: 'Custom escalation matrix, SLAs, and operating cadence',
    ctaLabel: 'Design a custom plan',
    perks: [
      'Custom pricing by users, devices, sites, servers, and coverage model',
      'Dedicated security, cloud, or project leadership',
      'Cloud migrations, office refreshes, ecommerce demos, and portal work',
      'A delivery model tuned to business-critical operations and approvals',
    ],
  },
];

export const pricingFaqs: FAQEntry[] = [
  {
    title: 'Do you support co-managed IT and internal teams?',
    content:
      'Yes. We frequently partner with internal IT, engineering, or security teams and take ownership of monitoring, escalations, project execution, or reporting where it helps most.',
  },
  {
    title: 'Are these exact prices or directional ranges?',
    content:
      'They are directional ranges based on common Chicago-area MSP structures. Final pricing depends on users, devices, locations, after-hours coverage, servers, compliance scope, and project load.',
  },
  {
    title: 'What changes the monthly price the most?',
    content:
      'The biggest drivers are user/device counts, server footprint, number of locations, Microsoft 365 and SaaS complexity, compliance scope, after-hours response expectations, and whether the engagement includes security depth or cloud/platform workstreams.',
  },
  {
    title: 'How quickly can onboarding start?',
    content:
      'Many SMB and mid-market environments can move from intake to active instrumentation within 10 to 14 days. More complex estates usually start with a phased rollout so access, monitoring, documentation, and response ownership come online cleanly.',
  },
  {
    title: 'Can you help with SOC 2, HIPAA, or audit preparation?',
    content:
      'We help implement controls, evidence habits, access reviews, backup proof, policy support, and operational practices that support readiness. We do not act as your formal auditor, but we make auditor conversations much less painful.',
  },
];

export const servicesFaqs: FAQEntry[] = [
  {
    title:
      'How do you decide whether we need MSP, security, cloud, or AI services first?',
    content:
      'We start with operational pressure points: downtime, risk exposure, modernization debt, or manual process drag. The best starting package usually solves the current constraint first, then layers in adjacent improvements.',
  },
  {
    title:
      'Can you phase work over time instead of forcing a big-bang project?',
    content:
      'Absolutely. Most clients begin with a focused 30- to 90-day priority lane and expand only after the first wave proves value. That keeps change manageable and budgets predictable.',
  },
  {
    title: 'Do you work with regulated or high-visibility environments?',
    content:
      'Yes. We support healthcare, financial services, manufacturing, professional services, retail, and SaaS teams where uptime, audit readiness, and access control matter.',
  },
  {
    title: 'What does a typical monthly operating rhythm look like?',
    content:
      'Expect weekly delivery signal, monthly reporting, clear escalation paths, and quarterly roadmap or security reviews depending on your plan.',
  },
  {
    title:
      'What if we need application engineering or cloud modernization on top of managed operations?',
    content:
      'That is one of our strongest fits. We can combine operational coverage with cloud engineering, platform hardening, automation, and AI delivery under a single operating model.',
  },
];

export const pricingSignals: TrustSignal[] = [
  {
    label: 'Directional Chicago ranges',
    sublabel: 'Ranges are meant to orient the first budget conversation',
  },
  {
    label: 'After-hours available',
    sublabel: '24/7 monitoring and response can be layered in where needed',
  },
  {
    label: 'Co-managed support',
    sublabel: 'Internal IT teams can keep ownership where it makes sense',
  },
  {
    label: 'Projects scoped separately',
    sublabel:
      'Migrations, office work, and digital builds stay visible on their own',
  },
];

export const slaComparisonRows: SlaComparisonRow[] = [
  {
    capability: 'Helpdesk and support coverage',
    essentials: 'Business-hours + monitored escalation',
    growth: 'Priority queue + proactive review',
    securePlus: 'Priority queue + co-managed / security-aware triage',
    custom: 'Custom routing and escalation matrix',
  },
  {
    capability: 'Endpoint / device management',
    essentials: 'Core monitoring and patching',
    growth: 'Enhanced hygiene + policy controls',
    securePlus: 'Advanced hardening and reporting',
    custom: 'Cross-site and bespoke fleet strategy',
  },
  {
    capability: 'Identity and access security',
    essentials: 'Foundational guidance',
    growth: 'MFA, SSO, and access review support',
    securePlus: 'Advanced identity governance',
    custom: 'Program-level identity architecture',
  },
  {
    capability: 'Incident readiness',
    essentials: 'Escalation playbook light',
    growth: 'Documented response ownership',
    securePlus: 'Managed response and recovery workflows',
    custom: 'Dedicated security program alignment',
  },
  {
    capability: 'Quarterly strategic reviews',
    essentials: 'Optional add-on',
    growth: 'Included',
    securePlus: 'Included with operational and security emphasis',
    custom: 'Included with executive cadence',
  },
  {
    capability: 'Cloud / project modernization',
    essentials: 'Light advisory',
    growth: 'Planned workstreams',
    securePlus: 'Security-led or co-managed modernization',
    custom: 'Dedicated engineering tracks',
  },
];
