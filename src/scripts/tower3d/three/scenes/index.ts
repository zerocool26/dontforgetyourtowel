import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { TowerCaps } from '../../core/caps';

export type SceneMeta = {
  id: string;
  title: string;
  caption: string;
  hint: string;
};

export type SceneRuntime = {
  renderer: THREE.WebGLRenderer;
  root: HTMLElement;
  caps: TowerCaps;
  size: { width: number; height: number; dpr: number };
  time: number;
  dt: number;
  progress: number;
  localProgress: number;
  pointer: THREE.Vector2;
  pointerVelocity: THREE.Vector2;
  scrollVelocity: number;
  sceneId: string;
  sceneIndex: number;
};

export interface TowerScene {
  id: string;
  meta: SceneMeta;
  scene: THREE.Scene;
  camera: THREE.Camera;
  init(ctx: SceneRuntime): void;
  update(ctx: SceneRuntime): void;
  render(ctx: SceneRuntime): void;
  resize(ctx: SceneRuntime): void;
  dispose(): void;
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

const sceneMeta: SceneMeta[] = [
  {
    id: 'scene00',
    title: 'Origin Core',
    caption: 'Cinematic resonance chamber tuned to scroll.',
    hint: 'Scroll to descend',
  },
  {
    id: 'scene01',
    title: 'Liquid‑Metal SDF Relic',
    caption: 'A living artifact morphing across materials.',
    hint: 'Drag to dent',
  },
  {
    id: 'scene02',
    title: 'Million Fireflies',
    caption: 'Swarm intelligence in a luminous flow-field.',
    hint: 'Move to steer',
  },
  {
    id: 'scene03',
    title: 'Kinetic Typography Monolith',
    caption: 'Editorial letters assembling then shattering.',
    hint: 'Hover to reveal',
  },
  {
    id: 'scene04',
    title: 'Non‑Euclidean Corridor',
    caption: 'Impossible geometry folding through portals.',
    hint: 'Scroll to warp',
  },
  {
    id: 'scene05',
    title: 'Crystal Refraction Garden',
    caption: 'Dangerous light bending through prisms.',
    hint: 'Tilt for caustics',
  },
  {
    id: 'scene06',
    title: 'Blueprint → Object Assembly',
    caption: 'Line truth inflates into solid reality.',
    hint: 'Scroll to build',
  },
  {
    id: 'scene07',
    title: 'Volumetric Ink Chamber',
    caption: 'Ink clouds carve a hidden silhouette.',
    hint: 'Stir the fog',
  },
  {
    id: 'scene08',
    title: 'Cloth & Light',
    caption: 'A colossal banner wrapping past the lens.',
    hint: 'Wind follows you',
  },
  {
    id: 'scene09',
    title: 'Sculpted Point Cloud',
    caption: 'Scan-grade points re‑lit in real time.',
    hint: 'Scroll to relight',
  },
  {
    id: 'scene10',
    title: 'Fractal Finale',
    caption: 'Infinite descent collapsing into a mark.',
    hint: 'Hold for the drop',
  },
];

const findMeta = (id: string) =>
  sceneMeta.find(meta => meta.id === id) ?? sceneMeta[0];

abstract class SceneBase implements TowerScene {
  id: string;
  meta: SceneMeta;
  scene: THREE.Scene;
  camera: THREE.Camera;

  constructor(id: string) {
    this.id = id;
    this.meta = findMeta(id);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 120);
  }

  init(_ctx: SceneRuntime): void {}

  update(_ctx: SceneRuntime): void {}

  render(ctx: SceneRuntime): void {
    ctx.renderer.render(this.scene, this.camera);
  }

  resize(ctx: SceneRuntime): void {
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = ctx.size.width / Math.max(1, ctx.size.height);
      this.camera.updateProjectionMatrix();
    }
  }

  dispose(): void {
    this.scene.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) {
          mat.forEach(m => m.dispose());
        } else {
          mat.dispose();
        }
      }
      if (obj instanceof THREE.Line || obj instanceof THREE.Points) {
        obj.geometry.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) {
          mat.forEach(m => m.dispose());
        } else {
          mat.dispose();
        }
      }
    });
  }
}

class CoreScene extends SceneBase {
  private group = new THREE.Group();
  private core: THREE.Mesh;
  private ring: THREE.Mesh;
  private shell: THREE.LineSegments;
  private particles: THREE.Points;
  private particlesBase: Float32Array;
  private hue = 210;
  private hue2 = 280;

  constructor() {
    super('scene00');

    this.scene.background = new THREE.Color(0x05070f);
    this.scene.fog = new THREE.FogExp2(0x070b18, 0.055);
    this.scene.add(this.group);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x070a12, 0.65);
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(4, 6, 3);
    const fill = new THREE.PointLight(0xffffff, 0.8, 30, 2);
    fill.position.set(-6, -2, 7);
    this.scene.add(hemi, key, fill);

    this.core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.2, 2),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.6, 0.55, 0.18),
        emissive: new THREE.Color().setHSL(0.68, 0.85, 0.38),
        metalness: 0.45,
        roughness: 0.22,
      })
    );

    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.8, 0.04, 12, 90),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.62, 0.95, 0.62),
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      })
    );
    this.ring.rotation.x = Math.PI / 2.4;

    this.shell = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.45, 1)),
      new THREE.LineBasicMaterial({
        color: new THREE.Color().setHSL(0.55, 0.9, 0.62),
        transparent: true,
        opacity: 0.18,
      })
    );

    const count = 420;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const r = 2.6 + Math.random() * 3.2;
      const a = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 2.4;
      positions[idx] = Math.cos(a) * r;
      positions[idx + 1] = y;
      positions[idx + 2] = Math.sin(a) * r;
    }

    this.particlesBase = positions.slice();

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: new THREE.Color().setHSL(0.6, 0.85, 0.67),
      size: 0.03,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.particles = new THREE.Points(geo, mat);

    this.group.add(this.core, this.ring, this.shell, this.particles);

    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0, 7.2);
    cam.lookAt(0, 0, 0);
  }

  update(ctx: SceneRuntime): void {
    const t = ctx.time;
    const pointer = ctx.pointer;
    const local = ctx.localProgress;

    this.hue = damp(this.hue, 210 + Math.sin(t * 0.2) * 20, 1.5, ctx.dt);
    this.hue2 = damp(this.hue2, 280 + Math.cos(t * 0.3) * 18, 1.5, ctx.dt);

    this.group.rotation.y = t * 0.15 + pointer.x * 0.35;
    this.group.rotation.x = -0.12 + pointer.y * -0.22;

    this.core.rotation.y += ctx.dt * (0.35 + local * 0.3);
    this.core.rotation.x += ctx.dt * 0.2;
    const wobble = Math.sin(t * 1.1) * 0.06 * (0.6 + local);
    this.core.scale.setScalar(1 + wobble);

    this.ring.rotation.z = t * (0.25 + local * 0.35);
    this.ring.rotation.x = Math.PI / 2.4 + Math.sin(t * 0.6) * 0.04;

    this.shell.rotation.y = t * 0.2;

    const coreMat = this.core.material as THREE.MeshStandardMaterial;
    coreMat.color.setHSL(this.hue / 360, 0.6, 0.18);
    coreMat.emissive.setHSL(this.hue2 / 360, 0.9, 0.4);
    coreMat.emissiveIntensity = 0.45 + local * 0.35;

    const ringMat = this.ring.material as THREE.MeshBasicMaterial;
    ringMat.color.setHSL(this.hue2 / 360, 0.95, 0.62);
    ringMat.opacity = 0.16 + local * 0.25;

    const shellMat = this.shell.material as THREE.LineBasicMaterial;
    shellMat.color.setHSL(this.hue / 360, 0.9, 0.65);
    shellMat.opacity = 0.08 + local * 0.18;

    const pGeo = this.particles.geometry as THREE.BufferGeometry;
    const pAttr = pGeo.getAttribute('position') as THREE.BufferAttribute | null;
    if (pAttr?.array instanceof Float32Array) {
      const arr = pAttr.array as Float32Array;
      const count = arr.length / 3;
      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        const bx = this.particlesBase[idx];
        const by = this.particlesBase[idx + 1];
        const bz = this.particlesBase[idx + 2];
        const w = t * 0.6 + i * 0.02;
        const bob = Math.sin(w + bx) * (0.05 + local * 0.08);
        const swirl = Math.cos(w * 0.72 + bz) * (0.04 + local * 0.08);
        const r = Math.hypot(bx, bz) || 1;
        const nx = bx / r;
        const nz = bz / r;
        arr[idx] = bx + nx * swirl;
        arr[idx + 1] = by + bob;
        arr[idx + 2] = bz + nz * swirl;
      }
      pAttr.needsUpdate = true;
    }

    const pMat = this.particles.material as THREE.PointsMaterial;
    pMat.color.setHSL(this.hue / 360, 0.85, 0.67);
    pMat.opacity = 0.2 + local * 0.26;
    pMat.size = 0.028 + local * 0.012;

    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.x = damp(cam.position.x, pointer.x * 0.9, 5, ctx.dt);
    cam.position.y = damp(cam.position.y, pointer.y * 0.6, 5, ctx.dt);
    cam.position.z = damp(cam.position.z, 7.2 - local * 0.6, 4, ctx.dt);
    cam.lookAt(0, 0, 0);

    const fog = this.scene.fog as THREE.FogExp2 | null;
    if (fog) fog.density = 0.05 + local * 0.02;
  }
}

class RaymarchScene extends SceneBase {
  private material: THREE.ShaderMaterial;
  private mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

  constructor(id: string, mode: number) {
    super(id);

    const uniforms = {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uPointer: { value: new THREE.Vector2() },
      uMode: { value: mode },
    };

    this.material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime;
        uniform float uProgress;
        uniform vec2 uResolution;
        uniform vec2 uPointer;
        uniform float uMode;

        float sdSphere(vec3 p, float r) {
          return length(p) - r;
        }

        float sdBox(vec3 p, vec3 b) {
          vec3 q = abs(p) - b;
          return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
        }

        float sdRoundBox(vec3 p, vec3 b, float r) {
          vec3 q = abs(p) - b;
          return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
        }

        mat2 rot(float a) {
          float s = sin(a);
          float c = cos(a);
          return mat2(c, -s, s, c);
        }

        float sdTorus(vec3 p, vec2 t) {
          vec2 q = vec2(length(p.xz) - t.x, p.y);
          return length(q) - t.y;
        }

        float opSmoothUnion(float d1, float d2, float k) {
          float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
          return mix(d2, d1, h) - k * h * (1.0 - h);
        }

        float mapBase(vec3 p) {
          float t = uProgress;
          // Rotate the world slightly so it reads volumetric, not planar.
          vec3 q = p;
          q.xz *= rot(0.22 * uTime + 0.9 * t);
          q.yz *= rot(0.15 * uTime);

          // Avoid the literal "box" silhouette: rounded lens + torus blend.
          float a = sdSphere(q, 1.08);
          float b = sdRoundBox(q, vec3(0.74), 0.28);
          float c = sdTorus(q, vec2(0.84, 0.22));
          float d = opSmoothUnion(a, b, 0.42);
          float e = opSmoothUnion(d, c, 0.32 + 0.18 * sin(uTime * 0.3));

          // Pointer dent (local indentation) to add strong depth cues.
          vec2 pp = uPointer * 0.75;
          float dent = 0.22 * exp(-dot(q.xy - pp, q.xy - pp) * 1.9) * (0.35 + 0.65 * t);
          e -= dent;

          float morph = smoothstep(0.2, 0.8, t);
          return mix(d, e, morph);
        }

        float mapFractal(vec3 p) {
          vec3 z = p;
          float scale = 1.6;
          float dist = 0.0;
          for (int i = 0; i < 5; i++) {
            z = abs(z) / dot(z, z) - 0.9;
            dist += exp(-float(i) * 0.6) * length(z);
            z *= scale;
          }
          return dist * 0.18 - 0.6;
        }

        float mapVol(vec3 p) {
          float d = mapBase(p);
          float swirl = sin(p.x * 1.8 + uTime * 0.4) + cos(p.z * 1.6 - uTime * 0.3);
          return d + swirl * 0.1;
        }

        float mapScene(vec3 p) {
          if (uMode < 0.5) return mapBase(p);
          if (uMode < 1.5) return mapVol(p);
          return mapFractal(p);
        }

        vec3 getNormal(vec3 p) {
          vec2 e = vec2(0.0015, 0.0);
          float d = mapScene(p);
          vec3 n = d - vec3(
            mapScene(p - e.xyy),
            mapScene(p - e.yxy),
            mapScene(p - e.yyx)
          );
          return normalize(n);
        }

        vec3 shade(vec3 p, vec3 rd) {
          vec3 n = getNormal(p);
          vec3 lightA = normalize(vec3(0.6, 0.85, 0.45));
          vec3 lightB = normalize(vec3(-0.45, 0.25, 0.85));

          float diffA = clamp(dot(n, lightA), 0.0, 1.0);
          float diffB = clamp(dot(n, lightB), 0.0, 1.0);
          float diff = diffA * 0.75 + diffB * 0.45;

          vec3 hA = normalize(lightA - rd);
          float specA = pow(clamp(dot(n, hA), 0.0, 1.0), 64.0);
          vec3 hB = normalize(lightB - rd);
          float specB = pow(clamp(dot(n, hB), 0.0, 1.0), 32.0);

          float fres = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 5.0);
          float rim = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 2.25);

          // Tiny AO approximation (3 taps) — heavy but worth it.
          float ao = 0.0;
          ao += (0.02 - mapScene(p + n * 0.02));
          ao += (0.05 - mapScene(p + n * 0.05));
          ao += (0.09 - mapScene(p + n * 0.09));
          ao = clamp(1.0 - ao * 2.0, 0.0, 1.0);

          vec3 baseCool = mix(vec3(0.06, 0.09, 0.14), vec3(0.45, 0.72, 1.1), diff);
          vec3 baseHot = mix(vec3(0.08, 0.06, 0.1), vec3(1.15, 0.42, 0.72), diff);
          float modeMix = smoothstep(0.0, 2.0, uMode);
          vec3 base = mix(baseCool, baseHot, 0.2 + 0.6 * modeMix);

          vec3 specCol = mix(vec3(0.6, 0.8, 1.2), vec3(1.2, 0.6, 0.9), 0.25 + 0.5 * uProgress);
          vec3 col = base * ao;
          col += (specA * 0.9 + specB * 0.55) * specCol;
          col += rim * (0.12 + 0.35 * uProgress) * vec3(0.35, 0.55, 1.0);
          col += fres * 0.25 * vec3(0.5, 0.75, 1.2);
          return col;
        }

        void main() {
          vec2 uv = (vUv * 2.0 - 1.0);
          uv.x *= uResolution.x / max(1.0, uResolution.y);

          // Cinematic camera drift so it reads as a space, not a flat square.
          float camOrbit = 0.22 + 0.18 * smoothstep(0.0, 1.0, uProgress);
          vec3 ro = vec3(
            sin(uTime * 0.22) * camOrbit,
            cos(uTime * 0.19) * camOrbit * 0.75,
            3.15
          );
          ro.xy += uPointer * 0.42;

          // Slight lens warp for depth
          uv *= 1.0 + 0.08 * dot(uv, uv);
          vec3 rd = normalize(vec3(uv, -1.55));

          float t = 0.0;
          float hit = -1.0;
          for (int i = 0; i < 110; i++) {
            vec3 p = ro + rd * t;
            float d = mapScene(p);
            if (d < 0.001) {
              hit = t;
              break;
            }
            t += d * 0.75;
            if (t > 7.0) break;
          }

          // Deep-space background with subtle sparkle
          float star = step(0.996, fract(sin(dot(uv * 700.0, vec2(12.9898, 78.233))) * 43758.5453));
          vec3 col = mix(vec3(0.012, 0.016, 0.03), vec3(0.02, 0.03, 0.06), smoothstep(0.0, 1.2, uv.y + 0.3));
          col += star * vec3(0.25, 0.35, 0.55);
          if (hit > 0.0) {
            vec3 p = ro + rd * hit;
            col = shade(p, rd);
            float fog = exp(-hit * (0.28 + 0.12 * sin(uTime * 0.2)));
            col = mix(vec3(0.01, 0.015, 0.03), col, fog);

            // Tiny pseudo-bloom from highlights (keeps it vivid under ACES)
            float l = max(max(col.r, col.g), col.b);
            col += smoothstep(0.8, 1.6, l) * vec3(0.05, 0.08, 0.14);
          }

          float vign = smoothstep(1.25, 0.22, length(uv));
          col *= 0.78 + vign * 0.38;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.scene.add(this.mesh);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  update(ctx: SceneRuntime): void {
    this.material.uniforms.uTime.value = ctx.time;
    this.material.uniforms.uProgress.value = ctx.localProgress;
    this.material.uniforms.uPointer.value.copy(ctx.pointer);
  }

  resize(ctx: SceneRuntime): void {
    this.material.uniforms.uResolution.value.set(
      ctx.size.width,
      ctx.size.height
    );
  }
}

class SwarmScene extends SceneBase {
  private points: THREE.Points;
  private velocities: Float32Array;
  private base: Float32Array;
  private color = new THREE.Color();

  constructor() {
    super('scene02');
    this.scene.background = new THREE.Color(0x050a14);
    this.scene.fog = new THREE.FogExp2(0x050a14, 0.07);
    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0, 7.5);

    const count = 6500;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const r = Math.random() * 2.2 + 0.4;
      const a = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 3.6;
      positions[idx] = Math.cos(a) * r;
      positions[idx + 1] = y;
      positions[idx + 2] = Math.sin(a) * r;
      velocities[idx] = (Math.random() - 0.5) * 0.2;
      velocities[idx + 1] = (Math.random() - 0.5) * 0.2;
      velocities[idx + 2] = (Math.random() - 0.5) * 0.2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: new THREE.Color(0x8ef3ff),
      size: 0.024,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geo, mat);
    this.velocities = velocities;
    this.base = positions.slice();
    this.scene.add(this.points);
  }

  update(ctx: SceneRuntime): void {
    const geo = this.points.geometry as THREE.BufferGeometry;
    const attr = geo.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const count = arr.length / 3;
    const t = ctx.time;
    const impulse = clamp(
      Math.abs(ctx.scrollVelocity) * 1.1 + ctx.pointerVelocity.length() * 0.75,
      0,
      1
    );
    const pull = 0.28 + ctx.localProgress * 0.95 + impulse * 0.55;
    const swirl = 0.55 + ctx.localProgress * 1.35 + impulse * 1.0;
    const pointer = ctx.pointer;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const px = arr[idx];
      const py = arr[idx + 1];
      const pz = arr[idx + 2];

      const bx = this.base[idx];
      const by = this.base[idx + 1];
      const bz = this.base[idx + 2];

      const ax =
        Math.sin(t * 0.95 + py * 0.65) * swirl - px * 0.11 + pointer.x * 0.55;
      const ay = Math.cos(t * 0.75 + px * 0.85) * 0.42 - py * 0.07;
      const az =
        Math.cos(t * 0.82 + px * 0.55) * swirl - pz * 0.11 + pointer.y * 0.48;

      this.velocities[idx] =
        this.velocities[idx] * 0.92 + ax * 0.02 + (bx - px) * pull * 0.01;
      this.velocities[idx + 1] =
        this.velocities[idx + 1] * 0.92 + ay * 0.02 + (by - py) * pull * 0.008;
      this.velocities[idx + 2] =
        this.velocities[idx + 2] * 0.92 + az * 0.02 + (bz - pz) * pull * 0.01;

      const speed = 2.1 + impulse * 1.15;
      arr[idx] += this.velocities[idx] * ctx.dt * speed;
      arr[idx + 1] += this.velocities[idx + 1] * ctx.dt * speed;
      arr[idx + 2] += this.velocities[idx + 2] * ctx.dt * speed;
    }

    attr.needsUpdate = true;

    const mat = this.points.material as THREE.PointsMaterial;
    this.color.setHSL(0.52 + ctx.localProgress * 0.18, 0.85, 0.65);
    mat.color.copy(this.color);
    mat.size = 0.02 + ctx.localProgress * 0.018 + impulse * 0.01;
    mat.opacity = 0.45 + ctx.localProgress * 0.4 + impulse * 0.22;
  }
}

class KineticTypeScene extends SceneBase {
  private points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private basePositions: Float32Array;
  private positions: Float32Array;
  private velocities: Float32Array;
  private seeds: Float32Array;
  private groups: Float32Array;
  private color = new THREE.Color();

  constructor() {
    super('scene03');
    this.scene.background = new THREE.Color(0x070a14);
    this.scene.fog = new THREE.FogExp2(0x070a14, 0.07);
    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0, 11.5);

    const letters = [
      ['11111', '10001', '10101', '10001', '10001', '10001', '11111'],
      ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
      ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
      ['11111', '10001', '10001', '10001', '10001', '10001', '11111'],
      ['11111', '10001', '10001', '10001', '10001', '10001', '11111'],
      ['10001', '11011', '10101', '10001', '10001', '10001', '10001'],
    ];

    const spacing = 1.2;
    const pixels: THREE.Vector3[] = [];
    letters.forEach((grid, letterIndex) => {
      grid.forEach((row, y) => {
        Array.from(row).forEach((cell, x) => {
          if (cell !== '1') return;
          const px =
            (letterIndex - (letters.length - 1) / 2) * spacing +
            (x - (row.length - 1) / 2) * 0.16;
          const py = ((grid.length - 1) / 2) * 0.2 - y * 0.2;
          // Keep it compact so it doesn't fill the viewport.
          const scale = 0.78;
          const pz = (Math.random() - 0.5) * 1.1;
          pixels.push(new THREE.Vector3(px * scale, py * scale, pz));
        });
      });
    });

    // Particle typography + ambient halo field (avoids the "giant solid square" read).
    const ambientCount = 1400;
    const total = pixels.length + ambientCount;
    this.basePositions = new Float32Array(total * 3);
    this.positions = new Float32Array(total * 3);
    this.velocities = new Float32Array(total * 3);
    this.seeds = new Float32Array(total);
    this.groups = new Float32Array(total);
    const sizes = new Float32Array(total);

    for (let i = 0; i < pixels.length; i++) {
      const p = pixels[i];
      const idx = i * 3;
      this.basePositions[idx] = p.x;
      this.basePositions[idx + 1] = p.y;
      this.basePositions[idx + 2] = p.z;
      this.positions[idx] = p.x;
      this.positions[idx + 1] = p.y;
      this.positions[idx + 2] = p.z;
      this.seeds[i] = Math.random();
      this.groups[i] = 0;
      sizes[i] = 2.8 + Math.random() * 2.2;
    }

    for (let i = 0; i < ambientCount; i++) {
      const ii = pixels.length + i;
      const idx = ii * 3;
      const a = Math.random() * Math.PI * 2;
      const r = 3.5 + Math.pow(Math.random(), 0.7) * 8.0;
      const y = (Math.random() - 0.5) * 4.5;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;

      this.basePositions[idx] = x;
      this.basePositions[idx + 1] = y;
      this.basePositions[idx + 2] = z;
      this.positions[idx] = x;
      this.positions[idx + 1] = y;
      this.positions[idx + 2] = z;
      this.seeds[ii] = Math.random();
      this.groups[ii] = 1;
      sizes[ii] = 1.4 + Math.random() * 1.7;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3)
    );
    this.geometry.setAttribute(
      'aSeed',
      new THREE.BufferAttribute(this.seeds, 1)
    );
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute(
      'aGroup',
      new THREE.BufferAttribute(this.groups, 1)
    );

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
      },
      vertexShader: `
        attribute float aSeed;
        attribute float aSize;
        attribute float aGroup;
        uniform float uTime;
        uniform float uProgress;
        varying float vSeed;
        varying float vGroup;
        varying float vPulse;
        void main(){
          vSeed = aSeed;
          vGroup = aGroup;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float atten = 220.0 / max(1.0, -mv.z);
          float pulse = 0.85 + 0.35 * sin(uTime * 1.2 + aSeed * 12.0);
          float p = smoothstep(0.0, 1.0, uProgress);
          float groupBoost = mix(1.0, 0.75, aGroup);
          gl_PointSize = aSize * atten * (0.85 + 0.35 * p) * pulse * groupBoost;
          gl_Position = projectionMatrix * mv;
          vPulse = 0.25 + 0.75 * p;
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vSeed;
        varying float vGroup;
        varying float vPulse;
        void main(){
          vec2 p = gl_PointCoord * 2.0 - 1.0;
          float d = dot(p, p);
          float a = smoothstep(1.0, 0.0, d);
          a *= smoothstep(1.0, 0.65, d);
          if(a < 0.02) discard;

          vec3 cold = vec3(0.18, 0.55, 1.25);
          vec3 hot  = vec3(1.15, 0.35, 0.95);
          float hue = 0.5 + 0.5 * sin(vSeed * 18.0);
          vec3 col = mix(cold, hot, 0.25 + 0.55 * hue);
          col *= mix(1.15, 0.65, vGroup);

          float core = smoothstep(0.22, 0.0, d);
          col += core * vec3(0.35, 0.45, 0.75) * vPulse;
          gl_FragColor = vec4(col, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.material.toneMapped = false;

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);

    const fog = this.scene.fog as THREE.FogExp2 | null;
    if (fog) fog.density = 0.055;
  }

  update(ctx: SceneRuntime): void {
    const progress = ctx.localProgress;
    const t = ctx.time;
    const impulse = clamp(
      Math.abs(ctx.scrollVelocity) * 1.15 + ctx.pointerVelocity.length() * 0.9,
      0,
      1
    );
    const breathe = 0.28 + 0.22 * Math.sin(t * 0.85);
    const mid = Math.sin(progress * Math.PI);
    const scatter = mid * 2.1 + breathe + impulse * 1.2;

    const pos = this.positions;
    const base = this.basePositions;
    const vel = this.velocities;

    const pointerWorldX = ctx.pointer.x * 1.3;
    const pointerWorldY = ctx.pointer.y * 0.85;

    const basePull = 6.2;
    const ambientPull = 1.15;
    const spin = 1.25 + impulse * 1.1;
    const speed = 1.05 + scatter * 0.22;

    for (let i = 0; i < this.seeds.length; i++) {
      const idx = i * 3;
      const bx = base[idx];
      const by = base[idx + 1];
      const bz = base[idx + 2];

      const x = pos[idx];
      const y = pos[idx + 1];
      const z = pos[idx + 2];

      const seed = this.seeds[i];
      const group = this.groups[i];
      const pull = group < 0.5 ? basePull : ambientPull;
      const w = t * (0.8 + seed) + seed * 10.0;

      // Spring back to base (letters stay legible at ends).
      const ax = (bx - x) * pull;
      const ay = (by - y) * pull;
      const az = (bz - z) * pull;

      // Pointer curl in XY plane.
      const dx = x - pointerWorldX;
      const dy = y - pointerWorldY;
      const inv = 1.0 / (0.65 + dx * dx + dy * dy);
      const curlX = -dy * inv * (0.35 + 0.9 * mid);
      const curlY = dx * inv * (0.35 + 0.9 * mid);

      // Time turbulence.
      const sx = Math.sin(w) * 0.55 + curlX;
      const sy = Math.cos(w * 0.9) * 0.45 + curlY;
      const sz = Math.sin(w * 0.75) * 0.65;

      // Scatter peaks mid-chapter; ambient points are looser.
      const kick = scatter * (0.9 + 0.55 * group);
      const jitter = (seed - 0.5) * kick * 0.02;

      vel[idx] = vel[idx] * 0.9 + ax * 0.02 + sx * 0.02 * spin;
      vel[idx + 1] = vel[idx + 1] * 0.9 + ay * 0.02 + sy * 0.02 * spin;
      vel[idx + 2] = vel[idx + 2] * 0.9 + az * 0.02 + sz * 0.02 * spin;

      pos[idx] = x + vel[idx] * ctx.dt * speed + jitter;
      pos[idx + 1] = y + vel[idx + 1] * ctx.dt * speed + Math.sin(w) * jitter;
      pos[idx + 2] = z + vel[idx + 2] * ctx.dt * speed + Math.cos(w) * jitter;
    }

    const pAttr = this.geometry.getAttribute(
      'position'
    ) as THREE.BufferAttribute;
    pAttr.needsUpdate = true;

    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.x = damp(cam.position.x, ctx.pointer.x * 0.55, 4, ctx.dt);
    cam.position.y = damp(
      cam.position.y,
      0.05 + ctx.pointer.y * 0.25,
      4,
      ctx.dt
    );
    cam.position.z = damp(cam.position.z, 11.5 - progress * 0.9, 3, ctx.dt);
    cam.lookAt(0, 0, 0);

    this.material.uniforms.uTime.value = t;
    this.material.uniforms.uProgress.value = progress;

    // Nudge fog density through the chapter.
    const fog = this.scene.fog as THREE.FogExp2 | null;
    if (fog) fog.density = 0.05 + progress * 0.03;

    // Keep metadata color in sync for any other consumers.
    this.color.setHSL(0.62 + progress * 0.2, 0.75, 0.6);
  }
}

class CorridorScene extends SceneBase {
  private frames: THREE.InstancedMesh;
  private portal: THREE.Mesh;
  private portalMat: THREE.ShaderMaterial;
  private color = new THREE.Color();
  private frameCount = 70;

  constructor() {
    super('scene04');
    this.scene.background = new THREE.Color(0x040913);
    this.scene.fog = new THREE.FogExp2(0x040913, 0.105);
    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0, 4.5);

    const frameGeo = new THREE.BoxGeometry(4, 2.4, 0.06);
    const frameMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x6bd1ff),
      metalness: 0.2,
      roughness: 0.45,
      emissive: new THREE.Color(0.15, 0.25, 0.5),
    });
    this.frames = new THREE.InstancedMesh(frameGeo, frameMat, this.frameCount);

    for (let i = 0; i < this.frameCount; i++) {
      const z = -i * 1.4;
      const scale = 1 - i * 0.02;
      const m = new THREE.Matrix4()
        .makeTranslation(0, 0, z)
        .multiply(new THREE.Matrix4().makeScale(scale, scale, scale));
      this.frames.setMatrixAt(i, m);
    }
    this.frames.instanceMatrix.needsUpdate = true;
    this.scene.add(this.frames);

    const portalGeo = new THREE.CircleGeometry(0.8, 64);
    this.portalMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime;
        uniform float uProgress;

        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        void main() {
          vec2 uv = vUv;
          vec2 p = uv - 0.5;
          float r = length(p);
          float a = atan(p.y, p.x);

          float t = uTime * 0.25;
          float bands = sin(a * 6.0 + t * 6.0) * 0.5 + 0.5;
          float n = noise(p * 6.0 + vec2(t, -t));

          float ring = smoothstep(0.48 + 0.1 * uProgress, 0.12, r);
          float core = smoothstep(0.22, 0.0, r);

          vec3 col = mix(vec3(0.05, 0.09, 0.15), vec3(0.35, 0.75, 1.25), bands);
          col += n * 0.35;
          col *= ring;
          col += core * vec3(0.25, 0.55, 1.0);
          float alpha = ring * (0.35 + 0.55 * uProgress);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.portal = new THREE.Mesh(portalGeo, this.portalMat);
    this.portal.position.z = -4.0;
    this.scene.add(this.portal);

    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(2, 4, 6);
    const pulseA = new THREE.PointLight(0x7fd2ff, 1.6, 18, 2);
    pulseA.position.set(-1.2, 0.4, -1.8);
    const pulseB = new THREE.PointLight(0xff7ad6, 1.2, 18, 2);
    pulseB.position.set(1.1, -0.3, -3.8);
    this.scene.add(key, pulseA, pulseB);
  }

  update(ctx: SceneRuntime): void {
    const t = ctx.time;
    const progress = ctx.localProgress;
    const impulse = clamp(
      Math.abs(ctx.scrollVelocity) * 1.05 + ctx.pointerVelocity.length() * 0.8,
      0,
      1
    );
    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.z = damp(
      cam.position.z,
      4.5 - progress * 2.2 - impulse * 0.35,
      3,
      ctx.dt
    );
    cam.position.x = damp(
      cam.position.x,
      ctx.pointer.x * 0.45 + Math.sin(t * 0.35) * 0.08,
      3,
      ctx.dt
    );
    cam.position.y = damp(
      cam.position.y,
      ctx.pointer.y * 0.28 + Math.cos(t * 0.28) * 0.06,
      3,
      ctx.dt
    );
    cam.lookAt(0, 0, -6);

    this.portal.scale.setScalar(1 + Math.sin(t * 1.4) * 0.05 + progress * 0.25);
    this.portalMat.uniforms.uTime.value = t;
    this.portalMat.uniforms.uProgress.value = progress;

    const frameMat = this.frames.material as THREE.MeshStandardMaterial;
    this.color.setHSL(0.55 + progress * 0.2, 0.85, 0.55);
    frameMat.color.copy(this.color);
    frameMat.emissive.setHSL(0.6 + progress * 0.1, 0.9, 0.4);
  }
}

class CrystalScene extends SceneBase {
  private crystals: THREE.Mesh[] = [];
  private env: THREE.Texture | null = null;
  private pmrem: THREE.PMREMGenerator | null = null;

  constructor() {
    super('scene05');
    this.scene.background = new THREE.Color(0x02050a);
    this.scene.fog = new THREE.FogExp2(0x02050a, 0.08);
    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0.5, 6);
  }

  init(ctx: SceneRuntime): void {
    this.pmrem = new THREE.PMREMGenerator(ctx.renderer);
    this.env = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.env;

    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0.9, 0.95, 1),
      roughness: 0.05,
      metalness: 0.0,
      transmission: 1.0,
      thickness: 0.9,
      ior: 1.45,
      transparent: true,
      envMapIntensity: 1.2,
    });

    const shapes = [
      new THREE.OctahedronGeometry(0.7, 2),
      new THREE.IcosahedronGeometry(0.55, 1),
      new THREE.DodecahedronGeometry(0.6, 0),
    ];

    for (let i = 0; i < 12; i++) {
      const geo = shapes[i % shapes.length];
      const mesh = new THREE.Mesh(geo, crystalMat.clone());
      mesh.position.set(
        (Math.random() - 0.5) * 3.2,
        (Math.random() - 0.5) * 2.2,
        (Math.random() - 0.5) * 2.5
      );
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      this.scene.add(mesh);
      this.crystals.push(mesh);
    }

    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(3, 6, 5);
    this.scene.add(key);
  }

  update(ctx: SceneRuntime): void {
    const t = ctx.time;
    const progress = ctx.localProgress;
    this.crystals.forEach((mesh, i) => {
      mesh.rotation.x += ctx.dt * (0.2 + i * 0.01);
      mesh.rotation.y += ctx.dt * (0.25 + i * 0.015);
      mesh.position.y += Math.sin(t * 0.6 + i) * 0.0008;
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      mat.ior = 1.35 + progress * 0.4;
      mat.transmission = 0.9 + progress * 0.1;
    });

    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.x = damp(cam.position.x, ctx.pointer.x * 0.4, 4, ctx.dt);
    cam.position.y = damp(
      cam.position.y,
      0.4 + ctx.pointer.y * 0.25,
      4,
      ctx.dt
    );
    cam.lookAt(0, 0, 0);
  }

  dispose(): void {
    super.dispose();
    this.env?.dispose();
    this.pmrem?.dispose();
  }
}

class BlueprintScene extends SceneBase {
  private lines: THREE.LineSegments[] = [];
  private hue = 205;

  constructor() {
    super('scene06');
    this.scene.background = new THREE.Color(0x040a16);
    this.scene.fog = new THREE.FogExp2(0x040a16, 0.1);
    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0, 6.5);

    const geometries = [
      new THREE.BoxGeometry(1.6, 0.8, 1.0, 4, 2, 2),
      new THREE.ConeGeometry(0.8, 1.6, 8, 2),
      new THREE.CylinderGeometry(0.4, 0.6, 1.2, 10, 2),
    ];

    geometries.forEach((geo, i) => {
      const edges = new THREE.EdgesGeometry(geo);
      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color().setHSL(0.58, 0.8, 0.6),
        transparent: true,
        opacity: 0.75,
      });
      const line = new THREE.LineSegments(edges, mat);
      line.position.set((i - 1) * 1.6, 0, -i * 1.2);
      this.scene.add(line);
      this.lines.push(line);
    });

    const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(2, 5, 4);
    this.scene.add(key);
  }

  update(ctx: SceneRuntime): void {
    const progress = ctx.localProgress;
    const impulse = clamp(
      Math.abs(ctx.scrollVelocity) * 1.05 + ctx.pointerVelocity.length() * 0.8,
      0,
      1
    );
    const t = ctx.time;
    this.hue = damp(
      this.hue,
      200 + progress * 40 + Math.sin(t * 0.25) * 18 + impulse * 14,
      2,
      ctx.dt
    );
    this.lines.forEach((line, i) => {
      line.rotation.y +=
        ctx.dt * (0.22 + i * 0.085) + Math.sin(t * 0.22 + i) * 0.002;
      line.rotation.x += ctx.dt * 0.11 + Math.cos(t * 0.28 + i) * 0.0016;
      const mat = line.material as THREE.LineBasicMaterial;
      mat.color.setHSL(this.hue / 360, 0.85, 0.65);
      mat.opacity =
        0.28 +
        progress * 0.62 +
        Math.abs(Math.sin(t * 1.2 + i * 0.7)) * 0.14 +
        impulse * 0.18;
    });
  }
}

class InkScene extends SceneBase {
  private material: THREE.ShaderMaterial;
  private mesh: THREE.Mesh;

  constructor() {
    super('scene07');
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uPointer: { value: new THREE.Vector2() },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime;
        uniform float uProgress;
        uniform vec2 uResolution;
        uniform vec2 uPointer;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
          for (int i = 0; i < 5; i++) {
            v += a * noise(p);
            p = m * p;
            a *= 0.55;
          }
          return v;
        }

        void main() {
          vec2 uv = vUv;
          vec2 p = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
          float t = uTime * 0.18;

          // Curl-ish advection
          vec2 q = p;
          q += vec2(sin(q.y * 2.3 + t), cos(q.x * 2.1 - t)) * 0.085;
          q += uPointer * 0.22;

          // Secondary swirl that never stops (even at progress endpoints)
          q += vec2(
            sin(t * 0.9 + p.x * 5.5),
            cos(t * 0.8 + p.y * 5.0)
          ) * 0.03;

          float n = fbm(q * 2.8 + t);
          float m = fbm(q * 5.8 - t * 0.7);
          float ink = smoothstep(0.18 + uProgress * 0.16, 0.9, n + m * 0.38);

          float reveal = smoothstep(0.12, 0.92, uProgress);
          float silhouette = smoothstep(0.42, 0.06, length(p + uPointer * 0.22));
          float body = mix(ink, silhouette, reveal);

          vec3 bg = vec3(0.02, 0.022, 0.032);
          vec3 hi = vec3(0.65, 0.78, 1.15);
          vec3 mid = vec3(0.22, 0.28, 0.42);
          vec3 col = mix(bg, mid, body);
          col = mix(col, hi, pow(body, 3.0) * 0.78);

          // Hot edge shimmer when the pointer stirs the ink
          float edge = smoothstep(0.08, 0.0, abs(dFdx(body)) + abs(dFdy(body)));
          col += edge * vec3(0.25, 0.35, 0.55);

          // Vignette
          float vig = smoothstep(1.0, 0.25, length(p));
          col *= 0.72 + 0.38 * vig;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.scene.add(this.mesh);
  }

  update(ctx: SceneRuntime): void {
    this.material.uniforms.uTime.value = ctx.time;
    this.material.uniforms.uProgress.value = ctx.localProgress;
    this.material.uniforms.uPointer.value.copy(ctx.pointer);
  }

  resize(ctx: SceneRuntime): void {
    this.material.uniforms.uResolution.value.set(
      ctx.size.width,
      ctx.size.height
    );
  }
}

class ClothScene extends SceneBase {
  private mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;

  constructor() {
    super('scene08');
    this.scene.background = new THREE.Color(0x070a14);
    const geo = new THREE.PlaneGeometry(5, 3.2, 140, 90);
    const uniforms = {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uWind: { value: 0 },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        varying vec2 vUv;
        varying float vWave;
        varying vec3 vPos;
        varying vec3 vN;
        uniform float uTime;
        uniform float uProgress;
        uniform float uWind;
        float hash(float n) { return fract(sin(n) * 43758.5453); }
        void main() {
          vUv = uv;
          vec3 pos = position;
          float wave = sin((pos.x + uTime * 1.3) * 2.2) * 0.09;
          float ripple = cos((pos.y + uTime * 1.7) * 3.4) * 0.06;
          float gust = sin(uTime * 0.8 + pos.x * 1.7) * 0.16 * uWind;
          float wrinkle = sin((pos.x + pos.y) * 6.0 + uTime * 2.0) * 0.015;
          float waveSum = wave + ripple + gust + wrinkle;
          vWave = waveSum;
          pos.z += waveSum;
          pos.x += sin(uTime + pos.y * 1.3) * 0.06 * uProgress;
          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          vPos = mv.xyz;
          vN = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying float vWave;
        varying vec3 vPos;
        varying vec3 vN;
        void main() {
          vec3 a = vec3(0.04, 0.06, 0.09);
          vec3 b = vec3(0.42, 0.55, 0.78);
          vec3 base = mix(a, b, smoothstep(0.0, 1.0, vUv.x));

          // Fake weave + sheen
          float weave = sin(vUv.x * 180.0) * sin(vUv.y * 120.0);
          float sheen = smoothstep(-0.02, 0.08, vWave) * 0.65;
          base += weave * 0.03;
          base += sheen * vec3(0.25, 0.35, 0.55);

          // Reconstructed normal from screen-space derivatives for real lighting
          vec3 dpdx = dFdx(vPos);
          vec3 dpdy = dFdy(vPos);
          vec3 n = normalize(cross(dpdx, dpdy));
          // Keep it stable-ish when derivatives are degenerate
          n = normalize(mix(vN, n, 0.85));

          vec3 lightDirA = normalize(vec3(0.4, 0.75, 0.55));
          vec3 lightDirB = normalize(vec3(-0.7, 0.25, 0.6));
          float diff = clamp(dot(n, lightDirA), 0.0, 1.0) * 0.8 +
                       clamp(dot(n, lightDirB), 0.0, 1.0) * 0.45;
          vec3 viewDir = normalize(-vPos);
          vec3 h = normalize(lightDirA + viewDir);
          float spec = pow(clamp(dot(n, h), 0.0, 1.0), 48.0);
          base *= 0.55 + diff * 0.75;
          base += spec * vec3(0.55, 0.75, 1.1) * (0.25 + sheen * 0.9);

          // Edge darkening for depth
          float edge = smoothstep(0.95, 0.6, abs(vUv.x - 0.5) * 2.0);
          base *= 0.8 + 0.2 * edge;
          gl_FragColor = vec4(base, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.scene.add(this.mesh);
    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0.2, 6);
  }

  update(ctx: SceneRuntime): void {
    this.material.uniforms.uTime.value = ctx.time;
    this.material.uniforms.uProgress.value = ctx.localProgress;
    this.material.uniforms.uWind.value = clamp(
      ctx.localProgress + Math.abs(ctx.pointer.x) * 0.6,
      0,
      1
    );
    this.mesh.rotation.y = ctx.pointer.x * 0.2;
    this.mesh.rotation.x = ctx.pointer.y * 0.1;
  }
}

class PointCloudScene extends SceneBase {
  private points: THREE.Points;
  private base: Float32Array;
  private target: Float32Array;
  private color = new THREE.Color();

  constructor() {
    super('scene09');
    this.scene.fog = new THREE.FogExp2(0x02050a, 0.08);
    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0, 7);

    const geoA = new THREE.TorusKnotGeometry(1.25, 0.34, 520, 28);
    const geoB = new THREE.IcosahedronGeometry(1.6, 6);
    const positionsA = geoA.getAttribute('position').array as Float32Array;
    const positionsB = geoB.getAttribute('position').array as Float32Array;

    const count = Math.min(positionsA.length, positionsB.length);
    const pos = new Float32Array(count);
    const base = new Float32Array(count);
    const target = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      base[i] = positionsA[i];
      target[i] = positionsB[i];
      pos[i] = positionsA[i];
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: new THREE.Color(0x8bd8ff),
      size: 0.016,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geo, mat);
    this.base = base;
    this.target = target;
    this.scene.add(this.points);
  }

  update(ctx: SceneRuntime): void {
    const progress = ctx.localProgress;
    const t = ctx.time;
    const impulse = clamp(
      Math.abs(ctx.scrollVelocity) * 1.1 + ctx.pointerVelocity.length() * 0.85,
      0,
      1
    );
    const geo = this.points.geometry as THREE.BufferGeometry;
    const attr = geo.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;

    // Morph with a living "scan" jitter that never fully stops.
    for (let i = 0; i < arr.length; i += 3) {
      const bx = this.base[i];
      const by = this.base[i + 1];
      const bz = this.base[i + 2];

      const tx = this.target[i];
      const ty = this.target[i + 1];
      const tz = this.target[i + 2];

      const mx = lerp(bx, tx, progress);
      const my = lerp(by, ty, progress);
      const mz = lerp(bz, tz, progress);

      const id = i * 0.003;
      const w = t * 0.9 + id;
      const jitter = 0.018 + impulse * 0.06;
      const px = ctx.pointer.x - 0.5;
      const py = ctx.pointer.y - 0.5;

      arr[i] =
        mx + Math.sin(w + mx * 1.4) * jitter + px * 0.22 * (0.2 + impulse);
      arr[i + 1] =
        my +
        Math.cos(w * 1.1 + my * 1.2) * jitter +
        py * 0.18 * (0.2 + impulse);
      arr[i + 2] = mz + Math.sin(w * 0.8 + mz * 1.6) * jitter;
    }
    attr.needsUpdate = true;

    const mat = this.points.material as THREE.PointsMaterial;
    this.color.setHSL(0.55 + progress * 0.2, 0.85, 0.65);
    mat.color.copy(this.color);
    mat.size = 0.016 + progress * 0.018 + impulse * 0.01;
    mat.opacity = 0.52 + progress * 0.35 + impulse * 0.18;

    // Heavy camera drift for depth.
    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.x = damp(cam.position.x, ctx.pointer.x * 0.6, 3, ctx.dt);
    cam.position.y = damp(cam.position.y, ctx.pointer.y * 0.35, 3, ctx.dt);
    cam.lookAt(0, 0, 0);

    this.points.rotation.y +=
      ctx.dt * (0.12 + Math.abs(ctx.scrollVelocity) * 0.08);
    this.points.rotation.x = damp(
      this.points.rotation.x,
      ctx.pointer.y * 0.35,
      4,
      ctx.dt
    );

    this.points.rotation.z = damp(
      this.points.rotation.z,
      Math.sin(t * 0.2) * 0.15 + ctx.pointer.x * 0.18,
      3,
      ctx.dt
    );
  }
}

class FractalScene extends RaymarchScene {
  constructor() {
    super('scene10', 2);
  }
}

export const createScenes = (): TowerScene[] => [
  new CoreScene(),
  new RaymarchScene('scene01', 0),
  new SwarmScene(),
  new KineticTypeScene(),
  new CorridorScene(),
  new CrystalScene(),
  new BlueprintScene(),
  new InkScene(),
  new ClothScene(),
  new PointCloudScene(),
  new FractalScene(),
];

export const getSceneMeta = () => sceneMeta;
