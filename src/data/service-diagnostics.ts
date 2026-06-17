export type ServiceDiagnosticStatus = 'clear' | 'review' | 'planned' | 'risk';

export interface ServiceDiagnostic {
  id: string;
  label: string;
  symptom: string;
  usuallyMeans: string;
  firstInspection: [string, string, string];
  outputArtifact: string;
  serviceLane: string;
  riskIfIgnored: string;
  bestFirstAction: string;
  status: ServiceDiagnosticStatus;
  statusLabel: string;
  serviceParam: string;
  contactBrief: string;
  secondaryHref: string;
  secondaryLabel: string;
}

export interface ServiceDiagnosticView extends ServiceDiagnostic {
  ctaHref: string;
}

export const serviceDiagnostics: ServiceDiagnostic[] = [
  {
    id: 'recurring-tickets',
    label: 'Recurring tickets',
    symptom: 'The same issues keep coming back after tickets close.',
    usuallyMeans:
      'Support is treating symptoms without naming owners, recurrence patterns, or vendor dependencies.',
    firstInspection: [
      'Ticket clusters from the last 30-90 days',
      'Affected users, devices, vendors, and locations',
      'Escalation rules and follow-up ownership',
    ],
    outputArtifact: 'Owner Map',
    serviceLane: 'Managed IT and support',
    riskIfIgnored:
      'The help desk stays busy while leadership keeps losing time.',
    bestFirstAction: 'Map support lanes and recurrence ownership.',
    status: 'review',
    statusLabel: 'Needs review',
    serviceParam: 'msp',
    contactBrief:
      'We have recurring support issues and need help mapping owners, ticket themes, vendor handoffs, and next prevention steps.',
    secondaryHref: '#service-tracks',
    secondaryLabel: 'Open support track',
  },
  {
    id: 'provider-switch',
    label: 'Provider switch',
    symptom:
      'The current provider feels slow, vague, or hard to hold accountable.',
    usuallyMeans:
      'Access, backups, vendors, contracts, and support history need to be organized before the handoff.',
    firstInspection: [
      'Admin access and documentation ownership',
      'Backup platform, protected systems, and restore notes',
      'Vendor contacts, contracts, and open issues',
    ],
    outputArtifact: 'Provider Switch Timeline',
    serviceLane: 'Managed IT transition',
    riskIfIgnored:
      'A rushed switch can lose context exactly when pressure is highest.',
    bestFirstAction: 'Build a handoff timeline before changing providers.',
    status: 'planned',
    statusLabel: 'Plan first',
    serviceParam: 'msp',
    contactBrief:
      'We are considering a provider switch and need to organize access, backups, vendors, contracts, users, devices, and open support issues.',
    secondaryHref: '#decision-handoff',
    secondaryLabel: 'See handoff path',
  },
  {
    id: 'security-proof',
    label: 'Security proof',
    symptom:
      'Insurance, compliance, or leadership is asking for security evidence.',
    usuallyMeans:
      'Identity, endpoint, email, backup, incident contacts, and exception records need a public-safe summary.',
    firstInspection: [
      'MFA, admin roles, guest access, and exceptions',
      'Endpoint, email, logging, and response contacts',
      'Backup evidence and recovery assumptions',
    ],
    outputArtifact: 'Cyber Insurance Evidence Pack',
    serviceLane: 'Cybersecurity and compliance',
    riskIfIgnored:
      'Security stays a stack of acronyms instead of reviewable proof.',
    bestFirstAction: 'Translate the request into control evidence and gaps.',
    status: 'risk',
    statusLabel: 'Evidence needed',
    serviceParam: 'security',
    contactBrief:
      'We need security proof for insurance, compliance, or leadership review around MFA, endpoints, email, backup, incidents, or access exceptions.',
    secondaryHref: 'trust-center/',
    secondaryLabel: 'View proof posture',
  },
  {
    id: 'm365-sprawl',
    label: 'M365 sprawl',
    symptom:
      'Teams, SharePoint, licenses, guests, and file ownership feel messy.',
    usuallyMeans:
      'The tenant needs governance around access, ownership, sharing, retention assumptions, and backup expectations.',
    firstInspection: [
      'Teams, SharePoint, and group ownership',
      'Guest access and risky external sharing',
      'License waste and backup assumptions',
    ],
    outputArtifact: 'Microsoft 365 Governance Map',
    serviceLane: 'Cloud and Microsoft 365',
    riskIfIgnored:
      'Collaboration keeps working until access and ownership drift too far.',
    bestFirstAction: 'Map tenant ownership and cleanup priorities.',
    status: 'review',
    statusLabel: 'Needs cleanup',
    serviceParam: 'cloud',
    contactBrief:
      'We need Microsoft 365 cleanup around Teams, SharePoint, guests, external sharing, licenses, ownership, retention, or backup assumptions.',
    secondaryHref: '#technology-catalog',
    secondaryLabel: 'Open M365 scope',
  },
  {
    id: 'backup-doubt',
    label: 'Backup doubt',
    symptom: 'Backups exist, but nobody can explain restore order or proof.',
    usuallyMeans:
      'Backup status needs to become a recovery decision path, not just a tool dashboard.',
    firstInspection: [
      'Protected systems and backup alert handling',
      'Restore access and last restore-test notes',
      'Critical-system priority and vendor dependencies',
    ],
    outputArtifact: 'Recovery Receipt',
    serviceLane: 'Backup, continuity, and recovery',
    riskIfIgnored:
      'Green backup screens may not answer what gets restored first.',
    bestFirstAction: 'Confirm restore access and recovery priority.',
    status: 'risk',
    statusLabel: 'Proof needed',
    serviceParam: 'backup-monitoring-restore-testing',
    contactBrief:
      'We need backup and recovery confidence around protected systems, restore access, alert handling, restore tests, recovery order, or ransomware readiness.',
    secondaryHref: 'trust-center/',
    secondaryLabel: 'Review evidence vault',
  },
  {
    id: 'vendor-confusion',
    label: 'Vendor confusion',
    symptom:
      'Vendors, telecom, software, and support teams keep bouncing issues around.',
    usuallyMeans:
      'The business needs one map of systems, contacts, owners, renewal signals, and escalation paths.',
    firstInspection: [
      'Line-of-business systems and support contacts',
      'Telecom, ISP, copier, and software ownership',
      'Renewal timing and escalation history',
    ],
    outputArtifact: 'Vendor Owner Map',
    serviceLane: 'Managed IT and vendor coordination',
    riskIfIgnored: 'Nobody owns the handoff, so the business owns the delay.',
    bestFirstAction: 'Build a vendor owner map and escalation path.',
    status: 'review',
    statusLabel: 'Owner map',
    serviceParam: 'msp',
    contactBrief:
      'We need help organizing vendor ownership, line-of-business systems, telecom or ISP contacts, renewals, and escalation paths.',
    secondaryHref: '#service-tracks',
    secondaryLabel: 'View support track',
  },
  {
    id: 'network-office-move',
    label: 'Network or office move',
    symptom:
      'Wi-Fi, ISP, firewall, cabling, or an office move is creating friction.',
    usuallyMeans:
      'Network work needs local readiness, vendor coordination, device standards, and cutover planning.',
    firstInspection: [
      'ISP, firewall, Wi-Fi, switch, and cabling status',
      'Site timing, vendor lead times, and critical users',
      'Cutover risk and fallback path',
    ],
    outputArtifact: 'Local Readiness Map',
    serviceLane: 'Network and onsite coordination',
    riskIfIgnored: 'Small infrastructure misses become launch-day downtime.',
    bestFirstAction: 'Map site readiness and cutover dependencies.',
    status: 'planned',
    statusLabel: 'Plan needed',
    serviceParam: 'network',
    contactBrief:
      'We need network, ISP, firewall, Wi-Fi, cabling, or office-move coordination with clear cutover and fallback planning.',
    secondaryHref: 'chicago/',
    secondaryLabel: 'View local readiness',
  },
  {
    id: 'internal-it-gap',
    label: 'Internal IT gap',
    symptom:
      'The internal team is capable, but coverage, security, or projects are slipping.',
    usuallyMeans:
      'Responsibilities need to be split cleanly so outside support adds depth without replacing internal knowledge.',
    firstInspection: [
      'Internal IT roles and ownership boundaries',
      'Coverage gaps, backlog themes, and escalations',
      'Projects that need shared delivery',
    ],
    outputArtifact: 'Co-Managed Boundary Planner',
    serviceLane: 'Co-managed IT',
    riskIfIgnored:
      'Good internal knowledge gets buried under backlog and context switching.',
    bestFirstAction:
      'Separate retained, shared, and escalated responsibilities.',
    status: 'clear',
    statusLabel: 'Boundary work',
    serviceParam: 'co-managed-it',
    contactBrief:
      'We have internal IT and need co-managed support for coverage gaps, escalation, documentation, security review, or project delivery.',
    secondaryHref: '#service-planner',
    secondaryLabel: 'Compare options',
  },
  {
    id: 'workflow-portal',
    label: 'Workflow or portal path',
    symptom:
      'A form, portal, website path, or client handoff creates messy follow-up.',
    usuallyMeans:
      'The digital front door needs clearer routing, status feedback, mobile behavior, and handoff ownership.',
    firstInspection: [
      'Current intake path and required handoff fields',
      'Where users or clients get stuck',
      'Approval owner and follow-up state',
    ],
    outputArtifact: 'Routing Brief',
    serviceLane: 'Workflow portals and intake',
    riskIfIgnored: 'The business keeps paying for unclear follow-up.',
    bestFirstAction: 'Prototype the routing path and first-response state.',
    status: 'planned',
    statusLabel: 'Prototype path',
    serviceParam: 'digital',
    contactBrief:
      'We need a better workflow, portal, website path, form, intake process, or client handoff with clearer routing and status feedback.',
    secondaryHref: '#service-planner',
    secondaryLabel: 'Compare solution options',
  },
];
