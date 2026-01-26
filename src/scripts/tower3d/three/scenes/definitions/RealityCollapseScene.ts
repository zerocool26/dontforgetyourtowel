import * as THREE from 'three';
import { SceneBase } from './SceneBase';
import type { SceneRuntime } from './types';
import { damp } from './SceneUtils';

export class RealityCollapseScene extends SceneBase {
  private shards: THREE.InstancedMesh;
  private wireframe: THREE.LineSegments;
  private count = 1000;

  constructor() {
    super();
    this.id = 'scene15';
    this.contentRadius = 6.0;
    this.baseDistance = 12.0;

    // A giant sphere that is shattered
    // 1. Solid shards
    const gGeom = new THREE.IcosahedronGeometry(4, 2);
    // Break into individual triangles?
    // InstancedMesh of triangles is efficient.

    // Let's take the vertices of an Icosahedron and use them as positions for small flat shards
    const shardGeo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      -0.5,
      -0.4,
      0,
      0.5,
      -0.4,
      0,
      0.0,
      0.6,
      0, // Triangle
    ]);
    shardGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    shardGeo.computeVertexNormals();

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 }, // driven by press
      },
      side: THREE.DoubleSide,
      // flatShading: true, // Removed as it might cause TS issues in some versions or is not needed with custom shader
      vertexShader: `
         attribute vec3 aCenter;
         attribute vec3 aRandom; // direction, speed, rot axis
         varying vec3 vNormal;
         uniform float uTime;
         uniform float uProgress;

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
           vNormal = normal;

           // Animation loop: implosion -> explosion
           float cycle = sin(uTime * 0.5) * 0.5 + 0.5; // 0..1
           // Add user interaction
           float p = clamp(cycle + uProgress, 0.0, 2.0);

           // Explode outward
           vec3 dir = normalize(aCenter);
           float dist = 4.0 + p * 10.0 * aRandom.x;

           vec3 pos = dir * dist;

           // Local rotation
           float angle = uTime * aRandom.y + p * 5.0;
           mat4 rot = rotationMatrix(aRandom, angle);

           vec3 localPos = (rot * vec4(position, 1.0)).xyz;

           // Combine
           vec3 finalPos = pos + localPos;

           // Sucking into a black hole at center?
           // If p > 1.5, suck to 0
           if (p > 1.2) {
             float suction = smoothstep(1.2, 2.0, p);
             finalPos = mix(finalPos, vec3(0.0), suction);
           }

           gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
         }
       `,
      fragmentShader: `
         varying vec3 vNormal;
         void main() {
           vec3 light = normalize(vec3(1.0, 1.0, 1.0));
           float d = max(dot(vNormal, light), 0.0);
           vec3 col = vec3(0.1, 0.1, 0.2) + vec3(0.8, 0.8, 1.0) * d;
           gl_FragColor = vec4(col, 1.0);
         }
       `,
    });

    this.shards = new THREE.InstancedMesh(shardGeo, mat, this.count);

    // Distribute on sphere surface
    const cDummy = new THREE.Object3D();
    const centers = [];
    const randoms = [];

    for (let i = 0; i < this.count; i++) {
      // Fibonacci sphere
      const phi = Math.acos(1 - (2 * (i + 0.5)) / this.count);
      const theta = Math.PI * (1 + 5 ** 0.5) * (i + 0.5);

      const x = Math.cos(theta) * Math.sin(phi);
      const z = Math.sin(theta) * Math.sin(phi);
      const y = Math.cos(phi);

      const vec = new THREE.Vector3(x, y, z).multiplyScalar(4.0);
      cDummy.position.copy(vec);
      cDummy.lookAt(0, 0, 0);
      cDummy.updateMatrix();

      this.shards.setMatrixAt(i, cDummy.matrix);

      centers.push(x, y, z);
      randoms.push(Math.random(), Math.random(), Math.random());
    }

    shardGeo.setAttribute(
      'aCenter',
      new THREE.InstancedBufferAttribute(new Float32Array(centers), 3)
    );
    shardGeo.setAttribute(
      'aRandom',
      new THREE.InstancedBufferAttribute(new Float32Array(randoms), 3)
    );

    this.group.add(this.shards);

    // 2. Central Singularity (Wireframe sphere)
    const wGeo = new THREE.IcosahedronGeometry(1, 1);
    const wMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      wireframe: true,
    });
    this.wireframe = new THREE.LineSegments(
      new THREE.WireframeGeometry(wGeo),
      wMat
    );
    this.group.add(this.wireframe);

    // Add a black hole sphere blocking background?
    const bGeo = new THREE.SphereGeometry(0.95, 32, 32);
    const bMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.group.add(new THREE.Mesh(bGeo, bMat));
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const mat = this.shards.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = ctx.time;
    mat.uniforms.uProgress.value = ctx.press;

    // Rotate core
    this.wireframe.rotation.y -= 0.05;
    this.wireframe.rotation.z += 0.02;

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      2,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}
