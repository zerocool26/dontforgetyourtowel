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

  return (
    <section class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
            Find your perfect IT solution
          </p>
          <h3 class="mt-2 text-xl font-semibold text-white">
            60-second services quiz
          </h3>
        </div>
        <div class="text-right">
          <p class="text-xs text-zinc-400">Progress</p>
          <p class="text-sm font-semibold text-white">{progress}%</p>
        </div>
      </div>

      <div class="mt-4 h-2 w-full rounded-full bg-white/10">
        <div
          class="h-2 rounded-full bg-gradient-to-r from-accent-500 to-cyan-300 transition-all"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {!isComplete ? (
        <div class="mt-6">
          <p class="text-sm font-semibold text-white">
            {QUESTIONS[step]?.title}
          </p>
          <div class="mt-4 grid gap-3">
            {QUESTIONS[step]?.options.map(opt => (
              <button
                type="button"
                class="min-h-[48px] rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-left text-sm text-zinc-200 hover:border-white/20"
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
          <p class="text-sm text-zinc-300">Recommended starting point</p>
          <p class="mt-2 text-lg font-semibold text-white">
            {result ? recommendationLabel(result) : '—'}
          </p>
          <div class="mt-5 flex flex-col gap-3 sm:flex-row">
            <a
              class="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-accent-500 px-4 text-sm font-semibold text-white"
              href={`${withBasePath('services/')}#contact`}
            >
              Contact
            </a>
            <button
              type="button"
              class="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white"
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
