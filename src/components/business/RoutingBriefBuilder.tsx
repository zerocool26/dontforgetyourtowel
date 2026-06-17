import { useMemo, useState } from 'preact/hooks';
import {
  ArrowRight,
  Check,
  ClipboardCheck,
  Copy,
  FileText,
  Route,
  Send,
} from 'lucide-preact';
import type {
  RoutingBriefChoice,
  RoutingBriefPressure,
} from '../../data/routing-brief';

interface RoutingBriefIntent {
  service?: string;
  serviceLabel?: string;
  solutionLabel?: string;
  tradeLabel?: string;
  tradePage?: string;
  brief?: string;
  workspaceTitle?: string;
  workspaceSummary?: string;
}

interface Props {
  pressures: readonly RoutingBriefPressure[];
  companyShapes: readonly RoutingBriefChoice[];
  timelines: readonly RoutingBriefChoice[];
  initialIntent?: RoutingBriefIntent;
  formId?: string;
}

type ActionState = 'idle' | 'copied' | 'copy-failed' | 'applied';

const detectPressureId = (
  pressures: readonly RoutingBriefPressure[],
  intent?: RoutingBriefIntent
) => {
  const source = [
    intent?.service,
    intent?.serviceLabel,
    intent?.solutionLabel,
    intent?.tradeLabel,
    intent?.tradePage,
    intent?.brief,
    intent?.workspaceTitle,
    intent?.workspaceSummary,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const matchers: Array<[string, RegExp]> = [
    ['security-evidence', /security|insurance|mfa|compliance|risk|admin/],
    ['backup-confidence', /backup|recovery|restore|ransomware|continuity/],
    ['m365-cleanup', /365|sharepoint|teams|tenant|license|cloud/],
    ['provider-transition', /provider|transition|switch|vendor|handoff/],
    ['workflow-handoff', /workflow|portal|intake|website|form|approval/],
  ];

  const matched = matchers.find(([, pattern]) => pattern.test(source))?.[0];

  return pressures.some(pressure => pressure.id === matched)
    ? matched
    : (pressures[0]?.id ?? '');
};

const readRuntimeIntent = (intent?: RoutingBriefIntent): RoutingBriefIntent => {
  if (typeof window === 'undefined') {
    return intent ?? {};
  }

  const params = new URLSearchParams(window.location.search);
  const fromParam = (key: string) => params.get(key)?.trim() || '';

  return {
    service: intent?.service || fromParam('service'),
    serviceLabel: intent?.serviceLabel,
    solutionLabel: intent?.solutionLabel || fromParam('solution'),
    tradeLabel: intent?.tradeLabel || fromParam('trade'),
    tradePage: intent?.tradePage || fromParam('tradePage'),
    brief: intent?.brief || fromParam('brief'),
    workspaceTitle: intent?.workspaceTitle || fromParam('workspaceTitle'),
    workspaceSummary: intent?.workspaceSummary || fromParam('workspaceSummary'),
  };
};

const dispatchInputEvents = (field: HTMLInputElement | HTMLTextAreaElement) => {
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
};

export default function RoutingBriefBuilder({
  pressures,
  companyShapes,
  timelines,
  initialIntent,
  formId = 'contact-form',
}: Props) {
  const [runtimeIntent] = useState(() => readRuntimeIntent(initialIntent));
  const initialPressureId = detectPressureId(pressures, runtimeIntent);
  const [activeId, setActiveId] = useState(initialPressureId);
  const [companyShapeId, setCompanyShapeId] = useState(
    companyShapes[0]?.id ?? ''
  );
  const [timelineId, setTimelineId] = useState(timelines[1]?.id ?? '');
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    () =>
      new Set(
        (pressures.find(pressure => pressure.id === initialPressureId) ??
          pressures[0])?.fields.slice(0, 3) ?? []
      )
  );
  const [contextNote, setContextNote] = useState(() => {
    const imported = [
      runtimeIntent?.brief,
      runtimeIntent?.workspaceTitle,
      runtimeIntent?.workspaceSummary,
      runtimeIntent?.tradeLabel
        ? `Trade context: ${runtimeIntent.tradeLabel}`
        : '',
      runtimeIntent?.tradePage
        ? `Route context: ${runtimeIntent.tradePage}`
        : '',
    ]
      .filter(Boolean)
      .join(' ');

    return imported;
  });
  const [actionState, setActionState] = useState<ActionState>('idle');

  const activePressure = useMemo(
    () =>
      pressures.find(pressure => pressure.id === activeId) ?? pressures[0],
    [activeId, pressures]
  );
  const companyShape = useMemo(
    () =>
      companyShapes.find(shape => shape.id === companyShapeId) ??
      companyShapes[0],
    [companyShapeId, companyShapes]
  );
  const timeline = useMemo(
    () =>
      timelines.find(item => item.id === timelineId) ?? timelines[0],
    [timelineId, timelines]
  );

  const selectedFieldList = activePressure.fields.filter(field =>
    selectedFields.has(field)
  );
  const missingFields = activePressure.fields.filter(
    field => !selectedFields.has(field)
  );
  const readiness = Math.min(
    100,
    Math.round(
      ((selectedFieldList.length + (contextNote.trim() ? 1 : 0)) /
        (activePressure.fields.length + 1)) *
        100
    )
  );

  const generatedBrief = useMemo(() => {
    const note =
      contextNote.trim() ||
      'We need help deciding the right first step and owner.';

    return [
      `Subject: ${activePressure.subject}`,
      `Pressure: ${activePressure.title}`,
      `Current context: ${note}`,
      `Company shape: ${companyShape?.label ?? 'Not sure yet'} - ${companyShape?.detail ?? 'Discovery needed.'}`,
      `Timing: ${timeline?.label ?? 'Planning'} - ${timeline?.detail ?? 'Timing still needs review.'}`,
      `Details ready: ${selectedFieldList.length ? selectedFieldList.join(', ') : 'None yet'}`,
      `Not needed yet: ${activePressure.notNeededYet}`,
      `Expected first response: ${activePressure.firstResponse}`,
      `Expected artifact: ${activePressure.expectedArtifact}`,
    ].join('\n');
  }, [
    activePressure,
    companyShape,
    contextNote,
    selectedFieldList,
    timeline,
  ]);

  if (!activePressure) {
    return null;
  }

  const setPressure = (pressure: RoutingBriefPressure) => {
    setActiveId(pressure.id);
    setSelectedFields(new Set(pressure.fields.slice(0, 3)));
    setActionState('idle');
  };

  const toggleField = (field: string) => {
    setSelectedFields(previous => {
      const next = new Set(previous);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
    setActionState('idle');
  };

  const copyBrief = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      setActionState('copy-failed');
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedBrief);
      setActionState('copied');
    } catch {
      setActionState('copy-failed');
    }
  };

  const applyToForm = () => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) {
      setActionState('copy-failed');
      return;
    }

    const subjectField = form.querySelector<HTMLInputElement>(
      'input[name="subject"]'
    );
    const messageField = form.querySelector<HTMLTextAreaElement>(
      'textarea[name="message"]'
    );
    const serviceIntentField = form.querySelector<HTMLInputElement>(
      'input[name="serviceIntent"]'
    );

    if (subjectField) {
      subjectField.value = activePressure.subject;
      dispatchInputEvents(subjectField);
    }

    if (messageField) {
      messageField.value = generatedBrief;
      dispatchInputEvents(messageField);
    }

    if (serviceIntentField && !serviceIntentField.value) {
      serviceIntentField.value = activePressure.serviceIntent;
      dispatchInputEvents(serviceIntentField);
    }

    setActionState('applied');
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => messageField?.focus(), 300);
  };

  const statusText =
    actionState === 'copied'
      ? 'Brief copied.'
      : actionState === 'applied'
        ? 'Brief added to the intake form.'
        : actionState === 'copy-failed'
          ? 'Copy was not available. The brief is still visible.'
          : `${readiness}% ready.`;

  return (
    <section
      className="routing-brief"
      data-testid="routing-brief-builder"
      aria-labelledby="routing-brief-title"
    >
      <style>{`
        .routing-brief {
          color: var(--color-text-primary);
        }

        .routing-brief * {
          box-sizing: border-box;
        }

        .routing-brief__shell {
          display: grid;
          grid-template-columns: minmax(13rem, 0.72fr) minmax(0, 1.05fr) minmax(18rem, 0.86fr);
          gap: 1rem;
          border: 1px solid color-mix(in srgb, var(--color-border) 76%, transparent);
          border-radius: 1.35rem;
          background:
            linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.96)),
            color-mix(in srgb, var(--color-surface) 94%, black);
          box-shadow: 0 28px 90px rgba(2, 6, 23, 0.38);
          overflow: hidden;
        }

        .routing-brief__rail,
        .routing-brief__builder,
        .routing-brief__receipt {
          min-width: 0;
          padding: clamp(1rem, 2vw, 1.35rem);
        }

        .routing-brief__rail {
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
        }

        .routing-brief__builder {
          display: grid;
          align-content: start;
          gap: 1.1rem;
        }

        .routing-brief__receipt {
          display: grid;
          gap: 1rem;
          border-left: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(248, 250, 252, 0.055);
        }

        .routing-brief__eyebrow {
          margin: 0;
          color: color-mix(in srgb, var(--color-accent) 72%, white);
          font-size: 0.78rem;
          font-weight: 700;
        }

        .routing-brief__title {
          margin: 0.45rem 0 0;
          max-width: 38rem;
          color: white;
          font-size: clamp(1.8rem, 3vw, 3.15rem);
          line-height: 1;
        }

        .routing-brief__copy {
          margin: 0.9rem 0 0;
          max-width: 43rem;
          color: rgba(226, 232, 240, 0.78);
          font-size: 1rem;
          line-height: 1.72;
        }

        .routing-brief__intro {
          margin-bottom: 1rem;
        }

        .routing-brief__pressure-list,
        .routing-brief__choice-grid,
        .routing-brief__field-grid {
          display: grid;
          gap: 0.65rem;
        }

        .routing-brief__pressure {
          display: grid;
          min-height: 4.15rem;
          width: 100%;
          gap: 0.25rem;
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 1rem;
          background: rgba(255, 255, 255, 0.045);
          color: rgba(226, 232, 240, 0.76);
          padding: 0.8rem 0.85rem;
          text-align: left;
          transition:
            border-color 160ms ease,
            background 160ms ease,
            color 160ms ease;
        }

        .routing-brief__pressure span {
          font-size: 0.8rem;
          font-weight: 800;
          color: white;
        }

        .routing-brief__pressure small {
          color: inherit;
          font-size: 0.76rem;
          line-height: 1.45;
        }

        .routing-brief__pressure:hover,
        .routing-brief__pressure.is-active {
          border-color: color-mix(in srgb, var(--color-primary) 56%, white);
          background: rgba(34, 211, 238, 0.11);
          color: rgba(236, 254, 255, 0.84);
        }

        .routing-brief__pressure:focus-visible,
        .routing-brief__choice:focus-visible,
        .routing-brief__field:focus-within,
        .routing-brief__action:focus-visible,
        .routing-brief__note:focus-visible,
        .routing-brief__output:focus-visible {
          outline: 2px solid color-mix(in srgb, var(--color-primary) 62%, white);
          outline-offset: 3px;
        }

        .routing-brief__active {
          display: grid;
          gap: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 1.15rem;
          background: rgba(255, 255, 255, 0.04);
          padding: 1rem;
        }

        .routing-brief__active-top {
          display: flex;
          align-items: flex-start;
          gap: 0.8rem;
        }

        .routing-brief__icon {
          display: inline-flex;
          width: 2.5rem;
          height: 2.5rem;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 0.9rem;
          background: rgba(255, 255, 255, 0.06);
          color: #a7f3d0;
        }

        .routing-brief__active h3,
        .routing-brief__block-title,
        .routing-brief__receipt h3 {
          margin: 0;
          color: white;
          font-size: 1rem;
          line-height: 1.3;
        }

        .routing-brief__active p,
        .routing-brief__muted {
          margin: 0;
          color: rgba(226, 232, 240, 0.74);
          font-size: 0.9rem;
          line-height: 1.65;
        }

        .routing-brief__meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.55rem;
        }

        .routing-brief__meta span {
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.045);
          color: rgba(226, 232, 240, 0.76);
          padding: 0.45rem 0.65rem;
          font-size: 0.78rem;
          font-weight: 700;
        }

        .routing-brief__block {
          display: grid;
          gap: 0.75rem;
        }

        .routing-brief__choice-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .routing-brief__choice {
          min-height: 4.5rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 1rem;
          background: rgba(255, 255, 255, 0.04);
          color: rgba(226, 232, 240, 0.72);
          padding: 0.82rem;
          text-align: left;
        }

        .routing-brief__choice strong {
          display: block;
          color: white;
          font-size: 0.88rem;
        }

        .routing-brief__choice span {
          display: block;
          margin-top: 0.25rem;
          font-size: 0.76rem;
          line-height: 1.45;
        }

        .routing-brief__choice.is-active {
          border-color: rgba(134, 239, 172, 0.48);
          background: rgba(34, 197, 94, 0.12);
          color: rgba(240, 253, 244, 0.84);
        }

        .routing-brief__field-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .routing-brief__field {
          display: flex;
          min-height: 3rem;
          align-items: center;
          gap: 0.65rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.9rem;
          background: rgba(255, 255, 255, 0.04);
          color: rgba(226, 232, 240, 0.78);
          padding: 0.7rem;
          font-size: 0.84rem;
          line-height: 1.35;
        }

        .routing-brief__field input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .routing-brief__check {
          display: inline-flex;
          width: 1.25rem;
          height: 1.25rem;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 0.42rem;
          background: rgba(255, 255, 255, 0.05);
          color: #022c22;
        }

        .routing-brief__field.is-checked {
          border-color: rgba(125, 211, 252, 0.5);
          background: rgba(14, 165, 233, 0.11);
          color: white;
        }

        .routing-brief__field.is-checked .routing-brief__check {
          border-color: transparent;
          background: #67e8f9;
        }

        .routing-brief__note {
          width: 100%;
          min-height: 6.25rem;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 1rem;
          background: rgba(15, 23, 42, 0.72);
          color: white;
          padding: 0.9rem 1rem;
          resize: vertical;
        }

        .routing-brief__readiness {
          display: grid;
          gap: 0.55rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 1rem;
          background: rgba(255, 255, 255, 0.04);
          padding: 0.9rem;
        }

        .routing-brief__readiness-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          color: rgba(226, 232, 240, 0.74);
          font-size: 0.82rem;
        }

        .routing-brief__readiness-row strong {
          color: white;
        }

        .routing-brief__meter {
          height: 0.48rem;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.09);
        }

        .routing-brief__meter i {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #67e8f9, #86efac);
        }

        .routing-brief__missing {
          display: grid;
          gap: 0.4rem;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .routing-brief__missing li {
          display: flex;
          align-items: flex-start;
          gap: 0.45rem;
          color: rgba(226, 232, 240, 0.72);
          font-size: 0.84rem;
          line-height: 1.45;
        }

        .routing-brief__missing span {
          width: 0.38rem;
          height: 0.38rem;
          flex: 0 0 auto;
          margin-top: 0.5rem;
          border-radius: 999px;
          background: #fbbf24;
        }

        .routing-brief__output {
          min-height: 18rem;
          max-height: 28rem;
          margin: 0;
          overflow: auto;
          white-space: pre-wrap;
          word-break: break-word;
          border: 1px solid rgba(15, 23, 42, 0.16);
          border-radius: 1rem;
          background: #f8fafc;
          color: #111827;
          padding: 1rem;
          font-size: 0.84rem;
          line-height: 1.6;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.55);
        }

        .routing-brief__actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.65rem;
        }

        .routing-brief__action {
          display: inline-flex;
          min-height: 3.1rem;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 0.95rem;
          background: rgba(255, 255, 255, 0.06);
          color: white;
          font-size: 0.88rem;
          font-weight: 800;
          text-decoration: none;
          transition:
            border-color 160ms ease,
            background 160ms ease,
            transform 160ms ease;
        }

        .routing-brief__action:hover {
          border-color: rgba(255, 255, 255, 0.24);
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-1px);
        }

        .routing-brief__action--primary {
          border-color: rgba(134, 239, 172, 0.32);
          background: #bbf7d0;
          color: #052e16;
        }

        .routing-brief__status {
          min-height: 1.5rem;
          margin: 0;
          color: rgba(226, 232, 240, 0.74);
          font-size: 0.84rem;
          line-height: 1.5;
        }

        @media (prefers-reduced-motion: reduce) {
          .routing-brief__pressure,
          .routing-brief__action {
            transition: none;
          }

          .routing-brief__action:hover {
            transform: none;
          }
        }

        @media (max-width: 1100px) {
          .routing-brief__shell {
            grid-template-columns: 1fr;
          }

          .routing-brief__rail,
          .routing-brief__receipt {
            border: 0;
          }

          .routing-brief__pressure-list {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .routing-brief__shell {
            border-radius: 1rem;
          }

          .routing-brief__pressure-list,
          .routing-brief__choice-grid,
          .routing-brief__field-grid,
          .routing-brief__actions {
            grid-template-columns: 1fr;
          }

          .routing-brief__output {
            min-height: 14rem;
          }
        }
      `}</style>

      <div className="routing-brief__intro">
        <p className="routing-brief__eyebrow">Routing brief</p>
        <h2 id="routing-brief-title" className="routing-brief__title">
          Build the first note before the form.
        </h2>
        <p className="routing-brief__copy">
          Pick the pressure, mark the context you already have, and send a
          brief that asks for the right owner, missing proof, and first artifact
          instead of a generic sales reply.
        </p>
      </div>

      <div className="routing-brief__shell">
        <div className="routing-brief__rail" aria-label="Routing pressures">
          <div className="routing-brief__pressure-list">
            {pressures.map(pressure => {
              const active = pressure.id === activePressure.id;

              return (
                <button
                  key={pressure.id}
                  type="button"
                  className={`routing-brief__pressure ${
                    active ? 'is-active' : ''
                  }`}
                  aria-pressed={active}
                  onClick={() => setPressure(pressure)}
                  data-event="routing-brief-pressure-select"
                  data-pressure-id={pressure.id}
                >
                  <span>{pressure.label}</span>
                  <small>{pressure.expectedArtifact}</small>
                </button>
              );
            })}
          </div>
        </div>

        <div className="routing-brief__builder">
          <div className="routing-brief__active">
            <div className="routing-brief__active-top">
              <span className="routing-brief__icon" aria-hidden="true">
                <Route size={19} />
              </span>
              <div>
                <h3>{activePressure.title}</h3>
                <p>{activePressure.summary}</p>
              </div>
            </div>
            <div className="routing-brief__meta" aria-label="Selected route">
              <span>{activePressure.owner}</span>
              <span>{activePressure.expectedArtifact}</span>
            </div>
          </div>

          <div className="routing-brief__block">
            <h3 className="routing-brief__block-title">Company shape</h3>
            <div className="routing-brief__choice-grid">
              {companyShapes.map(shape => {
                const active = shape.id === companyShape?.id;

                return (
                  <button
                    key={shape.id}
                    type="button"
                    className={`routing-brief__choice ${
                      active ? 'is-active' : ''
                    }`}
                    aria-pressed={active}
                    onClick={() => {
                      setCompanyShapeId(shape.id);
                      setActionState('idle');
                    }}
                  >
                    <strong>{shape.label}</strong>
                    <span>{shape.detail}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="routing-brief__block">
            <h3 className="routing-brief__block-title">Timing</h3>
            <div className="routing-brief__choice-grid">
              {timelines.map(item => {
                const active = item.id === timeline?.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`routing-brief__choice ${
                      active ? 'is-active' : ''
                    }`}
                    aria-pressed={active}
                    onClick={() => {
                      setTimelineId(item.id);
                      setActionState('idle');
                    }}
                  >
                    <strong>{item.label}</strong>
                    <span>{item.detail}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="routing-brief__block">
            <h3 className="routing-brief__block-title">Context you have</h3>
            <div className="routing-brief__field-grid">
              {activePressure.fields.map(field => {
                const checked = selectedFields.has(field);

                return (
                  <label
                    key={field}
                    className={`routing-brief__field ${
                      checked ? 'is-checked' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleField(field)}
                    />
                    <span className="routing-brief__check">
                      {checked ? <Check aria-hidden="true" size={14} /> : null}
                    </span>
                    {field}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="routing-brief__block">
            <h3 className="routing-brief__block-title">Known detail</h3>
            <textarea
              className="routing-brief__note"
              value={contextNote}
              onInput={event => {
                setContextNote(event.currentTarget.value);
                setActionState('idle');
              }}
              aria-label="Known routing detail"
              placeholder="Example: We have around 40 users, three recurring ticket types, and a renewal decision coming up."
            />
          </div>
        </div>

        <aside className="routing-brief__receipt" aria-label="Generated brief">
          <div className="routing-brief__readiness">
            <div className="routing-brief__readiness-row">
              <span>Brief readiness</span>
              <strong>{readiness}%</strong>
            </div>
            <div
              className="routing-brief__meter"
              role="progressbar"
              aria-label="Routing brief readiness"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={readiness}
            >
              <i style={{ width: `${readiness}%` }} />
            </div>
          </div>

          <div className="routing-brief__active-top">
            <span className="routing-brief__icon" aria-hidden="true">
              <ClipboardCheck size={19} />
            </span>
            <div>
              <h3>What is still missing</h3>
              <p className="routing-brief__muted">
                Do not delay for perfect records. These simply improve the
                first reply.
              </p>
            </div>
          </div>

          <ul className="routing-brief__missing">
            {(missingFields.length ? missingFields.slice(0, 3) : [
              activePressure.notNeededYet,
            ]).map(item => (
              <li key={item}>
                <span aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>

          <div className="routing-brief__active-top">
            <span className="routing-brief__icon" aria-hidden="true">
              <FileText size={19} />
            </span>
            <div>
              <h3>Generated note</h3>
              <p className="routing-brief__muted">
                This is intentionally plain. It gives the next owner enough to
                route the first response.
              </p>
            </div>
          </div>

          <pre
            className="routing-brief__output"
            aria-label="Generated routing brief"
            tabIndex={0}
          >
            {generatedBrief}
          </pre>

          <div className="routing-brief__actions">
            <button
              type="button"
              className="routing-brief__action"
              onClick={copyBrief}
            >
              <Copy aria-hidden="true" size={17} />
              Copy brief
            </button>
            <button
              type="button"
              className="routing-brief__action routing-brief__action--primary"
              onClick={applyToForm}
            >
              <Send aria-hidden="true" size={17} />
              Use in form
            </button>
          </div>

          <a className="routing-brief__action" href="#structured-intake">
            Open intake form
            <ArrowRight aria-hidden="true" size={17} />
          </a>

          <p className="routing-brief__status" aria-live="polite">
            {statusText}
          </p>
        </aside>
      </div>
    </section>
  );
}
