import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { UIControls } from './ui-controls';
import type { TowerCaps } from '../core/caps';
import { createScenes } from './scenes';
import { GlobalParticleSystem, ParticleMode } from './gpgpu-system';
import type { SceneRuntime, TowerScene } from './scenes';

type Cleanup = () => void;

export interface DirectorOptions {
  galleryMode?: boolean;
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

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

  // Universal Particle System
  private gpgpu: GlobalParticleSystem;

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
      this.renderer.toneMappingExposure = 0.9; // Reduced from 1.45 to prevent blown-out whites
      this.renderer.setClearColor(new THREE.Color(0x020205)); // Deep void
    } catch (e) {
      this.reportError('WebGL Renderer Init', e);
      // Fallback or rethrow
      throw e;
    }

    // Init GPGPU System
    this.gpgpu = new GlobalParticleSystem(this.renderer);
    // Add to a dedicated "ForePass" scene or just overlay it.
    // Since we use a single RenderPass, we should probably add the GPGPU group to EACH scene or managing it centrally.
    // Cleaner approach: The GPGPU group exists outside scenes but is rendered by the same camera.
    // However, RenderPass takes a scene.
    // Trick: We will inject the GPGPU group into the *Active Scene* group when switching.

    // --- Post Processing Stack (EffectComposer) ---
    // 2026 Upgrade: Depth texture required for Bokeh
    const renderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth * this.size.dpr,
      window.innerHeight * this.size.dpr,
      {
        depthTexture: new THREE.DepthTexture(
          window.innerWidth,
          window.innerHeight
        ),
        depthBuffer: true,
      }
    );
    this.composer = new EffectComposer(this.renderer, renderTarget);

    // 1. Render Pass: Renders the active 3D scene
    // Initialized with empty scene/camera; updated per-frame in tick()
    this.renderPass = new RenderPass(new THREE.Scene(), new THREE.Camera());
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

    // Visibility Listener to pause rendering when tab is hidden
    document.addEventListener('visibilitychange', this.handleVisibility);

    // ResizeObserver for modern resizing
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.root);

    // UI
    this.ui = new UIControls(this, this.root);

    this.scenes = createScenes();
    this.sceneById = new Map(this.scenes.map(scene => [scene.id, scene]));
    const initialId = this.root.dataset.towerScene || this.root.dataset.scene;
    this.activeScene =
      (initialId && this.sceneById.get(initialId)) || this.scenes[0];

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

    this.root.dataset.towerScene = this.activeScene.id;
    this.root.dataset.towerRendered = '1';
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
      pointer: this.pointer,
      pointerVelocity: this.pointerVelocity,
      tap: this.tap,
      press: clamp(this.pressTime * 2.0, 0, 1),
      scrollVelocity: this.scrollVelocity,
      sceneId: this.activeScene.id,
      sceneIndex: this.sceneIndex,
      gyro: this.gyro,
      gyroActive: this.gyroActive,
      bgTheme: 'dark',
    };
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
      this.localProgress = Math.abs(pos - idx);
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
      this.bokehPass.uniforms['focus'].value = dist;
    }
    const realDt = Math.min(1 / 30, Math.max(1 / 240, now - this.lastTime));
    const dt = realDt * this.timeScale; // Apply time scaling

    if (this._simTime === 0 && this.lastTime > 0) this._simTime = now;
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
    if (targetScene.id !== this.activeScene.id) {
      // Remove GPGPU from old scene
      this.activeScene.group.remove(this.gpgpu.group);

      this.activeScene = targetScene;

      // Add GPGPU to new scene
      this.activeScene.group.add(this.gpgpu.group);

      this.updateParticleConfig(this.activeScene.id);

      this.cutFade = 1;
      // Cycle through different transition types for variety
      this.transitionType = (this.transitionType + 1) % 4;
      this.finalPass.uniforms.uTransitionType.value = this.transitionType;
    }

    this.pointer.x = damp(this.pointer.x, this.pointerTarget.x, 6, realDt);
    this.pointer.y = damp(this.pointer.y, this.pointerTarget.y, 6, realDt);
    this.pointerVelocity.set(
      (this.pointer.x - this.lastPointer.x) / Math.max(0.001, realDt),
      (this.pointer.y - this.lastPointer.y) / Math.max(0.001, realDt)
    );
    this.lastPointer.copy(this.pointer);

    // Tap/press interaction signals (works for mouse + touch)
    this.tap = damp(this.tap, 0, 18, realDt);
    this.pressTime = this.pointerDown
      ? Math.min(1, this.pressTime + realDt)
      : Math.max(0, this.pressTime - realDt * 4);

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
      this.tap + clamp(this.pressTime * 2.0, 0, 1) * 0.35,
      0,
      1
    );

    // Pass gyro influence to post-processing shader for mobile parallax effects
    if (this.gyroActive) {
      this.finalPass.uniforms.uGyroInfluence.value.set(
        this.gyro.x,
        this.gyro.y
      );
    } else {
      this.finalPass.uniforms.uGyroInfluence.value.set(0, 0);
    }

    // NEW: Update pointer velocity uniform for dynamic chromatic aberration
    const pVel = this.pointerVelocity.length();
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
      this.gpgpu.update(this._simTime, dt);
    } catch (e) {
      if (!this.root.dataset.lastGPGPUError) {
        this.reportError('GPGPU Update', e);
        this.root.dataset.lastGPGPUError = '1';
      }
    }

    try {
      this.activeScene.update(runtime);
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
    this.renderPass.scene = this.activeScene.group as unknown as THREE.Scene;
    this.renderPass.camera = this.activeScene.camera;

    if (this.activeScene.bg) {
      this.renderer.setClearColor(this.activeScene.bg);
    } else {
      this.renderer.setClearColor(new THREE.Color(0x05070f));
    }

    this.resetViewport();
    this.composer.render();
  }

  private reportError(context: string, error: unknown) {
    console.error(`[Tower3D] Error in ${context}:`, error);

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
    const errorMessage = error instanceof Error ? error.message : String(error);
    msg.innerText = `[${new Date().toLocaleTimeString()}] ${context}: ${errorMessage}`;
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
    this.scenes.forEach(scene => scene.dispose());
    this.renderer.dispose();
  }
}
