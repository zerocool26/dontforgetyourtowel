import { useMemo, useState } from 'preact/hooks';
import type { Service } from '../../data/services-extended';
import { withBasePath } from '../../utils/helpers';

type FocusKey = 'stabilize' | 'secure' | 'scale' | 'automate';
type IndustryKey =
  | 'healthcare'
  | 'finance'
  | 'manufacturing'
  | 'services'
  | 'saas';

interface Props {
  services: Service[];
}

const FOCUS_ORDER: FocusKey[] = ['stabilize', 'secure', 'scale', 'automate'];

const INDUSTRY_ORDER: IndustryKey[] = [
  'healthcare',
  'finance',
  'manufacturing',
  'services',
  'saas',
];

const FOCUS_PROFILES: Record<
  FocusKey,
  {
    label: string;
    lead: string;
    recommendedPlan: string;
    categories: string[];
    outcomes: string[];
  }
> = {
  stabilize: {
    label: 'Stabilize operations',
    lead: 'Reduce ticket drag, downtime, and operational guesswork.',
    recommendedPlan: 'Essentials → Growth',
    categories: ['MSP Services', 'Network Engineering'],
    outcomes: [
      'Clear ownership for support and endpoint hygiene',
      'Hybrid-work reliability and documented runbooks',
      'A calmer starting point for future modernization',
    ],
  },
  secure: {
    label: 'Raise security maturity',
    lead: 'Close exposure quickly without slowing delivery to a crawl.',
    recommendedPlan: 'Growth → Secure+',
    categories: ['IT Security', 'MSP Services', 'Cloud Development'],
    outcomes: [
      'Identity, endpoint, and policy controls that stick',
      'Incident readiness and evidence habits for audits',
      'Leadership visibility into risk posture and response',
    ],
  },
  scale: {
    label: 'Scale platform delivery',
    lead: 'Modernize infrastructure and applications for growth.',
    recommendedPlan: 'Growth → Custom',
    categories: [
      'Cloud Development',
      'Application Development',
      'Network Engineering',
    ],
    outcomes: [
      'Cloud guardrails and repeatable release workflows',
      'Platform engineering without hidden operational debt',
      'Delivery capacity that keeps up with roadmap ambition',
    ],
  },
  automate: {
    label: 'Automate workflows',
    lead: 'Use AI and orchestration where the payoff is immediate.',
    recommendedPlan: 'Secure+ → Custom',
    categories: [
      'AI Consulting',
      'Application Development',
      'Cloud Development',
    ],
    outcomes: [
      'High-ROI automation candidates surfaced early',
      'AI governance and implementation guardrails built in',
      'Delivery plans that connect product, ops, and security',
    ],
  },
};

const INDUSTRY_PROFILES: Record<
  IndustryKey,
  {
    label: string;
    note: string;
    boostCategories: string[];
    keywords: string[];
  }
> = {
  healthcare: {
    label: 'Healthcare',
    note: 'Bias toward continuity, access control, compliance, and recovery.',
    boostCategories: ['IT Security', 'MSP Services'],
    keywords: ['health', 'compliance', 'identity', 'backup', 'continuity'],
  },
  finance: {
    label: 'Financial services',
    note: 'Bias toward governance, resilience, latency, and executive oversight.',
    boostCategories: [
      'IT Security',
      'Cloud Development',
      'Network Engineering',
    ],
    keywords: ['risk', 'governance', 'identity', 'latency', 'compliance'],
  },
  manufacturing: {
    label: 'Manufacturing',
    note: 'Bias toward industrial resilience, connectivity, and downtime reduction.',
    boostCategories: ['Network Engineering', 'IT Security', 'AI Consulting'],
    keywords: ['industrial', 'iot', 'latency', 'continuity', 'edge'],
  },
  services: {
    label: 'Professional services',
    note: 'Bias toward collaboration, identity, service quality, and ticket flow.',
    boostCategories: ['MSP Services', 'Cloud Development', 'AI Consulting'],
    keywords: ['workflow', 'collaboration', 'identity', 'support', 'remote'],
  },
  saas: {
    label: 'SaaS and tech',
    note: 'Bias toward platform velocity, observability, APIs, and automation.',
    boostCategories: [
      'Application Development',
      'Cloud Development',
      'AI Consulting',
    ],
    keywords: ['cloud', 'platform', 'api', 'automation', 'observability'],
  },
};

function scoreService(
  service: Service,
  focusKey: FocusKey,
  industryKey: IndustryKey
) {
  const focus = FOCUS_PROFILES[focusKey];
  const industry = INDUSTRY_PROFILES[industryKey];
  const haystack = `${service.name} ${service.description}`.toLowerCase();

  let score = 0;

  if (focus.categories.includes(service.category)) score += 4;
  if (industry.boostCategories.includes(service.category)) score += 3;

  for (const keyword of industry.keywords) {
    if (haystack.includes(keyword.toLowerCase())) score += 1;
  }

  if (focusKey === 'automate' && haystack.includes('ai')) score += 2;
  if (focusKey === 'secure' && haystack.includes('security')) score += 2;
  if (focusKey === 'scale' && haystack.includes('cloud')) score += 2;
  if (focusKey === 'stabilize' && haystack.includes('managed')) score += 2;

  return score;
}

export default function ServiceComparisonMatrix({ services }: Props) {
  const [focus, setFocus] = useState<FocusKey>('secure');
  const [industry, setIndustry] = useState<IndustryKey>('healthcare');

  const focusProfile = FOCUS_PROFILES[focus];
  const industryProfile = INDUSTRY_PROFILES[industry];

  const matches = useMemo(() => {
    return services
      .map(service => ({
        service,
        score: scoreService(service, focus, industry),
      }))
      .filter(item => item.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score || a.service.name.localeCompare(b.service.name)
      )
      .slice(0, 6);
  }, [focus, industry, services]);

  const categorySummary = useMemo(() => {
    return Array.from(
      new Set(matches.map(item => item.service.category))
    ).slice(0, 3);
  }, [matches]);

  return (
    <section class="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:p-8">
      <div class="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <div class="space-y-6">
          <div class="space-y-3">
            <p class="tone-muted text-xs font-semibold uppercase tracking-[0.32em]">
              Interactive planning matrix
            </p>
            <h3 class="tone-title text-2xl font-semibold sm:text-3xl">
              Tune the stack to your current pressure point.
            </h3>
            <p class="tone-body text-sm leading-relaxed sm:text-base">
              Choose the business outcome you need most, then bias the shortlist
              by industry context. The matrix surfaces the capabilities most
              likely to compound value fastest.
            </p>
          </div>

          <div>
            <p class="tone-muted text-xs font-semibold uppercase tracking-[0.28em]">
              Focus
            </p>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              {FOCUS_ORDER.map(option => {
                const active = option === focus;
                return (
                  <button
                    type="button"
                    class={`rounded-2xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 ${
                      active
                        ? 'border-accent-400/60 bg-accent-500/10 text-white'
                        : 'border-white/10 bg-zinc-950/40 text-zinc-200 [@media(hover:hover)]:hover:border-white/20'
                    }`}
                    onClick={() => setFocus(option)}
                  >
                    <span class="block text-sm font-semibold">
                      {FOCUS_PROFILES[option].label}
                    </span>
                    <span class="mt-1 block text-xs text-zinc-400">
                      {FOCUS_PROFILES[option].lead}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p class="tone-muted text-xs font-semibold uppercase tracking-[0.28em]">
              Industry lens
            </p>
            <div class="mt-3 flex flex-wrap gap-2">
              {INDUSTRY_ORDER.map(option => {
                const active = option === industry;
                return (
                  <button
                    type="button"
                    class={`min-h-[44px] rounded-full border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 ${
                      active
                        ? 'border-accent-400/60 bg-accent-500/10 text-white'
                        : 'border-white/10 text-zinc-300 [@media(hover:hover)]:hover:border-white/20 [@media(hover:hover)]:hover:text-white'
                    }`}
                    onClick={() => setIndustry(option)}
                  >
                    {INDUSTRY_PROFILES[option].label}
                  </button>
                );
              })}
            </div>
          </div>

          <div class="rounded-2xl border border-white/10 bg-zinc-950/50 p-5">
            <p class="tone-muted text-xs font-semibold uppercase tracking-[0.28em]">
              Recommended starting plan
            </p>
            <p class="tone-title mt-2 text-2xl font-semibold">
              {focusProfile.recommendedPlan}
            </p>
            <p class="tone-body mt-2 text-sm">{industryProfile.note}</p>
            <ul class="tone-body mt-4 space-y-2 text-sm">
              {focusProfile.outcomes.map(outcome => (
                <li class="flex items-start gap-2" key={outcome}>
                  <span class="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#ccff00]" />
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>
            <div class="mt-5 flex flex-wrap gap-3">
              <a
                class="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-accent-500 px-4 text-sm font-semibold text-white"
                href={withBasePath('pricing/#plans')}
              >
                Compare plans
              </a>
              <a
                class="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-semibold text-zinc-100"
                href={withBasePath(
                  `contact-hq/?focus=${encodeURIComponent(focus)}&industry=${encodeURIComponent(industry)}`
                )}
              >
                Request roadmap
              </a>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <div class="flex flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-950/40 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="tone-title text-sm font-semibold">
                Tailored capability shortlist
              </p>
              <p class="tone-body mt-1 text-xs sm:text-sm">
                Best-fit services for <strong>{focusProfile.label}</strong> in{' '}
                <strong>{industryProfile.label}</strong>.
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              {categorySummary.map(category => (
                <span class="rounded-full border border-white/10 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-zinc-300">
                  {category}
                </span>
              ))}
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            {matches.map(({ service, score }) => (
              <article
                key={service.id}
                class="rounded-2xl border border-white/10 bg-zinc-950/45 p-5 transition [@media(hover:hover)]:hover:border-accent-400/30"
              >
                <div class="flex items-center justify-between gap-3">
                  <span class="rounded-full border border-white/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-300">
                    {service.category}
                  </span>
                  <span class="text-xs font-semibold text-accent-300">
                    Fit {Math.min(score * 10, 98)}%
                  </span>
                </div>
                <h4 class="tone-title mt-4 text-lg font-semibold">
                  {service.name}
                </h4>
                <p class="tone-body mt-2 text-sm leading-relaxed">
                  {service.description}
                </p>
              </article>
            ))}
          </div>

          <div class="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p class="tone-title text-sm font-semibold">
              Need a narrowed 90-day map?
            </p>
            <p class="tone-body mt-2 text-sm leading-relaxed">
              We can turn this shortlist into a phased rollout covering quick
              wins, security dependencies, and the operating rhythm needed to
              keep momentum after launch.
            </p>
            <div class="mt-4 flex flex-wrap gap-3">
              <a
                class="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-black"
                href={withBasePath('contact-hq/')}
              >
                Book discovery
              </a>
              <a
                class="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-semibold text-zinc-100"
                href={withBasePath('pricing/#estimate')}
              >
                Run the cost model
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
