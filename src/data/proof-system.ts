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
    title: 'Support owner map',
    signal:
      'Tickets, vendors, devices, apps, and escalations stay tied to a follow-up owner.',
    proof: 'Owner, escalation rule, and next action',
  },
  {
    label: '02',
    title: 'Recovery notes',
    signal:
      'Backup confidence is reviewed before an outage or security incident forces the issue.',
    proof: 'Protected systems, restore access, recovery order',
  },
  {
    label: '03',
    title: 'Access review',
    signal:
      'Admin roles, MFA, guest access, risky sharing, and exceptions are easier to explain.',
    proof: 'Admin roles, MFA, risky sharing, exceptions',
  },
  {
    label: '04',
    title: '90-day plan',
    signal:
      'Leadership can see what changed, what is waiting, and what needs approval.',
    proof: '30/60/90 plan, lifecycle notes, budget decisions',
  },
];

export const competitorContrasts: CompetitorContrast[] = [
  {
    buyerQuestion: 'Who owns the messy middle?',
    genericMsp: 'Help desk, monitoring, and a long service list.',
    chicagoMsp:
      'Named owners across tickets, vendors, access changes, and projects.',
  },
  {
    buyerQuestion: 'Can leadership trust the backup plan?',
    genericMsp: 'Backup is listed as a feature.',
    chicagoMsp:
      'Recovery notes with protected systems, restore access, and priority order.',
  },
  {
    buyerQuestion: 'Will pricing be defensible?',
    genericMsp: 'Quote after a sales call.',
    chicagoMsp:
      'Ranges, cost drivers, and recurring/project boundaries before discovery.',
  },
  {
    buyerQuestion: 'Will Microsoft 365 stay organized?',
    genericMsp: 'Basic tenant administration.',
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
