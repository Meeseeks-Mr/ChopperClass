import * as THREE from 'three';
import { el, joystick, slider } from '../ui/controls.js';
import { ForceArrow } from '../scene/forceVectors.js';

/**
 * Module 5 — Cyclic Pitch & Directional Flight.
 * Helicopter hovers in the sky. Joystick tilts the rotor disc, body tilts
 * with it, the horizontal lift component pushes the heli that way.
 */
export async function module5(ctx) {
  const { scene, helicopter, controls, camera, controlsHost, addTick, env } = ctx;
  env.setMode('sky');

  const skyY = helicopter.restY() + 6;
  helicopter.root.position.set(0, skyY, 0);
  // Pulled ~25% further out so the lift-tilt and trail read well on mobile.
  camera.position.set(18, skyY + 3, 23);
  controls.target.set(0, skyY, 0);

  const state = {
    cyclicFwd: 0,
    cyclicLat: 0,
    speed: new THREE.Vector3(),
    pos: new THREE.Vector3(0, skyY, 0),
    yaw: 0,
  };
  helicopter.setMainRpm(380);
  helicopter.setCollective(7 * Math.PI / 180);

  const liftArrow  = new ForceArrow({ color: 0x4fc3f7, label: 'Lift',   scene, lengthScale: 1.0 });
  const horizArrow = new ForceArrow({ color: 0x9575cd, label: 'Thrust', scene, lengthScale: 1.0 });
  const wtArrow    = new ForceArrow({ color: 0xffb74d, label: 'Weight', scene, lengthScale: 1.0 });

  // Wind streaks behind the heli
  const trailGeo = new THREE.BufferGeometry();
  const TRAIL = 80;
  const trailPos = new Float32Array(TRAIL * 3);
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
  const trailMat = new THREE.LineBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.35 });
  const trail = new THREE.Line(trailGeo, trailMat);
  scene.add(trail);
  const trailPoints = [];

  const tickHandle = addTick((dt) => {
    const maxTiltDeg = 16;
    const tiltFwdRad = state.cyclicFwd * maxTiltDeg * Math.PI / 180;
    const tiltLatRad = state.cyclicLat * maxTiltDeg * Math.PI / 180;
    helicopter.setCyclic(state.cyclicFwd * 6 * Math.PI / 180, state.cyclicLat * 6 * Math.PI / 180);
    helicopter.root.rotation.set(tiltFwdRad, state.yaw, -tiltLatRad);

    const liftMag = 1.0;
    const liftDir = new THREE.Vector3(0, 1, 0)
      .applyEuler(new THREE.Euler(tiltFwdRad, state.yaw, -tiltLatRad));
    const horiz = liftDir.clone();
    horiz.y = 0;
    const horizMag = horiz.length();

    const accel = new THREE.Vector3(0, -1, 0);
    accel.add(liftDir.clone().multiplyScalar(liftMag));
    accel.add(state.speed.clone().multiplyScalar(-0.4));
    state.speed.add(accel.clone().multiplyScalar(dt * 2.5));
    state.pos.add(state.speed.clone().multiplyScalar(dt * 4));
    state.pos.y = THREE.MathUtils.clamp(state.pos.y, helicopter.restY() + 1, helicopter.restY() + 26);
    helicopter.root.position.copy(state.pos);

    controls.target.lerp(state.pos.clone(), 0.05);

    trailPoints.unshift(state.pos.clone());
    if (trailPoints.length > TRAIL) trailPoints.length = TRAIL;
    for (let i = 0; i < TRAIL; i++) {
      const p = trailPoints[i] || trailPoints[trailPoints.length - 1];
      trailPos[i * 3] = p.x; trailPos[i * 3 + 1] = p.y - 0.6; trailPos[i * 3 + 2] = p.z;
    }
    trailGeo.attributes.position.needsUpdate = true;

    const rotorPos = helicopter.getRotorWorldPos(new THREE.Vector3());
    const heli = helicopter.root.position;
    liftArrow.set(rotorPos.clone().add(new THREE.Vector3(0, 0.3, 0)), liftDir.clone(), 3);
    horizArrow.set(heli.clone().add(new THREE.Vector3(0, 0.5, 0)),
                   horiz.length() > 0.001 ? horiz.clone().normalize() : new THREE.Vector3(1, 0, 0),
                   Math.max(0.001, horizMag * 3));
    horizArrow.setVisible(horizMag > 0.02);
    wtArrow.set(heli.clone().add(new THREE.Vector3(0, 0.1, 0)), new THREE.Vector3(0, -1, 0), 1.6);
  });

  // ----- Controls (compact, centered) -----
  // y axis: pushing joystick UP on screen → dy < 0 → y < 0. On this model
  // (nose along -Z), forward flight needs the lift vector to tilt toward
  // -Z, which requires tiltFwdRad NEGATIVE. So cyclicFwd takes y *directly*
  // (joystick up → y<0 → cyclicFwd<0 → tiltFwdRad<0 → forward motion).
  const cyc = joystick({
    size: 120,
    caption: 'Cyclic',
    onMove: ({ x, y }) => { state.cyclicLat = x; state.cyclicFwd = y; }
  });
  const yawSlider = slider({
    label: 'Yaw', min: -180, max: 180, step: 1, value: 0, unit: '°',
    onInput: v => { state.yaw = v * Math.PI / 180; }
  });
  controlsHost.appendChild(el('div', { class: 'row' }, cyc.el));
  controlsHost.appendChild(el('div', { class: 'group' }, yawSlider.el));

  return {
    teardown() {
      tickHandle();
      liftArrow.dispose(); horizArrow.dispose(); wtArrow.dispose();
      scene.remove(trail); trailGeo.dispose(); trailMat.dispose();
      helicopter.resetToRest();
      helicopter.setMainRpm(0);
      helicopter.setCollective(0);
      helicopter.setCyclic(0, 0);
    }
  };
}
