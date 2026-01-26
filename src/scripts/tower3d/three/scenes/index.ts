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
  audio: { level: number; low: number; mid: number; high: number };
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
    title: 'Neon Metropolis',
    subtitle: 'Future State',
    index: 14,
  },
  { id: 'scene15', title: 'Digital Decay', subtitle: 'Collapse', index: 15 },
  {
    id: 'scene16',
    title: 'Electric Storm',
    subtitle: 'Volumetric',
    index: 16,
  },
];

// --- Math Helpers ---

const damp = (current: number, target: number, lambda: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));

// --- Base Class (The "Centering" Fix) ---

abstract class SceneBase implements TowerScene {
  id: string = 'unknown'; // Added default
  group: THREE.Group;
  camera: THREE.PerspectiveCamera;
  bg?: THREE.Color;

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
    if (typeof document === 'undefined') {
      return new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    }
    const cvs = document.createElement('canvas');
    cvs.width = 32;
    cvs.height = 32;
    const ctx = cvs.getContext('2d')!;
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.2, 'rgba(255,220,150,0.8)');
    grad.addColorStop(0.5, 'rgba(255,100,50,0.4)');
    grad.addColorStop(1, 'rgba(0,0,0,0)'); // Transparent boundary
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
    // Expontential pulse for impact + Audio
    mat.uniforms.uPulse.value =
      Math.pow(ctx.press, 2.0) + Math.pow(ctx.audio.low, 2.0) * 2.5;

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
        0.2 +
        Math.sin(t * 2.0 + i) * 0.1 +
        ctx.press * 3.0 +
        ctx.audio.level * 4.0;

      // Color shift on press
      if (ctx.press > 0.5) {
        ringMat.emissive.setHSL(0.05 + 0.1 * ctx.press, 1.0, 0.5);
      } else {
        ringMat.emissive.setHex(0xff4400);
      }
    });

    // Particle orbit field
    /* const pos = this.particles.geometry.attributes.position
      .array as Float32Array;
    const count = this.particles.geometry.attributes.position.count; */

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
  private count = 600;
  private dummy = new THREE.Object3D();

  constructor() {
    super();
    this.id = 'scene03';
    this.contentRadius = 6.0;

    // Use a higher resolution plane strip
    const geo = new THREE.PlaneGeometry(0.15, 20, 2, 200);

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
        attribute vec3 aColor;

        varying vec2 vUv;
        varying vec3 vColor;
        varying float vAlpha;
        varying vec3 vViewPos;
        varying vec3 vNormal;

        uniform float uTime;
        uniform float uPress;

        void main() {
            vUv = uv;
            vColor = aColor;

            // t goes 0..1 along the ribbon length
            float t = (position.y + 10.0) / 20.0;

            // Flow animation loops
            float flow = fract(t + uTime * aSpeed * 0.1 + aOffset);

            // Parametric Path: Torus Knot variant
            float angle = flow * 6.28318 * 2.0; // 2 loops

            // Complex knot
            float r = 3.0 + cos(angle * 3.0) * 1.5;
            float px = r * cos(angle);
            float py = r * sin(angle);
            float pz = sin(angle * 3.0) * 2.0;

            // Press modulation (Unravel)
            float unravel = uPress * 5.0;
            px += sin(angle * 5.0) * unravel;
            pz += cos(angle * 5.0) * unravel;

            vec3 curvePos = vec3(px, pz, py); // Orient for camera

            // Derivative for Frenet frame
            float eps = 0.01;
            float angle2 = angle + eps;
            float r2 = 3.0 + cos(angle2 * 3.0) * 1.5;
            vec3 curvePos2 = vec3(r2*cos(angle2), sin(angle2*3.0)*2.0, r2*sin(angle2));
            // Apply unravel to tangent too approx
            curvePos2.x += sin(angle2 * 5.0) * unravel;

            vec3 tangent = normalize(curvePos2 - curvePos);
            vec3 up = vec3(0.0, 1.0, 0.0);
            vec3 right = normalize(cross(tangent, up));
            vec3 normal = cross(right, tangent);

            // Ribbon Twist
            float twist = flow * 3.14 * 8.0 + uTime;
            float c = cos(twist);
            float s = sin(twist);
            // Rotate 'right' vector around 'tangent'
            vec3 twistedRight = right * c + normal * s;
            vec3 twistedNormal = normal * c - right * s;

            vNormal = normalize(normalMatrix * twistedNormal);

            // Width expansion
            vec3 finalPos = curvePos + twistedRight * position.x * (1.0 + uPress * 10.0);

            vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            vViewPos = -mvPosition.xyz;

            // Fade edges of the flow loop
            vAlpha = smoothstep(0.0, 0.1, flow) * (1.0 - smoothstep(0.9, 1.0, flow));
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying vec3 vColor;
        varying float vAlpha;
        varying vec3 vViewPos;
        varying vec3 vNormal;

        void main() {
            vec3 viewDir = normalize(vViewPos);
            vec3 normal = normalize(vNormal);
            float NdotV = dot(normal, viewDir);
            float fresnel = pow(1.0 - abs(NdotV), 3.0);

            // Holographic Interference
            // Bands based on view angle
            float irid = sin(NdotV * 10.0 + vUv.y * 20.0);
            vec3 rainbow = 0.5 + 0.5 * cos(vec3(0,2,4) + irid * 3.0);

            vec3 col = mix(vColor, rainbow, 0.5 * fresnel);

            // Metallic highlight
            float spec = pow(max(dot(reflect(-viewDir, normal), vec3(0,1,0)), 0.0), 30.0);
            col += vec3(1.0) * spec;

            gl_FragColor = vec4(col, vAlpha * (0.6 + 0.4 * fresnel));
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, this.count);

    const offsets = new Float32Array(this.count);
    const speeds = new Float32Array(this.count);
    const colors = new Float32Array(this.count * 3);

    for (let i = 0; i < this.count; i++) {
      // We pack all geometry at 0, logic is in shader
      this.dummy.position.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);

      offsets[i] = Math.random();
      speeds[i] = 0.8 + Math.random() * 0.4;

      const c = new THREE.Color().setHSL(0.5 + Math.random() * 0.2, 0.8, 0.5);
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

    // Slowly rotate the whole knot
    this.group.rotation.x = ctx.time * 0.1;
    this.group.rotation.y = ctx.time * 0.15;

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
  private count = 40; // Fewer but larger curtains
  private dummy = new THREE.Object3D();

  constructor() {
    super();
    this.id = 'scene04';
    this.contentRadius = 8.0;

    // A single long, tall curtain strip
    // Width 5, Height 20, WidthSegs 60, HeightSegs 20
    const geo = new THREE.PlaneGeometry(12, 20, 60, 20);

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

           // Large sweeping wave for shape
           float t = uTime * 0.1 + aPhase;
           float flow = pos.x * 0.2 + t;

           float wave = snoise(vec2(flow, aIndex * 0.2));
           pos.z += wave * 4.0;

           // Twist vertically
           pos.z += sin(pos.y * 0.2 + t) * 2.0;

           // Alpha fade at edges
           vAlpha = smoothstep(-10.0, -5.0, pos.y) * (1.0 - smoothstep(5.0, 10.0, pos.y));
           vAlpha *= smoothstep(-6.0, -4.0, pos.x) * (1.0 - smoothstep(4.0, 6.0, pos.x));

           gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying float vAlpha;
        varying float vIndex;
        uniform float uTime;
        uniform vec3 uColor1;
        uniform vec3 uColor2;

        float hash( float n ) { return fract(sin(n)*43758.5453123); }

        void main() {
           // Vertical Rays
           float rayPos = vUv.x * 20.0 + sin(vUv.y * 5.0 + uTime + vIndex) * 2.0;
           float rays = sin(rayPos) * 0.5 + 0.5;
           rays = pow(rays, 8.0); // sharp rays

           // Color gradient
           // Aurora is often green at bottom, purple/red at top
           vec3 col = mix(uColor1, uColor2, vUv.y + 0.2 * sin(uTime));

           // Add brightness from rays
           col += vec3(0.5, 1.0, 0.8) * rays;

           float finalAlpha = vAlpha * 0.4 * (0.5 + 0.5 * rays);

           gl_FragColor = vec4(col, finalAlpha);
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, this.count);

    const indices = new Float32Array(this.count);
    const phases = new Float32Array(this.count);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < this.count; i++) {
      dummy.position.set(
        (Math.random() - 0.5) * 5.0,
        Math.random() * 2.0 - 1.0,
        (Math.random() - 0.5) * 10.0
      );
      // Tilt curtains
      dummy.rotation.x = (Math.random() - 0.5) * 0.5;
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

    this.group.rotation.y = ctx.time * 0.02;

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 05: Event Horizon (Gargantua) ---

class EventHorizonScene extends SceneBase {
  private disk: THREE.Mesh;
  private hole: THREE.Mesh;
  private photonRing: THREE.Mesh;

  constructor() {
    super();
    this.id = 'scene05';
    this.contentRadius = 8.0;

    // 1. Schwarzschild Black Hole (The Void)
    const holeGeo = new THREE.SphereGeometry(1.9, 64, 64);
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.hole = new THREE.Mesh(holeGeo, holeMat);
    this.group.add(this.hole);

    // 2. Photon Ring (The thin glowing line at 1.5Rs)
    const photonGeo = new THREE.RingGeometry(1.92, 2.05, 128);
    const photonMat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xffffff) },
      },
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        varying vec3 vPos;
        void main() {
          float alpha = 0.8 + 0.2 * sin(uTime * 10.0);
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.photonRing = new THREE.Mesh(photonGeo, photonMat);
    this.group.add(this.photonRing);

    // 3. Accretion Disk (Deformed by Gravity)
    // High-res ring with shader-based noise
    const diskGeo = new THREE.RingGeometry(2.2, 12.0, 128, 32);

    const diskMat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color(0xff5500) }, // Hot Orange
        uColorB: { value: new THREE.Color(0xffddaa) }, // White/Blue hot
        uCamPos: { value: new THREE.Vector3() },
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vDoppler;
        varying vec3 vWorldPos;

        uniform float uTime;
        uniform vec3 uCamPos;

        void main() {
          vUv = uv;
          vec3 pos = position;
          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;

          // Doppler calculation
          vec3 tangent = normalize(vec3(-pos.y, pos.x, 0.0));
          vec3 viewDirLocal = normalize(uCamPos - worldPos.xyz);
          vDoppler = dot(tangent, viewDirLocal);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying float vDoppler;
        uniform float uTime;
        uniform vec3 uColorA;
        uniform vec3 uColorB;

        // FBM Noise
        float hash(float n) { return fract(sin(n) * 43758.5453123); }
        float noise(vec2 x) {
            vec2 p = floor(x);
            vec2 f = fract(x);
            f = f*f*(3.0-2.0*f);
            float n = p.x + p.y*57.0;
            return mix(mix(hash(n+0.0), hash(n+1.0),f.x),
                       mix(hash(n+57.0), hash(n+58.0),f.x),f.y);
        }
        float fbm(vec2 p) {
            float f = 0.0; float w = 0.5;
            for(int i=0; i<5; i++){ f += w*noise(p); p*=2.0; w*=0.5; }
            return f;
        }

        void main() {
            float r = length(vWorldPos.xz);
            vec2 polar = vec2(atan(vWorldPos.z, vWorldPos.x), length(vWorldPos.xz));

            // Spiral motion
            float speed = 2.0 / (polar.y + 0.1);
            vec2 flow = vec2(polar.x * 3.0 + uTime * speed, polar.y);

            // Noise
            float n = fbm(flow * vec2(2.0, 0.5));

            // Color mapping
            vec3 col = mix(uColorA, uColorB, n * n + 0.2);

            // Doppler Beaming
            float beam = 1.0 + vDoppler * 0.5;
            col *= beam;

            // Alpha: Soft edges
            float alpha = smoothstep(2.0, 4.0, polar.y) * (1.0 - smoothstep(11.0, 12.0, polar.y));
            alpha *= smoothstep(0.2, 0.8, n);

            gl_FragColor = vec4(col, alpha);
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.disk = new THREE.Mesh(diskGeo, diskMat);
    this.disk.rotation.x = -Math.PI * 0.5; // Lay flat on XZ
    this.group.add(this.disk);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const mat = this.disk.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = ctx.time;
    mat.uniforms.uCamPos.value.copy(this.camera.position);

    this.photonRing.lookAt(this.camera.position);

    // Tilt the system
    this.group.rotation.x = Math.PI * 0.15;
    this.group.rotation.z = Math.PI * 0.1;

    this.camera.position.z = damp(this.camera.position.z, 25.0, 2, ctx.dt);
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 06: Kaleido Glass (Fractal Refraction) ---

class KaleidoGlassScene extends SceneBase {
  private shapes: THREE.InstancedMesh;
  private count = 380; // Icosahedral symmetry count approx

  private dummy = new THREE.Object3D();

  constructor() {
    super();
    this.id = 'scene06';
    this.contentRadius = 5.0;

    // Complex Crystal Geometry
    // We use a group of merged geometries for the base instance to get detail
    // Actually, let's use a dynamic shape: Isosahedron details
    const geo = new THREE.OctahedronGeometry(0.8, 0);

    // High-end glass material with Dispersion
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      emissive: 0x000000,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 1.0, // Glass
      thickness: 3.0, // Volume
      ior: 1.6, // Refraction
      clearcoat: 1.0,
      attenuationColor: new THREE.Color(0xffaaaa), // Pinkish internal absorption
      attenuationDistance: 2.0,
    });
    // mat.dispersion = 0.15; // High dispersion for rainbows
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mat as any).dispersion = 0.15;

    this.shapes = new THREE.InstancedMesh(geo, mat, this.count);
    this.group.add(this.shapes);

    // Inner Light Core (The "Source")
    const coreGeo = new THREE.IcosahedronGeometry(2.0, 4);
    // const coreMat = new THREE.ShaderMaterial({
    /*
    const coreMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
            varying vec3 vPos;
            varying vec3 vNormal;
            void main() {
                vPos = position;
                vNormal = normal;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
      fragmentShader: `
            uniform float uTime;
            varying vec3 vPos;
            varying vec3 vNormal;
            void main() {
                vec3 col = 0.5 + 0.5 * cos(uTime + vPos.xyx + vec3(0,2,4));
                float rim = 1.0 - max(0.0, dot(vNormal, vec3(0,0,1)));
                col += pow(rim, 3.0);
                gl_FragColor = vec4(col, 1.0);
            }
        `,
      side: THREE.BackSide, // Render inside out so we see it through glass? No, FrontSide
    }); */
    // Actually, standard material is better for being refracted
    const innerLight = new THREE.Mesh(
      coreGeo,
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    innerLight.scale.setScalar(0.5);
    this.group.add(innerLight);

    // Add point light to illuminate the glass from inside
    const pl = new THREE.PointLight(0xff00ff, 10, 10);
    this.group.add(pl);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const t = ctx.time * 0.2;
    const press = ctx.press;

    // Animate instances in a symmetry pattern
    // Golden ratio
    const phi = (1 + Math.sqrt(5)) / 2;

    for (let i = 0; i < this.count; i++) {
      // Parametric orbits
      const offset = i * 0.1;

      // Base Rotation (Kaleidoscopic)
      const angle = (i / this.count) * Math.PI * 2 * phi;
      const r = 3.5 + Math.sin(t * 2.0 + offset) * 0.5;

      // Sphere mapping
      const y = ((i / (this.count - 1)) * 2 - 1) * (3.0 + press * 2.0);
      const radiusAtY = Math.sqrt(r * r - y * y);
      const theta = angle * 13.0 + t; // Spin fast

      const x = radiusAtY * Math.cos(theta);
      const z = radiusAtY * Math.sin(theta);

      this.dummy.position.set(x, y, z);

      // Construct ring / shell
      // Look at center
      this.dummy.lookAt(0, 0, 0);

      // Constant rotation of individual shards
      this.dummy.rotateZ(t * 2.0 + i);
      this.dummy.rotateX(t + i);

      // Scale pulse
      const s = 0.4 + 0.3 * Math.sin(t * 5.0 + i);
      this.dummy.scale.setScalar(s);

      // Expansion on press
      if (press > 0) {
        this.dummy.position.multiplyScalar(1.0 + press * 0.5);
        this.dummy.rotation.x += press * i;
      }

      this.dummy.updateMatrix();
      this.shapes.setMatrixAt(i, this.dummy.matrix);
    }
    this.shapes.instanceMatrix.needsUpdate = true;

    // Rotate entire kaleidoscope
    this.group.rotation.z = t * 0.5;
    this.group.rotation.y = ctx.pointer.x * 0.5;
    this.group.rotation.x = ctx.pointer.y * 0.5;

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
  private count = 5000; // Even Higher density
  private dummy = new THREE.Object3D();

  constructor() {
    super();
    this.id = 'scene07';
    this.contentRadius = 8.0;

    // 1. Procedural Matrix Texture (Higher Res)
    // Safe for SSR
    let tex: THREE.Texture;

    if (typeof document !== 'undefined') {
      const size = 1024;
      const cvs = document.createElement('canvas');
      cvs.width = size;
      cvs.height = size;
      const ctx = cvs.getContext('2d')!;

      // Transparent Black Bg
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, size, size);

      // Draw grid of characters
      const cols = 32;
      const rows = 32;
      const cell = size / cols;
      ctx.font = `bold ${cell * 0.8}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Katakana / Matrix chars / Hex
      const chars = '01XYZ01<>:;[]+=_DATAﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ';

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          // Brightness variation
          const lit = 60 + Math.random() * 40;
          ctx.fillStyle = `hsl(140, 100%, ${lit}%)`;

          // Random char
          const char = chars[Math.floor(Math.random() * chars.length)];
          ctx.fillText(char, x * cell + cell / 2, y * cell + cell / 2);
        }
      }

      tex = new THREE.CanvasTexture(cvs);
      tex.magFilter = THREE.LinearFilter;
      tex.minFilter = THREE.LinearFilter;
    } else {
      // Fallback for Server
      tex = new THREE.DataTexture(new Uint8Array([0, 255, 0, 255]), 1, 1);
      tex.needsUpdate = true;
    }

    // 2. Geometry: Vertical "Data Blades"
    // Thin boxes that look like 3D volumetric pixels
    const geo = new THREE.BoxGeometry(0.1, 0.8, 0.05);

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
        varying float vIndex;

        uniform float uTime;
        uniform float uPress;
        uniform vec2 uPointer;

        // Pseudo-random
        float hash(float n) { return fract(sin(n) * 43758.5453123); }

        void main() {
            // UV Animation: Cycle through texture grid
            float tGlobal = uTime * aSpeed * 2.0;
            float t = tGlobal + aOffset * 100.0;
            float charIdx = floor(mod(t, 1024.0)); // 32x32 = 1024

            float cx = mod(charIdx, 32.0);
            float cy = floor(charIdx / 32.0);

            // Map box UVs to the texture cell
            // Box UVs are 0..1 per face. We want to map that to the cell.
            // Simplified: use uv directly scaling by 1/32
            vUv = (uv + vec2(cx, cy)) / 32.0;

            vIndex = aOffset;

            // -- 1. Rain State (Vortex) --
            // Spiral movement down
            float fall = tGlobal;
            float y = 20.0 - mod(fall + aOffset * 40.0, 40.0);
            y -= 10.0; // -10 to 10

            // Radius varies with Y for funnel shape
            float funnel = 1.0 + smoothstep(-10.0, 10.0, y) * 2.0; // Wider at top? Or bottom?
            // Actually let's make it an hourglass
            float shape = 1.0 + pow(abs(y) * 0.1, 2.0);

            float angle = aOffset * 6.28 * 10.0 + uTime * 0.5 + y * 0.2; // Twist
            float r = aRadius * shape;

            vec3 posA = vec3(cos(angle)*r, y, sin(angle)*r);

            // -- 2. Entity State (Cyber Sphere) --
            // Map index to sphere coords
            float phi = aOffset * 3.14159 * 2.0;
            float theta = acos(2.0 * fract(aSpeed * 13.0) - 1.0);
            float rad = 4.0;
            vec3 posB = vec3(
                rad * sin(theta) * cos(phi),
                rad * sin(theta) * sin(phi),
                rad * cos(theta)
            );

            // Jitter/Glitch position on sphere
            float glitch = step(0.95, fract(uTime * 4.0 + aOffset * 20.0));
            posB *= 1.0 + glitch * 0.2;

            // -- Interaction Mix --
            float morph = smoothstep(0.0, 1.0, uPress);

            vec3 pos = mix(posA, posB, morph);

            // -- Instance Transform --

            // Scale data blade based on speed
            // stretch Y
            float stretch = 1.0 + aSpeed;
            vec3 scaledPos = position * vec3(1.0, stretch, 1.0);

            // Rotate blade to face center (roughly)
            float rotY = -atan(pos.z, pos.x);
            // Construct rotation matrix manually or just trust standard billboarding?
            // Let's do Standard rotation y
            float c = cos(rotY);
            float s = sin(rotY);
            mat3 mRot = mat3(
               c, 0, s,
               0, 1, 0,
               -s, 0, c
            );
            scaledPos = mRot * scaledPos;

            vec4 worldPos = modelViewMatrix * vec4(pos + scaledPos, 1.0); // Simple additive, not full matrix

            gl_Position = projectionMatrix * worldPos;

            // Alpha logic
            float distY = abs(y);
            float rainAlpha = smoothstep(12.0, 8.0, distY);
            vAlpha = mix(rainAlpha, 1.0, morph);

            // Highlight
            vGlow = glitch;
            // Matrix stream leading edge brightness
            float leading = smoothstep(0.0, 0.2, fract(y * 0.1 + uTime));
            vGlow += leading;
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        varying vec2 vUv;
        varying float vAlpha;
        varying float vGlow;

        void main() {
            vec4 c = texture2D(uMap, vUv);

            // Green channel key
            float brightness = c.g;
            if (brightness < 0.1) discard;

            vec3 color = vec3(0.0, 1.0, 0.4); // Cyber Green

            // Core white
            color = mix(color, vec3(1.0), brightness * 0.5);

            // Add glow bloom
            color += vec3(0.8, 1.0, 0.9) * vGlow;

            gl_FragColor = vec4(color, vAlpha * brightness);
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
      speeds[i] = 0.5 + Math.random() * 2.0; // Varied fall speeds
      radii[i] = 2.0 + Math.random() * 6.0;

      // Init dummy matrix (mostly ignored by custom vertex shader pos logic but needed for frustum culling)
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
    mat.uniforms.uPress.value = press;
    mat.uniforms.uPointer.value.copy(ctx.pointer);

    // Camera Orbit
    this.group.rotation.y = t * 0.1 + ctx.pointer.x * 0.5;

    // Tilt on press
    this.group.rotation.x = Math.sin(t) * 0.1 * press;

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
  private atmo: THREE.Mesh;
  private count = 4000; // Increased debris
  private dummy = new THREE.Object3D();
  private physics: SimplePhysics;
  private pointerPos = new THREE.Vector3();

  constructor() {
    super();
    this.id = 'scene08';
    this.contentRadius = 8.0;

    // 1. Procedural Gas Giant (Hyper-Real)
    // Multi-layered noise for clouds and storms
    const pGeo = new THREE.SphereGeometry(2.5, 128, 128);
    const pMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color(0xd9c2a3) }, // Cream
        uColorB: { value: new THREE.Color(0xa65e2e) }, // Terracotta
        uColorC: { value: new THREE.Color(0x4a2e1d) }, // Dark Umber
        uColorD: { value: new THREE.Color(0x1a1a3a) }, // Deep Storm
        uSunDir: { value: new THREE.Vector3(1.0, 0.5, 1.0).normalize() },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPos;
        varying vec3 vWorldNormal;

        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vWorldNormal = normalize((modelMatrix * vec4(normal,0.0)).xyz);
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
        uniform vec3 uColorD;
        uniform vec3 uSunDir;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPos;
        varying vec3 vWorldNormal;

        // FBM Noise
        float hash(float n) { return fract(sin(n) * 758.5453); }
        float noise(vec3 x) {
            vec3 p = floor(x);
            vec3 f = fract(x);
            f = f*f*(3.0-2.0*f);
            float n = p.x + p.y*57.0 + p.z*113.0;
            return mix(mix(mix(hash(n+0.0), hash(n+1.0),f.x),
                           mix(hash(n+57.0), hash(n+58.0),f.x),f.y),
                       mix(mix(hash(n+113.0), hash(n+114.0),f.x),
                           mix(hash(n+170.0), hash(n+171.0),f.x),f.y),f.z);
        }

        float fbm(vec3 p) {
            float f = 0.0;
            float amp = 0.5;
            for(int i=0; i<5; i++) {
                f += amp * noise(p);
                p *= 2.02;
                amp *= 0.5;
            }
            return f;
        }

        // Curl-like distortion
        float warp(vec3 p) {
            return fbm(p + fbm(p + fbm(p)));
        }

        void main() {
            // Planet Coordinates
            // UV mapping on sphere has pole distortion, better to use 3D noise on sphere surface coords if available
            // But UV is fine for gas bands if we account for y

            vec3 seed = vec3(vUv * 5.0, uTime * 0.05);

            // Major Bands (Latitude functions)
            float lat = vUv.y * 3.14159;
            float bands = sin(vUv.y * 20.0 + sin(vUv.x * 2.0));

            // Turbulent flow
            float turb = warp(seed * 3.0);

            // Combine
            float mixVal = bands * 0.4 + turb * 0.6;

            // Color Ramps
            vec3 col = mix(uColorA, uColorB, smoothstep(0.2, 0.8, turb));
            col = mix(col, uColorC, smoothstep(-0.5, 0.2, bands));
            col = mix(col, uColorD, smoothstep(0.7, 1.0, turb * bands)); // Storm features

            // Lighting
            float diff = max(dot(vWorldNormal, uSunDir), 0.0);

            // Terminator Scattering (Subsurface approx)
            float scatter = smoothstep(-0.35, 0.1, dot(vWorldNormal, uSunDir)) * smoothstep(0.1, -0.35, dot(vWorldNormal, uSunDir));
            col += vec3(1.0, 0.4, 0.1) * scatter * 0.4;

            // Final Diffuse
            diff = smoothstep(-0.2, 1.0, diff); // Soft terminator
            vec3 final = col * diff;

            // Specular highlighting from oceans (Liquid metal hydrogen?)
            float viewD = dot(normalize(vViewPos), vNormal);
            // float spec = pow(max(dot(reflect(-uSunDir, vNormal), normalize(vViewPos)), 0.0), 20.0);
            // final += spec * 0.1;

            // Rayleigh Rim (Atmosphere)
            float rim = pow(1.0 - max(viewD, 0.0), 3.0);
            final += vec3(0.2, 0.5, 1.0) * rim * 0.8 * diff; // Blue haze on sun side

            gl_FragColor = vec4(final, 1.0);
        }
      `,
    });
    this.planet = new THREE.Mesh(pGeo, pMat);
    this.group.add(this.planet);

    // 1b. Atmosphere Halo (Volumetric Glow)
    const atmoGeo = new THREE.SphereGeometry(2.5 * 1.15, 64, 64);
    const atmoMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      uniforms: {
        uSunDir: { value: new THREE.Vector3(1.0, 0.5, 1.0).normalize() },
      },
      vertexShader: `
            varying vec3 vNormal;
            varying vec3 vWorldNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vWorldNormal = normalize((modelMatrix * vec4(normal,0.0)).xyz);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
      fragmentShader: `
            varying vec3 vNormal;
            varying vec3 vWorldNormal;
            uniform vec3 uSunDir;

            void main() {
                float view = dot(normalize(vNormal), vec3(0.0, 0.0, 1.0));
                float halo = pow(1.0 + view, 5.0);

                // Day/Night masking on atmosphere
                float sun = dot(vWorldNormal, uSunDir);
                float day = smoothstep(-0.5, 0.5, sun);

                vec3 dayColor = vec3(0.4, 0.7, 1.0);
                vec3 nightColor = vec3(0.6, 0.3, 0.1); // Sunset color wrap

                vec3 col = mix(nightColor, dayColor, day);

                gl_FragColor = vec4(col, halo * 0.8 * (0.5 + 0.5 * day));
            }
        `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.atmo = new THREE.Mesh(atmoGeo, atmoMat);
    this.group.add(this.atmo);

    // 2. Main Ring (Procedural Texture)
    const rGeo = new THREE.RingGeometry(3.2, 6.0, 128);
    const rTex = this.createRingTexture();
    const rMat = new THREE.MeshStandardMaterial({
      map: rTex,
      color: 0xffedd0,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      roughness: 0.4,
      metalness: 0.1,
    });

    this.rings = new THREE.Mesh(rGeo, rMat);
    this.rings.rotation.x = Math.PI * 0.55; // Tilt
    this.rings.receiveShadow = true;
    this.rings.castShadow = true;
    this.group.add(this.rings);

    // 3. Debris Field (Instanced Rocks)
    // Instanced Asteroids
    const dGeo = new THREE.IcosahedronGeometry(0.08, 0);
    const dMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.8,
    });
    this.debris = new THREE.InstancedMesh(dGeo, dMat, this.count);
    this.group.add(this.debris);

    // Init Physics
    this.physics = new SimplePhysics(this.count);
    this.physics.bounds.set(40, 40, 40); // Large bounds
    this.physics.friction = 1.0; // No air resistance in space

    // Init positions data
    for (let i = 0; i < this.count; i++) {
      // Distribute in a ring belt
      const angle = Math.random() * Math.PI * 2;
      // Gaussian distribution roughly around center of ring
      // Ring is 3.2 to 6.0
      const dist = 3.5 + Math.random() * 2.5;

      // Height variation (thin disk)
      const y = (Math.random() - 0.5) * 0.1;

      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      // Tilt the debris to match the ring mesh (approx)
      // Ring tilt is at x axis
      const pos = new THREE.Vector3(x, y, z);
      pos.applyAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI * 0.55);

      this.physics.initParticle(i, pos, 0.1);

      // Orbital velocity calculation
      // v = sqrt(GM/r) direction tangent
      // Tangent on the ring plane
      // Simplified: Circular motion around Y relative to ring plane
      // But we are in world space now.

      // Simple Rotation Speed around 0,0,0
      // v = w * r
      const speed = 2.0 / Math.sqrt(dist);

      // Cross product with Up vector of ring
      const up = new THREE.Vector3(0, 1, 0).applyAxisAngle(
        new THREE.Vector3(1, 0, 0),
        Math.PI * 0.55
      );
      const vel = new THREE.Vector3()
        .crossVectors(up, pos)
        .normalize()
        .multiplyScalar(speed);

      // Set previous pos
      this.physics.oldPositions[i * 3] = pos.x - vel.x * 0.016;
      this.physics.oldPositions[i * 3 + 1] = pos.y - vel.y * 0.016;
      this.physics.oldPositions[i * 3 + 2] = pos.z - vel.z * 0.016;

      this.dummy.position.copy(pos);
      this.dummy.rotation.set(
        Math.random() * 3,
        Math.random() * 3,
        Math.random() * 3
      );
      const s = 0.5 + Math.random();
      this.dummy.scale.set(s, s, s);
      this.dummy.updateMatrix();
      this.debris.setMatrixAt(i, this.dummy.matrix);
    }

    // Sunlight
    const sun = new THREE.DirectionalLight(0xffffff, 3.0);
    sun.position.set(20, 10, 20); // Matches shader sunDir
    sun.castShadow = true;
    sun.shadow.bias = -0.001;
    this.group.add(sun);

    const fill = new THREE.AmbientLight(0x111122, 0.2);
    this.group.add(fill);
  }

  createRingTexture() {
    if (typeof document === 'undefined') {
      return new THREE.DataTexture(new Uint8Array([255, 200, 150, 255]), 1, 1);
    }
    const cvs = document.createElement('canvas');
    cvs.width = 512;
    cvs.height = 64;
    const ctx = cvs.getContext('2d')!;

    // Radial noise
    // We only draw horizontal lines because it maps radially
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 512, 64);

    for (let i = 0; i < 100; i++) {
      const x = Math.random() * 512;
      const w = Math.random() * 10 + 2;
      const alpha = Math.random() * 0.5;
      ctx.fillStyle = `rgba(255, 240, 200, ${alpha})`;
      ctx.fillRect(x, 0, w, 64);
    }

    // Major gaps
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(100, 0, 5, 64);
    ctx.fillRect(350, 0, 20, 64);

    return new THREE.CanvasTexture(cvs);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const t = ctx.time;
    // const dt = Math.min(ctx.dt, 1 / 30);

    // Planet Shader
    (this.planet.material as THREE.ShaderMaterial).uniforms.uTime.value = t;

    // Simulate physics?
    // Orbit is stable, so we can just rotate the group for performance
    // Calculating N-body gravity for 4000 particles in JS is heavy.
    // Let's just rotate the debris group to match the "orbital speed"
    this.debris.rotation.x = this.rings.rotation.x;
    // Rotate around local Y (perpendicular to ring plane)
    // Actually InstancedMesh rotation is world.
    // We need to rotate around the Ring Axis.

    const axis = new THREE.Vector3(0, 1, 0).applyAxisAngle(
      new THREE.Vector3(1, 0, 0),
      this.rings.rotation.x
    );
    this.debris.rotateOnWorldAxis(axis, ctx.dt * 0.1);

    this.pointerPos.set(ctx.pointer.x * 12.0, ctx.pointer.y * 12.0, 0);

    // Tilt planet slightly
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

// --- Scene 09: Quantum Crystalline (Shards) ---

class VoronoiShardsScene extends SceneBase {
  private shards: THREE.InstancedMesh;
  private count = 2000;
  private dummy = new THREE.Object3D();

  constructor() {
    super();
    this.id = 'scene09';
    this.contentRadius = 8.0;

    // Sharp crystalline shapes
    const geo = new THREE.OctahedronGeometry(0.25, 0);

    // Quantum Dispersion Shader
    // Simulates "Diamond" refraction with chromatic aberration
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPress: { value: 0 },
        uColorA: { value: new THREE.Color(0xaaccff) }, // Blue-White
        uColorB: { value: new THREE.Color(0xffaaee) }, // Pink-White
      },
      vertexShader: `
        attribute vec3 aRandom; // x: phase, y: speed, z: scale
        varying vec3 vNormal;
        varying vec3 vWorldNormal;
        varying vec3 vViewPosition;
        varying float vBlink;
        varying vec3 vRand;

        uniform float uTime;
        uniform float uPress;

        void main() {
            vRand = aRandom;
            vec3 pos = position; // local

            // Quantum Blink (Existence probability)
            // A sine wave that makes scale go to 0 occasionally
            float blinkPhase = uTime * aRandom.y + aRandom.x * 10.0;
            float blink = smoothstep(-0.2, 0.2, sin(blinkPhase));
            // Also glitch scale on press
            float pressGlitch = sin(uTime * 30.0 + aRandom.z * 100.0) * uPress;

            float scale = (0.5 + aRandom.z) * blink * (1.0 + pressGlitch);
            pos *= scale;
            vBlink = blink;

            // Rotation in shader for extra chaos?
            // InstancedMesh handles base rotation, we add jitter

            vNormal = normalize(normalMatrix * normal);
            vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);

            vec4 worldPos = instanceMatrix * vec4(pos, 1.0);
            vec4 mvPosition = viewMatrix * worldPos;
            vViewPosition = -mvPosition.xyz;

            gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vWorldNormal;
        varying vec3 vViewPosition;
        varying float vBlink;
        varying vec3 vRand;

        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform float uTime;

        void main() {
            if (vBlink < 0.01) discard;

            vec3 N = normalize(vNormal);
            vec3 V = normalize(vViewPosition);

            // Fresnel / Rim
            float F = pow(1.0 - max(dot(N, V), 0.0), 3.0);

            // Internal Reflection Simulation
            // We map normal to a "fake environment"
            vec3 R = reflect(-V, N);

            // Chromatic Aberration: Sample conceptual env map at slight offsets
            // "Environment" is just a procedural gradient + noise

            // Channel R
            vec3 dirR = R;
            float lightR = dot(dirR, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;

            // Channel G (shifted)
            vec3 dirG = R + vec3(0.05);
            float lightG = dot(dirG, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;

            // Channel B (shifted more)
            vec3 dirB = R + vec3(0.1);
            float lightB = dot(dirB, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;

            vec3 refractionCol = vec3(lightR, lightG, lightB);

            // Mix Colors
            vec3 baseCol = mix(uColorA, uColorB, vRand.z + sin(uTime + vRand.x)*0.2);

            // Faceted Look: harden normals? N is already flat from geometry if we use FlatShading?
            // Geometry is flat, so N is uniform per face.

            // Sparkle
            float sparkle = pow(max(dot(R, vec3(0.5, 0.8, 0.5)), 0.0), 20.0);

            // Final accumulation
            vec3 final = baseCol * 0.2 + refractionCol * 0.8;
            final += sparkle * 2.0;
            final += F * 0.5; // Add rim glow

            gl_FragColor = vec4(final, 0.8);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.shards = new THREE.InstancedMesh(geo, mat, this.count);
    this.group.add(this.shards);

    // Attributes
    const randoms = new Float32Array(this.count * 3);
    for (let i = 0; i < this.count; i++) {
      randoms[i * 3] = Math.random();
      randoms[i * 3 + 1] = 0.5 + Math.random(); // speed
      randoms[i * 3 + 2] = Math.random(); // scale

      // Helix Distribution
      const t = i / this.count;
      const theta = t * Math.PI * 20.0; // 10 turns
      const h = (t - 0.5) * 16.0; // Height spread
      const r = 3.0 + Math.random() * 2.0; // Radius spread

      const x = Math.cos(theta) * r;
      const y = h;
      const z = Math.sin(theta) * r;

      this.dummy.position.set(x, y, z);
      this.dummy.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      this.dummy.updateMatrix();
      this.shards.setMatrixAt(i, this.dummy.matrix);
    }

    geo.setAttribute('aRandom', new THREE.InstancedBufferAttribute(randoms, 3));
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const mat = this.shards.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = ctx.time;
    mat.uniforms.uPress.value = ctx.press;

    // Helix Rotation
    this.group.rotation.y = ctx.time * 0.2;

    // Slight float
    this.group.position.y = Math.sin(ctx.time * 0.5) * 0.5;

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
  private count = 60; // Denser layers
  private dummy = new THREE.Object3D();

  constructor() {
    super();
    this.id = 'scene10';
    this.contentRadius = 6.0;

    // Use Spheres instead of Rings for 3D Moiré
    const geo = new THREE.SphereGeometry(4.0, 64, 64);

    // Custom Interference Shader
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPress: { value: 0 },
        uColor: { value: new THREE.Color(0xffffff) },
      },
      vertexShader: `
            attribute float aLayer; // -1 to 1
            varying float vLayer;
            varying vec2 vUv;
            varying vec3 vPos;
            varying vec3 vNormal;

            uniform float uTime;
            uniform float uPress;

            void main() {
                vLayer = aLayer;
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);

                vec3 pos = position;

                // Scale spheres to create nested shells
                // Base size variation
                float s = 0.5 + 0.5 * (aLayer * 0.5 + 0.5); // 0.5 to 1.0 range approx

                // Expansion on press
                float expansion = uPress * 4.0 * aLayer;

                // Breathing
                float breath = sin(uTime * 2.0 + aLayer * 3.14) * 0.1;

                float finalScale = s + ((expansion + breath) * 0.2);
                pos *= finalScale;

                vPos = pos;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
      fragmentShader: `
            varying float vLayer;
            varying vec2 vUv;
            varying vec3 vPos;
            varying vec3 vNormal;

            uniform float uTime;
            uniform float uPress;

            // Pattern function
            float pattern(vec3 p, float t) {
                // Tri-planar grid projection
                float scale = 10.0;
                vec3 g = fract(p * scale + t) - 0.5;
                float d = length(g) - 0.2;
                return smoothstep(0.05, 0.0, d);
            }

            void main() {
                // View direction
                vec3 view = normalize(vPos - cameraPosition); // Approx in local space if camera at 0,0,0?? No.
                // We use vNormal for fresnel
                float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);

                // Pattern Generation
                // Rotate pattern based on layer index to create interference

                // Create moiré by offsetting density
                float density = 20.0 + vLayer * 10.0 + sin(uTime)*5.0;

                // Hexagonal grid
                vec2 uv = vUv * density;
                vec2 gv = fract(uv) - 0.5;
                float d0 = length(gv);
                float circ = smoothstep(0.45, 0.35, d0);

                // Stripes
                float stripes = sin(vPos.y * density + uTime * 5.0);
                float stripeMask = smoothstep(0.0, 0.1, stripes);

                // Mix patterns based on layer
                float mask = mix(circ, stripeMask, 0.5 + 0.5 * sin(vLayer * 10.0));

                // Color iridescence
                vec3 col = 0.5 + 0.5 * cos(uTime * 0.5 + vLayer * 2.0 + vec3(0,2,4));
                col += vec3(1.0) * uPress; // Flash white

                // Opacity falls off at edges to hide sphere geometry, kept in center
                // But we want to see through it.

                float alpha = mask * 0.3; // Low opacity to stack

                // Center fade?
                // alpha *= fresnel;

                if (alpha < 0.01) discard;

                gl_FragColor = vec4(col, alpha);
            }
        `,
      transparent: true,
      side: THREE.BackSide, // Draw inside of shells?
      // Actually DoubleSide is better to see all intersections
      // But BackSide prevents z-fighting if sorted correctly?
      // InstancedMesh depth sorting is tricky.
      // Let's use AdditiveBlending and DepthWrite false
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    mat.side = THREE.DoubleSide;

    this.mesh = new THREE.InstancedMesh(geo, mat, this.count);

    const layers = new Float32Array(this.count);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < this.count; i++) {
      dummy.position.set(0, 0, 0);
      // Random rotation for interference
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
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

    this.mesh.rotation.y = ctx.time * 0.1;
    this.mesh.rotation.z = ctx.time * 0.05;

    // Gyro parallax
    this.group.rotation.x = ctx.gyro.y * 0.5;
    this.group.rotation.y += ctx.gyro.x * 0.5;

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
  private nodes: THREE.InstancedMesh;
  private connections: THREE.InstancedMesh;
  private nodeCount = 600;

  constructor() {
    super();
    this.id = 'scene11';
    this.contentRadius = 8.0;

    // 1. Nodes (Somas)
    const nodeGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const nodeMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPress: { value: 0 },
        uColorA: { value: new THREE.Color(0x0088ff) },
        uColorB: { value: new THREE.Color(0xff0088) },
      },
      vertexShader: `
            varying vec3 vPos;
            uniform float uTime;
            void main() {
                vec3 p = position;
                // Pulse breathing
                float h = sin(uTime * 2.0 + instanceMatrix[3][0]*0.5);
                p *= 1.0 + h * 0.1;

                vec4 world = instanceMatrix * vec4(p, 1.0);
                vPos = world.xyz;
                gl_Position = projectionMatrix * viewMatrix * world;
            }
        `,
      fragmentShader: `
            varying vec3 vPos;
            uniform float uTime;
            uniform float uPress;
            uniform vec3 uColorA;
            uniform vec3 uColorB;

            void main() {
                // Bio-luminescent pulse wave
                float wave = sin(uTime * 3.0 + vPos.x * 0.5 + vPos.y * 0.5);
                float activation = smoothstep(0.8, 1.0, wave);

                vec3 col = mix(uColorA, uColorB, activation);

                // Core hot spot
                col += vec3(1.0) * activation * 0.5;

                // Interaction flash
                col += vec3(1.0) * uPress;

                gl_FragColor = vec4(col, 1.0);
            }
        `,
    });

    this.nodes = new THREE.InstancedMesh(nodeGeo, nodeMat, this.nodeCount);

    const positions: THREE.Vector3[] = [];
    const dummy = new THREE.Object3D();

    for (let i = 0; i < this.nodeCount; i++) {
      // Brain-like distribution (Ellipsoid)
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 5.0 * Math.cbrt(Math.random());

      let x = r * Math.sin(phi) * Math.cos(theta);
      let y = r * Math.sin(phi) * Math.sin(theta);
      let z = r * Math.cos(phi);

      // Flatten slightly
      y *= 0.7;

      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      this.nodes.setMatrixAt(i, dummy.matrix);

      positions.push(new THREE.Vector3(x, y, z));
    }
    this.group.add(this.nodes);

    // 2. Axons (Volumetric Connections)
    // We use stretched boxes to create thick lines
    const connGeo = new THREE.BoxGeometry(0.04, 0.04, 1.0);
    // Translate geometry so origin is at Z=0, extending to Z=1
    connGeo.translate(0, 0, 0.5);

    const connMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPress: { value: 0 },
        uColor: { value: new THREE.Color(0x00aaff) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexShader: `
            attribute float aLength;
            attribute float aPhase;
            varying float vLen;
            varying float vPhase;
            varying float vLocalZ;

            void main() {
                vLen = aLength;
                vPhase = aPhase;

                vec3 p = position;
                // Position is already 0 to 1 in Z due to geometry translation
                // Scale Z by length is handled by instance matrix scale?
                // No, we handle it here or in JS.
                // If we scaled in JS, 'position.z' goes 0..Length.

                // Let's assume instance scale.z = length.
                // Then position.z goes 0..1 in local? No.
                // BoxGeometry default is centered. We translated it 0..1.
                // Instance scale multiplies it.

                vLocalZ = p.z; // This will vary 0..1 if we rely on matrix scale

                gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
            }
        `,
      fragmentShader: `
            varying float vPhase;
            varying float vLocalZ;
            uniform float uTime;
            uniform vec3 uColor;

            void main() {
                // Signal Packet travelling down the axon
                float speed = 2.0;
                float packet = mod(uTime * speed + vPhase, 10.0); // 0 to 10 loop

                // packet is the Z position of the pulse (in scaled units? No relative to time)
                // vLocalZ is 0..1.
                // We want pulse to travel 0..1 really fast?

                // If we want slow travel:
                // vLocalZ is normalized length.
                float dist = abs(vLocalZ * 10.0 - packet); // Scale Z up so pulse is small

                float glow = smoothstep(1.5, 0.0, dist); // Tail
                glow *= smoothstep(0.0, 0.2, dist); // Sharp lead?

                // Make packet teardrop shape
                float lead = step(packet, vLocalZ * 10.0); // 0 if passed?

                // Simpler Beam
                float beam = smoothstep(0.0, 1.0, 1.0 - abs(vLocalZ * 10.0 - packet));

                float alpha = 0.1 + beam * 2.0;

                gl_FragColor = vec4(uColor, alpha);
            }
        `,
    });

    // Generate connections
    const connInstances = [];

    for (let i = 0; i < this.nodeCount; i++) {
      const p1 = positions[i];
      let found = 0;
      // Connect to nearest 3 neighbors
      for (let j = i + 1; j < this.nodeCount; j++) {
        if (found >= 2) break; // Limit density
        const p2 = positions[j];
        const d = p1.distanceTo(p2);
        if (d < 2.5) {
          connInstances.push({ p1, p2, dist: d });
          found++;
        }
      }
    }

    this.connections = new THREE.InstancedMesh(
      connGeo,
      connMat,
      connInstances.length
    );

    // const scales = new Float32Array(connInstances.length); // We won't use this if we scale matrix
    const phases = new Float32Array(connInstances.length);

    for (let i = 0; i < connInstances.length; i++) {
      const { p1, p2, dist } = connInstances[i];

      dummy.position.copy(p1);
      dummy.lookAt(p2);
      dummy.scale.set(1, 1, dist); // Stretch Z to match distance
      dummy.updateMatrix();

      this.connections.setMatrixAt(i, dummy.matrix);
      phases[i] = Math.random() * 10.0;
    }

    this.connections.geometry.setAttribute(
      'aPhase',
      new THREE.InstancedBufferAttribute(phases, 1)
    );
    this.group.add(this.connections);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const nMat = this.nodes.material as THREE.ShaderMaterial;
    if (nMat.uniforms) {
      nMat.uniforms.uTime.value = ctx.time;
      nMat.uniforms.uPress.value = ctx.press;
    }

    const cMat = this.connections.material as THREE.ShaderMaterial;
    if (cMat.uniforms) cMat.uniforms.uTime.value = ctx.time;

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

// --- Scene 12: Library (Infinite Akasha) ---

class LibraryScene extends SceneBase {
  private books: THREE.InstancedMesh;
  private count = 2400; // Increased density

  constructor() {
    super();
    this.id = 'scene12';
    this.contentRadius = 6.0;
    this.baseDistance = 20.0;

    // Book geometry: Vary thickness in vertex shader?
    // No, use a standard thick book shape.
    const geo = new THREE.BoxGeometry(0.4, 2.5, 1.8);

    // Shader Material for "Magical Text"
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xffaa00) }, // Gold
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPos;
        varying float vId;

        void main() {
            vUv = uv;
            vId = instanceMatrix[3][0]; // Random seed from position?

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
        varying float vId;

        float hash(float n) { return fract(sin(n) * 43758.5453123); }

        void main() {
            // Book Cover Base
            vec3 col = vec3(0.08, 0.04, 0.02); // Dark Leather

            // Spine Text (Procedural Runes)
            // Map UV to grid
            vec2 grid = floor(vUv * vec2(3.0, 12.0));
            float n = hash(dot(grid, vec2(12.7, 31.1)) + floor(vPos.z)); // Random per book

            // Text characters
            // Simple block shapes
            vec2 local = fract(vUv * vec2(3.0, 12.0));
            float char = step(0.2, local.x) * step(local.x, 0.8) * step(0.2, local.y) * step(local.y, 0.8);

            // Randomly hide some chars
            char *= step(0.4, n);

            // Flashing Runes
            float flash = sin(uTime * 3.0 + vPos.z * 0.5 + n * 6.0);
            float glow = smoothstep(0.8, 1.0, flash);

            // Spine Mask (assuming spine is front face X?)
            // Box mapping is uniform UV. Let's assume we want text on all sides for effect.

            if(char > 0.5) {
                // Gold Runes
                col = mix(col, uColor, 0.5 + glow * 0.5);
                col += vec3(1.0) * glow;
            }

            // Edges (Pages)
            // No easy way to distinguish face in standard UV.

            // Volumetric Fog Fade
            float dist = length(vPos);
            float fog = smoothstep(30.0, 10.0, dist);

            gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    this.books = new THREE.InstancedMesh(geo, mat, this.count);

    const dummy = new THREE.Object3D();
    const radius = 8.0;

    for (let i = 0; i < this.count; i++) {
      // Spiral Tunnel
      const t = i / this.count;
      const angle = t * Math.PI * 40.0; // Many turns
      const z = (t - 0.5) * 60.0; // Long tunnel

      const r = radius + Math.random() * 1.0;

      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;

      dummy.position.set(x, y, z);

      // Orient book
      dummy.lookAt(0, 0, z); // Face center
      dummy.rotateY(Math.PI / 2); // Spine out
      // Random tilt
      dummy.rotateZ((Math.random() - 0.5) * 0.3);
      dummy.rotateX((Math.random() - 0.5) * 0.1);

      // Scale variation
      dummy.scale.set(1.0, 1.0 + Math.random() * 0.5, 1.0);

      dummy.updateMatrix();
      this.books.setMatrixAt(i, dummy.matrix);
    }

    this.group.add(this.books);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const t = ctx.time;
    const mat = this.books.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = t;

    // Endless Flight
    // const speed = 4.0;
    // const loopLength = 40.0;

    // We move the camera relative to the tunnel?
    // Or move the tunnel?
    // Moving tunnel is easier for shaders usually

    this.group.rotation.z = t * 0.1;

    // We want infinite loop.
    // The books are distributed Z: -30 to 30.
    // We can move camera Z from 30 to -30 and Wrap?
    // SceneRuntime doesn't support camera warp easily.
    // We oscillate.

    this.camera.position.z = 20.0 * Math.sin(t * 0.1);
    this.camera.lookAt(0, 0, this.camera.position.z - 10.0);
  }
}

// --- Scene 13: Abyss (Bioluminescent Flow) ---

class BioluminescentScene extends SceneBase {
  private strands: THREE.Mesh;
  private spores: THREE.InstancedMesh;
  private count = 8000;
  private sporeCount = 4000;

  constructor() {
    super();
    this.id = 'scene13';
    this.contentRadius = 6.0;
    this.baseDistance = 14.0;

    // 1. Sea Anemone Strands
    // High density instanced planes
    const strandH = 6.0;
    const strandGeo = new THREE.PlaneGeometry(0.06, strandH, 1, 32);
    strandGeo.translate(0, strandH * 0.5, 0); // Pivot at bottom

    const geo = new THREE.InstancedBufferGeometry();
    geo.index = strandGeo.index;
    geo.attributes.position = strandGeo.attributes.position;
    geo.attributes.uv = strandGeo.attributes.uv;

    const offsets: number[] = [];
    const data: number[] = []; // phase, length, bend

    for (let i = 0; i < this.count; i++) {
      // Sphere distribution
      const r = 2.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      offsets.push(x, y, z);
      data.push(Math.random() * 10.0, 0.5 + Math.random(), Math.random());
    }

    geo.setAttribute(
      'aOffset',
      new THREE.InstancedBufferAttribute(new Float32Array(offsets), 3)
    );
    geo.setAttribute(
      'aData',
      new THREE.InstancedBufferAttribute(new Float32Array(data), 3)
    );

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPress: { value: 0 },
        uColorA: { value: new THREE.Color(0x00ffaa) }, // Cyan
        uColorB: { value: new THREE.Color(0xaa00ff) }, // Purple
      },
      side: THREE.DoubleSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexShader: `
         attribute vec3 aOffset;
         attribute vec3 aData; // phase, scale, bend
         varying float vH;
         varying vec3 vPos;
         uniform float uTime;
         uniform float uPress;

         void main() {
           vH = uv.y;

           vec3 normal = normalize(aOffset);
           vec3 p = position;
           p.y *= aData.y; // Length variation

           // Current Position (Base + Height)
           vec3 current = aOffset + normal * p.y;

           // Curl Noise / Sway
           // Simple sine waves for cheap swaying
           float sway = sin(uTime + current.x) * 0.2 + cos(uTime * 1.5 + current.z) * 0.2;
           sway *= vH; // More at tip

           // Apply sway perpendicular to normal?
           // Just add to position loosely
           current.x += sway * aData.z;
           current.z += sway * aData.z;

           // Interaction Shockwave
           // If uPress > 0, strands blow outward
           float blow = smoothstep(0.0, 1.0, uPress) * vH * 3.0;
           current += normal * blow;

           gl_Position = projectionMatrix * modelViewMatrix * vec4(current, 1.0);
           vPos = current;
         }
       `,
      fragmentShader: `
         varying float vH;
         varying vec3 vPos;
         uniform float uTime;
         uniform vec3 uColorA;
         uniform vec3 uColorB;
         uniform float uPress;

         void main() {
            // Bio-Luminescence
            // Pulse moves up
            float pulse = mod(uTime * 2.0 - vPos.y, 8.0);
            float glow = smoothstep(0.8, 1.0, 1.0 - abs(pulse - vH * 8.0));

            vec3 col = mix(uColorA, uColorB, vH);

            // Tip glow
            col += vec3(1.0) * glow;

            // Add sparkle
            float sparkle = step(0.98, fract(vH * 20.0 + uTime));
            col += sparkle * 0.5;

            float alpha = smoothstep(0.0, 0.2, vH) * (1.0 - vH) + glow;

            gl_FragColor = vec4(col, alpha);
         }
       `,
    });
    this.strands = new THREE.Mesh(geo, mat);
    this.group.add(this.strands);

    // 2. Spores (Boids-like particles)
    const sporeGeo = new THREE.IcosahedronGeometry(0.04, 0);
    const sporeMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
          attribute vec3 aOffset;
          varying float vAlpha;
          uniform float uTime;
          void main() {
            // Orbiting math
            float t = uTime * 0.5 + aOffset.z; // Speed
            float r = 5.0 + sin(t*0.5)*2.0;

            vec3 p = vec3(
              sin(t * aOffset.x) * r,
              cos(t * aOffset.y) * r,
              sin(t) * cos(t) * r
            );

            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;

            vAlpha = 0.5 + 0.5 * sin(t * 5.0);
          }
        `,
      fragmentShader: `
          varying float vAlpha;
          void main() {
             gl_FragColor = vec4(1.0, 1.0, 0.8, vAlpha);
          }
        `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.spores = new THREE.InstancedMesh(sporeGeo, sporeMat, this.sporeCount);

    // Init spores with random params
    const sDummy = new THREE.Object3D();
    const sOffsets = new Float32Array(this.sporeCount * 3);

    for (let i = 0; i < this.sporeCount; i++) {
      sOffsets[i * 3] = Math.random() * 0.5 + 0.5; // speed x
      sOffsets[i * 3 + 1] = Math.random() * 0.5 + 0.5; // speed y
      sOffsets[i * 3 + 2] = Math.random() * 100.0; // Phase

      sDummy.position.set(0, 0, 0);
      sDummy.updateMatrix();
      this.spores.setMatrixAt(i, sDummy.matrix);
    }

    sporeGeo.setAttribute(
      'aOffset',
      new THREE.InstancedBufferAttribute(sOffsets, 3)
    );
    this.group.add(this.spores);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const mat = this.strands.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = ctx.time;
    mat.uniforms.uPress.value = ctx.press;

    const sMat = this.spores.material as THREE.ShaderMaterial;
    sMat.uniforms.uTime.value = ctx.time;

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

// --- Scene 14: Cyber City (Neon Metropolis) ---

class HolographicCityScene extends SceneBase {
  private city: THREE.Group;
  private buildings: THREE.InstancedMesh;
  private traffic: THREE.InstancedMesh;
  private grid: THREE.Mesh;

  private buildingCount = 2000;
  private trafficCount = 5000;

  constructor() {
    super();
    this.id = 'scene14';
    this.contentRadius = 8.0;
    this.baseDistance = 20.0;

    this.city = new THREE.Group();
    this.group.add(this.city);

    // 1. Infinite Grid Floor
    const gridGeo = new THREE.PlaneGeometry(200, 200, 100, 100);
    const gridMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x0044ff) },
      },
      transparent: true,
      vertexShader: `
         varying vec2 vUv;
         void main() {
           vUv = uv;
           gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
         }
       `,
      fragmentShader: `
         varying vec2 vUv;
         uniform float uTime;
         uniform vec3 uColor;

         void main() {
           // Moving Grid
           vec2 uv = vUv * 40.0;
           uv.y += uTime * 0.5;

           vec2 grid = step(0.98, fract(uv));
           float line = max(grid.x, grid.y);

           // Fade distance
           float dist = length(vUv - 0.5);
           float mask = 1.0 - smoothstep(0.0, 0.5, dist);

           gl_FragColor = vec4(uColor, line * mask);
         }
       `,
      side: THREE.DoubleSide,
    });
    this.grid = new THREE.Mesh(gridGeo, gridMat);
    this.grid.rotation.x = -Math.PI / 2;
    this.grid.position.y = -5.0; // Floor
    this.city.add(this.grid);

    // 2. Skyscrapers (Data Servers)
    const bGeo = new THREE.BoxGeometry(1, 1, 1);
    bGeo.translate(0, 0.5, 0); // Pivot base

    const bMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBase: { value: new THREE.Color(0x050510) },
        uNeon: { value: new THREE.Color(0x00aaff) },
        uWin: { value: new THREE.Color(0xff00cc) },
        uAudio: { value: 0 },
      },
      vertexShader: `
         varying vec3 vPos;
         varying vec3 vWorld;
         varying float vId;
         void main() {
            vec4 world = instanceMatrix * vec4(position, 1.0);
            vWorld = world.xyz;
            vPos = position;
            vId = instanceMatrix[3][0]; // Random ID from position X
            gl_Position = projectionMatrix * viewMatrix * world;
         }
       `,
      fragmentShader: `
         varying vec3 vPos;
         varying vec3 vWorld;
         varying float vId;
         uniform float uTime;
         uniform vec3 uBase;
         uniform vec3 uNeon;
         uniform vec3 uWin;
         uniform float uAudio;

         float hash(float n) { return fract(sin(n)*43758.5453); }

         void main() {
            // Edges (Neon Wireframe)
            // Barycentric logic is hard without attribute. Use UV or Position.
            // Box is 0..1 in Y, -0.5..0.5 in XZ? No BoxGeometry is centered usually.
            // But we translated Y.

            // Grid texture on building
            // Assume 1 unit width.
            float gx = step(0.95, fract(vPos.x * 2.0)) + step(0.95, fract(vPos.z * 2.0));
            float gy = step(0.95, fract(vPos.y * 4.0));

            vec3 col = uBase;

            // Windows
            float win = step(0.6, hash(floor(vPos.y * 10.0) + floor(vPos.x*2.0) + vId));
            // Blink windows
            float blink = step(0.9, sin(uTime * 2.0 + vId + vPos.y*10.0));
            if(win > 0.5 && blink < 0.5) col = mix(col, uWin, 0.8);

            // Neon Edges
            float beat = 1.0 + uAudio * 3.0;
            if(gx > 0.5 || gy > 0.5) col = uNeon * beat;

            // Top Glow
            if(vPos.y > 0.98) col = uNeon * 2.0 * beat;

            // Fog from bottom
            float fog = smoothstep(-5.0, 20.0, vWorld.y);

            gl_FragColor = vec4(col, 1.0);
         }
       `,
    });

    this.buildings = new THREE.InstancedMesh(bGeo, bMat, this.buildingCount);
    const dummy = new THREE.Object3D();
    const citySize = 100;

    for (let i = 0; i < this.buildingCount; i++) {
      const x = (Math.random() - 0.5) * citySize;
      const z = (Math.random() - 0.5) * citySize;

      // Avoid center street
      if (Math.abs(x) < 5.0) continue;

      const h = 5.0 + Math.random() * 20.0;
      const w = 1.0 + Math.random() * 2.0;

      dummy.position.set(x, -5.0, z);
      dummy.scale.set(w, h, w);
      dummy.updateMatrix();
      this.buildings.setMatrixAt(i, dummy.matrix);
    }
    this.city.add(this.buildings);

    // 3. Flying Traffic (Data Packets)
    const carGeo = new THREE.BoxGeometry(0.2, 0.1, 0.5);
    const carMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexShader: `
          attribute vec3 aOffset; // x, y, speed
          attribute vec3 aColor;
          varying vec3 vColor;
          uniform float uTime;

          void main() {
             vColor = aColor;
             vec3 p = position;

             // Move along Z
             float z = mod(uTime * aOffset.z, 200.0) - 100.0;
             // Direction based on X sign?
             if(aOffset.x < 0.0) z = -z;

             vec3 finalPos = vec3(aOffset.x, aOffset.y, z) + p;

             // Stretch Z
             // p.z *= 2.0; // handled in geometry

             gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(finalPos, 1.0);
          }
        `,
      fragmentShader: `
          varying vec3 vColor;
          void main() {
             gl_FragColor = vec4(vColor, 0.8);
          }
        `,
    });

    this.traffic = new THREE.InstancedMesh(carGeo, carMat, this.trafficCount);
    const carOffsets = new Float32Array(this.trafficCount * 3);
    const carColors = new Float32Array(this.trafficCount * 3);

    for (let i = 0; i < this.trafficCount; i++) {
      // Lanes: multiple heights, X pos
      const lane = Math.floor(Math.random() * 10);
      const side = Math.random() > 0.5 ? 1 : -1;

      carOffsets[i * 3] = (3.0 + lane * 2.0) * side; // X
      carOffsets[i * 3 + 1] = -4.0 + Math.random() * 20.0; // Y height
      carOffsets[i * 3 + 2] = 20.0 + Math.random() * 30.0; // Speed

      const c = new THREE.Color().setHSL(Math.random(), 1.0, 0.5);
      carColors[i * 3] = c.r;
      carColors[i * 3 + 1] = c.g;
      carColors[i * 3 + 2] = c.b;

      this.traffic.setMatrixAt(i, new THREE.Matrix4());
    }

    carGeo.setAttribute(
      'aOffset',
      new THREE.InstancedBufferAttribute(carOffsets, 3)
    );
    carGeo.setAttribute(
      'aColor',
      new THREE.InstancedBufferAttribute(carColors, 3)
    );

    this.city.add(this.traffic);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const t = ctx.time;
    const bMat = this.buildings.material as THREE.ShaderMaterial;
    if (bMat.uniforms) {
      bMat.uniforms.uTime.value = t;
      if (bMat.uniforms.uAudio) bMat.uniforms.uAudio.value = ctx.audio.level;
    }

    const gMat = this.grid.material as THREE.ShaderMaterial;
    if (gMat.uniforms) gMat.uniforms.uTime.value = t;

    const cMat = this.traffic.material as THREE.ShaderMaterial;
    if (cMat.uniforms) {
      cMat.uniforms.uTime.value = t;
    }

    // Camera Flyover
    // Infinite fly by moving city relative? No, shader moves grid.
    // We just orbit slightly.
    this.camera.position.x = Math.sin(t * 0.1) * 10.0;
    this.camera.position.y = 15.0 + Math.cos(t * 0.1) * 5.0;
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 15: Digital Decay (Entropy) ---

class RealityCollapseScene extends SceneBase {
  private mesh: THREE.InstancedMesh;
  private count = 8000; // Increased density

  constructor() {
    super();
    this.id = 'scene15';
    this.contentRadius = 6.0;
    // We want camera to be able to see the void structure
    this.baseDistance = 12.0;

    // Use Cubes for "Voxel" aesthetic
    const geometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPress: { value: 0 },
        uBaseColor: { value: new THREE.Color(0xffffff) },
        uErrColor: { value: new THREE.Color(0xff0000) },
      },
      vertexShader: `
        attribute vec3 aPos;     // Initial Sphere Position
        attribute float aSpeed;  // Random speed factor
        attribute float aOffset; // Random offset

        varying vec3 vColor;
        varying float vGlitch;

        uniform float uTime;
        uniform float uPress;
        uniform vec3 uBaseColor;
        uniform vec3 uErrColor;

        // 3D Noise for displacement
        // simple hash based
        vec3 hash33(vec3 p3) {
	        p3 = fract(p3 * vec3(.1031, .1030, .0973));
            p3 += dot(p3, p3.yxz+33.33);
            return fract((p3.xxy + p3.yxx)*p3.zyx);
        }

        float noise(vec3 x) {
            vec3 p = floor(x);
            vec3 f = fract(x);
            f = f*f*(3.0-2.0*f);
            return mix(mix(mix( hash33(p).x, hash33(p+vec3(1,0,0)).x,f.x),
                           mix( hash33(p+vec3(0,1,0)).x, hash33(p+vec3(1,1,0)).x,f.x),f.y),
                       mix(mix( hash33(p+vec3(0,0,1)).x, hash33(p+vec3(1,0,1)).x,f.x),
                           mix( hash33(p+vec3(0,1,1)).x, hash33(p+vec3(1,1,1)).x,f.x),f.y),f.z);
        }

        void main() {
             vec3 pos = aPos;

             // Orbit
             float t = uTime * 0.2 * aSpeed;
             float c = cos(t);
             float s = sin(t);
             // Rotate around Y
             float nx = pos.x * c - pos.z * s;
             float nz = pos.x * s + pos.z * c;
             pos.x = nx;
             pos.z = nz;

             // Decay / Noise Field
             vec3 noisePos = pos * 0.5 + vec3(0, -uTime * 0.5, 0);
             float n = noise(noisePos);

             // Glitch Threshold
             // As time passes, more cubes glitch
             float glitchLevel = smoothstep(0.4, 0.7, n + sin(uTime * 0.5)*0.2);

             // Explosion on Press
             float pressExp = uPress * 5.0 * (n + 0.5);
             pos += normalize(pos) * pressExp;

             // Gravity drift for glitched items
             if(glitchLevel > 0.6) {
                 pos.y -= (uTime * aSpeed * 0.5) * (glitchLevel - 0.5);
                 // Quantize position (Digital snapping)
                 pos = floor(pos * 4.0) / 4.0;
             }

             // Instance transform
             vec4 world = modelMatrix * vec4(pos + position, 1.0); // position is box local
             gl_Position = projectionMatrix * viewMatrix * world;

             // Color logic
             vGlitch = glitchLevel;
             if(glitchLevel > 0.8) {
                 vColor = uErrColor;
             } else if(glitchLevel > 0.6) {
                 vColor = vec3(0.1, 0.1, 0.1); // Dead pixel
             } else {
                 // Clean white with shading
                 vec3 light = normalize(vec3(1,1,1));
                 float d = max(0.0, dot(normalize(pos), light));
                 vColor = uBaseColor * (0.5 + 0.5*d);
             }
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vGlitch;
        uniform float uTime;

        void main() {
            vec3 c = vColor;

            // Screen door transparency for glitch
            if(vGlitch > 0.8) {
                // Flash
                if(sin(uTime * 20.0 + gl_FragCoord.y) > 0.0) c = vec3(1.0);
            }

            gl_FragColor = vec4(c, 1.0);
        }
      `,
    });

    this.mesh = new THREE.InstancedMesh(geometry, material, this.count);

    // Fill Attributes
    const aPos = new Float32Array(this.count * 3);
    const aSpeed = new Float32Array(this.count);
    const aOffset = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
      // Sphere distribution
      const r = 2.0 + Math.random() * 6.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      aPos[i * 3] = x;
      aPos[i * 3 + 1] = y;
      aPos[i * 3 + 2] = z;

      aSpeed[i] = 0.5 + Math.random();
      aOffset[i] = Math.random() * 100.0;

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
    this.mesh.geometry.setAttribute(
      'aOffset',
      new THREE.InstancedBufferAttribute(aOffset, 1)
    );

    this.group.add(this.mesh);
  }

  init(_ctx: SceneRuntime) {
    if (this.bg) this.bg = new THREE.Color(0xaaaaaa); // White void
  }

  update(ctx: SceneRuntime) {
    const mat = this.mesh.material as THREE.ShaderMaterial;
    if (mat.uniforms) {
      mat.uniforms.uTime.value = ctx.time;
      mat.uniforms.uPress.value = ctx.press;
    }

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

// --- Scene 16: Electric Storm (Volumetric) ---

class ElectricStormScene extends SceneBase {
  private cloud: THREE.Mesh;

  constructor() {
    super();
    this.id = 'scene16';
    this.contentRadius = 10.0;
    this.baseDistance = 10.0; // Adjusted to be safely inside the box

    // Standard box, rendered on inside faces
    const geo = new THREE.BoxGeometry(30, 30, 30);

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPress: { value: 0 },
        uCameraPos: { value: new THREE.Vector3() },
        uResolution: { value: new THREE.Vector2(1, 1) }, // Init safely, resize updates it
        uPointer: { value: new THREE.Vector3() },
      },
      side: THREE.BackSide, // Render inside faces
      transparent: true,
      depthWrite: false,
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

  init(_ctx: SceneRuntime) {
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
