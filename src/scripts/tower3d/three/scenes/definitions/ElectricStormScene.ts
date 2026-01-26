import * as THREE from 'three';
import { SceneBase } from './SceneBase';
import type { SceneRuntime } from './types';
import { damp } from './SceneUtils';

export class ElectricStormScene extends SceneBase {
  private bolts: THREE.Mesh;
  private clouds: THREE.InstancedMesh;
  private count = 20;

  constructor() {
    super();
    this.id = 'scene16';
    this.contentRadius = 6.0;
    this.baseDistance = 14.0;

    // 1. Lightning Bolts (Instanced thick lines/planes)
    // Actually, let's use a single complex geometry that jitters in shader?
    // Or multiple strips.
    const boltGeo = new THREE.PlaneGeometry(0.1, 10, 1, 20);
    const boltsInst = new THREE.InstancedBufferGeometry();
    boltsInst.index = boltGeo.index;
    boltsInst.attributes.position = boltGeo.attributes.position;
    boltsInst.attributes.uv = boltGeo.attributes.uv;

    const bPos: number[] = [];
    for (let i = 0; i < this.count; i++) {
      const x = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 10 - 5; // behind
      bPos.push(x, 0, z);
    }
    boltsInst.setAttribute(
      'aBase',
      new THREE.InstancedBufferAttribute(new Float32Array(bPos), 3)
    );
    boltsInst.instanceCount = this.count;

    const bMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xffffaa) },
      },
      side: THREE.DoubleSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexShader: `
         attribute vec3 aBase;
         varying float vAlpha;
         uniform float uTime;

         float rand(vec2 n) {
            return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
         }

         float noise(float p){
            float fl = floor(p);
            float fc = fract(p);
            return mix(rand(vec2(fl)), rand(vec2(fl + 1.0)), fc);
         }

         void main() {
           // Jitter x position based on Y
           float y = position.y + 5.0; // 0..10
           float t = uTime * 20.0 + aBase.x; // Fast flicker

           // Lightning strike Trigger
           // Random spikes
           float strike = step(0.98, fract(sin(floor(t)) * 43758.5453));

           if (strike < 0.5) {
             vAlpha = 0.0;
             gl_Position = vec4(0.0, 0.0, 0.0, 0.0); // Cull
             return;
           }

           vAlpha = 1.0;

           // Jagged line
           float jagged = (noise(y * 10.0 + t) - 0.5) * 1.0;
           vec3 pos = position;
           pos.x += jagged;
           pos += aBase;

           gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
         }
       `,
      fragmentShader: `
         varying float vAlpha;
         uniform vec3 uColor;
         void main() {
           if (vAlpha < 0.1) discard;
           gl_FragColor = vec4(uColor, vAlpha);
         }
       `,
    });
    this.bolts = new THREE.Mesh(boltsInst, bMat);
    this.group.add(this.bolts);

    // 2. Storm Clouds (Particles)
    const cGeo = new THREE.PlaneGeometry(4, 4);
    const cMat = new THREE.MeshBasicMaterial({
      color: 0x333344,
      transparent: true,
      opacity: 0.1,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });
    this.clouds = new THREE.InstancedMesh(cGeo, cMat, 50);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < 50; i++) {
      dummy.position.set(
        (Math.random() - 0.5) * 30,
        5 + Math.random() * 5,
        (Math.random() - 0.5) * 10 - 5
      );
      dummy.scale.setScalar(1.0 + Math.random());
      dummy.rotation.z = Math.random() * Math.PI;
      dummy.updateMatrix();
      this.clouds.setMatrixAt(i, dummy.matrix);
    }
    this.group.add(this.clouds);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const mat = this.bolts.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = ctx.time;

    // Rain effect?
    // Simple camera shake on thunder
    // (Simulated by high frequency noise in shader, maybe slight cam jitter here if we want)

    // Interaction intensifies storm
    if (ctx.press > 0) {
      // maybe more frequent strikes?
      // done in shader for now
      // Or shake camera
      this.camera.position.x += (Math.random() - 0.5) * ctx.press * 0.2;
      this.camera.position.y += (Math.random() - 0.5) * ctx.press * 0.2;
    }

    // Scroll clouds
    // (Static for now)

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      2,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}
