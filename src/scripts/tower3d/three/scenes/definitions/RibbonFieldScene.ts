import * as THREE from 'three';
import { SceneBase } from './SceneBase';
import type { SceneRuntime } from './types';
import { damp } from './SceneUtils';

export class RibbonFieldScene extends SceneBase {
  private mesh: THREE.InstancedMesh;
  private count = 300; // Optimized count
  private dummy = new THREE.Object3D();

  constructor() {
    super();
    this.id = 'scene03';
    this.contentRadius = 6.0;

    // Use a higher resolution plane strip
    const geo = new THREE.PlaneGeometry(0.15, 20, 1, 50);

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
