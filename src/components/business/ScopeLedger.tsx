import { useMemo, useState } from 'preact/hooks';
import { Check, ClipboardList } from 'lucide-preact';
import type { PricingTier, ScopeLedgerDriver } from '../../data/pricing';

interface Props {
  drivers: ScopeLedgerDriver[];
  plans: PricingTier[];
  ctaHref: string;
}

const planOrder = ['core-coverage', 'secure-operations', 'co-managed', 'custom'];

export default function ScopeLedger({ drivers, plans, ctaHref }: Props) {
  const initialSelection = () =>
    new Set(
      drivers
        .filter(driver => driver.defaultSelected)
        .map(driver => driver.id)
    );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(initialSelection);

  const selectedDrivers = useMemo(
    () => drivers.filter(driver => selectedIds.has(driver.id)),
    [drivers, selectedIds]
  );

  const planCounts = useMemo(() => {
    const counts = new Map<string, number>();
    selectedDrivers.forEach(driver => {
      driver.likelyPlanIds.forEach(planId => {
        counts.set(planId, (counts.get(planId) ?? 0) + 1);
      });
    });
    return counts;
  }, [selectedDrivers]);

  const likelyPlan = selectedDrivers.length
    ? plans
      .slice()
      .sort((a, b) => {
        const countDelta = (planCounts.get(b.id) ?? 0) - (planCounts.get(a.id) ?? 0);
        if (countDelta !== 0) return countDelta;
        return planOrder.indexOf(b.id) - planOrder.indexOf(a.id);
      })[0] ?? plans[0]
    : plans[0];

  const complexity =
    selectedDrivers.length >= 7
      ? 'High'
      : selectedDrivers.length >= 4
        ? 'Moderate'
        : 'Focused';

  const evidenceList = Array.from(
    new Set(selectedDrivers.flatMap(driver => driver.evidenceToBring))
  ).slice(0, 9);

  const toggleDriver = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <section
      className="scope-ledger"
      aria-labelledby="scope-ledger-title"
      data-testid="scope-ledger"
    >
      <style>{`
        .scope-ledger {
          display: grid;
          gap: 1.1rem;
        }

        .scope-ledger__header {
          display: grid;
          gap: 0.9rem;
          max-width: 58rem;
        }

        .scope-ledger__eyebrow,
        .scope-ledger__label,
        .scope-ledger__summary-label,
        .scope-ledger__tag,
        .scope-ledger__driver-meta span {
          margin: 0;
          font-family: var(--font-mono);
          font-size: 0.64rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          line-height: 1.35;
          text-transform: uppercase;
        }

        .scope-ledger__eyebrow,
        .scope-ledger__label,
        .scope-ledger__summary-label {
          color: color-mix(in srgb, var(--color-text-muted) 92%, transparent);
        }

        .scope-ledger__header h2 {
          max-width: 14ch;
          margin: 0;
          color: var(--color-text-primary);
          font-family: var(--font-display);
          font-size: clamp(2rem, 4vw, 4rem);
          font-weight: 760;
          letter-spacing: 0;
          line-height: 0.98;
          text-wrap: balance;
        }

        .scope-ledger__header p:not(.scope-ledger__eyebrow) {
          max-width: 66ch;
          margin: 0;
          color: color-mix(in srgb, var(--color-text-secondary) 92%, transparent);
          line-height: 1.68;
        }

        .scope-ledger__grid {
          display: grid;
          gap: 1rem;
        }

        .scope-ledger__drivers,
        .scope-ledger__summary {
          border: 1px solid color-mix(in srgb, var(--color-border) 76%, transparent);
          border-radius: 12px;
          background:
            linear-gradient(
              180deg,
              color-mix(in srgb, white 3%, transparent),
              transparent 34%
            ),
            color-mix(in srgb, var(--color-surface) 88%, transparent);
          box-shadow: 0 24px 58px -48px rgba(0, 0, 0, 0.72);
          overflow: hidden;
        }

        .scope-ledger__drivers {
          display: grid;
        }

        .scope-ledger__driver {
          display: grid;
          grid-template-columns: auto minmax(0, 0.72fr) minmax(0, 1fr);
          gap: 0.9rem;
          align-items: start;
          min-height: 5.6rem;
          border: 0;
          border-bottom: 1px solid color-mix(in srgb, var(--color-border) 62%, transparent);
          background: transparent;
          color: inherit;
          padding: 1rem;
          text-align: left;
          cursor: pointer;
        }

        .scope-ledger__driver:last-child {
          border-bottom: 0;
        }

        .scope-ledger__driver:not(.is-selected) {
          grid-template-columns: auto minmax(0, 1fr);
        }

        .scope-ledger__driver:hover,
        .scope-ledger__driver.is-selected {
          background:
            linear-gradient(
              90deg,
              color-mix(in srgb, var(--color-primary) 8%, transparent),
              transparent 48%
            ),
            color-mix(in srgb, var(--color-surface) 94%, transparent);
        }

        .scope-ledger__check {
          display: inline-flex;
          width: 1.35rem;
          height: 1.35rem;
          align-items: center;
          justify-content: center;
          border: 1px solid color-mix(in srgb, var(--color-border) 84%, transparent);
          border-radius: 5px;
          color: var(--color-text-inverse);
        }

        .scope-ledger__driver.is-selected .scope-ledger__check {
          border-color: color-mix(in srgb, var(--color-primary) 70%, transparent);
          background: color-mix(in srgb, var(--color-primary) 82%, white 18%);
        }

        .scope-ledger__driver-title {
          display: grid;
          gap: 0.45rem;
        }

        .scope-ledger__driver-title strong {
          color: var(--color-text-primary);
          font-size: 1rem;
          line-height: 1.2;
        }

        .scope-ledger__driver-title small,
        .scope-ledger__driver-detail p {
          color: color-mix(in srgb, var(--color-text-secondary) 90%, transparent);
          line-height: 1.55;
        }

        .scope-ledger__driver-title small,
        .scope-ledger__driver-detail p,
        .scope-ledger__summary p,
        .scope-ledger__summary li {
          font-size: 0.9rem;
        }

        .scope-ledger__driver-detail {
          display: grid;
          gap: 0.65rem;
        }

        .scope-ledger__driver-detail p {
          margin: 0;
        }

        .scope-ledger__driver-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
        }

        .scope-ledger__driver-meta span {
          display: inline-flex;
          min-height: 1.75rem;
          align-items: center;
          border: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
          border-radius: 999px;
          padding: 0 0.62rem;
          color: color-mix(in srgb, var(--color-text-secondary) 86%, transparent);
          letter-spacing: 0.06em;
        }

        .scope-ledger__summary {
          display: grid;
          align-content: start;
          gap: 1rem;
          padding: clamp(1rem, 2vw, 1.25rem);
        }

        .scope-ledger__summary-card {
          display: grid;
          gap: 0.55rem;
          border: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
          border-radius: 10px;
          background: color-mix(in srgb, var(--color-background) 26%, transparent);
          padding: 0.95rem;
        }

        .scope-ledger__summary-card strong {
          color: var(--color-text-primary);
          font-size: clamp(1.25rem, 2.2vw, 1.65rem);
          line-height: 1.05;
        }

        .scope-ledger__summary-card p {
          margin: 0;
          color: color-mix(in srgb, var(--color-text-secondary) 92%, transparent);
          line-height: 1.58;
        }

        .scope-ledger__tag {
          display: inline-flex;
          width: fit-content;
          min-height: 1.85rem;
          align-items: center;
          border: 1px solid color-mix(in srgb, var(--color-primary) 34%, transparent);
          border-radius: 999px;
          background: color-mix(in srgb, var(--color-primary) 9%, transparent);
          color: color-mix(in srgb, var(--color-primary) 78%, white 12%);
          padding: 0 0.7rem;
        }

        .scope-ledger__summary ul {
          display: grid;
          gap: 0.55rem;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .scope-ledger__summary li {
          display: flex;
          gap: 0.55rem;
          color: color-mix(in srgb, var(--color-text-secondary) 92%, transparent);
          line-height: 1.45;
        }

        .scope-ledger__summary li span {
          width: 0.4rem;
          height: 0.4rem;
          margin-top: 0.48rem;
          flex: 0 0 auto;
          border-radius: 999px;
          background: color-mix(in srgb, var(--color-primary-strong) 84%, white 16%);
        }

        .scope-ledger__cta {
          display: inline-flex;
          gap: 0.55rem;
          min-height: 48px;
          align-items: center;
          justify-content: center;
          border: 1px solid color-mix(in srgb, var(--color-primary) 36%, transparent);
          border-radius: 8px;
          background: linear-gradient(
            135deg,
            color-mix(in srgb, var(--color-primary) 82%, white 18%),
            color-mix(in srgb, var(--color-primary-strong) 58%, white 42%)
          );
          color: var(--color-text-inverse);
          font-weight: 760;
        }

        @media (min-width: 980px) {
          .scope-ledger__grid {
            grid-template-columns: minmax(0, 1fr) minmax(21rem, 0.38fr);
            align-items: start;
          }

          .scope-ledger__summary {
            position: sticky;
            top: 5rem;
          }
        }

        @media (max-width: 760px) {
          .scope-ledger__driver {
            grid-template-columns: auto minmax(0, 1fr);
            min-height: auto;
          }

          .scope-ledger__driver-detail {
            grid-column: 1 / -1;
            padding-left: 2.25rem;
          }
        }
      `}</style>

      <div className="scope-ledger__header">
        <p className="scope-ledger__eyebrow">Scope ledger</p>
        <h2 id="scope-ledger-title">Choose what changes the monthly number.</h2>
        <p>
          Select the factors that apply. This does not create a quote, but it
          shows why pricing moves and what to send before discovery.
        </p>
      </div>

      <div className="scope-ledger__grid">
        <div className="scope-ledger__drivers" role="list">
          {drivers.map(driver => {
            const selected = selectedIds.has(driver.id);

            return (
              <button
                key={driver.id}
                type="button"
                className={`scope-ledger__driver ${selected ? 'is-selected' : ''}`}
                onClick={() => toggleDriver(driver.id)}
                aria-pressed={selected}
                data-event="scope-driver-toggle"
                data-driver-id={driver.id}
              >
                <span className="scope-ledger__check" aria-hidden="true">
                  {selected ? <Check size={14} /> : null}
                </span>
                <span className="scope-ledger__driver-title">
                  <span className="scope-ledger__label">{driver.shortLabel}</span>
                  <strong>{driver.label}</strong>
                  <small>{driver.whyItMovesCost}</small>
                </span>
                {selected ? (
                  <span className="scope-ledger__driver-detail">
                    <p>
                      <strong>Recurring:</strong> {driver.recurringImpact}
                    </p>
                    <p>
                      <strong>Project:</strong> {driver.projectImpact}
                    </p>
                    <span className="scope-ledger__driver-meta">
                      <span>Discovery: {driver.discoveryTrigger}</span>
                    </span>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <aside
          className="scope-ledger__summary"
          aria-label="Scope summary"
          aria-live="polite"
        >
          <div className="scope-ledger__summary-card">
            <span className="scope-ledger__summary-label">Likely fit</span>
            <strong>{likelyPlan?.name ?? 'Discovery needed'}</strong>
            <p>{likelyPlan?.description ?? 'A scoped review is the right next step.'}</p>
            <span className="scope-ledger__tag">{complexity} complexity</span>
          </div>

          <div className="scope-ledger__summary-card">
            <span className="scope-ledger__summary-label">Selected drivers</span>
            <strong>{selectedDrivers.length || 0}</strong>
            <p>
              {selectedDrivers.length
                ? 'These factors should be discussed before anyone promises a final number.'
                : 'Select at least one driver to shape the pricing conversation.'}
            </p>
          </div>

          <div className="scope-ledger__summary-card">
            <span className="scope-ledger__summary-label">Bring these notes</span>
            <ul>
              {(evidenceList.length ? evidenceList : ['Rough user count', 'Current provider concern', 'Known timing constraints']).map(
                item => (
                  <li key={item}>
                    <span />
                    {item}
                  </li>
                )
              )}
            </ul>
          </div>

          <a className="scope-ledger__cta" href={ctaHref}>
            <ClipboardList aria-hidden="true" size={18} />
            <span>Send scope context</span>
          </a>
        </aside>
      </div>
    </section>
  );
}
