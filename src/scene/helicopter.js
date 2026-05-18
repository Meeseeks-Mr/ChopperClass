import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const MODEL_GLB = './models/oh1.glb';
const CALIBRATION_JSON = './calibration.json';

/**
 * Loads the OH-1 helicopter using calibration.json as the source of truth for
 * placement, axes, pivots, and ranges. The calibration tool produced this file
 * by aligning the model in 3D; we just apply it here.
 */
export async function loadHelicopter(scene) {
  const root = new THREE.Group();
  root.name = 'HelicopterRoot';
  scene.add(root);

  const [gltf, cfg] = await Promise.all([
    new Promise((res, rej) => new GLTFLoader().load(MODEL_GLB, res, undefined, rej)),
    fetch(CALIBRATION_JSON).then(r => r.json()),
  ]);
  const model = gltf.scene;
  root.add(model);

  // --- 1. Apply rootOffset from calibration ---------------------------------
  if (cfg.rootOffset) {
    if (cfg.rootOffset.position)   root.position.fromArray(cfg.rootOffset.position);
    if (cfg.rootOffset.quaternion) root.quaternion.fromArray(cfg.rootOffset.quaternion);
    if (cfg.rootOffset.scale)      root.scale.fromArray(cfg.rootOffset.scale);
  }

  // --- 2. Save geometry bounds BEFORE defanging --------------------------
  // computeBoundingBox at the Mesh level crashes on the Unity export's
  // broken-skin SkinnedMeshes, but computing it at the Geometry level just
  // walks the position buffer — safe for both regular and skinned meshes.
  // We capture them now so we can later (a) defang the SkinnedMesh runtime
  // bounds and (b) still compute a true world bbox for ground snap.
  const allMeshes = [];
  const realGeoBoxes = new WeakMap();
  model.traverse(o => {
    if (!o.isMesh || !o.geometry) return;
    allMeshes.push(o);
    try {
      o.geometry.computeBoundingBox();
      if (o.geometry.boundingBox && isFinite(o.geometry.boundingBox.min.x)) {
        realGeoBoxes.set(o, o.geometry.boundingBox.clone());
      }
    } catch (_) {}
  });

  // --- 3. Build a name → node map and apply nodeOverrides -------------------
  const nodesByName = new Map();
  model.traverse(o => { if (o.name) nodesByName.set(o.name, o); });
  for (const [name, ovr] of Object.entries(cfg.nodeOverrides || {})) {
    const n = nodesByName.get(name);
    if (!n) continue;
    if (ovr.position)   n.position.fromArray(ovr.position);
    if (ovr.quaternion) n.quaternion.fromArray(ovr.quaternion);
    if (ovr.scale)      n.scale.fromArray(ovr.scale);
  }

  // --- 3b. Ground snap: compute the TRUE world bbox using the saved real
  // geometry bounds (skinned meshes included), then move the helicopter so
  // its bottom sits exactly on y=0. The calibration's rootOffset.y is taken
  // as a hint, but we re-snap here to guarantee no part of the model is
  // buried below the ground regardless of cal-tool/main-app bbox drift.
  root.updateMatrixWorld(true);
  const fullBox = new THREE.Box3(); fullBox.makeEmpty();
  const tmpBox = new THREE.Box3();
  for (const m of allMeshes) {
    const geoBB = realGeoBoxes.get(m);
    if (!geoBB) continue;
    tmpBox.copy(geoBB).applyMatrix4(m.matrixWorld);
    if (isFinite(tmpBox.min.x) && isFinite(tmpBox.max.x)) fullBox.union(tmpBox);
  }
  if (isFinite(fullBox.min.y)) {
    root.position.y -= fullBox.min.y;
  }
  root.updateMatrixWorld(true);

  // Remember the resting transform so lesson transitions don't accidentally
  // bury the helicopter when they reset position back to identity.
  const restPos = root.position.clone();
  const restQuat = root.quaternion.clone();

  // --- 4. NOW make meshes shadowy + defang skinned --------------------------
  const safeBox = new THREE.Box3(new THREE.Vector3(-50, -50, -50), new THREE.Vector3(50, 50, 50));
  const safeSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 200);
  model.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    try { o.geometry?.computeVertexNormals(); } catch (_) {}

    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m, idx) => {
      if (!m) return;
      let replacement = null;
      if (m.isMeshBasicMaterial) {
        replacement = new THREE.MeshStandardMaterial({
          color: m.color ? m.color.clone() : new THREE.Color(0x9aa3b2),
          roughness: 0.55, metalness: 0.18,
        });
      }
      const target = replacement || m;
      target.flatShading = false;
      target.needsUpdate = true;
      if (replacement) {
        if (Array.isArray(o.material)) o.material[idx] = replacement;
        else o.material = replacement;
      }
    });

    if (o.isSkinnedMesh) {
      o.frustumCulled = false;
      o.boundingBox = safeBox.clone();
      o.boundingSphere = safeSphere.clone();
      o.geometry.boundingBox = safeBox.clone();
      o.geometry.boundingSphere = safeSphere.clone();
      o.computeBoundingBox = function() { this.boundingBox = safeBox.clone(); };
      o.computeBoundingSphere = function() { this.boundingSphere = safeSphere.clone(); };
      o.geometry.computeBoundingBox = function() { this.boundingBox = safeBox.clone(); };
      o.geometry.computeBoundingSphere = function() { this.boundingSphere = safeSphere.clone(); };
    }
  });

  // --- 4. Resolve roles from calibration ------------------------------------
  const roles = cfg.roles || {};
  const baselineOf = (o) => ({
    position:   o.position.clone(),
    quaternion: o.quaternion.clone(),
  });

  // Main rotor (hub/mast assembly that spins)
  let mainCfg = null;
  if (roles.mainRotor?.nodeName && nodesByName.has(roles.mainRotor.nodeName)) {
    const node = nodesByName.get(roles.mainRotor.nodeName);
    mainCfg = {
      node,
      baseline: baselineOf(node),
      spinAxis: new THREE.Vector3().fromArray(roles.mainRotor.spinAxis || [0, 1, 0]).normalize(),
      spinSign: roles.mainRotor.spinSign ?? 1,
      pivot:    new THREE.Vector3().fromArray(roles.mainRotor.pivot || [0, 0, 0]),
    };
  }

  // Blades
  const blades = (roles.blades || [])
    .filter(b => nodesByName.has(b.nodeName))
    .map((b) => {
      const node = nodesByName.get(b.nodeName);
      const pivot = new THREE.Vector3().fromArray(b.pivot || [0, 0, 0]);
      const baseline = baselineOf(node);
      // Compute baseline azimuth from blade position relative to pivot — used
      // for cyclic phase. atan2(x - pivot.x, z - pivot.z) keeps +Z = 0°.
      const dx = baseline.position.x - pivot.x;
      const dz = baseline.position.z - pivot.z;
      return {
        node,
        baseline,
        pivot,
        spinAxis:    new THREE.Vector3().fromArray(b.spinAxis  || [0, 1, 0]).normalize(),
        spinSign:    b.spinSign ?? 1,
        pitchAxis:   new THREE.Vector3().fromArray(b.pitchAxis || [1, 0, 0]).normalize(),
        pitchMinDeg: b.pitchMinDeg ?? -10,
        pitchMaxDeg: b.pitchMaxDeg ?? 25,
        azimuth0:    Math.atan2(dx, dz),  // baseline azimuth angle in rad
      };
    });

  // Tail rotor — role may be null but a node override often exists.
  // If no calibration data is provided, auto-detect the spin axis: the tail
  // rotor disc lies in a vertical plane perpendicular to the helicopter's
  // lateral axis, so its spin axis is the helicopter body's local X. We pick
  // whichever of the node's three local axes (after parent transforms) maps
  // closest to the heli body's X axis in world space.
  let tailCfg = null;
  const tailRotorNode =
    (roles.tailRotor?.nodeName && nodesByName.get(roles.tailRotor.nodeName)) ||
    nodesByName.get('Tail_Rotor') ||
    nodesByName.get('TailRotor') ||
    nodesByName.get('tail_rotor');
  if (tailRotorNode) {
    let spinAxis;
    if (roles.tailRotor?.spinAxis) {
      spinAxis = new THREE.Vector3().fromArray(roles.tailRotor.spinAxis).normalize();
    } else {
      // World-X of helicopter root (lateral)
      tailRotorNode.updateWorldMatrix(true, false);
      const heliRight = new THREE.Vector3(1, 0, 0).applyQuaternion(root.quaternion).normalize();
      // Compare the node's three local axes (in world) and pick the closest
      const localAxes = [
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, 0, 1),
      ];
      const parentQuat = new THREE.Quaternion();
      tailRotorNode.parent?.getWorldQuaternion(parentQuat);
      const fullQ = parentQuat.clone().multiply(tailRotorNode.quaternion);
      let best = localAxes[0], bestDot = -Infinity;
      for (const ax of localAxes) {
        const worldAx = ax.clone().applyQuaternion(fullQ);
        const d = Math.abs(worldAx.dot(heliRight));
        if (d > bestDot) { bestDot = d; best = ax; }
      }
      // sign: align positive world direction with heli right
      const worldAx = best.clone().applyQuaternion(fullQ);
      const sign = Math.sign(worldAx.dot(heliRight)) || 1;
      spinAxis = best.clone().multiplyScalar(sign);
    }
    tailCfg = {
      node: tailRotorNode,
      baseline: baselineOf(tailRotorNode),
      spinAxis,
      spinSign: roles.tailRotor?.spinSign ?? 1,
      pivot:    new THREE.Vector3().fromArray(roles.tailRotor?.pivot || [0, 0, 0]),
    };
    console.log('[tailRotor] axis =', tailCfg.spinAxis.toArray().map(v => v.toFixed(2)));
  }

  // --- 5. Rig state machinery -----------------------------------------------
  const state = {
    spinAngle: 0, spinRpm: 0,
    collective: 0,                  // radians
    cyclicFwd: 0, cyclicLat: 0,     // radians of additional pitch amplitude
    tailSpinAngle: 0, tailRpm: 0,
    bladePitchOverride: null,       // {idx, deg} → single-blade demo
  };

  function setMainRpm(rpm)        { state.spinRpm = rpm; }
  function setCollective(rad)     { state.collective = rad; }
  function setCyclic(fwd, lat)    { state.cyclicFwd = fwd; state.cyclicLat = lat; }
  function setTailRpm(rpm)        { state.tailRpm = rpm; }
  function setSoloBladePitch(idx, deg) { state.bladePitchOverride = (idx == null) ? null : { idx, deg }; }

  // Compose blade transform = (parent-frame spin) ∘ (local-frame pitch) ∘ baseline
  function applyBlade(b, i) {
    const azimuth = b.azimuth0 + state.spinAngle * b.spinSign;
    let pitchRad;
    if (state.bladePitchOverride && state.bladePitchOverride.idx === i) {
      pitchRad = state.bladePitchOverride.deg * Math.PI / 180;
    } else {
      const cyc = state.cyclicFwd * Math.sin(azimuth) + state.cyclicLat * Math.cos(azimuth);
      pitchRad = state.collective + cyc;
    }

    // R_pitch in local frame (post-multiplied onto baseline quaternion)
    const axL = b.pitchAxis;
    const Rl = new THREE.Quaternion().setFromAxisAngle(axL, pitchRad);
    // R_pitch in parent frame (used for position rotation around pivot)
    const axP = axL.clone().applyQuaternion(b.baseline.quaternion).normalize();
    const Rp = new THREE.Quaternion().setFromAxisAngle(axP, pitchRad);

    // Pitched intermediate
    const pitchedQ = b.baseline.quaternion.clone().multiply(Rl);
    const pitchedPos = b.baseline.position.clone().sub(b.pivot).applyQuaternion(Rp).add(b.pivot);

    // Then spin around pivot in parent frame
    const Rspin = new THREE.Quaternion().setFromAxisAngle(b.spinAxis, state.spinAngle * b.spinSign);
    b.node.quaternion.copy(Rspin).multiply(pitchedQ);
    b.node.position.copy(pitchedPos).sub(b.pivot).applyQuaternion(Rspin).add(b.pivot);
  }

  // Both main and tail rotors spin in place — the GLB node origin IS the hub
  // (per calibration). We only rotate the quaternion; the node's translation
  // stays at its calibrated baseline. Translating with a pivot would orbit
  // the whole rotor around an arbitrary point (bug: tail rotor flew up).
  function applyMain() {
    if (!mainCfg) return;
    const R = new THREE.Quaternion().setFromAxisAngle(mainCfg.spinAxis, state.spinAngle * mainCfg.spinSign);
    mainCfg.node.quaternion.copy(R).multiply(mainCfg.baseline.quaternion);
    mainCfg.node.position.copy(mainCfg.baseline.position);
  }

  function applyTail() {
    if (!tailCfg) return;
    const R = new THREE.Quaternion().setFromAxisAngle(tailCfg.spinAxis, state.tailSpinAngle * tailCfg.spinSign);
    tailCfg.node.quaternion.copy(R).multiply(tailCfg.baseline.quaternion);
    tailCfg.node.position.copy(tailCfg.baseline.position);
  }

  function updateRig(dt) {
    state.spinAngle     += state.spinRpm * (Math.PI * 2 / 60) * dt;
    state.tailSpinAngle += state.tailRpm * (Math.PI * 2 / 60) * dt;
    applyMain();
    blades.forEach((b, i) => applyBlade(b, i));
    applyTail();
  }

  // --- 6. World-space helpers ----------------------------------------------
  function getRotorWorldPos(out = new THREE.Vector3()) {
    if (blades.length) {
      const parent = blades[0].node.parent;
      parent.updateMatrixWorld(true);
      out.copy(blades[0].pivot).applyMatrix4(parent.matrixWorld);
    } else if (mainCfg) {
      mainCfg.node.updateWorldMatrix(true, false);
      out.setFromMatrixPosition(mainCfg.node.matrixWorld);
    } else {
      out.set(0, 3, 0);
    }
    return out;
  }

  function getTailRotorWorldPos(out = new THREE.Vector3()) {
    if (tailCfg) {
      tailCfg.node.updateWorldMatrix(true, false);
      out.setFromMatrixPosition(tailCfg.node.matrixWorld);
    } else out.set(0, 2, -4);
    return out;
  }

  function getBladeWorldPos(idx, out = new THREE.Vector3()) {
    const b = blades[idx]; if (!b) return out.set(0, 3, 0);
    b.node.updateWorldMatrix(true, false);
    out.setFromMatrixPosition(b.node.matrixWorld);
    return out;
  }

  function setBladesVisible(v)    { blades.forEach(b => b.node.visible = v); }
  function setOnlyBladeVisible(i) { blades.forEach((b, j) => b.node.visible = j === i); }
  function setMainRotorMeshVisible(v) { if (mainCfg) mainCfg.node.visible = v; }
  function setTailRotorVisible(v)     { if (tailCfg) tailCfg.node.visible = v; }

  function resetToRest() {
    root.position.copy(restPos);
    root.quaternion.copy(restQuat);
  }
  function restY() { return restPos.y; }

  // --- 7. Highlight system --------------------------------------------------
  // We keep three highlightable groups: 'rotor' (main rotor+blades), 'tailrotor',
  // 'body' (everything else). Each part in PARTS picks one of these (or none)
  // plus a camera focus point.
  function gatherMeshes(rootNodes) {
    const out = new Set();
    rootNodes.forEach(n => n.traverse(o => { if (o.isMesh) out.add(o); }));
    return out;
  }
  const rotorMeshes = (mainCfg || blades.length)
    ? gatherMeshes([mainCfg?.node, ...blades.map(b => b.node)].filter(Boolean))
    : new Set();
  const tailMeshes = tailCfg ? gatherMeshes([tailCfg.node]) : new Set();
  const bodyMeshes = new Set(allMeshes.filter(m => !rotorMeshes.has(m) && !tailMeshes.has(m)));

  const GROUP_MESHES = { rotor: rotorMeshes, tailrotor: tailMeshes, body: bodyMeshes };

  // Material cache for non-destructive highlight
  const _matCache = new WeakMap();   // mat → original snapshot
  function cache(mat) {
    if (!mat || _matCache.has(mat)) return;
    _matCache.set(mat, {
      emissive:          mat.emissive ? mat.emissive.clone() : null,
      emissiveIntensity: mat.emissiveIntensity ?? 1,
      colorR: mat.color ? mat.color.r : null,
      colorG: mat.color ? mat.color.g : null,
      colorB: mat.color ? mat.color.b : null,
    });
  }
  function restoreAll() {
    for (const m of allMeshes) {
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach(mat => {
        if (!mat || !_matCache.has(mat)) return;
        const s = _matCache.get(mat);
        if (s.emissive && mat.emissive) {
          mat.emissive.copy(s.emissive);
          mat.emissiveIntensity = s.emissiveIntensity;
        }
        if (s.colorR != null && mat.color) mat.color.setRGB(s.colorR, s.colorG, s.colorB);
        _matCache.delete(mat);
      });
    }
  }
  function highlightGroup(group, { color = 0x6ee7ff, intensity = 0.55, dim = 0.5 } = {}) {
    restoreAll();
    const target = GROUP_MESHES[group];
    if (!target) return;
    for (const m of allMeshes) {
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach(mat => {
        if (!mat) return;
        cache(mat);
        if (target.has(m)) {
          if (mat.emissive) { mat.emissive.setHex(color); mat.emissiveIntensity = intensity; }
        } else {
          if (mat.color) mat.color.multiplyScalar(dim);
        }
      });
    }
  }
  function clearHighlights() { restoreAll(); }

  // --- 8. Part registry (for Module 1) --------------------------------------
  // Resolve focus points from world geometry.
  root.updateMatrixWorld(true);
  function worldOfLocal(localVec) {
    // pos in HelicopterRoot's local frame → world
    return localVec.clone().applyMatrix4(root.matrixWorld);
  }

  // Bounding box of the body group (for cabin/skids/tailboom heuristics)
  const bodyBox = new THREE.Box3();
  bodyMeshes.forEach(m => {
    if (!m.geometry?.boundingBox) try { m.geometry?.computeBoundingBox(); } catch (_) {}
    const bb = m.geometry?.boundingBox; if (!bb) return;
    const t = bb.clone().applyMatrix4(m.matrixWorld);
    if (isFinite(t.min.x)) bodyBox.union(t);
  });
  if (bodyBox.isEmpty()) bodyBox.set(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 2, 1));
  const bodyCenter = bodyBox.getCenter(new THREE.Vector3());
  const bodySize   = bodyBox.getSize(new THREE.Vector3());

  const rotorWorld = getRotorWorldPos();
  const tailWorld  = getTailRotorWorldPos();

  // Parts are camera focal points + descriptive entries. We don't try to
  // isolate them with a highlight glow — the model is one welded mesh group
  // in too many places for that to look clean.
  const PARTS = [
    {
      id: 'cabin', label: 'Cabin',
      focus: new THREE.Vector3(bodyCenter.x, bodyCenter.y + bodySize.y * 0.05,
                                bodyCenter.z + bodySize.z * 0.18),
      distance: bodySize.length() * 0.6,
    },
    {
      id: 'rotor', label: 'Main Rotor',
      focus: rotorWorld.clone().add(new THREE.Vector3(0, 0.2, 0)),
      distance: bodySize.length() * 0.55,
    },
    {
      id: 'mast', label: 'Mast & Hub',
      focus: rotorWorld.clone().add(new THREE.Vector3(0, -0.3, 0)),
      distance: bodySize.length() * 0.35,
    },
    {
      id: 'tailboom', label: 'Tail Boom',
      focus: new THREE.Vector3(
        (bodyCenter.x + tailWorld.x) / 2,
        bodyCenter.y + bodySize.y * 0.05,
        (bodyCenter.z + tailWorld.z) / 2),
      distance: bodySize.length() * 0.55,
    },
    {
      id: 'tailrotor', label: 'Tail Rotor',
      focus: tailWorld.clone(),
      distance: bodySize.length() * 0.3,
    },
    {
      // Wheels need a specific front-and-low angle so both the nose wheel
      // and the main wheels are visible at once — preserve-current-angle
      // (the default focusOn behaviour) tends to show the canopy roof instead.
      id: 'wheels', label: 'Wheels',
      focus: new THREE.Vector3(
        bodyCenter.x,
        bodyBox.min.y + bodySize.y * 0.10,
        bodyCenter.z + bodySize.z * 0.05,
      ),
      distance: bodySize.length() * 0.5,
      camPos: new THREE.Vector3(
        bodyCenter.x,
        bodyBox.min.y + bodySize.y * 0.18,
        bodyBox.min.z - bodySize.z * 0.30,
      ),
    },
  ];

  console.group('[loadHelicopter]');
  console.log('rootOffset position:', root.position.toArray().map(v => v.toFixed(3)));
  console.log('main rotor:', mainCfg?.node.name, '| blades:', blades.length, '| tail:', tailCfg?.node.name);
  console.log('body box size:', bodySize.toArray().map(v => v.toFixed(2)), 'centre:', bodyCenter.toArray().map(v => v.toFixed(2)));
  console.groupEnd();

  return {
    root, model, calibration: cfg,
    nodesByName,

    // Main / tail rotor config (for advanced consumers)
    mainCfg, tailCfg, blades,

    // Setters
    setMainRpm, setCollective, setCyclic, setTailRpm, setSoloBladePitch,

    // Per-frame
    updateRig,

    // World-space queries
    getRotorWorldPos, getTailRotorWorldPos, getBladeWorldPos,

    // Visibility
    setBladesVisible, setOnlyBladeVisible, setMainRotorMeshVisible, setTailRotorVisible,

    // Rest pose
    resetToRest, restY,

    // Highlight (still exposed; modules can opt-in, none currently do)
    highlightGroup, clearHighlights, getParts: () => PARTS,

    // State (read-only-ish for HUD displays)
    state,
  };
}
