import * as THREE from 'three';
import { SceneBase } from './SceneBase';
import type { SceneRuntime } from './types';
import { damp } from './SceneUtils';

export class LibraryScene extends SceneBase {
  private books: THREE.InstancedMesh;
  private count = 1000; // Reduced for mobile stability

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
