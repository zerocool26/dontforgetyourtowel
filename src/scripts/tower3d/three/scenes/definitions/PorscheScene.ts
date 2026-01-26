import * as THREE from 'three';
import { SceneBase } from './SceneBase';
import type { SceneRuntime } from './types';
import { damp } from './SceneUtils';

/**
 * Scene 17: Cyber Porsche Concept
 * A procedural, low-poly / synthwave style sports car construction.
 * Since we don't have external assets, we build a stylized representation using primitives.
 */
export class PorscheScene extends SceneBase {
  private carGroup: THREE.Group;
  private chassis: THREE.Mesh;
  private wheels: THREE.Mesh[] = [];
  private grid: THREE.GridHelper;

  // Interactive State
  private driftAngle = 0;
  private speed = 0;

  constructor() {
    super();
    this.id = 'scene17';
    this.contentRadius = 8.0;
    this.baseDistance = 10.0;

    this.carGroup = new THREE.Group();
    this.group.add(this.carGroup);

    // --- 1. Procedural Car Body ---
    // A mix of boxes and cylinders to approximate a Porsche 911 silhouette (Cyberpunk style)

    // Main Material (Car Paint)
    const paintMat = new THREE.MeshPhysicalMaterial({
      color: 0x555555,
      metalness: 0.9,
      roughness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide,
    });

    // Body Core
    const bodyGeo = new THREE.BoxGeometry(2.0, 0.6, 4.5);
    // Bevel/Shape modification would be ideal but hard with Box.
    // Let's us a Dynamic Mesh or just compose shapes.

    // Lower Chassis
    const chassisGeo = new THREE.BoxGeometry(2.1, 0.4, 4.2);
    chassisGeo.translate(0, 0.3, 0);
    this.chassis = new THREE.Mesh(chassisGeo, paintMat);
    this.carGroup.add(this.chassis);

    // Cabin (Greenhouse)
    const cabinGeo = new THREE.CylinderGeometry(0.9, 1.1, 1.8, 4, 1);
    // Rotate to lie on top
    cabinGeo.rotateY(Math.PI * 0.25); // Square it up
    cabinGeo.rotateX(Math.PI * 0.5); // Lay flat
    cabinGeo.scale(1.2, 1.0, 0.5); // Stretch
    cabinGeo.translate(0, 0.9, -0.2);

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x111111,
      metalness: 1.0,
      roughness: 0.0,
      transmission: 0.2, // Tinted glass
      transparent: true,
    });
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    this.carGroup.add(cabin);

    // Hood (Front)
    const hoodGeo = new THREE.BoxGeometry(1.9, 0.1, 1.5);
    hoodGeo.translate(0, 0.55, 1.5);
    hoodGeo.rotateX(0.1); // Slope
    const hood = new THREE.Mesh(hoodGeo, paintMat);
    this.carGroup.add(hood);

    // Rear Spoiler
    const spoilerGeo = new THREE.BoxGeometry(2.0, 0.05, 0.8);
    spoilerGeo.translate(0, 0.9, -2.1);
    spoilerGeo.rotateX(0.2);
    const spoiler = new THREE.Mesh(spoilerGeo, paintMat);
    this.carGroup.add(spoiler);

    // Headlights (Emissive Eyes)
    const lightGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.2, 16);
    lightGeo.rotateX(Math.PI * 0.5);
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xaaccff,
      emissiveIntensity: 5.0,
    });

    const leftLight = new THREE.Mesh(lightGeo, lightMat);
    leftLight.position.set(-0.7, 0.5, 2.1);
    this.carGroup.add(leftLight);

    const rightLight = new THREE.Mesh(lightGeo, lightMat);
    rightLight.position.set(0.7, 0.5, 2.1);
    this.carGroup.add(rightLight);

    // Tail Light Strip (Cyberpunk)
    const tailGeo = new THREE.BoxGeometry(2.0, 0.1, 0.1);
    tailGeo.translate(0, 0.6, -2.15);
    const tailMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0033,
      emissiveIntensity: 8.0,
    });
    const tail = new THREE.Mesh(tailGeo, tailMat);
    this.carGroup.add(tail);

    // --- 2. Wheels ---
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 32);
    wheelGeo.rotateZ(Math.PI * 0.5);
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.8,
    });
    // Rims (Emissive Ring)
    const rimGeo = new THREE.TorusGeometry(0.25, 0.02, 16, 32);
    rimGeo.rotateY(Math.PI * 0.5); // Align with wheel face
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x00ffcc,
      emissive: 0x00ffcc,
      emissiveIntensity: 2.0,
    });

    const wheelPositions = [
      new THREE.Vector3(-1.0, 0.4, 1.4), // FL
      new THREE.Vector3(1.0, 0.4, 1.4), // FR
      new THREE.Vector3(-1.0, 0.4, -1.4), // RL
      new THREE.Vector3(1.0, 0.4, -1.4), // RR
    ];

    wheelPositions.forEach(pos => {
      const g = new THREE.Group();
      g.position.copy(pos);

      const w = new THREE.Mesh(wheelGeo, wheelMat);
      const r1 = new THREE.Mesh(rimGeo, rimMat);
      // rim needs to be on outside face
      r1.position.x = pos.x > 0 ? 0.16 : -0.16;

      g.add(w);
      g.add(r1);

      this.carGroup.add(g);
      this.wheels.push(w); // Keep ref for rotation
    });

    // --- 3. Environment ---
    // Moving Grid floor
    this.grid = new THREE.GridHelper(40, 40, 0x444444, 0x222222);
    this.group.add(this.grid);

    // Speed Lines (Instanced Lines)
    // Simple stars streaking past
    // Using a simple particle system for speed
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    // 1. Driving Physics Simulation
    const t = ctx.time;

    // Simulate speed based on press/interaction
    // Default cruising speed, boost on press
    this.speed = 10.0 + ctx.press * 30.0;

    // Move Grid to simulate forward motion
    // Grid z repeats every 1 unit (40 size / 40 divs = 1)
    // Actually size 40, divs 40 = 1 unit spacing.
    const dist = t * this.speed;
    this.grid.position.z = dist % 1.0;

    // Wheel Rotation
    const wheelRot = this.speed * ctx.dt * 2.0;
    this.wheels.forEach(w => {
      // We added wheels to a Group, we need to rotate the group OR the mesh inside?
      // We added mesh 'w' to a group 'g'.
      // Rotating w.rotateX changes axis because w is rotated Z 90.
      // It's a cylinder along X. Rolling means rotating around X.
      w.parent!.rotation.x += wheelRot;
    });

    // Car Body Sway / Drift using Pointer
    const targetRotY = -ctx.pointer.x * 0.5; // Turn
    const targetRotX = Math.sin(t * 10.0) * 0.02 + this.speed * 0.002; // Engine vibration + acceleration tilt

    this.carGroup.rotation.y = damp(
      this.carGroup.rotation.y,
      targetRotY,
      4,
      ctx.dt
    );
    this.carGroup.rotation.x = damp(
      this.carGroup.rotation.x,
      -targetRotX,
      2,
      ctx.dt
    ); // Tilt back on acceleration

    // Roll on turn
    this.carGroup.rotation.z = damp(
      this.carGroup.rotation.z,
      -ctx.pointer.x * 0.2,
      4,
      ctx.dt
    );

    // Camera chase
    // Camera is naturally at (0, 0, baseDistance) in SceneBase
    // We want a chase cam feel.
    // Move camera slightly opposite to turn
    const camX = ctx.pointer.x * 2.0;
    const camY = 3.0 + ctx.pointer.y * 2.0;

    this.camera.position.x = damp(this.camera.position.x, camX, 2, ctx.dt);
    this.camera.position.y = damp(this.camera.position.y, camY, 2, ctx.dt);
    this.camera.lookAt(0, 0.5, 0); // Look at car center
  }
}
