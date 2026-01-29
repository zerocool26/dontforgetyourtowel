import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { SceneBase } from './SceneBase';
import type { SceneRuntime } from './types';
import { damp } from './SceneUtils';
import { withBasePath } from '../../../../../utils/url';

type MaterialMode = 'wrap' | 'wireframe' | 'glass';
type WrapFinish = 'custom' | 'matte' | 'satin' | 'gloss';

type SavedMaterialState = {
  material: THREE.Material | THREE.Material[];
};

type WrapMaterialState = {
  material: THREE.Material;
  baseColor: THREE.Color;
};

type WireframeMaterialState = {
  material: THREE.Material;
};

const parseFiniteNumber = (value: string | null): number | null => {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const parseColor = (value: string | null): THREE.Color | null => {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;

  // Accept: #RRGGBB, 0xRRGGBB, RRGGBB
  const hex = raw.startsWith('#')
    ? raw.slice(1)
    : raw.startsWith('0x') || raw.startsWith('0X')
      ? raw.slice(2)
      : raw;

  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return new THREE.Color(`#${hex}`);
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const smoothstep01 = (x: number) => {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};

const createContactShadowTexture = (size = 256): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;

  // Two-layer radial blob (car footprint + denser core)
  const blob = ctx.createRadialGradient(
    cx,
    cy,
    size * 0.12,
    cx,
    cy,
    size * 0.48
  );
  blob.addColorStop(0, 'rgba(0,0,0,0.55)');
  blob.addColorStop(0.35, 'rgba(0,0,0,0.25)');
  blob.addColorStop(1, 'rgba(0,0,0,0.0)');
  ctx.fillStyle = blob;
  ctx.fillRect(0, 0, size, size);

  const core = ctx.createRadialGradient(
    cx,
    cy + size * 0.03,
    0,
    cx,
    cy,
    size * 0.16
  );
  core.addColorStop(0, 'rgba(0,0,0,0.25)');
  core.addColorStop(1, 'rgba(0,0,0,0.0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
};

/**
 * Car Showroom (Scene 17)
 *
 * A realistic GLB car model in a clean studio rig with contact shadow and
 * interactive material presentation modes.
 *
 * Defaults to the Porsche GLB:
 * - /public/models/porsche-911-gt3rs.glb
 *
 * Override via query string:
 * - ?wrapModel=/models/your-model.glb
 */
export class WrapShowroomScene extends SceneBase {
  private readonly modelUrlDefault = withBasePath(
    '/models/porsche-911-gt3rs.glb'
  );

  private stage = new THREE.Group();
  private modelGroup = new THREE.Group();
  private fallback = new THREE.Group();

  private ground: THREE.Mesh;
  private groundMat: THREE.MeshStandardMaterial;
  private contactShadow: THREE.Mesh;

  private keyLight: THREE.DirectionalLight;
  private fillLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private topLight: THREE.DirectionalLight;

  private mode: MaterialMode = 'wrap';
  private lastModeSwitchTime = -1;

  private wrapColor = new THREE.Color(0x00d1b2);
  private wrapTint = 0.92;
  private wrapRoughness = 0.28;
  private wrapMetalness = 0.12;
  private wrapClearcoat = 1.0;
  private wrapClearcoatRoughness = 0.09;

  private savedMaterials = new Map<string, SavedMaterialState>();
  private glassMaterials = new Map<string, THREE.Material | THREE.Material[]>();
  private wrapMaterials = new Map<
    string,
    WrapMaterialState | WrapMaterialState[]
  >();
  private wireframeMaterials = new Map<
    string,
    WireframeMaterialState | WireframeMaterialState[]
  >();

  private loadedRoot: THREE.Object3D | null = null;
  private loadRequested = false;
  private loadError = false;
  private loggedLoadError = false;

  private time = 0;
  private orbitYaw = 0;
  private orbitPitch = 0.12;
  private orbitYawTarget = 0;
  private orbitPitchTarget = 0.12;
  private orbitRadius = 10;
  private orbitRadiusTarget = 10;
  private orbitYBase = 1.05;
  private modelLookAt = new THREE.Vector3(0, 0.78, 0);
  private autoSpin = 0;

  private lastTapTime = -10;
  private softResetTime = -10;
  private tapDebounce = 0.25;

  private lastUiRevision = '';
  private wrapFinish: WrapFinish = 'custom';

  constructor() {
    super();
    // Repurposed as the single merged car chapter.
    this.id = 'scene17';
    this.contentRadius = 6.5;
    this.baseDistance = 10.0;

    // Stage
    this.stage.position.y = 0;
    this.group.add(this.stage);

    // Ground (soft, reflective-ish)
    const groundGeo = new THREE.PlaneGeometry(40, 40, 1, 1);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x05070d,
      roughness: 0.55,
      metalness: 0.02,
    });
    this.groundMat = groundMat;
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = 0;
    this.ground.receiveShadow = true;
    this.stage.add(this.ground);

    // Contact shadow blob
    const shadowTex = createContactShadowTexture(256);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    this.contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      shadowMat
    );
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.contactShadow.position.y = 0.002;
    this.contactShadow.scale.set(5.6, 2.8, 1);
    this.contactShadow.renderOrder = 1;
    this.stage.add(this.contactShadow);

    // Model container
    this.modelGroup.position.y = 0;
    this.stage.add(this.modelGroup);

    // Fallback placeholder
    this.fallback = this.buildFallback();
    this.fallback.visible = true;
    this.stage.add(this.fallback);

    // Lighting rig (studio-ish)
    this.keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
    this.keyLight.position.set(7, 10, 6);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.bias = -0.00015;
    this.keyLight.shadow.normalBias = 0.02;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 40;
    this.keyLight.shadow.camera.left = -12;
    this.keyLight.shadow.camera.right = 12;
    this.keyLight.shadow.camera.top = 12;
    this.keyLight.shadow.camera.bottom = -12;
    this.stage.add(this.keyLight);
    this.stage.add(this.keyLight.target);

    this.fillLight = new THREE.DirectionalLight(0x8db8ff, 1.35);
    this.fillLight.position.set(-8, 7, 2);
    this.fillLight.castShadow = false;
    this.stage.add(this.fillLight);
    this.stage.add(this.fillLight.target);

    this.rimLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.rimLight.position.set(-6, 6, -8);
    this.stage.add(this.rimLight);
    this.stage.add(this.rimLight.target);

    this.topLight = new THREE.DirectionalLight(0xffffff, 0.55);
    this.topLight.position.set(0, 14, 0);
    this.stage.add(this.topLight);
    this.stage.add(this.topLight.target);

    const amb = new THREE.AmbientLight(0xffffff, 0.2);
    this.stage.add(amb);

    // Camera baseline
    this.baseFov = 45;
    this.camera.fov = this.baseFov;
    this.camera.near = 0.1;
    this.camera.far = 120;
    this.camera.position.set(0, 1.15, this.baseDistance);
    this.camera.lookAt(0, 0.8, 0);

    // Let director keep background (post pipeline) consistent.
    this.bg = new THREE.Color(0x02040a);
  }

  init(ctx: SceneRuntime) {
    // Ensure shadows are enabled globally.
    ctx.renderer.shadowMap.enabled = true;

    if (typeof document !== 'undefined') {
      document.documentElement.dataset.wrapShowroomSceneInit = '1';
    }

    this.syncSettingsFromUrl();

    // Kick model load.
    this.requestModel();

    // Pre-layout.
    this.resize(ctx);
  }

  private syncSettingsFromUrl(): void {
    try {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);

      const tint = parseFiniteNumber(params.get('wrapTint'));
      if (tint !== null) this.wrapTint = clamp(tint, 0, 1);

      const wrapColor =
        parseColor(params.get('wrapColor')) ?? parseColor(params.get('wrap'));
      if (wrapColor) this.wrapColor = wrapColor;

      const finish = (params.get('wrapFinish') || '').trim().toLowerCase();
      if (finish === 'matte') {
        this.applyFinishPreset('matte');
      } else if (finish === 'satin') {
        this.applyFinishPreset('satin');
      } else if (finish === 'gloss') {
        this.applyFinishPreset('gloss');
      }

      if (finish === 'matte' || finish === 'satin' || finish === 'gloss') {
        this.wrapFinish = finish;
      } else {
        this.wrapFinish = 'custom';
      }

      const startMode = (params.get('wrapMode') || '').trim().toLowerCase();
      if (startMode === 'wireframe' || startMode === 'glass') {
        this.mode = startMode;
      } else if (startMode === 'wrap') {
        this.mode = 'wrap';
      }

      if (typeof document !== 'undefined') {
        const ds = document.documentElement.dataset;
        ds.wrapShowroomMode = this.mode;
        ds.wrapShowroomWrapColor = `#${this.wrapColor.getHexString()}`;
        ds.wrapShowroomWrapTint = String(this.wrapTint);
        ds.wrapShowroomWrapFinish = this.wrapFinish;
      }
    } catch {
      // Ignore malformed URL data.
    }
  }

  private applyFinishPreset(finish: Exclude<WrapFinish, 'custom'>): void {
    if (finish === 'matte') {
      this.wrapRoughness = 0.62;
      this.wrapClearcoat = 0.25;
      this.wrapClearcoatRoughness = 0.55;
      this.wrapMetalness = 0.06;
      return;
    }
    if (finish === 'satin') {
      this.wrapRoughness = 0.38;
      this.wrapClearcoat = 0.7;
      this.wrapClearcoatRoughness = 0.18;
      this.wrapMetalness = 0.1;
      return;
    }
    // gloss
    this.wrapRoughness = 0.2;
    this.wrapClearcoat = 1.0;
    this.wrapClearcoatRoughness = 0.08;
    this.wrapMetalness = 0.14;
  }

  private refreshWrapMaterials(): void {
    for (const mapped of this.wrapMaterials.values()) {
      const items = Array.isArray(mapped) ? mapped : [mapped];
      for (const item of items) {
        const mat = item.material;
        if (!(mat instanceof THREE.MeshPhysicalMaterial)) continue;
        mat.color.copy(item.baseColor).lerp(this.wrapColor, this.wrapTint);
        mat.roughness = this.wrapRoughness;
        mat.metalness = this.wrapMetalness;
        mat.clearcoat = this.wrapClearcoat;
        mat.clearcoatRoughness = this.wrapClearcoatRoughness;
        mat.needsUpdate = true;
      }
    }
  }

  private syncSettingsFromUiDataset(): void {
    if (typeof document === 'undefined') return;
    const ds = document.documentElement.dataset;
    const rev = ds.wrapShowroomUiRevision ?? '';
    if (rev === this.lastUiRevision) return;
    this.lastUiRevision = rev;

    const modeRaw = (ds.wrapShowroomMode || '').trim().toLowerCase();
    const mode: MaterialMode =
      modeRaw === 'wireframe' || modeRaw === 'glass' || modeRaw === 'wrap'
        ? (modeRaw as MaterialMode)
        : this.mode;

    const color = parseColor(ds.wrapShowroomWrapColor ?? null);
    const tint = parseFiniteNumber(ds.wrapShowroomWrapTint ?? null);

    const finishRaw = (ds.wrapShowroomWrapFinish || '').trim().toLowerCase();
    const finish: WrapFinish =
      finishRaw === 'matte' ||
      finishRaw === 'satin' ||
      finishRaw === 'gloss' ||
      finishRaw === 'custom'
        ? (finishRaw as WrapFinish)
        : this.wrapFinish;

    if (color) this.wrapColor = color;
    if (tint !== null) this.wrapTint = clamp(tint, 0, 1);

    if (finish !== this.wrapFinish) {
      this.wrapFinish = finish;
      if (finish !== 'custom') {
        this.applyFinishPreset(finish);
      }
    }

    // Apply mode last so material caches exist.
    if (mode !== this.mode) {
      this.setMode(mode);
    }

    // Update cached wrap materials even if mode isn't wrap right now
    // so switching back is instant.
    this.refreshWrapMaterials();

    // Keep breadcrumbs current.
    ds.wrapShowroomMode = this.mode;
    ds.wrapShowroomWrapColor = `#${this.wrapColor.getHexString()}`;
    ds.wrapShowroomWrapTint = String(this.wrapTint);
    ds.wrapShowroomWrapFinish = this.wrapFinish;
  }

  private resolveModelUrl(): string {
    try {
      if (typeof window === 'undefined') return this.modelUrlDefault;
      const params = new URLSearchParams(window.location.search);
      const override = (params.get('wrapModel') || '').trim();
      if (!override) return this.modelUrlDefault;
      // If it's already absolute to the current origin, keep it.
      if (override.startsWith('http://') || override.startsWith('https://')) {
        return override;
      }
      // Normalize app base path for leading-slash inputs.
      if (override.startsWith('/')) return withBasePath(override);
      // Relative input -> treat as a path under base.
      return withBasePath(`/${override}`);
    } catch {
      return this.modelUrlDefault;
    }
  }

  private async loadGltfViaFetch(url: string): Promise<THREE.Object3D | null> {
    let res: Response | null = null;
    try {
      res = await fetch(url, { cache: 'no-store' });
    } catch {
      return null;
    }

    if (!res.ok) return null;

    const buffer = await res.arrayBuffer();
    const loader = new GLTFLoader();

    // Support common compression extensions seen in real-world assets.
    // Draco needs decoder files under /public/draco/gltf/.
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(withBasePath('/draco/gltf/'));
    loader.setDRACOLoader(dracoLoader);
    loader.setMeshoptDecoder(MeshoptDecoder);

    const base = THREE.LoaderUtils.extractUrlBase(url);

    return await new Promise((resolve, reject) => {
      loader.parse(
        buffer,
        base,
        gltf => {
          const root =
            gltf.scene ??
            (gltf as unknown as { scene: THREE.Object3D | undefined })?.scene;
          resolve(root ?? null);
        },
        err => reject(err)
      );
    });
  }

  private requestModel(): void {
    if (this.loadRequested) return;
    this.loadRequested = true;

    const url = this.resolveModelUrl();
    if (typeof document !== 'undefined') {
      const ds = document.documentElement.dataset;
      ds.wrapShowroomModelRequested = '1';
      ds.wrapShowroomModelUrl = url;
      ds.wrapShowroomModelLoaded = '0';
      ds.wrapShowroomModelMissing = '0';
      ds.wrapShowroomModelError = '0';
      ds.wrapShowroomModelErrorMessage = '';
    }

    void this.loadGltfViaFetch(url)
      .then(root => {
        if (!root) {
          this.loadError = true;
          if (typeof document !== 'undefined') {
            document.documentElement.dataset.wrapShowroomModelMissing = '1';
          }
          return;
        }

        this.loadError = false;
        if (typeof document !== 'undefined') {
          document.documentElement.dataset.wrapShowroomModelMissing = '0';
        }
        this.setLoadedModel(root);
      })
      .catch(err => {
        this.loadError = true;
        if (!this.loggedLoadError) {
          this.loggedLoadError = true;
          console.warn(
            `[WrapShowroomScene] Failed to load/parse model: ${url}`,
            err
          );
        }

        if (typeof document !== 'undefined') {
          document.documentElement.dataset.wrapShowroomModelError = '1';
          document.documentElement.dataset.wrapShowroomModelErrorMessage =
            err instanceof Error
              ? err.message
              : typeof err === 'string'
                ? err
                : 'unknown';
        }
      });
  }

  override dispose(): void {
    // Ensure cached derived materials are not leaked between scene swaps.
    // Restore original materials first so `super.dispose()` won't double-dispose.
    this.group.traverse(obj => {
      if (!(obj instanceof THREE.Mesh)) return;
      const saved = this.savedMaterials.get(obj.uuid);
      if (!saved) return;
      obj.material = saved.material;
    });

    const disposed = new Set<string>();

    const disposeMaterial = (material: THREE.Material) => {
      if (disposed.has(material.uuid)) return;
      disposed.add(material.uuid);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyMat = material as any;
      for (const key of Object.keys(anyMat)) {
        const value = anyMat[key];
        if (value instanceof THREE.Texture) {
          value.dispose();
        }
      }
      material.dispose();
    };

    const disposeMapped = (mapped: THREE.Material | THREE.Material[]) => {
      if (Array.isArray(mapped)) mapped.forEach(m => disposeMaterial(m));
      else disposeMaterial(mapped);
    };

    for (const mapped of this.glassMaterials.values()) disposeMapped(mapped);
    for (const mapped of this.wrapMaterials.values()) {
      if (Array.isArray(mapped))
        mapped.forEach(x => disposeMaterial(x.material));
      else disposeMaterial(mapped.material);
    }
    for (const mapped of this.wireframeMaterials.values()) {
      if (Array.isArray(mapped))
        mapped.forEach(x => disposeMaterial(x.material));
      else disposeMaterial(mapped.material);
    }

    this.savedMaterials.clear();
    this.glassMaterials.clear();
    this.wrapMaterials.clear();
    this.wireframeMaterials.clear();

    super.dispose();
  }

  private setLoadedModel(root: THREE.Object3D): void {
    // Clear any previous model.
    if (this.loadedRoot) {
      this.modelGroup.remove(this.loadedRoot);
    }
    this.loadedRoot = root;

    // Reset mode caches for a fresh model load.
    this.savedMaterials.clear();
    this.glassMaterials.clear();
    this.wrapMaterials.clear();
    this.wireframeMaterials.clear();

    // Normalize transform: center, ground, scale to a car-ish length.
    root.rotation.set(0, 0, 0);
    root.position.set(0, 0, 0);
    root.scale.set(1, 1, 1);

    // Heuristic: some models face +Z vs +X.
    const bbox0 = new THREE.Box3().setFromObject(root);
    const size0 = new THREE.Vector3();
    bbox0.getSize(size0);
    if (size0.z > size0.x) {
      root.rotation.y = Math.PI / 2;
    }

    const bbox = new THREE.Box3().setFromObject(root);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    root.position.sub(center);

    const size = new THREE.Vector3();
    bbox.getSize(size);
    const length = Math.max(size.x, size.z);

    // Target length ~4.6m (sports car). Keep within reasonable range.
    const targetLength = 4.6;
    const scale = length > 0.0001 ? targetLength / length : 1;
    root.scale.setScalar(scale);

    // Recompute after scaling for grounding.
    const bbox2 = new THREE.Box3().setFromObject(root);
    const min = bbox2.min;
    root.position.y -= min.y;

    // Compute final bounds for framing + contact shadow.
    const bbox3 = new THREE.Box3().setFromObject(root);
    const size3 = new THREE.Vector3();
    const center3 = new THREE.Vector3();
    bbox3.getSize(size3);
    bbox3.getCenter(center3);

    // Look-at around the upper-mid body so it reads like a showroom turntable.
    const lookAtY = clamp(size3.y * 0.48, 0.55, 0.95);
    this.modelLookAt.set(center3.x, lookAtY, center3.z);

    // Auto-scale the contact shadow to the model footprint.
    // Keep it a touch larger than the bbox so the edges fade naturally.
    const shadowX = clamp(size3.x * 1.15, 2.6, 9.0);
    const shadowZ = clamp(size3.z * 1.15, 1.3, 6.0);
    this.contactShadow.scale.set(shadowX, shadowZ, 1);

    const shadowMat = this.contactShadow.material;
    if (shadowMat instanceof THREE.MeshBasicMaterial) {
      shadowMat.opacity = clamp(0.92 - (size3.y - 1.25) * 0.08, 0.68, 0.92);
    }

    // Auto-fit studio lighting + shadow frustum to the model.
    // With the length normalized, this mostly improves tall/wide assets.
    const footprint = Math.max(size3.x, size3.z);
    const height = Math.max(0.001, size3.y);

    this.keyLight.target.position.copy(this.modelLookAt);
    this.fillLight.target.position.copy(this.modelLookAt);
    this.rimLight.target.position.copy(this.modelLookAt);
    this.topLight.target.position.copy(this.modelLookAt);

    const keyX = clamp(footprint * 1.15, 5.5, 10.0);
    const keyZ = clamp(footprint * 1.05, 5.0, 9.5);
    const keyY = clamp(height * 4.0 + 3.8, 8.5, 14.0);
    this.keyLight.position.set(keyX, keyY, keyZ);

    const fillX = -clamp(footprint * 1.35, 6.5, 12.0);
    const fillY = clamp(height * 3.2 + 2.4, 6.5, 12.5);
    const fillZ = clamp(footprint * 0.18, 0.6, 2.8);
    this.fillLight.position.set(fillX, fillY, fillZ);

    const rimX = -clamp(footprint * 0.95, 5.0, 10.5);
    const rimY = clamp(height * 3.0 + 2.0, 6.0, 12.0);
    const rimZ = -clamp(footprint * 1.45, 6.5, 13.5);
    this.rimLight.position.set(rimX, rimY, rimZ);

    const topY = clamp(height * 6.0 + 6.0, 12.0, 22.0);
    this.topLight.position.set(0, topY, 0);

    const shadowExtent = clamp(footprint * 0.95 + 1.25, 5.5, 12.5);
    this.keyLight.shadow.camera.left = -shadowExtent;
    this.keyLight.shadow.camera.right = shadowExtent;
    this.keyLight.shadow.camera.top = shadowExtent;
    this.keyLight.shadow.camera.bottom = -shadowExtent;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = clamp(26 + footprint * 6.0, 40, 75);
    this.keyLight.shadow.camera.updateProjectionMatrix();
    this.keyLight.shadow.needsUpdate = true;

    // Auto-fit camera distance / orbit height baseline.
    // Since we normalize length, this mostly accounts for unusually tall/wide models.
    const diag = Math.max(0.001, size3.length());
    this.baseDistance = clamp(diag * 1.35, 8.5, 16.0);
    this.orbitRadius = this.baseDistance;
    this.orbitRadiusTarget = this.baseDistance;
    this.orbitYBase = clamp(this.modelLookAt.y + size3.y * 0.35, 0.95, 1.55);

    // Configure meshes
    root.traverse(obj => {
      if (!(obj instanceof THREE.Mesh)) return;
      obj.castShadow = true;
      obj.receiveShadow = true;

      const material = obj.material;
      this.savedMaterials.set(obj.uuid, { material });

      const applyPbr = (m: THREE.Material) => {
        if (m instanceof THREE.MeshStandardMaterial) {
          m.metalness = clamp(m.metalness ?? 0.6, 0.25, 1);
          m.roughness = clamp(m.roughness ?? 0.35, 0.05, 0.85);
          const env = Number.isFinite(m.envMapIntensity)
            ? m.envMapIntensity
            : 1.0;
          m.envMapIntensity = clamp(env, 0.8, 2.2);
          m.needsUpdate = true;
        }
      };

      if (Array.isArray(material)) material.forEach(applyPbr);
      else applyPbr(material);
    });

    this.modelGroup.add(root);
    this.fallback.visible = false;
    this.contactShadow.visible = true;

    if (typeof document !== 'undefined') {
      document.documentElement.dataset.wrapShowroomModelLoaded = '1';
      document.documentElement.dataset.wrapShowroomModelError = '0';
    }

    // Start in the configured mode (defaults to wrap).
    this.setMode(this.mode, true);
  }

  private buildFallback(): THREE.Group {
    const g = new THREE.Group();

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 2.6, 0.35, 32),
      new THREE.MeshStandardMaterial({
        color: 0x0c1020,
        roughness: 0.85,
        metalness: 0.05,
      })
    );
    pedestal.position.y = 0.175;
    pedestal.receiveShadow = true;
    g.add(pedestal);

    const silhouette = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 1.1, 1.55),
      new THREE.MeshStandardMaterial({
        color: 0x111a33,
        roughness: 0.55,
        metalness: 0.2,
        emissive: new THREE.Color(0x02060f),
      })
    );
    silhouette.position.y = 0.85;
    silhouette.castShadow = true;
    g.add(silhouette);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.1, 0.04, 12, 96),
      new THREE.MeshStandardMaterial({
        color: 0x66aaff,
        roughness: 0.25,
        metalness: 0.8,
        emissive: new THREE.Color(0x0a1228),
        emissiveIntensity: 0.8,
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.02;
    g.add(ring);

    return g;
  }

  private setMode(mode: MaterialMode, immediate = false): void {
    if (mode === this.mode && !immediate) return;

    this.mode = mode;
    this.lastModeSwitchTime = this.time;

    if (typeof document !== 'undefined') {
      document.documentElement.dataset.wrapShowroomMode = mode;
    }

    if (!this.loadedRoot) return;

    const isWrapCandidate = (mesh: THREE.Mesh, material: THREE.Material) => {
      // Heuristic: apply wrap to likely body paint meshes.
      const name = `${mesh.name} ${material.name}`.toLowerCase();
      return /body|paint|carpaint|exterior|shell|panel|hood|door|bumper/.test(
        name
      );
    };

    const wrapColor = this.wrapColor;

    this.loadedRoot.traverse(obj => {
      if (!(obj instanceof THREE.Mesh)) return;

      const saved = this.savedMaterials.get(obj.uuid);
      if (!saved) return;

      if (mode === 'wrap') {
        const cached = this.wrapMaterials.get(obj.uuid);
        if (cached) {
          obj.material = Array.isArray(cached)
            ? cached.map(x => x.material)
            : cached.material;
          return;
        }

        const toWrap = (m: THREE.Material): WrapMaterialState => {
          const baseColor =
            m instanceof THREE.MeshStandardMaterial
              ? m.color.clone()
              : new THREE.Color(0xffffff);

          if (!isWrapCandidate(obj, m)) {
            // Not a body panel: keep original material.
            return { material: m, baseColor };
          }

          const physSrc =
            m instanceof THREE.MeshPhysicalMaterial
              ? m
              : m instanceof THREE.MeshStandardMaterial
                ? m
                : null;

          const phys = new THREE.MeshPhysicalMaterial({
            color: baseColor.clone().lerp(wrapColor, this.wrapTint),
            roughness: this.wrapRoughness,
            metalness: this.wrapMetalness,
            clearcoat: this.wrapClearcoat,
            clearcoatRoughness: this.wrapClearcoatRoughness,
            envMapIntensity:
              physSrc && Number.isFinite(physSrc.envMapIntensity)
                ? clamp(physSrc.envMapIntensity, 0.9, 2.4)
                : 1.6,
          });

          if (physSrc) {
            phys.map = physSrc.map;
            phys.normalMap = physSrc.normalMap;
            phys.normalScale =
              physSrc.normalScale?.clone() ?? new THREE.Vector2(1, 1);
            phys.roughnessMap = physSrc.roughnessMap;
            phys.metalnessMap = physSrc.metalnessMap;
            phys.aoMap = physSrc.aoMap;
            phys.aoMapIntensity = physSrc.aoMapIntensity;
            phys.emissiveMap = physSrc.emissiveMap;
            phys.emissive =
              physSrc.emissive?.clone() ?? new THREE.Color(0x000000);
            phys.emissiveIntensity = physSrc.emissiveIntensity;
            phys.side = physSrc.side;
          }

          phys.needsUpdate = true;
          return { material: phys, baseColor };
        };

        const mapped = Array.isArray(saved.material)
          ? saved.material.map(toWrap)
          : toWrap(saved.material);

        this.wrapMaterials.set(obj.uuid, mapped);
        obj.material = Array.isArray(mapped)
          ? mapped.map(x => x.material)
          : mapped.material;
        return;
      }

      if (mode === 'wireframe') {
        const cached = this.wireframeMaterials.get(obj.uuid);
        if (cached) {
          obj.material = Array.isArray(cached)
            ? cached.map(x => x.material)
            : cached.material;
          return;
        }

        const toWire = (m: THREE.Material): WireframeMaterialState => {
          const side =
            m instanceof THREE.Material
              ? (m as THREE.Material).side
              : undefined;
          const wf = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            wireframe: true,
            transparent: false,
            opacity: 1,
            side,
          });
          wf.needsUpdate = true;
          return { material: wf };
        };

        const mapped = Array.isArray(saved.material)
          ? saved.material.map(toWire)
          : toWire(saved.material);
        this.wireframeMaterials.set(obj.uuid, mapped);
        obj.material = Array.isArray(mapped)
          ? mapped.map(x => x.material)
          : mapped.material;
        return;
      }

      // Glass mode: clone into a physical material so it reads like a studio concept.
      if (mode === 'glass') {
        const cached = this.glassMaterials.get(obj.uuid);
        if (cached) {
          obj.material = cached;
          return;
        }

        const toGlass = (m: THREE.Material): THREE.Material => {
          const baseColor =
            m instanceof THREE.MeshStandardMaterial
              ? m.color.clone()
              : new THREE.Color(0xffffff);
          const phys = new THREE.MeshPhysicalMaterial({
            color: baseColor,
            roughness: 0.06,
            metalness: 0.0,
            transmission: 1.0,
            thickness: 0.25,
            ior: 1.45,
            envMapIntensity: 2.0,
            clearcoat: 0.9,
            clearcoatRoughness: 0.06,
            transparent: true,
            opacity: 0.22,
          });
          phys.needsUpdate = true;
          return phys;
        };

        const mapped = Array.isArray(saved.material)
          ? saved.material.map(toGlass)
          : toGlass(saved.material);

        this.glassMaterials.set(obj.uuid, mapped);
        obj.material = mapped;
      }
    });
  }

  update(ctx: SceneRuntime) {
    this.time = ctx.time;

    // Apply any showroom panel overrides.
    this.syncSettingsFromUiDataset();

    const coarse = ctx.caps.coarsePointer;

    // Tap cycles material presentation (wrap -> wireframe -> glass).
    // Guard against accidental mode flips while orbiting.
    const interaction = clamp(
      Math.abs(ctx.pointerVelocity.x) + Math.abs(ctx.pointerVelocity.y),
      0,
      1
    );
    const isLikelyTap = interaction < (coarse ? 0.16 : 0.12) && ctx.press < 0.2;
    if (
      ctx.tap > 0.85 &&
      isLikelyTap &&
      this.time - this.lastModeSwitchTime > this.tapDebounce
    ) {
      const doubleTap = this.time - this.lastTapTime < (coarse ? 0.38 : 0.32);
      this.lastTapTime = this.time;

      if (doubleTap) {
        // Soft reset: recenters orbit targets without snapping.
        this.softResetTime = this.time;
        this.orbitYawTarget = 0;
        this.orbitPitchTarget = 0.12;
        this.autoSpin = 0;
      } else {
        const next: MaterialMode =
          this.mode === 'wrap'
            ? 'wireframe'
            : this.mode === 'wireframe'
              ? 'glass'
              : 'wrap';
        this.setMode(next);
      }
    }

    // Camera orbit: pointer influences yaw/pitch; press zooms slightly.
    const rotateGain = (coarse ? 0.95 : 0.75) * lerp(0.55, 1.15, ctx.press);
    const pitchGain = (coarse ? 0.85 : 0.65) * lerp(0.6, 1.15, ctx.press);

    // Clamp velocity influence so very fast moves don't overshoot.
    const vx = clamp(ctx.pointerVelocity.x, -1.2, 1.2);
    const vy = clamp(ctx.pointerVelocity.y, -1.2, 1.2);

    this.orbitYawTarget += vx * rotateGain * ctx.dt;
    this.orbitPitchTarget -= vy * pitchGain * ctx.dt;
    this.orbitPitchTarget = clamp(this.orbitPitchTarget, -0.22, 0.38);

    // Gentle auto spin when idle.
    const engagement = clamp(interaction * 1.45 + ctx.press * 0.9, 0, 1);
    this.autoSpin += ctx.dt * 0.18 * (1 - engagement);

    // Extra smoothing right after a soft reset.
    const resetBoost = clamp(1 - (this.time - this.softResetTime) / 0.6, 0, 1);
    const orbitLambda = lerp(6.5, 9.5, resetBoost);
    this.orbitYaw = damp(
      this.orbitYaw,
      this.orbitYawTarget,
      orbitLambda,
      ctx.dt
    );
    this.orbitPitch = damp(
      this.orbitPitch,
      this.orbitPitchTarget,
      orbitLambda,
      ctx.dt
    );

    // Combined zoom: wheel/pinch (ctx.zoom) for fine tuning + press for a small cinematic push-in.
    const zoom01 = clamp(ctx.zoom ?? 0, 0, 1);
    // Shape the curve so the mid-range has finer control.
    const zoomShaped = smoothstep01(Math.pow(zoom01, 1.1));
    const wheelFactor = 1.06 - 0.62 * zoomShaped; // 0 -> wider, 1 -> tighter
    const pressFactor = 1 - 0.18 * clamp(ctx.press, 0, 1);
    this.orbitRadiusTarget = this.baseDistance * wheelFactor * pressFactor;
    this.orbitRadius = damp(
      this.orbitRadius,
      this.orbitRadiusTarget,
      coarse ? 5.2 : 6.2,
      ctx.dt
    );

    const yaw = this.orbitYaw + this.autoSpin;
    const pitch = this.orbitPitch;

    const y = this.orbitYBase + pitch * 1.2;
    const r = this.orbitRadius;
    this.camera.position.set(Math.sin(yaw) * r, y, Math.cos(yaw) * r);
    this.camera.lookAt(this.modelLookAt);

    // Subtle lighting drift to avoid a dead showroom.
    const breathe = 0.6 + 0.4 * Math.sin(ctx.time * 0.6);
    this.keyLight.intensity = 2.75 + 0.22 * breathe;
    this.rimLight.intensity = 1.05 + 0.16 * (1 - breathe);
    // Keep highlights flattering as the camera orbits.
    this.keyLight.position.x = 7 + Math.sin(yaw) * 0.45;
    this.keyLight.position.z = 6 + Math.cos(yaw) * 0.45;

    // Ground response per mode (subtle: just enough to feel premium).
    const targetRoughness =
      this.mode === 'glass' ? 0.22 : this.mode === 'wireframe' ? 0.65 : 0.5;
    const targetMetalness = this.mode === 'glass' ? 0.06 : 0.02;
    this.groundMat.roughness = damp(
      this.groundMat.roughness,
      targetRoughness,
      3.5,
      ctx.dt
    );

    // Contact shadow: slightly lighter when pulled back, denser up close.
    const shadowMat = this.contactShadow.material;
    if (shadowMat instanceof THREE.MeshBasicMaterial) {
      const close01 = clamp((this.baseDistance - this.orbitRadius) / 6.5, 0, 1);
      const targetOpacity =
        this.loadedRoot && !this.loadError ? lerp(0.62, 0.9, close01) : 0.0;
      shadowMat.opacity = damp(shadowMat.opacity, targetOpacity, 4.0, ctx.dt);
      shadowMat.needsUpdate = true;
      this.contactShadow.visible = shadowMat.opacity > 0.01;
    }
    this.groundMat.metalness = damp(
      this.groundMat.metalness,
      targetMetalness,
      3.5,
      ctx.dt
    );

    // If the asset is missing, keep the fallback animated.
    if (!this.loadedRoot) {
      this.fallback.rotation.y = ctx.time * 0.25;
    } else {
      // Turntable: very slow, but pause in wireframe for readability.
      const spin = this.mode === 'wireframe' ? 0.0 : 0.22;
      this.modelGroup.rotation.y = damp(
        this.modelGroup.rotation.y,
        ctx.time * spin,
        2.2,
        ctx.dt
      );
    }

    // If we failed to load (404), we keep fallback; contact shadow is handled above.
  }
}
