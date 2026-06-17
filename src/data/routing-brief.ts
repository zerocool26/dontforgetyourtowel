export type RoutingBriefPressureId =
  | 'support-ownership'
  | 'security-evidence'
  | 'm365-cleanup'
  | 'backup-confidence'
  | 'provider-transition'
  | 'workflow-handoff';

export interface RoutingBriefPressure {
  id: RoutingBriefPressureId;
  label: string;
  title: string;
  subject: string;
  summary: string;
  owner: string;
  serviceIntent: string;
  fields: readonly string[];
  notNeededYet: string;
  firstResponse: string;
  expectedArtifact: string;
}

export interface RoutingBriefChoice {
  id: string;
  label: string;
  detail: string;
}

export const routingBriefPressures: readonly RoutingBriefPressure[] = [
  {
    id: 'support-ownership',
    label: 'Support ownership',
    title: 'Recurring issues need a clearer owner.',
    subject: 'Managed support ownership review',
    summary:
      'Tickets, escalations, vendors, onboarding, and device standards need a cleaner operating lane.',
    owner: 'Managed IT service owner',
    serviceIntent: 'managed-it',
    fields: [
      'User count',
      'Device count',
      'Current provider situation',
      'Top recurring tickets',
      'Locations and hours',
      'Apps that stop work',
    ],
    notNeededYet: 'A perfect device inventory or final SLA model.',
    firstResponse:
      'Likely support lane, missing counts, urgent blockers, and a first stabilization step.',
    expectedArtifact: 'Support ownership map',
  },
  {
    id: 'security-evidence',
    label: 'Security proof',
    title: 'Security needs evidence, not vague reassurance.',
    subject: 'Security evidence and cyber-insurance review',
    summary:
      'MFA, admin access, endpoint protection, backup evidence, and insurance questions need a practical review.',
    owner: 'Security advisory owner',
    serviceIntent: 'security',
    fields: [
      'Cyber-insurance requirements',
      'MFA status',
      'Endpoint protection tool',
      'Admin access concerns',
      'Recent incidents or alerts',
      'Backup evidence concerns',
    ],
    notNeededYet: 'A full audit package or formal compliance opinion.',
    firstResponse:
      'Priority controls, proof gaps, insurance blockers, and the safest review path.',
    expectedArtifact: 'Security evidence receipt',
  },
  {
    id: 'm365-cleanup',
    label: 'Microsoft 365 cleanup',
    title: 'The tenant works, but it feels messy.',
    subject: 'Microsoft 365 cleanup and governance review',
    summary:
      'SharePoint, Teams, licenses, external sharing, retention, and identity settings need clearer governance.',
    owner: 'Microsoft 365 and cloud owner',
    serviceIntent: 'microsoft-365',
    fields: [
      'License count',
      'Teams or SharePoint pain',
      'External sharing concerns',
      'Identity and MFA status',
      'File migration goals',
      'Retention or compliance pressure',
    ],
    notNeededYet: 'A finished information architecture or migration runbook.',
    firstResponse:
      'Tenant pressure points, governance risk, cleanup path, and first inspection list.',
    expectedArtifact: 'Tenant cleanup ledger',
  },
  {
    id: 'backup-confidence',
    label: 'Backup confidence',
    title: 'Recovery needs to be proven before it is urgent.',
    subject: 'Backup and recovery confidence review',
    summary:
      'Backups, restore tests, ransomware readiness, retention, and ownership need visible proof.',
    owner: 'Recovery and continuity owner',
    serviceIntent: 'backup-recovery',
    fields: [
      'Protected systems',
      'Current backup tool',
      'Last restore test',
      'Retention expectations',
      'Critical applications',
      'Recovery time pressure',
    ],
    notNeededYet: 'A complete disaster recovery plan.',
    firstResponse:
      'Restore proof gaps, urgent systems, recovery assumptions, and the first test path.',
    expectedArtifact: 'Recovery confidence receipt',
  },
  {
    id: 'provider-transition',
    label: 'Provider transition',
    title: 'The current provider relationship needs a calm exit plan.',
    subject: 'Provider transition and access handoff review',
    summary:
      'Admin access, documentation, tool ownership, renewals, billing, and support continuity need to be de-risked.',
    owner: 'Transition lead',
    serviceIntent: 'provider-switch',
    fields: [
      'Current provider concern',
      'Contract or renewal timing',
      'Admin access status',
      'Tool ownership',
      'Documentation quality',
      'Known service gaps',
    ],
    notNeededYet: 'A signed replacement plan or full vendor inventory.',
    firstResponse:
      'Transition risk, access gaps, continuity priorities, and a first handoff checklist.',
    expectedArtifact: 'Provider transition map',
  },
  {
    id: 'workflow-handoff',
    label: 'Workflow handoff',
    title: 'A client-facing path is creating friction.',
    subject: 'Workflow, portal, or intake handoff review',
    summary:
      'Forms, portals, service pages, intake routing, approvals, and status feedback need clearer movement.',
    owner: 'Workflow systems owner',
    serviceIntent: 'workflow-systems',
    fields: [
      'Current URL or workflow',
      'Primary audience',
      'Handoff owner',
      'Approval steps',
      'Systems involved',
      'Launch or repair window',
    ],
    notNeededYet: 'A polished product brief or finished screen design.',
    firstResponse:
      'Routing gaps, launch risk, required fields, and the first prototype or cleanup step.',
    expectedArtifact: 'Workflow routing brief',
  },
];

export const routingBriefCompanyShapes: readonly RoutingBriefChoice[] = [
  {
    id: 'growing-team',
    label: 'Growing team',
    detail: 'Roughly 10 to 75 users with shared vendors and uneven process.',
  },
  {
    id: 'multi-site',
    label: 'Multi-site',
    detail: 'Multiple locations, field teams, warehouses, or hybrid offices.',
  },
  {
    id: 'regulated',
    label: 'Regulated work',
    detail:
      'Insurance, audit, privacy, customer, or compliance pressure is in play.',
  },
  {
    id: 'not-sure',
    label: 'Not sure yet',
    detail: 'The shape is fuzzy and needs discovery before scope.',
  },
];

export const routingBriefTimelines: readonly RoutingBriefChoice[] = [
  {
    id: 'urgent',
    label: 'This week',
    detail: 'Something is blocking work, renewal, approval, or risk response.',
  },
  {
    id: 'month',
    label: 'This month',
    detail: 'There is time to inspect, prioritize, and start a focused path.',
  },
  {
    id: 'quarter',
    label: 'This quarter',
    detail:
      'Planning, budgeting, transition, or phased cleanup is the likely mode.',
  },
  {
    id: 'planning',
    label: 'Planning ahead',
    detail: 'The right next step is clarity before a formal project starts.',
  },
];
