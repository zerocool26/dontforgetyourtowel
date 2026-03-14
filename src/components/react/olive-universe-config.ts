import { withBasePath } from '@/utils/helpers';

type NavigatorWithDeviceMemory = Navigator & {
  deviceMemory?: number;
};

export type QualityTier = 'high' | 'medium' | 'low';

export type HeroVisualMode = 'immersive' | 'lite' | 'reduced' | 'fallback';

export const SCENE_LENS_ORDER = ['glide', 'orbit', 'surge'] as const;

export type SceneLensMode = (typeof SCENE_LENS_ORDER)[number];

export interface SceneProfile {
  particleCount: number;
  neuralNodeCount: number;
  signalGridSize: number;
  starCount: number;
  starFactor: number;
  cloudSparkles: number;
  signalSparkles: number;
  singularitySparkles: number;
  singularitySparkleSize: number;
  enablePostFx: boolean;
  bloomIntensity: number;
  noiseOpacity: number;
  aberrationOffset: number;
  ambientLight: number;
  fogFar: number;
  pointerParallax: boolean;
}

export interface ChapterDef {
  id: string;
  kicker: string;
  title: string[];
  copy: string;
  accent: string;
  ctas: Array<{ label: string; href: string; primary?: boolean }>;
  metrics?: string[];
  range: [number, number];
}

export interface ChapterAtmosphereDef {
  label: string;
  note: string;
  traits: [string, string, string];
  fogColor: string;
  hazeColor: string;
  keyLightColor: string;
  rimLightColor: string;
  ambientBoost: number;
  keyLightIntensity: number;
  rimLightIntensity: number;
  hazeOpacity: number;
  haloOpacity: number;
  haloScale: number;
  starDriftSpeed: number;
}

export const CHAPTERS: ChapterDef[] = [
  {
    id: 'genesis',
    kicker: 'Creative Technology Studio',
    title: ['Creative technology', 'that lands harder.'],
    copy: 'We build cinematic digital systems that look premium, move fast, and push conversion harder.',
    accent: '#ccff00',
    metrics: ['AI Systems', 'Cybersecurity', 'Cloud Eng', 'Managed Ops'],
    ctas: [
      {
        label: 'Explore Services',
        href: withBasePath('services/'),
        primary: true,
      },
      { label: 'View Portfolio', href: withBasePath('about/') },
    ],
    range: [0, 0.18],
  },
  {
    id: 'neural',
    kicker: 'AI Systems',
    title: ['AI Orchestration', 'built to ship.'],
    copy: 'AI operators, decision flows, and automations built to remove drag and create leverage.',
    accent: '#00d4ff',
    ctas: [
      {
        label: 'Explore AI Services',
        href: withBasePath('services/#ai'),
        primary: true,
      },
      { label: 'Start a Project', href: withBasePath('contact-hq/') },
    ],
    range: [0.22, 0.38],
  },
  {
    id: 'vault',
    kicker: 'Cybersecurity',
    title: ['Digital Resilience', 'without slowdowns.'],
    copy: 'Security is engineered into delivery, so you move fast without opening blind spots.',
    accent: '#a855f7',
    ctas: [
      {
        label: 'Security Services',
        href: withBasePath('services/#cybersecurity'),
        primary: true,
      },
      { label: 'View Portfolio', href: withBasePath('about/') },
    ],
    range: [0.42, 0.58],
  },
  {
    id: 'cloud',
    kicker: 'Cloud Engineering',
    title: ['Infrastructure', 'that scales clean.'],
    copy: 'Cloud systems built to stay fast, resilient, and brutally efficient when traffic and stakes spike.',
    accent: '#38bdf8',
    ctas: [
      {
        label: 'Cloud Services',
        href: withBasePath('services/#cloud'),
        primary: true,
      },
      { label: 'Build Studio', href: withBasePath('build-studio/') },
    ],
    range: [0.62, 0.78],
  },
  {
    id: 'signal',
    kicker: 'Managed Operations',
    title: ['Signal locked.', 'Noise removed.'],
    copy: 'Embedded ops that cut noise, tighten response, and keep launches under control.',
    accent: '#22c55e',
    ctas: [
      {
        label: 'Ops Services',
        href: withBasePath('services/#managed-it'),
        primary: true,
      },
      { label: 'Compare Plans', href: withBasePath('pricing/') },
    ],
    range: [0.82, 0.92],
  },
  {
    id: 'singularity',
    kicker: 'Start Your Project',
    title: ['Enter', 'the System.'],
    copy: 'One elite partner. Less drag. Faster launch. Better systems.',
    accent: '#ccff00',
    ctas: [
      { label: 'Contact HQ', href: withBasePath('contact-hq/'), primary: true },
      { label: 'Open Build Studio', href: withBasePath('build-studio/') },
    ],
    range: [0.94, 1.0],
  },
];

export const CHAPTER_ATMOSPHERES: Record<
  ChapterDef['id'],
  ChapterAtmosphereDef
> = {
  genesis: {
    label: 'Solar bloom',
    note: 'Warm chartreuse haze, soft launch glow, and wide cinematic drift keep the opening scene feeling expansive instead of static.',
    traits: ['Wide field', 'Warm flare', 'Slow drift'],
    fogColor: '#05070d',
    hazeColor: '#ccff00',
    keyLightColor: '#f8ff9f',
    rimLightColor: '#7dd3fc',
    ambientBoost: 0.07,
    keyLightIntensity: 1.7,
    rimLightIntensity: 0.9,
    hazeOpacity: 0.11,
    haloOpacity: 0.16,
    haloScale: 1.08,
    starDriftSpeed: 0.45,
  },
  neural: {
    label: 'Cyan lattice',
    note: 'The AI chapter shifts into cooler lattice lighting with a tighter halo and more active drift, so the network feels awake and analytical.',
    traits: ['Cool mesh', 'Fast pulse', 'Focused light'],
    fogColor: '#030812',
    hazeColor: '#00d4ff',
    keyLightColor: '#67e8f9',
    rimLightColor: '#ccff00',
    ambientBoost: 0.05,
    keyLightIntensity: 1.95,
    rimLightIntensity: 1.05,
    hazeOpacity: 0.13,
    haloOpacity: 0.2,
    haloScale: 0.96,
    starDriftSpeed: 0.62,
  },
  vault: {
    label: 'Zero-trust prism',
    note: 'Security scenes now pull in amethyst fog, harder rim lighting, and a denser halo to make the fortress chapter feel sealed and fortified.',
    traits: ['Prism shield', 'Dense halo', 'Hard rim'],
    fogColor: '#080512',
    hazeColor: '#a855f7',
    keyLightColor: '#d8b4fe',
    rimLightColor: '#7c3aed',
    ambientBoost: 0.04,
    keyLightIntensity: 1.75,
    rimLightIntensity: 1.2,
    hazeOpacity: 0.16,
    haloOpacity: 0.22,
    haloScale: 0.9,
    starDriftSpeed: 0.36,
  },
  cloud: {
    label: 'Orbital skyline',
    note: 'Cloud Engineering gets a brighter skyline wash and broader blue orbit, helping the network scene read as elevated infrastructure rather than deep space only.',
    traits: ['Blue orbit', 'Sky wash', 'Lifted focus'],
    fogColor: '#02111c',
    hazeColor: '#38bdf8',
    keyLightColor: '#bae6fd',
    rimLightColor: '#22d3ee',
    ambientBoost: 0.08,
    keyLightIntensity: 1.85,
    rimLightIntensity: 1.0,
    hazeOpacity: 0.12,
    haloOpacity: 0.18,
    haloScale: 1.14,
    starDriftSpeed: 0.54,
  },
  signal: {
    label: 'Carrier grid',
    note: 'Managed Operations runs on an emerald carrier field with disciplined fog and tight bands, giving the telemetry chapter more operational tension.',
    traits: ['Grid pulse', 'Emerald haze', 'Tight sync'],
    fogColor: '#04110a',
    hazeColor: '#22c55e',
    keyLightColor: '#86efac',
    rimLightColor: '#bef264',
    ambientBoost: 0.06,
    keyLightIntensity: 1.7,
    rimLightIntensity: 1.08,
    hazeOpacity: 0.12,
    haloOpacity: 0.18,
    haloScale: 0.98,
    starDriftSpeed: 0.58,
  },
  singularity: {
    label: 'Launch horizon',
    note: 'The finale expands into a brighter launch horizon with a larger halo and warmer rim light so the closing CTA feels like ignition, not shutdown.',
    traits: ['Bright horizon', 'Wide halo', 'Launch flare'],
    fogColor: '#05070b',
    hazeColor: '#ccff00',
    keyLightColor: '#fef08a',
    rimLightColor: '#facc15',
    ambientBoost: 0.1,
    keyLightIntensity: 2.1,
    rimLightIntensity: 1.3,
    hazeOpacity: 0.14,
    haloOpacity: 0.24,
    haloScale: 1.2,
    starDriftSpeed: 0.7,
  },
};

export const CAMERA_KF = [
  { t: 0.0, pos: [0, 0, 9] as const, look: [0, 0, 0] as const },
  { t: 0.2, pos: [-1, 1.5, 12] as const, look: [-1, 0.5, 0] as const },
  { t: 0.38, pos: [-2, 0.5, 7] as const, look: [0, 0, 0] as const },
  { t: 0.58, pos: [2, -0.5, 6] as const, look: [0, 0, 0] as const },
  { t: 0.78, pos: [0, 2.5, 8] as const, look: [0, 0, 0] as const },
  { t: 0.92, pos: [-1, 0.5, 7] as const, look: [0, 0, 0] as const },
  { t: 1.0, pos: [0, 0, 4.5] as const, look: [0, 0, 0] as const },
];

export function getDeviceMemory() {
  if (typeof navigator === 'undefined') return null;

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
  const userAgent = navigator.userAgent ?? '';
  const platform = navigator.platform ?? '';
  const shortEdge = Math.min(
    window.innerWidth || window.screen?.width || 0,
    window.innerHeight || window.screen?.height || 0
  );
  const mobileUserAgent = /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent);
  const ipadOsSession = /Mac/i.test(platform) && touchCapable;

  return (
    mobileUserAgent ||
    ipadOsSession ||
    (coarsePointer && shortEdge > 0 && shortEdge <= 1180)
  );
}

export function detectQuality(): QualityTier {
  if (typeof window === 'undefined') return 'medium';

  const cores = navigator.hardwareConcurrency ?? 4;
  const dpr = window.devicePixelRatio ?? 1;
  const deviceMemory = getDeviceMemory();
  const coarsePointer =
    window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const mobileLike = isMobileLikeDevice();
  const constrainedMemory = deviceMemory !== null && deviceMemory <= 4;
  const ampleMemory = deviceMemory === null || deviceMemory >= 8;

  if (cores <= 2) return 'low';
  if (mobileLike || (coarsePointer && (constrainedMemory || cores <= 4))) {
    return 'low';
  }
  if (constrainedMemory || cores <= 4) return 'medium';
  if (cores >= 8 && dpr >= 1.5 && ampleMemory) return 'high';
  return 'medium';
}

export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function supportsWebGL() {
  if (typeof document === 'undefined') return true;

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
    return '204, 255, 0';
  }

  const value = Number.parseInt(normalized, 16);

  if (Number.isNaN(value)) {
    return '204, 255, 0';
  }

  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
}

export function getSceneProfile(
  quality: QualityTier,
  mode: HeroVisualMode
): SceneProfile {
  if (mode === 'lite' || mode === 'reduced' || mode === 'fallback') {
    return {
      particleCount: 7200,
      neuralNodeCount: 24,
      signalGridSize: 9,
      starCount: 900,
      starFactor: 2.4,
      cloudSparkles: 18,
      signalSparkles: 12,
      singularitySparkles: 52,
      singularitySparkleSize: 3.6,
      enablePostFx: false,
      bloomIntensity: 0.85,
      noiseOpacity: 0.015,
      aberrationOffset: 0.00025,
      ambientLight: 0.12,
      fogFar: 68,
      pointerParallax: false,
    };
  }

  if (quality === 'high') {
    return {
      particleCount: 16000,
      neuralNodeCount: 38,
      signalGridSize: 12,
      starCount: 2500,
      starFactor: 4,
      cloudSparkles: 50,
      signalSparkles: 35,
      singularitySparkles: 120,
      singularitySparkleSize: 4.5,
      enablePostFx: true,
      bloomIntensity: 1.6,
      noiseOpacity: 0.035,
      aberrationOffset: 0.0007,
      ambientLight: 0.08,
      fogFar: 85,
      pointerParallax: true,
    };
  }

  return {
    particleCount: 11800,
    neuralNodeCount: 32,
    signalGridSize: 10,
    starCount: 1700,
    starFactor: 3.2,
    cloudSparkles: 34,
    signalSparkles: 24,
    singularitySparkles: 84,
    singularitySparkleSize: 4.1,
    enablePostFx: true,
    bloomIntensity: 1.2,
    noiseOpacity: 0.025,
    aberrationOffset: 0.00045,
    ambientLight: 0.1,
    fogFar: 78,
    pointerParallax: true,
  };
}

export function optimizeSceneProfileForMobile(
  sceneProfile: SceneProfile,
  options?: {
    preservePostFx?: boolean;
    lowMemory?: boolean;
    compactViewport?: boolean;
  }
): SceneProfile {
  const preservePostFx = options?.preservePostFx ?? false;
  const lowMemory = options?.lowMemory ?? false;
  const compactViewport = options?.compactViewport ?? false;
  const aggressiveReduction = lowMemory || compactViewport;
  const keepPostFx = preservePostFx && sceneProfile.enablePostFx && !lowMemory;

  return {
    ...sceneProfile,
    particleCount: Math.min(
      sceneProfile.particleCount,
      keepPostFx
        ? aggressiveReduction
          ? 7600
          : 8800
        : aggressiveReduction
          ? 5600
          : 6800
    ),
    neuralNodeCount: Math.min(
      sceneProfile.neuralNodeCount,
      keepPostFx
        ? aggressiveReduction
          ? 24
          : 26
        : aggressiveReduction
          ? 18
          : 22
    ),
    signalGridSize: Math.min(
      sceneProfile.signalGridSize,
      keepPostFx ? (aggressiveReduction ? 8 : 9) : aggressiveReduction ? 7 : 8
    ),
    starCount: Math.min(
      sceneProfile.starCount,
      keepPostFx
        ? aggressiveReduction
          ? 980
          : 1180
        : aggressiveReduction
          ? 620
          : 780
    ),
    starFactor: Math.min(sceneProfile.starFactor, keepPostFx ? 2.6 : 2.1),
    cloudSparkles: Math.min(
      sceneProfile.cloudSparkles,
      keepPostFx
        ? aggressiveReduction
          ? 20
          : 24
        : aggressiveReduction
          ? 12
          : 16
    ),
    signalSparkles: Math.min(
      sceneProfile.signalSparkles,
      keepPostFx
        ? aggressiveReduction
          ? 14
          : 18
        : aggressiveReduction
          ? 8
          : 10
    ),
    singularitySparkles: Math.min(
      sceneProfile.singularitySparkles,
      keepPostFx
        ? aggressiveReduction
          ? 56
          : 68
        : aggressiveReduction
          ? 34
          : 46
    ),
    singularitySparkleSize: Math.min(
      sceneProfile.singularitySparkleSize,
      keepPostFx ? 3.8 : 3.3
    ),
    enablePostFx: keepPostFx,
    bloomIntensity: Math.min(
      sceneProfile.bloomIntensity,
      keepPostFx ? 0.95 : 0.82
    ),
    noiseOpacity: Math.min(
      sceneProfile.noiseOpacity,
      keepPostFx ? 0.016 : 0.01
    ),
    aberrationOffset: Math.min(
      sceneProfile.aberrationOffset,
      keepPostFx ? 0.00028 : 0.00018
    ),
    ambientLight: Math.max(
      sceneProfile.ambientLight,
      aggressiveReduction ? 0.14 : 0.12
    ),
    fogFar: Math.min(
      sceneProfile.fogFar,
      keepPostFx
        ? aggressiveReduction
          ? 60
          : 66
        : aggressiveReduction
          ? 48
          : 56
    ),
    pointerParallax: false,
  };
}

export const HERO_MODE_LABELS: Record<HeroVisualMode, string> = {
  immersive: 'Immersive 3D',
  lite: 'Adaptive 3D',
  reduced: 'Reduced motion',
  fallback: 'Ambient fallback',
};

export const HERO_MODE_NOTES: Record<HeroVisualMode, string> = {
  immersive: 'Full 3D is live.',
  lite: 'The lighter 3D stack is active for smoother playback.',
  reduced: 'Calm presentation is active.',
  fallback: 'WebGL is unavailable, so the layered fallback is active.',
};
