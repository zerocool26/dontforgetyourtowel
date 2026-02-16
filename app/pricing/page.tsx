import ModernButton from '../../components/ui/ModernButton';
import ModernCard from '../../components/ui/ModernCard';
import FAQAccordion from '../../components/ui/FAQAccordion';
import RevealOnScroll from '../../components/ui/RevealOnScroll';
import PricingCalculator from '../../components/business/PricingCalculator';
import ROICalculator from '../../components/business/ROICalculator';
import { CONTACT_EMAIL } from '../../lib/config/site';

const tiers = [
  {
    name: 'Essentials',
    price: '$99 / user / mo',
    description: 'Reliable foundation for helpdesk, patching, backups, and monitoring.',
    perks: [
      'Monitoring and alerting',
      'Ticketing with response SLAs',
      'Patch management cadence',
      'Backup oversight and restore testing',
    ],
    highlight: false,
  },
  {
    name: 'Growth',
    price: '$149 / user / mo',
    description: 'Best fit for growing teams that need stronger security and proactive IT.',
    perks: [
      'Everything in Essentials',
      'Identity hardening (MFA and SSO)',
      'Security baseline and policy templates',
      'Quarterly roadmap review',
    ],
    highlight: true,
  },
  {
    name: 'Secure+',
    price: '$199 / user / mo',
    description: 'Advanced security coverage and incident readiness for regulated environments.',
    perks: [
      'Everything in Growth',
      'Managed EDR and response playbooks',
      'Security awareness program',
      'Compliance readiness support',
    ],
    highlight: false,
  },
  {
    name: 'Custom',
    price: 'Quoted',
    description: 'Complex environments, multi-site networks, or dedicated vCISO requirements.',
    perks: [
      'Custom device and server-based pricing',
      'Custom SLA and escalation paths',
      'Dedicated security program support',
      'Cloud migration workstreams',
    ],
    highlight: false,
  },
];

const faqs = [
  {
    title: 'Do you support co-managed IT?',
    content:
      'Yes. We can partner with your internal IT team and own monitoring, escalations, security, and projects.',
  },
  {
    title: 'What impacts pricing the most?',
    content:
      'User and device counts, compliance scope, server footprint, and response SLAs are the biggest pricing inputs.',
  },
  {
    title: 'Can you help with SOC 2 readiness?',
    content:
      'We help with control implementation, documentation habits, and evidence workflows. We do not act as an auditor.',
  },
  {
    title: 'How fast can we onboard?',
    content:
      'Many SMB environments onboard within 10–14 days. Larger multi-site environments can require additional time.',
  },
];

export default function Page() {
  const requestQuoteHref = `mailto:${encodeURIComponent(CONTACT_EMAIL)}?subject=${encodeURIComponent('Request pricing / quote')}`;

  return (
    <>
      <section className="relative overflow-hidden bg-zinc-950 pb-16 pt-24 text-zinc-50">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(0,102,255,0.16),_transparent_55%)]" />
        <div className="mx-auto max-w-[1220px] px-6">
          <RevealOnScroll animation="slide-up" className="max-w-3xl space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-zinc-400">Pricing</p>
            <h1 className="text-4xl font-bold text-white sm:text-5xl">
              Plans that scale with your business—
              <span className="text-accent-300"> without surprises.</span>
            </h1>
            <p className="text-base text-zinc-300">
              Pricing is typically per user, with add-ons for security depth and compliance scope.
              We’ll confirm best fit in a free consultation.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ModernButton className="min-h-[48px]" href="/services" variant="secondary">
                Review services
              </ModernButton>
              <ModernButton className="min-h-[48px]" href={requestQuoteHref} variant="primary">
                Get a quote
              </ModernButton>
            </div>
          </RevealOnScroll>

          <ModernCard className="mt-10 border-white/10 bg-white/5 p-6" variant="minimal">
            <p className="text-sm text-zinc-300">
              <span className="font-semibold text-white">All plans include</span> onboarding, documented runbooks,
              and monthly reporting.
            </p>
          </ModernCard>
        </div>
      </section>

      <section className="border-y border-white/5 bg-zinc-900/30">
        <div className="mx-auto max-w-[1220px] px-6 py-16">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {tiers.map((tier, index) => (
              <RevealOnScroll animation="slide-up" delay={index * 75} key={tier.name}>
                <ModernCard
                  className={tier.highlight ? 'border-accent-400/50 bg-zinc-950 p-6' : 'border-white/10 bg-zinc-950/60 p-6'}
                  variant="minimal"
                >
                  <p className="text-sm font-semibold text-white">{tier.name}</p>
                  <p className="mt-2 text-xl font-bold text-accent-300">{tier.price}</p>
                  <p className="mt-2 text-sm text-zinc-300">{tier.description}</p>
                  <ul className="mt-4 space-y-2 text-xs text-zinc-300">
                    {tier.perks.map(perk => (
                      <li className="flex items-start gap-2" key={perk}>
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 bg-accent-500" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                  <ModernButton className="mt-5 w-full" href={requestQuoteHref} variant={tier.highlight ? 'primary' : 'secondary'}>
                    {tier.highlight ? 'Choose Growth' : 'Talk to sales'}
                  </ModernButton>
                </ModernCard>
              </RevealOnScroll>
            ))}
          </div>
          <p className="mt-6 text-xs text-zinc-500">
            Prices are illustrative. Final pricing depends on device counts, server footprint, compliance scope, and SLA.
          </p>
        </div>
      </section>

      <section className="bg-zinc-950">
        <div className="mx-auto max-w-[1220px] px-6 py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <RevealOnScroll animation="slide-up" className="space-y-4">
              <h2 className="text-3xl font-semibold text-white">Estimate your monthly cost</h2>
              <p className="text-sm text-zinc-300">
                Use this calculator for a ballpark estimate. We’ll validate assumptions and produce a detailed quote in discovery.
              </p>
            </RevealOnScroll>
            <PricingCalculator />
          </div>
        </div>
      </section>

      <section className="border-y border-white/5 bg-zinc-900/30">
        <div className="mx-auto max-w-[1220px] px-6 py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <RevealOnScroll animation="slide-up" className="space-y-4">
              <h2 className="text-3xl font-semibold text-white">Estimate ROI</h2>
              <p className="text-sm text-zinc-300">
                A quick planning tool to evaluate payback periods. Real savings often come from reduced downtime,
                stronger security controls, and fewer emergency projects.
              </p>
            </RevealOnScroll>
            <ROICalculator />
          </div>
        </div>
      </section>

      <section className="bg-zinc-950" id="faq">
        <div className="mx-auto max-w-[1220px] px-6 py-20">
          <RevealOnScroll animation="slide-up" className="max-w-3xl space-y-4">
            <h2 className="text-3xl font-semibold text-white">FAQs</h2>
            <p className="text-sm text-zinc-300">If you don’t see your question here, email us and we’ll walk you through options.</p>
          </RevealOnScroll>
          <RevealOnScroll animation="slide-up" className="mt-10">
            <FAQAccordion items={faqs} />
          </RevealOnScroll>
        </div>
      </section>

      <section className="border-t border-white/5 bg-zinc-900/30" id="contact">
        <div className="mx-auto max-w-[1220px] px-6 py-20">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-semibold text-white">Request a quote</h2>
            <p className="mt-3 max-w-2xl text-sm text-zinc-300">
              Email your user/device counts, key apps, and compliance needs. We’ll respond with a best-fit plan.
            </p>
            <div className="mt-6">
              <ModernButton className="min-h-[48px]" href={requestQuoteHref} variant="primary">
                Email for a quote
              </ModernButton>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

