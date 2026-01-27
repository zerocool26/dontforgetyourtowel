import * as THREE from 'three';
import { SceneBase } from './SceneBase';
import type { SceneRuntime } from './types';
import { damp } from './SceneUtils';

/**
 * Scene 17: Cyber Porsche GT3 RS (High Fidelity)
 * Procedurally modeled with organic curves and composite geometry
 * to approximate the 992 Generation GT3 RS.
 */
export class PorscheScene extends SceneBase {
  private carGroup: THREE.Group;
  private wheels: THREE.Group[] = [];
  private grid: THREE.GridHelper;
  private speed = 0;
  private time = 0;

  constructor() {
    super();
    this.id = 'scene17';
    this.contentRadius = 8.0;
    this.baseDistance = 9.0;

    // --- Container ---
    this.carGroup = new THREE.Group();
    this.carGroup.position.y = 0.33; // Ride height adjustment
    this.group.add(this.carGroup);

    // --- Materials ---
    const paintMat = new THREE.MeshPhysicalMaterial({
      color: 0xc0c0c0, // GT Silver
      metalness: 0.7,
      roughness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      sheen: 0.5,
      sheenColor: 0xffffff,
    });

    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.6,
      metalness: 0.3,
      bumpScale: 0.02,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x111111,
      metalness: 0.9,
      roughness: 0.05,
      transmission: 0.2, // Tinted privacy glass
      transparent: true,
    });

    const rubberMat = new THREE.MeshStandardMaterial({
      color: 0x080808,
      roughness: 0.9,
      metalness: 0.1,
    });

    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x882222, // Pyro Red (roughly)
      metalness: 0.8,
      roughness: 0.2,
    });

    const glowMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.8,
    });

    // ==========================================
    // 1. CHASSIS (CENTRAL FUSELAGE)
    // ==========================================
    // modeled side profile using Bezier curves for the "Flyline"
    // Dimensions: Length ~4.6m, Height ~1.3m (from ground)

    const bodyShape = new THREE.Shape();
    // Start Front Bottom (Splitter area)
    const noseX = 2.3;
    const tailX = -2.3;
    const groundY = 0.05; // Relative to carGroup

    bodyShape.moveTo(noseX - 0.1, groundY);

    // Nose / Bumper
    bodyShape.lineTo(noseX, 0.4);
    // Hood Line (Low and sleek)
    bodyShape.bezierCurveTo(noseX - 0.5, 0.6, 1.0, 0.75, 0.8, 0.85); // Windshield Base

    // Roof Line (The FLYLINE)
    // Peak around x=-0.2 (driver position)
    bodyShape.bezierCurveTo(0.2, 1.35, -1.0, 1.32, -1.8, 0.9); // Rear window slope

    // Ducktail / Spoiler Base
    bodyShape.lineTo(tailX + 0.3, 0.85);
    bodyShape.lineTo(tailX, 0.7); // Rear vertical face top
    bodyShape.lineTo(tailX + 0.1, 0.25); // Rear vertical face bottom

    // Diffuser / Underbody
    bodyShape.lineTo(tailX + 0.3, 0.1);
    bodyShape.lineTo(noseX - 0.2, 0.1); // Under tray

    const extrudeSettings = {
      steps: 4,
      depth: 1.4, // Central width
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 5, // Smooth edges
    };

    const chassisGeo = new THREE.ExtrudeGeometry(bodyShape, extrudeSettings);
    chassisGeo.center(); // Center the geometry geometry-wise
    chassisGeo.translate(0, 0.6, 0); // Lift back up

    // We need to slim the roof compared to the body (Tumblehome)
    // Since Extrude produces a prismatic shape, this is hard.
    // Instead we rely on the Fenders to provide the width at the bottom,
    // and this extrusion represents the cabin + main core.

    const chassis = new THREE.Mesh(chassisGeo, paintMat);
    // Narrower width for the cabin
    chassis.scale.z = 0.85;
    this.carGroup.add(chassis);

    // ==========================================
    // 2. WIDE FENDERS (The Muscle)
    // ==========================================
    // Use smoothed scaling capsules/spheres to create organic flared arches

    const fenderGeo = new THREE.CapsuleGeometry(0.55, 1.2, 4, 16);
    // Rotate to lay along the length of car
    fenderGeo.rotateZ(Math.PI / 2);

    const fFenderScale = new THREE.Vector3(1.0, 0.6, 0.6); // Flattened vertically and width-wise
    const rFenderScale = new THREE.Vector3(1.2, 0.75, 0.8); // Rear is wider/beefier

    // Front Left
    const fl = new THREE.Mesh(fenderGeo, paintMat);
    fl.scale.copy(fFenderScale);
    fl.position.set(1.45, 0.55, 0.75);
    // Twist slightly to follow body lines
    fl.rotation.y = -0.1;
    this.carGroup.add(fl);

    // Front Right
    const fr = new THREE.Mesh(fenderGeo, paintMat);
    fr.scale.copy(fFenderScale);
    fr.position.set(1.45, 0.55, -0.75);
    fr.rotation.y = 0.1;
    this.carGroup.add(fr);

    // Rear Left (The Hips)
    const rl = new THREE.Mesh(fenderGeo, paintMat);
    rl.scale.copy(rFenderScale);
    rl.position.set(-1.45, 0.7, 0.85);
    rl.rotation.y = 0.05;
    rl.rotation.z = -0.05; // Rake
    this.carGroup.add(rl);

    // Rear Right
    const rr = new THREE.Mesh(fenderGeo, paintMat);
    rr.scale.copy(rFenderScale);
    rr.position.set(-1.45, 0.7, -0.85);
    rr.rotation.y = -0.05;
    rr.rotation.z = -0.05;
    this.carGroup.add(rr);

    // ==========================================
    // 3. SWAN NECK WING
    // ==========================================

    // The Wing Blade
    const wingShape = new THREE.Shape();
    // Airfoil profile
    wingShape.moveTo(0, 0);
    wingShape.bezierCurveTo(0.1, 0.08, 0.4, 0.08, 0.5, 0.02); // Top surface
    wingShape.lineTo(0.5, 0.0);
    wingShape.bezierCurveTo(0.4, -0.02, 0.1, -0.02, 0, 0); // Bottom surface

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
      depth: 2.0,
      bevelEnabled: false,
    });
    wingGeo.rotateY(Math.PI / 2);
    wingGeo.center();

    const wing = new THREE.Mesh(wingGeo, carbonMat);
    wing.position.set(-2.1, 1.55, 0);
    wing.scale.set(1.5, 1.5, 1.0); // Make chord length bigger
    wing.rotation.z = -0.15; // Aggressive Angle of Attack
    this.carGroup.add(wing);

    // Swan Neck Struts (Coming from rear deck up and OVER)
    const strutCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.6, 0.9, 0), // Base on engine cover
      new THREE.Vector3(-1.8, 1.4, 0), // Going up/back
      new THREE.Vector3(-2.0, 1.65, 0), // Over the top
      new THREE.Vector3(-2.1, 1.55, 0), // Connecting to top of wing @ screw point
    ]);

    const strutGeo = new THREE.TubeGeometry(strutCurve, 20, 0.03, 8, false);

    const strutL = new THREE.Mesh(strutGeo, carbonMat);
    strutL.position.z = 0.4;
    this.carGroup.add(strutL);

    const strutR = new THREE.Mesh(strutGeo, carbonMat);
    strutR.position.z = -0.4;
    this.carGroup.add(strutR);

    // Wing Endplates
    const endplateGeo = new THREE.BoxGeometry(0.6, 0.4, 0.02);
    const endplateL = new THREE.Mesh(endplateGeo, carbonMat);
    endplateL.position.set(-2.1, 1.5, 1.0);
    this.carGroup.add(endplateL);

    const endplateR = new THREE.Mesh(endplateGeo, carbonMat);
    endplateR.position.set(-2.1, 1.5, -1.0);
    this.carGroup.add(endplateR);

    // ==========================================
    // 4. WHEELS
    // ==========================================

    // Wheelbase ~2.45m
    const frontAxleZ = 1.45;
    const rearAxleZ = -1.45;
    const trackWidth = 0.9;

    const createWheel = (isRear: boolean) => {
      const radius = isRear ? 0.36 : 0.34;
      const width = isRear ? 0.35 : 0.3;

      const group = new THREE.Group();

      // Tire
      const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 24);
      tireGeo.rotateZ(Math.PI / 2);
      const tire = new THREE.Mesh(tireGeo, rubberMat);
      group.add(tire);

      // Rim (Multi-spoke)
      const rimGeo = new THREE.CylinderGeometry(
        radius * 0.7,
        radius * 0.7,
        width * 0.6,
        16
      );
      rimGeo.rotateZ(Math.PI / 2);
      const rim = new THREE.Mesh(rimGeo, rimMat);

      // Spokes (Texture simulated by geometry)
      const spokeGeo = new THREE.BoxGeometry(radius * 1.2, width * 0.7, 0.05);
      const s1 = new THREE.Mesh(spokeGeo, rimMat);
      s1.rotation.y = 0; // vertical
      const s2 = new THREE.Mesh(spokeGeo, rimMat);
      s2.rotation.x = Math.PI / 2; // horizontal
      rim.add(s1);
      rim.add(s2);

      group.add(rim);

      return group;
    };

    const wheelsConfig = [
      { x: frontAxleZ, z: trackWidth, rear: false },
      { x: frontAxleZ, z: -trackWidth, rear: false },
      { x: rearAxleZ, z: trackWidth + 0.05, rear: true }, // Wider rear track
      { x: rearAxleZ, z: -(trackWidth + 0.05), rear: true },
    ];

    wheelsConfig.forEach(cfg => {
      const w = createWheel(cfg.rear);
      w.position.set(cfg.x, 0.34, cfg.z); // Radius height
      this.carGroup.add(w);
      this.wheels.push(w);
    });

    // ==========================================
    // 5. LIGHTS & DETAILS
    // ==========================================

    // Headlights - Oval/Tilted
    const hlGeo = new THREE.SphereGeometry(0.18, 16, 16);
    // Flatten and tilt
    const hlL = new THREE.Mesh(hlGeo, glassMat);
    hlL.scale.set(1.0, 0.7, 1.2);
    hlL.position.set(1.95, 0.65, 0.65);
    hlL.rotation.x = -0.3;
    hlL.rotation.y = -0.2;
    this.carGroup.add(hlL);

    const hlR = hlL.clone();
    hlR.position.set(1.95, 0.65, -0.65);
    hlR.rotation.y = 0.2;
    this.carGroup.add(hlR);

    // Light Interior (The Lens)
    const lensGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const lensL = new THREE.Mesh(lensGeo, headlightMat);
    lensL.position.copy(hlL.position);
    lensL.position.x -= 0.05; // Inside glass
    this.carGroup.add(lensL);

    const lensR = new THREE.Mesh(lensGeo, headlightMat);
    lensR.position.copy(hlR.position);
    lensR.position.x -= 0.05;
    this.carGroup.add(lensR);

    // Rear Light Bar (Continuous Strip)
    const barGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 12);
    barGeo.rotateX(Math.PI / 2); // Lay flat
    // barGeo now along Z

    // Curve the bar? (Segments approach)
    // Simple straight bar for now to reduce vertex cost, placed in cutout
    const bar = new THREE.Mesh(barGeo, glowMat);
    bar.position.set(-2.25, 0.8, 0);
    this.carGroup.add(bar);

    // Side Mirrors
    const mirGeo = new THREE.BoxGeometry(0.15, 0.1, 0.25);
    const mirL = new THREE.Mesh(mirGeo, carbonMat);
    mirL.position.set(0.6, 0.95, 0.95);
    this.carGroup.add(mirL);

    const mirR = new THREE.Mesh(mirGeo, carbonMat);
    mirR.position.set(0.6, 0.95, -0.95);
    this.carGroup.add(mirR);

    // ==========================================
    // ENVIRONMENT
    // ==========================================
    this.grid = new THREE.GridHelper(100, 100, 0x333333, 0x111111);
    this.group.add(this.grid);

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.group.add(ambient);

    const spot = new THREE.SpotLight(0xffffff, 20.0);
    spot.position.set(5, 10, 5);
    spot.lookAt(0, 0, 0);
    spot.angle = 1.0;
    spot.penumbra = 0.5;
    this.group.add(spot);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    this.time += ctx.dt;

    // Input Handling
    const throttle = ctx.press; // 0..1
    const steer = -ctx.pointer.x; // -1..1

    // Dynamics
    const targetSpeed = 10.0 + throttle * 40.0; // 10 to 50 m/s
    this.speed = damp(this.speed, targetSpeed, 2.0, ctx.dt);

    // Move Grid (Infinite Scroll)
    this.grid.position.z = (this.time * this.speed) % 1.0;

    // Wheels Rotation
    const wheelSpin = this.speed * ctx.dt * 2.0;
    this.wheels.forEach((w, i) => {
      w.children[0].rotateX(wheelSpin); // Tire
      w.children[1].rotateX(wheelSpin); // Rim

      // Front Wheel Steering (Indices 0 and 1)
      if (i < 2) {
        w.rotation.y = steer * 0.4;
      }
    });

    // Body Physics
    // Roll (Lean into corner, or out? Sport cars lean out slightly, or stay flat)
    const rollAngle = steer * 0.15; // rad
    // Pitch (Squat)
    const pitchAngle = throttle * 0.05; // Lift nose/squat rear

    this.carGroup.rotation.z = damp(
      this.carGroup.rotation.z,
      rollAngle,
      4.0,
      ctx.dt
    );
    this.carGroup.rotation.x = damp(
      this.carGroup.rotation.x,
      -pitchAngle,
      2.0,
      ctx.dt
    );
    this.carGroup.rotation.y = damp(
      this.carGroup.rotation.y,
      steer * 0.1,
      4.0,
      ctx.dt
    ); // Yaw slightly

    // Position Drift
    const driftX = steer * 2.5;
    this.carGroup.position.x = damp(
      this.carGroup.position.x,
      driftX,
      1.5,
      ctx.dt
    );

    // Camera Chase
    // Camera should be behind and slightly above
    const camTargetX = this.carGroup.position.x * 0.8; // Lag slightly
    const camTargetZ = 6.0 + (this.speed / 50.0) * 2.0; // Pull back at speed
    const camTargetY = 2.0 + (this.speed / 50.0) * 0.5;

    this.camera.position.x = damp(
      this.camera.position.x,
      camTargetX,
      3.0,
      ctx.dt
    );
    this.camera.position.z = damp(
      this.camera.position.z,
      camTargetZ,
      3.0,
      ctx.dt
    );
    this.camera.position.y = damp(
      this.camera.position.y,
      camTargetY,
      3.0,
      ctx.dt
    );

    this.camera.lookAt(this.carGroup.position.x, 0.8, 0);
  }
}
