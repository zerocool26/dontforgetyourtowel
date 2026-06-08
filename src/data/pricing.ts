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
      'Directional range for firms that need a real support queue, patch visibility, endpoint oversight, onboarding help, and basic vendor follow-through.',
    bestFor: 'Smaller teams or first-time MSP buyers standardizing support',
    responseSla: 'Business-hours support with documented escalation',
    ctaLabel: 'Start with Core Coverage',
    perks: [
      'Help desk queue, monitoring, and patch visibility',
      'User onboarding, offboarding, and access-change workflows',
      'Endpoint inventory, device hygiene, warranty, and refresh notes',
      'Basic documentation, backup alert review, and vendor coordination',
    ],
  },
  {
    id: 'secure-operations',
    name: 'Secure Operations',
    price: '$135-$175 / user / mo',
    description:
      'Directional range for companies that need stronger identity controls, Microsoft 365 governance, backup evidence, reporting, and recurring review rhythm.',
    bestFor:
      'Hybrid teams that need proactive IT plus stronger security posture',
    responseSla: 'Priority response with regular review cadence',
    highlight: true,
    ctaLabel: 'Choose Secure Operations',
    perks: [
      'Everything in Core Coverage',
      'MFA, conditional access, admin-role, and guest-access review',
      'Email security, awareness support, and risky-forwarding checks',
      'Quarterly roadmap, lifecycle planning, and Microsoft 365 governance notes',
    ],
  },
  {
    id: 'co-managed',
    name: 'Co-Managed and Regulated',
    price: '$165-$215 / user / mo',
    description:
      'Directional range for internal IT partnerships, regulated environments, cyber-insurance pressure, and teams that need deeper documentation and recovery discipline.',
    bestFor: 'Healthcare, finance, manufacturing, and co-managed IT teams',
    responseSla:
      'Faster response, tighter escalation, and security-aware triage',
    ctaLabel: 'Move to Co-Managed',
    perks: [
      'Everything in Secure Operations',
      'Co-managed support for internal IT or operations staff',
      'Compliance readiness, evidence habits, and audit-support coordination',
      'Recovery runbooks, restore testing, change notes, and incident-role clarity',
    ],
  },
  {
    id: 'custom',
    name: 'Custom',
    price: 'Quoted after assessment',
    description:
      'Built for multi-site operations, cloud-heavy estates, dedicated security programs, office moves, server projects, or workflow-critical systems.',
    bestFor:
      'Complex environments with layered delivery, vCISO, or project work',
    responseSla: 'Custom escalation matrix, SLAs, and operating cadence',
    ctaLabel: 'Design a custom plan',
    perks: [
      'Custom pricing by users, devices, sites, servers, and coverage model',
      'Dedicated security, cloud, or project leadership',
      'Cloud migrations, office refreshes, server work, portals, and workflow systems',
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
      'How do you decide whether we need MSP, security, cloud, or workflow automation first?',
    content:
      'We start with operational pressure points: recurring tickets, stale access, backup uncertainty, cyber-insurance requirements, Microsoft 365 sprawl, downtime risk, or manual process drag. The best starting package usually solves the current constraint first, then layers in adjacent work.',
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
      'That can be a strong fit when the project affects operations, support, security, or a client-facing workflow. We can combine recurring coverage with cloud engineering, platform hardening, automation, portals, and intake improvements under one operating model.',
  },
];

export const pricingSignals: TrustSignal[] = [
  {
    label: 'Directional Chicago ranges',
    sublabel:
      'Ranges are meant to orient the first budget conversation, not replace discovery',
  },
  {
    label: 'After-hours available',
    sublabel:
      '24/7 monitoring and response can be layered in when the business case is real',
  },
  {
    label: 'Co-managed support',
    sublabel: 'Internal IT teams can keep ownership where it makes sense',
  },
  {
    label: 'Projects scoped separately',
    sublabel:
      'Migrations, office work, server projects, portals, and workflow builds stay visible on their own',
  },
];

export const slaComparisonRows: SlaComparisonRow[] = [
  {
    capability: 'Helpdesk and support coverage',
    essentials: 'Business-hours queue + escalation path',
    growth: 'Priority queue + monthly review',
    securePlus: 'Priority queue + co-managed or security-aware triage',
    custom: 'Custom routing and escalation matrix',
  },
  {
    capability: 'Endpoint / device management',
    essentials: 'Inventory, monitoring, and patch visibility',
    growth: 'Enhanced hygiene, warranty, and policy controls',
    securePlus: 'Hardening notes, encryption checks, and reporting',
    custom: 'Cross-site fleet standards and refresh planning',
  },
  {
    capability: 'Identity and access security',
    essentials: 'Foundational MFA and admin review',
    growth: 'MFA, SSO, guest access, and access-review support',
    securePlus: 'Conditional access and advanced identity governance',
    custom: 'Program-level identity architecture and policy design',
  },
  {
    capability: 'Incident readiness',
    essentials: 'Light escalation playbook',
    growth: 'Documented response ownership',
    securePlus: 'Managed response and recovery workflow planning',
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
