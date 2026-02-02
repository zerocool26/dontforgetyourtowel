import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { withBasePath } from '../utils/helpers';

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

  if (!panel)
    return {
      setSnap: (_: PanelSnap) => {},
      getSnap: () => 'peek' as PanelSnap,
    };

  const key = 'sr3-panel-snap-v1';
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
    setSnap(saved ?? 'peek', false);
  };

  toggle?.addEventListener('click', () => {
    setSnap(snap === 'collapsed' ? 'peek' : 'collapsed', true);
  });
  close?.addEventListener('click', () => setSnap('collapsed', true));

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

  handle?.addEventListener('pointerdown', e => {
    if (!isMobile()) return;
    drag = true;
    startY = e.clientY;
    const heights = getHeights();
    const rect = panel.getBoundingClientRect();
    startH = rect.height || heights.peek;
    startT = performance.now();
    lastY = startY;
    lastT = startT;

    try {
      handle.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp, { once: true, passive: true });
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

  const paintInp = root.querySelector<HTMLInputElement>('[data-sr-paint]');
  const originalMatsChk = root.querySelector<HTMLInputElement>(
    '[data-sr-original-mats]'
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
  const camFrame = root.querySelector<HTMLButtonElement>(
    '[data-sr-camera-frame]'
  );
  const camReset = root.querySelector<HTMLButtonElement>(
    '[data-sr-camera-reset]'
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
  const bloom = root.querySelector<HTMLInputElement>('[data-sr-bloom]');
  const bloomThreshold = root.querySelector<HTMLInputElement>(
    '[data-sr-bloom-threshold]'
  );
  const bloomRadius = root.querySelector<HTMLInputElement>(
    '[data-sr-bloom-radius]'
  );

  const screenshotBtn = root.querySelector<HTMLButtonElement>(
    '[data-sr-screenshot]'
  );
  const shareBtn = root.querySelector<HTMLButtonElement>('[data-sr-share]');

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

  const setStatus = (loading: boolean, error: string) => {
    if (statusLoading) statusLoading.hidden = !loading;
    if (statusError) {
      statusError.hidden = !error;
      statusError.textContent = error;
    }
  };

  // Panel system (new)
  initPanel(root);

  // Renderer
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = Number.parseFloat(exposure?.value || '1') || 1;

  const deviceDpr = window.devicePixelRatio || 1;
  const basePixelRatio = Math.min(deviceDpr, isMobile() ? 1.5 : 2);
  let currentPixelRatio = basePixelRatio;
  renderer.setPixelRatio(currentPixelRatio);

  const scene = new THREE.Scene();

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
    color: 0x0f172a,
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

  const setSelectedMesh = (mesh: THREE.Mesh | null) => {
    if (selectedMesh === mesh) return;

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
    haptics: Boolean(hapticsChk?.checked ?? true),
    floorHex: parseHexColor(floorColor?.value || '') || '#0f172a',
    floorOpacity: Number.parseFloat(floorOpacity?.value || '1') || 1,
    floorRoughness: Number.parseFloat(floorRoughness?.value || '1') || 1,
    floorMetalness: Number.parseFloat(floorMetalness?.value || '0') || 0,
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
    dynamicScale: 1,
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
      studio: '#0b0f14',
      day: '#0b1220',
      sunset: '#160b12',
      night: '#05070c',
      grid: '#070a12',
    };
    scene.background = new THREE.Color(map[m] || map.studio);
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

  const applyFloor = () => {
    floorMat.color.set(runtime.floorHex);
    floorMat.roughness = clamp01(runtime.floorRoughness);
    floorMat.metalness = clamp01(runtime.floorMetalness);
    floorMat.opacity = clamp01(runtime.floorOpacity);
    floorMat.transparent = floorMat.opacity < 0.999;
    floor.visible = floorMat.opacity > 0.001;
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
    renderer.toneMappingExposure =
      Number.parseFloat(exposure?.value || '1') || 1;

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

  const loadModel = async (
    raw: string,
    opts?: { objectUrlToRevoke?: string | null }
  ) => {
    const requestId = ++loadState.requestId;

    if (loadState.gltf) {
      scene.remove(loadState.gltf);
      disposeObject(loadState.gltf);
      loadState.gltf = null;
    }

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

      if (!runtime.originalMats) applyPaintHeuristic(obj, runtime.paintHex);

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

  const syncPaint = () => {
    const parsed = parseHexColor(paintInp?.value || '') || runtime.paintHex;
    runtime.paintHex = parsed;
    if (loadState.gltf && !runtime.originalMats)
      applyPaintHeuristic(loadState.gltf, parsed);
  };
  paintInp?.addEventListener('input', syncPaint);

  originalMatsChk?.addEventListener('change', () => {
    runtime.originalMats = Boolean(originalMatsChk.checked);
    if (!runtime.originalMats && loadState.gltf)
      applyPaintHeuristic(loadState.gltf, runtime.paintHex);
  });

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
  });

  envRotation?.addEventListener('input', () => {
    runtime.envRotationDeg = Number.parseFloat(envRotation.value) || 0;
    applyLighting();
  });
  applyLighting();

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
  bloom?.addEventListener('input', syncPostUi);
  bloomThreshold?.addEventListener('input', syncPostUi);
  bloomRadius?.addEventListener('input', syncPostUi);
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
    runtime.motionStyle = (motionStyle.value || 'spin').trim().toLowerCase();
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

  screenshotBtn?.addEventListener('click', () => {
    hapticTap(15);
    try {
      const a = document.createElement('a');
      a.download = 'car-showroom.png';
      a.href = renderer.domElement.toDataURL('image/png');
      a.click();
    } catch (e) {
      console.warn('[ShowroomV3] Screenshot failed:', e);
    }
  });

  shareBtn?.addEventListener('click', async () => {
    hapticTap(15);
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
    url.searchParams.set('lp', runtime.lightPreset);
    url.searchParams.set('li', String(runtime.lightIntensity));
    url.searchParams.set('lw', String(runtime.lightWarmth));
    url.searchParams.set('lr', String(runtime.rimBoost));
    url.searchParams.set('ei', String(runtime.envIntensity));
    url.searchParams.set('er', String(runtime.envRotationDeg));
    url.searchParams.set('grid', runtime.grid ? '1' : '0');
    url.searchParams.set('axes', runtime.axes ? '1' : '0');
    url.searchParams.set('wf', wireframeChk?.checked ? '1' : '0');
    try {
      await navigator.clipboard.writeText(url.toString());
      setStatus(false, 'Link copied.');
      window.setTimeout(() => setStatus(false, ''), 1200);
    } catch {
      setStatus(false, 'Copy failed.');
      window.setTimeout(() => setStatus(false, ''), 1200);
    }
  });

  // Resize + loop
  const ro = new ResizeObserver(() => setSize());
  ro.observe(canvas);
  setSize();

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
      loadState.gltf.position.y = bob;
      loadState.gltf.rotation.y =
        Math.sin(t * (0.4 + runtime.motionSpeed * 0.6)) * 0.08;
    } else if (loadState.gltf && style !== 'float') {
      // Keep grounded
      loadState.gltf.position.y = 0;
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
          runtime.dynamicScale = clamp(runtime.dynamicScale - 0.08, 0.5, 1);
          applyQuality();
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
    if (composer && runtime.bloomStrength > 0.001) composer.render();
    else renderer.render(scene, camera);

    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

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
    const wf = url.searchParams.get('wf');

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
    if (wf && wireframeChk) wireframeChk.checked = wf === '1';
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
  runtime.haptics = Boolean(hapticsChk?.checked ?? runtime.haptics);

  grid.visible = runtime.grid;
  axes.visible = runtime.axes;
  applyLighting();
  syncPaint();
  applyQuality();

  const initial = (
    modelUrl?.value ||
    modelSel?.value ||
    '/models/porsche-911-gt3rs.glb'
  ).trim();
  if (modelUrl && !modelUrl.value) modelUrl.value = initial;
  void loadModel(initial);

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
    setSelectedMesh(selectedMesh);
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
      const pickEnabled = Boolean(inspectorPick?.checked ?? true);
      if (!pickEnabled || !loadState.gltf) return;

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
      const first = hits[0]?.object;
      const mesh =
        first && (first as THREE.Mesh).isMesh ? (first as THREE.Mesh) : null;
      if (!mesh) return;

      hapticTap(8);
      setSelectedMesh(mesh);
      if (inspectorMeshSel) inspectorMeshSel.value = mesh.uuid;
      applyIsolate();
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

  html.dataset.carShowroomBoot = '1';
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
