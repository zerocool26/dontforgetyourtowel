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

  /* ── advanced features ───────────────────────── */
  warpStreakCount: number;
  plasmaVeinCount: number;
  haloRingCount: number;
  enableDepthOfField: boolean;
  dofFocusDistance: number;
  dofBokehScale: number;
  coreShellCount: number;

  /* ── next-gen visuals ────────────────────────── */
  eventHorizonRings: number;
  magneticFieldLines: number;
  resonanceWaveCount: number;
  cometaryOrbiterCount: number;
  volumetricRayCount: number;
  enableSubspaceGrid: boolean;

  /* ── apex tier ───────────────────────────────── */
  quantumFluxStrands: number;
  sparkShowerCount: number;
  temporalEchoLayers: number;
  neuralWebNodes: number;
  enableGravitationalLens: boolean;
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
  warpStreakCount: 80,
  plasmaVeinCount: 12,
  haloRingCount: 5,
  enableDepthOfField: true,
  dofFocusDistance: 0.035,
  dofBokehScale: 2.8,
  coreShellCount: 4,
  eventHorizonRings: 14,
  magneticFieldLines: 10,
  resonanceWaveCount: 4,
  cometaryOrbiterCount: 18,
  volumetricRayCount: 8,
  enableSubspaceGrid: true,
  quantumFluxStrands: 6,
  sparkShowerCount: 200,
  temporalEchoLayers: 4,
  neuralWebNodes: 40,
  enableGravitationalLens: true,
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
  warpStreakCount: 56,
  plasmaVeinCount: 8,
  haloRingCount: 4,
  enableDepthOfField: true,
  dofFocusDistance: 0.04,
  dofBokehScale: 2.2,
  coreShellCount: 3,
  eventHorizonRings: 10,
  magneticFieldLines: 8,
  resonanceWaveCount: 3,
  cometaryOrbiterCount: 12,
  volumetricRayCount: 6,
  enableSubspaceGrid: true,
  quantumFluxStrands: 4,
  sparkShowerCount: 140,
  temporalEchoLayers: 3,
  neuralWebNodes: 28,
  enableGravitationalLens: true,
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
  warpStreakCount: 36,
  plasmaVeinCount: 6,
  haloRingCount: 3,
  enableDepthOfField: false,
  dofFocusDistance: 0.045,
  dofBokehScale: 1.8,
  coreShellCount: 3,
  eventHorizonRings: 7,
  magneticFieldLines: 5,
  resonanceWaveCount: 2,
  cometaryOrbiterCount: 8,
  volumetricRayCount: 4,
  enableSubspaceGrid: true,
  quantumFluxStrands: 3,
  sparkShowerCount: 80,
  temporalEchoLayers: 2,
  neuralWebNodes: 18,
  enableGravitationalLens: false,
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
  warpStreakCount: 18,
  plasmaVeinCount: 4,
  haloRingCount: 2,
  enableDepthOfField: false,
  dofFocusDistance: 0.05,
  dofBokehScale: 1.2,
  coreShellCount: 2,
  eventHorizonRings: 4,
  magneticFieldLines: 3,
  resonanceWaveCount: 1,
  cometaryOrbiterCount: 5,
  volumetricRayCount: 2,
  enableSubspaceGrid: false,
  quantumFluxStrands: 2,
  sparkShowerCount: 40,
  temporalEchoLayers: 1,
  neuralWebNodes: 10,
  enableGravitationalLens: false,
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
  warpStreakCount: 0,
  plasmaVeinCount: 0,
  haloRingCount: 0,
  enableDepthOfField: false,
  dofFocusDistance: 0,
  dofBokehScale: 0,
  coreShellCount: 1,
  eventHorizonRings: 0,
  magneticFieldLines: 0,
  resonanceWaveCount: 0,
  cometaryOrbiterCount: 0,
  volumetricRayCount: 0,
  enableSubspaceGrid: false,
  quantumFluxStrands: 0,
  sparkShowerCount: 0,
  temporalEchoLayers: 0,
  neuralWebNodes: 0,
  enableGravitationalLens: false,
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
    warpStreakCount: Math.min(p.warpStreakCount, agg ? 10 : 18),
    plasmaVeinCount: Math.min(p.plasmaVeinCount, agg ? 3 : 4),
    haloRingCount: Math.min(p.haloRingCount, 1),
    enableDepthOfField: false,
    coreShellCount: Math.min(p.coreShellCount, 2),
    eventHorizonRings: Math.min(p.eventHorizonRings, agg ? 3 : 5),
    magneticFieldLines: Math.min(p.magneticFieldLines, agg ? 2 : 3),
    resonanceWaveCount: Math.min(p.resonanceWaveCount, 1),
    cometaryOrbiterCount: Math.min(p.cometaryOrbiterCount, agg ? 3 : 5),
    volumetricRayCount: Math.min(p.volumetricRayCount, agg ? 2 : 3),
    enableSubspaceGrid: false,
    quantumFluxStrands: Math.min(p.quantumFluxStrands, agg ? 1 : 2),
    sparkShowerCount: Math.min(p.sparkShowerCount, agg ? 20 : 40),
    temporalEchoLayers: Math.min(p.temporalEchoLayers, 1),
    neuralWebNodes: Math.min(p.neuralWebNodes, agg ? 6 : 10),
    enableGravitationalLens: false,
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
