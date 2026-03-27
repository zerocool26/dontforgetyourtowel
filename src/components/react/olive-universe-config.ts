import { withBasePath } from '@/utils/helpers';

type NavigatorWithDeviceMemory = Navigator & {
  deviceMemory?: number;
};

export type QualityTier = 'high' | 'medium' | 'low';

export type HeroVisualMode = 'immersive' | 'lite' | 'reduced' | 'fallback';

export interface SceneProfile {
  starCount: number;
  starRadius: number;
  sparkleCount: number;
  monolithCount: number;
  shardCount: number;
  ribbonCount: number;
  haloCount: number;
  bloomIntensity: number;
  noiseOpacity: number;
  aberrationOffset: number;
  ambientLight: number;
  dprCap: number;
  fieldStrength: number;
  haloScale: number;
  particleSize: number;
  enablePostFx: boolean;
}

export const SCENE_PALETTE = {
  accent: '#d9ff3f',
  secondary: '#65e5ff',
  tertiary: '#9f7aea',
  highlight: '#ffffff',
  backgroundFrom: '#02040a',
  backgroundTo: '#07111f',
  horizon: '#111f36',
} as const;

export const HERO_COPY = {
  title: 'Olive Global Systems immersive landing experience',
  description:
    'A single fullscreen 3D flagship scene designed to feel like a premium launch artifact instead of a brochure.',
  accessibilityNote:
    'The homepage intentionally presents only the immersive scene visually. Navigation links remain available to assistive technology and direct URL access.',
} as const;

export const IMMERSIVE_LINKS = [
  {
    label: 'Explore services',
    href: withBasePath('services/'),
  },
  {
    label: 'View portfolio',
    href: withBasePath('about/'),
  },
  {
    label: 'Open Build Studio',
    href: withBasePath('build-studio/'),
  },
  {
    label: 'Contact headquarters',
    href: withBasePath('contact-hq/'),
  },
] as const;

export function getDeviceMemory() {
  if (typeof navigator === 'undefined') {
    return null;
  }

  const memory = (navigator as NavigatorWithDeviceMemory).deviceMemory;
  return typeof memory === 'number' && Number.isFinite(memory) && memory > 0
    ? memory
    : null;
}

export function isMobileLikeDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const coarsePointer =
    window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const touchCapable = (navigator.maxTouchPoints ?? 0) > 0;
  const shortEdge = Math.min(
    window.innerWidth || window.screen?.width || 0,
    window.innerHeight || window.screen?.height || 0
  );
  const mobileUserAgent = /Mobi|Android|iPhone|iPad|iPod/i.test(
    navigator.userAgent ?? ''
  );
  const ipadOsSession = /Mac/i.test(navigator.platform ?? '') && touchCapable;

  return (
    mobileUserAgent ||
    ipadOsSession ||
    (coarsePointer && shortEdge > 0 && shortEdge <= 1180)
  );
}

export function detectQuality(): QualityTier {
  if (typeof window === 'undefined') {
    return 'medium';
  }

  const cores = navigator.hardwareConcurrency ?? 4;
  const dpr = window.devicePixelRatio ?? 1;
  const memory = getDeviceMemory();
  const mobileLike = isMobileLikeDevice();

  if (mobileLike || cores <= 4 || (memory !== null && memory <= 4)) {
    return 'low';
  }

  if (cores >= 8 && dpr >= 1.25 && (memory === null || memory >= 8)) {
    return 'high';
  }

  return 'medium';
}

export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function supportsWebGL() {
  if (typeof document === 'undefined') {
    return true;
  }

  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    );
  } catch {
    return false;
  }
}

export function hexToRgbString(hex: string) {
  const normalized = hex.replace('#', '').trim();
  if (normalized.length !== 6) {
    return '217, 255, 63';
  }

  const value = Number.parseInt(normalized, 16);
  if (Number.isNaN(value)) {
    return '217, 255, 63';
  }

  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
}

export function getSceneProfile(
  quality: QualityTier,
  mode: HeroVisualMode
): SceneProfile {
  if (mode === 'fallback' || mode === 'reduced') {
    return {
      starCount: 0,
      starRadius: 0,
      sparkleCount: 0,
      monolithCount: 0,
      shardCount: 0,
      ribbonCount: 0,
      haloCount: 0,
      bloomIntensity: 0,
      noiseOpacity: 0,
      aberrationOffset: 0,
      ambientLight: 0.16,
      dprCap: 1,
      fieldStrength: 0,
      haloScale: 1,
      particleSize: 1,
      enablePostFx: false,
    };
  }

  if (mode === 'lite' || quality === 'low') {
    return {
      starCount: 900,
      starRadius: 90,
      sparkleCount: 26,
      monolithCount: 14,
      shardCount: 18,
      ribbonCount: 3,
      haloCount: 120,
      bloomIntensity: 0.88,
      noiseOpacity: 0.018,
      aberrationOffset: 0.00022,
      ambientLight: 0.75,
      dprCap: 1.2,
      fieldStrength: 0.34,
      haloScale: 0.92,
      particleSize: 2.6,
      enablePostFx: false,
    };
  }

  if (quality === 'high') {
    return {
      starCount: 2200,
      starRadius: 130,
      sparkleCount: 72,
      monolithCount: 28,
      shardCount: 34,
      ribbonCount: 5,
      haloCount: 260,
      bloomIntensity: 1.35,
      noiseOpacity: 0.028,
      aberrationOffset: 0.00055,
      ambientLight: 0.88,
      dprCap: 1.9,
      fieldStrength: 0.58,
      haloScale: 1.12,
      particleSize: 3.6,
      enablePostFx: true,
    };
  }

  return {
    starCount: 1500,
    starRadius: 110,
    sparkleCount: 46,
    monolithCount: 20,
    shardCount: 24,
    ribbonCount: 4,
    haloCount: 180,
    bloomIntensity: 1.08,
    noiseOpacity: 0.022,
    aberrationOffset: 0.00036,
    ambientLight: 0.82,
    dprCap: 1.55,
    fieldStrength: 0.48,
    haloScale: 1,
    particleSize: 3,
    enablePostFx: true,
  };
}

export function optimizeSceneProfileForMobile(
  sceneProfile: SceneProfile,
  options?: {
    lowMemory?: boolean;
    compactViewport?: boolean;
  }
): SceneProfile {
  const lowMemory = options?.lowMemory ?? false;
  const compactViewport = options?.compactViewport ?? false;
  const aggressiveReduction = lowMemory || compactViewport;

  return {
    ...sceneProfile,
    starCount: Math.min(
      sceneProfile.starCount,
      aggressiveReduction ? 680 : 820
    ),
    sparkleCount: Math.min(
      sceneProfile.sparkleCount,
      aggressiveReduction ? 18 : 24
    ),
    monolithCount: Math.min(
      sceneProfile.monolithCount,
      aggressiveReduction ? 10 : 12
    ),
    shardCount: Math.min(
      sceneProfile.shardCount,
      aggressiveReduction ? 12 : 16
    ),
    ribbonCount: Math.min(
      sceneProfile.ribbonCount,
      aggressiveReduction ? 2 : 3
    ),
    haloCount: Math.min(sceneProfile.haloCount, aggressiveReduction ? 80 : 110),
    bloomIntensity: Math.min(sceneProfile.bloomIntensity, 0.9),
    noiseOpacity: Math.min(sceneProfile.noiseOpacity, 0.016),
    aberrationOffset: Math.min(sceneProfile.aberrationOffset, 0.00018),
    ambientLight: Math.max(sceneProfile.ambientLight, 0.82),
    dprCap: aggressiveReduction ? 1.05 : 1.12,
    fieldStrength: Math.min(sceneProfile.fieldStrength, 0.28),
    haloScale: Math.min(sceneProfile.haloScale, 0.88),
    particleSize: Math.min(sceneProfile.particleSize, 2.7),
    enablePostFx: false,
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
