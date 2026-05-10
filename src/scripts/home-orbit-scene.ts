import * as THREE from 'three';

type SceneRoot = HTMLElement & {
  __homeOrbitCleanup?: () => void;
};

const modeNames = ['operate', 'protect', 'present'];

type SkylineChunk = {
  x: number;
  height: number;
  width: number;
  depth: number;
  layer: number;
  color: string;
  phase: number;
  antenna?: 'single' | 'twin' | 'needle';
};

const chicagoSkylineChunks: SkylineChunk[] = [
  {
    x: -6.15,
    height: 0.78,
    width: 0.18,
    depth: 0.16,
    layer: 2,
    color: '#d9ff5f',
    phase: 0.1,
  },
  {
    x: -5.78,
    height: 1.12,
    width: 0.22,
    depth: 0.18,
    layer: 1,
    color: '#f3d69f',
    phase: 0.3,
  },
  {
    x: -5.38,
    height: 2.75,
    width: 0.34,
    depth: 0.26,
    layer: 0,
    color: '#67e8df',
    phase: 0.6,
    antenna: 'twin',
  },
  {
    x: -4.98,
    height: 1.4,
    width: 0.18,
    depth: 0.18,
    layer: 1,
    color: '#ff8d74',
    phase: 0.8,
  },
  {
    x: -4.62,
    height: 1.92,
    width: 0.28,
    depth: 0.2,
    layer: 1,
    color: '#f3d69f',
    phase: 1.1,
  },
  {
    x: -4.25,
    height: 0.95,
    width: 0.16,
    depth: 0.14,
    layer: 2,
    color: '#d9ff5f',
    phase: 1.4,
  },
  {
    x: -3.88,
    height: 1.58,
    width: 0.22,
    depth: 0.18,
    layer: 1,
    color: '#67e8df',
    phase: 1.7,
  },
  {
    x: -3.5,
    height: 1.2,
    width: 0.18,
    depth: 0.15,
    layer: 2,
    color: '#f3d69f',
    phase: 2.0,
  },
  {
    x: -3.1,
    height: 2.08,
    width: 0.3,
    depth: 0.22,
    layer: 0,
    color: '#ff8d74',
    phase: 2.2,
  },
  {
    x: -2.72,
    height: 1.42,
    width: 0.2,
    depth: 0.16,
    layer: 1,
    color: '#d9ff5f',
    phase: 2.5,
  },
  {
    x: -2.28,
    height: 3.2,
    width: 0.34,
    depth: 0.22,
    layer: 0,
    color: '#f3d69f',
    phase: 2.8,
  },
  {
    x: -1.88,
    height: 1.78,
    width: 0.2,
    depth: 0.18,
    layer: 1,
    color: '#67e8df',
    phase: 3.1,
  },
  {
    x: -1.48,
    height: 2.38,
    width: 0.25,
    depth: 0.18,
    layer: 0,
    color: '#d9ff5f',
    phase: 3.4,
    antenna: 'needle',
  },
  {
    x: -1.1,
    height: 1.34,
    width: 0.16,
    depth: 0.15,
    layer: 2,
    color: '#ff8d74',
    phase: 3.7,
  },
  {
    x: -0.72,
    height: 1.82,
    width: 0.24,
    depth: 0.18,
    layer: 1,
    color: '#f3d69f',
    phase: 4.0,
  },
  {
    x: -0.33,
    height: 2.72,
    width: 0.25,
    depth: 0.2,
    layer: 0,
    color: '#67e8df',
    phase: 4.3,
    antenna: 'single',
  },
  {
    x: 0.08,
    height: 1.46,
    width: 0.18,
    depth: 0.16,
    layer: 2,
    color: '#d9ff5f',
    phase: 4.6,
  },
  {
    x: 0.44,
    height: 1.92,
    width: 0.22,
    depth: 0.18,
    layer: 1,
    color: '#ff8d74',
    phase: 4.9,
  },
  {
    x: 0.82,
    height: 1.18,
    width: 0.15,
    depth: 0.14,
    layer: 2,
    color: '#f3d69f',
    phase: 5.2,
  },
  {
    x: 1.2,
    height: 1.68,
    width: 0.2,
    depth: 0.16,
    layer: 1,
    color: '#67e8df',
    phase: 5.5,
  },
  {
    x: 1.62,
    height: 2.24,
    width: 0.26,
    depth: 0.2,
    layer: 0,
    color: '#d9ff5f',
    phase: 5.8,
  },
  {
    x: 1.98,
    height: 1.32,
    width: 0.18,
    depth: 0.16,
    layer: 2,
    color: '#ff8d74',
    phase: 6.1,
  },
  {
    x: 2.34,
    height: 3.85,
    width: 0.24,
    depth: 0.22,
    layer: 0,
    color: '#f3d69f',
    phase: 6.4,
    antenna: 'twin',
  },
  {
    x: 2.58,
    height: 3.42,
    width: 0.22,
    depth: 0.22,
    layer: 0,
    color: '#f3d69f',
    phase: 6.7,
  },
  {
    x: 2.83,
    height: 3.05,
    width: 0.2,
    depth: 0.2,
    layer: 0,
    color: '#d9ff5f',
    phase: 7.0,
  },
  {
    x: 3.08,
    height: 2.52,
    width: 0.18,
    depth: 0.18,
    layer: 0,
    color: '#f3d69f',
    phase: 7.3,
  },
  {
    x: 3.42,
    height: 1.76,
    width: 0.2,
    depth: 0.16,
    layer: 1,
    color: '#67e8df',
    phase: 7.6,
  },
  {
    x: 3.82,
    height: 1.28,
    width: 0.16,
    depth: 0.14,
    layer: 2,
    color: '#ff8d74',
    phase: 7.9,
  },
  {
    x: 4.18,
    height: 2.18,
    width: 0.25,
    depth: 0.2,
    layer: 0,
    color: '#d9ff5f',
    phase: 8.2,
    antenna: 'needle',
  },
  {
    x: 4.55,
    height: 1.5,
    width: 0.18,
    depth: 0.16,
    layer: 1,
    color: '#f3d69f',
    phase: 8.5,
  },
  {
    x: 4.95,
    height: 1.05,
    width: 0.16,
    depth: 0.14,
    layer: 2,
    color: '#67e8df',
    phase: 8.8,
  },
  {
    x: 5.34,
    height: 1.66,
    width: 0.22,
    depth: 0.18,
    layer: 1,
    color: '#ff8d74',
    phase: 9.1,
  },
  {
    x: 5.78,
    height: 0.94,
    width: 0.17,
    depth: 0.14,
    layer: 2,
    color: '#d9ff5f',
    phase: 9.4,
  },
  {
    x: 6.16,
    height: 1.18,
    width: 0.2,
    depth: 0.16,
    layer: 1,
    color: '#f3d69f',
    phase: 9.7,
  },
];

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

  const skylineY = height * 0.78;
  const skylineScale = width * 0.062;
  chicagoSkylineChunks
    .slice()
    .sort((a, b) => b.layer - a.layer || a.height - b.height)
    .forEach(chunk => {
      const barWidth = Math.max(4, chunk.width * skylineScale * 1.9);
      const barHeight = height * (0.08 + (chunk.height / 4) * 0.32);
      const x = width * 0.5 + chunk.x * skylineScale - barWidth / 2;
      const y = skylineY - barHeight;
      const bar = ctx.createLinearGradient(x, y, x, skylineY);
      bar.addColorStop(
        0,
        chunk.color === '#67e8df'
          ? 'rgba(103, 232, 223, 0.82)'
          : chunk.color === '#ff8d74'
            ? 'rgba(255, 141, 116, 0.76)'
            : 'rgba(217, 255, 95, 0.78)'
      );
      bar.addColorStop(1, 'rgba(17, 20, 16, 0.1)');
      ctx.fillStyle = bar;
      ctx.fillRect(x, y, barWidth, barHeight);

      if (chunk.antenna) {
        const antennaHeight =
          chunk.antenna === 'twin'
            ? height * 0.085
            : chunk.antenna === 'needle'
              ? height * 0.075
              : height * 0.055;
        const offsets =
          chunk.antenna === 'twin' ? [-barWidth * 0.22, barWidth * 0.22] : [0];

        ctx.strokeStyle = 'rgba(246, 241, 232, 0.7)';
        ctx.lineWidth = Math.max(1, width * 0.0011);
        offsets.forEach(offset => {
          ctx.beginPath();
          ctx.moveTo(x + barWidth / 2 + offset, y + 2);
          ctx.lineTo(x + barWidth / 2 + offset, y - antennaHeight);
          ctx.stroke();
        });
      }
    });

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
  const towers = new THREE.InstancedMesh(
    towerGeometry,
    towerMaterial,
    chicagoSkylineChunks.length
  );
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
  const antennaGeometry = new THREE.CylinderGeometry(0.018, 0.018, 1, 8);
  const antennaMaterial = new THREE.MeshStandardMaterial({
    color: '#f6f1e8',
    emissive: '#67e8df',
    emissiveIntensity: 0.48,
    roughness: 0.3,
    metalness: 0.42,
  });
  const antennaMeshes: THREE.Mesh[] = [];
  const addAntenna = (
    x: number,
    topY: number,
    z: number,
    height: number,
    offsetX = 0
  ) => {
    const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna.position.set(x + offsetX, topY + height / 2, z);
    antenna.scale.set(0.58, height, 0.58);
    skyline.add(antenna);
    antennaMeshes.push(antenna);
  };

  chicagoSkylineChunks.forEach((chunk, index) => {
    const x = chunk.x;
    const z = -1.42 - chunk.layer * 0.28;
    const sy = chunk.height;
    const sx = chunk.width;
    const sz = chunk.depth;
    const y = -2.65 + sy / 2;

    towerData.push({ x, y, z, sx, sy, sz, phase: chunk.phase });
    matrix.compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion(),
      new THREE.Vector3(sx, sy, sz)
    );
    towers.setMatrixAt(index, matrix);
    color.set(chunk.color);
    towers.setColorAt(index, color);

    if (chunk.antenna) {
      const topY = y + sy / 2;
      if (chunk.antenna === 'twin') {
        const antennaHeight = chunk.height > 3 ? 0.74 : 0.58;
        addAntenna(x, topY, z, antennaHeight, -chunk.width * 0.24);
        addAntenna(x, topY, z, antennaHeight * 0.94, chunk.width * 0.24);
      } else {
        addAntenna(x, topY, z, chunk.antenna === 'needle' ? 0.64 : 0.48);
      }
    }
  });
  towers.instanceMatrix.needsUpdate = true;
  towers.instanceColor!.needsUpdate = true;
  skyline.add(towers);

  const landmarkMaterials = [
    new THREE.MeshPhysicalMaterial({
      color: '#15304a',
      roughness: 0.2,
      metalness: 0.36,
      emissive: '#0b5f86',
      emissiveIntensity: 0.28,
      clearcoat: 0.7,
      clearcoatRoughness: 0.18,
    }),
    new THREE.MeshStandardMaterial({
      color: '#eaf7ff',
      roughness: 0.34,
      metalness: 0.42,
      emissive: '#4ad8ff',
      emissiveIntensity: 0.18,
    }),
    new THREE.MeshPhysicalMaterial({
      color: '#5cd4ff',
      roughness: 0.16,
      metalness: 0.22,
      transmission: 0.08,
      thickness: 0.32,
      emissive: '#164c66',
      emissiveIntensity: 0.32,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
    }),
    new THREE.MeshStandardMaterial({
      color: '#d9ff5f',
      roughness: 0.3,
      metalness: 0.3,
      emissive: '#496107',
      emissiveIntensity: 0.2,
    }),
  ];
  const windowMaterial = new THREE.MeshBasicMaterial({
    color: '#f8fff2',
    transparent: true,
    opacity: 0.56,
  });
  const cyanWindowMaterial = new THREE.MeshBasicMaterial({
    color: '#67e8df',
    transparent: true,
    opacity: 0.5,
  });
  const braceMaterial = new THREE.LineBasicMaterial({
    color: '#d9ff5f',
    transparent: true,
    opacity: 0.62,
  });
  const lineGeometries: THREE.BufferGeometry[] = [];
  const hancockGeometry = new THREE.CylinderGeometry(0.38, 0.58, 1, 4, 1);
  const marinaGeometry = new THREE.CylinderGeometry(0.18, 0.18, 1, 32);
  const chevronGeometry = new THREE.ConeGeometry(0.26, 0.36, 4);
  const riverGeometry = new THREE.PlaneGeometry(15.5, 1.2, 24, 2);
  const riverMaterial = new THREE.MeshBasicMaterial({
    color: '#103d48',
    transparent: true,
    opacity: 0.36,
    wireframe: true,
  });
  const buildingMeshes: THREE.Object3D[] = [];

  const addBlock = (
    x: number,
    height: number,
    width: number,
    depth: number,
    z: number,
    material: THREE.Material,
    yBase = -2.68
  ) => {
    const block = new THREE.Mesh(towerGeometry, material);
    block.position.set(x, yBase + height / 2, z);
    block.scale.set(width, height, depth);
    skyline.add(block);
    buildingMeshes.push(block);
    return block;
  };

  const addWindowBands = (
    x: number,
    width: number,
    height: number,
    z: number,
    count: number,
    material = windowMaterial,
    yBase = -2.68
  ) => {
    for (let index = 1; index < count; index += 1) {
      const y = yBase + (height / count) * index;
      const band = new THREE.Mesh(towerGeometry, material);
      band.position.set(x, y, z + 0.012);
      band.scale.set(width * 0.92, 0.008, 0.01);
      skyline.add(band);
      buildingMeshes.push(band);
    }
  };

  const addLine = (points: THREE.Vector3[]) => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, braceMaterial);
    skyline.add(line);
    lineGeometries.push(geometry);
    buildingMeshes.push(line);
  };

  const baseY = -2.68;

  // Marina City-style river towers.
  [-4.95, -4.58].forEach((x, towerIndex) => {
    const tower = new THREE.Mesh(marinaGeometry, landmarkMaterials[0]);
    tower.position.set(x, baseY + 0.74, -1.06 - towerIndex * 0.05);
    tower.scale.set(1, 1.48, 1);
    skyline.add(tower);
    buildingMeshes.push(tower);

    for (let ring = 0; ring < 7; ring += 1) {
      const band = new THREE.Mesh(towerGeometry, cyanWindowMaterial);
      band.position.set(
        x,
        baseY + 0.24 + ring * 0.18,
        -0.855 - towerIndex * 0.05
      );
      band.scale.set(0.42, 0.008, 0.012);
      skyline.add(band);
      buildingMeshes.push(band);
    }
  });

  // 875 N. Michigan / Hancock-inspired taper with exposed X bracing.
  const hancock = new THREE.Mesh(hancockGeometry, landmarkMaterials[0]);
  hancock.position.set(-5.32, baseY + 1.42, -1.28);
  hancock.scale.set(0.68, 2.84, 0.5);
  hancock.rotation.y = Math.PI * 0.25;
  skyline.add(hancock);
  buildingMeshes.push(hancock);
  addAntenna(-5.47, baseY + 2.92, -1.28, 0.68);
  addAntenna(-5.17, baseY + 2.9, -1.28, 0.62);
  addLine([
    new THREE.Vector3(-5.66, baseY + 0.24, -1.01),
    new THREE.Vector3(-5.05, baseY + 2.6, -1.01),
    new THREE.Vector3(-5.66, baseY + 2.6, -1.01),
    new THREE.Vector3(-5.05, baseY + 0.24, -1.01),
  ]);

  // Aon Center-like clean white modernist slab.
  addBlock(-0.25, 3.18, 0.42, 0.28, -1.36, landmarkMaterials[1]);
  addWindowBands(-0.25, 0.42, 3.18, -1.2, 18, cyanWindowMaterial);

  // Two Prudential-style chevron crown and spire.
  addBlock(-1.35, 2.5, 0.34, 0.22, -1.24, landmarkMaterials[2]);
  const pruCrown = new THREE.Mesh(chevronGeometry, landmarkMaterials[2]);
  pruCrown.position.set(-1.35, baseY + 2.66, -1.24);
  pruCrown.rotation.y = Math.PI * 0.25;
  skyline.add(pruCrown);
  buildingMeshes.push(pruCrown);
  addAntenna(-1.35, baseY + 2.84, -1.24, 0.62);
  addWindowBands(-1.35, 0.3, 2.5, -1.1, 12, windowMaterial);

  // Trump Tower-inspired reflective stepped massing and spire.
  addBlock(0.95, 1.42, 0.54, 0.28, -1.06, landmarkMaterials[2]);
  addBlock(1.04, 1.0, 0.42, 0.24, -1.08, landmarkMaterials[2], baseY + 1.34);
  addBlock(1.1, 0.82, 0.3, 0.2, -1.1, landmarkMaterials[2], baseY + 2.22);
  addAntenna(1.1, baseY + 3.04, -1.1, 0.68);
  addWindowBands(1.02, 0.48, 3.02, -0.9, 16, windowMaterial);

  // Willis/Sears bundled tubes with uneven roofline and twin antennas.
  const willisX = 2.54;
  [
    [-0.28, 3.52],
    [0, 3.86],
    [0.28, 3.3],
    [-0.28, 2.96],
    [0, 3.12],
    [0.28, 2.72],
  ].forEach(([offset, height], index) => {
    addBlock(
      willisX + offset,
      height,
      0.25,
      0.24,
      -1.34 + (index % 3) * 0.04,
      landmarkMaterials[index % 2 === 0 ? 0 : 3]
    );
    addWindowBands(
      willisX + offset,
      0.22,
      height,
      -1.16 + (index % 3) * 0.04,
      16,
      index % 2 === 0 ? cyanWindowMaterial : windowMaterial
    );
  });
  addAntenna(willisX - 0.12, baseY + 3.88, -1.34, 0.78);
  addAntenna(willisX + 0.12, baseY + 3.78, -1.34, 0.72);

  // Aqua / St. Regis-inspired rippled and stacked glass profile.
  for (let index = 0; index < 10; index += 1) {
    const slabWidth = 0.34 + Math.sin(index * 1.25) * 0.07;
    addBlock(
      4.05 + Math.sin(index * 0.82) * 0.05,
      0.16,
      slabWidth,
      0.22,
      -1.18,
      landmarkMaterials[2],
      baseY + index * 0.18
    );
  }
  addBlock(4.46, 2.58, 0.28, 0.24, -1.32, landmarkMaterials[2]);
  addBlock(4.7, 2.06, 0.24, 0.22, -1.36, landmarkMaterials[2]);
  addBlock(4.25, 1.74, 0.22, 0.2, -1.36, landmarkMaterials[2]);

  const river = new THREE.Mesh(riverGeometry, riverMaterial);
  river.rotation.x = -Math.PI * 0.54;
  river.position.set(0, -2.82, 0.88);
  skyline.add(river);
  buildingMeshes.push(river);

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
    landmarkMaterials.forEach(material => material.dispose());
    windowMaterial.dispose();
    cyanWindowMaterial.dispose();
    braceMaterial.dispose();
    hancockGeometry.dispose();
    marinaGeometry.dispose();
    chevronGeometry.dispose();
    riverGeometry.dispose();
    riverMaterial.dispose();
    lineGeometries.forEach(geometry => geometry.dispose());
    antennaGeometry.dispose();
    antennaMaterial.dispose();
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
