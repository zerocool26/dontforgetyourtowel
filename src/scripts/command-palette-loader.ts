let mountPromise: Promise<void> | null = null;
let mounted = false;

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'select' || tagName === 'textarea';
};

const mountCommandPalette = () => {
  if (mounted) return Promise.resolve();
  if (mountPromise) return mountPromise;

  mountPromise = Promise.all([
    import('preact'),
    import('../components/CommandPalette'),
  ])
    .then(([{ render, h }, { default: CommandPalette }]) => {
      if (mounted) return;

      const root = document.createElement('div');
      root.id = 'command-palette-root';
      document.body.appendChild(root);
      render(h(CommandPalette, { initialOpen: true }), root);
      mounted = true;
    })
    .catch(error => {
      mountPromise = null;
      console.error('Unable to load command palette', error);
    });

  return mountPromise;
};

const openCommandPalette = () => {
  void mountCommandPalette();
};

const handleShortcut = (event: KeyboardEvent) => {
  const key = event.key.toLowerCase();
  if (key !== 'k') return;
  if (!event.ctrlKey && !event.metaKey) return;
  if (isEditableTarget(event.target)) return;

  event.preventDefault();
  openCommandPalette();
};

window.addEventListener('keydown', handleShortcut);
window.addEventListener('command-palette:open', openCommandPalette);
window.addEventListener('command-palette:toggle', openCommandPalette);
