export type ProofMetric = {
  label: string;
  value: string;
  note: string;
};

export type ProofArtifact = {
  label: string;
  title: string;
  signal: string;
  proof: string;
};

export type CompetitorContrast = {
  buyerQuestion: string;
  genericMsp: string;
  chicagoMsp: string;
};

export type FitSignal = {
  label: string;
  title: string;
  state: 'strong' | 'watch' | 'no';
};

export const proofMetrics: ProofMetric[] = [
  {
    label: 'Response',
    value: 'owner named',
    note: 'Not just a ticket number',
  },
  {
    label: 'Recovery',
    value: 'restore proof',
    note: 'Backups tied to business priority',
  },
  {
    label: 'Microsoft 365',
    value: 'governance map',
    note: 'Access, sharing, licensing, sites',
  },
  {
    label: 'Budget',
    value: 'scope ledger',
    note: 'Recurring vs project work separated',
  },
];

export const proofArtifacts: ProofArtifact[] = [
  {
    label: '01',
    title: 'Owner map',
    signal: 'Tickets, vendors, devices, apps, and escalations stop drifting.',
    proof: 'Named owner, escalation rule, and next action',
  },
  {
    label: '02',
    title: 'Recovery receipt',
    signal: 'Backup confidence is shown before the emergency.',
    proof: 'Protected systems, restore access, priority order',
  },
  {
    label: '03',
    title: 'Access ledger',
    signal: 'Security becomes an operating habit, not an annual panic.',
    proof: 'Admin roles, MFA, risky sharing, exceptions',
  },
  {
    label: '04',
    title: 'Roadmap board',
    signal: 'Leadership can see what changed and what needs approval.',
    proof: '30/60/90 plan, lifecycle notes, budget decisions',
  },
];

export const competitorContrasts: CompetitorContrast[] = [
  {
    buyerQuestion: 'Who owns the messy middle?',
    genericMsp: 'Help desk, monitoring, and broad service lists.',
    chicagoMsp:
      'Named owner map across tickets, vendors, access, and projects.',
  },
  {
    buyerQuestion: 'Can leadership trust the backup story?',
    genericMsp: 'Backup listed as a feature.',
    chicagoMsp:
      'Recovery receipt with scope, restore access, and priority order.',
  },
  {
    buyerQuestion: 'Will pricing be defensible?',
    genericMsp: 'Quote after a sales call.',
    chicagoMsp:
      'Ranges, cost drivers, and recurring/project boundaries upfront.',
  },
  {
    buyerQuestion: 'Will Microsoft 365 stay sane?',
    genericMsp: 'Tenant administration.',
    chicagoMsp: 'Governance for sites, sharing, licenses, guests, and access.',
  },
];

export const fitSignals: FitSignal[] = [
  {
    label: 'Strong fit',
    title: '15-150 users, owner-led, operations-heavy, tired of loose ends.',
    state: 'strong',
  },
  {
    label: 'Good fit',
    title:
      'Internal IT needs help with support, security, backup, or projects.',
    state: 'watch',
  },
  {
    label: 'Poor fit',
    title: 'One-off break/fix with no appetite for standards or ownership.',
    state: 'no',
  },
];
