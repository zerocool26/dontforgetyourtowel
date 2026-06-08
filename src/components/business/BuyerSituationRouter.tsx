import { useMemo, useState } from 'preact/hooks';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Route,
  ShieldCheck,
} from 'lucide-preact';
import type { BuyerSituation } from '../../data/buyer-situations';

interface Props {
  situations: BuyerSituation[];
  contactHref: string;
  pricingHref: string;
  trustHref: string;
  defaultSituationId?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
}

const appendParams = (
  href: string,
  params: Record<string, string | undefined>
) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });

  const query = search.toString();
  if (!query) return href;

  return `${href}${href.includes('?') ? '&' : '?'}${query}`;
};

export default function BuyerSituationRouter({
  situations,
  contactHref,
  pricingHref,
  trustHref,
  defaultSituationId,
  eyebrow = 'Decision router',
  title = 'Start with what is actually happening.',
  description = 'Choose the pressure point. The page will show the first owner, what should be checked, what proof to bring, and the contact path that fits.',
}: Props) {
  const fallbackId = situations[0]?.id ?? '';
  const [activeId, setActiveId] = useState(defaultSituationId ?? fallbackId);
  const [copied, setCopied] = useState(false);

  const active = useMemo(
    () =>
      situations.find(situation => situation.id === activeId) ??
      situations[0],
    [activeId, situations]
  );

  const contactUrl = active
    ? appendParams(contactHref, {
        service: active.serviceParam,
        brief: active.contactBrief,
        source: 'situation-router',
      })
    : contactHref;

  const generatedBrief = active
    ? [
        `Situation: ${active.title}`,
        `First owner: ${active.firstOwner}`,
        `First move: ${active.firstMove}`,
        `Bring: ${active.proofToAskFor.join('; ')}`,
      ].join('\n')
    : '';

  const copyBrief = async () => {
    if (!generatedBrief || typeof navigator === 'undefined') return;

    try {
      await navigator.clipboard.writeText(generatedBrief);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  if (!active) return null;

  return (
    <section
      className="buyer-router"
      aria-labelledby="buyer-router-title"
      data-testid="buyer-situation-router"
    >
      <style>{`
        .buyer-router {
          display: grid;
          gap: clamp(1rem, 2vw, 1.25rem);
        }

        .buyer-router__header {
          display: grid;
          gap: 0.85rem;
          max-width: 64rem;
        }

        .buyer-router__eyebrow,
        .buyer-router__label,
        .buyer-router__micro,
        .buyer-router__panel-title,
        .buyer-router__brief-label {
          margin: 0;
          font-family: var(--font-mono);
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          line-height: 1.35;
          text-transform: uppercase;
        }

        .buyer-router__eyebrow,
        .buyer-router__label,
        .buyer-router__panel-title,
        .buyer-router__brief-label {
          color: color-mix(in srgb, var(--color-text-muted) 92%, transparent);
        }

        .buyer-router__header h2 {
          max-width: 15ch;
          margin: 0;
          color: var(--color-text-primary);
          font-family: var(--font-display);
          font-size: clamp(2.25rem, 4.8vw, 4.8rem);
          font-weight: 780;
          letter-spacing: 0;
          line-height: 0.96;
          text-wrap: balance;
        }

        .buyer-router__header p:not(.buyer-router__eyebrow) {
          max-width: 68ch;
          margin: 0;
          color: color-mix(in srgb, var(--color-text-secondary) 90%, transparent);
          line-height: 1.65;
        }

        .buyer-router__grid {
          display: grid;
          gap: 1rem;
        }

        .buyer-router__list,
        .buyer-router__stage,
        .buyer-router__brief {
          border: 1px solid color-mix(in srgb, var(--color-border) 72%, transparent);
          border-radius: 12px;
          background:
            linear-gradient(
              145deg,
              color-mix(in srgb, var(--color-primary) 7%, transparent),
              transparent 38%
            ),
            color-mix(in srgb, var(--color-surface) 88%, transparent);
          box-shadow: 0 28px 68px -54px rgba(0, 0, 0, 0.76);
        }

        .buyer-router__list {
          display: grid;
          overflow: hidden;
        }

        .buyer-router__option {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 0.8rem;
          align-items: center;
          min-height: 5.25rem;
          border: 0;
          border-bottom: 1px solid color-mix(in srgb, var(--color-border) 58%, transparent);
          background: transparent;
          color: inherit;
          padding: 0.95rem;
          text-align: left;
          cursor: pointer;
        }

        .buyer-router__option:last-child {
          border-bottom: 0;
        }

        .buyer-router__option:hover,
        .buyer-router__option.is-active {
          background:
            linear-gradient(
              90deg,
              color-mix(in srgb, var(--color-primary) 9%, transparent),
              transparent 48%
            ),
            color-mix(in srgb, var(--color-surface) 94%, transparent);
        }

        .buyer-router__option-mark {
          display: inline-flex;
          width: 2rem;
          height: 2rem;
          align-items: center;
          justify-content: center;
          border: 1px solid color-mix(in srgb, var(--color-border) 76%, transparent);
          border-radius: 7px;
          color: color-mix(in srgb, var(--color-text-muted) 80%, transparent);
        }

        .buyer-router__option.is-active .buyer-router__option-mark {
          border-color: color-mix(in srgb, var(--color-primary) 72%, transparent);
          background: color-mix(in srgb, var(--color-primary) 82%, white 18%);
          color: var(--color-text-inverse);
        }

        .buyer-router__option-copy {
          display: grid;
          gap: 0.25rem;
        }

        .buyer-router__option-copy strong {
          color: var(--color-text-primary);
          font-size: 1rem;
          line-height: 1.2;
        }

        .buyer-router__option-copy span {
          color: color-mix(in srgb, var(--color-text-secondary) 86%, transparent);
          font-size: 0.88rem;
          line-height: 1.45;
        }

        .buyer-router__option-arrow {
          color: color-mix(in srgb, var(--color-primary) 78%, white 12%);
        }

        .buyer-router__stage {
          display: grid;
          gap: 1rem;
          padding: clamp(1rem, 2.4vw, 1.35rem);
          overflow: hidden;
        }

        .buyer-router__main {
          display: grid;
          gap: 1rem;
          align-content: start;
        }

        .buyer-router__active-title {
          display: grid;
          gap: 0.75rem;
        }

        .buyer-router__active-title h3 {
          max-width: 19ch;
          margin: 0;
          color: var(--color-text-primary);
          font-family: var(--font-display);
          font-size: clamp(1.55rem, 2.8vw, 2.35rem);
          font-weight: 760;
          letter-spacing: 0;
          line-height: 1.02;
          text-wrap: balance;
        }

        .buyer-router__active-title p {
          margin: 0;
          color: color-mix(in srgb, var(--color-text-secondary) 90%, transparent);
          line-height: 1.6;
        }

        .buyer-router__lane {
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

        .buyer-router__facts {
          display: grid;
          gap: 0.75rem;
        }

        .buyer-router__fact {
          display: grid;
          gap: 0.4rem;
          border: 1px solid color-mix(in srgb, var(--color-border) 68%, transparent);
          border-radius: 10px;
          background: color-mix(in srgb, var(--color-background) 24%, transparent);
          padding: 0.95rem;
        }

        .buyer-router__fact strong {
          color: var(--color-text-primary);
          font-size: 1rem;
          line-height: 1.25;
        }

        .buyer-router__fact p {
          margin: 0;
          color: color-mix(in srgb, var(--color-text-secondary) 90%, transparent);
          font-size: 0.92rem;
          line-height: 1.55;
        }

        .buyer-router__proof-grid {
          display: grid;
          gap: 0.75rem;
        }

        .buyer-router__proof-list {
          display: grid;
          gap: 0.55rem;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .buyer-router__proof-list li {
          display: flex;
          gap: 0.55rem;
          color: color-mix(in srgb, var(--color-text-secondary) 92%, transparent);
          font-size: 0.9rem;
          line-height: 1.45;
        }

        .buyer-router__proof-list svg {
          margin-top: 0.15rem;
          flex: 0 0 auto;
          color: color-mix(in srgb, var(--color-primary-strong) 88%, white 10%);
        }

        .buyer-router__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.7rem;
          align-items: center;
        }

        .buyer-router__primary,
        .buyer-router__secondary,
        .buyer-router__copy {
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

        .buyer-router__primary {
          border: 1px solid color-mix(in srgb, var(--color-primary) 36%, transparent);
          background: linear-gradient(
            135deg,
            color-mix(in srgb, var(--color-primary) 82%, white 18%),
            color-mix(in srgb, var(--color-primary-strong) 58%, white 42%)
          );
          color: var(--color-text-inverse);
        }

        .buyer-router__secondary,
        .buyer-router__copy {
          border: 1px solid color-mix(in srgb, var(--color-border) 72%, transparent);
          background: color-mix(in srgb, var(--color-surface) 82%, transparent);
          color: color-mix(in srgb, var(--color-text-primary) 86%, transparent);
        }

        .buyer-router__brief {
          display: grid;
          gap: 0.8rem;
          align-content: start;
          padding: 1rem;
        }

        .buyer-router__brief pre {
          min-height: 10rem;
          margin: 0;
          overflow: auto;
          border: 1px solid color-mix(in srgb, var(--color-border) 62%, transparent);
          border-radius: 10px;
          background: color-mix(in srgb, black 22%, transparent);
          color: color-mix(in srgb, var(--color-text-secondary) 92%, transparent);
          font-family: var(--font-mono);
          font-size: 0.75rem;
          line-height: 1.62;
          white-space: pre-wrap;
          padding: 0.9rem;
        }

        @media (min-width: 1020px) {
          .buyer-router__grid {
            grid-template-columns: minmax(19rem, 0.44fr) minmax(0, 1fr);
            align-items: start;
          }

          .buyer-router__stage {
            grid-template-columns: minmax(0, 1fr) minmax(19rem, 0.42fr);
          }

          .buyer-router__brief {
            align-self: start;
          }
        }

        @media (min-width: 720px) {
          .buyer-router__facts,
          .buyer-router__proof-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .buyer-router__option {
            grid-template-columns: auto minmax(0, 1fr);
          }

          .buyer-router__option-arrow {
            display: none;
          }

          .buyer-router__actions > * {
            width: 100%;
          }
        }
      `}</style>

      <div className="buyer-router__header">
        <p className="buyer-router__eyebrow">{eyebrow}</p>
        <h2 id="buyer-router-title">{title}</h2>
        <p>{description}</p>
      </div>

      <div className="buyer-router__grid">
        <div className="buyer-router__list" role="list">
          {situations.map(situation => {
            const selected = situation.id === active.id;

            return (
              <button
                key={situation.id}
                type="button"
                className={`buyer-router__option ${selected ? 'is-active' : ''}`}
                onClick={() => setActiveId(situation.id)}
                aria-pressed={selected}
                data-event="buyer-situation-select"
                data-situation-id={situation.id}
              >
                <span className="buyer-router__option-mark" aria-hidden="true">
                  {selected ? <CheckCircle2 size={16} /> : <Route size={15} />}
                </span>
                <span className="buyer-router__option-copy">
                  <span className="buyer-router__label">{situation.label}</span>
                  <strong>{situation.title}</strong>
                  {selected ? null : <span>{situation.serviceLane}</span>}
                </span>
                <ArrowRight
                  className="buyer-router__option-arrow"
                  aria-hidden="true"
                  size={17}
                />
              </button>
            );
          })}
        </div>

        <div className="buyer-router__stage">
          <div className="buyer-router__main">
            <div className="buyer-router__active-title">
              <span className="buyer-router__lane">{active.serviceLane}</span>
              <h3>{active.trigger}</h3>
              <p>{active.betterThanGeneric}</p>
            </div>

            <div className="buyer-router__facts">
              <div className="buyer-router__fact">
                <span className="buyer-router__panel-title">First owner</span>
                <strong>{active.firstOwner}</strong>
                <p>{active.firstMove}</p>
              </div>
              <div className="buyer-router__fact">
                <span className="buyer-router__panel-title">First check</span>
                <strong>What gets inspected</strong>
                <p>{active.whatWeWouldCheck.join(', ')}.</p>
              </div>
            </div>

            <div className="buyer-router__proof-grid">
              <div className="buyer-router__fact">
                <span className="buyer-router__panel-title">
                  Bring to the first review
                </span>
                <ul className="buyer-router__proof-list">
                  {active.proofToAskFor.map(item => (
                    <li key={item}>
                      <ShieldCheck aria-hidden="true" size={15} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="buyer-router__fact">
                <span className="buyer-router__panel-title">
                  Why this earns contact
                </span>
                <strong>The next step is already framed.</strong>
                <p>
                  You are not asking for a generic quote. You are sending the
                  context needed for a useful first answer.
                </p>
              </div>
            </div>

            <div className="buyer-router__actions">
              <a className="buyer-router__primary" href={contactUrl}>
                <ClipboardCheck aria-hidden="true" size={18} />
                <span>Send this situation</span>
              </a>
              <a className="buyer-router__secondary" href={pricingHref}>
                Pricing logic
              </a>
              <a className="buyer-router__secondary" href={trustHref}>
                Proof center
              </a>
            </div>
          </div>

          <aside className="buyer-router__brief" aria-label="Generated brief">
            <span className="buyer-router__brief-label">Generated brief</span>
            <pre tabIndex={0}>{generatedBrief}</pre>
            <button
              className="buyer-router__copy"
              type="button"
              onClick={copyBrief}
              data-event="buyer-brief-copy"
            >
              <Copy aria-hidden="true" size={16} />
              <span>{copied ? 'Copied' : 'Copy brief'}</span>
            </button>
          </aside>
        </div>
      </div>
    </section>
  );
}
