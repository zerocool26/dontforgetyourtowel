import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import gsap from 'gsap';
import { TransitionPass } from './transition-pass';

type SceneId =
  | 'ignite'
  | 'prism'
  | 'swarm'
  | 'rift'
  | 'singularity'
  | 'afterglow';

type SceneConfig = {
  hue: number;
  hue2: number;
  grade: number;
  heroScale: number;
  heroTwist: number;
  orbRadius: number;
  particleRadius: number;
  ringScale: number;
  lightPower: number;
  camZ: number;
  fog: number;
};

const SCENES: SceneId[] = [
  'ignite',
  'prism',
  'swarm',
  'rift',
  'singularity',
  'afterglow',
];

const SCENE_CONFIG: Record<SceneId, SceneConfig> = {
  ignite: {
    hue: 205,
    hue2: 265,
    grade: 0.18,
    heroScale: 1.05,
    heroTwist: 0.7,
    orbRadius: 2.0,
    particleRadius: 5.5,
    ringScale: 1.1,
    lightPower: 1.2,
    camZ: 7.2,
    fog: 0.06,
  },
  prism: {
    hue: 235,
    hue2: 285,
    grade: 0.25,
    heroScale: 1.1,
    heroTwist: 1.3,
    orbRadius: 2.3,
    particleRadius: 6.2,
    ringScale: 1.25,
    lightPower: 1.35,
    camZ: 7.4,
    fog: 0.065,
  },
  swarm: {
    hue: 260,
    hue2: 300,
    grade: 0.32,
    heroScale: 1.18,
    heroTwist: 1.6,
    orbRadius: 2.6,
    particleRadius: 7.0,
    ringScale: 1.35,
    lightPower: 1.55,
    camZ: 7.8,
    fog: 0.07,
  },
  rift: {
    hue: 285,
    hue2: 330,
    grade: 0.36,
    heroScale: 1.22,
    heroTwist: 2.1,
    orbRadius: 2.9,
    particleRadius: 7.6,
    ringScale: 1.5,
    lightPower: 1.7,
    camZ: 8.2,
    fog: 0.075,
  },
  singularity: {
    hue: 310,
    hue2: 350,
    grade: 0.42,
    heroScale: 0.95,
    heroTwist: 2.6,
    orbRadius: 1.8,
    particleRadius: 5.0,
    ringScale: 0.9,
    lightPower: 1.9,
    camZ: 6.8,
    fog: 0.085,
  },
  afterglow: {
    hue: 28,
    hue2: 45,
    grade: 0.28,
    heroScale: 1.3,
    heroTwist: 1.1,
    orbRadius: 3.2,
    particleRadius: 7.8,
    ringScale: 1.6,
    lightPower: 1.45,
    camZ: 8.6,
    fog: 0.06,
  },
};

const FilmicShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    grainIntensity: { value: 0.035 },
    chromaticAberration: { value: 0.0012 },
    vignetteIntensity: { value: 0.25 },
    vignetteSmoothness: { value: 0.4 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float grainIntensity;
    uniform float chromaticAberration;
    uniform float vignetteIntensity;
    uniform float vignetteSmoothness;
    varying vec2 vUv;

    float random(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      vec2 center = uv - 0.5;

      float dist = length(center);
      vec2 dir = center * chromaticAberration * dist;
      float r = texture2D(tDiffuse, uv + dir).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv - dir).b;
      vec3 color = vec3(r, g, b);

      float vignette = 1.0 -
        smoothstep(vignetteSmoothness, 0.9, dist * vignetteIntensity * 2.0);
      color *= vignette;

      float grain = random(uv + fract(time * 0.01)) * 2.0 - 1.0;
      color += grain * grainIntensity;

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const smoothstep = (t: number) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};

const hash = (n: number) => {
  const x = Math.sin(n) * 43758.5453123;
  return x - Math.floor(x);
};

const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

const blendConfig = (
  a: SceneConfig,
  b: SceneConfig,
  t: number
): SceneConfig => ({
  hue: lerp(a.hue, b.hue, t),
  hue2: lerp(a.hue2, b.hue2, t),
  grade: lerp(a.grade, b.grade, t),
  heroScale: lerp(a.heroScale, b.heroScale, t),
  heroTwist: lerp(a.heroTwist, b.heroTwist, t),
  orbRadius: lerp(a.orbRadius, b.orbRadius, t),
  particleRadius: lerp(a.particleRadius, b.particleRadius, t),
  ringScale: lerp(a.ringScale, b.ringScale, t),
  lightPower: lerp(a.lightPower, b.lightPower, t),
  camZ: lerp(a.camZ, b.camZ, t),
  fog: lerp(a.fog, b.fog, t),
});

type OrbitNode = {
  radius: number;
  speed: number;
  tilt: number;
  offset: number;
};

type CardNode = {
  radius: number;
  speed: number;
  tilt: number;
  offset: number;
  spin: number;
};

class ImmersiveThreeController {
  private root: HTMLElement;
  private chapters: HTMLElement[];
  private canvas: HTMLCanvasElement;

  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private filmicPass: ShaderPass | null = null;
  private fxaaPass: ShaderPass | null = null;
  private transitionPass: TransitionPass | null = null;
  private environment: THREE.Texture | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
  private group = new THREE.Group();

  private hero: THREE.Mesh;
  private heroAura: THREE.Mesh;
  private heroCore: THREE.Mesh;
  private orbiters: THREE.InstancedMesh;
  private orbitNodes: OrbitNode[] = [];
  private cards!: THREE.InstancedMesh;
  private cardNodes: CardNode[] = [];
  private particlePoints: THREE.Points;
  private particleBase!: Float32Array;
  private particleCount = 1400;
  private orbiterCount = 180;
  private cardCount = 140;
  private stars!: THREE.Points;
  private rings: THREE.Mesh[] = [];

  private hemi: THREE.HemisphereLight;
  private key: THREE.DirectionalLight;
  private fill: THREE.PointLight;

  private lastScrollY = window.scrollY;
  private lastScrollTime = performance.now();
  private lastFrameTime = performance.now() / 1000;

  private pointer = new THREE.Vector2();
  private pointerTarget = new THREE.Vector2();
  private tilt = new THREE.Vector2();
  private kick = new THREE.Vector2();
  private lastPointer = new THREE.Vector2();
  private pointerVelocity = new THREE.Vector2();
  private cameraRoll = 0;

  private burst = 0;
  private event = 0;
  private pinch = 0;
  private pinchTarget = 0;
  private lastChapterIdx = -1;
  private currentChapterIdx = -1;
  private stingerChapterIdx = -1;
  private stingerFired = false;

  private quality = 1;
  private mobileScale = 1;
  private perfLP = 16.7;

  private raf = 0;
  private reducedMotion = false;

  private abortController = new AbortController();

  constructor(root: HTMLElement) {
    this.root = root;
    this.chapters = Array.from(
      root.querySelectorAll<HTMLElement>('[data-ih-chapter]')
    );
    const canvas = root.querySelector<HTMLCanvasElement>('[data-ih-canvas]');
    if (!canvas) {
      throw new Error('Immersive canvas missing');
    }
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
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.setClearColor(new THREE.Color(0x05070f));
    this.scene.background = new THREE.Color(0x05070f);

    void this.loadEnvironment();

    this.scene.add(this.group);
    this.scene.fog = new THREE.FogExp2(0x070b18, 0.06);

    this.stars = this.createStars();
    this.scene.add(this.stars);

    this.hero = this.createHero();
    this.heroAura = this.createHeroAura();
    this.heroCore = this.createHeroCore();

    this.group.add(this.hero, this.heroAura, this.heroCore);
    this.orbiters = this.createOrbiters();
    this.group.add(this.orbiters);

    this.cards = this.createCards();
    this.group.add(this.cards);

    this.particlePoints = this.createParticles();
    this.group.add(this.particlePoints);

    this.rings = this.createRings();
    this.rings.forEach(r => this.group.add(r));

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x080a12, 0.6);
    this.key = new THREE.DirectionalLight(0xffffff, 1.4);
    this.key.position.set(4, 6, 4);
    this.fill = new THREE.PointLight(0xffffff, 1.2, 30, 2);
    this.fill.position.set(-5, -2, 6);

    this.scene.add(this.hemi, this.key, this.fill);

    this.init();
  }

  private createHero(): THREE.Mesh {
    const geo = new THREE.IcosahedronGeometry(1.1, 5);
    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color().setHSL(0.58, 0.85, 0.55),
      metalness: 0.65,
      roughness: 0.2,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
      reflectivity: 0.6,
      transmission: 0.14,
      thickness: 0.7,
      ior: 1.25,
      iridescence: 0.35,
      iridescenceIOR: 1.3,
      attenuationDistance: 1.6,
      attenuationColor: new THREE.Color(0x4a7cff),
    });
    return new THREE.Mesh(geo, mat);
  }

  private createHeroAura(): THREE.Mesh {
    const geo = new THREE.SphereGeometry(1.35, 48, 48);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.62, 0.9, 0.6),
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return new THREE.Mesh(geo, mat);
  }

  private createHeroCore(): THREE.Mesh {
    const geo = new THREE.SphereGeometry(0.5, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.6, 0.85, 0.55),
      emissive: new THREE.Color().setHSL(0.6, 0.9, 0.4),
      emissiveIntensity: 0.9,
      roughness: 0.35,
      metalness: 0.2,
    });
    return new THREE.Mesh(geo, mat);
  }

  private createStars(): THREE.Points {
    const count = 1200;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const r = 25 + Math.random() * 35;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[idx] = r * Math.sin(phi) * Math.cos(theta);
      positions[idx + 1] = r * Math.cos(phi);
      positions[idx + 2] = r * Math.sin(phi) * Math.sin(theta);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: new THREE.Color(0xffffff),
      size: 0.045,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Points(geo, mat);
  }

  private createCards(): THREE.InstancedMesh {
    const geo = new THREE.PlaneGeometry(0.35, 0.8);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.62, 0.7, 0.6),
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const mesh = new THREE.InstancedMesh(geo, mat, this.cardCount);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.cardNodes = Array.from({ length: this.cardCount }).map(() => ({
      radius: 2.2 + Math.random() * 5,
      speed: 0.2 + Math.random() * 0.8,
      tilt: (Math.random() - 0.5) * 1.5,
      offset: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 1.6,
    }));

    return mesh;
  }

  private createOrbiters(): THREE.InstancedMesh {
    const count = this.orbiterCount;
    const geo = new THREE.DodecahedronGeometry(0.09, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.58, 0.8, 0.6),
      emissive: new THREE.Color().setHSL(0.58, 0.8, 0.35),
      emissiveIntensity: 0.6,
      roughness: 0.4,
      metalness: 0.4,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.orbitNodes = Array.from({ length: count }).map((_, i) => ({
      radius: 1.8 + (i % 10) * 0.08 + Math.random() * 0.8,
      speed: 0.4 + Math.random() * 1.2,
      tilt: (Math.random() - 0.5) * 1.2,
      offset: Math.random() * Math.PI * 2,
    }));

    return mesh;
  }

  private createParticles(): THREE.Points {
    const count = this.particleCount;
    const positions = new Float32Array(count * 3);
    const base = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const u = Math.random();
      const v = Math.random();
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = 1.4 + Math.random() * 3.2;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);

      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;

      base[idx] = x;
      base[idx + 1] = y;
      base[idx + 2] = z;
    }

    this.particleBase = base;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: new THREE.Color().setHSL(0.6, 0.9, 0.65),
      size: 0.035,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Points(geo, mat);
  }

  private createRings(): THREE.Mesh[] {
    const rings: THREE.Mesh[] = [];
    const ringGeo = new THREE.TorusGeometry(2.2, 0.05, 16, 160);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.6, 0.85, 0.6),
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(ringGeo, mat.clone());
      ring.rotation.x = Math.random() * Math.PI;
      ring.rotation.y = Math.random() * Math.PI;
      ring.rotation.z = Math.random() * Math.PI;
      rings.push(ring);
    }

    return rings;
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
        this.burst = Math.min(1, this.burst + 0.75);
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

    window.addEventListener(
      'deviceorientation',
      evt => {
        if (this.reducedMotion) return;
        const gx = typeof evt.gamma === 'number' ? evt.gamma / 45 : 0;
        const by = typeof evt.beta === 'number' ? evt.beta / 45 : 0;
        this.tilt.set(
          clamp(gx * 0.25, -0.35, 0.35),
          clamp(by * 0.2, -0.35, 0.35)
        );
      },
      { passive: true, signal }
    );

    const onResize = () => this.resize();
    window.addEventListener('resize', onResize, { passive: true, signal });

    this.resize();
    this.loop();
  }

  private resize(): void {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.mobileScale = width < 640 ? 0.7 : width < 1024 ? 0.85 : 1;
    const baseDpr = clamp(window.devicePixelRatio || 1, 1, 2);
    const ratio = clamp(baseDpr * this.quality * this.mobileScale, 0.7, 2);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);

    this.setupComposer(width, height, ratio);
  }

  private setupComposer(width: number, height: number, ratio: number): void {
    if (!this.composer) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.45,
        0.5,
        0.75
      );
      this.composer.addPass(this.bloomPass);

      this.fxaaPass = new ShaderPass(FXAAShader);
      this.composer.addPass(this.fxaaPass);

      this.transitionPass = new TransitionPass();
      this.composer.addPass(this.transitionPass);

      this.filmicPass = new ShaderPass(FilmicShader);
      this.composer.addPass(this.filmicPass);
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
      if (this.environment) {
        this.environment.dispose();
      }
      this.environment = texture;
      this.scene.environment = texture;
    };

    try {
      const rgbeLoader = new RGBELoader();
      const hdrTexture = await rgbeLoader.loadAsync('/hdr/studio_small.hdr');
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
    const scene = (this.chapters[idx]?.dataset.scene ?? 'ignite') as SceneId;
    return { scene, idx, localT };
  }

  private update(dt: number, time: number): void {
    const { progress, velocity } = this.computeScroll();
    const { scene, idx, localT } = this.chapterFromProgress(progress);

    const nextScene = (this.chapters[
      Math.min(idx + 1, this.chapters.length - 1)
    ]?.dataset.scene ?? scene) as SceneId;

    const blendT = smoothstep(localT);
    const config = blendConfig(
      SCENE_CONFIG[scene] ?? SCENE_CONFIG.ignite,
      SCENE_CONFIG[nextScene] ?? SCENE_CONFIG.ignite,
      blendT
    );

    const frameDtMs = clamp((time - this.lastFrameTime) * 1000, 8, 50);
    this.lastFrameTime = time;
    this.perfLP = lerp(this.perfLP, frameDtMs, 0.06);

    const baseQuality = this.perfLP < 18 ? 1 : this.perfLP < 24 ? 0.85 : 0.7;
    const targetQuality = clamp(baseQuality * this.mobileScale, 0.6, 1);
    this.quality = damp(this.quality, targetQuality, 2, dt);

    // Burst decays; scroll velocity injects energy.
    this.burst = clamp(this.burst * 0.92 + velocity * 0.22, 0, 1);
    this.pinch = damp(this.pinch, this.pinchTarget, 6, dt);
    this.kick.x += (Math.random() - 0.5) * this.burst * 0.02;
    this.kick.y += (Math.random() - 0.5) * this.burst * 0.015;

    // Chapter transitions trigger a cinematic event pulse.
    if (idx !== this.lastChapterIdx) {
      this.lastChapterIdx = idx;
      this.event = 1;
      this.burst = Math.min(1, this.burst + 0.55);

      this.stingerChapterIdx = idx;
      this.stingerFired = false;
    }

    if (idx !== this.currentChapterIdx) {
      this.currentChapterIdx = idx;
      if (this.transitionPass) {
        gsap.to(this.transitionPass.uniforms.intensity, {
          value: 0.6,
          duration: 0.15,
          ease: 'expo.out',
          onComplete: () => {
            gsap.to(this.transitionPass?.uniforms.intensity ?? { value: 0 }, {
              value: 0,
              duration: 0.4,
              ease: 'expo.out',
            });
          },
        });
      }
    }

    if (!this.stingerFired && idx === this.stingerChapterIdx && localT > 0.7) {
      this.stingerFired = true;
      this.event = 1;
      this.burst = Math.min(1, this.burst + 0.35);
      const jx = (hash(idx * 13.1 + time) - 0.5) * 0.22;
      const jy = (hash(idx * 7.7 + time + 4.2) - 0.5) * 0.18;
      this.kick.set(jx, jy);
    }
    this.event = clamp(this.event * 0.9, 0, 1);

    // Stars drift (subtle cinematic depth)
    this.stars.rotation.y = time * 0.045;
    this.stars.rotation.x = time * 0.02;

    // Pointer smoothing
    this.pointer.x = damp(
      this.pointer.x,
      this.pointerTarget.x + this.tilt.x + this.kick.x,
      6,
      dt
    );
    this.pointer.y = damp(
      this.pointer.y,
      this.pointerTarget.y + this.tilt.y + this.kick.y,
      6,
      dt
    );
    this.kick.multiplyScalar(0.9);

    this.pointerVelocity.set(
      (this.pointer.x - this.lastPointer.x) / Math.max(0.001, dt),
      (this.pointer.y - this.lastPointer.y) / Math.max(0.001, dt)
    );
    this.lastPointer.copy(this.pointer);

    // Scene-specific effects
    const collapse =
      scene === 'singularity' ? smoothstep((localT - 0.2) / 0.6) : 0;
    const flip = scene === 'rift' ? smoothstep((localT - 0.3) / 0.5) : 0;
    const shear = scene === 'prism' ? smoothstep((localT - 0.2) / 0.6) : 0;

    // Update hero
    const heroScale =
      config.heroScale * (1 + this.burst * 0.08 - collapse * 0.12);
    this.hero.scale.setScalar(heroScale);
    this.hero.rotation.x = time * 0.15 + this.pointer.y * 0.6 + shear * 0.3;
    this.hero.rotation.y =
      time * 0.2 + this.pointer.x * 0.6 + config.heroTwist * 0.2;
    this.hero.rotation.z = time * 0.08 + flip * Math.PI * 0.35;

    const heroMat = this.hero.material as THREE.MeshPhysicalMaterial;
    const color = new THREE.Color().setHSL(config.hue / 360, 0.85, 0.55);
    heroMat.color.copy(color);
    heroMat.emissive = new THREE.Color().setHSL(config.hue2 / 360, 0.9, 0.2);
    heroMat.emissiveIntensity = 0.35 + this.burst * 0.6 + this.event * 0.35;

    const auraMat = this.heroAura.material as THREE.MeshBasicMaterial;
    auraMat.color.setHSL(config.hue / 360, 0.85, 0.6);
    auraMat.opacity = 0.08 + this.burst * 0.12 + this.event * 0.08;

    const coreMat = this.heroCore.material as THREE.MeshStandardMaterial;
    coreMat.color.setHSL(config.hue2 / 360, 0.85, 0.5);
    coreMat.emissive.setHSL(config.hue2 / 360, 0.9, 0.35);
    coreMat.emissiveIntensity = 0.8 + this.burst * 0.4;

    // Orbiters
    const temp = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const orbitMat = this.orbiters.material as THREE.MeshStandardMaterial;
    orbitMat.color.setHSL(config.hue / 360, 0.8, 0.6);
    orbitMat.emissive.setHSL(config.hue2 / 360, 0.9, 0.35);
    orbitMat.emissiveIntensity = 0.6 + this.burst * 0.35;

    const orbiterActive = Math.max(
      30,
      Math.floor(
        this.orbitNodes.length * (0.6 + this.quality * 0.4) * this.mobileScale
      )
    );
    this.orbiters.count = orbiterActive;

    for (let i = 0; i < orbiterActive; i += 1) {
      const node = this.orbitNodes[i];
      const angle = time * node.speed + node.offset;
      const radius = node.radius * config.orbRadius * (1 - collapse * 0.35);
      const height = Math.sin(angle * 0.7 + node.tilt) * 0.8;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = height + shear * x * 0.15;
      pos.set(x, y, z);
      temp.makeTranslation(pos.x, pos.y, pos.z);
      this.orbiters.setMatrixAt(i, temp);
    }
    this.orbiters.instanceMatrix.needsUpdate = true;

    // Cards (glassy panels)
    const cardActive = Math.max(
      30,
      Math.floor(
        this.cardNodes.length * (0.55 + this.quality * 0.45) * this.mobileScale
      )
    );
    this.cards.count = cardActive;
    const cardMat = new THREE.Matrix4();
    const cardQuat = new THREE.Quaternion();
    const cardPos = new THREE.Vector3();
    const cardScale = new THREE.Vector3();
    const cardMaterial = this.cards.material as THREE.MeshBasicMaterial;
    cardMaterial.color.setHSL(config.hue2 / 360, 0.75, 0.6);
    cardMaterial.opacity = 0.16 + this.event * 0.12 + this.burst * 0.08;

    for (let i = 0; i < cardActive; i += 1) {
      const node = this.cardNodes[i];
      const angle = time * node.speed + node.offset;
      const radius = node.radius * (1 + config.ringScale * 0.4);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = Math.sin(angle * 1.3 + node.tilt) * 0.8;
      cardPos.set(x, y, z);
      cardQuat.setFromEuler(
        new THREE.Euler(
          node.tilt + shear * 0.4,
          angle * 0.6,
          node.spin + time * 0.2
        )
      );
      cardScale.setScalar(0.9 + this.event * 0.15);
      cardMat.compose(cardPos, cardQuat, cardScale);
      this.cards.setMatrixAt(i, cardMat);
    }
    this.cards.instanceMatrix.needsUpdate = true;

    // Particles
    const positions = this.particlePoints.geometry.attributes.position
      .array as Float32Array;
    const particleScale = config.particleRadius * (1 - collapse * 0.4);
    for (let i = 0; i < positions.length; i += 3) {
      const bx = this.particleBase[i];
      const by = this.particleBase[i + 1];
      const bz = this.particleBase[i + 2];
      positions[i] = bx * particleScale;
      positions[i + 1] = by * particleScale * (flip ? -1 : 1);
      positions[i + 2] = bz * particleScale;
    }
    this.particlePoints.geometry.attributes.position.needsUpdate = true;
    const drawCount = Math.max(
      360,
      Math.floor(
        this.particleCount * (0.55 + this.quality * 0.45) * this.mobileScale
      )
    );
    this.particlePoints.geometry.setDrawRange(0, drawCount);
    const pointsMat = this.particlePoints.material as THREE.PointsMaterial;
    pointsMat.color.setHSL(config.hue2 / 360, 0.9, 0.65);
    pointsMat.opacity = 0.5 + this.burst * 0.2;
    pointsMat.size = 0.03 + this.quality * 0.015 + this.event * 0.01;

    // Rings
    this.rings.forEach((ring, i) => {
      ring.scale.setScalar(config.ringScale * (1 + i * 0.08));
      ring.rotation.x += 0.002 + i * 0.0004;
      ring.rotation.y += 0.003 + i * 0.0006;
      ring.rotation.z += 0.002;
      const ringMat = ring.material as THREE.MeshBasicMaterial;
      ringMat.color.setHSL(config.hue / 360, 0.85, 0.6);
      ringMat.opacity = 0.2 + this.event * 0.2 + this.burst * 0.15;
    });

    // Group and camera
    this.group.rotation.x = this.pointer.y * -0.25;
    this.group.rotation.y = this.pointer.x * 0.3 + time * 0.05;
    this.group.rotation.z = (progress - 0.5) * 0.2 + shear * 0.4;
    this.group.scale.setScalar(1 + this.event * 0.05);

    const dolly = (progress - 0.5) * 1.2;
    const breathX = Math.sin(time * 0.3) * 0.015;
    const breathY = Math.cos(time * 0.23) * 0.01;
    this.camera.position.x = damp(
      this.camera.position.x,
      this.pointer.x * 1.2 + breathX,
      6,
      dt
    );
    this.camera.position.y = damp(
      this.camera.position.y,
      this.pointer.y * 1.0 + breathY,
      6,
      dt
    );
    this.camera.position.z = config.camZ + dolly;
    const rollTarget = this.pointerVelocity.x * 0.02;
    this.cameraRoll = damp(this.cameraRoll, rollTarget, 4, dt);
    this.camera.lookAt(0, 0, 0);
    this.camera.rotation.z = this.cameraRoll;

    // Lighting & fog
    const lightBreath = 1 + Math.sin(time * 0.5) * 0.05;
    this.key.intensity = 1.2 * config.lightPower * lightBreath;
    this.fill.intensity = 0.9 * config.lightPower * (2 - lightBreath);
    this.hemi.intensity = 0.5 + config.grade * 0.8;
    if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.density = config.fog + this.event * 0.02;
    }

    // Update CSS variables for overlay grading
    this.root.style.setProperty('--ih-scroll', progress.toFixed(4));
    this.root.style.setProperty('--ih-local', localT.toFixed(4));
    this.root.style.setProperty('--ih-vel', velocity.toFixed(4));
    this.root.style.setProperty('--ih-parallax-x', this.pointer.x.toFixed(4));
    this.root.style.setProperty('--ih-parallax-y', this.pointer.y.toFixed(4));
    this.root.style.setProperty('--ih-burst', this.burst.toFixed(4));
    this.root.style.setProperty('--ih-event', this.event.toFixed(4));
    this.root.style.setProperty('--ih-pinch', this.pinch.toFixed(4));
    this.root.style.setProperty('--ih-quality', this.quality.toFixed(4));
    this.root.style.setProperty('--ih-hue', config.hue.toFixed(2));
    this.root.style.setProperty('--ih-hue-2', config.hue2.toFixed(2));
    this.root.style.setProperty('--ih-grade', config.grade.toFixed(3));

    // Adaptive quality resize (only when needed)
    const baseDpr = clamp(window.devicePixelRatio || 1, 1, 2);
    const desiredRatio = clamp(
      baseDpr * this.quality * this.mobileScale,
      0.7,
      2
    );
    if (Math.abs(this.renderer.getPixelRatio() - desiredRatio) > 0.05) {
      this.renderer.setPixelRatio(desiredRatio);
    }

    if (this.bloomPass) {
      this.bloomPass.strength = 0.55 + this.event * 0.7 + this.burst * 0.45;
      this.bloomPass.radius = 0.5 + config.grade * 0.35;
      this.bloomPass.threshold = 0.25 + (1 - config.grade) * 0.25;
    }

    if (this.filmicPass) {
      this.filmicPass.uniforms.time.value = time;
      this.filmicPass.uniforms.grainIntensity.value =
        0.025 + this.burst * 0.02 + this.event * 0.01;
    }

    if (this.transitionPass) {
      this.transitionPass.uniforms.progress.value = progress;
    }

    this.renderer.toneMappingExposure =
      0.95 + config.grade * 0.35 + this.burst * 0.1;

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

      if (!this.reducedMotion) {
        this.update(dt, now);
      }

      this.raf = window.requestAnimationFrame(tick);
    };

    this.raf = window.requestAnimationFrame(tick);
  }

  public destroy(): void {
    window.cancelAnimationFrame(this.raf);
    this.abortController.abort();

    this.renderer.dispose();
    if (this.composer && 'dispose' in this.composer) {
      this.composer.dispose();
    }
    if (this.environment) {
      this.environment.dispose();
    }

    if (this.stars) {
      this.stars.geometry.dispose();
      (this.stars.material as THREE.Material).dispose();
    }

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

  const w = window as unknown as {
    __ihController?: ImmersiveThreeController;
  };

  if (w.__ihController) {
    w.__ihController.destroy();
    w.__ihController = undefined;
  }

  w.__ihController = new ImmersiveThreeController(root);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}

document.addEventListener('astro:page-load', mount);

document.addEventListener('astro:before-swap', () => {
  const w = window as unknown as {
    __ihController?: ImmersiveThreeController;
  };
  if (w.__ihController) {
    w.__ihController.destroy();
    w.__ihController = undefined;
  }
});
