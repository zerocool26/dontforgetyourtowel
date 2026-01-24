import * as THREE from 'three';
import gsap from 'gsap';
import type { TowerCaps } from '../core/caps';
import { createScenes } from './scenes';
import type { SceneRuntime, TowerScene } from './scenes';

type Cleanup = () => void;

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

  // Short dip-to-black style cut mask when the active chapter/scene changes.
  private cutFade = 0;

  private pointer = new THREE.Vector2();
  private pointerTarget = new THREE.Vector2();
  private pointerVelocity = new THREE.Vector2();
  private lastPointer = new THREE.Vector2();

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

  constructor(root: HTMLElement, canvas: HTMLCanvasElement, caps: TowerCaps) {
    this.root = root;
    this.canvas = canvas;
    this.caps = caps;

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
        uniform vec2 uResolution;
        uniform float uVignette;
        uniform float uGrain;
        uniform float uChromatic;
        uniform float uGlow;
        uniform float uGlowThreshold;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
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

          // Robust chapter-cut mask (prevents jarring pops without complex RT blends)
          float cut = clamp(uCut, 0.0, 1.0);
          float cutSoft = smoothstep(0.0, 1.0, cut);
          col *= 1.0 - cutSoft * 0.75;
          col += vec3(0.01, 0.015, 0.03) * cutSoft;

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
    }

    this.pointer.x = damp(this.pointer.x, this.pointerTarget.x, 6, dt);
    this.pointer.y = damp(this.pointer.y, this.pointerTarget.y, 6, dt);
    this.pointerVelocity.set(
      (this.pointer.x - this.lastPointer.x) / Math.max(0.001, dt),
      (this.pointer.y - this.lastPointer.y) / Math.max(0.001, dt)
    );
    this.lastPointer.copy(this.pointer);

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
