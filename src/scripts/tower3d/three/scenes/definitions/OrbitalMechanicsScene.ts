import * as THREE from 'three';
import { SceneBase } from './SceneBase';
import type { SceneRuntime } from './types';
import { damp } from './SceneUtils';

export class OrbitalMechanicsScene extends SceneBase {
  private debris: THREE.InstancedMesh;
  private planet: THREE.Mesh;
  private rings: THREE.Mesh;
  private atmo: THREE.Mesh;
  private count = 4000; // Increased debris
  private dummy = new THREE.Object3D();
  private pointerPos = new THREE.Vector3();

  constructor() {
    super();
    this.id = 'scene08';
    this.contentRadius = 8.0;

    // 1. Procedural Gas Giant (Hyper-Real)
    // Multi-layered noise for clouds and storms
    const pGeo = new THREE.SphereGeometry(2.5, 128, 128);
    const pMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color(0xd9c2a3) }, // Cream
        uColorB: { value: new THREE.Color(0xa65e2e) }, // Terracotta
        uColorC: { value: new THREE.Color(0x4a2e1d) }, // Dark Umber
        uColorD: { value: new THREE.Color(0x1a1a3a) }, // Deep Storm
        uSunDir: { value: new THREE.Vector3(1.0, 0.5, 1.0).normalize() },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPos;
        varying vec3 vWorldNormal;

        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vWorldNormal = normalize((modelMatrix * vec4(normal,0.0)).xyz);
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vViewPos = -mvPosition.xyz;
            gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform vec3 uColorC;
        uniform vec3 uColorD;
        uniform vec3 uSunDir;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPos;
        varying vec3 vWorldNormal;

        // FBM Noise
        float hash(float n) { return fract(sin(n) * 758.5453); }
        float noise(vec3 x) {
            vec3 p = floor(x);
            vec3 f = fract(x);
            f = f*f*(3.0-2.0*f);
            float n = p.x + p.y*57.0 + p.z*113.0;
            return mix(mix(mix(hash(n+0.0), hash(n+1.0),f.x),
                           mix(hash(n+57.0), hash(n+58.0),f.x),f.y),
                       mix(mix(hash(n+113.0), hash(n+114.0),f.x),
                           mix(hash(n+170.0), hash(n+171.0),f.x),f.y),f.z);
        }

        float fbm(vec3 p) {
            float f = 0.0;
            float amp = 0.5;
            for(int i=0; i<5; i++) {
                f += amp * noise(p);
                p *= 2.02;
                amp *= 0.5;
            }
            return f;
        }

        // Curl-like distortion
        float warp(vec3 p) {
            return fbm(p + fbm(p + fbm(p)));
        }

        void main() {
            // Planet Coordinates
            // UV mapping on sphere has pole distortion, better to use 3D noise on sphere surface coords if available
            // But UV is fine for gas bands if we account for y

            vec3 seed = vec3(vUv * 5.0, uTime * 0.05);

            // Major Bands (Latitude functions)
            float lat = vUv.y * 3.14159;
            float bands = sin(vUv.y * 20.0 + sin(vUv.x * 2.0));

            // Turbulent flow
            float turb = warp(seed * 3.0);

            // Combine
            float mixVal = bands * 0.4 + turb * 0.6;

            // Color Ramps
            vec3 col = mix(uColorA, uColorB, smoothstep(0.2, 0.8, turb));
            col = mix(col, uColorC, smoothstep(-0.5, 0.2, bands));
            col = mix(col, uColorD, smoothstep(0.7, 1.0, turb * bands)); // Storm features

            // Lighting
            float diff = max(dot(vWorldNormal, uSunDir), 0.0);

            // Terminator Scattering (Subsurface approx)
            float scatter = smoothstep(-0.35, 0.1, dot(vWorldNormal, uSunDir)) * smoothstep(0.1, -0.35, dot(vWorldNormal, uSunDir));
            col += vec3(1.0, 0.4, 0.1) * scatter * 0.4;

            // Final Diffuse
            diff = smoothstep(-0.2, 1.0, diff); // Soft terminator
            vec3 final = col * diff;

            // Specular highlighting from oceans (Liquid metal hydrogen?)
            float viewD = dot(normalize(vViewPos), vNormal);
            // float spec = pow(max(dot(reflect(-uSunDir, vNormal), normalize(vViewPos)), 0.0), 20.0);
            // final += spec * 0.1;

            // Rayleigh Rim (Atmosphere)
            float rim = pow(1.0 - max(viewD, 0.0), 3.0);
            final += vec3(0.2, 0.5, 1.0) * rim * 0.8 * diff; // Blue haze on sun side

            gl_FragColor = vec4(final, 1.0);
        }
      `,
    });
    this.planet = new THREE.Mesh(pGeo, pMat);
    this.group.add(this.planet);

    // 1b. Atmosphere Halo (Volumetric Glow)
    const atmoGeo = new THREE.SphereGeometry(2.5 * 1.15, 64, 64);
    const atmoMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      uniforms: {
        uSunDir: { value: new THREE.Vector3(1.0, 0.5, 1.0).normalize() },
      },
      vertexShader: `
            varying vec3 vNormal;
            varying vec3 vWorldNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vWorldNormal = normalize((modelMatrix * vec4(normal,0.0)).xyz);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
      fragmentShader: `
            varying vec3 vNormal;
            varying vec3 vWorldNormal;
            uniform vec3 uSunDir;

            void main() {
                float view = dot(normalize(vNormal), vec3(0.0, 0.0, 1.0));
                float halo = pow(1.0 + view, 5.0);

                // Day/Night masking on atmosphere
                float sun = dot(vWorldNormal, uSunDir);
                float day = smoothstep(-0.5, 0.5, sun);

                vec3 dayColor = vec3(0.4, 0.7, 1.0);
                vec3 nightColor = vec3(0.6, 0.3, 0.1); // Sunset color wrap

                vec3 col = mix(nightColor, dayColor, day);

                gl_FragColor = vec4(col, halo * 0.8 * (0.5 + 0.5 * day));
            }
        `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.atmo = new THREE.Mesh(atmoGeo, atmoMat);
    this.group.add(this.atmo);

    // 2. Main Ring (Procedural Texture)
    const rGeo = new THREE.RingGeometry(3.2, 6.0, 128);
    const rTex = this.createRingTexture();
    const rMat = new THREE.MeshStandardMaterial({
      map: rTex,
      color: 0xffedd0,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      roughness: 0.4,
      metalness: 0.1,
    });

    this.rings = new THREE.Mesh(rGeo, rMat);
    this.rings.rotation.x = Math.PI * 0.55; // Tilt
    this.rings.receiveShadow = true;
    this.rings.castShadow = true;
    this.group.add(this.rings);

    // 3. Debris Field (Instanced Rocks)
    // Instanced Asteroids
    const dGeo = new THREE.IcosahedronGeometry(0.08, 0);
    // UPGRADE: Custom Shader for GPU-based orbital mechanics + interaction
    const dMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPress: { value: 0 },
        uPointer: { value: new THREE.Vector3() },
        uColor: { value: new THREE.Color(0x888888) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPos;
        uniform float uTime;
        uniform float uPress;
        uniform vec3 uPointer;
        attribute vec3 aOffset;  // Initial Pos
        attribute float aSpeed;  // Orbit Speed
        attribute vec3 aRotation; // Random Rotation Axis

        void main() {
            vec3 p = aOffset;
            float r = length(p.xz);
            float angle0 = atan(p.z, p.x);

            // Orbit Animation
            float speed = aSpeed * 0.2;
            float angle = angle0 + uTime * speed;

            float x = r * cos(angle);
            float z = r * sin(angle);
            float y = p.y;

            // Reconstruct Orbit Position
            vec3 orbitPos = vec3(x, y, z);

            // Interaction: Gravity Well to Pointer
            // Pointer is in world space? We need to project it?
            // Let's just pull to Center (Star) for "Implosion" effect on press

            vec3 target = vec3(0.0); // Center
            // Or use uPointer but that requires projection logic. Center is safer for "Gravity"

            float dist = length(orbitPos);
            float pull = smoothstep(10.0, 0.0, dist);

            // Mix based on Press
            vec3 finalPos = mix(orbitPos, target, uPress * 0.8 * pull); // Don't collapse fully

            // Add some "Fight" turbulence when pulling
            if(uPress > 0.0) {
               finalPos += vec3(sin(uTime*10.0 + p.x), cos(uTime*11.0 + p.z), 0.0) * 0.1 * uPress;
            }

            // Instance Rotation
            // Apply rotation to 'position' before translation
            // Simple random spin
            vec3 v = position;
            // (Omitting full rotation matrix for brevity, just scaling w interaction)
            v *= (1.0 - uPress * 0.5); // Shrink under pressure

            vec4 world = modelMatrix * vec4(finalPos + v, 1.0); // Simple addition of local
            // Note: We bypass instanceMatrix if we do manual positioning,
            // OR we use instanceMatrix for static offset and do delta here.
            // Let's assume we populate instanceMatrix as Identity and do all pos here.

            vNormal = normalize(mat3(modelMatrix) * normal);
            vPos = world.xyz;
            gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPos;
        uniform vec3 uColor;
        uniform float uPress;

        void main() {
             vec3 light = normalize(vec3(1.0, 0.5, 1.0));
             float diff = max(dot(vNormal, light), 0.0);
             float amb = 0.2;

             vec3 c = uColor * (diff + amb);

             // Heat up when compressed
             if(uPress > 0.1) {
                 c += vec3(1.0, 0.4, 0.0) * uPress * 0.5;
             }

             gl_FragColor = vec4(c, 1.0);
        }
      `,
    });

    this.debris = new THREE.InstancedMesh(dGeo, dMat, this.count);
    this.group.add(this.debris);

    const aOffset = new Float32Array(this.count * 3);
    const aSpeed = new Float32Array(this.count);
    const aRotation = new Float32Array(this.count * 3); // unused in simple shader but kept for structure

    // Init positions data
    for (let i = 0; i < this.count; i++) {
      // Distribute in a ring belt
      const angle = Math.random() * Math.PI * 2;
      const dist = 3.5 + Math.random() * 2.5;

      // Height variation (thin disk)
      const y = (Math.random() - 0.5) * 0.1;

      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      const pos = new THREE.Vector3(x, y, z);
      // We apply the initial "Tilt" to the data so the shader orbits in expected plane?
      // No, shader does simple Y-axis orbit.
      // We should rotate the GROUP of debris to match the ring tilt.

      aOffset[i * 3] = pos.x;
      aOffset[i * 3 + 1] = pos.y;
      aOffset[i * 3 + 2] = pos.z;

      aSpeed[i] = 1.0 / Math.sqrt(dist); // Keplerish

      this.debris.setMatrixAt(i, new THREE.Matrix4()); // Identity
    }

    this.debris.geometry.setAttribute(
      'aOffset',
      new THREE.InstancedBufferAttribute(aOffset, 3)
    );
    this.debris.geometry.setAttribute(
      'aSpeed',
      new THREE.InstancedBufferAttribute(aSpeed, 1)
    );

    // Sunlight
    const sun = new THREE.DirectionalLight(0xffffff, 3.0);
    sun.position.set(20, 10, 20); // Matches shader sunDir
    sun.castShadow = true;
    sun.shadow.bias = -0.001;
    this.group.add(sun);

    const fill = new THREE.AmbientLight(0x111122, 0.2);
    this.group.add(fill);
  }

  createRingTexture() {
    if (typeof document === 'undefined') {
      return new THREE.DataTexture(new Uint8Array([255, 200, 150, 255]), 1, 1);
    }
    const cvs = document.createElement('canvas');
    cvs.width = 512;
    cvs.height = 64;
    const ctx = cvs.getContext('2d')!;

    // Radial noise
    // We only draw horizontal lines because it maps radially
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 512, 64);

    for (let i = 0; i < 100; i++) {
      const x = Math.random() * 512;
      const w = Math.random() * 10 + 2;
      const alpha = Math.random() * 0.5;
      ctx.fillStyle = `rgba(255, 240, 200, ${alpha})`;
      ctx.fillRect(x, 0, w, 64);
    }

    // Major gaps
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(100, 0, 5, 64);
    ctx.fillRect(350, 0, 20, 64);

    return new THREE.CanvasTexture(cvs);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const t = ctx.time;

    // Planet Shader
    (this.planet.material as THREE.ShaderMaterial).uniforms.uTime.value = t;

    // Debris Shader Updates
    const dMat = this.debris.material as THREE.ShaderMaterial;
    if (dMat.uniforms) {
      dMat.uniforms.uTime.value = t;
      dMat.uniforms.uPress.value = ctx.press;
      dMat.uniforms.uPointer.value.copy(this.pointerPos); // Use the pointer we calculated
    }

    // Rotate the DEBRIS GROUP to match the ring tilt
    // In init we didn't apply tilt to 'aOffset', so the shader orbits flat Y.
    // We tilt the whole mesh to align with the visual Ring.
    this.debris.rotation.x = this.rings.rotation.x;

    // Tilt planet slightly
    this.planet.rotation.y = t * 0.05;

    this.pointerPos.set(ctx.pointer.x * 12.0, ctx.pointer.y * 12.0, 0);

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance - ctx.press * 2.0, // Zoom in on press
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}
