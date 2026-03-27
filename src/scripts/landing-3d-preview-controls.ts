type PreviewHeroVariant = 'nexus' | 'neural' | 'skyline' | 'storm';

type PreviewHeroRoot = HTMLElement & {
  dataset: DOMStringMap & {
    heroVariant?: PreviewHeroVariant;
    heroSpeed?: string;
    heroZoom?: string;
  };
};

type PreviewShell = HTMLElement & {
  dataset: DOMStringMap & {
    landing3dPreviewBound?: string;
  };
};

const DEFAULT_SCENE: PreviewHeroVariant = 'nexus';
const DEFAULT_SPEED = '1';
const DEFAULT_ZOOM = '0';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function setPressedState(buttons: HTMLElement[], activeValue: string) {
  buttons.forEach(button => {
    const values = [
      button.dataset.sceneValue,
      button.dataset.speedValue,
      button.dataset.zoomValue,
    ].filter(Boolean);
    const isActive = values.includes(activeValue);

    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function updatePreviewStatus(shell: PreviewShell, root: PreviewHeroRoot) {
  const sceneButton = shell.querySelector<HTMLElement>(
    `[data-landing-3d-control="scene"][data-scene-value="${root.dataset.heroVariant ?? DEFAULT_SCENE}"]`
  );
  const speedButton = shell.querySelector<HTMLElement>(
    `[data-landing-3d-control="speed"][data-speed-value="${root.dataset.heroSpeed ?? DEFAULT_SPEED}"]`
  );
  const zoomButton = shell.querySelector<HTMLElement>(
    `[data-landing-3d-control="zoom"][data-zoom-value="${root.dataset.heroZoom ?? DEFAULT_ZOOM}"]`
  );

  const sceneLabel = sceneButton?.dataset.sceneLabel ?? 'Creative Nexus';
  const sceneNote =
    sceneButton?.dataset.sceneNote ??
    'Dense, premium signal choreography for the strongest flagship feel.';
  const speedLabel = speedButton?.dataset.speedLabel ?? 'Live';
  const zoomLabel = zoomButton?.dataset.zoomLabel ?? 'Wide';

  const sceneLabelNode = shell.querySelector<HTMLElement>(
    '[data-landing-3d-scene-label]'
  );
  const sceneNoteNode = shell.querySelector<HTMLElement>(
    '[data-landing-3d-scene-note]'
  );
  const tempoLabelNode = shell.querySelector<HTMLElement>(
    '[data-landing-3d-tempo-label]'
  );
  const cameraLabelNode = shell.querySelector<HTMLElement>(
    '[data-landing-3d-camera-label]'
  );
  const statusNode = shell.querySelector<HTMLElement>(
    '[data-landing-3d-status]'
  );

  if (
    !sceneLabelNode ||
    !sceneNoteNode ||
    !tempoLabelNode ||
    !cameraLabelNode ||
    !statusNode
  ) {
    return;
  }

  sceneLabelNode.textContent = sceneLabel;
  sceneNoteNode.textContent = sceneNote;
  tempoLabelNode.textContent = `Tempo · ${speedLabel}`;
  cameraLabelNode.textContent = `Camera · ${zoomLabel}`;
  statusNode.textContent = `${sceneLabel} scene active · ${speedLabel} tempo · ${zoomLabel} framing.`;
}

function initPreviewShell(shell: PreviewShell) {
  if (shell.dataset.landing3dPreviewBound === '1') {
    return;
  }

  const root = shell.querySelector<PreviewHeroRoot>('[data-hero-root]');
  if (!root) {
    return;
  }

  shell.dataset.landing3dPreviewBound = '1';

  root.dataset.heroVariant = root.dataset.heroVariant ?? DEFAULT_SCENE;
  root.dataset.heroSpeed = root.dataset.heroSpeed ?? DEFAULT_SPEED;
  root.dataset.heroZoom = root.dataset.heroZoom ?? DEFAULT_ZOOM;

  const sceneButtons = Array.from(
    shell.querySelectorAll<HTMLElement>('[data-landing-3d-control="scene"]')
  );
  const speedButtons = Array.from(
    shell.querySelectorAll<HTMLElement>('[data-landing-3d-control="speed"]')
  );
  const zoomButtons = Array.from(
    shell.querySelectorAll<HTMLElement>('[data-landing-3d-control="zoom"]')
  );

  const syncUi = () => {
    setPressedState(sceneButtons, root.dataset.heroVariant ?? DEFAULT_SCENE);
    setPressedState(speedButtons, root.dataset.heroSpeed ?? DEFAULT_SPEED);
    setPressedState(zoomButtons, root.dataset.heroZoom ?? DEFAULT_ZOOM);
    updatePreviewStatus(shell, root);
  };

  sceneButtons.forEach(button => {
    button.addEventListener('click', () => {
      const nextVariant = (button.dataset.sceneValue ||
        DEFAULT_SCENE) as PreviewHeroVariant;
      if (root.dataset.heroVariant === nextVariant) {
        syncUi();
        return;
      }

      root.dataset.heroVariant = nextVariant;
      syncUi();
      window.dispatchEvent(new Event('hero:remount'));
    });
  });

  speedButtons.forEach(button => {
    button.addEventListener('click', () => {
      const nextSpeed = clamp(
        Number.parseFloat(button.dataset.speedValue || DEFAULT_SPEED),
        0.25,
        2
      );
      root.dataset.heroSpeed = String(nextSpeed);
      syncUi();
    });
  });

  zoomButtons.forEach(button => {
    button.addEventListener('click', () => {
      const nextZoom = clamp(
        Number.parseFloat(button.dataset.zoomValue || DEFAULT_ZOOM),
        0,
        1
      );
      root.dataset.heroZoom = String(nextZoom);
      syncUi();
    });
  });

  shell
    .querySelector<HTMLElement>('[data-landing-3d-control="reset"]')
    ?.addEventListener('click', () => {
      root.dataset.heroVariant = DEFAULT_SCENE;
      root.dataset.heroSpeed = DEFAULT_SPEED;
      root.dataset.heroZoom = DEFAULT_ZOOM;
      syncUi();
      window.dispatchEvent(new Event('hero:remount'));
    });

  syncUi();
}

function mountAllPreviewControls() {
  document
    .querySelectorAll<PreviewShell>('[data-landing-3d-preview-shell]')
    .forEach(initPreviewShell);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountAllPreviewControls, {
    once: true,
  });
} else {
  mountAllPreviewControls();
}

window.addEventListener('astro:page-load', mountAllPreviewControls);

export {};
