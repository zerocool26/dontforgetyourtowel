import { createAstroMount } from './immersive/core/lifecycle';
import { getImmersiveCaps } from './immersive/core/caps';
import { setupImmersiveChoreography } from './immersive/ui/choreography';
import { ThreeStage } from './immersive/three/stage';

type IHWindow = Window & {
  __ih2?: {
    destroy: () => void;
  };
};

const mount = () => {
  const root = document.querySelector<HTMLElement>('[data-ih]');
  if (!root) return null;

  // Debug overlay opt-in: add ?ihDebug=1 to the URL.
  const params = new URLSearchParams(window.location.search);
  root.dataset.ihDebug = params.get('ihDebug') === '1' ? '1' : '0';

  const caps = getImmersiveCaps();

  // Default: assume WebGL unless we explicitly fall back.
  root.dataset.ihCenter = 'webgl';
  root.dataset.ihStatus = 'ok';
  root.dataset.ihStatusDetail = '';

  const canvas = root.querySelector<HTMLCanvasElement>('[data-ih-canvas]');
  if (!canvas) {
    root.dataset.ihCenter = 'css';
    root.dataset.ihStatus = 'init-failed';
    root.dataset.ihStatusDetail = 'Canvas missing';
    return null;
  }

  const cleanups: Array<() => void> = [];

  // UI choreography (scroll panels + modes). Always safe.
  cleanups.push(setupImmersiveChoreography(root, caps));

  // 3D stage (optional).
  let stage: ThreeStage | null = null;
  if (!caps.webgl) {
    root.dataset.ihCenter = 'css';
    root.dataset.ihStatus = 'webgl-unavailable';
    root.dataset.ihStatusDetail = 'WebGL not available';
  } else {
    try {
      stage = new ThreeStage(root, canvas, caps);
    } catch (err) {
      root.dataset.ihCenter = 'css';
      root.dataset.ihStatus = 'init-failed';
      root.dataset.ihStatusDetail =
        err instanceof Error ? err.message : 'WebGL init failed';
      stage = null;
    }
  }

  const onResize = () => stage?.resize();
  window.addEventListener('resize', onResize, { passive: true });
  cleanups.push(() => window.removeEventListener('resize', onResize));

  // Single RAF loop for the 3D (only when WebGL is active).
  let raf = 0;
  if (stage) {
    const tick = () => {
      stage?.tick();

      // If the stage decided to fall back to CSS, stop looping.
      if (root.dataset.ihCenter === 'css') {
        stage?.destroy();
        stage = null;
        return;
      }

      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    cleanups.push(() => window.cancelAnimationFrame(raf));
    cleanups.push(() => stage?.destroy());
  }

  const w = window as IHWindow;
  w.__ih2?.destroy();
  w.__ih2 = {
    destroy: () => {
      cleanups.splice(0).forEach(fn => fn());
    },
  };

  return w.__ih2;
};

createAstroMount('[data-ih]', mount);
