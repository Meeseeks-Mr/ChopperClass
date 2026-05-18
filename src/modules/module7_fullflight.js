import * as THREE from 'three';
import { el, joystick, slider, button } from '../ui/controls.js';
import { ForceArrow } from '../scene/forceVectors.js';

/**
 * Module 7 — Full Flight (6DOF).
 * Cyclic + collective + pedals + tail rotor. Free flight in the sky. Force
 * vectors show what's pulling/pushing the helicopter; camera chases gently.
 */
export async function module7(ctx) {
  const { scene, helicopter, controls, camera, controlsHost, addTick, env } = ctx;
  env.setMode('sky');

  const skyY = helicopter.restY() + 6;
  helicopter.root.position.set(0, skyY, 0);
  // Pulled ~25% further out — give force vectors room to live alongside the
  // body without crowding on portrait phones.
  camera.position.set(19, skyY + 5, 23);
  controls.target.set(0, skyY, 0);

  const state = {
    rpm: 380,
    collective: 7 * Math.PI / 180,
    cyclicFwd: 0,
    cyclicLat: 0,
    pedal: 0,
    tailHover: 1500,
    pos: new THREE.Vector3(0, skyY, 0),
    vel: new THREE.Vector3(),
    yaw: 0,
    yawRate: 0,
    pitch: 0, roll: 0,
  };
  helicopter.setMainRpm(state.rpm);
  helicopter.setCollective(state.collective);

  const liftArrow   = new ForceArrow({ color: 0x4fc3f7, label: 'Lift',   scene });
  const wtArrow     = new ForceArrow({ color: 0xffb74d, label: 'Weight', scene });
  const thrustArrow = new ForceArrow({ color: 0x9575cd, label: 'Thrust', scene });

  const tickHandle = addTick((dt) => {
    const maxTilt = 18 * Math.PI / 180;
    const targetPitch = state.cyclicFwd * maxTilt;
    const targetRoll  = -state.cyclicLat * maxTilt;
    state.pitch += (targetPitch - state.pitch) * Math.min(1, dt * 4);
    state.roll  += (targetRoll  - state.roll)  * Math.min(1, dt * 4);

    const tailRpm = state.tailHover + state.pedal * 700;
    helicopter.setTailRpm(tailRpm);
    helicopter.setMainRpm(state.rpm);
    helicopter.setCollective(state.collective);
    helicopter.setCyclic(state.cyclicFwd * 6 * Math.PI / 180, state.cyclicLat * 6 * Math.PI / 180);

    const Tbody = 1.0;
    const Ttail = (tailRpm / 1500) * (tailRpm / 1500);
    const yawAccel = (Ttail - Tbody) * 1.5;
    state.yawRate += yawAccel * dt;
    state.yawRate *= 0.94;
    state.yaw += state.yawRate * dt;

    helicopter.root.rotation.set(state.pitch, state.yaw, state.roll, 'YXZ');

    const liftDir = new THREE.Vector3(0, 1, 0)
      .applyEuler(new THREE.Euler(state.pitch, state.yaw, state.roll, 'YXZ'));
    const pitchDeg = state.collective * 180 / Math.PI;
    let CL = pitchDeg / 14 * 1.2;
    if (Math.abs(pitchDeg) > 16) CL = Math.sign(CL) * Math.max(0.2, 1.2 - (Math.abs(pitchDeg) - 16) * 0.07);
    const liftMag = CL * (state.rpm / 380) * (state.rpm / 380);

    const grav = new THREE.Vector3(0, -1, 0);
    const accel = grav.clone().add(liftDir.clone().multiplyScalar(liftMag));
    accel.add(state.vel.clone().multiplyScalar(-0.35));
    state.vel.add(accel.clone().multiplyScalar(dt * 2.5));
    state.pos.add(state.vel.clone().multiplyScalar(dt * 4));
    state.pos.y = THREE.MathUtils.clamp(state.pos.y, helicopter.restY() + 0.5, helicopter.restY() + 38);
    helicopter.root.position.copy(state.pos);

    const desired = state.pos.clone();
    controls.target.lerp(desired, 0.04);
    const off = camera.position.clone().sub(desired);
    if (off.length() < 6)  off.setLength(12);
    if (off.length() > 30) off.setLength(20);
    camera.position.lerp(desired.clone().add(off), 0.02);

    const rotor = helicopter.getRotorWorldPos(new THREE.Vector3());
    liftArrow.set(rotor.clone().add(new THREE.Vector3(0, 0.2, 0)), liftDir, Math.max(0.3, liftMag * 2.5));
    wtArrow.set(state.pos.clone().add(new THREE.Vector3(0, 0.1, 0)), new THREE.Vector3(0, -1, 0), 1.6);
    const horiz = liftDir.clone(); horiz.y = 0;
    const horizMag = horiz.length();
    if (horizMag > 0.02) {
      thrustArrow.set(state.pos.clone().add(new THREE.Vector3(0, 0.6, 0)), horiz.normalize(), horizMag * 2.5);
      thrustArrow.setVisible(true);
    } else {
      thrustArrow.setVisible(false);
    }
  });

  // ----- Controls (compact, side-by-side, centered) -----
  // Cyclic forward sign: see module5 explanation. y-direct gives correct
  // forward flight on this model (nose along -Z).
  const cyc = joystick({
    size: 116,
    caption: 'Cyclic',
    onMove: ({ x, y }) => { state.cyclicLat = x; state.cyclicFwd = y; }
  });
  const ped = joystick({
    size: 116,
    caption: 'Pedals',
    labels: { top: false, bottom: false },
    onMove: ({ x }) => { state.pedal = x; }
  });
  const collSl = slider({
    label: 'Collective', min: 0, max: 18, step: 0.5, value: 7, unit: '°',
    onInput: v => { state.collective = v * Math.PI / 180; }
  });
  const rpmSl = slider({
    label: 'Main RPM', min: 200, max: 500, step: 5, value: state.rpm,
    formatter: v => `${v.toFixed(0)} RPM`,
    onInput: v => { state.rpm = v; }
  });
  const reset = button({ label: 'Reset', onClick: () => {
    state.pos.set(0, skyY, 0);
    state.vel.set(0, 0, 0);
    state.yaw = 0; state.yawRate = 0; state.pitch = 0; state.roll = 0;
    cyc.reset(); ped.reset();
  }});

  controlsHost.appendChild(el('div', { class: 'row' }, cyc.el, ped.el));
  controlsHost.appendChild(el('div', { class: 'row' },
    el('div', { class: 'group wide' }, collSl.el),
    el('div', { class: 'group wide' }, rpmSl.el),
  ));
  controlsHost.appendChild(el('div', { class: 'row' }, reset));

  return {
    teardown() {
      tickHandle();
      liftArrow.dispose(); wtArrow.dispose(); thrustArrow.dispose();
      helicopter.resetToRest();
      helicopter.setMainRpm(0);
      helicopter.setCollective(0);
      helicopter.setCyclic(0, 0);
      helicopter.setTailRpm(0);
    }
  };
}
