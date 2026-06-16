export type ResourceLibraryStatus = 'verified' | 'review' | 'planned';

export type ResourceLibraryLane = {
  label: string;
  shortLabel: string;
  copy: string;
  filter: string;
  href: string;
  proof: string;
};

export type ResourceLibraryRecord = {
  lane: string;
  stage: string;
  buyerQuestion: string;
  pressure: string;
  evidence: string[];
  nextAction: string;
  ctaHref: string;
  ctaLabel: string;
  proofCue: string;
  status: ResourceLibraryStatus;
};

export const resourceLibraryLanes: ResourceLibraryLane[] = [
  {
    label: 'Provider transition',
    shortLabel: 'Switching providers',
    copy: 'Use these notes when contracts, admin access, backup scope, or tool ownership could make a handoff fragile.',
    filter: 'Provider transition',
    href: 'contact-hq/?service=provider-switch',
    proof:
      'Access, tools, vendors, and recovery proof before the old relationship ends.',
  },
  {
    label: 'Security baseline',
    shortLabel: 'Security posture',
    copy: 'Start here when leadership needs a plain operating baseline before buying another security tool.',
    filter: 'Security baseline',
    href: 'trust-center/',
    proof: 'MFA, endpoint, email, backup, and response ownership made visible.',
  },
  {
    label: 'Microsoft 365 cleanup',
    shortLabel: 'M365 cleanup',
    copy: 'Follow this path when Teams, SharePoint, guests, licenses, or stale owners are slowing work down.',
    filter: 'Microsoft 365 cleanup',
    href: 'services/?service=microsoft-365',
    proof:
      'Tenant sprawl, sharing rules, and workspace ownership converted into decisions.',
  },
  {
    label: 'Workflow handoff',
    shortLabel: 'Intake + systems',
    copy: 'Use this lane when the technology problem is really a routing, ownership, or follow-up clarity problem.',
    filter: 'Workflow handoff',
    href: 'contact-hq/?service=workflow-systems',
    proof:
      'Forms, status cues, proof moments, and next-step ownership tested before build scope.',
  },
];

const fallbackRecord: ResourceLibraryRecord = {
  lane: 'Buyer clarity',
  stage: 'Readiness note',
  buyerQuestion: 'What decision should this help the buyer make next?',
  pressure:
    'Good resource content should reduce ambiguity before a call, contract, project, or internal review.',
  evidence: [
    'Problem named in plain language',
    'Ownership or proof cue identified',
    'Next conversation made easier',
  ],
  nextAction: 'Use this note to frame the next intake question.',
  ctaHref: 'contact-hq/',
  ctaLabel: 'Start a fit review',
  proofCue: 'Decision clarity before scope.',
  status: 'planned',
};

export const resourceLibraryRecords: Record<string, ResourceLibraryRecord> = {
  'managed-it-provider-first-30-days': {
    lane: 'Provider transition',
    stage: 'First 30 days',
    buyerQuestion:
      'What should a managed IT provider own before the relationship feels stable?',
    pressure:
      'The first month can expose weak access records, unclear vendor ownership, backup uncertainty, and support routing gaps.',
    evidence: [
      'Users, devices, apps, vendors, and recurring tickets mapped',
      'Access, backup, endpoint, and support routing stabilized',
      '30/60/90 owners, risks, and budget notes published',
    ],
    nextAction: 'Build the onboarding ownership map.',
    ctaHref: 'contact-hq/?service=managed-it',
    ctaLabel: 'Plan the first 30 days',
    proofCue: 'Runbook, support lane, and first roadmap decisions.',
    status: 'verified',
  },
  'chicago-smb-security-baseline': {
    lane: 'Security baseline',
    stage: 'Control baseline',
    buyerQuestion:
      'Which identity, email, endpoint, backup, and response basics should come before bigger projects?',
    pressure:
      'Security spend gets noisy when leadership cannot tell which controls are enforced, evidenced, or owned.',
    evidence: [
      'MFA, admin roles, and conditional access reviewed',
      'Email, endpoint, and encryption basics checked',
      'Backup restore path and response contacts clarified',
    ],
    nextAction: 'Create the baseline evidence list.',
    ctaHref: 'trust-center/',
    ctaLabel: 'Review trust proof',
    proofCue: 'Visible, testable, boring-in-the-best-way controls.',
    status: 'verified',
  },
  'microsoft-365-cleanup-business-project': {
    lane: 'Microsoft 365 cleanup',
    stage: 'Tenant cleanup',
    buyerQuestion:
      'Where are Teams, SharePoint, guests, permissions, retention, and backup drifting?',
    pressure:
      'Microsoft 365 sprawl creates search friction, access risk, license waste, and unclear ownership.',
    evidence: [
      'Workspace owners, stale sites, and guest access identified',
      'Backup and retention assumptions separated',
      'Lifecycle, naming, and request rules made repeatable',
    ],
    nextAction: 'Score the cleanup and ownership model.',
    ctaHref: 'contact-hq/?service=microsoft-365',
    ctaLabel: 'Map Microsoft 365 cleanup',
    proofCue: 'Governance decisions, not just tenant settings.',
    status: 'review',
  },
  'competent-msp-website-signals': {
    lane: 'Provider transition',
    stage: 'Provider fit',
    buyerQuestion:
      'What should a competent MSP website say clearly before a buyer books a call?',
    pressure:
      'Generic MSP positioning makes buyers work too hard to understand ownership, fit, scope, and proof.',
    evidence: [
      'Support, security, backup, strategy, and pricing ownership named',
      'Operating maturity questions answered near decisions',
      'Copy sounds like a real operator, not a category list',
    ],
    nextAction: 'Check whether provider proof is specific enough.',
    ctaHref: 'services/',
    ctaLabel: 'Explore service ownership',
    proofCue: 'Fit, ownership, and proof before sales language.',
    status: 'review',
  },
  'client-intake-workflow-review-before-build': {
    lane: 'Workflow handoff',
    stage: 'Intake rehearsal',
    buyerQuestion:
      'Can the workflow prove routing, ownership, mobile behavior, and follow-up clarity before a real build?',
    pressure:
      'A workflow can look polished while still hiding friction at the service choice, proof, form, or handoff moment.',
    evidence: [
      'Routing, form friction, and ownership cues tested',
      'Mobile service choice and proof placement reviewed',
      'Follow-up expectations made visible before launch',
    ],
    nextAction: 'Review the handoff before build scope.',
    ctaHref: 'contact-hq/?service=workflow-systems',
    ctaLabel: 'Review intake workflow',
    proofCue: 'A launch rehearsal before production scope.',
    status: 'planned',
  },
};

export const resourceLibraryProof = [
  {
    label: '01 / Read',
    title: 'Buyer question first',
    copy: 'Every note starts from a decision a business operator actually has to make.',
    status: 'verified' as const,
  },
  {
    label: '02 / Inspect',
    title: 'Evidence before opinion',
    copy: 'The library points toward access, backup, security, ownership, and workflow proof.',
    status: 'review' as const,
  },
  {
    label: '03 / Act',
    title: 'Next move attached',
    copy: 'Articles route to a worksheet, trust review, service lane, or intake conversation.',
    status: 'planned' as const,
  },
];

export const getResourceLibraryRecord = (slug: string): ResourceLibraryRecord =>
  resourceLibraryRecords[slug] ?? fallbackRecord;
