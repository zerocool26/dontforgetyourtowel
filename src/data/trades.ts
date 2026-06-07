import { withBasePath } from '../utils/helpers';

export interface TradeMetric {
  label: string;
  value: string;
  note: string;
}

export interface TradeServiceLine {
  title: string;
  description: string;
  deliverables: string[];
}

export interface TradeSector {
  name: string;
  note: string;
}

export interface TradeSubpageSection {
  title: string;
  copy: string;
  bullets: string[];
}

export interface TradeSubpage {
  slug: string;
  shortLabel: string;
  title: string;
  description: string;
  intro: string;
  sections: TradeSubpageSection[];
  callout: TradeMetric;
}

export interface TradeProfile {
  slug: string;
  badge: string;
  name: string;
  shortName: string;
  eyebrow: string;
  accent: string;
  summary: string;
  heroTitle: string;
  heroDescription: string;
  marketFocus: string;
  metrics: TradeMetric[];
  serviceLines: TradeServiceLine[];
  differentiators: string[];
  sectors: TradeSector[];
  integration: string[];
  subpages: TradeSubpage[];
}

export interface TradeProgram {
  slug: string;
  title: string;
  description: string;
  tradeSlugs: string[];
  outputs: string[];
}

export const tradeProfiles: TradeProfile[] = [
  {
    slug: 'mechanical',
    badge: 'ME',
    name: 'Mechanical',
    shortName: 'Mechanical',
    eyebrow: 'Mechanical Systems',
    accent: '#b9f271',
    summary:
      'Mechanical retrofit and equipment delivery for facilities that need field coordination, access planning, and dependable turnover packages.',
    heroTitle:
      'Mechanical systems built for uptime, retrofit reality, and clean turnover.',
    heroDescription:
      'We position mechanical work as a coordinated delivery lane, not an isolated trade. Scope, access, shutdown sequencing, and commissioning handoff stay tied to the rest of the project from preconstruction through closeout.',
    marketFocus:
      'Tenant improvements, capital replacements, plant upgrades, and occupied-facility modernization.',
    metrics: [
      {
        label: 'Project fit',
        value: 'Retrofit-heavy',
        note: 'Designed for occupied buildings and constrained access.',
      },
      {
        label: 'Coordination mode',
        value: 'Field-first',
        note: 'BIM, shop release, and install planning stay connected.',
      },
      {
        label: 'Turnover focus',
        value: 'Commissioning-ready',
        note: 'Documentation packages built for owner handoff.',
      },
    ],
    serviceLines: [
      {
        title: 'Equipment replacement',
        description:
          'Air-side and hydronic equipment replacement scoped around shutdown windows, crane access, and phased turnover.',
        deliverables: [
          'Equipment schedule validation',
          'Rigging and access planning',
          'Startup and punch management',
        ],
      },
      {
        title: 'Piping and hydronic work',
        description:
          'Hydronic piping, valves, insulation coordination, and tie-in sequencing for existing and expanded systems.',
        deliverables: [
          'Tie-in phasing',
          'Valve and control point coordination',
          'Pressure testing and flush plans',
        ],
      },
      {
        title: 'Fabrication and prefab',
        description:
          'Shop-driven layout packages that reduce field conflict and compress install time on repetitive assemblies.',
        deliverables: [
          'Prefab release packages',
          'Field verification notes',
          'Install sequence boards',
        ],
      },
      {
        title: 'Mechanical room upgrades',
        description:
          'Mechanical room reorganizations with maintainability, service clearance, and long-term access in view.',
        deliverables: [
          'Room utilization mapping',
          'Clearance coordination',
          'Final as-built turnover',
        ],
      },
    ],
    differentiators: [
      'Mechanical scope is tied to access, shutdown, and commissioning from day one.',
      'Retrofit decisions are made with other trades in the room, not after field conflicts appear.',
      'Turnover packages prioritize owner operations instead of stopping at install completion.',
    ],
    sectors: [
      {
        name: 'Healthcare and clinics',
        note: 'Occupied-space sequencing and clean turnover expectations.',
      },
      {
        name: 'Industrial and light manufacturing',
        note: 'Shutdown-sensitive work with equipment continuity concerns.',
      },
      {
        name: 'Office and mixed-use interiors',
        note: 'Tenant improvements with compressed occupancy dates.',
      },
    ],
    integration: [
      'Electrical feeder and control coordination',
      'Commercial HVAC balancing and startup',
      'General contracting schedule control',
    ],
    subpages: [
      {
        slug: 'retrofit-delivery',
        shortLabel: 'Retrofit Delivery',
        title: 'Mechanical Retrofit Delivery',
        description:
          'How mechanical retrofits are planned, released, and executed without losing control of access, shutdowns, or turnover.',
        intro:
          'Retrofit work succeeds when engineering intent, field verification, and install sequencing all stay visible. This page focuses on the practical controls that keep mechanical replacements moving in real buildings.',
        sections: [
          {
            title: 'Preconstruction reality checks',
            copy: 'Mechanical scope is stress-tested against access routes, structural loading, demo limits, and service continuity before release.',
            bullets: [
              'Verify dimensions against field conditions before fabrication release',
              'Map shutdown impacts to building operations and tenant hours',
              'Lock crane, lift, and rooftop access windows early',
            ],
          },
          {
            title: 'Release and install sequencing',
            copy: 'Release packages are split around install risk, not just drawing packages. That keeps field crews supplied without flooding the project with unfinished scope.',
            bullets: [
              'Break work into riser, room, and system activation packages',
              'Coordinate insulation, controls, and startup dependencies',
              'Track punch ownership by area so closeout does not drift',
            ],
          },
        ],
        callout: {
          label: 'Best use',
          value: 'Occupied retrofits',
          note: 'Built for projects where downtime and access are the real risks.',
        },
      },
      {
        slug: 'fabrication-planning',
        shortLabel: 'Fabrication Planning',
        title: 'Mechanical Fabrication And Planning',
        description:
          'Shop planning, prefab strategy, and field validation methods for mechanical assemblies that need to land cleanly.',
        intro:
          'Prefabrication only saves time when release logic is disciplined. We keep fabrication aligned to actual install readiness so the field receives the right assemblies at the right moment.',
        sections: [
          {
            title: 'Prefab scope selection',
            copy: 'Assemblies are selected for prefab based on repetition, access constraints, and the project’s tolerance for late rework.',
            bullets: [
              'Prioritize high-repeat valve and rack assemblies',
              'Separate early prefab candidates from field-measured items',
              'Tie packaging to floor, area, and install crew sequence',
            ],
          },
          {
            title: 'Field handoff discipline',
            copy: 'Every released assembly carries enough context for install, inspection, and turnover instead of relying on tribal knowledge.',
            bullets: [
              'Issue coordinated tags and area-based install references',
              'Document deviations before they multiply into rework',
              'Close the loop between field redlines and as-builts',
            ],
          },
        ],
        callout: {
          label: 'Delivery priority',
          value: 'Low rework',
          note: 'Prefabrication is used to remove field uncertainty, not add it.',
        },
      },
    ],
  },
  {
    slug: 'electrical',
    badge: 'EL',
    name: 'Electrical',
    shortName: 'Electrical',
    eyebrow: 'Power And Controls',
    accent: '#ffe082',
    summary:
      'Electrical installations and power/control scope managed with a strong bias toward sequence control, energization planning, and operational safety.',
    heroTitle:
      'Electrical work that respects energization risk, sequence pressure, and owner operations.',
    heroDescription:
      'From service upgrades to branch circuits and controls, electrical scope is managed around what actually creates risk in the field: outages, dependencies, inspections, and start-up readiness.',
    marketFocus:
      'Service upgrades, tenant power distribution, controls, specialty systems, and phased energization.',
    metrics: [
      {
        label: 'Execution bias',
        value: 'Sequence-led',
        note: 'Electrical release follows energization logic, not guesswork.',
      },
      {
        label: 'Critical interface',
        value: 'Controls-heavy',
        note: 'Power, controls, and startup stay coordinated across trades.',
      },
      {
        label: 'Closeout mode',
        value: 'Inspection-ready',
        note: 'Panels, labeling, and testing stay ahead of turnover.',
      },
    ],
    serviceLines: [
      {
        title: 'Power distribution',
        description:
          'Service upgrades, panel replacements, feeders, branch power, and phased energization for occupied and active facilities.',
        deliverables: [
          'Shutdown sequencing',
          'Panel schedules and labeling',
          'Testing and inspection tracking',
        ],
      },
      {
        title: 'Lighting and controls',
        description:
          'Lighting packages aligned to occupancy, code, and control intent instead of being treated as a late-stage finish item.',
        deliverables: [
          'Fixture release coordination',
          'Lighting control integration',
          'Punch-free device turnover',
        ],
      },
      {
        title: 'Low-voltage interfaces',
        description:
          'Low-voltage pathways and device coordination for HVAC controls, access, and support infrastructure.',
        deliverables: [
          'Pathway and rack coordination',
          'Device rough-in tracking',
          'Cross-trade startup planning',
        ],
      },
      {
        title: 'Controls and specialty systems',
        description:
          'Electrical support for BAS, mechanical controls, specialty equipment, and systems that need clean power/control handoff.',
        deliverables: [
          'Point-to-point coordination',
          'Startup dependency maps',
          'Owner training support',
        ],
      },
    ],
    differentiators: [
      'Electrical scheduling is built around outages, inspections, and energization milestones.',
      'Controls are coordinated with mechanical and HVAC work instead of being left as a closeout scramble.',
      'Documentation stays usable for maintenance teams after turnover, not just for permit signoff.',
    ],
    sectors: [
      {
        name: 'Commercial interiors',
        note: 'Fast turnovers with strict punch and occupancy deadlines.',
      },
      {
        name: 'Retail and public-facing spaces',
        note: 'Lighting, signage, and continuity expectations are high.',
      },
      {
        name: 'Industrial support areas',
        note: 'Equipment coordination and shutdown planning drive the work.',
      },
    ],
    integration: [
      'Mechanical controls and startup',
      'General contracting phasing and inspection readiness',
      'MSP and tech-service infrastructure support',
    ],
    subpages: [
      {
        slug: 'power-and-controls',
        shortLabel: 'Power And Controls',
        title: 'Electrical Power And Controls',
        description:
          'Distribution, controls, and startup planning for electrical work that has to land cleanly under schedule pressure.',
        intro:
          'Electrical scope often becomes the project choke point when panel turnover, controls, and inspection sequencing are not clear. This page shows how those handoffs are controlled.',
        sections: [
          {
            title: 'Distribution planning',
            copy: 'Power packages are structured around feeder release, panel readiness, and outage windows so energization stays controlled.',
            bullets: [
              'Map service impacts before field demolition starts',
              'Track feeder and panel readiness in the same release log',
              'Coordinate temporary power and final cutover separately',
            ],
          },
          {
            title: 'Control readiness',
            copy: 'Controls are delivered as part of startup planning, not as late extras. That keeps BAS, mechanical systems, and owner turnover aligned.',
            bullets: [
              'Confirm device rough-in before finish ceilings close',
              'Tie controls dependencies to startup milestone planning',
              'Document point-to-point testing for closeout',
            ],
          },
        ],
        callout: {
          label: 'Priority',
          value: 'Controlled energization',
          note: 'Release logic is built around safe cutovers and inspection flow.',
        },
      },
      {
        slug: 'field-installation',
        shortLabel: 'Field Installation',
        title: 'Electrical Field Installation',
        description:
          'Field execution standards for rough-in, finish work, labeling, and turnover in commercial electrical projects.',
        intro:
          'Good electrical delivery is not just about getting wire in the wall. The field process has to preserve access, sequence, inspection quality, and owner usability at the end.',
        sections: [
          {
            title: 'Rough-in discipline',
            copy: 'Rough-in is managed with enough detail to protect finish work, ceiling closure, and downstream controls teams.',
            bullets: [
              'Coordinate device elevations and specialty equipment early',
              'Track ceiling closure readiness by zone',
              'Separate incomplete areas before they become punch growth',
            ],
          },
          {
            title: 'Finish and turnover',
            copy: 'Finish work is packaged so labeling, testing, and owner walkthroughs stay organized instead of drifting into late cleanup.',
            bullets: [
              'Validate panel directories against final conditions',
              'Build deficiency logs by space and responsible party',
              'Close with as-builts that maintenance teams can actually use',
            ],
          },
        ],
        callout: {
          label: 'Outcome',
          value: 'Cleaner inspections',
          note: 'The field process is set up to reduce late-stage electrical churn.',
        },
      },
    ],
  },
  {
    slug: 'plumbing',
    badge: 'PL',
    name: 'Plumbing',
    shortName: 'Plumbing',
    eyebrow: 'Water And Waste',
    accent: '#7dd3fc',
    summary:
      'Commercial plumbing scope delivered with strong attention to sequencing, coordination above ceiling, and fixture turnover that holds up after occupancy.',
    heroTitle:
      'Plumbing delivery that keeps rough-in, fixture work, and final turnover connected.',
    heroDescription:
      'Commercial plumbing work gets messy when rough-in, equipment coordination, and final trim are split into disconnected pushes. We manage it as one continuous delivery lane.',
    marketFocus:
      'Tenant improvements, restroom core upgrades, domestic water systems, sanitary and storm work, and equipment tie-ins.',
    metrics: [
      {
        label: 'Field profile',
        value: 'Coordination-dense',
        note: 'Above-ceiling and core-area conflicts are handled early.',
      },
      {
        label: 'Owner concern',
        value: 'Leak-free turnover',
        note: 'Testing and punch control stay visible to closeout.',
      },
      {
        label: 'Execution model',
        value: 'Area-based',
        note: 'Rough, trim, and startup are tracked by space and phase.',
      },
    ],
    serviceLines: [
      {
        title: 'Domestic water and sanitary',
        description:
          'Domestic water, sanitary, and vent systems coordinated for retrofit and tenant build-out conditions.',
        deliverables: [
          'Core and riser planning',
          'Pressure test coordination',
          'Fixture trim tracking',
        ],
      },
      {
        title: 'Restroom and breakroom packages',
        description:
          'High-visibility restroom and breakroom scopes with sequence control around finishes and occupancy deadlines.',
        deliverables: [
          'Fixture package control',
          'Wall and casework coordination',
          'Punch-free handoff planning',
        ],
      },
      {
        title: 'Equipment tie-ins',
        description:
          'Equipment support and special plumbing requirements aligned with mechanical, kitchen, and specialty vendors.',
        deliverables: [
          'Vendor coordination logs',
          'Point-of-connection reviews',
          'Startup assistance',
        ],
      },
      {
        title: 'Repair and replacement work',
        description:
          'Targeted plumbing replacements and repair programs managed around occupied buildings and service continuity.',
        deliverables: [
          'Isolation planning',
          'Outage scheduling',
          'Owner communication support',
        ],
      },
    ],
    differentiators: [
      'Plumbing work is sequenced by actual space turnover rather than broad drawing packages.',
      'Fixture and equipment coordination is treated as a major closeout risk, not an afterthought.',
      'Testing, trim, and owner signoff stay organized by area to reduce leak-driven rework.',
    ],
    sectors: [
      {
        name: 'Hospitality and workplace interiors',
        note: 'Visible finish quality and fast occupancy matter.',
      },
      {
        name: 'Healthcare support spaces',
        note: 'Service continuity and infection-control coordination matter.',
      },
      {
        name: 'Retail and food-support areas',
        note: 'Equipment tie-ins and vendor timing drive the work.',
      },
    ],
    integration: [
      'General contracting finish sequencing',
      'Mechanical equipment coordination',
      'Electrical support for specialty fixtures and controls',
    ],
    subpages: [
      {
        slug: 'water-and-waste',
        shortLabel: 'Water And Waste',
        title: 'Plumbing Water And Waste Systems',
        description:
          'How domestic water, waste, and vent systems are coordinated for retrofit and commercial tenant projects.',
        intro:
          'Water and waste scope becomes expensive when risers, wall framing, and finish trades are not aligned. This page outlines the controls that keep plumbing coordination tight.',
        sections: [
          {
            title: 'Riser and core coordination',
            copy: 'Risers and shared core areas are planned with structural, ceiling, and adjacent-trade constraints already in the conversation.',
            bullets: [
              'Validate riser routes before multi-trade rough-in begins',
              'Separate shared core sequencing from tenant interior sequencing',
              'Track sleeve and opening issues early to avoid cascading delay',
            ],
          },
          {
            title: 'Testing and activation',
            copy: 'Testing is scheduled as part of turnover planning so deficiencies show up while access still exists.',
            bullets: [
              'Build test plans around phase turnover dates',
              'Record deficiency ownership by area and system',
              'Tie activation signoff to punch control and owner training',
            ],
          },
        ],
        callout: {
          label: 'Delivery focus',
          value: 'Controlled activation',
          note: 'Testing and turnover are built into the plan rather than squeezed into the end.',
        },
      },
      {
        slug: 'fixture-and-equipment',
        shortLabel: 'Fixtures And Equipment',
        title: 'Plumbing Fixtures And Equipment',
        description:
          'Fixture packages, trim coordination, and equipment tie-ins for plumbing scope that has to finish cleanly.',
        intro:
          'Fixtures are where plumbing work becomes visible to owners. We treat that last phase as a controlled delivery package with procurement, finish coordination, and closeout built in.',
        sections: [
          {
            title: 'Fixture package control',
            copy: 'Fixture procurement, submittal status, and field readiness are tracked together so the install team does not arrive before the room is actually ready.',
            bullets: [
              'Match fixture release dates to finish readiness by room',
              'Coordinate specialty trim with casework and accessories',
              'Track long-lead substitutions before field impacts appear',
            ],
          },
          {
            title: 'Vendor and equipment interfaces',
            copy: 'Equipment tie-ins are validated against vendor requirements and field conditions before the final install push.',
            bullets: [
              'Confirm rough-in against approved vendor cutsheets',
              'Inspect utility readiness before startup visits',
              'Document final connection conditions for turnover',
            ],
          },
        ],
        callout: {
          label: 'Best fit',
          value: 'High-visibility finish work',
          note: 'Ideal where fixture quality and occupancy speed both matter.',
        },
      },
    ],
  },
  {
    slug: 'general-contracting',
    badge: 'GC',
    name: 'General Contracting',
    shortName: 'General Contracting',
    eyebrow: 'Project Delivery',
    accent: '#fda4af',
    summary:
      'General contracting and construction management focused on schedule control, site communication, and multi-trade integration from preconstruction through closeout.',
    heroTitle:
      'General contracting built around coordination discipline, not just schedule promises.',
    heroDescription:
      'We position general contracting as the operating system for the rest of the site: preconstruction clarity, site leadership, trade accountability, and closeout that protects occupancy dates.',
    marketFocus:
      'Commercial interiors, phased renovations, occupied-space improvements, and integrated multi-trade delivery.',
    metrics: [
      {
        label: 'Project mode',
        value: 'Multi-trade',
        note: 'Best suited to scope with active coordination pressure.',
      },
      {
        label: 'Control point',
        value: 'Schedule visibility',
        note: 'Look-aheads, issue logs, and owner updates stay current.',
      },
      {
        label: 'Closeout bias',
        value: 'Occupancy-ready',
        note: 'Final handoff is built to support real move-in dates.',
      },
    ],
    serviceLines: [
      {
        title: 'Preconstruction and budgeting',
        description:
          'Scope alignment, bid packaging, and constructability reviews that make downstream delivery easier instead of harder.',
        deliverables: [
          'Bid package planning',
          'Phasing strategy',
          'Constructability issue registers',
        ],
      },
      {
        title: 'Site and trade coordination',
        description:
          'Daily coordination of site logistics, look-aheads, quality checkpoints, and field issue management.',
        deliverables: [
          'Three-week look-aheads',
          'Field issue tracking',
          'Trade access control',
        ],
      },
      {
        title: 'Phased renovation management',
        description:
          'Renovation sequencing for occupied or partially occupied spaces with strict communication and turnover demands.',
        deliverables: [
          'Swing-space sequencing',
          'Owner notice planning',
          'Phase turnover checklists',
        ],
      },
      {
        title: 'Closeout and turnover',
        description:
          'Closeout programs that control punch, documentation, training, and owner acceptance before occupancy dates slip.',
        deliverables: [
          'Punch ownership logs',
          'Turnover package assembly',
          'Training and acceptance scheduling',
        ],
      },
    ],
    differentiators: [
      'General contracting is treated as the command layer for every other trade in the system.',
      'Field communication is organized to reduce surprise conditions and late schedule churn.',
      'Closeout is driven by occupancy readiness, not simply substantial completion language.',
    ],
    sectors: [
      {
        name: 'Corporate interiors',
        note: 'Tenant coordination and phased occupancy are central.',
      },
      {
        name: 'Healthcare and support spaces',
        note: 'Noise, dust, access, and communication controls are critical.',
      },
      {
        name: 'Commercial renovations',
        note: 'Schedule compression and site logistics drive outcomes.',
      },
    ],
    integration: [
      'Mechanical, electrical, plumbing, and HVAC trade orchestration',
      'Owner communication and occupancy control',
      'MSP and tech-service coordination for technology-enabled sites',
    ],
    subpages: [
      {
        slug: 'project-delivery',
        shortLabel: 'Project Delivery',
        title: 'General Contracting Project Delivery',
        description:
          'How preconstruction, field coordination, and turnover controls are used to keep commercial projects moving.',
        intro:
          'Project delivery gets stronger when the schedule, issues list, and field decision-making all point to the same source of truth. This page outlines that operating rhythm.',
        sections: [
          {
            title: 'Preconstruction alignment',
            copy: 'Front-end planning is focused on sequencing risk, owner constraints, and trade release logic so the field starts cleaner.',
            bullets: [
              'Surface constructability issues before procurement locks in',
              'Separate critical path scope from flexible scope in the schedule',
              'Align owner communication with actual phase changes',
            ],
          },
          {
            title: 'Field leadership cadence',
            copy: 'Daily site coordination is tied to look-aheads, unresolved issues, and area readiness instead of vague progress updates.',
            bullets: [
              'Use area-based readiness checks for turnover spaces',
              'Track blockers with named owners and due dates',
              'Keep punch growth visible before closeout becomes congested',
            ],
          },
        ],
        callout: {
          label: 'Project outcome',
          value: 'Fewer surprises',
          note: 'The system is built to expose friction early instead of absorbing it late.',
        },
      },
      {
        slug: 'site-logistics',
        shortLabel: 'Site Logistics',
        title: 'General Contracting Site Logistics',
        description:
          'Site access, phasing, owner coordination, and field controls for occupied commercial work.',
        intro:
          'Site logistics drive whether the best schedule actually works in the real building. Access, staging, notice windows, and trade overlap all need active control.',
        sections: [
          {
            title: 'Access and staging',
            copy: 'Staging plans are built around vertical transport, laydown limits, and building operations instead of assumed open space.',
            bullets: [
              'Reserve staging based on phase and trade density',
              'Sequence deliveries to reduce congestion at active entries',
              'Protect owner circulation and service routes',
            ],
          },
          {
            title: 'Occupied-space communication',
            copy: 'Owner and tenant communication runs in parallel with field execution so noise, shutdowns, and schedule transitions are expected rather than disruptive.',
            bullets: [
              'Publish notices tied to actual work windows',
              'Coordinate after-hours and high-impact work early',
              'Keep occupancy handoffs clear by floor, suite, or area',
            ],
          },
        ],
        callout: {
          label: 'Best fit',
          value: 'Occupied projects',
          note: 'Site logistics become a competitive advantage when spaces stay live.',
        },
      },
    ],
  },
  {
    slug: 'commercial-hvac',
    badge: 'HV',
    name: 'Commercial HVAC',
    shortName: 'Commercial HVAC',
    eyebrow: 'Climate Systems',
    accent: '#86efac',
    summary:
      'Commercial HVAC delivery for rooftop units, split systems, controls, testing, balancing, and service-minded turnover in active buildings.',
    heroTitle:
      'Commercial HVAC scope delivered with startup, controls, and occupant comfort in mind.',
    heroDescription:
      'Commercial HVAC work sits at the center of comfort, energy, and occupancy outcomes. We handle it as a lifecycle lane that covers replacement, controls, balancing, startup, and service continuity.',
    marketFocus:
      'RTU replacements, split-system upgrades, controls modernization, TAB coordination, and service continuity.',
    metrics: [
      {
        label: 'Primary risk',
        value: 'Startup drift',
        note: 'Controls, balancing, and readiness have to meet in the same window.',
      },
      {
        label: 'Owner priority',
        value: 'Comfort and uptime',
        note: 'Occupant experience matters as much as equipment replacement.',
      },
      {
        label: 'Handoff model',
        value: 'Service-ready',
        note: 'Documentation and settings support long-term operation.',
      },
    ],
    serviceLines: [
      {
        title: 'Rooftop and packaged equipment',
        description:
          'RTU and packaged-system replacements managed around crane plans, curb coordination, and startup timing.',
        deliverables: [
          'Equipment swap sequencing',
          'Startup readiness checks',
          'Punch and comfort follow-up',
        ],
      },
      {
        title: 'Controls modernization',
        description:
          'BAS and local controls work aligned with electrical and mechanical scope so systems become usable, not just installed.',
        deliverables: [
          'Point lists and sequences',
          'Control-device coordination',
          'Owner training support',
        ],
      },
      {
        title: 'TAB and commissioning support',
        description:
          'Testing, adjusting, balancing, and commissioning coordination tied to turnover dates and occupant expectations.',
        deliverables: [
          'Readiness checklists',
          'Deficiency resolution planning',
          'Final balancing turnover',
        ],
      },
      {
        title: 'Service and maintenance readiness',
        description:
          'HVAC projects packaged for easier long-term service with maintainable access and documented settings.',
        deliverables: [
          'Access and clearance review',
          'Filter and service planning',
          'Final setpoint documentation',
        ],
      },
    ],
    differentiators: [
      'HVAC work is planned around startup readiness, not just install completion.',
      'Comfort complaints and balancing drift are treated as project risks before occupancy.',
      'Controls, power, and mechanical coordination stay visible through the handoff.',
    ],
    sectors: [
      {
        name: 'Office and workplace',
        note: 'Comfort stability directly affects occupancy success.',
      },
      {
        name: 'Retail and hospitality',
        note: 'Customer experience and seasonal reliability are critical.',
      },
      {
        name: 'Industrial support areas',
        note: 'Equipment continuity and ventilation matter to operations.',
      },
    ],
    integration: [
      'Mechanical equipment and piping scope',
      'Electrical feeders and control interfaces',
      'MSP and tech-service remote monitoring opportunities',
    ],
    subpages: [
      {
        slug: 'climate-systems',
        shortLabel: 'Climate Systems',
        title: 'Commercial HVAC Climate Systems',
        description:
          'Replacement and modernization strategy for HVAC systems that need to protect comfort and uptime in commercial buildings.',
        intro:
          'Climate-system work is most effective when equipment replacement, controls, and startup are treated as one delivery stream instead of separate events.',
        sections: [
          {
            title: 'Replacement strategy',
            copy: 'Equipment replacements are organized around curb conditions, rigging windows, controls dependencies, and occupant-impact planning.',
            bullets: [
              'Confirm curb and fit conditions before crane day',
              'Align equipment swaps with power and controls readiness',
              'Plan temporary conditioning where occupancy risk is high',
            ],
          },
          {
            title: 'Startup and stabilization',
            copy: 'System startup is treated as a stabilization period with balancing, comfort follow-up, and issue ownership already assigned.',
            bullets: [
              'Run startup checklists before final owner walkthroughs',
              'Track comfort issues by zone after activation',
              'Close balancing and controls deficiencies before turnover',
            ],
          },
        ],
        callout: {
          label: 'Priority',
          value: 'Comfort continuity',
          note: 'Equipment work is planned to protect occupants, not just the schedule.',
        },
      },
      {
        slug: 'controls-and-balancing',
        shortLabel: 'Controls And Balancing',
        title: 'Commercial HVAC Controls And Balancing',
        description:
          'BAS coordination, point validation, balancing readiness, and turnover for commercial HVAC projects.',
        intro:
          'Controls and balancing determine whether a system actually performs the way the owner expects. We keep those workflows tied directly to install readiness and closeout.',
        sections: [
          {
            title: 'Control integration',
            copy: 'Control sequences, devices, and electrical support are reviewed against real field conditions before startup windows arrive.',
            bullets: [
              'Validate point lists against installed devices',
              'Coordinate low-voltage and electrical support before startup',
              'Document sequence changes during commissioning',
            ],
          },
          {
            title: 'Balancing readiness',
            copy: 'TAB work is scheduled only after systems are actually ready, which keeps reports useful and reduces repetitive return trips.',
            bullets: [
              'Verify filters, setpoints, and dampers before TAB begins',
              'Track unresolved access issues that block balancing',
              'Close owner-facing comfort concerns with documented settings',
            ],
          },
        ],
        callout: {
          label: 'Turnover result',
          value: 'Better stability',
          note: 'Controls and TAB are used to reduce post-occupancy noise and callbacks.',
        },
      },
    ],
  },
  {
    slug: 'auto-repair',
    badge: 'AR',
    name: 'Auto Repair',
    shortName: 'Auto Repair',
    eyebrow: 'Fleet And Service Bays',
    accent: '#fca5a5',
    summary:
      'Auto repair programs designed for commercial fleets, specialty service workflows, and repair operations that value consistency, diagnostics, and bay throughput.',
    heroTitle:
      'Auto repair positioned as an operational service lane, not a generic shop page.',
    heroDescription:
      'The automotive side of the site focuses on bay efficiency, diagnostics, scheduled maintenance, and transparent repair workflows for fleet and retail service scenarios.',
    marketFocus:
      'Commercial fleets, preventative maintenance programs, drivability diagnostics, and service-bay operations.',
    metrics: [
      {
        label: 'Primary model',
        value: 'Fleet-capable',
        note: 'Built for repeatable vehicle service rather than one-off chaos.',
      },
      {
        label: 'Service rhythm',
        value: 'Bay-throughput',
        note: 'Scheduling and parts flow stay visible to the customer.',
      },
      {
        label: 'Trust marker',
        value: 'Diagnostic clarity',
        note: 'Work is explained in serviceable, decision-ready terms.',
      },
    ],
    serviceLines: [
      {
        title: 'Preventative maintenance',
        description:
          'Recurring maintenance programs that reduce downtime and keep fleet units in service longer.',
        deliverables: [
          'Scheduled service intervals',
          'Inspection reporting',
          'Fleet service history tracking',
        ],
      },
      {
        title: 'Diagnostics and drivability',
        description:
          'Structured diagnostics for warning lights, drivability issues, and recurring faults that need deeper root-cause work.',
        deliverables: [
          'Scan and symptom documentation',
          'Repair path recommendations',
          'Post-repair verification',
        ],
      },
      {
        title: 'Brake, suspension, and steering',
        description:
          'Core mechanical service work with strong documentation around safety, wear conditions, and repair sequencing.',
        deliverables: [
          'Condition reporting',
          'Repair approvals',
          'Road-test confirmation',
        ],
      },
      {
        title: 'Fleet-ready service operations',
        description:
          'Bay scheduling and service communication that help fleet managers predict return-to-service timing.',
        deliverables: [
          'Service queue visibility',
          'Parts and labor tracking',
          'Return-to-service coordination',
        ],
      },
    ],
    differentiators: [
      'Auto repair content is tailored to maintenance programs, diagnostics, and fleet operations instead of generic service copy.',
      'Customer communication is built around decision-ready findings and clear turnaround expectations.',
      'Bay operations and service consistency are positioned as core strengths, not back-office details.',
    ],
    sectors: [
      {
        name: 'Commercial fleets',
        note: 'Downtime planning and maintenance rhythm are the priority.',
      },
      {
        name: 'Owner-operator businesses',
        note: 'Vehicle availability directly affects revenue continuity.',
      },
      {
        name: 'Retail service customers',
        note: 'Trust and explanation quality shape long-term retention.',
      },
    ],
    integration: [
      'MSP and tech-service workflow tooling',
      'General contracting support for bay or facility upgrades',
      'Electrical and mechanical support for equipment-heavy shops',
    ],
    subpages: [
      {
        slug: 'service-bays',
        shortLabel: 'Service Bays',
        title: 'Auto Repair Service Bay Operations',
        description:
          'Bay flow, scheduling, service communication, and repair controls for automotive operations that want consistency.',
        intro:
          'A strong service bay operation blends technician productivity, parts readiness, and customer communication. This page outlines the operational model behind that experience.',
        sections: [
          {
            title: 'Bay scheduling and flow',
            copy: 'Work is planned around diagnosis time, parts certainty, and bay availability so the service queue stays realistic.',
            bullets: [
              'Separate diagnostic slots from confirmed repair slots',
              'Track bay occupancy against parts readiness',
              'Use return-to-service targets instead of vague ETAs',
            ],
          },
          {
            title: 'Customer communication',
            copy: 'Repair status is translated into clear decision points for drivers, owners, and fleet managers.',
            bullets: [
              'Document symptoms, findings, and next steps in plain language',
              'Highlight safety-critical items separately from advisory work',
              'Confirm vehicle return timing before closing the repair order',
            ],
          },
        ],
        callout: {
          label: 'Best fit',
          value: 'Fleet and repeat service',
          note: 'The workflow is designed for consistency, not random intake chaos.',
        },
      },
      {
        slug: 'fleet-maintenance',
        shortLabel: 'Fleet Maintenance',
        title: 'Auto Repair Fleet Maintenance Programs',
        description:
          'Preventative maintenance, inspection reporting, and service planning for commercial and small-business fleets.',
        intro:
          'Fleet maintenance is about reliability and predictability. We treat it as an operating program with recurring intervals, inspection discipline, and vehicle availability in view.',
        sections: [
          {
            title: 'Maintenance rhythm',
            copy: 'Fleet service intervals are tied to usage, downtime tolerance, and vehicle criticality rather than one-size-fits-all schedules.',
            bullets: [
              'Set service windows around operating needs',
              'Use inspection data to stage future repairs before failure',
              'Group recurring maintenance work where practical',
            ],
          },
          {
            title: 'Reporting and planning',
            copy: 'Inspection reporting is structured so managers can prioritize safety, compliance, and return-to-service decisions quickly.',
            bullets: [
              'Document condition changes over time across fleet units',
              'Separate urgent safety work from near-term planning items',
              'Forecast repair clusters before they disrupt operations',
            ],
          },
        ],
        callout: {
          label: 'Service outcome',
          value: 'Reduced downtime',
          note: 'Programs are designed to stabilize fleet availability across the year.',
        },
      },
    ],
  },
  {
    slug: 'msp-tech-services',
    badge: 'IT',
    name: 'MSP And Tech Services',
    shortName: 'MSP / Tech',
    eyebrow: 'Technology Operations',
    accent: '#c4b5fd',
    summary:
      'Managed IT, cybersecurity, Microsoft 365, cloud, backup, and business technology services organized around ownership, evidence, and delivery.',
    heroTitle:
      'MSP and tech services built around support queues, security baselines, vendor handoffs, and project work that can be explained.',
    heroDescription:
      'The technology stack is organized around the things buyers actually need to understand: support ownership, Microsoft 365 governance, backup confidence, security evidence, and workflow support.',
    marketFocus:
      'Managed IT, cybersecurity, Microsoft 365, cloud, backup, automation, workflow support, and business systems modernization.',
    metrics: [
      {
        label: 'Service depth',
        value: '100+ modules',
        note: 'The existing catalog remains available inside the services hub.',
      },
      {
        label: 'Support profile',
        value: 'Managed ops',
        note: 'Recurring service, cleanup, modernization, and advisory work coexist.',
      },
      {
        label: 'Site role',
        value: 'Trade-integrated',
        note: 'Technology now sits alongside the physical delivery trades.',
      },
    ],
    serviceLines: [
      {
        title: 'Managed IT and support',
        description:
          'Service desk, endpoint management, vendor coordination, and recurring IT operations for growing organizations.',
        deliverables: [
          'Helpdesk and escalation',
          'Endpoint lifecycle and patching',
          'Operational reporting',
        ],
      },
      {
        title: 'Security and compliance',
        description:
          'Security operations, identity hardening, policy support, and compliance-oriented service delivery.',
        deliverables: [
          'Security baseline planning',
          'Identity and access improvements',
          'Incident readiness support',
        ],
      },
      {
        title: 'Cloud and platform modernization',
        description:
          'Cloud migrations, landing zones, CI/CD, infrastructure as code, and platform reliability improvements.',
        deliverables: [
          'Cloud roadmap planning',
          'Deployment automation',
          'Observability and governance',
        ],
      },
      {
        title: 'Automation and workflow systems',
        description:
          'Automation, practical AI enablement, portal support, and custom workflow systems that support the rest of the business.',
        deliverables: [
          'Automation workflows',
          'AI readiness and governance',
          'Workflow experience support',
        ],
      },
    ],
    differentiators: [
      'Support, security, Microsoft 365, cloud, backup, and workflow work stay connected to one buying path.',
      'MSP and tech services can connect directly to facilities, vendors, service operations, and the systems people use every day.',
      'The site keeps its interactive capabilities while grounding them in clearer service architecture.',
    ],
    sectors: [
      {
        name: 'Commercial operations',
        note: 'IT supports the day-to-day delivery engine of the business.',
      },
      {
        name: 'Service-heavy businesses',
        note: 'Support workflows, dispatch, and communication are critical.',
      },
      {
        name: 'Growth-stage organizations',
        note: 'Technology maturity has to rise without adding needless chaos.',
      },
    ],
    integration: [
      'Trade dispatch, workflow, and documentation systems',
      'Auto repair service operations and fleet tooling',
      'Facility modernization with physical and digital scope together',
    ],
    subpages: [
      {
        slug: 'managed-operations',
        shortLabel: 'Managed Operations',
        title: 'MSP Managed Operations',
        description:
          'Managed IT operations, support workflows, and recurring service delivery framed as a practical operating lane.',
        intro:
          'This page keeps the MSP foundation focused on repeatable operations: intake, monitoring, response, reporting, access cleanup, backup evidence, and vendor ownership.',
        sections: [
          {
            title: 'Operational service model',
            copy: 'Managed services are organized around intake, monitoring, response, and reporting so clients see a real operating cadence.',
            bullets: [
              'Define support channels and escalation ownership clearly',
              'Track endpoint, backup, and patch baselines continuously',
              'Translate recurring work into business-facing reporting',
            ],
          },
          {
            title: 'Business alignment',
            copy: 'Technology work is framed around staffing realities, vendor friction, and operational risk instead of purely technical deliverables.',
            bullets: [
              'Tie IT priorities to actual service bottlenecks',
              'Reduce vendor sprawl through managed coordination',
              'Keep modernization work visible inside the recurring service plan',
            ],
          },
        ],
        callout: {
          label: 'Positioning',
          value: 'Operations-first',
          note: 'Technology is presented as a real service trade with repeatable value.',
        },
      },
      {
        slug: 'support-and-security',
        shortLabel: 'Support And Security',
        title: 'MSP Support And Security',
        description:
          'Support delivery, cybersecurity posture, and modernization planning for the technology side of the site.',
        intro:
          'Support and security sit at the center of trust for technology clients. This page shows how those functions are packaged so clients understand both the daily service and the risk-reduction value.',
        sections: [
          {
            title: 'Support delivery',
            copy: 'Support is presented as an accountable service lane with intake discipline, response expectations, and clear routing.',
            bullets: [
              'Separate routine service from project escalation paths',
              'Keep recurring support visible through reporting and review cadence',
              'Design onsite and remote support around client realities',
            ],
          },
          {
            title: 'Security baseline',
            copy: 'Security improvements are integrated into managed operations so baseline hardening does not live in a separate disconnected program.',
            bullets: [
              'Roll identity, patching, and backup controls into recurring service',
              'Use readiness reviews to guide future security investments',
              'Treat compliance and risk language as client-facing communication',
            ],
          },
        ],
        callout: {
          label: 'Core strength',
          value: 'Visible trust',
          note: 'Clients can see how support and security actually connect.',
        },
      },
    ],
  },
];

export const tradePrograms: TradeProgram[] = [
  {
    slug: 'occupied-renovation-stack',
    title: 'Occupied Renovation Stack',
    description:
      'General contracting, MEP scope, and HVAC modernization coordinated for active buildings that cannot absorb sloppy shutdowns or unclear communication.',
    tradeSlugs: [
      'general-contracting',
      'mechanical',
      'electrical',
      'plumbing',
      'commercial-hvac',
    ],
    outputs: [
      'Phased turnover plans',
      'Shutdown and startup windows',
      'Owner-ready closeout packages',
    ],
  },
  {
    slug: 'service-operations-platform',
    title: 'Service Operations Platform',
    description:
      'MSP and tech services paired with physical-trade workflows so dispatch, documentation, and service reporting support the field instead of lagging behind it.',
    tradeSlugs: ['msp-tech-services', 'general-contracting', 'auto-repair'],
    outputs: [
      'Dispatch-aware workflows',
      'Trade documentation systems',
      'Reporting and visibility layers',
    ],
  },
  {
    slug: 'fleet-and-facility-continuity',
    title: 'Fleet And Facility Continuity',
    description:
      'Auto repair, HVAC, and facility trades aligned around uptime, preventative maintenance, and operational continuity for businesses with mobile and site-based assets.',
    tradeSlugs: ['auto-repair', 'commercial-hvac', 'mechanical'],
    outputs: [
      'Preventative maintenance cadence',
      'Service continuity planning',
      'Operational uptime support',
    ],
  },
];

export const tradeNavigation = tradeProfiles.map(trade => ({
  label: trade.shortName,
  href: withBasePath(`trades/${trade.slug}/`),
}));

export const totalTradeSubpages = tradeProfiles.reduce(
  (count, trade) => count + trade.subpages.length,
  0
);

export function getTradeBySlug(slug: string) {
  return tradeProfiles.find(trade => trade.slug === slug);
}

export function getTradeSubpage(tradeSlug: string, subpageSlug: string) {
  const trade = getTradeBySlug(tradeSlug);
  if (!trade) return undefined;
  return trade.subpages.find(subpage => subpage.slug === subpageSlug);
}
