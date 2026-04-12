import { useMemo, useState } from 'preact/hooks';
import { withBasePath } from '../../utils/helpers';

type Answer = 'msp' | 'security' | 'cloud' | 'ai';
type Question = {
  id: string;
  title: string;
  options: { label: string; value: Answer }[];
};

interface Props {
  kicker?: string;
  title?: string;
  ctaLabel?: string;
}

const QUESTIONS: Question[] = [
  {
    id: 'goal',
    title: 'What is your top priority right now?',
    options: [
      { label: 'Reduce IT firefighting / downtime', value: 'msp' },
      { label: 'Improve security & compliance', value: 'security' },
      { label: 'Modernize cloud infrastructure', value: 'cloud' },
      { label: 'Use AI to automate workflows', value: 'ai' },
    ],
  },
  {
    id: 'risk',
    title: 'Which risk feels most urgent?',
    options: [
      { label: 'Unpatched devices & inconsistent support', value: 'msp' },
      { label: 'Ransomware / phishing exposure', value: 'security' },
      { label: 'Uncontrolled cloud spend / reliability', value: 'cloud' },
      { label: 'Manual processes slowing the team', value: 'ai' },
    ],
  },
  {
    id: 'timeline',
    title: 'How fast do you need results?',
    options: [
      { label: 'This month', value: 'security' },
      { label: 'This quarter', value: 'msp' },
      { label: '6–12 months', value: 'cloud' },
      { label: '12+ months', value: 'ai' },
    ],
  },
];

function recommendationLabel(answer: Answer): string {
  switch (answer) {
    case 'msp':
      return 'Managed IT Services (Bronze) — Essentials → Growth';
    case 'security':
      return 'Cybersecurity & Compliance (Silver) — Growth → Secure+';
    case 'cloud':
      return 'Cloud & Infrastructure (Gold) — Growth → Custom';
    case 'ai':
      return 'AI Consulting & Integration (Platinum) — Secure+ → Custom';
  }
}

function recommendationDescription(answer: Answer): string {
  switch (answer) {
    case 'msp':
      return 'Best when your team needs operational calm, consistent support coverage, and stronger endpoint hygiene before piling on new initiatives.';
    case 'security':
      return 'Best when risk, compliance, access control, or incident readiness is the current bottleneck to growth.';
    case 'cloud':
      return 'Best when modernization, reliability, or spend visibility matters more than adding one more standalone tool.';
    case 'ai':
      return 'Best when you already know where manual work is slowing the team and want an AI roadmap with guardrails.';
  }
}

export default function ServicesQuiz({
  kicker = 'Find your perfect IT solution',
  title = '60-second services quiz',
  ctaLabel = 'Start intake',
}: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);

  const progress = useMemo(() => {
    return Math.round(((step + 1) / (QUESTIONS.length + 1)) * 100);
  }, [step]);

  const result = useMemo(() => {
    if (answers.length === 0) return null;
    const counts = new Map<Answer, number>();
    for (const a of answers) counts.set(a, (counts.get(a) ?? 0) + 1);
    let top: Answer = answers[0];
    for (const [k, v] of counts) {
      if (v > (counts.get(top) ?? 0)) top = k;
    }
    return top;
  }, [answers]);

  const isComplete = step >= QUESTIONS.length;
  const contactHref = result
    ? withBasePath(`contact-hq/?service=${encodeURIComponent(result)}`)
    : withBasePath('contact-hq/');

  return (
    <section
      class="tone-border tone-surface relative overflow-hidden rounded-2xl border p-6"
      data-testid="services-quiz"
      data-step={step}
    >
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(215,247,91,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(18,181,166,0.12),transparent_30%)] opacity-80" />

      <div class="flex items-center justify-between gap-4">
        <div class="relative z-10">
          <p class="creative-kicker !text-[0.62rem]">{kicker}</p>
          <h3
            class="tone-title mt-3 text-xl font-semibold sm:text-2xl"
            data-testid="services-quiz-title"
          >
            {title}
          </h3>
        </div>
        <div class="relative z-10 text-right">
          <p class="tone-muted text-xs">Progress</p>
          <p class="tone-title text-lg font-semibold">{progress}%</p>
        </div>
      </div>

      <div class="relative z-10 mt-5 flex flex-wrap gap-2" aria-hidden="true">
        {QUESTIONS.map((question, index) => {
          const isActive = index === step && !isComplete;
          const isDone = index < answers.length;

          return (
            <span
              class={`creative-pill ${isDone ? 'bg-[#d7f75b]/12 border-[#d7f75b]/35 text-[#f3ffb4]' : ''} ${isActive ? 'border-teal-300/35 bg-teal-300/10 text-teal-100' : ''}`}
            >
              {question.id}
            </span>
          );
        })}
      </div>

      <div
        class="tone-border tone-surface relative z-10 mt-5 h-2 w-full overflow-hidden rounded-full border"
        role="progressbar"
        aria-label="Quiz completion"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(progress, 100)}
      >
        <div
          class="h-2 rounded-full bg-[linear-gradient(90deg,#d7f75b_0%,#76e7cc_100%)] shadow-[0_0_18px_rgba(18,181,166,0.35)] transition-all motion-reduce:transition-none"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {!isComplete ? (
        <div class="relative z-10 mt-6">
          <p
            class="tone-title text-sm font-semibold"
            data-testid="services-quiz-question"
            aria-live="polite"
          >
            {QUESTIONS[step]?.title}
          </p>
          <div class="mt-4 grid gap-3">
            {QUESTIONS[step]?.options.map(opt => (
              <button
                type="button"
                data-testid="services-quiz-option"
                class="tone-border tone-body tone-surface [@media(hover:hover)]:hover:bg-white/8 min-h-[54px] rounded-2xl border px-4 py-3 text-left text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 motion-reduce:transition-none [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:border-[#d7f75b]/35 [@media(hover:hover)]:hover:text-white"
                onClick={() => {
                  setAnswers(prev => [...prev, opt.value]);
                  setStep(prev => prev + 1);
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div class="relative z-10 mt-6">
          <p
            class="tone-body text-sm"
            data-testid="services-quiz-recommendation-label"
          >
            Recommended starting point
          </p>
          <div class="creative-panel mt-4 rounded-[1.25rem] p-5">
            <p class="tone-title text-lg font-semibold" aria-live="polite">
              {result ? recommendationLabel(result) : '—'}
            </p>
            <p class="tone-body mt-3 text-sm leading-relaxed">
              {result ? recommendationDescription(result) : null}
            </p>
          </div>
          <div class="mt-5 grid gap-3 sm:grid-cols-2">
            <a
              class="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#d7f75b_0%,#76e7cc_100%)] px-4 text-sm font-semibold text-black shadow-[0_18px_40px_rgba(18,181,166,0.18)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 motion-reduce:transition-none [@media(hover:hover)]:hover:brightness-105"
              href={contactHref}
            >
              {ctaLabel}
            </a>
            <a
              class="tone-border tone-title tone-surface inline-flex min-h-[52px] flex-1 items-center justify-center rounded-2xl border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 motion-reduce:transition-none [@media(hover:hover)]:hover:border-accent-400/40 [@media(hover:hover)]:hover:text-accent-200"
              href={withBasePath('pricing/#plans')}
            >
              Compare plans
            </a>
          </div>
          <button
            type="button"
            class="tone-muted mt-3 inline-flex min-h-[44px] items-center justify-center rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 [@media(hover:hover)]:hover:text-white"
            onClick={() => {
              setStep(0);
              setAnswers([]);
            }}
          >
            Retake quiz
          </button>
        </div>
      )}
    </section>
  );
}
