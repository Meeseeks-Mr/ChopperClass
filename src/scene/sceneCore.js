import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function createScene(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcfe8f6);  // soft daytime blue — fallback if Sky isn't covering
  scene.fog = new THREE.Fog(0xe7eef3, 60, 220);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 4000);
  camera.position.set(8, 5, 12);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1.5;
  controls.maxDistance = 120;
  controls.target.set(0, 1.8, 0);

  // ----- Lighting: bright, friendly daylight -----
  const hemi = new THREE.HemisphereLight(0xffffff, 0xb6cfa8, 0.85);
  hemi.position.set(0, 50, 0);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xfff4dc, 1.35);
  key.position.set(10, 18, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 80;
  key.shadow.camera.left = -22;
  key.shadow.camera.right = 22;
  key.shadow.camera.top = 22;
  key.shadow.camera.bottom = -22;
  key.shadow.bias = -0.00035;
  key.shadow.radius = 4;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xc8e0ff, 0.55);
  fill.position.set(-8, 6, -6);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffd9b8, 0.4);
  rim.position.set(0, 5, -12);
  scene.add(rim);

  // ----- Resize + framing offset (push helicopter above bottom overlay) ----
  // The controls panel overlaps the bottom of the viz. To keep the
  // helicopter centred in the *visible* area (above the overlay), we
  // re-frame the camera with setViewOffset every frame: the projection
  // pretends the canvas is (overlayPx) pixels taller, and we render the
  // bottom slice — which has the visual effect of shifting the model up.
  let canvasW = 2, canvasH = 2;
  let frameOffsetPx = 0;
  function setFrameOffsetPx(px) { frameOffsetPx = Math.max(0, px || 0); applyView(); }
  function applyView() {
    if (frameOffsetPx > 0) {
      const fullH = canvasH + frameOffsetPx;
      camera.setViewOffset(canvasW, fullH, 0, frameOffsetPx, canvasW, canvasH);
      // aspect tracks the FULL virtual viewport (three.js scales width/height
      // by view.width/fullWidth & view.height/fullHeight in its projection),
      // so we set aspect = canvasW / fullH to keep the rendered slice from
      // stretching the image.
      camera.aspect = canvasW / fullH;
    } else {
      camera.clearViewOffset();
      camera.aspect = canvasW / canvasH;
    }
    camera.updateProjectionMatrix();
  }
  function resize() {
    const r = container.getBoundingClientRect();
    canvasW = Math.max(2, Math.floor(r.width));
    canvasH = Math.max(2, Math.floor(r.height));
    renderer.setSize(canvasW, canvasH, false);
    applyView();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  window.addEventListener('orientationchange', () => setTimeout(resize, 250));
  resize();

  // ----- Loop -----
  let running = true;
  const ticks = [];
  let lastTime = performance.now();
  function loop() {
    if (!running) return;
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    for (const t of ticks) t(dt);
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // ----- Camera focus helper -----
  // camEndOverride: optional THREE.Vector3 placing the camera at an exact
  // world position at the end of the animation (used for parts like wheels
  // that need a specific front-and-low angle).
  function focusOn(target, distance = 6, duration = 0.7, camEndOverride = null) {
    const start  = controls.target.clone();
    const end    = target.clone();
    const camStart = camera.position.clone();
    let camEnd;
    if (camEndOverride) {
      camEnd = camEndOverride.clone();
    } else {
      const offset = camStart.clone().sub(start);
      if (offset.length() < 0.001) offset.set(distance, distance * 0.6, distance);
      offset.normalize().multiplyScalar(distance);
      camEnd = end.clone().add(offset);
    }
    const t0 = performance.now();
    const animate = () => {
      const t = Math.min(1, (performance.now() - t0) / (duration * 1000));
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      controls.target.lerpVectors(start, end, e);
      camera.position.lerpVectors(camStart, camEnd, e);
      if (t < 1) requestAnimationFrame(animate);
    };
    animate();
  }

  return {
    scene, camera, renderer, controls,
    addTick(fn) { ticks.push(fn); return () => { const i = ticks.indexOf(fn); if (i>=0) ticks.splice(i,1); }; },
    dispose() {
      running = false;
      ro.disconnect();
      renderer.dispose();
      controls.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    },
    focusOn,
    resize,
    setFrameOffsetPx,
  };
}
