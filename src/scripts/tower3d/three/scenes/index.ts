import * as THREE from 'three';
import { SimplePhysics } from '../physics/simple-physics';
import type { TowerCaps } from '../../core/caps';

// --- Types & Interfaces ---

export interface SceneRuntime {
  renderer: THREE.WebGLRenderer;
  root: HTMLElement; // Added
  size: { width: number; height: number; dpr: number };
  pointer: THREE.Vector2; // -1 to 1
  pointerVelocity: THREE.Vector2;
  scrollVelocity: number;
  dt: number;
  time: number;
  progress: number; // Added
  localProgress: number; // Added
  caps: TowerCaps;
  gyro: THREE.Vector3; // -1 to 1 based on beta/gamma
  gyroActive: boolean; // Added
  bgTheme: string; // 'dark' | 'glass'
  press: number; // 0 to 1
  tap: number; // transient 0->1 signal
  sceneId: string; // Added
  sceneIndex: number; // Added
}

export interface TowerScene {
  id: string; // Added
  group: THREE.Group;
  camera: THREE.Camera;
  bg?: THREE.Color; // optional override
  init(ctx: SceneRuntime): void;
  resize(ctx: SceneRuntime): void;
  update(ctx: SceneRuntime): void;
  render?(ctx: SceneRuntime): void; // Added
  dispose(): void;
  cleanup?(): void;
}

export interface SceneMeta {
  id: string;
  title: string;
  subtitle: string;
  index: number;
}

const sceneMeta: SceneMeta[] = [
  {
    id: 'scene00',
    title: 'Origin Core',
    subtitle: 'Resonant Structures',
    index: 0,
  },
  {
    id: 'scene01',
    title: 'Liquid Metal',
    subtitle: 'Chaotic Systems',
    index: 1,
  },
  {
    id: 'scene02',
    title: 'Million Fireflies',
    subtitle: 'Vector Calculus',
    index: 2,
  },
  {
    id: 'scene03',
    title: 'Quantum Ribbons',
    subtitle: 'Data Flow',
    index: 3,
  },
  {
    id: 'scene04',
    title: 'Aurora Field',
    subtitle: 'Magnetic Force',
    index: 4,
  },
  {
    id: 'scene05',
    title: 'Event Horizon',
    subtitle: 'Singularity',
    index: 5,
  },
  {
    id: 'scene06',
    title: 'Fractal Glass',
    subtitle: 'Refraction',
    index: 6,
  },
  {
    id: 'scene07',
    title: 'Data Stream',
    subtitle: 'Information Vortex',
    index: 7,
  },
  {
    id: 'scene08',
    title: 'Orbital Mechanics',
    subtitle: 'Gravity',
    index: 8,
  },
  {
    id: 'scene09',
    title: 'Crystal Glitch',
    subtitle: 'Tessellation',
    index: 9,
  },
  {
    id: 'scene10',
    title: 'Quantum Moiré',
    subtitle: 'Interference',
    index: 10,
  },
  {
    id: 'scene11',
    title: 'Neural Net',
    subtitle: 'Deep Learning',
    index: 11,
  },
  { id: 'scene12', title: 'The Library', subtitle: 'Knowledge', index: 12 },
  {
    id: 'scene13',
    title: 'Deep Abyss',
    subtitle: 'Organic Light',
    index: 13,
  },
  {
    id: 'scene14',
    title: 'Cyber City',
    subtitle: 'Future State',
    index: 14,
  },
  { id: 'scene15', title: 'Entropy Void', subtitle: 'Collapse', index: 15 },
];

// --- Math Helpers ---

const damp = (current: number, target: number, lambda: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));

// --- Base Class (The "Centering" Fix) ---

abstract class SceneBase implements TowerScene {
  id: string = 'unknown'; // Added default
  group: THREE.Group;
  camera: THREE.PerspectiveCamera;

  // Design resolution reference
  protected baseFov = 45;
  protected baseDistance = 14;
  // This radius represents the "safe zone" of the scene content.
  // We ensure this radius is always visible.
  protected contentRadius = 4.5;

  constructor() {
    this.group = new THREE.Group();
    // Start with a standard setup
    this.camera = new THREE.PerspectiveCamera(this.baseFov, 1, 0.1, 100);
    this.camera.position.set(0, 0, this.baseDistance);
  }

  abstract init(ctx: SceneRuntime): void;
  abstract update(ctx: SceneRuntime): void;

  render(ctx: SceneRuntime): void {
    ctx.renderer.render(this.group, this.camera);
  }

  resize(ctx: SceneRuntime): void {
    const aspect = ctx.size.width / ctx.size.height;
    this.camera.aspect = aspect;

    // Responsive Logic:
    // We want to ensure 'this.contentRadius' is visible both vertically and horizontally.
    // Vertical FOV is fixed in THREE.PerspectiveCamera.
    // Visible Height at distance D:  H = 2 * D * tan(FOV/2).
    // Visible Width: W = H * aspect.

    // If aspect < 1 (Portrait), width is the limiting factor.
    // We want Visible Width >= contentRadius * 2.
    // W = 2 * D * tan(FOV/2) * aspect >= 2 * R
    // D * tan(FOV/2) * aspect >= R
    // D >= R / (tan(FOV/2) * aspect)

    // If aspect >= 1 (Landscape), height is usually limiting (or width is plentiful).
    // We want Visible Height >= contentRadius * 2.
    // 2 * D * tan(FOV/2) >= 2 * R
    // D >= R / tan(FOV/2)

    const fovRad = (this.camera.fov * Math.PI) / 180;
    const tanHalf = Math.tan(fovRad / 2);

    let requiredDist = 0;
    if (aspect < 1.0) {
      // Portrait: Fit width
      requiredDist = (this.contentRadius * 1.05) / (tanHalf * aspect);
    } else {
      // Landscape: Fit height
      requiredDist = (this.contentRadius * 1.05) / tanHalf;
    }

    // Apply strict centering
    this.baseDistance = requiredDist;
    // Note: The update() loop typically interpolates camera.z to baseDistance.
    // If a scene overrides camera controls, it must respect this baseDistance.

    this.camera.updateProjectionMatrix();

    // Re-center any stray objects if needed (handled by scene implementations)
  }

  dispose(): void {
    // Basic cleanup traversal
    this.group.traverse(obj => {
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
      // Materials might be shared, be careful.
      // For this project, we assume mostly unique materials or GC handles it.
    });
  }
}

// --- Scene 00: Feedback Forge (High Octane) ---

class FeedbackForgeScene extends SceneBase {
  private rings: THREE.Mesh[] = [];
  private core: THREE.Mesh;
  private particles: THREE.Points;
  private particleData: Float32Array;

  constructor() {
    super();
    this.id = 'scene00';
    this.contentRadius = 5.0; // Keeps the forge visible

    // 1. Core Energy Source (Volumetric Shader look via layers)
    const coreGeo = new THREE.IcosahedronGeometry(1.5, 60); // Higher poly for smooth noise
    const coreMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color('#ff2a00') },
        uColorB: { value: new THREE.Color('#ffaa00') },
        uPulse: { value: 0 },
        uNoiseScale: { value: 2.0 },
      },
      vertexShader: `
        varying vec3 vN;
        varying vec3 vP;
        varying float vDisp;
        uniform float uTime;
        uniform float uPulse;

        // Curl noise approximation
        vec3 hash( vec3 p ) {
            p = vec3( dot(p,vec3(127.1,311.7, 74.7)),
                      dot(p,vec3(269.5,183.3,246.1)),
                      dot(p,vec3(113.5,271.9,124.6)));
            return -1.0 + 2.0*fract(sin(p)*43758.5453123);
        }

        void main() {
          vN = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          // Turbulent displacement
          float t = uTime * 1.5;
          vec3 n1 = hash(position * 2.0 + t);
          vec3 n2 = hash(position * 4.0 - t * 0.5);

          float displacement = (n1.x + n2.y * 0.5) * (0.2 + uPulse * 0.5); // More displacement on pulse
          vec3 pos = position + normal * displacement;

          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vP = worldPos.xyz;
          vDisp = displacement;

          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        varying vec3 vN;
        varying vec3 vP;
        varying float vDisp;
        uniform float uTime;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform float uPulse;

        void main() {
          vec3 viewDir = normalize(cameraPosition - vP);
          float fresnel = pow(1.0 - dot(vN, viewDir), 3.0);

          // Heat map based on displacement
          float heat = smoothstep(-0.2, 0.3, vDisp);

          // Magma gradient
          vec3 col = mix(uColorA, uColorB, heat);

          // Add "superheated" white spots
          col += vec3(1.0, 1.0, 0.8) * smoothstep(0.25, 0.3, vDisp) * (1.0 + uPulse * 2.0);

          // Dark crust where cool
          col = mix(vec3(0.05, 0.0, 0.0), col, smoothstep(-0.3, 0.0, vDisp));

          // Fresnel rim
          col += uColorB * fresnel * 0.5;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.core = new THREE.Mesh(coreGeo, coreMat);
    this.group.add(this.core);

    // 2. Orbital Rings (Industrial + Sci-Fi)
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0xff4400,
      emissiveIntensity: 0.2,
      flatShading: true,
    });

    // Add point light for the rings to catch
    const light = new THREE.PointLight(0xff6600, 5, 20);
    this.group.add(light);

    // Add blue counter-light
    const light2 = new THREE.PointLight(0x0044ff, 3, 20);
    light2.position.set(5, 5, 5);
    this.group.add(light2);

    for (let i = 0; i < 6; i++) {
      const r = 3.0 + i * 1.2;
      // Hexagonal / Octagonal rings
      const segments = 6 + (i % 2) * 2;
      const thick = 0.05 + i * 0.02;
      const geo = new THREE.TorusGeometry(r, thick, 4, segments * 4);
      const mesh = new THREE.Mesh(geo, ringMat.clone());
      mesh.userData = {
        baseAxis: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize(),
        speed: (0.2 + Math.random() * 0.3) * (i % 2 == 0 ? 1 : -1),
        index: i,
      };
      this.rings.push(mesh);
      this.group.add(mesh);
    }

    // 3. Sparks / Embers
    const pCount = 2000;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    this.particleData = new Float32Array(pCount * 4); // x,y,z, speed

    for (let i = 0; i < pCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.5 + Math.random() * 8.0;
      pPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pPos[i * 3 + 2] = r * Math.cos(phi);

      this.particleData[i * 4] = pPos[i * 3];
      this.particleData[i * 4 + 1] = pPos[i * 3 + 1];
      this.particleData[i * 4 + 2] = pPos[i * 3 + 2];
      this.particleData[i * 4 + 3] = 0.5 + Math.random();
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));

    const pMat = new THREE.PointsMaterial({
      color: 0xffaa00,
      size: 0.15,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      map: this.createSparkTexture(),
      depthWrite: false,
    });
    this.particles = new THREE.Points(pGeo, pMat);
    this.group.add(this.particles);
  }

  // Helper for nice soft particles
  createSparkTexture() {
    const cvs = document.createElement('canvas');
    cvs.width = 32;
    cvs.height = 32;
    const ctx = cvs.getContext('2d')!;
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.2, 'rgba(255,220,150,0.8)');
    grad.addColorStop(0.5, 'rgba(255,100,50,0.4)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    const tex = new THREE.CanvasTexture(cvs);
    return tex;
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const t = ctx.time;

    // Core Pulse
    const mat = this.core.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = t;
    // Expontential pulse for impact
    mat.uniforms.uPulse.value = Math.pow(ctx.press, 2.0);

    // Rings
    this.rings.forEach((r, i) => {
      const u = r.userData;
      // Normal behavior: Random axis rotation
      // Press behavior: Align rings to a sphere formation or specific axis

      let axis = u.baseAxis.clone();

      // Add Gyro/Mouse influence to axis
      const tilt = new THREE.Vector3(
        ctx.gyro.x + ctx.pointer.y,
        ctx.gyro.y + ctx.pointer.x,
        0
      ).multiplyScalar(0.5);
      axis.add(tilt).normalize();

      // Overdrive speed on press
      const currentSpeed = u.speed * (1.0 + ctx.press * 8.0);

      r.rotateOnAxis(axis, currentSpeed * ctx.dt);

      // Emissive Pulse
      const ringMat = r.material as THREE.MeshStandardMaterial;
      ringMat.emissiveIntensity =
        0.2 + Math.sin(t * 2.0 + i) * 0.1 + ctx.press * 3.0;

      // Color shift on press
      if (ctx.press > 0.5) {
        ringMat.emissive.setHSL(0.05 + 0.1 * ctx.press, 1.0, 0.5);
      } else {
        ringMat.emissive.setHex(0xff4400);
      }
    });

    // Particle orbit field
    const pos = this.particles.geometry.attributes.position
      .array as Float32Array;
    const count = this.particles.geometry.attributes.position.count;

    // Rotate entire particle system slowly
    this.particles.rotation.y = t * 0.05;
    this.particles.rotation.z = Math.sin(t * 0.1) * 0.1;

    // Camera Orbit
    // Interactive looking
    const mx = ctx.pointer.x * 2.0;
    const my = ctx.pointer.y * 2.0;

    this.camera.position.x = damp(this.camera.position.x, mx * 5, 2, ctx.dt);
    this.camera.position.y = damp(this.camera.position.y, my * 5, 2, ctx.dt);
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 01: Liquid Metal (Chaotic Systems) ---

class LiquidMetalScene extends SceneBase {
  private mesh: THREE.Mesh;
  private material: THREE.MeshStandardMaterial;

  constructor() {
    super();
    this.id = 'scene01';
    this.contentRadius = 5.0;

    // High fidelity geometry with localized density if possible
    // (but standard is uniform)
    const geo = new THREE.IcosahedronGeometry(2.5, 60);

    this.material = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      metalness: 0.6,
      roughness: 0.2,
      envMapIntensity: 1.5,
    });

    // Custom Shader Injection
    this.material.onBeforeCompile = shader => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uPointer = { value: new THREE.Vector3() };
      shader.uniforms.uPress = { value: 0 };

      // Helper functions
      const noiseFuncs = `
        // Simplex Noise (Ashima Arts)
        vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
        float snoise(vec3 v){
          const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
          const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i  = floor(v + dot(v, C.yyy) );
          vec3 x0 = v - i + dot(i, C.xxx) ;
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min( g.xyz, l.zxy );
          vec3 i2 = max( g.xyz, l.zxy );
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod(i, 289.0);
          vec4 p = permute( permute( permute(
                     i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                   + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                   + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
          float n_ = 0.142857142857;
          vec3  ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_ );
          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4( x.xy, y.xy );
          vec4 b1 = vec4( x.zw, y.zw );
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
          vec3 p0 = vec3(a0.xy,h.x);
          vec3 p1 = vec3(a0.zw,h.y);
          vec3 p2 = vec3(a1.xy,h.z);
          vec3 p3 = vec3(a1.zw,h.w);
          vec4 norm = inversesqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                        dot(p2,x2), dot(p3,x3) ) );
        }
      `;

      shader.vertexShader = `
        uniform float uTime;
        uniform vec3 uPointer;
        uniform float uPress;
        ${noiseFuncs}
        ${shader.vertexShader}
      `;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
          #include <begin_vertex>

          float time = uTime * 0.5;

          // Organic motion
          float n = snoise(position * 0.8 + time);
          float n2 = snoise(position * 1.5 - time * 0.5);
          float combined = (n + n2 * 0.5) * 0.8;

          // Interactive Spike
          // Since scene rotates, we need world pos or counter-rotated pointer
          // Here we just use raw distance in local space assuming pointer is passed in local space
          float d = distance(position, uPointer);
          float pull = smoothstep(1.5, 0.0, d);

          // Spike direction is normal, but sharpened
          float spike = pull * (1.0 + uPress * 3.0) * 1.5;

          // Add high frequency ripple on spike
          float ripple = sin(d * 10.0 - uTime * 5.0) * 0.1 * pull;

          float displacement = combined + spike + ripple;

          transformed += normal * displacement;
        `
      );

      // Update Fragment to be aware of interaction for color/roughness
      // Note: MeshStandardMaterial fragment structure is complex.
      // We'll rely on geometry changes affecting lighting (Standard material auto-computes lighting on displaced normals if using tangents, but here it uses default normals unless we recompute)
      // Recomputing normals in vertex shader for lighting:
      shader.vertexShader = shader.vertexShader.replace(
        '#include <defaultnormal_vertex>',
        `
          #include <defaultnormal_vertex>
          // Perturb normal based on noise derivative approximation
          float ep = 0.01;
          vec3 pOriginal = position;
          // (Simplified analytic or finite difference normal update would go here
          //  but for "Liquid Metal" smooth shading often looks fine even with mismatched normals
          //  as it looks like refraction/internal reflection)
          `
      );

      this.material.userData.shader = shader;
    };

    this.mesh = new THREE.Mesh(geo, this.material);
    this.group.add(this.mesh);

    // Dynamic Lights
    const light1 = new THREE.PointLight(0xff0044, 4, 30);
    const light2 = new THREE.PointLight(0x0044ff, 4, 30);
    const light3 = new THREE.PointLight(0xffffff, 2, 30); // Specular highlight

    this.mesh.userData.lights = [light1, light2, light3];
    this.group.add(light1, light2, light3);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    if (this.material.userData.shader) {
      this.material.userData.shader.uniforms.uTime.value = ctx.time;
      this.material.userData.shader.uniforms.uPress.value = ctx.press;

      // Map pointer to sphere surface approx
      // The mesh rotates, so we need to construct a target point in local space
      // Or just move a "attractor" in world space and pass that to shader.
      // But shader uses 'position' which is local.

      // Let's project pointer to 3D plane at z=0 then unrotate
      let vec = new THREE.Vector3(ctx.pointer.x * 5, ctx.pointer.y * 5, 2.0);

      // Counter-rotate against the group rotation to stay with mouse visually
      vec.applyAxisAngle(new THREE.Vector3(0, 1, 0), -ctx.time * 0.1);

      this.material.userData.shader.uniforms.uPointer.value.copy(vec);
    }

    // Rotate lights nicely
    const [l1, l2, l3] = this.mesh.userData.lights;

    l1.position.set(
      Math.sin(ctx.time * 0.7) * 8,
      Math.cos(ctx.time * 0.5) * 8,
      8
    );

    l2.position.set(
      Math.sin(ctx.time * 0.5 + 2) * 8,
      Math.cos(ctx.time * 0.3 + 1) * -8,
      8
    );

    l3.position.set(0, 0, 10 + ctx.press * 5); // Flash on press

    this.group.rotation.y = ctx.time * 0.1;

    // Closer camera for detail
    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance * 0.9,
      3,
      ctx.dt
    );

    // Tilt camera with gyro
    this.camera.rotation.x = ctx.gyro.x * 0.1;
    this.camera.rotation.y = ctx.gyro.y * 0.1;
  }
}

// --- Scene 03: Quantum Ribbons (Data Flow) ---

class RibbonFieldScene extends SceneBase {
  private mesh: THREE.InstancedMesh;
  private count = 500;
  private dummy = new THREE.Object3D();

  constructor() {
    super();
    this.id = 'scene03';
    this.contentRadius = 6.0;

    // Long strip with high segmentation for smooth curves
    const geo = new THREE.PlaneGeometry(0.2, 20, 2, 100);

    const mat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uPress: { value: 0 },
      },
      vertexShader: `
        attribute float aOffset;
        attribute float aSpeed;
        attribute vec3 aColor; // r,g,b

        varying vec2 vUv;
        varying vec3 vColor;
        varying float vAlpha;
        varying vec3 vNorm;

        uniform float uTime;
        uniform float uPress;

        void main() {
            vUv = uv;
            vColor = aColor;

            // Normalized position along the strip (0 to 1)
            // The plane is height 20, centered at 0. So y goes from -10 to 10
            float t = (position.y + 10.0) / 20.0; // 0..1 along length

            // Flow animation
            float flow = t + uTime * aSpeed * 0.2 + aOffset;

            // Define Trefoil Knot path
            // x = sin(t) + 2sin(2t)
            // y = cos(t) - 2cos(2t)
            // z = -sin(3t)

            float angle = flow * 6.28;

            // Knot Parameters
            float k = 3.0; // Scale
            float px = sin(angle) + 2.0 * sin(2.0 * angle);
            float py = cos(angle) - 2.0 * cos(2.0 * angle);
            float pz = -sin(3.0 * angle);

            vec3 curvePos = vec3(px, pz, py) * k * 0.5; // Swapping y/z for better camera view

            // Tangent (Derivative of position)
            float dAngle = 0.01;
            float angle2 = angle + dAngle;
             float px2 = sin(angle2) + 2.0 * sin(2.0 * angle2);
            float py2 = cos(angle2) - 2.0 * cos(2.0 * angle2);
            float pz2 = -sin(3.0 * angle2);
            vec3 curvePos2 = vec3(px2, pz2, py2) * k * 0.5;

            vec3 tangent = normalize(curvePos2 - curvePos);
            vec3 up = vec3(0.0, 1.0, 0.0);
            vec3 right = normalize(cross(tangent, up));
            vec3 normal = cross(right, tangent);

            vNorm = normal;

            // Offset based on X (width of ribbon)
            // position.x is -0.1 to 0.1
            vec3 finalPos = curvePos + right * position.x * (1.0 + uPress * 5.0); // Expand width on press

            // Add some "breathing" / spread based on offset
            finalPos += normal * sin(angle * 5.0 + uTime) * 0.5;

            gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);

            // Alpha fade at ends
            vAlpha = smoothstep(0.0, 0.1, t) * (1.0 - smoothstep(0.9, 1.0, t));
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying vec3 vColor;
        varying float vAlpha;
        varying vec3 vNorm;

        void main() {
            // Iridescence
            vec3 viewDir = vec3(0.0, 0.0, 1.0); // Approx view dir in view space? adjust if needed
            float fresnel = pow(1.0 - abs(dot(vNorm, viewDir)), 2.0);

            vec3 col = vColor;

            // Add shiny streak
            float streak = step(0.95, fract(vUv.y * 10.0));
            col += vec3(1.0) * streak * 0.5;

            // Rim light
            col += vec3(0.5, 0.8, 1.0) * fresnel;

            gl_FragColor = vec4(col, vAlpha * 0.8);
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false, // Transparency sort issue might occur but additive looks good
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, this.count);

    const offsets = new Float32Array(this.count);
    const speeds = new Float32Array(this.count);
    const colors = new Float32Array(this.count * 3);

    for (let i = 0; i < this.count; i++) {
      this.dummy.position.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);

      offsets[i] = Math.random() * 10.0;
      speeds[i] = 0.5 + Math.random() * 0.5;

      const c = new THREE.Color().setHSL(0.6 + Math.random() * 0.2, 1.0, 0.6);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    this.mesh.geometry.setAttribute(
      'aOffset',
      new THREE.InstancedBufferAttribute(offsets, 1)
    );
    this.mesh.geometry.setAttribute(
      'aSpeed',
      new THREE.InstancedBufferAttribute(speeds, 1)
    );
    this.mesh.geometry.setAttribute(
      'aColor',
      new THREE.InstancedBufferAttribute(colors, 3)
    );

    this.group.add(this.mesh);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const mat = this.mesh.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = ctx.time;
    mat.uniforms.uPress.value = ctx.press;

    this.group.rotation.x = ctx.pointer.y * 0.2;
    this.group.rotation.y = ctx.pointer.x * 0.2 + ctx.time * 0.1;

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 02: Million Fireflies (Vector Calculus) ---

class MillionFirefliesScene extends SceneBase {
  private particles: THREE.Points;
  private count = 60000; // Optimized count

  constructor() {
    super();
    this.id = 'scene02';
    this.contentRadius = 6.0;

    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(this.count * 3);
    const data = new Float32Array(this.count * 4); // phase, speed, orbit_radius, y_offset

    for (let i = 0; i < this.count; i++) {
      // Sphere distribution
      const r = 12.0 * Math.cbrt(Math.random());
      // cbrt gives uniform volumetric distribution

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      data[i * 4] = Math.random() * 100.0; // Phase
      data[i * 4 + 1] = 0.2 + Math.random() * 0.5; // Speed
      data[i * 4 + 2] = 2.0 + Math.random() * 8.0; // Orbit Radius
      data[i * 4 + 3] = (Math.random() - 0.5) * 8.0; // Y Offset
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aData', new THREE.BufferAttribute(data, 4));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPress: { value: 0 },
        uColorA: { value: new THREE.Color(0xffaa00) }, // Gold
        uColorB: { value: new THREE.Color(0x00ffff) }, // Cyan
        uPointer: { value: new THREE.Vector2() },
      },
      vertexShader: `
            uniform float uTime;
            uniform float uPress;
            uniform vec2 uPointer;
            attribute vec4 aData;

            varying float vAlpha;
            varying vec3 vCol;

            // Pseudo-random
            float rand(vec2 co){
                return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
            }

            void main() {
                vec3 p = position;
                float t = uTime * aData.y * 0.5;
                float phase = aData.x;

                // Flow Field Math
                float angle = t + phase;
                float r = aData.z;
                float yOff = aData.w;

                // Lissajous spirals
                float x = r * sin(angle) * cos(angle * 0.3);
                float z = r * cos(angle) * cos(angle * 0.3);
                float y = yOff + sin(angle * 2.0) * 1.5;

                // Smooth morph from sphere (p) to flow (target)
                vec3 target = vec3(x, y, z);

                // Interaction: Press gathers them
                p = mix(target, p * 0.5, uPress);

                // Pointer Repulsion
                // Project pointer to world roughly
                vec3 ptr = vec3(uPointer.x * 15.0, uPointer.y * 15.0, 0.0);
                vec3 diff = p - ptr;
                float dist = length(diff);
                float repel = smoothstep(5.0, 0.0, dist);
                p += normalize(diff) * repel * 3.0;

                vec4 mv = modelViewMatrix * vec4(p, 1.0);
                gl_Position = projectionMatrix * mv;

                // Size attenuation
                float dCam = length(mv.xyz);
                gl_PointSize = (3.0 + uPress * 2.0) * (30.0 / dCam);

                vAlpha = 0.6 + 0.4 * sin(t * 3.0 + phase);

                // Pass color based on speed/radius
                vCol = mix(vec3(1.0, 0.6, 0.0), vec3(0.0, 0.8, 1.0), smoothstep(2.0, 8.0, r));
            }
        `,
      fragmentShader: `
            varying float vAlpha;
            varying vec3 vCol;

            void main() {
                // Soft circular particle
                vec2 uv = gl_PointCoord - 0.5;
                float r = length(uv);
                if (r > 0.5) discard;

                float glow = 1.0 - (r * 2.0);
                glow = pow(glow, 1.5);

                gl_FragColor = vec4(vCol, glow * vAlpha);
            }
        `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particles = new THREE.Points(geo, mat);
    this.group.add(this.particles);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const mat = this.particles.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = ctx.time;
    mat.uniforms.uPress.value = ctx.press;
    mat.uniforms.uPointer.value.set(ctx.pointer.x, ctx.pointer.y);

    this.group.rotation.y = ctx.time * 0.05;

    // Tilt with gyro
    this.group.rotation.x = ctx.gyro.x * 0.2;
    this.group.rotation.z = ctx.gyro.y * 0.2;

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 04: Aurora Borealis (Ethereal) ---

class AuroraCurtainScene extends SceneBase {
  private mesh: THREE.InstancedMesh;
  private count = 60;
  private dummy = new THREE.Object3D();

  constructor() {
    super();
    this.id = 'scene04';
    this.contentRadius = 8.0;

    // A single long, tall curtain strip
    // Width 5, Height 20, WidthSegs 40, HeightSegs 64
    const geo = new THREE.PlaneGeometry(8, 24, 40, 64);

    const mat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(0x00ffaa) }, // Green/Cyan
        uColor2: { value: new THREE.Color(0x8800ff) }, // Purple
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vAlpha;
        varying float vIndex;

        uniform float uTime;
        attribute float aIndex;
        attribute float aPhase;

        // Simplex noise function
        vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
        float snoise(vec2 v){
           const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
           vec2 i  = floor(v + dot(v, C.yy) );
           vec2 x0 = v -   i + dot(i, C.xx);
           vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
           vec4 x12 = x0.xyxy + C.xxzz;
           x12.xy -= i1;
           i = mod(i, 289.0);
           vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
           vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
           m = m*m; m = m*m;
           vec3 x = 2.0 * fract(p * C.www) - 1.0;
           vec3 h = abs(x) - 0.5;
           vec3 ox = floor(x + 0.5);
           vec3 a0 = x - ox;
           m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
           vec3 g; g.x  = a0.x  * x0.x  + h.x  * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw;
           return 130.0 * dot(m, g);
        }

        void main() {
           vUv = uv;
           vIndex = aIndex;

           vec3 pos = position;

           // Curving the curtain
           float t = uTime * 0.2 + aPhase;

           // Large sweeping wave
           float wave = snoise(vec2(pos.x * 0.1 + t, pos.y * 0.05 + aIndex * 0.1));

           pos.z += wave * 3.0;

           // Fine detail ripples
           float ripple = snoise(vec2(pos.x * 0.5 + t * 2.0, pos.y * 0.2));
           pos.z += ripple * 0.5;

           // Alpha fade at edges
           vAlpha = smoothstep(0.0, 0.2, uv.y) * (1.0 - smoothstep(0.8, 1.0, uv.y));
           vAlpha *= smoothstep(0.0, 0.1, uv.x) * (1.0 - smoothstep(0.9, 1.0, uv.x));

           gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying float vAlpha;
        varying float vIndex;
        uniform vec3 uColor1;
        uniform vec3 uColor2;

        void main() {
           // Color gradient vertical
           vec3 col = mix(uColor1, uColor2, vUv.y);

           // Add banding
           float bands = sin(vUv.y * 20.0 + vIndex) * 0.1;
           col += bands;

           float finalAlpha = vAlpha * 0.6; // ghost-like

           gl_FragColor = vec4(col * 2.0, finalAlpha);
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false, // Important for transparency overlap
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, this.count);

    const indices = new Float32Array(this.count);
    const phases = new Float32Array(this.count);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < this.count; i++) {
      dummy.position.set(
        (Math.random() - 0.5) * 10,
        0,
        (Math.random() - 0.5) * 5
      );
      dummy.rotation.y = (Math.random() - 0.5) * 1.0;
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);

      indices[i] = i;
      phases[i] = Math.random() * 100;
    }

    this.mesh.geometry.setAttribute(
      'aIndex',
      new THREE.InstancedBufferAttribute(indices, 1)
    );
    this.mesh.geometry.setAttribute(
      'aPhase',
      new THREE.InstancedBufferAttribute(phases, 1)
    );

    this.group.add(this.mesh);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const mat = this.mesh.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = ctx.time;

    this.group.rotation.y = ctx.time * 0.05;

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 05: Event Horizon (Cosmic Horror) ---

class EventHorizonScene extends SceneBase {
  private disk: THREE.Mesh;
  private glow: THREE.Mesh;
  private jets: THREE.Mesh;

  constructor() {
    super();
    this.id = 'scene05';
    this.contentRadius = 8.0;

    // 1. Accretion Disk (Volumetric Illusion)
    const geo = new THREE.PlaneGeometry(16, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color(0xff3300) }, // Deep Orange
        uColorB: { value: new THREE.Color(0xffddaa) }, // Hot White
        uCameraPos: { value: new THREE.Vector3() },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
            vUv = uv;
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPos = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        uniform float uTime;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform vec3 uCameraPos;

        // Fast Noise
        float hash( float n ) { return fract(sin(n)*43758.5453123); }
        float noise( in vec2 x ) {
            vec2 p = floor(x);
            vec2 f = fract(x);
            f = f*f*(3.0-2.0*f);
            float n = p.x + p.y*57.0;
            return mix(mix( hash(n+  0.0), hash(n+  1.0),f.x),
                       mix( hash(n+ 57.0), hash(n+ 58.0),f.x),f.y);
        }

        // Domain warping FBM
        float fbm(vec2 p) {
           float f = 0.0;
           float amp = 0.5;
           for(int i=0; i<4; i++) {
             f += amp * noise(p);
             p = p * 2.1 + vec2(uTime * 0.1, 0.0);
             amp *= 0.5;
           }
           return f;
        }

        void main() {
            vec2 centered = vUv - 0.5;
            float r = length(centered) * 9.0; // Scaled radius
            float ang = atan(centered.y, centered.x);

            // BH Shadow
            if (r < 1.4) discard;

            // Swirl Coordinates
            // Twist space as we get closer to event horizon
            float twist = 8.0 / (r + 0.1);
            vec2 flow = vec2(ang * 3.0 + twist - uTime * 2.0, r - uTime * 0.5);

            // Noise structure
            float n = fbm(flow);

            // Texture banding
            float bands = sin(r * 10.0 - uTime * 2.0 + n * 3.0);

            // Intensity Gradient
            float intensity = smoothstep(1.4, 3.0, r) * smoothstep(7.0, 4.0, r);

            // Core Heat
            float heat = smoothstep(0.3, 0.8, n + bands * 0.2);
            vec3 col = mix(uColorA, uColorB, heat);

            // Add relativistic beaming doppler hint (simplistic: brighter on one side)
            float doppler = 1.0 + sin(ang - 0.5) * 0.4;
            col *= doppler;

            // Alpha falloff
            float alpha = intensity * (0.8 + n * 0.2);

            // Add a glow ring at ISCO (Innermost Stable Circular Orbit)
            float isco = 1.0 - smoothstep(0.02, 0.0, abs(r - 2.0));
            col += vec3(0.5, 0.8, 1.0) * isco * 2.0;

            if (alpha < 0.05) discard;

            // View Fade to suppress billboarding artifacts if viewed edge on?
            // Not needed since we use a plane.

            gl_FragColor = vec4(col, alpha);
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.disk = new THREE.Mesh(geo, mat);
    // Orient to face camera? Or flat?
    // Gargantua is flat but usually viewed at angle.
    this.disk.rotation.x = -Math.PI * 0.5; // Flat on XZ
    this.group.add(this.disk);

    // 2. Black Hole Center (Event Horizon)
    const bhGeo = new THREE.SphereGeometry(1.4, 64, 64);
    const bhMat = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
         varying vec3 vNormal;
         void main() {
           vNormal = normalize(normalMatrix * normal);
           gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
         }
       `,
      fragmentShader: `
         varying vec3 vNormal;
         void main() {
           // Pure Void
           gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);

           // Thin Photon Ring
           float view = dot(vNormal, vec3(0.0, 0.0, 1.0));
           float ring = smoothstep(0.0, 0.1, 1.0 - abs(view));

           // In classic BH rendering the photon ring is slightly outside the shadow
           // Here we just add a tiny rim to separate it if needed, but usually it's black.
           // Let's keep it pure black for contrast against the bright disk.
         }
       `,
    });
    // Actually, simple black basic material is best for the void itself to occlude everything behind it.
    // But we want to ensure it sorts correctly.
    const bh = new THREE.Mesh(
      bhGeo,
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    this.group.add(bh);

    // 3. Relativistic Jets (Volumetric Cone)
    const jetGeo = new THREE.CylinderGeometry(0.05, 1.5, 12, 32, 40, true);
    jetGeo.translate(0, 6, 0);
    const jetMat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x88ccff) },
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vPosY;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vPosY = position.y; // Local Y
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying float vPosY;
        uniform float uTime;
        uniform vec3 uColor;

        float hash( float n ) { return fract(sin(n)*43758.5453123); }
        float noise( vec2 x ) {
            vec2 p = floor(x);
            vec2 f = fract(x);
            f = f*f*(3.0-2.0*f);
            float n = p.x + p.y*57.0;
            return mix(mix( hash(n+  0.0), hash(n+  1.0),f.x),
                       mix( hash(n+ 57.0), hash(n+ 58.0),f.x),f.y);
        }

        void main() {
            // High speed flow
            float flow = vPosY * 0.5 - uTime * 3.0;
            float n = noise(vec2(vUv.x * 20.0, flow));

            // Energy core
            float core = 1.0 - abs(vUv.x - 0.5) * 2.0;
            core = pow(core, 4.0);

            // Pulse along length
            float pulse = noise(vec2(0.0, vPosY * 0.2 - uTime * 5.0));

            float alpha = core * (0.5 + n * 0.5);
            alpha *= smoothstep(0.0, 3.0, vPosY) * (1.0 - smoothstep(8.0, 12.0, vPosY)); // Fade ends

            // Shockwaves
            float shock = smoothstep(0.6, 0.8, noise(vec2(vUv.x * 5.0, vPosY - uTime * 8.0)));

            vec3 col = uColor + vec3(0.5) * shock;

            gl_FragColor = vec4(col, alpha * (0.5 + pulse * 0.5));
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.jets = new THREE.Mesh(jetGeo, jetMat);
    this.group.add(this.jets);

    const jetDown = this.jets.clone();
    jetDown.rotation.x = Math.PI;
    this.group.add(jetDown);

    // 4. Corona Glow
    const shineGeo = new THREE.PlaneGeometry(16, 16);
    const shineMat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
            varying vec2 vUv;
            void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
      fragmentShader: `
            varying vec2 vUv;
            void main() {
                float d = distance(vUv, vec2(0.5));
                float a = 1.0 / (d * 8.0) - 0.2;
                a = clamp(a, 0.0, 1.0);
                gl_FragColor = vec4(1.0, 0.5, 0.2, a * 0.4);
            }
        `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.glow = new THREE.Mesh(shineGeo, shineMat);
    this.group.add(this.glow);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const t = ctx.time;
    (this.disk.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
    (this.jets.material as THREE.ShaderMaterial).uniforms.uTime.value = t;

    // Wobble disk only, keep jet vertical relative to BH?
    // Actually, jets should align with rotation axis.
    // Let's rotate the whole group slightly but keep jets mostly vertical for stability in view
    // or rotate jets with disk.

    // To keep it simple: Disk rotates around Y (group), but wobbles on local X
    // We want the group to rotate, so everything rotates together.
    this.group.rotation.z = Math.sin(t * 0.1) * 0.1;
    this.group.rotation.x = Math.sin(t * 0.15) * 0.1;

    // Pulse the glow
    const glowMat = this.glow.material as THREE.ShaderMaterial;
    glowMat.uniforms.uTime.value = t;

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 06: Kaleido Glass (Fractal Refraction) ---

class KaleidoGlassScene extends SceneBase {
  private shapes: THREE.InstancedMesh;
  private count = 300;
  private dummy = new THREE.Object3D();
  private physics: SimplePhysics;
  private pointerPos = new THREE.Vector3();

  constructor() {
    super();
    this.id = 'scene06';
    this.contentRadius = 5.0;

    // Prism Geometry
    const geo = new THREE.ConeGeometry(0.5, 1.5, 4);

    // High-end glass material
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      emissive: 0x220033,
      metalness: 0.1,
      roughness: 0.0,
      transmission: 1.0,
      thickness: 2.0,
      ior: 1.6,
      clearcoat: 1.0,
      attenuationColor: new THREE.Color(0xff00aa),
      attenuationDistance: 1.0,
    });
    // @ts-expect-error Dispersion
    mat.dispersion = 0.08;

    this.shapes = new THREE.InstancedMesh(geo, mat, this.count);

    // Physics
    this.physics = new SimplePhysics(this.count);
    this.physics.bounds.set(6, 6, 6);
    this.physics.friction = 0.98;

    // Arrange in a Fractal Sphere pattern
    for (let i = 0; i < this.count; i++) {
      // Golden Angle distribution
      const phi = Math.acos(-1 + (2 * i) / this.count);
      const theta = Math.sqrt(this.count * Math.PI) * phi;

      const r = 3.5;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      this.physics.initParticle(i, new THREE.Vector3(x, y, z), 0.5);

      this.dummy.position.set(x, y, z);
      this.dummy.lookAt(0, 0, 0); // Point inward

      // Random scale variation
      const s = 0.5 + Math.random() * 1.0;
      this.dummy.scale.set(s, s * 2.0, s);

      this.dummy.updateMatrix();
      this.shapes.setMatrixAt(i, this.dummy.matrix);
    }

    // Store scale in userData
    const scales = new Float32Array(this.count);
    for (let i = 0; i < this.count; i++) scales[i] = 0.5 + Math.random();
    this.shapes.userData.scales = scales;

    this.group.add(this.shapes);

    // Inner Light to refract
    const light = new THREE.PointLight(0xffffff, 5, 10);
    this.group.add(light);

    // Add some ambient light/bg for refraction checks
    const wireGeo = new THREE.IcosahedronGeometry(6.0, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      wireframe: true,
      transparent: true,
      opacity: 0.1,
    });
    this.group.add(new THREE.Mesh(wireGeo, wireMat));
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const t = ctx.time;
    const dt = Math.min(ctx.dt, 1 / 30);
    const scales = this.shapes.userData.scales;

    this.pointerPos.set(ctx.pointer.x * 10, ctx.pointer.y * 10, 0);
    this.physics.update(dt, this.pointerPos, 3.0);

    for (let i = 0; i < this.count; i++) {
      const idx = i * 3;
      const x = this.physics.positions[idx];
      const y = this.physics.positions[idx + 1];
      const z = this.physics.positions[idx + 2];

      this.dummy.position.set(x, y, z);
      this.dummy.lookAt(0, 0, 0);
      this.dummy.rotateZ(t * 0.5 + i); // Spin

      const s = scales[i] * (1.0 + Math.sin(t * 2 + i) * 0.1);
      this.dummy.scale.set(s, s * 2, s);

      this.dummy.updateMatrix();
      this.shapes.setMatrixAt(i, this.dummy.matrix);
    }
    this.shapes.instanceMatrix.needsUpdate = true;

    // Interactive
    this.group.rotation.x = ctx.pointer.y * 0.1;
    this.group.rotation.y = ctx.pointer.x * 0.1;

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 07: Data Sculpture (Matrix Vortex) ---

class MatrixRainScene extends SceneBase {
  private mesh: THREE.InstancedMesh;
  private count = 3000; // Increased density
  private dummy = new THREE.Object3D();

  constructor() {
    super();
    this.id = 'scene07';
    this.contentRadius = 8.0;

    // 1. Procedural Matrix Texture (Higher Res)
    const size = 1024;
    const cvs = document.createElement('canvas');
    cvs.width = size;
    cvs.height = size;
    const ctx = cvs.getContext('2d')!;

    // Transparent Black Bg
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);

    // Draw grid of characters
    const cols = 32; // More chars
    const rows = 32;
    const cell = size / cols;
    ctx.font = `bold ${cell * 0.9}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Katakana / Matrix chars
    const chars = 'XYZ010101<>?#@&DATAﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ';

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const hue = 120 + Math.random() * 40; // Matrix Green to Cyan
        const lit = 50 + Math.random() * 50;
        ctx.fillStyle = `hsl(${hue}, 100%, ${lit}%)`;
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, x * cell + cell / 2, y * cell + cell / 2);
      }
    }

    const tex = new THREE.CanvasTexture(cvs);
    tex.magFilter = THREE.LinearFilter; // Smoother
    tex.minFilter = THREE.LinearFilter;

    // 2. Geometry
    const geo = new THREE.PlaneGeometry(0.4, 0.4);

    // 3. Shader Material for Rain Effect
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMap: { value: tex },
        uPress: { value: 0 },
        uPointer: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: `
        attribute float aOffset;
        attribute float aSpeed;
        attribute float aRadius;

        varying vec2 vUv;
        varying float vAlpha;
        varying float vGlow;

        uniform float uTime;
        uniform float uPress;
        uniform vec2 uPointer;

        // Rotation matrix helper
        mat3 rotateY(float theta) {
            float c = cos(theta);
            float s = sin(theta);
            return mat3(
                c, 0, s,
                0, 1, 0,
                -s, 0, c
            );
        }

        void main() {
            // -- UV Animation --
            // Select random character grid
            float t = uTime * aSpeed * 3.0 + aOffset * 100.0;
            float charIdx = floor(mod(t, 1024.0)); // 32x32 = 1024

            float cx = mod(charIdx, 32.0);
            float cy = floor(charIdx / 32.0);
            vUv = (uv + vec2(cx, cy)) / 32.0;

            // -- 1. Rain State (Cylinder Waterfall) --
            float fall = uTime * aSpeed * 3.0;
            float y = 15.0 - mod(fall + aOffset * 30.0, 30.0);
            y -= 7.5; // -7.5 to 7.5

            float angle = aOffset * 6.28;
            float r = aRadius;
            vec3 posA = vec3(cos(angle)*r, y, sin(angle)*r);

            // -- 2. Entity State (Sphere Artifact) --
            // Map index to sphere coords
            float phi = aOffset * 3.14159 * 2.0;
            float theta = acos(2.0 * fract(aSpeed * 13.0) - 1.0);
            float rad = 3.5;
            vec3 posB = vec3(
                rad * sin(theta) * cos(phi),
                rad * sin(theta) * sin(phi),
                rad * cos(theta)
            );
            // Rotate the data ball
            posB = rotateY(uTime * 2.0) * posB;

            // -- Interaction Mix --
            // uPress drives the morph
            float morph = smoothstep(0.0, 1.0, uPress);

            // Interaction: Mouse Repulsion on Rain
            // Project pointer (screen) to world approx
            vec3 repelTarget = vec3(uPointer.x * 10.0, uPointer.y * 10.0, 0.0);
            vec3 dir = posA - repelTarget; // Repel only affects rain state usually
            float dist = length(dir);
            vec3 repelForce = normalize(dir) * smoothstep(5.0, 0.0, dist) * 3.0 * (1.0 - morph);

            posA += repelForce;

            vec3 pos = mix(posA, posB, morph);

            // Billboarding (View Space)
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

            // Apply scale/offset in View Space (always faces camera)
            // 'position' is the quad vertex offset (-0.2 to 0.2)
            float scale = 1.0 - morph * 0.5;
            mvPosition.xy += position.xy * scale;

            gl_Position = projectionMatrix * mvPosition;

            // Alpha fade top/bottom for rain, solid for ball
            float rainAlpha = smoothstep(7.5, 5.0, abs(y));
            vAlpha = mix(rainAlpha, 1.0, morph);

            // Glitch flash
            vGlow = step(0.98, fract(t * 0.05)) * 2.0;
            // Matrix glow on press
            vGlow += morph * 0.5;
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        varying vec2 vUv;
        varying float vAlpha;
        varying float vGlow;

        void main() {
            vec4 c = texture2D(uMap, vUv);
            if (c.g < 0.2) discard; // Green channel key

            vec3 color = c.rgb;
            color *= vec3(0.2, 1.0, 0.5); // Ensure matrix green tint

            // Add glow bloom
            color += vec3(0.5, 1.0, 0.8) * vGlow;

            gl_FragColor = vec4(color, vAlpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, this.count);

    const offsets = new Float32Array(this.count);
    const speeds = new Float32Array(this.count);
    const radii = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
      offsets[i] = Math.random();
      speeds[i] = 1.0 + Math.random();
      radii[i] = 3.0 + Math.random() * 8.0;

      this.dummy.position.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.mesh.geometry.setAttribute(
      'aOffset',
      new THREE.InstancedBufferAttribute(offsets, 1)
    );
    this.mesh.geometry.setAttribute(
      'aSpeed',
      new THREE.InstancedBufferAttribute(speeds, 1)
    );
    this.mesh.geometry.setAttribute(
      'aRadius',
      new THREE.InstancedBufferAttribute(radii, 1)
    );

    this.group.add(this.mesh);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const t = ctx.time;
    const press = ctx.press;

    const mat = this.mesh.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = t;
    // Smooth press transition
    mat.uniforms.uPress.value = press;
    mat.uniforms.uPointer.value.copy(ctx.pointer);

    this.group.rotation.x = ctx.pointer.y * 0.1;
    this.group.rotation.z = ctx.pointer.x * 0.1;

    // Twist the whole group slightly
    this.group.rotation.y = t * 0.1;

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 08: Orbital Mechanics (Gravity) ---

class OrbitalMechanicsScene extends SceneBase {
  private debris: THREE.InstancedMesh;
  private planet: THREE.Mesh;
  private rings: THREE.Mesh;
  private count = 2000;
  private dummy = new THREE.Object3D();
  private physics: SimplePhysics;
  private pointerPos = new THREE.Vector3();

  constructor() {
    super();
    this.id = 'scene08';
    this.contentRadius = 8.0;

    // 1. Procedural Gas Giant (Hyper-Real)
    const pGeo = new THREE.SphereGeometry(2.5, 128, 128);
    const pMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color(0xbba588) }, // Beige
        uColorB: { value: new THREE.Color(0x884400) }, // Rust
        uColorC: { value: new THREE.Color(0x331100) }, // Dark bands
        uSunDir: { value: new THREE.Vector3(1.0, 0.2, 1.0).normalize() },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPos;
        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vViewPos = -mvPosition.xyz;
            gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform vec3 uColorC;
        uniform vec3 uSunDir;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPos;

        // Gradient Noise
        vec3 hash33(vec3 p3) {
            p3 = fract(p3 * vec3(.1031, .1030, .0973));
            p3 += dot(p3, p3.yxz+33.33);
            return fract((p3.xxy + p3.yxx)*p3.zyx);
        }
        float noise(vec3 p) {
            const float K1 = 0.333333333;
            const float K2 = 0.166666667;
            vec3 i = floor(p + (p.x + p.y + p.z) * K1);
            vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
            vec3 e = step(vec3(0.0), d0 - d0.yzx);
            vec3 i1 = e * (1.0 - e.zxy);
            vec3 i2 = 1.0 - e.zxy * (1.0 - e);
            vec3 d1 = d0 - i1 + K2;
            vec3 d2 = d0 - i2 + 2.0 * K2;
            vec3 d3 = d0 - 1.0 + 3.0 * K2;
            vec4 h = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);
            vec3 n = h.x * h.x * h.x * h.x * vec3(dot(d0, hash33(i)), dot(d1, hash33(i + i1)), dot(d2, hash33(i + i2)));
            return dot(vec3(dot(d3, hash33(i + 1.0))), n) * 31.316;
        }

        // FBM
        float fbm(vec2 p) {
            float f = 0.0;
            float amps = 0.5;
            for(int i=0; i<6; i++) {
                f += amps * sin(p.x * 2.0 + p.y * 5.0 + uTime*0.1);
            }
            return f;
        }

        void main() {
            // Turbulence pattern for storms
            vec2 p = vUv;

            // Flow simulation
            float flow = uTime * 0.02;

            float bandStructure = sin(p.y * 24.0 + sin(p.x * 3.0));
            float detail = sin(p.x * 40.0 + p.y * 100.0 + flow);

            float mixVal = bandStructure * 0.6 + detail * 0.1;
            mixVal = smoothstep(-0.8, 0.8, mixVal);

            vec3 col = mix(uColorA, uColorB, mixVal);
            col = mix(col, uColorC, smoothstep(0.4, 0.9, abs(bandStructure)));

            // Lighting
            float diff = max(dot(vNormal, uSunDir), 0.0);

            // Terminator softness
            diff = smoothstep(-0.2, 0.2, diff); // Shift shading to allow scattering wrap

            vec3 final = col * diff;

            // Rim light (Atmosphere scattering)
            float viewD = dot(normalize(vViewPos), vNormal);
            float rim = pow(1.0 - max(viewD, 0.0), 3.0);

            final += vec3(0.4, 0.6, 1.0) * rim * 0.5 * (diff + 0.2);

            gl_FragColor = vec4(final, 1.0);
        }
      `,
    });
    this.planet = new THREE.Mesh(pGeo, pMat);
    this.group.add(this.planet);

    // 1b. Atmosphere Halo
    const atmoGeo = new THREE.SphereGeometry(2.5 * 1.05, 64, 64);
    const atmoMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      uniforms: {
        uSunDir: { value: new THREE.Vector3(1.0, 0.2, 1.0).normalize() },
      },
      vertexShader: `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
      fragmentShader: `
            varying vec3 vNormal;
            uniform vec3 uSunDir;
            void main() {
                float view = dot(normalize(vNormal), vec3(0.0, 0.0, 1.0));
                float halo = pow(1.0 + view, 4.0);

                vec3 col = vec3(0.3, 0.6, 1.0) * halo * 2.0;
                gl_FragColor = vec4(col, halo * 0.6);
            }
        `,
    });
    this.group.add(new THREE.Mesh(atmoGeo, atmoMat));

    // 2. Main Ring
    const rGeo = new THREE.RingGeometry(3.5, 5.5, 128);
    const rMat = new THREE.MeshStandardMaterial({
      color: 0xaa8866,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      roughness: 0.8,
    });
    // Add texture noise manually or keep simple
    this.rings = new THREE.Mesh(rGeo, rMat);
    this.rings.rotation.x = Math.PI * 0.5;
    this.group.add(this.rings);

    // 3. Debris Field (Instanced)
    // Use low poly rocks
    const dGeo = new THREE.DodecahedronGeometry(0.1, 0);
    const dMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.9,
    });
    this.debris = new THREE.InstancedMesh(dGeo, dMat, this.count);
    this.group.add(this.debris);

    // Init Physics
    this.physics = new SimplePhysics(this.count);
    this.physics.bounds.set(20, 20, 20); // Large bounds
    this.physics.friction = 0.999; // Low friction for space

    // Init positions data
    for (let i = 0; i < this.count; i++) {
      // Distribute in a thick belt
      const angle = Math.random() * Math.PI * 2;
      const dist = 3.5 + Math.random() * 4.5;
      const y = (Math.random() - 0.5) * 0.5 * (dist - 2.0); // Thicker at edges

      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      this.physics.initParticle(i, new THREE.Vector3(x, y, z), 0.1);

      // Orbital velocity calculation
      // v = sqrt(GM/r) direction tangent
      const GM = 0.01; // Fake gravity constant strength
      const speed = Math.sqrt(GM / dist) * 20.0; // Boosted for visual effect

      const tx = -z;
      const tz = x;
      const len = Math.sqrt(tx * tx + tz * tz);

      // Set previous pos to create velocity
      // p_prev = p - v * dt
      // assuming dt=1 approx for init
      this.physics.oldPositions[i * 3] = x - (tx / len) * speed * 0.5;
      this.physics.oldPositions[i * 3 + 1] = y;
      this.physics.oldPositions[i * 3 + 2] = z - (tz / len) * speed * 0.5;

      this.dummy.position.set(x, y, z);
      this.dummy.updateMatrix();
      this.debris.setMatrixAt(i, this.dummy.matrix);
    }

    // Sunlight
    const sun = new THREE.DirectionalLight(0xffffff, 2.0);
    sun.position.set(10, 5, 10);
    this.group.add(sun);

    const fill = new THREE.AmbientLight(0x222233, 0.5);
    this.group.add(fill);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const t = ctx.time;
    const dt = Math.min(ctx.dt, 1 / 30);

    // Planet Shader
    (this.planet.material as THREE.ShaderMaterial).uniforms.uTime.value = t;

    // Pointer Gravity Well
    this.pointerPos.set(ctx.pointer.x * 12.0, ctx.pointer.y * 12.0, 0);

    // 1. Apply Central Gravity
    // F = G * m1 * m2 / r^2
    for (let i = 0; i < this.count; i++) {
      const idx = i * 3;
      const x = this.physics.positions[idx];
      const y = this.physics.positions[idx + 1];
      const z = this.physics.positions[idx + 2];

      // Distance to center
      const distSq = x * x + y * y + z * z + 0.1;
      const dist = Math.sqrt(distSq);

      // Gravity force
      const g = 0.005 / distSq;
      // Direction -normalized position
      const dx = -x / dist;
      const dy = -y / dist;
      const dz = -z / dist;

      this.physics.positions[idx] += dx * g;
      this.physics.positions[idx + 1] += dy * g;
      this.physics.positions[idx + 2] += dz * g;
    }

    // 2. Physics Step
    this.physics.update(dt, this.pointerPos, 5.0); // Repel radius 5.0

    // 3. Sync
    const sunDir = new THREE.Vector3(10, 5, 10).normalize();

    for (let i = 0; i < this.count; i++) {
      const idx = i * 3;
      const x = this.physics.positions[idx];
      const y = this.physics.positions[idx + 1];
      const z = this.physics.positions[idx + 2];

      this.dummy.position.set(x, y, z);

      // Rotate rocks
      this.dummy.rotation.set(i + t, i * 2 + t, i * 3);

      this.dummy.scale.setScalar(0.8 + Math.sin(i) * 0.3);
      this.dummy.updateMatrix();
      this.debris.setMatrixAt(i, this.dummy.matrix);
    }
    this.debris.instanceMatrix.needsUpdate = true;

    // Interactive tilt
    this.group.rotation.x = 0.4 + ctx.pointer.y * 0.2;
    this.group.rotation.z = 0.2 + ctx.pointer.x * 0.2;

    // Planet rotates
    this.planet.rotation.y = t * 0.05;

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 09: Crystalline Shards (Glitch/Refraction) ---

class VoronoiShardsScene extends SceneBase {
  private shards: THREE.InstancedMesh;
  private count = 1500; // High density
  private dummy = new THREE.Object3D();
  private data: Float32Array; // [speedInfo, axisInfo, offset]

  constructor() {
    super();
    this.id = 'scene09';
    this.contentRadius = 8.0;

    // Sharp, jagged geometry
    const geo = new THREE.TetrahedronGeometry(0.2, 0);

    // Custom "Holographic Glass" Shader
    // We fake dispersion and glitching in the shader
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPress: { value: 0 },
        uColorA: { value: new THREE.Color(0x00ffff) },
        uColorB: { value: new THREE.Color(0xff00ff) },
        uCube: { value: null }, // ideally we'd have an env map, but we'll simulate reflection
      },
      vertexShader: `
        attribute vec3 aData; // x: speed, y: random, z: phase
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vColor;
        varying float vGlitch;

        uniform float uTime;
        uniform float uPress;

        void main() {
            vec3 pos = position;

            // 1. Glitch Movement (Quantized Rotation)
            float t = uTime * aData.x + aData.z;
            // Quantize time for "stop motion" feel
            float qt = floor(t * 8.0) / 8.0;

            // Random glitch jumps on press
            float glitch = smoothstep(0.8, 1.0, sin(uTime * 20.0 + aData.y * 10.0)) * uPress;
            pos *= 1.0 + glitch * 2.0;
            vGlitch = glitch;

            // Instance Transform is handled automatically by three.js for position/rot/scale
            // But we want to modify the resulting world position slightly

            vec4 worldPos = instanceMatrix * vec4(pos, 1.0);

            // Vertical drift
            worldPos.y += sin(uTime * 0.5 + aData.z) * 0.5;

            vNormal = normalize(normalMatrix * normal);
            vec4 mvPosition = viewMatrix * worldPos;
            vViewPosition = -mvPosition.xyz;

            // Color data based on position
            vColor = vec3(0.5 + 0.5 * sin(aData.z), 0.5 + 0.5 * cos(aData.z), 1.0);

            gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vColor;
        varying float vGlitch;

        uniform vec3 uColorA;
        uniform vec3 uColorB;

        void main() {
            vec3 viewDir = normalize(vViewPosition);
            vec3 normal = normalize(vNormal);

            // fresnel
            float f = 1.0 - abs(dot(viewDir, normal));
            float fresnel = pow(f, 3.0);

            // Iridescence
            vec3 col = mix(uColorA, uColorB, f + vGlitch);

            // Core hardness
            col += vec3(1.0) * pow(f, 6.0); // sharp rim

            // Transparency / Additive
            gl_FragColor = vec4(col, 0.6 + 0.4 * fresnel);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.shards = new THREE.InstancedMesh(geo, mat, this.count);
    this.group.add(this.shards);

    // Init data
    this.data = new Float32Array(this.count * 3);
    const attr = new THREE.InstancedBufferAttribute(this.data, 3);
    geo.setAttribute('aData', attr);

    for (let i = 0; i < this.count; i++) {
      // Spiral formation
      const phi = Math.acos(1 - (2 * (i + 0.5)) / this.count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
      const r = 4.0 + Math.random() * 2.0;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      this.dummy.position.set(x, y, z);
      this.dummy.lookAt(0, 0, 0);
      this.dummy.updateMatrix();
      this.shards.setMatrixAt(i, this.dummy.matrix);

      // Attributes
      this.data[i * 3] = 0.2 + Math.random() * 0.8; // speed
      this.data[i * 3 + 1] = Math.random(); // rnd
      this.data[i * 3 + 2] = Math.random() * Math.PI * 2; // phase
    }
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const mat = this.shards.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = ctx.time;
    mat.uniforms.uPress.value = ctx.press;

    // Global rotation
    this.group.rotation.y = ctx.time * 0.05;
    this.group.rotation.z = Math.sin(ctx.time * 0.1) * 0.1;

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      2,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 10: Kinetic Moiré (Interference Patterns) ---

class MoireInterferenceScene extends SceneBase {
  private mesh: THREE.InstancedMesh;
  private count = 24; // Number of ring layers

  constructor() {
    super();
    this.id = 'scene10';
    this.contentRadius = 6.0;

    // Multiple transparent planes stacked
    const geo = new THREE.RingGeometry(0.1, 8.0, 64, 1);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPress: { value: 0 },
        uColor: { value: new THREE.Color(0xffffff) },
      },
      vertexShader: `
            attribute float aLayer;
            varying float vLayer;
            varying vec2 vUv;
            varying vec3 vPos;
            uniform float uTime;
            uniform float uPress;

            void main() {
                vLayer = aLayer;
                vUv = uv;

                vec3 pos = position;

                // Kinetic Separation (Z-expand on press)
                float zOff = aLayer * (0.05 + 0.5 * uPress);

                // Rotation per layer
                float angle = uTime * (0.1 + aLayer * 0.05) + aLayer * 10.0;
                float s = sin(angle);
                float c = cos(angle);

                // 2D Rotation matrix on XY
                mat2 rot = mat2(c, -s, s, c);
                pos.xy = rot * pos.xy;

                // Z placement
                pos.z += zOff;

                // Waviness
                float wave = sin(pos.x * 2.0 + uTime + aLayer) * 0.2;
                pos.z += wave * uPress;

                vPos = pos;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
      fragmentShader: `
            varying float vLayer;
            varying vec2 vUv;
            varying vec3 vPos;
            uniform float uTime;
            uniform float uPress;

            void main() {
                // Generate pattern
                float d = length(vPos.xy);

                // Interference pattern logic
                // Concentric rings
                float rings = sin(d * 20.0 + uTime * 5.0 - vLayer * 10.0);
                float alpha = smoothstep(0.0, 0.1, rings);

                // Hexagon Grid interference
                // Simple approx
                vec2 gv = fract(vPos.xy * 2.0) - 0.5;
                float grid = smoothstep(0.4, 0.45, length(gv));

                // Combine
                float pattern = mix(alpha, 1.0 - grid, 0.5 + 0.5 * sin(uTime));

                // Color ramp
                vec3 col = 0.5 + 0.5 * cos(uTime + vPos.xyx + vec3(0,2,4));
                col += vec3(1.0) * uPress;

                gl_FragColor = vec4(col, pattern * (0.2 + 0.1 * vLayer));
            }
        `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    // We need InstancedMesh for performance
    this.mesh = new THREE.InstancedMesh(geo, mat, this.count);

    const layers = new Float32Array(this.count);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < this.count; i++) {
      // Center them all initially
      dummy.position.set(0, 0, 0);
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);

      // Normalized layer index -1 to 1
      layers[i] = (i / this.count) * 2.0 - 1.0;
    }

    geo.setAttribute('aLayer', new THREE.InstancedBufferAttribute(layers, 1));
    this.group.add(this.mesh);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const mat = this.mesh.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = ctx.time;
    mat.uniforms.uPress.value = ctx.press;

    this.mesh.rotation.x = ctx.gyro.y * 0.5;
    this.mesh.rotation.y = ctx.gyro.x * 0.5;
    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 11: Neural Network (Deep Learning) ---

class NeuralNetworkScene extends SceneBase {
  private particles: THREE.InstancedMesh;
  private connections: THREE.LineSegments; // We'll keep lines but animate them better

  // Simulation params
  private nodeCount = 500; // Increased
  private positions: Float32Array;
  private velocities: Float32Array;

  constructor() {
    super();
    this.id = 'scene11';
    this.contentRadius = 6.0;

    // 1. Synapse Nodes (Glowing Neurons)
    const nodeGeo = new THREE.SphereGeometry(0.08, 16, 16);

    // Custom Shader for Neuron Pulse
    const nodeMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color(0x00aaff) }, // Cyan
        uColorB: { value: new THREE.Color(0xff0088) }, // Magenta
      },
      vertexShader: `
            attribute float aPhase;
            attribute float aSize;
            varying float vPhase;
            varying vec3 vPos;

            uniform float uTime;

            void main() {
                vPhase = aPhase;

                vec3 pos = position;
                // Pulse size
                float pulse = 1.0 + sin(uTime * 3.0 + aPhase) * 0.3;
                pos *= pulse * aSize;

                // Instance transform
                vec4 worldPos = instanceMatrix * vec4(pos, 1.0);
                vPos = worldPos.xyz;

                gl_Position = projectionMatrix * viewMatrix * worldPos;
            }
        `,
      fragmentShader: `
            varying float vPhase;
            varying vec3 vPos;
            uniform vec3 uColorA;
            uniform vec3 uColorB;
            uniform float uTime;

            void main() {
                // Signal Flash
                float signal = mod(uTime * 2.0 + vPhase, 4.0);
                float flash = smoothstep(0.0, 0.2, signal) * smoothstep(0.4, 0.2, signal);

                vec3 col = mix(uColorA, uColorB, flash);

                // Core glow
                col += vec3(1.0) * flash * 0.8;

                gl_FragColor = vec4(col, 1.0);
            }
        `,
    });

    this.nodes = new THREE.InstancedMesh(nodeGeo, nodeMat, this.nodeCount);

    this.positions = new Float32Array(this.nodeCount * 3);
    this.velocities = new Float32Array(this.nodeCount * 3);
    const aPhase = new Float32Array(this.nodeCount);
    const aSize = new Float32Array(this.nodeCount);

    const dummy = new THREE.Object3D();

    for (let i = 0; i < this.nodeCount; i++) {
      // Biology-like distribution (Brain shape approximation - somewhat oval)
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 4.0 * Math.cbrt(Math.random());

      let x = r * Math.sin(phi) * Math.cos(theta);
      let y = r * Math.sin(phi) * Math.sin(theta);
      let z = r * Math.cos(phi);

      // Squash to look brain-like? No, sphere is fine, maybe slightly flattened Y
      y *= 0.8;

      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = z;

      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      this.nodes.setMatrixAt(i, dummy.matrix);

      aPhase[i] = Math.random() * 10.0;
      aSize[i] = 0.5 + Math.random();

      // Drift velocity
      this.velocities[i * 3] = (Math.random() - 0.5) * 0.2;
      this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
      this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
    }

    this.nodes.geometry.setAttribute(
      'aPhase',
      new THREE.InstancedBufferAttribute(aPhase, 1)
    );
    this.nodes.geometry.setAttribute(
      'aSize',
      new THREE.InstancedBufferAttribute(aSize, 1)
    );

    this.group.add(this.nodes);

    // 2. Dynamic Connections (Only nearest neighbors computed once? Or simpler visuals?)
    // Realtime connection update is heavy in JS. Let's do a static web but animate the signals along it.

    const linePos = [];
    const linePhase = []; // For signal propagation offset

    for (let i = 0; i < this.nodeCount; i++) {
      const p1 = new THREE.Vector3(
        this.positions[i * 3],
        this.positions[i * 3 + 1],
        this.positions[i * 3 + 2]
      );
      let connectionsFound = 0;

      for (let j = i + 1; j < this.nodeCount; j++) {
        const p2 = new THREE.Vector3(
          this.positions[j * 3],
          this.positions[j * 3 + 1],
          this.positions[j * 3 + 2]
        );
        const dist = p1.distanceTo(p2);

        if (dist < 1.5 && connectionsFound < 3) {
          linePos.push(p1.x, p1.y, p1.z);
          linePos.push(p2.x, p2.y, p2.z);

          // Random phase for this line connection
          const ph = Math.random() * 10.0;
          linePhase.push(ph, ph); // Same phase for both vertices of the segment

          connectionsFound++;
        }
      }
    }

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(linePos, 3)
    );
    lineGeo.setAttribute(
      'aPhase',
      new THREE.Float32BufferAttribute(linePhase, 1)
    );

    const lineMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x00aaff) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexShader: `
            attribute float aPhase;
            varying float vPhase;
            varying vec3 vPos;
            void main() {
                vPhase = aPhase;
                vPos = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
      fragmentShader: `
            uniform float uTime;
            uniform vec3 uColor;
            varying float vPhase;
            varying vec3 vPos;

            void main() {
                // Signal pulses travelling along the web
                // We don't have UVs on lines easily, so use time + phase
                float signal = mod(uTime * 5.0 + vPhase, 10.0);
                float pulse = smoothstep(0.0, 1.0, signal) * smoothstep(2.0, 1.0, signal); // Short burst

                float alpha = 0.05 + pulse * 0.8;
                gl_FragColor = vec4(uColor, alpha);
            }
        `,
    });

    this.connections = new THREE.LineSegments(lineGeo, lineMat);
    this.group.add(this.connections);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    // Rotation
    this.group.rotation.y = ctx.time * 0.1;
    this.group.rotation.z = Math.sin(ctx.time * 0.1) * 0.1;

    // Shader Updates
    const nMat = this.nodes.material as THREE.ShaderMaterial;
    if (nMat.uniforms) nMat.uniforms.uTime.value = ctx.time;

    const lMat = this.connections.material as THREE.ShaderMaterial;
    if (lMat.uniforms) lMat.uniforms.uTime.value = ctx.time;

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    // Mouse Parallax
    this.camera.position.x = damp(
      this.camera.position.x,
      ctx.pointer.x * 2.0,
      2,
      ctx.dt
    );
    this.camera.position.y = damp(
      this.camera.position.y,
      ctx.pointer.y * 2.0,
      2,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 12: Library (Infinite Akasha) ---

class LibraryScene extends SceneBase {
  private books: THREE.InstancedMesh;
  private count = 2000;
  private dummy = new THREE.Object3D();

  constructor() {
    super();
    this.id = 'scene12';
    this.contentRadius = 6.0;
    this.baseDistance = 15.0; // Tunnel view

    // Book geometry
    const geo = new THREE.BoxGeometry(0.5, 3.0, 2.0); // Thick ancient tomes

    // Shader Material for "Magical Text"
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xffd700) }, // Gold
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPos;
        void main() {
            vUv = uv;
            vec4 worldPos = instanceMatrix * vec4(position, 1.0);
            vPos = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        varying vec2 vUv;
        varying vec3 vPos;

        float hash(float n) { return fract(sin(n) * 43758.5453123); }

        void main() {
            // Book Cover Base
            vec3 col = vec3(0.1, 0.05, 0.02); // Leather brown

            // Spine Text (Procedural Runes)
            // Assuming spine is front face or similar. Let's just project XZ

            vec2 runeGrid = floor(vUv * vec2(4.0, 10.0));
            float rune = hash(dot(runeGrid, vec2(12.9898, 78.233)) + floor(vPos.x));

            float isText = step(0.5, rune);

            // Trim/Border
            float border = step(0.1, vUv.x) * step(vUv.x, 0.9) * step(0.1, vUv.y) * step(vUv.y, 0.9);

            // Glowing Symbols
            float glow = abs(sin(uTime * 2.0 + vPos.y + vPos.x));

            if(isText > 0.5 && border > 0.5) {
                col = mix(col, uColor, glow);
            }

            gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    this.books = new THREE.InstancedMesh(geo, mat, this.count);

    // Spiral Tunnel Layout
    const radius = 6.0;

    for (let i = 0; i < this.count; i++) {
      const angle = i * 0.3;
      const z = i * 0.5 - this.count * 0.25; // Long Z tunnel

      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      this.dummy.position.set(x, y, z);

      // Look at center line, then rotate 90 deg to face camera
      this.dummy.lookAt(0, 0, z);
      this.dummy.rotateY(Math.PI / 2); // Spine facing out? Or in?
      // Random tilt
      this.dummy.rotateZ((Math.random() - 0.5) * 0.2);

      // Scale variation
      const s = 1.0 + Math.random() * 0.5;
      this.dummy.scale.set(1, s, 1);

      this.dummy.updateMatrix();
      this.books.setMatrixAt(i, this.dummy.matrix);
    }

    this.group.add(this.books);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const t = ctx.time;

    const mat = this.books.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = t;

    // Infinite Fly-through effect
    // We move the camera? Or the tunnel?
    // Let's move the tunnel group and wrap it? Instanced mesh manipulation is faster on GPU shader usually
    // But for 2000 instances, recalculating matrix on CPU is fine

    // Actually, just loop the camera Z position
    // No, we need to wrap the books.

    // Simple: Move group Z.
    this.group.position.z = (t * 5.0) % 50.0;
    // Rotate tunnel
    this.group.rotation.z = t * 0.1;

    this.camera.lookAt(0, 0, -100); // Look down tunnel
  }
}

// --- Scene 13: Deep Abyss (Underworld) ---

class BioluminescentScene extends SceneBase {
  private strands: THREE.Mesh;
  private spores: THREE.InstancedMesh;
  private count = 4000;
  private sporeCount = 2000;

  constructor() {
    super();
    this.id = 'scene13';
    this.contentRadius = 6.0;
    this.baseDistance = 15.0; // Further back

    // 1. "Anemone" Strands
    // We increase density and improve the shader
    const segs = 32; // smoother
    const strandGeo = new THREE.PlaneGeometry(0.08, 6.0, 1, segs);
    strandGeo.translate(0, 3.0, 0); // Pivot at bottom

    const geo = new THREE.InstancedBufferGeometry();
    geo.index = strandGeo.index;
    geo.attributes.position = strandGeo.attributes.position;
    geo.attributes.uv = strandGeo.attributes.uv;

    // Instanced attributes
    const offsets = new Float32Array(this.count * 3);
    const data = new Float32Array(this.count * 3); // phase, length, bend

    for (let i = 0; i < this.count; i++) {
      // Base sphere distribution with varied density (clusters)
      const r = 2.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      offsets[i * 3] = x;
      offsets[i * 3 + 1] = y;
      offsets[i * 3 + 2] = z;

      data[i * 3] = Math.random() * 100.0; // Phase
      data[i * 3 + 1] = 0.5 + Math.random() * 0.8; // Length multiplier
      data[i * 3 + 2] = 0.5 + Math.random(); // Bend flexibility
    }

    geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
    geo.setAttribute('aData', new THREE.InstancedBufferAttribute(data, 3));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPress: { value: 0 },
        uColor: { value: new THREE.Color(0x00ffaa) },
        uColorB: { value: new THREE.Color(0x8800ff) },
      },
      side: THREE.DoubleSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexShader: `
            uniform float uTime;
            uniform float uPress;
            attribute vec3 aOffset;
            attribute vec3 aData;

            varying float vProgress;
            varying float vAlpha;
            varying vec3 vPos;

            // Simple noise
            float hash(float n) { return fract(sin(n) * 43758.5453123); }

            void main() {
                vProgress = uv.y;

                // Base position on sphere
                vec3 basePos = aOffset;
                vec3 normal = normalize(basePos);

                // Rotate local position
                vec3 localPos = position;
                // Extend length
                localPos.y *= aData.y;

                // Bioluminescent Pulse (moves up the strand)
                float pulseSpeed = 1.0;
                float pulse = mod(uTime * pulseSpeed + aData.x, 10.0);
                // Widen pulse on press
                float w = 2.0 + uPress * 5.0;

                // Swaying movement
                float sway = sin(uTime * 1.0 + basePos.x + localPos.y * 0.5) * 0.2;
                sway += sin(uTime * 2.5 + basePos.z) * 0.1 * localPos.y; // whip tip

                // Apply bend
                vec3 tip = basePos + normal * localPos.y;
                tip += vec3(sway, sway * 0.5, sway * 0.8) * aData.z;

                // Explode out on press
                tip += normal * uPress * 4.0 * vProgress;

                gl_Position = projectionMatrix * modelViewMatrix * vec4(tip, 1.0);
                vPos = tip;

                // Alpha fade at bottom and top
                vAlpha = smoothstep(0.0, 0.1, vProgress) * (1.0 - vProgress);
                // Pulse brightness
                float pDist = abs(vProgress * 10.0 - pulse);
                float pGlow = smoothstep(w, 0.0, pDist);
                vAlpha += pGlow * 2.0;
            }
        `,
      fragmentShader: `
            uniform vec3 uColor;
            uniform vec3 uColorB;
            varying float vProgress;
            varying float vAlpha;
            varying vec3 vPos;

            void main() {
                vec3 c = mix(uColor, uColorB, vProgress);
                // Add white core
                c += vec3(1.0) * smoothstep(0.5, 1.0, vAlpha - 0.5);
                gl_FragColor = vec4(c, min(1.0, vAlpha));
            }
        `,
    });

    this.strands = new THREE.Mesh(geo, mat);
    this.group.add(this.strands);

    // 2. Floating Spores (Particles)
    const sporeGeo = new THREE.IcosahedronGeometry(0.02, 1);
    const sporeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    // Actually use shader for twinkle
    const sporeShader = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xccffaa) },
      },
      vertexShader: `
            attribute float aPhase;
            varying float vAlpha;
            uniform float uTime;
            void main() {
                vec3 pos = position;
                vec4 worldPos = instanceMatrix * vec4(pos, 1.0);

                // Rise up
                float rise = mod(uTime * 0.5 + aPhase, 10.0);
                worldPos.y += rise;

                gl_Position = projectionMatrix * viewMatrix * worldPos;

                // Twinkle
                float twinkle = sin(uTime * 5.0 + aPhase * 10.0);
                vAlpha = smoothstep(-0.5, 1.0, twinkle);
            }
        `,
      fragmentShader: `
            uniform vec3 uColor;
            varying float vAlpha;
            void main() {
                gl_FragColor = vec4(uColor, vAlpha);
            }
        `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.spores = new THREE.InstancedMesh(
      sporeGeo,
      sporeShader,
      this.sporeCount
    );

    // Distribute spores around the sphere
    const dummy = new THREE.Object3D();
    const phases = new Float32Array(this.sporeCount);

    for (let i = 0; i < this.sporeCount; i++) {
      const r = 2.0 + Math.random() * 4.0;
      const theta = Math.random() * 6.28;
      const phi = Math.random() * 3.14;

      dummy.position.setFromSphericalCoords(r, phi, theta);
      dummy.position.y -= 5.0; // Start lower
      dummy.scale.setScalar(0.5 + Math.random());
      dummy.updateMatrix();
      this.spores.setMatrixAt(i, dummy.matrix);

      phases[i] = Math.random() * 10.0;
    }

    sporeGeo.setAttribute(
      'aPhase',
      new THREE.InstancedBufferAttribute(phases, 1)
    );
    this.group.add(this.spores);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const mat = this.strands.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = ctx.time;
    mat.uniforms.uPress.value = ctx.press;

    const sporeMat = this.spores.material as THREE.ShaderMaterial;
    sporeMat.uniforms.uTime.value = ctx.time;

    this.group.rotation.y = ctx.time * 0.05;

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 14: Cyber City (Network) ---

class HolographicCityScene extends SceneBase {
  private city: THREE.Group;
  private traffic: THREE.InstancedMesh;
  private buildings: THREE.InstancedMesh;

  // Traffic Params
  private trafficCount = 20000; // HUGE increase from 3000 to 20000

  constructor() {
    super();
    this.id = 'scene14';
    this.contentRadius = 8.0;
    this.city = new THREE.Group();

    // ---------------------------------------------------------
    // 1. Cyberpunk Buildings (Procedural Shader)
    // ---------------------------------------------------------
    const bGeo = new THREE.BoxGeometry(1, 1, 1);
    bGeo.translate(0, 0.5, 0); // Pivot at bottom

    // Custom Shader for "Data Buildings"
    const bMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uBaseColor: { value: new THREE.Color(0x050510) },
        uRimColor: { value: new THREE.Color(0x0088ff) },
        uWindowColor: { value: new THREE.Color(0xffaa00) },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPos;
        varying vec3 vWorldPos;
        varying float vHeight;

        void main() {
          vUv = uv;
          vPos = position;

          // Instance Matrix handles placement
          vec4 worldPos = instanceMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vHeight = worldPos.y; // approximate height for gradients

          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying vec3 vPos;
        varying vec3 vWorldPos;
        varying float vHeight;
        uniform float uTime;
        uniform vec3 uBaseColor;
        uniform vec3 uRimColor;
        uniform vec3 uWindowColor;

        // Random function
        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        void main() {
            // 1. Base Glassy Body
            vec3 color = uBaseColor;
            float alpha = 0.85;

            // 2. Grid / Wireframe effect (Barycentric fake or UV based)
            // Edges logic
            float edgeThick = 0.02;
            float gridX = step(1.0 - edgeThick, vUv.x) + step(vUv.x, edgeThick);
            float gridY = step(1.0 - edgeThick, vUv.y) + step(vUv.y, edgeThick);
            float isEdge = clamp(gridX + gridY, 0.0, 1.0);

            color += uRimColor * isEdge * 0.5;

            // 3. Procedural Windows
            // Map world position to grid
            vec2 winGrid = floor(vWorldPos.xz * 1.5 + vWorldPos.y * 3.0);
            float winRand = random(winGrid + floor(uTime * 0.5)); // flicker slowly

            // Only show windows on sides, not roof (vPos.y > 0.99 is roof)
            float isSide = step(vPos.y, 0.99);

            if (isSide > 0.5 && winRand > 0.7) {
                // Window shape
                float wx = fract(vWorldPos.x * 2.0 + vWorldPos.z * 2.0);
                float wy = fract(vWorldPos.y * 4.0);
                float winShape = step(0.2, wx) * step(0.8, wx) * step(0.2, wy) * step(0.8, wy);

                color += uWindowColor * winShape * 2.0; // HDR Glow
            }

            // 4. Scanline Sweep
            float scan = fract(uTime * 0.2 - vWorldPos.y * 0.05);
            float scanLine = smoothstep(0.48, 0.5, scan) * smoothstep(0.52, 0.5, scan);
            color += uRimColor * scanLine * 3.0;

            // 5. Bottom Fade (Fog)
            float fog = smoothstep(-15.0, 0.0, vWorldPos.y);
            alpha *= fog;

            gl_FragColor = vec4(color, alpha);
        }
      `,
    });

    this.buildings = new THREE.InstancedMesh(bGeo, bMat, 1500);

    // Generate City Layout
    const dummy = new THREE.Object3D();
    let idx = 0;
    const gridS = 32;
    for (let x = -gridS; x <= gridS; x++) {
      for (let z = -gridS; z <= gridS; z++) {
        // Skip center for camera fly-through
        const dist = Math.sqrt(x * x + z * z);
        if (dist < 3) continue;

        const density = Math.random();
        if (density > 0.3) continue; // 30% fill
        if (idx >= 1500) break;

        const h = 2.0 + Math.pow(Math.random(), 4.0) * 30.0; // Towering skyscrapers

        dummy.position.set(x * 2.5, -10.0, z * 2.5);
        dummy.scale.set(1.5 + Math.random(), h, 1.5 + Math.random());
        dummy.updateMatrix();
        this.buildings.setMatrixAt(idx++, dummy.matrix);
      }
    }
    this.city.add(this.buildings);

    // ---------------------------------------------------------
    // 2. GPU Traffic System (High Performance)
    // ---------------------------------------------------------
    const tGeo = new THREE.BoxGeometry(0.2, 0.1, 0.5);
    // Custom shader for traffic to handle movement on GPU
    const tMat = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
            attribute vec3 aOffset; // x=lane, y=height, z=startZ
            attribute float aSpeed;
            attribute vec3 aColor;

            varying vec3 vColor;

            uniform float uTime;

            void main() {
                vColor = aColor;

                vec3 pos = position;

                // Animate Z
                // Loop domain: -60 to 60
                float z = aOffset.z + uTime * aSpeed;
                z = mod(z + 60.0, 120.0) - 60.0;

                // World Position transform
                vec3 finalWorld = vec3(aOffset.x, aOffset.y, z);

                // Stretch car based on speed
                float stretch = 1.0 + abs(aSpeed) * 0.2;
                pos.z *= stretch;

                gl_Position = projectionMatrix * viewMatrix * vec4(finalWorld + pos, 1.0);
            }
        `,
      fragmentShader: `
            varying vec3 vColor;
            void main() {
                gl_FragColor = vec4(vColor, 0.8);
            }
        `,
    });

    this.traffic = new THREE.InstancedMesh(tGeo, tMat, this.trafficCount);

    // Fill Attributes
    const aOffset = new Float32Array(this.trafficCount * 3);
    const aSpeed = new Float32Array(this.trafficCount);
    const aColor = new Float32Array(this.trafficCount * 3);

    const colorPalette = [
      new THREE.Color(0xff0055), // Red/Pink
      new THREE.Color(0x00ffff), // Cyan
      new THREE.Color(0xffcc00), // Gold
      new THREE.Color(0xffffff), // White
    ];

    for (let i = 0; i < this.trafficCount; i++) {
      // Random Lane (Grid aligned)
      const laneX =
        (Math.floor(Math.random() * 60) - 30) * 2.5 +
        (Math.random() > 0.5 ? 0.8 : -0.8);

      const h = -10.0 + Math.random() * 25.0; // Various altitudes
      const startZ = Math.random() * 120.0 - 60.0;

      aOffset[i * 3 + 0] = laneX;
      aOffset[i * 3 + 1] = h;
      aOffset[i * 3 + 2] = startZ;

      // Speed: mix of fast and slow
      const spd = 5.0 + Math.random() * 20.0;
      const dir = Math.floor(laneX / 2.5) % 2 === 0 ? 1.0 : -1.0;
      aSpeed[i] = spd * dir;

      // Color
      const c = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      aColor[i * 3 + 0] = c.r;
      aColor[i * 3 + 1] = c.g;
      aColor[i * 3 + 2] = c.b;

      this.traffic.setMatrixAt(i, new THREE.Matrix4());
    }

    this.traffic.geometry.setAttribute(
      'aOffset',
      new THREE.InstancedBufferAttribute(aOffset, 3)
    );
    this.traffic.geometry.setAttribute(
      'aSpeed',
      new THREE.InstancedBufferAttribute(aSpeed, 1)
    );
    this.traffic.geometry.setAttribute(
      'aColor',
      new THREE.InstancedBufferAttribute(aColor, 3)
    );

    this.city.add(this.traffic);
    this.group.add(this.city);

    // 3. Background / Atmosphere
    if (!this.bg) this.bg = new THREE.Color(0x020205);
  }

  init(_ctx: SceneRuntime) {
    if (this.bg) this.bg = new THREE.Color(0x020205);
  }

  update(ctx: SceneRuntime) {
    // Camera Orbit
    this.group.rotation.y = Math.sin(ctx.time * 0.1) * 0.2;

    // Update Uniforms
    const bMat = this.buildings.material as THREE.ShaderMaterial;
    if (bMat.uniforms) bMat.uniforms.uTime.value = ctx.time;

    const tMat = this.traffic.material as THREE.ShaderMaterial;
    if (tMat.uniforms) tMat.uniforms.uTime.value = ctx.time;

    // Camera Flyover
    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    // Lift camera on press
    this.camera.position.y = damp(
      this.camera.position.y,
      6 + ctx.press * 20,
      2,
      ctx.dt
    );

    // Look down into city
    this.camera.lookAt(0, -5, 0);
  }
}

// --- Scene 15: Reality Collapse (Entropy) ---

class RealityCollapseScene extends SceneBase {
  private mesh: THREE.InstancedMesh;
  private count = 3000;

  constructor() {
    super();
    this.id = 'scene15';
    this.contentRadius = 6.0;

    // Use Cubes for "Voxel" aesthetic
    const geometry = new THREE.BoxGeometry(0.12, 0.12, 0.12);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPress: { value: 0 },
      },
      vertexShader: `
        attribute vec3 aPos;
        attribute float aSpeed;

        varying vec3 vColor;
        varying float vGlitch;

        uniform float uTime;
        uniform float uPress;

        float hash(float n) { return fract(sin(n) * 43758.5453); }
        float noise(in vec3 x) {
            vec3 p = floor(x);
            vec3 f = fract(x);
            f = f*f*(3.0-2.0*f);
            float n = p.x + p.y*57.0 + 113.0*p.z;
            return mix(mix(mix( hash(n+  0.0), hash(n+  1.0),f.x),
                           mix( hash(n+ 57.0), hash(n+ 58.0),f.x),f.y),
                       mix(mix( hash(n+113.0), hash(n+114.0),f.x),
                           mix( hash(n+170.0), hash(n+171.0),f.x),f.y),f.z);
        }

        void main() {
             vec3 pos = position; // Local box coord

             // 1. Instance Orbit
             // Rotate aPos around center
             float t = uTime * aSpeed * 0.3;

             // Quaternion-like rotation around random axis
             // Simplified: just rotate around Y + slight wobble
             float c = cos(t);
             float s = sin(t);

             vec3 pCenter = aPos;

             // Rotate 'pCenter'
             float x = pCenter.x * c - pCenter.z * s;
             float z = pCenter.x * s + pCenter.z * c;
             pCenter.x = x;
             pCenter.z = z;

             // Wobble
             pCenter.y += sin(t * 2.0 + pCenter.x) * 0.5;

             // 2. Glitch Effect
             // Noise field
             float n = noise(pCenter * 0.5 + uTime);
             float glitchTrigger = smoothstep(0.6, 0.8, n); // Threshold

             // Hard snap
             if(glitchTrigger > 0.5) {
                // Snap to grid
                pCenter = floor(pCenter * 2.0) / 2.0;
                // Offset randomly
                pCenter.x += (hash(uTime) - 0.5) * 0.5;
             }

             // 3. Explosion (Press)
             vec3 dir = normalize(pCenter);
             pCenter += dir * uPress * n * 5.0; // Expand outward

             // 4. Combine
             // We manually construct world position to bypass instanceMatrix
             // (assuming we didn't set meaningful instanceMatrices)
             vec4 world = modelMatrix * vec4(pCenter + pos, 1.0);
             gl_Position = projectionMatrix * viewMatrix * world;

             // 5. Color
             // Normal color
             vColor = mix(vec3(0.05, 0.05, 0.05), vec3(0.8, 0.8, 0.8), n);
             // Glitch color
             if(glitchTrigger > 0.5) {
                 vColor = vec3(1.0, 0.2, 0.0); // Red
                 vGlitch = 1.0;
             } else {
                 vGlitch = 0.0;
             }
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vGlitch;

        void main() {
            vec3 c = vColor;
            // Scanline if glitch
            if(vGlitch > 0.5) {
                if(mod(gl_FragCoord.y, 4.0) < 2.0) discard;
            }
            gl_FragColor = vec4(c, 1.0);
        }
      `,
    });

    this.mesh = new THREE.InstancedMesh(geometry, material, this.count);

    // Fill Attributes
    const aPos = new Float32Array(this.count * 3);
    const aSpeed = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
      const r = 3.0 + Math.random() * 5.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      aPos[i * 3] = x;
      aPos[i * 3 + 1] = y;
      aPos[i * 3 + 2] = z;

      aSpeed[i] = 0.5 + Math.random();

      this.mesh.setMatrixAt(i, new THREE.Matrix4()); // Identity
    }

    this.mesh.geometry.setAttribute(
      'aPos',
      new THREE.InstancedBufferAttribute(aPos, 3)
    );
    this.mesh.geometry.setAttribute(
      'aSpeed',
      new THREE.InstancedBufferAttribute(aSpeed, 1)
    );

    this.group.add(this.mesh);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const mat = this.mesh.material as THREE.ShaderMaterial;
    if (mat.uniforms) {
      mat.uniforms.uTime.value = ctx.time;
      mat.uniforms.uPress.value = ctx.press;
    }

    this.group.rotation.y = ctx.time * 0.1;

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 16: Electric Storm (Volumetric) ---

class ElectricStormScene extends SceneBase {
  private cloud: THREE.Mesh;

  constructor() {
    super();
    this.id = 'scene16';
    this.contentRadius = 10.0;
    this.baseDistance = 15.0; // Inside the volume

    const geo = new THREE.BoxGeometry(30, 30, 30);
    geo.scale(-1, 1, 1); // Invert for inside view

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPress: { value: 0 },
        uCameraPos: { value: new THREE.Vector3() },
        uResolution: {
          value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
        uPointer: { value: new THREE.Vector3() },
      },
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false, // Important for inner volume
      vertexShader: `
        varying vec3 vWorldPos;
        varying vec2 vUv;
        void main() {
            vUv = uv;
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPos = worldPosition.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uPress;
        uniform vec3 uCameraPos;
        uniform vec2 uResolution;
        varying vec3 vWorldPos;

        // --------------------------------------------------------
        // High Quality Noise
        // --------------------------------------------------------

        float hash(float n) { return fract(sin(n) * 753.5453123); }
        float noise(vec3 x) {
            vec3 p = floor(x);
            vec3 f = fract(x);
            f = f * f * (3.0 - 2.0 * f);
            float n = p.x + p.y * 157.0 + 113.0 * p.z;
            return mix(mix(mix(hash(n + 0.0), hash(n + 1.0), f.x),
                           mix(hash(n + 157.0), hash(n + 158.0), f.x), f.y),
                       mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
                           mix(hash(n + 270.0), hash(n + 271.0), f.x), f.y), f.z);
        }

        // FBM with Domain Warping for "Fluid" look
        float fbm(vec3 p) {
            float f = 0.0;
            float amp = 0.5;
            // Rotation matrix to improve quality
            mat3 m = mat3(0.00, 0.80, 0.60,
                         -0.80, 0.36, -0.48,
                         -0.60, -0.48, 0.64);

            for(int i=0; i<4; i++) {
                f += amp * noise(p);
                p = m * p * 2.02;
                amp *= 0.5;
            }
            return f;
        }

        float map(vec3 p) {
            // Animate space
            vec3 q = p - vec3(0.0, 0.0, uTime * 0.5);

            // Domain warp
            float f = fbm(q);

            // Dense nebula
            float dens = fbm(q + f * 2.5); // Nested FBM (Warping)

            // Interaction: Press clears the fog
            dens *= (1.0 - uPress * 0.9);

            // Shaping to prevent infinite wall
            // Fade density if far from center
            // float dist = length(p);
            // dens *= smoothstep(20.0, 10.0, dist);

            return smoothstep(0.35, 0.75, dens);
        }

        vec3 getLight(vec3 p, vec3 rd, float dens) {
            // Internal lightning flashes
            float t = uTime * 3.0;
            vec3 pos = p * 0.5;
            float storm = noise(pos + vec3(0, t, 0)) * noise(pos - vec3(t, 0, 0));
            float flash = smoothstep(0.6, 1.0, storm) * step(0.9, sin(t * 10.0)); // Strobe

            // Colors
            vec3 baseColor = vec3(0.05, 0.0, 0.1); // Deep Void Purple
            vec3 cloudColor = vec3(0.1, 0.3, 0.7); // Nebula Blue
            vec3 flashColor = vec3(0.8, 0.9, 1.0) * 8.0; // HDR White/Blue

            // Gradient based on density
            vec3 col = mix(baseColor, cloudColor, dens);
            col += flashColor * flash * dens;

            return col;
        }

        void main() {
             vec3 rd = normalize(vWorldPos - uCameraPos);
             vec3 ro = uCameraPos;

             // Raymarching
             vec3 col = vec3(0.0);
             float T = 1.0; // Transmittance
             float t = 0.5; // Start offset

             // Dithering to hide banding
             t += hash(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 0.3;

             float maxDist = 30.0;
             int steps = 50;

             for(int i=0; i<steps; i++) {
                 vec3 p = ro + rd * t;

                 // Density at this point
                 float density = map(p * 0.25); // Scale noise space

                 if(density > 0.01) {
                     // Light calculation (Beer's Law)
                     float absorption = density * 0.3; // How thick

                     // Light contribution
                     vec3 light = getLight(p, rd, density);

                     // Accumulate
                     col += light * absorption * T;
                     T *= (1.0 - absorption);

                     if( T < 0.01 ) break;
                 }

                 t += 0.5; // Step size
                 if(t > maxDist) break;
             }

             // Background blend
             vec3 bg = mix(vec3(0.0), vec3(0.01, 0.01, 0.05), rd.y * 0.5 + 0.5);
             col += bg * T;

             gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.cloud = new THREE.Mesh(geo, mat);
    this.group.add(this.cloud);
  }

  init(ctx: SceneRuntime) {
    if (this.bg) this.bg = new THREE.Color(0x010103);
  }

  resize(ctx: SceneRuntime) {
    const mat = this.cloud.material as THREE.ShaderMaterial;
    if (mat.uniforms.uResolution) {
      mat.uniforms.uResolution.value.set(
        ctx.size.width * ctx.size.dpr,
        ctx.size.height * ctx.size.dpr
      );
    }
  }

  update(ctx: SceneRuntime) {
    const mat = this.cloud.material as THREE.ShaderMaterial;
    if (mat.uniforms) {
      mat.uniforms.uTime.value = ctx.time;
      mat.uniforms.uPress.value = ctx.press;
      mat.uniforms.uCameraPos.value.copy(this.camera.position);
    }

    // Slow drift rotation
    this.group.rotation.y = ctx.time * 0.05;

    // Camera movement
    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    // Allow looking around
    this.camera.position.x = damp(
      this.camera.position.x,
      ctx.pointer.x * 5,
      2,
      ctx.dt
    );
    this.camera.position.y = damp(
      this.camera.position.y,
      ctx.pointer.y * 5,
      2,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Factory ---

export const createScenes = (): TowerScene[] => [
  new FeedbackForgeScene(),
  new LiquidMetalScene(),
  new MillionFirefliesScene(),
  new RibbonFieldScene(),
  new AuroraCurtainScene(),
  new EventHorizonScene(),
  new KaleidoGlassScene(),
  new MatrixRainScene(),
  new OrbitalMechanicsScene(),
  new VoronoiShardsScene(),
  new MoireInterferenceScene(),
  new NeuralNetworkScene(),
  new LibraryScene(),
  new BioluminescentScene(),
  new HolographicCityScene(),
  new RealityCollapseScene(),
  new ElectricStormScene(),
];

export const getSceneMeta = () => sceneMeta;
