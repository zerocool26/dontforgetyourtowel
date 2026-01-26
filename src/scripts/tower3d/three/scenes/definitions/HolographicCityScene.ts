import * as THREE from 'three';
import { SceneBase } from './SceneBase';
import type { SceneRuntime } from './types';
import { damp } from './SceneUtils';

export class HolographicCityScene extends SceneBase {
  private cityGroup: THREE.Group;
  private buildings: THREE.InstancedMesh;
  private cars: THREE.InstancedMesh;
  private count = 400;

  constructor() {
    super();
    this.id = 'scene14';
    this.contentRadius = 8.0;
    this.baseDistance = 16.0;

    this.cityGroup = new THREE.Group();
    this.group.add(this.cityGroup);

    // 1. Buildings - Wireframe boxes
    // Use EdgesGeometry logic inside shader? Or actual lines?
    // Let's use thick lines via Box + Shader
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    boxGeo.translate(0, 0.5, 0);

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x00d9ff) },
        uScan: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
         varying vec3 vPos;
         varying vec3 vWorldPos;
         varying vec3 vCenter;
         void main() {
           vPos = position;
           vec4 world = modelMatrix * vec4(position, 1.0);
           vWorldPos = world.xyz;
           gl_Position = projectionMatrix * viewMatrix * world;
         }
       `,
      fragmentShader: `
         varying vec3 vPos;
         varying vec3 vWorldPos;
         uniform float uTime;
         uniform vec3 uColor;
         uniform float uScan;

         float grid(vec3 p, float k) {
            vec3 f = fract(p * k);
            vec3 g = step(0.95, f);
            return max(g.x, max(g.y, g.z));
         }

         void main() {
            // Edges
            float edge = grid(vPos, 1.0); // Unit box edges
            // Internal Grid
            float internal = grid(vPos, 5.0) * 0.2;

            float alpha = edge + internal;

            // Scanline moving up
            float scanH = mod(uTime * 5.0, 15.0) - 5.0;
            float beam = smoothstep(0.5, 0.0, abs(vWorldPos.y - scanH));

            // Press effect -> uScan explodes
            float explode = smoothstep(0.0, 20.0, uScan);
            // Actually uScan passed as 'press' value usually 0->1
            // Let's make the city glitch if pressed
            float glitch = step(0.9, fract(vWorldPos.y * 10.0 + uScan * 20.0));

            vec3 finalCol = uColor + vec3(beam);
            finalCol += glitch * uScan;

            // Distance fade
            float d = length(vWorldPos);
            float fade = 1.0 - smoothstep(5.0, 20.0, d);

            gl_FragColor = vec4(finalCol, alpha * fade * 0.8 + beam * 0.5);
         }
       `,
    });

    this.buildings = new THREE.InstancedMesh(boxGeo, mat, this.count);
    this.cityGroup.add(this.buildings);

    // Layout city
    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.count; i++) {
      // Grid Layout
      const x = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 20;
      // Snap to grid
      const gx = Math.round(x);
      const gz = Math.round(z);

      if (Math.abs(gx) < 2 && Math.abs(gz) < 2) continue; // Clear center

      const h = 1.0 + Math.random() * 5.0;
      const s = 0.8; // Scale width slightly less than 1 to leave gap
      dummy.position.set(gx, 0, gz);
      dummy.scale.set(s, h, s);
      dummy.updateMatrix();

      this.buildings.setMatrixAt(i, dummy.matrix);
    }

    // 2. Flying Cars
    const carGeo = new THREE.BoxGeometry(0.2, 0.05, 0.4);
    const carMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
    this.cars = new THREE.InstancedMesh(carGeo, carMat, 100);
    this.cityGroup.add(this.cars);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const time = ctx.time;
    const mat = this.buildings.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = time;
    mat.uniforms.uScan.value = ctx.press; // Glitch on press

    // Animate cars
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 100; i++) {
      const lane = (i % 5) * 2.0 + 3.0; // Elevation
      const speed = 2.0 + (i % 3);
      const offset = i * 100.0;
      const t = time * speed + offset;

      // Cars move along grid-ish paths?
      // Simple circle logic for now
      const r = 8.0 + (i % 3) * 2.0;
      const x = Math.sin(t * 0.1) * r;
      const z = Math.cos(t * 0.1) * r;

      dummy.position.set(x, lane, z);
      dummy.lookAt(x + Math.cos(t * 0.1), lane, z - Math.sin(t * 0.1));
      dummy.updateMatrix();
      this.cars.setMatrixAt(i, dummy.matrix);
    }
    this.cars.instanceMatrix.needsUpdate = true;

    // Rotate Camera slowly around city
    const camR = 14.0;
    const camY = 8.0 + ctx.pointer.y * 5.0;
    const camAngle = time * 0.1 + ctx.pointer.x * 2.0;

    this.camera.position.x = Math.sin(camAngle) * camR;
    this.camera.position.z = Math.cos(camAngle) * camR;
    this.camera.position.y = damp(this.camera.position.y, camY, 4, ctx.dt);

    this.camera.lookAt(0, 2, 0);
  }
}
