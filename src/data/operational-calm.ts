export interface NeedPath {
  id: string;
  label: string;
  title: string;
  description: string;
  lanes: string[];
  ownerQuestion: string;
  actionLabel: string;
}

export interface OperatingLayer {
  id: string;
  label: string;
  description: string;
}

export interface ProofSignal {
  label: string;
  value: string;
  note: string;
}

export interface DeliveryStep {
  step: string;
  title: string;
  copy: string;
}

export const homeCopy = {
  hero: {
    eyebrow: 'Operational command for field work and systems',
    headline: 'Trade work and technology systems, coordinated from one operating view.',
    subheadline:
      'Olive Global Systems brings construction trades, facility service, managed IT, security, cloud, automation, ecommerce, AI, and business systems into one calm delivery model for real-world complexity.',
    primaryCta: 'Send a project brief',
    secondaryCta: 'Find your lane',
  },
  service: {
    eyebrow: 'Scope stack',
    headline: 'Not a service directory. A coordinated operating stack.',
    body:
      'Start with the work in front of you, then see where adjacent trades, technology, controls, and owner handoff need to connect.',
  },
  scanner: {
    eyebrow: 'Project readiness scanner',
    headline: 'Tell the site what kind of pressure you are under.',
    body:
      'A first-time mobile visitor should not have to decode every service line. These paths turn vague needs into a clear starting lane.',
  },
  proof: {
    eyebrow: 'Proof of operating depth',
    headline: 'Built for the messy middle where scopes overlap.',
    body:
      'The value is not a longer list of services. It is the ability to keep handoffs, readiness, shutdowns, documentation, and support visible before work starts.',
  },
  process: {
    eyebrow: 'Delivery rhythm',
    headline: 'Simple sequence. Tight interfaces. Cleaner turnover.',
    body:
      'The brand story should feel calm because the operating model is calm: define the constraint, align the lane, release the work, then close with usable outputs.',
  },
  cta: {
    eyebrow: 'Contact HQ',
    headline: 'Bring the problem. We will help shape the starting scope.',
    body:
      'Send the project, facility, operational, or technology issue you are trying to solve. A clear first brief is enough to identify the right lane and the next useful step.',
  },
} as const;

export const operatingLayers: OperatingLayer[] = [
  {
    id: 'site',
    label: 'Site reality',
    description: 'Access, occupancy, shutdowns, sequencing, safety, and field constraints.',
  },
  {
    id: 'trades',
    label: 'Trade execution',
    description: 'Mechanical, electrical, plumbing, general contracting, HVAC, and repair lanes.',
  },
  {
    id: 'systems',
    label: 'Technology layer',
    description: 'Managed IT, security, cloud, automation, ecommerce, AI, and business systems.',
  },
  {
    id: 'handoff',
    label: 'Owner output',
    description: 'Documentation, startup logs, support paths, operating clarity, and next actions.',
  },
];

export const needPaths: NeedPath[] = [
  {
    id: 'build',
    label: 'Build or renovate',
    title: 'Start with a field-led scope stack.',
    description:
      'Best for capital projects, tenant improvements, phased renovations, mechanical rooms, and occupied-space work where coordination risk matters.',
    lanes: ['general-contracting', 'mechanical', 'electrical', 'plumbing', 'commercial-hvac'],
    ownerQuestion: 'What has to stay open, safe, powered, conditioned, or usable while the work happens?',
    actionLabel: 'Map a field scope',
  },
  {
    id: 'facility',
    label: 'Fix facility pressure',
    title: 'Start with service continuity and readiness.',
    description:
      'Best for shutdown-sensitive repairs, comfort problems, equipment replacement, maintenance gaps, and facility issues that cannot wait for perfect conditions.',
    lanes: ['commercial-hvac', 'mechanical', 'electrical', 'plumbing', 'auto-repair'],
    ownerQuestion: 'Which failure would hurt operations first: uptime, comfort, access, safety, or customer experience?',
    actionLabel: 'Triage facility work',
  },
  {
    id: 'technology',
    label: 'Modernize systems',
    title: 'Start with the technology operating layer.',
    description:
      'Best for managed IT, security, cloud, automation, ecommerce, AI workflows, data handoff, and business systems that need dependable support.',
    lanes: ['managed-technology', 'electrical', 'commercial-hvac', 'general-contracting'],
    ownerQuestion: 'Where is the business losing signal: support, visibility, security, automation, sales flow, or reporting?',
    actionLabel: 'Shape a systems scope',
  },
  {
    id: 'unclear',
    label: 'Not sure yet',
    title: 'Start with constraints, not categories.',
    description:
      'Best when the issue crosses trades, facilities, technology, budget, timing, and ownership. The first step is to separate the real constraint from the service label.',
    lanes: ['general-contracting', 'managed-technology', 'mechanical', 'electrical'],
    ownerQuestion: 'What outcome must be protected, and what constraint is making it hard?',
    actionLabel: 'Clarify the first move',
  },
];

export const proofSignals: ProofSignal[] = [
  {
    label: 'Operating coverage',
    value: 'Field + cloud',
    note: 'Physical work, digital systems, and owner support stay in the same narrative.',
  },
  {
    label: 'Buyer clarity',
    value: 'Lane-first',
    note: 'Visitors can identify a starting path without reading a giant menu of services.',
  },
  {
    label: 'Delivery posture',
    value: 'Readiness-led',
    note: 'Scopes are framed around constraints, interfaces, release points, and turnover.',
  },
];

export const deliveryRhythm: DeliveryStep[] = [
  {
    step: '01',
    title: 'Name the constraint',
    copy: 'Access, shutdown, occupancy, uptime, risk, budget, support, or systems visibility becomes the organizing principle.',
  },
  {
    step: '02',
    title: 'Choose the lead lane',
    copy: 'The right division leads while adjacent trades, technology needs, and owner handoffs are surfaced early.',
  },
  {
    step: '03',
    title: 'Release by readiness',
    copy: 'Work moves when dependencies, field conditions, outage windows, controls, and documentation are ready enough to support it.',
  },
  {
    step: '04',
    title: 'Turn over usable outputs',
    copy: 'Closeout ends with startup records, owner notes, support paths, asset context, and clear next actions.',
  },
];
