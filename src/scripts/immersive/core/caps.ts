export type ImmersiveCaps = {
  coarsePointer: boolean;
  reducedMotion: boolean;
  devicePixelRatio: number;
  maxDpr: number;
  webgl: boolean;
  webgl2: boolean;
  maxPrecision: 'highp' | 'mediump' | 'lowp';
  browser: 'chrome' | 'firefox' | 'safari' | 'edge' | 'other';
  os: 'android' | 'ios' | 'other';
  hasVisualViewport: boolean;
};

const detectBrowser = (): ImmersiveCaps['browser'] => {
  try {
    const ua = (navigator.userAgent || '').toLowerCase();
    if (ua.includes('firefox')) return 'firefox';
    if (ua.includes('edg')) return 'edge';
    // iOS Chrome uses CriOS (WebKit), but we still treat it as chrome-ish for tuning.
    if (ua.includes('crios') || (ua.includes('chrome') && !ua.includes('edg')))
      return 'chrome';
    if (
      ua.includes('safari') &&
      !ua.includes('chrome') &&
      !ua.includes('crios')
    )
      return 'safari';
    return 'other';
  } catch {
    return 'other';
  }
};

const detectOs = (): ImmersiveCaps['os'] => {
  try {
    const ua = (navigator.userAgent || '').toLowerCase();
    if (ua.includes('android')) return 'android';
    if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod'))
      return 'ios';
    return 'other';
  } catch {
    return 'other';
  }
};

const getMaxPrecision = (): 'highp' | 'mediump' | 'lowp' => {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    if (!gl) return 'lowp';
    // Best-effort: try to create a tiny shader with highp; if it fails, assume mediump.
    // Many mobile GPUs report highp but behave poorly; we still use this as a hint.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyGl = gl as any;
    const high = anyGl.getShaderPrecisionFormat?.(
      anyGl.FRAGMENT_SHADER,
      anyGl.HIGH_FLOAT
    );
    if (high && typeof high.precision === 'number' && high.precision > 0)
      return 'highp';

    const med = anyGl.getShaderPrecisionFormat?.(
      anyGl.FRAGMENT_SHADER,
      anyGl.MEDIUM_FLOAT
    );
    if (med && typeof med.precision === 'number' && med.precision > 0)
      return 'mediump';

    return 'lowp';
  } catch {
    return 'lowp';
  }
};

export const getImmersiveCaps = (): ImmersiveCaps => {
  const coarsePointer = Boolean(
    window.matchMedia?.('(pointer: coarse)').matches
  );
  const reducedMotion = Boolean(
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );

  const devicePixelRatio = Math.max(1, Number(window.devicePixelRatio || 1));
  const maxDpr = coarsePointer ? 1.5 : 2;

  let webgl = false;
  let webgl2 = false;
  try {
    const canvas = document.createElement('canvas');
    webgl2 = Boolean(canvas.getContext('webgl2'));
    webgl = webgl2 || Boolean(canvas.getContext('webgl'));
  } catch {
    webgl = false;
    webgl2 = false;
  }

  const maxPrecision = getMaxPrecision();

  const browser = detectBrowser();
  const os = detectOs();
  const hasVisualViewport =
    typeof (window as unknown as { visualViewport?: unknown })
      .visualViewport !== 'undefined';

  return {
    coarsePointer,
    reducedMotion,
    devicePixelRatio,
    maxDpr,
    webgl,
    webgl2,
    maxPrecision,
    browser,
    os,
    hasVisualViewport,
  };
};
