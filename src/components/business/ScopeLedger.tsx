import { useMemo, useRef, useState } from 'preact/hooks';
import { Check, Copy, Send } from 'lucide-preact';
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
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>(
    'idle'
  );
  const driverRefs = useRef<Array<HTMLButtonElement | null>>([]);

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

  const recurringSignals = selectedDrivers
    .map(driver => `${driver.shortLabel}: ${driver.recurringImpact}`)
    .slice(0, 4);
  const projectSignals = selectedDrivers
    .map(driver => `${driver.shortLabel}: ${driver.projectImpact}`)
    .slice(0, 4);
  const discoverySignals = selectedDrivers
    .map(driver => `${driver.shortLabel}: ${driver.discoveryTrigger}`)
    .slice(0, 4);

  const activeBrief = useMemo(() => {
    const driverList = selectedDrivers.length
      ? selectedDrivers.map(driver => driver.label).join('; ')
      : 'No drivers selected yet.';

    return [
      'Pricing scope brief',
      `Likely plan fit: ${likelyPlan?.name ?? 'Discovery needed'}`,
      `Budget shape: ${complexity} complexity with ${selectedDrivers.length} selected driver${selectedDrivers.length === 1 ? '' : 's'}.`,
      `Selected drivers: ${driverList}`,
      `Recurring signals: ${recurringSignals.length ? recurringSignals.join(' | ') : 'Confirm support baseline.'}`,
      `Project signals: ${projectSignals.length ? projectSignals.join(' | ') : 'No project pressure selected yet.'}`,
      `Discovery triggers: ${discoverySignals.length ? discoverySignals.join(' | ') : 'Confirm timing, owner, and current provider context.'}`,
      `Evidence to bring: ${evidenceList.length ? evidenceList.join(', ') : 'Rough user count, current provider concern, known timing constraints.'}`,
    ].join('\n');
  }, [
    complexity,
    discoverySignals,
    evidenceList,
    likelyPlan,
    projectSignals,
    recurringSignals,
    selectedDrivers,
  ]);

  const intakeHref = useMemo(() => {
    if (typeof window === 'undefined') return ctaHref;

    try {
      const url = new URL(ctaHref, window.location.origin);
      url.searchParams.set('service', 'pricing-scope');
      url.searchParams.set('brief', activeBrief);
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return ctaHref;
    }
  }, [activeBrief, ctaHref]);

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
    setCopyState('idle');
  };

  const copyBrief = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      setCopyState('failed');
      return;
    }

    try {
      await navigator.clipboard.writeText(activeBrief);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  };

  const focusDriver = (index: number) => {
    driverRefs.current[index]?.focus();
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
        .scope-ledger__driver-meta span,
        .scope-ledger__brief-label {
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
          grid-template-columns: auto minmax(11rem, 0.52fr) minmax(0, 1fr);
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

        .scope-ledger__driver:focus-visible,
        .scope-ledger__cta:focus-visible,
        .scope-ledger__copy:focus-visible,
        .scope-ledger__brief:focus-visible {
          outline: 2px solid color-mix(in srgb, var(--color-primary) 62%, white);
          outline-offset: 3px;
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

        .scope-ledger__driver-detail strong {
          color: var(--color-text-primary);
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

        .scope-ledger__budget-grid {
          display: grid;
          gap: 0.6rem;
        }

        .scope-ledger__budget-grid div {
          display: grid;
          gap: 0.25rem;
          border: 1px solid color-mix(in srgb, var(--color-border) 62%, transparent);
          border-radius: 8px;
          background: color-mix(in srgb, var(--color-background) 22%, transparent);
          padding: 0.75rem;
        }

        .scope-ledger__budget-grid strong {
          color: var(--color-text-primary);
          font-size: 0.92rem;
          line-height: 1.25;
        }

        .scope-ledger__budget-grid span {
          color: color-mix(in srgb, var(--color-text-secondary) 88%, transparent);
          font-size: 0.84rem;
          line-height: 1.45;
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

        .scope-ledger__brief {
          max-height: 16rem;
          margin: 0;
          overflow: auto;
          white-space: pre-wrap;
          word-break: break-word;
          border: 1px solid color-mix(in srgb, var(--color-ink) 14%, transparent);
          border-radius: 8px;
          background:
            repeating-linear-gradient(
              0deg,
              transparent 0 2.75rem,
              color-mix(in srgb, var(--color-ink) 6%, transparent) 2.75rem
                calc(2.75rem + 1px)
            ),
            var(--color-paper);
          color: var(--color-ink);
          padding: 0.85rem;
          font-size: 0.78rem;
          line-height: 1.52;
        }

        .scope-ledger__brief-label {
          color: color-mix(in srgb, var(--color-text-muted) 92%, transparent);
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
          text-decoration: none;
        }

        .scope-ledger__copy {
          display: inline-flex;
          gap: 0.55rem;
          min-height: 48px;
          align-items: center;
          justify-content: center;
          border: 1px solid color-mix(in srgb, var(--color-border) 72%, transparent);
          border-radius: 8px;
          background: color-mix(in srgb, white 5%, transparent);
          color: var(--color-text-primary);
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

        @media (min-width: 1180px) {
          .scope-ledger__driver-detail {
            grid-template-columns: repeat(3, minmax(0, 1fr));
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
          {drivers.map((driver, index) => {
            const selected = selectedIds.has(driver.id);

            return (
              <button
                key={driver.id}
                ref={node => {
                  driverRefs.current[index] = node;
                }}
                type="button"
                className={`scope-ledger__driver ${selected ? 'is-selected' : ''}`}
                onClick={() => toggleDriver(driver.id)}
                onKeyDown={event => {
                  if (
                    ![
                      'ArrowDown',
                      'ArrowRight',
                      'ArrowUp',
                      'ArrowLeft',
                      'Home',
                      'End',
                    ].includes(event.key)
                  ) {
                    return;
                  }

                  event.preventDefault();

                  if (event.key === 'Home') {
                    focusDriver(0);
                    return;
                  }

                  if (event.key === 'End') {
                    focusDriver(drivers.length - 1);
                    return;
                  }

                  const direction =
                    event.key === 'ArrowDown' || event.key === 'ArrowRight'
                      ? 1
                      : -1;
                  const nextIndex =
                    (index + direction + drivers.length) % drivers.length;
                  focusDriver(nextIndex);
                }}
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
            <span className="scope-ledger__summary-label">Budget shape</span>
            <div className="scope-ledger__budget-grid">
              <div>
                <strong>Recurring scope</strong>
                <span>
                  {selectedDrivers.length
                    ? `${selectedDrivers.length} operating lane${selectedDrivers.length === 1 ? '' : 's'} to price monthly.`
                    : 'Select drivers to see monthly ownership.'}
                </span>
              </div>
              <div>
                <strong>Project scope</strong>
                <span>
                  {projectSignals.length
                    ? `${projectSignals.length} possible one-time workstream${projectSignals.length === 1 ? '' : 's'}.`
                    : 'No project pressure selected yet.'}
                </span>
              </div>
              <div>
                <strong>Discovery needed</strong>
                <span>
                  {discoverySignals.length
                    ? 'Confirm owners, timing, risk, and current-state evidence.'
                    : 'Start with users, devices, provider context, and timing.'}
                </span>
              </div>
            </div>
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

          <div className="scope-ledger__summary-card">
            <span className="scope-ledger__brief-label">Generated pricing brief</span>
            <pre className="scope-ledger__brief" tabIndex={0}>
              {activeBrief}
            </pre>
            <button type="button" className="scope-ledger__copy" onClick={copyBrief}>
              <Copy aria-hidden="true" size={18} />
              <span>{copyState === 'copied' ? 'Brief copied' : 'Copy brief'}</span>
            </button>
            <p aria-live="polite">
              {copyState === 'failed'
                ? 'Copy was not available. The brief is still visible.'
                : copyState === 'copied'
                  ? 'Scope brief copied for leadership or intake.'
                  : 'Use this as the first note before an exact quote.'}
            </p>
          </div>

          <a className="scope-ledger__cta" href={intakeHref}>
            <Send aria-hidden="true" size={18} />
            <span>Send scope context</span>
          </a>
        </aside>
      </div>
    </section>
  );
}
