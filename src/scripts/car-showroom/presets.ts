export type LightPresetConfig = {
  background?: string;
  envIntensity?: number;
  lightIntensity?: number;
  lightWarmth?: number;
  rimBoost?: number;
  exposure?: number;
  bloomStrength?: number;
  bloomThreshold?: number;
  bloomRadius?: number;
  rigYaw?: number;
  underglow?: number;
  underglowColor?: string;
};

export type StylePresetConfig = {
  mode?: string;
  body?: string;
  wrap?: string;
  wrapPattern?: string;
  wrapStyle?: string;
  finish?: string;
  clearcoat?: number;
  flakeIntensity?: number;
  flakeScale?: number;
  wheelFinish?: string;
  wheelColor?: string;
  trimFinish?: string;
  trimColor?: string;
  caliper?: string;
  glassTint?: number;
  lightPreset?: string;
};

export const LIGHT_PRESETS: Record<string, LightPresetConfig> = {
  studio: {
    background: 'studio',
    envIntensity: 1,
    lightIntensity: 1,
    lightWarmth: 0,
    rimBoost: 1,
    exposure: 1,
    bloomStrength: 0.35,
    bloomThreshold: 0.88,
    bloomRadius: 0.35,
    rigYaw: 0,
  },
  golden: {
    background: 'sunset',
    envIntensity: 1.15,
    lightIntensity: 1.15,
    lightWarmth: 0.85,
    rimBoost: 1.15,
    exposure: 1.05,
    bloomStrength: 0.5,
    bloomThreshold: 0.8,
    bloomRadius: 0.55,
    rigYaw: 25,
  },
  neon: {
    background: 'night',
    envIntensity: 1.35,
    lightIntensity: 1.3,
    lightWarmth: 0.2,
    rimBoost: 1.6,
    exposure: 0.95,
    bloomStrength: 0.75,
    bloomThreshold: 0.6,
    bloomRadius: 0.75,
    rigYaw: 140,
    underglow: 2.2,
    underglowColor: '#22d3ee',
  },
  ice: {
    background: 'day',
    envIntensity: 1.2,
    lightIntensity: 1.05,
    lightWarmth: 0.05,
    rimBoost: 1.25,
    exposure: 1.1,
    bloomStrength: 0.45,
    bloomThreshold: 0.85,
    bloomRadius: 0.4,
    rigYaw: 320,
  },
  noir: {
    background: 'studio',
    envIntensity: 0.65,
    lightIntensity: 0.85,
    lightWarmth: 0.1,
    rimBoost: 1.8,
    exposure: 0.9,
    bloomStrength: 0.2,
    bloomThreshold: 0.9,
    bloomRadius: 0.2,
    rigYaw: 210,
  },
};

export const STYLE_PRESETS: Record<string, StylePresetConfig> = {
  stealth: {
    mode: 'paint',
    body: '#0b0f1a',
    finish: 'matte',
    clearcoat: 0.6,
    flakeIntensity: 0.1,
    flakeScale: 2.2,
    wheelFinish: 'black',
    wheelColor: '#0b0f1a',
    trimFinish: 'black',
    trimColor: '#0b0f1a',
    caliper: '#f87171',
    glassTint: 0.32,
    lightPreset: 'noir',
  },
  track: {
    mode: 'paint',
    body: '#f87171',
    finish: 'gloss',
    clearcoat: 1,
    flakeIntensity: 0.35,
    flakeScale: 3.2,
    wheelFinish: 'black',
    wheelColor: '#111827',
    trimFinish: 'black',
    trimColor: '#0b0f1a',
    caliper: '#fbbf24',
    glassTint: 0.18,
    lightPreset: 'studio',
  },
  lux: {
    mode: 'paint',
    body: '#1e3a8a',
    finish: 'satin',
    clearcoat: 0.85,
    flakeIntensity: 0.2,
    flakeScale: 2.6,
    wheelFinish: 'chrome',
    wheelColor: '#e5e7eb',
    trimFinish: 'chrome',
    trimColor: '#e5e7eb',
    caliper: '#ef4444',
    glassTint: 0.12,
    lightPreset: 'golden',
  },
  neo: {
    mode: 'wrap',
    body: '#7c3aed',
    wrap: '#7c3aed',
    wrapPattern: 'hex',
    wrapStyle: 'procedural',
    finish: 'gloss',
    clearcoat: 0.95,
    flakeIntensity: 0.4,
    flakeScale: 4,
    wheelFinish: 'graphite',
    wheelColor: '#1f2937',
    trimFinish: 'black',
    trimColor: '#0b0f1a',
    caliper: '#22d3ee',
    glassTint: 0.22,
    lightPreset: 'neon',
  },
  classic: {
    mode: 'paint',
    body: '#e5e7eb',
    finish: 'gloss',
    clearcoat: 0.9,
    flakeIntensity: 0.18,
    flakeScale: 2.2,
    wheelFinish: 'chrome',
    wheelColor: '#e5e7eb',
    trimFinish: 'brushed',
    trimColor: '#9ca3af',
    caliper: '#ef4444',
    glassTint: 0.1,
    lightPreset: 'ice',
  },
};
