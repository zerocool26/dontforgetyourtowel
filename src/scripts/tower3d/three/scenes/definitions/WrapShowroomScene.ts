import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SceneBase } from './SceneBase';
import type { SceneRuntime } from './types';
import { damp } from './SceneUtils';
import { withBasePath } from '../../../../../utils/url';

type MaterialMode = 'wrap' | 'wireframe' | 'glass';

type SavedMaterialState = {
  material: THREE.Material | THREE.Material[];
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

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
 * Scene 18: Wrap Showroom
 *
 * This chapter is meant to showcase a realistic GLB car model with a clean
 * studio rig, contact shadow, and interactive material presentation modes.
 *
 * IMPORTANT: This repo does not download or ship third-party car models for you.
 * Place a model you have rights to use here:
 * - /public/models/wrap-showroom.glb
 */
export class WrapShowroomScene extends SceneBase {
  private readonly modelUrl = withBasePath('/models/wrap-showroom.glb');

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

  private savedMaterials = new Map<string, SavedMaterialState>();
  private glassMaterials = new Map<string, THREE.Material | THREE.Material[]>();

  private loadedRoot: THREE.Object3D | null = null;
  private loadRequested = false;
  private loadError = false;

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

  constructor() {
    super();
    this.id = 'scene18';
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

    const amb = new THREE.AmbientLight(0xffffff, 0.25);
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

    // Kick model load.
    this.requestModel();

    // Pre-layout.
    this.resize(ctx);
  }

  private requestModel(): void {
    if (this.loadRequested) return;
    this.loadRequested = true;

    const loader = new GLTFLoader();
    loader
      .loadAsync(this.modelUrl)
      .then(gltf => {
        const root =
          gltf.scene ?? (gltf as unknown as { scene: THREE.Object3D })?.scene;
        if (!root) throw new Error('GLTF missing scene');

        this.loadError = false;
        this.setLoadedModel(root);
      })
      .catch(() => {
        // Missing asset is normal; keep fallback.
        this.loadError = true;
      });
  }

  private setLoadedModel(root: THREE.Object3D): void {
    // Clear any previous model.
    if (this.loadedRoot) {
      this.modelGroup.remove(this.loadedRoot);
    }
    this.loadedRoot = root;

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

    // Start in wrap mode.
    this.setMode('wrap', true);
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

    if (!this.loadedRoot) return;

    this.loadedRoot.traverse(obj => {
      if (!(obj instanceof THREE.Mesh)) return;

      const saved = this.savedMaterials.get(obj.uuid);
      if (!saved) return;

      if (mode === 'wrap') {
        // Restore original materials.
        obj.material = saved.material;

        const apply = (m: THREE.Material) => {
          if (m instanceof THREE.MeshStandardMaterial) {
            m.wireframe = false;
            m.transparent = false;
            m.opacity = 1;
            if (m instanceof THREE.MeshPhysicalMaterial) {
              m.transmission = 0;
              m.thickness = 0;
            }
            m.needsUpdate = true;
          }
        };

        if (Array.isArray(obj.material)) obj.material.forEach(apply);
        else apply(obj.material);
        return;
      }

      if (mode === 'wireframe') {
        obj.material = saved.material;

        const apply = (m: THREE.Material) => {
          if (m instanceof THREE.MeshStandardMaterial) {
            m.wireframe = true;
            m.transparent = false;
            m.opacity = 1;
            m.color.set(0xffffff);
            m.needsUpdate = true;
          }
        };

        if (Array.isArray(obj.material)) obj.material.forEach(apply);
        else apply(obj.material);
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

    // Tap cycles material presentation (wrap -> wireframe -> glass)
    if (ctx.tap > 0.85 && this.time - this.lastModeSwitchTime > 0.25) {
      const next: MaterialMode =
        this.mode === 'wrap'
          ? 'wireframe'
          : this.mode === 'wireframe'
            ? 'glass'
            : 'wrap';
      this.setMode(next);
    }

    // Camera orbit: pointer influences yaw/pitch; press zooms slightly.
    const interaction = clamp(
      Math.abs(ctx.pointerVelocity.x) + Math.abs(ctx.pointerVelocity.y),
      0,
      1
    );

    this.orbitYawTarget += ctx.pointerVelocity.x * 0.9 * ctx.dt;
    this.orbitPitchTarget -= ctx.pointerVelocity.y * 0.7 * ctx.dt;
    this.orbitPitchTarget = clamp(this.orbitPitchTarget, -0.22, 0.38);

    // Gentle auto spin when idle.
    this.autoSpin += ctx.dt * 0.18 * (1 - clamp(interaction * 1.6, 0, 1));

    this.orbitYaw = damp(this.orbitYaw, this.orbitYawTarget, 6.5, ctx.dt);
    this.orbitPitch = damp(this.orbitPitch, this.orbitPitchTarget, 6.5, ctx.dt);

    const zoom = 1 - 0.18 * clamp(ctx.press, 0, 1);
    this.orbitRadiusTarget = this.baseDistance * zoom;
    this.orbitRadius = damp(
      this.orbitRadius,
      this.orbitRadiusTarget,
      6.0,
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
    this.keyLight.intensity = 2.85 + 0.2 * breathe;
    this.rimLight.intensity = 1.1 + 0.15 * (1 - breathe);

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

    // If we failed to load (404), we keep fallback.
    if (this.loadError) {
      this.contactShadow.visible = false;
    }
  }
}
