export type ResourceDecisionTool = {
  id: string;
  label: string;
  title: string;
  buyerQuestion: string;
  pressure: string;
  useWhen: string;
  checks: string[];
  output: string;
  ctaHref: string;
  ctaLabel: string;
};

export const resourceDecisionTools: ResourceDecisionTool[] = [
  {
    id: 'provider-switch',
    label: 'Switching providers',
    title: 'Provider switch checklist',
    buyerQuestion:
      'What has to be captured before the old provider relationship ends?',
    pressure:
      'Access, backup, tools, contracts, vendors, and support history often become fragile during a provider transition.',
    useWhen:
      'Use this when contract timing, poor documentation, admin access, or backup ownership could make the switch messy.',
    checks: [
      'Admin access and MFA ownership',
      'Tool, vendor, and contract inventory',
      'Backup scope and last restore evidence',
    ],
    output:
      'Transition brief with owners, missing proof, and first cutover risk.',
    ctaHref: 'contact-hq/?service=provider-switch',
    ctaLabel: 'Start transition intake',
  },
  {
    id: 'backup-confidence',
    label: 'Recovery doubt',
    title: 'Backup confidence worksheet',
    buyerQuestion: 'If something fails tomorrow, what restores first?',
    pressure:
      'Backups are only useful when leadership knows what is protected, who can restore it, and which systems matter first.',
    useWhen:
      'Use this before cyber-insurance renewal, server changes, ransomware planning, or any outage concern.',
    checks: [
      'Protected systems and retention assumptions',
      'Restore access and test history',
      'Recovery priority by business impact',
    ],
    output: 'Recovery receipt with scope, priority order, and proof gaps.',
    ctaHref: 'contact-hq/?service=backup-recovery',
    ctaLabel: 'Review recovery proof',
  },
  {
    id: 'm365-sprawl',
    label: 'Microsoft 365',
    title: 'Microsoft 365 sprawl score',
    buyerQuestion:
      'Where are Teams, SharePoint, guests, and licenses drifting?',
    pressure:
      'Microsoft 365 grows quietly until access, sharing, search, retention, and license cost become hard to explain.',
    useWhen:
      'Use this when Teams sprawl, guest access, license waste, stale sites, or sharing rules are creating friction.',
    checks: [
      'Guest access and external sharing',
      'Stale Teams, sites, and owners',
      'License waste and admin-role drift',
    ],
    output:
      'Tenant cleanup score with owner rules and next governance decisions.',
    ctaHref: 'contact-hq/?service=microsoft-365',
    ctaLabel: 'Map Microsoft 365 cleanup',
  },
  {
    id: 'insurance-evidence',
    label: 'Insurance evidence',
    title: 'Cyber insurance evidence prep',
    buyerQuestion: 'Which controls can be evidenced instead of guessed?',
    pressure:
      'Insurance forms expose the gap between having security tools and being able to prove operating control.',
    useWhen:
      'Use this before renewal, audit pressure, board review, or a security project that needs business approval.',
    checks: [
      'MFA, admin, endpoint, and email posture',
      'Backup and response ownership',
      'Exceptions, gaps, and review cadence',
    ],
    output:
      'Evidence pack outline with controls, gaps, owners, and next actions.',
    ctaHref: 'contact-hq/?service=security',
    ctaLabel: 'Start evidence review',
  },
  {
    id: 'first-30-days',
    label: 'First 30 days',
    title: 'MSP transition first-30-days board',
    buyerQuestion: 'What should happen before the relationship feels stable?',
    pressure:
      'The first month should make ownership visible instead of burying the buyer in tool rollout noise.',
    useWhen:
      'Use this when leadership needs to understand onboarding, stabilization, reporting, and the first roadmap decisions.',
    checks: [
      'Baseline users, devices, apps, vendors, and tickets',
      'Stabilize access, backup, endpoint, and support routing',
      'Publish 30/60/90 owners, budget notes, and open risks',
    ],
    output:
      'First-phase operating board with owners, risks, and next decisions.',
    ctaHref: 'contact-hq/?service=managed-it',
    ctaLabel: 'Plan the first 30 days',
  },
];
