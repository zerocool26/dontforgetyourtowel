'use client';

import { useMemo, useState } from 'react';
import ModernButton from '../ui/ModernButton';

export default function ROICalculator() {
  const [currentMonthlyCost, setCurrentMonthlyCost] = useState(12000);
  const [estimatedSavingsPct, setEstimatedSavingsPct] = useState(20);
  const [oneTimeTransitionCost, setOneTimeTransitionCost] = useState(10000);

  const savingsMonthly = useMemo(() => {
    return Math.max(0, (currentMonthlyCost * estimatedSavingsPct) / 100);
  }, [currentMonthlyCost, estimatedSavingsPct]);

  const paybackMonths = useMemo(() => {
    if (savingsMonthly <= 0) {
      return Infinity;
    }
    return oneTimeTransitionCost / savingsMonthly;
  }, [oneTimeTransitionCost, savingsMonthly]);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h3 className="text-xl font-semibold text-white">ROI calculator</h3>
      <p className="mt-2 text-sm text-zinc-300">A simple planning tool. We’ll validate assumptions during discovery.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <label className="block" htmlFor="roi-current-monthly-cost">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Current IT cost (monthly)</span>
          </label>
          <input
            className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm text-white"
            id="roi-current-monthly-cost"
            min={0}
            name="currentMonthlyCost"
            onChange={event => setCurrentMonthlyCost(Number(event.target.value))}
            type="number"
            value={currentMonthlyCost}
          />

          <label className="block" htmlFor="roi-estimated-savings-pct">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Estimated savings (%)</span>
          </label>
          <input
            className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm text-white"
            id="roi-estimated-savings-pct"
            max={80}
            min={0}
            name="estimatedSavingsPct"
            onChange={event => setEstimatedSavingsPct(Number(event.target.value))}
            type="number"
            value={estimatedSavingsPct}
          />

          <label className="block" htmlFor="roi-one-time-transition-cost">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">One-time transition cost</span>
          </label>
          <input
            className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm text-white"
            id="roi-one-time-transition-cost"
            min={0}
            name="oneTimeTransitionCost"
            onChange={event => setOneTimeTransitionCost(Number(event.target.value))}
            type="number"
            value={oneTimeTransitionCost}
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Results</p>

          <dl className="mt-5 grid gap-4 text-sm">
            <div>
              <dt className="text-zinc-400">Estimated monthly savings</dt>
              <dd className="mt-1 text-2xl font-semibold text-white">${savingsMonthly.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-zinc-400">Payback period</dt>
              <dd className="mt-1 text-lg font-semibold text-white">
                {Number.isFinite(paybackMonths) ? `${paybackMonths.toFixed(1)} months` : '—'}
              </dd>
            </div>
          </dl>

          <ModernButton className="mt-6 w-full" href="/services#contact" variant="primary">
            Request ROI review
          </ModernButton>
        </div>
      </div>
    </section>
  );
}
