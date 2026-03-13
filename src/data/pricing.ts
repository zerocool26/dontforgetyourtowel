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
    id: 'essentials',
    name: 'Essentials',
    price: '$99 / user / mo',
    description:
      'Reliable support, patching, backup oversight, and monitoring for teams that need a calm baseline fast.',
    bestFor: 'Small teams standardising support and device hygiene',
    responseSla: 'Standard business-hours response with monitored escalation',
    ctaLabel: 'Start with Essentials',
    perks: [
      'Monitoring and alerting across endpoints',
      'Patch management with monthly reporting',
      'Backup oversight and restore coordination',
      'Helpdesk workflows with documented ownership',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '$149 / user / mo',
    description:
      'Adds stronger identity, security baselines, and roadmap leadership for companies scaling their stack.',
    bestFor: 'Hybrid teams that need proactive IT plus stronger governance',
    responseSla: 'Priority response and quarterly roadmap reviews',
    highlight: true,
    ctaLabel: 'Choose Growth',
    perks: [
      'Everything in Essentials',
      'Identity hardening with MFA and SSO support',
      'Security baseline and policy templates',
      'Quarterly roadmap review with action items',
    ],
  },
  {
    id: 'secure-plus',
    name: 'Secure+',
    price: '$199 / user / mo',
    description:
      'Advanced security depth and incident readiness for regulated or high-visibility environments.',
    bestFor: 'Healthcare, finance, SaaS, and audit-heavy teams',
    responseSla: 'Accelerated security response plus readiness playbooks',
    ctaLabel: 'Move to Secure+',
    perks: [
      'Everything in Growth',
      'Managed EDR and response workflows',
      'Security awareness program support',
      'Compliance readiness and evidence habits',
    ],
  },
  {
    id: 'custom',
    name: 'Custom',
    price: 'Quoted',
    description:
      'Built for multi-site operations, cloud-heavy estates, dedicated security programs, or product/platform engineering.',
    bestFor: 'Complex environments with layered delivery or vCISO needs',
    responseSla: 'Custom escalation matrix, SLAs, and operating cadence',
    ctaLabel: 'Design a custom plan',
    perks: [
      'Custom device, server, and site-based pricing',
      'Dedicated security and architecture leadership',
      'Cloud migration or application workstreams',
      'Delivery model tuned to business-critical operations',
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
    title: 'What changes the monthly price the most?',
    content:
      'The biggest drivers are user/device counts, server footprint, compliance scope, after-hours response expectations, and whether the engagement includes security depth or cloud/platform workstreams.',
  },
  {
    title: 'How quickly can onboarding start?',
    content:
      'Many SMB and mid-market environments can move from intake to active instrumentation within 10–14 days. More complex estates may require a phased rollout.',
  },
  {
    title: 'Can you help with SOC 2, HIPAA, or audit preparation?',
    content:
      'We help implement controls, evidence habits, and operational practices that support readiness. We do not act as your formal auditor, but we make auditor conversations much less painful.',
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
    label: '10–14 day onboarding',
    sublabel: 'Typical move from intake to active instrumentation',
  },
  {
    label: '24/7 monitoring option',
    sublabel: 'After-hours coverage for production-critical systems',
  },
  {
    label: 'Security + audit readiness',
    sublabel: 'SOC 2, HIPAA, and control-evidence habits built in',
  },
  {
    label: 'Roadmaps with SLAs',
    sublabel: 'Monthly operating reviews and clear escalation ownership',
  },
];

export const slaComparisonRows: SlaComparisonRow[] = [
  {
    capability: 'Helpdesk and support coverage',
    essentials: 'Business-hours + monitored escalation',
    growth: 'Priority queue + proactive review',
    securePlus: 'Priority queue + security-aware triage',
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
    securePlus: 'Managed response workflows',
    custom: 'Dedicated security program alignment',
  },
  {
    capability: 'Quarterly strategic reviews',
    essentials: 'Optional add-on',
    growth: 'Included',
    securePlus: 'Included with security emphasis',
    custom: 'Included with executive cadence',
  },
  {
    capability: 'Cloud / platform modernization',
    essentials: 'Light advisory',
    growth: 'Planned workstreams',
    securePlus: 'Security-led modernization',
    custom: 'Dedicated engineering tracks',
  },
];
