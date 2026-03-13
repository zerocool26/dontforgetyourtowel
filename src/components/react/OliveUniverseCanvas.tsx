/** @jsxImportSource react */
/** @jsxRuntime automatic */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
} from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, Sparkles } from '@react-three/drei';
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Noise,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import {
  CAMERA_KF,
  CHAPTERS,
  type QualityTier,
  type SceneProfile,
} from './olive-universe-config';

const PARTICLE_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uMorph;
  uniform vec2  uMouse;
  attribute vec3  aTarget;
  attribute float aSeed;

  vec3 hash3(float n) {
    vec3 p = fract(vec3(n, n * 1.61803, n * 2.71828) * vec3(127.1, 311.7, 74.7));
    p = p * 2.0 - 1.0;
    return p;
  }

  void main() {
    float phi   = aSeed * 6.28318 * 137.508;
    float theta = acos(1.0 - 2.0 * fract(aSeed * 0.61803));
    float r     = 4.5 + sin(aSeed * 7.3 + uTime * 0.2) * 2.0;

    vec3 chaos = vec3(
      sin(phi + uTime * 0.25) * sin(theta) * r,
      cos(theta + uTime * 0.18) * 2.2,
      cos(phi + uTime * 0.3)  * sin(theta) * r
    );

    vec3 pos = mix(chaos, aTarget, smoothstep(0.0, 1.0, uMorph));

    vec2 mw = uMouse * 5.2;
    vec2 d2 = pos.xy - mw;
    float md = length(d2);
    if (md < 2.2 && md > 0.01) {
      pos.xy += normalize(d2) * (2.2 - md) * (1.0 - uMorph * 0.4) * 0.9;
    }

    float breath = sin(uTime + aSeed * 3.14) * 0.045;
    pos += vec3(breath, cos(uTime * 0.8 + aSeed * 2.71) * 0.045, sin(uTime * 1.2 + aSeed) * 0.03) * uMorph;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    float pulse = 1.0 + sin(uTime * 2.5 + aSeed * 6.28) * 0.22;
    gl_PointSize = clamp(pulse * 290.0 / -mvPos.z, 1.0, 7.0);
  }
`;

const PARTICLE_FRAG = /* glsl */ `
  uniform vec3  uColor;
  uniform float uMorph;
  uniform float uVisibility;
  void main() {
    vec2  uv = gl_PointCoord - 0.5;
    float d  = length(uv);
    if (d > 0.5) discard;
    float soft  = 1.0 - smoothstep(0.22, 0.5, d);
    float glow  = (1.0 - d * 2.0) * uMorph * 0.8;
    float alpha = soft * (0.45 + uMorph * 0.55) * uVisibility;
    gl_FragColor = vec4(uColor + vec3(glow * 0.6 * uVisibility), alpha);
  }
`;

const NEURAL_VERT = /* glsl */ `
  attribute float aP;
  varying float vP;
  void main() {
    vP = aP;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const NEURAL_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3  uColor;
  varying float vP;
  void main() {
    float pulse = fract(vP - uTime * 0.4);
    float i = exp(-pulse * 5.5) * 0.9 + 0.1;
    gl_FragColor = vec4(uColor * i, i * 0.88);
  }
`;

const SHIELD_VERT = /* glsl */ `
  varying vec3 vW;
  varying vec3 vN;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SHIELD_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3  uColor;
  varying vec3  vW;
  varying vec3  vN;
  void main() {
    float dist   = length(vW);
    float r1 = sin(dist * 4.0 - uTime * 1.6) * 0.5 + 0.5;
    float r2 = sin(dist * 7.2 - uTime * 2.3 + 1.1) * 0.5 + 0.5;
    float rings  = max(r1 * 0.65, r2 * 0.45);
    vec3  vd     = normalize(cameraPosition - vW);
    float fresnel= pow(1.0 - abs(dot(vN, vd)), 2.6);
    float c      = rings * 0.35 + fresnel * 0.65;
    vec3  col    = mix(uColor, vec3(1.0), fresnel * 0.45);
    gl_FragColor = vec4(col, c * 0.62);
  }
`;

const DATA_VERT = /* glsl */ `
  attribute float aI;
  uniform float uTime;
  varying float vH;
  void main() {
    float col = mod(aI, 12.0);
    float row = floor(aI / 12.0);
    float h = (sin(uTime * 1.8 + col * 0.6 + row * 0.8) * 0.5 + 0.5)
            * (cos(uTime * 1.2 + col * 0.4) * 0.5 + 0.5) * 2.8 + 0.12;
    vec3 pos = position;
    pos.y = pos.y * h + h * 0.5 - 1.0;
    vH = h;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const DATA_FRAG = /* glsl */ `
  uniform vec3  uColor;
  varying float vH;
  void main() {
    vec3 col = mix(uColor * 0.3, uColor, vH * 0.5);
    col += vec3(vH * 0.25);
    gl_FragColor = vec4(col, 0.88);
  }
`;

function sampleText(text: string, count: number): Float32Array {
  if (typeof document === 'undefined') return new Float32Array(count * 3);
  const cvs = document.createElement('canvas');
  cvs.width = 512;
  cvs.height = 128;
  const ctx = cvs.getContext('2d');
  if (!ctx) return new Float32Array(count * 3);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 60px "Space Grotesk", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);
  const { data } = ctx.getImageData(0, 0, 512, 128);
  const pts: [number, number][] = [];
  for (let y = 0; y < 128; y += 2)
    for (let x = 0; x < 512; x += 2)
      if (data[(y * 512 + x) * 4 + 3] > 100) pts.push([x, y]);
  const out = new Float32Array(count * 3);
  const stride = Math.max(1, Math.floor(pts.length / count));
  for (let i = 0; i < count; i++) {
    const p = pts[Math.min(i * stride, pts.length - 1)];
    if (p) {
      out[i * 3] = (p[0] / 512 - 0.5) * 10.5;
      out[i * 3 + 1] = -(p[1] / 128 - 0.5) * 2.6;
      out[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }
  }
  return out;
}

function camAtT(t: number) {
  const kf = CAMERA_KF;
  if (t <= kf[0].t) return { pos: kf[0].pos, look: kf[0].look };
  if (t >= kf[kf.length - 1].t) {
    const last = kf[kf.length - 1];
    return { pos: last.pos, look: last.look };
  }
  for (let i = 0; i < kf.length - 1; i++) {
    if (t >= kf[i].t && t <= kf[i + 1].t) {
      const local = (t - kf[i].t) / (kf[i + 1].t - kf[i].t);
      const eased =
        local < 0.5 ? 2 * local * local : 1 - Math.pow(-2 * local + 2, 2) / 2;
      const lerp3 = (
        a: readonly [number, number, number],
        b: readonly [number, number, number],
        value: number
      ) =>
        [
          a[0] + (b[0] - a[0]) * value,
          a[1] + (b[1] - a[1]) * value,
          a[2] + (b[2] - a[2]) * value,
        ] as [number, number, number];
      return {
        pos: lerp3(kf[i].pos, kf[i + 1].pos, eased),
        look: lerp3(kf[i].look, kf[i + 1].look, eased),
      };
    }
  }
  return { pos: kf[0].pos, look: kf[0].look };
}

function ParticleGalaxy({
  progressRef,
  profile,
}: {
  progressRef: MutableRefObject<number>;
  profile: SceneProfile;
}) {
  const matRef = useRef<THREE.ShaderMaterial | null>(null);
  const mouseRef = useRef(new THREE.Vector2());
  const visibilityRef = useRef(0);
  const count = profile.particleCount;

  const geo = useMemo(() => {
    const seeds = new Float32Array(count);
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const seed = i / count;
      seeds[i] = seed;
      const phi = seed * Math.PI * 2 * 137.508;
      const radius = Math.sqrt(seed) * 6.5;
      pos[i * 3] = Math.cos(phi) * radius;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 3.5;
      pos[i * 3 + 2] = Math.sin(phi) * radius;
    }
    const targets = sampleText('OLIVE', count);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute('aTarget', new THREE.BufferAttribute(targets, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    return geometry;
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: PARTICLE_VERT,
        fragmentShader: PARTICLE_FRAG,
        uniforms: {
          uTime: { value: 0 },
          uMorph: { value: 0 },
          uVisibility: { value: 0 },
          uMouse: { value: new THREE.Vector2() },
          uColor: { value: new THREE.Color('#ccff00') },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  useEffect(() => {
    if (!profile.pointerParallax) return;

    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
      );
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [profile.pointerParallax]);

  useEffect(() => {
    matRef.current = material;
  }, [material]);

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    const progress = progressRef.current ?? 0;
    const [start, end] = CHAPTERS[0].range;
    const visible = progress >= start - 0.08 && progress <= end + 0.08;
    const local = visible
      ? Math.max(0, Math.min(1, (progress - start) / (end - start)))
      : 0;

    visibilityRef.current = THREE.MathUtils.lerp(
      visibilityRef.current,
      visible ? 1 : 0,
      0.05
    );

    matRef.current.uniforms.uTime.value = clock.elapsedTime;
    matRef.current.uniforms.uMorph.value = THREE.MathUtils.lerp(
      matRef.current.uniforms.uMorph.value,
      local * 1.2,
      0.025
    );
    matRef.current.uniforms.uVisibility.value = visibilityRef.current;
    matRef.current.uniforms.uMouse.value.lerp(mouseRef.current, 0.06);
  });

  return <points geometry={geo} material={material} />;
}

function NeuralCortex({
  progressRef,
  profile,
}: {
  progressRef: MutableRefObject<number>;
  profile: SceneProfile;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const visibilityRef = useRef(0);
  const nodeCount = profile.neuralNodeCount;

  const { nodePos, lineGeo, lineMat } = useMemo(() => {
    const nodePos: THREE.Vector3[] = Array.from(
      { length: nodeCount },
      () =>
        new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 3.5
        )
    );

    const verts: number[] = [];
    const progressValues: number[] = [];

    for (let a = 0; a < nodeCount; a++)
      for (let b = a + 1; b < nodeCount; b++) {
        if (nodePos[a].distanceTo(nodePos[b]) > 3.8) continue;
        for (let step = 0; step <= 10; step++) {
          const t = step / 10;
          const point = new THREE.Vector3().lerpVectors(
            nodePos[a],
            nodePos[b],
            t
          );
          verts.push(point.x, point.y, point.z);
          progressValues.push(t);
        }
      }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(verts), 3)
    );
    geometry.setAttribute(
      'aP',
      new THREE.BufferAttribute(new Float32Array(progressValues), 1)
    );

    const material = new THREE.ShaderMaterial({
      vertexShader: NEURAL_VERT,
      fragmentShader: NEURAL_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#00d4ff') },
      },
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { nodePos, lineGeo: geometry, lineMat: material };
  }, [nodeCount]);

  const nodeGeo = useMemo(() => new THREE.SphereGeometry(0.055, 8, 8), []);
  const nodeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#00d4ff',
        emissive: '#00d4ff',
        emissiveIntensity: 2.5,
        transparent: true,
        opacity: 0,
      }),
    []
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const progress = progressRef.current ?? 0;
    const [start, end] = CHAPTERS[1].range;
    const visible = progress >= start - 0.08 && progress <= end + 0.08;
    visibilityRef.current = THREE.MathUtils.lerp(
      visibilityRef.current,
      visible ? 1 : 0,
      0.04
    );
    lineMat.opacity = visibilityRef.current * 0.82;
    nodeMat.opacity = visibilityRef.current;
    lineMat.uniforms.uTime.value = clock.elapsedTime;
    groupRef.current.rotation.y = clock.elapsedTime * 0.045;
  });

  return (
    <group ref={groupRef}>
      <lineSegments geometry={lineGeo} material={lineMat} />
      {nodePos.map((pos, index) => (
        <mesh
          key={index}
          position={pos}
          geometry={nodeGeo}
          material={nodeMat}
        />
      ))}
      <pointLight color="#00d4ff" intensity={2.5} distance={14} decay={2} />
    </group>
  );
}

function CrystalFortress({
  progressRef,
}: {
  progressRef: MutableRefObject<number>;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const shieldMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: SHIELD_VERT,
        fragmentShader: SHIELD_FRAG,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color('#a855f7') },
        },
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  const crystalMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#6d28d9',
        emissive: '#a855f7',
        emissiveIntensity: 0.6,
        roughness: 0.05,
        metalness: 0.1,
        transmission: 0.55,
        thickness: 1.2,
        transparent: true,
        opacity: 0,
      }),
    []
  );

  const wireMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#c084fc',
        wireframe: true,
        transparent: true,
        opacity: 0,
      }),
    []
  );

  const ringMats = useMemo(
    () =>
      [2.2, 2.8, 3.5].map(
        () =>
          new THREE.MeshBasicMaterial({
            color: '#a855f7',
            transparent: true,
            opacity: 0,
          })
      ),
    []
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const progress = progressRef.current ?? 0;
    const [start, end] = CHAPTERS[2].range;
    const visible = progress >= start - 0.08 && progress <= end + 0.08;
    const elapsed = clock.elapsedTime;
    const alpha = THREE.MathUtils.lerp(
      crystalMat.opacity,
      visible ? 0.82 : 0,
      0.04
    );
    crystalMat.opacity = alpha;
    wireMat.opacity = alpha * 0.35;
    ringMats.forEach((material, index) => {
      material.opacity = alpha * (0.45 - index * 0.08);
    });
    shieldMat.uniforms.uTime.value = elapsed;
    shieldMat.opacity = alpha;
    groupRef.current.rotation.y = elapsed * 0.11;
    groupRef.current.rotation.x = Math.sin(elapsed * 0.07) * 0.14;
  });

  return (
    <group ref={groupRef}>
      <mesh material={crystalMat}>
        <icosahedronGeometry args={[1.5, 1]} />
      </mesh>
      <mesh material={wireMat}>
        <icosahedronGeometry args={[1.52, 1]} />
      </mesh>
      <mesh material={shieldMat}>
        <sphereGeometry args={[3.2, 32, 32]} />
      </mesh>
      {[2.2, 2.8, 3.5].map((radius, index) => (
        <mesh
          key={index}
          rotation={[Math.PI / 2 + index * 0.55, index * 0.9, 0]}
          material={ringMats[index]}
        >
          <torusGeometry args={[radius, 0.018, 8, 64]} />
        </mesh>
      ))}
      <pointLight color="#a855f7" intensity={3} distance={11} decay={2} />
    </group>
  );
}

function CloudConstellation({
  progressRef,
  profile,
}: {
  progressRef: MutableRefObject<number>;
  profile: SceneProfile;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const lineMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0,
      }),
    []
  );
  const nodeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        emissive: '#38bdf8',
        emissiveIntensity: 2,
        transparent: true,
        opacity: 0,
      }),
    []
  );

  const { nodes, edgeGeos } = useMemo(() => {
    const layers = [
      { count: 4, y: -2.2, r: 4.0 },
      { count: 6, y: 0, r: 3.5 },
      { count: 4, y: 2.2, r: 2.5 },
      { count: 2, y: 3.8, r: 1.0 },
    ];
    const nodes: THREE.Vector3[] = [];
    for (const { count, y, r } of layers)
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        nodes.push(
          new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r)
        );
      }

    const edgeGeos: THREE.BufferGeometry[] = [];
    let base = 0;
    for (let layerIndex = 0; layerIndex < layers.length - 1; layerIndex++) {
      const layerCountA = layers[layerIndex].count;
      const layerCountB = layers[layerIndex + 1].count;
      const baseA = base;
      const baseB = base + layerCountA;
      for (let a = 0; a < layerCountA; a++)
        for (let b = 0; b < layerCountB; b++)
          if (Math.random() > 0.35) {
            const geometry = new THREE.BufferGeometry().setFromPoints([
              nodes[baseA + a],
              nodes[baseB + b],
            ]);
            edgeGeos.push(geometry);
          }
      base += layerCountA;
    }
    return { nodes, edgeGeos };
  }, []);

  const nodeGeo = useMemo(() => new THREE.SphereGeometry(0.11, 10, 10), []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const progress = progressRef.current ?? 0;
    const [start, end] = CHAPTERS[3].range;
    const visible = progress >= start - 0.08 && progress <= end + 0.08;
    const alpha = THREE.MathUtils.lerp(
      lineMat.opacity,
      visible ? 0.45 : 0,
      0.04
    );
    lineMat.opacity = alpha;
    nodeMat.opacity = THREE.MathUtils.lerp(
      nodeMat.opacity,
      visible ? 0.9 : 0,
      0.04
    );
    groupRef.current.rotation.y = clock.elapsedTime * 0.055;
  });

  return (
    <group ref={groupRef}>
      {edgeGeos.map((geometry, index) => (
        <lineSegments key={index} geometry={geometry} material={lineMat} />
      ))}
      {nodes.map((pos, index) => (
        <mesh
          key={index}
          position={pos}
          geometry={nodeGeo}
          material={nodeMat}
        />
      ))}
      <Sparkles
        count={profile.cloudSparkles}
        scale={8}
        size={2}
        speed={0.3}
        color="#38bdf8"
        opacity={0.5}
      />
      <pointLight color="#38bdf8" intensity={2} distance={13} decay={2} />
    </group>
  );
}

function SignalMatrix({
  progressRef,
  profile,
}: {
  progressRef: MutableRefObject<number>;
  profile: SceneProfile;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const gridSize = profile.signalGridSize;
  const count = gridSize * gridSize;

  const { barMesh, mat } = useMemo(() => {
    const geometry = new THREE.BoxGeometry(0.14, 1, 0.14);
    const barIdx = new Float32Array(count);
    for (let i = 0; i < count; i++) barIdx[i] = i;
    geometry.setAttribute('aI', new THREE.BufferAttribute(barIdx, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: DATA_VERT,
      fragmentShader: DATA_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#22c55e') },
      },
      transparent: true,
      opacity: 0,
    });

    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      dummy.position.set(
        ((i % gridSize) - gridSize / 2) * 0.6,
        0,
        (Math.floor(i / gridSize) - gridSize / 2) * 0.6
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    return { barMesh: mesh, mat: material };
  }, [count, gridSize]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const progress = progressRef.current ?? 0;
    const [start, end] = CHAPTERS[4].range;
    const visible = progress >= start - 0.08 && progress <= end + 0.08;
    mat.uniforms.uTime.value = clock.elapsedTime;
    mat.opacity = THREE.MathUtils.lerp(
      mat.opacity ?? 1,
      visible ? 0.88 : 0,
      0.04
    );
    for (let i = 0; i < count; i++) {
      const col = i % gridSize;
      const row = Math.floor(i / gridSize);
      const height =
        (Math.sin(clock.elapsedTime * 1.8 + col * 0.6 + row * 0.8) * 0.5 +
          0.5) *
          (Math.cos(clock.elapsedTime * 1.2 + col * 0.4) * 0.5 + 0.5) *
          2.8 +
        0.12;
      dummy.position.set(
        (col - gridSize / 2) * 0.6,
        height * 0.5 - 1,
        (row - gridSize / 2) * 0.6
      );
      dummy.scale.set(1, height, 1);
      dummy.updateMatrix();
      barMesh.setMatrixAt(i, dummy.matrix);
    }
    barMesh.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.05) * 0.25;
  });

  return (
    <group ref={groupRef}>
      <primitive object={barMesh} />
      <Sparkles
        count={profile.signalSparkles}
        scale={7}
        size={3}
        speed={0.35}
        color="#22c55e"
        opacity={0.5}
      />
      <pointLight color="#22c55e" intensity={2.2} distance={14} decay={2} />
    </group>
  );
}

function SingularityCore({
  progressRef,
  profile,
}: {
  progressRef: MutableRefObject<number>;
  profile: SceneProfile;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const coreMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ccff00',
        emissive: '#ccff00',
        emissiveIntensity: 0,
        transparent: true,
        opacity: 0,
      }),
    []
  );
  const ringMats = useMemo(
    () =>
      [1.6, 2.1, 2.7, 3.4].map(
        () =>
          new THREE.MeshBasicMaterial({
            color: '#ccff00',
            transparent: true,
            opacity: 0,
          })
      ),
    []
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const progress = progressRef.current ?? 0;
    const [start] = CHAPTERS[5].range;
    const visible = progress >= start - 0.06;
    const elapsed = clock.elapsedTime;
    const alpha = THREE.MathUtils.lerp(
      coreMat.opacity,
      visible ? 0.95 : 0,
      0.04
    );
    coreMat.opacity = alpha;
    coreMat.emissiveIntensity = 7 * alpha;
    ringMats.forEach((material, index) => {
      material.opacity = alpha * (0.5 - index * 0.09);
    });
    if (coreRef.current) {
      const scale = 1 + Math.sin(elapsed * 2.2) * 0.12;
      coreRef.current.scale.setScalar(
        THREE.MathUtils.lerp(coreRef.current.scale.x, scale, 0.1)
      );
    }
    groupRef.current.rotation.z = elapsed * 0.18;
    groupRef.current.rotation.x = Math.sin(elapsed * 0.12) * 0.1;
  });

  return (
    <group ref={groupRef}>
      <mesh ref={coreRef} material={coreMat}>
        <sphereGeometry args={[0.42, 32, 32]} />
      </mesh>
      {[1.6, 2.1, 2.7, 3.4].map((radius, index) => (
        <mesh
          key={index}
          rotation={[index * 0.7, index * 1.1, 0]}
          material={ringMats[index]}
        >
          <torusGeometry args={[radius, 0.016, 8, 64]} />
        </mesh>
      ))}
      <Sparkles
        count={profile.singularitySparkles}
        scale={7}
        size={profile.singularitySparkleSize}
        speed={0.9}
        color="#ccff00"
        opacity={0.85}
      />
      <pointLight color="#ccff00" intensity={7} distance={18} decay={2} />
    </group>
  );
}

function Background({ profile }: { profile: SceneProfile }) {
  return (
    <>
      <Stars
        radius={90}
        depth={55}
        count={profile.starCount}
        factor={profile.starFactor}
        saturation={0}
        fade
        speed={0.4}
      />
      <ambientLight intensity={profile.ambientLight} />
      <fog attach="fog" color="#000000" near={35} far={profile.fogFar} />
    </>
  );
}

function Scene({
  activeChapterIndex,
  progressRef,
  profile,
}: {
  activeChapterIndex: number;
  progressRef: MutableRefObject<number>;
  profile: SceneProfile;
}) {
  const { camera } = useThree();
  const camPos = useRef(new THREE.Vector3(0, 0, 9));
  const camLook = useRef(new THREE.Vector3(0, 0, 0));
  const nextPos = useRef(new THREE.Vector3(0, 0, 9));
  const nextLook = useRef(new THREE.Vector3(0, 0, 0));
  const shouldRenderScene = useCallback(
    (sceneIndex: number) => Math.abs(activeChapterIndex - sceneIndex) <= 1,
    [activeChapterIndex]
  );

  useFrame(() => {
    const progress = progressRef.current ?? 0;
    const keyframe = camAtT(progress);
    nextPos.current.set(keyframe.pos[0], keyframe.pos[1], keyframe.pos[2]);
    nextLook.current.set(keyframe.look[0], keyframe.look[1], keyframe.look[2]);
    camPos.current.lerp(nextPos.current, 0.038);
    camLook.current.lerp(nextLook.current, 0.038);
    camera.position.copy(camPos.current);
    camera.lookAt(camLook.current);
  });

  return (
    <>
      <Background profile={profile} />
      {shouldRenderScene(0) && (
        <ParticleGalaxy progressRef={progressRef} profile={profile} />
      )}
      {shouldRenderScene(1) && (
        <NeuralCortex progressRef={progressRef} profile={profile} />
      )}
      {shouldRenderScene(2) && <CrystalFortress progressRef={progressRef} />}
      {shouldRenderScene(3) && (
        <CloudConstellation progressRef={progressRef} profile={profile} />
      )}
      {shouldRenderScene(4) && (
        <SignalMatrix progressRef={progressRef} profile={profile} />
      )}
      {shouldRenderScene(5) && (
        <SingularityCore progressRef={progressRef} profile={profile} />
      )}
    </>
  );
}

export interface OliveUniverseCanvasProps {
  activeChapterIndex: number;
  progressRef: MutableRefObject<number>;
  quality: QualityTier;
  sceneProfile: SceneProfile;
  shouldAnimate: boolean;
  onReady?: () => void;
}

export default function OliveUniverseCanvas({
  activeChapterIndex,
  progressRef,
  quality,
  sceneProfile,
  shouldAnimate,
  onReady,
}: OliveUniverseCanvasProps) {
  const aberrationOffset = useMemo(
    () =>
      new THREE.Vector2(
        sceneProfile.aberrationOffset,
        sceneProfile.aberrationOffset
      ),
    [sceneProfile.aberrationOffset]
  );

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return (
    <div className="universe-canvas" aria-hidden="true">
      <Canvas
        frameloop={shouldAnimate ? 'always' : 'demand'}
        camera={{ position: [0, 0, 9], fov: 60, near: 0.1, far: 200 }}
        dpr={
          typeof window === 'undefined'
            ? 1
            : quality === 'low'
              ? 1
              : Math.min(
                  window.devicePixelRatio || 1,
                  quality === 'high' ? 2 : 1.5
                )
        }
        gl={{
          antialias: quality !== 'low',
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.25,
        }}
        style={{ position: 'absolute', inset: 0, background: '#000' }}
      >
        <Scene
          activeChapterIndex={activeChapterIndex}
          progressRef={progressRef}
          profile={sceneProfile}
        />
        {sceneProfile.enablePostFx && (
          <EffectComposer>
            <Bloom
              luminanceThreshold={0.18}
              luminanceSmoothing={0.65}
              intensity={sceneProfile.bloomIntensity}
              mipmapBlur
            />
            <ChromaticAberration
              blendFunction={BlendFunction.NORMAL}
              offset={aberrationOffset}
              radialModulation={false}
              modulationOffset={0}
            />
            <Vignette offset={0.32} darkness={0.62} />
            <Noise
              premultiply
              blendFunction={BlendFunction.ADD}
              opacity={sceneProfile.noiseOpacity}
            />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
