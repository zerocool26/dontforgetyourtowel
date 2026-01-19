import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

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
  private debugEl: HTMLElement | null = null;

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

  // Mobile-first interactions
  private pointers = new Map<number, { x: number; y: number; type: string }>();
  private pinchBaseDist = 0;
  private lastTapTime = 0;
  private gyroTarget = new THREE.Vector2();
  private gyro = new THREE.Vector2();
  private gyroEnabled = false;

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
  private holoMaterialFull: THREE.ShaderMaterial | null = null;
  private holoMaterialMobile: THREE.ShaderMaterial | null = null;
  private holoMaterialSafe: THREE.ShaderMaterial | null = null;
  private holoMaterialUltraSafe: THREE.ShaderMaterial | null = null;
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
  private contextLost = false;

  private renderedOnce = false;
  private shaderFallbackStep = 0;
  private lastStaticRender = 0;
  private lastAnimRender = 0;

  private recordActiveShaderMeta(
    label: string,
    mat: THREE.ShaderMaterial | null
  ): void {
    this.root.dataset.ihShaderProfile = label;
    if (!mat) return;

    const frag = String(mat.fragmentShader || '');
    this.root.dataset.ihFragLen = String(frag.length);

    // Keep dataset sizes bounded; full shader is large.
    const snippet = frag.slice(0, 700);
    this.root.dataset.ihFragSnippet = snippet;
  }

  private isRootInViewport(): boolean {
    // IntersectionObserver can be unreliable across mobile browsers (especially
    // with large, scroll-driven sections). This is a cheap backstop.
    const rect = this.root.getBoundingClientRect();
    const vh = window.innerHeight || 0;
    return rect.bottom > -64 && rect.top < vh + 64;
  }

  constructor(root: HTMLElement) {
    this.root = root;
    this.chapters = Array.from(
      root.querySelectorAll<HTMLElement>('[data-ih-chapter]')
    );
    const canvas = root.querySelector<HTMLCanvasElement>('[data-ih-canvas]');
    if (!canvas) throw new Error('Immersive canvas missing');
    this.canvas = canvas;

    this.debugEl = root.querySelector<HTMLElement>('[data-ih-debug]');

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

    // Expose basic GPU/capability info for debugging and CSS fallbacks.
    // (Useful when a deployed mobile device behaves differently from desktop.)
    const maxPrec = this.renderer.capabilities.getMaxPrecision('highp');
    root.dataset.ihWebgl = this.renderer.capabilities.isWebGL2
      ? 'webgl2'
      : 'webgl1';
    root.dataset.ihPrec = maxPrec;
    root.dataset.ihCenter = 'webgl';
    root.dataset.ihStatus = 'ok';

    this.scene.background = new THREE.Color(0x05070f);
    this.scene.fog = new THREE.FogExp2(0x070b18, 0.055);

    this.scene.add(this.group);

    this.stars = this.createStars();
    this.group.add(this.stars);

    const preferSafeCore =
      maxPrec !== 'highp' || !this.renderer.capabilities.isWebGL2;
    const preferMobileCore = !preferSafeCore && this.isLikelyMobileDevice();
    const preferUltraCore = preferSafeCore && this.isLikelyMobileDevice();

    root.dataset.ihCenter = preferSafeCore
      ? preferUltraCore
        ? 'webgl-ultra'
        : 'webgl-safe'
      : preferMobileCore
        ? 'webgl-mobile'
        : 'webgl';

    const initialProfile = preferSafeCore
      ? preferUltraCore
        ? 'ultra'
        : 'safe'
      : preferMobileCore
        ? 'mobile'
        : 'full';

    const {
      mesh: holoCore,
      material: holoMaterial,
      fullMaterial,
      mobileMaterial,
      safeMaterial,
      ultraSafeMaterial,
    } = this.createHoloCore(initialProfile);
    this.holoCore = holoCore;
    this.holoMaterial = holoMaterial;
    this.holoMaterialFull = fullMaterial;
    this.holoMaterialMobile = mobileMaterial;
    this.holoMaterialSafe = safeMaterial;
    this.holoMaterialUltraSafe = ultraSafeMaterial;
    this.scene.add(this.holoCore);

    // Record which shader profile actually got attached.
    this.recordActiveShaderMeta(root.dataset.ihCenter, this.holoMaterial);

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

    // If the holo shader fails compilation/linking on a mobile driver, swap to
    // a simpler shader profile. If that still fails, the CSS core fallback will
    // be shown via data attributes.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.renderer.debug as any).onShaderError = (
      gl: WebGLRenderingContext | WebGL2RenderingContext,
      program: WebGLProgram,
      vertexShader: WebGLShader,
      fragmentShader: WebGLShader
    ) => {
      // Capture logs (best-effort; some mobile browsers return empty strings).
      try {
        const pLog = gl.getProgramInfoLog(program) ?? '';
        const vLog = gl.getShaderInfoLog(vertexShader) ?? '';
        const fLog = gl.getShaderInfoLog(fragmentShader) ?? '';
        const combined = [pLog, vLog, fLog]
          .map(s => String(s || '').trim())
          .filter(Boolean)
          .join('\n---\n');
        if (combined) this.root.dataset.ihShaderLog = combined.slice(0, 1200);
      } catch {
        // ignore
      }

      // Fall back in steps: full -> mobileHQ -> safe -> ultraSafe -> CSS.
      if (this.shaderFallbackStep > 3) return;
      this.shaderFallbackStep += 1;

      const current = this.holoMaterial;

      if (
        this.holoCore &&
        current === this.holoMaterialFull &&
        this.holoMaterialMobile
      ) {
        this.holoCore.material = this.holoMaterialMobile;
        this.holoMaterial = this.holoMaterialMobile;
        this.root.dataset.ihCenter = 'webgl-mobile';
        this.root.dataset.ihStatus = 'shader-error';
        this.root.dataset.ihStatusDetail =
          'Full shader compile failed; switched to mobile HQ shader';
        this.recordActiveShaderMeta('webgl-mobile', this.holoMaterial);
      } else if (
        this.holoCore &&
        this.holoMaterialSafe &&
        current !== this.holoMaterialSafe
      ) {
        this.holoCore.material = this.holoMaterialSafe;
        this.holoMaterial = this.holoMaterialSafe;
        this.root.dataset.ihCenter = 'webgl-safe';
        this.root.dataset.ihStatus = 'shader-error';
        this.root.dataset.ihStatusDetail =
          'Shader compile failed; switched to safe holo shader';
        this.recordActiveShaderMeta('webgl-safe', this.holoMaterial);
      } else if (
        this.holoCore &&
        this.holoMaterialUltraSafe &&
        current !== this.holoMaterialUltraSafe
      ) {
        // This shader is intentionally tiny and should compile basically everywhere.
        this.holoCore.material = this.holoMaterialUltraSafe;
        this.holoMaterial = this.holoMaterialUltraSafe;
        this.root.dataset.ihCenter = 'webgl-ultra';
        this.root.dataset.ihStatus = 'shader-error';
        this.root.dataset.ihStatusDetail =
          'Shader compile failed; switched to ultra-safe WebGL shader';
        this.recordActiveShaderMeta('webgl-ultra', this.holoMaterial);
      } else {
        this.root.dataset.ihCenter = 'css';
        this.root.dataset.ihStatus = 'shader-error';
        this.root.dataset.ihStatusDetail =
          'Shader compile failed; switched to CSS fallback';
        this.recordActiveShaderMeta('css', null);
      }

      this.updateDebugOverlay();
    };

    this.init();
  }

  private shouldUsePostFX(): boolean {
    // Mobile-first: avoid postprocessing unless we're clearly on a capable desktop.
    const maxPrec = this.root.dataset.ihPrec ?? '';
    const isMobile = this.isLikelyMobileDevice();
    return (
      !isMobile &&
      this.renderer.capabilities.isWebGL2 &&
      maxPrec === 'highp' &&
      this.quality * this.mobileScale > 0.82
    );
  }

  private maybeEnableGyro(): void {
    if (this.gyroEnabled) return;
    if (!this.isLikelyMobileDevice()) return;

    const DeviceOrientationEventAny = DeviceOrientationEvent as unknown as
      | {
          requestPermission?: () => Promise<'granted' | 'denied'>;
        }
      | undefined;

    const start = () => {
      if (this.gyroEnabled) return;
      this.gyroEnabled = true;
      window.addEventListener(
        'deviceorientation',
        e => {
          // beta: front-back [-180..180], gamma: left-right [-90..90]
          const g = typeof e.gamma === 'number' ? e.gamma : 0;
          const b = typeof e.beta === 'number' ? e.beta : 0;

          // Map to a tame -1..1 range.
          const x = clamp(g / 30, -1, 1);
          const y = clamp(b / 35, -1, 1);
          this.gyroTarget.set(x, y);
        },
        { passive: true, signal: this.abortController.signal }
      );
    };

    // iOS Safari requires a user gesture + permission.
    if (DeviceOrientationEventAny?.requestPermission) {
      void DeviceOrientationEventAny.requestPermission()
        .then(result => {
          if (result === 'granted') start();
        })
        .catch(() => {
          // ignore
        });
      return;
    }

    start();
  }

  private createHoloCore(
    profile: 'full' | 'mobile' | 'safe' | 'ultra' = 'full'
  ): {
    mesh: THREE.Mesh;
    material: THREE.ShaderMaterial;
    fullMaterial: THREE.ShaderMaterial;
    mobileMaterial: THREE.ShaderMaterial;
    safeMaterial: THREE.ShaderMaterial;
    ultraSafeMaterial: THREE.ShaderMaterial;
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
        uHue: { value: 0.58 },
        uHue2: { value: 0.7 },
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
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    precision mediump int;
varying vec2 vUv;

uniform float uTime;
uniform float uProgress;
uniform float uEnergy;
uniform float uAccent;
uniform float uTech;
uniform float uQuality;
uniform vec2 uResolution;
uniform float uHue;
uniform float uHue2;
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

vec3 hsl2rgb(vec3 c){
  // c.x = hue [0..1], c.y = sat, c.z = light
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}

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
  float e = mix(0.0026, 0.0012, saturate(uQuality));
  float tmp;
  float dx = mapCore(p + vec3(e, 0.0, 0.0), tmp) - mapCore(p - vec3(e, 0.0, 0.0), tmp);
  float dy = mapCore(p + vec3(0.0, e, 0.0), tmp) - mapCore(p - vec3(0.0, e, 0.0), tmp);
  float dz = mapCore(p + vec3(0.0, 0.0, e), tmp) - mapCore(p - vec3(0.0, 0.0, e), tmp);
  return normalize(vec3(dx, dy, dz));
}

float softshadow(vec3 ro, vec3 rd){
  // Simple SDF soft shadow along rd.
  float res = 1.0;
  float t = 0.02;
  float tmp;
  for (int i = 0; i < 24; i++) {
    float h = mapCore(ro + rd * t, tmp);
    res = min(res, 12.0 * h / t);
    t += clamp(h, 0.02, 0.18);
    if (res < 0.08 || t > 4.0) break;
  }
  return clamp(res, 0.0, 1.0);
}

float calcAO(vec3 p, vec3 n){
  // Cheap AO by sampling distance field along the normal.
  float ao = 0.0;
  float sca = 1.0;
  float tmp;
  for (int i = 0; i < 5; i++) {
    float h = 0.03 + float(i) * 0.06;
    float d = mapCore(p + n * h, tmp);
    ao += (h - d) * sca;
    sca *= 0.7;
  }
  return clamp(1.0 - ao, 0.0, 1.0);
}

float grid(vec2 uv, float scale, float width){
  // Derivative-free grid (avoids fwidth()), more robust on WebGL1.
  // width is in "relative" units; we convert to an approximate pixel width using uResolution.
  vec2 p = uv * scale;
  vec2 a = abs(fract(p - 0.5) - 0.5);

  float px = 1.0 / max(1.0, min(uResolution.x, uResolution.y));
  float w = (width * px) * scale * 1.8;
  float lx = 1.0 - smoothstep(w, w * 2.2, a.x);
  float ly = 1.0 - smoothstep(w, w * 2.2, a.y);
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

  // A stable "always-on" tech glow so the centerpiece is never fully absent,
  // even if the raymarch misses on a particular driver/frame.
  float hueA = fract(uHue);
  float hueB = fract(uHue2);
  vec3 glowCBase = hsl2rgb(vec3(mix(hueA, hueB, 0.55), 0.95, 0.55));
  glowCBase = mix(glowCBase, vec3(0.10, 0.85, 1.00), 0.55);
  float coreGlow = smoothstep(0.95, 0.15, length(p));
  col += glowCBase * coreGlow * (0.035 + uTech * 0.065 + uAccent * 0.06);

  if(hit > 0.5){
    vec3 n = calcNormal(pos);

    float ao = calcAO(pos, n);

    // Lighting (simple and crisp)
    vec3 l = normalize(vec3(0.45, 0.75, 0.55));
    float ndl = saturate(dot(n, l));
    float fres = pow(1.0 - saturate(dot(n, -rd)), 3.0);

    float sh = softshadow(pos + n * 0.02, l);
    ndl *= mix(0.65, 1.0, sh);

    // Tech palette
    // (These are already computed above, but re-declared in the original code.
    // Keep them here for clarity and to preserve shader readability.)
    float hueA = fract(uHue);
    float hueB = fract(uHue2);
    vec3 baseA = hsl2rgb(vec3(hueA, 0.62, 0.12));
    vec3 baseB = hsl2rgb(vec3(hueB, 0.72, 0.14));
    vec3 base = mix(baseA, baseB, saturate(0.35 + uTech * 0.55));
    vec3 glowC = hsl2rgb(vec3(mix(hueA, hueB, 0.55), 0.95, 0.55));
    glowC = mix(glowC, vec3(0.10, 0.85, 1.00), 0.55);

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

    // Specular highlight (machined feel)
    vec3 h = normalize(l - rd);
    float ndh = saturate(dot(n, h));
    float specPow = mix(60.0, 220.0, saturate(uTech));
    float spec = pow(ndh, specPow) * (0.12 + uTech * 0.35);

    col = base;
    col += ndl * vec3(0.10, 0.12, 0.16) * ao;
    col += fres * glowC * (0.22 + uTech * 0.28);
    col += emissive;
    col += glowC * spec * (0.85 + uAccent * 0.35);

    // Screen-space HUD rings (adds "developed" sci-fi UI without extra geometry)
    float rr = length(p);
    float ring1 = 1.0 - smoothstep(0.002, 0.012, abs(rr - 0.55));
    float ring2 = 1.0 - smoothstep(0.002, 0.012, abs(rr - 0.78));
    float ticks = smoothstep(0.92, 1.0, sin(atan(p.y, p.x) * 24.0) * 0.5 + 0.5);
    float hud = (ring1 * (0.35 + ticks * 0.65) + ring2 * 0.35) * (0.25 + uTech * 0.55);
    hud *= (0.25 + uEnergy * 0.55 + uAccent * 0.35);
    col += glowC * hud * 0.35;

    // Subtle scanline shimmer (very restrained)
    float scan = abs(fract(uv.y * 7.0 + uTime * 0.35 + uProgress * 0.8) - 0.5);
    scan = 1.0 - smoothstep(0.47, 0.5, scan);
    col += glowC * scan * (0.02 + uTech * 0.03);
  }

  // Volume glow always contributes (even if we didn't "hit")
  col += hsl2rgb(vec3(fract(mix(uHue, uHue2, 0.6)), 0.95, 0.55)) * glow * (0.5 + uAccent * 0.42);

  // Dither to reduce banding (especially on mobile + low DPR)
  float dither = ih_hash(gl_FragCoord.xy) - 0.5;
  col += dither * 0.006 * (0.35 + uTech * 0.65) * mix(1.0, 0.55, uQuality);

  // Gamma-ish shaping
  col = pow(max(col, 0.0), vec3(0.98));

  // Slightly higher baseline alpha so "no hit" still reads on small screens.
  float alpha = vign * (0.32 + hit * 0.68);
  // Keep it polite on mobile / low quality.
  alpha *= mix(0.85, 1.0, uQuality);

  gl_FragColor = vec4(col, alpha);
}
`,
    });

    // Mobile-HQ shader: keeps the raymarched core + traces + HUD, but trims the
    // heaviest bits (fbm microdetail, soft shadows, multi-tap AO).
    const mobileMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
      uniforms: material.uniforms,
      vertexShader: material.vertexShader,
      fragmentShader: `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
precision mediump int;
varying vec2 vUv;

uniform float uTime;
uniform float uProgress;
uniform float uEnergy;
uniform float uAccent;
uniform float uTech;
uniform float uQuality;
uniform vec2 uResolution;
uniform float uHue;
uniform float uHue2;
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

vec3 hsl2rgb(vec3 c){
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}

mat2 rot(float a){
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

float ih_hash(vec2 p){
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

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

float mapMobile(in vec3 p, out float mEm){
  float boot = smoothstep(0.02, 0.18, uProgress) * (0.7 + uEnergy * 0.6);
  float collapse = uSink * (0.25 + uEnergy * 0.35);
  float swirl = uSwirl * (0.55 + uEnergy * 0.4);

  p.xy += uPointer * 0.055;

  float r = length(p.xy);
  float ang = swirl * (r * r) + uTime * (0.11 + swirl * 0.06) + uProgress * 0.75;
  p.xy = rot(ang) * p.xy;
  p.z -= collapse * exp(-r * 1.6) * 0.20;

  float core = sdSphere(p, 0.62);
  float shell = abs(sdSphere(p, 0.9)) - 0.082;
  float d = smin(core, shell, 0.24);

  vec3 pr = p;
  float ringSep = (0.11 + boot * 0.24) * (1.0 - collapse * 0.6);
  float ringA = sdTorus(pr + vec3(0.0, ringSep, 0.0), vec2(0.9, 0.035));
  float ringB = sdTorus(pr - vec3(0.0, ringSep, 0.0), vec2(0.78, 0.03));
  d = smin(d, ringA, 0.21);
  d = smin(d, ringB, 0.21);

  // Lightweight vents (single box band)
  vec3 pv = p;
  pv.xz *= rot(0.45);
  float vent = sdBox(pv - vec3(0.78, 0.0, 0.0), vec3(0.16, 0.05, 0.02));
  d = smin(d, vent, 0.16);

  // Interference channel cut
  float wave = sin((p.x + p.y) * 5.0 + uTime * 1.25 + uProgress * 4.8) * 0.055 * uInterf;
  float channel = sdTorus(p + vec3(0.0, wave, 0.0), vec2(0.58, 0.05));
  d = min(d, channel);

  float edge = smoothstep(0.06, 0.0, abs(core));
  float rings = smoothstep(0.05, 0.0, abs(min(ringA, ringB)));
  float vents = smoothstep(0.05, 0.0, abs(vent));
  mEm = saturate(edge * 0.65 + rings * 0.85 + vents * 0.45);
  return d;
}

vec3 calcNormal(vec3 p){
  float e = mix(0.0028, 0.0015, saturate(uQuality));
  float tmp;
  float dx = mapMobile(p + vec3(e, 0.0, 0.0), tmp) - mapMobile(p - vec3(e, 0.0, 0.0), tmp);
  float dy = mapMobile(p + vec3(0.0, e, 0.0), tmp) - mapMobile(p - vec3(0.0, e, 0.0), tmp);
  float dz = mapMobile(p + vec3(0.0, 0.0, e), tmp) - mapMobile(p - vec3(0.0, 0.0, e), tmp);
  return normalize(vec3(dx, dy, dz));
}

float ao1(vec3 p, vec3 n){
  float tmp;
  float h = 0.10;
  float d = mapMobile(p + n * h, tmp);
  return saturate(d / h);
}

float grid(vec2 uv, float scale, float width){
  vec2 q = uv * scale;
  vec2 a = abs(fract(q - 0.5) - 0.5);
  float px = 1.0 / max(1.0, min(uResolution.x, uResolution.y));
  float w = (width * px) * scale * 1.8;
  float lx = 1.0 - smoothstep(w, w * 2.2, a.x);
  float ly = 1.0 - smoothstep(w, w * 2.2, a.y);
  return max(lx, ly);
}

void main(){
  vec2 uv = vUv;
  vec2 p = (uv * 2.0 - 1.0);
  p.x *= uAspect;
  float vign = smoothstep(1.15, 0.25, length(p));

  float z = -1.0;
  float k = tan(uFov * 0.5);
  vec3 rdCam = normalize(vec3(p.x * k, p.y * k, z));
  vec3 rd = normalize(uCamRot * rdCam);
  vec3 ro = uCamPos;

  float t = 0.0;
  float maxT = 13.5;
  float hit = 0.0;
  float mEm = 0.0;
  vec3 pos = ro;
  float eps = mix(0.0029, 0.0015, saturate(uQuality));
  float glow = 0.0;

  for(int i=0;i<68;i++){
    pos = ro + rd * t;
    float em;
    float d = mapMobile(pos, em);
    glow += exp(-d * 11.0) * 0.009 * (0.7 + uTech * 0.6);
    if (d < eps){ hit = 1.0; mEm = em; break; }
    t += d * (0.88 + (1.0 - uQuality) * 0.32);
    if (t > maxT) break;
  }

  float hueA = fract(uHue);
  float hueB = fract(uHue2);
  vec3 glowC = hsl2rgb(vec3(mix(hueA, hueB, 0.55), 0.95, 0.55));
  glowC = mix(glowC, vec3(0.10, 0.85, 1.00), 0.55);

  vec3 col = vec3(0.01, 0.015, 0.03);
  float coreGlow = smoothstep(0.95, 0.15, length(p));
  col += glowC * coreGlow * (0.034 + uTech * 0.06 + uAccent * 0.06);

  if(hit > 0.5){
    vec3 n = calcNormal(pos);
    float ao = ao1(pos, n);

    vec3 l = normalize(vec3(0.45, 0.75, 0.55));
    float ndl = saturate(dot(n, l));
    float fres = pow(1.0 - saturate(dot(n, -rd)), 3.0);

    vec3 baseA = hsl2rgb(vec3(hueA, 0.62, 0.12));
    vec3 baseB = hsl2rgb(vec3(hueB, 0.72, 0.14));
    vec3 base = mix(baseA, baseB, saturate(0.35 + uTech * 0.55));

    vec2 suv = pos.xz * 0.85 + pos.y * 0.15;
    float g1 = grid(suv + vec2(uTime * 0.02, -uTime * 0.015), 10.0, 0.85);
    float g2 = grid(suv + vec2(-uTime * 0.015, uTime * 0.02), 22.0, 0.8) * 0.7;
    float traces = saturate(g1 * 0.7 + g2 * 0.5);

    float emI = (0.25 + uTech * 0.75) * (0.65 + uEnergy * 0.8) + uAccent * 0.8;
    vec3 emissive = glowC * (mEm * 0.95 + traces * 0.6) * emI;

    vec3 h = normalize(l - rd);
    float spec = pow(saturate(dot(n, h)), 140.0) * (0.10 + uTech * 0.26);

    col = base;
    col += ndl * vec3(0.10, 0.12, 0.16) * ao;
    col += fres * glowC * (0.22 + uTech * 0.26);
    col += emissive;
    col += glowC * spec * (0.9 + uAccent * 0.35);

    float rr = length(p);
    float ring1 = 1.0 - smoothstep(0.002, 0.012, abs(rr - 0.55));
    float ring2 = 1.0 - smoothstep(0.002, 0.012, abs(rr - 0.78));
    float ticks = smoothstep(0.92, 1.0, sin(atan(p.y, p.x) * 24.0) * 0.5 + 0.5);
    float hud = (ring1 * (0.35 + ticks * 0.65) + ring2 * 0.35) * (0.25 + uTech * 0.55);
    hud *= (0.25 + uEnergy * 0.55 + uAccent * 0.35);
    col += glowC * hud * 0.35;
  }

  col += glowC * glow * (0.48 + uAccent * 0.35);
  float dither = ih_hash(gl_FragCoord.xy) - 0.5;
  col += dither * 0.006 * (0.35 + uTech * 0.65) * mix(1.0, 0.6, uQuality);
  col = pow(max(col, 0.0), vec3(0.98));
  float alpha = vign * (0.33 + hit * 0.67);
  alpha *= mix(0.88, 1.0, uQuality);
  gl_FragColor = vec4(col, alpha);
}
`,
    });

    // Safer, smaller fragment shader for weak/mobile GPUs and WebGL1 mediump.
    // Shares uniforms with the full material so we can swap without extra wiring.
    const safeMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
      uniforms: material.uniforms,
      vertexShader: material.vertexShader,
      fragmentShader: `
precision mediump float;
precision mediump int;
varying vec2 vUv;

uniform float uTime;
uniform float uProgress;
uniform float uEnergy;
uniform float uAccent;
uniform float uTech;
uniform float uQuality;
uniform vec2 uResolution;
uniform float uHue;
uniform float uHue2;
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

vec3 hsl2rgb(vec3 c){
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}

mat2 rot(float a){
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

float ih_hash(vec2 p){
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

float sdSphere(vec3 p, float r){ return length(p) - r; }
float sdTorus(vec3 p, vec2 t){
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

float smin(float a, float b, float k){
  float h = saturate(0.5 + 0.5 * (b - a) / k);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float mapSafe(in vec3 p, out float mEm){
  p.xy += uPointer * 0.05;
  float r = length(p.xy);
  float ang = (uSwirl * 0.35) * (r * r) + uProgress * 0.9;
  p.xy = rot(ang) * p.xy;
  p.z -= uSink * exp(-r * 1.5) * 0.18;

  float core = sdSphere(p, 0.65);
  float ring = sdTorus(p, vec2(0.9, 0.04));
  float ring2 = sdTorus(p + vec3(0.0, 0.16 + uEnergy * 0.12, 0.0), vec2(0.78, 0.03));
  float d = smin(core, ring, 0.24);
  d = smin(d, ring2, 0.22);

  float edge = smoothstep(0.05, 0.0, abs(core));
  float rings = smoothstep(0.05, 0.0, abs(min(ring, ring2)));
  mEm = saturate(edge * 0.6 + rings * 0.9);
  return d;
}

vec3 calcNormalSafe(vec3 p){
  float e = 0.0028;
  float tmp;
  float dx = mapSafe(p + vec3(e, 0.0, 0.0), tmp) - mapSafe(p - vec3(e, 0.0, 0.0), tmp);
  float dy = mapSafe(p + vec3(0.0, e, 0.0), tmp) - mapSafe(p - vec3(0.0, e, 0.0), tmp);
  float dz = mapSafe(p + vec3(0.0, 0.0, e), tmp) - mapSafe(p - vec3(0.0, 0.0, e), tmp);
  return normalize(vec3(dx, dy, dz));
}

void main(){
  vec2 uv = vUv;
  vec2 p = (uv * 2.0 - 1.0);
  p.x *= uAspect;
  float vign = smoothstep(1.2, 0.25, length(p));

  float z = -1.0;
  float k = tan(uFov * 0.5);
  vec3 rdCam = normalize(vec3(p.x * k, p.y * k, z));
  vec3 rd = normalize(uCamRot * rdCam);
  vec3 ro = uCamPos;

  float t = 0.0;
  float maxT = 13.0;
  float hit = 0.0;
  float mEm = 0.0;
  vec3 pos = ro;
  float eps = 0.0026;
  float glow = 0.0;

  for(int i=0;i<64;i++){
    pos = ro + rd * t;
    float em;
    float d = mapSafe(pos, em);
    glow += exp(-d * 12.0) * 0.008;
    if (d < eps){ hit = 1.0; mEm = em; break; }
    t += d * 0.9;
    if (t > maxT) break;
  }

  float hueA = fract(uHue);
  float hueB = fract(uHue2);
  vec3 glowC = hsl2rgb(vec3(mix(hueA, hueB, 0.55), 0.95, 0.55));
  glowC = mix(glowC, vec3(0.10, 0.85, 1.00), 0.55);

  vec3 col = vec3(0.01, 0.015, 0.03);
  float coreGlow = smoothstep(0.95, 0.15, length(p));
  col += glowC * coreGlow * (0.03 + uTech * 0.05 + uAccent * 0.05);

  if(hit > 0.5){
    vec3 n = calcNormalSafe(pos);
    vec3 l = normalize(vec3(0.45, 0.75, 0.55));
    float ndl = saturate(dot(n, l));
    float fres = pow(1.0 - saturate(dot(n, -rd)), 3.0);

    vec3 baseA = hsl2rgb(vec3(hueA, 0.62, 0.12));
    vec3 baseB = hsl2rgb(vec3(hueB, 0.72, 0.14));
    vec3 base = mix(baseA, baseB, saturate(0.35 + uTech * 0.55));
    float emI = (0.25 + uTech * 0.75) * (0.65 + uEnergy * 0.8) + uAccent * 0.8;
    vec3 emissive = glowC * mEm * 1.2 * emI;

    vec3 h = normalize(l - rd);
    float spec = pow(saturate(dot(n, h)), 120.0) * (0.08 + uTech * 0.22);

    col = base;
    col += ndl * vec3(0.12, 0.14, 0.18);
    col += fres * glowC * 0.26;
    col += emissive;
    col += glowC * spec;
  }

  col += glowC * glow * (0.45 + uAccent * 0.35);
  float dither = ih_hash(gl_FragCoord.xy) - 0.5;
  col += dither * 0.006 * (0.35 + uTech * 0.65);
  col = pow(max(col, 0.0), vec3(0.98));
  float alpha = vign * (0.34 + hit * 0.66);
  alpha *= mix(0.9, 1.0, uQuality);
  gl_FragColor = vec4(col, alpha);
}
`,
    });

    // Ultra-minimal shader: no raymarch loops, no exp/tan dependence, no mat3 usage.
    // Goal: produce a visible, high-contrast center on *any* WebGL implementation
    // before we ever drop to a CSS-only fallback.
    const ultraSafeMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
      uniforms: {
        uHue: material.uniforms.uHue,
        uHue2: material.uniforms.uHue2,
        uAspect: material.uniforms.uAspect,
        uTime: material.uniforms.uTime,
      },
      vertexShader: material.vertexShader,
      fragmentShader: `
precision mediump float;
varying vec2 vUv;

uniform float uHue;
uniform float uHue2;
uniform float uAspect;
uniform float uTime;

vec3 hsl2rgb(vec3 c){
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}

float saturate(float x){ return clamp(x, 0.0, 1.0); }

void main(){
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= uAspect;
  float r = length(p);

  float pulse = 0.5 + 0.5 * sin(uTime * 0.9);
  // Larger shapes for small screens.
  float core = 1.0 - smoothstep(0.26, 0.78, r);
  float ringA = 1.0 - smoothstep(0.008, 0.022, abs(r - (0.58 + pulse * 0.02)));
  float ringB = 1.0 - smoothstep(0.010, 0.024, abs(r - (0.42 - pulse * 0.015)));
  float vign = smoothstep(1.15, 0.25, r);

  // Gentle scanline shimmer to keep it feeling "alive" without heavy math.
  float scan = abs(fract(vUv.y * 6.0 + uTime * 0.18) - 0.5);
  scan = 1.0 - smoothstep(0.46, 0.5, scan);

  vec3 cA = hsl2rgb(vec3(fract(uHue), 0.92, 0.55));
  vec3 cB = hsl2rgb(vec3(fract(uHue2), 0.92, 0.55));
  vec3 glow = mix(cA, cB, 0.55);
  vec3 col = glow * (core * 0.85 + ringA * 0.40 + ringB * 0.25);
  col += glow * scan * 0.06;

  float alpha = vign * saturate(0.18 + core * 0.9 + ringA * 0.55 + ringB * 0.35);
  gl_FragColor = vec4(col, alpha);
}
`,
    });

    const activeMaterial =
      profile === 'ultra'
        ? ultraSafeMaterial
        : profile === 'safe'
          ? safeMaterial
          : profile === 'mobile'
            ? mobileMaterial
            : material;

    const mesh = new THREE.Mesh(geo, activeMaterial);
    mesh.frustumCulled = false;
    mesh.renderOrder = -10;
    return {
      mesh,
      material: activeMaterial,
      fullMaterial: material,
      mobileMaterial,
      safeMaterial,
      ultraSafeMaterial,
    };
  }

  private isLikelyMobileDevice(): boolean {
    // Keep this conservative: we only use it to pick a more compiler-friendly
    // shader profile, not for layout/UX.
    return (
      window.matchMedia?.('(pointer: coarse)').matches ||
      window.innerWidth < 768
    );
  }

  private updateDebugOverlay(): void {
    if (!this.debugEl) return;

    const debugEnabled = this.root.dataset.ihDebug === '1';
    const status = this.root.dataset.ihStatus ?? '';
    const detail = this.root.dataset.ihStatusDetail ?? '';

    if (!debugEnabled && (!status || status === 'ok')) {
      this.debugEl.textContent = '';
      return;
    }

    const lines: string[] = [];
    lines.push(`ihStatus: ${status || 'ok'}`);
    if (detail) lines.push(detail);
    lines.push(`center: ${this.root.dataset.ihCenter ?? ''}`);
    if (this.root.dataset.ihShaderProfile) {
      lines.push(
        `shader: ${this.root.dataset.ihShaderProfile}  fragLen: ${this.root.dataset.ihFragLen ?? ''}`
      );
    }
    lines.push(
      `webgl: ${this.root.dataset.ihWebgl ?? ''}  prec: ${this.root.dataset.ihPrec ?? ''}`
    );
    if (this.root.dataset.ihWebglState) {
      lines.push(`ctx: ${this.root.dataset.ihWebglState}`);
    }

    const shaderLog = this.root.dataset.ihShaderLog ?? '';
    if (shaderLog && (debugEnabled || status === 'shader-error')) {
      lines.push('--- shader log ---');
      lines.push(shaderLog);
    }

    const fragSnippet = this.root.dataset.ihFragSnippet ?? '';
    if (fragSnippet && debugEnabled) {
      lines.push('--- frag snippet ---');
      lines.push(fragSnippet);
    }

    this.debugEl.textContent = lines.join('\n');
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

    // Mobile browsers can lose WebGL contexts (memory pressure, backgrounding).
    // Without handling this, the canvas may go permanently blank.
    this.canvas.addEventListener(
      'webglcontextlost',
      e => {
        e.preventDefault();
        this.contextLost = true;
        this.root.dataset.ihWebglState = 'lost';
        this.root.dataset.ihStatus = 'context-lost';
        this.root.dataset.ihStatusDetail =
          'WebGL context lost (mobile memory pressure/backgrounding)';
        this.updateDebugOverlay();
      },
      { signal }
    );

    this.canvas.addEventListener(
      'webglcontextrestored',
      () => {
        this.contextLost = false;
        this.root.dataset.ihWebglState = 'restored';
        this.root.dataset.ihStatus = 'ok';
        this.root.dataset.ihStatusDetail = '';
        this.resize();
        this.updateDebugOverlay();
      },
      { signal }
    );

    // Desktop pointer tracking (lightweight). Mobile uses multi-pointer logic below.
    window.addEventListener(
      'pointermove',
      e => {
        if (e.pointerType === 'touch') return;
        const nx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
        const ny = (e.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
        this.pointerTarget.set(clamp(nx, -1, 1), clamp(ny, -1, 1));
      },
      { passive: true, signal }
    );

    // Mobile-first, touch-driven interactions (pinch + double tap + drag).
    const updateFromPointers = () => {
      if (this.pointers.size === 0) return;

      let sx = 0;
      let sy = 0;
      const pts: Array<{ x: number; y: number }> = [];
      for (const p of this.pointers.values()) {
        sx += p.x;
        sy += p.y;
        pts.push({ x: p.x, y: p.y });
      }

      const cx = sx / this.pointers.size;
      const cy = sy / this.pointers.size;
      const nx = (cx / Math.max(1, window.innerWidth)) * 2 - 1;
      const ny = (cy / Math.max(1, window.innerHeight)) * 2 - 1;
      this.pointerTarget.set(clamp(nx, -1, 1), clamp(ny, -1, 1));

      if (pts.length >= 2) {
        const dx = pts[1].x - pts[0].x;
        const dy = pts[1].y - pts[0].y;
        const dist = Math.hypot(dx, dy);
        if (this.pinchBaseDist <= 0) this.pinchBaseDist = dist;
        const raw =
          (dist - this.pinchBaseDist) / Math.max(1, this.pinchBaseDist);
        this.pinchTarget = clamp(raw * 1.4, -1, 1);
      }
    };

    const shouldIgnoreInteractiveTarget = (target: EventTarget | null) => {
      const el = target instanceof Element ? target : null;
      if (!el) return false;
      return Boolean(
        el.closest(
          'a,button,input,select,textarea,[role="button"],[data-ih-mode]'
        )
      );
    };

    const onPointerDown = (e: PointerEvent) => {
      if (shouldIgnoreInteractiveTarget(e.target)) return;

      // Used by UI to fade the mobile interaction hint.
      this.root.dataset.ihTouched = '1';

      // First user gesture: try to enable gyro parallax on mobile.
      this.maybeEnableGyro();

      this.pointers.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        type: e.pointerType,
      });

      // Double-tap => overcharge beat.
      const now = performance.now();
      const dt = now - this.lastTapTime;
      this.lastTapTime = now;
      if (e.pointerType === 'touch' && dt > 0 && dt < 320) {
        this.accent = Math.min(1, this.accent + 1.0);
        this.burst = Math.min(1, this.burst + 0.95);
      } else {
        this.burst = Math.min(1, this.burst + 0.75);
      }

      // Touch down => slight pinch in.
      this.pinchTarget = Math.max(this.pinchTarget, 0.55);
      updateFromPointers();
    };

    const onPointerMove = (e: PointerEvent) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      p.x = e.clientX;
      p.y = e.clientY;
      updateFromPointers();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (this.pointers.has(e.pointerId)) {
        this.pointers.delete(e.pointerId);
      }
      if (this.pointers.size < 2) {
        this.pinchBaseDist = 0;
        this.pinchTarget = 0;
      }
    };

    this.root.addEventListener('pointerdown', onPointerDown, {
      passive: true,
      capture: true,
      signal,
    });
    this.root.addEventListener('pointermove', onPointerMove, {
      passive: true,
      capture: true,
      signal,
    });
    this.root.addEventListener('pointerup', onPointerUp, {
      passive: true,
      capture: true,
      signal,
    });
    this.root.addEventListener('pointercancel', onPointerUp, {
      passive: true,
      capture: true,
      signal,
    });
    this.root.addEventListener(
      'pointerleave',
      () => {
        // If the browser fires this on touch, it can otherwise leave pinch stuck.
        this.pinchBaseDist = 0;
        this.pinchTarget = 0;
        this.pointers.clear();
      },
      { passive: true, capture: true, signal }
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

    // Ensure we render at least once even if IntersectionObserver hasn't fired
    // yet (some mobile browsers delay it), to avoid an empty center.
    if (!this.contextLost) {
      const now = performance.now() / 1000;
      this.update(1 / 60, now);
      this.renderedOnce = true;
      this.root.dataset.ihRendered = '1';
      this.lastStaticRender = now;
    }

    this.loop();
  }

  private resize(): void {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    // Mobile shader compilers vary wildly; we scale quality/pixel ratio, but keep
    // the center legible. Slightly higher baseline than before.
    this.mobileScale = width < 640 ? 0.78 : width < 1024 ? 0.9 : 1;

    // Ultra-safe shader is extremely cheap: allow a higher effective scale so it
    // doesn't look muddy on small screens.
    if (this.root.dataset.ihCenter === 'webgl-ultra') {
      this.mobileScale = Math.max(this.mobileScale, 0.92);
    }

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

    if (this.shouldUsePostFX()) {
      this.setupComposer(width, height, ratio);
    } else if (this.composer) {
      this.composer.dispose();
      this.composer = null;
      this.bloomPass = null;
      this.fxaaPass = null;
    }
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

    // Mobile-first: avoid downloading HDRIs on mobile; use procedural env.
    if (this.isLikelyMobileDevice()) {
      const room = new RoomEnvironment();
      const envMap = pmremGenerator.fromScene(room, 0.04).texture;
      applyEnvironment(envMap);
      pmremGenerator.dispose();
      return;
    }

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
    const pinchBoost = clamp(Math.abs(this.pinch) * 0.35, 0, 0.35);
    const energyTarget =
      clamp(velocity * 0.85 + this.burst * 0.65 + pinchBoost, 0, 1) *
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
    // On mobile, if there's no active touch, blend in gyro parallax for a
    // more "alive" hero even while the user is scrolling.
    if (this.isLikelyMobileDevice() && this.pointers.size === 0) {
      this.gyro.x = damp(this.gyro.x, this.gyroTarget.x, 3, dt);
      this.gyro.y = damp(this.gyro.y, this.gyroTarget.y, 3, dt);
      const gyroMix = this.gyroEnabled ? 0.55 : 0.0;
      this.pointerTarget.x = lerp(this.pointerTarget.x, this.gyro.x, gyroMix);
      this.pointerTarget.y = lerp(this.pointerTarget.y, this.gyro.y, gyroMix);
    }

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
    // Pinch gesture gives a tactile zoom-in/zoom-out on mobile.
    const camZ = config.camZ - this.pinch * 0.9;
    this.camera.position.z = damp(this.camera.position.z, camZ, 4, dt);

    const rollTarget = this.pointerVelocity.x * 0.02;
    this.cameraRoll = damp(this.cameraRoll, rollTarget, 4, dt);
    this.camera.lookAt(0, 0, 0);
    this.camera.rotation.z = this.cameraRoll;

    // Ensure camera matrices are current before sampling matrixWorld for the holo shader.
    this.camera.updateMatrixWorld();

    // Holo core shader uniforms (after camera update to avoid flicker/misses).
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
      this.holoMaterial.uniforms.uHue.value = config.hue / 360;
      this.holoMaterial.uniforms.uHue2.value = config.hue2 / 360;
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
    // Cinematic impact layers (these were referenced by CSS but not driven).
    this.root.style.setProperty('--ih-burst', this.burst.toFixed(4));
    this.root.style.setProperty('--ih-event', this.accent.toFixed(4));
    this.root.style.setProperty('--ih-grade', techMix.toFixed(4));
    // A single clean "intensity" signal for cinematic overlays.
    const impact = clamp(
      this.burst * 0.85 +
        this.accent * 0.95 +
        Math.abs(this.pinch) * 0.35 +
        velocity * 0.18,
      0,
      1
    );
    this.root.style.setProperty('--ih-impact', impact.toFixed(4));
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

    if (this.composer && this.shouldUsePostFX()) {
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

      if (!this.contextLost) {
        const inViewport = this.visible || this.isRootInViewport();
        this.root.dataset.ihInView = inViewport ? '1' : '0';

        if (inViewport) {
          // Always animate when in view.
          // In reduced-motion mode, we still animate but at a lower FPS so the
          // hero doesn't feel "dead" (especially after deployment).
          const targetFps = this.reducedMotion ? 14 : 60;
          const frameBudget = 1 / targetFps;
          const due = now - this.lastAnimRender >= frameBudget;

          if (due || !this.renderedOnce) {
            const stepDt = this.reducedMotion ? Math.min(dt, frameBudget) : dt;
            this.update(stepDt, now);
            this.lastAnimRender = now;
            this.renderedOnce = true;
            this.root.dataset.ihRendered = '1';
          }
        } else {
          // Out of view: occasionally render to avoid stale/blank results
          // on some browsers, but don't burn battery.
          const needsFirstFrame = !this.renderedOnce;
          const needsOccasional = now - this.lastStaticRender > 0.9;
          if (needsFirstFrame || needsOccasional) {
            this.update(1 / 60, now);
            this.renderedOnce = true;
            this.root.dataset.ihRendered = '1';
            this.lastStaticRender = now;
          }
        }

        this.updateDebugOverlay();
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

  // Debug overlay opt-in: add ?ihDebug=1 to the URL.
  const params = new URLSearchParams(window.location.search);
  root.dataset.ihDebug = params.get('ihDebug') === '1' ? '1' : '0';

  // Respect reduced-motion with a CSS fallback (canvas hidden by CSS).
  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

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

  if (reducedMotion) {
    // We still render the advanced WebGL hero, but the controller will
    // automatically reduce animation frequency.
    root.dataset.ihStatus = 'reduced-motion';
    root.dataset.ihStatusDetail =
      'prefers-reduced-motion is enabled; running WebGL in low-motion mode';
  }

  try {
    w.__ihController = new ImmersiveThreeController(root);
  } catch (err) {
    root.dataset.ihCenter = 'css';
    root.dataset.ihStatus = 'init-failed';
    root.dataset.ihStatusDetail =
      err instanceof Error ? err.message : 'WebGL init failed';
    w.__ihController = undefined;
  }
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
