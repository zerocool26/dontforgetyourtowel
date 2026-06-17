export type ResourceDecisionTool = {
  id: string;
  label: string;
  title: string;
  buyerQuestion: string;
  pressure: string;
  useWhen: string;
  checks: string[];
  output: string;
  owner: string;
  artifact: string;
  decision: string;
  guardrail: string;
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
    owner:
      'Operations lead, contract signer, and the person who controls admin access.',
    artifact:
      'Transition control sheet with access, vendor, backup, and contract ownership.',
    decision:
      'Decide whether this needs quiet documentation capture or an active cutover plan.',
    guardrail:
      'Do not start tool swaps until access, backup, vendor, and contract ownership are visible.',
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
    owner:
      'Operations or finance leader who can rank systems by business interruption.',
    artifact:
      'Recovery order with protected systems, retention assumptions, and restore proof.',
    decision:
      'Decide which systems deserve restore testing before any new backup spend.',
    guardrail:
      'Do not buy more backup software until protected systems and restore ownership are known.',
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
    owner:
      'Microsoft 365 admin, operations lead, and department owner for shared workspaces.',
    artifact:
      'Tenant cleanup score covering guests, stale workspaces, owners, and license drift.',
    decision:
      'Decide whether the next move is cleanup, governance rules, or license rationalization.',
    guardrail:
      'Do not launch a tenant-wide cleanup until owners and sharing exceptions are known.',
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
    owner:
      'Security owner, renewal contact, and whoever can confirm exceptions without guessing.',
    artifact:
      'Evidence pack outline for MFA, endpoint, email, backup, response, and exceptions.',
    decision:
      'Decide which controls are provable now and which gaps need leadership acceptance.',
    guardrail:
      'Do not answer renewal forms from memory when proof and exceptions can be separated.',
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
    owner:
      'Executive sponsor, daily support contact, and anyone accountable for vendor access.',
    artifact:
      'First-phase operating board for onboarding, stabilization, reporting, and roadmap risks.',
    decision:
      'Decide what must stabilize first and which improvements can wait for a later roadmap.',
    guardrail:
      'Do not frame onboarding as a tool rollout before ownership, reporting cadence, and unresolved risks are visible.',
    ctaHref: 'contact-hq/?service=managed-it',
    ctaLabel: 'Plan the first 30 days',
  },
];
