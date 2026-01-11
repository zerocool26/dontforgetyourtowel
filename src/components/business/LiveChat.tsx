import { useEffect, useMemo, useState } from 'preact/hooks';

type Status = 'online' | 'offline';

export default function LiveChat() {
  const [open, setOpen] = useState(false);
  const [status] = useState<Status>('offline');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const nameId = 'livechat-name';
  const emailId = 'livechat-email';
  const messageId = 'livechat-message';

  useEffect(() => {
    const t = window.setTimeout(() => {
      // proactive greeting: keep unobtrusive
      setOpen(false);
    }, 10_000);
    return () => window.clearTimeout(t);
  }, []);

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && message.trim().length > 3;
  }, [email, message]);

  return (
    <div class="fixed bottom-20 right-4 z-50 md:bottom-6">
      <button
        type="button"
        class="h-14 w-14 rounded-full border border-white/10 bg-accent-500 text-white shadow-lg"
        aria-label="Open chat"
        onClick={() => setOpen(o => !o)}
      >
        <span aria-hidden="true">Chat</span>
      </button>

      {open && (
        <div class="mt-3 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 backdrop-blur">
          <div class="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
            <div>
              <p class="text-sm font-semibold text-white">Live chat</p>
              <p class="text-xs text-zinc-400">
                Status: {status === 'online' ? 'Online' : 'Offline — leave a message'}
              </p>
            </div>
            <button
              type="button"
              class="text-sm text-zinc-300"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>

          <form
            class="space-y-3 px-4 py-4"
            onSubmit={e => {
              e.preventDefault();
              if (!canSubmit) return;
              // No backend in this template: store locally so nothing gets lost.
              const payload = {
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
              setMessage('');
              setOpen(false);
            }}
          >
            <label class="sr-only" htmlFor={nameId}>
              Name (optional)
            </label>
            <input
              class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
              id={nameId}
              aria-label="Name (optional)"
              type="text"
              placeholder="Name (optional)"
              value={name}
              onInput={e => setName((e.target as HTMLInputElement).value)}
              autoComplete="name"
            />

            <label class="sr-only" htmlFor={emailId}>
              Email
            </label>
            <input
              class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
              id={emailId}
              aria-label="Email"
              type="email"
              placeholder="Email"
              value={email}
              onInput={e => setEmail((e.target as HTMLInputElement).value)}
              autoComplete="email"
              required
            />

            <label class="sr-only" htmlFor={messageId}>
              Message
            </label>
            <textarea
              class="min-h-[120px] w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
              id={messageId}
              aria-label="Message"
              placeholder="How can we help?"
              value={message}
              onInput={e => setMessage((e.target as HTMLTextAreaElement).value)}
              required
            />

            <button
              type="submit"
              disabled={!canSubmit}
              class={
                'inline-flex min-h-[48px] w-full items-center justify-center rounded-xl px-4 text-sm font-semibold text-white ' +
                (canSubmit ? 'bg-accent-500' : 'bg-white/10 text-zinc-400')
              }
            >
              Send message
            </button>

            <p class="text-[0.7rem] text-zinc-500">
              This template stores messages locally. Connect it to your CRM/email
              in production.
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
