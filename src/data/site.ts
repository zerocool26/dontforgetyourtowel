export type LinkItem = {
  label: string;
  href: string;
};

export type Service = {
  id: string;
  number: string;
  title: string;
  summary: string;
  detail: string;
  includes: string[];
};

export const navLinks: LinkItem[] = [
  { label: 'Services', href: 'services/' },
  { label: 'Software', href: 'software/' },
  { label: 'Pricing', href: 'pricing/' },
  { label: 'Trust', href: 'trust-center/' },
  { label: 'About', href: 'about/' },
];

export const services: Service[] = [
  {
    id: 'technology-advisory',
    number: '01',
    title: 'Technology advisory',
    summary:
      'Roadmaps, architecture, due diligence, vendor decisions, and senior technical direction tied to the business.',
    detail:
      'We turn competing priorities and technical uncertainty into a sequenced plan with decisions, owners, assumptions, and budget context.',
    includes: [
      'Technology strategy and roadmaps',
      'Architecture and platform decisions',
      'Technical due diligence',
      'Fractional technology leadership',
    ],
  },
  {
    id: 'software-product-engineering',
    number: '02',
    title: 'Software & product engineering',
    summary:
      'Custom applications, customer portals, internal systems, integrations, modernization, quality, and production ownership.',
    detail:
      'We define, design, engineer, test, launch, and support software that solves a specific operating or customer problem.',
    includes: [
      'Product definition and UX',
      'Web applications and portals',
      'APIs and system integrations',
      'Modernization, testing, and launch',
    ],
  },
  {
    id: 'cloud-platform-modernization',
    number: '03',
    title: 'Cloud & platform modernization',
    summary:
      'Cloud foundations, Microsoft 365, identity, migrations, observability, cost control, and legacy modernization.',
    detail:
      'We modernize the platforms beneath the business without losing control of identity, cost, reliability, or the path back.',
    includes: [
      'Cloud and Microsoft 365 architecture',
      'Migrations and platform engineering',
      'Identity and access foundations',
      'Observability and cost control',
    ],
  },
  {
    id: 'cybersecurity-resilience',
    number: '04',
    title: 'Cybersecurity & resilience',
    summary:
      'Security architecture, identity, endpoint and email controls, application security, recovery, and incident readiness.',
    detail:
      'Security is built into the environment and the delivery process, with practical controls, documented decisions, and recovery evidence.',
    includes: [
      'Security baselines and risk reviews',
      'Identity, endpoint, and email security',
      'Application and cloud security',
      'Backup, recovery, and incident readiness',
    ],
  },
  {
    id: 'managed-it-workplace',
    number: '05',
    title: 'Managed IT & workplace',
    summary:
      'Support, devices, Microsoft 365, networks, vendors, lifecycle planning, and co-managed day-to-day operations.',
    detail:
      'One accountable operating lane keeps people productive and prevents recurring issues, vendors, and platform decisions from drifting.',
    includes: [
      'Help desk and escalation',
      'Device and workplace management',
      'Onboarding and offboarding',
      'Network, vendor, and lifecycle ownership',
    ],
  },
  {
    id: 'data-integration-automation',
    number: '06',
    title: 'Data, integration & automation',
    summary:
      'Reliable data flows, system integration, reporting foundations, workflow automation, and governed model-enabled operations.',
    detail:
      'We connect systems and remove manual work only where the resulting workflow can be secured, measured, maintained, and owned.',
    includes: [
      'Data flow and reporting foundations',
      'Business system integrations',
      'Workflow and process automation',
      'Governed model-enabled workflows',
    ],
  },
];

export const processSteps = [
  {
    number: '01',
    title: 'Plan',
    detail:
      'See the current state, define the outcome, and sequence the right work.',
  },
  {
    number: '02',
    title: 'Build',
    detail:
      'Design and deliver the software, platform, integration, or change.',
  },
  {
    number: '03',
    title: 'Secure',
    detail:
      'Validate access, risk, recovery, quality, and operational readiness.',
  },
  {
    number: '04',
    title: 'Run',
    detail: 'Support, monitor, document, update, and continuously improve it.',
  },
];

export const proofRows = [
  {
    number: '01',
    title: 'Decisions',
    copy: 'A current-state view, an explicit recommendation, and the reasoning behind it.',
  },
  {
    number: '02',
    title: 'Delivery',
    copy: 'Defined scope, acceptance criteria, ownership, dependencies, and production handoff.',
  },
  {
    number: '03',
    title: 'Control',
    copy: 'Access, source, credentials, recovery, and security responsibilities made explicit.',
  },
  {
    number: '04',
    title: 'Operations',
    copy: 'Support path, documentation, open risks, improvement queue, and next decisions.',
  },
];

export const pricingTiers = [
  {
    id: 'essential',
    name: 'Essential',
    range: '$95–$125',
    low: 95,
    high: 125,
    description:
      'For teams formalizing support, endpoint management, patching, onboarding, and vendor follow-through.',
    includes: [
      'Help desk and escalation',
      'Endpoint oversight',
      'Onboarding and offboarding',
      'Basic vendor coordination',
    ],
  },
  {
    id: 'managed',
    name: 'Managed',
    range: '$135–$175',
    low: 135,
    high: 175,
    description:
      'For teams that also need stronger identity, Microsoft 365 governance, backup evidence, and recurring reviews.',
    includes: [
      'Everything in Essential',
      'Microsoft 365 administration',
      'Security baseline management',
      'Backup and monthly review',
    ],
  },
  {
    id: 'advanced',
    name: 'Advanced',
    range: '$165–$215',
    low: 165,
    high: 215,
    description:
      'For co-managed, regulated, or higher-complexity environments that need deeper documentation and recovery discipline.',
    includes: [
      'Everything in Managed',
      'Co-managed delivery options',
      'Deeper security coordination',
      'Roadmap and recovery cadence',
    ],
  },
];

export const pricingDrivers = [
  {
    title: 'People and environment',
    copy: 'User count, devices, locations, applications, cloud platforms, and inherited technical debt.',
  },
  {
    title: 'Outcome and scope',
    copy: 'The decision, system, migration, workflow, or operating responsibility the engagement must deliver.',
  },
  {
    title: 'Risk and assurance',
    copy: 'Security, recovery, regulatory pressure, quality gates, evidence, and production-readiness needs.',
  },
  {
    title: 'Delivery and coverage',
    copy: 'Timeline, team shape, business-hours or after-hours coverage, on-site work, and ongoing ownership.',
  },
];

export const trustAreas = [
  {
    title: 'Access and identity',
    copy: 'Privileged access is limited, reviewed, and tied to named responsibilities across infrastructure and software delivery.',
    ask: 'Ask who can administer systems, repositories, cloud accounts, and production environments—and how that access ends.',
  },
  {
    title: 'Source, data, and ownership',
    copy: 'Client ownership of source, data, credentials, domains, and production accounts is defined in the engagement.',
    ask: 'Ask where source and data live, what you own, and what a clean provider transition requires.',
  },
  {
    title: 'Security and recovery',
    copy: 'Application, cloud, workplace, backup, and recovery responsibilities are considered before production handoff.',
    ask: 'Ask what is protected, how it is validated, who can restore it, and what evidence is reviewed.',
  },
  {
    title: 'Delivery accountability',
    copy: 'Scope, acceptance criteria, open risks, support paths, and next decisions remain visible.',
    ask: 'Ask what marks the work complete, who accepts it, and who owns the system the following morning.',
  },
];

export const chicagoServices = [
  {
    slug: 'technology-consulting',
    title: 'Technology consulting',
    summary:
      'Roadmaps, architecture, due diligence, vendor decisions, and senior technical direction.',
  },
  {
    slug: 'custom-software-development',
    title: 'Custom software development',
    summary:
      'Applications, portals, integrations, modernization, testing, launch, and production ownership.',
  },
  {
    slug: 'cloud-modernization',
    title: 'Cloud and platform modernization',
    summary:
      'Cloud foundations, Microsoft 365, migrations, identity, observability, and cost control.',
  },
  {
    slug: 'managed-it',
    title: 'Managed IT services',
    summary:
      'Support, devices, networks, vendors, Microsoft 365, and day-to-day technology ownership.',
  },
  {
    slug: 'cybersecurity',
    title: 'Cybersecurity services',
    summary:
      'Identity, applications, cloud, email, endpoints, recovery, and practical security governance.',
  },
  {
    slug: 'data-integration-automation',
    title: 'Data, integration, and automation',
    summary:
      'Connected systems, reliable data flows, reporting foundations, and maintainable workflow automation.',
  },
  {
    slug: 'microsoft-365',
    title: 'Microsoft 365 services',
    summary:
      'Administration, security, licensing, Teams, SharePoint, identity, and guest access.',
  },
  {
    slug: 'backup-disaster-recovery',
    title: 'Backup and disaster recovery',
    summary:
      'Backup scope, restore evidence, recovery order, incident roles, and business continuity.',
  },
];
