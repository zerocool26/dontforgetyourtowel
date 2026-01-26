import * as THREE from 'three';
import { SceneBase } from './SceneBase';
import type { SceneRuntime } from './types';
import { damp } from './SceneUtils';

export class NeuralNetworkScene extends SceneBase {
  private nodes: THREE.InstancedMesh;
  private connections: THREE.InstancedMesh;
  private nodeCount = 600;

  constructor() {
    super();
    this.id = 'scene11';
    this.contentRadius = 8.0;

    // 1. Nodes (Somas)
    const nodeGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const nodeMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPress: { value: 0 },
        uPointer: { value: new THREE.Vector3() },
        uColorA: { value: new THREE.Color(0x0088ff) },
        uColorB: { value: new THREE.Color(0xff0088) },
      },
      vertexShader: `
            varying vec3 vPos;
            uniform float uTime;
            void main() {
                vec3 p = position;
                // Pulse breathing
                float h = sin(uTime * 2.0 + instanceMatrix[3][0]*0.5);
                p *= 1.0 + h * 0.1;

                vec4 world = instanceMatrix * vec4(p, 1.0);
                vPos = world.xyz;
                gl_Position = projectionMatrix * viewMatrix * world;
            }
        `,
      fragmentShader: `
            varying vec3 vPos;
            uniform float uTime;
            uniform float uPress;
            uniform vec3 uPointer;
            uniform vec3 uColorA;
            uniform vec3 uColorB;

            void main() {
                // Bio-luminescent pulse wave
                float wave = sin(uTime * 3.0 + vPos.x * 0.5 + vPos.y * 0.5);
                float activation = smoothstep(0.8, 1.0, wave);

                // Mouse Interaction: Highlight nearby nodes
                // uPointer is roughly in world space Z=0
                float dMouse = distance(vPos.xy, uPointer.xy);
                // Sphere is roughly radius 5. Pointer range -1..1 -> -5..5
                float mouseGlow = smoothstep(3.0, 0.0, dMouse); // 3 unit radius

                activation += mouseGlow * 0.8;

                vec3 col = mix(uColorA, uColorB, clamp(activation, 0.0, 1.0));

                // Core hot spot
                col += vec3(1.0) * activation * 0.5;

                // Interaction flash
                col += vec3(1.0) * uPress;

                gl_FragColor = vec4(col, 1.0);
            }
        `,
    });

    this.nodes = new THREE.InstancedMesh(nodeGeo, nodeMat, this.nodeCount);

    const positions: THREE.Vector3[] = [];
    const dummy = new THREE.Object3D();

    for (let i = 0; i < this.nodeCount; i++) {
      // Brain-like distribution (Ellipsoid)
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 5.0 * Math.cbrt(Math.random());

      let x = r * Math.sin(phi) * Math.cos(theta);
      let y = r * Math.sin(phi) * Math.sin(theta);
      let z = r * Math.cos(phi);

      // Flatten slightly
      y *= 0.7;

      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      this.nodes.setMatrixAt(i, dummy.matrix);

      positions.push(new THREE.Vector3(x, y, z));
    }
    this.group.add(this.nodes);

    // 2. Axons (Volumetric Connections)
    // We use stretched boxes to create thick lines
    const connGeo = new THREE.BoxGeometry(0.04, 0.04, 1.0);
    // Translate geometry so origin is at Z=0, extending to Z=1
    connGeo.translate(0, 0, 0.5);

    const connMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPress: { value: 0 },
        uColor: { value: new THREE.Color(0x00aaff) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexShader: `
            attribute float aLength;
            attribute float aPhase;
            varying float vLen;
            varying float vPhase;
            varying float vLocalZ;

            void main() {
                vLen = aLength;
                vPhase = aPhase;

                vec3 p = position;
                // Position is already 0 to 1 in Z due to geometry translation
                // Scale Z by length is handled by instance matrix scale?
                // No, we handle it here or in JS.
                // If we scaled in JS, 'position.z' goes 0..Length.

                // Let's assume instance scale.z = length.
                // Then position.z goes 0..1 in local? No.
                // BoxGeometry default is centered. We translated it 0..1.
                // Instance scale multiplies it.

                vLocalZ = p.z; // This will vary 0..1 if we rely on matrix scale

                gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
            }
        `,
      fragmentShader: `
            varying float vPhase;
            varying float vLocalZ;
            uniform float uTime;
            uniform vec3 uColor;

            void main() {
                // Signal Packet travelling down the axon
                float speed = 2.0;
                float packet = mod(uTime * speed + vPhase, 10.0); // 0 to 10 loop

                // packet is the Z position of the pulse (in scaled units? No relative to time)
                // vLocalZ is 0..1.
                // We want pulse to travel 0..1 really fast?

                // If we want slow travel:
                // vLocalZ is normalized length.
                float dist = abs(vLocalZ * 10.0 - packet); // Scale Z up so pulse is small

                float glow = smoothstep(1.5, 0.0, dist); // Tail
                glow *= smoothstep(0.0, 0.2, dist); // Sharp lead?

                // Make packet teardrop shape
                float lead = step(packet, vLocalZ * 10.0); // 0 if passed?

                // Simpler Beam
                float beam = smoothstep(0.0, 1.0, 1.0 - abs(vLocalZ * 10.0 - packet));

                float alpha = 0.1 + beam * 2.0;

                gl_FragColor = vec4(uColor, alpha);
            }
        `,
    });

    // Generate connections
    const connInstances = [];

    for (let i = 0; i < this.nodeCount; i++) {
      const p1 = positions[i];
      let found = 0;
      // Connect to nearest 3 neighbors
      for (let j = i + 1; j < this.nodeCount; j++) {
        if (found >= 2) break; // Limit density
        const p2 = positions[j];
        const d = p1.distanceTo(p2);
        if (d < 2.5) {
          connInstances.push({ p1, p2, dist: d });
          found++;
        }
      }
    }

    this.connections = new THREE.InstancedMesh(
      connGeo,
      connMat,
      connInstances.length
    );

    // const scales = new Float32Array(connInstances.length); // We won't use this if we scale matrix
    const phases = new Float32Array(connInstances.length);

    for (let i = 0; i < connInstances.length; i++) {
      const { p1, p2, dist } = connInstances[i];

      dummy.position.copy(p1);
      dummy.lookAt(p2);
      dummy.scale.set(1, 1, dist); // Stretch Z to match distance
      dummy.updateMatrix();

      this.connections.setMatrixAt(i, dummy.matrix);
      phases[i] = Math.random() * 10.0;
    }

    this.connections.geometry.setAttribute(
      'aPhase',
      new THREE.InstancedBufferAttribute(phases, 1)
    );
    this.group.add(this.connections);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const nMat = this.nodes.material as THREE.ShaderMaterial;
    if (nMat.uniforms) {
      nMat.uniforms.uTime.value = ctx.time;
      nMat.uniforms.uPress.value = ctx.press;
      // Map pointer (-1..1) to world space approx (assuming radius 5)
      nMat.uniforms.uPointer.value.set(
        ctx.pointer.x * 5.0,
        ctx.pointer.y * 5.0,
        0
      );
    }

    const cMat = this.connections.material as THREE.ShaderMaterial;
    if (cMat.uniforms) cMat.uniforms.uTime.value = ctx.time;

    this.group.rotation.y = ctx.time * 0.05;

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}
