import * as THREE from 'three';
import { SceneBase } from './SceneBase';
import type { SceneRuntime } from './types';
import { damp } from './SceneUtils';

export class FeedbackForgeScene extends SceneBase {
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
