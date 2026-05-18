import * as THREE from 'three';
import { el, slider } from '../ui/controls.js';
import { ForceArrow } from '../scene/forceVectors.js';

/**
 * Module 3 — A rotor blade IS a wing (now with all 4 blades).
 *
 * Camera looks at the rotor disc from above & to the right. All four blades
 * spin at a gentle default (10 RPM). The user controls collective pitch and
 * rotor RPM; the lift vector points straight up and its SIZE scales with
 * pitch × RPM² (lift ∝ v² × CL).
 */
export async function module3(ctx) {
  const { scene, helicopter, controls, camera, controlsHost, addTick, env } = ctx;

  env.setMode('ground');
  helicopter.root.visible = true;
  helicopter.resetToRest();
  helicopter.setMainRpm(10);            // default 10 RPM
  helicopter.setCollective(0);
  helicopter.setCyclic(0, 0);
  helicopter.setTailRpm(0);
  helicopter.setSoloBladePitch(null);

  // Frame the rotor from above and to the right
  const rotor = helicopter.getRotorWorldPos(new THREE.Vector3());
  camera.position.copy(rotor).add(new THREE.Vector3(8, 6, 6));
  controls.target.copy(rotor);

  const stt = {
    rpm: 10,
    pitchDeg: 0,
  };
  const STALL = 16;

  // Single vertical lift arrow whose magnitude scales with pitch × RPM²
  const liftArrow = new ForceArrow({ color: 0x4fc3f7, label: 'Lift', scene, lengthScale: 1.0 });

  function updateLift() {
    const pitchFrac = Math.max(0, stt.pitchDeg) / 22;       // 0…1
    const rpmFrac   = Math.max(0, stt.rpm) / 500;           // 0…1
    // Blend linear and v² so the arrow is visible even at 10 RPM yet still
    // grows aggressively with airspeed (lift ∝ v² × CL).
    const liftIdx = pitchFrac * (rpmFrac * 0.35 + rpmFrac * rpmFrac * 0.65);
    const mag = 0.15 + liftIdx * 5.5;
    const dir = new THREE.Vector3(0, 1, 0);    // always straight up
    liftArrow.set(rotor.clone().add(new THREE.Vector3(0, 0.4, 0)), dir, mag);
    liftArrow.setVisible(stt.rpm > 0.5 && stt.pitchDeg > 0.1);
  }
  updateLift();

  const tickHandle = addTick(() => {
    helicopter.setMainRpm(stt.rpm);
    helicopter.setCollective(stt.pitchDeg * Math.PI / 180);
    updateLift();
  });

  // ---- Controls ----
  const rpmSlider = slider({
    label: 'Rotor RPM', min: 0, max: 500, step: 5, value: stt.rpm,
    formatter: v => `${v.toFixed(0)} RPM`,
    onInput: v => { stt.rpm = v; }
  });
  const pitchSlider = slider({
    label: 'Blade pitch (collective)', min: 0, max: 22, step: 0.5, value: stt.pitchDeg, unit: '°',
    onInput: v => { stt.pitchDeg = v; }
  });

  const note = el('div', {
    style: {
      fontSize: '11px',
      color: 'var(--ink-dim)',
      maxWidth: '300px',
      textAlign: 'center',
      fontStyle: 'italic',
      lineHeight: '1.5',
      letterSpacing: '0.2px',
    }
  }, 'More RPM = more airspeed over each blade — and lift grows with the square of speed.');

  controlsHost.appendChild(el('div', { class: 'group wide' }, rpmSlider.el));
  controlsHost.appendChild(el('div', { class: 'group wide' }, pitchSlider.el));
  controlsHost.appendChild(note);

  return {
    teardown() {
      tickHandle();
      liftArrow.dispose();
      helicopter.setMainRpm(0);
      helicopter.setCollective(0);
    }
  };
}
