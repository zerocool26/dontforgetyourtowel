import { useEffect, useState } from 'preact/hooks';

type Status = 'online' | 'offline';

interface ChatPayload {
  name: string;
  email: string;
  message: string;
  createdAt: string;
}

export default function LiveChat() {
  const [open, setOpen] = useState(false);
  const [status] = useState<Status>('offline');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const nameId = 'livechat-name';
  const emailId = 'livechat-email';
  const messageId = 'livechat-message';

  const canSubmit = email.trim().length > 3 && message.trim().length > 3;

  // Restore draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('msp-chat-draft');
      if (!raw) return;
      const draft: Partial<ChatPayload> = JSON.parse(raw);
      if (draft.name) setName(draft.name);
      if (draft.email) setEmail(draft.email);
      if (draft.message) setMessage(draft.message);
    } catch {
      // ignore malformed draft
    }
  }, []);

  // Auto-save draft to localStorage as user types
  useEffect(() => {
    if (!email && !message) return;
    try {
      localStorage.setItem(
        'msp-chat-draft',
        JSON.stringify({ name, email, message })
      );
    } catch {
      // ignore quota errors silently
    }
  }, [name, email, message]);

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!canSubmit) return;
    const payload: ChatPayload = {
      name,
      email,
      message,
      createdAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem('msp-chat-draft', JSON.stringify(payload));
    } catch {
      // ignore
    }
    setSubmitted(true);
    setMessage('');
    setTimeout(() => {
      setSubmitted(false);
      setOpen(false);
    }, 2800);
  };

  return (
    <div class="livechat fixed bottom-20 right-3 z-50 md:bottom-6 md:right-5">
      {/* Trigger button */}
      <button
        type="button"
        class="livechat-trigger"
        aria-label={open ? 'Close chat' : 'Open chat'}
        aria-expanded={open}
        aria-controls="livechat-panel"
        onClick={() => setOpen(o => !o)}
      >
        <span class="livechat-trigger__icon" aria-hidden="true">
          {open ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          )}
        </span>
        <span class="livechat-trigger__label" aria-hidden="true">
          {open ? 'Close' : 'Chat'}
        </span>
      </button>

      {/* Panel */}
      {open && (
        <div
          id="livechat-panel"
          class="livechat-panel"
          role="dialog"
          aria-label="Contact chat"
          aria-modal="false"
        >
          {/* Header */}
          <div class="livechat-panel__header">
            <div class="livechat-panel__header-left">
              <span
                class={`livechat-status livechat-status--${status}`}
                aria-hidden="true"
              />
              <div>
                <p class="livechat-panel__title">Get in touch</p>
                <p class="livechat-panel__subtitle">
                  {status === 'online'
                    ? "We're online — reply in minutes"
                    : "Leave a message — we'll reply soon"}
                </p>
              </div>
            </div>
            <button
              type="button"
              class="livechat-panel__close"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                width="16"
                height="16"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          {submitted ? (
            <div class="livechat-panel__success">
              <div class="livechat-panel__success-icon" aria-hidden="true">
                ✓
              </div>
              <p class="livechat-panel__success-title">Message received</p>
              <p class="livechat-panel__success-copy">
                We'll be in touch shortly.
              </p>
            </div>
          ) : (
            <form
              class="livechat-panel__form"
              onSubmit={handleSubmit}
              noValidate
            >
              <div class="livechat-panel__field">
                <label class="sr-only" htmlFor={nameId}>
                  Name (optional)
                </label>
                <input
                  class="livechat-panel__input"
                  id={nameId}
                  type="text"
                  placeholder="Name (optional)"
                  value={name}
                  onInput={e => setName((e.target as HTMLInputElement).value)}
                  autoComplete="name"
                  autoCapitalize="words"
                />
              </div>

              <div class="livechat-panel__field">
                <label class="sr-only" htmlFor={emailId}>
                  Email address
                </label>
                <input
                  class="livechat-panel__input"
                  id={emailId}
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onInput={e => setEmail((e.target as HTMLInputElement).value)}
                  autoComplete="email"
                  required
                  inputMode="email"
                />
              </div>

              <div class="livechat-panel__field">
                <label class="sr-only" htmlFor={messageId}>
                  Message
                </label>
                <textarea
                  class="livechat-panel__input livechat-panel__input--textarea"
                  id={messageId}
                  placeholder="How can we help?"
                  value={message}
                  onInput={e =>
                    setMessage((e.target as HTMLTextAreaElement).value)
                  }
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                class={`livechat-panel__submit ${canSubmit ? 'livechat-panel__submit--active' : 'livechat-panel__submit--disabled'}`}
                aria-disabled={!canSubmit}
              >
                Send message
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  width="14"
                  height="14"
                  aria-hidden="true"
                >
                  <path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z" />
                </svg>
              </button>

              <p class="livechat-panel__disclaimer">
                Messages are stored locally. Connect to a CRM in production.
              </p>
            </form>
          )}
        </div>
      )}

      <style>{`
        .livechat-trigger {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          height: 3.25rem;
          padding: 0 1.1rem 0 0.9rem;
          border-radius: 999px;
          border: 1px solid rgba(215, 247, 91, 0.32);
          background:
            linear-gradient(135deg, rgba(215, 247, 91, 0.14), rgba(18, 181, 166, 0.08)),
            rgba(5, 7, 12, 0.94);
          color: rgba(215, 247, 91, 0.9);
          font-family: var(--font-mono);
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow:
            0 20px 48px -24px rgba(0, 0, 0, 0.96),
            0 0 32px -16px rgba(215, 247, 91, 0.2);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          transition:
            background 0.25s ease,
            border-color 0.25s ease,
            box-shadow 0.25s ease,
            transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .livechat-trigger:hover {
          background:
            linear-gradient(135deg, rgba(215, 247, 91, 0.2), rgba(18, 181, 166, 0.12)),
            rgba(5, 7, 12, 0.96);
          border-color: rgba(215, 247, 91, 0.5);
          box-shadow:
            0 24px 56px -24px rgba(0, 0, 0, 0.98),
            0 0 42px -12px rgba(215, 247, 91, 0.28);
          transform: translateY(-2px);
        }

        .livechat-trigger:active {
          transform: scale(0.96);
        }

        .livechat-trigger__icon {
          display: inline-flex;
          width: 1.25rem;
          height: 1.25rem;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .livechat-trigger__icon svg {
          width: 100%;
          height: 100%;
        }

        .livechat-panel {
          position: absolute;
          bottom: calc(100% + 0.75rem);
          right: 0;
          width: min(92vw, 360px);
          border-radius: 0.5rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background:
            linear-gradient(160deg, rgba(12, 14, 22, 0.97), rgba(8, 10, 16, 0.98));
          backdrop-filter: blur(24px) saturate(150%);
          -webkit-backdrop-filter: blur(24px) saturate(150%);
          box-shadow:
            0 40px 100px -40px rgba(0, 0, 0, 0.98),
            0 0 0 1px rgba(255, 255, 255, 0.04),
            0 0 60px -30px rgba(215, 247, 91, 0.12);
          overflow: hidden;
          animation: livechat-panel-in 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes livechat-panel-in {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }

        .livechat-panel__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
          padding: 0.95rem 1rem;
          background: linear-gradient(90deg, rgba(215, 247, 91, 0.06), transparent 60%);
        }

        .livechat-panel__header-left {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          min-width: 0;
        }

        .livechat-status {
          width: 0.55rem;
          height: 0.55rem;
          border-radius: 999px;
          flex-shrink: 0;
        }

        .livechat-status--online {
          background: #22c55e;
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.7);
          animation: status-pulse 2s ease-in-out infinite;
        }

        .livechat-status--offline {
          background: rgba(255, 255, 255, 0.28);
        }

        @keyframes status-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .livechat-panel__title {
          margin: 0;
          font-size: 0.88rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.96);
          line-height: 1.2;
        }

        .livechat-panel__subtitle {
          margin: 0.18rem 0 0;
          font-family: var(--font-mono);
          font-size: 0.62rem;
          letter-spacing: 0.08em;
          color: rgba(255, 255, 255, 0.44);
          line-height: 1.3;
        }

        .livechat-panel__close {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease;
          -webkit-tap-highlight-color: transparent;
        }

        .livechat-panel__close:hover {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.9);
        }

        .livechat-panel__form {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          padding: 1rem;
        }

        .livechat-panel__field {
          position: relative;
        }

        .livechat-panel__input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgba(255, 255, 255, 0.09);
          background: rgba(255, 255, 255, 0.04);
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.5;
          outline: none;
          transition: border-color 0.2s ease, background 0.2s ease;
          -webkit-appearance: none;
        }

        .livechat-panel__input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .livechat-panel__input:focus {
          border-color: rgba(215, 247, 91, 0.4);
          background: rgba(215, 247, 91, 0.03);
        }

        .livechat-panel__input--textarea {
          min-height: 100px;
          resize: none;
          field-sizing: content;
        }

        .livechat-panel__submit {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          min-height: 2.85rem;
          border-radius: 999px;
          padding: 0 1.2rem;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition:
            background 0.2s ease,
            border-color 0.2s ease,
            box-shadow 0.2s ease,
            opacity 0.2s ease;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          border: 1px solid transparent;
        }

        .livechat-panel__submit--active {
          background: linear-gradient(135deg, #d7f75b, #12b5a6);
          color: #000;
          border-color: rgba(215, 247, 91, 0.4);
          box-shadow: 0 0 24px rgba(215, 247, 91, 0.22);
        }

        .livechat-panel__submit--active:hover {
          box-shadow: 0 0 36px rgba(215, 247, 91, 0.35);
          transform: translateY(-1px);
        }

        .livechat-panel__submit--active:active {
          transform: scale(0.97);
        }

        .livechat-panel__submit--disabled {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.28);
          border-color: rgba(255, 255, 255, 0.07);
          cursor: not-allowed;
          pointer-events: none;
        }

        .livechat-panel__disclaimer {
          margin: 0;
          font-size: 0.65rem;
          color: rgba(255, 255, 255, 0.28);
          text-align: center;
          padding: 0 0.25rem;
          line-height: 1.5;
        }

        .livechat-panel__success {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          padding: 2.5rem 1.5rem;
          text-align: center;
        }

        .livechat-panel__success-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 999px;
          background: rgba(215, 247, 91, 0.12);
          border: 1px solid rgba(215, 247, 91, 0.3);
          color: #d7f75b;
          font-size: 1.1rem;
          font-weight: 700;
          box-shadow: 0 0 20px rgba(215, 247, 91, 0.18);
        }

        .livechat-panel__success-title {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
        }

        .livechat-panel__success-copy {
          margin: 0;
          font-size: 0.82rem;
          color: rgba(255, 255, 255, 0.48);
        }

        @media (prefers-reduced-motion: reduce) {
          .livechat-panel {
            animation: none;
          }
          .livechat-trigger,
          .livechat-trigger:hover {
            transform: none;
            transition: none;
          }
          .livechat-status--online {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
