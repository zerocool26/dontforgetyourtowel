export type DecisionHandoffLane = {
  id: string;
  label: string;
  pressure: string;
  evidence: string[];
  firstOutput: string;
  href: string;
  cta: string;
};

export const decisionHandoffLanes: DecisionHandoffLane[] = [
  {
    id: 'support-ownership',
    label: 'Support ownership',
    pressure:
      'Recurring tickets, slow escalation, unclear vendor ownership, or onboarding/offboarding that depends on memory.',
    evidence: [
      'User, device, location, and current provider context',
      'Top recurring issues and the business impact they create',
      'Known vendors, support hours, and escalation expectations',
    ],
    firstOutput:
      'A support ownership map with first response expectations, escalation lanes, and the recurring issues to reduce first.',
    href: 'services/#service-tracks',
    cta: 'Open support track',
  },
  {
    id: 'security-baseline',
    label: 'Security baseline',
    pressure:
      'Leadership needs proof that identity, endpoints, email, backup, access, and incident contacts are under control.',
    evidence: [
      'MFA, admin access, endpoint, and email security notes',
      'Cyber-insurance, compliance, or audit requirements',
      'Backup coverage, restore confidence, and incident history',
    ],
    firstOutput:
      'A practical security baseline with evidence gaps, priority controls, and the next control sequence.',
    href: 'services/#technology-catalog',
    cta: 'Open security catalog',
  },
  {
    id: 'budget-scope',
    label: 'Budget and scope',
    pressure:
      'The team needs a defendable range before asking leadership to approve monthly coverage or project work.',
    evidence: [
      'User, device, server, site, and critical application counts',
      'Coverage hours, response expectations, and co-managed needs',
      'Known projects, renewals, moves, migrations, or compliance events',
    ],
    firstOutput:
      'A budget shape that explains what is recurring, what is project-scoped, and what still needs discovery.',
    href: 'pricing/#plans',
    cta: 'Compare pricing logic',
  },
  {
    id: 'digital-trust',
    label: 'Digital trust',
    pressure:
      'The website, portal, intake path, or commerce flow undersells the business or slows down buyer movement.',
    evidence: [
      'Target audience, conversion path, and current dead ends',
      'Content, analytics, mobile, performance, and approval constraints',
      'Launch window, owner, and systems that need to connect',
    ],
    firstOutput:
      'A screen-level improvement plan with priority moments, trust gaps, acceptance criteria, and launch constraints.',
    href: 'about/',
    cta: 'Open digital proof',
  },
];
