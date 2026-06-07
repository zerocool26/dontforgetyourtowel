export type SiteLink = {
  label: string;
  href: string;
  description?: string;
};

export type FooterSignal = {
  label: string;
  value: string;
  detail: string;
};

export const buyerPathLinks: SiteLink[] = [
  {
    label: 'Services',
    href: 'services/',
    description:
      'Managed IT, cybersecurity, Microsoft 365, backup, network, and support ownership.',
  },
  {
    label: 'Pricing',
    href: 'pricing/',
    description:
      'Ranges, scope drivers, approval logic, and what changes the monthly number.',
  },
  {
    label: 'Proof',
    href: 'trust-center/',
    description:
      'Customer excellence standards, security posture, backup evidence, and operating proof.',
  },
  {
    label: 'Contact',
    href: 'contact-hq/',
    description:
      'Fit intake for support coverage, budget shape, transition risk, or workflow scope.',
  },
];

export const researchProofLinks: SiteLink[] = [
  {
    label: 'Blog',
    href: 'blog/',
    description:
      'Practical notes on transitions, backup assumptions, Microsoft 365, and scope.',
  },
  {
    label: 'Briefings',
    href: 'news/',
    description:
      'Short reads on budget, risk, insurance, AI pressure, and operations.',
  },
  {
    label: 'Trust Center',
    href: 'trust-center/',
    description:
      'Public backup, recovery, response, data-handling, and review posture.',
  },
  {
    label: 'Chicago service pages',
    href: 'chicago/',
    description:
      'Local service pages for managed IT, cybersecurity, Microsoft 365, backup, and co-managed support.',
  },
];

export const supportLinks: SiteLink[] = [
  { label: 'Privacy', href: 'privacy/' },
  { label: 'Terms', href: 'terms/' },
];

export const homeRouteGuideLinks: SiteLink[] = [
  ...buyerPathLinks,
  researchProofLinks[3],
];

export const footerSignals: FooterSignal[] = [
  {
    label: 'Coverage',
    value: 'Support + security baseline',
    detail:
      'Help desk, endpoints, Microsoft 365, backup, networking, access, vendors, and security evidence.',
  },
  {
    label: 'Built for',
    value: 'Chicago-area teams',
    detail:
      'Professional services, healthcare offices, light manufacturing, multi-site teams, and owner-led firms that need fewer loose ends.',
  },
  {
    label: 'Best first move',
    value: '30-minute fit review',
    detail:
      'Lead with the pressure point, rough user/device count, current provider context, timing, and approval constraint.',
  },
];
