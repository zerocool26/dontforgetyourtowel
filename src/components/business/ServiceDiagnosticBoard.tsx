import type { JSX } from 'preact';
import { useMemo, useRef, useState } from 'preact/hooks';
import { ArrowRight, ClipboardCheck, ListChecks, ShieldCheck } from 'lucide-preact';
import type { ServiceDiagnosticView } from '../../data/service-diagnostics';

interface Props {
  diagnostics: ServiceDiagnosticView[];
  defaultDiagnosticId?: string;
}

const statusCopy: Record<ServiceDiagnosticView['status'], string> = {
  clear: 'Clear',
  review: 'Review',
  planned: 'Planned',
  risk: 'Risk',
};

const resolveHref = (href: string) => href || '#';

export default function ServiceDiagnosticBoard({
  diagnostics,
  defaultDiagnosticId,
}: Props) {
  const fallbackId = diagnostics[0]?.id ?? '';
  const [activeId, setActiveId] = useState(defaultDiagnosticId ?? fallbackId);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activeIndex = useMemo(() => {
    const index = diagnostics.findIndex(diagnostic => diagnostic.id === activeId);
    return index >= 0 ? index : 0;
  }, [activeId, diagnostics]);

  const active = diagnostics[activeIndex];

  const selectDiagnostic = (index: number, focus = false) => {
    const next = diagnostics[index];
    if (!next) return;

    setActiveId(next.id);

    if (focus) {
      window.requestAnimationFrame(() => tabRefs.current[index]?.focus());
    }
  };

  const handleTabKeyDown = (
    event: JSX.TargetedKeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    const lastIndex = diagnostics.length - 1;
    let nextIndex = index;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = index === lastIndex ? 0 : index + 1;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = index === 0 ? lastIndex : index - 1;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = lastIndex;
    } else {
      return;
    }

    event.preventDefault();
    selectDiagnostic(nextIndex, true);
  };

  if (!active) return null;

  return (
    <section
      className="service-diagnostic"
      aria-labelledby="service-diagnostic-title"
      data-testid="service-diagnostic-board"
    >
      <style>{`
        .service-diagnostic {
          display: grid;
          gap: clamp(1rem, 2vw, 1.35rem);
        }

        .service-diagnostic__header {
          display: grid;
          gap: 0.85rem;
          max-width: 66rem;
        }

        .service-diagnostic__eyebrow,
        .service-diagnostic__label,
        .service-diagnostic__micro,
        .service-diagnostic__panel-label,
        .service-diagnostic__artifact-label,
        .service-diagnostic__status {
          margin: 0;
          font-family: var(--font-mono);
          font-size: 0.64rem;
          font-weight: 820;
          letter-spacing: 0.12em;
          line-height: 1.35;
          text-transform: uppercase;
        }

        .service-diagnostic__eyebrow,
        .service-diagnostic__label,
        .service-diagnostic__panel-label,
        .service-diagnostic__artifact-label {
          color: color-mix(in srgb, var(--color-text-muted) 92%, transparent);
        }

        .service-diagnostic__header h2 {
          max-width: 15ch;
          margin: 0;
          color: var(--color-text-primary);
          font-family: var(--font-display);
          font-size: clamp(2.15rem, 4.5vw, 4.4rem);
          font-weight: 780;
          letter-spacing: 0;
          line-height: 0.98;
          text-wrap: balance;
        }

        .service-diagnostic__header p:not(.service-diagnostic__eyebrow) {
          max-width: 68ch;
          margin: 0;
          color: color-mix(in srgb, var(--color-text-secondary) 91%, transparent);
          line-height: 1.65;
        }

        .service-diagnostic__grid {
          display: grid;
          gap: 1rem;
          align-items: start;
        }

        .service-diagnostic__tabs,
        .service-diagnostic__panel,
        .service-diagnostic__artifact {
          border: 1px solid color-mix(in srgb, var(--color-border) 74%, transparent);
          border-radius: 8px;
          background:
            linear-gradient(
              145deg,
              color-mix(in srgb, var(--color-primary) 7%, transparent),
              transparent 38%
            ),
            color-mix(in srgb, var(--color-surface) 88%, transparent);
          box-shadow: 0 28px 68px -54px rgba(0, 0, 0, 0.76);
        }

        .service-diagnostic__tabs {
          display: grid;
          overflow: hidden;
        }

        .service-diagnostic__tab {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 0.75rem;
          align-items: center;
          min-height: 4.85rem;
          border: 0;
          border-bottom: 1px solid color-mix(in srgb, var(--color-border) 58%, transparent);
          background: transparent;
          color: inherit;
          cursor: pointer;
          font: inherit;
          padding: 0.9rem;
          text-align: left;
        }

        .service-diagnostic__tab:last-child {
          border-bottom: 0;
        }

        .service-diagnostic__tab:hover,
        .service-diagnostic__tab.is-active {
          background:
            linear-gradient(
              90deg,
              color-mix(in srgb, var(--color-primary) 9%, transparent),
              transparent 48%
            ),
            color-mix(in srgb, var(--color-surface) 94%, transparent);
        }

        .service-diagnostic__tab:focus-visible,
        .service-diagnostic__cta:focus-visible,
        .service-diagnostic__secondary:focus-visible {
          outline: 2px solid color-mix(in srgb, var(--color-primary) 78%, white 8%);
          outline-offset: 2px;
        }

        .service-diagnostic__mark {
          display: inline-flex;
          width: 2rem;
          height: 2rem;
          align-items: center;
          justify-content: center;
          border: 1px solid color-mix(in srgb, var(--color-border) 76%, transparent);
          border-radius: 7px;
          color: color-mix(in srgb, var(--color-text-muted) 80%, transparent);
        }

        .service-diagnostic__tab.is-active .service-diagnostic__mark {
          border-color: color-mix(in srgb, var(--color-primary) 72%, transparent);
          background: color-mix(in srgb, var(--color-primary) 82%, white 18%);
          color: var(--color-text-inverse);
        }

        .service-diagnostic__tab-copy {
          display: grid;
          gap: 0.24rem;
          min-width: 0;
        }

        .service-diagnostic__tab-copy strong {
          color: var(--color-text-primary);
          font-size: 1rem;
          line-height: 1.2;
        }

        .service-diagnostic__tab-copy span:not(.service-diagnostic__label) {
          color: color-mix(in srgb, var(--color-text-secondary) 86%, transparent);
          font-size: 0.86rem;
          line-height: 1.44;
        }

        .service-diagnostic__tab-arrow {
          color: color-mix(in srgb, var(--color-primary) 78%, white 12%);
        }

        .service-diagnostic__panel {
          display: grid;
          gap: clamp(1rem, 2vw, 1.2rem);
          min-height: 34rem;
          overflow: hidden;
          padding: clamp(1rem, 2.3vw, 1.35rem);
        }

        .service-diagnostic__panel-main {
          display: grid;
          gap: 0.85rem;
        }

        .service-diagnostic__lane {
          display: inline-flex;
          width: fit-content;
          min-height: 2rem;
          align-items: center;
          border: 1px solid color-mix(in srgb, var(--color-primary) 34%, transparent);
          border-radius: 999px;
          background: color-mix(in srgb, var(--color-primary) 10%, transparent);
          color: color-mix(in srgb, var(--color-primary) 82%, white 10%);
          padding: 0 0.75rem;
          font-family: var(--font-mono);
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          line-height: 1.2;
          text-transform: uppercase;
        }

        .service-diagnostic__panel h3 {
          max-width: 21ch;
          margin: 0;
          color: var(--color-text-primary);
          font-family: var(--font-display);
          font-size: clamp(1.55rem, 2.7vw, 2.45rem);
          font-weight: 760;
          letter-spacing: 0;
          line-height: 1.02;
          text-wrap: balance;
        }

        .service-diagnostic__panel-main p {
          max-width: 62ch;
          margin: 0;
          color: color-mix(in srgb, var(--color-text-secondary) 90%, transparent);
          line-height: 1.6;
        }

        .service-diagnostic__facts {
          display: grid;
          gap: 0.85rem;
        }

        .service-diagnostic__fact,
        .service-diagnostic__risk {
          display: grid;
          gap: 0.55rem;
          border: 1px solid color-mix(in srgb, var(--color-border) 66%, transparent);
          border-radius: 8px;
          background: color-mix(in srgb, var(--color-background) 22%, transparent);
          padding: 0.95rem;
        }

        .service-diagnostic__fact strong,
        .service-diagnostic__risk strong {
          color: var(--color-text-primary);
          font-size: 1rem;
          line-height: 1.24;
        }

        .service-diagnostic__fact p,
        .service-diagnostic__risk p,
        .service-diagnostic__inspection li {
          margin: 0;
          color: color-mix(in srgb, var(--color-text-secondary) 90%, transparent);
          font-size: 0.92rem;
          line-height: 1.55;
        }

        .service-diagnostic__inspection {
          display: grid;
          gap: 0.58rem;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .service-diagnostic__inspection li {
          display: flex;
          gap: 0.55rem;
        }

        .service-diagnostic__inspection svg {
          margin-top: 0.14rem;
          flex: 0 0 auto;
          color: color-mix(in srgb, var(--color-primary-strong) 88%, white 10%);
        }

        .service-diagnostic__artifact {
          display: grid;
          gap: 0.8rem;
          align-content: start;
          background:
            repeating-linear-gradient(
              0deg,
              transparent 0 3.15rem,
              color-mix(in srgb, var(--color-ink) 8%, transparent) 3.15rem
                calc(3.15rem + 1px)
            ),
            linear-gradient(
              135deg,
              color-mix(in srgb, white 72%, var(--color-paper) 28%),
              var(--color-paper)
            );
          color: var(--color-ink);
          padding: 1rem;
        }

        .service-diagnostic__artifact p,
        .service-diagnostic__artifact strong,
        .service-diagnostic__artifact span {
          margin: 0;
        }

        .service-diagnostic__artifact-label {
          color: color-mix(in srgb, var(--color-ink) 62%, transparent);
        }

        .service-diagnostic__artifact strong {
          color: var(--color-ink);
          font-family: var(--font-display);
          font-size: clamp(1.2rem, 2vw, 1.55rem);
          line-height: 1.06;
        }

        .service-diagnostic__artifact p:not(.service-diagnostic__artifact-label) {
          color: color-mix(in srgb, var(--color-ink) 76%, transparent);
          font-size: 0.88rem;
          line-height: 1.5;
        }

        .service-diagnostic__status {
          display: inline-flex;
          width: fit-content;
          min-height: 1.85rem;
          align-items: center;
          border: 1px solid color-mix(in srgb, var(--color-ink) 18%, transparent);
          border-radius: 999px;
          color: color-mix(in srgb, var(--color-ink) 70%, transparent);
          padding: 0 0.65rem;
        }

        .service-diagnostic__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.7rem;
          align-items: center;
        }

        .service-diagnostic__cta,
        .service-diagnostic__secondary {
          display: inline-flex;
          min-height: 48px;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          border-radius: 8px;
          padding: 0 0.95rem;
          font-weight: 760;
          text-decoration: none;
        }

        .service-diagnostic__cta {
          border: 1px solid color-mix(in srgb, var(--color-primary) 36%, transparent);
          background: linear-gradient(
            135deg,
            color-mix(in srgb, var(--color-primary) 82%, white 18%),
            color-mix(in srgb, var(--color-primary-strong) 58%, white 42%)
          );
          color: var(--color-text-inverse);
        }

        .service-diagnostic__secondary {
          border: 1px solid color-mix(in srgb, var(--color-border) 72%, transparent);
          background: color-mix(in srgb, var(--color-surface) 82%, transparent);
          color: color-mix(in srgb, var(--color-text-primary) 86%, transparent);
        }

        @media (min-width: 980px) {
          .service-diagnostic__grid {
            grid-template-columns: minmax(18rem, 0.4fr) minmax(0, 1fr);
          }

          .service-diagnostic__panel {
            grid-template-columns: minmax(0, 1fr) minmax(17rem, 0.36fr);
          }

          .service-diagnostic__artifact {
            align-self: start;
            position: sticky;
            top: 5rem;
          }
        }

        @media (min-width: 720px) {
          .service-diagnostic__facts {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .service-diagnostic__tabs {
            display: flex;
            gap: 0;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
          }

          .service-diagnostic__tab {
            flex: 0 0 min(20rem, 88vw);
            border-right: 1px solid color-mix(in srgb, var(--color-border) 58%, transparent);
            border-bottom: 0;
            scroll-snap-align: start;
          }

          .service-diagnostic__tab-arrow {
            display: none;
          }

          .service-diagnostic__panel {
            min-height: auto;
          }

          .service-diagnostic__actions > * {
            width: 100%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .service-diagnostic__tab,
          .service-diagnostic__cta,
          .service-diagnostic__secondary {
            transition: none;
          }
        }
      `}</style>

      <div className="service-diagnostic__header">
        <p className="service-diagnostic__eyebrow">Service diagnostic board</p>
        <h2 id="service-diagnostic-title">
          Choose the symptom before the service.
        </h2>
        <p>
          The first lane gets clearer when the pressure, first checks, output
          artifact, and risk are visible before the catalog opens.
        </p>
      </div>

      <div className="service-diagnostic__grid">
        <div
          className="service-diagnostic__tabs"
          role="tablist"
          aria-label="Service symptoms"
        >
          {diagnostics.map((diagnostic, index) => {
            const selected = index === activeIndex;

            return (
              <button
                key={diagnostic.id}
                ref={element => {
                  tabRefs.current[index] = element;
                }}
                id={`service-diagnostic-tab-${diagnostic.id}`}
                type="button"
                role="tab"
                className={`service-diagnostic__tab ${selected ? 'is-active' : ''}`}
                aria-selected={selected}
                aria-controls="service-diagnostic-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => selectDiagnostic(index)}
                onKeyDown={event => handleTabKeyDown(event, index)}
                data-event="service-symptom-select"
                data-symptom-id={diagnostic.id}
              >
                <span className="service-diagnostic__mark" aria-hidden="true">
                  {selected ? <ClipboardCheck size={16} /> : <ListChecks size={15} />}
                </span>
                <span className="service-diagnostic__tab-copy">
                  <span className="service-diagnostic__label">{diagnostic.label}</span>
                  <strong>{diagnostic.symptom}</strong>
                  {selected ? null : <span>{diagnostic.serviceLane}</span>}
                </span>
                <ArrowRight
                  className="service-diagnostic__tab-arrow"
                  aria-hidden="true"
                  size={17}
                />
              </button>
            );
          })}
        </div>

        <div
          className="service-diagnostic__panel"
          id="service-diagnostic-panel"
          role="tabpanel"
          aria-labelledby={`service-diagnostic-tab-${active.id}`}
          aria-live="polite"
        >
          <div className="service-diagnostic__panel-main">
            <span className="service-diagnostic__lane">{active.serviceLane}</span>
            <h3>{active.symptom}</h3>
            <p>{active.usuallyMeans}</p>

            <div className="service-diagnostic__facts">
              <div className="service-diagnostic__fact">
                <span className="service-diagnostic__panel-label">
                  First inspection
                </span>
                <ul className="service-diagnostic__inspection">
                  {active.firstInspection.map(item => (
                    <li key={item}>
                      <ShieldCheck aria-hidden="true" size={15} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="service-diagnostic__fact">
                <span className="service-diagnostic__panel-label">
                  Best first action
                </span>
                <strong>{active.bestFirstAction}</strong>
                <p>
                  Use this as the first conversation lane before opening the
                  full service catalog.
                </p>
              </div>
            </div>

            <div className="service-diagnostic__risk">
              <span className="service-diagnostic__panel-label">
                Risk if ignored
              </span>
              <strong>{active.riskIfIgnored}</strong>
            </div>

            <div className="service-diagnostic__actions">
              <a className="service-diagnostic__cta" href={active.ctaHref}>
                <ClipboardCheck aria-hidden="true" size={18} />
                <span>Start fit check</span>
              </a>
              <a
                className="service-diagnostic__secondary"
                href={resolveHref(active.secondaryHref)}
              >
                {active.secondaryLabel}
              </a>
            </div>
          </div>

          <aside
            className="service-diagnostic__artifact"
            aria-label="Selected service artifact"
          >
            <span className="service-diagnostic__artifact-label">
              Output artifact
            </span>
            <strong>{active.outputArtifact}</strong>
            <p>
              The artifact keeps the conversation about owners, evidence, scope,
              and the next decision.
            </p>
            <span className="service-diagnostic__status">
              {statusCopy[active.status]}: {active.statusLabel}
            </span>
            <p>
              Bring rough context. The first reply should confirm the lane,
              missing facts, and the next move.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
