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
      { label: 'Modernize cloud & Microsoft 365', value: 'cloud' },
      { label: 'Improve workflows or client experience', value: 'ai' },
    ],
  },
  {
    id: 'risk',
    title: 'Which risk feels most urgent?',
    options: [
      { label: 'Unpatched devices & inconsistent support', value: 'msp' },
      { label: 'Ransomware / phishing exposure', value: 'security' },
      { label: 'Unclear M365 / cloud ownership', value: 'cloud' },
      { label: 'Manual processes or weak buyer UX', value: 'ai' },
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
      return 'Managed IT and Support — Core Coverage → Secure Operations';
    case 'security':
      return 'Cybersecurity and Compliance — Secure Operations → Co-Managed';
    case 'cloud':
      return 'Cloud and Microsoft 365 — Secure Operations → Custom';
    case 'ai':
      return 'Automation and Workflow Systems — Co-Managed → Custom';
  }
}

function recommendationDescription(answer: Answer): string {
  switch (answer) {
    case 'msp':
      return 'Best when the first job is making support more reliable, clarifying ownership, and getting devices, users, and vendors under control.';
    case 'security':
      return 'Best when ransomware risk, audit pressure, access control, or leadership confidence is the main constraint right now.';
    case 'cloud':
      return 'Best when the environment needs Microsoft 365 governance, cloud cleanup, hybrid modernization, or better license visibility.';
    case 'ai':
      return 'Best when manual work, reporting friction, or a weak client-facing experience is costing time and credibility.';
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
      class="tone-border tone-surface relative overflow-hidden rounded-lg border p-6"
      data-testid="services-quiz"
      data-step={step}
    >
      <div
        class="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 10%, transparent), transparent 42%, color-mix(in srgb, var(--color-primary-strong) 8%, transparent))',
        }}
      />

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
              class={`creative-pill ${isDone ? 'tone-chip-active' : ''} ${isActive ? 'tone-chip-soft text-white' : ''}`}
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
          class="h-2 rounded-full transition-all motion-reduce:transition-none"
          style={{
            width: `${Math.min(progress, 100)}%`,
            background:
              'linear-gradient(90deg, var(--color-primary), var(--color-primary-strong))',
          }}
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
                class="tone-border tone-body tone-surface min-h-[54px] rounded-lg border px-4 py-3 text-left text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 motion-reduce:transition-none [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:border-white/20 [@media(hover:hover)]:hover:bg-white/5 [@media(hover:hover)]:hover:text-white"
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
          <div class="creative-panel mt-4 rounded-lg p-5">
            <p class="tone-title text-lg font-semibold" aria-live="polite">
              {result ? recommendationLabel(result) : '—'}
            </p>
            <p class="tone-body mt-3 text-sm leading-relaxed">
              {result ? recommendationDescription(result) : null}
            </p>
          </div>
          <div class="mt-5 grid gap-3 sm:grid-cols-2">
            <a
              class="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 motion-reduce:transition-none [@media(hover:hover)]:hover:brightness-105"
              style={{
                background:
                  'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 82%, white 18%), color-mix(in srgb, var(--color-primary-strong) 52%, white 48%))',
                color: 'var(--color-text-inverse)',
              }}
              href={contactHref}
            >
              {ctaLabel}
            </a>
            <a
              class="tone-border tone-title tone-surface inline-flex min-h-[52px] flex-1 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 motion-reduce:transition-none [@media(hover:hover)]:hover:border-white/20 [@media(hover:hover)]:hover:text-white"
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
