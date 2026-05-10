import * as THREE from 'three';

type SceneRoot = HTMLElement & {
  __homeOrbitCleanup?: () => void;
};

const modeNames = ['operate', 'protect', 'present'];

const drawFallbackField = (root: HTMLElement, canvas: HTMLCanvasElement) => {
  const width = Math.max(320, Math.round(root.clientWidth || 640));
  const height = Math.max(260, Math.round(root.clientHeight || 460));
  const ratio = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.width = '100%';
  canvas.style.height = '100%';

  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) return;

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#070806');
  background.addColorStop(0.5, '#10140f');
  background.addColorStop(1, '#050706');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const field = ctx.createRadialGradient(
    width * 0.54,
    height * 0.42,
    12,
    width * 0.54,
    height * 0.42,
    width * 0.34
  );
  field.addColorStop(0, 'rgba(103, 232, 223, 0.32)');
  field.addColorStop(0.44, 'rgba(217, 255, 95, 0.14)');
  field.addColorStop(1, 'rgba(7, 8, 6, 0)');
  ctx.fillStyle = field;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(246, 241, 232, 0.075)';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 58) {
    ctx.beginPath();
    ctx.moveTo(x, height * 0.12);
    ctx.lineTo(x + width * 0.08, height * 0.86);
    ctx.stroke();
  }
  for (let y = Math.round(height * 0.16); y < height; y += 46) {
    ctx.beginPath();
    ctx.moveTo(width * 0.08, y);
    ctx.lineTo(width * 0.92, y + Math.sin(y * 0.02) * 16);
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(width * 0.5, height * 0.45);
  ctx.rotate(Math.PI * 0.1);
  ctx.strokeStyle = 'rgba(103, 232, 223, 0.78)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, width * 0.18, height * 0.11, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(217, 255, 95, 0.62)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, width * 0.25, height * 0.16, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  const skylineY = height * 0.76;
  for (let index = 0; index < 22; index += 1) {
    const t = index / 21;
    const barWidth = 5 + (index % 4) * 2;
    const barHeight =
      height *
      (0.08 +
        Math.pow(Math.sin(t * Math.PI), 1.45) * 0.26 +
        (index % 7 === 0 ? 0.08 : 0));
    const x = width * 0.12 + t * width * 0.76;
    const bar = ctx.createLinearGradient(x, skylineY - barHeight, x, skylineY);
    bar.addColorStop(
      0,
      index % 2 === 0 ? 'rgba(217, 255, 95, 0.82)' : 'rgba(103, 232, 223, 0.78)'
    );
    bar.addColorStop(1, 'rgba(17, 20, 16, 0.12)');
    ctx.fillStyle = bar;
    ctx.fillRect(x, skylineY - barHeight, barWidth, barHeight);
  }

  for (let index = 0; index < 34; index += 1) {
    const angle = (index / 34) * Math.PI * 2;
    const radius = width * (0.12 + (index % 5) * 0.018);
    const x = width * 0.52 + Math.cos(angle) * radius;
    const y = height * 0.42 + Math.sin(angle) * radius * 0.5;
    ctx.fillStyle =
      index % 3 === 0
        ? 'rgba(255, 141, 116, 0.78)'
        : 'rgba(246, 241, 232, 0.72)';
    ctx.beginPath();
    ctx.arc(x, y, 2.2 + (index % 3), 0, Math.PI * 2);
    ctx.fill();
  }
};

const bindFallback = (root: SceneRoot, canvas: HTMLCanvasElement) => {
  const draw = () => drawFallbackField(root, canvas);
  draw();
  window.addEventListener('resize', draw);
  root.__homeOrbitCleanup = () => window.removeEventListener('resize', draw);
};

const bindThreeScene = (root: SceneRoot, canvas: HTMLCanvasElement) => {
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#050806', 0.07);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  camera.position.set(0, 0.9, 8.6);

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
  } catch {
    bindFallback(root, canvas);
    return;
  }

  renderer.setClearColor('#070806', 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const stage = new THREE.Group();
  const skyline = new THREE.Group();
  const signal = new THREE.Group();
  scene.add(stage, skyline, signal);

  scene.add(new THREE.AmbientLight('#efe8d8', 0.58));
  const key = new THREE.DirectionalLight('#fff0cf', 2.1);
  key.position.set(-4, 6, 5);
  scene.add(key);
  const rim = new THREE.PointLight('#67e8df', 7, 18);
  rim.position.set(3.5, 1.2, 3.8);
  scene.add(rim);
  const glow = new THREE.PointLight('#ff8d74', 4.2, 16);
  glow.position.set(-3.5, -1.5, 2.6);
  scene.add(glow);

  const towerGeometry = new THREE.BoxGeometry(1, 1, 1);
  const towerMaterial = new THREE.MeshStandardMaterial({
    color: '#f3d69f',
    roughness: 0.5,
    metalness: 0.48,
    emissive: '#2c240d',
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
    color.set(
      index % 5 === 0 ? '#67e8df' : index % 2 === 0 ? '#d9ff5f' : '#ff8d74'
    );
    towers.setColorAt(index, color);
  }
  towers.instanceMatrix.needsUpdate = true;
  towers.instanceColor!.needsUpdate = true;
  skyline.add(towers);

  const deck = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 5.2, 30, 8),
    new THREE.MeshBasicMaterial({
      color: '#263024',
      opacity: 0.28,
      transparent: true,
      wireframe: true,
    })
  );
  deck.rotation.x = -Math.PI * 0.47;
  deck.position.y = -2.35;
  deck.position.z = -1.15;
  skyline.add(deck);

  const coreMaterial = new THREE.MeshPhysicalMaterial({
    color: '#18251d',
    roughness: 0.28,
    metalness: 0.54,
    transmission: 0.16,
    thickness: 0.85,
    emissive: '#183c35',
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
      color: '#67e8df',
      emissive: '#67e8df',
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
      color: '#d9ff5f',
      transparent: true,
      opacity: 0.48,
    })
  );
  outerHalo.rotation.x = Math.PI * 0.57;
  outerHalo.rotation.y = Math.PI * 0.08;
  stage.add(outerHalo);

  const beaconGeometry = new THREE.SphereGeometry(0.055, 16, 16);
  const beaconMaterials = ['#67e8df', '#d9ff5f', '#ff8d74'].map(
    value =>
      new THREE.MeshStandardMaterial({
        color: value,
        emissive: value,
        emissiveIntensity: 1.35,
        roughness: 0.2,
      })
  );
  const beacons = Array.from({ length: 16 }, (_, index) => {
    const beacon = new THREE.Mesh(
      beaconGeometry,
      beaconMaterials[index % beaconMaterials.length]
    );
    const angle = (index / 16) * Math.PI * 2;
    beacon.userData.angle = angle;
    beacon.userData.radius = 1.6 + (index % 4) * 0.34;
    signal.add(beacon);
    return beacon;
  });

  const particleCount = 900;
  const positions = new Float32Array(particleCount * 3);
  const particleColors = new Float32Array(particleCount * 3);
  for (let index = 0; index < particleCount; index += 1) {
    const radius = 2.2 + Math.random() * 4.5;
    const theta = Math.random() * Math.PI * 2;
    positions[index * 3] = Math.cos(theta) * radius;
    positions[index * 3 + 1] = (Math.random() - 0.5) * 5.2;
    positions[index * 3 + 2] = Math.sin(theta) * radius - 0.8;
    color.set(index % 3 === 0 ? '#67e8df' : '#d9ff5f');
    color.lerp(new THREE.Color('#ff8d74'), Math.random() * 0.32);
    particleColors[index * 3] = color.r;
    particleColors[index * 3 + 1] = color.g;
    particleColors[index * 3 + 2] = color.b;
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
      opacity: 0.72,
      depthWrite: false,
    })
  );
  scene.add(particles);

  const pointer = new THREE.Vector2(0, 0);
  const clock = new THREE.Clock();
  let sceneMode = 0;
  let burstUntil = 0;
  let raf = 0;
  let frame = 0;

  const setSceneMode = (mode: number) => {
    sceneMode =
      ((mode % modeNames.length) + modeNames.length) % modeNames.length;
    burstUntil = clock.getElapsedTime() + 1.25;
    root.dataset.sceneMode = modeNames[sceneMode];
  };

  const onPointerMove = (event: PointerEvent) => {
    const rect = root.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * -2;
  };
  const onPointerDown = () => setSceneMode(sceneMode + 1);
  const onSceneMode = (event: Event) => {
    const requestedMode = Number((event as CustomEvent).detail?.mode);
    if (Number.isFinite(requestedMode)) setSceneMode(requestedMode);
  };

  const resize = () => {
    const width = Math.max(1, root.clientWidth);
    const height = Math.max(1, root.clientHeight);
    camera.aspect = width / height;
    camera.position.z = width < 760 ? 10.6 : 8.4;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.setSize(width, height, false);
  };

  const observer = new ResizeObserver(resize);
  observer.observe(root);
  root.addEventListener('pointermove', onPointerMove);
  root.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('home-orbit-scene:mode', onSceneMode);
  resize();
  setSceneMode(0);

  const render = () => {
    const elapsed = clock.getElapsedTime();
    const slowTime = prefersReducedMotion ? 0.8 : elapsed;
    const burst = Math.max(0, burstUntil - elapsed);
    const modeEnergy = sceneMode === 1 ? 0.45 : sceneMode === 2 ? 0.78 : 0.18;

    stage.rotation.y = slowTime * (0.16 + modeEnergy * 0.05) + pointer.x * 0.08;
    stage.rotation.x = -0.08 + pointer.y * 0.05;
    skyline.rotation.y = pointer.x * 0.035;
    signal.rotation.y = slowTime * (-0.08 - modeEnergy * 0.05);
    particles.rotation.y = slowTime * 0.035;

    rim.intensity = 6.5 + modeEnergy * 4 + burst * 2.2;
    glow.intensity = 3.5 + modeEnergy * 1.6 + burst;
    core.rotation.x = slowTime * 0.22;
    core.rotation.y = slowTime * 0.32;
    core.scale.setScalar(1 + modeEnergy * 0.045 + burst * 0.025);
    halo.rotation.y = slowTime * 0.5;
    outerHalo.rotation.z = slowTime * -0.16;

    beacons.forEach((beacon, index) => {
      const angle =
        beacon.userData.angle +
        slowTime * (0.22 + index * 0.006 + modeEnergy * 0.12);
      const radius = beacon.userData.radius + Math.sin(slowTime + index) * 0.05;
      beacon.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle * 2.1 + sceneMode) * (0.28 + modeEnergy * 0.14),
        Math.sin(angle) * 1.12
      );
      beacon.scale.setScalar(
        1 + Math.sin(slowTime * 2.1 + index) * 0.18 + burst * 0.18
      );
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
    if (!prefersReducedMotion) raf = window.requestAnimationFrame(render);
  };
  render();

  root.__homeOrbitCleanup = () => {
    window.cancelAnimationFrame(raf);
    root.removeEventListener('pointermove', onPointerMove);
    root.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('home-orbit-scene:mode', onSceneMode);
    observer.disconnect();
    renderer.dispose();
    towerGeometry.dispose();
    towerMaterial.dispose();
    deck.geometry.dispose();
    (deck.material as THREE.Material).dispose();
    coreMaterial.dispose();
    beaconGeometry.dispose();
    beaconMaterials.forEach(material => material.dispose());
    particleGeometry.dispose();
  };
};

const bindHomeOrbitScenes = () => {
  document
    .querySelectorAll<SceneRoot>('[data-home-orbit-root]')
    .forEach(root => {
      root.__homeOrbitCleanup?.();
      const canvas = root.querySelector<HTMLCanvasElement>(
        '[data-home-orbit-canvas]'
      );
      if (!canvas) return;
      bindThreeScene(root, canvas);
    });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindHomeOrbitScenes, {
    once: true,
  });
} else {
  bindHomeOrbitScenes();
}

document.addEventListener('astro:page-load', bindHomeOrbitScenes);
