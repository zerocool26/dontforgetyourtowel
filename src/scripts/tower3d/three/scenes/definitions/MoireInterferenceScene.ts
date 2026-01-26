import * as THREE from 'three';
import { SceneBase } from './SceneBase';
import type { SceneRuntime } from './types';
import { damp } from './SceneUtils';

export class MoireInterferenceScene extends SceneBase {
  private mesh: THREE.InstancedMesh;
  private count = 40; // Number of rings
  private dummy = new THREE.Object3D();

  constructor() {
    super();
    this.id = 'scene10';
    this.contentRadius = 6.0;

    // Use Torus for Gyroscope rings look
    // Radius 3.0, Tube 0.05, RadialSegs 8 (Square profile), TubularSegs 120
    const geo = new THREE.TorusGeometry(3.0, 0.05, 8, 120);

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPress: { value: 0 },
        uColor: { value: new THREE.Color(0xffffff) }, // White base
      },
      vertexShader: `
            attribute float aSpeed;
            attribute vec3 aAxis;
            varying vec2 vUv;
            varying vec3 vPos;
            varying float vIndex;

            uniform float uTime;
            uniform float uPress;

            // Rotation Matrix helper
            mat4 rotationMatrix(vec3 axis, float angle) {
                axis = normalize(axis);
                float s = sin(angle);
                float c = cos(angle);
                float oc = 1.0 - c;
                return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                            oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                            oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                            0.0,                                0.0,                                0.0,                                1.0);
            }

            void main() {
                vUv = uv;
                vIndex = instanceMatrix[3][0]; // Random index 0..1

                vec3 p = position;

                // Gyroscopic Rotation
                // Rotate coordinate locally based on time * speed
                float angle = uTime * aSpeed + vIndex * 10.0;

                // Interaction: Spin faster
                angle += uPress * sin(uTime * 20.0);

                mat4 rot = rotationMatrix(aAxis, angle);
                vec4 rotatedP = rot * vec4(p, 1.0);

                // Apply instance matrix (Scaling/Position)
                vec4 world = instanceMatrix * rotatedP;

                vPos = world.xyz;
                gl_Position = projectionMatrix * viewMatrix * world;
            }
        `,
      fragmentShader: `
            varying vec2 vUv;
            varying vec3 vPos;
            varying float vIndex;

            uniform float uTime;
            uniform float uPress;

            void main() {
                // Procedural Striping logic

                // Create dashed lines along the tube
                float dashes = sin(vUv.x * 40.0 + uTime * 2.0);
                float rings = sin(vPos.y * 10.0); // World space interference

                float pattern = dashes * rings;

                // Cutout
                if(pattern < 0.2) discard;

                // Color iridescence based on view angle or position
                vec3 col = vec3(1.0);
                col.r = 0.5 + 0.5 * sin(uTime + vIndex * 6.28);
                col.g = 0.5 + 0.5 * sin(uTime * 1.2 + vIndex * 6.28);
                col.b = 1.0;

                // Flash on press
                if(uPress > 0.0) {
                   if(fract(sin(gl_FragCoord.y * 0.1 + uTime * 20.0)) > 0.5) col = vec3(1.0);
                }

                gl_FragColor = vec4(col, 1.0);
            }
        `,
      side: THREE.DoubleSide,
      transparent: true, // Alpha test used mostly
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, this.count);

    const aSpeed = new Float32Array(this.count);
    const aAxis = new Float32Array(this.count * 3);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < this.count; i++) {
      // Concentric Sizes
      const t = i / this.count;
      const scale = 0.2 + t * 1.5; // 0.2 to 1.7

      dummy.scale.setScalar(scale);
      dummy.position.set(0, 0, 0);

      // Random orientation base
      dummy.rotation.set(
        Math.random() * 3,
        Math.random() * 3,
        Math.random() * 3
      );
      dummy.updateMatrix();

      // Encode ID in position for vertex shader?
      // Using translation (3) x is ok as pos is 0
      dummy.matrix.elements[12] = t; // usage as ID

      this.mesh.setMatrixAt(i, dummy.matrix);

      // Random Axis
      const axis = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();
      aAxis[i * 3] = axis.x;
      aAxis[i * 3 + 1] = axis.y;
      aAxis[i * 3 + 2] = axis.z;

      aSpeed[i] = (Math.random() - 0.5) * 2.0; // Rotation speed
    }

    geo.setAttribute('aSpeed', new THREE.InstancedBufferAttribute(aSpeed, 1));
    geo.setAttribute('aAxis', new THREE.InstancedBufferAttribute(aAxis, 3));
    this.group.add(this.mesh);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const mat = this.mesh.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = ctx.time;
    mat.uniforms.uPress.value = ctx.press;

    // Slowly rotate whole system
    this.group.rotation.x = ctx.time * 0.1;

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}
