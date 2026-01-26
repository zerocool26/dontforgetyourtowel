import * as THREE from 'three';
import { SceneBase } from './SceneBase';
import type { SceneRuntime } from './types';
import { damp } from './SceneUtils';

export class KaleidoGlassScene extends SceneBase {
  private shapes: THREE.InstancedMesh;
  private count = 380; // Icosahedral symmetry count approx

  private dummy = new THREE.Object3D();

  constructor() {
    super();
    this.id = 'scene06';
    this.contentRadius = 5.0;

    // Complex Crystal Geometry
    // We use a group of merged geometries for the base instance to get detail
    // Actually, let's use a dynamic shape: Isosahedron details
    const geo = new THREE.OctahedronGeometry(0.8, 0);

    // High-end glass material with Dispersion
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      emissive: 0x000000,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 1.0, // Glass
      thickness: 3.0, // Volume
      ior: 1.6, // Refraction
      clearcoat: 1.0,
      attenuationColor: new THREE.Color(0xffaaaa), // Pinkish internal absorption
      attenuationDistance: 2.0,
    });
    // mat.dispersion = 0.15; // High dispersion for rainbows
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mat as any).dispersion = 0.15;

    this.shapes = new THREE.InstancedMesh(geo, mat, this.count);
    this.group.add(this.shapes);

    // Inner Light Core (The "Source")
    const coreGeo = new THREE.IcosahedronGeometry(2.0, 4);
    // const coreMat = new THREE.ShaderMaterial({
    /*
    const coreMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
            varying vec3 vPos;
            varying vec3 vNormal;
            void main() {
                vPos = position;
                vNormal = normal;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
      fragmentShader: `
            uniform float uTime;
            varying vec3 vPos;
            varying vec3 vNormal;
            void main() {
                vec3 col = 0.5 + 0.5 * cos(uTime + vPos.xyx + vec3(0,2,4));
                float rim = 1.0 - max(0.0, dot(vNormal, vec3(0,0,1)));
                col += pow(rim, 3.0);
                gl_FragColor = vec4(col, 1.0);
            }
        `,
      side: THREE.BackSide, // Render inside out so we see it through glass? No, FrontSide
    }); */
    // Actually, standard material is better for being refracted
    const innerLight = new THREE.Mesh(
      coreGeo,
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    innerLight.scale.setScalar(0.5);
    this.group.add(innerLight);

    // Add point light to illuminate the glass from inside
    const pl = new THREE.PointLight(0xff00ff, 10, 10);
    this.group.add(pl);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const t = ctx.time * 0.2;
    const press = ctx.press;

    // Animate instances in a symmetry pattern
    // Golden ratio
    const phi = (1 + Math.sqrt(5)) / 2;

    for (let i = 0; i < this.count; i++) {
      // Parametric orbits
      const offset = i * 0.1;

      // Base Rotation (Kaleidoscopic)
      const angle = (i / this.count) * Math.PI * 2 * phi;
      const r = 3.5 + Math.sin(t * 2.0 + offset) * 0.5;

      // Sphere mapping
      const y = ((i / (this.count - 1)) * 2 - 1) * (3.0 + press * 2.0);
      const radiusAtY = Math.sqrt(r * r - y * y);
      const theta = angle * 13.0 + t; // Spin fast

      const x = radiusAtY * Math.cos(theta);
      const z = radiusAtY * Math.sin(theta);

      this.dummy.position.set(x, y, z);

      // Construct ring / shell
      // Look at center
      this.dummy.lookAt(0, 0, 0);

      // Constant rotation of individual shards
      this.dummy.rotateZ(t * 2.0 + i);
      this.dummy.rotateX(t + i);

      // Scale pulse
      const s = 0.4 + 0.3 * Math.sin(t * 5.0 + i);
      this.dummy.scale.setScalar(s);

      // Expansion on press
      if (press > 0) {
        this.dummy.position.multiplyScalar(1.0 + press * 0.5);
        this.dummy.rotation.x += press * i;
      }

      this.dummy.updateMatrix();
      this.shapes.setMatrixAt(i, this.dummy.matrix);
    }
    this.shapes.instanceMatrix.needsUpdate = true;

    // Rotate entire kaleidoscope
    this.group.rotation.z = t * 0.5;
    this.group.rotation.y = ctx.pointer.x * 0.5;
    this.group.rotation.x = ctx.pointer.y * 0.5;

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}
