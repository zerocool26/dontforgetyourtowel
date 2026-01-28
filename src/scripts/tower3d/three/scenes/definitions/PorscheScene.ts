import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SceneBase } from './SceneBase';
import type { SceneRuntime } from './types';
import { damp } from './SceneUtils';
import { withBasePath } from '../../../../../utils/url';

/**
 * Scene 17: Cyber Porsche GT3 RS (High Fidelity)
 * Upgraded to support a real glTF/GLB Porsche model (recommended) while keeping
 * a procedural fallback so the chapter still renders without external assets.
 *
 * To use a real car model:
 * - Place a licensed/free-to-use GLB at: /public/models/porsche-911-gt3rs.glb
 * - Ensure the model license allows redistribution/usage in this project.
 */
export class PorscheScene extends SceneBase {
  private carGroup: THREE.Group;
  private modelGroup: THREE.Group;
  private usingExternalModel = false;
  private modelRequested = false;
  private modelLoadToken = 0;
  private readonly modelUrl = withBasePath('/models/porsche-911-gt3rs.glb');

  private contactShadow: THREE.Mesh | null = null;
  private externalWheels: Array<{
    steerGroup: THREE.Group | null;
    wheelObject: THREE.Object3D;
    spinAxis: THREE.Vector3;
    isFront: boolean;
  }> = [];

  private wheels: THREE.Group[] = [];
  private grid: THREE.GridHelper;
  private speed = 0;
  private time = 0;

  private ground: THREE.Mesh;
  private keyLight: THREE.DirectionalLight;
  private fillLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;

  constructor() {
    super();
    this.id = 'scene17';
    this.contentRadius = 8.0;
    this.baseDistance = 9.0;

    // --- Container ---
    this.carGroup = new THREE.Group();
    this.carGroup.position.y = 0.33; // Ride height adjustment
    this.group.add(this.carGroup);

    // External model container (kept separate so we can hide procedural parts when loaded).
    this.modelGroup = new THREE.Group();
    this.carGroup.add(this.modelGroup);

    // --- Materials ---
    const paintMat = new THREE.MeshPhysicalMaterial({
      color: 0xc0c0c0, // GT Silver
      metalness: 0.7,
      roughness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      sheen: 0.5,
      sheenColor: 0xffffff,
    });

    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.6,
      metalness: 0.3,
      bumpScale: 0.02,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x111111,
      metalness: 0.9,
      roughness: 0.05,
      transmission: 0.2, // Tinted privacy glass
      transparent: true,
    });

    const rubberMat = new THREE.MeshStandardMaterial({
      color: 0x080808,
      roughness: 0.9,
      metalness: 0.1,
    });

    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x882222, // Pyro Red (roughly)
      metalness: 0.8,
      roughness: 0.2,
    });

    const glowMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.8,
    });

    // ==========================================
    // 1. CHASSIS (CENTRAL FUSELAGE)
    // ==========================================
    // modeled side profile using Bezier curves for the "Flyline"
    // Dimensions: Length ~4.6m, Height ~1.3m (from ground)

    const bodyShape = new THREE.Shape();
    // Start Front Bottom (Splitter area)
    const noseX = 2.3;
    const tailX = -2.3;
    const groundY = 0.05; // Relative to carGroup

    bodyShape.moveTo(noseX - 0.1, groundY);

    // Nose / Bumper
    bodyShape.lineTo(noseX, 0.4);
    // Hood Line (Low and sleek)
    bodyShape.bezierCurveTo(noseX - 0.5, 0.6, 1.0, 0.75, 0.8, 0.85); // Windshield Base

    // Roof Line (The FLYLINE)
    // Peak around x=-0.2 (driver position)
    bodyShape.bezierCurveTo(0.2, 1.35, -1.0, 1.32, -1.8, 0.9); // Rear window slope

    // Ducktail / Spoiler Base
    bodyShape.lineTo(tailX + 0.3, 0.85);
    bodyShape.lineTo(tailX, 0.7); // Rear vertical face top
    bodyShape.lineTo(tailX + 0.1, 0.25); // Rear vertical face bottom

    // Diffuser / Underbody
    bodyShape.lineTo(tailX + 0.3, 0.1);
    bodyShape.lineTo(noseX - 0.2, 0.1); // Under tray

    const extrudeSettings = {
      steps: 4,
      depth: 1.4, // Central width
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 5, // Smooth edges
    };

    const chassisGeo = new THREE.ExtrudeGeometry(bodyShape, extrudeSettings);
    chassisGeo.center(); // Center the geometry geometry-wise
    chassisGeo.translate(0, 0.6, 0); // Lift back up

    // We need to slim the roof compared to the body (Tumblehome)
    // Since Extrude produces a prismatic shape, this is hard.
    // Instead we rely on the Fenders to provide the width at the bottom,
    // and this extrusion represents the cabin + main core.

    const chassis = new THREE.Mesh(chassisGeo, paintMat);
    // Narrower width for the cabin
    chassis.scale.z = 0.85;
    this.carGroup.add(chassis);

    // ==========================================
    // 2. WIDE FENDERS (The Muscle)
    // ==========================================
    // Use smoothed scaling capsules/spheres to create organic flared arches

    const fenderGeo = new THREE.CapsuleGeometry(0.55, 1.2, 4, 16);
    // Rotate to lay along the length of car
    fenderGeo.rotateZ(Math.PI / 2);

    const fFenderScale = new THREE.Vector3(1.0, 0.6, 0.6); // Flattened vertically and width-wise
    const rFenderScale = new THREE.Vector3(1.2, 0.75, 0.8); // Rear is wider/beefier

    // Front Left
    const fl = new THREE.Mesh(fenderGeo, paintMat);
    fl.scale.copy(fFenderScale);
    fl.position.set(1.45, 0.55, 0.75);
    // Twist slightly to follow body lines
    fl.rotation.y = -0.1;
    this.carGroup.add(fl);

    // Front Right
    const fr = new THREE.Mesh(fenderGeo, paintMat);
    fr.scale.copy(fFenderScale);
    fr.position.set(1.45, 0.55, -0.75);
    fr.rotation.y = 0.1;
    this.carGroup.add(fr);

    // Rear Left (The Hips)
    const rl = new THREE.Mesh(fenderGeo, paintMat);
    rl.scale.copy(rFenderScale);
    rl.position.set(-1.45, 0.7, 0.85);
    rl.rotation.y = 0.05;
    rl.rotation.z = -0.05; // Rake
    this.carGroup.add(rl);

    // Rear Right
    const rr = new THREE.Mesh(fenderGeo, paintMat);
    rr.scale.copy(rFenderScale);
    rr.position.set(-1.45, 0.7, -0.85);
    rr.rotation.y = -0.05;
    rr.rotation.z = -0.05;
    this.carGroup.add(rr);

    // ==========================================
    // 3. SWAN NECK WING
    // ==========================================

    // The Wing Blade
    const wingShape = new THREE.Shape();
    // Airfoil profile
    wingShape.moveTo(0, 0);
    wingShape.bezierCurveTo(0.1, 0.08, 0.4, 0.08, 0.5, 0.02); // Top surface
    wingShape.lineTo(0.5, 0.0);
    wingShape.bezierCurveTo(0.4, -0.02, 0.1, -0.02, 0, 0); // Bottom surface

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
      depth: 2.0,
      bevelEnabled: false,
    });
    wingGeo.rotateY(Math.PI / 2);
    wingGeo.center();

    const wing = new THREE.Mesh(wingGeo, carbonMat);
    wing.position.set(-2.1, 1.55, 0);
    wing.scale.set(1.5, 1.5, 1.0); // Make chord length bigger
    wing.rotation.z = -0.15; // Aggressive Angle of Attack
    this.carGroup.add(wing);

    // Swan Neck Struts (Coming from rear deck up and OVER)
    const strutCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.6, 0.9, 0), // Base on engine cover
      new THREE.Vector3(-1.8, 1.4, 0), // Going up/back
      new THREE.Vector3(-2.0, 1.65, 0), // Over the top
      new THREE.Vector3(-2.1, 1.55, 0), // Connecting to top of wing @ screw point
    ]);

    const strutGeo = new THREE.TubeGeometry(strutCurve, 20, 0.03, 8, false);

    const strutL = new THREE.Mesh(strutGeo, carbonMat);
    strutL.position.z = 0.4;
    this.carGroup.add(strutL);

    const strutR = new THREE.Mesh(strutGeo, carbonMat);
    strutR.position.z = -0.4;
    this.carGroup.add(strutR);

    // Wing Endplates
    const endplateGeo = new THREE.BoxGeometry(0.6, 0.4, 0.02);
    const endplateL = new THREE.Mesh(endplateGeo, carbonMat);
    endplateL.position.set(-2.1, 1.5, 1.0);
    this.carGroup.add(endplateL);

    const endplateR = new THREE.Mesh(endplateGeo, carbonMat);
    endplateR.position.set(-2.1, 1.5, -1.0);
    this.carGroup.add(endplateR);

    // ==========================================
    // 4. WHEELS
    // ==========================================

    // Wheelbase ~2.45m
    const frontAxleZ = 1.45;
    const rearAxleZ = -1.45;
    const trackWidth = 0.9;

    const createWheel = (isRear: boolean) => {
      const radius = isRear ? 0.36 : 0.34;
      const width = isRear ? 0.35 : 0.3;

      const group = new THREE.Group();

      // Tire
      const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 24);
      tireGeo.rotateZ(Math.PI / 2);
      const tire = new THREE.Mesh(tireGeo, rubberMat);
      group.add(tire);

      // Rim (Multi-spoke)
      const rimGeo = new THREE.CylinderGeometry(
        radius * 0.7,
        radius * 0.7,
        width * 0.6,
        16
      );
      rimGeo.rotateZ(Math.PI / 2);
      const rim = new THREE.Mesh(rimGeo, rimMat);

      // Spokes (Texture simulated by geometry)
      const spokeGeo = new THREE.BoxGeometry(radius * 1.2, width * 0.7, 0.05);
      const s1 = new THREE.Mesh(spokeGeo, rimMat);
      s1.rotation.y = 0; // vertical
      const s2 = new THREE.Mesh(spokeGeo, rimMat);
      s2.rotation.x = Math.PI / 2; // horizontal
      rim.add(s1);
      rim.add(s2);

      group.add(rim);

      return group;
    };

    const wheelsConfig = [
      { x: frontAxleZ, z: trackWidth, rear: false },
      { x: frontAxleZ, z: -trackWidth, rear: false },
      { x: rearAxleZ, z: trackWidth + 0.05, rear: true }, // Wider rear track
      { x: rearAxleZ, z: -(trackWidth + 0.05), rear: true },
    ];

    wheelsConfig.forEach(cfg => {
      const w = createWheel(cfg.rear);
      w.position.set(cfg.x, 0.34, cfg.z); // Radius height
      this.carGroup.add(w);
      this.wheels.push(w);
    });

    // ==========================================
    // 5. LIGHTS & DETAILS
    // ==========================================

    // Headlights - Oval/Tilted
    const hlGeo = new THREE.SphereGeometry(0.18, 16, 16);
    // Flatten and tilt
    const hlL = new THREE.Mesh(hlGeo, glassMat);
    hlL.scale.set(1.0, 0.7, 1.2);
    hlL.position.set(1.95, 0.65, 0.65);
    hlL.rotation.x = -0.3;
    hlL.rotation.y = -0.2;
    this.carGroup.add(hlL);

    const hlR = hlL.clone();
    hlR.position.set(1.95, 0.65, -0.65);
    hlR.rotation.y = 0.2;
    this.carGroup.add(hlR);

    // Light Interior (The Lens)
    const lensGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const lensL = new THREE.Mesh(lensGeo, headlightMat);
    lensL.position.copy(hlL.position);
    lensL.position.x -= 0.05; // Inside glass
    this.carGroup.add(lensL);

    const lensR = new THREE.Mesh(lensGeo, headlightMat);
    lensR.position.copy(hlR.position);
    lensR.position.x -= 0.05;
    this.carGroup.add(lensR);

    // Rear Light Bar (Continuous Strip)
    const barGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 12);
    barGeo.rotateX(Math.PI / 2); // Lay flat
    // barGeo now along Z

    // Curve the bar? (Segments approach)
    // Simple straight bar for now to reduce vertex cost, placed in cutout
    const bar = new THREE.Mesh(barGeo, glowMat);
    bar.position.set(-2.25, 0.8, 0);
    this.carGroup.add(bar);

    // Side Mirrors
    const mirGeo = new THREE.BoxGeometry(0.15, 0.1, 0.25);
    const mirL = new THREE.Mesh(mirGeo, carbonMat);
    mirL.position.set(0.6, 0.95, 0.95);
    this.carGroup.add(mirL);

    const mirR = new THREE.Mesh(mirGeo, carbonMat);
    mirR.position.set(0.6, 0.95, -0.95);
    this.carGroup.add(mirR);

    // ==========================================
    // ENVIRONMENT
    // ==========================================
    // Studio floor (more realistic than the infinite grid).
    const groundGeo = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x05060b,
      roughness: 0.35,
      metalness: 0.0,
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = 0;
    this.ground.receiveShadow = true;
    this.group.add(this.ground);

    // Contact shadow blob (helps realism even on low shadow quality).
    // Avoid SSR assumptions: only build texture when DOM exists.
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const g = canvas.getContext('2d');
      if (g) {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const r = canvas.width * 0.48;
        const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0.0, 'rgba(0,0,0,0.65)');
        grad.addColorStop(0.35, 'rgba(0,0,0,0.35)');
        grad.addColorStop(1.0, 'rgba(0,0,0,0.0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, canvas.width, canvas.height);

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.needsUpdate = true;

        const blobMat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
          blending: THREE.MultiplyBlending,
        });
        const blobGeo = new THREE.PlaneGeometry(1, 1);
        this.contactShadow = new THREE.Mesh(blobGeo, blobMat);
        this.contactShadow.rotation.x = -Math.PI / 2;
        this.contactShadow.position.y = 0.002;
        this.contactShadow.scale.set(5.0, 2.6, 1);
        this.contactShadow.visible = false;
        this.group.add(this.contactShadow);
      }
    }

    // Debug grid (kept off by default).
    this.grid = new THREE.GridHelper(60, 60, 0x222233, 0x0f1020);
    this.grid.visible = false;
    this.group.add(this.grid);

    // Lighting: key + fill + rim with shadows for proper form.
    this.keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    this.keyLight.position.set(6, 9, 5);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 40;
    this.keyLight.shadow.camera.left = -12;
    this.keyLight.shadow.camera.right = 12;
    this.keyLight.shadow.camera.top = 12;
    this.keyLight.shadow.camera.bottom = -12;
    this.group.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight(0xbad0ff, 1.0);
    this.fillLight.position.set(-6, 6, 8);
    this.group.add(this.fillLight);

    this.rimLight = new THREE.DirectionalLight(0xffe0c8, 1.4);
    this.rimLight.position.set(-2, 7, -8);
    this.group.add(this.rimLight);

    // Ensure the procedural meshes cast/receive shadows (helps even without external model).
    this.carGroup.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    // Slightly darker background for a studio feel.
    this.bg = new THREE.Color(0x02030b);
  }

  init(_ctx: SceneRuntime) {
    // Attempt to load a realistic external model if present.
    this.requestExternalModel();
  }

  private requestExternalModel(): void {
    if (this.modelRequested) return;
    this.modelRequested = true;

    const loadToken = ++this.modelLoadToken;
    const loader = new GLTFLoader();

    loader
      .loadAsync(this.modelUrl)
      .then(gltf => {
        if (loadToken !== this.modelLoadToken) return;

        const root =
          gltf.scene ?? (gltf as unknown as { scene: THREE.Object3D })?.scene;
        if (!root) return;

        // Hide procedural content, keep it for disposal.
        for (const child of this.carGroup.children) {
          if (child !== this.modelGroup) child.visible = false;
        }

        // Prepare the model for lighting/shadows.
        root.traverse(obj => {
          if (obj instanceof THREE.Mesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;

            // Encourage physically-plausible shading (without trampling authored looks).
            const mats = Array.isArray(obj.material)
              ? obj.material
              : [obj.material];
            for (const mat of mats) {
              if (
                mat instanceof THREE.MeshStandardMaterial ||
                mat instanceof THREE.MeshPhysicalMaterial
              ) {
                mat.envMapIntensity = Math.max(1.1, mat.envMapIntensity ?? 1.0);
                mat.roughness = THREE.MathUtils.clamp(
                  mat.roughness ?? 0.5,
                  0.03,
                  0.95
                );
                mat.metalness = THREE.MathUtils.clamp(
                  mat.metalness ?? 0.0,
                  0.0,
                  1.0
                );

                const key = `${obj.name} ${mat.name}`.toLowerCase();
                if (
                  key.includes('glass') ||
                  key.includes('window') ||
                  key.includes('windscreen')
                ) {
                  if (mat instanceof THREE.MeshPhysicalMaterial) {
                    mat.transmission = Math.max(mat.transmission ?? 0.0, 0.35);
                    mat.ior = mat.ior ?? 1.45;
                    mat.thickness = mat.thickness ?? 0.02;
                    mat.roughness = Math.min(mat.roughness, 0.2);
                    mat.metalness = Math.min(mat.metalness, 0.2);
                    mat.transparent = true;
                  }
                }

                if (mat instanceof THREE.MeshPhysicalMaterial) {
                  mat.clearcoat = Math.max(mat.clearcoat ?? 0.0, 0.2);
                  mat.clearcoatRoughness = THREE.MathUtils.clamp(
                    mat.clearcoatRoughness ?? 0.08,
                    0.02,
                    0.35
                  );
                }

                mat.needsUpdate = true;
              }
            }
          }
        });

        // Normalize orientation/scale to our scene units.
        // Many car models are authored with +Z forward; we prefer +X forward.
        const bbox0 = new THREE.Box3().setFromObject(root);
        const size0 = new THREE.Vector3();
        bbox0.getSize(size0);
        if (size0.z > size0.x) {
          root.rotation.y = Math.PI / 2;
        }

        const bbox = new THREE.Box3().setFromObject(root);
        const size = new THREE.Vector3();
        bbox.getSize(size);

        const length = Math.max(size.x, size.z);
        const targetLength = 4.57; // ~992 911 GT3/GT3 RS overall length (meters-ish)
        const scale = length > 0.0001 ? targetLength / length : 1;
        root.scale.setScalar(scale);

        // Recompute after scaling/orientation and place on ground.
        const bbox2 = new THREE.Box3().setFromObject(root);
        const center = new THREE.Vector3();
        const min = new THREE.Vector3();
        bbox2.getCenter(center);
        min.copy(bbox2.min);

        const size2 = new THREE.Vector3();
        bbox2.getSize(size2);

        // Center in X/Z; sit on ground.
        root.position.x -= center.x;
        root.position.z -= center.z;
        root.position.y -= min.y;

        // If we have a contact-shadow blob, size it to the car footprint.
        if (this.contactShadow) {
          this.contactShadow.visible = true;
          const sx = THREE.MathUtils.clamp(size2.x * 1.15, 2.2, 6.2);
          const sz = THREE.MathUtils.clamp(size2.z * 1.05, 1.4, 3.8);
          // PlaneGeometry is (width,height) but we rotate it into XZ, so map to (x,z).
          this.contactShadow.scale.set(sx, sz, 1);
        }

        // Heuristic wheel detection for imported models.
        // We wrap detected wheel objects into a steering group so we can steer + spin separately.
        this.externalWheels = [];
        const candidates: Array<{
          obj: THREE.Object3D;
          center: THREE.Vector3;
          size: THREE.Vector3;
        }> = [];
        root.traverse(obj => {
          const name = obj.name.toLowerCase();
          if (!name) return;
          if (!(obj instanceof THREE.Mesh || obj instanceof THREE.Group))
            return;
          if (!/(wheel|rim|tire|tyre)/i.test(name)) return;
          if (/(steering|spare|fender|wheelarch)/i.test(name)) return;

          const bb = new THREE.Box3().setFromObject(obj);
          const s = new THREE.Vector3();
          bb.getSize(s);

          const maxDim = Math.max(s.x, s.y, s.z);
          const minDim = Math.min(s.x, s.y, s.z);

          // Post-normalization, wheels should be around ~0.5–0.9m diameter.
          if (maxDim < 0.25 || maxDim > 1.35) return;
          if (minDim < 0.03 || minDim > 0.6) return;

          const c = new THREE.Vector3();
          bb.getCenter(c);
          candidates.push({ obj, center: c, size: s });
        });

        // Prefer the lowest four wheel-like candidates (closest to the ground plane).
        candidates.sort((a, b) => a.center.y - b.center.y);
        const picked: typeof candidates = [];
        for (const c of candidates) {
          if (picked.length >= 4) break;
          // De-dup near-identical objects.
          const tooClose = picked.some(
            p => p.center.distanceToSquared(c.center) < 0.06
          );
          if (tooClose) continue;
          picked.push(c);
        }

        for (const w of picked) {
          const isFront = w.center.x > 0;
          const thicknessAxis = (() => {
            if (w.size.x <= w.size.y && w.size.x <= w.size.z)
              return new THREE.Vector3(1, 0, 0);
            if (w.size.y <= w.size.x && w.size.y <= w.size.z)
              return new THREE.Vector3(0, 1, 0);
            return new THREE.Vector3(0, 0, 1);
          })();

          // Wrap into steering group to separate steering from spin.
          const parent = w.obj.parent;
          if (!parent) continue;
          const steerGroup = new THREE.Group();
          steerGroup.name = `wheel_steer_${isFront ? 'front' : 'rear'}`;
          steerGroup.position.copy(w.obj.position);
          steerGroup.quaternion.copy(w.obj.quaternion);
          steerGroup.scale.copy(w.obj.scale);
          parent.add(steerGroup);

          // Move wheel under steerGroup while preserving world pose.
          w.obj.position.set(0, 0, 0);
          w.obj.quaternion.identity();
          w.obj.scale.set(1, 1, 1);
          steerGroup.add(w.obj);

          this.externalWheels.push({
            steerGroup: isFront ? steerGroup : null,
            wheelObject: w.obj,
            spinAxis: thicknessAxis,
            isFront,
          });
        }

        // Swap in.
        this.modelGroup.clear();
        this.modelGroup.add(root);

        // Slightly lower ride height for realism.
        this.carGroup.position.y = 0.0;
        this.usingExternalModel = true;
      })
      .catch(() => {
        // Model missing or failed to load; keep procedural fallback.
      });
  }

  update(ctx: SceneRuntime) {
    this.time += ctx.dt;

    // If an external model is present, switch to a showroom/turntable presentation.
    if (this.usingExternalModel) {
      const turn = ctx.pointer.x * 0.45;
      const tilt = -ctx.pointer.y * 0.08;

      this.carGroup.rotation.y = damp(
        this.carGroup.rotation.y,
        turn,
        3.0,
        ctx.dt
      );
      this.carGroup.rotation.x = damp(
        this.carGroup.rotation.x,
        tilt,
        3.0,
        ctx.dt
      );
      this.carGroup.rotation.z = damp(this.carGroup.rotation.z, 0, 3.0, ctx.dt);
      this.carGroup.position.x = damp(this.carGroup.position.x, 0, 3.0, ctx.dt);

      // Camera: gentle orbit + slightly elevated angle.
      const orbit = 0.6 + turn * 0.35;
      const radius = this.baseDistance + 1.5;
      const camX = Math.sin(orbit) * radius;
      const camZ = Math.cos(orbit) * radius;
      const camY = 2.0;

      this.camera.position.x = damp(this.camera.position.x, camX, 3.0, ctx.dt);
      this.camera.position.z = damp(this.camera.position.z, camZ, 3.0, ctx.dt);
      this.camera.position.y = damp(this.camera.position.y, camY, 3.0, ctx.dt);
      this.camera.lookAt(0, 0.9, 0);

      // Wheel spin + front steering if wheels were detected.
      if (this.externalWheels.length > 0) {
        const steer = -ctx.pointer.x;
        // A subtle fake roll speed that responds to pointer motion (no throttle in showroom mode).
        const rollSpeed = THREE.MathUtils.clamp(
          Math.abs(ctx.pointer.x) + Math.abs(ctx.pointer.y),
          0,
          1
        );
        const wheelSpin = rollSpeed * ctx.dt * 3.4;
        for (const w of this.externalWheels) {
          if (w.steerGroup) {
            w.steerGroup.rotation.y = damp(
              w.steerGroup.rotation.y,
              steer * 0.35,
              5.0,
              ctx.dt
            );
          }
          w.wheelObject.rotateOnAxis(w.spinAxis, wheelSpin);
        }
      }

      // Slightly re-aim key light to keep highlights attractive.
      this.keyLight.position.x = 6 + Math.sin(this.time * 0.2) * 0.5;
      this.keyLight.position.z = 5 + Math.cos(this.time * 0.2) * 0.5;

      return;
    }

    // Input Handling
    const throttle = ctx.press; // 0..1
    const steer = -ctx.pointer.x; // -1..1

    // Dynamics
    const targetSpeed = 10.0 + throttle * 40.0; // 10 to 50 m/s
    this.speed = damp(this.speed, targetSpeed, 2.0, ctx.dt);

    // Move Grid (kept subtle for fallback only)
    if (this.grid.visible) {
      this.grid.position.z = (this.time * this.speed) % 1.0;
    }

    // Wheels Rotation
    const wheelSpin = this.speed * ctx.dt * 2.0;
    this.wheels.forEach((w, i) => {
      w.children[0].rotateX(wheelSpin); // Tire
      w.children[1].rotateX(wheelSpin); // Rim

      // Front Wheel Steering (Indices 0 and 1)
      if (i < 2) {
        w.rotation.y = steer * 0.4;
      }
    });

    // Body Physics
    // Roll (Lean into corner, or out? Sport cars lean out slightly, or stay flat)
    const rollAngle = steer * 0.15; // rad
    // Pitch (Squat)
    const pitchAngle = throttle * 0.05; // Lift nose/squat rear

    this.carGroup.rotation.z = damp(
      this.carGroup.rotation.z,
      rollAngle,
      4.0,
      ctx.dt
    );
    this.carGroup.rotation.x = damp(
      this.carGroup.rotation.x,
      -pitchAngle,
      2.0,
      ctx.dt
    );
    this.carGroup.rotation.y = damp(
      this.carGroup.rotation.y,
      steer * 0.1,
      4.0,
      ctx.dt
    ); // Yaw slightly

    // Position Drift
    const driftX = steer * 2.5;
    this.carGroup.position.x = damp(
      this.carGroup.position.x,
      driftX,
      1.5,
      ctx.dt
    );

    // Camera Chase (fallback)
    // Camera should be behind and slightly above
    const camTargetX = this.carGroup.position.x * 0.8; // Lag slightly
    const camTargetZ = 6.0 + (this.speed / 50.0) * 2.0; // Pull back at speed
    const camTargetY = 2.0 + (this.speed / 50.0) * 0.5;

    this.camera.position.x = damp(
      this.camera.position.x,
      camTargetX,
      3.0,
      ctx.dt
    );
    this.camera.position.z = damp(
      this.camera.position.z,
      camTargetZ,
      3.0,
      ctx.dt
    );
    this.camera.position.y = damp(
      this.camera.position.y,
      camTargetY,
      3.0,
      ctx.dt
    );

    this.camera.lookAt(this.carGroup.position.x, 0.8, 0);
  }
}
