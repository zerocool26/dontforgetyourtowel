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

export interface ScopeLedgerDriver {
  id: string;
  label: string;
  shortLabel: string;
  whyItMovesCost: string;
  recurringImpact: string;
  projectImpact: string;
  discoveryTrigger: string;
  evidenceToBring: string[];
  likelyPlanIds: Array<
    'core-coverage' | 'secure-operations' | 'co-managed' | 'custom'
  >;
  defaultSelected?: boolean;
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

export const scopeLedgerDrivers: ScopeLedgerDriver[] = [
  {
    id: 'users-devices',
    label: 'Users, devices, and shared workstations',
    shortLabel: 'Users + devices',
    whyItMovesCost:
      'More people and endpoints create more support, patching, onboarding, offboarding, and lifecycle work.',
    recurringImpact:
      'Help desk coverage, endpoint monitoring, patching, access changes, and device standards.',
    projectImpact:
      'Device refreshes, imaging standards, cleanup, warranty work, and onboarding rebuilds.',
    discoveryTrigger:
      'Unknown shared machines, stale devices, or no clear inventory.',
    evidenceToBring: [
      'User count',
      'Device count',
      'Shared workstation count',
      'Current inventory notes',
    ],
    likelyPlanIds: ['core-coverage', 'secure-operations'],
    defaultSelected: true,
  },
  {
    id: 'locations-onsite',
    label: 'Locations, onsite needs, and office coverage',
    shortLabel: 'Locations',
    whyItMovesCost:
      'Multiple sites add coordination, hardware, network, vendor, travel, and escalation complexity.',
    recurringImpact:
      'Site-aware support, vendor coordination, network checks, and escalation routing.',
    projectImpact:
      'Office moves, Wi-Fi refreshes, cabling coordination, firewall work, and hardware replacement.',
    discoveryTrigger:
      'More than one office, production areas, or recurring onsite needs.',
    evidenceToBring: [
      'Office count',
      'Onsite expectations',
      'Network gear list',
      'Known move or refresh dates',
    ],
    likelyPlanIds: ['secure-operations', 'co-managed', 'custom'],
  },
  {
    id: 'response-hours',
    label: 'Response hours and escalation expectations',
    shortLabel: 'Response',
    whyItMovesCost:
      'After-hours coverage, executive escalation, and faster response require staffing and process commitments.',
    recurringImpact:
      'Priority routing, escalation rules, review cadence, and response expectations.',
    projectImpact:
      'Escalation design, contact cleanup, runbook creation, and alert-routing changes.',
    discoveryTrigger:
      'After-hours operations, VIP support, urgent customer-facing systems, or unclear escalation.',
    evidenceToBring: [
      'Business hours',
      'After-hours needs',
      'Critical users or teams',
      'Current escalation pain',
    ],
    likelyPlanIds: ['secure-operations', 'co-managed', 'custom'],
  },
  {
    id: 'security-depth',
    label: 'Security depth and control evidence',
    shortLabel: 'Security',
    whyItMovesCost:
      'Identity, endpoint, email, backup proof, awareness, and incident readiness add recurring review work.',
    recurringImpact:
      'MFA review, admin-role checks, endpoint and email controls, exceptions, and evidence notes.',
    projectImpact:
      'Control cleanup, policy work, MDR rollout, insurance remediation, and incident planning.',
    discoveryTrigger:
      'Insurance renewal, audit request, recent incident, or unknown security coverage.',
    evidenceToBring: [
      'Insurance questionnaire',
      'MFA status',
      'Endpoint tool',
      'Email security notes',
      'Recent incident history',
    ],
    likelyPlanIds: ['secure-operations', 'co-managed', 'custom'],
    defaultSelected: true,
  },
  {
    id: 'compliance-insurance',
    label: 'Compliance, audit, and cyber-insurance pressure',
    shortLabel: 'Compliance',
    whyItMovesCost:
      'Audit support and insurance evidence add control mapping, exception notes, remediation sequencing, and leadership review.',
    recurringImpact:
      'Evidence cadence, exception tracking, security review notes, and control-owner follow-up.',
    projectImpact:
      'Questionnaire response, audit prep, policy cleanup, remediation sprints, and evidence-pack buildout.',
    discoveryTrigger:
      'Renewal, questionnaire, audit request, client requirement, or unclear control evidence.',
    evidenceToBring: [
      'Insurance questionnaire',
      'Audit deadline',
      'Current control notes',
      'Known evidence gaps',
    ],
    likelyPlanIds: ['co-managed', 'custom'],
  },
  {
    id: 'm365-governance',
    label: 'Microsoft 365, sharing, guests, and licensing',
    shortLabel: 'Microsoft 365',
    whyItMovesCost:
      'Tenant sprawl creates recurring admin work around access, licenses, Teams, SharePoint, and recovery assumptions.',
    recurringImpact:
      'License review, access changes, guest review, sharing rules, mailbox support, and admin tasks.',
    projectImpact:
      'Tenant cleanup, migration work, SharePoint structure, retention decisions, and user adoption.',
    discoveryTrigger:
      'Unknown guests, stale Teams, license waste, risky sharing, or migration pressure.',
    evidenceToBring: [
      'License count',
      'Tenant admin notes',
      'Teams/SharePoint pain',
      'Guest sharing concerns',
    ],
    likelyPlanIds: ['secure-operations', 'co-managed', 'custom'],
  },
  {
    id: 'backup-recovery',
    label: 'Backup, restore proof, and recovery priorities',
    shortLabel: 'Recovery',
    whyItMovesCost:
      'Recovery confidence depends on protected systems, restore access, monitoring, retention, and business priority.',
    recurringImpact:
      'Backup alert review, recovery notes, restore reminders, and routine reporting.',
    projectImpact:
      'Backup redesign, restore testing, ransomware recovery planning, and runbook creation.',
    discoveryTrigger:
      'No restore history, unclear backup scope, ransomware concern, or critical systems without owners.',
    evidenceToBring: [
      'Backup tool',
      'Protected systems list',
      'Last restore test',
      'Critical application list',
    ],
    likelyPlanIds: ['secure-operations', 'co-managed', 'custom'],
    defaultSelected: true,
  },
  {
    id: 'servers-apps',
    label: 'Servers, cloud, and line-of-business applications',
    shortLabel: 'Servers + apps',
    whyItMovesCost:
      'Servers and critical applications add vendor coordination, monitoring, patching, backup, and change-control needs.',
    recurringImpact:
      'Monitoring, patch windows, vendor tickets, backup checks, and admin coordination.',
    projectImpact:
      'Server migration, cloud cleanup, application upgrades, and infrastructure refreshes.',
    discoveryTrigger:
      'Aging servers, custom applications, vendor constraints, or no documented ownership.',
    evidenceToBring: [
      'Server count',
      'Critical app list',
      'Vendor contacts',
      'Cloud footprint',
    ],
    likelyPlanIds: ['co-managed', 'custom'],
  },
  {
    id: 'provider-transition',
    label: 'Current provider transition and access handoff',
    shortLabel: 'Provider switch',
    whyItMovesCost:
      'Switching providers adds access transfer, documentation recovery, backup validation, and user communication.',
    recurringImpact:
      'Transition support, ticket routing, vendor ownership, and early stabilization cadence.',
    projectImpact:
      'Access takeover, documentation rebuild, tool migration, backup handoff, and cutover planning.',
    discoveryTrigger:
      'Provider contract ending, poor documentation, unknown admin access, or unresolved backup ownership.',
    evidenceToBring: [
      'Contract timing',
      'Admin access status',
      'Tool list',
      'Top reasons for switching',
    ],
    likelyPlanIds: ['secure-operations', 'co-managed', 'custom'],
  },
  {
    id: 'co-managed-boundaries',
    label: 'Co-managed boundaries and internal IT ownership',
    shortLabel: 'Co-managed',
    whyItMovesCost:
      'Shared ownership needs clear lanes for escalations, admin rights, projects, reporting, and decision authority.',
    recurringImpact:
      'Escalation lane, shared ticket ownership, internal IT coordination, reporting, and standards review.',
    projectImpact:
      'Role mapping, permissions cleanup, operating model design, documentation rebuild, and kickoff alignment.',
    discoveryTrigger:
      'Internal IT exists, ownership is unclear, or multiple teams touch the same systems.',
    evidenceToBring: [
      'Internal IT roles',
      'Escalation pain',
      'Admin access boundaries',
      'Reporting expectations',
    ],
    likelyPlanIds: ['co-managed', 'custom'],
  },
  {
    id: 'vendor-ownership',
    label: 'Vendor ownership and third-party escalation',
    shortLabel: 'Vendors',
    whyItMovesCost:
      'Line-of-business, telecom, cloud, security, and hardware vendors add recurring coordination when issues cross boundaries.',
    recurringImpact:
      'Vendor contact upkeep, ticket escalation, renewal visibility, and ownership notes for recurring issues.',
    projectImpact:
      'Vendor map creation, access transfer, contract cleanup, and escalation process design.',
    discoveryTrigger:
      'Too many vendors, unclear contracts, recurring blame loops, or no owner for open cases.',
    evidenceToBring: [
      'Vendor list',
      'Support contacts',
      'Open vendor cases',
      'Renewal dates',
    ],
    likelyPlanIds: ['secure-operations', 'co-managed', 'custom'],
  },
  {
    id: 'projects-six-months',
    label: 'Known projects in the next six months',
    shortLabel: 'Projects',
    whyItMovesCost:
      'Moves, migrations, portal work, refreshes, and cleanup projects should not disappear inside monthly support.',
    recurringImpact:
      'Roadmap review, budget planning, stakeholder coordination, and vendor sequencing.',
    projectImpact:
      'Migration, refresh, office, workflow, automation, portal, or remediation scope.',
    discoveryTrigger:
      'Multiple upcoming changes, unclear owner, fixed launch date, or budget approval pressure.',
    evidenceToBring: [
      'Project list',
      'Target dates',
      'Approval owner',
      'Known vendors',
    ],
    likelyPlanIds: ['co-managed', 'custom'],
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
