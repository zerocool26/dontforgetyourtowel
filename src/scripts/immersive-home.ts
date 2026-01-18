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
  private pinchTarget = 0;
  private pinch = 0;
  private lastChapterIdx = -1;

  private stars: THREE.Points;
  private membrane: THREE.Mesh;
  private membraneMaterial: THREE.MeshPhysicalMaterial;
  private membraneShader: OnBeforeCompileShader | null = null;

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

    const { mesh: membrane, material: membraneMaterial } =
      this.createMembrane();
    this.membrane = membrane;
    this.membraneMaterial = membraneMaterial;
    this.group.add(this.membrane);

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

  private createMembrane(): {
    mesh: THREE.Mesh;
    material: THREE.MeshPhysicalMaterial;
  } {
    const width = Math.max(1, window.innerWidth);
    const segments = width < 768 ? 70 : 96;
    const geo = new THREE.PlaneGeometry(5.1, 5.1, segments, segments);

    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color().setHSL(0.58, 0.8, 0.56),
      metalness: 0.25,
      roughness: 0.33,
      transmission: 0.12,
      thickness: 0.7,
      ior: 1.2,
      clearcoat: 0.6,
      clearcoatRoughness: 0.25,
      reflectivity: 0.45,
      transparent: true,
      opacity: 0.98,
      emissive: new THREE.Color().setHSL(0.62, 0.9, 0.2),
      emissiveIntensity: 0.16,
    });

    material.onBeforeCompile = shader => {
      this.membraneShader = shader;

      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uEnergy = { value: 0 };
      shader.uniforms.uProgress = { value: 0 };
      shader.uniforms.uAmp = { value: 0.2 };
      shader.uniforms.uFreq = { value: 1.6 };
      shader.uniforms.uMode = { value: 0 };

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>\nuniform float uTime;\nuniform float uEnergy;\nuniform float uProgress;\nuniform float uAmp;\nuniform float uFreq;\nuniform float uMode;`
        )
        .replace(
          '#include <begin_vertex>',
          [
            'vec3 transformed = vec3(position);',
            // A soft falloff so the center breathes more than the edge.
            'float r = length(transformed.xy);',
            'float falloff = smoothstep(2.4, 0.2, r);',
            'float p = uProgress * 6.2831853;',
            'float amp = uAmp * (0.75 + uEnergy * 0.85);',
            'float f = uFreq * (0.9 + uMode * 0.2);',
            'float w1 = sin((transformed.x * f) + (uTime * 1.15) + p);',
            'float w2 = cos((transformed.y * f * 0.92) - (uTime * 1.05) + p);',
            'float w3 = sin((r * f * 1.6) + (uTime * 0.8) - p) * 0.35;',
            'float displacement = (w1 * 0.5 + w2 * 0.5 + w3) * amp * falloff;',
            'transformed.z += displacement;',
          ].join('\n')
        );
    };

    const mesh = new THREE.Mesh(geo, material);
    mesh.rotation.x = -Math.PI / 2.25;
    mesh.position.y = -0.05;

    return { mesh, material };
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

    // Adaptive quality: keep it smooth on mobile.
    const frameDtMs = clamp((time - this.lastFrameTime) * 1000, 8, 50);
    this.lastFrameTime = time;
    this.perfLP = lerp(this.perfLP, frameDtMs, 0.06);

    const baseQuality = this.perfLP < 18 ? 1 : this.perfLP < 24 ? 0.86 : 0.7;
    const targetQuality = clamp(baseQuality * this.mobileScale, 0.65, 1);
    this.quality = damp(this.quality, targetQuality, 2, dt);

    this.burst = clamp(this.burst * 0.92 + velocity * 0.26, 0, 1);
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
    }

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

    // Membrane shading / grading.
    this.membraneMaterial.color
      .setHSL(config.hue / 360, 0.78, 0.56)
      .lerp(new THREE.Color().setHSL(config.hue2 / 360, 0.78, 0.56), 0.25);

    this.membraneMaterial.emissive
      .setHSL(config.hue2 / 360, 0.9, 0.22)
      .lerp(new THREE.Color().setHSL(config.hue / 360, 0.9, 0.22), 0.2);

    this.membraneMaterial.emissiveIntensity = 0.12 + this.energy * 0.25;
    this.membraneMaterial.metalness = config.membraneMetalness;
    this.membraneMaterial.roughness = config.membraneRoughness;

    if (this.membraneShader) {
      this.membraneShader.uniforms.uTime.value = time;
      this.membraneShader.uniforms.uEnergy.value = this.energy;
      this.membraneShader.uniforms.uProgress.value = progress;
      this.membraneShader.uniforms.uAmp.value =
        config.membraneAmp * (1 + this.pinch * 0.55);
      this.membraneShader.uniforms.uFreq.value = config.membraneFreq;
      this.membraneShader.uniforms.uMode.value = modeBias;
    }

    // Field lines.
    const activeLines = clamp(
      Math.floor(
        config.lineCount * (0.7 + this.quality * 0.3) * this.mobileScale
      ),
      6,
      this.maxLines
    );

    const lineHue = config.hue2 / 360;
    for (let i = 0; i < this.fieldLines.length; i++) {
      const line = this.fieldLines[i];
      const node = this.lineNodes[i];

      const active = i < activeLines;
      line.visible = active;
      if (!active) continue;

      const positions = line.geometry.attributes.position.array as Float32Array;

      const baseRadius =
        config.lineRadius * (0.75 + (i / Math.max(1, activeLines - 1)) * 0.55);
      const spin = time * node.speed + node.phase + progress * node.twist * 2.2;

      for (let p = 0; p < this.linePoints; p++) {
        const t = p / (this.linePoints - 1);
        const u = t * 2 - 1;
        const idx3 = p * 3;

        const wobble =
          Math.sin(u * 2.4 + spin) * 0.1 +
          Math.cos(u * 3.1 - spin * 0.8) * 0.07;

        const radius = baseRadius * (1 + wobble * (0.6 + this.energy * 0.8));
        const a = spin + u * 1.05 + wobble;

        const x =
          Math.cos(a) * radius + this.pointer.x * 0.35 * (1 - Math.abs(u));
        const z =
          Math.sin(a) * radius + this.pointer.y * 0.22 * (1 - Math.abs(u));
        const y = u * 1.9 + node.lift + Math.sin(spin + u * 1.3) * 0.12;

        positions[idx3] = x;
        positions[idx3 + 1] = y;
        positions[idx3 + 2] = z;
      }

      line.geometry.attributes.position.needsUpdate = true;
      const mat = line.material as THREE.LineBasicMaterial;
      mat.color.setHSL(lineHue, 0.82, 0.66);
      mat.opacity = 0.08 + this.energy * 0.12;
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

    for (let i = 0; i < particleActive * 3; i += 3) {
      const bx = this.particleBase[i];
      const by = this.particleBase[i + 1];
      const bz = this.particleBase[i + 2];

      const radial = Math.hypot(bx, bz) / config.particleRadius;
      const drift = Math.sin(time * 0.8 + radial * 3.2) * 0.08;
      particlePositions[i] = bx + drift + this.pointer.x * 0.22;
      particlePositions[i + 1] = by + Math.cos(time * 0.65 + bx) * 0.06;
      particlePositions[i + 2] = bz - drift + this.pointer.y * 0.18;
    }

    this.particles.geometry.setDrawRange(0, particleActive);
    this.particles.geometry.attributes.position.needsUpdate = true;

    const pMat = this.particles.material as THREE.PointsMaterial;
    pMat.color.setHSL(config.hue2 / 360, 0.86, 0.67);
    pMat.opacity = 0.22 + this.energy * 0.26;
    pMat.size = 0.022 + this.quality * 0.012;

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
        (config.bloom + this.energy * 0.16) * bloomScale;
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

    if (this.membrane) {
      this.membrane.geometry.dispose();
      (this.membrane.material as THREE.Material).dispose();
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
