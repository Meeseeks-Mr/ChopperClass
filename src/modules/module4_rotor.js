import * as THREE from 'three';
import { el, slider, button } from '../ui/controls.js';
import { ForceArrow } from '../scene/forceVectors.js';

/**
 * Module 4 — Spinning Rotor → Lift.
 * Helicopter sits on the helipad. RPM slider really spins the rotor + blades
 * (driven by the calibration's main rotor + per-blade spin). Collective
 * slider really tilts all four blades around their per-blade pitch axes.
 * Lift/weight arrows show the force balance; the heli lifts off the pad
 * when lift exceeds weight.
 */
export async function module4(ctx) {
  const { scene, helicopter, controls, camera, controlsHost, addTick, env, focusOn } = ctx;
  env.setMode('ground');

  helicopter.root.visible = true;
  helicopter.resetToRest();
  helicopter.setMainRpm(0);
  helicopter.setCollective(0);
  helicopter.setCyclic(0, 0);
  helicopter.setTailRpm(0);
  helicopter.clearHighlights();

  camera.position.set(9, 5, 13);
  controls.target.set(0, 2.5, 0);
  focusOn(new THREE.Vector3(0, 2.5, 0), 12, 0.6);

  const state = {
    rpm: 0,
    collectiveDeg: 0,
    weight: 1.0,
  };

  const liftArrow = new ForceArrow({ color: 0x4fc3f7, label: 'Lift',  scene, lengthScale: 1.0 });
  const wtArrow   = new ForceArrow({ color: 0xffb74d, label: 'Weight', scene, lengthScale: 1.0 });

  function liftMagnitude() {
    const omega = state.rpm / 60 * Math.PI * 2;
    const tipSpeed = omega * 6;
    const pitchRad = state.collectiveDeg * Math.PI / 180;
    let CL = pitchRad / (16 * Math.PI / 180) * 1.2;
    if (Math.abs(state.collectiveDeg) > 16) {
      CL = Math.sign(CL) * Math.max(0.2, 1.2 - (Math.abs(state.collectiveDeg) - 16) * 0.07);
    }
    return 0.0006 * tipSpeed * tipSpeed * CL;
  }

  const dyn = { y: 0, vy: 0 };
  const MAX_Y = 6;        // soft ceiling in display units
  const ACCEL = 1.2;      // gentler than the old 4× coupling
  const VEL_DAMP = 0.92;
  const VY_CAP = 2.2;     // max climb rate

  const tickHandle = addTick((dt) => {
    helicopter.setMainRpm(state.rpm);
    helicopter.setCollective(state.collectiveDeg * Math.PI / 180);

    const lift = liftMagnitude();
    const net  = lift - state.weight;
    dyn.vy += net * ACCEL * dt;
    dyn.vy *= VEL_DAMP;
    dyn.vy = Math.max(-VY_CAP, Math.min(VY_CAP, dyn.vy));
    dyn.y  += dyn.vy * dt;
    if (dyn.y < 0)     { dyn.y = 0;     if (dyn.vy < 0) dyn.vy = 0; }
    if (dyn.y > MAX_Y) { dyn.y = MAX_Y; if (dyn.vy > 0) dyn.vy = 0; }
    helicopter.root.position.y = helicopter.restY() + dyn.y * 1.6;

    const rotor = helicopter.getRotorWorldPos(new THREE.Vector3());
    const cgPos = new THREE.Vector3(rotor.x, helicopter.root.position.y + 0.7, rotor.z);
    liftArrow.set(rotor.clone().add(new THREE.Vector3(0, 0.2, 0)),
                  new THREE.Vector3(0, 1, 0),
                  Math.max(0.2, lift * 3));
    liftArrow.setVisible(state.rpm > 1);
    wtArrow.set(cgPos, new THREE.Vector3(0, -1, 0), state.weight * 3);
  });

  const rpmSlider = slider({
    label: 'Main rotor RPM', min: 0, max: 500, step: 5, value: state.rpm,
    formatter: v => `${v.toFixed(0)} RPM`,
    onInput: v => { state.rpm = v; },
  });
  const pitchSlider = slider({
    label: 'Collective pitch', min: 0, max: 22, step: 0.5, value: state.collectiveDeg, unit: '°',
    onInput: v => { state.collectiveDeg = v; },
  });
  const idleBtn = button({ label: 'Idle', onClick: () => { rpmSlider.setValue(120); state.rpm = 120; }});
  const cruiseBtn = button({ label: 'Cruise', primary: true, onClick: () => {
    rpmSlider.setValue(360); state.rpm = 360;
    pitchSlider.setValue(6);  state.collectiveDeg = 6;
  }});
  const stopBtn = button({ label: 'Stop', onClick: () => {
    rpmSlider.setValue(0); state.rpm = 0;
    pitchSlider.setValue(0); state.collectiveDeg = 0;
  }});

  controlsHost.appendChild(el('div', { class: 'group' }, rpmSlider.el));
  controlsHost.appendChild(el('div', { class: 'group' }, pitchSlider.el));
  controlsHost.appendChild(el('div', { class: 'row' }, stopBtn, idleBtn, cruiseBtn));

  return {
    teardown() {
      tickHandle();
      liftArrow.dispose();
      wtArrow.dispose();
      helicopter.resetToRest();
      helicopter.setMainRpm(0);
      helicopter.setCollective(0);
    }
  };
}
