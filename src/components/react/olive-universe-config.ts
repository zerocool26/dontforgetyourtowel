import { withBasePath } from '@/utils/helpers';

type NavigatorWithDeviceMemory = Navigator & {
  deviceMemory?: number;
};

export type QualityTier = 'ultra' | 'high' | 'medium' | 'low';

export type HeroVisualMode = 'immersive' | 'lite' | 'reduced' | 'fallback';

export interface SceneProfile {
  /* ── particle budgets ────────────────────────── */
  nebulaCount: number;
  attractorTrailLen: number;
  auroraSegments: number;
  orbitalCount: number;
  dustCount: number;
  starCount: number;
  starRadius: number;

  /* ── geometry detail ─────────────────────────── */
  coreDetail: number;
  innerDetail: number;
  ringSegments: number;

  /* ── visual fidelity ─────────────────────────── */
  bloomIntensity: number;
  bloomThreshold: number;
  chromaticOffset: number;
  noiseOpacity: number;
  vignetteStrength: number;
  dprCap: number;
  enablePostFx: boolean;

  /* ── dynamics ────────────────────────────────── */
  fieldStrength: number;
  attractorSpeed: number;
  coreSpeed: number;
  auroraAmplitude: number;
  dustDrift: number;
  parallaxDepth: number;

  /* ── lighting ────────────────────────────────── */
  ambientIntensity: number;
  keyIntensity: number;
  rimIntensity: number;
}

export const SCENE_PALETTE = {
  accent: '#d9ff3f',
  secondary: '#65e5ff',
  tertiary: '#9f7aea',
  warm: '#ff6b6b',
  highlight: '#ffffff',
  core: '#e8ffb0',
  nebula: '#1a3a5c',
  deep: '#0a0f1e',
  backgroundFrom: '#020308',
  backgroundTo: '#060d1a',
  horizon: '#0e1b32',
} as const;

export const HERO_COPY = {
  title: 'Olive Global Systems immersive landing experience',
  description:
    'A fullscreen cinematic 3D showcase featuring procedural nebula fields, crystalline attractor physics, and reactive particle systems.',
  accessibilityNote:
    'The homepage intentionally presents only the immersive scene visually. Navigation links remain available to assistive technology and direct URL access.',
} as const;

export const IMMERSIVE_LINKS = [
  { label: 'Explore services', href: withBasePath('services/') },
  { label: 'View portfolio', href: withBasePath('about/') },
  { label: 'Open Build Studio', href: withBasePath('build-studio/') },
  { label: 'Contact headquarters', href: withBasePath('contact-hq/') },
] as const;

/* ── Device detection ────────────────────────────────────────── */

export function getDeviceMemory() {
  if (typeof navigator === 'undefined') return null;
  const mem = (navigator as NavigatorWithDeviceMemory).deviceMemory;
  return typeof mem === 'number' && Number.isFinite(mem) && mem > 0
    ? mem
    : null;
}

export function isMobileLikeDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined')
    return false;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const touch = (navigator.maxTouchPoints ?? 0) > 0;
  const shortEdge = Math.min(
    window.innerWidth || window.screen?.width || 0,
    window.innerHeight || window.screen?.height || 0
  );
  const mobileUA = /Mobi|Android|iPhone|iPad|iPod/i.test(
    navigator.userAgent ?? ''
  );
  const ipadOS = /Mac/i.test(navigator.platform ?? '') && touch;
  return mobileUA || ipadOS || (coarse && shortEdge > 0 && shortEdge <= 1180);
}

export function detectQuality(): QualityTier {
  if (typeof window === 'undefined') return 'medium';
  const cores = navigator.hardwareConcurrency ?? 4;
  const dpr = window.devicePixelRatio ?? 1;
  const memory = getDeviceMemory();
  const mobile = isMobileLikeDevice();
  if (mobile || cores <= 4 || (memory !== null && memory <= 4)) return 'low';
  if (cores >= 12 && dpr >= 1.5 && (memory === null || memory >= 16))
    return 'ultra';
  if (cores >= 8 && dpr >= 1.25 && (memory === null || memory >= 8))
    return 'high';
  return 'medium';
}

export function supportsWebGL() {
  if (typeof document === 'undefined') return true;
  try {
    const c = document.createElement('canvas');
    return Boolean(
      c.getContext('webgl2') ??
      c.getContext('webgl') ??
      c.getContext('experimental-webgl')
    );
  } catch {
    return false;
  }
}

export function hexToRgbString(hex: string) {
  const n = hex.replace('#', '').trim();
  if (n.length !== 6) return '217, 255, 63';
  const v = Number.parseInt(n, 16);
  if (Number.isNaN(v)) return '217, 255, 63';
  return `${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}`;
}

/* ── Scene profiles ──────────────────────────────────────────── */

const ULTRA: SceneProfile = {
  nebulaCount: 4000,
  attractorTrailLen: 600,
  auroraSegments: 200,
  orbitalCount: 48,
  dustCount: 3000,
  starCount: 3200,
  starRadius: 140,
  coreDetail: 5,
  innerDetail: 4,
  ringSegments: 256,
  bloomIntensity: 1.6,
  bloomThreshold: 0.12,
  chromaticOffset: 0.0006,
  noiseOpacity: 0.03,
  vignetteStrength: 0.92,
  dprCap: 2,
  enablePostFx: true,
  fieldStrength: 0.62,
  attractorSpeed: 1,
  coreSpeed: 0.18,
  auroraAmplitude: 1.2,
  dustDrift: 0.04,
  parallaxDepth: 0.7,
  ambientIntensity: 0.35,
  keyIntensity: 22,
  rimIntensity: 12,
};

const HIGH: SceneProfile = {
  nebulaCount: 2800,
  attractorTrailLen: 420,
  auroraSegments: 160,
  orbitalCount: 36,
  dustCount: 2000,
  starCount: 2400,
  starRadius: 130,
  coreDetail: 4,
  innerDetail: 3,
  ringSegments: 200,
  bloomIntensity: 1.4,
  bloomThreshold: 0.14,
  chromaticOffset: 0.0005,
  noiseOpacity: 0.025,
  vignetteStrength: 0.88,
  dprCap: 1.8,
  enablePostFx: true,
  fieldStrength: 0.55,
  attractorSpeed: 0.9,
  coreSpeed: 0.16,
  auroraAmplitude: 1,
  dustDrift: 0.035,
  parallaxDepth: 0.6,
  ambientIntensity: 0.38,
  keyIntensity: 20,
  rimIntensity: 10,
};

const MED: SceneProfile = {
  nebulaCount: 1600,
  attractorTrailLen: 260,
  auroraSegments: 100,
  orbitalCount: 24,
  dustCount: 1200,
  starCount: 1600,
  starRadius: 110,
  coreDetail: 3,
  innerDetail: 2,
  ringSegments: 160,
  bloomIntensity: 1.15,
  bloomThreshold: 0.16,
  chromaticOffset: 0.0003,
  noiseOpacity: 0.02,
  vignetteStrength: 0.82,
  dprCap: 1.5,
  enablePostFx: true,
  fieldStrength: 0.45,
  attractorSpeed: 0.75,
  coreSpeed: 0.14,
  auroraAmplitude: 0.8,
  dustDrift: 0.03,
  parallaxDepth: 0.5,
  ambientIntensity: 0.42,
  keyIntensity: 18,
  rimIntensity: 8,
};

const LOW: SceneProfile = {
  nebulaCount: 600,
  attractorTrailLen: 120,
  auroraSegments: 50,
  orbitalCount: 14,
  dustCount: 500,
  starCount: 900,
  starRadius: 90,
  coreDetail: 2,
  innerDetail: 2,
  ringSegments: 100,
  bloomIntensity: 0.8,
  bloomThreshold: 0.2,
  chromaticOffset: 0.0002,
  noiseOpacity: 0.014,
  vignetteStrength: 0.72,
  dprCap: 1.15,
  enablePostFx: false,
  fieldStrength: 0.3,
  attractorSpeed: 0.5,
  coreSpeed: 0.1,
  auroraAmplitude: 0.5,
  dustDrift: 0.02,
  parallaxDepth: 0.35,
  ambientIntensity: 0.5,
  keyIntensity: 14,
  rimIntensity: 6,
};

const NONE: SceneProfile = {
  nebulaCount: 0,
  attractorTrailLen: 0,
  auroraSegments: 0,
  orbitalCount: 0,
  dustCount: 0,
  starCount: 0,
  starRadius: 0,
  coreDetail: 1,
  innerDetail: 1,
  ringSegments: 32,
  bloomIntensity: 0,
  bloomThreshold: 0.5,
  chromaticOffset: 0,
  noiseOpacity: 0,
  vignetteStrength: 0,
  dprCap: 1,
  enablePostFx: false,
  fieldStrength: 0,
  attractorSpeed: 0,
  coreSpeed: 0,
  auroraAmplitude: 0,
  dustDrift: 0,
  parallaxDepth: 0,
  ambientIntensity: 0.2,
  keyIntensity: 0,
  rimIntensity: 0,
};

export function getSceneProfile(
  quality: QualityTier,
  mode: HeroVisualMode
): SceneProfile {
  if (mode === 'fallback' || mode === 'reduced') return NONE;
  if (mode === 'lite' || quality === 'low') return LOW;
  if (quality === 'ultra') return ULTRA;
  if (quality === 'high') return HIGH;
  return MED;
}

export function optimizeSceneProfileForMobile(
  p: SceneProfile,
  opts?: { lowMemory?: boolean; compactViewport?: boolean }
): SceneProfile {
  const agg = (opts?.lowMemory ?? false) || (opts?.compactViewport ?? false);
  return {
    ...p,
    nebulaCount: Math.min(p.nebulaCount, agg ? 350 : 550),
    attractorTrailLen: Math.min(p.attractorTrailLen, agg ? 60 : 100),
    auroraSegments: Math.min(p.auroraSegments, agg ? 28 : 44),
    orbitalCount: Math.min(p.orbitalCount, agg ? 8 : 12),
    dustCount: Math.min(p.dustCount, agg ? 250 : 420),
    starCount: Math.min(p.starCount, agg ? 550 : 750),
    coreDetail: Math.min(p.coreDetail, 2),
    ringSegments: Math.min(p.ringSegments, 80),
    bloomIntensity: Math.min(p.bloomIntensity, 0.75),
    chromaticOffset: Math.min(p.chromaticOffset, 0.00015),
    dprCap: agg ? 1 : 1.1,
    enablePostFx: false,
    fieldStrength: Math.min(p.fieldStrength, 0.22),
    parallaxDepth: Math.min(p.parallaxDepth, 0.28),
  };
}

export const HERO_MODE_LABELS: Record<HeroVisualMode, string> = {
  immersive: 'Immersive 3D',
  lite: 'Adaptive 3D',
  reduced: 'Reduced motion',
  fallback: 'Ambient fallback',
};

export const HERO_MODE_NOTES: Record<HeroVisualMode, string> = {
  immersive: 'Full cinematic 3D is live.',
  lite: 'The lighter realtime scene is active.',
  reduced:
    'A calmer presentation is active because reduced motion is preferred.',
  fallback: 'WebGL is unavailable, so the atmospheric fallback is active.',
};
