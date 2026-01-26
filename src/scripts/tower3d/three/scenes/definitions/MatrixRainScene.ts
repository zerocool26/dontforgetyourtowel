import * as THREE from 'three';
import { SceneBase } from './SceneBase';
import type { SceneRuntime } from './types';
import { damp } from './SceneUtils';

export class MatrixRainScene extends SceneBase {
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
