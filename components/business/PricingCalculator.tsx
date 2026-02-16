'use client';

import { useMemo, useState } from 'react';
import ModernButton from '../ui/ModernButton';

type Tier = 'bronze' | 'silver' | 'gold' | 'platinum';

const PRICES_PER_USER: Record<Tier, number> = {
  bronze: 100,
  silver: 150,
  gold: 200,
  platinum: 250,
};

const ADD_ONS = [
  { id: 'soc', label: 'Managed SOC / SIEM', monthly: 1500 },
  { id: 'backup', label: 'Cloud backup + DR testing', monthly: 600 },
  { id: 'training', label: 'Security awareness training', monthly: 300 },
] as const;

type AddOnId = (typeof ADD_ONS)[number]['id'];

export default function PricingCalculator() {
  const [users, setUsers] = useState(25);
  const [tier, setTier] = useState<Tier>('silver');
  const [addons, setAddons] = useState<Set<AddOnId>>(new Set());

  const base = useMemo(() => users * PRICES_PER_USER[tier], [users, tier]);
  const addOnTotal = useMemo(() => {
    let sum = 0;
    for (const addon of ADD_ONS) {
      if (addons.has(addon.id)) {
        sum += addon.monthly;
      }
    }
    return sum;
  }, [addons]);

  const total = base + addOnTotal;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h3 className="text-xl font-semibold text-white">Pricing calculator</h3>
      <p className="mt-2 text-sm text-zinc-300">
        Estimate monthly spend for managed services. Final quotes vary by device counts, compliance scope, and SLA.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <label className="block" htmlFor="pricing-users">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Users: {users}</span>
          </label>
          <input
            className="mt-3 w-full"
            id="pricing-users"
            max={500}
            min={10}
            name="users"
            onChange={event => setUsers(Number(event.target.value))}
            type="range"
            value={users}
          />
          <div className="mt-1 flex justify-between text-xs text-zinc-500">
            <span>10</span>
            <span>500</span>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Tier</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {(['bronze', 'silver', 'gold', 'platinum'] as Tier[]).map(currentTier => (
                <button
                  className={
                    `min-h-[48px] rounded-xl border px-4 text-sm font-semibold ` +
                    (tier === currentTier
                      ? 'border-accent-500 bg-accent-500/15 text-white'
                      : 'border-white/10 bg-zinc-950/40 text-zinc-200 hover:border-white/20')
                  }
                  key={currentTier}
                  onClick={() => setTier(currentTier)}
                  type="button"
                >
                  {currentTier.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Add-ons</p>
            <div className="mt-3 space-y-3">
              {ADD_ONS.map(addon => (
                <label
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-200"
                  key={addon.id}
                >
                  <input
                    aria-label={addon.label}
                    checked={addons.has(addon.id)}
                    className="mt-1"
                    onChange={event => {
                      const checked = event.target.checked;
                      setAddons(prev => {
                        const next = new Set(prev);
                        if (checked) {
                          next.add(addon.id);
                        } else {
                          next.delete(addon.id);
                        }
                        return next;
                      });
                    }}
                    type="checkbox"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-white">{addon.label}</p>
                    <p className="text-xs text-zinc-400">+${addon.monthly.toLocaleString()}/mo</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Estimated monthly total</p>
          <p className="mt-3 text-4xl font-semibold text-white">${total.toLocaleString()}</p>
          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-zinc-400">Base</dt>
              <dd className="mt-1 font-semibold text-white">${base.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-zinc-400">Add-ons</dt>
              <dd className="mt-1 font-semibold text-white">${addOnTotal.toLocaleString()}</dd>
            </div>
          </dl>

          <ModernButton className="mt-6 w-full" href="/services#contact" variant="primary">
            Request a quote
          </ModernButton>

          <p className="mt-3 text-xs text-zinc-500">
            Tip: For device-based pricing (servers/workstations), we’ll scope your inventory during discovery.
          </p>
        </div>
      </div>
    </section>
  );
}