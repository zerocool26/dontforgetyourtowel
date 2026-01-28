import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';

/*
  Unified GPGPU Particle System

  This system creates a "Universal Particle Field" that can transform into different behaviors
  depending on the active scene, without needing to rewrite simulation logic for every scene.

  Modes:
  0: IDLE (Slow floating dust)
  1: RAIN (Falling directional)
  2: VORTEX (Swirling orbit)
  3: EXPLODE (Outward pressure)
  4: ATTRACT (Mouse attraction)
  5: SNOW (Wiggle noise)
*/

export enum ParticleMode {
  IDLE = 0,
  RAIN = 1,
  VORTEX = 2,
  EXPLODE = 3,
  ATTRACT = 4,
  SNOW = 5,
}

const clampInt = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(v)));

export class GlobalParticleSystem {
  public group: THREE.Group;
  private renderer: THREE.WebGLRenderer;

  private width: number;
  private height: number;

  private gpuCompute!: GPUComputationRenderer;
  private posTexture!: THREE.DataTexture;
  private velTexture!: THREE.DataTexture;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private posVariable: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private velVariable: any;
  private mesh!: THREE.Points;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private uniforms: any;

  // Configurations
  public mode = ParticleMode.IDLE;
  public speed = 1.0;
  public color = new THREE.Color(0xffffff);
  public attractor = new THREE.Vector3();
  public audioLevel = 0;

  public setAudioLevel(v: number) {
    this.audioLevel = v;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _dummy: any; // prevent lint generic errors

  constructor(
    renderer: THREE.WebGLRenderer,
    options?: { maxParticles?: number }
  ) {
    this.renderer = renderer;
    this.group = new THREE.Group();
    this.group.name = 'GlobalParticles';

    // Match particle budget instead of hardcoding a huge grid.
    // GPUComputationRenderer is fine with non power-of-two sizes.
    const maxParticles = Math.max(1024, options?.maxParticles ?? 15000);
    const side = Math.ceil(Math.sqrt(maxParticles));
    this.width = clampInt(side, 32, 256);
    this.height = this.width;

    this.initCompute();
    this.initMesh();
  }

  private initCompute() {
    this.gpuCompute = new GPUComputationRenderer(
      this.width,
      this.height,
      this.renderer
    );

    if (this.renderer.capabilities.isWebGL2 === false) {
      this.gpuCompute.setDataType(THREE.HalfFloatType);
    }

    const dtPosition = this.gpuCompute.createTexture();
    const dtVelocity = this.gpuCompute.createTexture();
    this.fillTextures(dtPosition, dtVelocity);

    this.velVariable = this.gpuCompute.addVariable(
      'textureVelocity',
      this.computeVelocityShader(),
      dtVelocity
    );
    this.posVariable = this.gpuCompute.addVariable(
      'texturePosition',
      this.computePositionShader(),
      dtPosition
    );

    this.gpuCompute.setVariableDependencies(this.velVariable, [
      this.posVariable,
      this.velVariable,
    ]);
    this.gpuCompute.setVariableDependencies(this.posVariable, [
      this.posVariable,
      this.velVariable,
    ]);

    // Uniforms for Simulation
    this.posVariable.material.uniforms['uTime'] = { value: 0 };
    this.velVariable.material.uniforms['uTime'] = { value: 0 };
    this.velVariable.material.uniforms['uMode'] = { value: 0 };
    this.posVariable.material.uniforms['uMode'] = { value: 0 };
    this.velVariable.material.uniforms['uSpeed'] = { value: 1.0 };
    this.velVariable.material.uniforms['uAttractor'] = {
      value: new THREE.Vector3(),
    };
    this.velVariable.material.uniforms['uSeed'] = { value: Math.random() };
    this.velVariable.material.uniforms['uAudioLevel'] = { value: 0.0 };
    this.posVariable.material.uniforms['uAudioLevel'] = { value: 0.0 };

    const error = this.gpuCompute.init();
    if (error !== null) {
      console.error(error);
    }
  }

  private initMesh() {
    const geometry = new THREE.BufferGeometry();
    const count = this.width * this.height;
    const positions = new Float32Array(count * 3);
    const uvs = new Float32Array(count * 2);

    let p = 0;
    for (let j = 0; j < this.height; j++) {
      for (let i = 0; i < this.width; i++) {
        uvs[p++] = i / Math.max(1, this.width - 1);
        uvs[p++] = j / Math.max(1, this.height - 1);
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        texturePosition: { value: null },
        textureVelocity: { value: null },
        uColor: { value: new THREE.Color(0xffffff) },
        uSize: { value: 2.0 }, // Base size
        cameraPosition: { value: new THREE.Vector3() },
      },
      vertexShader: `
        uniform sampler2D texturePosition;
        uniform sampler2D textureVelocity;
        uniform float uSize;
        uniform float uAudioLevel;
        varying float vSpeed;

        void main() {
            vec3 pos = texture2D( texturePosition, uv ).xyz;
            vec3 vel = texture2D( textureVelocity, uv ).xyz;
            vSpeed = length(vel);

            vec4 mvPosition = modelViewMatrix * vec4( pos, 1.0 );
            gl_Position = projectionMatrix * mvPosition;

            // Size attenuation
            gl_PointSize = uSize * ( 30.0 / -mvPosition.z );
            // Audio Pulse
            gl_PointSize *= (1.0 + uAudioLevel * 2.5);
            // Stretch based on speed (fake motion blur)
            gl_PointSize *= (1.0 + vSpeed * 0.5);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vSpeed;
        void main() {
            // Soft circular particle
            vec2 c = gl_PointCoord - 0.5;
            float dist = length(c);
            if(dist > 0.5) discard;

            float alpha = smoothstep(0.5, 0.0, dist);
            // Brighten when moving fast
            vec3 col = uColor + vec3(vSpeed * 0.5);

            gl_FragColor = vec4(col, alpha * 0.8);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.mesh = new THREE.Points(geometry, material);
    this.mesh.matrixAutoUpdate = false;
    this.mesh.updateMatrix();
    this.group.add(this.mesh);
  }

  public dispose(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyGpu = this.gpuCompute as any;
      anyGpu?.dispose?.();
    } catch {
      // ignore
    }

    try {
      const geom = this.mesh?.geometry as THREE.BufferGeometry | undefined;
      geom?.dispose?.();

      const mat = this.mesh?.material as THREE.Material | undefined;
      mat?.dispose?.();
    } catch {
      // ignore
    }
  }

  private fillTextures(
    texturePosition: THREE.DataTexture,
    textureVelocity: THREE.DataTexture
  ) {
    const posArray = texturePosition.image.data;
    const velArray = textureVelocity.image.data;

    if (!posArray || !velArray) return;

    for (let k = 0, kl = posArray.length; k < kl; k += 4) {
      // Position: fill sphere r=10
      const r = 10;
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.acos(2 * Math.random() - 1); // Uniform sphere
      const x = r * Math.sin(theta) * Math.cos(phi);
      const y = r * Math.sin(theta) * Math.sin(phi);
      const z = r * Math.cos(theta);

      posArray[k + 0] = x;
      posArray[k + 1] = y;
      posArray[k + 2] = z;
      posArray[k + 3] = 1;

      velArray[k + 0] = 0;
      velArray[k + 1] = 0;
      velArray[k + 2] = 0;
      velArray[k + 3] = 1;
    }
  }

  // --- Shaders ---

  private computeVelocityShader() {
    return `
      uniform float uTime;
      uniform float uMode; // 0=Idle, 1=Rain, 2=Vortex, 3=Explode
      uniform float uSpeed;
      uniform vec3 uAttractor;
      uniform float uSeed;
      uniform float uAudioLevel;

      // Curl Noise
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
      vec3 curlNoise( vec3 p ){
        const float e = 0.1;
        float n1 = snoise(vec3(p.x, p.y + e, p.z));
        float n2 = snoise(vec3(p.x, p.y - e, p.z));
        float n3 = snoise(vec3(p.x, p.y, p.z + e));
        float n4 = snoise(vec3(p.x, p.y, p.z - e));
        float n5 = snoise(vec3(p.x + e, p.y, p.z));
        float n6 = snoise(vec3(p.x - e, p.y, p.z));
        float x = n2 - n1 - n4 + n3;
        float y = n4 - n3 - n6 + n5;
        float z = n6 - n5 - n2 + n1;
        const float divisor = 1.0 / ( 2.0 * e );
        return normalize( vec3( x , y , z ) * divisor );
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec3 pos = texture2D( texturePosition, uv ).xyz;
        vec3 vel = texture2D( textureVelocity, uv ).xyz;

        float dt = 0.016 * uSpeed; // assume 60fps

        // --- BEHAVIORS --- //

        vec3 acc = vec3(0.0);

        if (uMode < 0.5) {
           // 0: IDLE (Drift with Curl Noise)
           float audioBoost = 1.0 + uAudioLevel * 4.0;
           vec3 noise = curlNoise(pos * 0.2 + uTime * 0.1 * audioBoost);
           acc += noise * 0.5 * audioBoost;
           vel *= 0.98; // Friction
        }
        else if (uMode < 1.5) {
           // 1: RAIN (Gravity)
           acc += vec3(0.0, -9.8, 0.0) * 0.5;
           vel.x *= 0.95; vel.z *= 0.95; // Drag wind
        }
        else if (uMode < 2.5) {
           // 2: VORTEX (Orbit Y axis)
           vec3 center = vec3(0.0);
           vec3 dir = center - pos;
           float dist = length(dir);
           vec3 tangent = cross(vec3(0.0, 1.0, 0.0), normalize(dir));
           acc += normalize(dir) * (10.0 / (dist + 0.1)); // Gravity
           acc += tangent * 5.0; // Spin
           vel *= 0.99;
        }
        else if (uMode < 3.5) {
           // 3: EXPLODE/REPEL
           vec3 dir = pos - uAttractor;
           float dist = length(dir);
           acc += normalize(dir) * (20.0 / (dist*dist + 0.1));
           vel *= 0.96;
        }

        vel += acc * dt;
        gl_FragColor = vec4( vel, 1.0 );
      }
    `;
  }

  private computePositionShader() {
    return `
      uniform float uTime;
      uniform float uMode;

      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec3 pos = texture2D( texturePosition, uv ).xyz;
        vec3 vel = texture2D( textureVelocity, uv ).xyz;

        float dt = 0.016;
        pos += vel * dt;

        // BOUNDS CHECK / RESPAWN
        float limit = 15.0;

        if (uMode < 1.5 && uMode > 0.5) {
            // Rain respawn (top)
            if (pos.y < -10.0) {
               pos.y = 10.0 + fract(pos.x * 123.0) * 5.0;
               pos.x = (fract(pos.z * 123.0) - 0.5) * 20.0;
               pos.z = (fract(pos.y * 123.0) - 0.5) * 20.0;
            }
        }
        else {
           // Box respawn
            if (abs(pos.x) > limit || abs(pos.y) > limit || abs(pos.z) > limit) {
                // Wrap around or reset to center? Wrap around looks better
                if (pos.x > limit) pos.x -= limit*2.0;
                else if (pos.x < -limit) pos.x += limit*2.0;

                if (pos.y > limit) pos.y -= limit*2.0;
                else if (pos.y < -limit) pos.y += limit*2.0;

                if (pos.z > limit) pos.z -= limit*2.0;
                else if (pos.z < -limit) pos.z += limit*2.0;
            }
        }

        gl_FragColor = vec4( pos, 1.0 );
      }
    `;
  }

  public update(time: number, _dt: number) {
    this.velVariable.material.uniforms['uTime'].value = time;
    this.posVariable.material.uniforms['uTime'].value = time;
    this.velVariable.material.uniforms['uMode'].value = this.mode;
    this.posVariable.material.uniforms['uMode'].value = this.mode;
    this.velVariable.material.uniforms['uSpeed'].value = this.speed;
    this.velVariable.material.uniforms['uAttractor'].value.copy(this.attractor);

    // Add audio level if uniform exists (we will add it shortly)
    if (this.velVariable.material.uniforms['uAudioLevel']) {
      this.velVariable.material.uniforms['uAudioLevel'].value = this.audioLevel;
    }
    if (this.posVariable.material.uniforms['uAudioLevel']) {
      this.posVariable.material.uniforms['uAudioLevel'].value = this.audioLevel;
    }

    this.gpuCompute.compute();

    const meshMat = this.mesh.material as THREE.ShaderMaterial;
    meshMat.uniforms['texturePosition'].value =
      this.gpuCompute.getCurrentRenderTarget(this.posVariable).texture;
    meshMat.uniforms['textureVelocity'].value =
      this.gpuCompute.getCurrentRenderTarget(this.velVariable).texture;
    meshMat.uniforms['uColor'].value.copy(this.color);

    if (meshMat.uniforms['uAudioLevel']) {
      meshMat.uniforms['uAudioLevel'].value = this.audioLevel;
    }
  }
}
