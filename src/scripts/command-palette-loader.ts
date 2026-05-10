let root: HTMLDivElement | null = null;
let dialog: HTMLDivElement | null = null;
let input: HTMLInputElement | null = null;
let list: HTMLDivElement | null = null;
let mounted = false;
let isOpen = false;

interface PaletteCommand {
  id: string;
  label: string;
  href: string;
  keywords: string[];
}

const commands: PaletteCommand[] = [
  {
    id: 'open-solution-hub',
    label: 'Open Solution Hub',
    href: '/services/',
    keywords: ['solution hub', 'services', 'managed it', 'support'],
  },
  {
    id: 'open-pricing',
    label: 'Open Pricing',
    href: '/pricing/',
    keywords: ['pricing', 'budget', 'cost'],
  },
  {
    id: 'open-contact-hq',
    label: 'Open Contact HQ',
    href: '/contact-hq/',
    keywords: ['contact', 'intake', 'fit'],
  },
  {
    id: 'open-ecommerce-demo',
    label: 'Open E Commerce Demo',
    href: '/about/',
    keywords: ['demo', 'shop', 'e commerce', 'portfolio'],
  },
  {
    id: 'open-blog',
    label: 'Open Blog',
    href: '/blog/',
    keywords: ['blog', 'articles', 'insights'],
  },
];

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'select' || tagName === 'textarea';
};

const getBasePath = (): string => {
  const rawBasePath =
    document.documentElement.getAttribute('data-base-path') || '/';
  if (!rawBasePath || rawBasePath === '/') return '';
  return rawBasePath.replace(/\/+$/, '');
};

const toUrl = (href: string): string => {
  const basePath = getBasePath();
  if (!basePath) return href;
  return `${basePath}${href === '/' ? '' : href}`;
};

const getFilteredCommands = (query: string): PaletteCommand[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return commands;

  return commands.filter(command => {
    const haystack = [command.label, ...command.keywords]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });
};

const navigateToCommand = (command: PaletteCommand | undefined) => {
  if (!command) return;
  window.location.assign(toUrl(command.href));
};

const renderList = () => {
  if (!list || !input) return;

  const listElement = list;

  const filtered = getFilteredCommands(input.value);
  listElement.replaceChildren();

  filtered.forEach((command, index) => {
    const option = document.createElement('button');
    option.type = 'button';
    option.setAttribute('role', 'option');
    option.className = 'command-palette-option';
    option.dataset.commandId = command.id;
    option.dataset.commandHref = command.href;
    option.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
    option.textContent = command.label;
    option.addEventListener('click', () => navigateToCommand(command));
    listElement.appendChild(option);
  });

  if (filtered.length === 0) {
    const emptyState = document.createElement('p');
    emptyState.className = 'command-palette-empty';
    emptyState.textContent = 'No matching commands yet.';
    listElement.appendChild(emptyState);
  }
};

const closeCommandPalette = () => {
  if (!dialog) return;
  dialog.hidden = true;
  isOpen = false;
};

const openCommandPalette = () => {
  if (!mounted) {
    mountCommandPalette();
  }

  if (!dialog || !input) return;
  dialog.hidden = false;
  isOpen = true;
  input.value = '';
  renderList();
  window.requestAnimationFrame(() => input?.focus());
};

const mountCommandPalette = () => {
  if (mounted) return;

  root = document.createElement('div');
  root.id = 'command-palette-root';
  root.innerHTML = `
    <style>
      #command-palette-root {
        position: fixed;
        inset: 0;
        z-index: 140;
        pointer-events: none;
      }

      #command-palette-root [hidden] {
        display: none !important;
      }

      .command-palette-backdrop {
        position: fixed;
        inset: 0;
        display: grid;
        place-items: start center;
        padding: clamp(1rem, 4vw, 2.5rem) 1rem;
        background: rgba(4, 10, 18, 0.72);
        backdrop-filter: blur(14px);
        pointer-events: auto;
      }

      .command-palette-dialog {
        width: min(42rem, 100%);
        border: 1px solid color-mix(in srgb, var(--color-border) 78%, transparent);
        border-radius: 1.25rem;
        background: color-mix(in srgb, var(--color-surface) 96%, transparent);
        box-shadow: 0 32px 90px -48px rgba(0, 0, 0, 0.75);
        overflow: hidden;
      }

      .command-palette-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1rem 1rem 0.75rem;
      }

      .command-palette-title {
        margin: 0;
        color: var(--color-text-primary);
        font-size: 0.95rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .command-palette-close {
        min-width: 2.5rem;
        min-height: 2.5rem;
        border: 1px solid color-mix(in srgb, var(--color-border) 76%, transparent);
        border-radius: 999px;
        background: transparent;
        color: var(--color-text-primary);
        cursor: pointer;
      }

      .command-palette-input {
        width: calc(100% - 2rem);
        margin: 0 1rem 1rem;
        min-height: 3.25rem;
        border: 1px solid color-mix(in srgb, var(--color-border) 78%, transparent);
        border-radius: 0.95rem;
        background: color-mix(in srgb, var(--color-background) 68%, transparent);
        padding: 0.9rem 1rem;
        color: var(--color-text-primary);
        font-size: 1rem;
      }

      .command-palette-input::placeholder {
        color: color-mix(in srgb, var(--color-text-muted) 92%, transparent);
      }

      .command-palette-list {
        display: grid;
        gap: 0.65rem;
        padding: 0 1rem 1rem;
      }

      .command-palette-option {
        min-height: 3.25rem;
        border: 1px solid color-mix(in srgb, var(--color-border) 72%, transparent);
        border-radius: 0.95rem;
        background: color-mix(in srgb, var(--color-surface) 90%, transparent);
        padding: 0.9rem 1rem;
        color: var(--color-text-primary);
        text-align: left;
        cursor: pointer;
      }

      .command-palette-option:hover,
      .command-palette-option[aria-selected='true'] {
        border-color: color-mix(in srgb, var(--color-primary) 34%, transparent);
        background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface) 90%);
      }

      .command-palette-empty {
        margin: 0;
        padding: 0.75rem 0.25rem 0.25rem;
        color: color-mix(in srgb, var(--color-text-secondary) 92%, transparent);
      }
    </style>
    <div class="command-palette-backdrop" hidden>
      <div
        class="command-palette-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div class="command-palette-header">
          <p class="command-palette-title">Command palette</p>
          <button class="command-palette-close" type="button" aria-label="Close command palette">×</button>
        </div>
        <input
          class="command-palette-input"
          type="text"
          role="combobox"
          aria-label="Search commands"
          aria-expanded="true"
          aria-controls="command-palette-listbox"
          placeholder="Search commands"
          autocomplete="off"
        />
        <div class="command-palette-list" id="command-palette-listbox" role="listbox"></div>
      </div>
    </div>
  `;

  document.body.appendChild(root);

  dialog = root.querySelector('.command-palette-backdrop');
  input = root.querySelector('.command-palette-input');
  list = root.querySelector('.command-palette-list');
  const closeButton = root.querySelector('.command-palette-close');
  const dialogCard = root.querySelector('.command-palette-dialog');

  dialog?.addEventListener('click', event => {
    if (event.target === dialog) closeCommandPalette();
  });
  closeButton?.addEventListener('click', closeCommandPalette);
  dialogCard?.addEventListener('click', event => event.stopPropagation());
  input?.addEventListener('input', renderList);
  input?.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      navigateToCommand(getFilteredCommands(input?.value || '')[0]);
    }
  });

  mounted = true;
};

const toggleCommandPalette = () => {
  if (isOpen) {
    closeCommandPalette();
    return;
  }

  openCommandPalette();
};

const handleShortcut = (event: KeyboardEvent) => {
  const key = event.key.toLowerCase();
  if (key === 'escape' && isOpen) {
    closeCommandPalette();
    return;
  }

  if (key === 'enter' && isOpen) {
    event.preventDefault();
    navigateToCommand(getFilteredCommands(input?.value || '')[0]);
    return;
  }

  if (key !== 'k') return;
  if (!event.ctrlKey && !event.metaKey) return;
  if (isEditableTarget(event.target)) return;

  event.preventDefault();
  toggleCommandPalette();
};

window.addEventListener('keydown', handleShortcut);
window.addEventListener('command-palette:open', openCommandPalette);
window.addEventListener('command-palette:toggle', toggleCommandPalette);
