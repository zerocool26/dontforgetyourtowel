import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

import { onReducedMotionChange } from '../utils/a11y';
import { createDropZone } from '../utils/drag-drop';
import { withBasePath } from '../utils/helpers';
import { createSafeWebGLRenderer } from './tower3d/three/renderer-factory';

type LoadState = {
  requestId: number;
  objectUrlToRevoke: string | null;
  gltf: THREE.Object3D | null;
  animations: THREE.AnimationClip[];
};

type PanelSnap = 'collapsed' | 'peek' | 'half' | 'full';

const ROOT = '[data-sr-root]';

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));
const clamp01 = (v: number) => clamp(v, 0, 1);

const formatInt = (n: number) =>
  Math.round(Math.max(0, n)).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });

const getMeshTriangleCount = (mesh: THREE.Mesh) => {
  const geom = mesh.geometry as THREE.BufferGeometry | undefined;
  if (!geom) return 0;
  const idx = geom.getIndex();
  if (idx) return Math.floor(idx.count / 3);
  const pos = geom.getAttribute('position');
  if (!pos) return 0;
  return Math.floor(pos.count / 3);
};

const collectMaterialTextures = (material: THREE.Material) => {
  const textures: THREE.Texture[] = [];
  const anyMat = material as unknown as Record<string, unknown>;
  for (const k of Object.keys(anyMat)) {
    const v = anyMat[k];
    if (!v || typeof v !== 'object') continue;
    const tex = v as unknown as THREE.Texture;
    if ('isTexture' in tex) textures.push(tex);
  }
  return textures;
};

const isExternalUrl = (value: string) =>
  /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value);

const resolveModelUrl = (raw: string): string => {
  const v = (raw || '').trim();
  if (!v) return withBasePath('/models/porsche-911-gt3rs.glb');
  if (isExternalUrl(v) || v.startsWith('blob:')) return v;
  const normalized = v.startsWith('/') ? v : `/${v}`;
  return withBasePath(normalized);
};

const parseHexColor = (value: string): string | null => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const hex = raw.startsWith('#') ? raw : `#${raw}`;
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toLowerCase() : null;
};

const disposeObject = (obj: THREE.Object3D) => {
  obj.traverse(child => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;

    mesh.geometry?.dispose?.();

    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (!mat) continue;
      const anyMat = mat as unknown as Record<string, unknown>;
      for (const key of Object.keys(anyMat)) {
        const v = anyMat[key];
        if (v && typeof v === 'object') {
          const tex = v as unknown as THREE.Texture;
          if ('isTexture' in tex) tex.dispose?.();
        }
      }
      (mat as THREE.Material).dispose?.();
    }
  });
};

const getObjectCenterAndRadius = (obj: THREE.Object3D) => {
  const box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const radius = 0.5 * Math.max(size.x, size.y, size.z);
  return { center, radius: Math.max(0.01, radius), box };
};

const normalizeModelPlacement = (obj: THREE.Object3D) => {
  obj.updateWorldMatrix(true, true);

  const { box } = getObjectCenterAndRadius(obj);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  // Gentle autoscale only when units are wildly off.
  if (maxDim > 20 || maxDim < 0.2) {
    const target = 6;
    const s = maxDim > 0 ? target / maxDim : 1;
    obj.scale.multiplyScalar(s);
    obj.updateWorldMatrix(true, true);
  }

  const box2 = new THREE.Box3().setFromObject(obj);
  const center2 = box2.getCenter(new THREE.Vector3());
  const min = box2.min;

  obj.position.x -= center2.x;
  obj.position.z -= center2.z;
  obj.position.y -= min.y;
  obj.updateWorldMatrix(true, true);
};

const applyPaintHeuristic = (rootObj: THREE.Object3D, hex: string) => {
  const color = new THREE.Color(hex);

  rootObj.traverse(child => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;

    const meshName = String(mesh.name || '').toLowerCase();
    if (
      meshName.includes('wheel') ||
      meshName.includes('tire') ||
      meshName.includes('rim') ||
      meshName.includes('brake')
    ) {
      return;
    }

    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (!mat) continue;
      const material = mat as THREE.Material;
      const matName = String(material.name || '').toLowerCase();
      if (
        matName.includes('glass') ||
        matName.includes('window') ||
        matName.includes('light')
      ) {
        continue;
      }

      const anyMat = material as unknown as {
        transparent?: boolean;
        opacity?: number;
      };
      if (anyMat.transparent || (anyMat.opacity ?? 1) < 0.999) continue;

      if (
        material instanceof THREE.MeshStandardMaterial ||
        material instanceof THREE.MeshPhysicalMaterial
      ) {
        material.color.set(color);
        material.needsUpdate = true;
      }
    }
  });
};

type MaterialSnapshot = {
  colorHex?: number;
  emissiveHex?: number;
  emissiveIntensity?: number;
  roughness?: number;
  metalness?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  transmission?: number;
  thickness?: number;
  ior?: number;
  opacity?: number;
  transparent?: boolean;
  envMapIntensity?: number;
  map?: THREE.Texture | null;
};

const snapshotMaterial = (mat: THREE.Material): MaterialSnapshot => {
  const s: MaterialSnapshot = {};
  if (
    mat instanceof THREE.MeshStandardMaterial ||
    mat instanceof THREE.MeshPhysicalMaterial
  ) {
    s.colorHex = mat.color.getHex();
    s.emissiveHex = mat.emissive?.getHex?.();
    s.emissiveIntensity = mat.emissiveIntensity;
    s.roughness = mat.roughness;
    s.metalness = mat.metalness;
    s.opacity = mat.opacity;
    s.transparent = mat.transparent;
    s.envMapIntensity = mat.envMapIntensity;
    s.map = mat.map;
    if (mat instanceof THREE.MeshPhysicalMaterial) {
      s.clearcoat = mat.clearcoat;
      s.clearcoatRoughness = mat.clearcoatRoughness;
      s.transmission = mat.transmission;
      s.thickness = mat.thickness;
      s.ior = mat.ior;
    }
  }
  return s;
};

const restoreMaterial = (mat: THREE.Material, snap: MaterialSnapshot) => {
  if (
    !(mat instanceof THREE.MeshStandardMaterial) &&
    !(mat instanceof THREE.MeshPhysicalMaterial)
  ) {
    return;
  }

  if (snap.colorHex !== undefined) mat.color.setHex(snap.colorHex);
  if (snap.emissiveHex !== undefined && mat.emissive)
    mat.emissive.setHex(snap.emissiveHex);
  if (snap.emissiveIntensity !== undefined)
    mat.emissiveIntensity = snap.emissiveIntensity;
  if (snap.roughness !== undefined) mat.roughness = snap.roughness;
  if (snap.metalness !== undefined) mat.metalness = snap.metalness;
  if (snap.opacity !== undefined) mat.opacity = snap.opacity;
  if (snap.transparent !== undefined) mat.transparent = snap.transparent;
  if (snap.envMapIntensity !== undefined)
    mat.envMapIntensity = snap.envMapIntensity;
  if (snap.map !== undefined) mat.map = snap.map;

  if (mat instanceof THREE.MeshPhysicalMaterial) {
    if (snap.clearcoat !== undefined) mat.clearcoat = snap.clearcoat;
    if (snap.clearcoatRoughness !== undefined)
      mat.clearcoatRoughness = snap.clearcoatRoughness;
    if (snap.transmission !== undefined) mat.transmission = snap.transmission;
    if (snap.thickness !== undefined) mat.thickness = snap.thickness;
    if (snap.ior !== undefined) mat.ior = snap.ior;
  }

  mat.needsUpdate = true;
};

const normalizeName = (s: string) =>
  String(s || '')
    .trim()
    .toLowerCase();

const safeTrimText = (value: string, maxLen: number) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, Math.max(0, maxLen));

const classifyMeshByName = (meshName: string, matName: string) => {
  const n = `${normalizeName(meshName)} ${normalizeName(matName)}`;

  const isWheel =
    (n.includes('wheel') || n.includes('rim')) && !n.includes('tire');
  const isCaliper = n.includes('caliper');
  const isGlass =
    n.includes('glass') ||
    n.includes('window') ||
    n.includes('windshield') ||
    n.includes('windscreen');
  const isLight =
    n.includes('light') ||
    n.includes('lamp') ||
    n.includes('head') ||
    n.includes('tail');
  const isTrim =
    n.includes('trim') ||
    n.includes('chrome') ||
    n.includes('badge') ||
    n.includes('emblem') ||
    n.includes('mirror') ||
    n.includes('grill') ||
    n.includes('grille') ||
    n.includes('exhaust') ||
    n.includes('handle');

  return { isWheel, isCaliper, isGlass, isLight, isTrim };
};

const createWrapTexture = (pattern: string, tint01: number) => {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const tint = clamp01(tint01);
  const white = 255;
  const dark = Math.round(white * (1 - 0.45 * tint));

  ctx.fillStyle = `rgb(${white},${white},${white})`;
  ctx.fillRect(0, 0, size, size);

  const p = normalizeName(pattern || 'solid');
  if (p === 'solid') {
    // leave white
  } else if (p === 'stripes') {
    ctx.fillStyle = `rgb(${dark},${dark},${dark})`;
    const w = Math.max(6, Math.round(36 - tint * 16));
    for (let x = -w; x < size + w; x += w * 2) {
      ctx.fillRect(x, 0, w, size);
    }
  } else if (p === 'checker') {
    const cell = Math.max(12, Math.round(52 - tint * 22));
    for (let y = 0; y < size; y += cell) {
      for (let x = 0; x < size; x += cell) {
        const on = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0;
        ctx.fillStyle = on
          ? `rgb(${white},${white},${white})`
          : `rgb(${dark},${dark},${dark})`;
        ctx.fillRect(x, y, cell, cell);
      }
    }
  } else if (p === 'carbon') {
    ctx.fillStyle = `rgb(${dark},${dark},${dark})`;
    const step = Math.max(6, Math.round(18 - tint * 8));
    for (let y = -size; y < size * 2; y += step) {
      ctx.fillRect(0, y, size, Math.max(1, Math.round(step * 0.4)));
    }
    ctx.globalAlpha = 0.55;
    for (let x = -size; x < size * 2; x += step) {
      ctx.fillRect(x, 0, Math.max(1, Math.round(step * 0.4)), size);
    }
    ctx.globalAlpha = 1;
  } else if (p === 'hex') {
    const r = Math.max(10, Math.round(26 - tint * 10));
    const h = Math.sin(Math.PI / 3) * r;
    ctx.strokeStyle = `rgb(${dark},${dark},${dark})`;
    ctx.lineWidth = Math.max(1, Math.round(2 + tint));
    for (let y = -r; y < size + r; y += h * 2) {
      for (let x = -r; x < size + r; x += r * 3) {
        const ox = ((y / (h * 2)) % 2) * (r * 1.5);
        const cx = x + ox;
        const cy = y;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i;
          const px = cx + Math.cos(a) * r;
          const py = cy + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
  } else if (p === 'camo') {
    const blobs = Math.round(28 + tint * 40);
    for (let i = 0; i < blobs; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = (Math.random() * 0.18 + 0.05) * size;
      const g = Math.round(
        white - (white - dark) * (0.4 + Math.random() * 0.6)
      );
      ctx.fillStyle = `rgb(${g},${g},${g})`;
      ctx.beginPath();
      ctx.ellipse(
        x,
        y,
        r,
        r * (0.6 + Math.random() * 0.6),
        Math.random() * Math.PI,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  } else if (p === 'race') {
    ctx.fillStyle = `rgb(${dark},${dark},${dark})`;
    const stripeW = Math.max(18, Math.round(70 - tint * 28));
    const gap = Math.max(10, Math.round(28 - tint * 10));
    const cx = Math.round(size * 0.55);
    ctx.fillRect(cx - stripeW - gap, 0, stripeW, size);
    ctx.fillRect(cx + gap, 0, stripeW, size);
  } else {
    // unknown pattern: leave white
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
};

const setRootState = (
  root: HTMLElement,
  next: Partial<
    Pick<
      DOMStringMap,
      | 'carShowroomReady'
      | 'carShowroomLoading'
      | 'carShowroomLoadError'
      | 'carShowroomLoadPhase'
      | 'carShowroomModel'
    >
  >
) => {
  const ds = root.dataset;
  if (next.carShowroomReady !== undefined)
    ds.carShowroomReady = next.carShowroomReady;
  if (next.carShowroomLoading !== undefined)
    ds.carShowroomLoading = next.carShowroomLoading;
  if (next.carShowroomLoadError !== undefined)
    ds.carShowroomLoadError = next.carShowroomLoadError;
  if (next.carShowroomLoadPhase !== undefined)
    ds.carShowroomLoadPhase = next.carShowroomLoadPhase;
  if (next.carShowroomModel !== undefined)
    ds.carShowroomModel = next.carShowroomModel;
};

const isMobile = () => window.matchMedia('(max-width: 980px)').matches;

const initPanel = (root: HTMLElement) => {
  const panel = root.querySelector<HTMLElement>('[data-sr-panel]');
  const toggle = root.querySelector<HTMLButtonElement>(
    '[data-sr-panel-toggle]'
  );
  const close = root.querySelector<HTMLButtonElement>('[data-sr-panel-close]');
  const handle = root.querySelector<HTMLElement>('[data-sr-panel-handle]');
  const dragArea = root.querySelector<HTMLElement>('[data-sr-panel-drag]');
  const fab = root.querySelector<HTMLButtonElement>('[data-sr-panel-fab]');

  if (!panel)
    return {
      setSnap: (_: PanelSnap) => {},
      getSnap: () => 'peek' as PanelSnap,
    };

  // Version bump: resets old persisted snap states so new controls are visible.
  const key = 'sr3-panel-snap-v2';
  const order: PanelSnap[] = ['collapsed', 'peek', 'half', 'full'];
  let snap: PanelSnap = 'peek';

  const getHeights = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vv = (window as any).visualViewport?.height || window.innerHeight;
    const collapsed = 88;
    const peek = Math.round(vv * 0.38);
    const half = Math.round(vv * 0.56);
    const full = Math.round(vv * 0.78);
    const clampH = (v: number) =>
      Math.max(collapsed, Math.min(full, Math.round(v)));
    const peekH = clampH(peek);
    const halfH = clampH(Math.max(peekH + 50, half));
    const fullH = clampH(Math.max(halfH + 50, full));
    return { collapsed, peek: peekH, half: halfH, full: fullH };
  };

  const setSnap = (next: PanelSnap, persist: boolean) => {
    snap = next;
    root.dataset.srPanelSnap = next;

    if (isMobile()) {
      const heights = getHeights();
      const h = heights[next];
      panel.hidden = next === 'collapsed';
      root.style.setProperty('--sr-panel-height', `${h}px`);
    } else {
      panel.hidden = next === 'collapsed';
    }

    toggle?.setAttribute(
      'aria-expanded',
      next === 'collapsed' ? 'false' : 'true'
    );

    if (persist) {
      try {
        localStorage.setItem(key, next);
      } catch {
        // ignore
      }
    }
  };

  const initState = () => {
    let saved: PanelSnap | null = null;
    try {
      const raw = (localStorage.getItem(key) || '').trim();
      if (order.includes(raw as PanelSnap)) saved = raw as PanelSnap;
    } catch {
      // ignore
    }

    const defaultSnap: PanelSnap = isMobile() ? 'half' : 'peek';
    setSnap(saved ?? defaultSnap, false);
  };

  toggle?.addEventListener('click', () => {
    setSnap(
      snap === 'collapsed' ? (isMobile() ? 'half' : 'peek') : 'collapsed',
      true
    );
  });
  close?.addEventListener('click', () => setSnap('collapsed', true));

  fab?.addEventListener('click', () => {
    setSnap(isMobile() ? 'half' : 'peek', true);
  });

  // Drag to resize on mobile.
  let drag = false;
  let startY = 0;
  let startH = 0;
  let lastY = 0;
  let lastT = 0;
  let startT = 0;

  const nearestSnap = (h: number, heights: Record<PanelSnap, number>) => {
    let best: PanelSnap = 'collapsed';
    let bestDist = Number.POSITIVE_INFINITY;
    for (const s of order) {
      const d = Math.abs(h - heights[s]);
      if (d < bestDist) {
        best = s;
        bestDist = d;
      }
    }
    return best;
  };

  const onMove = (e: PointerEvent) => {
    if (!drag || !isMobile()) return;
    e.preventDefault();
    const heights = getHeights();
    const dy = e.clientY - startY;
    const nextH = clamp(startH - dy, heights.collapsed, heights.full);
    root.style.setProperty('--sr-panel-height', `${Math.round(nextH)}px`);
    panel.hidden = false;

    lastY = e.clientY;
    lastT = performance.now();
  };

  const onUp = () => {
    if (!drag) return;
    drag = false;
    window.removeEventListener('pointermove', onMove);

    const heights = getHeights();
    const current = Number.parseFloat(
      getComputedStyle(root).getPropertyValue('--sr-panel-height') ||
        `${heights.peek}`
    );

    const dt = Math.max(1, lastT - startT);
    const v = ((lastY - startY) / dt) * 1000;
    const near = nearestSnap(current, heights);
    const idx = order.indexOf(near);

    let next = near;
    if (Math.abs(v) > 700) {
      next =
        v > 0
          ? order[Math.max(0, idx - 1)]
          : order[Math.min(order.length - 1, idx + 1)];
    }

    setSnap(next, true);
  };

  const isInteractiveTarget = (t: EventTarget | null) => {
    const el = t instanceof HTMLElement ? t : null;
    if (!el) return false;
    return Boolean(
      el.closest(
        'button, a, input, select, textarea, label, [role="button"], [data-sr-no-drag]'
      )
    );
  };

  const startDragFrom = (e: PointerEvent, captureEl: HTMLElement | null) => {
    if (!isMobile()) return;
    if (e.button !== 0) return;

    drag = true;
    startY = e.clientY;
    const heights = getHeights();
    const rect = panel.getBoundingClientRect();
    startH = rect.height || heights.peek;
    startT = performance.now();
    lastY = startY;
    lastT = startT;

    e.preventDefault();

    try {
      (captureEl || panel).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp, { once: true, passive: true });
  };

  handle?.addEventListener('pointerdown', e => {
    startDragFrom(e, handle);
  });

  dragArea?.addEventListener('pointerdown', e => {
    const t = e.target as Node | null;
    if (t && handle && handle.contains(t)) return;
    if (isInteractiveTarget(e.target)) return;
    startDragFrom(e, dragArea);
  });

  window.addEventListener('resize', () => initState());
  initState();

  return { setSnap, getSnap: () => snap };
};

const init = () => {
  const root = document.querySelector<HTMLElement>(ROOT);
  if (!root) return;

  const html = document.documentElement;
  html.dataset.carShowroomBoot = '0';
  html.dataset.carShowroomWebgl = '0';

  const canvas = root.querySelector<HTMLCanvasElement>('[data-sr-canvas]');
  const viewer = root.querySelector<HTMLElement>('.sr__viewer');
  const thirdsOverlay = root.querySelector<HTMLElement>(
    '[data-sr-thirds-overlay]'
  );
  const centerOverlay = root.querySelector<HTMLElement>(
    '[data-sr-center-overlay]'
  );
  const horizonOverlay = root.querySelector<HTMLElement>(
    '[data-sr-horizon-overlay]'
  );
  if (!canvas) {
    html.dataset.carShowroomBoot = '1';
    return;
  }

  const statusLoading = root.querySelector<HTMLElement>(
    '[data-sr-status-loading]'
  );
  const statusError = root.querySelector<HTMLElement>('[data-sr-status-error]');
  const fpsEl = root.querySelector<HTMLElement>('[data-sr-fps]');
  const resEl = root.querySelector<HTMLElement>('[data-sr-res]');
  const modeEl = root.querySelector<HTMLElement>('[data-sr-mode]');
  const ecoEl = root.querySelector<HTMLElement>('[data-sr-eco]');

  const modelSel = root.querySelector<HTMLSelectElement>('[data-sr-model]');
  const modelUrl = root.querySelector<HTMLInputElement>('[data-sr-model-url]');
  const loadBtn = root.querySelector<HTMLButtonElement>('[data-sr-model-load]');
  const importBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-model-import]'
  );
  const fileInp = root.querySelector<HTMLInputElement>('[data-sr-model-file]');

  const modelScale = root.querySelector<HTMLInputElement>(
    '[data-sr-model-scale]'
  );
  const modelYaw = root.querySelector<HTMLInputElement>('[data-sr-model-yaw]');
  const modelLift = root.querySelector<HTMLInputElement>(
    '[data-sr-model-lift]'
  );
  const modelTransformResetBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-model-transform-reset]'
  );

  const paintInp = root.querySelector<HTMLInputElement>('[data-sr-paint]');
  const finishSel = root.querySelector<HTMLSelectElement>('[data-sr-finish]');
  const clearcoatInp = root.querySelector<HTMLInputElement>(
    '[data-sr-clearcoat]'
  );
  const originalMatsChk = root.querySelector<HTMLInputElement>(
    '[data-sr-original-mats]'
  );

  // Look: wraps + parts + glass
  const wrapEnabledChk = root.querySelector<HTMLInputElement>(
    '[data-sr-wrap-enabled]'
  );
  const wrapPatternSel = root.querySelector<HTMLSelectElement>(
    '[data-sr-wrap-pattern]'
  );
  const wrapColorInp = root.querySelector<HTMLInputElement>(
    '[data-sr-wrap-color]'
  );
  const wrapTintInp = root.querySelector<HTMLInputElement>(
    '[data-sr-wrap-tint]'
  );
  const wrapScaleInp = root.querySelector<HTMLInputElement>(
    '[data-sr-wrap-scale]'
  );
  const wrapRotationInp = root.querySelector<HTMLInputElement>(
    '[data-sr-wrap-rotation]'
  );
  const wrapOffsetXInp = root.querySelector<HTMLInputElement>(
    '[data-sr-wrap-offset-x]'
  );
  const wrapOffsetYInp = root.querySelector<HTMLInputElement>(
    '[data-sr-wrap-offset-y]'
  );

  const glassModeChk = root.querySelector<HTMLInputElement>(
    '[data-sr-glass-mode]'
  );
  const glassTintInp = root.querySelector<HTMLInputElement>(
    '[data-sr-glass-tint]'
  );

  const wheelColorInp = root.querySelector<HTMLInputElement>(
    '[data-sr-wheel-color]'
  );
  const trimColorInp = root.querySelector<HTMLInputElement>(
    '[data-sr-trim-color]'
  );
  const caliperColorInp = root.querySelector<HTMLInputElement>(
    '[data-sr-caliper-color]'
  );
  const lightColorInp = root.querySelector<HTMLInputElement>(
    '[data-sr-light-color]'
  );
  const lightGlowInp = root.querySelector<HTMLInputElement>(
    '[data-sr-light-glow]'
  );

  const bgSel = root.querySelector<HTMLSelectElement>('[data-sr-bg]');

  const lightPreset = root.querySelector<HTMLSelectElement>(
    '[data-sr-light-preset]'
  );
  const lightIntensity = root.querySelector<HTMLInputElement>(
    '[data-sr-light-intensity]'
  );
  const lightWarmth = root.querySelector<HTMLInputElement>(
    '[data-sr-light-warmth]'
  );
  const lightRim = root.querySelector<HTMLInputElement>('[data-sr-light-rim]');

  const resetLookBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-reset-look]'
  );
  const resetEnvBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-reset-environment]'
  );
  const resetCameraBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-reset-camera]'
  );
  const resetMotionBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-reset-motion]'
  );
  const resetPostBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-reset-post]'
  );
  const resetPerformanceBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-reset-performance]'
  );

  const envIntensity = root.querySelector<HTMLInputElement>(
    '[data-sr-env-intensity]'
  );
  const envRotation = root.querySelector<HTMLInputElement>(
    '[data-sr-env-rotation]'
  );

  const gridChk = root.querySelector<HTMLInputElement>('[data-sr-grid]');
  const axesChk = root.querySelector<HTMLInputElement>('[data-sr-axes]');
  const hapticsChk = root.querySelector<HTMLInputElement>('[data-sr-haptics]');

  const floorColor = root.querySelector<HTMLInputElement>(
    '[data-sr-floor-color]'
  );
  const floorOpacity = root.querySelector<HTMLInputElement>(
    '[data-sr-floor-opacity]'
  );
  const floorRoughness = root.querySelector<HTMLInputElement>(
    '[data-sr-floor-roughness]'
  );
  const floorMetalness = root.querySelector<HTMLInputElement>(
    '[data-sr-floor-metalness]'
  );

  const floorReflectionsChk = root.querySelector<HTMLInputElement>(
    '[data-sr-floor-reflections]'
  );
  const floorReflectionStrength = root.querySelector<HTMLInputElement>(
    '[data-sr-floor-reflection-strength]'
  );

  const shadowsChk = root.querySelector<HTMLInputElement>('[data-sr-shadows]');
  const shadowStrength = root.querySelector<HTMLInputElement>(
    '[data-sr-shadow-strength]'
  );
  const shadowSize = root.querySelector<HTMLInputElement>(
    '[data-sr-shadow-size]'
  );
  const shadowHQ = root.querySelector<HTMLInputElement>('[data-sr-shadow-hq]');

  const camPreset = root.querySelector<HTMLSelectElement>(
    '[data-sr-camera-preset]'
  );
  const camMode = root.querySelector<HTMLSelectElement>(
    '[data-sr-camera-mode]'
  );
  const camYaw = root.querySelector<HTMLInputElement>('[data-sr-camera-yaw]');
  const camPitch = root.querySelector<HTMLInputElement>(
    '[data-sr-camera-pitch]'
  );
  const camDist = root.querySelector<HTMLInputElement>(
    '[data-sr-camera-distance]'
  );
  const camFov = root.querySelector<HTMLInputElement>('[data-sr-camera-fov]');
  const thirdsChk = root.querySelector<HTMLInputElement>('[data-sr-thirds]');
  const centerChk = root.querySelector<HTMLInputElement>('[data-sr-center]');
  const horizonChk = root.querySelector<HTMLInputElement>('[data-sr-horizon]');
  const camFrame = root.querySelector<HTMLButtonElement>(
    '[data-sr-camera-frame]'
  );
  const camReset = root.querySelector<HTMLButtonElement>(
    '[data-sr-camera-reset]'
  );

  // Interior + hotspots
  const interiorChk =
    root.querySelector<HTMLInputElement>('[data-sr-interior]');
  const hotspotsChk =
    root.querySelector<HTMLInputElement>('[data-sr-hotspots]');
  const jumpInteriorBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-jump-interior]'
  );

  // Camera views (bookmarks)
  const camViewSelect = root.querySelector<HTMLSelectElement>(
    '[data-sr-camera-view-select]'
  );
  const camViewSaveBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-camera-view-save]'
  );
  const camViewLoadBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-camera-view-load]'
  );
  const camViewDeleteBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-camera-view-delete]'
  );
  const camViewIo = root.querySelector<HTMLTextAreaElement>(
    '[data-sr-camera-view-io]'
  );
  const camViewExportBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-camera-view-export]'
  );
  const camViewImportBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-camera-view-import]'
  );

  const autorotate = root.querySelector<HTMLInputElement>(
    '[data-sr-autorotate]'
  );
  const motionStyle = root.querySelector<HTMLSelectElement>(
    '[data-sr-motion-style]'
  );
  const motionSpeed = root.querySelector<HTMLInputElement>(
    '[data-sr-motion-speed]'
  );
  const zoom = root.querySelector<HTMLInputElement>('[data-sr-zoom]');

  const qualitySel = root.querySelector<HTMLSelectElement>('[data-sr-quality]');
  const autoQuality = root.querySelector<HTMLInputElement>(
    '[data-sr-auto-quality]'
  );
  const targetFps = root.querySelector<HTMLInputElement>(
    '[data-sr-target-fps]'
  );

  const exposure = root.querySelector<HTMLInputElement>('[data-sr-exposure]');
  const tonemapSel = root.querySelector<HTMLSelectElement>('[data-sr-tonemap]');
  const bloom = root.querySelector<HTMLInputElement>('[data-sr-bloom]');
  const bloomThreshold = root.querySelector<HTMLInputElement>(
    '[data-sr-bloom-threshold]'
  );
  const bloomRadius = root.querySelector<HTMLInputElement>(
    '[data-sr-bloom-radius]'
  );
  const exposureResetBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-exposure-reset]'
  );

  const screenshotBtns = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-sr-screenshot]')
  );
  const shareBtns = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-sr-share]')
  );

  const screenshotCopyBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-screenshot-copy]'
  );
  const screenshotScaleSel = root.querySelector<HTMLSelectElement>(
    '[data-sr-screenshot-scale]'
  );
  const regroundBtn =
    root.querySelector<HTMLButtonElement>('[data-sr-reground]');

  // Cinematic + plate tools
  const cinematicChk = root.querySelector<HTMLInputElement>(
    '[data-sr-cinematic]'
  );
  const cinematicExitBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-cinematic-exit]'
  );
  const letterboxEl = root.querySelector<HTMLElement>('[data-sr-letterbox]');

  const plateTextInp = root.querySelector<HTMLInputElement>(
    '[data-sr-plate-text]'
  );
  const plateApplyBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-plate-apply]'
  );
  const plateResetBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-plate-reset]'
  );

  // Decals / stickers
  const decalModeChk = root.querySelector<HTMLInputElement>(
    '[data-sr-decal-mode]'
  );
  const decalTextInp = root.querySelector<HTMLInputElement>(
    '[data-sr-decal-text]'
  );
  const decalColorInp = root.querySelector<HTMLInputElement>(
    '[data-sr-decal-color]'
  );
  const decalSizeInp = root.querySelector<HTMLInputElement>(
    '[data-sr-decal-size]'
  );
  const decalRotInp = root.querySelector<HTMLInputElement>(
    '[data-sr-decal-rot]'
  );
  const decalOpacityInp = root.querySelector<HTMLInputElement>(
    '[data-sr-decal-opacity]'
  );
  const decalClearBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-decal-clear]'
  );

  const panelBody = root.querySelector<HTMLElement>('[data-sr-panel-body]');
  const jumpBtns = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-sr-jump]')
  );
  const sections = Array.from(
    root.querySelectorAll<HTMLElement>('[data-sr-section]')
  );
  const sectionToggleBtns = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-sr-section-toggle]')
  );

  // Presets
  const presetNameInp = root.querySelector<HTMLInputElement>(
    '[data-sr-preset-name]'
  );
  const presetSelect = root.querySelector<HTMLSelectElement>(
    '[data-sr-preset-select]'
  );
  const presetIo = root.querySelector<HTMLTextAreaElement>(
    '[data-sr-preset-io]'
  );
  const presetSaveBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-preset-save]'
  );
  const presetLoadBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-preset-load]'
  );
  const presetDeleteBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-preset-delete]'
  );
  const presetExportBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-preset-export]'
  );
  const presetImportBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-preset-import]'
  );

  // Inspector
  const statMeshes = root.querySelector<HTMLElement>('[data-sr-stat-meshes]');
  const statMats = root.querySelector<HTMLElement>('[data-sr-stat-mats]');
  const statTris = root.querySelector<HTMLElement>('[data-sr-stat-tris]');
  const statTex = root.querySelector<HTMLElement>('[data-sr-stat-tex]');

  const inspectorFilter = root.querySelector<HTMLInputElement>(
    '[data-sr-inspector-filter]'
  );
  const inspectorMeshSel = root.querySelector<HTMLSelectElement>(
    '[data-sr-inspector-mesh]'
  );
  const inspectorPick = root.querySelector<HTMLInputElement>(
    '[data-sr-inspector-pick]'
  );
  const inspectorIsolate = root.querySelector<HTMLInputElement>(
    '[data-sr-inspector-isolate]'
  );
  const inspectorHighlight = root.querySelector<HTMLInputElement>(
    '[data-sr-inspector-highlight]'
  );
  const inspectorClearBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-inspector-clear]'
  );
  const inspectorResetBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-inspector-reset]'
  );
  const wireframeChk = root.querySelector<HTMLInputElement>(
    '[data-sr-wireframe]'
  );
  const inspectorSelected = root.querySelector<HTMLElement>(
    '[data-sr-inspector-selected]'
  );

  // Animation
  const animClipSel = root.querySelector<HTMLSelectElement>(
    '[data-sr-anim-clip]'
  );
  const animPlayChk = root.querySelector<HTMLInputElement>(
    '[data-sr-anim-play]'
  );
  const animSpeed = root.querySelector<HTMLInputElement>(
    '[data-sr-anim-speed]'
  );
  const animRestartBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-anim-restart]'
  );

  const animActionBtns = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-sr-anim-action]')
  );

  const setStatus = (loading: boolean, error: string) => {
    if (statusLoading) statusLoading.hidden = !loading;
    if (statusError) {
      statusError.hidden = !error;
      statusError.textContent = error;
    }
  };

  const getToneMappingFromUi = () => {
    const v = (tonemapSel?.value || 'aces').trim().toLowerCase();
    if (v === 'none') return THREE.NoToneMapping;
    if (v === 'reinhard') return THREE.ReinhardToneMapping;
    if (v === 'cineon') return THREE.CineonToneMapping;
    if (v === 'linear') return THREE.LinearToneMapping;
    return THREE.ACESFilmicToneMapping;
  };

  // Panel system (new)
  const panelApi = initPanel(root);

  // Renderer
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = createSafeWebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
  } catch (e) {
    console.error('[ShowroomV3] WebGL init failed:', e);
    html.dataset.carShowroomBoot = '1';
    html.dataset.carShowroomWebgl = '0';
    setStatus(false, 'WebGL failed to initialize on this device/browser.');
    return;
  }

  html.dataset.carShowroomWebgl = '1';

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = getToneMappingFromUi();
  renderer.toneMappingExposure =
    Number.parseFloat(exposure?.value || '1.25') || 1.25;

  const deviceDpr = window.devicePixelRatio || 1;
  const basePixelRatio = Math.min(deviceDpr, isMobile() ? 1.5 : 2);
  let currentPixelRatio = basePixelRatio;
  renderer.setPixelRatio(currentPixelRatio);

  const scene = new THREE.Scene();

  // More realistic reflections: procedural room environment (PMREM)
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
  } catch {
    // ignore
  }

  // Background colors: keep a base (selected) color, optionally brightened during loading.
  const baseBgColor = new THREE.Color('#111827');
  const loadingBgColor = new THREE.Color('#1f2937');
  const tmpBgColor = new THREE.Color();

  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 600);
  camera.position.set(4.2, 1.4, 4.2);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = !isMobile();
  controls.minDistance = 1.2;
  controls.maxDistance = 18;
  controls.target.set(0, 0.8, 0);
  controls.update();

  // Lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0x121a25, 0.95);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(6, 8, 4);
  scene.add(key);

  const keyBase = key.position.clone();

  const rim = new THREE.DirectionalLight(0x9bdcff, 0.9);
  rim.position.set(-6, 3.5, -6);
  scene.add(rim);

  const rimBase = rim.position.clone();

  // Extra ambient brightness during model loading (fades out smoothly).
  const loadingBoostLight = new THREE.AmbientLight(0xffffff, 0);
  scene.add(loadingBoostLight);

  // Scene helpers
  const grid = new THREE.GridHelper(10, 20, 0x334155, 0x1f2937);
  grid.visible = Boolean(gridChk?.checked);
  grid.position.y = 0.001;
  scene.add(grid);

  const axes = new THREE.AxesHelper(2.2);
  axes.visible = Boolean(axesChk?.checked);
  scene.add(axes);

  // Floor + shadow catcher
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 1,
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 64), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.001;
  floor.receiveShadow = true;
  scene.add(floor);

  const shadowMat = new THREE.ShadowMaterial({
    opacity: 0.45,
    transparent: true,
  });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(6, 64), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0;
  shadow.receiveShadow = true;
  scene.add(shadow);

  // Loader
  const draco = new DRACOLoader();
  draco.setDecoderPath(withBasePath('/draco/gltf/'));
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);

  const loadState: LoadState = {
    requestId: 0,
    objectUrlToRevoke: null,
    gltf: null,
    animations: [],
  };

  // Model base transform (grounded placement after normalization)
  let modelBaseY = 0;
  let modelBaseScale = new THREE.Vector3(1, 1, 1);
  let modelBaseQuat = new THREE.Quaternion();

  // Animation runtime
  let mixer: THREE.AnimationMixer | null = null;
  let activeAction: THREE.AnimationAction | null = null;
  let animationEnabled = false;

  const setAnimationEnabled = (enabled: boolean) => {
    animationEnabled = enabled;
    if (animClipSel) animClipSel.disabled = !enabled;
    if (animPlayChk) animPlayChk.disabled = !enabled;
    if (animSpeed) animSpeed.disabled = !enabled;
    if (animRestartBtn) animRestartBtn.disabled = !enabled;
    for (const btn of animActionBtns) btn.disabled = !enabled;
  };

  const stopAnimations = () => {
    if (activeAction) {
      try {
        activeAction.stop();
      } catch {
        // ignore
      }
    }
    activeAction = null;
    mixer = null;
    setAnimationEnabled(false);
    if (animClipSel) animClipSel.innerHTML = '';
  };

  const playClipByName = (name: string) => {
    if (!mixer) return;
    const clips = loadState.animations;
    if (!clips.length) return;
    const clip = clips.find(c => c.name === name) || clips[0];
    if (!clip) return;

    if (activeAction) activeAction.stop();
    activeAction = mixer.clipAction(clip);
    activeAction.reset();
    activeAction.play();
  };

  const findClipNameByKeywords = (keywords: string[]) => {
    const clips = loadState.animations;
    if (!clips.length) return null;

    const ks = keywords
      .map(k => normalizeName(k))
      .filter(Boolean)
      .slice(0, 10);

    const scored = clips
      .map(c => {
        const nm = normalizeName(c.name || '');
        let score = 0;
        for (const k of ks) {
          if (!k) continue;
          if (nm === k) score += 6;
          else if (nm.includes(k)) score += 3;
        }
        if (/(open|close|deploy|fold|unfold)/.test(nm)) score += 1;
        return { name: c.name, score };
      })
      .sort((a, b) => b.score - a.score);

    const best = scored[0];
    if (!best || best.score <= 0) return null;
    return best.name;
  };

  const clipToggleState = new Map<string, boolean>();

  const playClipToggle = (clipName: string) => {
    if (!mixer) return;
    const clips = loadState.animations;
    if (!clips.length) return;
    const clip = clips.find(c => c.name === clipName);
    if (!clip) return;

    const open = clipToggleState.get(clipName) ?? false;
    const nextOpen = !open;
    clipToggleState.set(clipName, nextOpen);

    if (activeAction) {
      try {
        activeAction.stop();
      } catch {
        // ignore
      }
    }

    activeAction = mixer.clipAction(clip);
    activeAction.enabled = true;
    activeAction.clampWhenFinished = true;
    activeAction.setLoop(THREE.LoopOnce, 1);

    if (nextOpen) {
      activeAction.timeScale = 1;
      activeAction.time = 0;
    } else {
      activeAction.timeScale = -1;
      activeAction.time = Math.max(0.0001, clip.duration);
    }

    activeAction.play();
  };

  // Inspector runtime
  const materialWireframeOriginal = new WeakMap<THREE.Material, boolean>();
  const selectionAccent = new THREE.Color('#22d3ee');
  let inspectorMeshes: THREE.Mesh[] = [];
  let selectedMesh: THREE.Mesh | null = null;
  let selectionBox: THREE.BoxHelper | null = null;
  let selectionPrev = null as {
    materials: Array<{
      material: THREE.Material;
      emissiveHex?: number;
      emissiveIntensity?: number;
    }>;
  } | null;
  let isolateRestore: Array<{ mesh: THREE.Mesh; visible: boolean }> = [];

  const hapticTap = (ms = 10) => {
    if (!runtime.haptics) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vib = (navigator as any).vibrate as
        | undefined
        | ((p: number) => void);
      vib?.(ms);
    } catch {
      // ignore
    }
  };

  const setSelectedMesh = (
    mesh: THREE.Mesh | null,
    opts?: {
      force?: boolean;
    }
  ) => {
    if (!opts?.force && selectedMesh === mesh) return;

    // Restore previous highlight
    if (selectionPrev) {
      for (const entry of selectionPrev.materials) {
        const material = entry.material as unknown as {
          emissive?: THREE.Color;
          emissiveIntensity?: number;
          needsUpdate?: boolean;
        };
        if (material.emissive && entry.emissiveHex !== undefined) {
          material.emissive.setHex(entry.emissiveHex);
        }
        if (entry.emissiveIntensity !== undefined)
          material.emissiveIntensity = entry.emissiveIntensity;
        material.needsUpdate = true;
      }
    }
    selectionPrev = null;

    // Clear box
    if (selectionBox) {
      scene.remove(selectionBox);
      selectionBox = null;
    }

    selectedMesh = mesh;

    if (!mesh) {
      if (inspectorSelected) inspectorSelected.textContent = 'No selection.';
      return;
    }

    if (inspectorSelected) {
      const name = (mesh.name || '(unnamed)').trim();
      const tris = getMeshTriangleCount(mesh);
      inspectorSelected.textContent = `${name} • ${formatInt(tris)} tris`;
    }

    if (inspectorHighlight?.checked) {
      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      const saved: Array<{
        material: THREE.Material;
        emissiveHex?: number;
        emissiveIntensity?: number;
      }> = [];
      for (const mat of mats) {
        if (!mat) continue;
        const any = mat as unknown as {
          emissive?: THREE.Color;
          emissiveIntensity?: number;
          needsUpdate?: boolean;
        };
        if (any.emissive) {
          saved.push({
            material: mat as THREE.Material,
            emissiveHex: any.emissive.getHex(),
            emissiveIntensity: any.emissiveIntensity,
          });
          any.emissive.copy(selectionAccent);
          any.emissiveIntensity = 0.6;
          any.needsUpdate = true;
        }
      }
      selectionPrev = { materials: saved };
    }

    selectionBox = new THREE.BoxHelper(mesh, selectionAccent);
    scene.add(selectionBox);
  };

  const applyIsolate = () => {
    if (!inspectorIsolate?.checked || !selectedMesh || !loadState.gltf) {
      // Restore
      for (const r of isolateRestore) r.mesh.visible = r.visible;
      isolateRestore = [];
      return;
    }

    isolateRestore = [];
    loadState.gltf.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      isolateRestore.push({ mesh, visible: mesh.visible });
      mesh.visible = mesh === selectedMesh;
    });
  };

  const applyWireframe = () => {
    if (!loadState.gltf) return;
    const enabled = Boolean(wireframeChk?.checked);
    loadState.gltf.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const mat of mats) {
        if (!mat) continue;
        const any = mat as unknown as {
          wireframe?: boolean;
          needsUpdate?: boolean;
        };
        if (any.wireframe === undefined) continue;
        if (!materialWireframeOriginal.has(mat as THREE.Material)) {
          materialWireframeOriginal.set(
            mat as THREE.Material,
            Boolean(any.wireframe)
          );
        }
        any.wireframe = enabled;
        any.needsUpdate = true;
      }
    });
  };

  const populateMeshSelect = () => {
    if (!inspectorMeshSel) return;
    inspectorMeshSel.innerHTML = '';

    const filter = (inspectorFilter?.value || '').trim().toLowerCase();
    const frag = document.createDocumentFragment();

    const filtered = filter
      ? inspectorMeshes.filter(m => {
          const name = String(m.name || '').toLowerCase();
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          const matName = mats
            .map(mm =>
              String((mm as THREE.Material | null)?.name || '').toLowerCase()
            )
            .join(' ');
          return name.includes(filter) || matName.includes(filter);
        })
      : inspectorMeshes;

    const cap = 800;
    const list = filtered.slice(0, cap);

    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = `Select a mesh (${formatInt(filtered.length)})`;
    frag.appendChild(empty);

    for (const mesh of list) {
      const opt = document.createElement('option');
      opt.value = mesh.uuid;
      const nm = (mesh.name || '(unnamed)').trim();
      opt.textContent = nm;
      frag.appendChild(opt);
    }

    if (filtered.length > cap) {
      const more = document.createElement('option');
      more.value = '';
      more.disabled = true;
      more.textContent = `…and ${formatInt(filtered.length - cap)} more`;
      frag.appendChild(more);
    }

    inspectorMeshSel.appendChild(frag);
    inspectorMeshSel.value = selectedMesh?.uuid || '';
  };

  // Post
  let composer: EffectComposer | null = null;
  let bloomPass: UnrealBloomPass | null = null;
  const ensureComposer = () => {
    if (composer) return;
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0, 0, 0.9);
    composer.addPass(bloomPass);
  };

  const runtime = {
    background: (bgSel?.value || 'studio').trim().toLowerCase(),
    paintHex: parseHexColor(paintInp?.value || '') || '#00d1b2',
    originalMats: Boolean(originalMatsChk?.checked ?? false),
    lightPreset: (lightPreset?.value || 'studio').trim().toLowerCase(),
    lightIntensity: Number.parseFloat(lightIntensity?.value || '1') || 1,
    lightWarmth: Number.parseFloat(lightWarmth?.value || '0') || 0,
    rimBoost: Number.parseFloat(lightRim?.value || '1') || 1,
    envIntensity: Number.parseFloat(envIntensity?.value || '0.9') || 0.9,
    envRotationDeg: Number.parseFloat(envRotation?.value || '0') || 0,
    grid: Boolean(gridChk?.checked ?? false),
    axes: Boolean(axesChk?.checked ?? false),
    thirdsOverlay: Boolean(thirdsChk?.checked ?? false),
    centerOverlay: Boolean(centerChk?.checked ?? false),
    horizonOverlay: Boolean(horizonChk?.checked ?? false),
    haptics: Boolean(hapticsChk?.checked ?? true),
    floorHex: parseHexColor(floorColor?.value || '') || '#111827',
    floorOpacity: Number.parseFloat(floorOpacity?.value || '1') || 1,
    floorRoughness: Number.parseFloat(floorRoughness?.value || '1') || 1,
    floorMetalness: Number.parseFloat(floorMetalness?.value || '0') || 0,

    floorReflections: Boolean(floorReflectionsChk?.checked ?? false),
    floorReflectionStrength:
      Number.parseFloat(floorReflectionStrength?.value || '0.55') || 0.55,

    shadows: Boolean(shadowsChk?.checked ?? true),
    shadowStrength: Number.parseFloat(shadowStrength?.value || '0.5') || 0.5,
    shadowSize: Number.parseFloat(shadowSize?.value || '6') || 6,
    shadowHQ: Boolean(shadowHQ?.checked ?? false),
    autorotate: Boolean(autorotate?.checked ?? false),
    motionStyle: (motionStyle?.value || 'turntable').trim().toLowerCase(),
    motionSpeed: Number.parseFloat(motionSpeed?.value || '0.75') || 0.75,
    zoomT: Number.parseFloat(zoom?.value || '0.8') || 0.8,
    quality: (qualitySel?.value || (isMobile() ? 'balanced' : 'ultra'))
      .trim()
      .toLowerCase(),
    autoQuality: Boolean(autoQuality?.checked ?? true),
    targetFps: Number.parseFloat(targetFps?.value || '55') || 55,
    lastRadius: 3,
    bloomStrength: Number.parseFloat(bloom?.value || '0') || 0,
    bloomThreshold: Number.parseFloat(bloomThreshold?.value || '0.9') || 0.9,
    bloomRadius: Number.parseFloat(bloomRadius?.value || '0') || 0,
    baseExposure: Number.parseFloat(exposure?.value || '1.25') || 1.25,

    cinematic: Boolean(cinematicChk?.checked ?? false),
    cinematicPrev: null as null | {
      autorotate: boolean;
      motionStyle: string;
      motionSpeed: number;
      bloomStrength: number;
      bloomThreshold: number;
      bloomRadius: number;
      exposure: number;
      panelSnap: PanelSnap;
    },

    plateText: safeTrimText(plateTextInp?.value || '', 10),

    interior: Boolean(interiorChk?.checked ?? false),
    interiorPrev: null as null | {
      cameraNear: number;
      minDistance: number;
      maxDistance: number;
      enablePan: boolean;
    },
    hotspots: Boolean(hotspotsChk?.checked ?? true),

    decalMode: Boolean(decalModeChk?.checked ?? false),
    decalText: safeTrimText(decalTextInp?.value || '', 18),
    decalColorHex: parseHexColor(decalColorInp?.value || '') || '#ffffff',
    decalSize: Number.parseFloat(decalSizeInp?.value || '0.35') || 0.35,
    decalRotDeg: Number.parseFloat(decalRotInp?.value || '0') || 0,
    decalOpacity: Number.parseFloat(decalOpacityInp?.value || '0.92') || 0.92,

    loadingBoostT: 0,
    dynamicScale: 1,

    modelScaleMul: Number.parseFloat(modelScale?.value || '1') || 1,
    modelYawDeg: Number.parseFloat(modelYaw?.value || '0') || 0,
    modelLift: Number.parseFloat(modelLift?.value || '0') || 0,

    // Look (wrap/glass/parts)
    finish: (finishSel?.value || 'gloss').trim().toLowerCase(),
    clearcoat: Number.parseFloat(clearcoatInp?.value || '0.8') || 0.8,
    wrapEnabled: Boolean(wrapEnabledChk?.checked ?? false),
    wrapPattern: (wrapPatternSel?.value || 'solid').trim().toLowerCase(),
    wrapColorHex: parseHexColor(wrapColorInp?.value || '') || '#ffffff',
    wrapTint: Number.parseFloat(wrapTintInp?.value || '0.8') || 0.8,
    wrapScale: Number.parseFloat(wrapScaleInp?.value || '1') || 1,
    wrapRotationDeg: Number.parseFloat(wrapRotationInp?.value || '0') || 0,
    wrapOffsetX: Number.parseFloat(wrapOffsetXInp?.value || '0') || 0,
    wrapOffsetY: Number.parseFloat(wrapOffsetYInp?.value || '0') || 0,
    glassMode: Boolean(glassModeChk?.checked ?? false),
    glassTint: Number.parseFloat(glassTintInp?.value || '0.35') || 0.35,
    wheelColorHex: parseHexColor(wheelColorInp?.value || '') || '#111827',
    trimColorHex: parseHexColor(trimColorInp?.value || '') || '#0b0f14',
    caliperColorHex: parseHexColor(caliperColorInp?.value || '') || '#ef4444',
    lightColorHex: parseHexColor(lightColorInp?.value || '') || '#ffffff',
    lightGlow: Number.parseFloat(lightGlowInp?.value || '1.25') || 1.25,
  };

  const applyThirdsOverlay = () => {
    const on = Boolean(thirdsChk?.checked ?? runtime.thirdsOverlay);
    runtime.thirdsOverlay = on;
    viewer?.classList.toggle('sr-thirds-on', on);
    if (thirdsOverlay) thirdsOverlay.hidden = !on;
  };

  const applyCenterOverlay = () => {
    const on = Boolean(centerChk?.checked ?? runtime.centerOverlay);
    runtime.centerOverlay = on;
    viewer?.classList.toggle('sr-center-on', on);
    if (centerOverlay) centerOverlay.hidden = !on;
  };

  const applyHorizonOverlay = () => {
    const on = Boolean(horizonChk?.checked ?? runtime.horizonOverlay);
    runtime.horizonOverlay = on;
    viewer?.classList.toggle('sr-horizon-on', on);
    if (horizonOverlay) horizonOverlay.hidden = !on;
  };

  const originalMaterialState = new WeakMap<THREE.Material, MaterialSnapshot>();
  let wrapTexture: THREE.Texture | null = null;

  // License plate: applied on top of the current look and fully reversible.
  let plateTexture: THREE.CanvasTexture | null = null;
  let plateMaterials: Array<
    THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial
  > = [];
  const plateBaseline = new WeakMap<THREE.Material, MaterialSnapshot>();

  // Decals / stickers: projected meshes that are fully disposable.
  type DecalEntry = {
    mesh: THREE.Mesh;
    geometry: THREE.BufferGeometry;
    material: THREE.Material;
  };

  let decalTexture: THREE.CanvasTexture | null = null;
  const decals: DecalEntry[] = [];

  const disposeDecalTexture = () => {
    if (decalTexture) {
      decalTexture.dispose?.();
      decalTexture = null;
    }
  };

  const clearDecals = () => {
    for (const d of decals) {
      try {
        d.mesh.parent?.remove(d.mesh);
      } catch {
        // ignore
      }
      try {
        d.geometry.dispose?.();
      } catch {
        // ignore
      }
      try {
        d.material.dispose?.();
      } catch {
        // ignore
      }
    }
    decals.length = 0;
  };

  const buildDecalTexture = (rawText: string, rawColor: string) => {
    const text = safeTrimText(rawText || '', 18);
    const color = parseHexColor(rawColor) || '#ffffff';

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Soft translucent backing
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 14;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

    // Main text
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font =
      '900 190px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
    ctx.fillText(text || 'RACE', canvas.width / 2, canvas.height / 2);

    // Microtext
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font =
      '700 36px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('DFYTWL', 64, canvas.height - 78);
    ctx.textAlign = 'right';
    ctx.fillText('STICKER', canvas.width - 64, canvas.height - 78);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  };

  const syncDecalTextureFromRuntime = () => {
    disposeDecalTexture();
    decalTexture = buildDecalTexture(runtime.decalText, runtime.decalColorHex);
    for (const d of decals) {
      const mat = d.material as unknown as {
        map?: THREE.Texture | null;
        opacity?: number;
        transparent?: boolean;
        needsUpdate?: boolean;
      };
      if (decalTexture) mat.map = decalTexture;
      mat.transparent = true;
      mat.opacity = clamp(runtime.decalOpacity, 0.05, 1);
      mat.needsUpdate = true;
    }
  };

  const findPlateMaterials = (obj: THREE.Object3D) => {
    const found: Array<
      THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial
    > = [];
    const seen = new Set<string>();

    obj.traverse(child => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;

      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const mat of mats) {
        if (!mat) continue;
        if (
          !(mat instanceof THREE.MeshStandardMaterial) &&
          !(mat instanceof THREE.MeshPhysicalMaterial)
        ) {
          continue;
        }

        const key = mat.uuid;
        if (seen.has(key)) continue;

        const n = `${normalizeName(mesh.name || '')} ${normalizeName(
          mat.name || ''
        )}`;

        const looksLikePlate =
          /(?:license|licence|number\s*plate|numberplate|plate|registration|reg\b)/i.test(
            n
          );
        if (!looksLikePlate) continue;

        // Avoid obvious false positives.
        if (/(?:template|placeholder|plateau)/i.test(n)) continue;

        seen.add(key);
        found.push(mat);
      }
    });

    return found;
  };

  const buildPlateTexture = (rawText: string) => {
    const text = safeTrimText(rawText, 10).toUpperCase();

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f4f5f7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.lineWidth = 26;
    ctx.strokeStyle = '#0b1220';
    ctx.strokeRect(26, 26, canvas.width - 52, canvas.height - 52);

    // Subtle top band
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(26, 26, canvas.width - 52, 76);

    // State/brand microtext
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.font =
      '700 34px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText('DFYTWL', 58, 64);
    ctx.textAlign = 'right';
    ctx.fillText('SHOWROOM', canvas.width - 58, 64);
    ctx.textAlign = 'left';

    // Main text
    ctx.fillStyle = '#0b1220';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font =
      '900 160px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"';
    ctx.fillText(text || 'DFYTWL', canvas.width / 2, canvas.height / 2 + 30);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  };

  const resetPlate = () => {
    if (plateTexture) {
      plateTexture.dispose?.();
      plateTexture = null;
    }

    for (const mat of plateMaterials) {
      const snap = plateBaseline.get(mat);
      if (snap) restoreMaterial(mat, snap);
    }
  };

  const applyPlate = (rawText: string) => {
    if (!loadState.gltf) return;

    const text = safeTrimText(rawText, 10);
    runtime.plateText = text;

    if (!text) {
      resetPlate();
      return;
    }

    if (!plateMaterials.length)
      plateMaterials = findPlateMaterials(loadState.gltf);
    if (!plateMaterials.length) {
      setStatus(false, 'Plate mesh not found (try another model).');
      window.setTimeout(() => setStatus(false, ''), 1400);
      return;
    }

    for (const mat of plateMaterials) {
      if (!plateBaseline.has(mat))
        plateBaseline.set(mat, snapshotMaterial(mat));
    }

    if (plateTexture) {
      plateTexture.dispose?.();
      plateTexture = null;
    }

    const tex = buildPlateTexture(text);
    if (!tex) return;
    plateTexture = tex;

    for (const mat of plateMaterials) {
      mat.map = plateTexture;
      mat.color.set(0xffffff);
      mat.needsUpdate = true;
    }
  };

  const syncLetterbox = () => {
    if (!letterboxEl) return;
    if (!runtime.cinematic) {
      letterboxEl.style.setProperty('--sr-letterbox-bar', '0px');
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    const targetAspect = 2.35;
    const targetH = w / targetAspect;
    const bar = Math.max(0, Math.floor((h - targetH) / 2));
    letterboxEl.style.setProperty('--sr-letterbox-bar', `${bar}px`);
  };

  const setCinematic = (on: boolean) => {
    runtime.cinematic = Boolean(on);
    root.dataset.srCinematic = runtime.cinematic ? '1' : '0';

    if (runtime.cinematic) {
      if (!runtime.cinematicPrev) {
        runtime.cinematicPrev = {
          autorotate: Boolean(autorotate?.checked ?? false),
          motionStyle: (motionStyle?.value || 'turntable').trim().toLowerCase(),
          motionSpeed: Number.parseFloat(motionSpeed?.value || '0.75') || 0.75,
          bloomStrength: Number.parseFloat(bloom?.value || '0.35') || 0.35,
          bloomThreshold:
            Number.parseFloat(bloomThreshold?.value || '0.9') || 0.9,
          bloomRadius: Number.parseFloat(bloomRadius?.value || '0') || 0,
          exposure: Number.parseFloat(exposure?.value || '1.25') || 1.25,
          panelSnap: panelApi.getSnap(),
        };
      }

      // Hide the panel for a clean shot.
      panelApi.setSnap('collapsed', true);

      // Force a slow turntable orbit.
      if (autorotate) autorotate.checked = true;
      if (motionStyle) motionStyle.value = 'turntable';
      if (motionSpeed) motionSpeed.value = '0.35';

      // Commercial-ish bloom preset.
      if (bloom) bloom.value = '0.9';
      if (bloomThreshold) bloomThreshold.value = '0.65';
      if (bloomRadius) bloomRadius.value = '0.25';

      // Slight exposure lift.
      if (exposure) exposure.value = '1.35';

      runtime.autorotate = true;
      runtime.motionStyle = 'turntable';
      runtime.motionSpeed = 0.35;

      applyMotion();
      applyPost();
      syncLetterbox();
      return;
    }

    // Restore previous values.
    const prev = runtime.cinematicPrev;
    runtime.cinematicPrev = null;

    if (prev) {
      if (autorotate) autorotate.checked = prev.autorotate;
      if (motionStyle) motionStyle.value = prev.motionStyle;
      if (motionSpeed) motionSpeed.value = String(prev.motionSpeed);
      if (bloom) bloom.value = String(prev.bloomStrength);
      if (bloomThreshold) bloomThreshold.value = String(prev.bloomThreshold);
      if (bloomRadius) bloomRadius.value = String(prev.bloomRadius);
      if (exposure) exposure.value = String(prev.exposure);
      panelApi.setSnap(prev.panelSnap, true);
    }

    runtime.autorotate = Boolean(autorotate?.checked ?? false);
    runtime.motionStyle = (motionStyle?.value || 'turntable')
      .trim()
      .toLowerCase();
    runtime.motionSpeed =
      Number.parseFloat(motionSpeed?.value || '0.75') || 0.75;

    applyMotion();
    applyPost();
    syncLetterbox();
  };

  const syncRuntimeLookFromUi = () => {
    runtime.finish = (finishSel?.value || runtime.finish || 'gloss')
      .trim()
      .toLowerCase();
    runtime.clearcoat =
      Number.parseFloat(clearcoatInp?.value || `${runtime.clearcoat}`) ||
      runtime.clearcoat;

    runtime.wrapEnabled = Boolean(
      wrapEnabledChk?.checked ?? runtime.wrapEnabled
    );
    runtime.wrapPattern = (
      wrapPatternSel?.value ||
      runtime.wrapPattern ||
      'solid'
    )
      .trim()
      .toLowerCase();
    runtime.wrapColorHex =
      parseHexColor(wrapColorInp?.value || '') || runtime.wrapColorHex;
    runtime.wrapTint =
      Number.parseFloat(wrapTintInp?.value || `${runtime.wrapTint}`) ||
      runtime.wrapTint;
    runtime.wrapScale =
      Number.parseFloat(wrapScaleInp?.value || `${runtime.wrapScale}`) ||
      runtime.wrapScale;
    runtime.wrapRotationDeg =
      Number.parseFloat(
        wrapRotationInp?.value || `${runtime.wrapRotationDeg}`
      ) || runtime.wrapRotationDeg;
    runtime.wrapOffsetX =
      Number.parseFloat(wrapOffsetXInp?.value || `${runtime.wrapOffsetX}`) ||
      runtime.wrapOffsetX;
    runtime.wrapOffsetY =
      Number.parseFloat(wrapOffsetYInp?.value || `${runtime.wrapOffsetY}`) ||
      runtime.wrapOffsetY;

    runtime.glassMode = Boolean(glassModeChk?.checked ?? runtime.glassMode);
    runtime.glassTint =
      Number.parseFloat(glassTintInp?.value || `${runtime.glassTint}`) ||
      runtime.glassTint;

    runtime.wheelColorHex =
      parseHexColor(wheelColorInp?.value || '') || runtime.wheelColorHex;
    runtime.trimColorHex =
      parseHexColor(trimColorInp?.value || '') || runtime.trimColorHex;
    runtime.caliperColorHex =
      parseHexColor(caliperColorInp?.value || '') || runtime.caliperColorHex;
    runtime.lightColorHex =
      parseHexColor(lightColorInp?.value || '') || runtime.lightColorHex;
    runtime.lightGlow =
      Number.parseFloat(lightGlowInp?.value || `${runtime.lightGlow}`) ||
      runtime.lightGlow;
  };

  const captureOriginalMaterials = (obj: THREE.Object3D) => {
    obj.traverse(child => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const mat of mats) {
        if (!mat) continue;
        const m = mat as THREE.Material;
        if (originalMaterialState.has(m)) continue;
        originalMaterialState.set(m, snapshotMaterial(m));
      }
    });
  };

  const restoreOriginalMaterials = (obj: THREE.Object3D) => {
    obj.traverse(child => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const mat of mats) {
        if (!mat) continue;
        const m = mat as THREE.Material;
        const snap = originalMaterialState.get(m);
        if (!snap) continue;
        restoreMaterial(m, snap);
      }
    });
  };

  const getRepresentativePartColor = (
    obj: THREE.Object3D,
    predicate: (flags: ReturnType<typeof classifyMeshByName>) => boolean
  ): number | null => {
    let found: number | null = null;
    obj.traverse(child => {
      if (found !== null) return;
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const mat of mats) {
        if (!mat) continue;
        const material = mat as THREE.Material;
        if (
          !(material instanceof THREE.MeshStandardMaterial) &&
          !(material instanceof THREE.MeshPhysicalMaterial)
        ) {
          continue;
        }
        const flags = classifyMeshByName(mesh.name || '', material.name || '');
        if (!predicate(flags)) continue;
        found = material.color.getHex();
        break;
      }
    });
    return found;
  };

  const maybeAutofillPartColorsFromModel = (obj: THREE.Object3D) => {
    const isDefault = (el: HTMLInputElement | null | undefined, hex: string) =>
      Boolean(el && normalizeName(el.value) === normalizeName(hex));

    const wheelDefault = '#111827';
    const trimDefault = '#0b0f14';
    const caliperDefault = '#ef4444';
    const lightDefault = '#ffffff';

    if (wheelColorInp && isDefault(wheelColorInp, wheelDefault)) {
      const c = getRepresentativePartColor(obj, f => f.isWheel);
      if (c !== null)
        wheelColorInp.value = `#${c.toString(16).padStart(6, '0')}`;
    }
    if (trimColorInp && isDefault(trimColorInp, trimDefault)) {
      const c = getRepresentativePartColor(obj, f => f.isTrim);
      if (c !== null)
        trimColorInp.value = `#${c.toString(16).padStart(6, '0')}`;
    }
    if (caliperColorInp && isDefault(caliperColorInp, caliperDefault)) {
      const c = getRepresentativePartColor(obj, f => f.isCaliper);
      if (c !== null)
        caliperColorInp.value = `#${c.toString(16).padStart(6, '0')}`;
    }
    if (lightColorInp && isDefault(lightColorInp, lightDefault)) {
      const c = getRepresentativePartColor(obj, f => f.isLight);
      if (c !== null)
        lightColorInp.value = `#${c.toString(16).padStart(6, '0')}`;
    }
  };

  const applyLookToModel = (obj: THREE.Object3D) => {
    syncRuntimeLookFromUi();
    captureOriginalMaterials(obj);

    if (wrapTexture) {
      wrapTexture.dispose?.();
      wrapTexture = null;
    }

    // Always rebuild from originals to avoid stacking.
    restoreOriginalMaterials(obj);
    if (runtime.originalMats) return;

    const finish = (runtime.finish || 'gloss').trim().toLowerCase();
    const clearcoat = clamp01(runtime.clearcoat);
    const finishRoughness =
      finish === 'matte' ? 0.92 : finish === 'satin' ? 0.48 : 0.18;
    const finishMetalness = finish === 'matte' ? 0.08 : 0.14;

    // Paint stays as the base look when not preserving originals.
    applyPaintHeuristic(obj, runtime.paintHex);

    // Apply finish to body-like surfaces (keeps glass/lights/wheels/calipers intact).
    obj.traverse(child => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const mat of mats) {
        if (!mat) continue;
        const material = mat as THREE.Material;
        if (
          !(material instanceof THREE.MeshStandardMaterial) &&
          !(material instanceof THREE.MeshPhysicalMaterial)
        ) {
          continue;
        }

        const flags = classifyMeshByName(mesh.name || '', material.name || '');
        if (flags.isWheel || flags.isCaliper || flags.isGlass || flags.isLight)
          continue;

        // Roughness/metalness are a big realism lever.
        material.roughness = clamp01(finishRoughness);
        material.metalness = clamp01(finishMetalness);
        material.envMapIntensity = clamp(runtime.envIntensity, 0, 3);

        // Use physical clearcoat where possible.
        if (material instanceof THREE.MeshPhysicalMaterial) {
          material.clearcoat = clearcoat;
          material.clearcoatRoughness = clamp01(0.08 + finishRoughness * 0.22);
        }

        material.needsUpdate = true;
      }
    });

    // Wrap
    if (runtime.wrapEnabled) {
      const tex = createWrapTexture(runtime.wrapPattern, runtime.wrapTint);
      wrapTexture = tex;

      const wrapColor = new THREE.Color(runtime.wrapColorHex);
      const rot = (clamp(runtime.wrapRotationDeg, -180, 180) * Math.PI) / 180;
      const scale = clamp(runtime.wrapScale, 0.25, 4);
      const ox = clamp(runtime.wrapOffsetX, -1, 1);
      const oy = clamp(runtime.wrapOffsetY, -1, 1);

      obj.traverse(child => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mats = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        for (const mat of mats) {
          if (!mat) continue;
          const material = mat as THREE.Material;
          if (
            !(material instanceof THREE.MeshStandardMaterial) &&
            !(material instanceof THREE.MeshPhysicalMaterial)
          ) {
            continue;
          }

          const flags = classifyMeshByName(
            mesh.name || '',
            material.name || ''
          );
          if (
            flags.isWheel ||
            flags.isCaliper ||
            flags.isGlass ||
            flags.isLight
          )
            continue;

          if (tex) {
            material.map = tex;
            material.map.repeat.set(scale, scale);
            material.map.center.set(0.5, 0.5);
            material.map.rotation = rot;
            material.map.offset.set(ox, oy);
          }
          material.color.copy(wrapColor);
          material.roughness = clamp01(finishRoughness);
          material.metalness = clamp01(finishMetalness);
          material.envMapIntensity = clamp(runtime.envIntensity, 0, 3);

          if (material instanceof THREE.MeshPhysicalMaterial) {
            material.clearcoat = clearcoat;
            material.clearcoatRoughness = clamp01(
              0.08 + finishRoughness * 0.22
            );
          }
          material.needsUpdate = true;
        }
      });
    }

    // Glass mode
    if (runtime.glassMode) {
      const tint = clamp01(runtime.glassTint);
      const glassBase = new THREE.Color('#0b1220');
      const glassColor = new THREE.Color('#ffffff').lerp(glassBase, tint);
      obj.traverse(child => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mats = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        for (const mat of mats) {
          if (!mat) continue;
          const material = mat as THREE.Material;
          if (
            !(material instanceof THREE.MeshStandardMaterial) &&
            !(material instanceof THREE.MeshPhysicalMaterial)
          ) {
            continue;
          }

          const flags = classifyMeshByName(
            mesh.name || '',
            material.name || ''
          );
          const looksLikeGlass =
            flags.isGlass ||
            material.transparent ||
            (material.opacity ?? 1) < 0.999;
          if (!looksLikeGlass) continue;

          material.color.copy(glassColor);
          material.metalness = 0;
          material.roughness = 0.06 + 0.22 * tint;
          material.transparent = true;
          material.opacity = clamp(1 - 0.55 * tint, 0.35, 1);
          material.envMapIntensity = clamp(runtime.envIntensity * 1.15, 0, 3);

          if (material instanceof THREE.MeshPhysicalMaterial) {
            material.transmission = clamp(0.95 - 0.55 * tint, 0.15, 0.95);
            material.ior = 1.45;
            material.thickness = 0.02;
            material.clearcoat = 0;
            material.clearcoatRoughness = 0;
          }

          material.needsUpdate = true;
        }
      });
    }

    // Part colors (wheels / trim / calipers / lights)
    const wheelColor = new THREE.Color(runtime.wheelColorHex);
    const trimColor = new THREE.Color(runtime.trimColorHex);
    const caliperColor = new THREE.Color(runtime.caliperColorHex);
    const lightColor = new THREE.Color(runtime.lightColorHex);
    const glow = clamp(runtime.lightGlow, 0, 6);

    obj.traverse(child => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const mat of mats) {
        if (!mat) continue;
        const material = mat as THREE.Material;
        if (
          !(material instanceof THREE.MeshStandardMaterial) &&
          !(material instanceof THREE.MeshPhysicalMaterial)
        ) {
          continue;
        }

        const flags = classifyMeshByName(mesh.name || '', material.name || '');
        if (flags.isWheel) {
          material.color.copy(wheelColor);
          material.needsUpdate = true;
        } else if (flags.isTrim) {
          material.color.copy(trimColor);
          material.needsUpdate = true;
        } else if (flags.isCaliper) {
          material.color.copy(caliperColor);
          material.needsUpdate = true;
        }

        if (flags.isLight && material.emissive) {
          material.emissive.copy(lightColor);
          material.emissiveIntensity = glow;
          material.needsUpdate = true;
        }

        material.envMapIntensity = clamp(runtime.envIntensity, 0, 3);
      }
    });
  };

  const applyLook = () => {
    const obj = loadState.gltf;
    if (!obj) return;

    // Avoid leaving inspector highlight in a weird state when we restore/reapply.
    const prev = selectedMesh;
    if (prev) setSelectedMesh(null, { force: true });

    applyLookToModel(obj);
    applyWireframe();

    if (prev) {
      setSelectedMesh(prev, { force: true });
      if (inspectorMeshSel) inspectorMeshSel.value = prev.uuid;
    }
    applyIsolate();
  };

  const applyModelTransform = () => {
    const obj = loadState.gltf;
    if (!obj) return;

    const s = clamp(Number(runtime.modelScaleMul) || 1, 0.1, 6);
    obj.scale.copy(modelBaseScale).multiplyScalar(s);

    const yawDeg = clamp(Number(runtime.modelYawDeg) || 0, -180, 180);
    const yawRad = (yawDeg * Math.PI) / 180;
    const yawQ = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      yawRad
    );
    obj.quaternion.copy(modelBaseQuat).multiply(yawQ);

    // Re-ground after transform. Keep x/z placement stable.
    const prevX = obj.position.x;
    const prevZ = obj.position.z;
    obj.position.set(prevX, 0, prevZ);
    obj.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(obj);
    obj.position.y -= box.min.y;
    modelBaseY = obj.position.y;
  };

  const setBackground = (mode: string) => {
    const m = (mode || 'studio').trim().toLowerCase();
    runtime.background = m;

    if (m === 'void') {
      scene.background = null;
      renderer.setClearAlpha(0);
      root.dataset.srBackground = 'void';
      return;
    }

    renderer.setClearAlpha(1);
    const map: Record<string, string> = {
      studio: '#111827',
      day: '#0f172a',
      sunset: '#1b1220',
      night: '#070a12',
      grid: '#0b1020',
    };
    baseBgColor.set(map[m] || map.studio);
    scene.background = baseBgColor;
    root.dataset.srBackground = m;
  };

  const applyLighting = () => {
    const intensity = clamp(runtime.lightIntensity, 0.2, 2.5);
    const warmth = clamp(runtime.lightWarmth, 0, 1);
    const rimBoost = clamp(runtime.rimBoost, 0.5, 2);
    const env = clamp(runtime.envIntensity, 0, 3);
    const rad = (runtime.envRotationDeg * Math.PI) / 180;
    const rot = new THREE.Matrix4().makeRotationY(rad);

    const cool = new THREE.Color('#dbeafe');
    const warm = new THREE.Color('#ffd7a1');
    const mixed = cool.clone().lerp(warm, warmth);

    const preset = runtime.lightPreset;
    if (preset === 'neon') {
      key.color.set('#a855f7');
      rim.color.set('#22d3ee');
    } else if (preset === 'golden') {
      key.color.set('#ffd7a1');
      rim.color.set('#93c5fd');
    } else if (preset === 'ice') {
      key.color.set('#dbeafe');
      rim.color.set('#60a5fa');
    } else if (preset === 'noir') {
      key.color.set('#ffffff');
      rim.color.set('#64748b');
    } else {
      key.color.copy(mixed);
      rim.color.set('#9bdcff');
    }

    hemi.intensity = 0.55 + env * 0.25;
    key.intensity = 1.8 * intensity;
    rim.intensity = 0.55 * intensity * rimBoost;

    key.position.copy(keyBase).applyMatrix4(rot);
    rim.position.copy(rimBase).applyMatrix4(rot);
  };

  const resetControlToDefault = (
    el:
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
      | null
      | undefined
  ) => {
    if (!el) return;

    if (el instanceof HTMLInputElement) {
      if (el.type === 'checkbox') {
        el.checked = el.defaultChecked;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }

      el.value = el.defaultValue;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    if (el instanceof HTMLSelectElement) {
      const opts = Array.from(el.options);
      const def = opts.find(o => o.defaultSelected) || opts[0];
      if (def) el.value = def.value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    // Textareas rarely used for resets, but keep it symmetric.
    el.value = el.defaultValue;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };

  resetEnvBtn?.addEventListener('click', () => {
    resetControlToDefault(bgSel);
    resetControlToDefault(lightPreset);
    resetControlToDefault(lightIntensity);
    resetControlToDefault(lightWarmth);
    resetControlToDefault(lightRim);
    resetControlToDefault(envIntensity);
    resetControlToDefault(envRotation);
  });

  resetLookBtn?.addEventListener('click', () => {
    resetControlToDefault(paintInp);
    resetControlToDefault(finishSel);
    resetControlToDefault(clearcoatInp);
    resetControlToDefault(wrapEnabledChk);
    resetControlToDefault(wrapPatternSel);
    resetControlToDefault(wrapColorInp);
    resetControlToDefault(wrapTintInp);
    resetControlToDefault(wrapScaleInp);
    resetControlToDefault(wrapRotationInp);
    resetControlToDefault(wrapOffsetXInp);
    resetControlToDefault(wrapOffsetYInp);
    resetControlToDefault(glassModeChk);
    resetControlToDefault(glassTintInp);
    resetControlToDefault(wheelColorInp);
    resetControlToDefault(trimColorInp);
    resetControlToDefault(caliperColorInp);
    resetControlToDefault(lightColorInp);
    resetControlToDefault(lightGlowInp);
    resetControlToDefault(originalMatsChk);
  });

  resetMotionBtn?.addEventListener('click', () => {
    resetControlToDefault(autorotate);
    resetControlToDefault(motionStyle);
    resetControlToDefault(motionSpeed);
    resetControlToDefault(zoom);

    // Respect reduced-motion: never re-enable auto-rotate.
    if (reducedMotionPref && autorotate) {
      autorotate.checked = false;
      autorotate.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  resetPostBtn?.addEventListener('click', () => {
    resetControlToDefault(exposure);
    resetControlToDefault(tonemapSel);
    resetControlToDefault(bloom);
    resetControlToDefault(bloomThreshold);
    resetControlToDefault(bloomRadius);
  });

  resetPerformanceBtn?.addEventListener('click', () => {
    resetControlToDefault(qualitySel);
    resetControlToDefault(autoQuality);
    resetControlToDefault(targetFps);
  });

  // Planar floor reflections (Reflector) — created lazily and fully disposable.
  const FLOOR_REFLECTOR_SHADER = {
    name: 'ShowroomFloorReflectorShader',
    uniforms: {
      color: { value: null },
      tDiffuse: { value: null },
      textureMatrix: { value: null },
      strength: { value: 0.55 },
    },
    vertexShader: /* glsl */ `
      uniform mat4 textureMatrix;
      varying vec4 vUv;

      #include <common>
      #include <logdepthbuf_pars_vertex>

      void main() {
        vUv = textureMatrix * vec4( position, 1.0 );
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        #include <logdepthbuf_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      uniform sampler2D tDiffuse;
      uniform float strength;
      varying vec4 vUv;

      #include <logdepthbuf_pars_fragment>

      float blendOverlay( float base, float blend ) {
        return( base < 0.5 ? ( 2.0 * base * blend ) : ( 1.0 - 2.0 * ( 1.0 - base ) * ( 1.0 - blend ) ) );
      }

      vec3 blendOverlay( vec3 base, vec3 blend ) {
        return vec3( blendOverlay( base.r, blend.r ), blendOverlay( base.g, blend.g ), blendOverlay( base.b, blend.b ) );
      }

      void main() {
        #include <logdepthbuf_fragment>

        vec4 base = texture2DProj( tDiffuse, vUv );
        vec3 tinted = blendOverlay( base.rgb, color );
        vec3 mixed = mix( base.rgb, tinted, clamp( strength, 0.0, 1.0 ) );
        gl_FragColor = vec4( mixed, 1.0 );

        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  };

  let floorReflector: Reflector | null = null;

  const ensureFloorReflector = () => {
    if (floorReflector) return;

    const baseline =
      runtime.quality === 'ultra'
        ? 1024
        : runtime.quality === 'balanced'
          ? 768
          : 512;
    const texSize = isMobile() ? Math.min(768, baseline) : baseline;

    floorReflector = new Reflector(new THREE.CircleGeometry(6, 64), {
      clipBias: 0.003,
      textureWidth: texSize,
      textureHeight: texSize,
      color: runtime.floorHex,
      multisample: 0,
      shader: FLOOR_REFLECTOR_SHADER,
    });

    floorReflector.rotation.x = -Math.PI / 2;
    floorReflector.position.y = -0.0008;
    // We keep reflections beneath the shadow catcher.
    floorReflector.renderOrder = -5;

    scene.add(floorReflector);
  };

  const disposeFloorReflector = () => {
    if (!floorReflector) return;
    try {
      scene.remove(floorReflector);
    } catch {
      // ignore
    }
    try {
      floorReflector.dispose?.();
    } catch {
      // ignore
    }
    floorReflector = null;
  };

  const applyFloorReflections = () => {
    const enabled = Boolean(runtime.floorReflections);
    if (enabled) ensureFloorReflector();
    else disposeFloorReflector();

    if (floorReflectionStrength) floorReflectionStrength.disabled = !enabled;

    if (!floorReflector) return;
    floorReflector.visible =
      enabled && clamp01(runtime.floorOpacity) > 0.001 && floor.visible;

    const mat = floorReflector.material as unknown as {
      uniforms?: Record<string, { value: unknown }>;
    };
    const u = mat.uniforms;
    if (u?.color && u.color.value && u.color.value instanceof THREE.Color) {
      (u.color.value as THREE.Color).set(runtime.floorHex);
    }
    if (u?.strength)
      u.strength.value = clamp01(runtime.floorReflectionStrength);
  };

  const applyFloor = () => {
    floorMat.color.set(runtime.floorHex);
    floorMat.roughness = clamp01(runtime.floorRoughness);
    floorMat.metalness = clamp01(runtime.floorMetalness);
    floorMat.opacity = clamp01(runtime.floorOpacity);
    floorMat.transparent = floorMat.opacity < 0.999;
    floor.visible = floorMat.opacity > 0.001;

    applyFloorReflections();
  };

  const applyShadows = () => {
    renderer.shadowMap.enabled =
      runtime.shadows && runtime.shadowStrength > 0.001;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    key.castShadow = renderer.shadowMap.enabled;
    shadow.visible = renderer.shadowMap.enabled;
    shadowMat.opacity = clamp01(runtime.shadowStrength);

    const s = clamp(runtime.shadowSize, 2, 12);
    const cam = key.shadow.camera as THREE.OrthographicCamera;
    cam.left = -s;
    cam.right = s;
    cam.top = s;
    cam.bottom = -s;
    cam.near = 0.5;
    cam.far = 40;
    cam.updateProjectionMatrix();

    const mapSize = runtime.shadowHQ ? 2048 : 1024;
    key.shadow.mapSize.set(mapSize, mapSize);
    key.shadow.bias = -0.0001;
  };

  const applyPost = () => {
    renderer.toneMapping = getToneMappingFromUi();
    runtime.baseExposure = Number.parseFloat(exposure?.value || '1.25') || 1.25;

    runtime.bloomStrength = Number.parseFloat(bloom?.value || '0') || 0;
    runtime.bloomThreshold =
      Number.parseFloat(bloomThreshold?.value || '0.9') || 0.9;
    runtime.bloomRadius = Number.parseFloat(bloomRadius?.value || '0') || 0;

    if (runtime.bloomStrength > 0.001) {
      ensureComposer();
      if (bloomPass) {
        bloomPass.strength = runtime.bloomStrength;
        bloomPass.threshold = runtime.bloomThreshold;
        bloomPass.radius = runtime.bloomRadius;
      }
    }
  };

  const setSize = () => {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    syncLetterbox();
  };

  const applyQuality = () => {
    let baseline = basePixelRatio;
    if (runtime.quality === 'eco') baseline = Math.min(basePixelRatio, 1.0);
    else if (runtime.quality === 'balanced')
      baseline = Math.min(basePixelRatio, isMobile() ? 1.25 : 1.5);

    const minRatio = isMobile() ? 0.85 : 1.0;
    const scaled = clamp(
      baseline * clamp01(runtime.dynamicScale),
      minRatio,
      baseline
    );

    currentPixelRatio = scaled;
    renderer.setPixelRatio(currentPixelRatio);
    composer?.setPixelRatio?.(currentPixelRatio as never);
    setSize();

    if (resEl) resEl.textContent = `${currentPixelRatio.toFixed(2)}x`;
    const eco = currentPixelRatio < baseline - 0.001;
    if (modeEl) modeEl.textContent = eco ? 'ECO' : 'LIVE';
    if (ecoEl) ecoEl.hidden = !eco;
  };

  const fitCameraToObject = (obj: THREE.Object3D) => {
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = (camera.fov * Math.PI) / 180;
    const dist = maxDim / (2 * Math.tan(fov / 2));

    controls.target.copy(center);
    camera.position.copy(center);
    camera.position.add(
      new THREE.Vector3(dist * 1.15, dist * 0.35, dist * 1.15)
    );
    camera.near = Math.max(0.01, dist / 100);
    camera.far = Math.max(50, dist * 100);
    camera.updateProjectionMatrix();
    controls.update();

    runtime.lastRadius = Math.max(0.01, maxDim * 0.5);
  };

  const applyCameraFromUi = () => {
    const mode = (camMode?.value || 'preset').trim().toLowerCase();
    const preset = (camPreset?.value || 'hero').trim().toLowerCase();

    if (camFov) {
      const f = Number.parseFloat(camFov.value) || camera.fov;
      camera.fov = clamp(f, 35, 85);
      camera.updateProjectionMatrix();
    }

    if (mode === 'manual') {
      const yawDeg = Number.parseFloat(camYaw?.value || '0') || 0;
      const pitchDeg = Number.parseFloat(camPitch?.value || '10') || 10;
      const dist = Number.parseFloat(camDist?.value || '9') || 9;
      const yaw = (yawDeg * Math.PI) / 180;
      const pitch = (pitchDeg * Math.PI) / 180;
      const y = Math.sin(pitch) * dist;
      const xz = Math.cos(pitch) * dist;
      const x = Math.cos(yaw) * xz;
      const z = Math.sin(yaw) * xz;
      camera.position.copy(controls.target).add(new THREE.Vector3(x, y, z));
      controls.update();
      return;
    }

    const r = runtime.lastRadius;
    const dist = clamp(r * 2.3, 2.2, 18);
    const t = controls.target.clone();
    const views: Record<string, THREE.Vector3> = {
      hero: new THREE.Vector3(dist, dist * 0.35, dist),
      front: new THREE.Vector3(dist, dist * 0.25, dist * 0.8),
      rear: new THREE.Vector3(-dist, dist * 0.25, -dist * 0.8),
      side: new THREE.Vector3(dist, dist * 0.2, 0),
      top: new THREE.Vector3(0, dist * 1.2, 0.01),
      detail: new THREE.Vector3(dist * 0.55, dist * 0.25, dist * 0.4),
    };
    const offset = views[preset] || views.hero;
    camera.position.copy(t).add(offset);
    controls.update();
  };

  resetCameraBtn?.addEventListener('click', () => {
    resetControlToDefault(interiorChk);
    resetControlToDefault(hotspotsChk);
    resetControlToDefault(camPreset);
    resetControlToDefault(camMode);
    resetControlToDefault(camYaw);
    resetControlToDefault(camPitch);
    resetControlToDefault(camDist);
    resetControlToDefault(camFov);
    resetControlToDefault(thirdsChk);
    resetControlToDefault(centerChk);
    resetControlToDefault(horizonChk);

    // Make sure the actual camera snaps to the restored UI.
    applyCameraFromUi();
  });

  const applyInteriorConstraints = () => {
    if (!runtime.interior) return;
    const r = clamp(Number(runtime.lastRadius) || 2.5, 0.25, 50);

    // Enable close-up navigation without near-plane clipping.
    camera.near = 0.01;
    camera.updateProjectionMatrix();

    controls.enablePan = false;
    controls.minDistance = clamp(r * 0.08, 0.08, 2.0);
    controls.maxDistance = clamp(r * 1.6, 1.25, 35);
  };

  const setInterior = (on: boolean) => {
    const next = Boolean(on);
    if (next === runtime.interior) {
      applyInteriorConstraints();
      return;
    }

    runtime.interior = next;
    if (interiorChk) interiorChk.checked = next;

    if (runtime.interior) {
      if (!runtime.interiorPrev) {
        runtime.interiorPrev = {
          cameraNear: camera.near,
          minDistance: controls.minDistance,
          maxDistance: controls.maxDistance,
          enablePan: controls.enablePan,
        };
      }
      applyInteriorConstraints();
      return;
    }

    const prev = runtime.interiorPrev;
    runtime.interiorPrev = null;
    if (prev) {
      camera.near = prev.cameraNear;
      camera.updateProjectionMatrix();
      controls.minDistance = prev.minDistance;
      controls.maxDistance = prev.maxDistance;
      controls.enablePan = prev.enablePan;
      controls.update();
    }
  };

  const jumpToInterior = () => {
    if (!loadState.gltf) return;
    const box = new THREE.Box3().setFromObject(loadState.gltf);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const r = clamp(Math.max(size.x, size.y, size.z) * 0.5, 0.25, 50);

    // Aim slightly above the center so we feel "inside".
    const target = center.clone();
    target.y += size.y * 0.18;

    const dir = camera.position.clone().sub(controls.target);
    if (dir.lengthSq() < 1e-6) dir.set(1, 0.15, 1);
    dir.normalize();

    controls.target.copy(target);
    camera.position
      .copy(target)
      .add(dir.multiplyScalar(clamp(r * 0.24, 0.22, 3.5)));
    camera.updateProjectionMatrix();
    controls.update();
  };

  const applyMotion = () => {
    const style = (runtime.motionStyle || 'turntable').trim().toLowerCase();
    controls.autoRotate = runtime.autorotate && style === 'turntable';
    controls.autoRotateSpeed = runtime.motionSpeed;
  };

  const applyZoom = () => {
    const t = clamp01(runtime.zoomT);
    const dist = THREE.MathUtils.lerp(
      controls.maxDistance,
      controls.minDistance,
      t
    );
    const dir = camera.position.clone().sub(controls.target).normalize();
    camera.position.copy(controls.target).add(dir.multiplyScalar(dist));
    controls.update();
  };

  // Assigned later (after inspector bindings are created).
  let clearHotspotGlow: () => void = () => {
    // noop
  };

  const loadModel = async (
    raw: string,
    opts?: { objectUrlToRevoke?: string | null }
  ) => {
    const requestId = ++loadState.requestId;

    // Model swap: drop temporary hotspot glow tweaks.
    clearHotspotGlow();

    // Model swap: decals are projected per-model.
    clearDecals();
    disposeDecalTexture();

    // Model swap: drop plate overrides (texture/material targets are per-model).
    resetPlate();
    plateMaterials = [];

    if (loadState.gltf) {
      scene.remove(loadState.gltf);
      disposeObject(loadState.gltf);
      loadState.gltf = null;
    }

    modelBaseY = 0;

    stopAnimations();
    setSelectedMesh(null);
    applyIsolate();

    if (loadState.objectUrlToRevoke) {
      URL.revokeObjectURL(loadState.objectUrlToRevoke);
      loadState.objectUrlToRevoke = null;
    }

    if (opts?.objectUrlToRevoke)
      loadState.objectUrlToRevoke = opts.objectUrlToRevoke;

    const resolved = resolveModelUrl(raw);

    setRootState(root, {
      carShowroomReady: '0',
      carShowroomLoading: '1',
      carShowroomLoadPhase: 'fetch',
      carShowroomLoadError: '',
      carShowroomModel: raw.trim(),
    });
    setStatus(true, '');

    try {
      const gltf = await loader.loadAsync(resolved);
      if (requestId !== loadState.requestId) return;

      const obj = gltf.scene || gltf.scenes?.[0];
      if (!obj) throw new Error('GLTF contained no scene');

      loadState.animations = gltf.animations || [];

      obj.traverse(child => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = renderer.shadowMap.enabled;
        mesh.receiveShadow = false;
      });

      normalizeModelPlacement(obj);
      scene.add(obj);
      loadState.gltf = obj;

      // Capture normalized base transform, then apply user transform on top.
      modelBaseQuat.copy(obj.quaternion);
      modelBaseScale.copy(obj.scale);
      applyModelTransform();

      // Build inspector inventory
      inspectorMeshes = [];
      const uniqueMats = new Set<THREE.Material>();
      const uniqueTex = new Set<THREE.Texture>();
      let triCount = 0;
      obj.traverse(child => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        inspectorMeshes.push(mesh);
        triCount += getMeshTriangleCount(mesh);
        const mats = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        for (const mat of mats) {
          if (!mat) continue;
          uniqueMats.add(mat as THREE.Material);
          for (const tex of collectMaterialTextures(mat as THREE.Material)) {
            uniqueTex.add(tex);
          }
        }
      });

      inspectorMeshes.sort((a, b) => {
        const an = String(a.name || '');
        const bn = String(b.name || '');
        if (an === bn) return a.uuid.localeCompare(b.uuid);
        return an.localeCompare(bn);
      });

      if (statMeshes)
        statMeshes.textContent = formatInt(inspectorMeshes.length);
      if (statMats) statMats.textContent = formatInt(uniqueMats.size);
      if (statTris) statTris.textContent = formatInt(triCount);
      if (statTex) statTex.textContent = formatInt(uniqueTex.size);
      populateMeshSelect();

      // Enable animation controls if clips exist
      if (loadState.animations.length && obj) {
        mixer = new THREE.AnimationMixer(obj);
        if (animClipSel) {
          animClipSel.innerHTML = '';
          const frag = document.createDocumentFragment();
          for (const clip of loadState.animations) {
            const opt = document.createElement('option');
            opt.value = clip.name;
            opt.textContent = clip.name || '(unnamed clip)';
            frag.appendChild(opt);
          }
          animClipSel.appendChild(frag);
          animClipSel.value = loadState.animations[0]?.name || '';
        }
        setAnimationEnabled(true);
        playClipByName(
          animClipSel?.value || loadState.animations[0]?.name || ''
        );
      } else {
        setAnimationEnabled(false);
      }

      fitCameraToObject(obj);
      applyCameraFromUi();

      // Re-apply interior constraints for the newly loaded model.
      if (runtime.interior) {
        applyInteriorConstraints();
      }

      maybeAutofillPartColorsFromModel(obj);
      applyLook();

      // Plate applies after look so it sits "on top".
      if (runtime.plateText) applyPlate(runtime.plateText);

      // Apply debug/inspector transforms after load
      grid.visible = Boolean(gridChk?.checked ?? runtime.grid);
      axes.visible = Boolean(axesChk?.checked ?? runtime.axes);
      applyWireframe();

      setRootState(root, {
        carShowroomReady: '1',
        carShowroomLoading: '0',
        carShowroomLoadPhase: '',
        carShowroomLoadError: '',
      });
      setStatus(false, '');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[ShowroomV3] Model load failed:', resolved, e);
      if (requestId !== loadState.requestId) return;

      setRootState(root, {
        carShowroomReady: '0',
        carShowroomLoading: '0',
        carShowroomLoadPhase: '',
        carShowroomLoadError: msg,
      });
      setStatus(false, `Failed to load model. ${msg}`);
    }
  };

  // Bind UI
  bgSel?.addEventListener('change', () => setBackground(bgSel.value));
  setBackground(runtime.background);

  const syncPlateTextFromUi = () => {
    runtime.plateText = safeTrimText(plateTextInp?.value || '', 10);
  };

  hotspotsChk?.addEventListener('change', () => {
    runtime.hotspots = Boolean(hotspotsChk.checked);
    if (!runtime.hotspots) clearHotspotGlow();
  });

  interiorChk?.addEventListener('change', () => {
    setInterior(Boolean(interiorChk.checked));
  });

  jumpInteriorBtn?.addEventListener('click', () => {
    hapticTap(8);
    setInterior(true);
    jumpToInterior();
  });

  cinematicChk?.addEventListener('change', () => {
    setCinematic(Boolean(cinematicChk.checked));
  });

  cinematicExitBtn?.addEventListener('click', () => {
    if (cinematicChk) cinematicChk.checked = false;
    setCinematic(false);
  });

  plateApplyBtn?.addEventListener('click', () => {
    syncPlateTextFromUi();
    applyPlate(runtime.plateText);
  });

  plateResetBtn?.addEventListener('click', () => {
    if (plateTextInp) plateTextInp.value = '';
    runtime.plateText = '';
    resetPlate();
  });

  plateTextInp?.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    syncPlateTextFromUi();
    applyPlate(runtime.plateText);
  });

  plateTextInp?.addEventListener('input', () => syncPlateTextFromUi());

  const syncDecalStateFromUi = () => {
    runtime.decalMode = Boolean(decalModeChk?.checked ?? runtime.decalMode);
    runtime.decalText = safeTrimText(decalTextInp?.value || '', 18);
    runtime.decalColorHex =
      parseHexColor(decalColorInp?.value || '') || runtime.decalColorHex;
    runtime.decalSize =
      Number.parseFloat(decalSizeInp?.value || `${runtime.decalSize}`) ||
      runtime.decalSize;
    runtime.decalRotDeg =
      Number.parseFloat(decalRotInp?.value || `${runtime.decalRotDeg}`) ||
      runtime.decalRotDeg;
    runtime.decalOpacity =
      Number.parseFloat(decalOpacityInp?.value || `${runtime.decalOpacity}`) ||
      runtime.decalOpacity;
  };

  const syncDecalTextureFromUi = () => {
    syncDecalStateFromUi();
    syncDecalTextureFromRuntime();
  };

  decalModeChk?.addEventListener('change', () => {
    runtime.decalMode = Boolean(decalModeChk.checked);
    if (runtime.decalMode) syncDecalTextureFromUi();
  });
  decalTextInp?.addEventListener('input', () => {
    if (!runtime.decalMode) return;
    syncDecalTextureFromUi();
  });
  decalColorInp?.addEventListener('input', () => {
    if (!runtime.decalMode) return;
    syncDecalTextureFromUi();
  });
  decalOpacityInp?.addEventListener('input', () => {
    if (!runtime.decalMode) return;
    syncDecalTextureFromUi();
  });
  decalSizeInp?.addEventListener('input', () => {
    syncDecalStateFromUi();
  });
  decalRotInp?.addEventListener('input', () => {
    syncDecalStateFromUi();
  });
  decalClearBtn?.addEventListener('click', () => {
    hapticTap(10);
    clearDecals();
  });

  const syncRuntimeModelTransformFromUi = () => {
    runtime.modelScaleMul = Number.parseFloat(modelScale?.value || '1') || 1;
    runtime.modelYawDeg = Number.parseFloat(modelYaw?.value || '0') || 0;
    runtime.modelLift = Number.parseFloat(modelLift?.value || '0') || 0;
  };

  modelScale?.addEventListener('input', () => {
    syncRuntimeModelTransformFromUi();
    applyModelTransform();
  });
  modelYaw?.addEventListener('input', () => {
    syncRuntimeModelTransformFromUi();
    applyModelTransform();
  });
  modelLift?.addEventListener('input', () => {
    syncRuntimeModelTransformFromUi();
  });

  modelTransformResetBtn?.addEventListener('click', () => {
    if (modelScale) modelScale.value = '1';
    if (modelYaw) modelYaw.value = '0';
    if (modelLift) modelLift.value = '0';
    syncRuntimeModelTransformFromUi();
    applyModelTransform();
    setStatus(false, 'Model transform reset.');
    window.setTimeout(() => setStatus(false, ''), 1200);
  });

  const syncPaint = () => {
    const parsed = parseHexColor(paintInp?.value || '') || runtime.paintHex;
    runtime.paintHex = parsed;
    if (loadState.gltf) applyLook();
  };
  paintInp?.addEventListener('input', syncPaint);

  originalMatsChk?.addEventListener('change', () => {
    runtime.originalMats = Boolean(originalMatsChk.checked);
    if (loadState.gltf) applyLook();
  });

  // Look controls
  finishSel?.addEventListener('change', () => applyLook());
  clearcoatInp?.addEventListener('input', () => applyLook());

  wrapEnabledChk?.addEventListener('change', () => applyLook());
  wrapPatternSel?.addEventListener('change', () => applyLook());
  wrapColorInp?.addEventListener('input', () => applyLook());
  wrapTintInp?.addEventListener('input', () => applyLook());
  wrapScaleInp?.addEventListener('input', () => applyLook());
  wrapRotationInp?.addEventListener('input', () => applyLook());
  wrapOffsetXInp?.addEventListener('input', () => applyLook());
  wrapOffsetYInp?.addEventListener('input', () => applyLook());

  glassModeChk?.addEventListener('change', () => applyLook());
  glassTintInp?.addEventListener('input', () => applyLook());

  wheelColorInp?.addEventListener('input', () => applyLook());
  trimColorInp?.addEventListener('input', () => applyLook());
  caliperColorInp?.addEventListener('input', () => applyLook());
  lightColorInp?.addEventListener('input', () => applyLook());
  lightGlowInp?.addEventListener('input', () => applyLook());

  lightPreset?.addEventListener('change', () => {
    runtime.lightPreset = (lightPreset.value || 'studio').trim().toLowerCase();
    applyLighting();
  });
  lightIntensity?.addEventListener('input', () => {
    runtime.lightIntensity = Number.parseFloat(lightIntensity.value) || 1;
    applyLighting();
  });
  lightWarmth?.addEventListener('input', () => {
    runtime.lightWarmth = Number.parseFloat(lightWarmth.value) || 0;
    applyLighting();
  });
  lightRim?.addEventListener('input', () => {
    runtime.rimBoost = Number.parseFloat(lightRim.value) || 1;
    applyLighting();
  });

  envIntensity?.addEventListener('input', () => {
    runtime.envIntensity = Number.parseFloat(envIntensity.value) || 0;
    applyLighting();
    if (loadState.gltf) applyLook();
  });

  envRotation?.addEventListener('input', () => {
    runtime.envRotationDeg = Number.parseFloat(envRotation.value) || 0;
    applyLighting();
  });
  applyLighting();

  thirdsChk?.addEventListener('change', () => applyThirdsOverlay());
  applyThirdsOverlay();

  centerChk?.addEventListener('change', () => applyCenterOverlay());
  applyCenterOverlay();

  horizonChk?.addEventListener('change', () => applyHorizonOverlay());
  applyHorizonOverlay();

  gridChk?.addEventListener('change', () => {
    runtime.grid = Boolean(gridChk.checked);
    grid.visible = runtime.grid;
  });
  axesChk?.addEventListener('change', () => {
    runtime.axes = Boolean(axesChk.checked);
    axes.visible = runtime.axes;
  });
  hapticsChk?.addEventListener('change', () => {
    runtime.haptics = Boolean(hapticsChk.checked);
  });

  floorColor?.addEventListener('input', () => {
    runtime.floorHex = parseHexColor(floorColor.value) || runtime.floorHex;
    applyFloor();
  });
  floorOpacity?.addEventListener('input', () => {
    runtime.floorOpacity = Number.parseFloat(floorOpacity.value) || 1;
    applyFloor();
  });
  floorRoughness?.addEventListener('input', () => {
    runtime.floorRoughness = Number.parseFloat(floorRoughness.value) || 1;
    applyFloor();
  });
  floorMetalness?.addEventListener('input', () => {
    runtime.floorMetalness = Number.parseFloat(floorMetalness.value) || 0;
    applyFloor();
  });

  floorReflectionsChk?.addEventListener('change', () => {
    runtime.floorReflections = Boolean(floorReflectionsChk.checked);
    applyFloorReflections();
  });
  floorReflectionStrength?.addEventListener('input', () => {
    runtime.floorReflectionStrength =
      Number.parseFloat(floorReflectionStrength.value) ||
      runtime.floorReflectionStrength;
    applyFloorReflections();
  });
  applyFloor();

  const syncShadowUi = () => {
    runtime.shadows = Boolean(shadowsChk?.checked ?? runtime.shadows);
    runtime.shadowHQ = Boolean(shadowHQ?.checked ?? runtime.shadowHQ);
    runtime.shadowStrength =
      Number.parseFloat(shadowStrength?.value || `${runtime.shadowStrength}`) ||
      runtime.shadowStrength;
    runtime.shadowSize =
      Number.parseFloat(shadowSize?.value || `${runtime.shadowSize}`) ||
      runtime.shadowSize;
    applyShadows();

    if (loadState.gltf) {
      loadState.gltf.traverse(child => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = renderer.shadowMap.enabled;
      });
    }
  };
  shadowsChk?.addEventListener('change', syncShadowUi);
  shadowHQ?.addEventListener('change', syncShadowUi);
  shadowStrength?.addEventListener('input', syncShadowUi);
  shadowSize?.addEventListener('input', syncShadowUi);
  syncShadowUi();

  const syncPostUi = () => {
    applyPost();
  };
  exposure?.addEventListener('input', syncPostUi);
  tonemapSel?.addEventListener('change', syncPostUi);
  bloom?.addEventListener('input', syncPostUi);
  bloomThreshold?.addEventListener('input', syncPostUi);
  bloomRadius?.addEventListener('input', syncPostUi);

  exposureResetBtn?.addEventListener('click', () => {
    if (exposure) exposure.value = '1.25';
    syncPostUi();
  });
  syncPostUi();

  camPreset?.addEventListener('change', applyCameraFromUi);
  camMode?.addEventListener('change', applyCameraFromUi);
  camYaw?.addEventListener('input', applyCameraFromUi);
  camPitch?.addEventListener('input', applyCameraFromUi);
  camDist?.addEventListener('input', applyCameraFromUi);
  camFov?.addEventListener('input', applyCameraFromUi);

  camFrame?.addEventListener('click', () => {
    if (loadState.gltf) fitCameraToObject(loadState.gltf);
  });
  camReset?.addEventListener('click', () => {
    controls.target.set(0, 0.8, 0);
    camera.position.set(4.2, 1.4, 4.2);
    controls.update();
  });

  autorotate?.addEventListener('change', () => {
    runtime.autorotate = Boolean(autorotate.checked);
    applyMotion();
  });
  motionStyle?.addEventListener('change', () => {
    runtime.motionStyle = (motionStyle.value || 'turntable')
      .trim()
      .toLowerCase();
    applyMotion();
  });
  motionSpeed?.addEventListener('input', () => {
    runtime.motionSpeed =
      Number.parseFloat(motionSpeed.value) || runtime.motionSpeed;
    applyMotion();
  });
  zoom?.addEventListener('input', () => {
    runtime.zoomT = Number.parseFloat(zoom.value) || 0;
    applyZoom();
  });
  applyMotion();
  applyZoom();

  qualitySel?.addEventListener('change', () => {
    runtime.quality = (qualitySel.value || runtime.quality)
      .trim()
      .toLowerCase();
    runtime.dynamicScale = 1;
    applyQuality();
  });
  autoQuality?.addEventListener('change', () => {
    runtime.autoQuality = Boolean(autoQuality.checked);
    if (!runtime.autoQuality) {
      runtime.dynamicScale = 1;
      applyQuality();
    }
  });

  targetFps?.addEventListener('input', () => {
    runtime.targetFps = Number.parseFloat(targetFps.value) || runtime.targetFps;
  });
  applyQuality();

  modelSel?.addEventListener('change', () => {
    const v = (modelSel.value || '').trim();
    if (modelUrl) modelUrl.value = v;
    void loadModel(v);
  });

  loadBtn?.addEventListener('click', () => {
    const v = (modelUrl?.value || modelSel?.value || '').trim();
    void loadModel(v);
  });

  modelUrl?.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const v = (modelUrl.value || modelSel?.value || '').trim();
    void loadModel(v);
  });

  importBtn?.addEventListener('click', () => fileInp?.click());
  fileInp?.addEventListener('change', () => {
    const file = fileInp.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (modelUrl) modelUrl.value = url;
    void loadModel(url, { objectUrlToRevoke: url });
  });

  // Drag-and-drop import (GLB/GLTF) onto the viewer.
  if (viewer) {
    createDropZone(viewer, {
      accept: ['.glb', '.gltf', 'model/gltf-binary'],
      multiple: false,
      dragOverClass: 'sr-drop-over',
      onFileDrop: files => {
        const file = files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        if (modelUrl) modelUrl.value = url;
        setStatus(false, 'Loading dropped model…');
        void loadModel(url, { objectUrlToRevoke: url });
      },
    });
  }

  const downloadScreenshot = () => {
    hapticTap(15);

    const scaleRaw = (screenshotScaleSel?.value || '1').trim();
    const scale = Math.max(1, Math.min(4, Number.parseInt(scaleRaw, 10) || 1));

    const oldPixelRatio = renderer.getPixelRatio();
    const oldCurrent = currentPixelRatio;

    if (scale > 1) {
      setStatus(false, `Capturing ${scale}x…`);
    }

    try {
      // Use a one-frame pixelRatio boost (no layout resize) for a higher-res capture.
      if (scale > 1) {
        const boosted = clamp(oldPixelRatio * scale, 0.5, 8);
        renderer.setPixelRatio(boosted);
        composer?.setPixelRatio?.(boosted as never);
        setSize();

        if (composer && runtime.bloomStrength > 0.001) composer.render();
        else renderer.render(scene, camera);
      }

      const a = document.createElement('a');
      a.download =
        scale > 1 ? `car-showroom@${scale}x.png` : 'car-showroom.png';
      a.href = renderer.domElement.toDataURL('image/png');
      a.click();

      if (scale > 1) {
        setStatus(false, 'Saved.');
        window.setTimeout(() => setStatus(false, ''), 1200);
      }
    } catch (e) {
      console.warn('[ShowroomV3] Screenshot failed:', e);
      setStatus(false, 'Screenshot failed.');
      window.setTimeout(() => setStatus(false, ''), 1200);
    } finally {
      // Restore renderer/composer pixel ratio + size.
      if (scale > 1) {
        renderer.setPixelRatio(oldPixelRatio);
        composer?.setPixelRatio?.(oldPixelRatio as never);
        currentPixelRatio = oldCurrent;
        setSize();
      }
    }
  };
  for (const btn of screenshotBtns)
    btn.addEventListener('click', downloadScreenshot);

  const copyScreenshotToClipboard = async () => {
    hapticTap(15);
    try {
      const canvasEl = renderer.domElement;
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvasEl.toBlob(b => {
          if (b) resolve(b);
          else reject(new Error('toBlob() returned null'));
        }, 'image/png');
      });

      // ClipboardItem may be unavailable in some browsers.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ClipboardItemCtor = (window as any).ClipboardItem as
        | (new (items: Record<string, Blob>) => ClipboardItem)
        | undefined;

      if (!ClipboardItemCtor || !navigator.clipboard?.write) {
        throw new Error('Clipboard image write not supported');
      }

      await navigator.clipboard.write([
        new ClipboardItemCtor({ 'image/png': blob }),
      ]);

      setStatus(false, 'Screenshot copied.');
      window.setTimeout(() => setStatus(false, ''), 1200);
    } catch {
      setStatus(false, 'Copy failed.');
      window.setTimeout(() => setStatus(false, ''), 1200);
    }
  };
  screenshotCopyBtn?.addEventListener('click', () => {
    void copyScreenshotToClipboard();
  });

  const buildShareUrl = () => {
    const url = new URL(window.location.href);
    const v = (modelUrl?.value || modelSel?.value || '').trim();
    if (v) url.searchParams.set('model', v);
    url.searchParams.set('bg', runtime.background);
    url.searchParams.set('q', runtime.quality);
    url.searchParams.set('aq', runtime.autoQuality ? '1' : '0');
    url.searchParams.set('fps', String(Math.round(runtime.targetFps)));

    const paint = (paintInp?.value || '').trim();
    if (paint) url.searchParams.set('paint', paint.replace('#', ''));
    url.searchParams.set('om', runtime.originalMats ? '1' : '0');

    // Finish
    const fin = (finishSel?.value || 'gloss').trim().toLowerCase();
    const coat = Number.parseFloat(clearcoatInp?.value || '0.8') || 0.8;
    if (fin && fin !== 'gloss') url.searchParams.set('fin', fin);
    if (Math.abs(coat - 0.8) > 0.0001)
      url.searchParams.set('coat', coat.toFixed(3));

    // Look
    const we = Boolean(wrapEnabledChk?.checked);
    const wp = (wrapPatternSel?.value || 'solid').trim().toLowerCase();
    const wc = (wrapColorInp?.value || '').trim();
    const wt = Number.parseFloat(wrapTintInp?.value || '0.8') || 0.8;
    const ws = Number.parseFloat(wrapScaleInp?.value || '1') || 1;
    const wr = Number.parseFloat(wrapRotationInp?.value || '0') || 0;
    const wox = Number.parseFloat(wrapOffsetXInp?.value || '0') || 0;
    const woy = Number.parseFloat(wrapOffsetYInp?.value || '0') || 0;

    if (we) url.searchParams.set('we', '1');
    if (we && wp && wp !== 'solid') url.searchParams.set('wp', wp);
    if (we && wc) url.searchParams.set('wc', wc.replace('#', ''));
    if (we && Math.abs(wt - 0.8) > 0.0001)
      url.searchParams.set('wt', wt.toFixed(3));
    if (we && Math.abs(ws - 1) > 0.0001)
      url.searchParams.set('ws', ws.toFixed(3));
    if (we && Math.abs(wr) > 0.0001) url.searchParams.set('wr', wr.toFixed(1));
    if (we && Math.abs(wox) > 0.0001)
      url.searchParams.set('wox', wox.toFixed(3));
    if (we && Math.abs(woy) > 0.0001)
      url.searchParams.set('woy', woy.toFixed(3));

    const gm = Boolean(glassModeChk?.checked);
    const gt = Number.parseFloat(glassTintInp?.value || '0.35') || 0.35;
    if (gm) url.searchParams.set('gm', '1');
    if (gm && Math.abs(gt - 0.35) > 0.0001)
      url.searchParams.set('gt', gt.toFixed(3));

    const wh = (wheelColorInp?.value || '').trim();
    const tc = (trimColorInp?.value || '').trim();
    const cc = (caliperColorInp?.value || '').trim();
    const lc = (lightColorInp?.value || '').trim();
    const lg = Number.parseFloat(lightGlowInp?.value || '1.25') || 1.25;

    if (wh && normalizeName(wh) !== normalizeName('#111827'))
      url.searchParams.set('wh', wh.replace('#', ''));
    if (tc && normalizeName(tc) !== normalizeName('#0b0f14'))
      url.searchParams.set('tc', tc.replace('#', ''));
    if (cc && normalizeName(cc) !== normalizeName('#ef4444'))
      url.searchParams.set('cc', cc.replace('#', ''));
    if (lc && normalizeName(lc) !== normalizeName('#ffffff'))
      url.searchParams.set('lc', lc.replace('#', ''));
    if (Math.abs(lg - 1.25) > 0.0001) url.searchParams.set('lg', lg.toFixed(3));
    url.searchParams.set('lp', runtime.lightPreset);
    url.searchParams.set('li', String(runtime.lightIntensity));
    url.searchParams.set('lw', String(runtime.lightWarmth));
    url.searchParams.set('lr', String(runtime.rimBoost));
    url.searchParams.set('ei', String(runtime.envIntensity));
    url.searchParams.set('er', String(runtime.envRotationDeg));
    url.searchParams.set('grid', runtime.grid ? '1' : '0');
    url.searchParams.set('axes', runtime.axes ? '1' : '0');
    url.searchParams.set('rt', runtime.thirdsOverlay ? '1' : '0');
    url.searchParams.set('cm', runtime.centerOverlay ? '1' : '0');
    url.searchParams.set('hz', runtime.horizonOverlay ? '1' : '0');
    url.searchParams.set('wf', wireframeChk?.checked ? '1' : '0');

    // Post
    const ex = Number.parseFloat(exposure?.value || '1.25') || 1.25;
    const tm = (tonemapSel?.value || 'aces').trim().toLowerCase();
    const bl = Number.parseFloat(bloom?.value || '0') || 0;
    const bt = Number.parseFloat(bloomThreshold?.value || '0.9') || 0.9;
    const br = Number.parseFloat(bloomRadius?.value || '0') || 0;
    if (Math.abs(ex - 1.25) > 0.0001) url.searchParams.set('ex', ex.toFixed(3));
    if (tm && tm !== 'aces') url.searchParams.set('tm', tm);
    if (Math.abs(bl - 0.35) > 0.0001) url.searchParams.set('bl', bl.toFixed(3));
    if (Math.abs(bt - 0.9) > 0.0001) url.searchParams.set('bt', bt.toFixed(3));
    if (Math.abs(br) > 0.0001) url.searchParams.set('br', br.toFixed(3));

    // Cinematic + plate
    if (runtime.cinematic) url.searchParams.set('cine', '1');
    const plt = safeTrimText(plateTextInp?.value || '', 10);
    if (plt) url.searchParams.set('plt', plt);

    // Interior + hotspots
    url.searchParams.set('int', runtime.interior ? '1' : '0');
    url.searchParams.set('hs', runtime.hotspots ? '1' : '0');

    // Floor reflections
    url.searchParams.set('fr', runtime.floorReflections ? '1' : '0');
    const frs = clamp01(Number(runtime.floorReflectionStrength) || 0.55);
    if (Math.abs(frs - 0.55) > 0.0001) url.searchParams.set('frs', String(frs));

    // Decal settings (placements are not included)
    url.searchParams.set('dm', runtime.decalMode ? '1' : '0');
    const dt = safeTrimText(decalTextInp?.value || '', 18);
    if (dt) url.searchParams.set('dt', dt);
    const dc = (decalColorInp?.value || '').trim();
    if (dc) url.searchParams.set('dc', dc.replace('#', ''));
    const ds =
      Number.parseFloat(decalSizeInp?.value || '') || runtime.decalSize;
    url.searchParams.set('ds', String(ds));
    const dr =
      Number.parseFloat(decalRotInp?.value || '') || runtime.decalRotDeg;
    url.searchParams.set('dr', String(Math.round(dr)));
    const dop =
      Number.parseFloat(decalOpacityInp?.value || '') || runtime.decalOpacity;
    url.searchParams.set('do', String(dop));

    const ms = Number(runtime.modelScaleMul) || 1;
    const my = Number(runtime.modelYawDeg) || 0;
    const ml = Number(runtime.modelLift) || 0;
    if (Math.abs(ms - 1) > 0.0001) url.searchParams.set('ms', ms.toFixed(3));
    if (Math.abs(my) > 0.0001) url.searchParams.set('my', my.toFixed(1));
    if (Math.abs(ml) > 0.0001) url.searchParams.set('ml', ml.toFixed(3));
    return url;
  };

  const copyShareLink = async () => {
    hapticTap(15);
    const url = buildShareUrl();
    try {
      await navigator.clipboard.writeText(url.toString());
      setStatus(false, 'Link copied.');
      window.setTimeout(() => setStatus(false, ''), 1200);
    } catch {
      setStatus(false, 'Copy failed.');
      window.setTimeout(() => setStatus(false, ''), 1200);
    }
  };
  for (const btn of shareBtns)
    btn.addEventListener('click', () => {
      void copyShareLink();
    });

  regroundBtn?.addEventListener('click', () => {
    if (!loadState.gltf) return;
    hapticTap(15);
    try {
      normalizeModelPlacement(loadState.gltf);
      modelBaseQuat.copy(loadState.gltf.quaternion);
      modelBaseScale.copy(loadState.gltf.scale);
      applyModelTransform();
      fitCameraToObject(loadState.gltf);
      setStatus(false, 'Re-grounded.');
      window.setTimeout(() => setStatus(false, ''), 1200);
    } catch {
      setStatus(false, 'Re-ground failed.');
      window.setTimeout(() => setStatus(false, ''), 1200);
    }
  });

  // Resize + loop
  const ro = new ResizeObserver(() => setSize());
  ro.observe(canvas);
  setSize();

  let reducedMotionPref = false;

  // FPS + adaptive quality + animation
  let lastSample = performance.now();
  let lastTick = lastSample;
  let frames = 0;
  const tick = () => {
    frames += 1;
    const now = performance.now();

    const deltaS = Math.max(0, now - lastTick) / 1000;
    lastTick = now;

    // Motion (float / pendulum)
    const style = (runtime.motionStyle || 'turntable').trim().toLowerCase();
    if (loadState.gltf && runtime.autorotate && style === 'float') {
      const t = now * 0.001;
      const amp = clamp(runtime.lastRadius * 0.01, 0.01, 0.08);
      const bob =
        (Math.sin(t * (0.65 + runtime.motionSpeed * 0.7)) * 0.5 + 0.5) * amp;
      loadState.gltf.position.y =
        modelBaseY + (Number(runtime.modelLift) || 0) + bob;
    } else if (loadState.gltf) {
      // Keep grounded (do NOT force y=0; preserve normalization offset)
      loadState.gltf.position.y = modelBaseY + (Number(runtime.modelLift) || 0);
    }

    if (selectionBox) selectionBox.update();

    // Animation mixer
    if (mixer && animationEnabled) {
      const playing = Boolean(animPlayChk?.checked ?? true);
      const sp = Number.parseFloat(animSpeed?.value || '1') || 1;
      mixer.timeScale = sp;
      if (playing) mixer.update(deltaS);
    }
    const dt = now - lastSample;
    if (dt >= 1000) {
      const fps = Math.round((frames * 1000) / dt);
      if (fpsEl) fpsEl.textContent = String(fps).padStart(2, '0');

      if (runtime.autoQuality) {
        const target = clamp(runtime.targetFps, 30, 90);
        const low = target - 5;
        const high = target + 7;

        // Adjust dynamicScale in small steps; 1 = baseline.
        if (fps > 0 && fps < low) {
          // Prefer disabling expensive features before dropping resolution.
          const reflections = Boolean(
            floorReflectionsChk?.checked ?? runtime.floorReflections
          );
          const hq = Boolean(shadowHQ?.checked ?? runtime.shadowHQ);
          if (reflections) {
            if (floorReflectionsChk) floorReflectionsChk.checked = false;
            runtime.floorReflections = false;
            applyFloorReflections();
          } else if (hq) {
            if (shadowHQ) shadowHQ.checked = false;
            runtime.shadowHQ = false;
            syncShadowUi();
          } else {
            runtime.dynamicScale = clamp(runtime.dynamicScale - 0.08, 0.5, 1);
            applyQuality();
          }
        } else if (fps > high) {
          runtime.dynamicScale = clamp(runtime.dynamicScale + 0.06, 0.5, 1);
          applyQuality();
        }
      }

      frames = 0;
      lastSample = now;
    }

    // Pendulum motion (optional)
    if (
      runtime.autorotate &&
      (runtime.motionStyle || '').trim().toLowerCase() === 'pendulum'
    ) {
      const amp = (18 * Math.PI) / 180;
      const t = now * 0.001;
      const yaw = Math.sin(t * (0.55 + runtime.motionSpeed * 0.9)) * amp;
      const dist = camera.position.distanceTo(controls.target);
      const base = new THREE.Vector3(dist, dist * 0.35, dist);
      const rot = new THREE.Matrix4().makeRotationY(yaw);
      camera.position.copy(controls.target).add(base.applyMatrix4(rot));
    }

    controls.update();

    // Cinematic micro-shake (temporary offset; no drift)
    if (runtime.cinematic) {
      const t = now * 0.001;
      const amp = reducedMotionPref
        ? 0
        : clamp(runtime.lastRadius * 0.00035, 0.00035, 0.01);
      const off = new THREE.Vector3(
        Math.sin(t * 1.7) * amp,
        Math.cos(t * 2.1) * amp * 0.6,
        Math.sin(t * 1.3 + 1.2) * amp
      );
      camera.position.add(off);
      if (composer && runtime.bloomStrength > 0.001) composer.render();
      else renderer.render(scene, camera);
      camera.position.sub(off);

      requestAnimationFrame(tick);
      return;
    }

    // Loading-time brightness boost
    {
      const loading = root.dataset.carShowroomLoading === '1';
      const target = loading ? 1 : 0;
      const k = 1 - Math.exp(-deltaS * 6);
      runtime.loadingBoostT =
        runtime.loadingBoostT + (target - runtime.loadingBoostT) * k;

      const t = clamp01(runtime.loadingBoostT);

      // Extra ambient during loading so even "toneMapping=none" looks brighter.
      loadingBoostLight.intensity = 1.25 * t;

      // Exposure lift during loading (clamped to avoid blowout).
      const base = clamp(Number(runtime.baseExposure) || 1.25, 0.1, 4);
      renderer.toneMappingExposure = clamp(base * (1 + 0.55 * t), 0.1, 3);

      // Slightly brighten background during loading, but keep the selected theme.
      if (scene.background instanceof THREE.Color) {
        tmpBgColor.copy(baseBgColor).lerp(loadingBgColor, 0.65 * t);
        scene.background = t > 0.001 ? tmpBgColor : baseBgColor;
      }
    }

    if (composer && runtime.bloomStrength > 0.001) composer.render();
    else renderer.render(scene, camera);

    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  let captureHistoryState: (() => Record<string, unknown>) | null = null;

  const pushHistoryAfterUiChange = (() => {
    const HISTORY_LIMIT = 60;
    const history: Array<{ key: string; state: Record<string, unknown> }> = [];
    let historyIndex = -1;
    let applying = false;
    let timer: number | null = null;

    const snapshot = () => {
      if (applying) return;
      const state = captureHistoryState?.();
      if (!state) return;
      // Blob/object URLs are not stable across sessions/undos.
      const model = String(state.model || '').trim();
      if (model.startsWith('blob:')) state.model = '';

      const key = JSON.stringify(state);
      if (historyIndex >= 0 && history[historyIndex]?.key === key) return;

      // Drop redo tail
      history.splice(historyIndex + 1);
      history.push({ key, state });
      if (history.length > HISTORY_LIMIT) history.shift();
      historyIndex = history.length - 1;
    };

    const schedule = (delayMs: number) => {
      if (applying) return;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        snapshot();
      }, delayMs);
    };

    const applyAt = async (idx: number) => {
      if (idx < 0 || idx >= history.length) return;
      const entry = history[idx];
      if (!entry) return;
      const prevIndex = historyIndex;
      applying = true;
      if (timer) {
        window.clearTimeout(timer);
        timer = null;
      }
      try {
        await applyPresetState(entry.state);
        historyIndex = idx;
        const msg = idx > prevIndex ? 'Redo.' : 'Undo.';
        setStatus(false, msg);
        window.setTimeout(() => setStatus(false, ''), 900);
      } finally {
        applying = false;
      }
    };

    const undo = () => {
      if (historyIndex <= 0) return;
      void applyAt(historyIndex - 1);
    };

    const redo = () => {
      if (historyIndex >= history.length - 1) return;
      void applyAt(historyIndex + 1);
    };

    const init = () => {
      snapshot();
    };

    const isApplying = () => applying;

    return { schedule, undo, redo, init, isApplying };
  })();

  // Debounced history snapshots for undo/redo.
  root.addEventListener(
    'input',
    e => {
      if (pushHistoryAfterUiChange.isApplying()) return;
      const el = e.target as Element | null;
      if (el?.closest?.('[data-sr-cmdk]')) return;
      pushHistoryAfterUiChange.schedule(220);
    },
    true
  );
  root.addEventListener(
    'change',
    e => {
      if (pushHistoryAfterUiChange.isApplying()) return;
      const el = e.target as Element | null;
      if (el?.closest?.('[data-sr-cmdk]')) return;
      pushHistoryAfterUiChange.schedule(60);
    },
    true
  );

  // Initial state from URL
  try {
    const url = new URL(window.location.href);
    const m = url.searchParams.get('model');
    const bg = url.searchParams.get('bg');
    const q = url.searchParams.get('q');
    const aq = url.searchParams.get('aq');
    const fps = url.searchParams.get('fps');
    const paint = url.searchParams.get('paint');
    const om = url.searchParams.get('om');
    const lp = url.searchParams.get('lp');
    const li = url.searchParams.get('li');
    const lw = url.searchParams.get('lw');
    const lr = url.searchParams.get('lr');
    const ei = url.searchParams.get('ei');
    const er = url.searchParams.get('er');
    const gridParam = url.searchParams.get('grid');
    const axesParam = url.searchParams.get('axes');
    const rtParam = url.searchParams.get('rt');
    const cmParam = url.searchParams.get('cm');
    const hzParam = url.searchParams.get('hz');
    const wf = url.searchParams.get('wf');
    const ms = url.searchParams.get('ms');
    const my = url.searchParams.get('my');
    const ml = url.searchParams.get('ml');
    const ex = url.searchParams.get('ex');
    const tm = url.searchParams.get('tm');
    const bl = url.searchParams.get('bl');
    const bt = url.searchParams.get('bt');
    const br = url.searchParams.get('br');

    const cine = url.searchParams.get('cine');
    const plt = url.searchParams.get('plt');
    const intParam = url.searchParams.get('int');
    const hsParam = url.searchParams.get('hs');

    const fr = url.searchParams.get('fr');
    const frs = url.searchParams.get('frs');

    const dm = url.searchParams.get('dm');
    const dt = url.searchParams.get('dt');
    const dc = url.searchParams.get('dc');
    const ds = url.searchParams.get('ds');
    const dr = url.searchParams.get('dr');
    const dop = url.searchParams.get('do');

    const fin = url.searchParams.get('fin');
    const coat = url.searchParams.get('coat');

    // Look (wrap/glass/parts)
    const we = url.searchParams.get('we');
    const wp = url.searchParams.get('wp');
    const wc = url.searchParams.get('wc');
    const wt = url.searchParams.get('wt');
    const ws = url.searchParams.get('ws');
    const wr = url.searchParams.get('wr');
    const wox = url.searchParams.get('wox');
    const woy = url.searchParams.get('woy');
    const gm = url.searchParams.get('gm');
    const gt = url.searchParams.get('gt');
    const wh = url.searchParams.get('wh');
    const tc = url.searchParams.get('tc');
    const cc = url.searchParams.get('cc');
    const lc = url.searchParams.get('lc');
    const lg = url.searchParams.get('lg');

    if (m) {
      if (modelUrl) modelUrl.value = m;
      if (modelSel) modelSel.value = m;
    }
    if (bg && bgSel) bgSel.value = bg;
    if (q && qualitySel) qualitySel.value = q;

    if (aq && autoQuality) autoQuality.checked = aq === '1';
    if (fps && targetFps) targetFps.value = fps;
    if (paint && paintInp)
      paintInp.value = paint.startsWith('#') ? paint : `#${paint}`;
    if (om && originalMatsChk) originalMatsChk.checked = om === '1';
    if (lp && lightPreset) lightPreset.value = lp;
    if (li && lightIntensity) lightIntensity.value = li;
    if (lw && lightWarmth) lightWarmth.value = lw;
    if (lr && lightRim) lightRim.value = lr;
    if (ei && envIntensity) envIntensity.value = ei;
    if (er && envRotation) envRotation.value = er;
    if (gridParam && gridChk) gridChk.checked = gridParam === '1';
    if (axesParam && axesChk) axesChk.checked = axesParam === '1';
    if (rtParam && thirdsChk) thirdsChk.checked = rtParam === '1';
    if (cmParam && centerChk) centerChk.checked = cmParam === '1';
    if (hzParam && horizonChk) horizonChk.checked = hzParam === '1';
    if (wf && wireframeChk) wireframeChk.checked = wf === '1';

    if (ms && modelScale) modelScale.value = ms;
    if (my && modelYaw) modelYaw.value = my;
    if (ml && modelLift) modelLift.value = ml;

    if (ex && exposure) exposure.value = ex;
    if (tm && tonemapSel) tonemapSel.value = tm;
    if (bl && bloom) bloom.value = bl;
    if (bt && bloomThreshold) bloomThreshold.value = bt;
    if (br && bloomRadius) bloomRadius.value = br;

    if (cine && cinematicChk) cinematicChk.checked = cine === '1';
    if (plt && plateTextInp) plateTextInp.value = plt;

    if (intParam && interiorChk) interiorChk.checked = intParam === '1';
    if (hsParam && hotspotsChk) hotspotsChk.checked = hsParam === '1';

    if (fr && floorReflectionsChk) floorReflectionsChk.checked = fr === '1';
    if (frs && floorReflectionStrength) floorReflectionStrength.value = frs;

    if (dm && decalModeChk) decalModeChk.checked = dm === '1';
    if (dt && decalTextInp) decalTextInp.value = dt;
    if (dc && decalColorInp)
      decalColorInp.value = dc.startsWith('#') ? dc : `#${dc}`;
    if (ds && decalSizeInp) decalSizeInp.value = ds;
    if (dr && decalRotInp) decalRotInp.value = dr;
    if (dop && decalOpacityInp) decalOpacityInp.value = dop;

    if (fin && finishSel) finishSel.value = fin;
    if (coat && clearcoatInp) clearcoatInp.value = coat;

    if (we && wrapEnabledChk) wrapEnabledChk.checked = we === '1';
    if (wp && wrapPatternSel) wrapPatternSel.value = wp;
    if (wc && wrapColorInp)
      wrapColorInp.value = wc.startsWith('#') ? wc : `#${wc}`;
    if (wt && wrapTintInp) wrapTintInp.value = wt;
    if (ws && wrapScaleInp) wrapScaleInp.value = ws;
    if (wr && wrapRotationInp) wrapRotationInp.value = wr;
    if (wox && wrapOffsetXInp) wrapOffsetXInp.value = wox;
    if (woy && wrapOffsetYInp) wrapOffsetYInp.value = woy;

    if (gm && glassModeChk) glassModeChk.checked = gm === '1';
    if (gt && glassTintInp) glassTintInp.value = gt;

    if (wh && wheelColorInp)
      wheelColorInp.value = wh.startsWith('#') ? wh : `#${wh}`;
    if (tc && trimColorInp)
      trimColorInp.value = tc.startsWith('#') ? tc : `#${tc}`;
    if (cc && caliperColorInp)
      caliperColorInp.value = cc.startsWith('#') ? cc : `#${cc}`;
    if (lc && lightColorInp)
      lightColorInp.value = lc.startsWith('#') ? lc : `#${lc}`;
    if (lg && lightGlowInp) lightGlowInp.value = lg;
  } catch {
    // ignore
  }

  setBackground(bgSel?.value || runtime.background);
  runtime.quality = (qualitySel?.value || runtime.quality).trim().toLowerCase();
  runtime.autoQuality = Boolean(autoQuality?.checked ?? runtime.autoQuality);
  runtime.targetFps =
    Number.parseFloat(targetFps?.value || `${runtime.targetFps}`) ||
    runtime.targetFps;
  runtime.originalMats = Boolean(
    originalMatsChk?.checked ?? runtime.originalMats
  );
  runtime.paintHex = parseHexColor(paintInp?.value || '') || runtime.paintHex;
  runtime.lightPreset = (lightPreset?.value || runtime.lightPreset)
    .trim()
    .toLowerCase();
  runtime.lightIntensity =
    Number.parseFloat(lightIntensity?.value || `${runtime.lightIntensity}`) ||
    runtime.lightIntensity;
  runtime.lightWarmth =
    Number.parseFloat(lightWarmth?.value || `${runtime.lightWarmth}`) ||
    runtime.lightWarmth;
  runtime.rimBoost =
    Number.parseFloat(lightRim?.value || `${runtime.rimBoost}`) ||
    runtime.rimBoost;
  runtime.envIntensity =
    Number.parseFloat(envIntensity?.value || `${runtime.envIntensity}`) ||
    runtime.envIntensity;
  runtime.envRotationDeg =
    Number.parseFloat(envRotation?.value || `${runtime.envRotationDeg}`) ||
    runtime.envRotationDeg;
  runtime.grid = Boolean(gridChk?.checked ?? runtime.grid);
  runtime.axes = Boolean(axesChk?.checked ?? runtime.axes);
  runtime.thirdsOverlay = Boolean(thirdsChk?.checked ?? runtime.thirdsOverlay);
  runtime.centerOverlay = Boolean(centerChk?.checked ?? runtime.centerOverlay);
  runtime.horizonOverlay = Boolean(
    horizonChk?.checked ?? runtime.horizonOverlay
  );
  runtime.haptics = Boolean(hapticsChk?.checked ?? runtime.haptics);

  applyThirdsOverlay();
  applyCenterOverlay();
  applyHorizonOverlay();

  runtime.floorReflections = Boolean(
    floorReflectionsChk?.checked ?? runtime.floorReflections
  );
  runtime.floorReflectionStrength =
    Number.parseFloat(
      floorReflectionStrength?.value || `${runtime.floorReflectionStrength}`
    ) || runtime.floorReflectionStrength;

  runtime.modelScaleMul = Number.parseFloat(modelScale?.value || '1') || 1;
  runtime.modelYawDeg = Number.parseFloat(modelYaw?.value || '0') || 0;
  runtime.modelLift = Number.parseFloat(modelLift?.value || '0') || 0;
  runtime.cinematic = Boolean(cinematicChk?.checked ?? runtime.cinematic);
  runtime.plateText = safeTrimText(
    plateTextInp?.value || runtime.plateText,
    10
  );
  runtime.interior = Boolean(interiorChk?.checked ?? runtime.interior);
  runtime.hotspots = Boolean(hotspotsChk?.checked ?? runtime.hotspots);

  runtime.decalMode = Boolean(decalModeChk?.checked ?? runtime.decalMode);
  runtime.decalText = safeTrimText(decalTextInp?.value || '', 18);
  runtime.decalColorHex =
    parseHexColor(decalColorInp?.value || '') || runtime.decalColorHex;
  runtime.decalSize = Number.parseFloat(decalSizeInp?.value || '0.35') || 0.35;
  runtime.decalRotDeg = Number.parseFloat(decalRotInp?.value || '0') || 0;
  runtime.decalOpacity =
    Number.parseFloat(decalOpacityInp?.value || '0.92') || 0.92;

  syncRuntimeLookFromUi();

  grid.visible = runtime.grid;
  axes.visible = runtime.axes;
  applyLighting();
  applyFloor();
  syncPaint();
  applyQuality();
  applyPost();

  // Initialize cinematic after URL hydration so the preset captures the prior values.
  setCinematic(runtime.cinematic);

  // Initialize interior after URL hydration.
  setInterior(runtime.interior);

  // Initialize decal texture after URL hydration.
  if (runtime.decalMode) syncDecalTextureFromRuntime();

  const initial = (
    modelUrl?.value ||
    modelSel?.value ||
    '/models/porsche-911-gt3rs.glb'
  ).trim();
  if (modelUrl && !modelUrl.value) modelUrl.value = initial;
  void loadModel(initial);

  // Collapsible sections + jump navigation
  const SECTION_COLLAPSE_KEY = 'sr3-section-collapse-v1';

  // Quick Controls (mobile overlay)
  const quick = root.querySelector<HTMLElement>('[data-sr-quick]');
  const quickToggle = root.querySelector<HTMLButtonElement>(
    '[data-sr-quick-toggle]'
  );
  const quickMenu = root.querySelector<HTMLElement>('[data-sr-quick-menu]');
  const quickPanelBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-quick-panel]'
  );
  const quickJumpBtns = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-sr-quick-jump]')
  );
  const quickBgSel =
    root.querySelector<HTMLSelectElement>('[data-sr-quick-bg]');
  const quickQualitySel = root.querySelector<HTMLSelectElement>(
    '[data-sr-quick-quality]'
  );
  const quickAutorotate = root.querySelector<HTMLInputElement>(
    '[data-sr-quick-autorotate]'
  );
  const quickFrameBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-quick-frame]'
  );
  const quickPhotoBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-quick-photo]'
  );
  const quickCinematicBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-quick-cinematic]'
  );
  const quickInteriorBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-quick-interior]'
  );
  const quickHotspotsBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-quick-hotspots]'
  );
  const quickDecalsBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-quick-decals]'
  );
  const quickThirdsBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-quick-thirds]'
  );
  const quickCenterBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-quick-center]'
  );
  const quickHorizonBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-quick-horizon]'
  );

  // Command palette (Search)
  const cmdk = root.querySelector<HTMLElement>('[data-sr-cmdk]');
  const cmdkBackdrop = root.querySelector<HTMLElement>(
    '[data-sr-cmdk-backdrop]'
  );
  const cmdkInput = root.querySelector<HTMLInputElement>(
    '[data-sr-cmdk-input]'
  );
  const cmdkList = root.querySelector<HTMLElement>('[data-sr-cmdk-list]');
  const cmdkCloseBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-cmdk-close]'
  );
  const cmdkOpenBtns = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-sr-cmdk-open]')
  );

  // Help / shortcuts
  const helpModal = root.querySelector<HTMLElement>('[data-sr-help]');
  const helpBackdrop = root.querySelector<HTMLElement>(
    '[data-sr-help-backdrop]'
  );
  const helpCloseBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-help-close]'
  );
  const helpOpenBtns = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-sr-help-open]')
  );

  const isTypingContext = () => {
    const ae = document.activeElement as HTMLElement | null;
    if (!ae) return false;
    const tag = (ae.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    return Boolean(ae.isContentEditable);
  };

  // Keyboard shortcuts
  window.addEventListener('keydown', e => {
    if (isTypingContext()) return;

    const mod = e.ctrlKey || e.metaKey;
    if (mod && !e.altKey) {
      const k = (e.key || '').toLowerCase();
      if (k === 'z') {
        e.preventDefault();
        if (e.shiftKey) pushHistoryAfterUiChange.redo();
        else pushHistoryAfterUiChange.undo();
        return;
      }
      if (k === 'y') {
        e.preventDefault();
        pushHistoryAfterUiChange.redo();
        return;
      }
    }

    if (e.key === 'c' || e.key === 'C') {
      const next = !runtime.cinematic;
      if (cinematicChk) cinematicChk.checked = next;
      setCinematic(next);
    } else if (e.key === 'Escape' && runtime.cinematic) {
      if (cinematicChk) cinematicChk.checked = false;
      setCinematic(false);
    }
  });

  type CmdkItem = {
    id: string;
    group: string;
    label: string;
    hint?: string;
    keywords?: string;
    run: () => void;
  };

  let cmdkOpen = false;
  let cmdkIndex = 0;
  let cmdkItems: CmdkItem[] = [];

  let helpOpen = false;
  let helpRestoreFocus: HTMLElement | null = null;

  function openHelp() {
    if (!helpModal) return;
    if (cmdkOpen) {
      cmdkOpen = false;
      if (cmdk) cmdk.hidden = true;
    }
    helpRestoreFocus = document.activeElement as HTMLElement | null;
    helpModal.hidden = false;
    helpOpen = true;
    window.setTimeout(() => {
      (helpCloseBtn || helpModal).focus?.();
    }, 0);
  }

  function closeHelp() {
    if (!helpModal) return;
    helpModal.hidden = true;
    helpOpen = false;
    const prev = helpRestoreFocus;
    helpRestoreFocus = null;
    prev?.focus?.();
  }

  for (const b of helpOpenBtns) b.addEventListener('click', openHelp);
  helpCloseBtn?.addEventListener('click', closeHelp);
  helpBackdrop?.addEventListener('click', closeHelp);

  const initRangeValueReadouts = () => {
    const ranges = Array.from(
      root.querySelectorAll<HTMLInputElement>('input[type="range"]')
    );

    const clampInt = (v: number, min: number, max: number) =>
      Math.max(min, Math.min(max, Math.trunc(v)));

    const format = (el: HTMLInputElement) => {
      const raw = String(el.value || '').trim();
      const v = Number.parseFloat(raw);
      if (!Number.isFinite(v)) return raw;

      const min = Number.parseFloat(String(el.min || ''));
      const max = Number.parseFloat(String(el.max || ''));
      const stepRaw = String(el.step || '')
        .trim()
        .toLowerCase();
      const step = Number.parseFloat(stepRaw);

      if (
        Number.isFinite(min) &&
        Number.isFinite(max) &&
        min === 0 &&
        max === 1
      ) {
        if (Number.isFinite(step) && step <= 0.05)
          return `${Math.round(v * 100)}%`;
      }

      let decimals = 2;
      if (stepRaw && stepRaw !== 'any') {
        const dot = stepRaw.indexOf('.');
        decimals = dot >= 0 ? stepRaw.length - dot - 1 : 0;
      }
      decimals = clampInt(decimals, 0, 3);
      return v.toFixed(decimals);
    };

    for (const el of ranges) {
      if (el.closest('[data-sr-cmdk]') || el.closest('[data-sr-help]'))
        continue;
      const field = el.closest('.sr-field') as HTMLElement | null;
      if (!field) continue;
      const label = field.querySelector<HTMLElement>('span');
      if (!label) continue;

      let out = label.querySelector<HTMLElement>('[data-sr-range-val]');
      if (!out) {
        out = document.createElement('span');
        out.className = 'sr__rangeVal';
        out.dataset.srRangeVal = '1';
        out.setAttribute('aria-hidden', 'true');
        label.appendChild(out);
      }

      const update = () => {
        if (!out) return;
        out.textContent = format(el);
      };

      el.addEventListener('input', update);
      el.addEventListener('change', update);
      update();
    }
  };

  initRangeValueReadouts();

  const CMDK_RECENTS_KEY = 'sr3-cmdk-recents-v1';

  const readCmdkRecents = (): string[] => {
    try {
      const raw = (localStorage.getItem(CMDK_RECENTS_KEY) || '').trim();
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map(x => String(x || '').trim())
        .filter(Boolean)
        .slice(0, 20);
    } catch {
      return [];
    }
  };

  const writeCmdkRecents = (ids: string[]) => {
    try {
      localStorage.setItem(CMDK_RECENTS_KEY, JSON.stringify(ids.slice(0, 20)));
    } catch {
      // ignore
    }
  };

  const markCmdkRecent = (id: string) => {
    const next = [
      id,
      ...readCmdkRecents()
        .filter(x => x !== id)
        .slice(0, 19),
    ];
    writeCmdkRecents(next);
  };

  const scoreSubsequence = (needle: string, hay: string) => {
    const n = needle.length;
    if (!n) return 0;
    let hi = 0;
    let matched = 0;
    for (let i = 0; i < n; i++) {
      const c = needle[i];
      const found = hay.indexOf(c, hi);
      if (found < 0) break;
      matched += 1;
      hi = found + 1;
    }
    return matched / n;
  };

  const scoreTokenIn = (token: string, hay: string) => {
    if (!token) return 0;
    if (!hay) return -Infinity;
    if (hay === token) return 120;
    if (hay.startsWith(token)) return 90;
    if (hay.includes(` ${token}`)) return 75;
    if (hay.includes(token)) return 55;

    const subseq = scoreSubsequence(token, hay);
    if (subseq >= 0.8) return 30;
    if (subseq >= 0.6) return 16;
    return -Infinity;
  };

  const getCmdkList = () => {
    const q = (cmdkInput?.value || '').trim().toLowerCase();
    const tokens = q ? q.split(/\s+/g).filter(Boolean) : [];

    const recents = readCmdkRecents();
    const recentRank = new Map<string, number>();
    for (let i = 0; i < recents.length; i++) recentRank.set(recents[i], i);

    const scored = cmdkItems
      .map(it => {
        const hay =
          `${it.group} ${it.label} ${it.keywords || ''} ${it.hint || ''}`
            .toLowerCase()
            .trim();

        let score = 0;
        if (!tokens.length) {
          score = 1;
        } else {
          for (const t of tokens) {
            const s = scoreTokenIn(t, hay);
            if (!Number.isFinite(s)) return null;
            score += s;
          }
        }

        const rr = recentRank.get(it.id);
        if (rr !== undefined) score += 200 - rr * 4;
        return { it, score };
      })
      .filter(Boolean) as Array<{ it: CmdkItem; score: number }>;

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.it.group !== b.it.group)
        return a.it.group.localeCompare(b.it.group);
      return a.it.label.localeCompare(b.it.label);
    });

    return scored.slice(0, 60).map(x => x.it);
  };

  const setCmdkOpen = (open: boolean) => {
    cmdkOpen = open;
    if (!cmdk) return;
    cmdk.hidden = !open;
    if (open) {
      cmdkIndex = 0;
      if (cmdkInput) {
        cmdkInput.value = '';
        cmdkInput.focus();
      }
      renderCmdk();
    }
  };

  const renderCmdk = () => {
    if (!cmdkList) return;
    const list = getCmdkList();
    if (cmdkIndex >= list.length) cmdkIndex = Math.max(0, list.length - 1);

    cmdkList.innerHTML = '';
    if (!list.length) {
      const empty = document.createElement('div');
      empty.className = 'sr-readout sr-readout--mini';
      empty.style.margin = '10px';
      empty.textContent =
        "No matches. Try: 'preset', 'grid', 'fps', 'wireframe'.";
      cmdkList.appendChild(empty);
      return;
    }

    let group = '';
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      if (it.group !== group) {
        group = it.group;
        const head = document.createElement('div');
        head.className = 'sr__cmdkGroup';
        head.textContent = group;
        cmdkList.appendChild(head);
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sr__cmdkItem';
      btn.setAttribute('aria-selected', i === cmdkIndex ? 'true' : 'false');
      btn.dataset.srCmdkIndex = String(i);
      btn.textContent = it.label;
      if (it.hint) {
        const hint = document.createElement('small');
        hint.textContent = it.hint;
        btn.appendChild(hint);
      }

      btn.addEventListener('click', () => {
        try {
          markCmdkRecent(it.id);
          it.run();
        } finally {
          setCmdkOpen(false);
        }
      });
      cmdkList.appendChild(btn);
    }

    const selected = cmdkList.querySelector<HTMLElement>(
      '.sr__cmdkItem[aria-selected="true"]'
    );
    selected?.scrollIntoView({ block: 'nearest' });
  };

  const jumpTo = (key: string) => {
    panelApi.setSnap(isMobile() ? 'half' : 'peek', true);
    const section = root.querySelector<HTMLElement>(
      `[data-sr-section="${CSS.escape(key)}"]`
    );
    if (!section) return;
    setSectionCollapsed(section, false, true);
    scrollPanelToSection(section);
  };

  const buildCmdkItems = () => {
    const onOff = (v: boolean) => (v ? 'On' : 'Off');
    const bg = (bgSel?.value || runtime.background || 'studio').trim();
    const q = (qualitySel?.value || runtime.quality || 'balanced').trim();
    const tmText = (
      tonemapSel?.selectedOptions?.[0]?.textContent ||
      tonemapSel?.value ||
      'ACES Filmic'
    )
      .toString()
      .trim();

    const togglePanel = () => {
      const s = panelApi.getSnap();
      panelApi.setSnap(
        s === 'collapsed' ? (isMobile() ? 'half' : 'peek') : 'collapsed',
        true
      );
    };

    const toggleCheckbox = (el: HTMLInputElement | null | undefined) => {
      if (!el) return;
      el.checked = !el.checked;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const setSelect = (el: HTMLSelectElement | null | undefined, v: string) => {
      if (!el) return;
      el.value = v;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const bumpSelect = (
      el: HTMLSelectElement | null | undefined,
      delta: number
    ) => {
      if (!el) return;
      const opts = Array.from(el.options).filter(o =>
        String(o.value || '').trim()
      );
      if (!opts.length) return;
      const idx = Math.max(
        0,
        opts.findIndex(o => o.value === el.value)
      );
      const next = opts[(idx + delta + opts.length) % opts.length];
      setSelect(el, next.value);
    };

    const toggleInput = (el: HTMLInputElement | null | undefined) => {
      if (!el) return;
      el.checked = !el.checked;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const setRange = (
      el: HTMLInputElement | null | undefined,
      v: number,
      trigger: 'input' | 'change' = 'input'
    ) => {
      if (!el) return;
      el.value = String(v);
      el.dispatchEvent(new Event(trigger, { bubbles: true }));
    };

    const setPhotoMode = (on: boolean) => {
      const next = Boolean(on);

      if (cinematicChk) cinematicChk.checked = next;
      setCinematic(next);

      const setOverlay = (el: HTMLInputElement | null | undefined) => {
        if (!el) return;
        el.checked = next;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setOverlay(thirdsChk);
      setOverlay(centerChk);
      setOverlay(horizonChk);

      // Photo mode should be still by default.
      if (next && autorotate) {
        autorotate.checked = false;
        autorotate.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };

    const readPresetsForCmdk = () => {
      try {
        const raw = (localStorage.getItem('sr3-presets-v1') || '').trim();
        if (!raw) return [] as Array<{ id: string; name: string }>;
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed))
          return [] as Array<{ id: string; name: string }>;
        return parsed
          .filter(Boolean)
          .map(p => p as { v?: number; id?: string; name?: string })
          .filter(p => p && p.v === 1 && typeof p.id === 'string')
          .map(p => ({
            id: String(p.id || '').trim(),
            name: String(p.name || 'Preset').trim(),
          }))
          .filter(p => p.id)
          .slice(0, 20);
      } catch {
        return [] as Array<{ id: string; name: string }>;
      }
    };

    const readCameraViewsForCmdk = () => {
      try {
        const raw = (localStorage.getItem('sr3-camera-views-v1') || '').trim();
        if (!raw) return [] as Array<{ id: string; name: string }>;
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed))
          return [] as Array<{ id: string; name: string }>;
        return parsed
          .filter(Boolean)
          .map(v => v as { v?: number; id?: string; name?: string })
          .filter(v => v && v.v === 1 && typeof v.id === 'string')
          .map(v => ({
            id: String(v.id || '').trim(),
            name: String(v.name || 'View').trim(),
          }))
          .filter(v => v.id)
          .slice(0, 30);
      } catch {
        return [] as Array<{ id: string; name: string }>;
      }
    };

    cmdkItems = [
      {
        id: 'help.shortcuts',
        group: 'Help',
        label: 'Help: Shortcuts',
        hint: '?',
        keywords: 'keyboard tips controls gestures',
        run: openHelp,
      },
      {
        id: 'tools.screenshot.1x',
        group: 'Tools',
        label: 'Screenshot: Download (1x)',
        hint: 'S',
        keywords: 'export image png',
        run: () => {
          if (screenshotScaleSel) screenshotScaleSel.value = '1';
          screenshotBtns[0]?.click();
        },
      },
      {
        id: 'tools.screenshot.2x',
        group: 'Tools',
        label: 'Screenshot: Download (2x)',
        keywords: 'export image png hi-res 4k',
        run: () => {
          if (screenshotScaleSel) screenshotScaleSel.value = '2';
          screenshotBtns[0]?.click();
        },
      },
      {
        id: 'tools.screenshot.4x',
        group: 'Tools',
        label: 'Screenshot: Download (4x)',
        keywords: 'export image png hi-res 8k',
        run: () => {
          if (screenshotScaleSel) screenshotScaleSel.value = '4';
          screenshotBtns[0]?.click();
        },
      },
      {
        id: 'history.undo',
        group: 'History',
        label: 'Undo',
        hint: 'Ctrl+Z',
        keywords: 'back revert',
        run: () => pushHistoryAfterUiChange.undo(),
      },
      {
        id: 'history.redo',
        group: 'History',
        label: 'Redo',
        hint: 'Ctrl+Y',
        keywords: 'forward repeat',
        run: () => pushHistoryAfterUiChange.redo(),
      },
      {
        id: 'panel.toggle',
        group: 'Navigation',
        label: 'Toggle Panel',
        hint: 'P',
        keywords: 'settings sheet',
        run: togglePanel,
      },
      {
        id: 'jump.presets',
        group: 'Navigation',
        label: 'Jump: Presets',
        keywords: 'preset save load export import',
        run: () => jumpTo('presets'),
      },
      {
        id: 'jump.model',
        group: 'Navigation',
        label: 'Jump: Model',
        keywords: 'load import url',
        run: () => jumpTo('model'),
      },
      {
        id: 'jump.environment',
        group: 'Navigation',
        label: 'Jump: Environment',
        keywords: 'background lighting hdr',
        run: () => jumpTo('environment'),
      },
      {
        id: 'jump.inspector',
        group: 'Navigation',
        label: 'Jump: Inspector',
        keywords: 'mesh pick isolate wireframe',
        run: () => jumpTo('inspector'),
      },
      {
        id: 'jump.camera',
        group: 'Navigation',
        label: 'Jump: Camera',
        keywords: 'frame reset fov',
        run: () => jumpTo('camera'),
      },
      {
        id: 'jump.performance',
        group: 'Navigation',
        label: 'Jump: Performance',
        keywords: 'quality fps resolution',
        run: () => jumpTo('performance'),
      },
      {
        id: 'jump.tools',
        group: 'Navigation',
        label: 'Jump: Tools',
        keywords: 'reground screenshot share',
        run: () => jumpTo('tools'),
      },
      {
        id: 'bg.toggleVoid',
        group: 'Environment',
        label: `Background: ${bg}`,
        hint: 'B',
        keywords: 'studio day sunset night grid void',
        run: () => {
          const next = bg === 'void' ? 'studio' : 'void';
          setSelect(bgSel, next);
        },
      },
      {
        id: 'quality.cycle',
        group: 'Performance',
        label: `Quality: ${q}`,
        hint: 'Q',
        keywords: 'eco balanced ultra',
        run: () => {
          const order = ['eco', 'balanced', 'ultra'];
          const idx = Math.max(0, order.indexOf(q));
          const next = order[(idx + 1) % order.length];
          setSelect(qualitySel, next);
        },
      },
      {
        id: 'toggle.autorotate',
        group: 'Camera',
        label: `Auto-rotate: ${onOff(Boolean(autorotate?.checked))}`,
        hint: 'A',
        keywords: 'motion turntable',
        run: () => toggleCheckbox(autorotate),
      },
      {
        id: 'look.wrap',
        group: 'Look',
        label: `Wrap mode: ${onOff(Boolean(wrapEnabledChk?.checked))}`,
        keywords: 'wrap vinyl paint pattern',
        run: () => toggleCheckbox(wrapEnabledChk),
      },
      {
        id: 'look.finish.cycle',
        group: 'Look',
        label: `Finish: ${(finishSel?.value || 'gloss').trim()}`,
        keywords: 'gloss satin matte clearcoat',
        run: () => {
          const order = ['gloss', 'satin', 'matte'];
          const cur = (finishSel?.value || 'gloss').trim().toLowerCase();
          const idx = Math.max(0, order.indexOf(cur));
          const next = order[(idx + 1) % order.length];
          setSelect(finishSel, next);
        },
      },
      {
        id: 'look.clearcoat.toggle',
        group: 'Look',
        label: `Clearcoat: ${Number.parseFloat(clearcoatInp?.value || '0.8').toFixed(2)}`,
        keywords: 'clear coat',
        run: () => {
          const cur = Number.parseFloat(clearcoatInp?.value || '0.8') || 0.8;
          const next = cur > 0.1 ? 0 : 0.8;
          setRange(clearcoatInp, next, 'input');
        },
      },
      {
        id: 'look.wrap.pattern',
        group: 'Look',
        label: `Wrap pattern: ${(wrapPatternSel?.value || 'solid').trim()}`,
        keywords: 'stripes carbon camo checker hex race',
        run: () => bumpSelect(wrapPatternSel, 1),
      },
      {
        id: 'look.glass',
        group: 'Look',
        label: `Glass mode: ${onOff(Boolean(glassModeChk?.checked))}`,
        keywords: 'window tint transmission',
        run: () => toggleCheckbox(glassModeChk),
      },
      {
        id: 'look.reset',
        group: 'Look',
        label: 'Look: Reset',
        keywords: 'paint wrap finish clearcoat glass parts',
        run: () => resetLookBtn?.click(),
      },
      {
        id: 'toggle.grid',
        group: 'Environment',
        label: `Grid: ${onOff(Boolean(gridChk?.checked))}`,
        keywords: 'helper',
        run: () => toggleCheckbox(gridChk),
      },
      {
        id: 'toggle.axes',
        group: 'Environment',
        label: `Axes: ${onOff(Boolean(axesChk?.checked))}`,
        keywords: 'helper',
        run: () => toggleCheckbox(axesChk),
      },
      {
        id: 'toggle.shadows',
        group: 'Environment',
        label: `Shadows: ${onOff(Boolean(shadowsChk?.checked))}`,
        keywords: 'shadow catcher',
        run: () => toggleCheckbox(shadowsChk),
      },
      {
        id: 'env.reset',
        group: 'Environment',
        label: 'Environment: Reset',
        keywords: 'background lighting hdr environment',
        run: () => resetEnvBtn?.click(),
      },
      {
        id: 'tool.frame',
        group: 'Camera',
        label: 'Camera: Frame model',
        hint: 'F',
        keywords: 'fit',
        run: () => camFrame?.click(),
      },
      {
        id: 'tool.resetCamera',
        group: 'Camera',
        label: 'Camera: Reset',
        keywords: 'home',
        run: () => camReset?.click(),
      },
      {
        id: 'camera.panel.reset',
        group: 'Camera',
        label: 'Camera panel: Reset',
        keywords: 'interior hotspots overlays view',
        run: () => resetCameraBtn?.click(),
      },
      {
        id: 'photo.on',
        group: 'Photo',
        label: 'Photo mode: Enable',
        keywords: 'cinematic thirds center horizon composition',
        run: () => setPhotoMode(true),
      },
      {
        id: 'photo.off',
        group: 'Photo',
        label: 'Photo mode: Disable',
        keywords: 'cinematic thirds center horizon composition',
        run: () => setPhotoMode(false),
      },
      {
        id: 'photo.cinematic.toggle',
        group: 'Photo',
        label: `Cinematic: ${onOff(Boolean(cinematicChk?.checked))}`,
        keywords: 'letterbox bars',
        run: () => toggleCheckbox(cinematicChk),
      },
      {
        id: 'photo.thirds.toggle',
        group: 'Photo',
        label: `Thirds grid: ${onOff(Boolean(thirdsChk?.checked))}`,
        keywords: 'rule of thirds grid overlay composition',
        run: () => toggleCheckbox(thirdsChk),
      },
      {
        id: 'photo.center.toggle',
        group: 'Photo',
        label: `Center marker: ${onOff(Boolean(centerChk?.checked))}`,
        keywords: 'center crosshair overlay composition',
        run: () => toggleCheckbox(centerChk),
      },
      {
        id: 'photo.horizon.toggle',
        group: 'Photo',
        label: `Horizon line: ${onOff(Boolean(horizonChk?.checked))}`,
        keywords: 'horizon level overlay composition',
        run: () => toggleCheckbox(horizonChk),
      },
      {
        id: 'camera.view.save',
        group: 'Camera',
        label: 'Camera view: Save bookmark',
        keywords: 'bookmark snapshot',
        run: () => camViewSaveBtn?.click(),
      },
      {
        id: 'camera.view.export',
        group: 'Camera',
        label: 'Camera views: Export JSON',
        keywords: 'share export',
        run: () => camViewExportBtn?.click(),
      },
      {
        id: 'camera.view.import',
        group: 'Camera',
        label: 'Camera views: Import JSON',
        keywords: 'paste import',
        run: () => camViewImportBtn?.click(),
      },
      {
        id: 'tool.reground',
        group: 'Tools',
        label: 'Tool: Re-ground',
        hint: 'R',
        keywords: 'normalize floor',
        run: () => regroundBtn?.click(),
      },
      {
        id: 'tool.screenshot',
        group: 'Tools',
        label: 'Tool: Screenshot',
        hint: 'S',
        keywords: 'png download',
        run: () => screenshotBtns[0]?.click(),
      },
      {
        id: 'tool.share',
        group: 'Tools',
        label: 'Tool: Copy link',
        keywords: 'share url',
        run: () => shareBtns[0]?.click(),
      },
      {
        id: 'perf.autoQuality',
        group: 'Performance',
        label: `Auto-quality: ${onOff(Boolean(autoQuality?.checked))}`,
        keywords: 'dynamic resolution fps',
        run: () => toggleInput(autoQuality),
      },
      {
        id: 'perf.reset',
        group: 'Performance',
        label: 'Performance: Reset',
        keywords: 'quality auto fps target',
        run: () => resetPerformanceBtn?.click(),
      },
      {
        id: 'post.tonemap.cycle',
        group: 'Post',
        label: `Tone mapping: ${tmText}`,
        keywords: 'aces reinhard cineon linear none',
        run: () => bumpSelect(tonemapSel, +1),
      },
      {
        id: 'post.reset',
        group: 'Post',
        label: 'Post: Reset',
        keywords: 'exposure tonemap bloom',
        run: () => resetPostBtn?.click(),
      },
      {
        id: 'post.exposure.reset',
        group: 'Post',
        label: 'Exposure: Reset',
        keywords: 'tonemap brightness',
        run: () => exposureResetBtn?.click(),
      },
      {
        id: 'motion.reset',
        group: 'Motion',
        label: 'Motion: Reset',
        keywords: 'autorotate style speed zoom',
        run: () => resetMotionBtn?.click(),
      },
      {
        id: 'perf.targetFps30',
        group: 'Performance',
        label: 'Target FPS: 30',
        keywords: 'auto quality',
        run: () => setRange(targetFps, 30, 'input'),
      },
      {
        id: 'perf.targetFps45',
        group: 'Performance',
        label: 'Target FPS: 45',
        keywords: 'auto quality',
        run: () => setRange(targetFps, 45, 'input'),
      },
      {
        id: 'perf.targetFps60',
        group: 'Performance',
        label: 'Target FPS: 60',
        keywords: 'auto quality',
        run: () => setRange(targetFps, 60, 'input'),
      },
      {
        id: 'insp.pick',
        group: 'Inspector',
        label: `Pick mode: ${onOff(Boolean(inspectorPick?.checked))}`,
        keywords: 'raycast select',
        run: () => toggleInput(inspectorPick),
      },
      {
        id: 'insp.isolate',
        group: 'Inspector',
        label: `Isolate: ${onOff(Boolean(inspectorIsolate?.checked))}`,
        keywords: 'hide others',
        run: () => toggleInput(inspectorIsolate),
      },
      {
        id: 'insp.highlight',
        group: 'Inspector',
        label: `Highlight: ${onOff(Boolean(inspectorHighlight?.checked))}`,
        keywords: 'outline hover',
        run: () => toggleInput(inspectorHighlight),
      },
      {
        id: 'insp.wireframe',
        group: 'Inspector',
        label: `Wireframe: ${onOff(Boolean(wireframeChk?.checked))}`,
        keywords: 'debug',
        run: () => toggleInput(wireframeChk),
      },
      {
        id: 'insp.clear',
        group: 'Inspector',
        label: 'Clear selection',
        keywords: 'reset highlight',
        run: () => inspectorClearBtn?.click(),
      },
      {
        id: 'insp.reset',
        group: 'Inspector',
        label: 'Reset inspector',
        keywords: 'show all',
        run: () => inspectorResetBtn?.click(),
      },
      {
        id: 'anim.play',
        group: 'Animation',
        label: `Animation: ${animPlayChk?.checked ? 'Pause' : 'Play'}`,
        keywords: 'mixer clip',
        run: () => toggleInput(animPlayChk),
      },
      {
        id: 'anim.restart',
        group: 'Animation',
        label: 'Animation: Restart',
        keywords: 'mixer clip',
        run: () => animRestartBtn?.click(),
      },
      {
        id: 'anim.nextClip',
        group: 'Animation',
        label: 'Animation: Next clip',
        keywords: 'mixer clip',
        run: () => bumpSelect(animClipSel, +1),
      },
    ];

    // Expand select-driven commands
    if (bgSel) {
      for (const opt of Array.from(bgSel.options)) {
        const v = String(opt.value || '').trim();
        const t = String(opt.textContent || v).trim();
        if (!v) continue;
        cmdkItems.push({
          id: `bg.set.${v}`,
          group: 'Environment',
          label: `Background: ${t}`,
          keywords: `${v} ${t}`,
          run: () => setSelect(bgSel, v),
        });
      }
    }

    if (qualitySel) {
      for (const opt of Array.from(qualitySel.options)) {
        const v = String(opt.value || '').trim();
        const t = String(opt.textContent || v).trim();
        if (!v) continue;
        cmdkItems.push({
          id: `quality.set.${v}`,
          group: 'Performance',
          label: `Quality: ${t}`,
          keywords: `${v} ${t}`,
          run: () => setSelect(qualitySel, v),
        });
      }
    }

    if (camPreset) {
      for (const opt of Array.from(camPreset.options)) {
        const v = String(opt.value || '').trim();
        const t = String(opt.textContent || v).trim();
        if (!v) continue;
        cmdkItems.push({
          id: `camera.preset.${v}`,
          group: 'Camera',
          label: `Camera preset: ${t}`,
          keywords: `${v} ${t} view`,
          run: () => setSelect(camPreset, v),
        });
      }
    }

    if (lightPreset) {
      for (const opt of Array.from(lightPreset.options)) {
        const v = String(opt.value || '').trim();
        const t = String(opt.textContent || v).trim();
        if (!v) continue;
        cmdkItems.push({
          id: `light.preset.${v}`,
          group: 'Environment',
          label: `Lighting: ${t}`,
          keywords: `${v} ${t}`,
          run: () => setSelect(lightPreset, v),
        });
      }
    }

    if (tonemapSel) {
      for (const opt of Array.from(tonemapSel.options)) {
        const v = String(opt.value || '').trim();
        const t = String(opt.textContent || v).trim();
        if (!v) continue;
        cmdkItems.push({
          id: `post.tonemap.${v}`,
          group: 'Post',
          label: `Tone mapping: ${t}`,
          keywords: `${v} ${t}`,
          run: () => setSelect(tonemapSel, v),
        });
      }
    }

    const presets = readPresetsForCmdk();
    for (const p of presets) {
      cmdkItems.push({
        id: `preset.load.${p.id}`,
        group: 'Presets',
        label: `Preset: ${p.name}`,
        keywords: `load apply ${p.name}`,
        run: () => {
          if (presetSelect) presetSelect.value = p.id;
          presetLoadBtn?.click();
        },
      });
    }

    const views = readCameraViewsForCmdk();
    for (const v of views) {
      cmdkItems.push({
        id: `camera.view.apply.${v.id}`,
        group: 'Camera',
        label: `Camera view: ${v.name}`,
        keywords: `bookmark view apply ${v.name}`,
        run: () => {
          if (camViewSelect) camViewSelect.value = v.id;
          camViewLoadBtn?.click();
        },
      });
    }

    cmdkItems.push(
      {
        id: 'preset.export',
        group: 'Presets',
        label: 'Presets: Export JSON',
        keywords: 'share export clipboard',
        run: () => presetExportBtn?.click(),
      },
      {
        id: 'preset.import',
        group: 'Presets',
        label: 'Presets: Import JSON',
        keywords: 'paste import',
        run: () => presetImportBtn?.click(),
      }
    );
  };

  const openCmdk = () => {
    buildCmdkItems();
    setCmdkOpen(true);
  };

  for (const btn of cmdkOpenBtns) {
    btn.addEventListener('click', () => {
      openCmdk();
      setQuickOpen(false);
    });
  }

  const closeCmdk = () => setCmdkOpen(false);
  cmdkCloseBtn?.addEventListener('click', closeCmdk);
  cmdkBackdrop?.addEventListener('click', closeCmdk);

  cmdkInput?.addEventListener('input', () => {
    cmdkIndex = 0;
    renderCmdk();
  });

  cmdkInput?.addEventListener('keydown', e => {
    if (!cmdkOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeCmdk();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const list = getCmdkList();
      if (!list.length) return;
      cmdkIndex = (cmdkIndex + 1) % list.length;
      renderCmdk();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const list = getCmdkList();
      if (!list.length) return;
      cmdkIndex = (cmdkIndex - 1 + list.length) % list.length;
      renderCmdk();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();

      const list = getCmdkList();
      const it = list[cmdkIndex] || list[0];
      if (!it) return;
      try {
        markCmdkRecent(it.id);
        it.run();
      } finally {
        closeCmdk();
      }
    }
  });

  // Global shortcuts
  window.addEventListener('keydown', e => {
    if (e.defaultPrevented) return;
    if (isTypingContext()) return;

    const key = (e.key || '').toLowerCase();
    const ctrlk = (e.ctrlKey || e.metaKey) && key === 'k';

    if (helpOpen && key === 'escape') {
      e.preventDefault();
      closeHelp();
      return;
    }

    if (key === '?') {
      e.preventDefault();
      openHelp();
      return;
    }

    if (ctrlk || key === '/') {
      e.preventDefault();
      openCmdk();
      return;
    }
    if (cmdkOpen && key === 'escape') {
      e.preventDefault();
      closeCmdk();
      return;
    }

    if (key === 'p') {
      e.preventDefault();
      const s = panelApi.getSnap();
      panelApi.setSnap(
        s === 'collapsed' ? (isMobile() ? 'half' : 'peek') : 'collapsed',
        true
      );
      return;
    }

    if (key === 'f') {
      e.preventDefault();
      camFrame?.click();
      return;
    }
    if (key === 'r') {
      e.preventDefault();
      regroundBtn?.click();
      return;
    }
    if (key === 's') {
      e.preventDefault();
      screenshotBtns[0]?.click();
      return;
    }
  });

  const setQuickOpen = (open: boolean) => {
    if (!quickMenu || !quickToggle) return;
    quickMenu.hidden = !open;
    quickToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  const setPressed = (
    btn: HTMLButtonElement | null | undefined,
    pressed: boolean
  ) => {
    if (!btn) return;
    btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  };

  const syncQuickFromUi = () => {
    if (quickBgSel && bgSel)
      quickBgSel.value = (bgSel.value || 'studio').trim();
    if (quickQualitySel && qualitySel)
      quickQualitySel.value = (qualitySel.value || 'balanced').trim();
    if (quickAutorotate && autorotate)
      quickAutorotate.checked = Boolean(autorotate.checked);

    setPressed(quickCinematicBtn, Boolean(cinematicChk?.checked ?? false));
    setPressed(quickInteriorBtn, Boolean(interiorChk?.checked ?? false));
    setPressed(quickHotspotsBtn, Boolean(hotspotsChk?.checked ?? false));
    setPressed(quickDecalsBtn, Boolean(decalModeChk?.checked ?? false));
    setPressed(quickThirdsBtn, Boolean(thirdsChk?.checked ?? false));
    setPressed(quickCenterBtn, Boolean(centerChk?.checked ?? false));
    setPressed(quickHorizonBtn, Boolean(horizonChk?.checked ?? false));

    const photoOn =
      Boolean(cinematicChk?.checked ?? false) &&
      Boolean(thirdsChk?.checked ?? false) &&
      Boolean(centerChk?.checked ?? false) &&
      Boolean(horizonChk?.checked ?? false);
    setPressed(quickPhotoBtn, photoOn);
  };

  quickFrameBtn?.addEventListener('click', () => {
    camFrame?.click();
    setQuickOpen(false);
  });

  quickPhotoBtn?.addEventListener('click', () => {
    const onNow =
      Boolean(cinematicChk?.checked ?? runtime.cinematic) &&
      Boolean(thirdsChk?.checked ?? runtime.thirdsOverlay) &&
      Boolean(centerChk?.checked ?? runtime.centerOverlay) &&
      Boolean(horizonChk?.checked ?? runtime.horizonOverlay);
    const next = !onNow;

    // Cinematic
    if (cinematicChk) cinematicChk.checked = next;
    setCinematic(next);

    // Overlays
    if (thirdsChk) {
      thirdsChk.checked = next;
      thirdsChk.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (centerChk) {
      centerChk.checked = next;
      centerChk.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (horizonChk) {
      horizonChk.checked = next;
      horizonChk.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Photo mode should be still by default.
    if (next && autorotate) {
      autorotate.checked = false;
      autorotate.dispatchEvent(new Event('change', { bubbles: true }));
    }

    syncQuickFromUi();
    setQuickOpen(false);
  });

  quickCinematicBtn?.addEventListener('click', () => {
    const next = !(cinematicChk?.checked ?? runtime.cinematic);
    if (cinematicChk) cinematicChk.checked = next;
    setCinematic(next);
    syncQuickFromUi();
    setQuickOpen(false);
  });

  quickInteriorBtn?.addEventListener('click', () => {
    const next = !(interiorChk?.checked ?? runtime.interior);
    if (interiorChk) interiorChk.checked = next;
    setInterior(next);
    syncQuickFromUi();
    setQuickOpen(false);
  });

  quickHotspotsBtn?.addEventListener('click', () => {
    const next = !(hotspotsChk?.checked ?? runtime.hotspots);
    if (hotspotsChk) {
      hotspotsChk.checked = next;
      hotspotsChk.dispatchEvent(new Event('change', { bubbles: true }));
    }
    syncQuickFromUi();
    setQuickOpen(false);
  });

  quickDecalsBtn?.addEventListener('click', () => {
    const next = !(decalModeChk?.checked ?? runtime.decalMode);
    if (decalModeChk) {
      decalModeChk.checked = next;
      decalModeChk.dispatchEvent(new Event('change', { bubbles: true }));
    }
    syncQuickFromUi();
    setQuickOpen(false);
  });

  quickThirdsBtn?.addEventListener('click', () => {
    const next = !(thirdsChk?.checked ?? runtime.thirdsOverlay);
    if (thirdsChk) {
      thirdsChk.checked = next;
      thirdsChk.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      runtime.thirdsOverlay = next;
      applyThirdsOverlay();
    }
    syncQuickFromUi();
    setQuickOpen(false);
  });

  quickCenterBtn?.addEventListener('click', () => {
    const next = !(centerChk?.checked ?? runtime.centerOverlay);
    if (centerChk) {
      centerChk.checked = next;
      centerChk.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      runtime.centerOverlay = next;
      applyCenterOverlay();
    }
    syncQuickFromUi();
    setQuickOpen(false);
  });

  quickHorizonBtn?.addEventListener('click', () => {
    const next = !(horizonChk?.checked ?? runtime.horizonOverlay);
    if (horizonChk) {
      horizonChk.checked = next;
      horizonChk.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      runtime.horizonOverlay = next;
      applyHorizonOverlay();
    }
    syncQuickFromUi();
    setQuickOpen(false);
  });

  quickToggle?.addEventListener('click', () => {
    const next = Boolean(quickMenu?.hidden ?? true);
    if (next) syncQuickFromUi();
    setQuickOpen(next);
  });

  const syncQuickIfOpen = () => {
    if (!quickMenu || quickMenu.hidden) return;
    syncQuickFromUi();
  };

  cinematicChk?.addEventListener('change', () => syncQuickIfOpen());
  interiorChk?.addEventListener('change', () => syncQuickIfOpen());
  hotspotsChk?.addEventListener('change', () => syncQuickIfOpen());
  decalModeChk?.addEventListener('change', () => syncQuickIfOpen());
  thirdsChk?.addEventListener('change', () => syncQuickIfOpen());
  centerChk?.addEventListener('change', () => syncQuickIfOpen());
  horizonChk?.addEventListener('change', () => syncQuickIfOpen());

  // Click outside closes the quick menu.
  window.addEventListener('pointerdown', e => {
    if (!quick || !quickMenu || quickMenu.hidden) return;
    const t = e.target as Node | null;
    if (!t) return;
    if (quick.contains(t)) return;
    setQuickOpen(false);
  });

  quickPanelBtn?.addEventListener('click', () => {
    const s = panelApi.getSnap();
    panelApi.setSnap(
      s === 'collapsed' ? (isMobile() ? 'half' : 'peek') : 'collapsed',
      true
    );
    setQuickOpen(false);
  });

  for (const btn of quickJumpBtns) {
    btn.addEventListener('click', () => {
      const key = String(btn.dataset.srQuickJump || '').trim();
      if (!key) return;
      jumpTo(key);
      setQuickOpen(false);
    });
  }

  quickBgSel?.addEventListener('change', () => {
    if (!bgSel) return;
    bgSel.value = quickBgSel.value;
    bgSel.dispatchEvent(new Event('change', { bubbles: true }));
  });

  quickQualitySel?.addEventListener('change', () => {
    if (!qualitySel) return;
    qualitySel.value = quickQualitySel.value;
    qualitySel.dispatchEvent(new Event('change', { bubbles: true }));
  });

  quickAutorotate?.addEventListener('change', () => {
    if (!autorotate) return;
    autorotate.checked = Boolean(quickAutorotate.checked);
    autorotate.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // Reduced motion: disable auto-rotate + animation playback and remove camera shake.
  onReducedMotionChange(prefersReduced => {
    reducedMotionPref = prefersReduced;
    root.dataset.srReducedMotion = prefersReduced ? '1' : '0';

    if (prefersReduced) {
      if (autorotate) {
        autorotate.checked = false;
        autorotate.disabled = true;
      }
      if (quickAutorotate) {
        quickAutorotate.checked = false;
        quickAutorotate.disabled = true;
      }
      runtime.autorotate = false;
      applyMotion();

      if (animPlayChk) {
        animPlayChk.checked = false;
        animPlayChk.disabled = true;
      }
    } else {
      if (autorotate) autorotate.disabled = false;
      if (quickAutorotate) quickAutorotate.disabled = false;
      if (animPlayChk) animPlayChk.disabled = false;
    }

    if (quickMenu && !quickMenu.hidden) syncQuickFromUi();
  });

  const setSectionCollapsed = (
    section: HTMLElement,
    collapsed: boolean,
    persist: boolean
  ) => {
    section.dataset.srCollapsed = collapsed ? '1' : '0';

    const toggleBtn = section.querySelector<HTMLButtonElement>(
      '[data-sr-section-toggle]'
    );
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      toggleBtn.textContent = collapsed ? 'Show' : 'Hide';
    }

    if (!persist) return;
    try {
      const collapsedKeys = sections
        .filter(s => s.dataset.srCollapsed === '1')
        .map(s => String(s.dataset.srSection || '').trim())
        .filter(Boolean);
      localStorage.setItem(SECTION_COLLAPSE_KEY, JSON.stringify(collapsedKeys));
    } catch {
      // ignore
    }
  };

  const initSectionCollapse = () => {
    let saved: string[] | null = null;
    try {
      const raw = (localStorage.getItem(SECTION_COLLAPSE_KEY) || '').trim();
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) saved = parsed.map(String);
      }
    } catch {
      // ignore
    }

    const defaultCollapsed = new Set<string>();
    if (isMobile()) {
      for (const k of [
        'look',
        'environment',
        'scene',
        'inspector',
        'animation',
        'floor',
        'motion',
        'post',
        'tools',
      ]) {
        defaultCollapsed.add(k);
      }
    }

    const savedSet = new Set((saved || []).map(s => s.trim()).filter(Boolean));
    const useSaved = Boolean(saved && saved.length);

    for (const section of sections) {
      const key = String(section.dataset.srSection || '').trim();
      const collapsed = useSaved
        ? savedSet.has(key)
        : defaultCollapsed.has(key);
      setSectionCollapsed(section, collapsed, false);
    }
  };

  for (const btn of sectionToggleBtns) {
    btn.addEventListener('click', () => {
      const section = btn.closest<HTMLElement>('[data-sr-section]');
      if (!section) return;
      const next = section.dataset.srCollapsed !== '1';
      setSectionCollapsed(section, next, true);
    });
  }

  const scrollPanelToSection = (section: HTMLElement) => {
    const body = panelBody;
    if (!body) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const bodyRect = body.getBoundingClientRect();
    const sectionRect = section.getBoundingClientRect();
    const y = sectionRect.top - bodyRect.top + body.scrollTop - 10;
    body.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  };

  for (const btn of jumpBtns) {
    btn.addEventListener('click', () => {
      const key = String(btn.dataset.srJump || '').trim();
      if (!key) return;

      // Ensure panel is open enough to see the content.
      panelApi.setSnap(isMobile() ? 'half' : 'peek', true);

      const section = root.querySelector<HTMLElement>(
        `[data-sr-section="${CSS.escape(key)}"]`
      );
      if (!section) return;

      setSectionCollapsed(section, false, true);
      scrollPanelToSection(section);
    });
  }

  for (const btn of quickJumpBtns) {
    btn.addEventListener('click', () => {
      const key = String(btn.dataset.srQuickJump || '').trim();
      if (!key) return;
      panelApi.setSnap(isMobile() ? 'half' : 'peek', true);
      const section = root.querySelector<HTMLElement>(
        `[data-sr-section="${CSS.escape(key)}"]`
      );
      if (!section) return;
      setSectionCollapsed(section, false, true);
      scrollPanelToSection(section);
      setQuickOpen(false);
    });
  }

  initSectionCollapse();

  // Camera views (save/load/shareable JSON)
  type CameraViewV1 = {
    v: 1;
    id: string;
    name: string;
    savedAt: number;
    pos: [number, number, number];
    target: [number, number, number];
    fov: number;
  };

  const CAMERA_VIEWS_KEY = 'sr3-camera-views-v1';

  const readCameraViews = (): CameraViewV1[] => {
    try {
      const raw = (localStorage.getItem(CAMERA_VIEWS_KEY) || '').trim();
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(Boolean)
        .map(v => v as Partial<CameraViewV1>)
        .filter(v => v.v === 1 && typeof v.id === 'string')
        .map(v => {
          const pos = Array.isArray(v.pos) ? v.pos : [0, 0, 0];
          const target = Array.isArray(v.target) ? v.target : [0, 0, 0];
          const safePos: [number, number, number] = [
            Number(pos[0]) || 0,
            Number(pos[1]) || 0,
            Number(pos[2]) || 0,
          ];
          const safeTarget: [number, number, number] = [
            Number(target[0]) || 0,
            Number(target[1]) || 0,
            Number(target[2]) || 0,
          ];
          const view: CameraViewV1 = {
            v: 1,
            id: String(v.id || '').trim(),
            name: String(v.name || 'View').trim() || 'View',
            savedAt: Number(v.savedAt) || 0,
            pos: safePos,
            target: safeTarget,
            fov: Number(v.fov) || 45,
          };
          return view;
        })
        .filter(v => v.id)
        .slice(0, 30);
    } catch {
      return [];
    }
  };

  const writeCameraViews = (list: CameraViewV1[]) => {
    try {
      localStorage.setItem(CAMERA_VIEWS_KEY, JSON.stringify(list.slice(0, 30)));
    } catch {
      // ignore
    }
  };

  const refreshCameraViewSelect = (selectedId?: string) => {
    if (!camViewSelect) return;
    const list = readCameraViews();
    camViewSelect.innerHTML = '';

    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = list.length ? 'Select a view…' : 'No saved views';
    camViewSelect.appendChild(empty);

    for (const v of list) {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = v.name;
      camViewSelect.appendChild(opt);
    }

    if (selectedId) camViewSelect.value = selectedId;
  };

  const syncCameraUiFromPose = () => {
    const v = camera.position.clone().sub(controls.target);
    const dist = Math.max(0.0001, v.length());
    const yawDeg = (Math.atan2(v.z, v.x) * 180) / Math.PI;
    const pitchDeg = (Math.asin(clamp(v.y / dist, -1, 1)) * 180) / Math.PI;

    if (camMode) camMode.value = 'manual';
    if (camYaw) camYaw.value = String(Math.round(yawDeg));
    if (camPitch) camPitch.value = String(Math.round(pitchDeg));
    if (camDist) camDist.value = String(Number(dist.toFixed(2)));
    if (camFov) camFov.value = String(Math.round(camera.fov));
  };

  const applyCameraView = (view: CameraViewV1) => {
    controls.target.set(view.target[0], view.target[1], view.target[2]);
    camera.position.set(view.pos[0], view.pos[1], view.pos[2]);
    camera.fov = clamp(Number(view.fov) || 45, 35, 85);
    camera.updateProjectionMatrix();
    controls.update();
    syncCameraUiFromPose();
  };

  const makeCameraView = (name: string): CameraViewV1 => {
    return {
      v: 1,
      id: `cv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim() || 'View',
      savedAt: Date.now(),
      pos: [camera.position.x, camera.position.y, camera.position.z],
      target: [controls.target.x, controls.target.y, controls.target.z],
      fov: camera.fov,
    };
  };

  refreshCameraViewSelect();

  camViewSaveBtn?.addEventListener('click', () => {
    hapticTap(10);
    const name = (window.prompt('View name', 'View') || '').trim();
    if (!name) return;
    const list = readCameraViews();
    const view = makeCameraView(name);
    writeCameraViews([view, ...list].slice(0, 30));
    refreshCameraViewSelect(view.id);
    setStatus(false, `Saved view: ${view.name}`);
    window.setTimeout(() => setStatus(false, ''), 1200);
  });

  camViewLoadBtn?.addEventListener('click', () => {
    const id = String(camViewSelect?.value || '').trim();
    if (!id) return;
    const view = readCameraViews().find(v => v.id === id);
    if (!view) return;
    hapticTap(10);
    applyCameraView(view);
    setStatus(false, `Applied view: ${view.name}`);
    window.setTimeout(() => setStatus(false, ''), 1200);
  });

  camViewDeleteBtn?.addEventListener('click', () => {
    const id = String(camViewSelect?.value || '').trim();
    if (!id) return;
    const list = readCameraViews();
    const victim = list.find(v => v.id === id);
    const next = list.filter(v => v.id !== id);
    writeCameraViews(next);
    refreshCameraViewSelect();
    hapticTap(10);
    setStatus(false, victim ? `Deleted view: ${victim.name}` : 'View deleted.');
    window.setTimeout(() => setStatus(false, ''), 1200);
  });

  camViewExportBtn?.addEventListener('click', () => {
    const list = readCameraViews();
    if (camViewIo) camViewIo.value = JSON.stringify(list, null, 2);
    hapticTap(10);
    setStatus(false, 'Camera views exported.');
    window.setTimeout(() => setStatus(false, ''), 1200);
  });

  camViewImportBtn?.addEventListener('click', () => {
    const raw = (camViewIo?.value || '').trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) throw new Error('Expected an array');
      const list = parsed
        .filter(Boolean)
        .map(v => v as Partial<CameraViewV1>)
        .filter(v => v.v === 1 && typeof v.id === 'string')
        .map(v => {
          const pos = Array.isArray(v.pos) ? v.pos : [0, 0, 0];
          const target = Array.isArray(v.target) ? v.target : [0, 0, 0];
          const view: CameraViewV1 = {
            v: 1,
            id: String(v.id || '').trim(),
            name: String(v.name || 'View').trim() || 'View',
            savedAt: Number(v.savedAt) || 0,
            pos: [
              Number(pos[0]) || 0,
              Number(pos[1]) || 0,
              Number(pos[2]) || 0,
            ],
            target: [
              Number(target[0]) || 0,
              Number(target[1]) || 0,
              Number(target[2]) || 0,
            ],
            fov: Number(v.fov) || 45,
          };
          return view;
        })
        .filter(v => v.id)
        .slice(0, 30);

      writeCameraViews(list);
      refreshCameraViewSelect(list[0]?.id);
      hapticTap(10);
      setStatus(false, 'Camera views imported.');
      window.setTimeout(() => setStatus(false, ''), 1200);
    } catch {
      setStatus(false, 'Camera views import failed.');
      window.setTimeout(() => setStatus(false, ''), 1200);
    }
  });

  // Presets (save/load/shareable JSON)
  type PresetV1 = {
    v: 1;
    id: string;
    name: string;
    savedAt: number;
    state: Record<string, unknown>;
  };

  const PRESET_KEY = 'sr3-presets-v1';

  const readPresets = (): PresetV1[] => {
    try {
      const raw = (localStorage.getItem(PRESET_KEY) || '').trim();
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(Boolean)
        .map(p => p as PresetV1)
        .filter(p => p && p.v === 1 && typeof p.id === 'string');
    } catch {
      return [];
    }
  };

  const writePresets = (list: PresetV1[]) => {
    try {
      localStorage.setItem(PRESET_KEY, JSON.stringify(list.slice(0, 50)));
    } catch {
      // ignore
    }
  };

  const refreshPresetSelect = (selectedId?: string) => {
    if (!presetSelect) return;
    const list = readPresets();
    presetSelect.innerHTML = '';

    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = list.length ? 'Select a preset…' : 'No presets yet';
    presetSelect.appendChild(empty);

    for (const p of list) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      presetSelect.appendChild(opt);
    }

    if (selectedId) presetSelect.value = selectedId;
  };

  const capturePresetState = (): Record<string, unknown> => {
    return {
      model: (modelUrl?.value || modelSel?.value || '').trim(),
      modelScale: modelScale?.value,
      modelYaw: modelYaw?.value,
      modelLift: modelLift?.value,
      bg: (bgSel?.value || '').trim(),
      paint: (paintInp?.value || '').trim(),
      originalMats: Boolean(originalMatsChk?.checked ?? false),

      finish: (finishSel?.value || '').trim(),
      clearcoat: clearcoatInp?.value,

      wrapEnabled: Boolean(wrapEnabledChk?.checked ?? false),
      wrapPattern: (wrapPatternSel?.value || '').trim(),
      wrapColor: (wrapColorInp?.value || '').trim(),
      wrapTint: wrapTintInp?.value,
      wrapScale: wrapScaleInp?.value,
      wrapRotation: wrapRotationInp?.value,
      wrapOffsetX: wrapOffsetXInp?.value,
      wrapOffsetY: wrapOffsetYInp?.value,
      glassMode: Boolean(glassModeChk?.checked ?? false),
      glassTint: glassTintInp?.value,
      wheelColor: (wheelColorInp?.value || '').trim(),
      trimColor: (trimColorInp?.value || '').trim(),
      caliperColor: (caliperColorInp?.value || '').trim(),
      lightColor: (lightColorInp?.value || '').trim(),
      lightGlow: lightGlowInp?.value,

      lightPreset: (lightPreset?.value || '').trim(),
      lightIntensity: lightIntensity?.value,
      lightWarmth: lightWarmth?.value,
      lightRim: lightRim?.value,
      envIntensity: envIntensity?.value,
      envRotation: envRotation?.value,
      grid: Boolean(gridChk?.checked ?? false),
      axes: Boolean(axesChk?.checked ?? false),
      haptics: Boolean(hapticsChk?.checked ?? true),
      floorColor: (floorColor?.value || '').trim(),
      floorOpacity: floorOpacity?.value,
      floorRoughness: floorRoughness?.value,
      floorMetalness: floorMetalness?.value,
      shadows: Boolean(shadowsChk?.checked ?? true),
      shadowStrength: shadowStrength?.value,
      shadowSize: shadowSize?.value,
      shadowHQ: Boolean(shadowHQ?.checked ?? false),
      cameraPreset: (camPreset?.value || '').trim(),
      cameraMode: (camMode?.value || '').trim(),
      cameraYaw: camYaw?.value,
      cameraPitch: camPitch?.value,
      cameraDistance: camDist?.value,
      cameraFov: camFov?.value,
      autorotate: Boolean(autorotate?.checked ?? false),
      motionStyle: (motionStyle?.value || '').trim(),
      motionSpeed: motionSpeed?.value,
      zoom: zoom?.value,
      quality: (qualitySel?.value || '').trim(),
      autoQuality: Boolean(autoQuality?.checked ?? true),
      targetFps: targetFps?.value,
      tonemap: tonemapSel?.value,
      exposure: exposure?.value,
      bloom: bloom?.value,
      bloomThreshold: bloomThreshold?.value,
      bloomRadius: bloomRadius?.value,

      cinematic: Boolean(cinematicChk?.checked ?? false),
      thirdsOverlay: Boolean(thirdsChk?.checked ?? false),
      centerOverlay: Boolean(centerChk?.checked ?? false),
      horizonOverlay: Boolean(horizonChk?.checked ?? false),
      plateText: safeTrimText(plateTextInp?.value || '', 10),
      interior: Boolean(interiorChk?.checked ?? false),
      hotspots: Boolean(hotspotsChk?.checked ?? true),
      floorReflections: Boolean(floorReflectionsChk?.checked ?? false),
      floorReflectionStrength: floorReflectionStrength?.value,
      decalMode: Boolean(decalModeChk?.checked ?? false),
      decalText: safeTrimText(decalTextInp?.value || '', 18),
      decalColor: (decalColorInp?.value || '').trim(),
      decalSize: decalSizeInp?.value,
      decalRotation: decalRotInp?.value,
      decalOpacity: decalOpacityInp?.value,

      wireframe: Boolean(wireframeChk?.checked ?? false),
      inspectorPick: Boolean(inspectorPick?.checked ?? true),
      inspectorIsolate: Boolean(inspectorIsolate?.checked ?? false),
      inspectorHighlight: Boolean(inspectorHighlight?.checked ?? true),
    };
  };

  // History snapshots piggy-back on the preset state (plus our extended fields).
  captureHistoryState = capturePresetState;
  pushHistoryAfterUiChange.init();

  const applyPresetState = async (state: Record<string, unknown>) => {
    const setVal = (
      el:
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement
        | null
        | undefined,
      v: unknown
    ) => {
      if (!el) return;
      el.value = v === undefined || v === null ? '' : String(v);
    };
    const setChk = (el: HTMLInputElement | null | undefined, v: unknown) => {
      if (!el) return;
      el.checked = Boolean(v);
    };

    const nextModel = String(state.model || '').trim();
    if (nextModel) {
      if (modelUrl) modelUrl.value = nextModel;
      if (modelSel) modelSel.value = nextModel;
      await loadModel(nextModel);
    }

    if (modelScale) modelScale.value = String(state.modelScale ?? '1');
    if (modelYaw) modelYaw.value = String(state.modelYaw ?? '0');
    if (modelLift) modelLift.value = String(state.modelLift ?? '0');
    runtime.modelScaleMul = Number.parseFloat(modelScale?.value || '1') || 1;
    runtime.modelYawDeg = Number.parseFloat(modelYaw?.value || '0') || 0;
    runtime.modelLift = Number.parseFloat(modelLift?.value || '0') || 0;
    applyModelTransform();

    setVal(bgSel, state.bg);
    setVal(paintInp, state.paint);
    setChk(originalMatsChk, state.originalMats);

    setVal(finishSel, state.finish);
    setVal(clearcoatInp, state.clearcoat);

    setChk(wrapEnabledChk, state.wrapEnabled);
    setVal(wrapPatternSel, state.wrapPattern);
    setVal(wrapColorInp, state.wrapColor);
    setVal(wrapTintInp, state.wrapTint);
    setVal(wrapScaleInp, state.wrapScale);
    setVal(wrapRotationInp, state.wrapRotation);
    setVal(wrapOffsetXInp, state.wrapOffsetX);
    setVal(wrapOffsetYInp, state.wrapOffsetY);
    setChk(glassModeChk, state.glassMode);
    setVal(glassTintInp, state.glassTint);
    setVal(wheelColorInp, state.wheelColor);
    setVal(trimColorInp, state.trimColor);
    setVal(caliperColorInp, state.caliperColor);
    setVal(lightColorInp, state.lightColor);
    setVal(lightGlowInp, state.lightGlow);

    setVal(lightPreset, state.lightPreset);
    setVal(lightIntensity, state.lightIntensity);
    setVal(lightWarmth, state.lightWarmth);
    setVal(lightRim, state.lightRim);
    setVal(envIntensity, state.envIntensity);
    setVal(envRotation, state.envRotation);

    setChk(gridChk, state.grid);
    setChk(axesChk, state.axes);
    setChk(hapticsChk, state.haptics);

    setVal(floorColor, state.floorColor);
    setVal(floorOpacity, state.floorOpacity);
    setVal(floorRoughness, state.floorRoughness);
    setVal(floorMetalness, state.floorMetalness);

    setChk(shadowsChk, state.shadows);
    setVal(shadowStrength, state.shadowStrength);
    setVal(shadowSize, state.shadowSize);
    setChk(shadowHQ, state.shadowHQ);

    setVal(camPreset, state.cameraPreset);
    setVal(camMode, state.cameraMode);
    setVal(camYaw, state.cameraYaw);
    setVal(camPitch, state.cameraPitch);
    setVal(camDist, state.cameraDistance);
    setVal(camFov, state.cameraFov);

    setChk(autorotate, state.autorotate);
    setVal(motionStyle, state.motionStyle);
    setVal(motionSpeed, state.motionSpeed);
    setVal(zoom, state.zoom);

    setVal(qualitySel, state.quality);
    setChk(autoQuality, state.autoQuality);
    setVal(targetFps, state.targetFps);

    setVal(tonemapSel, state.tonemap);
    setVal(exposure, state.exposure);
    setVal(bloom, state.bloom);
    setVal(bloomThreshold, state.bloomThreshold);
    setVal(bloomRadius, state.bloomRadius);

    setChk(cinematicChk, state.cinematic);
    setChk(thirdsChk, state.thirdsOverlay);
    setChk(centerChk, state.centerOverlay);
    setChk(horizonChk, state.horizonOverlay);
    setVal(plateTextInp, state.plateText);
    setChk(interiorChk, state.interior);
    setChk(hotspotsChk, state.hotspots);
    setChk(floorReflectionsChk, state.floorReflections);
    setVal(floorReflectionStrength, state.floorReflectionStrength);
    setChk(decalModeChk, state.decalMode);
    setVal(decalTextInp, state.decalText);
    setVal(decalColorInp, state.decalColor);
    setVal(decalSizeInp, state.decalSize);
    setVal(decalRotInp, state.decalRotation);
    setVal(decalOpacityInp, state.decalOpacity);

    setChk(wireframeChk, state.wireframe);
    setChk(inspectorPick, state.inspectorPick);
    setChk(inspectorIsolate, state.inspectorIsolate);
    setChk(inspectorHighlight, state.inspectorHighlight);

    // Apply everything
    setBackground(bgSel?.value || runtime.background);
    runtime.paintHex = parseHexColor(paintInp?.value || '') || runtime.paintHex;
    runtime.originalMats = Boolean(
      originalMatsChk?.checked ?? runtime.originalMats
    );
    syncPaint();
    applyLighting();

    runtime.grid = Boolean(gridChk?.checked ?? runtime.grid);
    runtime.axes = Boolean(axesChk?.checked ?? runtime.axes);
    runtime.haptics = Boolean(hapticsChk?.checked ?? runtime.haptics);
    grid.visible = runtime.grid;
    axes.visible = runtime.axes;

    runtime.floorHex =
      parseHexColor(floorColor?.value || '') || runtime.floorHex;
    runtime.floorOpacity =
      Number.parseFloat(floorOpacity?.value || `${runtime.floorOpacity}`) ||
      runtime.floorOpacity;
    runtime.floorRoughness =
      Number.parseFloat(floorRoughness?.value || `${runtime.floorRoughness}`) ||
      runtime.floorRoughness;
    runtime.floorMetalness =
      Number.parseFloat(floorMetalness?.value || `${runtime.floorMetalness}`) ||
      runtime.floorMetalness;
    applyFloor();

    runtime.shadows = Boolean(shadowsChk?.checked ?? runtime.shadows);
    runtime.shadowStrength =
      Number.parseFloat(shadowStrength?.value || `${runtime.shadowStrength}`) ||
      runtime.shadowStrength;
    runtime.shadowSize =
      Number.parseFloat(shadowSize?.value || `${runtime.shadowSize}`) ||
      runtime.shadowSize;
    runtime.shadowHQ = Boolean(shadowHQ?.checked ?? runtime.shadowHQ);
    applyShadows();

    applyCameraFromUi();

    runtime.autorotate = Boolean(autorotate?.checked ?? runtime.autorotate);
    runtime.motionStyle = (motionStyle?.value || runtime.motionStyle)
      .trim()
      .toLowerCase();
    runtime.motionSpeed =
      Number.parseFloat(motionSpeed?.value || `${runtime.motionSpeed}`) ||
      runtime.motionSpeed;
    runtime.zoomT =
      Number.parseFloat(zoom?.value || `${runtime.zoomT}`) || runtime.zoomT;
    applyMotion();
    applyZoom();

    runtime.quality = (qualitySel?.value || runtime.quality)
      .trim()
      .toLowerCase();
    runtime.autoQuality = Boolean(autoQuality?.checked ?? runtime.autoQuality);
    runtime.targetFps =
      Number.parseFloat(targetFps?.value || `${runtime.targetFps}`) ||
      runtime.targetFps;
    runtime.dynamicScale = 1;
    applyQuality();

    applyPost();
    applyWireframe();
    applyIsolate();

    runtime.thirdsOverlay = Boolean(
      thirdsChk?.checked ?? runtime.thirdsOverlay
    );
    runtime.centerOverlay = Boolean(
      centerChk?.checked ?? runtime.centerOverlay
    );
    runtime.horizonOverlay = Boolean(
      horizonChk?.checked ?? runtime.horizonOverlay
    );
    applyThirdsOverlay();
    applyCenterOverlay();
    applyHorizonOverlay();

    runtime.cinematic = Boolean(cinematicChk?.checked ?? runtime.cinematic);
    setCinematic(runtime.cinematic);

    runtime.hotspots = Boolean(hotspotsChk?.checked ?? runtime.hotspots);
    if (!runtime.hotspots) clearHotspotGlow();

    runtime.interior = Boolean(interiorChk?.checked ?? runtime.interior);
    setInterior(runtime.interior);

    runtime.floorReflections = Boolean(
      floorReflectionsChk?.checked ?? runtime.floorReflections
    );
    runtime.floorReflectionStrength =
      Number.parseFloat(
        floorReflectionStrength?.value || `${runtime.floorReflectionStrength}`
      ) || runtime.floorReflectionStrength;
    applyFloorReflections();

    runtime.decalMode = Boolean(decalModeChk?.checked ?? runtime.decalMode);
    runtime.decalText = safeTrimText(decalTextInp?.value || '', 18);
    runtime.decalColorHex =
      parseHexColor(decalColorInp?.value || '') || runtime.decalColorHex;
    runtime.decalSize =
      Number.parseFloat(decalSizeInp?.value || `${runtime.decalSize}`) ||
      runtime.decalSize;
    runtime.decalRotDeg =
      Number.parseFloat(decalRotInp?.value || `${runtime.decalRotDeg}`) ||
      runtime.decalRotDeg;
    runtime.decalOpacity =
      Number.parseFloat(decalOpacityInp?.value || `${runtime.decalOpacity}`) ||
      runtime.decalOpacity;
    if (runtime.decalMode) syncDecalTextureFromRuntime();
  };

  presetSaveBtn?.addEventListener('click', () => {
    const name = (presetNameInp?.value || '').trim() || 'Preset';
    const list = readPresets();
    const id = `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const preset: PresetV1 = {
      v: 1,
      id,
      name,
      savedAt: Date.now(),
      state: capturePresetState(),
    };
    list.unshift(preset);
    writePresets(list);
    refreshPresetSelect(id);
    setStatus(false, 'Preset saved.');
    window.setTimeout(() => setStatus(false, ''), 1200);
  });

  presetLoadBtn?.addEventListener('click', () => {
    const id = (presetSelect?.value || '').trim();
    if (!id) return;
    const list = readPresets();
    const p = list.find(x => x.id === id);
    if (!p) return;
    panelApi.setSnap(isMobile() ? 'half' : 'peek', true);
    void applyPresetState(p.state as Record<string, unknown>);
    setStatus(false, 'Preset loaded.');
    window.setTimeout(() => setStatus(false, ''), 1200);
  });

  presetDeleteBtn?.addEventListener('click', () => {
    const id = (presetSelect?.value || '').trim();
    if (!id) return;
    const next = readPresets().filter(p => p.id !== id);
    writePresets(next);
    refreshPresetSelect('');
    setStatus(false, 'Preset deleted.');
    window.setTimeout(() => setStatus(false, ''), 1200);
  });

  presetExportBtn?.addEventListener('click', () => {
    const id = (presetSelect?.value || '').trim();
    const list = readPresets();
    const p = id ? list.find(x => x.id === id) : null;
    const payload: PresetV1 =
      p ||
      ({
        v: 1,
        id: 'export',
        name: (presetNameInp?.value || '').trim() || 'Export',
        savedAt: Date.now(),
        state: capturePresetState(),
      } as PresetV1);
    if (presetIo) presetIo.value = JSON.stringify(payload, null, 2);
    setStatus(false, 'Export ready.');
    window.setTimeout(() => setStatus(false, ''), 1200);
  });

  presetImportBtn?.addEventListener('click', () => {
    const raw = (presetIo?.value || '').trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as unknown;
      const list = readPresets();

      const importOne = (p: PresetV1) => {
        const id = `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        list.unshift({
          v: 1,
          id,
          name: String(p.name || 'Imported'),
          savedAt: Date.now(),
          state: (p.state || {}) as Record<string, unknown>,
        });
        return id;
      };

      let selected: string | undefined;
      if (Array.isArray(parsed)) {
        for (const item of parsed.slice(0, 10)) {
          if (!item) continue;
          const p = item as PresetV1;
          if (p && p.v === 1 && p.state) selected = importOne(p);
        }
      } else {
        const p = parsed as PresetV1;
        if (p && p.v === 1 && p.state) selected = importOne(p);
      }

      writePresets(list);
      refreshPresetSelect(selected);
      setStatus(false, 'Imported.');
      window.setTimeout(() => setStatus(false, ''), 1200);
    } catch {
      setStatus(false, 'Import failed.');
      window.setTimeout(() => setStatus(false, ''), 1200);
    }
  });

  refreshPresetSelect();

  // Inspector bindings
  inspectorFilter?.addEventListener('input', () => populateMeshSelect());
  inspectorMeshSel?.addEventListener('change', () => {
    const id = (inspectorMeshSel.value || '').trim();
    const mesh = inspectorMeshes.find(m => m.uuid === id) || null;
    if (mesh) hapticTap(8);
    setSelectedMesh(mesh);
    applyIsolate();
  });
  inspectorHighlight?.addEventListener('change', () => {
    // Re-apply highlight state
    setSelectedMesh(selectedMesh, { force: true });
  });
  inspectorIsolate?.addEventListener('change', () => {
    applyIsolate();
  });
  wireframeChk?.addEventListener('change', () => {
    applyWireframe();
  });
  inspectorClearBtn?.addEventListener('click', () => {
    hapticTap(8);
    setSelectedMesh(null);
    applyIsolate();
    if (inspectorMeshSel) inspectorMeshSel.value = '';
  });
  inspectorResetBtn?.addEventListener('click', () => {
    hapticTap(8);
    if (inspectorFilter) inspectorFilter.value = '';
    if (wireframeChk) wireframeChk.checked = false;
    if (inspectorIsolate) inspectorIsolate.checked = false;
    applyWireframe();
    applyIsolate();
    populateMeshSelect();
  });

  // Hotspots: click-to-focus helpers
  type HotspotKind = 'wheels' | 'lights' | 'glass' | 'body' | 'other';

  const hotspotMatsBaseline = new WeakMap<
    THREE.Material,
    { emissive: THREE.Color; emissiveIntensity: number }
  >();
  let hotspotBoostedMats: Array<
    THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial
  > = [];

  clearHotspotGlow = () => {
    for (const mat of hotspotBoostedMats) {
      const snap = hotspotMatsBaseline.get(mat);
      if (!snap) continue;
      mat.emissive.copy(snap.emissive);
      mat.emissiveIntensity = snap.emissiveIntensity;
      mat.needsUpdate = true;
    }
    hotspotBoostedMats = [];
  };

  const getHotspotKind = (mesh: THREE.Mesh): HotspotKind => {
    const parts: string[] = [];
    let n: THREE.Object3D | null = mesh;
    for (let i = 0; i < 4 && n; i += 1) {
      parts.push(normalizeName(String(n.name || '')));
      n = n.parent;
    }
    const name = parts.join(' ');
    if (/(wheel|rim|tire|tyre|caliper|brake)/.test(name)) return 'wheels';
    if (/(light|lamp|headlamp|taillight|tail_light|brakelight)/.test(name))
      return 'lights';
    if (/(glass|window|windshield|windscreen)/.test(name)) return 'glass';
    if (/(body|paint|shell|hood|bonnet|door|bumper|fender)/.test(name))
      return 'body';
    return 'other';
  };

  const focusOnPoint = (target: THREE.Vector3, dist: number) => {
    const dir = camera.position.clone().sub(controls.target);
    if (dir.lengthSq() < 1e-6) dir.set(1, 0.2, 1);
    dir.normalize();
    controls.target.copy(target);
    camera.position.copy(target).add(dir.multiplyScalar(dist));
    controls.update();
  };

  const focusOnMesh = (mesh: THREE.Mesh) => {
    const kind = getHotspotKind(mesh);
    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const localRadius = Math.max(0.01, Math.max(size.x, size.y, size.z) * 0.5);
    const baseR = clamp(Number(runtime.lastRadius) || 2.5, 0.25, 50);

    const distMul =
      kind === 'wheels'
        ? 0.55
        : kind === 'lights'
          ? 0.45
          : kind === 'glass'
            ? 0.65
            : kind === 'body'
              ? 0.8
              : 0.75;

    const dist = clamp(Math.max(baseR * distMul, localRadius * 2.2), 0.25, 30);

    clearHotspotGlow();

    if (kind === 'lights') {
      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const mat of mats) {
        if (!mat) continue;
        if (
          !(mat instanceof THREE.MeshStandardMaterial) &&
          !(mat instanceof THREE.MeshPhysicalMaterial)
        ) {
          continue;
        }

        if (!hotspotMatsBaseline.has(mat)) {
          hotspotMatsBaseline.set(mat, {
            emissive: mat.emissive.clone(),
            emissiveIntensity: mat.emissiveIntensity,
          });
        }

        mat.emissive.set(0xffffff);
        mat.emissiveIntensity = clamp(
          Math.max(
            mat.emissiveIntensity,
            (Number(runtime.lightGlow) || 1.25) * 2.1
          ),
          0,
          8
        );
        mat.needsUpdate = true;
        hotspotBoostedMats.push(mat);
      }
    }

    focusOnPoint(center, dist);
  };

  // Decals: place a projected sticker on click when decal mode is enabled.
  const decalTmpObj = new THREE.Object3D();
  const decalTmpV = new THREE.Vector3();
  const decalTmpN = new THREE.Vector3();
  const decalTmpInv = new THREE.Matrix4();
  const decalTmpMeshM = new THREE.Matrix4();
  const decalTmpSize = new THREE.Vector3();

  const isDecalObject = (obj: THREE.Object3D | null | undefined) => {
    if (!obj) return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Boolean((obj as any).userData?.srDecal);
  };

  const placeDecalOnHit = (hit: THREE.Intersection) => {
    if (!loadState.gltf) return;
    const base = hit.object as THREE.Mesh;
    if (!base || !(base as THREE.Mesh).isMesh) return;

    syncDecalStateFromUi();
    if (!decalTexture) syncDecalTextureFromRuntime();
    if (!decalTexture) return;

    // Keep matrices current.
    loadState.gltf.updateMatrixWorld(true);
    base.updateMatrixWorld(true);

    decalTmpInv.copy(loadState.gltf.matrixWorld).invert();

    // Hit point in gltf-local space.
    const pLocal = hit.point.clone().applyMatrix4(decalTmpInv);

    // Face normal (world -> gltf-local).
    if (hit.face?.normal) {
      decalTmpN.copy(hit.face.normal).transformDirection(base.matrixWorld);
    } else {
      decalTmpN.set(0, 1, 0);
    }
    decalTmpN.transformDirection(decalTmpInv).normalize();

    // Projector orientation in gltf-local space.
    decalTmpObj.position.copy(pLocal);
    decalTmpObj.lookAt(decalTmpV.copy(pLocal).add(decalTmpN));
    decalTmpObj.rotateZ(
      (clamp(runtime.decalRotDeg, -180, 180) * Math.PI) / 180
    );

    const r = clamp(Number(runtime.lastRadius) || 2.5, 0.25, 50);
    const s = clamp(clamp(runtime.decalSize, 0.02, 2.0) * r, 0.05, 4);
    decalTmpSize.set(s, s, s);

    // DecalGeometry expects a mesh whose matrixWorld maps local -> decal space.
    // We want decal vertices in gltf-local space (so decals follow model transforms).
    decalTmpMeshM.multiplyMatrices(decalTmpInv, base.matrixWorld);
    const projectorMesh = new THREE.Mesh(
      base.geometry as THREE.BufferGeometry
    ) as unknown as THREE.Mesh;
    projectorMesh.matrixWorld.copy(decalTmpMeshM);

    const geo = new DecalGeometry(
      projectorMesh as unknown as THREE.Mesh,
      pLocal,
      decalTmpObj.rotation,
      decalTmpSize
    );

    const mat = new THREE.MeshBasicMaterial({
      map: decalTexture,
      transparent: true,
      opacity: clamp(runtime.decalOpacity, 0.05, 1),
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
    });

    const decalMesh = new THREE.Mesh(geo, mat);
    decalMesh.userData = {
      ...decalMesh.userData,
      srDecal: true,
    };
    decalMesh.renderOrder = 5;
    loadState.gltf.add(decalMesh);
    decals.push({ mesh: decalMesh, geometry: geo, material: mat });

    // Cap to avoid runaway memory.
    const cap = 40;
    if (decals.length > cap) {
      const drop = decals.splice(0, decals.length - cap);
      for (const d of drop) {
        try {
          d.mesh.parent?.remove(d.mesh);
        } catch {
          // ignore
        }
        try {
          d.geometry.dispose?.();
        } catch {
          // ignore
        }
        try {
          d.material.dispose?.();
        } catch {
          // ignore
        }
      }
    }
  };

  // Pick on click
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downX = 0;
  let downY = 0;
  let downT = 0;

  canvas.addEventListener(
    'pointerdown',
    e => {
      downX = e.clientX;
      downY = e.clientY;
      downT = performance.now();
    },
    { passive: true }
  );

  canvas.addEventListener(
    'pointerup',
    e => {
      if (!loadState.gltf) return;

      const pickEnabled = Boolean(inspectorPick?.checked ?? true);
      const hotspotsEnabled = Boolean(hotspotsChk?.checked ?? runtime.hotspots);

      const dx = e.clientX - downX;
      const dy = e.clientY - downY;
      const moved = Math.hypot(dx, dy);
      if (moved > 7) return;

      const age = performance.now() - downT;
      if (age > 700) return;

      const rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const hits = raycaster.intersectObject(loadState.gltf, true);
      const hit = hits.find(h => !isDecalObject(h.object)) || null;
      const first = hit?.object;
      const mesh =
        first && (first as THREE.Mesh).isMesh ? (first as THREE.Mesh) : null;
      if (!mesh) return;

      const decalModeEnabled = Boolean(
        decalModeChk?.checked ?? runtime.decalMode
      );
      if (decalModeEnabled && hit) {
        hapticTap(8);
        placeDecalOnHit(hit);
        return;
      }

      if (pickEnabled && !e.shiftKey) {
        hapticTap(8);
        setSelectedMesh(mesh);
        if (inspectorMeshSel) inspectorMeshSel.value = mesh.uuid;
        applyIsolate();
        return;
      }

      if (hotspotsEnabled) {
        hapticTap(8);
        focusOnMesh(mesh);
      }
    },
    { passive: true }
  );

  // Animation bindings
  animClipSel?.addEventListener('change', () => {
    hapticTap(8);
    playClipByName(animClipSel.value);
  });
  animRestartBtn?.addEventListener('click', () => {
    hapticTap(8);
    if (activeAction) {
      activeAction.reset();
      activeAction.play();
    }
  });
  animPlayChk?.addEventListener('change', () => {
    hapticTap(6);
  });
  animSpeed?.addEventListener('input', () => {
    // timeScale read in tick
  });

  for (const btn of animActionBtns) {
    btn.addEventListener('click', () => {
      const kind = (btn.getAttribute('data-sr-anim-action') || '').trim();
      if (!kind || !mixer) return;

      if (animPlayChk) animPlayChk.checked = true;

      const map: Record<string, string[]> = {
        doors: ['door', 'doors'],
        hood: ['hood', 'bonnet'],
        trunk: ['trunk', 'boot'],
        spoiler: ['spoiler', 'wing'],
      };

      const clip = findClipNameByKeywords(map[kind] || [kind]);
      if (!clip) {
        setStatus(false, 'No matching animation clip found.');
        window.setTimeout(() => setStatus(false, ''), 1200);
        return;
      }

      hapticTap(10);
      playClipToggle(clip);
    });
  }

  html.dataset.carShowroomBoot = '1';
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
