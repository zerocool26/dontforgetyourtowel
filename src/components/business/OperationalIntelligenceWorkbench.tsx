import { useMemo, useState } from 'preact/hooks';
import {
  Activity,
  ArrowRight,
  Check,
  ClipboardCheck,
  Layers,
} from 'lucide-preact';
import type { OperatingIntelligenceItem } from '../../data/operating-intelligence';

type MotionMode = 'stabilize' | 'harden' | 'modernize';

export interface WorkbenchItem extends OperatingIntelligenceItem {
  ctaHref: string;
}

interface Props {
  eyebrow?: string;
  title?: string;
  description?: string;
  items: WorkbenchItem[];
  defaultItemId?: string;
  compact?: boolean;
}

const motionModes: Array<{
  id: MotionMode;
  label: string;
  description: string;
}> = [
  {
    id: 'stabilize',
    label: 'Stabilize',
    description: 'Stop the obvious drag first.',
  },
  {
    id: 'harden',
    label: 'Harden',
    description: 'Turn fixes into repeatable control.',
  },
  {
    id: 'modernize',
    label: 'Modernize',
    description: 'Use the clean baseline to move faster.',
  },
];

export default function OperationalIntelligenceWorkbench({
  eyebrow = 'Operating intelligence',
  title = 'Use the site like a working diagnostic, not a brochure.',
  description = 'Pick a pressure point and the workbench shows signals, first actions, evidence, automation candidates, ownership, and the right next route.',
  items,
  defaultItemId,
  compact = false,
}: Props) {
  const initialItem = items.find(item => item.id === defaultItemId) ?? items[0];
  const [activeId, setActiveId] = useState(initialItem?.id ?? '');
  const [motionMode, setMotionMode] = useState<MotionMode>('stabilize');
  const [checkedEvidence, setCheckedEvidence] = useState<Set<string>>(
    () => new Set(initialItem?.evidence.slice(0, 2) ?? [])
  );
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>(
    'idle'
  );

  const activeItem = useMemo(() => {
    return items.find(item => item.id === activeId) ?? items[0];
  }, [activeId, items]);

  const evidenceProgress = activeItem?.evidence.length
    ? Math.round((checkedEvidence.size / activeItem.evidence.length) * 100)
    : 0;

  const activeBrief = useMemo(() => {
    if (!activeItem) return '';
    const selectedEvidence = activeItem.evidence.filter(item =>
      checkedEvidence.has(item)
    );

    return [
      `${activeItem.title}: ${activeItem.summary}`,
      `Current motion: ${activeItem.motion[motionMode]}`,
      `Owner: ${activeItem.owner}`,
      `Evidence to collect: ${selectedEvidence.length ? selectedEvidence.join(', ') : 'Start with discovery evidence.'}`,
      `Next route: ${activeItem.ctaLabel}`,
    ].join('\n');
  }, [activeItem, checkedEvidence, motionMode]);

  const canCopy =
    typeof navigator !== 'undefined' && Boolean(navigator.clipboard);

  if (!activeItem) {
    return (
      <section
        className={`ops-workbench ${compact ? 'ops-workbench--compact' : ''}`}
        data-testid="operational-intelligence-workbench"
        aria-labelledby="ops-workbench-title"
      >
        <div className="ops-workbench__header">
          <div className="ops-workbench__header-copy">
            <p className="ops-workbench__eyebrow">{eyebrow}</p>
            <h2 id="ops-workbench-title" className="ops-workbench__title">
              {title}
            </h2>
            <p className="ops-workbench__description">{description}</p>
          </div>
        </div>
      </section>
    );
  }

  const switchItem = (item: WorkbenchItem) => {
    setActiveId(item.id);
    setCheckedEvidence(new Set(item.evidence.slice(0, 2)));
    setCopyState('idle');
  };

  const toggleEvidence = (evidence: string) => {
    setCheckedEvidence(prev => {
      const next = new Set(prev);
      if (next.has(evidence)) {
        next.delete(evidence);
      } else {
        next.add(evidence);
      }
      return next;
    });
    setCopyState('idle');
  };

  const copyBrief = async () => {
    if (!canCopy) {
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

  return (
    <section
      className={`ops-workbench ${compact ? 'ops-workbench--compact' : ''}`}
      data-testid="operational-intelligence-workbench"
      aria-labelledby="ops-workbench-title"
    >
      <div className="ops-workbench__header">
        <div className="ops-workbench__header-copy">
          <p className="ops-workbench__eyebrow">{eyebrow}</p>
          <h2 id="ops-workbench-title" className="ops-workbench__title">
            {title}
          </h2>
          <p className="ops-workbench__description">{description}</p>
        </div>

        <div className="ops-workbench__readiness" aria-live="polite">
          <span>Evidence readiness</span>
          <strong>{evidenceProgress}%</strong>
          <div
            className="ops-workbench__meter"
            role="progressbar"
            aria-label={`Evidence readiness for ${activeItem.title}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={evidenceProgress}
          >
            <i style={{ width: `${evidenceProgress}%` }} />
          </div>
        </div>
      </div>

      <div
        className="ops-workbench__tabs"
        role="tablist"
        aria-label="Operating pressure points"
      >
        {items.map(item => {
          const active = item.id === activeItem.id;

          return (
            <button
              key={item.id}
              type="button"
              className={`ops-workbench__tab ${active ? 'is-active' : ''}`}
              onClick={() => switchItem(item)}
              role="tab"
              aria-selected={active}
              aria-controls={`ops-panel-${item.id}`}
            >
              <span>{item.label}</span>
              <strong>{item.title}</strong>
            </button>
          );
        })}
      </div>

      <div
        id={`ops-panel-${activeItem.id}`}
        className="ops-workbench__body"
        role="tabpanel"
      >
        <div className="ops-workbench__main">
          <div className="ops-workbench__question">
            <Activity aria-hidden="true" size={18} />
            <p>{activeItem.question}</p>
          </div>

          <p className="ops-workbench__summary">{activeItem.summary}</p>

          <div className="ops-workbench__motion" aria-label="Work motion">
            {motionModes.map(mode => {
              const active = mode.id === motionMode;

              return (
                <button
                  key={mode.id}
                  type="button"
                  className={active ? 'is-active' : ''}
                  aria-pressed={active}
                  onClick={() => setMotionMode(mode.id)}
                >
                  <span>{mode.label}</span>
                  <small>{mode.description}</small>
                </button>
              );
            })}
          </div>

          <div className="ops-workbench__motion-copy">
            <Layers aria-hidden="true" size={18} />
            <p>{activeItem.motion[motionMode]}</p>
          </div>

          <div className="ops-workbench__split">
            <div>
              <h3>Signals this is the work</h3>
              <ul className="ops-workbench__list">
                {activeItem.signals.map(signal => (
                  <li key={signal}>
                    <span />
                    {signal}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3>First actions</h3>
              <ol className="ops-workbench__steps">
                {activeItem.firstActions.map(action => (
                  <li key={action}>{action}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <aside
          className="ops-workbench__side"
          aria-label="Evidence and next route"
        >
          <div className="ops-workbench__facts">
            <div>
              <span>Owner</span>
              <strong>{activeItem.owner}</strong>
            </div>
            <div>
              <span>Investment signal</span>
              <strong>{activeItem.investmentSignal}</strong>
            </div>
          </div>

          <div className="ops-workbench__evidence">
            <div className="ops-workbench__side-title">
              <ClipboardCheck aria-hidden="true" size={18} />
              <h3>Evidence package</h3>
            </div>
            <div className="ops-workbench__checks">
              {activeItem.evidence.map(evidence => {
                const checked = checkedEvidence.has(evidence);

                return (
                  <label key={evidence} className={checked ? 'is-checked' : ''}>
                    <input
                      type="checkbox"
                      aria-label={evidence}
                      checked={checked}
                      onChange={() => toggleEvidence(evidence)}
                    />
                    <span>
                      {checked ? <Check aria-hidden="true" size={14} /> : null}
                    </span>
                    {evidence}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="ops-workbench__automation">
            <h3>Automation candidates</h3>
            <div>
              {activeItem.automations.map(item => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>

          <div className="ops-workbench__brief">
            <h3>Generated handoff brief</h3>
            <pre aria-label="Generated handoff brief" tabIndex={0}>
              {activeBrief}
            </pre>
            <button type="button" onClick={copyBrief}>
              {copyState === 'copied'
                ? 'Brief copied'
                : copyState === 'failed'
                  ? 'Copy unavailable'
                  : 'Copy brief'}
            </button>
          </div>

          <a className="ops-workbench__cta" href={activeItem.ctaHref}>
            <span>{activeItem.ctaLabel}</span>
            <ArrowRight aria-hidden="true" size={18} />
          </a>
        </aside>
      </div>
    </section>
  );
}
