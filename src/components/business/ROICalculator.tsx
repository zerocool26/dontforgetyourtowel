import { useEffect, useMemo, useState } from 'preact/hooks';
import { withBasePath } from '../../utils/helpers';

export default function ROICalculator() {
  const [hydrated, setHydrated] = useState(false);
  const [currentMonthlyCost, setCurrentMonthlyCost] = useState(12000);
  const [estimatedSavingsPct, setEstimatedSavingsPct] = useState(20);
  const [oneTimeTransitionCost, setOneTimeTransitionCost] = useState(10000);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const currentMonthlyCostId = 'roi-current-monthly-cost';
  const estimatedSavingsPctId = 'roi-estimated-savings-pct';
  const oneTimeTransitionCostId = 'roi-one-time-transition-cost';

  const savingsMonthly = useMemo(() => {
    return Math.max(0, (currentMonthlyCost * estimatedSavingsPct) / 100);
  }, [currentMonthlyCost, estimatedSavingsPct]);

  const paybackMonths = useMemo(() => {
    if (savingsMonthly <= 0) return Infinity;
    return oneTimeTransitionCost / savingsMonthly;
  }, [oneTimeTransitionCost, savingsMonthly]);

  return (
    <section
      class="rounded-2xl border border-white/10 bg-white/5 p-6"
      data-hydrated={hydrated ? 'true' : 'false'}
    >
      <h3 class="text-xl font-semibold text-white">ROI calculator</h3>
      <p class="mt-2 text-sm text-zinc-300">
        A simple planning tool. We’ll validate assumptions during discovery.
      </p>

      <div class="mt-6 grid gap-6 lg:grid-cols-2">
        <div class="space-y-4">
          <label class="block" htmlFor={currentMonthlyCostId}>
            <span
              id={`${currentMonthlyCostId}-label`}
              class="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400"
            >
              Current IT cost (monthly)
            </span>
          </label>
          <input
            class="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm text-white"
            id={currentMonthlyCostId}
            name="currentMonthlyCost"
            type="number"
            min={0}
            value={currentMonthlyCost}
            aria-labelledby={`${currentMonthlyCostId}-label`}
            onInput={e =>
              setCurrentMonthlyCost(
                Number((e.target as HTMLInputElement).value)
              )
            }
          />

          <label class="block" htmlFor={estimatedSavingsPctId}>
            <span
              id={`${estimatedSavingsPctId}-label`}
              class="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400"
            >
              Estimated savings (%)
            </span>
          </label>
          <input
            class="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm text-white"
            id={estimatedSavingsPctId}
            name="estimatedSavingsPct"
            type="number"
            min={0}
            max={80}
            value={estimatedSavingsPct}
            aria-labelledby={`${estimatedSavingsPctId}-label`}
            onInput={e =>
              setEstimatedSavingsPct(
                Number((e.target as HTMLInputElement).value)
              )
            }
          />

          <label class="block" htmlFor={oneTimeTransitionCostId}>
            <span
              id={`${oneTimeTransitionCostId}-label`}
              class="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400"
            >
              One-time transition cost
            </span>
          </label>
          <input
            class="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm text-white"
            id={oneTimeTransitionCostId}
            name="oneTimeTransitionCost"
            type="number"
            min={0}
            value={oneTimeTransitionCost}
            aria-labelledby={`${oneTimeTransitionCostId}-label`}
            onInput={e =>
              setOneTimeTransitionCost(
                Number((e.target as HTMLInputElement).value)
              )
            }
          />
        </div>

        <div class="rounded-2xl border border-white/10 bg-zinc-950/50 p-6">
          <p class="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
            Results
          </p>

          <dl class="mt-5 grid gap-4 text-sm">
            <div>
              <dt class="text-zinc-400">Estimated monthly savings</dt>
              <dd class="mt-1 text-2xl font-semibold text-white">
                ${savingsMonthly.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt class="text-zinc-400">Payback period</dt>
              <dd class="mt-1 text-lg font-semibold text-white">
                {Number.isFinite(paybackMonths)
                  ? `${paybackMonths.toFixed(1)} months`
                  : '—'}
              </dd>
            </div>
          </dl>

          <a
            class="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-accent-500 px-4 text-sm font-semibold text-white"
            href={`${withBasePath('services/')}#contact`}
          >
            Request ROI review
          </a>
        </div>
      </div>
    </section>
  );
}
