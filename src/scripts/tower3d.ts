import { createAstroMount } from './tower3d/core/astro-mount';
import { getTowerCaps } from './tower3d/core/caps';
import { SceneDirector } from './tower3d/three/scene-director';

const ROOT_SELECTOR = '[data-tower3d-root]';

createAstroMount(ROOT_SELECTOR, () => {
  const root = document.querySelector<HTMLElement>(ROOT_SELECTOR);
  if (!root) return null;

  const canvas = root.querySelector<HTMLCanvasElement>(
    'canvas[data-tower3d-canvas]'
  );
  if (!canvas) return null;

  const caps = getTowerCaps();
  if (!caps.webgl) return null;

  const director = new SceneDirector(root, canvas, caps);

  let raf = 0;
  const isActive = () => {
    const rect = root.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  };
  const tick = () => {
    if (isActive()) director.tick();
    raf = window.requestAnimationFrame(tick);
  };

  const onResize = () => director.resize();
  window.addEventListener('resize', onResize, { passive: true });

  raf = window.requestAnimationFrame(tick);

  return {
    destroy: () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      director.destroy();
    },
  };
});
