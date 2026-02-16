import ModernButton from '../../components/ui/ModernButton';
import ModernCard from '../../components/ui/ModernCard';
import RevealOnScroll from '../../components/ui/RevealOnScroll';
import CaseStudyCard from '../../components/business/CaseStudyCard';
import TestimonialSlider from '../../components/business/TestimonialSlider';
import ServicesQuiz from '../../components/business/ServicesQuiz';
import { CONTACT_EMAIL } from '../../lib/config/site';
import { getFeaturedCaseStudies, getFeaturedTestimonials } from './content';

const services = [
  {
    id: 'managed-it',
    title: 'Managed IT & Support',
    description:
      'Predictable operations, responsive support, and documented systems—so IT stays boring in the best way.',
    bullets: [
      '24/7 monitoring and alerting',
      'Helpdesk and onsite dispatch options',
      'Patch management and asset lifecycle',
      'Backup and disaster recovery testing',
    ],
  },
  {
    id: 'cybersecurity',
    title: 'Security & Compliance',
    description:
      'Layered controls, visibility, and response readiness aligned to your risk profile and regulatory needs.',
    bullets: [
      'Endpoint protection and hardening',
      'Email security and phishing defense',
      'MFA, SSO, and identity governance',
      'Incident response planning and support',
    ],
  },
  {
    id: 'cloud',
    title: 'Cloud & DevOps',
    description:
      'Modernize safely with migrations, landing zones, IaC, CI/CD, and cost controls built in.',
    bullets: [
      'Microsoft 365 and Google Workspace optimization',
      'Azure and AWS migration support',
      'Network and access modernization',
      'Policy guardrails and cost controls',
    ],
  },
  {
    id: 'ai',
    title: 'Automation & AI Enablement',
    description:
      'Practical automation and AI adoption with governance, privacy, and measurable productivity gains.',
    bullets: [
      'AI readiness and data classification',
      'Workflow automation and copilots',
      'Policy, training, and governance',
      'Security reviews for AI tooling',
    ],
  },
];

const engagementModel = [
  {
    phase: 'Assess',
    outcomes: ['Environment inventory', 'Risk baseline', 'Quick-win action plan'],
  },
  {
    phase: 'Onboard',
    outcomes: ['Monitoring rollout', 'Security hardening', 'Runbooks and escalation'],
  },
  {
    phase: 'Operate',
    outcomes: ['Helpdesk and ticketing', 'Patch cadence', 'Monthly reporting'],
  },
  {
    phase: 'Optimize',
    outcomes: ['Roadmap sessions', 'Cost optimization', 'Quarterly security review'],
  },
];

const industries = [
  { name: 'Healthcare', note: 'HIPAA-aligned controls and audit support' },
  { name: 'Financial Services', note: 'SOC 2 readiness and vendor risk support' },
  { name: 'Manufacturing', note: 'Operational continuity and endpoint resilience' },
  { name: 'Professional Services', note: 'Secure collaboration and identity governance' },
  { name: 'Retail', note: 'Device management and network segmentation' },
  { name: 'SaaS & Tech', note: 'Cloud guardrails and security program support' },
];

export default async function Page() {
  const featuredCaseStudies = await getFeaturedCaseStudies(3);
  const featuredTestimonials = await getFeaturedTestimonials(6);
  const startProjectHref = `mailto:${encodeURIComponent(CONTACT_EMAIL)}?subject=${encodeURIComponent('Services inquiry')}`;

  return (
    <>
      <section className="relative overflow-hidden bg-zinc-950 pb-16 pt-24">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(0,102,255,0.16),_transparent_55%)]" />
        <div className="mx-auto max-w-[1220px] px-6">
          <RevealOnScroll animation="slide-up" className="max-w-3xl space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-zinc-400">Services</p>
            <h1 className="text-4xl font-bold text-white sm:text-5xl">
              Consulting, engineering, and managed operations—
              <span className="text-accent-300"> under one accountable team.</span>
            </h1>
            <p className="text-base text-zinc-300">
              Pick a focused engagement or a long-term coverage plan. We help teams plan, build,
              secure, and operate modern systems.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ModernButton className="min-h-[48px]" href="/services#engagement-model" variant="secondary">
                How we work
              </ModernButton>
              <ModernButton className="min-h-[48px]" href={startProjectHref} variant="primary">
                Start a project
              </ModernButton>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      <section className="border-y border-white/5 bg-zinc-900/30">
        <div className="mx-auto max-w-[1220px] px-6 py-16">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {services.map((service, index) => (
              <RevealOnScroll animation="slide-up" delay={index * 75} key={service.id}>
                <ModernCard className="h-full border-white/10 bg-zinc-950/60 p-6" variant="minimal">
                  <h2 className="text-base font-semibold text-white">{service.title}</h2>
                  <p className="mt-2 text-sm text-zinc-300">{service.description}</p>
                </ModernCard>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {services.map((service, index) => (
        <section className="bg-zinc-950" id={service.id} key={service.id}>
          <div className="mx-auto max-w-[1220px] px-6 py-20">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
              <RevealOnScroll animation="slide-right" delay={index * 50} className="space-y-4">
                <h2 className="text-3xl font-semibold text-white">{service.title}</h2>
                <p className="text-sm text-zinc-300">{service.description}</p>
                <ModernButton className="min-h-[48px]" href={startProjectHref} variant="primary">
                  Discuss your needs
                </ModernButton>
              </RevealOnScroll>
              <RevealOnScroll animation="slide-left" delay={index * 50}>
                <ModernCard className="border-white/10 bg-zinc-950/60 p-6" variant="minimal">
                  <p className="text-sm font-semibold text-white">What’s included</p>
                  <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                    {service.bullets.map(item => (
                      <li className="flex items-start gap-2" key={item}>
                        <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 bg-accent-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </ModernCard>
              </RevealOnScroll>
            </div>
          </div>
        </section>
      ))}

      <section className="border-y border-white/5 bg-zinc-900/30" id="engagement-model">
        <div className="mx-auto max-w-[1220px] px-6 py-20">
          <h2 className="text-3xl font-semibold text-white">How we work</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {engagementModel.map((step, index) => (
              <RevealOnScroll animation="slide-up" delay={index * 75} key={step.phase}>
                <ModernCard className="border-white/10 bg-zinc-950/60 p-6" variant="minimal">
                  <p className="text-sm font-semibold text-white">{step.phase}</p>
                  <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                    {step.outcomes.map(outcome => (
                      <li className="flex items-start gap-2" key={outcome}>
                        <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 bg-accent-500" />
                        <span>{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </ModernCard>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-zinc-950" id="industries">
        <div className="mx-auto max-w-[1220px] px-6 py-20">
          <h2 className="text-3xl font-semibold text-white">Industries we support</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {industries.map((industry, index) => (
              <RevealOnScroll animation="slide-up" delay={index * 60} key={industry.name}>
                <ModernCard className="border-white/10 bg-zinc-950/60 p-6" variant="minimal">
                  <p className="text-sm font-semibold text-white">{industry.name}</p>
                  <p className="mt-2 text-sm text-zinc-300">{industry.note}</p>
                </ModernCard>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/5 bg-zinc-900/30" id="case-studies">
        <div className="mx-auto max-w-[1220px] px-6 py-20">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <RevealOnScroll animation="slide-up" className="max-w-3xl space-y-3">
              <h2 className="text-3xl font-semibold text-white">Recent outcomes</h2>
              <p className="text-sm text-zinc-300">
                A few examples of modernization, security hardening, and automation delivered for real teams.
              </p>
            </RevealOnScroll>
            <ModernButton className="min-h-[48px]" href="/pricing" variant="secondary">
              Compare plans
            </ModernButton>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {featuredCaseStudies.map((study, index) => (
              <RevealOnScroll animation="slide-up" delay={index * 75} key={study.title}>
                <CaseStudyCard industry={study.industry} results={study.results} summary={study.summary} title={study.title} />
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 bg-zinc-900/30" id="testimonials">
        <div className="mx-auto max-w-[1220px] px-6 py-20">
          <RevealOnScroll animation="slide-up" className="max-w-3xl space-y-4">
            <h2 className="text-3xl font-semibold text-white">What clients say</h2>
            <p className="text-sm text-zinc-300">
              Trust is earned in the day-to-day: reliable support, clear reporting, and real risk reduction.
            </p>
          </RevealOnScroll>
          <div className="mt-10">
            <TestimonialSlider testimonials={featuredTestimonials} />
          </div>
        </div>
      </section>

      <section className="bg-zinc-950" id="quiz">
        <div className="mx-auto max-w-[1220px] px-6 py-20">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <RevealOnScroll animation="slide-up" className="space-y-4">
              <h2 className="text-3xl font-semibold text-white">Not sure what you need?</h2>
              <p className="text-sm text-zinc-300">
                Take a 60-second quiz and we’ll recommend a practical starting package.
              </p>
              <ModernButton className="min-h-[48px]" href={startProjectHref} variant="secondary">
                Or talk to an expert
              </ModernButton>
            </RevealOnScroll>
            <ServicesQuiz />
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 bg-zinc-900/30" id="contact">
        <div className="mx-auto max-w-[1220px] px-6 py-20">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-semibold text-white">Get in touch</h2>
            <p className="mt-3 max-w-2xl text-sm text-zinc-300">
              Email us a short summary of what you want to improve, and we’ll reply with clear next steps.
            </p>
            <div className="mt-6">
              <ModernButton className="min-h-[48px]" href={startProjectHref} variant="primary">
                Email project details
              </ModernButton>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

