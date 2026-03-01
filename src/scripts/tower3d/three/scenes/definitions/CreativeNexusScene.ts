import * as THREE from 'three';
import { SceneBase } from './SceneBase';
import type { SceneRuntime } from './types';
import { damp } from './SceneUtils';

export class CreativeNexusScene extends SceneBase {
  private particlesGroup: THREE.Group;
  private ringsGroup: THREE.Group;

  private particlesMesh: THREE.Points;
  private particleMaterial: THREE.ShaderMaterial;

  private coreMesh: THREE.Mesh;
  private coreMaterial: THREE.ShaderMaterial;

  private pointerSmooth = new THREE.Vector2(0, 0);

  constructor() {
    super();
    this.id = 'scene-creative-nexus';
    this.contentRadius = 6.0;
    this.baseDistance = 12;
    this.camera.position.set(0, 0, this.baseDistance);

    this.particlesGroup = new THREE.Group();
    this.ringsGroup = new THREE.Group();

    this.group.add(this.particlesGroup);
    this.group.add(this.ringsGroup);

    // --- 1. The Core Sphere ---
    const coreGeo = new THREE.IcosahedronGeometry(1.5, 4);
    this.coreMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color('#ccff00') },
        uColorB: { value: new THREE.Color('#ff00cc') },
        uPointer: { value: new THREE.Vector3(0, 0, 0) },
        uPress: { value: 0.0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform float uTime;
        uniform float uPress;
        uniform vec3 uPointer;

        // noise function
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        float snoise(vec3 v) {
          const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
          const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i  = floor(v + dot(v, C.yyy) );
          vec3 x0 = v - i + dot(i, C.xxx) ;
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min( g.xyz, l.zxy );
          vec3 i2 = max( g.xyz, l.zxy );
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute( permute( permute(
                     i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                   + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                   + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
          float n_ = 0.142857142857;
          vec3  ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_ );
          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4( x.xy, y.xy );
          vec4 b1 = vec4( x.zw, y.zw );
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
          vec3 p0 = vec3(a0.xy,h.x);
          vec3 p1 = vec3(a0.zw,h.y);
          vec3 p2 = vec3(a1.xy,h.z);
          vec3 p3 = vec3(a1.zw,h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                        dot(p2,x2), dot(p3,x3) ) );
        }

        void main() {
          vNormal = normal;
          vPosition = position;

          float noise = snoise(position * 2.0 + uTime * 0.5) * 0.2;

          // Reaction to pointer
          float dist = distance(position, uPointer);
          float influence = smoothstep(3.0, 0.0, dist) * uPress;

          vec3 pos = position + normal * (noise + influence * 0.5);

          gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform float uTime;
        uniform vec3 uColorA;
        uniform vec3 uColorB;

        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);

          float mixVal = sin(vPosition.y * 2.0 + uTime + vPosition.x) * 0.5 + 0.5;
          vec3 col = mix(uColorA, uColorB, mixVal);

          gl_FragColor = vec4(col, intensity * 0.8);
        }
      `,
    });
    this.coreMesh = new THREE.Mesh(coreGeo, this.coreMaterial);
    this.ringsGroup.add(this.coreMesh);

    // --- 2. The Advanced Particles Swarm ---
    const pCount = 35000;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    const pRandom = new Float32Array(pCount * 3);
    const pSize = new Float32Array(pCount);

    for (let i = 0; i < pCount; i++) {
      // Create a complex knot/torus base shape
      const t = Math.random() * Math.PI * 2;
      const p = Math.random() * Math.PI * 2;

      const R = 3.5 + Math.random() * 2.0;
      const r = 0.8 + Math.random() * 1.5;

      const x = (R + r * Math.cos(p)) * Math.cos(t);
      const y = r * Math.sin(p);
      const z = (R + r * Math.cos(p)) * Math.sin(t);

      pPos[i * 3] = x;
      pPos[i * 3 + 1] = y;
      pPos[i * 3 + 2] = z;

      pRandom[i * 3] = Math.random();
      pRandom[i * 3 + 1] = Math.random();
      pRandom[i * 3 + 2] = Math.random();

      pSize[i] = Math.random();
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('aRandom', new THREE.BufferAttribute(pRandom, 3));
    pGeo.setAttribute('aSize', new THREE.BufferAttribute(pSize, 1));

    this.particleMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPointer: { value: new THREE.Vector3(0, 0, 0) },
        uColorA: { value: new THREE.Color('#00ffff') },
        uColorB: { value: new THREE.Color('#ccff00') },
        uPress: { value: 0.0 },
      },
      vertexShader: `
        uniform float uTime;
        uniform vec3 uPointer;
        uniform float uPress;

        attribute vec3 aRandom;
        attribute float aSize;

        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vec3 pos = position;

          // Organic fluid motion
          float t = uTime * (0.2 + aRandom.x * 0.2);
          pos.x += sin(t + aRandom.y * 10.0) * 1.5 * aRandom.z;
          pos.y += cos(t + aRandom.z * 10.0) * 1.5 * aRandom.x;
          pos.z += sin(t + aRandom.x * 10.0) * 1.5 * aRandom.y;

          // Orbit
          float angle = uTime * 0.1;
          mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
          pos.xz = rot * pos.xz;

          // Pointer repulsion & attraction
          float dist = distance(pos, uPointer);
          vec3 dir = normalize(pos - uPointer);

          // When holding press, attract into a vortex, otherwise repel gently
          float influence = smoothstep(5.0, 0.0, dist);
          if (uPress > 0.1) {
            // swirl / attract
            pos -= dir * influence * uPress * 2.0;
            // swirl twist
            float twist = influence * uPress * 3.0;
            mat2 rotTwist = mat2(cos(twist), -sin(twist), sin(twist), cos(twist));
            pos.xz = rotTwist * pos.xz;
          } else {
            // gentle repel
            pos += dir * influence * 1.2;
          }

          // Convert to camera space
          vec4 mvPosition = viewMatrix * modelMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          // Size attenuation
          gl_PointSize = (10.0 * aSize + 2.0) * (15.0 / -mvPosition.z);

          // Color varying
          float colorMix = sin(aRandom.x * 5.0 + uTime * 0.5) * 0.5 + 0.5;
          vColor = mix(vec3(0.0, 1.0, 1.0), vec3(0.8, 1.0, 0.0), colorMix); // Cyberpunk Cyan to Acid Green
          vAlpha = smoothstep(0.0, 0.2, aSize) * 0.6;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          float d = distance(gl_PointCoord, vec2(0.5));
          if(d > 0.5) discard;

          float strength = 1.0 - (d * 2.0);
          strength = pow(strength, 1.5);

          gl_FragColor = vec4(vColor, vAlpha * strength);
        }
      `,
    });

    this.particlesMesh = new THREE.Points(pGeo, this.particleMaterial);
    this.particlesGroup.add(this.particlesMesh);

    // --- 3. Geometric Rings ---
    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.TorusGeometry(3 + i * 1.5, 0.02, 16, 100);
      const ringMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xccff00 : 0x00ffff,
        transparent: true,
        opacity: 0.15 + i * 0.05,
        blending: THREE.AdditiveBlending,
        wireframe: true,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);

      ring.rotation.x = Math.random() * Math.PI;
      ring.rotation.y = Math.random() * Math.PI;

      // Save original rotation axes for animation
      ring.userData = {
        rx: Math.random() * 0.02 - 0.01,
        ry: Math.random() * 0.02 - 0.01,
        rz: Math.random() * 0.02 - 0.01,
      };

      this.ringsGroup.add(ring);
    }
  }

  init(_ctx: SceneRuntime): void {
    // any extra init
  }

  update(ctx: SceneRuntime): void {
    const pointerX = ctx.pointer?.x ?? 0;
    const pointerY = ctx.pointer?.y ?? 0;

    // Smoothed pointer for smooth cinematic feel
    this.pointerSmooth.x = damp(this.pointerSmooth.x, pointerX, 8, ctx.dt);
    this.pointerSmooth.y = damp(this.pointerSmooth.y, pointerY, 8, ctx.dt);

    const time = ctx.time;

    // Use a fixed Z depth for interaction
    const pointerSpace3D = new THREE.Vector3(
      this.pointerSmooth.x * 10,
      this.pointerSmooth.y * 10,
      0
    );

    // Update Materials
    this.particleMaterial.uniforms.uTime.value = time;
    this.particleMaterial.uniforms.uPointer.value.copy(pointerSpace3D);
    this.particleMaterial.uniforms.uPress.value = ctx.press;

    this.coreMaterial.uniforms.uTime.value = time;
    this.coreMaterial.uniforms.uPointer.value.copy(pointerSpace3D);
    this.coreMaterial.uniforms.uPress.value = ctx.press;

    // Animate Rings
    this.ringsGroup.children.forEach(child => {
      if (child !== this.coreMesh) {
        child.rotation.x += child.userData.rx * (1 + ctx.press * 2);
        child.rotation.y += child.userData.ry * (1 + ctx.press * 2);
        child.rotation.z += child.userData.rz * (1 + ctx.press * 2);
      }
    });

    // Slowly rotate core
    this.coreMesh.rotation.y += 0.01;
    this.coreMesh.rotation.x += 0.005;

    // Parallax on entire groups to give depth to pointer movement
    this.group.rotation.y = damp(
      this.group.rotation.y,
      this.pointerSmooth.x * 0.3,
      5,
      ctx.dt
    );
    this.group.rotation.x = damp(
      this.group.rotation.x,
      -this.pointerSmooth.y * 0.3,
      5,
      ctx.dt
    );

    // Zoom in when pressed
    const baseDist = 12;
    const targetZ = baseDist - ctx.press * 4.0;
    this.camera.position.z = damp(this.camera.position.z, targetZ, 4, ctx.dt);
  }
}
