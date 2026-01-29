import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { UIControls } from './ui-controls';
import { AudioController } from './audio-controller';
import type { TowerCaps } from '../core/caps';
import { createScenes } from './scenes';
import { GlobalParticleSystem, ParticleMode } from './gpgpu-system';
import type { SceneRuntime, TowerScene } from './scenes';

type Cleanup = () => void;

type AudioControllerLike = Pick<
  AudioController,
  'level' | 'bass' | 'high' | 'toggle' | 'update'
>;
type GpgpuLike = Pick<
  GlobalParticleSystem,
  'group' | 'attractor' | 'setAudioLevel' | 'update' | 'dispose'
> & {
  mode: ParticleMode;
  color: THREE.Color;
  speed: number;
};

export interface DirectorOptions {
  galleryMode?: boolean;
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

const signedPow = (v: number, p: number) => {
  const s = v < 0 ? -1 : 1;
  return s * Math.pow(Math.abs(v), p);
};

const smoothstep01 = (x: number) => {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};

export class SceneDirector {
  private root: HTMLElement;
  private canvas: HTMLCanvasElement;
  private caps: TowerCaps;
  public renderer: THREE.WebGLRenderer;
  private scenes: TowerScene[];
  private sceneById: Map<string, TowerScene>;
  private activeScene: TowerScene;

  // UI Control Properties
  private ui: UIControls;
  public timeScale = 1.0;
  public autoRotate = false;
  public manualPress = 0;

  // Audio
  public audio: AudioControllerLike;

  // Universal Particle System
  private gpgpu: GpgpuLike;

  private pmremGenerator: THREE.PMREMGenerator | null = null;
  private environmentTexture: THREE.Texture | null = null;
  private renderTarget: THREE.WebGLRenderTarget;

  private supportsDepthTexture = false;

  // Wrapper Scene for PBR Environment
  private mainScene: THREE.Scene;

  // Short transition mask when the active chapter/scene changes.
  private cutFade = 0;
  // Render pipeline
  private composer: EffectComposer;
  private renderPass: RenderPass;
  public bloomPass: UnrealBloomPass;
  public bokehPass: BokehPass;
  public afterimagePass: AfterimagePass;
  private finalPass: ShaderPass;
  private outputPass: OutputPass;
  private fxaaPass: ShaderPass;

  // Visibility & Observer
  private resizeObserver: ResizeObserver;
  private isVisible = true;

  private transitionType = 0; // 0: portal iris, 1: liquid wipe, 2: particle dissolve, 3: glitch cut

  private lastAppliedLookSceneId: string | null = null;

  private sceneEnterTime = 0;

  // Per-scene look targets (applied on switch, then gently ramped in).
  private lookBloomEnabled = true;
  private lookBloomStrength = 0.6;
  private lookBloomThreshold = 0.85;
  private lookBloomRadius = 0.4;

  private lookBokehEnabled = false;
  private lookBokehAperture = 0.0001;
  private lookBokehMaxblur = 0.01;

  private lookTrailsEnabled = false;
  private lookTrailsDamp = 0.0;

  private lookVignette = 0.12;
  private lookGrain = 0.04;
  private lookChromatic = 0.003;

  // Shaped interaction signals handed to scenes (avoids per-scene feel drift).
  private runtimePointer = new THREE.Vector2();
  private runtimePointerVelocity = new THREE.Vector2();
  private runtimeGyro = new THREE.Vector3();
  private runtimePress = 0;
  private runtimeTap = 0;

  private getSceneSettleDuration(sceneId: string): number {
    // Baseline is intentionally short; this only smooths initial pops.
    const base = this.caps.coarsePointer ? 0.45 : 0.6;

    // Heavier/cinematic chapters get a touch more settle time.
    let mult = 1.0;
    switch (sceneId) {
      case 'scene08': // Orbital Mechanics
        mult = 1.06;
        break;
      case 'scene05': // Event Horizon
      case 'scene12': // The Library
        mult = 1.12;
        break;
      case 'scene15': // Digital Decay
      case 'scene16': // Ethereal Storm
        mult = 1.08;
        break;
      case 'scene17': // Porsche
        mult = 1.05;
        break;
      case 'scene18': // Wrap Showroom
        mult = 1.06;
        break;
      default:
        mult = 1.0;
        break;
    }

    // Keep low-tier devices snappy.
    if (this.caps.performanceTier === 'low') {
      mult *= 0.92;
    }

    return clamp(base * mult, 0.35, 0.85);
  }

  private getSceneSettle(time: number): number {
    if (this.caps.reducedMotion) return 1;

    // Keep this subtle and fast; just enough to remove harsh pops.
    const duration = this.getSceneSettleDuration(this.activeScene?.id ?? '');
    const t = (time - this.sceneEnterTime) / Math.max(0.0001, duration);
    return smoothstep01(t);
  }

  private applyLookToPasses(settle: number): void {
    // Ramp is intentionally conservative.
    const k = 0.88 + 0.12 * settle;

    // Bloom
    this.bloomPass.enabled = this.lookBloomEnabled;
    this.bloomPass.strength = this.lookBloomStrength * k;
    this.bloomPass.threshold = this.lookBloomThreshold;
    this.bloomPass.radius = this.lookBloomRadius;

    // Bokeh
    this.bokehPass.enabled = this.lookBokehEnabled;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.bokehPass.uniforms as any)['aperture'].value =
      this.lookBokehAperture * (0.9 + 0.1 * settle);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.bokehPass.uniforms as any)['maxblur'].value =
      this.lookBokehMaxblur * (0.9 + 0.1 * settle);

    // Trails
    this.afterimagePass.enabled = this.lookTrailsEnabled;
    this.afterimagePass.uniforms['damp'].value = this.lookTrailsDamp * settle;

    // Final composite
    this.finalPass.uniforms.uVignette.value =
      this.lookVignette * (0.92 + 0.08 * settle);
    this.finalPass.uniforms.uGrain.value =
      this.lookGrain * (0.9 + 0.1 * settle);
    this.finalPass.uniforms.uChromatic.value =
      this.lookChromatic * (0.9 + 0.1 * settle);
  }

  private pointer = new THREE.Vector2();
  private pointerTarget = new THREE.Vector2();
  private pointerVelocity = new THREE.Vector2();
  private lastPointer = new THREE.Vector2();

  private pointerDown = false;
  private pressTime = 0;
  private tap = 0;

  // Gyroscope support for mobile tilt parallax
  private gyro = new THREE.Vector3();
  private gyroTarget = new THREE.Vector3();
  private gyroActive = false;

  private lastTime = performance.now() / 1000;
  private lastScrollTime = performance.now();
  private lastScrollProgress = 0;
  public scrollProgressTarget = 0;
  private scrollVelocity = 0;

  private size = { width: 1, height: 1, dpr: 1 };
  private chapters: HTMLElement[] = [];

  private cleanups: Cleanup[] = [];
  private destroyed = false;

  private sceneIndex = 0;
  private localProgress = 0;
  private scrollProgress = 0;

  // Gallery mode - controlled progress instead of scroll-based
  private galleryMode = false;
  private galleryProgress = 0;

  constructor(
    root: HTMLElement,
    canvas: HTMLCanvasElement,
    caps: TowerCaps,
    options?: DirectorOptions
  ) {
    this.root = root;
    this.canvas = canvas;
    this.caps = caps;
    this.galleryMode = options?.galleryMode ?? false;

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: false,
        antialias: false, // MSAA disabled for EffectComposer
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
      });
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 0.9;
      this.renderer.setClearColor(new THREE.Color(0x020205));

      // Pro Shadow Setup
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } catch (e) {
      this.reportError('WebGL Renderer Init', e);
      // Fallback or rethrow
      throw e;
    }

    // Depth textures are not universally supported (notably in some WebGL1/headless contexts).
    // Only request them when supported; otherwise, disable depth-based effects (bokeh).
    try {
      this.supportsDepthTexture =
        this.renderer.capabilities.isWebGL2 ||
        Boolean(this.renderer.extensions.get('WEBGL_depth_texture'));
    } catch {
      this.supportsDepthTexture = false;
    }

    // Init Audio (Attach to dummy camera initially)
    try {
      this.audio = new AudioController(new THREE.Camera());
    } catch (e) {
      this.reportError('Audio Init', e);
      this.audio = {
        level: 0,
        bass: 0,
        high: 0,
        toggle: () => {
          // noop
        },
        update: (_dt: number) => {
          // noop
        },
      };
    }

    // Init GPGPU System
    try {
      this.gpgpu = new GlobalParticleSystem(this.renderer, {
        maxParticles: this.caps.maxParticles,
      });
    } catch (e) {
      this.reportError('GPGPU Init', e);
      this.gpgpu = {
        group: new THREE.Group(),
        attractor: new THREE.Vector3(),
        mode: ParticleMode.IDLE,
        color: new THREE.Color(0xffffff),
        speed: 0,
        setAudioLevel: (_level: number) => {
          // noop
        },
        update: (_time: number, _dt: number) => {
          // noop
        },
        dispose: () => {
          // noop
        },
      };
    }
    // Add to a dedicated "ForePass" scene or just overlay it.
    // Since we use a single RenderPass, we should probably add the GPGPU group to EACH scene or managing it centrally.
    // Cleaner approach: The GPGPU group exists outside scenes but is rendered by the same camera.
    // However, RenderPass takes a scene.
    // Trick: We will inject the GPGPU group into the *Active Scene* group when switching.

    // --- Post Processing Stack (EffectComposer) ---
    // Depth texture is optional and can crash on unsupported contexts.
    this.renderTarget = this.supportsDepthTexture
      ? new THREE.WebGLRenderTarget(
          window.innerWidth * this.size.dpr,
          window.innerHeight * this.size.dpr,
          {
            depthTexture: new THREE.DepthTexture(
              window.innerWidth,
              window.innerHeight
            ),
            depthBuffer: true,
          }
        )
      : new THREE.WebGLRenderTarget(
          window.innerWidth * this.size.dpr,
          window.innerHeight * this.size.dpr,
          {
            depthBuffer: true,
          }
        );
    this.composer = new EffectComposer(this.renderer, this.renderTarget);

    // 1. Render Pass: Renders the active 3D scene

    // Create a persistent Scene container to hold the Environment Map
    this.mainScene = new THREE.Scene();

    // Generate High-Quality PBR Environment (optional; can fail on some headless/old GPUs)
    try {
      this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      this.pmremGenerator.compileEquirectangularShader();
      this.environmentTexture = this.pmremGenerator.fromScene(
        new RoomEnvironment(),
        0.04
      ).texture;
      this.mainScene.environment = this.environmentTexture;
    } catch (e) {
      this.reportError('PMREM Environment Init', e);
      this.pmremGenerator = null;
      this.environmentTexture = null;
      this.mainScene.environment = null;
    }

    // Initialized with empty scene/camera; updated per-frame in tick()
    this.renderPass = new RenderPass(this.mainScene, new THREE.Camera());
    this.composer.addPass(this.renderPass);

    // 2. Bokeh Pass (Depth of Field) - Must be before Bloom/ToneMapping
    this.bokehPass = new BokehPass(new THREE.Scene(), new THREE.Camera(), {
      focus: 10.0,
      aperture: 0.0001, // Start sharp
      maxblur: 0.01,
    });
    // The Bokeh pass needs the scene/camera updated every frame like RenderPass
    this.composer.addPass(this.bokehPass);

    // 3. Unreal Bloom Pass: High-quality glow for neon cities
    const vecRes = new THREE.Vector2(window.innerWidth, window.innerHeight);
    this.bloomPass = new UnrealBloomPass(vecRes, 1.2, 0.4, 0.85);
    this.bloomPass.threshold = 0.85; // High threshold: Only very bright things glow
    this.bloomPass.strength = 0.6; // Moderate strength
    this.bloomPass.radius = 0.4;
    this.composer.addPass(this.bloomPass);

    // 4. Afterimage (Trails) for motion blur effect
    this.afterimagePass = new AfterimagePass(0.0); // Start disabled (0 damp)
    this.composer.addPass(this.afterimagePass);

    // 5. Final Composite Pass: Transitions, Glitch, Grain, Vignette, CA
    const finalParams = {
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uCut: { value: 0 },
        uTransitionType: { value: 0 },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uInteract: { value: 0 },
        uVignette: { value: 0.12 },
        uGrain: { value: 0.05 },
        uChromatic: { value: 0.003 },
        uGyroInfluence: { value: new THREE.Vector2(0, 0) },
        uMobile: { value: this.caps.coarsePointer ? 1.0 : 0.0 },
        uPointerVel: { value: 0 },
        uAudio: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform float uCut;
        uniform float uTransitionType;
        uniform vec2 uResolution;
        uniform float uInteract;
        uniform float uVignette;
        uniform float uGrain;
        uniform float uChromatic;
        uniform vec2 uGyroInfluence;
        uniform float uMobile;
        uniform float uPointerVel;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        vec3 sampleChromatic(vec2 uv, float strength) {
          vec2 c = uv - 0.5;
          float r = length(c);
          vec2 dir = normalize(c + 1e-6);

          float interactStr = strength * (1.0 + uPointerVel * 2.0);
          float amt = interactStr * smoothstep(0.12, 0.9, r);
          vec2 off = dir * amt;
          vec3 col;
          col.r = texture2D(tDiffuse, uv + off).r;
          col.g = texture2D(tDiffuse, uv).g;
          col.b = texture2D(tDiffuse, uv - off).b;
          return col;
        }

        float portalIris(vec2 uv, float progress) {
          vec2 center = uv - 0.5;
          float dist = length(center);
          float angle = atan(center.y, center.x);
          float radius = 0.9 * (1.0 - progress);
          float ripple = sin(angle * 12.0 + uTime * 10.0 + dist * 20.0) * 0.04 * progress;
          float energyRing = smoothstep(radius + 0.1, radius, dist + ripple);
          float innerCore = smoothstep(radius, radius - 0.2, dist);
          return energyRing * (1.0 - innerCore * 0.5);
        }

        float liquidWipe(vec2 uv, float progress) {
          float n1 = noise(uv * 5.0 + uTime * 0.8);
          float n2 = noise(uv * 10.0 - uTime * 0.5);
          float distortion = (n1 + n2 * 0.5) * 0.2;
          float edge = uv.x + distortion;
          float threshold = progress * 1.4 - 0.2;
          return smoothstep(threshold - 0.15, threshold + 0.15, edge);
        }

        float particleDissolve(vec2 uv, float progress) {
          float blockSize = 0.04;
          vec2 block = floor(uv / blockSize) * blockSize;
          float randomVal = hash(block + floor(uTime * 2.0));
          float wave = sin(block.x * 10.0 + uTime * 5.0) * 0.15;
          float threshold = progress * 1.2 + wave - 0.1;
          return step(randomVal, threshold);
        }

        vec3 glitchCut(vec2 uv, float progress, vec3 originalColor) {
          float glitchStrength = smoothstep(0.0, 0.2, progress) * smoothstep(1.0, 0.8, progress) * 2.0;
          float sliceY = floor(uv.y * 40.0) / 40.0;
          float sliceRandom = hash(vec2(sliceY, uTime));
          float displacement = (sliceRandom - 0.5) * glitchStrength * 0.2;
          vec2 displacedUv = uv + vec2(displacement, 0.0);
          float r = texture2D(tDiffuse, displacedUv + vec2(0.02 * glitchStrength, 0.0)).r;
          float g = texture2D(tDiffuse, displacedUv).g;
          float b = texture2D(tDiffuse, displacedUv - vec2(0.02 * glitchStrength, 0.0)).b;
          if (hash(vec2(uTime, uv.y)) > 0.8) return vec3(r, g, b);
          return originalColor;
        }

        void main() {
          vec2 uv = vUv;
          vec2 c = uv - 0.5;
          float r = length(c);

          float wobble = 0.0025 * sin(uTime * 0.6 + r * 8.0);
          uv += normalize(c + 1e-6) * wobble;

          vec3 col = sampleChromatic(uv, uChromatic);

          // Transitions
          float cut = clamp(uCut, 0.0, 1.0);
          if (cut > 0.01) {
            int transType = int(uTransitionType);
            if (transType == 0) {
              float iris = portalIris(vUv, cut);
              col *= 1.0 - iris * 0.85;
              vec2 center = vUv - 0.5;
              float dist = length(center);
              float radius = 0.8 * (1.0 - cut);
              float edgeGlow = smoothstep(radius + 0.15, radius, dist) * smoothstep(radius - 0.05, radius, dist);
              col += vec3(0.2, 0.6, 1.0) * edgeGlow * cut * 2.0;
            } else if (transType == 1) {
              float liquid = liquidWipe(vUv, cut);
              col *= 1.0 - liquid * 0.9;
              float edge = fwidth(liquid) * 15.0;
              col += vec3(0.3, 0.5, 0.8) * edge * cut;
            } else if (transType == 2) {
              float dissolve = particleDissolve(vUv, cut);
              col *= 1.0 - dissolve * 0.95;
              col += vec3(0.1, 0.2, 0.4) * dissolve * (1.0 - cut);
            } else {
              col = glitchCut(vUv, cut, col);
              col *= 1.0 - cut * 0.6;
              col += vec3(0.01, 0.015, 0.03) * cut;
            }
          }

          // Vignette
          float vigOffset = length(uGyroInfluence) * 0.05 * uMobile;
          float vig = smoothstep(0.92 + vigOffset, 0.25, r);
          col *= mix(1.0 - uVignette, 1.0, vig);

          vec3 vigColor = mix(vec3(0.0), vec3(0.02, 0.04, 0.08), uMobile * (1.0 - vig) * 0.5);
          col += vigColor;

          // Grain
          float grainAmount = uGrain * (1.0 - uMobile * 0.3);
          float g = (hash(uv * vec2(1920.0, 1080.0) + uTime * 60.0) - 0.5);
          col += g * grainAmount;

          // Color Grade
          col = pow(col, vec3(0.98, 1.0, 1.02));
          float luma = dot(col, vec3(0.299, 0.587, 0.114));
          col = mix(vec3(luma), col, 1.08);

          // Interaction punch
          float inter = clamp(uInteract, 0.0, 1.0);
          col *= 1.0 + inter * 0.07;
          // col += glow * inter * 0.25; // Removed manual glow

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    };

    this.finalPass = new ShaderPass(new THREE.ShaderMaterial(finalParams));
    this.composer.addPass(this.finalPass);

    // 6. Output Pass: Tone Mapping & Color Space Conversion
    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);

    // 7. FXAA: Antialiasing since default MSAA is off for offscreen buffers
    this.fxaaPass = new ShaderPass(FXAAShader);
    this.composer.addPass(this.fxaaPass);

    // Performance / preference-based post settings
    const postEnabled = this.caps.enablePostProcessing;
    const highTier = this.caps.performanceTier === 'high';

    // Depth-of-field is expensive; reserve for high-tier, non-touch, non-reduced-motion.
    this.bokehPass.enabled =
      postEnabled &&
      this.supportsDepthTexture &&
      highTier &&
      !this.caps.coarsePointer &&
      !this.caps.reducedMotion;

    // Bloom is the primary "wow" pass; keep it for medium/high, but soften on mobile.
    this.bloomPass.enabled = postEnabled;
    if (this.caps.coarsePointer) {
      this.bloomPass.strength *= 0.85;
      this.bloomPass.radius *= 0.9;
    }

    // Trails can read as motion/blur; disable for reduced motion and low tier.
    this.afterimagePass.enabled =
      postEnabled && !this.caps.reducedMotion && highTier;

    // FXAA is useful but still a pass; disable on low tier.
    this.fxaaPass.enabled = postEnabled;

    // Subtle grade defaults per tier.
    this.finalPass.uniforms.uGrain.value = this.caps.coarsePointer
      ? 0.035
      : highTier
        ? 0.045
        : 0.04;
    this.finalPass.uniforms.uChromatic.value = this.caps.coarsePointer
      ? 0.0025
      : 0.003;

    // Visibility Listener to pause rendering when tab is hidden
    document.addEventListener('visibilitychange', this.handleVisibility);

    // ResizeObserver for modern resizing
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.root);

    // Initialize scenes BEFORE UI so getSceneCount() works in UIControls constructor
    this.scenes = createScenes();
    this.sceneById = new Map(this.scenes.map(scene => [scene.id, scene]));

    // Debug/automation breadcrumbs (safe in prod; tiny footprint).
    this.root.dataset.towerSceneCount = String(this.scenes.length);
    this.root.dataset.towerSceneLastId = this.scenes.at(-1)?.id ?? '';
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.towerSceneCount = String(
        this.scenes.length
      );
      document.documentElement.dataset.towerSceneLastId =
        this.scenes.at(-1)?.id ?? '';
    }

    const initialId = this.root.dataset.towerScene || this.root.dataset.scene;
    this.activeScene =
      (initialId && this.sceneById.get(initialId)) || this.scenes[0];

    // UI (must be initialized after scenes are created)
    this.ui = new UIControls(this, this.root);

    // Inject GPGPU
    this.activeScene.group.add(this.gpgpu.group);

    this.chapters = Array.from(
      this.root.querySelectorAll<HTMLElement>('[data-tower3d-chapter]')
    );

    this.installInput();
    this.syncSize(true);

    const runtime = this.buildRuntime(0, 0);
    this.scenes.forEach(scene => {
      try {
        scene.init(runtime);
        scene.resize(runtime);
      } catch (e) {
        this.reportError(`Scene Init (${scene.id})`, e);
      }
    });

    // Apply initial per-chapter look tuning once.
    this.applySceneLook(this.activeScene.id);

    this.root.dataset.towerScene = this.activeScene.id;
    this.root.dataset.towerRendered = '1';

    // Debug access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__TOWER__ = this;

    // Heartbeat for diagnosing frozen loops
    this.initHeartbeat();

    // Handle Context Loss
    this.canvas.addEventListener('webglcontextlost', e => {
      e.preventDefault();
      this.reportError(
        'WebGL Context Lost',
        ' GPU crashes or resource exhaustion.'
      );
      // Pause rendering
      this.isVisible = false;
    });

    this.canvas.addEventListener('webglcontextrestored', () => {
      this.reportError('WebGL Context Restored', 'Reloading...');
      window.location.reload();
    });
  }

  private initHeartbeat() {
    const hb = document.createElement('div');
    hb.style.cssText =
      'position:absolute;bottom:5px;left:5px;width:4px;height:4px;background:#0f0;z-index:9999;border-radius:50%;pointer-events:none;';
    hb.className = 'tower-heartbeat';
    this.root.appendChild(hb);
  }

  private handleVisibility = () => {
    this.isVisible = document.visibilityState === 'visible';
    if (this.isVisible) {
      this.lastTime = performance.now() / 1000;
    }
  };

  private buildRuntime(dt: number, time: number): SceneRuntime {
    return {
      renderer: this.renderer,
      root: this.root,
      caps: this.caps,
      size: this.size,
      time,
      dt,
      progress: this.scrollProgress,
      localProgress: this.localProgress,
      pointer: this.runtimePointer,
      pointerVelocity: this.runtimePointerVelocity,
      tap: this.runtimeTap,
      press: this.runtimePress,
      scrollVelocity: this.scrollVelocity,
      sceneId: this.activeScene.id,
      sceneIndex: this.sceneIndex,
      gyro: this.runtimeGyro,
      gyroActive: this.gyroActive,
      bgTheme: 'dark',
      audio: {
        level: this.audio.level,
        low: this.audio.bass,
        mid: this.audio.level, // Approx
        high: this.audio.high,
      },
    };
  }

  private getInteractionProfile(sceneId: string): {
    pointerGamma: number;
    pointerGain: number;
    pointerVelGain: number;
    pressGain: number;
    tapGain: number;
    gyroGain: number;
  } {
    const tier = this.caps.performanceTier;
    const isLow = tier === 'low';
    const isHigh = tier === 'high';

    // Baseline: slightly eased pointer, moderate press.
    let pointerGamma = this.caps.coarsePointer ? 1.06 : 1.15;
    let pointerGain = this.caps.coarsePointer ? 0.95 : 1.0;
    let pointerVelGain = isLow ? 0.75 : 1.0;
    let pressGain = this.caps.reducedMotion ? 0.8 : 1.0;
    let tapGain = this.caps.reducedMotion ? 0.7 : 1.0;
    let gyroGain = this.caps.enableGyroscope ? 1.0 : 0.0;

    // Scene-specific subtle personality (kept small and safe).
    switch (sceneId) {
      case 'scene05': // Event Horizon: calmer + heavier
      case 'scene12': // Library: slower, steadier
        pointerGamma += 0.06;
        pointerGain *= 0.9;
        pressGain *= 0.85;
        tapGain *= 0.85;
        gyroGain *= 0.8;
        break;
      case 'scene11': // Neural: responsive
      case 'scene16': // Storm: energetic
        pointerGamma -= 0.04;
        pointerGain *= 1.05;
        pressGain *= 1.1;
        tapGain *= 1.05;
        gyroGain *= 1.05;
        break;
      case 'scene14': // Metropolis: a touch more motion
      case 'scene07': // Matrix
        pointerGamma -= 0.02;
        pressGain *= 1.05;
        break;
      case 'scene17': // Porsche: keep camera/lighting readable
        pointerGain *= 0.9;
        pressGain *= 0.9;
        tapGain *= 0.9;
        gyroGain *= 0.85;
        break;
      case 'scene18': // Wrap Showroom: tap cycles modes; keep stable
        pointerGain *= 0.92;
        pressGain *= 0.92;
        tapGain *= 1.05;
        gyroGain *= 0.85;
        break;
      default:
        break;
    }

    // Global tier constraints
    if (!isHigh) {
      // Slightly lower motion on medium/low
      pointerVelGain *= 0.9;
    }
    if (isLow) {
      pressGain *= 0.9;
      tapGain *= 0.9;
      gyroGain *= 0.75;
    }

    return {
      pointerGamma,
      pointerGain,
      pointerVelGain,
      pressGain,
      tapGain,
      gyroGain,
    };
  }

  private updateRuntimeInteraction(): void {
    const profile = this.getInteractionProfile(this.activeScene.id);

    const px = clamp(
      signedPow(this.pointer.x, profile.pointerGamma) * profile.pointerGain,
      -1,
      1
    );
    const py = clamp(
      signedPow(this.pointer.y, profile.pointerGamma) * profile.pointerGain,
      -1,
      1
    );
    this.runtimePointer.set(px, py);

    this.runtimePointerVelocity
      .copy(this.pointerVelocity)
      .multiplyScalar(profile.pointerVelGain);

    const basePress = clamp(
      Math.max(this.pressTime * 2.0, this.manualPress),
      0,
      1
    );
    this.runtimePress = clamp(
      smoothstep01(basePress) * profile.pressGain,
      0,
      1
    );
    this.runtimeTap = clamp(this.tap * profile.tapGain, 0, 1);

    this.runtimeGyro.copy(this.gyro).multiplyScalar(profile.gyroGain);

    // Gentle settle-in on scene switches.
    const settle = this.getSceneSettle(this._simTime);
    this.runtimePress *= settle;
    this.runtimeTap *= settle;
    this.runtimeGyro.multiplyScalar(settle);
    this.runtimePointerVelocity.multiplyScalar(0.85 + 0.15 * settle);
  }

  private installInput(): void {
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      this.setPointerTarget(event.clientX, event.clientY);
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    this.cleanups.push(() =>
      window.removeEventListener('pointermove', onPointerMove)
    );

    const onPointerDown = (event: PointerEvent) => {
      this.pointerDown = true;
      this.tap = 1;
      this.setPointerTarget(event.clientX, event.clientY);
    };
    const onPointerUp = () => {
      this.pointerDown = false;
    };
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
    this.cleanups.push(() =>
      window.removeEventListener('pointerdown', onPointerDown)
    );
    this.cleanups.push(() =>
      window.removeEventListener('pointerup', onPointerUp)
    );
    this.cleanups.push(() =>
      window.removeEventListener('pointercancel', onPointerUp)
    );

    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      this.setPointerTarget(touch.clientX, touch.clientY);
    };
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    this.cleanups.push(() =>
      window.removeEventListener('touchmove', onTouchMove)
    );

    // Gyroscope support for mobile parallax
    this.initGyroscope();
  }

  private initGyroscope(): void {
    // Check if DeviceOrientationEvent is available
    if (typeof DeviceOrientationEvent === 'undefined') return;

    // For iOS 13+, we need to request permission
    const requestPermission = (
      DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<string>;
      }
    ).requestPermission;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha === null || event.beta === null || event.gamma === null)
        return;

      this.gyroActive = true;

      // Normalize values to -1 to 1 range
      // beta: front-back tilt (-180 to 180, typically -90 to 90 in portrait)
      // gamma: left-right tilt (-90 to 90)
      // alpha: compass direction (0 to 360)

      const beta = clamp((event.beta - 45) / 45, -1, 1); // Center around 45 degrees (holding phone)
      const gamma = clamp(event.gamma / 45, -1, 1);
      const alpha = (event.alpha || 0) / 180 - 1; // Normalize to -1 to 1

      this.gyroTarget.set(gamma, beta, alpha);
    };

    if (requestPermission) {
      // iOS 13+ requires permission request
      const enableGyro = async () => {
        try {
          const response = await requestPermission();
          if (response === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation, {
              passive: true,
            });
            this.cleanups.push(() =>
              window.removeEventListener('deviceorientation', handleOrientation)
            );
          }
        } catch (e) {
          console.warn('Gyroscope permission denied:', e);
        }
      };

      // Request on first touch interaction
      const requestOnTouch = () => {
        enableGyro();
        window.removeEventListener('touchstart', requestOnTouch);
      };
      window.addEventListener('touchstart', requestOnTouch, {
        passive: true,
        once: true,
      });
    } else {
      // Android and other platforms
      window.addEventListener('deviceorientation', handleOrientation, {
        passive: true,
      });
      this.cleanups.push(() =>
        window.removeEventListener('deviceorientation', handleOrientation)
      );
    }
  }

  private setPointerTarget(x: number, y: number): void {
    // Account for canvas offset within the page
    const rect = this.canvas.getBoundingClientRect();
    const localX = x - rect.left;
    const localY = y - rect.top;
    const nx = (localX / Math.max(1, rect.width)) * 2 - 1;
    const ny = (localY / Math.max(1, rect.height)) * 2 - 1;
    this.pointerTarget.set(clamp(nx, -1, 1), clamp(ny, -1, 1));
  }

  public syncSize(force: boolean = false): void {
    // Prefer layout sizes (clientWidth/Height) so CSS transforms (e.g. pinch preview)
    // don't corrupt the renderer sizing and cause off-center/clipped rendering.
    const w = Math.max(
      1,
      Math.round(
        this.canvas.clientWidth || this.canvas.getBoundingClientRect().width
      )
    );
    const h = Math.max(
      1,
      Math.round(
        this.canvas.clientHeight || this.canvas.getBoundingClientRect().height
      )
    );
    if (!force && w === this.size.width && h === this.size.height) return;

    const baseDpr = Math.max(1, this.caps.devicePixelRatio);
    const capDpr = this.caps.coarsePointer ? 2 : 2.5;
    const targetDpr = Math.min(this.caps.maxDpr, capDpr, baseDpr);

    this.size = { width: w, height: h, dpr: targetDpr };
    this.renderer.setPixelRatio(this.size.dpr);
    this.renderer.setSize(w, h, false);

    this.composer.setSize(w, h);

    const res = this.finalPass.uniforms.uResolution?.value as
      | THREE.Vector2
      | undefined;
    res?.set(w * this.size.dpr, h * this.size.dpr);

    if (this.bloomPass) {
      this.bloomPass.resolution.set(w * this.size.dpr, h * this.size.dpr);
    }

    if (this.fxaaPass) {
      const pixelRatio = this.renderer.getPixelRatio();
      // FXAA expects inverse resolution (1/width, 1/height)
      const uRes = this.fxaaPass.uniforms['resolution'].value;
      uRes.x = 1 / (w * pixelRatio);
      uRes.y = 1 / (h * pixelRatio);
    }
  }

  private computeScroll(dt: number): void {
    // In gallery mode, use external progress control
    if (this.galleryMode) {
      this.scrollProgress = this.galleryProgress;
      this.scrollProgressTarget = this.galleryProgress;

      // Calculate scene index from progress
      const count = Math.max(1, this.scenes.length);
      const pos = this.scrollProgress * (count - 1);
      const idx = clamp(Math.round(pos), 0, count - 1);
      this.sceneIndex = idx;

      // Normalized local progress within the current scene window.
      // We switch scenes at midpoints (round), so define a +/- 0.5 range around idx.
      // Edge scenes have half-width windows.
      const start = idx <= 0 ? 0 : idx - 0.5;
      const end = idx >= count - 1 ? count - 1 : idx + 0.5;
      const span = Math.max(0.0001, end - start);
      this.localProgress = clamp((pos - start) / span, 0, 1);
      return;
    }

    // Original scroll-based computation
    const rect = this.root.getBoundingClientRect();
    const total = rect.height - Math.max(1, this.size.height);
    const progress = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;
    this.scrollProgressTarget = progress;
    const now = performance.now();
    const dtMs = Math.max(16, now - this.lastScrollTime);
    this.scrollVelocity = (progress - this.lastScrollProgress) / (dtMs / 1000);
    this.lastScrollProgress = progress;
    this.lastScrollTime = now;

    // Smooth the mapping so a single wheel tick doesn't instantly jump scenes.
    this.scrollProgress = damp(this.scrollProgress, progress, 10, dt);

    const count = Math.max(1, this.chapters.length);
    const pos = this.scrollProgress * count;
    const idx = clamp(Math.floor(pos), 0, count - 1);
    this.sceneIndex = idx;
    this.localProgress = pos - idx;
  }

  // Gallery mode API
  public getProgress(): number {
    return this.scrollProgress;
  }

  public setProgress(value: number): void {
    this.galleryProgress = clamp(value, 0, 1);
  }

  public getSceneCount(): number {
    return this.scenes.length;
  }

  public getCurrentSceneIndex(): number {
    return this.sceneIndex;
  }

  /**
   * Deterministic scene jump primarily for automation/debug.
   * Sets the gallery progress and immediately swaps the active scene.
   */
  public jumpToSceneIndex(index: number): void {
    const count = Math.max(1, this.scenes.length);
    const idx = clamp(Math.round(index), 0, count - 1);

    const progress = count <= 1 ? 0 : idx / (count - 1);
    this.galleryProgress = progress;
    this.scrollProgress = progress;
    this.scrollProgressTarget = progress;
    this.sceneIndex = idx;
    this.localProgress = 0;

    const targetScene = this.scenes[idx];
    if (!targetScene) return;

    const targetSceneId = targetScene.id;
    if (this.root.dataset.towerScene !== targetSceneId) {
      this.root.dataset.towerScene = targetSceneId;
    }

    if (targetScene.id !== this.activeScene.id) {
      try {
        this.mainScene.remove(this.activeScene.group);
      } catch {
        // best-effort
      }
      this.activeScene = targetScene;

      const now = performance.now() / 1000;
      this.sceneEnterTime = now;

      this.updateParticleConfig(this.activeScene.id);
      this.applySceneLook(this.activeScene.id);

      this.cutFade = 1;
      this.transitionType = (this.transitionType + 1) % 4;
      this.finalPass.uniforms.uTransitionType.value = this.transitionType;
    }

    if (this.activeScene.group.parent !== this.mainScene) {
      this.mainScene.add(this.activeScene.group);
    }
    if (this.gpgpu.group.parent !== this.mainScene) {
      this.mainScene.add(this.gpgpu.group);
    }
  }

  private resetViewport(): void {
    this.renderer.setScissorTest(false);
    // WebGLRenderer.setViewport expects logical pixels; it applies pixelRatio internally.
    // Passing physical pixels here can over-scale and crop the output.
    this.renderer.setViewport(0, 0, this.size.width, this.size.height);
  }

  private resolveSceneId(): string {
    // In gallery mode, use scene index directly
    if (this.galleryMode) {
      const scene = this.scenes[this.sceneIndex];
      if (scene) return scene.id;
    }

    const chapterScene = this.chapters[this.sceneIndex]?.dataset.scene;
    if (chapterScene && this.sceneById.has(chapterScene)) return chapterScene;

    const fromDataset = this.root.dataset.towerScene || this.root.dataset.scene;
    if (fromDataset && this.sceneById.has(fromDataset)) return fromDataset;

    return this.activeScene.id;
  }

  private updateParticleConfig(sceneId: string) {
    // Map Scene ID to GPGPU Configuration
    switch (sceneId) {
      case 'scene00': // Magma
        this.gpgpu.mode = ParticleMode.EXPLODE; // Embers
        this.gpgpu.color.setHex(0xffaa00);
        this.gpgpu.speed = 1.5;
        break;
      case 'scene01': // Liquid Metal
        this.gpgpu.mode = ParticleMode.IDLE;
        this.gpgpu.color.setHex(0xaaccff);
        this.gpgpu.speed = 0.5;
        break;
      case 'scene02': // Fireflies
        this.gpgpu.mode = ParticleMode.IDLE;
        this.gpgpu.color.setHex(0xaaff00);
        this.gpgpu.speed = 0.2;
        break;
      case 'scene07': // Matrix
        this.gpgpu.mode = ParticleMode.RAIN;
        this.gpgpu.color.setHex(0x00ff00);
        this.gpgpu.speed = 2.0;
        break;
      case 'scene08': // Space
        this.gpgpu.mode = ParticleMode.VORTEX;
        this.gpgpu.color.setHex(0xaa88ff);
        this.gpgpu.speed = 0.8;
        break;
      case 'scene09': // Crystal
      case 'scene06': // Kaleido
        this.gpgpu.mode = ParticleMode.IDLE;
        this.gpgpu.color.setHex(0xffffff);
        this.gpgpu.speed = 0.1;
        break;
      case 'scene13': // Biolum
        this.gpgpu.mode = ParticleMode.IDLE;
        this.gpgpu.color.setHex(0x0044ff);
        this.gpgpu.speed = 0.4;
        break;
      case 'scene16': // Electric Storm
        this.gpgpu.mode = ParticleMode.VORTEX;
        this.gpgpu.color.setHex(0x00ffff);
        this.gpgpu.speed = 3.0;
        break;
      default:
        this.gpgpu.mode = ParticleMode.IDLE;
        this.gpgpu.color.setHex(0x555555);
        this.gpgpu.speed = 0.5;
        break;
    }
  }

  private applySceneLook(sceneId: string): void {
    if (this.lastAppliedLookSceneId === sceneId) return;
    this.lastAppliedLookSceneId = sceneId;

    const postEnabled = this.caps.enablePostProcessing;
    const tier = this.caps.performanceTier;
    const highTier = tier === 'high';
    const mediumTier = tier === 'medium';

    // Baselines (kept close to existing defaults)
    const base = {
      bloom: {
        enabled: postEnabled,
        strength: this.caps.coarsePointer ? 0.5 : 0.6,
        threshold: 0.85,
        radius: 0.4,
      },
      bokeh: {
        enabled:
          postEnabled &&
          highTier &&
          !this.caps.coarsePointer &&
          !this.caps.reducedMotion,
        aperture: 0.0001,
        maxblur: 0.01,
      },
      trails: {
        enabled: postEnabled && !this.caps.reducedMotion && highTier,
        damp: 0.0,
      },
      final: {
        vignette: 0.12,
        grain: this.caps.coarsePointer ? 0.035 : highTier ? 0.045 : 0.04,
        chromatic: this.caps.coarsePointer ? 0.0025 : 0.003,
      },
      clear: 0x05070f,
    };

    // Scene-by-scene subtle tuning (tasteful, not noisy)
    // Values are deliberately small deltas from the baseline.
    const looks: Record<
      string,
      Partial<{
        bloom: Partial<typeof base.bloom>;
        bokeh: Partial<typeof base.bokeh>;
        trails: Partial<typeof base.trails>;
        final: Partial<typeof base.final>;
        clear: number;
      }>
    > = {
      scene00: {
        bloom: { strength: 0.65, threshold: 0.84 },
        final: { vignette: 0.11 },
        clear: 0x07060a,
      },
      scene01: {
        bloom: { strength: 0.62, threshold: 0.83 },
        bokeh: { aperture: 0.00012 },
        clear: 0x05060b,
      },
      scene02: {
        bloom: { strength: 0.58, threshold: 0.86 },
        final: { grain: this.caps.coarsePointer ? 0.03 : 0.04 },
        clear: 0x04060c,
      },
      scene03: {
        bloom: { strength: 0.6, radius: 0.42 },
        final: { chromatic: 0.0032 },
        clear: 0x04050a,
      },
      scene04: {
        bloom: { strength: 0.62, radius: 0.45 },
        final: { vignette: 0.1, grain: this.caps.coarsePointer ? 0.03 : 0.04 },
        clear: 0x02040a,
      },
      scene05: {
        // Event Horizon: keep it dark/readable; subtle DOF on high-tier.
        bloom: { strength: 0.54, threshold: 0.885, radius: 0.38 },
        bokeh: { aperture: 0.000115, maxblur: 0.011 },
        final: { vignette: 0.15, chromatic: 0.0025, grain: 0.038 },
        clear: 0x010108,
      },
      scene06: {
        bloom: { strength: 0.62, threshold: 0.84 },
        bokeh: { aperture: 0.00014 },
        final: { chromatic: 0.0034 },
        clear: 0x05030a,
      },
      scene07: {
        bloom: { strength: 0.6, threshold: 0.86 },
        final: { grain: this.caps.coarsePointer ? 0.032 : 0.05 },
        clear: 0x020305,
      },
      scene08: {
        // Orbital Mechanics: preserve starfield detail; keep highlights crisp.
        bloom: { strength: 0.5, threshold: 0.885, radius: 0.36 },
        final: {
          vignette: 0.115,
          grain: this.caps.coarsePointer ? 0.028 : 0.038,
          chromatic: 0.0024,
        },
        clear: 0x01010a,
      },
      scene09: {
        bloom: { strength: 0.6, threshold: 0.84 },
        final: { chromatic: 0.0033 },
        clear: 0x03030b,
      },
      scene10: {
        bloom: { strength: 0.55, threshold: 0.87 },
        final: {
          grain: this.caps.coarsePointer ? 0.028 : 0.038,
          chromatic: 0.0025,
        },
        clear: 0x02040a,
      },
      scene11: {
        bloom: { strength: 0.62, threshold: 0.85 },
        trails: {
          enabled:
            postEnabled && !this.caps.reducedMotion && (highTier || mediumTier),
          damp: 0.02,
        },
        final: { vignette: 0.11 },
        clear: 0x02030b,
      },
      scene12: {
        // The Library: slightly cleaner highlights; gentle DOF when allowed.
        bloom: { strength: 0.52, threshold: 0.875 },
        bokeh: { aperture: 0.000125, maxblur: 0.0105 },
        final: {
          vignette: 0.14,
          grain: this.caps.coarsePointer ? 0.03 : 0.04,
          chromatic: 0.0027,
        },
        clear: 0x04030b,
      },
      scene13: {
        bloom: { strength: 0.63, threshold: 0.84 },
        final: { vignette: 0.1, grain: this.caps.coarsePointer ? 0.03 : 0.04 },
        clear: 0x01050a,
      },
      scene14: {
        bloom: {
          strength: this.caps.coarsePointer ? 0.55 : 0.7,
          threshold: 0.83,
          radius: 0.45,
        },
        final: { vignette: 0.11 },
        clear: 0x03020a,
      },
      scene15: {
        // Digital Decay: avoid shard blowout; lean into cleaner contrast.
        bloom: { strength: 0.55, threshold: 0.865, radius: 0.38 },
        final: {
          grain: this.caps.coarsePointer ? 0.034 : 0.05,
          vignette: 0.14,
          chromatic: this.caps.coarsePointer ? 0.0024 : 0.0028,
        },
        clear: 0x03030b,
      },
      scene16: {
        bloom: {
          strength: this.caps.coarsePointer ? 0.55 : 0.66,
          threshold: 0.855,
          radius: 0.42,
        },
        trails: {
          enabled:
            postEnabled && !this.caps.reducedMotion && (highTier || mediumTier),
          damp: 0.022,
        },
        final: {
          vignette: 0.115,
          grain: this.caps.coarsePointer ? 0.032 : 0.042,
          chromatic: this.caps.coarsePointer ? 0.0024 : 0.0029,
        },
        clear: 0x01030a,
      },
      scene17: {
        bloom: {
          strength: this.caps.coarsePointer ? 0.45 : 0.54,
          threshold: 0.865,
          radius: 0.36,
        },
        // Porsche: keep the silhouette crisp; DOF is very subtle.
        bokeh: { aperture: 0.000105, maxblur: 0.0095 },
        final: {
          chromatic: 0.0024,
          grain: this.caps.coarsePointer ? 0.028 : 0.038,
          vignette: 0.1,
        },
        clear: 0x02040a,
      },
      scene18: {
        bloom: {
          strength: this.caps.coarsePointer ? 0.4 : 0.48,
          threshold: 0.872,
          radius: 0.32,
        },
        // Showroom: slightly sharper than Porsche; subtle DOF.
        bokeh: { aperture: 0.000085, maxblur: 0.0085 },
        final: {
          chromatic: this.caps.coarsePointer ? 0.0018 : 0.002,
          grain: this.caps.coarsePointer ? 0.022 : 0.03,
          vignette: 0.112,
        },
        clear: 0x010308,
      },
    };

    const look = looks[sceneId] ?? {};

    // Compute targets
    const bloom = { ...base.bloom, ...(look.bloom ?? {}) };
    const bokeh = { ...base.bokeh, ...(look.bokeh ?? {}) };
    const trails = { ...base.trails, ...(look.trails ?? {}) };
    const final = { ...base.final, ...(look.final ?? {}) };

    this.lookBloomEnabled = Boolean(bloom.enabled);
    this.lookBloomStrength = bloom.strength;
    this.lookBloomThreshold = bloom.threshold;
    this.lookBloomRadius = bloom.radius;

    this.lookBokehEnabled = Boolean(bokeh.enabled);
    this.lookBokehAperture = bokeh.aperture;
    this.lookBokehMaxblur = bokeh.maxblur;

    this.lookTrailsEnabled = Boolean(trails.enabled);
    this.lookTrailsDamp = trails.damp;

    this.lookVignette = final.vignette;
    this.lookGrain = final.grain;
    this.lookChromatic = final.chromatic;

    // Background default (only if scene didn't specify one)
    if (!this.activeScene.bg) {
      const clearHex = look.clear ?? base.clear;
      this.activeScene.bg = new THREE.Color(clearHex);
    }

    // Start from low settle and ramp in during tick() for the first ~0.5s.
    this.applyLookToPasses(0);
  }

  public resize(): void {
    this.syncSize(true);
    // Resize composer including depth buffers
    this.composer.setSize(this.size.width, this.size.height);

    const runtime = this.buildRuntime(0, this.lastTime);
    this.scenes.forEach(scene => {
      try {
        scene.resize(runtime);
      } catch (e) {
        console.error(`Scene ${scene.id} resize failed`, e);
      }
    });
  }

  private _simTime = 0;

  public tick(): void {
    if (this.destroyed) return;
    if (!this.isVisible) return; // Pause rendering loop when hidden

    const now = performance.now() / 1000;

    // Update Bokeh Uniforms to match active scene
    if (this.bokehPass) {
      // We have to feed the BokehPass the scene/camera manually because it stores them internally
      // (unlike RenderPass which we update below but BokehPass might not read from RenderPass structure)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.bokehPass as any).scene = this.activeScene.group;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.bokehPass as any).camera = this.activeScene.camera;

      // Update bokeh focus distance based on what we're looking at (usually center 0,0,0)
      // Simple auto-focus: distance to origin
      const dist = this.activeScene.camera.position.distanceTo(
        new THREE.Vector3(0, 0, 0)
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.bokehPass.uniforms as any)['focus'].value = dist;
    }
    const realDt = Math.min(1 / 30, Math.max(1 / 240, now - this.lastTime));
    const dt = realDt * this.timeScale; // Apply time scaling

    if (this._simTime === 0 && this.lastTime > 0) {
      this._simTime = now;
      this.sceneEnterTime = this._simTime;
    }
    this._simTime += dt;

    this.lastTime = now;

    // Use ResizeObserver instead of polling clientWidth in syncSize
    // this.syncSize(false);
    this.computeScroll(realDt);

    const targetSceneId = this.resolveSceneId();
    const targetScene = this.sceneById.get(targetSceneId) ?? this.activeScene;
    if (this.root.dataset.towerScene !== targetSceneId) {
      this.root.dataset.towerScene = targetSceneId;
    }

    // Manage Scene Container
    // This ensures PBR materials work by being inside a Scene with .environment
    if (this.activeScene !== targetScene) {
      // Cleanup old locally
      // But we just use 'add' which reparents automatically in Three.js
    }

    if (targetScene.id !== this.activeScene.id) {
      this.mainScene.remove(this.activeScene.group);
      this.activeScene = targetScene;

      // Reset settle ramp for the new chapter.
      this.sceneEnterTime = this._simTime;

      this.updateParticleConfig(this.activeScene.id);
      this.applySceneLook(this.activeScene.id);

      this.cutFade = 1;
      // Cycle through different transition types for variety
      this.transitionType = (this.transitionType + 1) % 4;
      this.finalPass.uniforms.uTransitionType.value = this.transitionType;
    }

    // Mount Active Content to Main Scene
    // This reparents the group from wherever it was to mainScene
    // Note: If scenes were used elsewhere, this might break things, but here it's fine
    if (this.activeScene.group.parent !== this.mainScene) {
      this.mainScene.add(this.activeScene.group);
    }
    // Mount GPGPU
    if (this.gpgpu.group.parent !== this.mainScene) {
      this.mainScene.add(this.gpgpu.group);
    }

    // Ensure cleanup of other scenes?
    // Three.js removes from old parent when adding to new.
    // But we need to make sure we don't accumulate junk if logic changes.
    // For now, this is efficient.

    // Increased responsiveness for pointer (6 -> 12)
    this.pointer.x = damp(this.pointer.x, this.pointerTarget.x, 12, realDt);
    this.pointer.y = damp(this.pointer.y, this.pointerTarget.y, 12, realDt);
    this.pointerVelocity.set(
      (this.pointer.x - this.lastPointer.x) / Math.max(0.001, realDt),
      (this.pointer.y - this.lastPointer.y) / Math.max(0.001, realDt)
    );
    this.lastPointer.copy(this.pointer);

    // Tap/press interaction signals (works for mouse + touch)
    // Faster reaction on press (18 -> 24)
    this.tap = damp(this.tap, 0, 24, realDt);
    this.pressTime = this.pointerDown
      ? Math.min(1, this.pressTime + realDt)
      : Math.max(0, this.pressTime - realDt * 4);

    // Shape runtime interaction signals (consistent feel across chapters)
    this.updateRuntimeInteraction();

    // Only apply auto-ramped look while settling in, so UI overrides remain usable.
    const settle = this.getSceneSettle(this._simTime);
    if (settle < 0.999) {
      this.applyLookToPasses(settle);
    }

    // Smooth gyroscope values
    this.gyro.x = damp(this.gyro.x, this.gyroTarget.x, 5, realDt);
    this.gyro.y = damp(this.gyro.y, this.gyroTarget.y, 5, realDt);
    this.gyro.z = damp(this.gyro.z, this.gyroTarget.z, 5, realDt);

    this.root.style.setProperty(
      '--tower-scroll',
      this.scrollProgress.toFixed(4)
    );
    this.root.style.setProperty('--tower-local', this.localProgress.toFixed(4));
    this.root.style.setProperty('--tower-vel', this.scrollVelocity.toFixed(4));
    this.root.style.setProperty('--tower-pointer-x', this.pointer.x.toFixed(4));
    this.root.style.setProperty('--tower-pointer-y', this.pointer.y.toFixed(4));
    this.root.dataset.towerSceneIndex = String(this.sceneIndex);

    const runtime = this.buildRuntime(dt, this._simTime);
    this.finalPass.uniforms.uTime.value = this._simTime;

    // Post FX interaction pulse
    this.finalPass.uniforms.uInteract.value = clamp(
      this.runtimeTap + this.runtimePress * 0.35,
      0,
      1
    );

    // Pass gyro influence to post-processing shader for mobile parallax effects
    if (this.gyroActive) {
      this.finalPass.uniforms.uGyroInfluence.value.set(
        this.runtimeGyro.x,
        this.runtimeGyro.y
      );
    } else {
      this.finalPass.uniforms.uGyroInfluence.value.set(0, 0);
    }

    // Audio Update
    this.audio.update(realDt);
    this.finalPass.uniforms.uAudio.value = this.audio.level;
    // this.gpgpu.uniforms is unsafe. Removing unsafe access.
    // The gpgpu updates occur via update() method which we fixed in gpgpu-system.ts

    // NEW: Update pointer velocity uniform for dynamic chromatic aberration
    const pVel = this.runtimePointerVelocity.length();
    this.finalPass.uniforms.uPointerVel.value = clamp(pVel, 0, 10.0);

    // Decay the cut mask quickly; keep it super short under reduced motion.
    const cutLambda = this.caps.reducedMotion ? 18 : 10;
    this.cutFade = damp(this.cutFade, 0, cutLambda, realDt);
    this.finalPass.uniforms.uCut.value = this.cutFade;

    // Auto Rotate
    if (this.autoRotate) {
      this.activeScene.group.rotation.y += dt * 0.2;
    }

    // Update GPGPU
    // Transform pointer to world space approx for attractor
    try {
      this.gpgpu.attractor.set(
        (this.pointer.x - 0.5) * 20,
        (this.pointer.y - 0.5) * -20,
        0
      );
      // Inject audio level into GPGPU update.
      this.gpgpu.setAudioLevel(this.audio.level);

      this.gpgpu.update(this._simTime, dt);
    } catch (e) {
      if (!this.root.dataset.lastGPGPUError) {
        this.reportError('GPGPU Update', e);
        this.root.dataset.lastGPGPUError = '1';
      }
    }

    try {
      this.activeScene.update(runtime);

      // Pro Audio Shake (Subtle camera trauma on bass)
      if (this.audio.bass > 0.4) {
        const shakeStr = (this.audio.bass - 0.4) * 0.05;
        this.activeScene.camera.position.add(
          new THREE.Vector3(
            (Math.random() - 0.5) * shakeStr,
            (Math.random() - 0.5) * shakeStr,
            (Math.random() - 0.5) * shakeStr
          )
        );
      }
    } catch (e) {
      // Report error but don't spam per frame
      if (
        !this.root.dataset.lastError ||
        performance.now() - parseFloat(this.root.dataset.lastError) > 2000
      ) {
        this.reportError(`Scene Update (${this.activeScene.id})`, e);
        this.root.dataset.lastError = performance.now().toString();
      }
    }

    // Update RenderPass to current scene content
    this.renderPass.scene = this.mainScene;
    this.renderPass.camera = this.activeScene.camera;

    // Ensure all other scenes are NOT in the mainScene
    // Iterate scenes, if != active, remove
    // (Optimization: Only do this on change. But we rely on Three.js parenting for now)

    if (this.activeScene.bg) {
      this.renderer.setClearColor(this.activeScene.bg);
    } else {
      this.renderer.setClearColor(new THREE.Color(0x05070f));
    }

    try {
      this.resetViewport();
      if (this.caps.enablePostProcessing && !this.root.dataset.renderError) {
        this.composer.render();
      } else {
        this.renderer.render(this.renderPass.scene, this.renderPass.camera);
      }
    } catch (e) {
      // Fatal render error fallback
      if (!this.root.dataset.renderError) {
        this.reportError('Composer Render (Fatal)', e);
        this.root.dataset.renderError = '1';
      }
      // Attempt raw render
      try {
        this.renderer.render(this.renderPass.scene, this.renderPass.camera);
      } catch {
        // Even raw render failed
      }
    }

    // Update heartbeat visual to prove loop is alive
    const hb = this.root.querySelector('.tower-heartbeat') as HTMLElement;
    if (hb) {
      hb.style.opacity = Math.sin(now * 10) > 0 ? '1' : '0.2';
    }
  }

  private reportError(context: string, error: unknown) {
    console.error(`[Tower3D] Error in ${context}:`, error);

    const errorObj = error instanceof Error ? error : null;
    const errorMessage =
      errorObj?.message ??
      (error === undefined
        ? 'undefined'
        : error === null
          ? 'null'
          : String(error));
    const errorStack = errorObj?.stack ? String(errorObj.stack) : '';

    // Store last error for automation/debugging (Playwright can read dataset).
    this.root.dataset.towerLastErrorContext = context;
    this.root.dataset.towerLastErrorMessage = errorMessage;
    if (errorStack) {
      // Keep it reasonably small for DOM/dataset.
      this.root.dataset.towerLastErrorStack = errorStack.slice(0, 3000);
    }

    // Create visible error overlay if it doesn't exist
    let overlay = this.root.querySelector('.tower3d-error-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'tower3d-error-overlay';
      Object.assign((overlay as HTMLElement).style, {
        position: 'absolute',
        top: '10px',
        left: '10px',
        zIndex: '9999',
        background: 'rgba(20, 0, 0, 0.9)',
        color: '#ff4444',
        padding: '1rem',
        border: '1px solid #ff4444',
        fontFamily: 'monospace',
        fontSize: '12px',
        maxWidth: '400px',
        pointerEvents: 'none',
      });
      this.root.appendChild(overlay);
    }

    // Append error
    const msg = document.createElement('div');
    const timestamp = new Date().toLocaleTimeString();
    msg.innerText = `[${timestamp}] ${context}: ${errorMessage}`;
    if (errorStack) {
      const stackEl = document.createElement('div');
      stackEl.style.whiteSpace = 'pre-wrap';
      stackEl.style.marginTop = '0.5rem';
      stackEl.innerText = errorStack;
      msg.appendChild(stackEl);
    }
    overlay.appendChild(msg);

    // Prevent overlay from growing infinitely
    if (overlay.children.length > 5) {
      overlay.removeChild(overlay.firstChild!);
    }
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    document.removeEventListener('visibilitychange', this.handleVisibility);
    this.resizeObserver.disconnect();

    this.cleanups.forEach(fn => fn());
    this.cleanups = [];

    try {
      this.gpgpu.dispose();
    } catch {
      // ignore
    }

    this.scenes.forEach(scene => scene.dispose());

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyPass = this.finalPass as any;
      (anyPass?.material as THREE.Material | undefined)?.dispose?.();
    } catch {
      // ignore
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyPass = this.fxaaPass as any;
      (anyPass?.material as THREE.Material | undefined)?.dispose?.();
    } catch {
      // ignore
    }

    try {
      // EffectComposer in modern three has dispose()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.composer as any)?.dispose?.();
    } catch {
      // ignore
    }

    try {
      this.renderTarget?.dispose?.();
    } catch {
      // ignore
    }

    try {
      this.environmentTexture?.dispose?.();
      this.pmremGenerator?.dispose?.();
    } catch {
      // ignore
    }

    this.renderer.dispose();
  }
}
