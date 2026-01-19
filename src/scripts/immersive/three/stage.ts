import * as THREE from 'three';
import type { ImmersiveCaps } from '../core/caps';

export type ThreeStageStatus = {
  center: 'webgl' | 'css';
  status: 'ok' | 'init-failed' | 'context-lost' | 'webgl-unavailable';
  detail?: string;
};

type Cleanup = () => void;

type InputState = {
  pointer: THREE.Vector2;
  pointerTarget: THREE.Vector2;
  pinch: number;
  pinchTarget: number;
  pinchBaseDist: number;
};

export class ThreeStage {
  private root: HTMLElement;
  private canvas: HTMLCanvasElement;
  private caps: ImmersiveCaps;

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private group: THREE.Group;

  private core: THREE.Mesh;
  private ring: THREE.Mesh;
  private shell: THREE.LineSegments;
  private particles: THREE.Points;

  private particlesBasePositions: Float32Array | null = null;
  private particlesPhase: Float32Array | null = null;
  private particlesSpeed: Float32Array | null = null;

  // Fullscreen "Liquid Glass Portal" pass (scene -> texture -> refractive composite).
  private portalTarget: THREE.WebGLRenderTarget | null = null;
  private portalHasDepth = false;
  private portalScene: THREE.Scene | null = null;
  private portalCamera: THREE.OrthographicCamera | null = null;
  private portalMesh: THREE.Mesh | null = null;
  private portalMaterial: THREE.ShaderMaterial | null = null;
  private portalRipples: THREE.Vector4[] = [
    new THREE.Vector4(-10, -10, 0, 0),
    new THREE.Vector4(-10, -10, 0, 0),
    new THREE.Vector4(-10, -10, 0, 0),
  ];
  private portalRippleCursor = 0;

  private portalCenterX = 0.5;
  private portalCenterY = 0.5;
  private portalRadius = 0.36;
  private portalPressure = 0;

  private input: InputState;
  private pointers = new Map<
    number,
    { x: number; y: number; type: 'touch' | 'mouse' | 'pen' }
  >();

  private io: IntersectionObserver | null = null;
  private inView = true;
  private tabVisible = true;
  private destroyed = false;
  private contextLost = false;

  private debugEl: HTMLElement | null = null;

  private lastT = performance.now() / 1000;
  private lastFrameT = this.lastT;
  private readonly frameInterval: number;
  private energy = 0;
  private burst = 0;

  private sceneHueA = 210;
  private sceneHueB = 280;
  private fogDensity = 0.055;

  private lastSceneId: string | undefined;
  private sceneBeat = 0;

  private ringTiltX = Math.PI / 2.4;
  private ringTiltXTarget = Math.PI / 2.4;
  private ringTiltY = 0;
  private ringTiltYTarget = 0;
  private shellOpacityTarget = 0.18;
  private particleOpacityTarget = 0.32;

  private cleanup: Cleanup[] = [];

  private viewportW = 1;
  private viewportH = 1;
  private stableViewportH = 1;

  constructor(
    root: HTMLElement,
    canvas: HTMLCanvasElement,
    caps: ImmersiveCaps
  ) {
    this.root = root;
    this.canvas = canvas;
    this.caps = caps;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05070f);
    this.scene.fog = new THREE.FogExp2(0x070b18, this.fogDensity);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 80);
    this.camera.position.set(0, 0, 7.2);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.input = {
      pointer: new THREE.Vector2(),
      pointerTarget: new THREE.Vector2(),
      pinch: 0,
      pinchTarget: 0,
      pinchBaseDist: 0,
    };

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

    // Two-pass portal compositing expects deterministic clears.
    this.renderer.autoClear = true;

    // Mobile-first perf: cap coarse pointer devices to 30fps.
    this.frameInterval = caps.coarsePointer ? 1 / 30 : 1 / 60;

    this.debugEl = this.root.querySelector<HTMLElement>('[data-ih-debug]');

    // Lighting: stable, cheap.
    const hemi = new THREE.HemisphereLight(0xffffff, 0x070a12, 0.65);
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(4, 6, 3);
    const fill = new THREE.PointLight(0xffffff, 0.8, 30, 2);
    fill.position.set(-6, -2, 7);
    this.scene.add(hemi, key, fill);

    // Scene objects: geometry-based (mobile-stable) instead of raymarch.
    this.core = this.createCore();
    this.ring = this.createRing();
    this.shell = this.createShell();
    this.particles = this.createParticles();

    this.group.add(this.core, this.ring, this.shell, this.particles);

    this.installLifecycleHandlers();
    this.installInputHandlers();
    this.installVisibility();

    this.installPortalPass();

    this.syncViewportSize(true);
    this.resize();

    this.setDataset({ center: 'webgl', status: 'ok' });

    // Used by the UI hint to show after the first successful init.
    this.root.dataset.ihRendered = '1';

    // Seed scene tracking so the first tick can still do a beat if desired.
    this.lastSceneId = this.root.dataset.ihScene;
  }

  private installPortalPass(): void {
    this.portalHasDepth = Boolean(this.renderer.capabilities.isWebGL2);

    // Create a tiny target now; resize() will allocate the final size.
    this.portalTarget = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
    });

    if (this.portalHasDepth) {
      const depthTex = new THREE.DepthTexture(1, 1);
      depthTex.format = THREE.DepthFormat;
      depthTex.type = THREE.UnsignedIntType;
      this.portalTarget.depthTexture = depthTex;
    }

    this.portalScene = new THREE.Scene();
    this.portalCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms = {
      tScene: { value: this.portalTarget.texture },
      tDepth: { value: this.portalTarget.depthTexture ?? null },
      uHasDepth: { value: this.portalHasDepth ? 1 : 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uRtResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uCenter: { value: new THREE.Vector2(0.5, 0.5) },
      uRadius: { value: 0.36 },
      uSoftness: { value: 0.12 },
      uDistort: { value: 0.02 },
      uEnergy: { value: 0 },
      uBeat: { value: 0 },
      uPressure: { value: 0 },
      uRipples: { value: this.portalRipples },
    };

    this.portalMaterial = new THREE.ShaderMaterial({
      uniforms,
      // Fullscreen quad in clip space.
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform sampler2D tScene;
        uniform sampler2D tDepth;
        uniform float uHasDepth;
        uniform vec2 uResolution;
        uniform vec2 uRtResolution;
        uniform float uTime;
        uniform vec2 uCenter;
        uniform float uRadius;
        uniform float uSoftness;
        uniform float uDistort;
        uniform float uEnergy;
        uniform float uBeat;
        uniform float uPressure;
        uniform vec4 uRipples[3];
        varying vec2 vUv;

        float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 345.45));
          p += dot(p, p + 34.345);
          return fract(p.x * p.y);
        }

        float noise2(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash21(i);
          float b = hash21(i + vec2(1.0, 0.0));
          float c = hash21(i + vec2(0.0, 1.0));
          float d = hash21(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        float rippleField(vec2 uv) {
          float v = 0.0;
          for (int i = 0; i < 3; i++) {
            vec4 r = uRipples[i];
            float amp = r.w;
            if (amp <= 0.0001) continue;
            float t0 = r.z;
            float age = max(0.0, uTime - t0);
            vec2 c = r.xy;
            float d = distance(uv, c);
            float w = sin(d * 46.0 - age * 10.0) * exp(-age * 1.7) * exp(-d * 3.6);
            v += amp * w;
          }
          return v;
        }

        float depthFactor(vec2 uv) {
          if (uHasDepth < 0.5) return 0.0;
          // Depth is non-linear in clip space, but we only need a gentle bias.
          float d = texture2D(tDepth, uv).x;
          return smoothstep(0.08, 0.92, d);
        }

        void main() {
          vec2 uv = vUv;

          // Correct for aspect so the portal reads circular on any screen.
          float aspect = max(0.0001, uResolution.x / uResolution.y);
          vec2 toC = uv - uCenter;
          vec2 toCAspect = vec2(toC.x * aspect, toC.y);
          float dist = length(toCAspect);
          vec2 dir = toCAspect / max(0.0001, dist);

          float mask = smoothstep(uRadius, uRadius - uSoftness, dist);
          float df = depthFactor(uv);

          // Subtle animated grain (sells glass without heavy blur).
          vec2 nUv = vec2(uv.x * aspect, uv.y) * 3.0 + vec2(uTime * 0.05, uTime * 0.03);
          float n = noise2(nUv);

          // Ripple impulses from taps + scene beats.
          float rip = rippleField(uv);
          float beat = uBeat;

          float distort = uDistort;
          distort += (0.008 + uEnergy * 0.02) * (0.6 + 0.4 * n);
          distort += beat * 0.018;
          distort += uPressure * 0.030;

          float field = (rip * 0.65 + (n - 0.5) * 0.38);
          // Depth-aware refraction: slightly stronger where depth suggests “more volume”.
          float depthMul = mix(0.85, 1.25, df);
          vec2 offset = dir * (field * distort * mask) * depthMul;

          // Chromatic edge inside the portal.
          float ca = (1.0 / max(1.0, min(uRtResolution.x, uRtResolution.y))) * 140.0;
          ca *= mask * (0.35 + uEnergy * 0.9);
          vec2 o1 = offset * (1.0 + ca);
          vec2 o2 = offset;
          vec2 o3 = offset * (1.0 - ca);

          vec3 col;
          col.r = texture2D(tScene, uv + o1).r;
          col.g = texture2D(tScene, uv + o2).g;
          col.b = texture2D(tScene, uv + o3).b;

          // Glass highlight + edge gleam.
          float edge = smoothstep(uRadius - uSoftness * 0.35, uRadius + 0.01, dist) * mask;
          float core = pow(1.0 - clamp(dist / max(0.0001, uRadius), 0.0, 1.0), 2.6);
          vec3 highlight = vec3(0.06, 0.10, 0.16) * (core * 0.7 + edge * 0.85);
          col += highlight * (0.55 + 0.55 * n);

          // Edge caustics (animated, cheap): adds premium “glass” readability.
          float ang = atan(toCAspect.y, toCAspect.x);
          float band = smoothstep(uRadius + 0.018, uRadius - 0.002, dist) * mask;
          float streaks = sin(ang * 10.0 + uTime * 0.8) * 0.5 + 0.5;
          streaks *= sin(ang * 17.0 - uTime * 0.55) * 0.5 + 0.5;
          float caust = pow(streaks, 2.0);
          caust *= (0.35 + 0.65 * n);
          vec3 caustCol = mix(vec3(0.25, 0.50, 0.75), vec3(0.65, 0.35, 0.95), 0.35 + uEnergy * 0.35);
          col += caustCol * band * caust * (0.06 + uEnergy * 0.08 + uBeat * 0.12 + uPressure * 0.14);

          // Outside portal: slightly darker to emphasize the lens.
          col *= 1.0 - (1.0 - mask) * 0.085;

          // Gentle vignette to make fullscreen feel cinematic.
          float vign = smoothstep(0.95, 0.25, length(uv - 0.5));
          col *= 0.985 + vign * 0.05;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
      transparent: false,
      toneMapped: false,
    });

    const quad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      this.portalMaterial
    );
    quad.frustumCulled = false;
    this.portalMesh = quad;
    this.portalScene.add(quad);
  }

  private resizePortalTargets(w: number, h: number, dpr: number): void {
    if (!this.portalTarget || !this.portalMaterial) return;

    const scale = this.caps.coarsePointer ? 0.85 : 1.0;
    const pw = Math.max(1, Math.round(w * dpr * scale));
    const ph = Math.max(1, Math.round(h * dpr * scale));
    this.portalTarget.setSize(pw, ph);

    this.portalMaterial.uniforms.uResolution.value.set(w, h);
    this.portalMaterial.uniforms.uRtResolution.value.set(pw, ph);
  }

  private addPortalRippleFromClient(x: number, y: number, amp: number): void {
    if (!this.portalMaterial) return;
    const uvx = Math.max(0, Math.min(1, x / Math.max(1, this.viewportW)));
    const uvy = Math.max(0, Math.min(1, y / Math.max(1, this.viewportH)));
    const slot =
      this.portalRipples[this.portalRippleCursor % this.portalRipples.length];
    slot.set(uvx, uvy, performance.now() / 1000, Math.max(0, Math.min(1, amp)));
    this.portalRippleCursor++;
  }

  public getStatus(): ThreeStageStatus {
    return {
      center: (this.root.dataset.ihCenter === 'css' ? 'css' : 'webgl') as
        | 'webgl'
        | 'css',
      status:
        (this.root.dataset.ihStatus as ThreeStageStatus['status']) || 'ok',
      detail: this.root.dataset.ihStatusDetail,
    };
  }

  private setDataset(meta: ThreeStageStatus): void {
    this.root.dataset.ihCenter = meta.center;
    this.root.dataset.ihStatus = meta.status;
    this.root.dataset.ihStatusDetail = meta.detail ?? '';

    this.root.dataset.ihWebgl = this.renderer.capabilities.isWebGL2
      ? 'webgl2'
      : 'webgl1';
    this.root.dataset.ihPrec = this.caps.maxPrecision;
  }

  private fallbackToCss(
    status: ThreeStageStatus['status'],
    detail: string
  ): void {
    if (this.destroyed) return;
    this.setDataset({ center: 'css', status, detail });
    // Stop rendering and release GPU resources decisively.
    window.setTimeout(() => this.destroy(), 0);
  }

  private installLifecycleHandlers(): void {
    const onVisibility = () => {
      // When tab is hidden, don’t keep ticking.
      this.tabVisible = document.visibilityState !== 'hidden';
    };
    document.addEventListener('visibilitychange', onVisibility);
    this.cleanup.push(() =>
      document.removeEventListener('visibilitychange', onVisibility)
    );

    // Context lost handling.
    const onLost = (e: Event) => {
      e.preventDefault?.();
      this.contextLost = true;
      this.root.dataset.ihWebglState = 'lost';
      this.fallbackToCss('context-lost', 'WebGL context lost on mobile');
    };

    const onRestored = () => {
      // We intentionally do not attempt a full restore path here;
      // mobile drivers are fragile, so CSS fallback is safer.
      this.root.dataset.ihWebglState = 'restored';
    };

    this.canvas.addEventListener('webglcontextlost', onLost as EventListener, {
      passive: false,
    });
    this.canvas.addEventListener('webglcontextrestored', onRestored, {
      passive: true,
    });
    this.cleanup.push(() => {
      this.canvas.removeEventListener(
        'webglcontextlost',
        onLost as EventListener
      );
      this.canvas.removeEventListener('webglcontextrestored', onRestored);
    });
  }

  private installVisibility(): void {
    if (!('IntersectionObserver' in window)) return;

    this.io = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        this.inView = Boolean(entry?.isIntersecting);
        this.root.dataset.ihInView = this.inView ? '1' : '0';
      },
      { threshold: 0.02 }
    );

    this.io.observe(this.root);
    this.cleanup.push(() => this.io?.disconnect());
  }

  private readViewportSize(): { w: number; h: number } {
    // Prefer VisualViewport if available; it tracks the actually visible area.
    const vv = (
      window as unknown as {
        visualViewport?: { width: number; height: number };
      }
    ).visualViewport;

    const w = Math.max(1, Math.round(vv?.width ?? window.innerWidth));
    const h = Math.max(1, Math.round(vv?.height ?? window.innerHeight));
    return { w, h };
  }

  private syncViewportSize(force: boolean): void {
    const { w, h } = this.readViewportSize();

    // Mobile Chrome/Safari can fire resize events repeatedly while the URL bar
    // collapses/expands during scroll. Resizing the WebGL backbuffer each time
    // can cause visible flicker. We keep a *non-shrinking* stable height on
    // coarse pointer devices and only resize when width changes or the stable
    // height grows.
    if (this.caps.coarsePointer) {
      const widthChanged = w !== this.viewportW;
      if (force || widthChanged) {
        this.viewportW = w;
        this.viewportH = h;
        this.stableViewportH = h;
        return;
      }

      // Grow-only height (prevents thrash when address bar shows/hides).
      if (h > this.stableViewportH) {
        this.stableViewportH = h;
      }

      // Keep using the stable height.
      this.viewportW = w;
      this.viewportH = this.stableViewportH;
      return;
    }

    // Desktop / fine pointer: reflect actual viewport.
    this.viewportW = w;
    this.viewportH = h;
    this.stableViewportH = h;
  }

  private setPointerTargetFromClient(x: number, y: number): void {
    // Use our stabilized viewport size so touch mapping doesn't jitter when
    // mobile browser chrome changes the visual viewport.
    const nx = (x / Math.max(1, this.viewportW)) * 2 - 1;
    const ny = (y / Math.max(1, this.viewportH)) * 2 - 1;
    this.input.pointerTarget.set(
      Math.max(-1, Math.min(1, nx)),
      Math.max(-1, Math.min(1, ny))
    );
  }

  private isClientPointInRoot(x: number, y: number): boolean {
    const rect = this.root.getBoundingClientRect();
    return (
      x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
    );
  }

  private setPinchFromDistance(dist: number): void {
    if (this.input.pinchBaseDist <= 0) this.input.pinchBaseDist = dist;
    const raw =
      (dist - this.input.pinchBaseDist) / Math.max(1, this.input.pinchBaseDist);
    this.input.pinchTarget = Math.max(-1, Math.min(1, raw * 1.2));
  }

  private installInputHandlers(): void {
    const abort = new AbortController();
    const { signal } = abort;
    this.cleanup.push(() => abort.abort());

    // Desktop pointer.
    window.addEventListener(
      'pointermove',
      e => {
        if (e.pointerType === 'touch') return;
        this.setPointerTargetFromClient(e.clientX, e.clientY);
      },
      { passive: true, signal }
    );

    // Desktop click burst (parity with tap).
    window.addEventListener(
      'pointerdown',
      e => {
        if (e.pointerType === 'touch') return;
        if (!this.isClientPointInRoot(e.clientX, e.clientY)) return;
        this.root.dataset.ihTouched = '1';
        this.burst = Math.min(1, this.burst + 0.55);
        this.portalPressure = Math.min(1, this.portalPressure + 0.9);
        this.setPointerTargetFromClient(e.clientX, e.clientY);

        // Glass ripple impulse.
        this.addPortalRippleFromClient(e.clientX, e.clientY, 0.9);
      },
      { passive: true, signal }
    );

    // Touch pinch (mobile).
    const syncTouches = (touches: TouchList) => {
      // Remove old touch pointers
      for (const [id, meta] of this.pointers.entries()) {
        if (meta.type !== 'touch') continue;
        let stillPresent = false;
        for (let i = 0; i < touches.length; i++) {
          if (touches.item(i)?.identifier === id) {
            stillPresent = true;
            break;
          }
        }
        if (!stillPresent) this.pointers.delete(id);
      }

      // Add/update current touches inside root.
      for (let i = 0; i < touches.length; i++) {
        const t = touches.item(i);
        if (!t) continue;
        if (!this.isClientPointInRoot(t.clientX, t.clientY)) continue;
        this.pointers.set(t.identifier, {
          x: t.clientX,
          y: t.clientY,
          type: 'touch',
        });
      }

      if (this.pointers.size > 0) {
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
        this.setPointerTargetFromClient(cx, cy);

        if (pts.length >= 2) {
          const dx = pts[1].x - pts[0].x;
          const dy = pts[1].y - pts[0].y;
          const dist = Math.hypot(dx, dy);
          this.setPinchFromDistance(dist);
        }
      }

      if (touches.length < 2) {
        this.input.pinchBaseDist = 0;
        this.input.pinchTarget = 0;
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      // Only if the gesture is in our section.
      let anyInside = false;
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches.item(i);
        if (!t) continue;
        if (this.isClientPointInRoot(t.clientX, t.clientY)) {
          anyInside = true;
          break;
        }
      }
      if (!anyInside) return;

      this.root.dataset.ihTouched = '1';
      if (e.touches.length >= 2) this.input.pinchBaseDist = 0;

      // Tap burst.
      this.burst = Math.min(1, this.burst + 0.5);
      this.portalPressure = Math.min(1, this.portalPressure + 0.85);

      // Glass ripple impulse (use the first touch as the origin).
      const t0 = e.touches.item(0);
      if (t0) this.addPortalRippleFromClient(t0.clientX, t0.clientY, 0.85);

      syncTouches(e.touches);
    };

    const onTouchMove = (e: TouchEvent) => {
      let anyInside = false;
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches.item(i);
        if (!t) continue;
        if (this.isClientPointInRoot(t.clientX, t.clientY)) {
          anyInside = true;
          break;
        }
      }
      if (!anyInside) return;

      if (e.touches.length >= 2) e.preventDefault();
      syncTouches(e.touches);
    };

    const onTouchEnd = (e: TouchEvent) => {
      syncTouches(e.touches);
    };

    window.addEventListener('touchstart', onTouchStart, {
      passive: true,
      signal,
    });
    window.addEventListener('touchmove', onTouchMove, {
      passive: false,
      signal,
    });
    window.addEventListener('touchend', onTouchEnd, { passive: true, signal });
    window.addEventListener('touchcancel', onTouchEnd, {
      passive: true,
      signal,
    });
  }

  private createCore(): THREE.Mesh {
    const geo = new THREE.IcosahedronGeometry(
      1.15,
      this.caps.coarsePointer ? 2 : 3
    );
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.58, 0.65, 0.18),
      metalness: 0.22,
      roughness: 0.35,
      emissive: new THREE.Color(0x1d4ed8),
      emissiveIntensity: 0.55,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    return mesh;
  }

  private createShell(): THREE.LineSegments {
    const geo = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.45, 1));
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color().setHSL(0.55, 0.9, 0.62),
      transparent: true,
      opacity: 0.18,
    });
    const mesh = new THREE.LineSegments(geo, mat);
    return mesh;
  }

  private createRing(): THREE.Mesh {
    const geo = new THREE.TorusGeometry(
      1.75,
      0.04,
      12,
      this.caps.coarsePointer ? 64 : 96
    );
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.55, 0.95, 0.62),
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2.4;
    return mesh;
  }

  private createParticles(): THREE.Points {
    const count = this.caps.coarsePointer ? 220 : 420;
    const positions = new Float32Array(count * 3);

    const phase = new Float32Array(count);
    const speed = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const r = 2.6 + Math.random() * 3.2;
      const a = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 2.4;
      positions[idx] = Math.cos(a) * r;
      positions[idx + 1] = y;
      positions[idx + 2] = Math.sin(a) * r;

      phase[i] = Math.random() * Math.PI * 2;
      speed[i] = 0.6 + Math.random() * 1.1;
    }

    // Keep a stable base for cheap per-frame drift.
    this.particlesBasePositions = positions.slice();
    this.particlesPhase = phase;
    this.particlesSpeed = speed;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: new THREE.Color().setHSL(0.6, 0.85, 0.66),
      size: 0.03,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return new THREE.Points(geo, mat);
  }

  public resize(): void {
    if (this.destroyed) return;

    this.syncViewportSize(false);
    const w = Math.max(1, this.viewportW);
    const h = Math.max(1, this.viewportH);

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    const dpr = Math.min(this.caps.maxDpr, this.caps.devicePixelRatio);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);

    this.resizePortalTargets(w, h, dpr);
  }

  private computeScrollProgress(): number {
    const rect = this.root.getBoundingClientRect();
    // Use the stabilized viewport height to avoid energy/scroll jitter on
    // mobile browsers that change innerHeight during URL bar collapse.
    const total = rect.height - Math.max(1, this.viewportH);
    if (total <= 0) return 0;
    return Math.min(1, Math.max(0, -rect.top / total));
  }

  private getSceneConfig(scene: string | undefined): {
    hueA: number;
    hueB: number;
    fog: number;
    energyMul: number;
    hueAmp: number;
    ringTiltX: number;
    ringTiltY: number;
    shellOpacity: number;
    particleOpacity: number;
  } {
    switch (scene) {
      case 'interference':
        return {
          hueA: 190,
          hueB: 300,
          fog: 0.062,
          energyMul: 1.05,
          hueAmp: 46,
          ringTiltX: Math.PI / 2.55,
          ringTiltY: 0.08,
          shellOpacity: 0.2,
          particleOpacity: 0.34,
        };
      case 'field':
        return {
          hueA: 165,
          hueB: 255,
          fog: 0.052,
          energyMul: 1.0,
          hueAmp: 38,
          ringTiltX: Math.PI / 2.35,
          ringTiltY: -0.06,
          shellOpacity: 0.16,
          particleOpacity: 0.28,
        };
      case 'lensing':
        return {
          hueA: 210,
          hueB: 320,
          fog: 0.058,
          energyMul: 1.1,
          hueAmp: 44,
          ringTiltX: Math.PI / 2.7,
          ringTiltY: 0.12,
          shellOpacity: 0.18,
          particleOpacity: 0.33,
        };
      case 'collapse':
        return {
          hueA: 245,
          hueB: 330,
          fog: 0.07,
          energyMul: 1.18,
          hueAmp: 52,
          ringTiltX: Math.PI / 2.9,
          ringTiltY: -0.14,
          shellOpacity: 0.24,
          particleOpacity: 0.38,
        };
      case 'afterglow':
        return {
          hueA: 36,
          hueB: 285,
          fog: 0.048,
          energyMul: 0.92,
          hueAmp: 34,
          ringTiltX: Math.PI / 2.25,
          ringTiltY: 0.04,
          shellOpacity: 0.12,
          particleOpacity: 0.22,
        };
      case 'origin':
      default:
        return {
          hueA: 210,
          hueB: 280,
          fog: 0.055,
          energyMul: 1.0,
          hueAmp: 40,
          ringTiltX: Math.PI / 2.4,
          ringTiltY: 0,
          shellOpacity: 0.18,
          particleOpacity: 0.32,
        };
    }
  }

  private getModeBias(mode: string | undefined): {
    energyMul: number;
    burstMul: number;
    ringMul: number;
    hueAmpMul: number;
  } {
    switch (mode) {
      case 'boost':
        return {
          energyMul: 1.25,
          burstMul: 1.1,
          ringMul: 1.25,
          hueAmpMul: 1.05,
        };
      case 'prism':
        return {
          energyMul: 1.08,
          burstMul: 1.05,
          ringMul: 1.35,
          hueAmpMul: 1.25,
        };
      case 'pulse':
        return {
          energyMul: 1.15,
          burstMul: 1.35,
          ringMul: 1.2,
          hueAmpMul: 1.1,
        };
      case 'calm':
      default:
        return { energyMul: 1.0, burstMul: 1.0, ringMul: 1.0, hueAmpMul: 1.0 };
    }
  }

  public tick(): void {
    if (this.destroyed) return;
    if (this.contextLost) return;
    if (this.root.dataset.ihCenter === 'css') return;
    if (!this.tabVisible) return;

    const now = performance.now() / 1000;

    // Simple FPS limiter to reduce mobile jank/thermals.
    if (this.caps.coarsePointer) {
      const elapsed = now - this.lastFrameT;
      if (elapsed < this.frameInterval) return;
      this.lastFrameT = now;
    }

    // In case the visual viewport grew (URL bar collapsed), adopt the larger
    // size occasionally without constantly reallocating.
    if (this.caps.coarsePointer && Math.random() < 0.03) {
      const beforeH = this.viewportH;
      this.syncViewportSize(false);
      if (this.viewportH !== beforeH) this.resize();
    }

    const dt = Math.min(1 / 30, Math.max(1 / 240, now - this.lastT));
    this.lastT = now;

    // Portal pressure decays smoothly (press/tap adds energy to the lens).
    const damp = (cur: number, tgt: number, lambda: number) =>
      cur + (tgt - cur) * (1 - Math.exp(-lambda * dt));
    this.portalPressure = damp(this.portalPressure, 0, 2.6);

    if (!this.inView) {
      // Keep CSS vars updated occasionally for UI consistency.
      if (Math.random() < 0.02) this.writeCssVars(now);
      return;
    }

    // Smooth input.

    this.input.pointer.x = damp(
      this.input.pointer.x,
      this.input.pointerTarget.x,
      6
    );
    this.input.pointer.y = damp(
      this.input.pointer.y,
      this.input.pointerTarget.y,
      6
    );
    this.input.pinch = damp(this.input.pinch, this.input.pinchTarget, 7);

    const progress = this.computeScrollProgress();

    const sceneId = this.root.dataset.ihScene;
    const mode = this.root.dataset.mode;
    const sceneCfg = this.getSceneConfig(sceneId);
    const modeBias = this.getModeBias(mode);

    // Scene-change impulse: a tiny “beat” to help the scroll journey feel intentional.
    if (sceneId !== this.lastSceneId) {
      this.lastSceneId = sceneId;
      this.sceneBeat = 1;
      this.burst = Math.min(1, this.burst + 0.35);
      this.root.style.setProperty('--ih-scene-beat', '1');
      this.root.dataset.ihSceneBeat = String(Date.now());

      // Scene transition feels like a lens "thump".
      this.addPortalRippleFromClient(
        this.viewportW * 0.5,
        this.viewportH * 0.42,
        0.75
      );
    }

    // Beat decays over time.
    const beatDamp = (cur: number, tgt: number, lambda: number) =>
      cur + (tgt - cur) * (1 - Math.exp(-lambda * dt));
    this.sceneBeat = beatDamp(this.sceneBeat, 0, 3.6);
    this.root.style.setProperty('--ih-scene-beat', this.sceneBeat.toFixed(4));

    // Energy is scroll + touch + subtle idle.
    const energyTarget =
      0.15 +
      progress * 0.35 +
      Math.abs(this.input.pinch) * 0.25 +
      Math.min(
        0.35,
        Math.hypot(this.input.pointer.x, this.input.pointer.y) * 0.18
      );

    const energyTargetBiased =
      energyTarget * sceneCfg.energyMul * modeBias.energyMul;

    this.energy = damp(this.energy, energyTargetBiased, 3.8);
    this.burst = Math.min(
      1,
      this.burst * 0.92 + this.energy * 0.06 * modeBias.burstMul
    );

    // Smoothly drift scene palette + fog.
    this.sceneHueA = damp(this.sceneHueA, sceneCfg.hueA, 1.6);
    this.sceneHueB = damp(this.sceneHueB, sceneCfg.hueB, 1.6);
    this.fogDensity = damp(this.fogDensity, sceneCfg.fog, 1.0);
    const fog = this.scene.fog as THREE.FogExp2 | null;
    if (fog) fog.density = this.fogDensity;

    // Scene motion targets (beats).
    this.ringTiltXTarget = sceneCfg.ringTiltX;
    this.ringTiltYTarget = sceneCfg.ringTiltY;
    this.shellOpacityTarget = sceneCfg.shellOpacity;
    this.particleOpacityTarget = sceneCfg.particleOpacity;

    // Animate.
    this.group.rotation.y = now * 0.15 + this.input.pointer.x * 0.35;
    this.group.rotation.x = -0.12 + this.input.pointer.y * -0.22;

    const wobble = Math.sin(now * 1.1) * 0.06 * (0.6 + this.energy);
    this.core.rotation.y += dt * (0.45 + this.energy * 0.35);
    this.core.rotation.x += dt * 0.25;
    this.core.scale.setScalar(1 + wobble);

    this.ring.rotation.z = now * (0.35 + this.energy * 0.25);
    this.ringTiltX = damp(this.ringTiltX, this.ringTiltXTarget, 2.0);
    this.ringTiltY = damp(this.ringTiltY, this.ringTiltYTarget, 2.0);
    this.ring.rotation.x = this.ringTiltX + this.sceneBeat * 0.12;
    this.ring.rotation.y =
      this.ringTiltY + Math.sin(now * 0.9) * 0.04 * this.energy;

    // Tiny scale breathing to keep the silhouette feeling alive.
    const ringBreath = 1 + Math.sin(now * 1.0) * 0.01 + this.sceneBeat * 0.05;
    this.ring.scale.setScalar(ringBreath);

    this.shell.rotation.y = now * 0.2;

    const camZ = 7.2 - this.input.pinch * 0.9;
    this.camera.position.x = damp(
      this.camera.position.x,
      this.input.pointer.x * 0.9,
      5
    );
    this.camera.position.y = damp(
      this.camera.position.y,
      this.input.pointer.y * 0.6,
      5
    );
    this.camera.position.z = damp(this.camera.position.z, camZ, 4);
    this.camera.lookAt(0, 0, 0);

    // Subtle color drift (scene-driven base + scroll drift).
    const hueAmp = (sceneCfg.hueAmp * modeBias.hueAmpMul) / 360;
    const hue =
      this.sceneHueA / 360 + Math.sin(progress * Math.PI * 2) * hueAmp;
    const hue2 =
      this.sceneHueB / 360 + Math.cos(progress * Math.PI * 2) * hueAmp;

    const coreMat = this.core.material as THREE.MeshStandardMaterial;
    coreMat.color.setHSL(hue, 0.65, 0.18);
    coreMat.emissive.setHSL(hue2, 0.9, 0.35);
    coreMat.emissiveIntensity = 0.45 + this.energy * 0.45;

    const ringMat = this.ring.material as THREE.MeshBasicMaterial;
    ringMat.color.setHSL(hue2, 0.95, 0.62);
    ringMat.opacity = (0.12 + this.energy * 0.22) * modeBias.ringMul;

    const shellMat = this.shell.material as THREE.LineBasicMaterial;
    shellMat.color.setHSL(hue, 0.9, 0.65);
    shellMat.opacity =
      0.06 + this.energy * 0.16 + this.shellOpacityTarget * 0.3;

    const pMat = this.particles.material as THREE.PointsMaterial;
    pMat.color.setHSL(hue, 0.85, 0.67);
    pMat.opacity =
      0.14 + this.energy * 0.22 + this.particleOpacityTarget * 0.25;

    // Lightweight particle drift (CPU) for better motion richness.
    // This stays intentionally subtle and avoids any allocations per frame.
    const base = this.particlesBasePositions;
    const phase = this.particlesPhase;
    const speed = this.particlesSpeed;
    const pGeo = this.particles.geometry as THREE.BufferGeometry;
    const pAttr = pGeo.getAttribute('position') as THREE.BufferAttribute | null;
    if (base && phase && speed && pAttr?.array instanceof Float32Array) {
      const arr = pAttr.array as Float32Array;
      const count = phase.length;
      const driftScale =
        (0.04 + this.energy * 0.08) * (this.caps.coarsePointer ? 0.8 : 1);
      const beat = this.sceneBeat;

      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        const bx = base[idx];
        const by = base[idx + 1];
        const bz = base[idx + 2];

        const w = now * speed[i] + phase[i];
        const bob = Math.sin(w) * driftScale;
        const swirl = Math.cos(w * 0.72) * driftScale * 0.55;
        const pulse = Math.sin(w * 1.35) * (0.012 + beat * 0.04);

        const r = Math.hypot(bx, bz) || 1;
        const nx = bx / r;
        const nz = bz / r;

        arr[idx] = bx + nx * (swirl + pulse);
        arr[idx + 1] = by + bob;
        arr[idx + 2] = bz + nz * (swirl + pulse);
      }

      pAttr.needsUpdate = true;
      pMat.size = 0.028 + this.energy * 0.01;
    }

    // Update portal uniforms (fullscreen glass composite).
    if (this.portalMaterial) {
      const u = this.portalMaterial.uniforms;
      u.uTime.value = now;
      // Center follows pointer subtly (mobile-friendly: small motion).
      const cx = 0.5 + this.input.pointer.x * 0.08;
      const cy = 0.5 - this.input.pointer.y * 0.06;
      this.portalCenterX = Math.max(0.25, Math.min(0.75, cx));
      this.portalCenterY = Math.max(0.25, Math.min(0.75, cy));
      u.uCenter.value.set(this.portalCenterX, this.portalCenterY);

      // Radius breathes with scroll + pinch; always readable on mobile.
      const radius = 0.33 + progress * 0.06 + Math.abs(this.input.pinch) * 0.03;
      this.portalRadius = Math.max(0.26, Math.min(0.46, radius));
      u.uRadius.value = this.portalRadius;
      u.uSoftness.value = this.caps.coarsePointer ? 0.13 : 0.12;

      const distortBase = this.caps.coarsePointer ? 0.02 : 0.018;
      u.uDistort.value =
        distortBase + (0.012 + this.energy * 0.02) + this.sceneBeat * 0.012;
      u.uEnergy.value = this.energy;
      u.uBeat.value = this.sceneBeat;
      u.uPressure.value = this.portalPressure;
    }

    // Render.
    if (this.portalTarget && this.portalScene && this.portalCamera) {
      this.renderer.setRenderTarget(this.portalTarget);
      this.renderer.clear(true, true, true);
      this.renderer.render(this.scene, this.camera);

      this.renderer.setRenderTarget(null);
      this.renderer.clear(true, true, true);
      this.renderer.render(this.portalScene, this.portalCamera);
    } else {
      // Fallback: direct render.
      this.renderer.render(this.scene, this.camera);
    }

    this.writeCssVars(now);
  }

  private writeCssVars(time: number): void {
    const progress = this.computeScrollProgress();
    this.root.style.setProperty('--ih-scroll', progress.toFixed(4));
    this.root.style.setProperty(
      '--ih-parallax-x',
      this.input.pointer.x.toFixed(4)
    );
    this.root.style.setProperty(
      '--ih-parallax-y',
      this.input.pointer.y.toFixed(4)
    );
    // Compatibility with existing CSS naming.
    this.root.style.setProperty(
      '--ih-pointer-x',
      this.input.pointer.x.toFixed(4)
    );
    this.root.style.setProperty(
      '--ih-pointer-y',
      this.input.pointer.y.toFixed(4)
    );
    this.root.style.setProperty('--ih-energy-soft', this.energy.toFixed(4));
    this.root.style.setProperty('--ih-burst', this.burst.toFixed(4));
    this.root.style.setProperty(
      '--ih-pressure',
      this.portalPressure.toFixed(4)
    );
    this.root.style.setProperty(
      '--ih-event',
      Math.min(1, this.energy * 0.85).toFixed(4)
    );
    this.root.style.setProperty('--ih-pinch', this.input.pinch.toFixed(4));
    this.root.style.setProperty(
      '--ih-quality',
      (this.caps.coarsePointer ? 0.75 : 1).toFixed(4)
    );

    // Match existing CSS expectations (scene-driven base in degrees).
    const sceneId = this.root.dataset.ihScene;
    const mode = this.root.dataset.mode;
    const sceneCfg = this.getSceneConfig(sceneId);
    const modeBias = this.getModeBias(mode);

    const hueAmpDeg = sceneCfg.hueAmp * modeBias.hueAmpMul;
    const hue = this.sceneHueA + Math.sin(progress * Math.PI * 2) * hueAmpDeg;
    const hue2 = this.sceneHueB + Math.cos(progress * Math.PI * 2) * hueAmpDeg;
    this.root.style.setProperty('--ih-hue', hue.toFixed(2));
    this.root.style.setProperty('--ih-hue-2', hue2.toFixed(2));
    this.root.style.setProperty('--ih-scene', sceneId ?? '');

    // Clean intensity signal.
    const impact = Math.min(
      1,
      this.burst * 0.8 + this.energy * 0.7 + Math.abs(this.input.pinch) * 0.25
    );
    this.root.style.setProperty('--ih-impact', impact.toFixed(4));
    this.root.style.setProperty(
      '--ih-grade',
      Math.min(1, this.energy * 0.55).toFixed(4)
    );

    // Portal UI integration.
    this.root.style.setProperty('--ih-portal-x', this.portalCenterX.toFixed(4));
    this.root.style.setProperty('--ih-portal-y', this.portalCenterY.toFixed(4));
    this.root.style.setProperty('--ih-portal-r', this.portalRadius.toFixed(4));

    // Keep a heartbeat for debugging.
    const shouldWriteDebug =
      this.root.dataset.ihDebug === '1' ||
      (this.root.dataset.ihStatus && this.root.dataset.ihStatus !== 'ok');

    if (shouldWriteDebug) {
      this.root.dataset.ihT = time.toFixed(2);

      if (this.debugEl) {
        const status = this.getStatus();
        this.debugEl.textContent = [
          `ih2: ${status.center} (${status.status})`,
          status.detail ? `detail: ${status.detail}` : '',
          `webgl: ${this.root.dataset.ihWebgl ?? ''} prec:${this.root.dataset.ihPrec ?? ''}`,
          `dpr: ${this.renderer.getPixelRatio().toFixed(2)}  inView:${this.inView ? '1' : '0'}`,
          `scroll: ${progress.toFixed(3)}  energy:${this.energy.toFixed(3)}  burst:${this.burst.toFixed(3)}`,
        ]
          .filter(Boolean)
          .join('\n');
      }
    }
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.cleanup.forEach(fn => fn());
    this.cleanup = [];

    try {
      this.io?.disconnect();
    } catch {
      // ignore
    }

    try {
      this.core.geometry.dispose();
      (this.core.material as THREE.Material).dispose();
      this.ring.geometry.dispose();
      (this.ring.material as THREE.Material).dispose();
      this.shell.geometry.dispose();
      (this.shell.material as THREE.Material).dispose();
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();

      try {
        (
          this.portalMesh?.geometry as THREE.BufferGeometry | undefined
        )?.dispose?.();
      } catch {
        // ignore
      }
      try {
        this.portalMaterial?.dispose();
      } catch {
        // ignore
      }
      try {
        this.portalTarget?.dispose();
      } catch {
        // ignore
      }

      this.renderer.dispose();
    } catch {
      // ignore
    }
  }
}
