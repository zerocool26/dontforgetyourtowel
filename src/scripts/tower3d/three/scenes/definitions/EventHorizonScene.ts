import * as THREE from 'three';
import { SceneBase } from './SceneBase';
import type { SceneRuntime } from './types';
import { damp } from './SceneUtils';

export class EventHorizonScene extends SceneBase {
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
    mat.uniforms.uTime.value = ctx.time * (1.0 + ctx.press * 3.0);
    mat.uniforms.uCamPos.value.copy(this.camera.position);

    // Interactive Color Shift (Doppler effect simulation)
    const targetColor =
      ctx.press > 0.1 ? new THREE.Color(0x88ccff) : new THREE.Color(0xff5500);
    mat.uniforms.uColorA.value.lerp(targetColor, 0.05);

    this.photonRing.lookAt(this.camera.position);

    // Tilt the system with mouse
    this.group.rotation.x = Math.PI * 0.15 + ctx.pointer.y * 0.2;
    this.group.rotation.z = Math.PI * 0.1 + ctx.pointer.x * 0.2;

    this.camera.position.z = damp(
      this.camera.position.z,
      25.0 - ctx.press * 5.0,
      2,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}
