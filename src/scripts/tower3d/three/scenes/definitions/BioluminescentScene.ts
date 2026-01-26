import * as THREE from 'three';
import { SceneBase } from './SceneBase';
import type { SceneRuntime } from './types';
import { damp } from './SceneUtils';

export class BioluminescentScene extends SceneBase {
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
    geo.instanceCount = this.count; // CRITICAL FIX: Enable instancing

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
