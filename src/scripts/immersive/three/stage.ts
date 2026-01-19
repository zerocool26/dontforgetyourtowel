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
  private energy = 0;
  private burst = 0;

  private cleanup: Cleanup[] = [];

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
    this.scene.fog = new THREE.FogExp2(0x070b18, 0.055);

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

    this.resize();

    this.setDataset({ center: 'webgl', status: 'ok' });

    // Used by the UI hint to show after the first successful init.
    this.root.dataset.ihRendered = '1';
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

  private setPointerTargetFromClient(x: number, y: number): void {
    const nx = (x / Math.max(1, window.innerWidth)) * 2 - 1;
    const ny = (y / Math.max(1, window.innerHeight)) * 2 - 1;
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

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const r = 2.6 + Math.random() * 3.2;
      const a = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 2.4;
      positions[idx] = Math.cos(a) * r;
      positions[idx + 1] = y;
      positions[idx + 2] = Math.sin(a) * r;
    }

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

    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    const dpr = Math.min(this.caps.maxDpr, this.caps.devicePixelRatio);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
  }

  private computeScrollProgress(): number {
    const rect = this.root.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    if (total <= 0) return 0;
    return Math.min(1, Math.max(0, -rect.top / total));
  }

  public tick(): void {
    if (this.destroyed) return;
    if (this.contextLost) return;
    if (this.root.dataset.ihCenter === 'css') return;
    if (!this.tabVisible) return;

    const now = performance.now() / 1000;
    const dt = Math.min(1 / 30, Math.max(1 / 240, now - this.lastT));
    this.lastT = now;

    if (!this.inView) {
      // Keep CSS vars updated occasionally for UI consistency.
      if (Math.random() < 0.02) this.writeCssVars(now);
      return;
    }

    // Smooth input.
    const damp = (cur: number, tgt: number, lambda: number) =>
      cur + (tgt - cur) * (1 - Math.exp(-lambda * dt));

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

    // Energy is scroll + touch + subtle idle.
    const energyTarget =
      0.15 +
      progress * 0.35 +
      Math.abs(this.input.pinch) * 0.25 +
      Math.min(
        0.35,
        Math.hypot(this.input.pointer.x, this.input.pointer.y) * 0.18
      );

    this.energy = damp(this.energy, energyTarget, 3.8);
    this.burst = Math.min(1, this.burst * 0.92 + this.energy * 0.06);

    // Animate.
    this.group.rotation.y = now * 0.15 + this.input.pointer.x * 0.35;
    this.group.rotation.x = -0.12 + this.input.pointer.y * -0.22;

    const wobble = Math.sin(now * 1.1) * 0.06 * (0.6 + this.energy);
    this.core.rotation.y += dt * (0.45 + this.energy * 0.35);
    this.core.rotation.x += dt * 0.25;
    this.core.scale.setScalar(1 + wobble);

    this.ring.rotation.z = now * (0.35 + this.energy * 0.25);
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

    // Subtle color drift.
    const hue = 0.55 + Math.sin(progress * Math.PI * 2) * 0.07;
    const hue2 = 0.62 + Math.cos(progress * Math.PI * 2) * 0.08;

    const coreMat = this.core.material as THREE.MeshStandardMaterial;
    coreMat.color.setHSL(hue, 0.65, 0.18);
    coreMat.emissive.setHSL(hue2, 0.9, 0.35);
    coreMat.emissiveIntensity = 0.45 + this.energy * 0.45;

    const ringMat = this.ring.material as THREE.MeshBasicMaterial;
    ringMat.color.setHSL(hue2, 0.95, 0.62);
    ringMat.opacity = 0.12 + this.energy * 0.22;

    const shellMat = this.shell.material as THREE.LineBasicMaterial;
    shellMat.color.setHSL(hue, 0.9, 0.65);
    shellMat.opacity = 0.08 + this.energy * 0.18;

    const pMat = this.particles.material as THREE.PointsMaterial;
    pMat.color.setHSL(hue, 0.85, 0.67);
    pMat.opacity = 0.18 + this.energy * 0.24;

    // Render.
    this.renderer.render(this.scene, this.camera);

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
      '--ih-event',
      Math.min(1, this.energy * 0.85).toFixed(4)
    );
    this.root.style.setProperty('--ih-pinch', this.input.pinch.toFixed(4));
    this.root.style.setProperty(
      '--ih-quality',
      (this.caps.coarsePointer ? 0.75 : 1).toFixed(4)
    );

    // Match existing CSS expectations.
    const hue = 210 + Math.sin(progress * Math.PI * 2) * 35;
    const hue2 = 280 + Math.cos(progress * Math.PI * 2) * 35;
    this.root.style.setProperty('--ih-hue', hue.toFixed(2));
    this.root.style.setProperty('--ih-hue-2', hue2.toFixed(2));

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
      this.renderer.dispose();
    } catch {
      // ignore
    }
  }
}
