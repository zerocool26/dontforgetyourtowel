export interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
  details?: string[];
  icon?: string;
}

export const servicesExtended: Service[] = [
  {
    id: 'managed-help-desk',
    name: 'Managed Help Desk and Escalation',
    category: 'Managed IT & Support',
    description:
      'Business-hours or extended-hours support for day-to-day issues, escalation handling, and end-user follow-through.',
  },
  {
    id: 'co-managed-it',
    name: 'Co-Managed IT Support',
    category: 'Managed IT & Support',
    description:
      'Flexible support for internal IT teams that need help with coverage, projects, documentation, or specialized expertise.',
  },
  {
    id: 'endpoint-management',
    name: 'Endpoint Management and Patching',
    category: 'Managed IT & Support',
    description:
      'Policy-based workstation management, patching, asset visibility, and device hygiene across laptops, desktops, and mobile endpoints.',
  },
  {
    id: 'user-onboarding',
    name: 'User Onboarding and Offboarding',
    category: 'Managed IT & Support',
    description:
      'Account setup, access changes, device preparation, and documented joiner-mover-leaver workflows.',
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
      'Single-owner coordination for internet providers, software vendors, telecom, and line-of-business technology partners.',
  },

  {
    id: 'managed-edr-mdr',
    name: 'Managed Endpoint Protection and MDR',
    category: 'Cybersecurity & Compliance',
    description:
      'Endpoint detection, response workflows, and managed monitoring to reduce dwell time and improve containment.',
  },
  {
    id: 'identity-access-management',
    name: 'Identity, MFA, and Access Policy',
    category: 'Cybersecurity & Compliance',
    description:
      'Microsoft Entra ID, SSO, MFA, conditional access, and role-based access controls built around practical user security.',
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
      'Recurring reviews of exposure, hardening opportunities, patch gaps, and security controls that need executive attention.',
  },
  {
    id: 'incident-response-planning',
    name: 'Incident Response Planning',
    category: 'Cybersecurity & Compliance',
    description:
      'Response playbooks, escalation paths, tabletop guidance, and roles for ransomware, phishing, and account compromise events.',
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
      'Administration of Microsoft 365 tenants, licensing, collaboration tools, and everyday productivity services.',
  },
  {
    id: 'm365-security-governance',
    name: 'Microsoft 365 Security and Governance',
    category: 'Cloud & Microsoft 365',
    description:
      'Governance for Exchange, Teams, SharePoint, OneDrive, and retention settings so the platform stays usable and controlled.',
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
      'Collaboration architecture, file structure, intranet planning, and adoption support for distributed teams.',
  },
  {
    id: 'cloud-license-cost-optimization',
    name: 'Cloud, License, and SaaS Cost Optimization',
    category: 'Cloud & Microsoft 365',
    description:
      'Rightsizing licenses, reducing cloud waste, and improving visibility into recurring technology spend.',
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
      'Monitoring, maintenance, and troubleshooting for business networks, switches, routers, and core infrastructure services.',
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
      'Daily backup oversight, alerting, documented restore checks, and practical verification that recovery actually works.',
  },
  {
    id: 'business-continuity-planning',
    name: 'Business Continuity Planning',
    category: 'Backup, Continuity & Recovery',
    description:
      'Continuity planning that ties backup, communications, key systems, and operational priorities into a realistic recovery model.',
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
    category: 'Strategy, Automation & Digital Systems',
    description:
      'Quarterly technology planning, budgeting guidance, lifecycle recommendations, and executive translation of IT priorities.',
  },
  {
    id: 'office-moves-refreshes',
    name: 'Office Moves, Refreshes, and Site Changes',
    category: 'Strategy, Automation & Digital Systems',
    description:
      'Planning and delivery support for office openings, relocations, expansions, and workspace technology changes.',
  },
  {
    id: 'workflow-automation-ai-enablement',
    name: 'Workflow Automation and AI Enablement',
    category: 'Strategy, Automation & Digital Systems',
    description:
      'Small-scale automation, reporting workflows, AI-assisted internal processes, and governance for practical use cases.',
  },
  {
    id: 'client-portal-web-refresh',
    name: 'Website and Client-Facing Experience Refreshes',
    category: 'Strategy, Automation & Digital Systems',
    description:
      'Higher-trust websites, launch pages, and service presentation systems for firms whose front door needs to match their operations.',
  },
  {
    id: 'client-portal-intranet',
    name: 'Client Portals and Internal Hubs',
    category: 'Strategy, Automation & Digital Systems',
    description:
      'Portals, intranets, and structured self-service experiences for onboarding, documentation, and account visibility.',
  },
  {
    id: 'discovery-roadmapping',
    name: 'Discovery, Documentation, and First-Phase Roadmaps',
    category: 'Strategy, Automation & Digital Systems',
    description:
      'Current-state reviews, documentation cleanup, and phased plans that make the next 30, 60, or 90 days more manageable.',
  },
  {
    id: 'qa-release-hardening',
    name: 'Launch QA and Release Hardening',
    category: 'Strategy, Automation & Digital Systems',
    description:
      'Testing, launch checklists, and handoff discipline for digital projects that need to feel polished and dependable.',
  },
];
