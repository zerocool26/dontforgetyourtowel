import * as THREE from 'three';
import type { TowerCaps } from '../core/caps';
import { createScenes } from './scenes';
import type { SceneRuntime, TowerScene } from './scenes';

type Cleanup = () => void;

type TransitionState = {
  active: boolean;
  from: TowerScene;
  to: TowerScene;
  t: number;
  duration: number;
};

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
  private transition: TransitionState | null = null;

  private transitionScene: THREE.Scene;
  private transitionCamera: THREE.OrthographicCamera;
  private transitionMaterial: THREE.ShaderMaterial;
  private transitionMesh: THREE.Mesh;
  private rtA: THREE.WebGLRenderTarget;
  private rtB: THREE.WebGLRenderTarget;

  private pointer = new THREE.Vector2();
  private pointerTarget = new THREE.Vector2();
  private pointerVelocity = new THREE.Vector2();
  private lastPointer = new THREE.Vector2();

  private lastTime = performance.now() / 1000;
  private lastScrollTime = performance.now();
  private lastScrollProgress = 0;
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
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.setClearColor(new THREE.Color(0x05070f));

    this.transitionScene = new THREE.Scene();
    this.transitionCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.transitionMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tFrom: { value: null },
        tTo: { value: null },
        uProgress: { value: 0 },
        uNoiseScale: { value: 3.5 },
        uEdge: { value: 0.18 },
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
        uniform sampler2D tFrom;
        uniform sampler2D tTo;
        uniform float uProgress;
        uniform float uNoiseScale;
        uniform float uEdge;

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

        void main() {
          vec2 uv = vUv;
          float n = noise(uv * uNoiseScale + uProgress * 0.6);
          float edge = smoothstep(uProgress - uEdge, uProgress + uEdge, n);
          vec4 fromCol = texture2D(tFrom, uv);
          vec4 toCol = texture2D(tTo, uv);
          gl_FragColor = mix(fromCol, toCol, edge);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });
    this.transitionMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      this.transitionMaterial
    );
    this.transitionScene.add(this.transitionMesh);

    this.rtA = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
    });
    this.rtB = new THREE.WebGLRenderTarget(1, 1, {
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
    const w = Math.max(1, Math.round(window.innerWidth));
    const h = Math.max(1, Math.round(window.innerHeight));
    if (!force && w === this.size.width && h === this.size.height) return;

    const baseDpr = Math.max(1, this.caps.devicePixelRatio);
    const capDpr = this.caps.coarsePointer ? 1.3 : 2;
    const targetDpr = Math.min(this.caps.maxDpr, capDpr, baseDpr);

    this.size = { width: w, height: h, dpr: targetDpr };
    this.renderer.setPixelRatio(this.size.dpr);
    this.renderer.setSize(w, h, false);

    this.rtA.setSize(w * this.size.dpr, h * this.size.dpr);
    this.rtB.setSize(w * this.size.dpr, h * this.size.dpr);
  }

  private computeScroll(): void {
    const rect = this.root.getBoundingClientRect();
    const total = rect.height - Math.max(1, this.size.height);
    const progress = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;
    const now = performance.now();
    const dt = Math.max(16, now - this.lastScrollTime);
    this.scrollVelocity = (progress - this.lastScrollProgress) / (dt / 1000);
    this.lastScrollProgress = progress;
    this.lastScrollTime = now;
    this.scrollProgress = progress;

    const count = Math.max(1, this.chapters.length);
    const pos = progress * count;
    const idx = clamp(Math.floor(pos), 0, count - 1);
    this.sceneIndex = idx;
    this.localProgress = pos - idx;
  }

  private resolveSceneId(): string {
    const fromDataset = this.root.dataset.towerScene || this.root.dataset.scene;
    if (fromDataset && this.sceneById.has(fromDataset)) return fromDataset;
    const fallbackScene = this.chapters[this.sceneIndex]?.dataset.scene;
    if (fallbackScene && this.sceneById.has(fallbackScene))
      return fallbackScene;
    return this.activeScene.id;
  }

  private beginTransition(nextScene: TowerScene, duration: number): void {
    if (nextScene.id === this.activeScene.id) return;
    this.transition = {
      active: true,
      from: this.activeScene,
      to: nextScene,
      t: 0,
      duration,
    };
    this.activeScene = nextScene;
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
    this.computeScroll();

    const targetSceneId = this.resolveSceneId();
    const targetScene = this.sceneById.get(targetSceneId) ?? this.activeScene;
    if (this.root.dataset.towerScene !== targetSceneId) {
      this.root.dataset.towerScene = targetSceneId;
    }
    if (targetScene.id !== this.activeScene.id && !this.transition?.active) {
      const duration = this.caps.reducedMotion ? 0.01 : 0.8;
      this.beginTransition(targetScene, duration);
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

    if (this.transition?.active) {
      const state = this.transition;
      state.t = clamp(state.t + dt / Math.max(0.001, state.duration), 0, 1);

      state.from.update(runtime);
      state.to.update(runtime);

      this.renderer.setRenderTarget(this.rtA);
      this.renderer.clear(true, true, true);
      state.from.render(runtime);

      this.renderer.setRenderTarget(this.rtB);
      this.renderer.clear(true, true, true);
      state.to.render(runtime);

      this.renderer.setRenderTarget(null);
      this.transitionMaterial.uniforms.tFrom.value = this.rtA.texture;
      this.transitionMaterial.uniforms.tTo.value = this.rtB.texture;
      this.transitionMaterial.uniforms.uProgress.value = state.t;
      this.renderer.render(this.transitionScene, this.transitionCamera);

      if (state.t >= 1) {
        this.transition = null;
      }
      return;
    }

    this.activeScene.update(runtime);
    this.renderer.setRenderTarget(null);
    this.activeScene.render(runtime);
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.cleanups.forEach(fn => fn());
    this.cleanups = [];
    this.scenes.forEach(scene => scene.dispose());
    this.rtA.dispose();
    this.rtB.dispose();
    this.transitionMaterial.dispose();
    this.transitionMesh.geometry.dispose();
    this.renderer.dispose();
  }
}
