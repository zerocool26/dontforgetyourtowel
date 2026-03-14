import { type SceneLensMode } from './olive-universe-config';

export interface SceneLensCameraSettings {
  driftMultiplier: number;
  orbitRadius: number;
  orbitSpeed: number;
  lookBias: number;
  pushIn: number;
  lerp: number;
  signatureGain: number;
  burstGain: number;
}

export const SCENE_LENS_CAMERA_SETTINGS: Record<
  SceneLensMode,
  SceneLensCameraSettings
> = {
  glide: {
    driftMultiplier: 0.82,
    orbitRadius: 0.12,
    orbitSpeed: 0.14,
    lookBias: 0.16,
    pushIn: 0.08,
    lerp: 0.034,
    signatureGain: 0.88,
    burstGain: 0.92,
  },
  orbit: {
    driftMultiplier: 1,
    orbitRadius: 0.34,
    orbitSpeed: 0.2,
    lookBias: 0.22,
    pushIn: 0.16,
    lerp: 0.04,
    signatureGain: 1.02,
    burstGain: 1,
  },
  surge: {
    driftMultiplier: 1.22,
    orbitRadius: 0.2,
    orbitSpeed: 0.28,
    lookBias: 0.28,
    pushIn: 0.28,
    lerp: 0.048,
    signatureGain: 1.18,
    burstGain: 1.22,
  },
};
