type DemoLabState = {
  paused: boolean;
  reduced: boolean;
  perf: boolean;
};

const STORAGE_KEY = 'demo-lab:state';

const parseStoredState = (): DemoLabState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { paused: false, reduced: false, perf: false };
    const parsed = JSON.parse(raw) as Partial<DemoLabState>;
    return {
      paused: Boolean(parsed.paused),
      reduced: Boolean(parsed.reduced),
      perf: Boolean(parsed.perf),
    };
  } catch {
    return { paused: false, reduced: false, perf: false };
  }
};

const persistState = (state: DemoLabState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors (private mode, disabled storage, etc.)
  }
};

const applyStateToDOM = (state: DemoLabState) => {
  const root = document.documentElement;
  root.dataset.demoPaused = state.paused ? 'true' : 'false';
  root.dataset.demoReducedMotion = state.reduced ? 'true' : 'false';
  root.dataset.demoPerf = state.perf ? 'true' : 'false';

  // Helpful body class for scoping any future CSS overrides.
  document.body.classList.add('demo-lab');
};

const getDemoModules = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-demo-module]'));

const applyStateToModules = (modules: HTMLElement[], state: DemoLabState) => {
  modules.forEach(mod => {
    const offscreen = mod.dataset.demoOffscreen === 'true';
    const paused = state.paused || state.reduced || offscreen;

    mod.dataset.demoPaused = paused ? 'true' : 'false';
    mod.dataset.demoPerf = state.perf ? 'true' : 'false';
    mod.dataset.demoReducedMotion = state.reduced ? 'true' : 'false';
  });
};

const startOffscreenPauser = (
  modules: HTMLElement[],
  state: DemoLabState
): (() => void) => {
  if (!('IntersectionObserver' in window)) {
    // Best-effort fallback: treat everything as on-screen.
    modules.forEach(mod => {
      mod.dataset.demoOffscreen = 'false';
    });
    applyStateToModules(modules, state);
    return () => undefined;
  }

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        const el = entry.target as HTMLElement;
        el.dataset.demoOffscreen = entry.isIntersecting ? 'false' : 'true';
      });
      applyStateToModules(modules, state);
    },
    {
      rootMargin: '250px 0px',
      threshold: 0.01,
    }
  );

  modules.forEach(mod => observer.observe(mod));

  return () => observer.disconnect();
};

const syncButtons = (state: DemoLabState) => {
  const buttons = document.querySelectorAll<HTMLButtonElement>(
    'button.demo-toggle[data-demo-toggle]'
  );

  buttons.forEach(btn => {
    const key = btn.dataset.demoToggle as keyof DemoLabState | undefined;
    if (!key) return;

    const pressed = Boolean(state[key]);
    btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');

    // Simple visual hint; keep it light to avoid fighting Tailwind styles.
    if (pressed) {
      btn.classList.add('border-accent-500', 'bg-accent-500/15');
      btn.classList.remove('border-white/10', 'bg-white/5');
    } else {
      btn.classList.remove('border-accent-500', 'bg-accent-500/15');
      btn.classList.add('border-white/10', 'bg-white/5');
    }
  });
};

const initDemoLab = () => {
  if (typeof window === 'undefined') return;

  const state = parseStoredState();
  const modules = getDemoModules();
  const stopOffscreenPauser = startOffscreenPauser(modules, state);
  applyStateToDOM(state);
  applyStateToModules(modules, state);
  syncButtons(state);

  document.addEventListener('click', event => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLButtonElement>(
      'button.demo-toggle[data-demo-toggle]'
    );
    if (!button) return;

    const key = button.dataset.demoToggle as keyof DemoLabState | undefined;
    if (!key) return;

    state[key] = !state[key];
    persistState(state);
    applyStateToDOM(state);
    applyStateToModules(modules, state);
    syncButtons(state);
  });

  window.addEventListener('beforeunload', () => {
    stopOffscreenPauser();
  });
};

initDemoLab();
