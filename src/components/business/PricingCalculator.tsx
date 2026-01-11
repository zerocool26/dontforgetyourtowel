import { useMemo, useState } from 'preact/hooks';
import { withBasePath } from '../../utils/helpers';

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

  const usersId = 'pricing-users';

  const base = useMemo(() => users * PRICES_PER_USER[tier], [users, tier]);
  const addOnTotal = useMemo(() => {
    let sum = 0;
    for (const a of ADD_ONS) if (addons.has(a.id)) sum += a.monthly;
    return sum;
  }, [addons]);

  const total = base + addOnTotal;

  return (
    <section class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h3 class="text-xl font-semibold text-white">Pricing calculator</h3>
      <p class="mt-2 text-sm text-zinc-300">
        Estimate monthly spend for managed services. Final quotes vary by device
        counts, compliance scope, and SLA.
      </p>

      <div class="mt-6 grid gap-6 lg:grid-cols-2">
        <div class="space-y-5">
          <label class="block" htmlFor={usersId}>
            <span
              id={`${usersId}-label`}
              class="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400"
            >
              Users: {users}
            </span>
          </label>
          <input
              class="mt-3 w-full"
              id={usersId}
              name="users"
              type="range"
              min={10}
              max={500}
              value={users}
              aria-labelledby={`${usersId}-label`}
              onInput={e =>
                setUsers(Number((e.target as HTMLInputElement).value))
              }
            />
            <div class="mt-1 flex justify-between text-xs text-zinc-500">
              <span>10</span>
              <span>500</span>
            </div>

          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
              Tier
            </p>
            <div class="mt-3 grid grid-cols-2 gap-3">
              {(['bronze', 'silver', 'gold', 'platinum'] as Tier[]).map(t => (
                <button
                  key={t}
                  type="button"
                  class={
                    `min-h-[48px] rounded-xl border px-4 text-sm font-semibold ` +
                    (tier === t
                      ? 'border-accent-500 bg-accent-500/15 text-white'
                      : 'border-white/10 bg-zinc-950/40 text-zinc-200 hover:border-white/20')
                  }
                  onClick={() => setTier(t)}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
              Add-ons
            </p>
            <div class="mt-3 space-y-3">
              {ADD_ONS.map(a => (
                <label
                  key={a.id}
                  class="flex items-start gap-3 rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-200"
                >
                  <input
                    type="checkbox"
                    class="mt-1"
                    aria-label={a.label}
                    checked={addons.has(a.id)}
                    onChange={e => {
                      const checked = (e.target as HTMLInputElement).checked;
                      setAddons(prev => {
                        const next = new Set(prev);
                        if (checked) next.add(a.id);
                        else next.delete(a.id);
                        return next;
                      });
                    }}
                  />
                  <div class="flex-1">
                    <p class="font-semibold text-white">{a.label}</p>
                    <p class="text-xs text-zinc-400">
                      +${a.monthly.toLocaleString()}/mo
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-white/10 bg-zinc-950/50 p-6">
          <p class="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
            Estimated monthly total
          </p>
          <p class="mt-3 text-4xl font-semibold text-white">
            ${total.toLocaleString()}
          </p>
          <dl class="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt class="text-zinc-400">Base</dt>
              <dd class="mt-1 font-semibold text-white">
                ${base.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt class="text-zinc-400">Add-ons</dt>
              <dd class="mt-1 font-semibold text-white">
                ${addOnTotal.toLocaleString()}
              </dd>
            </div>
          </dl>

          <a
            class="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-accent-500 px-4 text-sm font-semibold text-white"
            href={withBasePath('/#consultation')}
          >
            Get a detailed quote
          </a>

          <p class="mt-3 text-xs text-zinc-500">
            Tip: For device-based pricing (servers/workstations), we’ll scope
            your inventory during the consultation.
          </p>
        </div>
      </div>
    </section>
  );
}
