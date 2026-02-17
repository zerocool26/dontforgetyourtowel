import { useMemo, useState } from 'preact/hooks';
import { withBasePath } from '../../utils/helpers';

type Answer = 'msp' | 'security' | 'cloud' | 'ai';
type Question = {
  id: string;
  title: string;
  options: { label: string; value: Answer }[];
};

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
      return 'Managed IT Services (Bronze → Platinum)';
    case 'security':
      return 'Cybersecurity & Compliance (assessment + managed security)';
    case 'cloud':
      return 'Cloud & Infrastructure (migration + optimization)';
    case 'ai':
      return 'AI Consulting & Integration (readiness → pilot → scale)';
  }
}

export default function ServicesQuiz() {
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
      class="tone-border tone-surface rounded-2xl border p-6"
      data-testid="services-quiz"
      data-step={step}
    >
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="tone-muted text-xs font-semibold uppercase tracking-[0.3em]">
            Find your perfect IT solution
          </p>
          <h3
            class="tone-title mt-2 text-xl font-semibold"
            data-testid="services-quiz-title"
          >
            60-second services quiz
          </h3>
        </div>
        <div class="text-right">
          <p class="tone-muted text-xs">Progress</p>
          <p class="tone-title text-sm font-semibold">{progress}%</p>
        </div>
      </div>

      <div
        class="tone-border tone-surface mt-4 h-2 w-full rounded-full border"
        role="progressbar"
        aria-label="Quiz completion"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(progress, 100)}
      >
        <div
          class="h-2 rounded-full bg-gradient-to-r from-accent-500 to-cyan-300 transition-all motion-reduce:transition-none"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {!isComplete ? (
        <div class="mt-6">
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
                class="tone-border tone-body tone-surface min-h-[48px] rounded-xl border px-4 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 motion-reduce:transition-none [@media(hover:hover)]:hover:border-accent-400/40 [@media(hover:hover)]:hover:text-accent-200"
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
        <div class="mt-6">
          <p
            class="tone-body text-sm"
            data-testid="services-quiz-recommendation-label"
          >
            Recommended starting point
          </p>
          <p class="tone-title mt-2 text-lg font-semibold" aria-live="polite">
            {result ? recommendationLabel(result) : '—'}
          </p>
          <div class="mt-5 flex flex-col gap-3 sm:flex-row">
            <a
              class="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-accent-500 px-4 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 motion-reduce:transition-none [@media(hover:hover)]:hover:bg-accent-400"
              href={contactHref}
            >
              Contact
            </a>
            <button
              type="button"
              class="tone-border tone-title tone-surface inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 motion-reduce:transition-none [@media(hover:hover)]:hover:border-accent-400/40 [@media(hover:hover)]:hover:text-accent-200"
              onClick={() => {
                setStep(0);
                setAnswers([]);
              }}
            >
              Retake
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
