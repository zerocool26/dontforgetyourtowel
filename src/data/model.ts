/**
 * Positioning content for the structurally distinct route sections:
 * the operating signals, the vendor-model comparison, the engagement arc,
 * and the datasheet-style specification ledgers.
 *
 * These describe how the firm operates. They are deliberately not
 * performance claims, client references, or certifications.
 */

export type Signal = {
  value: string;
  unit?: string;
  label: string;
  note: string;
};

export type ComparisonRow = {
  question: string;
  answers: [string, string, string, string];
};

export type ArcStage = {
  marker: string;
  title: string;
  copy: string;
  output: string;
};

export type SpecGroup = {
  label: string;
  entries: { term: string; copy: string }[];
};

export const operatingSignals: Signal[] = [
  {
    value: '1',
    label: 'Accountable lead',
    note: 'One named person owns the engagement from first decision through production.',
  },
  {
    value: '6',
    label: 'Connected lanes',
    note: 'Advisory, software, cloud, security, managed IT, and automation under one model.',
  },
  {
    value: '4',
    label: 'Operating stages',
    note: 'Plan, build, secure, and run stay linked instead of being sold separately.',
  },
  {
    value: '0',
    label: 'Blind handoffs',
    note: 'No stage closes until access, source, documentation, and the owner are named.',
  },
];

export const comparisonColumns = [
  'Strategy consultancy',
  'Development shop',
  'Traditional MSP',
  'This firm',
] as const;

export const comparisonRows: ComparisonRow[] = [
  {
    question: 'Who owns the plan?',
    answers: [
      'They do, until the deck ships',
      'Whoever wrote the ticket',
      'Rarely in scope',
      'One lead, through production',
    ],
  },
  {
    question: 'Who owns the code?',
    answers: [
      'Not their scope',
      'They do, terms vary',
      'Not their scope',
      'You do, in writing, from day one',
    ],
  },
  {
    question: 'Who owns production at 7am?',
    answers: [
      'No one',
      'Best effort',
      'They do',
      'The same team that built it',
    ],
  },
  {
    question: 'Who reviews security?',
    answers: [
      'Advisory only',
      'After the build, if asked',
      'Endpoint and email',
      'Architecture through operations',
    ],
  },
  {
    question: 'What happens when it breaks?',
    answers: [
      'Engagement has ended',
      'A change request',
      'A ticket queue',
      'The owner you already have',
    ],
  },
];

export const engagementArc: ArcStage[] = [
  {
    marker: 'Week 1',
    title: 'Access and evidence',
    copy: 'Inventory the environment, source, cloud accounts, vendors, and the decisions already in motion.',
    output: 'Current-state map',
  },
  {
    marker: 'Week 2',
    title: 'The honest read',
    copy: 'Separate what is known, what is judgment, what is blocked, and what needs a decision from you.',
    output: 'Findings and assumptions',
  },
  {
    marker: 'Week 3',
    title: 'Sequenced plan',
    copy: 'Order the work by risk, dependency, and business value—with cost context attached to each move.',
    output: 'Scoped roadmap',
  },
  {
    marker: 'Week 4',
    title: 'First move in motion',
    copy: 'Start the highest-value work with acceptance criteria, an owner, and the operating path already defined.',
    output: 'Work underway',
  },
];

export const ownershipSpec: SpecGroup[] = [
  {
    label: 'You own',
    entries: [
      {
        term: 'Source',
        copy: 'Repositories, branches, history, and build configuration in your organization.',
      },
      {
        term: 'Data',
        copy: 'Production data, exports, schemas, and the documented path to retrieve them.',
      },
      {
        term: 'Accounts',
        copy: 'Cloud tenants, domains, DNS, certificates, and billing under your legal entity.',
      },
      {
        term: 'Documentation',
        copy: 'Architecture, runbooks, decisions, and open risks written for your next engineer.',
      },
    ],
  },
  {
    label: 'We hold',
    entries: [
      {
        term: 'Delegated access',
        copy: 'Named, scoped, reviewable administrative access that you can revoke in one action.',
      },
      {
        term: 'Operating duty',
        copy: 'Support, monitoring, patching, and the improvement queue for what is in scope.',
      },
      {
        term: 'Delivery record',
        copy: 'Scope, acceptance criteria, dependencies, and what marked each stage complete.',
      },
      {
        term: 'The exit path',
        copy: 'A written transition plan that stays current, not one assembled after notice is given.',
      },
    ],
  },
];

export const buildCapabilitySpec: SpecGroup[] = [
  {
    label: 'Define and design',
    entries: [
      {
        term: 'Discovery',
        copy: 'User research, workflow mapping, business rules, constraints, and the smallest useful release.',
      },
      {
        term: 'Interface',
        copy: 'Flows, states, accessibility, and interface design tested against the real task, not a demo path.',
      },
      {
        term: 'Architecture',
        copy: 'Platform, data model, integration boundaries, access model, and the deployment target.',
      },
      {
        term: 'Delivery plan',
        copy: 'Increments, acceptance criteria, dependencies, and the decisions still owned by you.',
      },
    ],
  },
  {
    label: 'Build and operate',
    entries: [
      {
        term: 'Application',
        copy: 'Frontend, backend, APIs, authentication, background work, and system integrations.',
      },
      {
        term: 'Assurance',
        copy: 'Automated tests, review gates, application security, and performance under real load.',
      },
      {
        term: 'Release',
        copy: 'Pipelines, environments, migrations, rollback, observability, and production readiness.',
      },
      {
        term: 'Aftercare',
        copy: 'Support path, documentation, technical debt register, and a controlled improvement queue.',
      },
    ],
  },
];

export const proposalSpec: SpecGroup[] = [
  {
    label: 'Recurring',
    entries: [
      {
        term: 'Coverage',
        copy: 'Hours, response expectations, escalation, and who is covered at which locations.',
      },
      {
        term: 'Scope',
        copy: 'Systems, applications, and security responsibilities under active management.',
      },
      {
        term: 'Cadence',
        copy: 'Review meetings, reporting, roadmap updates, and recovery validation.',
      },
    ],
  },
  {
    label: 'One-time',
    entries: [
      {
        term: 'Onboarding',
        copy: 'Discovery, documentation, tooling deployment, and transition from the current provider.',
      },
      {
        term: 'Remediation',
        copy: 'Inherited debt, security gaps, and cleanup priced separately from the monthly fee.',
      },
      {
        term: 'Projects',
        copy: 'Migrations, software delivery, hardware, and modernization scoped by milestone.',
      },
    ],
  },
  {
    label: 'Still unknown',
    entries: [
      {
        term: 'Assumptions',
        copy: 'What we believe to be true and what would change the number if it is not.',
      },
      {
        term: 'Access needed',
        copy: 'The environments, evidence, and vendor detail required before a firm price.',
      },
      {
        term: 'Your decisions',
        copy: 'The choices only you can make, with the cost consequence of each written down.',
      },
    ],
  },
];

export const contactArc: ArcStage[] = [
  {
    marker: 'Same day',
    title: 'A human reads it',
    copy: 'Your message goes to a senior person, not a queue, a chatbot, or a lead-scoring form.',
    output: 'Acknowledgement',
  },
  {
    marker: 'Reply',
    title: 'The likely lane',
    copy: 'Advisory, software, cloud, security, managed operations—or an honest referral elsewhere.',
    output: 'A direction',
  },
  {
    marker: 'Then',
    title: 'The missing facts',
    copy: 'What we still need to understand before anyone can responsibly talk about scope or price.',
    output: 'A short question list',
  },
  {
    marker: 'Next',
    title: 'One concrete step',
    copy: 'A call, an evidence review, a scoped assessment, or a written estimate with its assumptions.',
    output: 'A decision you can make',
  },
];
