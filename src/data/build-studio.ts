export const studioMetricKeys = [
  'experience',
  'intelligence',
  'resilience',
  'conversion',
] as const;

export type StudioMetricKey = (typeof studioMetricKeys)[number];
export type StudioModuleCategory =
  | 'Operations Layer'
  | 'Security Layer'
  | 'Experience Layer'
  | 'Platform Layer';
export type StudioUrgency = 'balanced' | 'accelerated' | 'flagship';
export type StudioContactService =
  | 'msp'
  | 'security'
  | 'cloud'
  | 'ai'
  | 'digital';

export interface StudioSurface {
  id: string;
  title: string;
  description: string;
  href: string;
  tags: string[];
}

export interface StudioPreset {
  id: string;
  name: string;
  kicker: string;
  summary: string;
  audience: string;
  contactService: StudioContactService;
  baseInvestment: number;
  baseWeeks: number;
  recommendedScale: number;
  defaultModules: string[];
  baselineScores: Record<StudioMetricKey, number>;
  coreCrew: string[];
  surfaceIds: string[];
  outcomes: string[];
}

export interface StudioModule {
  id: string;
  title: string;
  category: StudioModuleCategory;
  description: string;
  investment: number;
  weeks: number;
  deliverable: string;
  surfaceIds: string[];
  impact: Record<StudioMetricKey, number>;
}

export interface StudioUrgencyProfile {
  id: StudioUrgency;
  label: string;
  summary: string;
  investmentMultiplier: number;
  timelineMultiplier: number;
}

export interface StudioSignal {
  title: string;
  detail: string;
}

export interface StudioPlanInput {
  presetId?: string;
  moduleIds?: string[];
  scale?: number;
  urgency?: StudioUrgency;
}

export interface StudioPhasePlan {
  label: string;
  summary: string;
  weeks: number;
}

export interface StudioPlan {
  preset: StudioPreset;
  modules: StudioModule[];
  urgency: StudioUrgencyProfile;
  scale: number;
  investmentLow: number;
  investmentHigh: number;
  totalWeeks: number;
  score: number;
  readiness: Record<StudioMetricKey, number>;
  crew: string[];
  outcomes: string[];
  surfaces: StudioSurface[];
  phases: StudioPhasePlan[];
}

export const studioModuleCategoryOrder: StudioModuleCategory[] = [
  'Operations Layer',
  'Security Layer',
  'Experience Layer',
  'Platform Layer',
];

export const studioMetricLabels: Record<StudioMetricKey, string> = {
  experience: 'Client experience',
  intelligence: 'Workflow leverage',
  resilience: 'Operational resilience',
  conversion: 'Decision readiness',
};

export const studioUrgencyProfiles: StudioUrgencyProfile[] = [
  {
    id: 'balanced',
    label: 'Balanced rollout',
    summary:
      'Best for a measured rollout, cleaner discovery, and stronger handoff confidence.',
    investmentMultiplier: 1,
    timelineMultiplier: 1,
  },
  {
    id: 'accelerated',
    label: 'Fast stabilization',
    summary:
      'Compress the timeline, add delivery leadership, and bias for the fastest practical first phase.',
    investmentMultiplier: 1.16,
    timelineMultiplier: 0.86,
  },
  {
    id: 'flagship',
    label: 'Leadership-ready',
    summary:
      'Increase polish, instrumentation, and leadership-ready presentation when the work needs to carry more weight.',
    investmentMultiplier: 1.32,
    timelineMultiplier: 1.1,
  },
];

export const studioSurfaces: StudioSurface[] = [
  {
    id: 'surface-home',
    title: 'Chicago homepage',
    description:
      'The public front door that frames managed IT, security, Microsoft 365, backup, networking, and workflow support.',
    href: '/',
    tags: ['homepage', 'messaging', 'trust', 'cta'],
  },
  {
    id: 'surface-experience',
    title: 'Trust and workflow proof',
    description:
      'Proof route showing customer excellence, security posture, backup confidence, response ownership, portals, and intake quality.',
    href: 'trust-center/',
    tags: ['trust', 'portal', 'workflow', 'proof'],
  },
  {
    id: 'surface-services',
    title: 'Service planning matrix',
    description:
      'Interactive planning layer that maps business pressure to service lanes, scope boundaries, and phased rollout plans.',
    href: 'services/#service-planner',
    tags: ['services', 'planner', 'matrix', 'consulting'],
  },
  {
    id: 'surface-pricing',
    title: 'Pricing guide',
    description:
      'Directional pricing, SLA comparisons, and calculators for practical buying conversations.',
    href: 'pricing/#estimate',
    tags: ['pricing', 'roi', 'calculator', 'sales'],
  },
  {
    id: 'surface-debug',
    title: 'Diagnostics console',
    description:
      'Technical route showing diagnostics, capability detection, and production troubleshooting care.',
    href: 'debug-webgl/',
    tags: ['diagnostics', 'debugging', 'quality', 'performance'],
  },
  {
    id: 'surface-contact',
    title: 'Intake HQ',
    description:
      'Project routing, kickoff framing, and intake handoff for the configured planning brief.',
    href: 'contact-hq/',
    tags: ['contact', 'intake', 'brief', 'handoff'],
  },
];

export const engineeringSignals: StudioSignal[] = [
  {
    title: 'Static-first shell, dynamic islands',
    detail:
      'Astro carries the main shell while Preact activates only the surfaces that justify real interactivity.',
  },
  {
    title: 'Data-driven planning surfaces',
    detail:
      'Services, pricing, presets, and planning logic are modeled in data so updates stay consistent across the site.',
  },
  {
    title: 'Buyer-safe interactive logic',
    detail:
      'The planner turns vague requests into a structured first-phase brief with counts, constraints, and ownership questions.',
  },
  {
    title: 'Base-path safe deployment model',
    detail:
      'Internal links route through helpers so GitHub Pages deployments work without broken assets or dead navigation.',
  },
  {
    title: 'Production validation wired in',
    detail:
      'The repo already carries lint, typecheck, unit/e2e tests, and build gates, so planning surfaces stay tied to engineering discipline.',
  },
  {
    title: 'Accessible, mobile-aware interaction patterns',
    detail:
      'Keyboard support, touch-safe controls, and restrained hydration make the interactive parts feel intentional rather than fragile.',
  },
];

export const studioPresets: StudioPreset[] = [
  {
    id: 'support-stabilization',
    name: 'Support Stabilization Plan',
    kicker: 'Managed IT planning',
    summary:
      'A first-phase plan for teams that need a real support queue, cleaner ownership, better documentation, and a stronger operating baseline.',
    audience:
      'Owners, operations leaders, and small internal IT teams who need support to feel organized again.',
    contactService: 'msp',
    baseInvestment: 22000,
    baseWeeks: 6,
    recommendedScale: 14,
    defaultModules: [
      'ops-workflow-cleanup',
      'endpoint-device-standardization',
      'backup-recovery-readiness',
      'network-site-reliability-plan',
    ],
    baselineScores: {
      experience: 48,
      intelligence: 42,
      resilience: 58,
      conversion: 46,
    },
    coreCrew: ['Service delivery lead', 'Technical account owner'],
    surfaceIds: ['surface-services', 'surface-contact'],
    outcomes: [
      'A steadier help desk, onboarding, and endpoint support baseline',
      'Cleaner documentation, vendor ownership, and escalation paths',
      'A 90-day plan for reducing repeat tickets and hidden friction',
    ],
  },
  {
    id: 'security-lift',
    name: 'Security and Compliance Lift',
    kicker: 'Security planning',
    summary:
      'A first-phase plan for firms that need sharper identity controls, stronger endpoint posture, and more confidence in their recovery and compliance habits.',
    audience:
      'Leadership teams, regulated firms, and internal IT owners who need a more serious security operating model.',
    contactService: 'security',
    baseInvestment: 28000,
    baseWeeks: 7,
    recommendedScale: 16,
    defaultModules: [
      'identity-access-hardening',
      'backup-recovery-readiness',
      'executive-security-reporting',
      'network-site-reliability-plan',
    ],
    baselineScores: {
      experience: 42,
      intelligence: 46,
      resilience: 66,
      conversion: 44,
    },
    coreCrew: ['Security and compliance lead', 'Technical account owner'],
    surfaceIds: ['surface-services', 'surface-pricing'],
    outcomes: [
      'Identity, endpoint, email, and backup priorities sequenced clearly',
      'A sharper compliance, cyber-insurance, and evidence baseline',
      'Leadership-ready security notes and next steps',
    ],
  },
  {
    id: 'm365-cloud-upgrade',
    name: 'Microsoft 365 and Cloud Upgrade',
    kicker: 'Cloud planning',
    summary:
      'A modernization plan for firms that need cleaner Microsoft 365 governance, better collaboration structure, and a safer cloud transition path.',
    audience:
      'Hybrid teams, operations leaders, and growing firms that have outgrown ad hoc Microsoft 365 and cloud decisions.',
    contactService: 'cloud',
    baseInvestment: 26000,
    baseWeeks: 7,
    recommendedScale: 18,
    defaultModules: [
      'm365-collaboration-rollout',
      'network-site-reliability-plan',
      'ops-workflow-cleanup',
      'executive-security-reporting',
    ],
    baselineScores: {
      experience: 46,
      intelligence: 52,
      resilience: 58,
      conversion: 48,
    },
    coreCrew: ['Cloud and infrastructure engineer', 'Technical account owner'],
    surfaceIds: ['surface-services', 'surface-pricing'],
    outcomes: [
      'A clearer Microsoft 365, cloud, and collaboration roadmap',
      'Better governance for users, files, guest access, and licenses',
      'A phased migration or cleanup plan that reduces disruption and rework',
    ],
  },
  {
    id: 'automation-reporting-sprint',
    name: 'Automation and Reporting Sprint',
    kicker: 'Workflow planning',
    summary:
      'A practical automation plan for firms that know manual work, reporting gaps, or repetitive admin tasks are slowing the team down.',
    audience:
      'Operations and service leaders who want workflow improvements with governance and measurable business value.',
    contactService: 'ai',
    baseInvestment: 24000,
    baseWeeks: 6,
    recommendedScale: 14,
    defaultModules: [
      'workflow-automation-reporting',
      'ops-workflow-cleanup',
      'executive-security-reporting',
      'm365-collaboration-rollout',
    ],
    baselineScores: {
      experience: 44,
      intelligence: 66,
      resilience: 48,
      conversion: 52,
    },
    coreCrew: ['Workflow automation lead', 'Operations analyst'],
    surfaceIds: ['surface-services', 'surface-contact'],
    outcomes: [
      'A shortlist of realistic automation wins instead of vague tool promises',
      'Cleaner reporting and internal workflow handoffs',
      'Guardrails for rolling out automation without creating new risk',
    ],
  },
  {
    id: 'client-experience-refresh',
    name: 'Client Workflow Refresh',
    kicker: 'Workflow experience planning',
    summary:
      'A targeted plan for firms that need their website, client portal, intake path, or service handoff to better match the quality of their operations.',
    audience:
      'Firms with a credible back office but a weak first impression, dated site, or underpowered client-facing workflow.',
    contactService: 'digital',
    baseInvestment: 30000,
    baseWeeks: 8,
    recommendedScale: 16,
    defaultModules: [
      'website-portal-refresh',
      'discovery-messaging-roadmap',
      'launch-quality-hardening',
      'executive-security-reporting',
    ],
    baselineScores: {
      experience: 64,
      intelligence: 44,
      resilience: 46,
      conversion: 62,
    },
    coreCrew: ['UX and content lead', 'Delivery lead'],
    surfaceIds: ['surface-home', 'surface-experience', 'surface-contact'],
    outcomes: [
      'A clearer service story and stronger first impression',
      'A client-facing workflow that works on mobile and answers real questions',
      'A phased plan for launch, content, analytics, and post-launch hardening',
    ],
  },
];

export const studioModules: StudioModule[] = [
  {
    id: 'ops-workflow-cleanup',
    title: 'Support Workflow Cleanup',
    category: 'Operations Layer',
    description:
      'Clarify support ownership, onboarding/offboarding, vendor handoffs, and recurring issue management so the team stops improvising.',
    investment: 6000,
    weeks: 2,
    deliverable:
      'Documented support workflow improvements and first-priority operational fixes',
    surfaceIds: ['surface-services', 'surface-contact'],
    impact: {
      experience: 2,
      intelligence: 5,
      resilience: 8,
      conversion: 3,
    },
  },
  {
    id: 'endpoint-device-standardization',
    title: 'Endpoint and Device Standardization',
    category: 'Operations Layer',
    description:
      'Set device standards, patch expectations, encryption checks, warranty notes, onboarding baselines, and a healthier endpoint management rhythm.',
    investment: 7000,
    weeks: 2,
    deliverable:
      'A cleaner device baseline and clearer endpoint management model',
    surfaceIds: ['surface-services', 'surface-contact'],
    impact: {
      experience: 1,
      intelligence: 3,
      resilience: 10,
      conversion: 2,
    },
  },
  {
    id: 'identity-access-hardening',
    title: 'Identity and Access Hardening',
    category: 'Security Layer',
    description:
      'Tighten MFA, admin roles, guest access, access reviews, and account governance across Microsoft 365 and critical systems.',
    investment: 9000,
    weeks: 3,
    deliverable:
      'A first-phase identity and access roadmap with immediate hardening actions',
    surfaceIds: ['surface-services', 'surface-pricing'],
    impact: {
      experience: 1,
      intelligence: 4,
      resilience: 12,
      conversion: 2,
    },
  },
  {
    id: 'backup-recovery-readiness',
    title: 'Backup and Recovery Readiness',
    category: 'Security Layer',
    description:
      'Review backup coverage, restore confidence, retention assumptions, recovery documentation, and the highest-risk continuity gaps first.',
    investment: 8000,
    weeks: 2,
    deliverable:
      'A clearer continuity baseline with recovery priorities and runbook actions',
    surfaceIds: ['surface-services', 'surface-pricing'],
    impact: {
      experience: 1,
      intelligence: 3,
      resilience: 13,
      conversion: 2,
    },
  },
  {
    id: 'website-portal-refresh',
    title: 'Website, Portal, and Intake Refresh',
    category: 'Experience Layer',
    description:
      'Upgrade service messaging, hierarchy, mobile UX, forms, proof points, and client confidence cues across the public front door, portal, or intake path.',
    investment: 10000,
    weeks: 3,
    deliverable:
      'A stronger client-facing surface with clearer trust signals and structure',
    surfaceIds: ['surface-home', 'surface-experience', 'surface-contact'],
    impact: {
      experience: 12,
      intelligence: 2,
      resilience: 2,
      conversion: 11,
    },
  },
  {
    id: 'workflow-automation-reporting',
    title: 'Workflow Automation and Reporting',
    category: 'Experience Layer',
    description:
      'Identify the best near-term automation wins, reporting gaps, and repetitive admin tasks that should be tightened first.',
    investment: 9000,
    weeks: 2,
    deliverable:
      'A practical automation and reporting backlog tied to owner time and business impact',
    surfaceIds: ['surface-services', 'surface-contact'],
    impact: {
      experience: 4,
      intelligence: 13,
      resilience: 2,
      conversion: 4,
    },
  },
  {
    id: 'discovery-messaging-roadmap',
    title: 'Discovery and Messaging Roadmap',
    category: 'Experience Layer',
    description:
      'Translate scattered ideas, notes, and service language into a clearer public story and better launch sequence.',
    investment: 7000,
    weeks: 2,
    deliverable:
      'A clearer site structure, content direction, and first-phase messaging plan',
    surfaceIds: ['surface-home', 'surface-contact'],
    impact: {
      experience: 8,
      intelligence: 3,
      resilience: 1,
      conversion: 10,
    },
  },
  {
    id: 'm365-collaboration-rollout',
    title: 'Microsoft 365 and Collaboration Rollout',
    category: 'Platform Layer',
    description:
      'Plan the first Microsoft 365, SharePoint, Teams, guest access, licensing, or intranet improvements that reduce friction and improve control.',
    investment: 8500,
    weeks: 2,
    deliverable:
      'A practical M365 and collaboration rollout plan with governance considerations',
    surfaceIds: ['surface-services', 'surface-pricing', 'surface-contact'],
    impact: {
      experience: 3,
      intelligence: 7,
      resilience: 8,
      conversion: 4,
    },
  },
  {
    id: 'network-site-reliability-plan',
    title: 'Network and Site Reliability Plan',
    category: 'Platform Layer',
    description:
      'Set the first priorities for networks, Wi-Fi, firewalls, ISP handoffs, remote access, or multi-site consistency without overengineering the scope.',
    investment: 8000,
    weeks: 2,
    deliverable:
      'A site and infrastructure reliability roadmap with practical milestones',
    surfaceIds: ['surface-services', 'surface-contact'],
    impact: {
      experience: 1,
      intelligence: 3,
      resilience: 11,
      conversion: 2,
    },
  },
  {
    id: 'executive-security-reporting',
    title: 'Executive Reporting and Decision Pack',
    category: 'Platform Layer',
    description:
      'Package the current-state findings, first-phase priorities, and budget logic into something leadership can actually review and approve.',
    investment: 6500,
    weeks: 1,
    deliverable:
      'A leadership-ready summary with milestones, priorities, and budget framing',
    surfaceIds: ['surface-pricing', 'surface-contact'],
    impact: {
      experience: 3,
      intelligence: 5,
      resilience: 5,
      conversion: 9,
    },
  },
  {
    id: 'launch-quality-hardening',
    title: 'Launch QA and Hardening',
    category: 'Platform Layer',
    description:
      'Pressure-test the launch scope with QA, release checks, and the practical hardening work that keeps the result credible after go-live.',
    investment: 7000,
    weeks: 1,
    deliverable: 'A cleaner release plan with fewer avoidable launch surprises',
    surfaceIds: ['surface-experience', 'surface-contact', 'surface-debug'],
    impact: {
      experience: 4,
      intelligence: 1,
      resilience: 9,
      conversion: 6,
    },
  },
];

const categoryCrewMap: Record<StudioModuleCategory, string> = {
  'Operations Layer': 'Service delivery lead',
  'Security Layer': 'Security and compliance lead',
  'Experience Layer': 'UX and content lead',
  'Platform Layer': 'Cloud and infrastructure engineer',
};

const phaseTemplates = [
  {
    label: 'Audit and align',
    summary:
      'Confirm the pressure point, current-state reality, and the strongest first-phase scope.',
    weight: 0.24,
  },
  {
    label: 'Stabilize the core',
    summary:
      'Address ownership gaps, the biggest risks, and the operating issues causing the most drag.',
    weight: 0.28,
  },
  {
    label: 'Modernize or launch',
    summary:
      'Move into the cloud, security, automation, or client-facing workflow work that earns the next investment.',
    weight: 0.28,
  },
  {
    label: 'Document and hand off',
    summary:
      'Package documentation, reporting, and next-step recommendations so momentum survives after the first phase.',
    weight: 0.2,
  },
] as const;

const studioPresetMap = new Map(
  studioPresets.map(preset => [preset.id, preset])
);
const studioModuleMap = new Map(
  studioModules.map(module => [module.id, module])
);
const studioSurfaceMap = new Map(
  studioSurfaces.map(surface => [surface.id, surface])
);
const studioUrgencyMap = new Map(
  studioUrgencyProfiles.map(profile => [profile.id, profile])
);

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function buildPhasePlan(totalWeeks: number): StudioPhasePlan[] {
  const phases: StudioPhasePlan[] = [];
  let allocated = 0;

  phaseTemplates.forEach((phase, index) => {
    const remainingPhases = phaseTemplates.length - index;
    const remainingWeeks = totalWeeks - allocated;
    const nextWeeks =
      index === phaseTemplates.length - 1
        ? Math.max(1, remainingWeeks)
        : Math.max(
            1,
            Math.min(
              remainingWeeks - (remainingPhases - 1),
              Math.round(totalWeeks * phase.weight)
            )
          );

    phases.push({
      label: phase.label,
      summary: phase.summary,
      weeks: nextWeeks,
    });
    allocated += nextWeeks;
  });

  return phases;
}

export function getStudioPresetById(id?: string): StudioPreset {
  if (id && studioPresetMap.has(id)) {
    return studioPresetMap.get(id)!;
  }

  return studioPresets[0];
}

export function getStudioModuleById(id: string): StudioModule | undefined {
  return studioModuleMap.get(id);
}

export function calculateStudioPlan({
  presetId,
  moduleIds,
  scale = studioPresets[0].recommendedScale,
  urgency = 'balanced',
}: StudioPlanInput = {}): StudioPlan {
  const preset = getStudioPresetById(presetId);
  const urgencyProfile =
    studioUrgencyMap.get(urgency) ?? studioUrgencyProfiles[0];
  const normalizedScale = clamp(scale, 8, 40);

  const normalizedModuleIds = unique(
    (moduleIds?.length ? moduleIds : preset.defaultModules).filter(id =>
      studioModuleMap.has(id)
    )
  );
  const modules = normalizedModuleIds
    .map(id => studioModuleMap.get(id))
    .filter((module): module is StudioModule => Boolean(module));

  const moduleInvestment = modules.reduce(
    (sum, module) => sum + module.investment,
    0
  );
  const scaleInvestment = normalizedScale * 1850;
  const investmentLow = Math.round(
    (preset.baseInvestment + moduleInvestment + scaleInvestment) *
      urgencyProfile.investmentMultiplier
  );
  const investmentHigh = Math.round(investmentLow * 1.22);

  const baseWeeks =
    preset.baseWeeks +
    Math.round(modules.reduce((sum, module) => sum + module.weeks, 0) * 0.65) +
    (normalizedScale >= 28 ? 2 : normalizedScale >= 18 ? 1 : 0);
  const totalWeeks = Math.max(
    4,
    Math.round(baseWeeks * urgencyProfile.timelineMultiplier)
  );

  const readiness = studioMetricKeys.reduce(
    (acc, key) => {
      const moduleImpact = modules.reduce(
        (sum, module) => sum + module.impact[key],
        0
      );
      const scaleBoost =
        normalizedScale >= 30 ? 5 : normalizedScale >= 20 ? 3 : 1;
      const urgencyBoost =
        urgency === 'flagship' ? 4 : urgency === 'accelerated' ? 2 : 0;

      acc[key] = clamp(
        preset.baselineScores[key] + moduleImpact + scaleBoost + urgencyBoost,
        0,
        100
      );
      return acc;
    },
    {} as Record<StudioMetricKey, number>
  );

  const score = Math.round(
    studioMetricKeys.reduce((sum, key) => sum + readiness[key], 0) /
      studioMetricKeys.length
  );

  const crew = unique(
    [
      ...preset.coreCrew,
      ...modules.map(module => categoryCrewMap[module.category]),
      normalizedScale >= 22 ? 'QA + accessibility lead' : '',
      normalizedScale >= 30 ? 'Launch producer' : '',
      urgency === 'accelerated' ? 'Delivery lead' : '',
      urgency === 'flagship' ? 'Executive communications lead' : '',
    ].filter(Boolean)
  ).slice(0, 6);

  const outcomes = unique([
    ...preset.outcomes,
    ...modules.map(module => module.deliverable),
  ]).slice(0, 6);

  const surfaces = unique([
    ...preset.surfaceIds,
    ...modules.flatMap(module => module.surfaceIds),
  ])
    .map(id => studioSurfaceMap.get(id))
    .filter((surface): surface is StudioSurface => Boolean(surface));

  return {
    preset,
    modules,
    urgency: urgencyProfile,
    scale: normalizedScale,
    investmentLow,
    investmentHigh,
    totalWeeks,
    score,
    readiness,
    crew,
    outcomes,
    surfaces,
    phases: buildPhasePlan(totalWeeks),
  };
}
