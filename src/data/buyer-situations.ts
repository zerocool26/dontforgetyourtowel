export interface BuyerSituation {
  id: string;
  label: string;
  title: string;
  trigger: string;
  serviceParam: string;
  serviceLane: string;
  firstOwner: string;
  firstMove: string;
  proofToAskFor: string[];
  whatWeWouldCheck: string[];
  betterThanGeneric: string;
  contactBrief: string;
}

export const buyerSituations: BuyerSituation[] = [
  {
    id: 'provider-stall',
    label: 'Provider stall',
    title:
      'The current IT provider is slow, vague, or hard to hold accountable.',
    trigger:
      'Tickets close without root-cause work, vendors blame each other, and leadership cannot see what changed.',
    serviceParam: 'msp',
    serviceLane: 'Managed IT and support',
    firstOwner: 'Support ownership lead',
    firstMove:
      'Review recurring tickets, escalation paths, vendor handoffs, admin access, and documentation before recommending coverage.',
    proofToAskFor: [
      'Ticket themes from the last 30-90 days',
      'Vendor list and current support contacts',
      'Known recurring issues leadership wants stopped',
    ],
    whatWeWouldCheck: [
      'Escalation rules',
      'Device and user standards',
      'Vendor responsibility map',
    ],
    betterThanGeneric:
      'The conversation starts with ownership and evidence, not a promise of faster response times.',
    contactBrief:
      'We are evaluating a provider transition because support ownership, escalation, vendor handoffs, or recurring issues are not clear enough.',
  },
  {
    id: 'insurance-pressure',
    label: 'Insurance pressure',
    title:
      'Cyber-insurance, compliance, or leadership risk review is forcing clarity.',
    trigger:
      'Someone needs proof around MFA, endpoint coverage, backup, email risk, admin roles, or incident response.',
    serviceParam: 'security',
    serviceLane: 'Cybersecurity and compliance',
    firstOwner: 'Security baseline owner',
    firstMove:
      'Translate the request into a practical control review so leadership can see what is covered, missing, accepted, or scheduled.',
    proofToAskFor: [
      'Insurance questionnaire or audit request',
      'MFA and admin-role notes',
      'Endpoint, email, and backup tool names',
    ],
    whatWeWouldCheck: [
      'Identity controls',
      'Endpoint and email baseline',
      'Backup and incident evidence',
    ],
    betterThanGeneric:
      'Security gets discussed as reviewable proof instead of a bundle of acronyms.',
    contactBrief:
      'We need a security baseline review tied to insurance, compliance, MFA, endpoint coverage, email risk, backup evidence, or incident response.',
  },
  {
    id: 'm365-sprawl',
    label: 'M365 sprawl',
    title:
      'Microsoft 365 is useful, but Teams, SharePoint, licenses, and access feel messy.',
    trigger:
      'People use Microsoft 365 daily, but guest access, file ownership, sites, groups, retention, and licenses are unclear.',
    serviceParam: 'cloud',
    serviceLane: 'Cloud and Microsoft 365',
    firstOwner: 'Microsoft 365 governance owner',
    firstMove:
      'Map the tenant, risky sharing, unused licenses, site ownership, external access, backup assumptions, and cleanup priorities.',
    proofToAskFor: [
      'User and license count',
      'SharePoint or Teams pain points',
      'Known guest access or sharing concerns',
    ],
    whatWeWouldCheck: [
      'Guest and external sharing',
      'Teams and SharePoint ownership',
      'License waste and backup assumptions',
    ],
    betterThanGeneric:
      'The work is framed around daily collaboration habits, not just “cloud migration.”',
    contactBrief:
      'We need Microsoft 365 cleanup around Teams, SharePoint, guest access, external sharing, licenses, backup assumptions, or tenant governance.',
  },
  {
    id: 'backup-doubt',
    label: 'Backup doubt',
    title:
      'Backup exists, but no one is confident about restore order or proof.',
    trigger:
      'There are backups somewhere, but restore access, retention, protected systems, and first-hour recovery roles are not obvious.',
    serviceParam: 'backup-monitoring-restore-testing',
    serviceLane: 'Backup, continuity, and recovery',
    firstOwner: 'Recovery confidence owner',
    firstMove:
      'Confirm protected systems, restore access, backup alerts, retention assumptions, recovery priority, and who decides under pressure.',
    proofToAskFor: [
      'Backup platform and protected systems',
      'Last restore-test notes',
      'Critical systems and recovery priority',
    ],
    whatWeWouldCheck: [
      'Restore access',
      'Alert handling',
      'Critical-system recovery order',
    ],
    betterThanGeneric:
      'Backup is treated as a leadership decision path, not just a tool dashboard.',
    contactBrief:
      'We need backup and recovery confidence around protected systems, restore testing, retention, alert handling, recovery order, or ransomware readiness.',
  },
  {
    id: 'internal-team-gap',
    label: 'Internal team gap',
    title:
      'The internal team is capable, but overloaded or missing depth in a few areas.',
    trigger:
      'Internal IT knows the environment but needs extra hands, security review, documentation cleanup, or project delivery capacity.',
    serviceParam: 'co-managed-it',
    serviceLane: 'Co-managed IT',
    firstOwner: 'Co-managed delivery owner',
    firstMove:
      'Separate what internal IT keeps, what needs shared coverage, and where escalation or project support should plug in.',
    proofToAskFor: [
      'Current IT team roles',
      'Coverage gaps or backlog themes',
      'Projects that keep slipping',
    ],
    whatWeWouldCheck: [
      'Shared responsibility model',
      'Escalation boundaries',
      'Backlog and project pressure',
    ],
    betterThanGeneric:
      'The relationship supports the team instead of replacing knowledge that already works.',
    contactBrief:
      'We have an internal team and need co-managed support for coverage gaps, documentation, escalation, security review, or project delivery.',
  },
  {
    id: 'workflow-front-door',
    label: 'Front door gap',
    title:
      'The website, portal, intake path, or client handoff undersells the business.',
    trigger:
      'Customers cannot tell what to do next, forms create messy follow-up, or the digital handoff feels weaker than the actual service.',
    serviceParam: 'digital',
    serviceLane: 'Client-facing workflow systems',
    firstOwner: 'Workflow and intake owner',
    firstMove:
      'Review the service path, trust signals, intake questions, routing logic, page speed, mobile behavior, and proof needed before contact.',
    proofToAskFor: [
      'Current URL or intake form',
      'Where leads or clients get confused',
      'Required handoff fields and approval owner',
    ],
    whatWeWouldCheck: [
      'First-screen clarity',
      'Intake routing',
      'Trust and proof placement',
    ],
    betterThanGeneric:
      'The site becomes a working intake system, not a brochure full of service blurbs.',
    contactBrief:
      'We need a better client-facing workflow, website path, service intake, portal, form, or handoff system that creates clearer next steps.',
  },
];
