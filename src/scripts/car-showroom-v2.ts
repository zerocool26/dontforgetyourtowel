import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { withBasePath } from '../utils/helpers';

type LoadState = {
  requestId: number;
  objectUrlToRevoke: string | null;
  gltf: THREE.Object3D | null;
};

const ROOT_SELECTOR = '[data-car-showroom-root]';

const isExternalUrl = (value: string) =>
  /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value);

const resolveModelUrl = (raw: string): string => {
  const v = (raw || '').trim();
  if (!v) return withBasePath('/models/porsche-911-gt3rs.glb');
  if (isExternalUrl(v) || v.startsWith('blob:')) return v;
  const normalized = v.startsWith('/') ? v : `/${v}`;
  return withBasePath(normalized);
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

const fitCameraToObject = (
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  obj: THREE.Object3D
) => {
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = (camera.fov * Math.PI) / 180;
  const dist = maxDim / (2 * Math.tan(fov / 2));

  controls.target.copy(center);
  camera.position.copy(center);
  camera.position.add(new THREE.Vector3(dist * 1.15, dist * 0.35, dist * 1.15));
  camera.near = Math.max(0.01, dist / 100);
  camera.far = Math.max(50, dist * 100);
  camera.updateProjectionMatrix();
  controls.update();
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

const init = () => {
  const root = document.querySelector<HTMLElement>(ROOT_SELECTOR);
  if (!root) return;

  const html = document.documentElement;
  html.dataset.carShowroomBoot = '0';
  html.dataset.carShowroomWebgl = '0';

  const canvas = root.querySelector<HTMLCanvasElement>(
    '[data-car-showroom-canvas]'
  );
  if (!canvas) {
    html.dataset.carShowroomBoot = '1';
    return;
  }

  // Minimal UI hooks (optional)
  const loadingEl = root.querySelector<HTMLElement>('[data-csr-loading]');
  const errorEl = root.querySelector<HTMLElement>('[data-csr-error]');
  const modelSel = root.querySelector<HTMLSelectElement>('[data-csr-model]');
  const modelUrlInp = root.querySelector<HTMLInputElement>(
    '[data-csr-model-url]'
  );
  const loadModelBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-load-model]'
  );
  const resetBtn = root.querySelector<HTMLButtonElement>('[data-csr-reset]');
  const resetCameraBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-reset-camera]'
  );
  const screenshotBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-screenshot]'
  );
  const importBtn = root.querySelector<HTMLButtonElement>('[data-csr-import]');
  const fileInp = root.querySelector<HTMLInputElement>('[data-csr-file]');

  const togglePanelBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-toggle-panel]'
  );
  const panel = root.querySelector<HTMLElement>('[data-csr-panel]');

  const setStatus = (loading: boolean, error: string) => {
    if (loadingEl) loadingEl.hidden = !loading;
    if (errorEl) {
      errorEl.hidden = error.length === 0;
      errorEl.textContent = error;
    }
  };

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
    console.error('[CarShowroomV2] WebGL init failed:', e);
    html.dataset.carShowroomBoot = '1';
    html.dataset.carShowroomWebgl = '0';
    setStatus(false, 'WebGL failed to initialize on this device/browser.');
    return;
  }

  html.dataset.carShowroomWebgl = '1';

  const isMobile = window.matchMedia('(max-width: 980px)').matches;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2)
  );

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0b0f14');

  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 500);
  camera.position.set(4.2, 1.4, 4.2);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = !isMobile;
  controls.minDistance = 1.2;
  controls.maxDistance = 18;
  controls.target.set(0, 0.8, 0);
  controls.update();

  // Lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0x1b2330, 0.9);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(6, 8, 4);
  scene.add(key);

  // Ground
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(6, 64),
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 1,
      metalness: 0,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  scene.add(ground);

  // Loader
  const draco = new DRACOLoader();
  draco.setDecoderPath(withBasePath('/draco/gltf/'));
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);

  const loadState: LoadState = {
    requestId: 0,
    objectUrlToRevoke: null,
    gltf: null,
  };

  const setSize = () => {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  const resetCamera = () => {
    controls.target.set(0, 0.8, 0);
    camera.position.set(4.2, 1.4, 4.2);
    controls.update();
  };

  const applyPanelToggle = () => {
    if (!togglePanelBtn) return;
    togglePanelBtn.addEventListener('click', () => {
      if (!panel) return;
      const nextHidden = !panel.hidden;
      panel.hidden = nextHidden;
      togglePanelBtn.setAttribute(
        'aria-expanded',
        nextHidden ? 'false' : 'true'
      );
    });
  };

  const loadModel = async (
    rawUrl: string,
    opts?: { objectUrlToRevoke?: string | null }
  ) => {
    const requestId = ++loadState.requestId;

    if (loadState.gltf) {
      scene.remove(loadState.gltf);
      disposeObject(loadState.gltf);
      loadState.gltf = null;
    }

    if (loadState.objectUrlToRevoke) {
      URL.revokeObjectURL(loadState.objectUrlToRevoke);
      loadState.objectUrlToRevoke = null;
    }

    if (opts?.objectUrlToRevoke) {
      loadState.objectUrlToRevoke = opts.objectUrlToRevoke;
    }

    const resolved = resolveModelUrl(rawUrl);

    setRootState(root, {
      carShowroomReady: '0',
      carShowroomLoading: '1',
      carShowroomLoadPhase: 'fetch',
      carShowroomLoadError: '',
      carShowroomModel: rawUrl.trim(),
    });
    setStatus(true, '');

    try {
      const gltf = await loader.loadAsync(resolved);
      if (requestId !== loadState.requestId) return; // cancelled

      const obj = gltf.scene || gltf.scenes?.[0];
      if (!obj) throw new Error('GLTF contained no scene');

      obj.traverse(child => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
      });

      scene.add(obj);
      loadState.gltf = obj;

      fitCameraToObject(camera, controls, obj);

      setRootState(root, {
        carShowroomReady: '1',
        carShowroomLoading: '0',
        carShowroomLoadPhase: '',
        carShowroomLoadError: '',
      });
      setStatus(false, '');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[CarShowroomV2] Model load failed:', resolved, e);
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

  // Wire UI
  applyPanelToggle();

  modelSel?.addEventListener('change', () => {
    const v = (modelSel.value || '').trim();
    if (modelUrlInp) modelUrlInp.value = v;
    void loadModel(v);
  });

  loadModelBtn?.addEventListener('click', () => {
    const v = (modelUrlInp?.value || modelSel?.value || '').trim();
    if (!v) return;
    void loadModel(v);
  });

  modelUrlInp?.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const v = (modelUrlInp.value || modelSel?.value || '').trim();
    if (!v) return;
    void loadModel(v);
  });

  resetBtn?.addEventListener('click', () => {
    const v = (modelSel?.value || '/models/porsche-911-gt3rs.glb').trim();
    if (modelUrlInp) modelUrlInp.value = v;
    resetCamera();
    void loadModel(v);
  });

  resetCameraBtn?.addEventListener('click', () => {
    resetCamera();
  });

  screenshotBtn?.addEventListener('click', () => {
    try {
      const a = document.createElement('a');
      a.download = 'car-showroom.png';
      a.href = renderer.domElement.toDataURL('image/png');
      a.click();
    } catch (e) {
      console.warn('[CarShowroomV2] Screenshot failed:', e);
    }
  });

  importBtn?.addEventListener('click', () => {
    fileInp?.click();
  });

  fileInp?.addEventListener('change', () => {
    const file = fileInp.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (modelUrlInp) modelUrlInp.value = url;
    void loadModel(url, { objectUrlToRevoke: url });
  });

  // Resize + loop
  const ro = new ResizeObserver(() => setSize());
  ro.observe(canvas);
  setSize();

  const tick = () => {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // Kick initial model load
  const initial = (modelSel?.value || '/models/porsche-911-gt3rs.glb').trim();
  if (modelUrlInp && !modelUrlInp.value) modelUrlInp.value = initial;
  void loadModel(initial);

  html.dataset.carShowroomBoot = '1';
};

// Run after hydration
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
