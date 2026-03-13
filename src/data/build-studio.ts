export const studioMetricKeys = [
  'experience',
  'intelligence',
  'resilience',
  'conversion',
] as const;

export type StudioMetricKey = (typeof studioMetricKeys)[number];
export type StudioModuleCategory =
  | 'Experience Layer'
  | 'Intelligence Layer'
  | 'Trust Layer'
  | 'Platform Layer';
export type StudioUrgency = 'balanced' | 'accelerated' | 'flagship';
export type StudioContactService = 'msp' | 'security' | 'cloud' | 'ai';

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
  'Experience Layer',
  'Intelligence Layer',
  'Trust Layer',
  'Platform Layer',
];

export const studioMetricLabels: Record<StudioMetricKey, string> = {
  experience: 'Experience depth',
  intelligence: 'Automation / AI',
  resilience: 'Reliability posture',
  conversion: 'Business movement',
};

export const studioUrgencyProfiles: StudioUrgencyProfile[] = [
  {
    id: 'balanced',
    label: 'Balanced runway',
    summary:
      'Best for thoughtful rollout, narrative polish, and production confidence.',
    investmentMultiplier: 1,
    timelineMultiplier: 1,
  },
  {
    id: 'accelerated',
    label: 'Accelerated launch',
    summary:
      'Compress the timeline, add delivery leadership, and bias for fast proof.',
    investmentMultiplier: 1.16,
    timelineMultiplier: 0.86,
  },
  {
    id: 'flagship',
    label: 'Flagship reveal',
    summary:
      'More motion, more narrative polish, more instrumentation, and more executive theater.',
    investmentMultiplier: 1.32,
    timelineMultiplier: 1.1,
  },
];

export const studioSurfaces: StudioSurface[] = [
  {
    id: 'surface-home',
    title: 'Landing systems',
    description:
      'Static-first storytelling, motion design, command palette triggers, and launch CTA choreography.',
    href: '/',
    tags: ['landing', 'motion', 'marketing', 'narrative'],
  },
  {
    id: 'surface-portfolio',
    title: 'Portfolio commerce engine',
    description:
      'Interactive storefront with search, compare, quick view, cart persistence, and checkout simulation.',
    href: 'about/',
    tags: ['portfolio', 'commerce', 'checkout', 'interactive'],
  },
  {
    id: 'surface-services',
    title: 'Service planning matrix',
    description:
      'Interactive routing engine that maps business pressure to delivery lanes and phased rollout plans.',
    href: 'services/#service-planner',
    tags: ['services', 'planner', 'matrix', 'consulting'],
  },
  {
    id: 'surface-pricing',
    title: 'Pricing intelligence',
    description:
      'Live plan cards, estimator tools, and ROI logic designed for real buying conversations.',
    href: 'pricing/#estimate',
    tags: ['pricing', 'roi', 'calculator', 'sales'],
  },
  {
    id: 'surface-debug',
    title: 'Diagnostics console',
    description:
      'Debug-webgl route proving low-level diagnostics, capability detection, and production troubleshooting care.',
    href: 'debug-webgl/',
    tags: ['diagnostics', 'webgl', 'debugging', 'performance'],
  },
  {
    id: 'surface-contact',
    title: 'Intake HQ',
    description:
      'Project routing, kickoff framing, and client-ready intake handoff for the configured build brief.',
    href: 'contact-hq/',
    tags: ['contact', 'intake', 'brief', 'handoff'],
  },
];

export const engineeringSignals: StudioSignal[] = [
  {
    title: 'Static-first shell, dynamic islands',
    detail:
      'Astro carries the marketing layer while Preact activates only the surfaces that justify real interactivity.',
  },
  {
    title: 'Worker-backed search + command routing',
    detail:
      'Command palette search is indexed, keyboard-friendly, and offloads fuzzy matching so the shell stays snappy.',
  },
  {
    title: 'Data-driven planning surfaces',
    detail:
      'Pricing, services, proofs, and showcases are modeled in `src/data/**` to keep launches consistent and maintainable.',
  },
  {
    title: 'Base-path safe deployment model',
    detail:
      'Internal links route through helpers so GitHub Pages deployments work without broken assets or dead navigation.',
  },
  {
    title: 'Production validation wired in',
    detail:
      'The repo already carries lint, typecheck, unit/e2e tests, and build gates—so showcase work proves engineering discipline too.',
  },
  {
    title: 'Accessible, mobile-aware interaction patterns',
    detail:
      'Keyboard support, touch-safe controls, and restrained hydration make the fancy bits feel intentional rather than fragile.',
  },
];

export const studioPresets: StudioPreset[] = [
  {
    id: 'launch-control',
    name: 'Launch Control Room',
    kicker: 'Flagship product reveal',
    summary:
      'A narrative-heavy command center for premium launches that need executive clarity, cinematic UX, and measurable readiness.',
    audience:
      'Founders, innovation teams, and launch owners who want one control surface for story, risk, and rollout.',
    contactService: 'cloud',
    baseInvestment: 64000,
    baseWeeks: 8,
    recommendedScale: 16,
    defaultModules: [
      'story-motion-system',
      'executive-briefing-layer',
      'observability-wall',
      'multi-surface-launch-kit',
    ],
    baselineScores: {
      experience: 62,
      intelligence: 48,
      resilience: 57,
      conversion: 58,
    },
    coreCrew: ['Creative technologist', 'Product strategist'],
    surfaceIds: ['surface-home', 'surface-contact'],
    outcomes: [
      'Executive-ready launch room with narrative sequencing',
      'Live readiness signals spanning UX, delivery, and risk posture',
      'A premium handoff surface for stakeholders and buyers',
    ],
  },
  {
    id: 'commerce-cinematic',
    name: 'Commerce Cinematic Engine',
    kicker: 'Premium digital showroom',
    summary:
      'A conversion-first experience layer that merges motion, merchandising, pricing logic, and sharp operational storytelling.',
    audience:
      'Brands and product teams that need a showcase proving both polish and serious interaction design.',
    contactService: 'cloud',
    baseInvestment: 72000,
    baseWeeks: 10,
    recommendedScale: 18,
    defaultModules: [
      'story-motion-system',
      'immersive-commerce-engine',
      'pricing-decision-engine',
      'performance-guardrails',
    ],
    baselineScores: {
      experience: 68,
      intelligence: 50,
      resilience: 52,
      conversion: 66,
    },
    coreCrew: ['Experience director', 'Conversion strategist'],
    surfaceIds: ['surface-portfolio', 'surface-pricing'],
    outcomes: [
      'A premium showcase that proves real interaction depth, not just static art direction',
      'Pricing and conversion surfaces wired into the narrative from day one',
      'Launch assets that move from demo to production buying flow cleanly',
    ],
  },
  {
    id: 'ai-operations-room',
    name: 'AI Operations Room',
    kicker: 'Automation + orchestration cockpit',
    summary:
      'An operator-facing control room showing how AI, workflow automation, diagnostics, and routing logic compound into a real product.',
    audience:
      'Ops, platform, and transformation leaders who want proof that AI can be instrumented—not just narrated.',
    contactService: 'ai',
    baseInvestment: 69000,
    baseWeeks: 9,
    recommendedScale: 20,
    defaultModules: [
      'ai-workflow-orchestrator',
      'operator-command-palette',
      'observability-wall',
      'performance-guardrails',
    ],
    baselineScores: {
      experience: 50,
      intelligence: 70,
      resilience: 60,
      conversion: 54,
    },
    coreCrew: ['AI systems designer', 'Workflow engineer'],
    surfaceIds: ['surface-services', 'surface-debug'],
    outcomes: [
      'An AI-native command surface with visible orchestration logic',
      'Operational observability and diagnostics translated into product UX',
      'A showcase that proves applied automation, not generic chatbot theater',
    ],
  },
  {
    id: 'trust-command-center',
    name: 'Trust Command Center',
    kicker: 'Security + reliability narrative',
    summary:
      'A resilience-first showroom designed to communicate compliance posture, response readiness, and executive-grade confidence.',
    audience:
      'Security-minded teams who need a premium interface for proving readiness without losing design quality.',
    contactService: 'security',
    baseInvestment: 67000,
    baseWeeks: 8,
    recommendedScale: 14,
    defaultModules: [
      'trust-proof-system',
      'executive-briefing-layer',
      'observability-wall',
      'performance-guardrails',
    ],
    baselineScores: {
      experience: 54,
      intelligence: 46,
      resilience: 74,
      conversion: 49,
    },
    coreCrew: ['Security architect', 'Narrative systems lead'],
    surfaceIds: ['surface-services', 'surface-contact'],
    outcomes: [
      'A trust surface that turns security posture into something leaders can actually read',
      'Confidence signals for compliance, uptime, and incident rehearsal',
      'A more serious showcase than a generic “security page” ever delivers',
    ],
  },
];

export const studioModules: StudioModule[] = [
  {
    id: 'story-motion-system',
    title: 'Story Motion System',
    category: 'Experience Layer',
    description:
      'Choreograph hero transitions, section pacing, and motion cues so the narrative feels authored instead of assembled.',
    investment: 12000,
    weeks: 2,
    deliverable:
      'Motion language and narrative sequencing tuned to the build concept',
    surfaceIds: ['surface-home', 'surface-portfolio'],
    impact: {
      experience: 11,
      intelligence: 1,
      resilience: 2,
      conversion: 6,
    },
  },
  {
    id: 'immersive-commerce-engine',
    title: 'Immersive Commerce Engine',
    category: 'Experience Layer',
    description:
      'Layer merchandising, comparison, and checkout storytelling into a premium showroom that still feels operationally credible.',
    investment: 18000,
    weeks: 3,
    deliverable:
      'Showroom-grade commerce flow with richer interaction states and buyer confidence cues',
    surfaceIds: ['surface-portfolio', 'surface-pricing'],
    impact: {
      experience: 10,
      intelligence: 3,
      resilience: 1,
      conversion: 12,
    },
  },
  {
    id: 'ai-workflow-orchestrator',
    title: 'AI Workflow Orchestrator',
    category: 'Intelligence Layer',
    description:
      'Expose automation logic, triage routes, and decision stages so visitors can see the thinking behind the AI surface.',
    investment: 21000,
    weeks: 3,
    deliverable:
      'Visible orchestration model with automation stages, scenario logic, and AI-native delivery framing',
    surfaceIds: ['surface-services', 'surface-debug'],
    impact: {
      experience: 4,
      intelligence: 14,
      resilience: 4,
      conversion: 5,
    },
  },
  {
    id: 'operator-command-palette',
    title: 'Operator Command Palette',
    category: 'Intelligence Layer',
    description:
      'Promote search, shortcuts, and deep-link actions into a real product control layer rather than a hidden convenience feature.',
    investment: 9000,
    weeks: 1,
    deliverable:
      'Keyboard-first routing and scenario control system with stronger discovery affordances',
    surfaceIds: ['surface-home', 'surface-services'],
    impact: {
      experience: 3,
      intelligence: 8,
      resilience: 2,
      conversion: 4,
    },
  },
  {
    id: 'pricing-decision-engine',
    title: 'Pricing Decision Engine',
    category: 'Intelligence Layer',
    description:
      'Turn estimates, ROI assumptions, and plan comparisons into a strategic buying interface instead of a dead-end calculator.',
    investment: 11000,
    weeks: 2,
    deliverable:
      'A buying layer that ties investment, ROI, and delivery sequencing together in one story',
    surfaceIds: ['surface-pricing', 'surface-contact'],
    impact: {
      experience: 3,
      intelligence: 7,
      resilience: 1,
      conversion: 10,
    },
  },
  {
    id: 'trust-proof-system',
    title: 'Trust Proof System',
    category: 'Trust Layer',
    description:
      'Surface operational proof, client confidence, and compliance language in a way that feels premium and readable.',
    investment: 10000,
    weeks: 2,
    deliverable:
      'Confidence architecture spanning proof strips, trust badges, and executive-facing reassurance layers',
    surfaceIds: ['surface-services', 'surface-contact'],
    impact: {
      experience: 4,
      intelligence: 2,
      resilience: 10,
      conversion: 6,
    },
  },
  {
    id: 'executive-briefing-layer',
    title: 'Executive Briefing Layer',
    category: 'Trust Layer',
    description:
      'Translate the build into boardroom-ready signals, milestones, and strategic context without flattening the design.',
    investment: 13000,
    weeks: 2,
    deliverable:
      'Leadership narrative layer with milestone framing and proof-led storytelling',
    surfaceIds: ['surface-home', 'surface-contact'],
    impact: {
      experience: 5,
      intelligence: 3,
      resilience: 7,
      conversion: 7,
    },
  },
  {
    id: 'observability-wall',
    title: 'Observability Wall',
    category: 'Platform Layer',
    description:
      'Make runtime confidence visible through readiness metrics, monitoring concepts, and diagnostics that feel productized.',
    investment: 15000,
    weeks: 2,
    deliverable:
      'Monitoring and diagnostics surfaces that reinforce launch confidence',
    surfaceIds: ['surface-debug', 'surface-services'],
    impact: {
      experience: 2,
      intelligence: 5,
      resilience: 12,
      conversion: 3,
    },
  },
  {
    id: 'performance-guardrails',
    title: 'Performance Guardrails',
    category: 'Platform Layer',
    description:
      'Bias the experience toward fast, resilient delivery with motion discipline, bundle awareness, and mobile-proof constraints.',
    investment: 8000,
    weeks: 1,
    deliverable:
      'A hardening pass that protects the premium feel on real devices and low-end conditions',
    surfaceIds: ['surface-home', 'surface-debug'],
    impact: {
      experience: 2,
      intelligence: 1,
      resilience: 9,
      conversion: 4,
    },
  },
  {
    id: 'multi-surface-launch-kit',
    title: 'Multi-Surface Launch Kit',
    category: 'Platform Layer',
    description:
      'Connect landing, services, pricing, and intake into a cohesive sequence so every page reinforces the same thesis.',
    investment: 14000,
    weeks: 2,
    deliverable:
      'Unified launch choreography spanning key pages, routes, and buyer actions',
    surfaceIds: [
      'surface-home',
      'surface-services',
      'surface-pricing',
      'surface-contact',
    ],
    impact: {
      experience: 6,
      intelligence: 4,
      resilience: 4,
      conversion: 9,
    },
  },
];

const categoryCrewMap: Record<StudioModuleCategory, string> = {
  'Experience Layer': 'Motion systems designer',
  'Intelligence Layer': 'Automation / AI engineer',
  'Trust Layer': 'Narrative + proof strategist',
  'Platform Layer': 'Platform reliability engineer',
};

const phaseTemplates = [
  {
    label: 'Frame the thesis',
    summary:
      'Align the narrative, operating pressure, and highest-value system surface.',
    weight: 0.24,
  },
  {
    label: 'Prototype the experience',
    summary:
      'Build the interaction model, proof surfaces, and responsive choreography.',
    weight: 0.28,
  },
  {
    label: 'Instrument the system',
    summary:
      'Wire diagnostics, automation cues, and production-minded guardrails into the build.',
    weight: 0.28,
  },
  {
    label: 'Rehearse the launch',
    summary:
      'Package the story, harden the experience, and prepare the handoff for real stakeholders.',
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
      urgency === 'flagship' ? 'Cinematic art direction' : '',
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
