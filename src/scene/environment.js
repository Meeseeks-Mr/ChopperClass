import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

/**
 * Pastel-daylight outdoor environment.
 *  - Procedural Sky (the three.js Sky shader) with a friendly sun position.
 *  - Soft grassy ground disc (canvas texture, no external asset).
 *  - Bright helipad with painted H.
 *  - Distant tree silhouettes for parallax.
 *  - Fluffy sprite clouds that drift past in sky mode.
 */
export function makeEnvironment(scene) {
  const root = new THREE.Group();
  root.name = 'Environment';
  scene.add(root);

  // ----- Sky -----
  const sky = new Sky();
  sky.scale.setScalar(4000);
  const sun = new THREE.Vector3();
  const u = sky.material.uniforms;
  u.turbidity.value = 4.2;
  u.rayleigh.value = 1.0;
  u.mieCoefficient.value = 0.006;
  u.mieDirectionalG.value = 0.84;
  const phi = THREE.MathUtils.degToRad(72);
  const theta = THREE.MathUtils.degToRad(150);
  sun.setFromSphericalCoords(1, phi, theta);
  u.sunPosition.value.copy(sun);

  // ----- Ground (canvas-textured "grass") -----
  const groundTex = makeGrassTexture();
  groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
  groundTex.repeat.set(20, 20);
  const groundMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    color: 0xb5d39a,
    roughness: 0.95,
    metalness: 0.0,
  });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(180, 96), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;

  // Helipad: light cream concrete with a painted yellow H
  const padBaseMat = new THREE.MeshStandardMaterial({ color: 0xefe7d6, roughness: 0.9 });
  const padBase = new THREE.Mesh(new THREE.CircleGeometry(3.5, 64), padBaseMat);
  padBase.rotation.x = -Math.PI / 2;
  padBase.position.y = 0.005;
  padBase.receiveShadow = true;

  const padRingMat = new THREE.MeshStandardMaterial({ color: 0xffd54f, roughness: 0.8 });
  const padRing = new THREE.Mesh(new THREE.RingGeometry(3.0, 3.2, 96), padRingMat);
  padRing.rotation.x = -Math.PI / 2;
  padRing.position.y = 0.011;

  const Htex = makeHTexture();
  const hMat = new THREE.MeshBasicMaterial({ map: Htex, transparent: true });
  const hQuad = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), hMat);
  hQuad.rotation.x = -Math.PI / 2;
  hQuad.position.y = 0.014;

  // Subtle radial grid for spatial sense
  const grid = new THREE.GridHelper(200, 40, 0x9caf8e, 0xbfd6ad);
  grid.position.y = 0.001;
  grid.material.transparent = true;
  grid.material.opacity = 0.32;

  // Distant tree cones for parallax
  const trees = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.95 });
  const leafMats = [
    new THREE.MeshStandardMaterial({ color: 0x6dbf6a, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0x7fc97a, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0x5fad5e, roughness: 0.85 }),
  ];
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 28 + Math.random() * 60;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const h = 3 + Math.random() * 5;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.2, 6), trunkMat);
    trunk.position.set(x, 0.6, z);
    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(0.9 + Math.random() * 0.6, h, 8),
      leafMats[i % leafMats.length],
    );
    leaves.position.set(x, 0.6 + h / 2, z);
    leaves.castShadow = true; trunk.castShadow = true;
    trees.add(trunk, leaves);
  }

  // Hills (soft mounds in the distance)
  const hills = new THREE.Group();
  const hillMat = new THREE.MeshStandardMaterial({ color: 0x9bbf86, roughness: 1.0 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.random() * 0.3;
    const r = 100 + Math.random() * 40;
    const sx = 30 + Math.random() * 20;
    const sy = 6 + Math.random() * 5;
    const sz = 30 + Math.random() * 20;
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), hillMat);
    m.position.set(Math.cos(a) * r, -1, Math.sin(a) * r);
    m.scale.set(sx, sy, sz);
    hills.add(m);
  }

  // ----- Clouds (sprites in sky mode) -----
  // toneMapped + fog disabled: ACES + bluish fog were dragging the soft
  // edges of the cloud sprites toward grey-green. We want pure white puffs.
  const cloudTex = makeCloudTexture();
  const cloudGroup = new THREE.Group();
  for (let i = 0; i < 50; i++) {
    const m = new THREE.SpriteMaterial({
      map: cloudTex,
      color: 0xffffff,
      opacity: 0.92 + Math.random() * 0.08,
      transparent: true,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    });
    const s = new THREE.Sprite(m);
    const r = 70 + Math.random() * 260;
    const a = Math.random() * Math.PI * 2;
    const y = 22 + Math.random() * 60;
    s.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    const sc = 24 + Math.random() * 40;
    s.scale.set(sc, sc * (0.5 + Math.random() * 0.15), 1);
    cloudGroup.add(s);
  }

  root.add(sky, ground, padBase, padRing, hQuad, grid, trees, hills, cloudGroup);

  // ----- Mode toggle -----
  function setMode(mode /* 'ground' | 'sky' */) {
    const onGround = mode === 'ground';
    ground.visible = onGround;
    padBase.visible = onGround;
    padRing.visible = onGround;
    hQuad.visible = onGround;
    grid.visible = onGround;
    trees.visible = onGround;
    hills.visible = true;       // hills look fine from both
    cloudGroup.visible = true;  // clouds always pretty
    if (onGround) {
      u.turbidity.value = 4.2;
      u.rayleigh.value = 1.1;
    } else {
      u.turbidity.value = 2.8;
      u.rayleigh.value = 0.7;
    }
    scene.fog.color.setHex(onGround ? 0xe7eef3 : 0xd8e6f3);
    scene.fog.far = onGround ? 220 : 380;
  }
  setMode('ground');

  function tick(dt) {
    // Cloud drift
    cloudGroup.children.forEach((c, i) => {
      c.position.x += dt * (0.4 + (i % 7) * 0.12);
      if (c.position.x > 380) c.position.x = -380;
    });
  }

  return { root, setMode, tick };
}

// ---------- canvas-generated textures ----------

function makeGrassTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  // base
  x.fillStyle = '#b8d09a';
  x.fillRect(0, 0, 256, 256);
  // grass speckle
  for (let i = 0; i < 1400; i++) {
    const hue = 90 + Math.random() * 30;
    const sat = 35 + Math.random() * 25;
    const lt  = 45 + Math.random() * 25;
    x.fillStyle = `hsla(${hue}, ${sat}%, ${lt}%, ${0.35 + Math.random() * 0.4})`;
    const px = Math.random() * 256;
    const py = Math.random() * 256;
    const w  = 1 + Math.random() * 2;
    const h  = 2 + Math.random() * 4;
    x.fillRect(px, py, w, h);
  }
  // soft tonal variation
  for (let i = 0; i < 30; i++) {
    const grad = x.createRadialGradient(
      Math.random() * 256, Math.random() * 256, 5,
      Math.random() * 256, Math.random() * 256, 30 + Math.random() * 40
    );
    grad.addColorStop(0, 'rgba(200,220,180,0.18)');
    grad.addColorStop(1, 'rgba(200,220,180,0)');
    x.fillStyle = grad;
    x.fillRect(0, 0, 256, 256);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function makeHTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  x.clearRect(0, 0, 256, 256);
  x.fillStyle = '#ffffff';
  // H with thicker strokes
  x.fillRect(60, 40, 36, 176);
  x.fillRect(160, 40, 36, 176);
  x.fillRect(60, 110, 136, 36);
  // soft shadow
  x.globalCompositeOperation = 'destination-over';
  x.fillStyle = 'rgba(0,0,0,0.15)';
  x.fillRect(64, 44, 36, 176);
  x.fillRect(164, 44, 36, 176);
  x.fillRect(64, 114, 136, 36);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeCloudTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  // Compose several soft white radial blobs into a fluffy cloud. We layer a
  // strong inner core so the cloud reads opaque-white, and softer outer wisps
  // for a feathered edge.
  for (let i = 0; i < 4; i++) {
    const cx = 110 + Math.random() * 36;
    const cy = 110 + Math.random() * 36;
    const rr = 60 + Math.random() * 40;
    const g = x.createRadialGradient(cx, cy, 6, cx, cy, rr);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.92)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
  }
  for (let i = 0; i < 5; i++) {
    const cx = 70 + Math.random() * 116;
    const cy = 80 + Math.random() * 96;
    const rr = 36 + Math.random() * 28;
    const g = x.createRadialGradient(cx, cy, 4, cx, cy, rr);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.premultiplyAlpha = true;
  return t;
}
