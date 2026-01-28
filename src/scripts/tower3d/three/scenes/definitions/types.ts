import * as THREE from 'three';
import type { TowerCaps } from '../../../core/caps';

export interface SceneRuntime {
  renderer: THREE.WebGLRenderer;
  root: HTMLElement;
  size: { width: number; height: number; dpr: number };
  pointer: THREE.Vector2; // -1 to 1
  pointerVelocity: THREE.Vector2;
  scrollVelocity: number;
  dt: number;
  time: number;
  progress: number;
  localProgress: number;
  caps: TowerCaps;
  gyro: THREE.Vector3; // -1 to 1 based on beta/gamma
  gyroActive: boolean;
  bgTheme: string; // 'dark' | 'glass'
  press: number; // 0 to 1
  tap: number; // transient 0->1 signal
  sceneId: string;
  sceneIndex: number;
  audio: { level: number; low: number; mid: number; high: number };
}

export interface TowerScene {
  id: string;
  group: THREE.Group;
  camera: THREE.Camera;
  bg?: THREE.Color;
  init(ctx: SceneRuntime): void;
  resize(ctx: SceneRuntime): void;
  update(ctx: SceneRuntime): void;
  render?(ctx: SceneRuntime): void;
  dispose(): void;
  cleanup?(): void;
}

export interface SceneMeta {
  id: string;
  title: string;
  subtitle: string;
  index: number;
}

export const sceneMeta: SceneMeta[] = [
  {
    id: 'scene00',
    title: 'Genesis Forge',
    subtitle: 'Resonant Core',
    index: 0,
  },
  {
    id: 'scene01',
    title: 'Liquid‑Metal Relic',
    subtitle: 'Nonlinear Motion',
    index: 1,
  },
  {
    id: 'scene02',
    title: 'Million Fireflies',
    subtitle: 'Flow Fields',
    index: 2,
  },
  {
    id: 'scene03',
    title: 'Quantum Ribbons',
    subtitle: 'Knot Logic',
    index: 3,
  },
  {
    id: 'scene04',
    title: 'Aurora Curtains',
    subtitle: 'Magnetic Light',
    index: 4,
  },
  {
    id: 'scene05',
    title: 'Event Horizon',
    subtitle: 'Accretion',
    index: 5,
  },
  {
    id: 'scene06',
    title: 'Kaleido Glass',
    subtitle: 'Refraction',
    index: 6,
  },
  {
    id: 'scene07',
    title: 'Matrix Rain',
    subtitle: 'Signal Drift',
    index: 7,
  },
  {
    id: 'scene08',
    title: 'Orbital Mechanics',
    subtitle: 'Gravity Wells',
    index: 8,
  },
  {
    id: 'scene09',
    title: 'Voronoi Shards',
    subtitle: 'Glass Physics',
    index: 9,
  },
  {
    id: 'scene10',
    title: 'Quantum Moiré',
    subtitle: 'Interference',
    index: 10,
  },
  {
    id: 'scene11',
    title: 'Neural Constellation',
    subtitle: 'Synapses',
    index: 11,
  },
  { id: 'scene12', title: 'The Library', subtitle: 'Knowledge', index: 12 },
  {
    id: 'scene13',
    title: 'Bioluminescent Abyss',
    subtitle: 'Organic Glow',
    index: 13,
  },
  {
    id: 'scene14',
    title: 'Neon Metropolis',
    subtitle: 'Data Streets',
    index: 14,
  },
  {
    id: 'scene15',
    title: 'Digital Decay',
    subtitle: 'Controlled Collapse',
    index: 15,
  },
  {
    id: 'scene16',
    title: 'Ethereal Storm',
    subtitle: 'Volumetric Lightning',
    index: 16,
  },
  {
    id: 'scene17',
    title: 'Cyber Porsche',
    subtitle: 'GT3 RS Study',
    index: 17,
  },
];
