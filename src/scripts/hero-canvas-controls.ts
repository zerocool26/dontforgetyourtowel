type HeroVariant = 'auto' | 'skyline' | 'neural' | 'city' | 'storm' | 'aurora';

type ControlKind = 'variant' | 'speed' | 'zoom' | 'tint' | 'reset';

type HeroRoot = HTMLElement & {
  dataset: DOMStringMap & {
    heroVariant?: HeroVariant;
    heroSpeed?: string;
    heroZoom?: string;
  };
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function findHeroRootFrom(el: HTMLElement): HeroRoot | null {
  return (
    el.closest('section')?.querySelector<HeroRoot>('[data-hero-root]') ?? null
  );
}

function setTint(root: HeroRoot, hex: string, opacity: number) {
  root.style.setProperty('--hero-tint-color', hex);
  root.style.setProperty('--hero-tint-opacity', String(opacity));
}

function applyDefaults(root: HeroRoot) {
  root.dataset.heroVariant = 'skyline';
  root.dataset.heroSpeed = '1';
  root.dataset.heroZoom = '0';
  setTint(root, '#22d3ee', 0);
}

function initHeroControls(section: HTMLElement) {
  const toggle = section.querySelector<HTMLButtonElement>(
    '[data-hero-controls-toggle]'
  );
  const panel = section.querySelector<HTMLElement>(
    '[data-hero-controls-panel]'
  );
  if (!toggle || !panel) return;

  const root = findHeroRootFrom(section);
  if (!root) return;

  // Ensure defaults exist.
  if (!root.dataset.heroVariant) root.dataset.heroVariant = 'skyline';
  if (!root.dataset.heroSpeed) root.dataset.heroSpeed = '1';
  if (!root.dataset.heroZoom) root.dataset.heroZoom = '0';

  const setOpen = (open: boolean) => {
    panel.classList.toggle('hidden', !open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  toggle.addEventListener('click', () => {
    setOpen(panel.classList.contains('hidden'));
  });

  const controls = panel.querySelectorAll<HTMLElement>('[data-hero-control]');
  controls.forEach(control => {
    const kind = control.dataset.heroControl as ControlKind | undefined;
    if (!kind) return;

    if (kind === 'reset') {
      control.addEventListener('click', () => {
        applyDefaults(root);
        const variantSelect = panel.querySelector<HTMLSelectElement>(
          '[data-hero-control="variant"]'
        );
        const speedRange = panel.querySelector<HTMLInputElement>(
          '[data-hero-control="speed"]'
        );
        const zoomRange = panel.querySelector<HTMLInputElement>(
          '[data-hero-control="zoom"]'
        );
        const tintInput = panel.querySelector<HTMLInputElement>(
          '[data-hero-control="tint"]'
        );

        if (variantSelect)
          variantSelect.value = root.dataset.heroVariant ?? 'skyline';
        if (speedRange) speedRange.value = '1';
        if (zoomRange) zoomRange.value = '0';
        if (tintInput) tintInput.value = '#22d3ee';
      });
      return;
    }

    const onInput = () => {
      if (kind === 'variant' && control instanceof HTMLSelectElement) {
        const next = (control.value || 'skyline') as HeroVariant;
        root.dataset.heroVariant = next;
        window.dispatchEvent(new Event('hero:remount'));
        return;
      }

      if (kind === 'speed' && control instanceof HTMLInputElement) {
        const next = clamp(Number.parseFloat(control.value || '1'), 0.25, 2);
        root.dataset.heroSpeed = String(next);
        return;
      }

      if (kind === 'zoom' && control instanceof HTMLInputElement) {
        const next = clamp(Number.parseFloat(control.value || '0'), 0, 1);
        root.dataset.heroZoom = String(next);
        return;
      }

      if (kind === 'tint' && control instanceof HTMLInputElement) {
        const hex = control.value || '#22d3ee';
        // Keep it subtle by default; user can pick bright colors.
        setTint(root, hex, 0.18);
      }
    };

    control.addEventListener('input', onInput, { passive: true });
    control.addEventListener('change', onInput, { passive: true });
  });
}

function mountAll() {
  document.querySelectorAll<HTMLElement>('section').forEach(section => {
    if (section.querySelector('[data-hero-controls-toggle]')) {
      initHeroControls(section);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountAll, { once: true });
} else {
  mountAll();
}

window.addEventListener('astro:page-load', mountAll);

export {};
