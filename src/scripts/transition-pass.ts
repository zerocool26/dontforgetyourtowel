import * as THREE from 'three';
import {
  Pass,
  FullScreenQuad,
} from 'three/examples/jsm/postprocessing/Pass.js';

export class TransitionPass extends Pass {
  private fsQuad: FullScreenQuad;
  uniforms: {
    tDiffuse: { value: THREE.Texture | null };
    progress: { value: number };
    intensity: { value: number };
    noiseScale: { value: number };
  };

  constructor() {
    super();

    this.uniforms = {
      tDiffuse: { value: null },
      progress: { value: 0 },
      intensity: { value: 0 },
      noiseScale: { value: 4.0 },
    };

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float progress;
        uniform float intensity;
        uniform float noiseScale;
        varying vec2 vUv;

        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                             -0.577350269189626, 0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy));
          vec2 x0 = v - i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                  + i.x + vec3(0.0, i1.x, 1.0));
          vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                        dot(x12.zw, x12.zw)), 0.0);
          m = m * m; m = m * m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
          vec3 g;
          g.x = a0.x * x0.x + h.x * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }

        void main() {
          vec2 uv = vUv;
          float n = snoise(uv * noiseScale + progress * 2.0);
          vec2 displacement =
            vec2(n, snoise(uv * noiseScale * 1.3)) * intensity * 0.05;

          vec4 color = texture2D(tDiffuse, uv + displacement);

          float r = texture2D(tDiffuse, uv + displacement * 1.2).r;
          float b = texture2D(tDiffuse, uv + displacement * 0.8).b;
          color.r = mix(color.r, r, intensity * 0.5);
          color.b = mix(color.b, b, intensity * 0.5);

          gl_FragColor = color;
        }
      `,
    });

    this.fsQuad = new FullScreenQuad(material);
  }

  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget
  ): void {
    this.uniforms.tDiffuse.value = readBuffer.texture;

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
    }

    this.fsQuad.render(renderer);
  }

  dispose(): void {
    this.fsQuad.dispose();
  }
}
