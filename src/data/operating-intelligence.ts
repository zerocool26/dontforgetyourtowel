export interface OperatingIntelligenceItem {
  id: string;
  label: string;
  title: string;
  question: string;
  summary: string;
  owner: string;
  investmentSignal: string;
  path: string;
  ctaLabel: string;
  signals: string[];
  firstActions: string[];
  evidence: string[];
  automations: string[];
  motion: {
    stabilize: string;
    harden: string;
    modernize: string;
  };
}

export const operatingIntelligenceItems: OperatingIntelligenceItem[] = [
  {
    id: 'support-ownership',
    label: 'Support',
    title: 'Support ownership system',
    question:
      'Who owns the issue when a ticket touches users, vendors, devices, and leadership?',
    summary:
      'Turns daily IT support into a visible operating lane with ticket routing, escalation rules, device standards, onboarding, vendor follow-through, and recurring-issue reduction.',
    owner: 'Operations + service lead',
    investmentSignal:
      'Usually driven by user count, device condition, sites, hours, and response expectations.',
    path: 'services/#service-tracks',
    ctaLabel: 'View support track',
    signals: [
      'The same users report the same issues every month.',
      'Vendors bounce problems back without a clear owner.',
      'Onboarding and offboarding depend on memory or favors.',
      'Leadership cannot see what is open, aging, recurring, or blocked.',
    ],
    firstActions: [
      'Map users, devices, vendors, applications, and recurring tickets.',
      'Separate break/fix, access, device, vendor, and executive escalation lanes.',
      'Create a weekly support view with open, blocked, aging, recurring, and approval-needed items.',
    ],
    evidence: [
      'Ticket lane map',
      'Endpoint inventory',
      'Onboarding/offboarding checklist',
      'Vendor escalation record',
      'Recurring issue register',
      'Weekly leadership summary',
    ],
    automations: [
      'New-hire setup requests',
      'Stale-ticket nudges',
      'Recurring ticket clustering',
      'Vendor follow-up reminders',
    ],
    motion: {
      stabilize:
        'Start with queue triage, escalation rules, urgent user friction, and the top recurring issues.',
      harden:
        'Add endpoint standards, onboarding controls, vendor records, reporting, and service-level expectations.',
      modernize:
        'Connect support data to budget planning, lifecycle refreshes, automation candidates, and service reviews.',
    },
  },
  {
    id: 'security-evidence',
    label: 'Security',
    title: 'Security evidence system',
    question:
      'Can the business prove the basics are controlled without buying another tool first?',
    summary:
      'Builds reviewable security evidence around identity, endpoint health, email controls, risky forwarding, admin access, backup status, response contacts, and insurance pressure.',
    owner: 'Leadership + security owner',
    investmentSignal:
      'Usually driven by insurance requirements, compliance pressure, endpoint risk, monitoring depth, and incident readiness.',
    path: 'services/#technology-catalog',
    ctaLabel: 'Open security catalog',
    signals: [
      'Cyber-insurance questions create last-minute scrambling.',
      'Admin roles, MFA, forwarding, and guest access are unclear.',
      'Endpoint protection exists, but no one can explain coverage or exceptions.',
      'Incident contacts and response decisions are not written down.',
    ],
    firstActions: [
      'Review MFA, conditional access, admin roles, risky forwarding, endpoint protection, and backup alerts.',
      'Separate gaps into quick controls, policy decisions, tool changes, and leadership approvals.',
      'Create an evidence pack that can support insurance, audit, and executive review.',
    ],
    evidence: [
      'MFA and access review',
      'Endpoint coverage summary',
      'Email risk findings',
      'Backup and restore evidence',
      'Incident contact sheet',
      'Insurance control notes',
    ],
    automations: [
      'Risky forwarding alerts',
      'Admin role review reminders',
      'Backup evidence snapshots',
      'Security exception register',
    ],
    motion: {
      stabilize:
        'Close the obvious control gaps first: MFA, admin roles, endpoint coverage, backup alerts, and response contacts.',
      harden:
        'Add conditional access, email controls, reporting, exception tracking, restore proof, and insurance evidence.',
      modernize:
        'Layer in MDR, awareness, tabletop exercises, policy cleanup, and recurring executive risk reviews.',
    },
  },
  {
    id: 'm365-governance',
    label: 'Microsoft 365',
    title: 'Microsoft 365 governance system',
    question:
      'Is Microsoft 365 helping the team work, or quietly creating risk and clutter?',
    summary:
      'Organizes Teams, SharePoint, Exchange, OneDrive, licenses, guest access, retention assumptions, backup expectations, and lifecycle rules into decisions people can own.',
    owner: 'Operations + Microsoft 365 admin',
    investmentSignal:
      'Usually driven by tenant complexity, migration needs, license waste, sharing risk, backup assumptions, and adoption support.',
    path: 'services/#technology-catalog',
    ctaLabel: 'Review Microsoft 365 work',
    signals: [
      'Teams and SharePoint grew without lifecycle rules.',
      'Licenses, groups, guests, and external sharing are hard to explain.',
      'Users cannot find the right file, channel, or source of truth.',
      'Backup, retention, and recovery assumptions are not agreed on.',
    ],
    firstActions: [
      'Map Teams, SharePoint sites, groups, licenses, guest access, retention assumptions, and backup coverage.',
      'Flag risky sharing, stale groups, license waste, unclear ownership, and high-value cleanup candidates.',
      'Create a governance roadmap with fast fixes, policy decisions, migration work, and user adoption needs.',
    ],
    evidence: [
      'Tenant ownership map',
      'License and renewal view',
      'Guest access review',
      'Sharing and retention notes',
      'Backup expectation summary',
      'Cleanup roadmap',
    ],
    automations: [
      'Guest review cadence',
      'License waste detection',
      'SharePoint lifecycle prompts',
      'Approval routing for new sites',
    ],
    motion: {
      stabilize:
        'Identify risky sharing, stale access, urgent license waste, backup assumptions, and ownerless sites.',
      harden:
        'Set lifecycle rules, guest review cadence, external sharing policy, backup expectations, and admin roles.',
      modernize:
        'Use clean information architecture, automation, dashboards, and adoption support to reduce daily friction.',
    },
  },
  {
    id: 'recovery-confidence',
    label: 'Recovery',
    title: 'Backup and recovery confidence system',
    question:
      'If something fails tomorrow, what can be restored, by whom, and in what order?',
    summary:
      'Connects backup monitoring, restore tests, retention, ransomware recovery, vendor dependencies, communications, and continuity priorities into a realistic recovery model.',
    owner: 'Leadership + continuity owner',
    investmentSignal:
      'Usually driven by critical systems, retention needs, recovery-time expectations, ransomware risk, and vendor dependencies.',
    path: 'services/#technology-catalog',
    ctaLabel: 'Review recovery coverage',
    signals: [
      'Backup dashboards look green, but restore proof is thin.',
      'Critical systems, owners, and recovery order are not documented.',
      'Ransomware planning depends on assumptions instead of a runbook.',
      'Leadership cannot name the communication plan during downtime.',
    ],
    firstActions: [
      'Confirm protected systems, backup frequency, retention, alert handling, restore access, and vendor dependencies.',
      'Run a practical restore proof for a representative system or file set.',
      'Document recovery order, decision owners, communication paths, and escalation contacts.',
    ],
    evidence: [
      'Protected systems list',
      'Backup alert review',
      'Restore test result',
      'Recovery order map',
      'Vendor dependency list',
      'Continuity runbook',
    ],
    automations: [
      'Backup alert summaries',
      'Restore test reminders',
      'Recovery owner check-ins',
      'Continuity document review cadence',
    ],
    motion: {
      stabilize:
        'Verify alerts, protected systems, restore access, urgent gaps, and the minimum viable recovery path.',
      harden:
        'Add restore testing, immutable backup review, vendor contacts, communication notes, and recovery order.',
      modernize:
        'Build continuity exercises, executive reporting, tabletop scenarios, and recurring recovery proof.',
    },
  },
  {
    id: 'workflow-trust',
    label: 'Workflow',
    title: 'Portal and intake workflow system',
    question:
      'Does the client-facing workflow make the business easier to contact, route, and serve?',
    summary:
      'Treats portals, forms, intake paths, service pages, and client-facing screens as operating systems with owner decisions, proof, mobile behavior, analytics, and launch ownership.',
    owner: 'Sales + operations + digital owner',
    investmentSignal:
      'Usually driven by priority pages, content readiness, proof gaps, launch timing, integrations, analytics, and workflow depth.',
    path: 'services/#service-planner',
    ctaLabel: 'Open workflow planning',
    signals: [
      'The real service is strong, but the intake or portal path feels smaller than the company.',
      'Buyers cannot quickly find proof, pricing logic, services, or a next step.',
      'Forms, portals, or handoff paths create dead ends on mobile.',
      'There is no review trail for what changed, why, and how success is measured.',
    ],
    firstActions: [
      'Map the service path, top questions, proof gaps, mobile friction, analytics, and handoff points.',
      'Prioritize the few screens that most affect trust, clarity, intake, or service movement.',
      'Prototype the target flow before expanding into design, content, integrations, or launch work.',
    ],
    evidence: [
      'Buyer path map',
      'Priority screen list',
      'Trust gap review',
      'Mobile friction notes',
      'Analytics and event plan',
      'Launch criteria',
    ],
    automations: [
      'Lead routing rules',
      'Proposal starter data',
      'Form qualification logic',
      'Launch QA checklist',
    ],
    motion: {
      stabilize:
        'Fix the highest-friction pages, broken handoffs, unclear CTAs, mobile problems, and missing proof.',
      harden:
        'Add clearer content structure, proof systems, intake logic, analytics, accessibility, and launch QA.',
      modernize:
        'Build calculators, portals, saved states, routing rules, and reviewable client-facing workflows.',
    },
  },
];
