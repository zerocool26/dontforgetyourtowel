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
  const diagnosticsUrl = new URL(
    'debug-webgl/',
    import.meta.env.BASE_URL
  ).toString();
  const showBootError = (title: string, details?: string) => {
    let overlay = root.querySelector<HTMLElement>('.tower3d-error-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'tower3d-error-overlay';
      overlay.style.cssText =
        'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(2,4,10,0.92);color:#e5e7eb;z-index:9999;text-align:center;';
      root.appendChild(overlay);
    }

    const debug = {
      url: typeof location !== 'undefined' ? location.href : '',
      ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      webdriver:
        typeof navigator !== 'undefined' ? Boolean(navigator.webdriver) : false,
      caps,
    };

    const debugText = JSON.stringify(debug, null, 2);

    overlay.innerHTML = `
      <div style="max-width:720px;text-align:left">
        <div style="font-weight:800;font-size:18px;margin-bottom:10px">${title}</div>
        <div style="opacity:0.9;font-size:14px;line-height:1.5;margin-bottom:12px">
          ${details ? details : 'The 3D experience failed to start on this device.'}
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button type="button" data-copy style="display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.14);color:#e5e7eb;padding:8px 10px;border-radius:10px;cursor:pointer">
            Copy diagnostics
          </button>
          <button type="button" data-open-diag style="display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#e5e7eb;padding:8px 10px;border-radius:10px;cursor:pointer">
            Open diagnostics
          </button>
        </div>
        <pre style="margin-top:12px;max-height:220px;overflow:auto;padding:12px;border-radius:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);font-size:12px;line-height:1.4;white-space:pre-wrap">${debugText}</pre>
      </div>
    `;

    const btn = overlay.querySelector<HTMLButtonElement>('[data-copy]');
    btn?.addEventListener(
      'click',
      async () => {
        try {
          await navigator.clipboard.writeText(debugText);
          btn.textContent = 'Copied';
          window.setTimeout(() => {
            btn.textContent = 'Copy diagnostics';
          }, 1200);
        } catch {
          // ignore
        }
      },
      { once: true }
    );

    const diagBtn =
      overlay.querySelector<HTMLButtonElement>('[data-open-diag]');
    diagBtn?.addEventListener(
      'click',
      () => {
        window.open(diagnosticsUrl, '_blank', 'noopener');
      },
      { once: true }
    );
  };

  let director: SceneDirector;
  try {
    director = new SceneDirector(root, canvas, caps);
  } catch (e) {
    console.error('[Tower3D] Boot failed:', e);
    showBootError(
      '3D failed to start',
      'WebGL may be unavailable or initialization failed. Try a full browser with hardware acceleration enabled (Chrome/Edge: Settings → System).'
    );
    return {
      destroy: () => {
        root.querySelector<HTMLElement>('.tower3d-error-overlay')?.remove();
      },
    };
  }

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
