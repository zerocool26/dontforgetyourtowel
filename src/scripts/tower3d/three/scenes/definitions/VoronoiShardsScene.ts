import * as THREE from 'three';
import { SceneBase } from './SceneBase';
import type { SceneRuntime } from './types';
import { damp } from './SceneUtils';

export class VoronoiShardsScene extends SceneBase {
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

            // Interaction: Explosion / Separation
            // When pressed, shards fly outward from center of their instance (aRandom.x?)
            // We need to know the instance position to push it.
            // BUT vertex shader acts on local vertices.
            // InstancedMesh matrix handles the transform.
            // We can add an offset in local space that looks like explosion if we assume shards are somewhat centered?
            // Actually, we created them in a Helix.
            // In the constructor: "this.dummy.position.set..."
            // The instance matrix has the position.

            // To explode them, we really need to modify the instanceMatrix or hav 'aCenter' attribute.
            // Let's rely on scale glitch which is easier.

            // Improved Glitch:
            float glitch = sin(uTime * 50.0 + aRandom.z * 232.0);

            // Twist vertex
            float twist = uPress * pos.y * 3.0; // Twist along Y axis
            float c = cos(twist);
            float s = sin(twist);
            mat2 m = mat2(c, -s, s, c);
            pos.xz = m * pos.xz;

            float scale = (0.5 + aRandom.z) * blink;

            // Apply glitch
            if(uPress > 0.0) scale *= (1.0 + glitch * 0.5);

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
