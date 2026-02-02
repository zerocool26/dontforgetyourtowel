import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { withBasePath } from '../utils/helpers';
import { initShowroomPanel } from './car-showroom/showroom-panel';

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

const normalizeModelPlacement = (obj: THREE.Object3D) => {
  // Ensure matrices are current before measuring.
  obj.updateWorldMatrix(true, true);

  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  // If units are wildly off, gently normalize scale.
  // Porsche models should be in a sane range; these thresholds avoid unnecessary scaling.
  if (maxDim > 20 || maxDim < 0.2) {
    const target = 6; // roughly a car-length-ish visual size
    const s = maxDim > 0 ? target / maxDim : 1;
    obj.scale.multiplyScalar(s);
    obj.updateWorldMatrix(true, true);
  }

  // Recompute after potential scaling.
  const box2 = new THREE.Box3().setFromObject(obj);
  const center2 = box2.getCenter(new THREE.Vector3());
  const min = box2.min;

  // Center horizontally and place bottom at y=0.
  obj.position.x -= center2.x;
  obj.position.z -= center2.z;
  obj.position.y -= min.y;
  obj.updateWorldMatrix(true, true);
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

const parseHexColor = (value: string): string | null => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const hex = raw.startsWith('#') ? raw : `#${raw}`;
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toLowerCase() : null;
};

const applyPaintColorHeuristic = (rootObj: THREE.Object3D, hex: string) => {
  const color = new THREE.Color(hex);
  rootObj.traverse(child => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;

    const meshName = String(mesh.name || '').toLowerCase();
    if (
      meshName.includes('wheel') ||
      meshName.includes('tire') ||
      meshName.includes('rim')
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

      // Avoid tinting transparent materials.
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

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const getObjectCenterAndRadius = (obj: THREE.Object3D) => {
  const box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const radius = 0.5 * Math.max(size.x, size.y, size.z);
  return { center, radius: Math.max(0.01, radius) };
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

  // Existing advanced controls from the page (optional)
  const colorInp = root.querySelector<HTMLInputElement>('[data-csr-color]');
  const colorPreview = root.querySelector<HTMLElement>(
    '[data-csr-color-preview]'
  );
  const swatches = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-csr-swatch]')
  );
  const backgroundSel = root.querySelector<HTMLSelectElement>(
    '[data-csr-background]'
  );
  const lightPresetSel = root.querySelector<HTMLSelectElement>(
    '[data-csr-light-preset]'
  );
  const gridChk = root.querySelector<HTMLInputElement>('[data-csr-grid]');
  const envIntensityRange = root.querySelector<HTMLInputElement>(
    '[data-csr-env-intensity]'
  );
  const envRotationRange = root.querySelector<HTMLInputElement>(
    '[data-csr-env-rotation]'
  );
  const lightIntensityRange = root.querySelector<HTMLInputElement>(
    '[data-csr-light-intensity]'
  );
  const lightWarmthRange = root.querySelector<HTMLInputElement>(
    '[data-csr-light-warmth]'
  );
  const rimBoostRange = root.querySelector<HTMLInputElement>(
    '[data-csr-rim-boost]'
  );
  const qualitySel =
    root.querySelector<HTMLSelectElement>('[data-csr-quality]');
  const qualityBadge = root.querySelector<HTMLElement>(
    '[data-csr-quality-badge]'
  );
  const qualityFpsEl = root.querySelector<HTMLElement>(
    '[data-csr-quality-fps]'
  );
  const qualityResEl = root.querySelector<HTMLElement>(
    '[data-csr-quality-res]'
  );
  const qualityModeEl = root.querySelector<HTMLElement>(
    '[data-csr-quality-mode]'
  );
  const qualityEcoEl = root.querySelector<HTMLElement>(
    '[data-csr-quality-eco]'
  );

  // Extra UI hooks (most are optional)
  const tabSelect = root.querySelector<HTMLSelectElement>(
    '[data-csr-tab-select]'
  );
  const tabButtons = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-csr-tab-btn]')
  );
  const tabPanels = Array.from(
    root.querySelectorAll<HTMLElement>('[data-csr-tab-panel]')
  );

  const autoQualityChk = root.querySelector<HTMLInputElement>(
    '[data-csr-auto-quality]'
  );
  const originalMatsChk = root.querySelector<HTMLInputElement>(
    '[data-csr-original-mats]'
  );
  const hapticsChk = root.querySelector<HTMLInputElement>('[data-csr-haptics]');

  const exposureRange = root.querySelector<HTMLInputElement>(
    '[data-csr-exposure]'
  );
  const bloomStrengthRange =
    root.querySelector<HTMLInputElement>('[data-csr-bloom]');
  const bloomThresholdRange = root.querySelector<HTMLInputElement>(
    '[data-csr-bloom-threshold]'
  );
  const bloomRadiusRange = root.querySelector<HTMLInputElement>(
    '[data-csr-bloom-radius]'
  );

  const shadowStrengthRange =
    root.querySelector<HTMLInputElement>('[data-csr-shadow]');
  const shadowSizeRange = root.querySelector<HTMLInputElement>(
    '[data-csr-shadow-size]'
  );
  const highQualityShadowsChk = root.querySelector<HTMLInputElement>(
    '[data-csr-high-quality-shadows]'
  );

  const floorColorInp = root.querySelector<HTMLInputElement>(
    '[data-csr-floor-color]'
  );
  const floorRoughnessRange = root.querySelector<HTMLInputElement>(
    '[data-csr-floor-roughness]'
  );
  const floorMetalnessRange = root.querySelector<HTMLInputElement>(
    '[data-csr-floor-metalness]'
  );
  const floorOpacityRange = root.querySelector<HTMLInputElement>(
    '[data-csr-floor-opacity]'
  );

  const autorotateChk = root.querySelector<HTMLInputElement>(
    '[data-csr-autorotate]'
  );
  const motionStyleSel = root.querySelector<HTMLSelectElement>(
    '[data-csr-motion-style]'
  );
  const spinSpeedRange = root.querySelector<HTMLInputElement>(
    '[data-csr-spinspeed]'
  );
  const motionRange = root.querySelector<HTMLInputElement>(
    '[data-csr-motion-range]'
  );
  const zoomRange = root.querySelector<HTMLInputElement>('[data-csr-zoom]');
  const zoomWideBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-zoom-wide]'
  );
  const zoomMidBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-zoom-mid]'
  );
  const zoomCloseBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-zoom-close]'
  );

  const quickSpinChk = root.querySelector<HTMLInputElement>(
    '[data-csr-quick-spin]'
  );
  const quickZoomRange = root.querySelector<HTMLInputElement>(
    '[data-csr-quick-zoom]'
  );
  const quickLightSel = root.querySelector<HTMLSelectElement>(
    '[data-csr-quick-light]'
  );

  const cameraPresetSel =
    root.querySelector<HTMLSelectElement>('[data-csr-camera]');
  const cameraModeSel = root.querySelector<HTMLSelectElement>(
    '[data-csr-camera-mode]'
  );
  const camYawRange =
    root.querySelector<HTMLInputElement>('[data-csr-cam-yaw]');
  const camPitchRange = root.querySelector<HTMLInputElement>(
    '[data-csr-cam-pitch]'
  );
  const camDistanceRange = root.querySelector<HTMLInputElement>(
    '[data-csr-cam-distance]'
  );
  const fovRange = root.querySelector<HTMLInputElement>('[data-csr-fov]');
  const frameBtn = root.querySelector<HTMLButtonElement>('[data-csr-frame]');
  const resetViewBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-reset-view]'
  );

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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure =
    Number.parseFloat(exposureRange?.value || '1') || 1;
  const deviceDpr = window.devicePixelRatio || 1;
  const basePixelRatio = Math.min(deviceDpr, isMobile ? 1.5 : 2);
  let currentPixelRatio = basePixelRatio;
  renderer.setPixelRatio(currentPixelRatio);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0b0f14');

  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 500);
  camera.position.set(4.2, 1.4, 4.2);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = !isMobile;
  controls.enableRotate = true;
  controls.enableZoom = true;
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

  const rim = new THREE.DirectionalLight(0x9bdcff, 0.9);
  rim.position.set(-6, 3.5, -6);
  scene.add(rim);

  const grid = new THREE.GridHelper(10, 20, 0x334155, 0x1f2937);
  grid.visible = false;
  grid.position.y = 0.001;
  scene.add(grid);

  // Ground + shadow catcher
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 1,
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 64), floorMat);
  floor.rotation.x = -Math.PI / 2;
  // Slightly below y=0 to avoid z-fighting.
  floor.position.y = -0.001;
  floor.receiveShadow = true;
  scene.add(floor);

  const shadowCatcherMat = new THREE.ShadowMaterial({
    opacity: 0.5,
    transparent: true,
  });
  const shadowCatcher = new THREE.Mesh(
    new THREE.CircleGeometry(6, 64),
    shadowCatcherMat
  );
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.y = 0;
  shadowCatcher.receiveShadow = true;
  scene.add(shadowCatcher);

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

  const runtimeState = {
    paintHex: parseHexColor(colorInp?.value || '') || '#00d1b2',
    background: (backgroundSel?.value || 'studio').trim(),
    grid: Boolean(gridChk?.checked),
    envIntensity: Number.parseFloat(envIntensityRange?.value || '0.7') || 0.7,
    envRotationDeg: Number.parseFloat(envRotationRange?.value || '0') || 0,
    lightPreset: (lightPresetSel?.value || 'studio').trim(),
    lightIntensity: Number.parseFloat(lightIntensityRange?.value || '1') || 1,
    lightWarmth: Number.parseFloat(lightWarmthRange?.value || '0') || 0,
    rimBoost: Number.parseFloat(rimBoostRange?.value || '1') || 1,
    quality: (qualitySel?.value || (isMobile ? 'balanced' : 'ultra')).trim(),
    eco: false,
    autoQuality: Boolean(autoQualityChk?.checked ?? true),
    originalMats: Boolean(originalMatsChk?.checked ?? false),
    bloomStrength: Number.parseFloat(bloomStrengthRange?.value || '0') || 0,
    bloomThreshold:
      Number.parseFloat(bloomThresholdRange?.value || '0.9') || 0.9,
    bloomRadius: Number.parseFloat(bloomRadiusRange?.value || '0') || 0,
    shadowStrength:
      Number.parseFloat(shadowStrengthRange?.value || '0.5') || 0.5,
    shadowSize: Number.parseFloat(shadowSizeRange?.value || '6') || 6,
    floorOpacity: Number.parseFloat(floorOpacityRange?.value || '1') || 1,
    floorRoughness: Number.parseFloat(floorRoughnessRange?.value || '1') || 1,
    floorMetalness: Number.parseFloat(floorMetalnessRange?.value || '0') || 0,
    floorHex: parseHexColor(floorColorInp?.value || '') || '#0f172a',
    autorotate: Boolean(autorotateChk?.checked ?? false),
    motionStyle: (motionStyleSel?.value || 'spin').trim().toLowerCase(),
    spinSpeed: Number.parseFloat(spinSpeedRange?.value || '0.75') || 0.75,
    motionRangeDeg: Number.parseFloat(motionRange?.value || '18') || 18,
    zoomT: Number.parseFloat(zoomRange?.value || '0.8') || 0.8,
    lastModelRadius: 3,
  };

  const triggerHaptic = (pattern: number | number[]) => {
    if (hapticsChk && !hapticsChk.checked) return;
    if (!('vibrate' in navigator)) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore
    }
  };

  // Tabs
  const activateTab = (name: string) => {
    const key = (name || '').trim().toLowerCase();
    for (const p of tabPanels) {
      const v = (p.getAttribute('data-csr-tab-panel') || '')
        .trim()
        .toLowerCase();
      p.hidden = v !== key;
    }
    for (const b of tabButtons) {
      const v = (b.getAttribute('data-csr-tab-btn') || '').trim().toLowerCase();
      const active = v === key;
      b.setAttribute('aria-selected', active ? 'true' : 'false');
      b.tabIndex = active ? 0 : -1;
      b.classList.toggle('is-active', active);
    }
    if (tabSelect && tabSelect.value !== key) tabSelect.value = key;
  };

  if (tabButtons.length && tabPanels.length) {
    for (const btn of tabButtons) {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-csr-tab-btn') || '';
        activateTab(key);
      });
    }
    tabSelect?.addEventListener('change', () => {
      activateTab(tabSelect.value);
    });

    const initial =
      tabButtons
        .find(b => b.getAttribute('aria-selected') === 'true')
        ?.getAttribute('data-csr-tab-btn') ||
      tabSelect?.value ||
      tabPanels[0]?.getAttribute('data-csr-tab-panel') ||
      'look';
    activateTab(initial);
  }

  const setBackground = (mode: string) => {
    const m = (mode || 'studio').trim().toLowerCase();
    runtimeState.background = m;

    // Void means transparent so page background can show through.
    if (m === 'void') {
      scene.background = null;
      renderer.setClearAlpha(0);
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
  };

  const applyLighting = () => {
    const intensity = Math.min(2.5, Math.max(0.2, runtimeState.lightIntensity));
    const env = Math.min(3, Math.max(0, runtimeState.envIntensity));
    const warmth = Math.min(1, Math.max(0, runtimeState.lightWarmth));
    const rimBoost = Math.min(2, Math.max(0.5, runtimeState.rimBoost));

    // Blend between cool and warm for "warmth"
    const cool = new THREE.Color('#dbeafe');
    const warm = new THREE.Color('#ffd7a1');
    const mixed = cool.clone().lerp(warm, warmth);

    // Presets are coarse; sliders refine.
    const preset = runtimeState.lightPreset.toLowerCase();
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

    // Rotate key/rim around the car for envRotation.
    const rad = (runtimeState.envRotationDeg * Math.PI) / 180;
    const r = 9;
    key.position.set(Math.cos(rad) * r, 8, Math.sin(rad) * r);
    rim.position.set(
      Math.cos(rad + Math.PI) * r,
      3.5,
      Math.sin(rad + Math.PI) * r
    );
  };

  const applyQuality = (mode: string) => {
    const m = (mode || '').trim().toLowerCase();
    runtimeState.quality = m;
    let targetRatio = basePixelRatio;
    if (m === 'performance') targetRatio = Math.min(basePixelRatio, 1.0);
    else if (m === 'balanced')
      targetRatio = Math.min(basePixelRatio, isMobile ? 1.25 : 1.5);
    else targetRatio = basePixelRatio;

    if (runtimeState.eco) targetRatio = Math.min(targetRatio, 1.0);
    currentPixelRatio = targetRatio;
    renderer.setPixelRatio(currentPixelRatio);
    setSize();

    if (qualityResEl)
      qualityResEl.textContent = `${currentPixelRatio.toFixed(2)}x`;
    if (qualityModeEl)
      qualityModeEl.textContent = runtimeState.eco ? 'ECO' : 'LIVE';
    if (qualityEcoEl) qualityEcoEl.hidden = !runtimeState.eco;
  };

  // Post-processing (lazy composer)
  let composer: EffectComposer | null = null;
  let bloomPass: UnrealBloomPass | null = null;

  const ensureComposer = () => {
    if (composer) return;
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      runtimeState.bloomStrength,
      runtimeState.bloomRadius,
      runtimeState.bloomThreshold
    );
    composer.addPass(bloomPass);
  };

  const applyPost = () => {
    renderer.toneMappingExposure =
      Number.parseFloat(exposureRange?.value || '1') || 1;

    runtimeState.bloomStrength =
      Number.parseFloat(bloomStrengthRange?.value || '0') || 0;
    runtimeState.bloomThreshold =
      Number.parseFloat(bloomThresholdRange?.value || '0.9') || 0.9;
    runtimeState.bloomRadius =
      Number.parseFloat(bloomRadiusRange?.value || '0') || 0;

    if (runtimeState.bloomStrength > 0.001) {
      ensureComposer();
      if (bloomPass) {
        bloomPass.strength = runtimeState.bloomStrength;
        bloomPass.threshold = runtimeState.bloomThreshold;
        bloomPass.radius = runtimeState.bloomRadius;
      }
    }
  };

  exposureRange?.addEventListener('input', applyPost);
  bloomStrengthRange?.addEventListener('input', applyPost);
  bloomThresholdRange?.addEventListener('input', applyPost);
  bloomRadiusRange?.addEventListener('input', applyPost);
  applyPost();

  const applyFloor = () => {
    runtimeState.floorOpacity =
      Number.parseFloat(floorOpacityRange?.value || '1') || 1;
    runtimeState.floorRoughness =
      Number.parseFloat(floorRoughnessRange?.value || '1') || 1;
    runtimeState.floorMetalness =
      Number.parseFloat(floorMetalnessRange?.value || '0') || 0;
    runtimeState.floorHex =
      parseHexColor(floorColorInp?.value || '') || runtimeState.floorHex;

    floorMat.color.set(runtimeState.floorHex);
    floorMat.roughness = clamp01(runtimeState.floorRoughness);
    floorMat.metalness = clamp01(runtimeState.floorMetalness);
    floorMat.opacity = clamp01(runtimeState.floorOpacity);
    floorMat.transparent = floorMat.opacity < 0.999;
    floor.visible = floorMat.opacity > 0.001;
  };

  floorColorInp?.addEventListener('input', applyFloor);
  floorRoughnessRange?.addEventListener('input', applyFloor);
  floorMetalnessRange?.addEventListener('input', applyFloor);
  floorOpacityRange?.addEventListener('input', applyFloor);
  applyFloor();

  const applyShadows = () => {
    runtimeState.shadowStrength =
      Number.parseFloat(shadowStrengthRange?.value || '0.5') || 0.5;
    runtimeState.shadowSize =
      Number.parseFloat(shadowSizeRange?.value || '6') || 6;

    const enabled = runtimeState.shadowStrength > 0.001;
    renderer.shadowMap.enabled = enabled;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    key.castShadow = enabled;
    shadowCatcherMat.opacity = clamp01(runtimeState.shadowStrength);
    shadowCatcher.visible = enabled;

    const s = Math.min(12, Math.max(2, runtimeState.shadowSize));
    const cam = key.shadow.camera as THREE.OrthographicCamera;
    cam.left = -s;
    cam.right = s;
    cam.top = s;
    cam.bottom = -s;
    cam.near = 0.5;
    cam.far = 40;
    cam.updateProjectionMatrix();
    const mapSize = highQualityShadowsChk?.checked ? 2048 : 1024;
    key.shadow.mapSize.set(mapSize, mapSize);
    key.shadow.bias = -0.0001;
  };

  shadowStrengthRange?.addEventListener('input', applyShadows);
  shadowSizeRange?.addEventListener('input', applyShadows);
  highQualityShadowsChk?.addEventListener('change', applyShadows);
  applyShadows();

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

  // Panel (mobile-friendly bottom sheet + desktop collapse)
  initShowroomPanel({
    root,
    triggerHaptic,
  });

  autoQualityChk?.addEventListener('change', () => {
    runtimeState.autoQuality = Boolean(autoQualityChk.checked);
    if (!runtimeState.autoQuality) {
      runtimeState.eco = false;
      applyQuality(runtimeState.quality);
    }
  });

  originalMatsChk?.addEventListener('change', () => {
    runtimeState.originalMats = Boolean(originalMatsChk.checked);
    if (runtimeState.originalMats) return;
    if (loadState.gltf)
      applyPaintColorHeuristic(loadState.gltf, runtimeState.paintHex);
  });

  // Motion / zoom
  const setAutorotate = (on: boolean) => {
    runtimeState.autorotate = on;
    controls.autoRotate = on;
    if (autorotateChk) autorotateChk.checked = on;
    if (quickSpinChk) quickSpinChk.checked = on;
  };

  const applyMotion = () => {
    runtimeState.motionStyle = (
      motionStyleSel?.value || runtimeState.motionStyle
    )
      .trim()
      .toLowerCase();
    runtimeState.spinSpeed =
      Number.parseFloat(
        spinSpeedRange?.value || String(runtimeState.spinSpeed)
      ) || runtimeState.spinSpeed;
    runtimeState.motionRangeDeg =
      Number.parseFloat(
        motionRange?.value || String(runtimeState.motionRangeDeg)
      ) || runtimeState.motionRangeDeg;
    controls.autoRotateSpeed = runtimeState.spinSpeed;
    controls.autoRotate =
      runtimeState.autorotate && runtimeState.motionStyle !== 'pendulum';
  };

  const applyZoom = (t: number) => {
    runtimeState.zoomT = clamp01(t);
    if (zoomRange) zoomRange.value = String(runtimeState.zoomT);
    if (quickZoomRange) quickZoomRange.value = String(runtimeState.zoomT);

    const dist = THREE.MathUtils.lerp(
      controls.maxDistance,
      controls.minDistance,
      runtimeState.zoomT
    );
    const dir = camera.position.clone().sub(controls.target).normalize();
    camera.position.copy(controls.target).add(dir.multiplyScalar(dist));
    controls.update();
  };

  autorotateChk?.addEventListener('change', () => {
    setAutorotate(Boolean(autorotateChk.checked));
    applyMotion();
  });
  quickSpinChk?.addEventListener('change', () => {
    setAutorotate(Boolean(quickSpinChk.checked));
    applyMotion();
  });
  motionStyleSel?.addEventListener('change', applyMotion);
  spinSpeedRange?.addEventListener('input', applyMotion);
  motionRange?.addEventListener('input', applyMotion);
  zoomRange?.addEventListener('input', () => {
    applyZoom(Number.parseFloat(zoomRange.value) || 0);
  });
  quickZoomRange?.addEventListener('input', () => {
    applyZoom(Number.parseFloat(quickZoomRange.value) || 0);
  });
  zoomWideBtn?.addEventListener('click', () => applyZoom(0.0));
  zoomMidBtn?.addEventListener('click', () => applyZoom(0.5));
  zoomCloseBtn?.addEventListener('click', () => applyZoom(0.92));
  setAutorotate(Boolean(runtimeState.autorotate));
  applyMotion();
  applyZoom(runtimeState.zoomT);

  // Camera controls
  const applyFov = () => {
    const fov = Number.parseFloat(fovRange?.value || '') || camera.fov;
    camera.fov = Math.min(85, Math.max(35, fov));
    camera.updateProjectionMatrix();
  };
  fovRange?.addEventListener('input', applyFov);
  applyFov();

  const applyCameraManual = () => {
    const yawDeg = Number.parseFloat(camYawRange?.value || '0') || 0;
    const pitchDeg = Number.parseFloat(camPitchRange?.value || '10') || 10;
    const dist = Number.parseFloat(camDistanceRange?.value || '9') || 9;
    const yaw = (yawDeg * Math.PI) / 180;
    const pitch = (pitchDeg * Math.PI) / 180;
    const y = Math.sin(pitch) * dist;
    const xz = Math.cos(pitch) * dist;
    const x = Math.cos(yaw) * xz;
    const z = Math.sin(yaw) * xz;
    camera.position.copy(controls.target).add(new THREE.Vector3(x, y, z));
    controls.update();
  };

  const applyCameraPreset = () => {
    const preset = (cameraPresetSel?.value || 'hero').trim().toLowerCase();
    const r = runtimeState.lastModelRadius;
    const dist = Math.min(18, Math.max(2.2, r * 2.3));
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

  const applyCameraFromUi = () => {
    const mode = (cameraModeSel?.value || 'preset').trim().toLowerCase();
    if (mode === 'manual') applyCameraManual();
    else applyCameraPreset();
  };

  cameraPresetSel?.addEventListener('change', applyCameraFromUi);
  cameraModeSel?.addEventListener('change', applyCameraFromUi);
  camYawRange?.addEventListener('input', applyCameraFromUi);
  camPitchRange?.addEventListener('input', applyCameraFromUi);
  camDistanceRange?.addEventListener('input', applyCameraFromUi);

  frameBtn?.addEventListener('click', () => {
    if (loadState.gltf) fitCameraToObject(camera, controls, loadState.gltf);
  });
  resetViewBtn?.addEventListener('click', () => resetCamera());

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

      const { center, radius } = getObjectCenterAndRadius(obj);
      runtimeState.lastModelRadius = radius;
      controls.target.copy(center);

      obj.traverse(child => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = runtimeState.shadowStrength > 0.001;
        mesh.receiveShadow = false;
      });

      // Normalize placement so the model sits on the ground and is centered.
      normalizeModelPlacement(obj);

      scene.add(obj);
      loadState.gltf = obj;

      fitCameraToObject(camera, controls, obj);

      // After framing, apply camera preset/manual overrides.
      applyCameraFromUi();

      // Apply any UI state to the newly-loaded model.
      if (!runtimeState.originalMats)
        applyPaintColorHeuristic(obj, runtimeState.paintHex);

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

  // Advanced controls
  if (qualityBadge) qualityBadge.hidden = false;

  const setColorPreview = (hex: string) => {
    if (colorPreview) colorPreview.style.background = hex;
  };
  setColorPreview(runtimeState.paintHex);

  const applyPaintFromUi = (hex: string) => {
    const parsed = parseHexColor(hex);
    if (!parsed) return;
    runtimeState.paintHex = parsed;
    setColorPreview(parsed);
    if (!runtimeState.originalMats && loadState.gltf)
      applyPaintColorHeuristic(loadState.gltf, parsed);
  };

  colorInp?.addEventListener('input', () => {
    applyPaintFromUi(colorInp.value);
  });
  for (const btn of swatches) {
    btn.addEventListener('click', () => {
      const hex = btn.getAttribute('data-csr-swatch') || '';
      const parsed = parseHexColor(hex);
      if (!parsed) return;
      if (colorInp) colorInp.value = parsed;
      applyPaintFromUi(parsed);
    });
  }

  backgroundSel?.addEventListener('change', () => {
    setBackground(backgroundSel.value);
  });
  setBackground(runtimeState.background);

  // Quick controls that mirror primary selectors
  quickLightSel?.addEventListener('change', () => {
    if (lightPresetSel) {
      lightPresetSel.value = quickLightSel.value;
      runtimeState.lightPreset = (lightPresetSel.value || 'studio').trim();
      applyLighting();
    }
  });

  gridChk?.addEventListener('change', () => {
    runtimeState.grid = Boolean(gridChk.checked);
    grid.visible = runtimeState.grid || runtimeState.background === 'grid';
  });
  grid.visible = runtimeState.grid || runtimeState.background === 'grid';

  lightPresetSel?.addEventListener('change', () => {
    runtimeState.lightPreset = (lightPresetSel.value || 'studio').trim();
    applyLighting();
  });
  envIntensityRange?.addEventListener('input', () => {
    runtimeState.envIntensity = Number.parseFloat(envIntensityRange.value) || 0;
    applyLighting();
  });
  envRotationRange?.addEventListener('input', () => {
    runtimeState.envRotationDeg =
      Number.parseFloat(envRotationRange.value) || 0;
    applyLighting();
  });
  lightIntensityRange?.addEventListener('input', () => {
    runtimeState.lightIntensity =
      Number.parseFloat(lightIntensityRange.value) || 1;
    applyLighting();
  });
  lightWarmthRange?.addEventListener('input', () => {
    runtimeState.lightWarmth = Number.parseFloat(lightWarmthRange.value) || 0;
    applyLighting();
  });
  rimBoostRange?.addEventListener('input', () => {
    runtimeState.rimBoost = Number.parseFloat(rimBoostRange.value) || 1;
    applyLighting();
  });
  applyLighting();

  qualitySel?.addEventListener('change', () => {
    runtimeState.eco = false;
    applyQuality(qualitySel.value);
  });
  applyQuality(runtimeState.quality);

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

  // FPS + adaptive quality (mobile-friendly)
  let lastFpsSample = performance.now();
  let frames = 0;
  const tickWithStats = () => {
    frames += 1;
    const now = performance.now();
    const dt = now - lastFpsSample;
    if (dt >= 1000) {
      const fps = Math.round((frames * 1000) / dt);
      if (qualityFpsEl) qualityFpsEl.textContent = String(fps).padStart(2, '0');

      // Eco mode: if we can't sustain 45fps on mobile, drop resolution.
      if (
        runtimeState.autoQuality &&
        isMobile &&
        runtimeState.quality !== 'ultra'
      ) {
        const shouldEco = fps > 0 && fps < 45;
        if (shouldEco !== runtimeState.eco) {
          runtimeState.eco = shouldEco;
          applyQuality(runtimeState.quality);
        }
      }

      frames = 0;
      lastFpsSample = now;
    }

    // Pendulum motion is handled manually (not OrbitControls autoRotate).
    if (runtimeState.autorotate && runtimeState.motionStyle === 'pendulum') {
      const amp = (runtimeState.motionRangeDeg * Math.PI) / 180;
      const t = now * 0.001;
      const yaw = Math.sin(t * (0.55 + runtimeState.spinSpeed * 0.9)) * amp;
      const dist = camera.position.distanceTo(controls.target);
      const base = new THREE.Vector3(dist, dist * 0.35, dist);
      const rot = new THREE.Matrix4().makeRotationY(yaw);
      camera.position.copy(controls.target).add(base.applyMatrix4(rot));
    }

    controls.update();
    if (composer && runtimeState.bloomStrength > 0.001) composer.render();
    else renderer.render(scene, camera);
    requestAnimationFrame(tickWithStats);
  };

  requestAnimationFrame(tickWithStats);

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
