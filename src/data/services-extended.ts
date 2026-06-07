export interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
  details?: string[];
  icon?: string;
}

export interface ServiceCategoryBrief {
  category: string;
  buyerQuestion: string;
  whatWeCheck: string[];
  firstOutputs: string[];
  warningSigns: string[];
}

export interface OnboardingPhase {
  phase: string;
  title: string;
  goal: string;
  checkpoints: string[];
  buyerVisibleOutput: string;
}

export interface ProviderSelectionQuestion {
  question: string;
  whyItMatters: string;
}

export const servicesExtended: Service[] = [
  {
    id: 'managed-help-desk',
    name: 'Managed Help Desk and Escalation',
    category: 'Managed IT & Support',
    description:
      'Support queue ownership for user issues, escalation handling, status updates, and follow-through when a fix needs a vendor or deeper investigation.',
  },
  {
    id: 'co-managed-it',
    name: 'Co-Managed IT Support',
    category: 'Managed IT & Support',
    description:
      'Shared delivery for internal IT or operations teams that need extra coverage, project help, documentation cleanup, or a second set of technical hands.',
  },
  {
    id: 'endpoint-management',
    name: 'Endpoint Management and Patching',
    category: 'Managed IT & Support',
    description:
      'Workstation inventory, patch visibility, device health, warranty notes, encryption checks, and setup standards across laptops, desktops, and mobile endpoints.',
  },
  {
    id: 'user-onboarding',
    name: 'User Onboarding and Offboarding',
    category: 'Managed IT & Support',
    description:
      'New-hire setup, role changes, departed-user lockout, device prep, mailbox handling, and documented joiner-mover-leaver workflows.',
  },
  {
    id: 'asset-lifecycle',
    name: 'Procurement and Asset Lifecycle',
    category: 'Managed IT & Support',
    description:
      'Planning, sourcing, staging, refresh cycles, and retirement workflows for business devices and core equipment.',
  },
  {
    id: 'vendor-management',
    name: 'Vendor and ISP Coordination',
    category: 'Managed IT & Support',
    description:
      'Single-owner coordination for ISPs, telecom, printers, software vendors, line-of-business application providers, and support escalations that cross company boundaries.',
  },

  {
    id: 'managed-edr-mdr',
    name: 'Managed Endpoint Protection and MDR',
    category: 'Cybersecurity & Compliance',
    description:
      'Endpoint protection, alert routing, response workflows, and managed monitoring options that help reduce dwell time and improve containment.',
  },
  {
    id: 'identity-access-management',
    name: 'Identity, MFA, and Access Policy',
    category: 'Cybersecurity & Compliance',
    description:
      'Microsoft Entra ID, SSO, MFA, conditional access, admin role review, guest access, and role-based controls built around practical user security.',
  },
  {
    id: 'email-security-awareness',
    name: 'Email Security and Awareness Training',
    category: 'Cybersecurity & Compliance',
    description:
      'Phishing protection, secure email controls, awareness campaigns, and policy reinforcement for everyday risk reduction.',
  },
  {
    id: 'vulnerability-management',
    name: 'Vulnerability and Security Baseline Reviews',
    category: 'Cybersecurity & Compliance',
    description:
      'Recurring reviews of exposure, hardening gaps, patch status, risky settings, control evidence, and security items that need executive attention.',
  },
  {
    id: 'incident-response-planning',
    name: 'Incident Response Planning',
    category: 'Cybersecurity & Compliance',
    description:
      'Response playbooks, escalation paths, tabletop guidance, decision owners, and contact lists for ransomware, phishing, and account compromise events.',
  },
  {
    id: 'vciso-compliance',
    name: 'vCISO and Compliance Readiness',
    category: 'Cybersecurity & Compliance',
    description:
      'Security leadership, policy guidance, audit prep support, and control-evidence habits for HIPAA, SOC 2, and similar programs.',
  },

  {
    id: 'm365-administration',
    name: 'Microsoft 365 Administration',
    category: 'Cloud & Microsoft 365',
    description:
      'Administration of Exchange, Teams, SharePoint, OneDrive, users, licenses, groups, mail flow, and the everyday settings that keep Microsoft 365 usable.',
  },
  {
    id: 'm365-security-governance',
    name: 'Microsoft 365 Security and Governance',
    category: 'Cloud & Microsoft 365',
    description:
      'External sharing, guest access, retention assumptions, site lifecycle, mailbox forwarding, admin roles, and governance decisions for Microsoft 365.',
  },
  {
    id: 'cloud-migration-modernization',
    name: 'Cloud Migration and Hybrid Modernization',
    category: 'Cloud & Microsoft 365',
    description:
      'Server migrations, hybrid environment cleanup, and cloud transitions designed to reduce risk and downtime.',
  },
  {
    id: 'sharepoint-teams-rollouts',
    name: 'SharePoint, Teams, and Intranet Rollouts',
    category: 'Cloud & Microsoft 365',
    description:
      'Collaboration structure, file architecture, Teams rules, SharePoint cleanup, intranet planning, and adoption support for distributed teams.',
  },
  {
    id: 'cloud-license-cost-optimization',
    name: 'Cloud, License, and SaaS Cost Optimization',
    category: 'Cloud & Microsoft 365',
    description:
      'License right-sizing, unused-seat review, SaaS renewal visibility, cloud waste reduction, and recurring technology spend cleanup.',
  },
  {
    id: 'saas-admin-governance',
    name: 'SaaS Administration and Governance',
    category: 'Cloud & Microsoft 365',
    description:
      'Access reviews, configuration management, vendor coordination, and documentation for critical cloud applications.',
  },

  {
    id: 'network-monitoring-support',
    name: 'Network Monitoring and Support',
    category: 'Network & Infrastructure',
    description:
      'Monitoring, maintenance, documentation, and troubleshooting for firewalls, switches, routers, Wi-Fi, ISP handoffs, and core connectivity.',
  },
  {
    id: 'firewall-secure-remote-access',
    name: 'Firewall and Secure Remote Access',
    category: 'Network & Infrastructure',
    description:
      'Firewall management, secure remote access, VPN alternatives, and network policy upkeep for hybrid teams.',
  },
  {
    id: 'wifi-office-network-projects',
    name: 'Wi-Fi and Office Network Projects',
    category: 'Network & Infrastructure',
    description:
      'Wireless design, office moves, cabling coordination, and network refresh work for new or growing locations.',
  },
  {
    id: 'server-virtualization-management',
    name: 'Server and Virtualization Management',
    category: 'Network & Infrastructure',
    description:
      'Management of on-prem servers, virtual infrastructure, line-of-business hosts, and supporting compute layers.',
  },
  {
    id: 'multi-site-connectivity',
    name: 'Multi-Site Connectivity and Standards',
    category: 'Network & Infrastructure',
    description:
      'Network consistency, documentation, and connectivity planning across headquarters, satellite sites, and remote users.',
  },

  {
    id: 'backup-monitoring-restore-testing',
    name: 'Backup Monitoring and Restore Testing',
    category: 'Backup, Continuity & Recovery',
    description:
      'Backup alert review, coverage checks, restore testing, retention notes, and practical verification that recovery can actually work.',
  },
  {
    id: 'business-continuity-planning',
    name: 'Business Continuity Planning',
    category: 'Backup, Continuity & Recovery',
    description:
      'Continuity planning that ties backups, communications, vendors, key systems, staff roles, and operating priorities into a realistic recovery model.',
  },
  {
    id: 'disaster-recovery-runbooks',
    name: 'Disaster Recovery Runbooks',
    category: 'Backup, Continuity & Recovery',
    description:
      'Step-by-step recovery documentation for critical systems, ownership, dependencies, and high-pressure decision moments.',
  },
  {
    id: 'immutable-backup-ransomware-recovery',
    name: 'Ransomware Recovery and Immutable Backup Guidance',
    category: 'Backup, Continuity & Recovery',
    description:
      'Recovery design and backup strategy built to shorten recovery time and improve resilience after security incidents.',
  },

  {
    id: 'roadmapping-vcio',
    name: 'vCIO Roadmapping and Budget Planning',
    category: 'Strategy, Automation & Workflow Systems',
    description:
      'Quarterly technology planning, budgeting guidance, lifecycle recommendations, and executive translation of IT priorities.',
  },
  {
    id: 'office-moves-refreshes',
    name: 'Office Moves, Refreshes, and Site Changes',
    category: 'Strategy, Automation & Workflow Systems',
    description:
      'Planning and delivery support for office openings, relocations, expansions, and workspace technology changes.',
  },
  {
    id: 'workflow-automation-ai-enablement',
    name: 'Workflow Automation and AI Enablement',
    category: 'Strategy, Automation & Workflow Systems',
    description:
      'Small-scale automation, reporting cleanup, AI-assisted internal processes, approval rules, and governance for practical use cases that have an owner.',
  },
  {
    id: 'client-portal-web-refresh',
    name: 'Website and Client-Facing Experience Refreshes',
    category: 'Strategy, Automation & Workflow Systems',
    description:
      'Higher-trust websites, launch pages, service pages, intake flows, and presentation systems for firms whose front door needs to match their operations.',
  },
  {
    id: 'client-portal-intranet',
    name: 'Client Portals and Internal Hubs',
    category: 'Strategy, Automation & Workflow Systems',
    description:
      'Client portals, internal hubs, intranets, forms, and structured self-service experiences for onboarding, documentation, and account visibility.',
  },
  {
    id: 'discovery-roadmapping',
    name: 'Discovery, Documentation, and First-Phase Roadmaps',
    category: 'Strategy, Automation & Workflow Systems',
    description:
      'Current-state reviews, documentation cleanup, and phased plans that make the next 30, 60, or 90 days more manageable.',
  },
  {
    id: 'qa-release-hardening',
    name: 'Launch QA and Release Hardening',
    category: 'Strategy, Automation & Workflow Systems',
    description:
      'Testing, launch checklists, and handoff discipline for digital projects that need to feel polished and dependable.',
  },
];

export const serviceCategoryBriefs: ServiceCategoryBrief[] = [
  {
    category: 'Managed IT & Support',
    buyerQuestion:
      'Who actually owns tickets, vendors, onboarding, device standards, and repeat issues after the sale?',
    whatWeCheck: [
      'Ticket history, recurring problems, aging issues, and escalation gaps',
      'Endpoint inventory, patch posture, warranty status, and stale devices',
      'Onboarding/offboarding steps, approval paths, and vendor dependencies',
    ],
    firstOutputs: [
      'Support lanes with clear response expectations',
      'Device and user inventory that leadership can trust',
      'A 30-day stabilization list for recurring pain',
    ],
    warningSigns: [
      'Every issue becomes a one-off emergency',
      'Departed users still have access',
      'No one can quickly explain who owns each vendor',
    ],
  },
  {
    category: 'Cybersecurity & Compliance',
    buyerQuestion:
      'Can we prove the basics are working before we buy another security tool?',
    whatWeCheck: [
      'MFA, admin roles, conditional access, password policy, and guest access',
      'Endpoint protection, disk encryption, email security, and alert routing',
      'Backup coverage, response contacts, and control evidence habits',
    ],
    firstOutputs: [
      'Security baseline with must-fix and next-phase items',
      'Plain-language risk notes for leadership',
      'Response ownership for phishing, account compromise, and ransomware',
    ],
    warningSigns: [
      'MFA exceptions are not reviewed',
      'Security alerts go to an inbox nobody owns',
      'Audit evidence is rebuilt from scratch every time',
    ],
  },
  {
    category: 'Cloud & Microsoft 365',
    buyerQuestion:
      'Is Microsoft 365 helping the business work, or has it become a permissions and file-sprawl problem?',
    whatWeCheck: [
      'Exchange, Teams, SharePoint, OneDrive, licenses, retention, and backup',
      'External sharing, guest access, stale groups, and abandoned sites',
      'Cloud spend, tenant configuration, and migration dependencies',
    ],
    firstOutputs: [
      'Tenant cleanup priorities and governance decisions',
      'License and SaaS waste findings',
      'A safer collaboration model for Teams and SharePoint',
    ],
    warningSigns: [
      'Nobody owns site lifecycle or external sharing',
      'Retention is confused with backup',
      'Licenses are renewed without usage review',
    ],
  },
  {
    category: 'Network & Infrastructure',
    buyerQuestion:
      'Can people work reliably from the office, remotely, and across sites without mystery outages?',
    whatWeCheck: [
      'Firewall policy, switches, Wi-Fi, ISP handoffs, VPN, and remote access',
      'Network diagrams, naming standards, warranty dates, and admin access',
      'Office moves, cabling, wireless coverage, and site-specific constraints',
    ],
    firstOutputs: [
      'Network ownership map and critical device list',
      'Connectivity risks ranked by business impact',
      'Refresh or remediation plan for aging infrastructure',
    ],
    warningSigns: [
      'No current network diagram exists',
      'Firewall rules are changed without review',
      'Wi-Fi problems are treated as user complaints instead of measured coverage',
    ],
  },
  {
    category: 'Backup, Continuity & Recovery',
    buyerQuestion:
      'If something breaks today, do we know what can be restored, how fast, and who makes the call?',
    whatWeCheck: [
      'Server, workstation, Microsoft 365, SaaS, and critical-file backup scope',
      'Restore history, alert handling, retention, immutability, and recovery owners',
      'Communication plans for outage, ransomware, vendor failure, and staff turnover',
    ],
    firstOutputs: [
      'Restore-tested backup coverage summary',
      'Recovery priorities by system and business function',
      'Runbook for the first hour of a serious incident',
    ],
    warningSigns: [
      'Backups are monitored but restores are never tested',
      'Microsoft 365 data protection is assumed but not verified',
      'Recovery order is decided during the outage',
    ],
  },
  {
    category: 'Strategy, Automation & Workflow Systems',
    buyerQuestion:
      'Which projects will reduce drag, improve trust, or create measurable leverage instead of just adding tools?',
    whatWeCheck: [
      'Manual handoffs, reporting gaps, buyer-facing friction, and approval bottlenecks',
      'Portal, intake, documentation, internal hub, and client-facing service needs',
      'Budget timing, owner capacity, launch risk, and governance requirements',
    ],
    firstOutputs: [
      'First-phase roadmap with owners and decision points',
      'Automation or portal candidates ranked by impact',
      'Launch checklist for client-facing workflow work',
    ],
    warningSigns: [
      'Automation ideas do not have a process owner',
      'A website refresh is treated separately from client workflow',
      'Projects launch without support, QA, or handoff ownership',
    ],
  },
];

export const serviceOperatingFacts = [
  {
    label: 'Good MSP buying starts with ownership.',
    copy: 'Tool names matter less than who owns tickets, alerts, onboarding, offboarding, vendors, backups, and the monthly explanation of what changed.',
  },
  {
    label: 'Security has to be visible.',
    copy: 'Identity, endpoint, email, backup, risky forwarding, and response controls should be explained in normal business language, not hidden inside a stack list.',
  },
  {
    label: 'Microsoft 365 is an operating system for the business.',
    copy: 'Teams, SharePoint, OneDrive, Exchange, licensing, retention, guest access, and backup need governance or the tenant slowly becomes expensive clutter.',
  },
];

export const onboardingPhases: OnboardingPhase[] = [
  {
    phase: 'Days 0-14',
    title: 'Access, scope, and support handoff',
    goal: 'Stop guessing. Confirm access, ownership, users, devices, vendors, and how people get help.',
    checkpoints: [
      'Admin access and service accounts reviewed',
      'User, device, server, network, Microsoft 365, and vendor inventory started',
      'Ticket channels, escalation rules, VIP users, and urgent issues documented',
    ],
    buyerVisibleOutput:
      'A support handoff map showing where requests go, who owns them, and what is still blocked.',
  },
  {
    phase: 'Days 15-30',
    title: 'Monitoring, security baseline, and backup proof',
    goal: 'Bring the core operating layer under observation and close obvious risk before bigger projects begin.',
    checkpoints: [
      'Endpoint tooling, patch posture, and alert ownership reviewed',
      'MFA, admin roles, email security, risky forwarding, and guest access checked',
      'Backup scope and restore expectations verified instead of assumed',
    ],
    buyerVisibleOutput:
      'A baseline report with urgent fixes, monitoring status, backup confidence, and security gaps.',
  },
  {
    phase: 'Days 31-60',
    title: 'Recurring issues and Microsoft 365 cleanup',
    goal: 'Use early ticket data and tenant review to reduce repeat problems instead of only answering them faster.',
    checkpoints: [
      'Recurring tickets grouped by root cause',
      'Teams, SharePoint, external sharing, licenses, and abandoned workspaces reviewed',
      'Vendor and lifecycle risks converted into a near-term action list',
    ],
    buyerVisibleOutput:
      'A practical 60-day improvement list with owners, sequencing, and budget notes.',
  },
  {
    phase: 'Days 61-90',
    title: 'Roadmap, cadence, and executive reporting',
    goal: 'Move from takeover mode into a normal operating rhythm leadership can understand.',
    checkpoints: [
      'Monthly reporting format agreed',
      'Quarterly roadmap themes ranked by risk, cost, and operating impact',
      'Project candidates separated from recurring support scope',
    ],
    buyerVisibleOutput:
      'A 90-day roadmap that separates support baseline, security work, M365/cloud cleanup, and project scope.',
  },
];

export const providerSelectionQuestions: ProviderSelectionQuestion[] = [
  {
    question:
      'What exactly is included in recurring support, and what becomes a project?',
    whyItMatters:
      'This prevents surprise invoices and keeps migrations, office moves, portal work, workflow systems, and major security projects visible.',
  },
  {
    question:
      'Who owns backup monitoring, restore testing, and the first hour of an incident?',
    whyItMatters:
      'A backup dashboard is not the same as a recovery plan. Ownership matters when pressure is high.',
  },
  {
    question:
      'How do you reduce recurring tickets instead of only responding faster?',
    whyItMatters:
      'Better support should create fewer repeat issues, cleaner endpoint standards, and clearer user guidance over time.',
  },
  {
    question: 'What will leadership see every month?',
    whyItMatters:
      'Useful reporting should connect tickets, security, backup, projects, risk, and upcoming decisions.',
  },
  {
    question: 'How do you handle Microsoft 365 governance?',
    whyItMatters:
      'Teams, SharePoint, external sharing, retention, backup, and licensing are often where invisible business drag lives.',
  },
  {
    question: 'How does onboarding work if we are leaving another provider?',
    whyItMatters:
      'Access transfer, backup handoff, RMM replacement, documentation, and support cutover need a clean timeline.',
  },
];
