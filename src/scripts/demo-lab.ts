import type { DemoLabState } from '../utils/demo-lab';
import {
  applyDemoLabStateToDOM,
  parseStoredDemoLabState,
  persistDemoLabState,
} from '../utils/demo-lab';

declare global {
  interface Window {
    __demoLabBound?: boolean;
  }
}

let cleanupCurrent: (() => void) | null = null;

function cleanup(): void {
  cleanupCurrent?.();
  cleanupCurrent = null;
}

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

const formatStatusSummary = (state: DemoLabState): string => {
  const paused = state.paused ? 'on' : 'off';
  const reducedMotion = state.reduced ? 'on' : 'off';
  const perfMode = state.perf ? 'on' : 'off';
  return `Demo safety status: pause ${paused}, reduced motion ${reducedMotion}, perf mode ${perfMode}.`;
};

const syncStatusOutput = (state: DemoLabState) => {
  const statusNodes =
    document.querySelectorAll<HTMLElement>('[data-demo-status]');
  const summary = formatStatusSummary(state);

  statusNodes.forEach(node => {
    node.textContent = summary;
  });
};

export function initDemoLab(): void {
  if (typeof window === 'undefined') return;

  // Tear down any previous init so we don't keep old observers/listeners
  // alive across Astro view transitions.
  cleanup();

  const state = parseStoredDemoLabState();
  const modules = getDemoModules();

  const hasModules = modules.length > 0;
  const hasToggles = Boolean(
    document.querySelector('button.demo-toggle[data-demo-toggle]')
  );

  // If the page doesn't contain demo lab UI, do nothing.
  if (!hasModules && !hasToggles) return;

  const controller = new AbortController();
  const stopOffscreenPauser = startOffscreenPauser(modules, state);

  applyDemoLabStateToDOM(state);
  applyStateToModules(modules, state);
  syncButtons(state);
  syncStatusOutput(state);

  const onClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLButtonElement>(
      'button.demo-toggle[data-demo-toggle]'
    );
    if (!button) return;

    const key = button.dataset.demoToggle as keyof DemoLabState | undefined;
    if (!key) return;

    state[key] = !state[key];
    persistDemoLabState(state);
    applyDemoLabStateToDOM(state);
    applyStateToModules(modules, state);
    syncButtons(state);
    syncStatusOutput(state);
  };

  document.addEventListener('click', onClick, {
    signal: controller.signal,
  } as AddEventListenerOptions);

  window.addEventListener(
    'beforeunload',
    () => {
      stopOffscreenPauser();
    },
    { signal: controller.signal } as AddEventListenerOptions
  );

  cleanupCurrent = () => {
    controller.abort();
    stopOffscreenPauser();
  };
}

function bindOnce(): void {
  if (typeof window === 'undefined') return;

  if (window.__demoLabBound) {
    // If this module is imported again, re-init safely.
    initDemoLab();
    return;
  }
  window.__demoLabBound = true;

  initDemoLab();

  document.addEventListener('astro:page-load', () => {
    initDemoLab();
  });

  // Clean up before Astro swaps the DOM so stale observers/listeners don't
  // hold references to removed nodes.
  document.addEventListener('astro:before-swap', () => {
    cleanup();
  });
}

bindOnce();
