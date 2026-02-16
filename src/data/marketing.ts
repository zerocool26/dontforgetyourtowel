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
  '24/7 monitoring with proactive patching',
  'Identity + endpoint hardening that scales',
  'Cloud modernization without downtime drama',
];

export const clientBadges: string[] = [
  'Northwind Heavy',
  'Globex Systems',
  'Initech Logistics',
  'Starkline Group',
];

export const keyMetrics: Metric[] = [
  { value: '15 min', label: 'Typical first response (demo)' },
  { value: '24/7', label: 'Monitoring + alerting coverage' },
  { value: '99.9%', label: 'Target availability mindset' },
];

export const landingPillars: Pillar[] = [
  {
    title: 'Proactive operations',
    description:
      'Monitoring, patching, and hygiene work that reduces incidents before they become interruptions.',
  },
  {
    title: 'Security-first baseline',
    description:
      'Identity, device, and access controls designed to shrink your attack surface without slowing teams down.',
  },
  {
    title: 'Cloud done right',
    description:
      'Migrations, hardening, and cost visibility—with guardrails that keep reliability and security aligned.',
  },
  {
    title: 'Helpdesk that resolves',
    description:
      'Fast triage, clear communication, and durable fixes—so the same issue doesn’t boomerang next week.',
  },
  {
    title: 'Continuity planning',
    description:
      'Backups, recovery drills, and incident response practices that keep you in control when it matters most.',
  },
  {
    title: 'Strategy + roadmap',
    description:
      'Practical guidance on tooling, risk, and modernization—translating priorities into a plan your business can follow.',
  },
];

export const systemHighlightItems: HighlightItem[] = [
  {
    label: '01',
    title: 'Runtime zero',
    description:
      'Every widget renders at build time. No hydration scripts, no runtime costs, and nothing to babysit once deployed.',
  },
  {
    label: '02',
    title: 'Design tokens',
    description:
      'Tailwind defaults ship with a balanced industrial palette, typography scale, and consistent radii for hard-working UI.',
  },
  {
    label: '03',
    title: 'Governance ready',
    description:
      'Collections enforce schema rules so status updates, changelogs, and compliance notes stay structured and audit friendly.',
  },
  {
    label: '04',
    title: 'Trusted rollouts',
    description:
      'Preview pipelines and a pre-deploy script combine lint, type-check, and error review into one repeatable command.',
  },
  {
    label: '05',
    title: 'Reporting cadence',
    description:
      'Templates cover weekly health, major launches, and incident retros with carefully spaced typography for readability.',
  },
  {
    label: '06',
    title: 'Static integrations',
    description:
      'Embed charts, badges, and data snapshots as generated assets—no need for third-party scripts or live connections.',
  },
];

export const playbookSteps: PlaybookStep[] = [
  {
    step: '01',
    title: 'Capture the essentials',
    detail:
      'Start with project health, key metrics, and last deployment summary. The hero section keeps copy tight and scannable.',
  },
  {
    step: '02',
    title: 'Frame executive updates',
    detail:
      'Use highlights and testimonials to communicate wins, risk, and customer impact without shipping new dashboards.',
  },
  {
    step: '03',
    title: 'Publish with confidence',
    detail:
      'Run the bundled pre-deploy script. Once green, push to main and let GitHub Pages handle the static release.',
  },
];

export const testimonials: Testimonial[] = [
  {
    quote:
      'The proactive monitoring caught a patch issue before it became an outage. That’s the partnership we needed.',
    name: 'Danielle Ortiz',
    role: 'Operations Lead, Northwind',
  },
  {
    quote:
      'We stopped firefighting and started modernizing. Clear comms, fast fixes, and better security posture.',
    name: 'Marcus Chen',
    role: 'Founder, Globex',
  },
];

export const engagementTracks: EngagementTrack[] = [
  {
    name: 'Launch blueprint',
    timeline: 'Two-week audit',
    summary:
      'Tighten your narrative, metrics, and governance cadence before going live. Ideal for teams modernising status updates.',
    deliverables: [
      'Architecture and deployment review',
      'Narrative + tone workshop',
      'Executive-ready content roadmap',
    ],
  },
  {
    name: 'Operations retainer',
    timeline: 'Quarterly partnership',
    summary:
      'Embed our team to produce ongoing executive readouts, maintain templates, and ensure every release hits the standard.',
    deliverables: [
      'Monthly leadership briefs',
      'Metrics instrumentation guides',
      'Quarterly QBR deck support',
    ],
  },
  {
    name: 'Executive brief kit',
    timeline: '10-day turnaround',
    summary:
      'A polished library of layouts, messaging frameworks, and checklists so your team can publish with confidence on day one.',
    deliverables: [
      'Template and block library',
      'Copy and tone standards',
      'Rollout and review checklist',
    ],
  },
];

export const controlStack: ControlStackItem[] = [
  {
    name: 'Release discipline',
    metric: '±48h',
    metricLabel: 'Deployment forecast',
    summary:
      'Keep engineering, compliance, and stakeholders aligned on when the next release lands and what makes it production ready.',
    bullets: [
      'Automated status scoring before every push',
      'Risk narratives surfaced for leadership reviews',
      'Evidence bundles generated for compliance teams',
    ],
  },
  {
    name: 'Operations telemetry',
    metric: '92%',
    metricLabel: 'Report reuse rate',
    summary:
      'Turn recurring reports into governed templates that stay polished, accessible, and painless to update.',
    bullets: [
      'Composable sections for launches and retros',
      'Single source of truth for product and ops data',
      'Structured archives with search-friendly metadata',
    ],
  },
  {
    name: 'Stakeholder clarity',
    metric: '15 min',
    metricLabel: 'Executive prep time',
    summary:
      'Deliver succinct, on-brand briefings that cut through noise while capturing the detail auditors expect.',
    bullets: [
      'Narrative frameworks tuned for revenue and risk',
      'Live-to-static workflows for dashboards and charts',
      'Versioned approvals with automated changelogs',
    ],
  },
];

export const insightReports: InsightReport[] = [
  {
    category: 'Brief',
    title: 'Incident simulation kit',
    description:
      'A ready-to-run exercise playbook that keeps product, operations, and customer teams aligned before the next escalation.',
    linkLabel: 'Preview the kit',
    href: 'services/',
  },
  {
    category: 'Checklist',
    title: 'Launch governance audit',
    description:
      'A condensed review flow for security, compliance, and product sign-off designed for static delivery teams.',
    linkLabel: 'Run the audit',
    href: 'contact-hq/',
  },
  {
    category: 'Playbook',
    title: 'Executive reporting cadence',
    description:
      'Weekly, monthly, and quarterly templates that reduce prep while amplifying the story leadership needs to hear.',
    linkLabel: 'See the cadence',
    href: 'about/',
  },
];

export const securitySummary: SecuritySummary = {
  intro:
    'Security conversations stay straightforward when every asset is static, audited, and version controlled inside the repo.',
  principles: [
    {
      indicator: 'No runtime dependencies',
      title: 'Static by default',
      description:
        'Pages compile to pure HTML and CSS. Nothing runs on the client, so there are no API keys, secrets, or third-party scripts to manage.',
    },
    {
      indicator: 'Structured content model',
      title: 'Schema-backed content',
      description:
        'Collections and TypeScript types enforce the fields you expect, tightening editorial workflows and keeping compliance teams confident.',
    },
    {
      indicator: 'Operator-grade logging',
      title: 'Predictable deploys',
      description:
        'Pre-deploy scripts verify types, lint rules, and error states before release, producing an auditable trail for every push to production.',
    },
  ],
};
