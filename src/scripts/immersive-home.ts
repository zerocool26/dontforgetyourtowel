import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

type OnBeforeCompileShader = Parameters<
  NonNullable<THREE.Material['onBeforeCompile']>
>[0];

type SceneId =
  | 'origin'
  | 'interference'
  | 'field'
  | 'lensing'
  | 'collapse'
  | 'afterglow';

type SceneConfig = {
  hue: number;
  hue2: number;
  exposure: number;
  fog: number;
  camZ: number;

  membraneAmp: number;
  membraneFreq: number;
  membraneMetalness: number;
  membraneRoughness: number;

  lineCount: number;
  lineRadius: number;

  particles: number;
  particleRadius: number;

  bloom: number;
};

type Motif = {
  // 0..1 values blended across chapters.
  swirl: number; // rotational flow
  sink: number; // pulls toward center ("collapse")
  interference: number; // dual-wave interference
  detail: number; // fine deformation detail
  lineCurl: number; // bends field lines into arcs
  orbit: number; // particle orbital flow
};

const SCENES: SceneId[] = [
  'origin',
  'interference',
  'field',
  'lensing',
  'collapse',
  'afterglow',
];

const SCENE_CONFIG: Record<SceneId, SceneConfig> = {
  origin: {
    hue: 208,
    hue2: 250,
    exposure: 0.9,
    fog: 0.05,
    camZ: 7.6,
    membraneAmp: 0.18,
    membraneFreq: 1.55,
    membraneMetalness: 0.25,
    membraneRoughness: 0.34,
    lineCount: 12,
    lineRadius: 1.9,
    particles: 220,
    particleRadius: 4.6,
    bloom: 0.12,
  },
  interference: {
    hue: 235,
    hue2: 285,
    exposure: 0.98,
    fog: 0.055,
    camZ: 7.3,
    membraneAmp: 0.26,
    membraneFreq: 1.85,
    membraneMetalness: 0.35,
    membraneRoughness: 0.28,
    lineCount: 18,
    lineRadius: 2.2,
    particles: 280,
    particleRadius: 5.2,
    bloom: 0.16,
  },
  field: {
    hue: 260,
    hue2: 312,
    exposure: 1.02,
    fog: 0.06,
    camZ: 7.2,
    membraneAmp: 0.22,
    membraneFreq: 1.25,
    membraneMetalness: 0.2,
    membraneRoughness: 0.38,
    lineCount: 26,
    lineRadius: 2.45,
    particles: 320,
    particleRadius: 5.6,
    bloom: 0.15,
  },
  lensing: {
    hue: 290,
    hue2: 332,
    exposure: 1.05,
    fog: 0.062,
    camZ: 7.0,
    membraneAmp: 0.3,
    membraneFreq: 2.05,
    membraneMetalness: 0.42,
    membraneRoughness: 0.22,
    lineCount: 22,
    lineRadius: 2.3,
    particles: 300,
    particleRadius: 5.2,
    bloom: 0.22,
  },
  collapse: {
    hue: 318,
    hue2: 355,
    exposure: 0.88,
    fog: 0.072,
    camZ: 6.8,
    membraneAmp: 0.14,
    membraneFreq: 1.0,
    membraneMetalness: 0.16,
    membraneRoughness: 0.5,
    lineCount: 10,
    lineRadius: 1.6,
    particles: 180,
    particleRadius: 4.0,
    bloom: 0.08,
  },
  afterglow: {
    hue: 32,
    hue2: 58,
    exposure: 1.04,
    fog: 0.055,
    camZ: 7.7,
    membraneAmp: 0.2,
    membraneFreq: 1.35,
    membraneMetalness: 0.18,
    membraneRoughness: 0.44,
    lineCount: 14,
    lineRadius: 2.05,
    particles: 240,
    particleRadius: 4.8,
    bloom: 0.14,
  },
};

const SCENE_MOTIF: Record<SceneId, Motif> = {
  origin: {
    swirl: 0.08,
    sink: 0.0,
    interference: 0.22,
    detail: 0.25,
    lineCurl: 0.22,
    orbit: 0.28,
  },
  interference: {
    swirl: 0.18,
    sink: 0.05,
    interference: 1.0,
    detail: 0.55,
    lineCurl: 0.45,
    orbit: 0.38,
  },
  field: {
    swirl: 0.14,
    sink: 0.08,
    interference: 0.55,
    detail: 0.72,
    lineCurl: 0.8,
    orbit: 0.55,
  },
  lensing: {
    swirl: 0.82,
    sink: 0.18,
    interference: 0.42,
    detail: 0.86,
    lineCurl: 0.9,
    orbit: 0.95,
  },
  collapse: {
    swirl: 0.3,
    sink: 1.0,
    interference: 0.18,
    detail: 0.55,
    lineCurl: 0.55,
    orbit: 0.35,
  },
  afterglow: {
    swirl: 0.12,
    sink: 0.05,
    interference: 0.15,
    detail: 0.35,
    lineCurl: 0.35,
    orbit: 0.25,
  },
};

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

const smoothstep = (t: number) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};

const blendConfig = (
  a: SceneConfig,
  b: SceneConfig,
  t: number
): SceneConfig => ({
  hue: lerp(a.hue, b.hue, t),
  hue2: lerp(a.hue2, b.hue2, t),
  exposure: lerp(a.exposure, b.exposure, t),
  fog: lerp(a.fog, b.fog, t),
  camZ: lerp(a.camZ, b.camZ, t),
  membraneAmp: lerp(a.membraneAmp, b.membraneAmp, t),
  membraneFreq: lerp(a.membraneFreq, b.membraneFreq, t),
  membraneMetalness: lerp(a.membraneMetalness, b.membraneMetalness, t),
  membraneRoughness: lerp(a.membraneRoughness, b.membraneRoughness, t),
  lineCount: Math.round(lerp(a.lineCount, b.lineCount, t)),
  lineRadius: lerp(a.lineRadius, b.lineRadius, t),
  particles: Math.round(lerp(a.particles, b.particles, t)),
  particleRadius: lerp(a.particleRadius, b.particleRadius, t),
  bloom: lerp(a.bloom, b.bloom, t),
});

const blendMotif = (a: Motif, b: Motif, t: number): Motif => ({
  swirl: lerp(a.swirl, b.swirl, t),
  sink: lerp(a.sink, b.sink, t),
  interference: lerp(a.interference, b.interference, t),
  detail: lerp(a.detail, b.detail, t),
  lineCurl: lerp(a.lineCurl, b.lineCurl, t),
  orbit: lerp(a.orbit, b.orbit, t),
});

const withBaseUrl = (path: string): string => {
  const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env
    ?.BASE_URL;
  const normalizedBase = base ? String(base) : '/';
  const prefix = normalizedBase.endsWith('/')
    ? normalizedBase
    : `${normalizedBase}/`;
  const clean = String(path).replace(/^\/+/, '');
  return `${prefix}${clean}`;
};

type LineNode = {
  phase: number;
  speed: number;
  twist: number;
  lift: number;
};

class ImmersiveThreeController {
  private root: HTMLElement;
  private chapters: HTMLElement[];
  private canvas: HTMLCanvasElement;

  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private fxaaPass: ShaderPass | null = null;
  private environment: THREE.Texture | null = null;

  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(45, 1, 0.1, 80);
  private group = new THREE.Group();

  private hemi: THREE.HemisphereLight;
  private key: THREE.DirectionalLight;
  private fill: THREE.PointLight;

  private reducedMotion = false;
  private visible = true;
  private io: IntersectionObserver | null = null;

  private quality = 1;
  private mobileScale = 1;
  private perfLP = 16.7;
  private lastFrameTime = performance.now() / 1000;

  private pointer = new THREE.Vector2();
  private pointerTarget = new THREE.Vector2();
  private lastPointer = new THREE.Vector2();
  private pointerVelocity = new THREE.Vector2();
  private cameraRoll = 0;

  private lastScrollY = window.scrollY;
  private lastScrollTime = performance.now();

  private energy = 0;
  private burst = 0;
  private accent = 0;
  private pinchTarget = 0;
  private pinch = 0;
  private lastChapterIdx = -1;

  private stars: THREE.Points;
  private holoCore: THREE.Mesh;
  private holoMaterial: THREE.ShaderMaterial;
  private cameraRot3 = new THREE.Matrix3();

  private fieldLines: THREE.Line[] = [];
  private lineNodes: LineNode[] = [];
  private linePoints = 44;
  private maxLines = 34;

  private particles: THREE.Points;
  private particleBase: Float32Array;

  private probe: THREE.Mesh;
  private lens: THREE.Mesh;

  private raf = 0;
  private abortController = new AbortController();

  constructor(root: HTMLElement) {
    this.root = root;
    this.chapters = Array.from(
      root.querySelectorAll<HTMLElement>('[data-ih-chapter]')
    );
    const canvas = root.querySelector<HTMLCanvasElement>('[data-ih-canvas]');
    if (!canvas) throw new Error('Immersive canvas missing');
    this.canvas = canvas;

    this.reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.setClearColor(new THREE.Color(0x05070f));

    this.scene.background = new THREE.Color(0x05070f);
    this.scene.fog = new THREE.FogExp2(0x070b18, 0.055);

    this.scene.add(this.group);

    this.stars = this.createStars();
    this.group.add(this.stars);

    const { mesh: holoCore, material: holoMaterial } = this.createHoloCore();
    this.holoCore = holoCore;
    this.holoMaterial = holoMaterial;
    this.scene.add(this.holoCore);

    this.createFieldLines();

    const { points, base } = this.createParticles();
    this.particles = points;
    this.particleBase = base;
    this.group.add(this.particles);

    this.probe = this.createProbe();
    this.lens = this.createLens();
    this.group.add(this.probe, this.lens);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x070a12, 0.55);
    this.key = new THREE.DirectionalLight(0xffffff, 1.25);
    this.key.position.set(4.5, 6, 4);
    this.fill = new THREE.PointLight(0xffffff, 0.9, 40, 2);
    this.fill.position.set(-6, -2, 7);
    this.scene.add(this.hemi, this.key, this.fill);

    void this.loadEnvironment();

    this.init();
  }

  private createHoloCore(): {
    mesh: THREE.Mesh;
    material: THREE.ShaderMaterial;
  } {
    // Fullscreen quad (clip-space). The fragment shader raymarches a high-detail
    // "holo-processor" core and fades out toward the edges.
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array([
      -1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0,
    ]);
    const uvs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uEnergy: { value: 0 },
        uAccent: { value: 0 },
        uTech: { value: 0 },
        uQuality: { value: 1 },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uFov: { value: THREE.MathUtils.degToRad(45) },
        uAspect: { value: 1 },
        uCamPos: { value: new THREE.Vector3() },
        uCamRot: { value: new THREE.Matrix3() },
        uPointer: { value: new THREE.Vector2() },

        // Motif identity (chapter-based).
        uSwirl: { value: 0 },
        uSink: { value: 0 },
        uInterf: { value: 0 },
        uDetail: { value: 0 },
      },
      vertexShader: `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      fragmentShader: `
precision highp float;
varying vec2 vUv;

uniform float uTime;
uniform float uProgress;
uniform float uEnergy;
uniform float uAccent;
uniform float uTech;
uniform float uQuality;
uniform vec2 uResolution;
uniform float uFov;
uniform float uAspect;
uniform vec3 uCamPos;
uniform mat3 uCamRot;
uniform vec2 uPointer;

uniform float uSwirl;
uniform float uSink;
uniform float uInterf;
uniform float uDetail;

#define PI 3.141592653589793

float saturate(float x){ return clamp(x, 0.0, 1.0); }

// Hash / noise
float ih_hash(vec2 p){
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

float ih_noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = ih_hash(i);
  float b = ih_hash(i + vec2(1.0, 0.0));
  float c = ih_hash(i + vec2(0.0, 1.0));
  float d = ih_hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float ih_fbm(vec2 p){
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * ih_noise(p);
    p = p * 2.02 + vec2(13.1, 7.7);
    a *= 0.5;
  }
  return v;
}

mat2 rot(float a){
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

// Signed distance primitives
float sdSphere(vec3 p, float r){ return length(p) - r; }
float sdBox(vec3 p, vec3 b){
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}
float sdTorus(vec3 p, vec2 t){
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

float smin(float a, float b, float k){
  float h = saturate(0.5 + 0.5 * (b - a) / k);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// Polar repetition helper
vec2 pModPolar(vec2 p, float repetitions){
  float angle = 2.0 * PI / repetitions;
  float a = atan(p.y, p.x) + angle * 0.5;
  float r = length(p);
  float c = floor(a / angle);
  a = mod(a, angle) - angle * 0.5;
  p = vec2(cos(a), sin(a)) * r;
  return p;
}

// Scene SDF. Returns distance; secondary outputs for material IDs / emissive masks.
float mapCore(in vec3 p, out float mEmissive){
  // Chapter-driven morphology
  float boot = smoothstep(0.02, 0.18, uProgress) * (0.7 + uEnergy * 0.6);
  float collapse = uSink * (0.25 + uEnergy * 0.35);
  float swirl = uSwirl * (0.55 + uEnergy * 0.4);
  float detail = uDetail;

  // Subtle pointer parallax (kept small; UI remains legible)
  p.xy += uPointer * 0.06;

  // Swirl domain warp
  float r = length(p.xy);
  float ang = swirl * (r * r) + uTime * (0.12 + swirl * 0.08) + uProgress * 0.8;
  p.xy = rot(ang) * p.xy;
  p.z -= collapse * exp(-r * 1.6) * 0.22;

  // Central core + outer housing
  float core = sdSphere(p, 0.62);
  float shell = abs(sdSphere(p, 0.9)) - 0.08;
  float d = smin(core, shell, 0.25);

  // Orbiting ring system (scroll separates rings; collapse squeezes)
  vec3 pr = p;
  float ringSep = (0.12 + boot * 0.26) * (1.0 - collapse * 0.65);
  pr.y += sin(uTime * 0.7 + uProgress * 4.0) * 0.05;
  float ringA = sdTorus(pr + vec3(0.0, ringSep, 0.0), vec2(0.9, 0.035));
  float ringB = sdTorus(pr - vec3(0.0, ringSep, 0.0), vec2(0.78, 0.03));
  d = smin(d, ringA, 0.22);
  d = smin(d, ringB, 0.22);

  // Radial fins / vents (cheap high-detail)
  vec3 pf = p;
  pf.xz = vec2(pf.x, pf.z);
  vec2 q = pModPolar(pf.xz, 12.0);
  pf.x = q.x;
  pf.z = q.y;
  float fin = sdBox(pf - vec3(0.78, 0.0, 0.0), vec3(0.16, 0.06, 0.02));
  d = smin(d, fin, 0.15);

  // Interference "channel" cut
  float interf = uInterf;
  float wave = sin((p.x + p.y) * 5.2 + uTime * 1.3 + uProgress * 5.0) * 0.06 * interf;
  float channel = sdTorus(p + vec3(0.0, wave, 0.0), vec2(0.58, 0.05));
  d = min(d, channel);

  // Micro detail (adds machined feel without geometry)
  float n = ih_fbm(p.xz * (2.4 + detail * 3.0) + vec2(uTime * 0.12, -uTime * 0.08));
  d += (n - 0.5) * (0.03 + detail * 0.05);

  // Emissive mask: edges + rings + fins.
  float edge = smoothstep(0.06, 0.0, abs(core));
  float rings = smoothstep(0.05, 0.0, abs(min(ringA, ringB)));
  float fins = smoothstep(0.05, 0.0, abs(fin));
  mEmissive = saturate(edge * 0.65 + rings * 0.85 + fins * 0.55);

  return d;
}

vec3 calcNormal(vec3 p){
  float e = 0.0015;
  float tmp;
  float dx = mapCore(p + vec3(e, 0.0, 0.0), tmp) - mapCore(p - vec3(e, 0.0, 0.0), tmp);
  float dy = mapCore(p + vec3(0.0, e, 0.0), tmp) - mapCore(p - vec3(0.0, e, 0.0), tmp);
  float dz = mapCore(p + vec3(0.0, 0.0, e), tmp) - mapCore(p - vec3(0.0, 0.0, e), tmp);
  return normalize(vec3(dx, dy, dz));
}

float grid(vec2 uv, float scale, float width){
  vec2 p = uv * scale;
  vec2 a = abs(fract(p - 0.5) - 0.5);
  vec2 w = fwidth(p);
  float lx = 1.0 - smoothstep(width * w.x, (width + 1.2) * w.x, a.x);
  float ly = 1.0 - smoothstep(width * w.y, (width + 1.2) * w.y, a.y);
  return max(lx, ly);
}

void main(){
  // Centered UV
  vec2 uv = vUv;
  vec2 p = (uv * 2.0 - 1.0);
  p.x *= uAspect;

  // Soft mask so the core lives "in the middle" (not full-screen noise)
  float vign = smoothstep(1.15, 0.25, length(p));

  // Camera ray (approx from fov/aspect) then rotate into world.
  float z = -1.0;
  float k = tan(uFov * 0.5);
  vec3 rdCam = normalize(vec3(p.x * k, p.y * k, z));
  vec3 rd = normalize(uCamRot * rdCam);
  vec3 ro = uCamPos;

  // March toward origin-ish; keep range tight for perf.
  float t = 0.0;
  float maxT = 14.0;
  float hit = 0.0;
  float mEm = 0.0;
  vec3 pos = ro;

  // Quality-based epsilon.
  float eps = mix(0.0028, 0.0012, saturate(uQuality));

  // Accumulated glow along the ray (gives "holo" depth)
  float glow = 0.0;

  for(int i=0;i<84;i++){
    pos = ro + rd * t;
    float em;
    float d = mapCore(pos, em);
    glow += exp(-d * 12.0) * 0.008 * (0.7 + uTech * 0.6);
    if (d < eps){ hit = 1.0; mEm = em; break; }
    t += d * (0.85 + (1.0 - uQuality) * 0.35);
    if (t > maxT) break;
  }

  vec3 col = vec3(0.01, 0.015, 0.03);

  if(hit > 0.5){
    vec3 n = calcNormal(pos);

    // Lighting (simple and crisp)
    vec3 l = normalize(vec3(0.45, 0.75, 0.55));
    float ndl = saturate(dot(n, l));
    float fres = pow(1.0 - saturate(dot(n, -rd)), 3.0);

    // Tech palette
    vec3 base = mix(vec3(0.03, 0.04, 0.07), vec3(0.03, 0.06, 0.08), uTech);
    vec3 glowC = mix(vec3(0.10, 0.85, 1.00), vec3(0.85, 0.20, 1.00), uInterf * 0.35);

    // Circuit/traces on the surface (procedural)
    vec2 suv = pos.xz * 0.85 + pos.y * 0.15;
    float g1 = grid(suv + vec2(uTime * 0.02, -uTime * 0.015), 10.0, 0.85);
    float g2 = grid(suv + vec2(-uTime * 0.015, uTime * 0.02), 24.0, 0.8) * 0.7;
    float traces = saturate(g1 * 0.7 + g2 * 0.5);

    // Data packets (moving bright segments)
    float lane = sin(suv.x * 7.0 + suv.y * 5.0) * 0.5 + 0.5;
    float packet = abs(fract((uTime * (0.45 + uTech * 0.55) + uProgress * 2.1) + suv.x * 0.35 + suv.y * 0.22) - 0.5);
    packet = 1.0 - smoothstep(0.46, 0.5, packet);
    packet *= smoothstep(0.25, 0.85, lane);

    // Emissive intensity (accent boosts on chapter transitions)
    float emI = (0.25 + uTech * 0.75) * (0.65 + uEnergy * 0.8);
    emI += uAccent * 0.8;

    vec3 emissive = glowC * (mEm * 0.9 + traces * 0.55 + packet * 0.9) * emI;

    col = base;
    col += ndl * vec3(0.08, 0.10, 0.14);
    col += fres * glowC * (0.18 + uTech * 0.22);
    col += emissive;

    // Subtle scanline shimmer (very restrained)
    float scan = abs(fract(uv.y * 7.0 + uTime * 0.35 + uProgress * 0.8) - 0.5);
    scan = 1.0 - smoothstep(0.47, 0.5, scan);
    col += glowC * scan * (0.02 + uTech * 0.03);
  }

  // Volume glow always contributes (even if we didn't "hit")
  col += vec3(0.08, 0.75, 1.0) * glow * (0.55 + uAccent * 0.25);

  // Gamma-ish shaping
  col = pow(max(col, 0.0), vec3(0.98));

  float alpha = vign * (0.25 + hit * 0.75);
  // Keep it polite on mobile / low quality.
  alpha *= mix(0.85, 1.0, uQuality);

  gl_FragColor = vec4(col, alpha);
}
`,
    });

    const mesh = new THREE.Mesh(geo, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = -10;
    return { mesh, material };
  }

  private createStars(): THREE.Points {
    const width = Math.max(1, window.innerWidth);
    const isMobile = width < 768;
    const count = isMobile ? 380 : 620;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const r = 18 + Math.random() * 34;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[idx] = r * Math.sin(phi) * Math.cos(theta);
      positions[idx + 1] = r * Math.cos(phi);
      positions[idx + 2] = r * Math.sin(phi) * Math.sin(theta);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: isMobile ? 0.035 : 0.04,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return new THREE.Points(geo, mat);
  }

  private createFieldLines(): void {
    const baseMat = new THREE.LineBasicMaterial({
      color: new THREE.Color().setHSL(0.6, 0.85, 0.65),
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    for (let i = 0; i < this.maxLines; i++) {
      const positions = new Float32Array(this.linePoints * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = baseMat.clone();
      const line = new THREE.Line(geo, mat);
      line.frustumCulled = false;

      this.fieldLines.push(line);
      this.lineNodes.push({
        phase: Math.random() * Math.PI * 2,
        speed: 0.14 + Math.random() * 0.28,
        twist: 0.7 + Math.random() * 1.2,
        lift: (Math.random() - 0.5) * 0.45,
      });

      this.group.add(line);
    }
  }

  private createParticles(): { points: THREE.Points; base: Float32Array } {
    const count = 360;
    const positions = new Float32Array(count * 3);
    const base = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const r = 2.2 + Math.random() * 3.4;
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 2.6;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;
      base[idx] = x;
      base[idx + 1] = y;
      base[idx + 2] = z;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: new THREE.Color().setHSL(0.62, 0.85, 0.66),
      size: 0.03,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return { points: new THREE.Points(geo, mat), base };
  }

  private createProbe(): THREE.Mesh {
    const geo = new THREE.SphereGeometry(0.08, 18, 18);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.62, 0.8, 0.62),
      emissive: new THREE.Color().setHSL(0.62, 0.9, 0.34),
      emissiveIntensity: 1.1,
      roughness: 0.25,
      metalness: 0.15,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0.9, 0.25, 0.8);
    return mesh;
  }

  private createLens(): THREE.Mesh {
    const geo = new THREE.TorusGeometry(0.62, 0.038, 14, 96);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.62, 0.9, 0.65),
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2.2;
    return mesh;
  }

  private init(): void {
    const { signal } = this.abortController;

    window.addEventListener(
      'pointermove',
      e => {
        const nx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
        const ny = (e.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
        this.pointerTarget.set(clamp(nx, -1, 1), clamp(ny, -1, 1));
      },
      { passive: true, signal }
    );

    window.addEventListener(
      'pointerdown',
      () => {
        this.burst = Math.min(1, this.burst + 0.8);
        this.pinchTarget = 1;
      },
      { passive: true, signal }
    );

    window.addEventListener(
      'pointerup',
      () => {
        this.pinchTarget = 0;
      },
      { passive: true, signal }
    );

    window.addEventListener(
      'pointerleave',
      () => {
        this.pinchTarget = 0;
      },
      { passive: true, signal }
    );

    const onResize = () => this.resize();
    window.addEventListener('resize', onResize, { passive: true, signal });

    if ('IntersectionObserver' in window) {
      this.io = new IntersectionObserver(
        entries => {
          const entry = entries[0];
          this.visible = Boolean(entry?.isIntersecting);
        },
        { root: null, threshold: 0.02 }
      );
      this.io.observe(this.root);
    }

    this.resize();
    this.loop();
  }

  private resize(): void {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.mobileScale = width < 640 ? 0.72 : width < 1024 ? 0.86 : 1;

    const baseDpr = clamp(window.devicePixelRatio || 1, 1, 2);
    const ratio = clamp(baseDpr * this.quality * this.mobileScale, 0.75, 2);

    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);

    if (this.holoMaterial) {
      (this.holoMaterial.uniforms.uResolution.value as THREE.Vector2).set(
        width * ratio,
        height * ratio
      );
    }

    this.setupComposer(width, height, ratio);
  }

  private setupComposer(width: number, height: number, ratio: number): void {
    if (!this.composer) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));

      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.12,
        0.55,
        0.85
      );
      this.composer.addPass(this.bloomPass);

      this.fxaaPass = new ShaderPass(FXAAShader);
      this.composer.addPass(this.fxaaPass);
    }

    this.composer.setSize(width, height);
    this.composer.setPixelRatio(ratio);

    if (this.fxaaPass) {
      this.fxaaPass.uniforms['resolution'].value.set(
        1 / (width * ratio),
        1 / (height * ratio)
      );
    }
  }

  private async loadEnvironment(): Promise<void> {
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();

    const applyEnvironment = (texture: THREE.Texture) => {
      if (this.environment) this.environment.dispose();
      this.environment = texture;
      this.scene.environment = texture;
    };

    try {
      const rgbeLoader = new RGBELoader();
      const hdrTexture = await rgbeLoader.loadAsync(
        withBaseUrl('hdr/studio_small.hdr')
      );
      const envMap = pmremGenerator.fromEquirectangular(hdrTexture).texture;
      applyEnvironment(envMap);
      hdrTexture.dispose();
      pmremGenerator.dispose();
    } catch {
      const room = new RoomEnvironment();
      const envMap = pmremGenerator.fromScene(room, 0.04).texture;
      applyEnvironment(envMap);
      pmremGenerator.dispose();
    }
  }

  private computeScroll(): { progress: number; velocity: number } {
    const rect = this.root.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const progress = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;

    const now = performance.now();
    const delta = Math.abs(window.scrollY - this.lastScrollY);
    const dt = Math.max(16, now - this.lastScrollTime);
    const v = clamp(delta / dt, 0, 1.5);

    this.lastScrollY = window.scrollY;
    this.lastScrollTime = now;

    return { progress, velocity: clamp(v, 0, 1) };
  }

  private chapterFromProgress(progress: number): {
    scene: SceneId;
    idx: number;
    localT: number;
  } {
    const n = Math.max(1, this.chapters.length);
    const x = progress * n;
    const idx = clamp(Math.floor(x), 0, n - 1);
    const localT = x - idx;

    const sceneRaw = (this.chapters[idx]?.dataset.scene ?? 'origin') as SceneId;
    const scene = SCENES.includes(sceneRaw) ? sceneRaw : 'origin';

    return { scene, idx, localT };
  }

  private getModeBias(): number {
    const mode = this.root.dataset.mode ?? 'calm';
    switch (mode) {
      case 'boost':
        return 0.85;
      case 'prism':
        return 0.55;
      case 'pulse':
        return 1.0;
      case 'calm':
      default:
        return 0.25;
    }
  }

  private update(dt: number, time: number): void {
    const { progress, velocity } = this.computeScroll();
    const { scene, idx, localT } = this.chapterFromProgress(progress);

    const nextIdx = Math.min(idx + 1, this.chapters.length - 1);
    const nextSceneRaw = (this.chapters[nextIdx]?.dataset.scene ?? scene) as
      | SceneId
      | string;
    const nextScene: SceneId = SCENES.includes(nextSceneRaw as SceneId)
      ? (nextSceneRaw as SceneId)
      : scene;

    const blendT = smoothstep(localT);
    const config = blendConfig(
      SCENE_CONFIG[scene] ?? SCENE_CONFIG.origin,
      SCENE_CONFIG[nextScene] ?? SCENE_CONFIG.origin,
      blendT
    );

    const motif = blendMotif(
      SCENE_MOTIF[scene] ?? SCENE_MOTIF.origin,
      SCENE_MOTIF[nextScene] ?? SCENE_MOTIF.origin,
      blendT
    );

    // Adaptive quality: keep it smooth on mobile.
    const frameDtMs = clamp((time - this.lastFrameTime) * 1000, 8, 50);
    this.lastFrameTime = time;
    this.perfLP = lerp(this.perfLP, frameDtMs, 0.06);

    const baseQuality = this.perfLP < 18 ? 1 : this.perfLP < 24 ? 0.86 : 0.7;
    const targetQuality = clamp(baseQuality * this.mobileScale, 0.65, 1);
    this.quality = damp(this.quality, targetQuality, 2, dt);

    this.burst = clamp(this.burst * 0.92 + velocity * 0.26, 0, 1);
    // Accent pulse: a short, controlled "wow" beat (used on chapter transitions).
    // Kept self-limiting and mobile-aware.
    this.accent = damp(this.accent, 0, 1.8, dt);
    this.pinch = damp(this.pinch, this.pinchTarget, 7, dt);

    // A unified "energy" knob that influences everything (subtly).
    const modeBias = this.getModeBias();
    const energyTarget =
      clamp(velocity * 0.85 + this.burst * 0.65, 0, 1) *
      (0.7 + modeBias * 0.55);
    this.energy = damp(this.energy, energyTarget, 4.5, dt);

    if (idx !== this.lastChapterIdx) {
      this.lastChapterIdx = idx;
      this.burst = Math.min(1, this.burst + 0.38);
      this.accent = Math.min(1, this.accent + 0.95);
    }

    // "Holy crap" on desktop, polite on mobile.
    // mobileLimiter: 0 (small devices) .. 1 (desktop / fast devices).
    const mobileLimiter = clamp((this.mobileScale - 0.68) / 0.32, 0, 1);
    const wowFactor = lerp(0.82, 1.38, mobileLimiter);
    const accentFactor = this.accent * (0.55 + mobileLimiter * 0.45);

    // High-tech factor: increases crisp, digital accents (grid/scan + neon bias)
    // while staying mobile-friendly.
    const techBase = clamp(0.25 + motif.interference * 0.85, 0, 1.4);
    const techFactor = clamp(techBase * (0.75 + wowFactor * 0.25), 0, 1.25);
    const techMix = clamp(techFactor, 0, 1) * (0.25 + mobileLimiter * 0.75);

    // Pointer smoothing.
    this.pointer.x = damp(this.pointer.x, this.pointerTarget.x, 6, dt);
    this.pointer.y = damp(this.pointer.y, this.pointerTarget.y, 6, dt);

    this.pointerVelocity.set(
      (this.pointer.x - this.lastPointer.x) / Math.max(0.001, dt),
      (this.pointer.y - this.lastPointer.y) / Math.max(0.001, dt)
    );
    this.lastPointer.copy(this.pointer);

    // Stars drift.
    this.stars.rotation.y = time * 0.03;
    this.stars.rotation.x = time * 0.015;

    // Holo core shader uniforms.
    if (this.holoMaterial) {
      this.holoMaterial.uniforms.uTime.value = time;
      this.holoMaterial.uniforms.uProgress.value = progress;
      this.holoMaterial.uniforms.uEnergy.value = this.energy;
      this.holoMaterial.uniforms.uAccent.value = accentFactor;
      this.holoMaterial.uniforms.uTech.value = techFactor * mobileLimiter;
      this.holoMaterial.uniforms.uQuality.value = clamp(
        this.quality * this.mobileScale,
        0.65,
        1
      );
      this.holoMaterial.uniforms.uAspect.value = this.camera.aspect;
      this.holoMaterial.uniforms.uFov.value = THREE.MathUtils.degToRad(
        this.camera.fov
      );
      this.holoMaterial.uniforms.uCamPos.value.copy(this.camera.position);
      this.cameraRot3.setFromMatrix4(this.camera.matrixWorld);
      this.holoMaterial.uniforms.uCamRot.value.copy(this.cameraRot3);
      this.holoMaterial.uniforms.uPointer.value.copy(this.pointer);

      this.holoMaterial.uniforms.uSwirl.value = motif.swirl * wowFactor;
      this.holoMaterial.uniforms.uSink.value =
        motif.sink * (0.9 + wowFactor * 0.1);
      this.holoMaterial.uniforms.uInterf.value = motif.interference * wowFactor;
      this.holoMaterial.uniforms.uDetail.value = motif.detail * wowFactor;
    }

    // Field lines.
    const activeLines = clamp(
      Math.floor(
        config.lineCount * (0.7 + this.quality * 0.3) * this.mobileScale
      ),
      6,
      this.maxLines
    );

    const baseLineHue = config.hue2 / 360;
    const techHue = 0.55; // ~198deg (cyan)
    const lineHue = lerp(baseLineHue, techHue, techMix);
    for (let i = 0; i < this.fieldLines.length; i++) {
      const line = this.fieldLines[i];
      const node = this.lineNodes[i];

      const active = i < activeLines;
      line.visible = active;
      if (!active) continue;

      const positions = line.geometry.attributes.position.array as Float32Array;

      const baseRadius =
        config.lineRadius * (0.75 + (i / Math.max(1, activeLines - 1)) * 0.55);
      const curl =
        motif.lineCurl *
        wowFactor *
        (0.55 + this.energy * 0.55) *
        (1 + accentFactor * 0.25);
      const spin =
        time * (node.speed * (0.85 + curl * 0.55)) +
        node.phase +
        progress * node.twist * (1.6 + curl * 1.25);

      for (let p = 0; p < this.linePoints; p++) {
        const t = p / (this.linePoints - 1);
        const u = t * 2 - 1;
        const idx3 = p * 3;

        const wobble =
          Math.sin(u * (2.2 + curl * 1.2) + spin) * (0.085 + curl * 0.045) +
          Math.cos(u * (3.0 + curl * 0.9) - spin * 0.8) * (0.06 + curl * 0.03);

        const radius = baseRadius * (1 + wobble * (0.6 + this.energy * 0.8));
        const a = spin + u * (0.95 + curl * 0.55) + wobble;

        // Lines gently lens toward the pointer and slightly toward center in collapse.
        const sinkPull = motif.sink * (1 - Math.abs(u)) * 0.12;
        const x =
          Math.cos(a) * radius * (1 - sinkPull) +
          this.pointer.x * (0.28 + curl * 0.1) * (1 - Math.abs(u));
        const z =
          Math.sin(a) * radius * (1 - sinkPull) +
          this.pointer.y * (0.18 + curl * 0.08) * (1 - Math.abs(u));
        const y = u * 1.9 + node.lift + Math.sin(spin + u * 1.3) * 0.12;

        positions[idx3] = x;
        positions[idx3 + 1] = y;
        positions[idx3 + 2] = z;
      }

      line.geometry.attributes.position.needsUpdate = true;
      const mat = line.material as THREE.LineBasicMaterial;
      mat.color.setHSL(lineHue, 0.82, 0.66);
      mat.opacity = 0.08 + this.energy * 0.12 + accentFactor * 0.035;
    }

    // Particles.
    const particleActive = clamp(
      Math.floor(
        config.particles * (0.65 + this.quality * 0.35) * this.mobileScale
      ),
      120,
      this.particleBase.length / 3
    );

    const particlePositions = this.particles.geometry.attributes.position
      .array as Float32Array;

    const orbitBias =
      motif.orbit *
      wowFactor *
      (0.55 + this.energy * 0.55) *
      (1 + accentFactor * 0.22);
    const sinkBias = motif.sink * (0.55 + this.energy * 0.35);

    for (let i = 0; i < particleActive * 3; i += 3) {
      const bx = this.particleBase[i];
      const by = this.particleBase[i + 1];
      const bz = this.particleBase[i + 2];

      const baseR = Math.hypot(bx, bz);
      const radial = baseR / Math.max(0.001, config.particleRadius);
      const baseA = Math.atan2(bz, bx);

      const flow =
        time * (0.18 + orbitBias * 0.42) +
        radial * (0.65 + orbitBias * 1.15) +
        (bx + bz) * 0.08;

      const a = baseA + flow;
      const wobble = Math.sin(time * 0.9 + radial * 4.2 + baseA) * 0.12;

      const sink = sinkBias * Math.exp(-baseR * 0.55);
      const r = baseR * (1 - sink * 0.22) + wobble * (0.25 + orbitBias * 0.2);

      particlePositions[i] = Math.cos(a) * r + this.pointer.x * 0.22;
      particlePositions[i + 1] =
        by +
        Math.cos(time * 0.65 + baseA * 2.0) * (0.06 + orbitBias * 0.06) -
        sink * 0.15;
      particlePositions[i + 2] = Math.sin(a) * r + this.pointer.y * 0.18;
    }

    this.particles.geometry.setDrawRange(0, particleActive);
    this.particles.geometry.attributes.position.needsUpdate = true;

    const pMat = this.particles.material as THREE.PointsMaterial;
    pMat.color.setHSL(lerp(config.hue2 / 360, 0.55, techMix), 0.86, 0.67);
    pMat.opacity = 0.22 + this.energy * 0.26 + techMix * 0.05;
    pMat.size =
      (0.022 + this.quality * 0.012) * lerp(0.95, 1.12, mobileLimiter);

    // Probe + lens respond to scroll.
    const orbit = progress * Math.PI * 2;
    this.probe.position.x = this.pointer.x * 1.05 + Math.cos(orbit) * 0.65;
    this.probe.position.y = this.pointer.y * 0.55 + Math.sin(orbit * 0.9) * 0.3;
    this.probe.position.z = 0.65 + Math.sin(orbit) * 0.35;

    this.lens.position.copy(this.probe.position).multiplyScalar(0.75);
    this.lens.rotation.z = time * 0.2 + orbit * 0.2;

    // Group + camera.
    this.group.rotation.y = this.pointer.x * 0.18 + time * 0.03;
    this.group.rotation.x = -0.08 + this.pointer.y * -0.12;

    this.camera.position.x = damp(
      this.camera.position.x,
      this.pointer.x * 1.05,
      6,
      dt
    );
    this.camera.position.y = damp(
      this.camera.position.y,
      this.pointer.y * 0.75,
      6,
      dt
    );
    this.camera.position.z = damp(this.camera.position.z, config.camZ, 4, dt);

    const rollTarget = this.pointerVelocity.x * 0.02;
    this.cameraRoll = damp(this.cameraRoll, rollTarget, 4, dt);
    this.camera.lookAt(0, 0, 0);
    this.camera.rotation.z = this.cameraRoll;

    // Lighting & fog.
    const lightBreath = 1 + Math.sin(time * 0.45) * 0.04;
    this.key.intensity = (1.2 + this.energy * 0.55) * lightBreath;
    this.fill.intensity = (0.85 + this.energy * 0.35) * (2 - lightBreath);
    this.hemi.intensity = 0.5 + this.energy * 0.25;

    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.density = config.fog + this.energy * 0.01;
    }

    // Update CSS variables shared with the overlay/UI choreography.
    this.root.style.setProperty('--ih-scroll', progress.toFixed(4));
    this.root.style.setProperty('--ih-local', localT.toFixed(4));
    this.root.style.setProperty('--ih-vel', velocity.toFixed(4));
    this.root.style.setProperty('--ih-parallax-x', this.pointer.x.toFixed(4));
    this.root.style.setProperty('--ih-parallax-y', this.pointer.y.toFixed(4));
    this.root.style.setProperty('--ih-energy-soft', this.energy.toFixed(4));
    this.root.style.setProperty('--ih-pinch', this.pinch.toFixed(4));
    this.root.style.setProperty('--ih-quality', this.quality.toFixed(4));
    this.root.style.setProperty('--ih-hue', config.hue.toFixed(2));
    this.root.style.setProperty('--ih-hue-2', config.hue2.toFixed(2));

    // Adaptive pixel ratio (only when needed).
    const baseDpr = clamp(window.devicePixelRatio || 1, 1, 2);
    const desiredRatio = clamp(
      baseDpr * this.quality * this.mobileScale,
      0.75,
      2
    );
    if (Math.abs(this.renderer.getPixelRatio() - desiredRatio) > 0.06) {
      this.renderer.setPixelRatio(desiredRatio);
    }

    this.renderer.toneMappingExposure = config.exposure + this.energy * 0.08;

    if (this.bloomPass) {
      // Bloom is deliberately subtle; mobile devices get even less.
      const bloomScale = this.mobileScale < 0.85 ? 0.75 : 1;
      this.bloomPass.strength =
        (config.bloom + this.energy * 0.16 + accentFactor * 0.09) * bloomScale;
      this.bloomPass.radius = 0.45;
      this.bloomPass.threshold = 0.3;
    }

    if (this.composer && this.quality * this.mobileScale > 0.72) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private loop(): void {
    let last = performance.now() / 1000;

    const tick = () => {
      const now = performance.now() / 1000;
      const dt = clamp(now - last, 1 / 240, 1 / 30);
      last = now;

      if (!this.reducedMotion && this.visible) {
        this.update(dt, now);
      }

      this.raf = window.requestAnimationFrame(tick);
    };

    this.raf = window.requestAnimationFrame(tick);
  }

  public destroy(): void {
    window.cancelAnimationFrame(this.raf);
    this.abortController.abort();
    this.io?.disconnect();
    this.io = null;

    if (this.environment) this.environment.dispose();

    // Dispose custom objects that are not Mesh-traversed.
    this.fieldLines.forEach(line => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    });

    this.stars.geometry.dispose();
    (this.stars.material as THREE.Material).dispose();

    this.particles.geometry.dispose();
    (this.particles.material as THREE.Material).dispose();

    if (this.holoCore) {
      this.holoCore.geometry.dispose();
      (this.holoCore.material as THREE.Material).dispose();
    }

    this.probe.geometry.dispose();
    (this.probe.material as THREE.Material).dispose();

    this.lens.geometry.dispose();
    (this.lens.material as THREE.Material).dispose();

    this.renderer.dispose();
    this.composer?.dispose();

    // Safety: dispose any remaining Mesh resources.
    this.scene.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const material = obj.material;
        if (Array.isArray(material)) {
          material.forEach((mat: THREE.Material) => mat.dispose());
        } else {
          material.dispose();
        }
      }
    });
  }
}

function mount(): void {
  const root = document.querySelector<HTMLElement>('[data-ih]');
  if (!root) return;

  type IHWindow = Window & {
    __ihController?: ImmersiveThreeController;
  };

  const w = window as IHWindow;

  // On initial load, both DOMContentLoaded and astro:page-load can fire.
  // If we already mounted for this exact DOM node, do nothing.
  if (root === mountedRoot && w.__ihController) return;

  if (w.__ihController) {
    w.__ihController.destroy();
    w.__ihController = undefined;
  }

  w.__ihController = new ImmersiveThreeController(root);
  mountedRoot = root;
}

let mountedRoot: HTMLElement | null = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}

document.addEventListener('astro:page-load', mount);

document.addEventListener('astro:before-swap', () => {
  const w = window as Window & {
    __ihController?: ImmersiveThreeController;
  };

  if (w.__ihController) {
    w.__ihController.destroy();
    w.__ihController = undefined;
  }

  mountedRoot = null;
});
