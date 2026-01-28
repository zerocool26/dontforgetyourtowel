import * as THREE from 'three';
import { getTowerCaps } from './tower3d/core/caps';
import { AuroraCurtainScene } from './tower3d/three/scenes/definitions/AuroraCurtainScene';
import { ElectricStormScene } from './tower3d/three/scenes/definitions/ElectricStormScene';
import { HolographicCityScene } from './tower3d/three/scenes/definitions/HolographicCityScene';
import { NeuralNetworkScene } from './tower3d/three/scenes/definitions/NeuralNetworkScene';
import type {
  SceneRuntime,
  TowerScene,
} from './tower3d/three/scenes/definitions/types';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

// Keep this small on purpose: the homepage should ship one standout chapter,
// with graceful fallbacks for reduced-motion / low-tier devices.
export type HeroSceneVariant =
  | 'auto'
  | 'neural' // Scene 11 — Neural Constellation (preferred)
  | 'city' // Scene 14 — Neon Metropolis
  | 'storm' // Scene 16 — Ethereal Storm
  | 'aurora'; // Scene 04 — Aurora Curtains

export function createHeroScene(
  canvas: HTMLCanvasElement,
  options: { variant?: HeroSceneVariant } = {}
) {
  const caps = getTowerCaps();
  if (!caps.webgl) return () => {};

  const variant = options.variant ?? 'auto';

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !caps.coarsePointer,
    powerPreference: 'high-performance',
  });

  let root = canvas.parentElement as HTMLElement | null;
  if (!root) root = document.body;

  let width = Math.max(1, canvas.clientWidth || root.clientWidth || 1);
  let height = Math.max(1, canvas.clientHeight || root.clientHeight || 1);
  let dpr = Math.min(caps.devicePixelRatio, caps.maxDpr);

  renderer.setPixelRatio(dpr);
  renderer.setSize(width, height, false);

  const pickScene = (): TowerScene => {
    if (variant === 'neural') return new NeuralNetworkScene();
    if (variant === 'city') return new HolographicCityScene();
    if (variant === 'storm') return new ElectricStormScene();
    if (variant === 'aurora') return new AuroraCurtainScene();

    if (caps.reducedMotion || caps.performanceTier === 'low') {
      return new AuroraCurtainScene();
    }

    // Default: use a real chapter from the gallery (Scene 11).
    // It reads well behind typography and stays performant.
    return new NeuralNetworkScene();
  };

  const scene = pickScene();

  // Raw pointer is immediate; smoothed pointer is fed to scenes
  // to keep the hero feeling premium (less twitchy, more cinematic).
  const rawPointer = new THREE.Vector2(0, 0);
  const pointer = new THREE.Vector2(0, 0);
  const prevPointer = new THREE.Vector2(0, 0);
  const pointerVelocity = new THREE.Vector2(0, 0);

  let lastPointerChange = performance.now();

  let press = 0;
  let pressTarget = 0;
  let tap = 0;

  const gyro = new THREE.Vector3(0, 0, 0);
  const audio = { level: 0, low: 0, mid: 0, high: 0 };

  const makeCtx = (dt: number, time: number): SceneRuntime => ({
    renderer,
    root: root!,
    size: { width, height, dpr },
    pointer,
    pointerVelocity,
    scrollVelocity: 0,
    dt,
    time,
    progress: 0,
    localProgress: 0,
    caps,
    gyro,
    gyroActive: false,
    bgTheme: 'dark',
    press,
    tap,
    sceneId: scene.id,
    sceneIndex: -1,
    audio,
  });

  // Initial layout
  scene.resize(makeCtx(0, 0));
  scene.init(makeCtx(0, 0));
  scene.resize(makeCtx(0, 0));

  // Input: pointer (works for mouse + touch/stylus)
  const handlePointerMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    rawPointer.set(x, y);
    lastPointerChange = performance.now();
  };

  const handlePointerDown = () => {
    pressTarget = 1;
    tap = 1;
  };

  const handlePointerUp = () => {
    pressTarget = 0;
  };

  const interactive = !caps.reducedMotion;
  if (interactive) {
    canvas.addEventListener('pointermove', handlePointerMove, {
      passive: true,
    });
    canvas.addEventListener('pointerdown', handlePointerDown, {
      passive: true,
    });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
  }

  const handleResize = () => {
    const nextW = Math.max(1, canvas.clientWidth || root!.clientWidth || 1);
    const nextH = Math.max(1, canvas.clientHeight || root!.clientHeight || 1);
    const nextDpr = Math.min(caps.devicePixelRatio, caps.maxDpr);

    if (nextW === width && nextH === height && nextDpr === dpr) return;
    width = nextW;
    height = nextH;
    dpr = nextDpr;

    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    scene.resize(makeCtx(0, 0));
  };

  window.addEventListener('resize', handleResize);
  const resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(root);

  // Render
  if (caps.reducedMotion) {
    const ctx = makeCtx(0, 0);
    scene.update(ctx);
    if (scene.render) scene.render(ctx);
    else renderer.render(scene.group, scene.camera);
    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      if (interactive) {
        canvas.removeEventListener('pointermove', handlePointerMove);
        canvas.removeEventListener('pointerdown', handlePointerDown);
        window.removeEventListener('pointerup', handlePointerUp);
      }
      scene.dispose();
      renderer.dispose();
    };
  }

  let raf = 0;
  const clock = new THREE.Clock();
  let running = true;
  let active = true;

  const setActive = (next: boolean) => {
    active = next;
    if (active) {
      clock.getDelta();
    }
  };

  const handleVisibility = () => {
    setActive(document.visibilityState === 'visible');
  };
  document.addEventListener('visibilitychange', handleVisibility);

  const io = new IntersectionObserver(
    entries => {
      const entry = entries[0];
      if (!entry) return;
      setActive(Boolean(entry.isIntersecting));
    },
    { root: null, threshold: 0.01 }
  );
  io.observe(root);

  const loop = () => {
    if (!running) return;
    raf = requestAnimationFrame(loop);

    if (!active) return;

    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.getElapsedTime();

    // Smooth pointer + subtle idle drift to keep the hero alive.
    const idleMs = performance.now() - lastPointerChange;
    const idle = Math.min(1, Math.max(0, (idleMs - 800) / 2400));
    const driftX = Math.sin(time * 0.35) * 0.18 * idle;
    const driftY = Math.cos(time * 0.27) * 0.12 * idle;

    const targetX = THREE.MathUtils.clamp(rawPointer.x + driftX, -1, 1);
    const targetY = THREE.MathUtils.clamp(rawPointer.y + driftY, -1, 1);
    pointer.x = damp(pointer.x, targetX, 10, dt);
    pointer.y = damp(pointer.y, targetY, 10, dt);

    pointerVelocity
      .copy(pointer)
      .sub(prevPointer)
      .divideScalar(Math.max(dt, 1e-4));
    prevPointer.copy(pointer);

    press = damp(press, pressTarget, 10, dt);

    const ctx = makeCtx(dt, time);
    scene.update(ctx);
    if (scene.render) scene.render(ctx);
    else renderer.render(scene.group, scene.camera);

    tap = 0;
  };

  loop();

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    document.removeEventListener('visibilitychange', handleVisibility);
    io.disconnect();
    window.removeEventListener('resize', handleResize);
    resizeObserver.disconnect();
    if (interactive) {
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
    }
    scene.dispose();
    renderer.dispose();
  };
}
