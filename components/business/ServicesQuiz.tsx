'use client';

import { useMemo, useState } from 'react';
import ModernButton from '../ui/ModernButton';

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
    if (answers.length === 0) {
      return null;
    }
    const counts = new Map<Answer, number>();
    for (const answer of answers) {
      counts.set(answer, (counts.get(answer) ?? 0) + 1);
    }
    let top: Answer = answers[0];
    for (const [key, value] of counts) {
      if (value > (counts.get(top) ?? 0)) {
        top = key;
      }
    }
    return top;
  }, [answers]);

  const isComplete = step >= QUESTIONS.length;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Find your perfect IT solution</p>
          <h3 className="mt-2 text-xl font-semibold text-white">60-second services quiz</h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-400">Progress</p>
          <p className="text-sm font-semibold text-white">{progress}%</p>
        </div>
      </div>

      <div className="mt-4 h-2 w-full rounded-full bg-white/10">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-accent-500 to-cyan-300 transition-all"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {!isComplete ? (
        <div className="mt-6">
          <p className="text-sm font-semibold text-white">{QUESTIONS[step]?.title}</p>
          <div className="mt-4 grid gap-3">
            {QUESTIONS[step]?.options.map(option => (
              <button
                className="min-h-[48px] rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-left text-sm text-zinc-200 hover:border-white/20"
                key={option.label}
                onClick={() => {
                  setAnswers(prev => [...prev, option.value]);
                  setStep(prev => prev + 1);
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <p className="text-sm text-zinc-300">Recommended starting point</p>
          <p className="mt-2 text-lg font-semibold text-white">{result ? recommendationLabel(result) : '—'}</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <ModernButton className="min-h-[48px] flex-1" href="/services#contact" variant="primary">
              Contact
            </ModernButton>
            <button
              className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white"
              onClick={() => {
                setStep(0);
                setAnswers([]);
              }}
              type="button"
            >
              Retake
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
