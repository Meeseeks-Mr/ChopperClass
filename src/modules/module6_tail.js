import * as THREE from 'three';
import { el, slider, button } from '../ui/controls.js';
import { ForceArrow, TorqueArc } from '../scene/forceVectors.js';

/**
 * Module 6 — Tail Rotor & Yaw.
 * Helicopter hovers at low altitude with the main rotor spinning. A pink
 * arc shows the body's reaction torque, a magenta arrow shows the tail
 * rotor's counter-thrust, and a cyan arc shows the resulting yaw — its
 * direction (CW vs CCW) is read from the yaw rate so the reversal past
 * the balanced point (≈1500 RPM) is unambiguous.
 */
export async function module6(ctx) {
  const { scene, helicopter, controls, camera, controlsHost, addTick, env } = ctx;
  env.setMode('sky');

  const skyY = helicopter.restY() + 4;
  helicopter.root.position.set(0, skyY, 0);
  // Pulled further out & up — frames the full airframe + both force arrows
  // generously on mobile.
  camera.position.set(24, skyY + 10, 24);
  controls.target.set(0, skyY + 0.5, 0);

  helicopter.setMainRpm(380);
  helicopter.setCollective(7 * Math.PI / 180);

  const state = {
    tailRpm: 0,
    yawRate: 0,        // current yaw rate (rad/s)
    yaw: 0,            // body yaw (rad), wrapped to [-π, π]
    autoBalance: false,
  };

  const torqueArc = new TorqueArc({ color: 0xf48fb1, radius: 2.5, scene, label: 'Body torque' });
  const tailArrow = new ForceArrow({ color: 0x9575cd, label: 'Tail thrust', scene, lengthScale: 1.0 });
  const yawArc    = new TorqueArc({ color: 0x4fc3f7, radius: 1.8, scene, label: 'Yaw' });

  // ----- Yaw-rate readout chip (in the controls panel) -----
  const yawValEl = el('span', {
    style: {
      fontVariantNumeric: 'tabular-nums',
      background: 'linear-gradient(135deg, var(--sky-soft), var(--lavender-soft))',
      color: '#0b4a78', padding: '2px 9px',
      borderRadius: 'var(--r-pill)',
      fontSize: '11px', fontWeight: '800',
    }
  }, '0 °/s');
  function rateText() {
    const degPerSec = state.yawRate * 180 / Math.PI;
    if (Math.abs(degPerSec) < 1) return 'balanced — no yaw';
    return `${degPerSec.toFixed(0)} °/s ${degPerSec < 0 ? '↻ CW (right)' : '↺ CCW (left)'}`;
  }

  const tickHandle = addTick((dt) => {
    helicopter.setTailRpm(state.tailRpm);

    // Net torque drives a target yaw rate (low-pass tracked).
    // net < 0 (low tail RPM): body torque wins → CW from above (rotation.y < 0)
    // net = 0 (≈1500 RPM): balanced
    // net > 0 (high tail RPM): tail wins → CCW (rotation.y > 0)
    const Tbody = 1.0;
    const Ttail = (state.tailRpm / 1500) * (state.tailRpm / 1500);
    const net   = Ttail - Tbody;
    // Body torque is negative in rotation.y (CW from above). Tail thrust counters.
    const targetRate = -net * 1.1;
    state.yawRate += (targetRate - state.yawRate) * Math.min(1, dt * 6);
    state.yaw += state.yawRate * dt;
    // Wrap yaw to ±π so the body doesn't accumulate full turns and the
    // direction change is immediately readable when RPM crosses balance.
    if (state.yaw >  Math.PI) state.yaw -= 2 * Math.PI;
    if (state.yaw < -Math.PI) state.yaw += 2 * Math.PI;
    helicopter.root.rotation.y = state.yaw;

    if (state.autoBalance) {
      const tgt = 1500;
      state.tailRpm += (tgt - state.tailRpm) * 0.05;
      tailRpmSl.setValue(state.tailRpm);
    }

    // Body reaction torque — always CW from above (sign = -1)
    const center = helicopter.root.position.clone().add(new THREE.Vector3(0, 1.6, 0));
    torqueArc.setPosition(center);
    torqueArc.setNormal(new THREE.Vector3(0, 1, 0));
    torqueArc.setArc(0.85, -1);
    torqueArc.setVisible(true);

    // Tail-rotor thrust — body-relative, pointed the way the tail rotor
    // physically pushes the boom.
    const tailPos = helicopter.getTailRotorWorldPos(new THREE.Vector3());
    const tDir = new THREE.Vector3(-1, 0, 0).applyEuler(new THREE.Euler(0, state.yaw, 0));
    tailArrow.set(tailPos.clone().add(new THREE.Vector3(0, 0.4, 0)), tDir, Math.max(0.3, Ttail * 2.5));
    tailArrow.setVisible(state.tailRpm > 1);

    // Yaw arc — direction sign is flipped relative to yawRate so the arc
    // visually winds the *same way* the body is actually rotating.
    yawArc.setPosition(helicopter.root.position.clone().add(new THREE.Vector3(0, 0.4, 0)));
    yawArc.setNormal(new THREE.Vector3(0, 1, 0));
    const yawFrac = Math.min(0.6, Math.max(0.08, Math.abs(state.yawRate) * 0.45));
    yawArc.setArc(yawFrac, state.yawRate >= 0 ? -1 : 1);
    yawArc.setVisible(Math.abs(state.yawRate) > 0.04);

    yawValEl.textContent = rateText();
  });

  // ----- Controls -----
  const tailRpmSl = slider({
    label: 'Tail rotor RPM', min: 0, max: 2400, step: 20, value: 0,
    formatter: v => `${v.toFixed(0)} RPM`,
    onInput: v => { state.tailRpm = v; state.autoBalance = false; balanceBtn.classList.remove('primary'); }
  });
  const balanceBtn = button({ label: 'Auto-balance', onClick: () => {
    state.autoBalance = !state.autoBalance;
    balanceBtn.classList.toggle('primary', state.autoBalance);
  }});
  const stopYaw = button({ label: 'Stop yaw', onClick: () => { state.yawRate = 0; state.yaw = 0; }});

  controlsHost.appendChild(el('div', { class: 'group wide' }, tailRpmSl.el));
  controlsHost.appendChild(el('div', { class: 'group' },
    el('label', {}, 'Yaw rate', yawValEl),
  ));
  controlsHost.appendChild(el('div', { class: 'row' }, balanceBtn, stopYaw));

  return {
    teardown() {
      tickHandle();
      torqueArc.dispose();
      tailArrow.dispose();
      yawArc.dispose();
      helicopter.setTailRpm(0);
      helicopter.setMainRpm(0);
      helicopter.setCollective(0);
      helicopter.resetToRest();
    }
  };
}
