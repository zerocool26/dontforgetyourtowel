import { z } from 'zod';
import {
  MetricSchema,
  PillarSchema,
  HighlightItemSchema,
  SecurityPrincipleSchema,
  SecuritySummarySchema,
  PlaybookStepSchema,
  TestimonialSchema,
  EngagementTrackSchema,
  ControlStackItemSchema,
  InsightReportSchema,
} from '../config/schema';

export type Metric = z.infer<typeof MetricSchema>;
export type Pillar = z.infer<typeof PillarSchema>;
export type HighlightItem = z.infer<typeof HighlightItemSchema>;
export type SecurityPrinciple = z.infer<typeof SecurityPrincipleSchema>;
export type SecuritySummary = z.infer<typeof SecuritySummarySchema>;
export type PlaybookStep = z.infer<typeof PlaybookStepSchema>;
export type Testimonial = z.infer<typeof TestimonialSchema>;
export type EngagementTrack = z.infer<typeof EngagementTrackSchema>;
export type ControlStackItem = z.infer<typeof ControlStackItemSchema>;
export type InsightReport = z.infer<typeof InsightReportSchema>;

export const heroSignals: string[] = [
  'Support queue, escalation, and vendor ownership',
  'MFA, endpoint, email, and backup evidence',
  'Microsoft 365 cleanup tied to real working habits',
];

export const clientBadges: string[] = [
  'Healthcare groups',
  'Professional services',
  'Light manufacturing',
  'Multi-site offices',
];

export const keyMetrics: Metric[] = [
  { value: '1 day', label: 'Typical target for non-urgent first replies' },
  { value: '30-90', label: 'Days to baseline, stabilize, and roadmap' },
  { value: '0 fluff', label: 'Tool names without ownership do not count' },
];

export const landingPillars: Pillar[] = [
  {
    title: 'Proactive operations',
    description:
      'Monitoring, patching, vendor follow-up, and hygiene work that reduces avoidable interruptions.',
  },
  {
    title: 'Security-first baseline',
    description:
      'Identity, device, email, backup, and access controls explained in language owners can use.',
  },
  {
    title: 'Cloud done right',
    description:
      'Microsoft 365 and cloud cleanup with guardrails for access, sharing, backup, cost, and reliability.',
  },
  {
    title: 'Helpdesk that resolves',
    description:
      'Clear triage, status updates, escalation paths, and root-cause work so the same issue does not boomerang next week.',
  },
  {
    title: 'Continuity planning',
    description:
      'Backup monitoring, restore testing, recovery notes, and incident roles that keep decisions clearer under pressure.',
  },
  {
    title: 'Strategy + roadmap',
    description:
      'Practical guidance on renewals, lifecycle, risk, and modernization translated into a plan the business can follow.',
  },
];

export const systemHighlightItems: HighlightItem[] = [
  {
    label: '01',
    title: 'Service ownership map',
    description:
      'Every account starts by naming who owns tickets, escalation, vendors, onboarding, offboarding, and recurring issue follow-up.',
  },
  {
    label: '02',
    title: 'Security baseline',
    description:
      'MFA, admin roles, endpoint coverage, email risk, risky forwarding, and response contacts are reviewed in plain business language.',
  },
  {
    label: '03',
    title: 'Backup proof',
    description:
      'Backup alerts, retention assumptions, restore access, protected systems, and recovery priorities are turned into reviewable evidence.',
  },
  {
    label: '04',
    title: 'Microsoft 365 governance',
    description:
      'Teams, SharePoint, OneDrive, Exchange, licenses, guest access, sharing rules, and backup expectations get practical owner rules.',
  },
  {
    label: '05',
    title: 'Vendor coordination',
    description:
      'Internet, phones, line-of-business apps, copier vendors, security tools, and cloud providers stop becoming ownerless side quests.',
  },
  {
    label: '06',
    title: 'Monthly leadership review',
    description:
      'Tickets, risks, security posture, backup confidence, renewals, projects, and next decisions are summarized for business owners.',
  },
];

export const playbookSteps: PlaybookStep[] = [
  {
    step: '01',
    title: 'Confirm the pressure point',
    detail:
      'Start with the business issue: recurring support pain, stale access, weak backup confidence, tenant sprawl, provider transition, or security proof.',
  },
  {
    step: '02',
    title: 'Stabilize the baseline',
    detail:
      'Map users, devices, locations, vendors, Microsoft 365, backups, security controls, and priority gaps before selling a giant tool stack.',
  },
  {
    step: '03',
    title: 'Review with leadership',
    detail:
      'Turn the work into a clear monthly view of open risks, completed fixes, budget decisions, and the next right move.',
  },
];

export const testimonials: Testimonial[] = [
  {
    quote:
      'The value was not another tool. It was finally knowing who owned tickets, access cleanup, backup follow-up, and the next decision.',
    name: 'Operations leader',
    role: 'Professional services group',
  },
  {
    quote:
      'The onboarding exposed stale access, backup assumptions, license waste, and recurring ticket patterns we had stopped seeing clearly.',
    name: 'Managing partner',
    role: 'Multi-site healthcare office',
  },
];

export const engagementTracks: EngagementTrack[] = [
  {
    name: '30-day stabilization',
    timeline: 'First 30 days',
    summary:
      'Create a clean operating picture before the relationship expands: users, devices, tickets, vendors, backup assumptions, and urgent security gaps.',
    deliverables: [
      'User, device, vendor, and application map',
      'Ticket and escalation ownership review',
      'Priority risk and first-fix roadmap',
    ],
  },
  {
    name: 'Secure operations',
    timeline: 'Managed monthly coverage',
    summary:
      'Ongoing managed IT support with security, Microsoft 365, backup, reporting, vendor coordination, and business-facing ownership.',
    deliverables: [
      'Help desk and escalation coverage',
      'Security and backup evidence review',
      'Monthly leadership summary',
    ],
  },
  {
    name: 'Roadmap and workflow support',
    timeline: 'Project-based or quarterly',
    summary:
      'Practical modernization for Microsoft 365 cleanup, cloud projects, office moves, onboarding flow, portals, forms, and client-facing handoffs.',
    deliverables: [
      'Project scope and dependency map',
      'Workflow or portal handoff plan',
      'Launch, adoption, and review checklist',
    ],
  },
];

export const controlStack: ControlStackItem[] = [
  {
    name: 'Support ownership',
    metric: '1 day',
    metricLabel: 'Typical non-urgent reply target',
    summary:
      'Make the support model visible so employees know where to go, managers know what is recurring, and leadership sees what changed.',
    bullets: [
      'Ticket routing, escalation, and vendor ownership',
      'Onboarding, offboarding, and access cleanup',
      'Recurring issue review before problems normalize',
    ],
  },
  {
    name: 'Security evidence',
    metric: '5 layers',
    metricLabel: 'Identity, endpoint, email, backup, response',
    summary:
      'Security gets judged by proof, not by how many acronyms appear in a proposal.',
    bullets: [
      'MFA, admin, endpoint, and email review',
      'Risky forwarding and external sharing checks',
      'Incident contacts and response expectations',
    ],
  },
  {
    name: 'Continuity proof',
    metric: '30-90',
    metricLabel: 'Days to baseline and roadmap',
    summary:
      'Backup and recovery work has to be understandable before an outage, ransomware event, or vendor failure tests it.',
    bullets: [
      'Protected systems, retention, and restore access',
      'Restore-test and alert-handling expectations',
      'Recovery priorities, contacts, and next actions',
    ],
  },
];

export const insightReports: InsightReport[] = [
  {
    category: 'Brief',
    title: 'Incident response owner map',
    description:
      'A simple review of who gets called, what systems matter first, what evidence exists, and what has to happen in the first hour.',
    linkLabel: 'Review the approach',
    href: 'trust-center/',
  },
  {
    category: 'Checklist',
    title: 'Provider transition checklist',
    description:
      'A clean handoff flow for access, documentation, tools, vendors, backups, contracts, and support expectations.',
    linkLabel: 'Start transition intake',
    href: 'contact-hq/',
  },
  {
    category: 'Playbook',
    title: 'Monthly leadership cadence',
    description:
      'A practical review rhythm for tickets, security posture, backup confidence, projects, renewals, risks, and upcoming decisions.',
    linkLabel: 'See the service model',
    href: 'services/',
  },
];

export const securitySummary: SecuritySummary = {
  intro:
    'Security conversations stay straightforward when ownership, evidence, and response expectations are visible before pressure hits.',
  principles: [
    {
      indicator: 'Identity and access',
      title: 'Least privilege before tool sprawl',
      description:
        'Admin roles, MFA, guest access, risky forwarding, and onboarding/offboarding habits are reviewed before more complex controls are added.',
    },
    {
      indicator: 'Backup and recovery',
      title: 'Restore confidence is evidence',
      description:
        'Protected systems, retention assumptions, alert handling, restore access, and recovery order are clarified so backup is not just a dashboard.',
    },
    {
      indicator: 'Response ownership',
      title: 'Incidents need named roles',
      description:
        'Security and continuity planning names contacts, vendor dependencies, decision owners, and the first actions leadership should expect.',
    },
  ],
};
