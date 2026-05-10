import { useEffect, useRef } from 'preact/hooks';
import * as THREE from 'three';

const palette = {
  amber: new THREE.Color('#d1b17a'),
  mint: new THREE.Color('#7be3d5'),
  blue: new THREE.Color('#68a7ff'),
  coral: new THREE.Color('#e59871'),
  graphite: new THREE.Color('#11181b'),
};

export default function HomeOrbitScene() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2('#070b0d', 0.08);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
    camera.position.set(0, 0.85, 8.4);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    root.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');

    const stage = new THREE.Group();
    const skyline = new THREE.Group();
    const signal = new THREE.Group();
    scene.add(stage, skyline, signal);

    scene.add(new THREE.AmbientLight('#aeb9ad', 0.55));

    const key = new THREE.DirectionalLight('#fff0cf', 1.9);
    key.position.set(-4, 6, 5);
    scene.add(key);

    const rim = new THREE.PointLight('#65f5df', 6.5, 18);
    rim.position.set(3.5, 1.2, 3.8);
    scene.add(rim);

    const glow = new THREE.PointLight('#f0b36e', 3.5, 16);
    glow.position.set(-3.5, -1.5, 2.6);
    scene.add(glow);

    const towerGeometry = new THREE.BoxGeometry(1, 1, 1);
    const towerMaterial = new THREE.MeshStandardMaterial({
      color: '#c9b98a',
      roughness: 0.5,
      metalness: 0.48,
      emissive: '#2b2014',
      emissiveIntensity: 0.22,
    });
    const towers = new THREE.InstancedMesh(towerGeometry, towerMaterial, 96);
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    const towerData: Array<{
      x: number;
      y: number;
      z: number;
      sx: number;
      sy: number;
      sz: number;
      phase: number;
    }> = [];

    for (let index = 0; index < 96; index += 1) {
      const t = index / 95;
      const lane = index % 4;
      const x = (t - 0.5) * 12.8;
      const z = -1.6 - lane * 0.28 + Math.sin(index * 1.7) * 0.12;
      const sy =
        0.46 +
        Math.pow(Math.sin(t * Math.PI), 1.2) * 2.25 +
        Math.sin(index * 0.71) * 0.36 +
        (index % 11 === 0 ? 1.25 : 0);
      const sx = 0.045 + (index % 3) * 0.025;
      const sz = 0.08 + (index % 5) * 0.025;
      const y = -2.65 + sy / 2;

      towerData.push({ x, y, z, sx, sy, sz, phase: index * 0.37 });
      matrix.compose(
        new THREE.Vector3(x, y, z),
        new THREE.Quaternion(),
        new THREE.Vector3(sx, sy, sz)
      );
      towers.setMatrixAt(index, matrix);

      color.copy(palette.amber).lerp(index % 5 === 0 ? palette.mint : palette.coral, 0.22);
      towers.setColorAt(index, color);
    }
    towers.instanceMatrix.needsUpdate = true;
    towers.instanceColor!.needsUpdate = true;
    skyline.add(towers);

    const deckGeometry = new THREE.PlaneGeometry(14, 5.2, 30, 8);
    const deckMaterial = new THREE.MeshBasicMaterial({
      color: '#243032',
      transparent: true,
      opacity: 0.28,
      wireframe: true,
    });
    const deck = new THREE.Mesh(deckGeometry, deckMaterial);
    deck.rotation.x = -Math.PI * 0.47;
    deck.position.y = -2.35;
    deck.position.z = -1.15;
    skyline.add(deck);

    const coreMaterial = new THREE.MeshPhysicalMaterial({
      color: '#20292b',
      roughness: 0.28,
      metalness: 0.54,
      transmission: 0.16,
      thickness: 0.85,
      emissive: '#1b4c48',
      emissiveIntensity: 0.36,
      clearcoat: 0.8,
      clearcoatRoughness: 0.28,
    });
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.18, 3),
      coreMaterial
    );
    core.position.set(0, 0.18, 0.2);
    stage.add(core);

    const halo = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1.72, 0.018, 260, 16, 3, 8),
      new THREE.MeshStandardMaterial({
        color: '#77ead7',
        emissive: '#5ee8da',
        emissiveIntensity: 1.45,
        roughness: 0.22,
        metalness: 0.2,
      })
    );
    halo.rotation.x = Math.PI * 0.4;
    stage.add(halo);

    const outerHalo = new THREE.Mesh(
      new THREE.TorusGeometry(2.42, 0.008, 10, 220),
      new THREE.MeshBasicMaterial({
        color: '#d1b17a',
        transparent: true,
        opacity: 0.54,
      })
    );
    outerHalo.rotation.x = Math.PI * 0.57;
    outerHalo.rotation.y = Math.PI * 0.08;
    stage.add(outerHalo);

    const makeRibbon = (offset: number, ribbonColor: THREE.Color) => {
      const points = Array.from({ length: 96 }, (_, index) => {
        const t = index / 95;
        const angle = t * Math.PI * 2;
        return new THREE.Vector3(
          Math.cos(angle) * (2.8 + Math.sin(angle * 3 + offset) * 0.25),
          Math.sin(angle * 2 + offset) * 0.52,
          Math.sin(angle) * 1.28
        );
      });

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: ribbonColor,
        transparent: true,
        opacity: 0.55,
      });
      const line = new THREE.LineLoop(geometry, material);
      line.rotation.x = offset * 0.3;
      line.rotation.z = offset * 0.12;
      signal.add(line);
      return line;
    };

    const ribbons = [
      makeRibbon(0.2, palette.mint),
      makeRibbon(1.7, palette.amber),
      makeRibbon(2.8, palette.blue),
    ];

    const particleCount = 1200;
    const positions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      const radius = 2.2 + Math.random() * 4.5;
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 5.2;
      positions[index * 3] = Math.cos(theta) * radius;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = Math.sin(theta) * radius - 0.8;

      const c = color
        .copy(index % 3 === 0 ? palette.mint : palette.amber)
        .lerp(palette.blue, Math.random() * 0.35);
      particleColors[index * 3] = c.r;
      particleColors[index * 3 + 1] = c.g;
      particleColors[index * 3 + 2] = c.b;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
    particleGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(particleColors, 3)
    );
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        size: 0.018,
        vertexColors: true,
        transparent: true,
        opacity: 0.76,
        depthWrite: false,
      })
    );
    scene.add(particles);

    const pointer = new THREE.Vector2(0, 0);
    const onPointerMove = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * -2;
    };
    root.addEventListener('pointermove', onPointerMove);

    const resize = () => {
      const width = Math.max(1, root.clientWidth);
      const height = Math.max(1, root.clientHeight);
      camera.aspect = width / height;
      camera.position.z = width < 760 ? 10.6 : 8.4;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    };

    const observer = new ResizeObserver(resize);
    observer.observe(root);
    resize();

    let frame = 0;
    let raf = 0;
    const clock = new THREE.Clock();

    const render = () => {
      const elapsed = clock.getElapsedTime();
      const slowTime = prefersReducedMotion ? 0.8 : elapsed;

      stage.rotation.y = slowTime * 0.16 + pointer.x * 0.08;
      stage.rotation.x = -0.08 + pointer.y * 0.05;
      skyline.rotation.y = pointer.x * 0.035;
      signal.rotation.y = slowTime * -0.08;
      signal.rotation.z = Math.sin(slowTime * 0.42) * 0.04;
      particles.rotation.y = slowTime * 0.035;
      particles.rotation.x = Math.sin(slowTime * 0.2) * 0.025;

      core.rotation.x = slowTime * 0.22;
      core.rotation.y = slowTime * 0.32;
      halo.rotation.y = slowTime * 0.5;
      outerHalo.rotation.z = slowTime * -0.16;

      ribbons.forEach((ribbon, index) => {
        ribbon.rotation.y = slowTime * (0.12 + index * 0.035);
        ribbon.rotation.x += prefersReducedMotion ? 0 : 0.0006 * (index + 1);
      });

      if (!prefersReducedMotion && frame % 2 === 0) {
        towerData.forEach((tower, index) => {
          const pulse = Math.sin(elapsed * 1.4 + tower.phase) * 0.035;
          matrix.compose(
            new THREE.Vector3(tower.x, tower.y + pulse * 0.5, tower.z),
            new THREE.Quaternion(),
            new THREE.Vector3(tower.sx, tower.sy + pulse, tower.sz)
          );
          towers.setMatrixAt(index, matrix);
        });
        towers.instanceMatrix.needsUpdate = true;
      }

      renderer.render(scene, camera);
      frame += 1;
      if (!prefersReducedMotion) {
        raf = window.requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.cancelAnimationFrame(raf);
      root.removeEventListener('pointermove', onPointerMove);
      observer.disconnect();
      renderer.dispose();
      towerGeometry.dispose();
      towerMaterial.dispose();
      deckGeometry.dispose();
      deckMaterial.dispose();
      coreMaterial.dispose();
      particleGeometry.dispose();
      root.replaceChildren();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="home-orbit-scene"
      data-testid="home-orbit-scene"
      role="img"
      aria-label="Animated 3D Chicago operations skyline and signal field"
    >
      <div className="home-orbit-scene__fallback" aria-hidden="true" />
    </div>
  );
}
