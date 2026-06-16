export type OperatingProofStatus = 'clear' | 'review' | 'planned' | 'risk';

export type OperatingProofRow = {
  id: string;
  area: string;
  signal: string;
  status: OperatingProofStatus;
  statusLabel: string;
  record: string;
  detail: string;
  href: string;
};

export const operatingProofRows: OperatingProofRow[] = [
  {
    id: 'support-ownership',
    area: 'Support ownership',
    signal: 'Ticket has owner',
    status: 'clear',
    statusLabel: 'Owned',
    record: 'Owner map',
    detail:
      'Tickets, vendors, users, devices, and escalations stay tied to one follow-up path.',
    href: 'services/#diagnostic-board',
  },
  {
    id: 'security-access',
    area: 'Access review',
    signal: 'Admin and MFA review',
    status: 'review',
    statusLabel: 'Needs review',
    record: 'Access ledger',
    detail:
      'MFA, admin roles, guests, risky forwarding, and exceptions get documented.',
    href: 'trust-center/',
  },
  {
    id: 'recovery',
    area: 'Recovery confidence',
    signal: 'Restore proof needed',
    status: 'review',
    statusLabel: 'Needs proof',
    record: 'Recovery receipt',
    detail:
      'Protected systems, restore access, recovery order, and vendor dependencies are confirmed.',
    href: 'services/#technology-catalog',
  },
  {
    id: 'm365',
    area: 'Microsoft 365',
    signal: 'Guest and sharing check',
    status: 'planned',
    statusLabel: 'Planned',
    record: 'Governance map',
    detail:
      'Teams, SharePoint, guest access, license waste, and backup assumptions get sorted.',
    href: 'services/#technology-catalog',
  },
  {
    id: 'pricing-scope',
    area: 'Scope boundary',
    signal: 'Recurring vs project split',
    status: 'clear',
    statusLabel: 'Clear',
    record: 'Scope ledger',
    detail:
      'Support coverage, security depth, onsite needs, and projects are separated before quoting.',
    href: 'pricing/',
  },
];
