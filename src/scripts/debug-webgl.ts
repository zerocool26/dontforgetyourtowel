import { createSafeWebGLRenderer } from './tower3d/three/renderer-factory';

type NavigatorExtras = {
  webdriver?: boolean;
  platform?: string;
  vendor?: string;
  hardwareConcurrency?: number;
  deviceMemory?: number;
};

const getNavigatorExtras = (): NavigatorExtras => {
  const nav = navigator as Navigator & Partial<NavigatorExtras>;
  return {
    webdriver: Boolean(nav.webdriver),
    platform: typeof nav.platform === 'string' ? nav.platform : undefined,
    vendor: typeof nav.vendor === 'string' ? nav.vendor : undefined,
    hardwareConcurrency:
      typeof nav.hardwareConcurrency === 'number'
        ? nav.hardwareConcurrency
        : undefined,
    deviceMemory:
      typeof nav.deviceMemory === 'number' ? nav.deviceMemory : undefined,
  };
};

type WebGLContextResult = {
  kind: 'webgl2' | 'webgl' | 'experimental-webgl';
  ok: boolean;
  error?: string;
  attrs?: WebGLContextAttributes;
  info?: Record<string, string>;
};

type ProbeReport = {
  timestamp: string;
  url: string;
  baseURI: string;
  origin: string;
  baseUrlEnv?: string;
  ua: string;
  platform?: string;
  vendor?: string;
  webdriver?: boolean;
  dpr: number;
  viewport: { w: number; h: number };
  visualViewport?: { w: number; h: number; scale: number };
  prefs: {
    reducedMotion: boolean;
    coarsePointer: boolean;
  };
  device: {
    hardwareConcurrency?: number;
    deviceMemory?: number;
  };
  serviceWorker: {
    supported: boolean;
    controller: boolean;
    registrations?: Array<{ scope: string; scriptURL: string }>;
  };
  caches?: string[];
  assetChecks?: Array<{ url: string; status: number; ok: boolean }>;
  webgl: {
    contexts: WebGLContextResult[];
    safeRenderer: { ok: boolean; error?: string };
  };
};

const safeJson = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const $ = (selector: string) => document.querySelector<HTMLElement>(selector);

const getBoolMedia = (query: string) => {
  try {
    return Boolean(window.matchMedia?.(query).matches);
  } catch {
    return false;
  }
};

const formatAttrs = (attrs?: WebGLContextAttributes) => {
  if (!attrs) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== undefined) out[k] = v;
  }
  return out as WebGLContextAttributes;
};

const tryGetContext = (
  canvas: HTMLCanvasElement,
  kind: WebGLContextResult['kind'],
  attrs?: WebGLContextAttributes
) => {
  try {
    return attrs ? canvas.getContext(kind, attrs) : canvas.getContext(kind);
  } catch (e) {
    return e;
  }
};

const isWebGLContext = (
  value: unknown
): value is WebGLRenderingContext | WebGL2RenderingContext => {
  if (!value) return false;
  const maybe = value as { getParameter?: unknown };
  return typeof maybe.getParameter === 'function';
};

const getWebGLInfo = (gl: WebGLRenderingContext | WebGL2RenderingContext) => {
  const info: Record<string, string> = {};
  try {
    info.VERSION = String(gl.getParameter(gl.VERSION));
    info.SHADING_LANGUAGE_VERSION = String(
      gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
    );
    info.VENDOR = String(gl.getParameter(gl.VENDOR));
    info.RENDERER = String(gl.getParameter(gl.RENDERER));

    // Optional, may be blocked/removed.
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      info.UNMASKED_VENDOR_WEBGL = String(
        gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)
      );
      info.UNMASKED_RENDERER_WEBGL = String(
        gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)
      );
    }
  } catch {
    // ignore
  }
  return info;
};

const probeWebGLContexts = (): WebGLContextResult[] => {
  const canvas = document.createElement('canvas');

  const attrSets: Array<WebGLContextAttributes | undefined> = [
    undefined,
    { alpha: true, antialias: false, depth: true, stencil: false },
    { alpha: false, antialias: false, depth: true, stencil: false },
    {
      alpha: true,
      antialias: true,
      depth: true,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    },
    {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
    },
  ];

  const kinds: WebGLContextResult['kind'][] = [
    'webgl2',
    'webgl',
    'experimental-webgl',
  ];

  const results: WebGLContextResult[] = [];

  for (const kind of kinds) {
    for (const attrs of attrSets) {
      const attempt = tryGetContext(canvas, kind, attrs);
      if (isWebGLContext(attempt)) {
        const gl = attempt;
        results.push({
          kind,
          ok: true,
          attrs: formatAttrs(attrs),
          info: getWebGLInfo(gl),
        });
        // Only record first success per kind+attrs set; keep going to capture more.
      } else {
        const err = attempt instanceof Error ? attempt.message : '';
        results.push({
          kind,
          ok: false,
          attrs: formatAttrs(attrs),
          error: err || undefined,
        });
      }
    }
  }

  return results;
};

const probeAssets = async (): Promise<ProbeReport['assetChecks']> => {
  const urls = new Set<string>();

  // Collect module script + preload hints from this page.
  document.querySelectorAll('script[src]').forEach(s => {
    const src = (s as HTMLScriptElement).src;
    if (src) urls.add(src);
  });
  document.querySelectorAll('link[rel="modulepreload"][href]').forEach(l => {
    const href = (l as HTMLLinkElement).href;
    if (href) urls.add(href);
  });

  const list = Array.from(urls).slice(0, 30); // keep it bounded

  const checks: Array<{ url: string; status: number; ok: boolean }> = [];
  for (const url of list) {
    try {
      const res = await fetch(url, { method: 'GET', cache: 'no-store' });
      checks.push({ url, status: res.status, ok: res.ok });
    } catch {
      checks.push({ url, status: 0, ok: false });
    }
  }

  return checks;
};

const probeServiceWorker = async (): Promise<ProbeReport['serviceWorker']> => {
  const supported = 'serviceWorker' in navigator;
  if (!supported) {
    return { supported, controller: false };
  }

  const controller = Boolean(navigator.serviceWorker.controller);
  let registrations: Array<{ scope: string; scriptURL: string }> | undefined;

  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    registrations = regs.map(r => ({
      scope: r.scope,
      scriptURL: r.active?.scriptURL ?? '',
    }));
  } catch {
    registrations = undefined;
  }

  return { supported, controller, registrations };
};

const clearOfflineCache = async () => {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch {
    // ignore
  }
};

const render = (report: ProbeReport) => {
  const root = $('#debug-webgl-root');
  if (!root) return;

  const json = safeJson(report);
  const base = import.meta.env.BASE_URL || '/';

  root.replaceChildren();

  const header = document.createElement('div');
  header.className = 'flex flex-wrap items-center justify-between gap-3';

  const left = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'text-sm font-semibold text-white';
  title.textContent = 'Probe report';

  const stamp = document.createElement('div');
  stamp.className = 'text-xs text-zinc-400';
  stamp.textContent = report.timestamp;

  left.append(title, stamp);

  const actions = document.createElement('div');
  actions.className = 'flex flex-wrap gap-2';

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.dataset.copy = '1';
  copyBtn.className =
    'rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10';
  copyBtn.textContent = 'Copy JSON';

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.dataset.clear = '1';
  clearBtn.className =
    'rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10';
  clearBtn.textContent = 'Reset offline cache';

  const openServices = document.createElement('a');
  openServices.dataset.openServices = '1';
  openServices.className =
    'rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10';
  openServices.href = `${base}services/`;
  openServices.textContent = 'Open services';

  actions.append(copyBtn, clearBtn, openServices);
  header.append(left, actions);

  const pre = document.createElement('pre');
  pre.className =
    'mt-4 max-h-[70vh] overflow-auto rounded-xl border border-white/10 bg-black/40 p-4 text-xs text-zinc-200';
  pre.textContent = json;

  root.append(header, pre);

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(json);
      copyBtn.textContent = 'Copied';
      window.setTimeout(() => {
        copyBtn.textContent = 'Copy JSON';
      }, 1200);
    } catch {
      // ignore
    }
  });

  clearBtn.addEventListener('click', async () => {
    clearBtn.disabled = true;
    clearBtn.textContent = 'Clearing…';
    await clearOfflineCache();
    window.location.reload();
  });
};

const run = async () => {
  const nav = getNavigatorExtras();
  const report: ProbeReport = {
    timestamp: new Date().toISOString(),
    url: location.href,
    baseURI: document.baseURI,
    origin: location.origin,
    baseUrlEnv: import.meta.env.BASE_URL,
    ua: navigator.userAgent,
    platform: nav.platform,
    vendor: nav.vendor,
    webdriver: nav.webdriver,
    dpr: Math.max(1, Number(window.devicePixelRatio || 1)),
    viewport: { w: window.innerWidth, h: window.innerHeight },
    visualViewport: window.visualViewport
      ? {
          w: window.visualViewport.width,
          h: window.visualViewport.height,
          scale: window.visualViewport.scale,
        }
      : undefined,
    prefs: {
      reducedMotion: getBoolMedia('(prefers-reduced-motion: reduce)'),
      coarsePointer: getBoolMedia('(pointer: coarse)'),
    },
    device: {
      hardwareConcurrency: nav.hardwareConcurrency,
      deviceMemory: nav.deviceMemory,
    },
    serviceWorker: await probeServiceWorker(),
    caches: (() => {
      try {
        return undefined;
      } catch {
        return undefined;
      }
    })(),
    assetChecks: undefined,
    webgl: {
      contexts: [],
      safeRenderer: { ok: false },
    },
  };

  // caches
  try {
    if ('caches' in window) report.caches = await caches.keys();
  } catch {
    report.caches = undefined;
  }

  report.assetChecks = await probeAssets();

  report.webgl.contexts = probeWebGLContexts();

  // Safe renderer probe
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const renderer = createSafeWebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
    });
    renderer.dispose();
    report.webgl.safeRenderer = { ok: true };
  } catch (e) {
    report.webgl.safeRenderer = {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  render(report);
};

void run();
