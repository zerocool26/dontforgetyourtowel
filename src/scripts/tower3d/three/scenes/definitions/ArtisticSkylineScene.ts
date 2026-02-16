import * as THREE from 'three';
import { SceneBase } from './SceneBase';
import type { SceneRuntime } from './types';
import { damp } from './SceneUtils';

type TrafficUnit = {
  laneZ: number;
  laneY: number;
  speed: number;
  direction: 1 | -1;
  offset: number;
  sway: number;
};

export class ArtisticSkylineScene extends SceneBase {
  private skylineGroup: THREE.Group;
  private atmosphereGroup: THREE.Group;
  private ringGroup: THREE.Group;

  private nearBuildings: THREE.InstancedMesh;
  private farBuildings: THREE.InstancedMesh;
  private traffic: THREE.InstancedMesh;
  private aerialPoints: THREE.Points;

  private nearMaterial: THREE.ShaderMaterial;
  private farMaterial: THREE.ShaderMaterial;
  private groundMaterial: THREE.ShaderMaterial;
  private aerialMaterial: THREE.ShaderMaterial;

  private trafficUnits: TrafficUnit[];

  constructor() {
    super();
    this.id = 'scene17';
    this.contentRadius = 9.5;
    this.baseDistance = 19;
    this.camera.position.set(0, 5.4, this.baseDistance);

    this.skylineGroup = new THREE.Group();
    this.atmosphereGroup = new THREE.Group();
    this.ringGroup = new THREE.Group();
    this.group.add(this.skylineGroup, this.atmosphereGroup, this.ringGroup);

    const nearGeo = new THREE.BoxGeometry(0.82, 1, 0.82);
    nearGeo.translate(0, 0.5, 0);

    const nearCount = 420;
    this.nearMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPulse: { value: 0 },
      },
      vertexShader: `
        varying vec3 vWorld;
        varying vec3 vLocal;

        void main() {
          vLocal = position;
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        varying vec3 vWorld;
        varying vec3 vLocal;
        uniform float uTime;
        uniform float uPulse;

        float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 345.45));
          p += dot(p, p + 34.345);
          return fract(p.x * p.y);
        }

        void main() {
          float citySeed = hash21(floor(vWorld.xz * 0.5));
          float verticalBand = smoothstep(0.0, 0.2, fract(vLocal.y * 10.0 + citySeed * 4.0));
          float strip = step(0.965, fract(vLocal.y * 14.0 + citySeed * 7.0));
          float edge = step(0.47, max(abs(vLocal.x), abs(vLocal.z)));

          float scan = smoothstep(0.0, 1.0, sin((vWorld.y * 2.4) - uTime * 1.8) * 0.5 + 0.5);
          float pulse = smoothstep(0.0, 1.0, sin((vWorld.x + vWorld.z) * 0.24 - uTime * 2.5) * 0.5 + 0.5) * uPulse;

          vec3 base = mix(vec3(0.11, 0.22, 0.45), vec3(0.22, 0.82, 1.0), citySeed);
          vec3 accent = mix(vec3(0.72, 0.28, 0.92), vec3(0.14, 0.88, 0.95), scan);
          vec3 color = mix(base, accent, 0.42 + pulse * 0.35);

          float alpha = edge * 0.22 + strip * 0.55 + verticalBand * 0.14;
          alpha += pulse * 0.2;

          float dist = length(vWorld.xz);
          float fog = 1.0 - smoothstep(2.0, 18.0, dist);
          gl_FragColor = vec4(color, alpha * fog);
        }
      `,
    });

    this.nearBuildings = new THREE.InstancedMesh(
      nearGeo,
      this.nearMaterial,
      nearCount
    );
    this.skylineGroup.add(this.nearBuildings);

    const farGeo = new THREE.BoxGeometry(0.9, 1, 0.9);
    farGeo.translate(0, 0.5, 0);

    const farCount = 360;
    this.farMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vWorld;

        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        varying vec3 vWorld;
        uniform float uTime;

        float lineMask(float value, float count, float threshold) {
          float f = fract(value * count + uTime * 0.05);
          return step(threshold, f);
        }

        void main() {
          float glow = lineMask(vWorld.y, 2.6, 0.92);
          float haze = smoothstep(0.0, 1.0, 1.0 - abs(vWorld.y - 2.0) * 0.18);
          float depth = 1.0 - smoothstep(8.0, 26.0, length(vWorld.xz));

          vec3 color = mix(vec3(0.08, 0.12, 0.25), vec3(0.14, 0.45, 0.75), haze);
          color += vec3(0.24, 0.12, 0.45) * glow;

          gl_FragColor = vec4(color, (0.22 + glow * 0.2) * depth);
        }
      `,
    });

    this.farBuildings = new THREE.InstancedMesh(
      farGeo,
      this.farMaterial,
      farCount
    );
    this.skylineGroup.add(this.farBuildings);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(14, 96),
      (this.groundMaterial = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vWorld;

          void main() {
            vUv = uv;
            vec4 world = modelMatrix * vec4(position, 1.0);
            vWorld = world.xyz;
            gl_Position = projectionMatrix * viewMatrix * world;
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          varying vec3 vWorld;
          uniform float uTime;

          void main() {
            vec2 p = vUv - 0.5;
            float radial = length(p) * 2.0;

            float gridX = step(0.97, fract((p.x + 0.5) * 28.0 + uTime * 0.35));
            float gridY = step(0.97, fract((p.y + 0.5) * 28.0));
            float grid = max(gridX, gridY);

            float ring = smoothstep(0.08, 0.0, abs(radial - (0.35 + sin(uTime * 0.35 + vWorld.x * 0.08) * 0.08)));
            float fade = 1.0 - smoothstep(0.45, 1.0, radial);

            vec3 color = mix(vec3(0.02, 0.07, 0.15), vec3(0.12, 0.42, 0.6), ring + grid * 0.4);
            gl_FragColor = vec4(color, (0.22 + ring * 0.28 + grid * 0.16) * fade);
          }
        `,
      }))
    );
    ground.rotation.x = -Math.PI * 0.5;
    ground.position.y = 0;
    this.atmosphereGroup.add(ground);

    this.ringGroup.position.y = 2.2;
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0x48c9ff),
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i < 8; i += 1) {
      const radius = 4.2 + i * 0.95;
      const tube = 0.015 + i * 0.005;
      const torus = new THREE.Mesh(
        new THREE.TorusGeometry(radius, tube, 10, 140),
        ringMat.clone()
      );
      torus.rotation.x = Math.PI * 0.5;
      torus.rotation.y = (i / 8) * Math.PI;
      torus.position.y = -1.35 + i * 0.08;
      this.ringGroup.add(torus);
    }

    const trafficCount = 170;
    this.traffic = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.2, 0.03, 0.82),
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      trafficCount
    );
    this.trafficUnits = Array.from({ length: trafficCount }, (_, index) => ({
      laneZ: (Math.random() - 0.5) * 13.5,
      laneY: 0.08 + Math.floor(Math.random() * 7) * 0.09,
      speed: 1.2 + Math.random() * 3.4,
      direction: index % 2 === 0 ? 1 : -1,
      offset: Math.random() * 120,
      sway: 0.02 + Math.random() * 0.07,
    }));
    this.skylineGroup.add(this.traffic);

    const particleCount = 950;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSeed = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i += 1) {
      const i3 = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const radius = 3.5 + Math.random() * 9;
      particlePositions[i3] = Math.cos(angle) * radius;
      particlePositions[i3 + 1] = 0.2 + Math.random() * 7.2;
      particlePositions[i3 + 2] = Math.sin(angle) * radius;
      particleSeed[i] = Math.random();
    }

    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(particlePositions, 3)
    );
    particlesGeometry.setAttribute(
      'aSeed',
      new THREE.BufferAttribute(particleSeed, 1)
    );

    this.aerialMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float aSeed;
        varying float vAlpha;

        uniform float uTime;

        void main() {
          vec3 p = position;
          float drift = sin(uTime * (0.35 + aSeed * 1.4) + aSeed * 6.2831);
          p.x += drift * (0.05 + aSeed * 0.26);
          p.z += cos(uTime * (0.22 + aSeed * 1.2) + aSeed * 9.12) * (0.07 + aSeed * 0.22);

          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;

          float size = 1.0 + aSeed * 2.8;
          gl_PointSize = size * (290.0 / -mv.z);

          vAlpha = 0.18 + aSeed * 0.65;
        }
      `,
      fragmentShader: `
        varying float vAlpha;

        void main() {
          vec2 p = gl_PointCoord - 0.5;
          float d = length(p);
          float mask = smoothstep(0.5, 0.0, d);
          vec3 color = mix(vec3(0.25, 0.42, 0.86), vec3(0.26, 0.9, 0.95), mask);
          gl_FragColor = vec4(color, mask * vAlpha * 0.5);
        }
      `,
    });

    this.aerialPoints = new THREE.Points(
      particlesGeometry,
      this.aerialMaterial
    );
    this.atmosphereGroup.add(this.aerialPoints);

    this.buildNearCity();
    this.buildFarCity();
    this.seedTraffic();
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const time = ctx.time;

    this.nearMaterial.uniforms.uTime.value = time;
    this.nearMaterial.uniforms.uPulse.value = ctx.press;
    this.farMaterial.uniforms.uTime.value = time;
    this.groundMaterial.uniforms.uTime.value = time;
    this.aerialMaterial.uniforms.uTime.value = time;

    this.ringGroup.rotation.z = time * 0.035;
    this.ringGroup.rotation.y = time * 0.05 + ctx.pointer.x * 0.14;

    const camRadius = 15.2;
    const yaw = time * 0.07 + ctx.pointer.x * 0.25;
    const targetX = Math.sin(yaw) * camRadius;
    const targetZ = Math.cos(yaw) * camRadius;
    const targetY = 4.8 + ctx.pointer.y * 2.3 + Math.sin(time * 0.32) * 0.25;

    this.camera.position.x = damp(this.camera.position.x, targetX, 2.5, ctx.dt);
    this.camera.position.z = damp(this.camera.position.z, targetZ, 2.5, ctx.dt);
    this.camera.position.y = damp(this.camera.position.y, targetY, 2.8, ctx.dt);

    const lookY = 2.6 + Math.sin(time * 0.44) * 0.2;
    this.camera.lookAt(0, lookY, 0);

    this.updateTraffic(time, ctx.pointer.x, ctx.press);
  }

  private buildNearCity() {
    const dummy = new THREE.Object3D();
    const count = this.nearBuildings.count;

    for (let i = 0; i < count; i += 1) {
      const ring = 2.2 + Math.pow(Math.random(), 0.55) * 7.8;
      const angle = Math.random() * Math.PI * 2;
      const jitter = (Math.random() - 0.5) * 0.22;
      const x = Math.cos(angle) * ring + jitter;
      const z = Math.sin(angle) * ring + jitter;

      const block = 0.42 + Math.random() * 0.36;
      const height = 0.9 + Math.pow(Math.random(), 0.45) * 7.6;

      dummy.position.set(x, 0, z);
      dummy.scale.set(block, height, block);
      dummy.updateMatrix();
      this.nearBuildings.setMatrixAt(i, dummy.matrix);
    }

    this.nearBuildings.instanceMatrix.needsUpdate = true;
  }

  private buildFarCity() {
    const dummy = new THREE.Object3D();
    const count = this.farBuildings.count;

    for (let i = 0; i < count; i += 1) {
      const ring = 8.2 + Math.random() * 8.6;
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * ring;
      const z = Math.sin(angle) * ring;

      const footprint = 0.65 + Math.random() * 0.5;
      const height = 1.8 + Math.pow(Math.random(), 0.6) * 10.2;

      dummy.position.set(x, 0, z);
      dummy.scale.set(footprint, height, footprint);
      dummy.updateMatrix();
      this.farBuildings.setMatrixAt(i, dummy.matrix);
    }

    this.farBuildings.instanceMatrix.needsUpdate = true;
  }

  private seedTraffic() {
    const dummy = new THREE.Object3D();
    const warm = new THREE.Color(0xff7a3c);
    const cyan = new THREE.Color(0x5be7ff);

    for (let i = 0; i < this.traffic.count; i += 1) {
      const unit = this.trafficUnits[i];
      const x = (i / this.traffic.count) * 20 - 10;

      dummy.position.set(x, unit.laneY, unit.laneZ);
      dummy.rotation.y = unit.direction > 0 ? 0 : Math.PI;
      dummy.scale.set(0.85 + Math.random() * 0.5, 1, 0.8 + Math.random() * 0.6);
      dummy.updateMatrix();
      this.traffic.setMatrixAt(i, dummy.matrix);

      const t = Math.random();
      this.traffic.setColorAt(i, cyan.clone().lerp(warm, t));
    }

    this.traffic.instanceMatrix.needsUpdate = true;
    if (this.traffic.instanceColor) {
      this.traffic.instanceColor.needsUpdate = true;
    }
  }

  private updateTraffic(time: number, pointerX: number, press: number) {
    const dummy = new THREE.Object3D();
    const rangeMin = -12.5;
    const rangeMax = 12.5;
    const range = rangeMax - rangeMin;

    for (let i = 0; i < this.traffic.count; i += 1) {
      const unit = this.trafficUnits[i];
      const base = time * unit.speed * unit.direction + unit.offset;
      let x = (((base % range) + range) % range) + rangeMin;
      x += pointerX * 0.55;

      const z =
        unit.laneZ +
        Math.sin(time * (0.8 + unit.sway * 4.0) + unit.offset) * unit.sway;
      const y = unit.laneY + Math.sin(time * 1.7 + unit.offset) * 0.015;

      dummy.position.set(x, y, z);
      dummy.rotation.y = unit.direction > 0 ? 0 : Math.PI;

      const pulse = 1 + press * 0.42;
      dummy.scale.set(pulse, 1, 1 + press * 0.18);

      dummy.updateMatrix();
      this.traffic.setMatrixAt(i, dummy.matrix);
    }

    this.traffic.instanceMatrix.needsUpdate = true;
  }
}
