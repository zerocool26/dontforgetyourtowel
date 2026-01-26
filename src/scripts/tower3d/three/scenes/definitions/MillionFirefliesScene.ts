import * as THREE from 'three';
import { SceneBase } from './SceneBase';
import type { SceneRuntime } from './types';
import { damp } from './SceneUtils';

export class MillionFirefliesScene extends SceneBase {
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

                // Size attenuation (boosted for visibility)
                float dCam = length(mv.xyz);
                gl_PointSize = (8.0 + uPress * 5.0) * (30.0 / dCam);

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
