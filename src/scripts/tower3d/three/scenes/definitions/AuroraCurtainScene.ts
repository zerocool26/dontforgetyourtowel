import * as THREE from 'three';
import { SceneBase } from './SceneBase';
import type { SceneRuntime } from './types';
import { damp } from './SceneUtils';

export class AuroraCurtainScene extends SceneBase {
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

           float finalAlpha = vAlpha * 0.15 * (0.5 + 0.5 * rays);

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
