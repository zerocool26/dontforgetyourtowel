export interface TradeSetupGroup {
  title: string;
  items: string[];
}

export interface TradeOperationProfile {
  slug: string;
  operatingModel: string;
  serviceRhythm: string;
  projectWindow: string;
  setupGroups: TradeSetupGroup[];
  ownerOutputs: string[];
  standards: string[];
}

export interface TradeSubpageOperationProfile {
  key: string;
  requiredInputs: string[];
  fieldChecklist: string[];
  ownerDeliverables: string[];
}

export const tradeOperations: Record<string, TradeOperationProfile> = {
  mechanical: {
    slug: 'mechanical',
    operatingModel: 'Retrofit and equipment replacement',
    serviceRhythm: 'Shutdown-sensitive phased installs',
    projectWindow: 'Quoted around access, rigging, and startup timing',
    setupGroups: [
      {
        title: 'Preconstruction inputs',
        items: [
          'Equipment schedules and nameplate verification',
          'Access routes, crane conditions, and roof loading checks',
          'Shutdown calendar tied to occupancy and operations',
        ],
      },
      {
        title: 'Field setup',
        items: [
          'Lift plan, staging zones, and protection paths',
          'Tie-in sequencing for hydronic and air-side systems',
          'Temporary conditioning strategy where required',
        ],
      },
      {
        title: 'Core scope',
        items: [
          'RTUs, split systems, pumps, piping, and mechanical rooms',
          'Prefabricated assemblies where field repetition makes sense',
          'Control-point coordination before startup windows open',
        ],
      },
      {
        title: 'Closeout package',
        items: [
          'Startup reports, equipment verification, and punch logs',
          'O&M turnover with asset tags and warranty tracking',
          'Commissioning support and owner handoff notes',
        ],
      },
    ],
    ownerOutputs: [
      'Equipment roster with final installed conditions',
      'Startup and issue-resolution log',
      'Turnover binder with O&M and warranty references',
    ],
    standards: [
      'Access and shutdown planning',
      'Maintainable clearances at equipment',
      'Documentation that survives turnover',
    ],
  },
  electrical: {
    slug: 'electrical',
    operatingModel: 'Power distribution and controls delivery',
    serviceRhythm: 'Outage and inspection led execution',
    projectWindow: 'Released around feeder, panel, and energization milestones',
    setupGroups: [
      {
        title: 'Preconstruction inputs',
        items: [
          'One-lines, panel schedules, and equipment loads',
          'Outage windows approved by facility operations',
          'Permit and inspection path confirmed early',
        ],
      },
      {
        title: 'Field setup',
        items: [
          'Lockout and temporary power planning',
          'Ceiling-closure map for rough-in completion',
          'Device elevations and specialty-equipment coordination',
        ],
      },
      {
        title: 'Core scope',
        items: [
          'Service work, feeders, branch circuits, lighting, and controls',
          'Low-voltage support where BAS and equipment interfaces matter',
          'Testing and labeling held to final field conditions',
        ],
      },
      {
        title: 'Closeout package',
        items: [
          'Panel directories and device labeling',
          'Testing records and deficiency closeout log',
          'As-builts aligned with final energization state',
        ],
      },
    ],
    ownerOutputs: [
      'Final panel and feeder labeling set',
      'Inspection and energization completion record',
      'Updated as-built markups for maintenance teams',
    ],
    standards: [
      'Safe outage planning',
      'Inspection-ready finish quality',
      'Clean power and controls handoff',
    ],
  },
  plumbing: {
    slug: 'plumbing',
    operatingModel: 'Commercial rough-in, fixture, and tie-in delivery',
    serviceRhythm: 'Area-based rough, trim, and test sequencing',
    projectWindow: 'Built around outages, fixture release, and finish turnover',
    setupGroups: [
      {
        title: 'Preconstruction inputs',
        items: [
          'Riser information, fixture schedules, and point-of-connection review',
          'Core-area access and sleeve/opening coordination',
          'Outage windows for domestic water or sanitary impacts',
        ],
      },
      {
        title: 'Field setup',
        items: [
          'Wall and ceiling closure checkpoints by area',
          'Fixture storage, protection, and release control',
          'Pressure-testing and leak-response plan',
        ],
      },
      {
        title: 'Core scope',
        items: [
          'Domestic water, sanitary, vent, storm, and equipment tie-ins',
          'Restroom, breakroom, and high-visibility finish spaces',
          'Vendor coordination where specialty fixtures or equipment apply',
        ],
      },
      {
        title: 'Closeout package',
        items: [
          'Testing logs and punch-close reports by area',
          'Final fixture verification list',
          'Owner turnover notes for access panels and shutoffs',
        ],
      },
    ],
    ownerOutputs: [
      'Fixture and equipment connection verification',
      'Pressure and leak-test record',
      'Area-by-area turnover list',
    ],
    standards: [
      'Leak-free activation',
      'Finish protection through trim-out',
      'Clear shutoff and access documentation',
    ],
  },
  'general-contracting': {
    slug: 'general-contracting',
    operatingModel: 'Phased project delivery and field coordination',
    serviceRhythm: 'Look-ahead and occupancy led execution',
    projectWindow:
      'Built around permits, long-lead procurement, and turnover dates',
    setupGroups: [
      {
        title: 'Preconstruction inputs',
        items: [
          'Permit set, owner goals, and milestone schedule',
          'Long-lead tracker for finish and specialty packages',
          'Risk register for occupied or phased work',
        ],
      },
      {
        title: 'Field setup',
        items: [
          'Site logistics map with storage and circulation rules',
          'Daily reporting cadence and superintendent controls',
          'Trade sequencing with area release ownership',
        ],
      },
      {
        title: 'Core scope',
        items: [
          'Demolition, framing, finishes, procurement, and schedule management',
          'Subcontractor alignment across MEP and specialty scope',
          'Owner communication during active construction',
        ],
      },
      {
        title: 'Closeout package',
        items: [
          'Punch management by space and responsibility',
          'Turnover dates tied to usable owner conditions',
          'Warranty, attic-stock, and final closeout record',
        ],
      },
    ],
    ownerOutputs: [
      'Weekly look-ahead and milestone variance log',
      'Punch and closeout matrix',
      'Final owner-turnover package by area',
    ],
    standards: [
      'Phasing clarity',
      'Tight field communication',
      'Owner-ready turnover, not just substantial completion',
    ],
  },
  'commercial-hvac': {
    slug: 'commercial-hvac',
    operatingModel: 'Climate-system replacement and stabilization',
    serviceRhythm: 'Comfort continuity and controls-led commissioning',
    projectWindow: 'Planned around crane picks, controls readiness, and TAB',
    setupGroups: [
      {
        title: 'Preconstruction inputs',
        items: [
          'Existing equipment inventory and load profile',
          'Controls points list and electrical support review',
          'Curb, rigging, and roof-access confirmation',
        ],
      },
      {
        title: 'Field setup',
        items: [
          'Temporary cooling or heating plan where occupancy requires it',
          'Startup calendar shared with controls and balancing teams',
          'Zone-by-zone issue tracking for post-activation follow-up',
        ],
      },
      {
        title: 'Core scope',
        items: [
          'RTU and split-system replacements, controls, and air distribution updates',
          'BAS coordination and point validation before startup',
          'TAB readiness review before reports are issued',
        ],
      },
      {
        title: 'Closeout package',
        items: [
          'Startup and controls verification record',
          'Balancing closeout and comfort issue log',
          'Owner settings summary and maintenance notes',
        ],
      },
    ],
    ownerOutputs: [
      'Startup and controls validation file',
      'TAB and comfort-stabilization summary',
      'Final equipment and filter maintenance notes',
    ],
    standards: [
      'Comfort continuity during replacement',
      'Controls and startup aligned before turnover',
      'Stable operation after occupancy',
    ],
  },
  'auto-repair': {
    slug: 'auto-repair',
    operatingModel: 'Fleet and repeat-service bay operations',
    serviceRhythm: 'Diagnosis, approval, repair, and return-to-service flow',
    projectWindow:
      'Scheduled around bay capacity, parts availability, and fleet priority',
    setupGroups: [
      {
        title: 'Intake inputs',
        items: [
          'Vehicle ID, history, and current operating concern',
          'Fleet priority, downtime tolerance, and service interval data',
          'Approval path for diagnostics, labor, and parts',
        ],
      },
      {
        title: 'Bay setup',
        items: [
          'Bay assignment based on repair type and lift availability',
          'Parts staging and expected completion target',
          'Road-test or post-repair verification requirement',
        ],
      },
      {
        title: 'Core scope',
        items: [
          'Diagnostics, preventative maintenance, brakes, suspension, and drivability work',
          'Fleet-ready scheduling and recurring inspection rhythm',
          'Decision-ready findings instead of vague service notes',
        ],
      },
      {
        title: 'Closeout package',
        items: [
          'Repair-order summary with completed work and next-step recommendations',
          'Return-to-service confirmation',
          'Service history update for recurring fleet units',
        ],
      },
    ],
    ownerOutputs: [
      'Repair-order summary with findings and approvals',
      'Vehicle return target and verification note',
      'Inspection and future-service recommendations',
    ],
    standards: [
      'Clear diagnostics before parts spend',
      'Reliable bay-throughput communication',
      'Consistent service history tracking',
    ],
  },
  'msp-tech-services': {
    slug: 'msp-tech-services',
    operatingModel: 'Managed operations, security, and platform support',
    serviceRhythm: 'Onboarding, monitoring, response, and review cadence',
    projectWindow:
      'Built around environment discovery, change windows, and managed support SLA',
    setupGroups: [
      {
        title: 'Discovery inputs',
        items: [
          'User, device, and vendor inventory',
          'Current backup, identity, and security baseline',
          'Business-critical apps, sites, and support hours',
        ],
      },
      {
        title: 'Service setup',
        items: [
          'Admin access transfer and credential custody',
          'Monitoring, ticketing, backup, and patching enrollment',
          'Escalation paths for users, vendors, and after-hours issues',
        ],
      },
      {
        title: 'Core scope',
        items: [
          'Managed IT, cloud support, security hardening, and automation work',
          'Project delivery for infrastructure, ecommerce, and AI systems',
          'Documentation that connects support activity to business operations',
        ],
      },
      {
        title: 'Closeout package',
        items: [
          'Admin map, SOP record, and recurring support plan',
          'Security and backup baseline confirmation',
          'Roadmap items for future modernization',
        ],
      },
    ],
    ownerOutputs: [
      'Environment inventory and admin ownership map',
      'Managed-service reporting baseline',
      'Security and continuity action list',
    ],
    standards: [
      'Visible support routing',
      'Security built into recurring operations',
      'Documentation usable by internal teams and vendors',
    ],
  },
};

export const tradeSubpageOperations: Record<
  string,
  TradeSubpageOperationProfile
> = {
  'mechanical/retrofit-delivery': {
    key: 'mechanical/retrofit-delivery',
    requiredInputs: [
      'Existing equipment dimensions and replacement path',
      'Shutdown calendar with owner approval',
      'Access and rigging constraints by area',
    ],
    fieldChecklist: [
      'Confirm field measurements before fabrication release',
      'Stage demo, install, and startup in separate work packages',
      'Verify trade access and weather impacts before crane or roof work',
    ],
    ownerDeliverables: [
      'Replacement phasing log',
      'Startup and punch closeout record',
      'Updated equipment roster for operations',
    ],
  },
  'mechanical/fabrication-planning': {
    key: 'mechanical/fabrication-planning',
    requiredInputs: [
      'Coordinated layout and dimension control',
      'Prefab candidates separated from field-measured assemblies',
      'Install sequence by room, zone, or floor',
    ],
    fieldChecklist: [
      'Release only assemblies tied to actual install readiness',
      'Tag prefab pieces to area and sequence',
      'Close redlines back into as-built workflow quickly',
    ],
    ownerDeliverables: [
      'Prefab release register',
      'Deviation log for field conditions',
      'Updated install and as-built record',
    ],
  },
  'electrical/power-and-controls': {
    key: 'electrical/power-and-controls',
    requiredInputs: [
      'One-line, feeder plan, and panel schedule',
      'Control dependencies and device list',
      'Outage sequence with approval path',
    ],
    fieldChecklist: [
      'Separate temporary power from final energization',
      'Track panel readiness before finish closeout',
      'Validate control wiring before startup appointments',
    ],
    ownerDeliverables: [
      'Energization log',
      'Panel and control-point verification list',
      'Inspection-ready deficiency closeout',
    ],
  },
  'electrical/field-installation': {
    key: 'electrical/field-installation',
    requiredInputs: [
      'Area-by-area rough-in release',
      'Device elevations and specialty-equipment needs',
      'Ceiling closure and finish schedule',
    ],
    fieldChecklist: [
      'Rough-in complete before finish lock-in',
      'Label final devices to installed conditions',
      'Keep punch ownership separated by area',
    ],
    ownerDeliverables: [
      'Final device and panel labeling set',
      'Finish-punch log',
      'As-built markup handoff',
    ],
  },
  'plumbing/water-and-waste': {
    key: 'plumbing/water-and-waste',
    requiredInputs: [
      'Riser and branch routing confirmation',
      'Fixture and equipment connection schedule',
      'Outage or isolation windows for active spaces',
    ],
    fieldChecklist: [
      'Verify openings and sleeves before rough proceeds',
      'Hold test sequence before area close-in',
      'Protect finish-ready fixture zones from leak-risk work',
    ],
    ownerDeliverables: [
      'Pressure and leak-test record',
      'Connection verification list',
      'Updated shutoff and access notes',
    ],
  },
  'plumbing/fixture-and-equipment': {
    key: 'plumbing/fixture-and-equipment',
    requiredInputs: [
      'Final fixture schedule and approved submittals',
      'Casework, wall finish, and equipment coordination',
      'Vendor requirements for specialty connections',
    ],
    fieldChecklist: [
      'Release fixtures only into ready areas',
      'Verify trim alignment against final finishes',
      'Document equipment-specific connection issues early',
    ],
    ownerDeliverables: [
      'Fixture completion checklist',
      'Equipment tie-in verification',
      'Finish-area punch record',
    ],
  },
  'general-contracting/project-delivery': {
    key: 'general-contracting/project-delivery',
    requiredInputs: [
      'Permit path, owner priorities, and milestone dates',
      'Long-lead package tracker',
      'Trade coordination plan by phase',
    ],
    fieldChecklist: [
      'Maintain weekly look-aheads with constraint tracking',
      'Tie trade release to usable work fronts',
      'Separate owner turnover from internal substantial-completion language',
    ],
    ownerDeliverables: [
      'Milestone variance log',
      'Area turnover matrix',
      'Closeout and warranty tracker',
    ],
  },
  'general-contracting/site-logistics': {
    key: 'general-contracting/site-logistics',
    requiredInputs: [
      'Site access rules and circulation constraints',
      'Storage, dumpster, and protection plan',
      'Occupied-building communication requirements',
    ],
    fieldChecklist: [
      'Hold staging zones clear and enforced',
      'Sequence noisy or invasive work around operations',
      'Update housekeeping and protection status daily',
    ],
    ownerDeliverables: [
      'Logistics and access plan',
      'Daily coordination record',
      'Protection and housekeeping closeout note',
    ],
  },
  'commercial-hvac/climate-systems': {
    key: 'commercial-hvac/climate-systems',
    requiredInputs: [
      'Equipment roster and load assumptions',
      'Roof access, curb, and rigging confirmation',
      'Temporary comfort requirements by zone',
    ],
    fieldChecklist: [
      'Confirm fit and support before replacement day',
      'Align electrical and controls readiness before startup',
      'Track comfort impacts after activation',
    ],
    ownerDeliverables: [
      'Replacement and startup record',
      'Comfort-stabilization log',
      'Final maintenance notes',
    ],
  },
  'commercial-hvac/controls-and-balancing': {
    key: 'commercial-hvac/controls-and-balancing',
    requiredInputs: [
      'Point list, sequences, and controls scope',
      'TAB readiness list',
      'Electrical support and network/device dependencies',
    ],
    fieldChecklist: [
      'Validate installed devices against sequences',
      'Do not start TAB before system readiness is confirmed',
      'Close control changes back into final documents',
    ],
    ownerDeliverables: [
      'Controls validation record',
      'TAB closeout summary',
      'Final settings and stabilization notes',
    ],
  },
  'auto-repair/service-bays': {
    key: 'auto-repair/service-bays',
    requiredInputs: [
      'Vehicle concern, driver notes, and service history',
      'Bay availability and technician assignment',
      'Parts approval path and completion priority',
    ],
    fieldChecklist: [
      'Separate diagnostic work from confirmed repairs',
      'Stage parts before bay lock-in where possible',
      'Confirm road-test or QC verification before release',
    ],
    ownerDeliverables: [
      'Repair-order summary',
      'Return-to-service confirmation',
      'Recommended next-step service list',
    ],
  },
  'auto-repair/fleet-maintenance': {
    key: 'auto-repair/fleet-maintenance',
    requiredInputs: [
      'Fleet list with mileage or usage pattern',
      'Priority vehicles and downtime tolerance',
      'Recurring inspection intervals',
    ],
    fieldChecklist: [
      'Group work by service interval where it reduces downtime',
      'Separate urgent repairs from future planning items',
      'Update service history immediately after release',
    ],
    ownerDeliverables: [
      'Fleet inspection report',
      'Planned maintenance queue',
      'Vehicle-by-vehicle service history update',
    ],
  },
  'msp-tech-services/managed-operations': {
    key: 'msp-tech-services/managed-operations',
    requiredInputs: [
      'User and endpoint inventory',
      'Vendor list and admin-access handoff',
      'Current support channels and business hours',
    ],
    fieldChecklist: [
      'Enroll devices into monitoring, backup, and patching',
      'Set escalation ownership before go-live',
      'Confirm documentation route for recurring changes',
    ],
    ownerDeliverables: [
      'Support routing map',
      'Managed-operations baseline report',
      'Admin and SOP record',
    ],
  },
  'msp-tech-services/support-and-security': {
    key: 'msp-tech-services/support-and-security',
    requiredInputs: [
      'Identity, backup, and security-baseline review',
      'Critical apps and user-risk profile',
      'Compliance or vendor security requirements if present',
    ],
    fieldChecklist: [
      'Confirm MFA, backups, and patch baselines',
      'Separate incident response from routine support',
      'Document risk items into a visible roadmap',
    ],
    ownerDeliverables: [
      'Security baseline checklist',
      'Support and escalation plan',
      'Roadmap of follow-on hardening work',
    ],
  },
};

export function getTradeOperations(slug: string) {
  return tradeOperations[slug] ?? tradeOperations['msp-tech-services'];
}

export function getTradeSubpageOperations(
  tradeSlug: string,
  subpageSlug: string
) {
  return tradeSubpageOperations[`${tradeSlug}/${subpageSlug}`];
}
