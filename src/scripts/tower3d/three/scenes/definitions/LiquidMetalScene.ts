import * as THREE from 'three';
import { SceneBase } from './SceneBase';
import type { SceneRuntime } from './types';
import { damp } from './SceneUtils';

export class LiquidMetalScene extends SceneBase {
  private mesh: THREE.Mesh;
  private material: THREE.MeshStandardMaterial;

  constructor() {
    super();
    this.id = 'scene01';
    this.contentRadius = 5.0;

    // High fidelity geometry with localized density if possible
    // (but standard is uniform)
    const geo = new THREE.IcosahedronGeometry(2.5, 60);

    this.material = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      metalness: 0.9, // Increased metalness
      roughness: 0.1, // Reduced roughness for better reflection
      envMapIntensity: 2.0, // Stronger reflections
    });

    // Custom Shader Injection
    this.material.onBeforeCompile = shader => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uPointer = { value: new THREE.Vector3() };
      shader.uniforms.uPress = { value: 0 };

      // Helper functions
      const noiseFuncs = `
        // Simplex Noise (Ashima Arts)
        vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
        float snoise(vec3 v){
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
          i = mod(i, 289.0);
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
          vec4 norm = inversesqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                        dot(p2,x2), dot(p3,x3) ) );
        }
      `;

      shader.vertexShader = `
        uniform float uTime;
        uniform vec3 uPointer;
        uniform float uPress;
        ${noiseFuncs}
        ${shader.vertexShader}
      `;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
          #include <begin_vertex>

          float time = uTime * 0.5;

          // Organic motion
          float n = snoise(position * 0.8 + time);
          float n2 = snoise(position * 1.5 - time * 0.5);
          float combined = (n + n2 * 0.5) * 0.8;

          // Interactive Spike
          // Since scene rotates, we need world pos or counter-rotated pointer
          // Here we just use raw distance in local space assuming pointer is passed in local space
          // But shader uses 'position' which is local.
          // In update() we pass a specially constructed local pointer.

          float d = distance(position, uPointer);
          float pull = smoothstep(1.5, 0.0, d);

          // Spike direction is normal, but sharpened
          float spike = pull * (1.0 + uPress * 3.0) * 1.5;

          // Add high frequency ripple on spike
          float ripple = sin(d * 10.0 - uTime * 5.0) * 0.1 * pull;

          float displacement = combined + spike + ripple;

          transformed += normal * displacement;
        `
      );

      // Recomputing normals in vertex shader for lighting:
      shader.vertexShader = shader.vertexShader.replace(
        '#include <defaultnormal_vertex>',
        `
          #include <defaultnormal_vertex>
          // Perturb normal based on noise derivative approximation
          float ep = 0.01;
          vec3 pOriginal = position;
          // (Simplified analytic or finite difference normal update would go here
          //  but for "Liquid Metal" smooth shading often looks fine even with mismatched normals
          //  as it looks like refraction/internal reflection)
          `
      );

      this.material.userData.shader = shader;
    };

    this.mesh = new THREE.Mesh(geo, this.material);
    this.group.add(this.mesh);

    // Dynamic Lights
    const light1 = new THREE.PointLight(0xff0044, 4, 30);
    const light2 = new THREE.PointLight(0x0044ff, 4, 30);
    const light3 = new THREE.PointLight(0xffffff, 2, 30); // Specular highlight

    this.mesh.userData.lights = [light1, light2, light3];
    this.group.add(light1, light2, light3);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    if (this.material.userData.shader) {
      this.material.userData.shader.uniforms.uTime.value = ctx.time;
      this.material.userData.shader.uniforms.uPress.value = ctx.press;

      // Map pointer to sphere surface approx
      // The mesh rotates, so we need to construct a target point in local space
      // Or just move a "attractor" in world space and pass that to shader.
      // But shader uses 'position' which is local.

      // Let's project pointer to 3D plane at z=0 then unrotate
      let vec = new THREE.Vector3(ctx.pointer.x * 5, ctx.pointer.y * 5, 2.0);

      // Counter-rotate against the group rotation to stay with mouse visually
      vec.applyAxisAngle(new THREE.Vector3(0, 1, 0), -ctx.time * 0.1);

      this.material.userData.shader.uniforms.uPointer.value.copy(vec);
    }

    // Rotate lights nicely
    const [l1, l2, l3] = this.mesh.userData.lights;

    l1.position.set(
      Math.sin(ctx.time * 0.7) * 8,
      Math.cos(ctx.time * 0.5) * 8,
      8
    );

    l2.position.set(
      Math.sin(ctx.time * 0.5 + 2) * 8,
      Math.cos(ctx.time * 0.3 + 1) * -8,
      8
    );

    l3.position.set(0, 0, 10 + ctx.press * 5); // Flash on press

    this.group.rotation.y = ctx.time * 0.1;

    // Closer camera for detail
    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance * 0.9,
      3,
      ctx.dt
    );

    // Tilt camera with gyro
    this.camera.rotation.x = ctx.gyro.x * 0.1;
    this.camera.rotation.y = ctx.gyro.y * 0.1;
  }
}
