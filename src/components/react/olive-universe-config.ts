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

  /* ── zenith tier ──────────────────────────────── */
  solarFlareCount: number;
  darkMatterFilaments: number;
  pulsarBeaconCount: number;
  crystallineGrowthBranches: number;
  enableCosmicStrings: boolean;

  /* ── transcendent tier ───────────────────────── */
  interferenceShellCount: number;
  voidRippleCount: number;
  photonBloomCount: number;
  haloGlyphCount: number;
  enableChromaTorusField: boolean;

  /* ── apotheosis tier ────────────────────────── */
  crownSpireCount: number;
  meridianArcCount: number;
  relaySatelliteCount: number;
  petalFieldCount: number;
  enableLitOrbitCage: boolean;

  /* ── premium polish tier ────────────────────── */
  lightCardCount: number;
  glassOrbCount: number;
  causticRibbonCount: number;
  prismDustCount: number;
  enableDualBloom: boolean;
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
  nebulaCount: 2400,
  attractorTrailLen: 520,
  auroraSegments: 200,
  orbitalCount: 32,
  dustCount: 1600,
  starCount: 2200,
  starRadius: 130,
  coreDetail: 7,
  innerDetail: 5,
  ringSegments: 320,
  bloomIntensity: 0.32,
  bloomThreshold: 0.54,
  chromaticOffset: 0.00008,
  noiseOpacity: 0.01,
  vignetteStrength: 0.78,
  dprCap: 2,
  enablePostFx: true,
  fieldStrength: 0.52,
  attractorSpeed: 1,
  coreSpeed: 0.18,
  auroraAmplitude: 0.9,
  dustDrift: 0.04,
  parallaxDepth: 0.62,
  ambientIntensity: 0.24,
  keyIntensity: 8,
  rimIntensity: 4,
  warpStreakCount: 28,
  plasmaVeinCount: 8,
  haloRingCount: 3,
  enableDepthOfField: true,
  dofFocusDistance: 0.038,
  dofBokehScale: 1.35,
  coreShellCount: 4,
  eventHorizonRings: 8,
  magneticFieldLines: 6,
  resonanceWaveCount: 3,
  cometaryOrbiterCount: 10,
  volumetricRayCount: 4,
  enableSubspaceGrid: true,
  quantumFluxStrands: 4,
  sparkShowerCount: 90,
  temporalEchoLayers: 2,
  neuralWebNodes: 18,
  enableGravitationalLens: true,
  solarFlareCount: 3,
  darkMatterFilaments: 4,
  pulsarBeaconCount: 2,
  crystallineGrowthBranches: 14,
  enableCosmicStrings: true,
  interferenceShellCount: 2,
  voidRippleCount: 3,
  photonBloomCount: 8,
  haloGlyphCount: 6,
  enableChromaTorusField: true,
  crownSpireCount: 5,
  meridianArcCount: 6,
  relaySatelliteCount: 4,
  petalFieldCount: 7,
  enableLitOrbitCage: true,
  lightCardCount: 4,
  glassOrbCount: 4,
  causticRibbonCount: 2,
  prismDustCount: 110,
  enableDualBloom: false,
};

const HIGH: SceneProfile = {
  nebulaCount: 1800,
  attractorTrailLen: 360,
  auroraSegments: 140,
  orbitalCount: 24,
  dustCount: 1100,
  starCount: 1800,
  starRadius: 120,
  coreDetail: 6,
  innerDetail: 4,
  ringSegments: 240,
  bloomIntensity: 0.24,
  bloomThreshold: 0.58,
  chromaticOffset: 0.00006,
  noiseOpacity: 0.008,
  vignetteStrength: 0.76,
  dprCap: 1.8,
  enablePostFx: true,
  fieldStrength: 0.46,
  attractorSpeed: 0.9,
  coreSpeed: 0.16,
  auroraAmplitude: 0.78,
  dustDrift: 0.035,
  parallaxDepth: 0.56,
  ambientIntensity: 0.26,
  keyIntensity: 6.8,
  rimIntensity: 3.5,
  warpStreakCount: 20,
  plasmaVeinCount: 6,
  haloRingCount: 2,
  enableDepthOfField: true,
  dofFocusDistance: 0.04,
  dofBokehScale: 1.15,
  coreShellCount: 3,
  eventHorizonRings: 6,
  magneticFieldLines: 4,
  resonanceWaveCount: 2,
  cometaryOrbiterCount: 8,
  volumetricRayCount: 3,
  enableSubspaceGrid: true,
  quantumFluxStrands: 3,
  sparkShowerCount: 60,
  temporalEchoLayers: 2,
  neuralWebNodes: 14,
  enableGravitationalLens: true,
  solarFlareCount: 2,
  darkMatterFilaments: 3,
  pulsarBeaconCount: 1,
  crystallineGrowthBranches: 10,
  enableCosmicStrings: true,
  interferenceShellCount: 1,
  voidRippleCount: 2,
  photonBloomCount: 6,
  haloGlyphCount: 4,
  enableChromaTorusField: true,
  crownSpireCount: 4,
  meridianArcCount: 4,
  relaySatelliteCount: 3,
  petalFieldCount: 5,
  enableLitOrbitCage: true,
  lightCardCount: 3,
  glassOrbCount: 3,
  causticRibbonCount: 2,
  prismDustCount: 80,
  enableDualBloom: false,
};

const MED: SceneProfile = {
  nebulaCount: 900,
  attractorTrailLen: 180,
  auroraSegments: 100,
  orbitalCount: 16,
  dustCount: 700,
  starCount: 1200,
  starRadius: 105,
  coreDetail: 4,
  innerDetail: 3,
  ringSegments: 180,
  bloomIntensity: 0.18,
  bloomThreshold: 0.62,
  chromaticOffset: 0.00004,
  noiseOpacity: 0.006,
  vignetteStrength: 0.72,
  dprCap: 1.5,
  enablePostFx: true,
  fieldStrength: 0.4,
  attractorSpeed: 0.75,
  coreSpeed: 0.14,
  auroraAmplitude: 0.62,
  dustDrift: 0.03,
  parallaxDepth: 0.44,
  ambientIntensity: 0.3,
  keyIntensity: 5.5,
  rimIntensity: 2.8,
  warpStreakCount: 12,
  plasmaVeinCount: 4,
  haloRingCount: 1,
  enableDepthOfField: false,
  dofFocusDistance: 0.045,
  dofBokehScale: 0.9,
  coreShellCount: 2,
  eventHorizonRings: 4,
  magneticFieldLines: 2,
  resonanceWaveCount: 1,
  cometaryOrbiterCount: 5,
  volumetricRayCount: 2,
  enableSubspaceGrid: true,
  quantumFluxStrands: 2,
  sparkShowerCount: 35,
  temporalEchoLayers: 1,
  neuralWebNodes: 10,
  enableGravitationalLens: false,
  solarFlareCount: 1,
  darkMatterFilaments: 2,
  pulsarBeaconCount: 1,
  crystallineGrowthBranches: 6,
  enableCosmicStrings: false,
  interferenceShellCount: 1,
  voidRippleCount: 1,
  photonBloomCount: 4,
  haloGlyphCount: 3,
  enableChromaTorusField: false,
  crownSpireCount: 2,
  meridianArcCount: 3,
  relaySatelliteCount: 2,
  petalFieldCount: 4,
  enableLitOrbitCage: false,
  lightCardCount: 2,
  glassOrbCount: 2,
  causticRibbonCount: 1,
  prismDustCount: 50,
  enableDualBloom: false,
};

const LOW: SceneProfile = {
  nebulaCount: 280,
  attractorTrailLen: 80,
  auroraSegments: 50,
  orbitalCount: 8,
  dustCount: 240,
  starCount: 600,
  starRadius: 85,
  coreDetail: 3,
  innerDetail: 2,
  ringSegments: 96,
  bloomIntensity: 0.12,
  bloomThreshold: 0.72,
  chromaticOffset: 0.00002,
  noiseOpacity: 0.004,
  vignetteStrength: 0.68,
  dprCap: 1.15,
  enablePostFx: false,
  fieldStrength: 0.22,
  attractorSpeed: 0.5,
  coreSpeed: 0.1,
  auroraAmplitude: 0.35,
  dustDrift: 0.02,
  parallaxDepth: 0.24,
  ambientIntensity: 0.34,
  keyIntensity: 4.4,
  rimIntensity: 2.2,
  warpStreakCount: 8,
  plasmaVeinCount: 2,
  haloRingCount: 1,
  enableDepthOfField: false,
  dofFocusDistance: 0.05,
  dofBokehScale: 0.6,
  coreShellCount: 2,
  eventHorizonRings: 2,
  magneticFieldLines: 1,
  resonanceWaveCount: 1,
  cometaryOrbiterCount: 3,
  volumetricRayCount: 1,
  enableSubspaceGrid: false,
  quantumFluxStrands: 1,
  sparkShowerCount: 18,
  temporalEchoLayers: 1,
  neuralWebNodes: 6,
  enableGravitationalLens: false,
  solarFlareCount: 1,
  darkMatterFilaments: 1,
  pulsarBeaconCount: 1,
  crystallineGrowthBranches: 4,
  enableCosmicStrings: false,
  interferenceShellCount: 1,
  voidRippleCount: 1,
  photonBloomCount: 2,
  haloGlyphCount: 2,
  enableChromaTorusField: false,
  crownSpireCount: 2,
  meridianArcCount: 2,
  relaySatelliteCount: 1,
  petalFieldCount: 2,
  enableLitOrbitCage: false,
  lightCardCount: 1,
  glassOrbCount: 1,
  causticRibbonCount: 0,
  prismDustCount: 24,
  enableDualBloom: false,
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
  solarFlareCount: 0,
  darkMatterFilaments: 0,
  pulsarBeaconCount: 0,
  crystallineGrowthBranches: 0,
  enableCosmicStrings: false,
  interferenceShellCount: 0,
  voidRippleCount: 0,
  photonBloomCount: 0,
  haloGlyphCount: 0,
  enableChromaTorusField: false,
  crownSpireCount: 0,
  meridianArcCount: 0,
  relaySatelliteCount: 0,
  petalFieldCount: 0,
  enableLitOrbitCage: false,
  lightCardCount: 0,
  glassOrbCount: 0,
  causticRibbonCount: 0,
  prismDustCount: 0,
  enableDualBloom: false,
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
    bloomIntensity: Math.min(p.bloomIntensity, 0.18),
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
    solarFlareCount: Math.min(p.solarFlareCount, agg ? 1 : 2),
    darkMatterFilaments: Math.min(p.darkMatterFilaments, agg ? 2 : 3),
    pulsarBeaconCount: Math.min(p.pulsarBeaconCount, 1),
    crystallineGrowthBranches: Math.min(
      p.crystallineGrowthBranches,
      agg ? 4 : 6
    ),
    enableCosmicStrings: false,
    interferenceShellCount: Math.min(p.interferenceShellCount, agg ? 1 : 2),
    voidRippleCount: Math.min(p.voidRippleCount, agg ? 1 : 2),
    photonBloomCount: Math.min(p.photonBloomCount, agg ? 4 : 6),
    haloGlyphCount: Math.min(p.haloGlyphCount, agg ? 3 : 4),
    enableChromaTorusField: false,
    crownSpireCount: Math.min(p.crownSpireCount, agg ? 2 : 3),
    meridianArcCount: Math.min(p.meridianArcCount, agg ? 2 : 4),
    relaySatelliteCount: Math.min(p.relaySatelliteCount, agg ? 2 : 3),
    petalFieldCount: Math.min(p.petalFieldCount, agg ? 4 : 5),
    enableLitOrbitCage: false,
    lightCardCount: Math.min(p.lightCardCount, agg ? 2 : 3),
    glassOrbCount: Math.min(p.glassOrbCount, agg ? 2 : 3),
    causticRibbonCount: Math.min(p.causticRibbonCount, agg ? 1 : 2),
    prismDustCount: Math.min(p.prismDustCount, agg ? 60 : 100),
    enableDualBloom: false,
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
