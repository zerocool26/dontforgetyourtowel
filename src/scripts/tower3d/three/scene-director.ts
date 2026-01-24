import * as THREE from 'three';
import gsap from 'gsap';
import type { TowerCaps } from '../core/caps';
import { createScenes } from './scenes';
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
  private renderer: THREE.WebGLRenderer;
  private scenes: TowerScene[];
  private sceneById: Map<string, TowerScene>;
  private activeScene: TowerScene;

  private postScene: THREE.Scene;
  private postCamera: THREE.OrthographicCamera;
  private postMaterial: THREE.ShaderMaterial;
  private postMesh: THREE.Mesh;

  private rtA: THREE.WebGLRenderTarget;

  // Short transition mask when the active chapter/scene changes.
  private cutFade = 0;
  private transitionType = 0; // 0: portal iris, 1: liquid wipe, 2: particle dissolve, 3: glitch cut

  private pointer = new THREE.Vector2();
  private pointerTarget = new THREE.Vector2();
  private pointerVelocity = new THREE.Vector2();
  private lastPointer = new THREE.Vector2();

  // Gyroscope support for mobile tilt parallax
  private gyro = new THREE.Vector3();
  private gyroTarget = new THREE.Vector3();
  private gyroActive = false;

  private lastTime = performance.now() / 1000;
  private lastScrollTime = performance.now();
  private lastScrollProgress = 0;
  private scrollProgressTarget = 0;
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

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: false,
      antialias: !caps.coarsePointer,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setClearColor(new THREE.Color(0x05070f));

    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.postMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null },
        uTime: { value: 0 },
        uCut: { value: 0 },
        uTransitionType: { value: 0 },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uVignette: { value: 0.26 },
        uGrain: { value: 0.06 },
        uChromatic: { value: 0.0026 },
        uGlow: { value: this.caps.coarsePointer ? 0.26 : 0.34 },
        uGlowThreshold: { value: 0.72 },
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
        uniform sampler2D tScene;
        uniform float uTime;
        uniform float uCut;
        uniform float uTransitionType;
        uniform vec2 uResolution;
        uniform float uVignette;
        uniform float uGrain;
        uniform float uChromatic;
        uniform float uGlow;
        uniform float uGlowThreshold;

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
          float amt = strength * smoothstep(0.12, 0.9, r);
          vec2 off = dir * amt;
          vec3 col;
          col.r = texture2D(tScene, uv + off).r;
          col.g = texture2D(tScene, uv).g;
          col.b = texture2D(tScene, uv - off).b;
          return col;
        }

        // Portal iris transition - circular wipe with energy ring
        float portalIris(vec2 uv, float progress) {
          vec2 center = uv - 0.5;
          float dist = length(center);
          float angle = atan(center.y, center.x);

          // Radius shrinks to center as progress increases
          float radius = 0.8 * (1.0 - progress);

          // Add energy ripples to the edge
          float ripple = sin(angle * 8.0 + uTime * 6.0) * 0.02 * progress;
          float energyRing = smoothstep(radius + 0.05, radius, dist + ripple);
          float innerCore = smoothstep(radius, radius - 0.1, dist);

          return energyRing * (1.0 - innerCore * 0.5);
        }

        // Liquid wipe transition - organic flowing edge
        float liquidWipe(vec2 uv, float progress) {
          float n1 = noise(uv * 4.0 + uTime * 0.5);
          float n2 = noise(uv * 8.0 - uTime * 0.3);
          float distortion = (n1 + n2 * 0.5) * 0.15;

          // Wave from left to right with organic edge
          float edge = uv.x + distortion;
          float threshold = progress * 1.3 - 0.15;

          return smoothstep(threshold - 0.1, threshold + 0.1, edge);
        }

        // Particle dissolve - pixelated dissolve effect
        float particleDissolve(vec2 uv, float progress) {
          float blockSize = 0.02;
          vec2 block = floor(uv / blockSize) * blockSize;
          float randomVal = hash(block);

          // Add wave pattern to the dissolve
          float wave = sin(block.x * 20.0 + uTime * 3.0) * 0.1;
          float threshold = progress + wave;

          return step(randomVal, threshold);
        }

        // Glitch cut - digital glitch with color separation
        vec3 glitchCut(vec2 uv, float progress, vec3 originalColor) {
          float glitchStrength = progress * 2.0;

          // Horizontal slice displacement
          float sliceY = floor(uv.y * 20.0) / 20.0;
          float sliceRandom = hash(vec2(sliceY, floor(uTime * 8.0)));
          float displacement = (sliceRandom - 0.5) * glitchStrength * 0.1;

          // Only apply to some slices
          if (sliceRandom > 0.7 && progress > 0.1) {
            vec2 displacedUv = uv + vec2(displacement, 0.0);

            // RGB split
            float r = texture2D(tScene, displacedUv + vec2(0.01 * glitchStrength, 0.0)).r;
            float g = texture2D(tScene, displacedUv).g;
            float b = texture2D(tScene, displacedUv - vec2(0.01 * glitchStrength, 0.0)).b;

            return mix(originalColor, vec3(r, g, b), progress);
          }

          // Add scanlines during transition
          float scanline = sin(uv.y * 400.0 + uTime * 20.0) * 0.5 + 0.5;
          return originalColor * (1.0 - scanline * 0.15 * progress);
        }

        void main() {
          vec2 uv = vUv;
          vec2 c = uv - 0.5;
          float r = length(c);

          // Subtle breathing warp (keeps motion alive without UI)
          float wobble = 0.0025 * sin(uTime * 0.6 + r * 8.0);
          uv += normalize(c + 1e-6) * wobble;

          vec3 col = sampleChromatic(uv, uChromatic);

          // Cheap highlight glow/halation (no multi-pass blur).
          vec2 px = vec2(1.0) / max(uResolution, vec2(1.0));
          vec3 glow = vec3(0.0);
          float wsum = 0.0;

          vec2 o1 = px * 1.25;
          vec2 o2 = px * 2.5;

          // 8 taps (cardinals + diagonals)
          vec3 s;
          float w;

          w = 0.35; s = texture2D(tScene, uv + vec2(o1.x, 0.0)).rgb; glow += max(s - vec3(uGlowThreshold), 0.0) * w; wsum += w;
          w = 0.35; s = texture2D(tScene, uv + vec2(-o1.x, 0.0)).rgb; glow += max(s - vec3(uGlowThreshold), 0.0) * w; wsum += w;
          w = 0.35; s = texture2D(tScene, uv + vec2(0.0, o1.y)).rgb; glow += max(s - vec3(uGlowThreshold), 0.0) * w; wsum += w;
          w = 0.35; s = texture2D(tScene, uv + vec2(0.0, -o1.y)).rgb; glow += max(s - vec3(uGlowThreshold), 0.0) * w; wsum += w;

          w = 0.25; s = texture2D(tScene, uv + vec2(o2.x, o2.y)).rgb; glow += max(s - vec3(uGlowThreshold), 0.0) * w; wsum += w;
          w = 0.25; s = texture2D(tScene, uv + vec2(-o2.x, o2.y)).rgb; glow += max(s - vec3(uGlowThreshold), 0.0) * w; wsum += w;
          w = 0.25; s = texture2D(tScene, uv + vec2(o2.x, -o2.y)).rgb; glow += max(s - vec3(uGlowThreshold), 0.0) * w; wsum += w;
          w = 0.25; s = texture2D(tScene, uv + vec2(-o2.x, -o2.y)).rgb; glow += max(s - vec3(uGlowThreshold), 0.0) * w; wsum += w;

          glow /= max(wsum, 1e-6);
          col += glow * uGlow;

          // Advanced transition effects based on transition type
          float cut = clamp(uCut, 0.0, 1.0);

          if (cut > 0.01) {
            int transType = int(uTransitionType);

            if (transType == 0) {
              // Portal iris transition
              float iris = portalIris(vUv, cut);
              col *= 1.0 - iris * 0.85;
              // Add cyan energy glow at the edge
              vec2 center = vUv - 0.5;
              float dist = length(center);
              float radius = 0.8 * (1.0 - cut);
              float edgeGlow = smoothstep(radius + 0.15, radius, dist) * smoothstep(radius - 0.05, radius, dist);
              col += vec3(0.2, 0.6, 1.0) * edgeGlow * cut * 2.0;
            } else if (transType == 1) {
              // Liquid wipe transition
              float liquid = liquidWipe(vUv, cut);
              col *= 1.0 - liquid * 0.9;
              // Add highlight at the liquid edge
              float edge = fwidth(liquid) * 15.0;
              col += vec3(0.3, 0.5, 0.8) * edge * cut;
            } else if (transType == 2) {
              // Particle dissolve transition
              float dissolve = particleDissolve(vUv, cut);
              col *= 1.0 - dissolve * 0.95;
              // Slight glow on dissolving pixels
              col += vec3(0.1, 0.2, 0.4) * dissolve * (1.0 - cut);
            } else {
              // Glitch cut transition
              col = glitchCut(vUv, cut, col);
              col *= 1.0 - cut * 0.6;
              col += vec3(0.01, 0.015, 0.03) * cut;
            }
          }

          // Vignette
          float vig = smoothstep(0.92, 0.25, r);
          col *= mix(1.0 - uVignette, 1.0, vig);

          // Film grain
          float g = (hash(uv * vec2(1920.0, 1080.0) + uTime * 60.0) - 0.5);
          col += g * uGrain;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });
    this.postMaterial.toneMapped = false;
    this.postMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      this.postMaterial
    );
    this.postScene.add(this.postMesh);

    this.rtA = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
    });

    this.scenes = createScenes();
    this.sceneById = new Map(this.scenes.map(scene => [scene.id, scene]));
    const initialId = this.root.dataset.towerScene || this.root.dataset.scene;
    this.activeScene =
      (initialId && this.sceneById.get(initialId)) || this.scenes[0];

    this.chapters = Array.from(
      this.root.querySelectorAll<HTMLElement>('[data-tower3d-chapter]')
    );

    this.installInput();
    this.syncSize(true);

    const runtime = this.buildRuntime(0, 0);
    this.scenes.forEach(scene => {
      scene.init(runtime);
      scene.resize(runtime);
    });

    this.root.dataset.towerScene = this.activeScene.id;
    this.root.dataset.towerRendered = '1';
  }

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
      scrollVelocity: this.scrollVelocity,
      sceneId: this.activeScene.id,
      sceneIndex: this.sceneIndex,
      gyro: this.gyro,
      gyroActive: this.gyroActive,
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
    const nx = (x / Math.max(1, this.size.width)) * 2 - 1;
    const ny = (y / Math.max(1, this.size.height)) * 2 - 1;
    this.pointerTarget.set(clamp(nx, -1, 1), clamp(ny, -1, 1));
  }

  private syncSize(force: boolean): void {
    const vv = window.visualViewport;
    const w = Math.max(1, Math.round(vv?.width ?? window.innerWidth));
    const h = Math.max(1, Math.round(vv?.height ?? window.innerHeight));
    if (!force && w === this.size.width && h === this.size.height) return;

    const baseDpr = Math.max(1, this.caps.devicePixelRatio);
    const capDpr = this.caps.coarsePointer ? 2 : 2.5;
    const targetDpr = Math.min(this.caps.maxDpr, capDpr, baseDpr);

    this.size = { width: w, height: h, dpr: targetDpr };
    this.renderer.setPixelRatio(this.size.dpr);
    this.renderer.setSize(w, h, false);

    this.rtA.setSize(w * this.size.dpr, h * this.size.dpr);

    const res = this.postMaterial.uniforms.uResolution?.value as
      | THREE.Vector2
      | undefined;
    res?.set(w * this.size.dpr, h * this.size.dpr);
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
    this.renderer.setViewport(
      0,
      0,
      Math.floor(this.size.width * this.size.dpr),
      Math.floor(this.size.height * this.size.dpr)
    );
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

  public resize(): void {
    this.syncSize(true);
    const runtime = this.buildRuntime(0, this.lastTime);
    this.scenes.forEach(scene => scene.resize(runtime));
  }

  public tick(): void {
    if (this.destroyed) return;

    const now = performance.now() / 1000;
    const dt = Math.min(1 / 30, Math.max(1 / 240, now - this.lastTime));
    this.lastTime = now;

    this.syncSize(false);
    this.computeScroll(dt);

    const targetSceneId = this.resolveSceneId();
    const targetScene = this.sceneById.get(targetSceneId) ?? this.activeScene;
    if (this.root.dataset.towerScene !== targetSceneId) {
      this.root.dataset.towerScene = targetSceneId;
    }
    if (targetScene.id !== this.activeScene.id) {
      this.activeScene = targetScene;
      this.cutFade = 1;
      // Cycle through different transition types for variety
      this.transitionType = (this.transitionType + 1) % 4;
      this.postMaterial.uniforms.uTransitionType.value = this.transitionType;
    }

    this.pointer.x = damp(this.pointer.x, this.pointerTarget.x, 6, dt);
    this.pointer.y = damp(this.pointer.y, this.pointerTarget.y, 6, dt);
    this.pointerVelocity.set(
      (this.pointer.x - this.lastPointer.x) / Math.max(0.001, dt),
      (this.pointer.y - this.lastPointer.y) / Math.max(0.001, dt)
    );
    this.lastPointer.copy(this.pointer);

    // Smooth gyroscope values
    this.gyro.x = damp(this.gyro.x, this.gyroTarget.x, 5, dt);
    this.gyro.y = damp(this.gyro.y, this.gyroTarget.y, 5, dt);
    this.gyro.z = damp(this.gyro.z, this.gyroTarget.z, 5, dt);

    this.root.style.setProperty(
      '--tower-scroll',
      this.scrollProgress.toFixed(4)
    );
    this.root.style.setProperty('--tower-local', this.localProgress.toFixed(4));
    this.root.style.setProperty('--tower-vel', this.scrollVelocity.toFixed(4));
    this.root.style.setProperty('--tower-pointer-x', this.pointer.x.toFixed(4));
    this.root.style.setProperty('--tower-pointer-y', this.pointer.y.toFixed(4));
    this.root.dataset.towerSceneIndex = String(this.sceneIndex);

    const runtime = this.buildRuntime(dt, now);
    this.postMaterial.uniforms.uTime.value = now;

    // Decay the cut mask quickly; keep it super short under reduced motion.
    const cutLambda = this.caps.reducedMotion ? 18 : 10;
    this.cutFade = damp(this.cutFade, 0, cutLambda, dt);
    this.postMaterial.uniforms.uCut.value = this.cutFade;

    this.activeScene.update(runtime);
    this.renderer.setRenderTarget(this.rtA);
    this.renderer.clear(true, true, true);
    this.activeScene.render(runtime);

    this.renderer.setRenderTarget(null);
    this.resetViewport();
    this.postMaterial.uniforms.tScene.value = this.rtA.texture;
    this.renderer.render(this.postScene, this.postCamera);
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.cleanups.forEach(fn => fn());
    this.cleanups = [];
    this.scenes.forEach(scene => scene.dispose());
    this.rtA.dispose();
    this.postMaterial.dispose();
    this.postMesh.geometry.dispose();
    this.renderer.dispose();
  }
}
