export interface RadarSource {
  label: string;
  href: string;
  type: 'official' | 'industry' | 'reference';
}

export interface MarketSignal {
  title: string;
  buyerReality: string;
  siteMove: string;
  sources: RadarSource[];
}

export interface TechnologyRadarItem {
  title: string;
  status: 'Live in project' | 'Added this pass' | 'Evaluate next';
  fit: string;
  projectUse: string;
  sources: RadarSource[];
}

export interface ResourceRecommendation {
  name: string;
  status: 'Downloaded now' | 'Already present' | 'Evaluate next';
  whyItHelps: string;
  adoptionNote: string;
  sources: RadarSource[];
}

export interface CompetitiveProofPattern {
  pattern: string;
  whatBuyersExpect: string;
  proofRule: string;
  sources: RadarSource[];
}

export interface DesignQualityPrinciple {
  principle: string;
  whatMatureTeamsDo: string;
  siteApplication: string;
  sources: RadarSource[];
}

export const marketSignals2026: MarketSignal[] = [
  {
    title: 'Serious MSP pages lead with operating ownership.',
    buyerReality:
      'The strongest managed-service sites make help desk, escalation, vendor, security, and roadmap ownership easy to understand before they list tools.',
    siteMove:
      'Keep the brand centered on support ownership, security evidence, Microsoft 365 governance, backup proof, and next actions instead of generic "all your IT needs" language.',
    sources: [
      {
        label: 'NCSC managed service provider guidance',
        href: 'https://www.ncsc.gov.uk/collection/supply-chain-security/managed-service-providers',
        type: 'official',
      },
      {
        label: 'Facet managed IT services',
        href: 'https://facetmsp.com/services/managed-it-services/',
        type: 'industry',
      },
      {
        label: 'BEMO managed IT services',
        href: 'https://www.bemopro.com/cybersecurity/managed-it-services/',
        type: 'industry',
      },
    ],
  },
  {
    title: 'Security credibility starts with a visible baseline.',
    buyerReality:
      'Small and mid-sized organizations need identity, phishing resistance, endpoint protection, backups, incident contacts, and evidence habits before advanced tooling feels credible.',
    siteMove:
      'Tie cybersecurity claims to MFA, least privilege, restore testing, response roles, and control evidence that leadership can review.',
    sources: [
      {
        label: 'CISA small business cyber guidance',
        href: 'https://www.cisa.gov/resources-tools/resources/cyber-guidance-small-businesses',
        type: 'official',
      },
      {
        label: 'NIST Cybersecurity Framework 2.0',
        href: 'https://www.nist.gov/cyberframework',
        type: 'official',
      },
      {
        label: 'FTC cyber basics for small business',
        href: 'https://www.ftc.gov/business-guidance/small-businesses/cybersecurity',
        type: 'official',
      },
    ],
  },
  {
    title: 'Microsoft 365 is now a governance and AI readiness surface.',
    buyerReality:
      'Copilot, Teams, SharePoint, OneDrive, Entra ID, retention, external sharing, and data protection are connected decisions, not separate admin chores.',
    siteMove:
      'Frame Microsoft 365 work as access, data, collaboration, license, backup, and AI-readiness governance for practical business use.',
    sources: [
      {
        label: 'Microsoft Zero Trust guidance',
        href: 'https://learn.microsoft.com/security/zero-trust/',
        type: 'official',
      },
      {
        label: 'Microsoft 365 Copilot setup guide',
        href: 'https://learn.microsoft.com/microsoft-365-copilot/microsoft-365-copilot-setup',
        type: 'official',
      },
    ],
  },
  {
    title:
      'Performance, accessibility, and shareable review states are trust signals.',
    buyerReality:
      'High-quality technology sites increasingly prove competence through fast loading, stable interaction, keyboard access, reduced motion support, and links that reopen exact review states.',
    siteMove:
      'Keep static-first pages, route-contained rich media, Playwright coverage, Core Web Vitals awareness, and shareable planning states as product proof.',
    sources: [
      {
        label: 'Google Core Web Vitals',
        href: 'https://web.dev/articles/vitals',
        type: 'official',
      },
      {
        label: 'MDN View Transition API',
        href: 'https://developer.mozilla.org/docs/Web/API/View_Transition_API',
        type: 'reference',
      },
      {
        label: 'Web Platform Baseline',
        href: 'https://web.dev/baseline',
        type: 'reference',
      },
    ],
  },
];

export const competitiveProofPatterns2026: CompetitiveProofPattern[] = [
  {
    pattern: 'Proof badges and partner signals',
    whatBuyersExpect:
      'Mature MSP websites often show partner status, awards, platform certifications, compliance partners, retention signals, and support proof near service decisions.',
    proofRule:
      'Publish only verified credentials. Where credentials are not available yet, use transparent operating proof: onboarding outputs, security baselines, restore evidence, and QA gates.',
    sources: [
      {
        label: 'BEMO proof and partner signals',
        href: 'https://www.bemopro.com/',
        type: 'industry',
      },
      {
        label: 'Bulletproof recognition and managed security positioning',
        href: 'https://bulletproofsi.com/',
        type: 'industry',
      },
    ],
  },
  {
    pattern: 'Measurable service promises',
    whatBuyersExpect:
      'High-converting providers translate service into response expectations, uptime language, SOC coverage, implementation cadence, or monthly/quarterly review rhythm.',
    proofRule:
      'Keep service promises scoped as targets, cadence, and buyer-visible outputs unless contractual SLAs are finalized.',
    sources: [
      {
        label: 'Teleon managed IT and cybersecurity metrics',
        href: 'https://www.teleon.org/',
        type: 'industry',
      },
      {
        label: 'Fluid IT retention and advisor positioning',
        href: 'https://www.fluiditservices.com/',
        type: 'industry',
      },
    ],
  },
  {
    pattern: 'Technology stack clarity',
    whatBuyersExpect:
      'Buyers want to know whether the provider can own Microsoft 365, identity, endpoint, cloud, backup, network, compliance tooling, and security monitoring as connected work.',
    proofRule:
      'Show the service stack as ownership areas and decision outputs, not a logo wall or vendor list without context.',
    sources: [
      {
        label: 'Microsoft Zero Trust guidance',
        href: 'https://learn.microsoft.com/security/zero-trust/',
        type: 'official',
      },
      {
        label: 'Microsoft 365 Copilot setup guide',
        href: 'https://learn.microsoft.com/microsoft-365-copilot/microsoft-365-copilot-setup',
        type: 'official',
      },
      {
        label: 'Managed Solution Microsoft services positioning',
        href: 'https://www.managedsolution.com/',
        type: 'industry',
      },
    ],
  },
  {
    pattern: 'Vertical and compliance fit',
    whatBuyersExpect:
      'Credible sites state who they fit best, where they work, which compliance pressures they understand, and when a buyer should start with an assessment.',
    proofRule:
      'Keep Chicago-area fit specific: healthcare groups, professional services, light manufacturing, multi-site offices, and Microsoft-heavy teams.',
    sources: [
      {
        label: 'CISA small business cyber guidance',
        href: 'https://www.cisa.gov/resources-tools/resources/cyber-guidance-small-businesses',
        type: 'official',
      },
      {
        label: 'NIST Cybersecurity Framework 2.0',
        href: 'https://www.nist.gov/cyberframework',
        type: 'official',
      },
      {
        label: 'NetSafe managed IT positioning',
        href: 'https://netsafesolutions.com/',
        type: 'industry',
      },
    ],
  },
];

export const designQualityPrinciples2026: DesignQualityPrinciple[] = [
  {
    principle: 'Accessible polish as a default, not an afterthought',
    whatMatureTeamsDo:
      'The best design systems make contrast, keyboard behavior, reduced motion, target size, and assistive-technology feedback part of the component contract.',
    siteApplication:
      'Keep public pages calm on mobile, preserve visible focus states, test important flows with Playwright, and treat accessibility as delivery quality rather than compliance decoration.',
    sources: [
      {
        label: 'Apple accessibility guidance',
        href: 'https://developer.apple.com/design/human-interface-guidelines/accessibility',
        type: 'official',
      },
      {
        label: 'IBM Carbon accessibility',
        href: 'https://carbondesignsystem.com/guidelines/accessibility/overview/',
        type: 'official',
      },
      {
        label: 'W3C WCAG 2.2',
        href: 'https://www.w3.org/TR/WCAG22/',
        type: 'official',
      },
    ],
  },
  {
    principle: 'Workflow-first interface density',
    whatMatureTeamsDo:
      'Operational products avoid decorative clutter and make repeated work faster through clear hierarchy, progressive disclosure, predictable controls, and state that stays shareable.',
    siteApplication:
      'Design MSP surfaces like working tools: short routes to service fit, pricing, proof, contact, and planning states that leadership can reopen without re-explaining context.',
    sources: [
      {
        label: 'Shopify Polaris design principles',
        href: 'https://polaris-react.shopify.com/design',
        type: 'official',
      },
      {
        label: 'Material Design',
        href: 'https://m3.material.io/',
        type: 'official',
      },
    ],
  },
  {
    principle: 'Enterprise systems are documented visually',
    whatMatureTeamsDo:
      'Strong B2B sites show how decisions, services, risks, and evidence connect. They use structured cards, comparison tables, diagrams, and source-backed copy instead of vague feature pages.',
    siteApplication:
      'Keep building reusable data-backed panels: service catalog, buyer routes, proof sections, research radar, and search index entries that all describe the same operating model.',
    sources: [
      {
        label: 'IBM Carbon data visualization',
        href: 'https://carbondesignsystem.com/data-visualization/introduction/',
        type: 'official',
      },
      {
        label: 'Nielsen Norman Group B2B UX',
        href: 'https://www.nngroup.com/articles/b2b-website-usability/',
        type: 'reference',
      },
    ],
  },
  {
    principle: 'Performance budgets are part of the brand',
    whatMatureTeamsDo:
      'Modern technology brands prove competence by shipping fast, stable, inspectable pages with repeatable quality budgets rather than relying on heavy effects to signal sophistication.',
    siteApplication:
      'Use static Astro pages, route-contained rich interactions, Lighthouse CI reports, and conservative JavaScript hydration as visible proof of disciplined engineering.',
    sources: [
      {
        label: 'Core Web Vitals',
        href: 'https://web.dev/articles/vitals',
        type: 'official',
      },
      {
        label: 'Lighthouse CI',
        href: 'https://github.com/GoogleChrome/lighthouse-ci',
        type: 'official',
      },
    ],
  },
];

export const technologyRadar2026: TechnologyRadarItem[] = [
  {
    title: 'Astro static delivery with template checking',
    status: 'Added this pass',
    fit: 'Excellent fit for a GitHub Pages marketing site with selective Preact islands.',
    projectUse:
      'Keep pages static by default, add Astro template diagnostics, and hydrate only the interactions that justify client JavaScript.',
    sources: [
      {
        label: 'Astro check docs',
        href: 'https://docs.astro.build/en/reference/cli-reference/#astro-check',
        type: 'official',
      },
      {
        label: 'Astro islands architecture',
        href: 'https://docs.astro.build/en/concepts/islands/',
        type: 'official',
      },
    ],
  },
  {
    title: 'Core Web Vitals and INP-minded UI',
    status: 'Live in project',
    fit: 'Important for trust, search quality, and buyer confidence on mobile connections.',
    projectUse:
      'Protect calm mobile hierarchy, stable dimensions, route-contained rich interactions, and low-jank interactive controls.',
    sources: [
      {
        label: 'Google INP guidance',
        href: 'https://web.dev/articles/inp',
        type: 'official',
      },
    ],
  },
  {
    title: 'Playwright plus axe accessibility checks',
    status: 'Live in project',
    fit: 'A practical way to keep marketing routes, redirects, search, and keyboard-visible flows honest.',
    projectUse:
      'Expand buyer-journey coverage around contact, pricing, service anchors, legacy redirects, trust proof, and planning states.',
    sources: [
      {
        label: 'Playwright documentation',
        href: 'https://playwright.dev/docs/intro',
        type: 'official',
      },
      {
        label: 'axe-core Playwright package',
        href: 'https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright',
        type: 'official',
      },
    ],
  },
  {
    title: 'View transitions and Baseline platform features',
    status: 'Evaluate next',
    fit: 'Useful when transitions improve orientation without turning the site into an animation showcase.',
    projectUse:
      'Apply only to route changes or state changes where the buyer benefits from continuity, with reduced-motion behavior preserved.',
    sources: [
      {
        label: 'Chrome view transitions guide',
        href: 'https://developer.chrome.com/docs/web-platform/view-transitions',
        type: 'reference',
      },
      {
        label: 'Web Platform Baseline',
        href: 'https://web.dev/baseline',
        type: 'reference',
      },
    ],
  },
  {
    title: 'AI-ready content governance',
    status: 'Evaluate next',
    fit: 'Relevant for future resource centers, proposal workflows, and Microsoft 365 governance offers.',
    projectUse:
      'Add structured source notes, service taxonomy, and controlled intake language before layering generative workflows into customer-facing content.',
    sources: [
      {
        label: 'Microsoft Responsible AI standard',
        href: 'https://www.microsoft.com/ai/responsible-ai',
        type: 'official',
      },
      {
        label: 'Microsoft 365 Copilot setup guide',
        href: 'https://learn.microsoft.com/microsoft-365-copilot/microsoft-365-copilot-setup',
        type: 'official',
      },
    ],
  },
];

export const resourceRecommendations2026: ResourceRecommendation[] = [
  {
    name: '@astrojs/check',
    status: 'Downloaded now',
    whyItHelps:
      'Adds Astro-aware diagnostics that catch template and content typing issues regular TypeScript checks can miss.',
    adoptionNote:
      'Added as a dev dependency and exposed as a dedicated quality script so the team can graduate it into verify gates after existing template debt stays clean.',
    sources: [
      {
        label: 'Astro check docs',
        href: 'https://docs.astro.build/en/reference/cli-reference/#astro-check',
        type: 'official',
      },
    ],
  },
  {
    name: 'Lighthouse CI',
    status: 'Downloaded now',
    whyItHelps:
      'Turns performance, accessibility, best-practice, and SEO budgets into repeatable CI evidence instead of one-off audits.',
    adoptionNote:
      'Added as a local report script with conservative warning budgets for key buyer routes. Tighten thresholds after collecting stable baseline data.',
    sources: [
      {
        label: 'Lighthouse CI docs',
        href: 'https://github.com/GoogleChrome/lighthouse-ci',
        type: 'official',
      },
    ],
  },
  {
    name: 'Biome or Oxlint',
    status: 'Evaluate next',
    whyItHelps:
      'Could speed local feedback on large JavaScript and TypeScript surfaces if ESLint runtime becomes a bottleneck.',
    adoptionNote:
      'Do not replace the current ESLint rules until parity is tested against Astro, Tailwind, and project-specific conventions.',
    sources: [
      {
        label: 'Biome documentation',
        href: 'https://biomejs.dev/',
        type: 'official',
      },
      {
        label: 'Oxlint documentation',
        href: 'https://oxc.rs/docs/guide/usage/linter',
        type: 'official',
      },
    ],
  },
];
