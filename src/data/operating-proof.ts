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
    area: 'Support',
    signal: 'Every open issue has an owner',
    status: 'clear',
    statusLabel: 'Owned',
    record: 'Support owner map',
    detail:
      'Tickets, vendors, users, devices, and escalations stay tied to one follow-up path.',
    href: 'services/#diagnostic-board',
  },
  {
    id: 'security-access',
    area: 'Security',
    signal: 'Access exceptions are reviewed',
    status: 'review',
    statusLabel: 'Review',
    record: 'Access review',
    detail:
      'MFA, admin roles, guests, risky forwarding, and exceptions get documented.',
    href: 'trust-center/',
  },
  {
    id: 'recovery',
    area: 'Recovery',
    signal: 'Backups need restore evidence',
    status: 'review',
    statusLabel: 'Check',
    record: 'Recovery notes',
    detail:
      'Protected systems, restore access, recovery order, and vendor dependencies are confirmed.',
    href: 'services/#technology-catalog',
  },
  {
    id: 'm365',
    area: 'Microsoft 365',
    signal: 'Sharing and licensing need owners',
    status: 'planned',
    statusLabel: 'Planned',
    record: 'Tenant cleanup plan',
    detail:
      'Teams, SharePoint, guest access, license waste, and backup assumptions get sorted.',
    href: 'services/#technology-catalog',
  },
  {
    id: 'pricing-scope',
    area: 'Pricing',
    signal: 'Monthly and project work stay separate',
    status: 'clear',
    statusLabel: 'Clear',
    record: 'Scope summary',
    detail:
      'Support coverage, security depth, onsite needs, and projects are separated before quoting.',
    href: 'pricing/',
  },
];
