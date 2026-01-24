export type TowerCaps = {
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
  performanceTier: 'high' | 'medium' | 'low';
  maxParticles: number;
  enablePostProcessing: boolean;
  enableGyroscope: boolean;
};

const detectBrowser = (): TowerCaps['browser'] => {
  try {
    const ua = (navigator.userAgent || '').toLowerCase();
    if (ua.includes('firefox')) return 'firefox';
    if (ua.includes('edg')) return 'edge';
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

const detectOs = (): TowerCaps['os'] => {
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

export const getTowerCaps = (): TowerCaps => {
  const coarsePointer = Boolean(
    window.matchMedia?.('(pointer: coarse)').matches
  );
  const reducedMotion = Boolean(
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );

  const devicePixelRatio = Math.max(1, Number(window.devicePixelRatio || 1));

  const browser = detectBrowser();
  const os = detectOs();

  // Mobile/touch devices are far more sensitive to fill-rate.
  // iOS Safari is particularly prone to jank at high DPR.
  const mobileCap =
    coarsePointer && (os === 'ios' || browser === 'safari')
      ? 1.5
      : coarsePointer
        ? 1.75
        : 2.5;
  const maxDpr = reducedMotion ? Math.min(mobileCap, 1.5) : mobileCap;

  let webgl = false;
  let webgl2 = false;
  let gpuTier: 'high' | 'medium' | 'low' = 'medium';

  try {
    const canvas = document.createElement('canvas');
    const gl2 = canvas.getContext('webgl2');
    webgl2 = Boolean(gl2);
    webgl = webgl2 || Boolean(canvas.getContext('webgl'));

    // GPU tier detection using WebGL renderer info
    if (gl2) {
      const debugInfo = gl2.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer =
          gl2.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
        const rendererLower = renderer.toLowerCase();

        // High-end GPUs
        if (
          rendererLower.includes('rtx') ||
          rendererLower.includes('radeon rx') ||
          rendererLower.includes('geforce gtx 10') ||
          rendererLower.includes('geforce gtx 16') ||
          rendererLower.includes('apple m1') ||
          rendererLower.includes('apple m2') ||
          rendererLower.includes('apple m3') ||
          rendererLower.includes('apple gpu') || // Apple Silicon
          rendererLower.includes('adreno 6') || // High-end Qualcomm
          rendererLower.includes('adreno 7') ||
          rendererLower.includes('mali-g7') // High-end ARM
        ) {
          gpuTier = 'high';
        }
        // Low-end GPUs
        else if (
          rendererLower.includes('intel hd') ||
          rendererLower.includes('intel uhd') ||
          rendererLower.includes('adreno 5') || // Mid-range Qualcomm
          rendererLower.includes('adreno 4') || // Older Qualcomm
          rendererLower.includes('mali-g5') ||
          rendererLower.includes('mali-t') ||
          rendererLower.includes('powervr') ||
          rendererLower.includes('swiftshader') // Software renderer
        ) {
          gpuTier = 'low';
        }
      }
    }
  } catch {
    webgl = false;
    webgl2 = false;
    gpuTier = 'low';
  }

  const maxPrecision = getMaxPrecision();
  const hasVisualViewport =
    typeof (window as unknown as { visualViewport?: unknown })
      .visualViewport !== 'undefined';

  // Determine performance tier based on GPU capabilities - DON'T downgrade mobile animations
  // Modern mobile GPUs (2023+) can handle desktop-quality effects
  let performanceTier: 'high' | 'medium' | 'low' = gpuTier;

  // Only downgrade for reduced motion preference or truly low-end hardware
  if (reducedMotion) {
    performanceTier = 'low';
  } else if (maxPrecision === 'lowp') {
    performanceTier = 'low';
  }
  // Keep mobile at their detected tier - modern phones are powerful!

  // Higher particle counts for better visuals - modern GPUs handle this easily
  const maxParticles =
    performanceTier === 'high'
      ? 25000
      : performanceTier === 'medium'
        ? 15000
        : 5000;

  // Enable post processing on all but truly low-end devices
  const enablePostProcessing = performanceTier !== 'low';
  const enableGyroscope = coarsePointer && !reducedMotion;

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
    performanceTier,
    maxParticles,
    enablePostProcessing,
    enableGyroscope,
  };
};
