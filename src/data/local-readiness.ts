export type LocalReadinessSignal = {
  id: string;
  zone: string;
  label: string;
  question: string;
  proof: string;
  firstMove: string;
};

export type LocalReadinessOutcome = {
  label: string;
  value: string;
};

export const localReadinessSignals: LocalReadinessSignal[] = [
  {
    id: 'coverage-route',
    zone: 'Route 01',
    label: 'Locations + hours',
    question: 'Which offices, teams, and hours need actual coverage?',
    proof: 'Location list, business hours, onsite expectations, urgent users.',
    firstMove: 'Name the coverage lane before tools or response promises.',
  },
  {
    id: 'access-boundary',
    zone: 'Route 02',
    label: 'Access boundary',
    question: 'Can leadership name admins, guests, MFA gaps, and exceptions?',
    proof: 'Admin roles, guest access, MFA exceptions, approval path.',
    firstMove: 'Review identity risk before expanding support access.',
  },
  {
    id: 'recovery-order',
    zone: 'Route 03',
    label: 'Recovery order',
    question: 'What restores first across servers, SaaS, cloud, and devices?',
    proof: 'Protected systems, restore access, backup scope, priority apps.',
    firstMove: 'Turn backup assumptions into a recovery order.',
  },
  {
    id: 'vendor-handoff',
    zone: 'Route 04',
    label: 'Vendor handoff',
    question: 'Which vendors create delays when support issues cross systems?',
    proof: 'Internet, telecom, copier, security, cloud, and app contacts.',
    firstMove: 'Build an owner map for outside escalations.',
  },
  {
    id: 'review-rhythm',
    zone: 'Route 05',
    label: 'Review rhythm',
    question:
      'How will tickets, risks, projects, and budget decisions surface?',
    proof: 'Monthly review notes, recurring-ticket themes, roadmap owners.',
    firstMove: 'Convert support noise into a leadership review cadence.',
  },
];

export const localReadinessOutcomes: LocalReadinessOutcome[] = [
  {
    label: 'Coverage',
    value: 'Who is supported, where, and when.',
  },
  {
    label: 'Proof',
    value: 'What evidence is missing or reviewable.',
  },
  {
    label: 'Owner',
    value: 'Who takes the next operational step.',
  },
];
