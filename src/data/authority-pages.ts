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

export type TrustEvidenceStatus = 'public-safe' | 'reviewed' | 'private';

export type TrustEvidenceVaultItem = {
  id: string;
  category: string;
  title: string;
  buyerQuestion: string;
  publicSignal: string;
  evidenceDiscussed: readonly string[];
  privateBoundary: string;
  reviewCadence: string;
  relatedArtifact: string;
  scopedReview: string;
  status: TrustEvidenceStatus;
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

export const trustEvidenceVault: TrustEvidenceVaultItem[] = [
  {
    id: 'backup-recovery',
    category: 'Backup and recovery',
    title: 'Backup and recovery',
    buyerQuestion: 'If something fails tomorrow, what can be restored first?',
    publicSignal:
      'Backup scope, recovery priorities, and restore expectations are reviewed before the relationship depends on them.',
    evidenceDiscussed: [
      'Protected systems',
      'Restore access',
      'Retention assumptions',
      'Recovery order',
    ],
    privateBoundary:
      'Sensitive backup architecture, storage locations, credentials, and runbook details are not published publicly.',
    reviewCadence: 'Onboarding, then recurring account review',
    relatedArtifact: 'Recovery confidence receipt',
    scopedReview:
      'Confirm protected systems, restore access, last test evidence, retention assumptions, and the first recovery order.',
    status: 'public-safe',
  },
  {
    id: 'identity-access',
    category: 'Identity and access',
    title: 'Identity and access',
    buyerQuestion: 'Can leadership explain who has privileged access?',
    publicSignal:
      'MFA, admin roles, guest access, and risky exceptions are treated as review items, not one-time setup tasks.',
    evidenceDiscussed: [
      'Admin-role review',
      'MFA coverage',
      'Guest access',
      'Security exceptions',
    ],
    privateBoundary:
      'User lists, privileged accounts, conditional access rules, and sensitive exceptions stay private.',
    reviewCadence: 'Onboarding, access changes, and scheduled reviews',
    relatedArtifact: 'Access review ledger',
    scopedReview:
      'Review privileged roles, MFA coverage, guest access, exceptions, and owner follow-up for risky accounts.',
    status: 'reviewed',
  },
  {
    id: 'endpoint-email',
    category: 'Endpoint and email',
    title: 'Endpoint and email controls',
    buyerQuestion:
      'Are user devices and email risk being watched by someone accountable?',
    publicSignal:
      'Endpoint coverage, email security, risky forwarding, and alert routing are reviewed as part of the security baseline.',
    evidenceDiscussed: [
      'Endpoint coverage',
      'Email protection notes',
      'Risky forwarding',
      'Alert ownership',
    ],
    privateBoundary:
      'Tool configurations, alert logic, detection rules, and incident details are shared only in scoped review.',
    reviewCadence: 'Initial baseline, then monthly or quarterly review',
    relatedArtifact: 'Endpoint and email baseline',
    scopedReview:
      'Map coverage, alert routing, risky forwarding, device gaps, and the owner for exceptions or response notes.',
    status: 'reviewed',
  },
  {
    id: 'incident-coordination',
    category: 'Incident coordination',
    title: 'Incident coordination',
    buyerQuestion:
      'Who coordinates vendors, users, and leadership when pressure hits?',
    publicSignal:
      'Incident contacts, escalation paths, vendor responsibilities, and communication expectations are documented before an emergency.',
    evidenceDiscussed: [
      'Incident contacts',
      'Vendor escalation paths',
      'Communication expectations',
      'First-hour actions',
    ],
    privateBoundary:
      'Incident playbooks, client-specific contacts, and response details are kept out of public pages.',
    reviewCadence: 'Onboarding and after meaningful environment changes',
    relatedArtifact: 'Incident owner map',
    scopedReview:
      'Name first-hour contacts, escalation paths, communication expectations, vendor roles, and decision authority.',
    status: 'public-safe',
  },
  {
    id: 'vendor-coordination',
    category: 'Vendor coordination',
    title: 'Vendor coordination',
    buyerQuestion:
      'Will the provider own the messy handoff with outside vendors?',
    publicSignal:
      'Internet, line-of-business, cloud, telecom, and security vendors are mapped so issues do not disappear into email chains.',
    evidenceDiscussed: [
      'Vendor list',
      'Support contacts',
      'Escalation notes',
      'Open vendor cases',
    ],
    privateBoundary:
      'Client vendor account numbers, contracts, support portals, and credentials remain private.',
    reviewCadence: 'Onboarding, vendor changes, and recurring service review',
    relatedArtifact: 'Vendor ownership map',
    scopedReview:
      'Identify critical vendors, support contacts, escalation paths, open cases, renewal pressure, and access ownership.',
    status: 'reviewed',
  },
  {
    id: 'data-handling',
    category: 'Data handling',
    title: 'Data handling',
    buyerQuestion:
      'How are sensitive details handled before support work starts?',
    publicSignal:
      'Sensitive information is handled through scoped support processes, access boundaries, and client-approved systems.',
    evidenceDiscussed: [
      'Approved systems',
      'Access expectations',
      'Support boundaries',
      'Data-retention assumptions',
    ],
    privateBoundary:
      'Credentials, private documents, client data, and sensitive logs are never requested through public pages.',
    reviewCadence: 'Before onboarding and whenever workflow changes',
    relatedArtifact: 'Data handling boundary note',
    scopedReview:
      'Confirm approved support systems, credential handling, data retention expectations, and where sensitive records should not go.',
    status: 'private',
  },
  {
    id: 'review-cadence',
    category: 'Review cadence',
    title: 'Review cadence',
    buyerQuestion:
      'Will risks, exceptions, and next actions stay visible after onboarding?',
    publicSignal:
      'Support trends, access exceptions, backup evidence, security notes, lifecycle items, and roadmap decisions belong in a recurring review rhythm.',
    evidenceDiscussed: [
      'Recurring ticket patterns',
      'Open exceptions',
      'Backup and access notes',
      'Roadmap decisions',
    ],
    privateBoundary:
      'Client-specific reporting, tickets, user names, and system details are shared only with the client.',
    reviewCadence: 'Monthly, quarterly, or scoped to the engagement',
    relatedArtifact: 'Operating review ledger',
    scopedReview:
      'Define the review audience, reporting cadence, recurring evidence, open risks, and decisions that need leadership attention.',
    status: 'public-safe',
  },
  {
    id: 'security-boundaries',
    category: 'Security boundaries',
    title: 'Security boundaries',
    buyerQuestion:
      'Where does the provider help, and where do formal auditors or legal owners take over?',
    publicSignal:
      'Security support is framed around implementation, evidence habits, response coordination, and practical readiness rather than exaggerated guarantees.',
    evidenceDiscussed: [
      'Provider responsibility',
      'Client responsibility',
      'Auditor boundary',
      'Response authority',
    ],
    privateBoundary:
      'Legal opinions, formal audit conclusions, privileged findings, and client-specific incident detail are not public claims.',
    reviewCadence:
      'Before regulated work, audits, insurance renewals, or response planning',
    relatedArtifact: 'Security responsibility matrix',
    scopedReview:
      'Separate operational controls, advisory support, auditor-owned evidence, client approvals, and response escalation authority.',
    status: 'private',
  },
  {
    id: 'cyber-insurance',
    category: 'Cyber-insurance evidence',
    title: 'Cyber-insurance evidence',
    buyerQuestion:
      'Which insurance questions can be answered with evidence instead of guesses?',
    publicSignal:
      'Cyber-insurance conversations should connect MFA, endpoint protection, email controls, backup proof, response contacts, and evidence gaps.',
    evidenceDiscussed: [
      'MFA and admin controls',
      'Endpoint and email coverage',
      'Backup and restore notes',
      'Response contacts',
    ],
    privateBoundary:
      'Policy documents, carrier correspondence, private risk findings, and client-specific exceptions are handled in scoped review.',
    reviewCadence:
      'Before renewal, questionnaire submission, or material environment changes',
    relatedArtifact: 'Insurance evidence pack',
    scopedReview:
      'Translate questionnaire pressure into control evidence, missing proof, owner follow-up, and next remediation priorities.',
    status: 'reviewed',
  },
  {
    id: 'proof-boundaries',
    category: 'Public/private proof boundaries',
    title: 'Public and private proof',
    buyerQuestion:
      'What should be visible publicly, and what should wait for a scoped review?',
    publicSignal:
      'A credible trust page labels what can be discussed in public and what is intentionally withheld to protect clients and systems.',
    evidenceDiscussed: [
      'Public-safe summaries',
      'Withheld implementation detail',
      'Scoped review path',
      'Approval expectations',
    ],
    privateBoundary:
      'Architecture, credentials, logs, client identities, security findings, and implementation details stay out of public marketing surfaces.',
    reviewCadence:
      'Every public trust update and before sharing client-specific proof',
    relatedArtifact: 'Proof boundary receipt',
    scopedReview:
      'Decide which proof can be public, which evidence needs NDA or scoped review, and which details should remain internal.',
    status: 'private',
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
