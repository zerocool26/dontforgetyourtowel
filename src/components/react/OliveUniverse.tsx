/** @jsxImportSource react */
/** @jsxRuntime automatic */
import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, Float, Sparkles } from '@react-three/drei';
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
  Noise,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import '@/styles/olive-universe.css';

// ============================================================
// TYPES & CONSTANTS
// ============================================================

type QualityTier = 'high' | 'medium' | 'low';

interface ChapterDef {
  id: string;
  kicker: string;
  title: string[];
  copy: string;
  accent: string;
  ctas: Array<{ label: string; href: string; primary?: boolean }>;
  metrics?: string[];
  range: [number, number];
}

const BASE = (typeof window !== 'undefined' && (window as any).__ASTRO_BASE_PATH__) || '';

const CHAPTERS: ChapterDef[] = [
  {
    id: 'genesis',
    kicker: 'Creative Technology Studio',
    title: ['Creative technology', 'without template energy.'],
    copy: 'We design and build product experiences that feel alive — cinematic visuals, intentional motion, and production-grade engineering under one roof.',
    accent: '#ccff00',
    metrics: ['AI Systems', 'Cybersecurity', 'Cloud Eng', 'Managed Ops'],
    ctas: [
      { label: 'Explore Services', href: `${BASE}/services/`, primary: true },
      { label: 'View Portfolio', href: `${BASE}/about/` },
    ],
    range: [0, 0.18],
  },
  {
    id: 'neural',
    kicker: 'AI Systems',
    title: ['AI Orchestration', '& Advanced Dev'],
    copy: 'Multi-agent products, decision systems, and AI-native workflows crafted for clarity, speed, and measurable impact.',
    accent: '#00d4ff',
    ctas: [
      { label: 'Explore AI Services', href: `${BASE}/services/#ai`, primary: true },
      { label: 'Start a Project', href: `${BASE}/contact-hq/` },
    ],
    range: [0.22, 0.38],
  },
  {
    id: 'vault',
    kicker: 'Cybersecurity',
    title: ['Digital Resilience', 'at Scale'],
    copy: 'Security and reliability programs built to support ambitious product velocity — not slow it down. Threat modeling tied directly to product roadmaps.',
    accent: '#a855f7',
    ctas: [
      { label: 'Security Services', href: `${BASE}/services/#cybersecurity`, primary: true },
      { label: 'View Portfolio', href: `${BASE}/about/` },
    ],
    range: [0.42, 0.58],
  },
  {
    id: 'cloud',
    kicker: 'Cloud Engineering',
    title: ['Infrastructure', 'That Thinks'],
    copy: 'Cloud architecture designed for scale, resilience, and zero-surprise delivery. Every node purposeful. Every path optimized.',
    accent: '#38bdf8',
    ctas: [
      { label: 'Cloud Services', href: `${BASE}/services/#cloud`, primary: true },
      { label: 'Build Studio', href: `${BASE}/build-studio/` },
    ],
    range: [0.62, 0.78],
  },
  {
    id: 'signal',
    kicker: 'Managed Operations',
    title: ['Signal Zero.', 'Noise Eliminated.'],
    copy: 'Operational runbooks that keep launches calm. Monitoring, incident response, and continuous improvement as a fully embedded service.',
    accent: '#22c55e',
    ctas: [
      { label: 'Ops Services', href: `${BASE}/services/#managed-it`, primary: true },
      { label: 'Compare Plans', href: `${BASE}/pricing/` },
    ],
    range: [0.82, 0.92],
  },
  {
    id: 'singularity',
    kicker: 'Start Your Project',
    title: ['Enter', 'the System.'],
    copy: "One creative engineering partner instead of five disconnected vendors. Let's build something unforgettable together.",
    accent: '#ccff00',
    ctas: [
      { label: 'Contact HQ', href: `${BASE}/contact-hq/`, primary: true },
      { label: 'Open Build Studio', href: `${BASE}/build-studio/` },
    ],
    range: [0.94, 1.0],
  },
];

const CAMERA_KF = [
  { t: 0.00, pos: [0, 0, 9] as const,    look: [0, 0, 0] as const },
  { t: 0.20, pos: [-1, 1.5, 12] as const, look: [-1, 0.5, 0] as const },
  { t: 0.38, pos: [-2, 0.5, 7] as const,  look: [0, 0, 0] as const },
  { t: 0.58, pos: [2, -0.5, 6] as const,  look: [0, 0, 0] as const },
  { t: 0.78, pos: [0, 2.5, 8] as const,   look: [0, 0, 0] as const },
  { t: 0.92, pos: [-1, 0.5, 7] as const,  look: [0, 0, 0] as const },
  { t: 1.00, pos: [0, 0, 4.5] as const,   look: [0, 0, 0] as const },
];

// ============================================================
// SHADERS
// ============================================================

const PARTICLE_VERT = /* glsl */`
  uniform float uTime;
  uniform float uMorph;
  uniform vec2  uMouse;
  attribute vec3  aTarget;
  attribute float aSeed;

  vec3 hash3(float n) {
    vec3 p = fract(vec3(n, n * 1.61803, n * 2.71828) * vec3(127.1, 311.7, 74.7));
    p = p * 2.0 - 1.0;
    return p;
  }

  void main() {
    float phi   = aSeed * 6.28318 * 137.508;
    float theta = acos(1.0 - 2.0 * fract(aSeed * 0.61803));
    float r     = 4.5 + sin(aSeed * 7.3 + uTime * 0.2) * 2.0;

    vec3 chaos = vec3(
      sin(phi + uTime * 0.25) * sin(theta) * r,
      cos(theta + uTime * 0.18) * 2.2,
      cos(phi + uTime * 0.3)  * sin(theta) * r
    );

    vec3 pos = mix(chaos, aTarget, smoothstep(0.0, 1.0, uMorph));

    // Mouse gravity
    vec2 mw = uMouse * 5.2;
    vec2 d2 = pos.xy - mw;
    float md = length(d2);
    if (md < 2.2 && md > 0.01) {
      pos.xy += normalize(d2) * (2.2 - md) * (1.0 - uMorph * 0.4) * 0.9;
    }

    // Organic breathing
    float breath = sin(uTime + aSeed * 3.14) * 0.045;
    pos += vec3(breath, cos(uTime * 0.8 + aSeed * 2.71) * 0.045, sin(uTime * 1.2 + aSeed) * 0.03) * uMorph;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    float pulse = 1.0 + sin(uTime * 2.5 + aSeed * 6.28) * 0.22;
    gl_PointSize = clamp(pulse * 290.0 / -mvPos.z, 1.0, 7.0);
  }
`;

const PARTICLE_FRAG = /* glsl */`
  uniform vec3  uColor;
  uniform float uMorph;
  void main() {
    vec2  uv = gl_PointCoord - 0.5;
    float d  = length(uv);
    if (d > 0.5) discard;
    float soft  = 1.0 - smoothstep(0.22, 0.5, d);
    float glow  = (1.0 - d * 2.0) * uMorph * 0.8;
    float alpha = soft * (0.45 + uMorph * 0.55);
    gl_FragColor = vec4(uColor + vec3(glow * 0.6), alpha);
  }
`;

const NEURAL_VERT = /* glsl */`
  attribute float aP;
  varying float vP;
  void main() {
    vP = aP;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const NEURAL_FRAG = /* glsl */`
  uniform float uTime;
  uniform vec3  uColor;
  varying float vP;
  void main() {
    float pulse = fract(vP - uTime * 0.4);
    float i = exp(-pulse * 5.5) * 0.9 + 0.1;
    gl_FragColor = vec4(uColor * i, i * 0.88);
  }
`;

const SHIELD_VERT = /* glsl */`
  varying vec3 vW;
  varying vec3 vN;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SHIELD_FRAG = /* glsl */`
  uniform float uTime;
  uniform vec3  uColor;
  varying vec3  vW;
  varying vec3  vN;
  void main() {
    float dist   = length(vW);
    float r1 = sin(dist * 4.0 - uTime * 1.6) * 0.5 + 0.5;
    float r2 = sin(dist * 7.2 - uTime * 2.3 + 1.1) * 0.5 + 0.5;
    float rings  = max(r1 * 0.65, r2 * 0.45);
    vec3  vd     = normalize(cameraPosition - vW);
    float fresnel= pow(1.0 - abs(dot(vN, vd)), 2.6);
    float c      = rings * 0.35 + fresnel * 0.65;
    vec3  col    = mix(uColor, vec3(1.0), fresnel * 0.45);
    gl_FragColor = vec4(col, c * 0.62);
  }
`;

const DATA_VERT = /* glsl */`
  attribute float aI;
  uniform float uTime;
  varying float vH;
  void main() {
    float col = mod(aI, 12.0);
    float row = floor(aI / 12.0);
    float h = (sin(uTime * 1.8 + col * 0.6 + row * 0.8) * 0.5 + 0.5)
            * (cos(uTime * 1.2 + col * 0.4) * 0.5 + 0.5) * 2.8 + 0.12;
    vec3 pos = position;
    pos.y = pos.y * h + h * 0.5 - 1.0;
    vH = h;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const DATA_FRAG = /* glsl */`
  uniform vec3  uColor;
  varying float vH;
  void main() {
    vec3 col = mix(uColor * 0.3, uColor, vH * 0.5);
    col += vec3(vH * 0.25);
    gl_FragColor = vec4(col, 0.88);
  }
`;

// ============================================================
// UTILITIES
// ============================================================

function detectQuality(): QualityTier {
  if (typeof window === 'undefined') return 'medium';
  const cores = navigator.hardwareConcurrency ?? 4;
  const dpr = window.devicePixelRatio ?? 1;
  const mobile = /Mobi|Android/i.test(navigator.userAgent);
  if (mobile || cores <= 2) return 'low';
  if (cores >= 6 && dpr >= 1.5) return 'high';
  return 'medium';
}

function sampleText(text: string, count: number): Float32Array {
  if (typeof document === 'undefined') return new Float32Array(count * 3);
  const cvs = document.createElement('canvas');
  cvs.width = 512; cvs.height = 128;
  const ctx = cvs.getContext('2d');
  if (!ctx) return new Float32Array(count * 3);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 60px "Space Grotesk", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);
  const { data } = ctx.getImageData(0, 0, 512, 128);
  const pts: [number, number][] = [];
  for (let y = 0; y < 128; y += 2)
    for (let x = 0; x < 512; x += 2)
      if (data[(y * 512 + x) * 4 + 3] > 100) pts.push([x, y]);
  const out = new Float32Array(count * 3);
  const stride = Math.max(1, Math.floor(pts.length / count));
  for (let i = 0; i < count; i++) {
    const p = pts[Math.min(i * stride, pts.length - 1)];
    if (p) {
      out[i * 3]     = (p[0] / 512 - 0.5) * 10.5;
      out[i * 3 + 1] = -(p[1] / 128 - 0.5) * 2.6;
      out[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }
  }
  return out;
}

function camAtT(t: number) {
  const kf = CAMERA_KF;
  if (t <= kf[0].t) return { pos: kf[0].pos, look: kf[0].look };
  if (t >= kf[kf.length - 1].t) { const l = kf[kf.length - 1]; return { pos: l.pos, look: l.look }; }
  for (let i = 0; i < kf.length - 1; i++) {
    if (t >= kf[i].t && t <= kf[i + 1].t) {
      const local = (t - kf[i].t) / (kf[i + 1].t - kf[i].t);
      const e = local < 0.5 ? 2 * local * local : 1 - Math.pow(-2 * local + 2, 2) / 2;
      const lerp3 = (a: readonly [number,number,number], b: readonly [number,number,number], t: number) =>
        [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t] as [number,number,number];
      return { pos: lerp3(kf[i].pos, kf[i+1].pos, e), look: lerp3(kf[i].look, kf[i+1].look, e) };
    }
  }
  return { pos: kf[0].pos, look: kf[0].look };
}

// ============================================================
// 3D SCENE COMPONENTS
// ============================================================

// ── Chapter 0: Particle Galaxy ────────────────────────────
function ParticleGalaxy({ progressRef }: { progressRef: React.RefObject<number> }) {
  const matRef = useRef<THREE.ShaderMaterial | null>(null);
  const mouseRef = useRef(new THREE.Vector2());
  const COUNT = 16000;

  const geo = useMemo(() => {
    const seeds = new Float32Array(COUNT);
    const pos   = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const s = i / COUNT;
      seeds[i] = s;
      const phi = s * Math.PI * 2 * 137.508;
      const r   = Math.sqrt(s) * 6.5;
      pos[i*3]   = Math.cos(phi) * r;
      pos[i*3+1] = (Math.random() - 0.5) * 3.5;
      pos[i*3+2] = Math.sin(phi) * r;
    }
    const targets = sampleText('OLIVE', COUNT);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aTarget',  new THREE.BufferAttribute(targets, 3));
    g.setAttribute('aSeed',    new THREE.BufferAttribute(seeds, 1));
    return g;
  }, []);

  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: PARTICLE_VERT, fragmentShader: PARTICLE_FRAG,
    uniforms: {
      uTime:  { value: 0 },
      uMorph: { value: 0 },
      uMouse: { value: new THREE.Vector2() },
      uColor: { value: new THREE.Color('#ccff00') },
    },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }), []);

  useEffect(() => {
    const fn = (e: MouseEvent) => mouseRef.current.set(
      (e.clientX / window.innerWidth)  * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1,
    );
    window.addEventListener('mousemove', fn);
    return () => window.removeEventListener('mousemove', fn);
  }, []);

  useEffect(() => { matRef.current = mat; }, [mat]);

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    const p = progressRef.current ?? 0;
    const [s, e] = CHAPTERS[0].range;
    const local = Math.max(0, Math.min(1, (p - s) / (e - s)));
    matRef.current.uniforms.uTime.value  = clock.elapsedTime;
    matRef.current.uniforms.uMorph.value = THREE.MathUtils.lerp(
      matRef.current.uniforms.uMorph.value, local * 1.2, 0.025,
    );
    matRef.current.uniforms.uMouse.value.lerp(mouseRef.current, 0.06);
  });

  return <points geometry={geo} material={mat} />;
}

// ── Chapter 1: Neural Cortex ──────────────────────────────
function NeuralCortex({ progressRef }: { progressRef: React.RefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);
  const N = 38;

  const { nodePos, lineGeo, lineMat } = useMemo(() => {
    const nodePos: THREE.Vector3[] = Array.from({ length: N }, () =>
      new THREE.Vector3((Math.random()-0.5)*8, (Math.random()-0.5)*5, (Math.random()-0.5)*3.5)
    );

    const verts: number[] = [], progs: number[] = [];
    for (let a = 0; a < N; a++)
      for (let b = a+1; b < N; b++) {
        if (nodePos[a].distanceTo(nodePos[b]) > 3.8) continue;
        for (let s = 0; s <= 10; s++) {
          const t = s / 10;
          const p = new THREE.Vector3().lerpVectors(nodePos[a], nodePos[b], t);
          verts.push(p.x, p.y, p.z);
          progs.push(t);
        }
      }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
    g.setAttribute('aP',       new THREE.BufferAttribute(new Float32Array(progs), 1));

    const m = new THREE.ShaderMaterial({
      vertexShader: NEURAL_VERT, fragmentShader: NEURAL_FRAG,
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#00d4ff') } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });

    return { nodePos, lineGeo: g, lineMat: m };
  }, []);

  const nodeGeo = useMemo(() => new THREE.SphereGeometry(0.055, 8, 8), []);
  const nodeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#00d4ff', emissive: '#00d4ff', emissiveIntensity: 2.5,
    transparent: true,
  }), []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const p = progressRef.current ?? 0;
    const [s, e] = CHAPTERS[1].range;
    const vis = p >= s - 0.08 && p <= e + 0.08;
    const alpha = THREE.MathUtils.lerp(
      (groupRef.current.children[0] as any)?.material?.opacity ?? 0,
      vis ? 1 : 0, 0.04,
    );
    groupRef.current.traverse(o => {
      if ((o as THREE.Mesh).material) (o as THREE.Mesh).material.opacity = alpha;
    });
    lineMat.uniforms.uTime.value = clock.elapsedTime;
    groupRef.current.rotation.y = clock.elapsedTime * 0.045;
  });

  return (
    <group ref={groupRef}>
      <lineSegments geometry={lineGeo} material={lineMat} />
      {nodePos.map((pos, i) => (
        <mesh key={i} position={pos} geometry={nodeGeo} material={nodeMat} />
      ))}
      <pointLight color="#00d4ff" intensity={2.5} distance={14} decay={2} />
    </group>
  );
}

// ── Chapter 2: Crystal Fortress ───────────────────────────
function CrystalFortress({ progressRef }: { progressRef: React.RefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);

  const shieldMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: SHIELD_VERT, fragmentShader: SHIELD_FRAG,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#a855f7') } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  }), []);

  const crystalMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#6d28d9', emissive: '#a855f7', emissiveIntensity: 0.6,
    roughness: 0.05, metalness: 0.1, transmission: 0.55, thickness: 1.2,
    transparent: true, opacity: 0,
  }), []);

  const wireMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#c084fc', wireframe: true, transparent: true, opacity: 0,
  }), []);

  const ringMats = useMemo(() => [2.2, 2.8, 3.5].map(() => new THREE.MeshBasicMaterial({
    color: '#a855f7', transparent: true, opacity: 0,
  })), []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const p = progressRef.current ?? 0;
    const [s, e] = CHAPTERS[2].range;
    const vis = p >= s - 0.08 && p <= e + 0.08;
    const t = clock.elapsedTime;
    const alpha = THREE.MathUtils.lerp(crystalMat.opacity, vis ? 0.82 : 0, 0.04);
    crystalMat.opacity = alpha;
    wireMat.opacity = alpha * 0.35;
    ringMats.forEach((m, i) => { m.opacity = alpha * (0.45 - i * 0.08); });
    shieldMat.uniforms.uTime.value = t;
    shieldMat.opacity = alpha;
    groupRef.current.rotation.y = t * 0.11;
    groupRef.current.rotation.x = Math.sin(t * 0.07) * 0.14;
  });

  return (
    <group ref={groupRef}>
      <mesh material={crystalMat}><icosahedronGeometry args={[1.5, 1]} /></mesh>
      <mesh material={wireMat}><icosahedronGeometry args={[1.52, 1]} /></mesh>
      <mesh material={shieldMat}><sphereGeometry args={[3.2, 32, 32]} /></mesh>
      {[2.2, 2.8, 3.5].map((r, i) => (
        <mesh key={i} rotation={[Math.PI/2 + i*0.55, i*0.9, 0]} material={ringMats[i]}>
          <torusGeometry args={[r, 0.018, 8, 64]} />
        </mesh>
      ))}
      <pointLight color="#a855f7" intensity={3} distance={11} decay={2} />
    </group>
  );
}

// ── Chapter 3: Cloud Constellation ───────────────────────
function CloudConstellation({ progressRef }: { progressRef: React.RefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);
  const lineMat = useMemo(() => new THREE.LineBasicMaterial({
    color: '#38bdf8', transparent: true, opacity: 0,
  }), []);
  const nodeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#38bdf8', emissive: '#38bdf8', emissiveIntensity: 2,
    transparent: true, opacity: 0,
  }), []);

  const { nodes, edgeGeos } = useMemo(() => {
    const layers = [
      { count: 4, y: -2.2, r: 4.0 },
      { count: 6, y: 0,    r: 3.5 },
      { count: 4, y: 2.2,  r: 2.5 },
      { count: 2, y: 3.8,  r: 1.0 },
    ];
    const nodes: THREE.Vector3[] = [];
    for (const { count, y, r } of layers)
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        nodes.push(new THREE.Vector3(Math.cos(a)*r, y, Math.sin(a)*r));
      }

    const edgeGeos: THREE.BufferGeometry[] = [];
    let base = 0;
    for (let li = 0; li < layers.length - 1; li++) {
      const nA = layers[li].count, nB = layers[li+1].count;
      const bA = base, bB = base + nA;
      for (let a = 0; a < nA; a++)
        for (let b = 0; b < nB; b++)
          if (Math.random() > 0.35) {
            const g = new THREE.BufferGeometry().setFromPoints([nodes[bA+a], nodes[bB+b]]);
            edgeGeos.push(g);
          }
      base += nA;
    }
    return { nodes, edgeGeos };
  }, []);

  const nodeGeo = useMemo(() => new THREE.SphereGeometry(0.11, 10, 10), []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const p = progressRef.current ?? 0;
    const [s, e] = CHAPTERS[3].range;
    const vis = p >= s - 0.08 && p <= e + 0.08;
    const alpha = THREE.MathUtils.lerp(lineMat.opacity, vis ? 0.45 : 0, 0.04);
    lineMat.opacity = alpha;
    nodeMat.opacity = THREE.MathUtils.lerp(nodeMat.opacity, vis ? 0.9 : 0, 0.04);
    groupRef.current.rotation.y = clock.elapsedTime * 0.055;
  });

  return (
    <group ref={groupRef}>
      {edgeGeos.map((g, i) => <line key={i} geometry={g} material={lineMat} />)}
      {nodes.map((pos, i) => <mesh key={i} position={pos} geometry={nodeGeo} material={nodeMat} />)}
      <Sparkles count={50} scale={8} size={2} speed={0.3} color="#38bdf8" opacity={0.5} />
      <pointLight color="#38bdf8" intensity={2} distance={13} decay={2} />
    </group>
  );
}

// ── Chapter 4: Signal Matrix ──────────────────────────────
function SignalMatrix({ progressRef }: { progressRef: React.RefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);
  const G = 12;
  const COUNT = G * G;

  const { barMesh, mat } = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.14, 1, 0.14);
    const barIdx = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) barIdx[i] = i;
    geo.setAttribute('aI', new THREE.BufferAttribute(barIdx, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: DATA_VERT, fragmentShader: DATA_FRAG,
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#22c55e') } },
      transparent: true,
    });

    const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < COUNT; i++) {
      dummy.position.set((i%G - G/2)*0.6, 0, (Math.floor(i/G) - G/2)*0.6);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    return { barMesh: mesh, mat };
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const p = progressRef.current ?? 0;
    const [s, e] = CHAPTERS[4].range;
    const vis = p >= s - 0.08 && p <= e + 0.08;
    mat.uniforms.uTime.value = clock.elapsedTime;
    mat.opacity = THREE.MathUtils.lerp(mat.opacity ?? 1, vis ? 0.88 : 0, 0.04);
    for (let i = 0; i < COUNT; i++) {
      const col = i % G, row = Math.floor(i / G);
      const h = (Math.sin(clock.elapsedTime*1.8 + col*0.6 + row*0.8)*0.5+0.5)
              * (Math.cos(clock.elapsedTime*1.2 + col*0.4)*0.5+0.5)*2.8 + 0.12;
      dummy.position.set((col-G/2)*0.6, h*0.5-1, (row-G/2)*0.6);
      dummy.scale.set(1, h, 1);
      dummy.updateMatrix();
      barMesh.setMatrixAt(i, dummy.matrix);
    }
    barMesh.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.05) * 0.25;
  });

  return (
    <group ref={groupRef}>
      <primitive object={barMesh} />
      <Sparkles count={35} scale={7} size={3} speed={0.35} color="#22c55e" opacity={0.5} />
      <pointLight color="#22c55e" intensity={2.2} distance={14} decay={2} />
    </group>
  );
}

// ── Chapter 5: Singularity ────────────────────────────────
function SingularityCore({ progressRef }: { progressRef: React.RefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef  = useRef<THREE.Mesh>(null);
  const coreMat  = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ccff00', emissive: '#ccff00', emissiveIntensity: 0,
    transparent: true, opacity: 0,
  }), []);
  const ringMats = useMemo(() => [1.6,2.1,2.7,3.4].map(() => new THREE.MeshBasicMaterial({
    color: '#ccff00', transparent: true, opacity: 0,
  })), []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const p = progressRef.current ?? 0;
    const [s] = CHAPTERS[5].range;
    const vis = p >= s - 0.06;
    const t = clock.elapsedTime;
    const alpha = THREE.MathUtils.lerp(coreMat.opacity, vis ? 0.95 : 0, 0.04);
    coreMat.opacity = alpha;
    coreMat.emissiveIntensity = 7 * alpha;
    ringMats.forEach((m, i) => { m.opacity = alpha * (0.5 - i * 0.09); });
    if (coreRef.current) {
      const scale = 1 + Math.sin(t*2.2)*0.12;
      coreRef.current.scale.setScalar(THREE.MathUtils.lerp(coreRef.current.scale.x, scale, 0.1));
    }
    groupRef.current.rotation.z = t * 0.18;
    groupRef.current.rotation.x = Math.sin(t * 0.12) * 0.1;
  });

  return (
    <group ref={groupRef}>
      <mesh ref={coreRef} material={coreMat}><sphereGeometry args={[0.42, 32, 32]} /></mesh>
      {[1.6,2.1,2.7,3.4].map((r, i) => (
        <mesh key={i} rotation={[i*0.7, i*1.1, 0]} material={ringMats[i]}>
          <torusGeometry args={[r, 0.016, 8, 64]} />
        </mesh>
      ))}
      <Sparkles count={120} scale={7} size={4.5} speed={0.9} color="#ccff00" opacity={0.85} />
      <pointLight color="#ccff00" intensity={7} distance={18} decay={2} />
    </group>
  );
}

// ── Global bg ─────────────────────────────────────────────
function Background() {
  return (
    <>
      <Stars radius={90} depth={55} count={2500} factor={4} saturation={0} fade speed={0.4} />
      <ambientLight intensity={0.08} />
      <fog attach="fog" color="#000000" near={35} far={85} />
    </>
  );
}

// ── Master Scene ──────────────────────────────────────────
function Scene({ progressRef }: { progressRef: React.RefObject<number> }) {
  const { camera } = useThree();
  const camPos = useRef(new THREE.Vector3(0, 0, 9));
  const camLook = useRef(new THREE.Vector3(0, 0, 0));

  useFrame(() => {
    const p = progressRef.current ?? 0;
    const kf = camAtT(p);
    const tp = new THREE.Vector3(...kf.pos);
    const tl = new THREE.Vector3(...kf.look);
    camPos.current.lerp(tp, 0.038);
    camLook.current.lerp(tl, 0.038);
    camera.position.copy(camPos.current);
    camera.lookAt(camLook.current);
  });

  return (
    <>
      <Background />
      <ParticleGalaxy  progressRef={progressRef} />
      <NeuralCortex    progressRef={progressRef} />
      <CrystalFortress progressRef={progressRef} />
      <CloudConstellation progressRef={progressRef} />
      <SignalMatrix    progressRef={progressRef} />
      <SingularityCore progressRef={progressRef} />
    </>
  );
}

// ============================================================
// HTML OVERLAY
// ============================================================

function ChapterOverlay({ ch, visible }: { ch: ChapterDef; visible: boolean }) {
  return (
    <div className={`universe-chapter ${visible ? 'is-visible' : 'is-hidden'}`}>
      <div className="universe-content">
        <span className="universe-kicker" style={{ color: ch.accent }}>{ch.kicker}</span>
        <h2 className="universe-title">
          {ch.title.map((line, i) => <span key={i}>{line}<br /></span>)}
        </h2>
        <p className="universe-copy">{ch.copy}</p>
        {ch.metrics && (
          <div className="universe-metrics">
            {ch.metrics.map(m => <span key={m} className="universe-metric-chip">{m}</span>)}
          </div>
        )}
        <div className="universe-ctas">
          {ch.ctas.map((cta, i) => (
            <a key={i} href={cta.href} className={cta.primary ? 'universe-btn-primary' : 'universe-btn-secondary'}>
              {cta.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN EXPORT
// ============================================================

export default function OliveUniverse() {
  const wrapperRef    = useRef<HTMLDivElement>(null);
  const progressRef   = useRef(0);
  const [chapter, setChapter]   = useState(0);
  const [quality, setQuality]   = useState<QualityTier>('medium');
  const [mounted, setMounted]   = useState(false);

  // Detect quality & mark mounted
  useEffect(() => {
    setQuality(detectQuality());
    setMounted(true);
  }, []);

  // Scroll → progress ref (rAF, no state churn)
  useEffect(() => {
    if (!mounted) return;
    let id: number;
    let lastCh = -1;
    function tick() {
      if (wrapperRef.current) {
        const rect  = wrapperRef.current.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        if (total > 0) progressRef.current = Math.max(0, Math.min(1, -rect.top / total));
      }
      // Derive chapter only on change (avoids constant re-renders)
      const p = progressRef.current;
      let ch = 0;
      for (let i = CHAPTERS.length - 1; i >= 0; i--)
        if (p >= CHAPTERS[i].range[0] - 0.04) { ch = i; break; }
      if (ch !== lastCh) { setChapter(ch); lastCh = ch; }
      id = requestAnimationFrame(tick);
    }
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [mounted]);

  const dpr = quality === 'low' ? 1 : Math.min(window?.devicePixelRatio ?? 1, quality === 'high' ? 2 : 1.5);

  if (!mounted) {
    return (
      <div className="universe-wrapper">
        <div className="universe-loading">
          <div className="universe-loading-inner">
            <div className="universe-loading-bar" />
            <p className="universe-loading-text">Initializing universe</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="universe-wrapper">
      <div className="universe-sticky">

        {/* ── 3D Canvas ─────────────────────────────────── */}
        <Canvas
          camera={{ position: [0, 0, 9], fov: 60, near: 0.1, far: 200 }}
          dpr={dpr}
          gl={{
            antialias: quality !== 'low',
            alpha: false,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.25,
          }}
          style={{ position: 'absolute', inset: 0, background: '#000' }}
        >
          <Scene progressRef={progressRef} />
          <EffectComposer>
            <Bloom
              luminanceThreshold={0.18}
              luminanceSmoothing={0.65}
              intensity={1.6}
              mipmapBlur
            />
            <ChromaticAberration
              blendFunction={BlendFunction.NORMAL}
              offset={new THREE.Vector2(0.0007, 0.0007)}
              radialModulation={false}
              modulationOffset={0}
            />
            <Vignette offset={0.32} darkness={0.62} />
            <Noise premultiply blendFunction={BlendFunction.ADD} opacity={0.035} />
          </EffectComposer>
        </Canvas>

        {/* ── HTML Chapter Overlay ───────────────────────── */}
        <div className="universe-overlay">
          {CHAPTERS.map((ch, i) => (
            <ChapterOverlay key={ch.id} ch={ch} visible={chapter === i} />
          ))}
        </div>

        {/* ── Chapter Progress Dots ─────────────────────── */}
        <div className="universe-progress" aria-hidden="true">
          {CHAPTERS.map((ch, i) => (
            <div key={ch.id} className={`universe-dot ${chapter === i ? 'is-active' : ''}`} />
          ))}
        </div>

        {/* ── Scroll Hint ───────────────────────────────── */}
        {chapter === 0 && (
          <div className="universe-scroll-hint" aria-hidden="true">
            <span>Scroll to explore</span>
            <div className="universe-scroll-arrow" />
          </div>
        )}
      </div>
    </div>
  );
}
