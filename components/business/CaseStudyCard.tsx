import ModernCard from '../ui/ModernCard';

interface CaseStudyResult {
  label: string;
  value: string;
}

interface CaseStudyCardProps {
  title: string;
  industry?: string;
  summary?: string;
  results?: CaseStudyResult[];
}

export default function CaseStudyCard({ title, industry, summary, results = [] }: CaseStudyCardProps) {
  return (
    <ModernCard className="h-full border-white/10 bg-zinc-950/60 p-6" variant="minimal">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">{industry ?? 'Case study'}</p>
      <h3 className="mt-3 text-lg font-semibold text-white">{title}</h3>
      {summary ? <p className="mt-3 text-sm leading-relaxed text-zinc-300">{summary}</p> : null}

      {results.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {results.slice(0, 3).map(result => (
            <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-3" key={`${result.label}-${result.value}`}>
              <p className="text-xs text-zinc-400">{result.label}</p>
              <p className="mt-1 text-sm font-semibold text-accent-300">{result.value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </ModernCard>
  );
}
