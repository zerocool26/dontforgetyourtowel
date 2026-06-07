export type LocalServicePage = {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  eyebrow: string;
  intro: string;
  buyerFit: string[];
  outcomes: string[];
  deliverables: string[];
  faqs: Array<{ title: string; content: string }>;
};

export const trustCenterSignals = [
  {
    label: 'Backup posture',
    value: 'Monitored and reviewable',
    detail:
      'Backup scope, restore assumptions, escalation contacts, and review cadence should be visible before an incident forces the conversation.',
  },
  {
    label: 'Incident shape',
    value: 'Named owner + next action',
    detail:
      'Clients should know who coordinates vendors, what gets isolated first, how stakeholders are updated, and where evidence lives.',
  },
  {
    label: 'Operating rhythm',
    value: 'Monthly review cadence',
    detail:
      'Support trends, security exceptions, open risks, asset lifecycle issues, and roadmap decisions should have an executive-readable format.',
  },
];

export const trustCenterPractices = [
  {
    title: 'Backup and recovery discipline',
    copy: 'We define scope, retention assumptions, recovery priorities, and restore validation expectations so backup is a business control rather than a checkbox.',
    bullets: [
      'Critical systems and priority data identified before tool changes',
      'Restore testing expectations documented with owner follow-up',
      'Recovery conversations tied to real business interruption risk',
    ],
  },
  {
    title: 'Security baseline and review',
    copy: 'Identity, endpoint, email, and privileged-access standards are tracked as an operating baseline with visible exceptions.',
    bullets: [
      'MFA, device controls, email protections, and admin access reviewed',
      'Security exceptions surfaced with next-step ownership',
      'Cyber-insurance and compliance requests mapped to evidence where possible',
    ],
  },
  {
    title: 'Vendor and incident coordination',
    copy: 'The support team coordinates with internet, line-of-business, cloud, and security vendors so clients are not left brokering technical disputes during stressful events.',
    bullets: [
      'Escalation contacts and communication expectations documented',
      'Vendor case ownership stays visible instead of disappearing into email chains',
      'Incident response next actions are routed to an accountable owner',
    ],
  },
];

export const chicagoServicePages: LocalServicePage[] = [
  {
    slug: 'managed-it',
    title: 'Chicago Managed IT Services',
    seoTitle: 'Chicago Managed IT Services | CHICAGOS #1 MSP',
    description:
      'Managed IT services for Chicago-area teams that need clearer support ownership, stronger standards, and reporting leadership can actually use.',
    eyebrow: 'Chicago managed IT services',
    intro:
      'This is for teams that are tired of recurring tickets, vague vendor updates, weak onboarding, and support that never seems fully owned.',
    buyerFit: [
      'Owner-led or operations-led companies with 15-150 users',
      'Teams juggling Microsoft 365, laptops, line-of-business apps, and multiple vendors',
      'Businesses that want response targets, reporting cadence, and fewer loose ends',
    ],
    outcomes: [
      'Named help desk and escalation ownership',
      'Device, onboarding, and vendor standards documented',
      'Monthly reporting that connects ticket noise to operating decisions',
    ],
    deliverables: [
      'Support intake and escalation workflow',
      'Endpoint and lifecycle baseline',
      'Onboarding / offboarding checklist ownership',
      'Leadership reporting and roadmap review cadence',
    ],
    faqs: [
      {
        title: 'What makes this different from basic outsourced IT?',
        content:
          'The goal is not to be another inbox. The goal is visible ownership, defined standards, and reporting that helps leadership decide what to fix next.',
      },
      {
        title: 'Do you support co-managed internal IT teams?',
        content:
          'Yes. The engagement can own a coverage lane, projects, security standards, or vendor coordination while internal IT keeps strategic or on-site ownership.',
      },
    ],
  },
  {
    slug: 'cybersecurity',
    title: 'Chicago Cybersecurity Services',
    seoTitle: 'Chicago Cybersecurity Services | CHICAGOS #1 MSP',
    description:
      'Chicago cybersecurity services for companies that need practical identity, endpoint, email, backup, and review discipline without theater.',
    eyebrow: 'Chicago cybersecurity services',
    intro:
      'Security should reduce ambiguity. This page is for teams that need a reviewable baseline, not another stack of disconnected tools.',
    buyerFit: [
      'Teams facing cyber-insurance renewal or board-level risk questions',
      'Companies with Microsoft 365 sprawl, privileged-access drift, or weak endpoint standards',
      'Firms that need incident contacts, backup confidence, and evidence habits',
    ],
    outcomes: [
      'Reviewable identity, email, and endpoint baseline',
      'Clearer exception tracking and response ownership',
      'Backup and recovery assumptions tied to business risk',
    ],
    deliverables: [
      'MFA and privileged-access review',
      'Endpoint and email control baseline',
      'Security exception log with owner follow-up',
      'Incident-response contact and escalation map',
    ],
    faqs: [
      {
        title: 'Do you lead with compliance paperwork or operating controls?',
        content:
          'Operating controls first. Evidence gets easier once identity, endpoints, email, backup, and review cadence are clearly owned.',
      },
      {
        title: 'Can this work alongside an existing security vendor?',
        content:
          'Yes. The team can coordinate with MDR, cyber-insurance, or compliance partners when a client needs tighter day-to-day ownership around those relationships.',
      },
    ],
  },
  {
    slug: 'microsoft-365',
    title: 'Chicago Microsoft 365 Support',
    seoTitle: 'Chicago Microsoft 365 Support | CHICAGOS #1 MSP',
    description:
      'Chicago Microsoft 365 support for companies that need tenant cleanup, sharing control, license discipline, and clearer collaboration ownership.',
    eyebrow: 'Chicago Microsoft 365 support',
    intro:
      'When Microsoft 365 grows without standards, it turns into clutter fast. This service is for teams that need clarity around groups, sharing, licensing, and daily collaboration.',
    buyerFit: [
      'Teams living in Teams, SharePoint, Exchange, and OneDrive every day',
      'Businesses with guest-sharing, site sprawl, or unclear ownership',
      'Leaders trying to control license waste and collaboration risk at the same time',
    ],
    outcomes: [
      'Cleaner tenant structure and ownership model',
      'More predictable sharing and access behavior',
      'Licensing and collaboration decisions easier to explain internally',
    ],
    deliverables: [
      'Tenant structure and ownership review',
      'Sharing and guest-access standards',
      'License cleanup and role alignment',
      'Collaboration roadmap with training or governance follow-up',
    ],
    faqs: [
      {
        title: 'Is this only for migrations?',
        content:
          'No. Many teams already run on Microsoft 365 and need cleanup, governance, sharing controls, or better ownership long before a major migration.',
      },
      {
        title: 'Can this connect to broader managed IT support?',
        content:
          'Yes. Microsoft 365 is often one layer inside a wider support, security, backup, and reporting program.',
      },
    ],
  },
  {
    slug: 'backup-disaster-recovery',
    title: 'Chicago Backup and Disaster Recovery',
    seoTitle: 'Chicago Backup and Disaster Recovery | CHICAGOS #1 MSP',
    description:
      'Chicago backup and disaster recovery support for companies that need real restore confidence, recovery priorities, and documented owner actions.',
    eyebrow: 'Chicago backup and disaster recovery',
    intro:
      'Backups do not build trust on their own. Restore confidence comes from clear scope, tested assumptions, and knowing who coordinates the recovery when pressure hits.',
    buyerFit: [
      'Businesses with cyber-insurance pressure or recent recovery scares',
      'Teams that cannot confidently explain what is backed up or how restore priorities work',
      'Companies with mixed cloud, server, SaaS, and endpoint data risk',
    ],
    outcomes: [
      'Clearer backup scope and recovery priority map',
      'Restore expectations tied to business interruption reality',
      'Leadership can explain the posture without pretending everything is perfect',
    ],
    deliverables: [
      'Backup scope and retention review',
      'Recovery priority map by business impact',
      'Restore validation plan',
      'Escalation and communication ownership during recovery events',
    ],
    faqs: [
      {
        title: 'Do you only implement backup tools?',
        content:
          'No. The real work is defining scope, restore expectations, ownership, and review cadence so the tool choice actually supports the business.',
      },
      {
        title:
          'Can backup work be scoped separately from full managed services?',
        content:
          'Yes. Some teams start with backup and recovery confidence before expanding into wider support or security coverage.',
      },
    ],
  },
  {
    slug: 'co-managed-it',
    title: 'Chicago Co-Managed IT',
    seoTitle: 'Chicago Co-Managed IT | CHICAGOS #1 MSP',
    description:
      'Chicago co-managed IT support for internal teams that need overflow coverage, stronger vendor coordination, and a sharper operating cadence.',
    eyebrow: 'Chicago co-managed IT',
    intro:
      'Internal IT does not always need replacement. Often it needs a dependable partner that can absorb support load, projects, or security responsibilities without political friction.',
    buyerFit: [
      'Internal IT leaders who need overflow help or deeper bench strength',
      'Companies running lean with one technical owner and too many competing priorities',
      'Teams that want shared tooling, clearer handoffs, and better vendor coordination',
    ],
    outcomes: [
      'Internal IT keeps leadership while capacity pressure drops',
      'Projects, escalations, or security lanes get a defined co-owner',
      'Reporting and roadmap conversations become easier to run',
    ],
    deliverables: [
      'Coverage lane definition and handoff rules',
      'Escalation, vendor, and project coordination model',
      'Shared reporting and planning cadence',
      'Defined boundaries for internal IT versus partner ownership',
    ],
    faqs: [
      {
        title: 'Will co-managed support create role confusion?',
        content:
          'Not if ownership is set clearly. The whole point is to define who owns tickets, escalations, projects, vendors, and reporting before pressure builds.',
      },
      {
        title: 'Can one slice of responsibility be scoped first?',
        content:
          'Yes. Co-managed work can focus on help desk, infrastructure, Microsoft 365, security review, backup ownership, or project execution.',
      },
    ],
  },
];
