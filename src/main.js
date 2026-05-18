import './styles.css';
import * as THREE from 'three';
import { createScene } from './scene/sceneCore.js';
import { makeEnvironment } from './scene/environment.js';
import { loadHelicopter } from './scene/helicopter.js';
import { LESSONS } from './lessons.js';

import { module1 } from './modules/module1_parts.js';
import { module2 } from './modules/module2_bernoulli.js';
import { module3 } from './modules/module3_blade.js';
import { module4 } from './modules/module4_rotor.js';
import { module5 } from './modules/module5_cyclic.js';
import { module6 } from './modules/module6_tail.js';
import { module7 } from './modules/module7_fullflight.js';

const MODULES = [module1, module2, module3, module4, module5, module6, module7];

// ------------------------------------------------------------------
// DOM
// ------------------------------------------------------------------
const $ = id => document.getElementById(id);
const vizHost      = $('viz');
const controlsHost = $('controls');
const lessonChip   = $('lessonChip');
const modalTitle   = $('modalTitle');
const modalBody    = $('modalBody');
const splash       = $('splash');
const splashStatus = splash?.querySelector('.splash-status');

// ------------------------------------------------------------------
// Scene + environment
// ------------------------------------------------------------------
const scene3D = createScene(vizHost);
const env = makeEnvironment(scene3D.scene);
scene3D.addTick((dt) => env.tick(dt));

// ------------------------------------------------------------------
// Helicopter
// ------------------------------------------------------------------
let helicopter = null;
try {
  if (splashStatus) splashStatus.textContent = 'fetching the airframe…';
  helicopter = await loadHelicopter(scene3D.scene);
  console.log('Loaded helicopter:', {
    blades: helicopter.blades.length,
    mainRotor: helicopter.mainCfg?.node?.name,
    tailRotor: helicopter.tailCfg?.node?.name,
  });
  helicopter.setMainRpm(0);
  helicopter.setCollective(0);
  helicopter.setCyclic(0, 0);
  helicopter.setTailRpm(0);
  scene3D.addTick(dt => helicopter.updateRig(dt));
} catch (err) {
  console.error('Failed to load model', err);
  showFatal('Couldn\'t load the helicopter model. Place oh1.glb at public/models/oh1.glb.');
}

// ------------------------------------------------------------------
// Frame-offset: measure the bottom controls overlay each frame and
// push the camera framing up so the helicopter stays centered above it.
// ------------------------------------------------------------------
function applyFrameOffset() {
  if (!controlsHost || !vizHost) return;
  const vr = vizHost.getBoundingClientRect();
  const cr = controlsHost.getBoundingClientRect();
  const overlap = Math.max(0, vr.bottom - cr.top);
  const target  = Math.min(overlap, vr.height * 0.45);
  scene3D.setFrameOffsetPx(target);
}
scene3D.addTick(applyFrameOffset);
window.addEventListener('resize', () => requestAnimationFrame(applyFrameOffset));

// ------------------------------------------------------------------
// Lesson rail
// ------------------------------------------------------------------
const lessonList = $('lessonList');
LESSONS.forEach((l, i) => {
  const li = document.createElement('li');
  li.dataset.idx = i;
  li.title = l.title;
  li.innerHTML = `<span class="num">${i + 1}</span><span class="name">${l.title}</span>`;
  li.addEventListener('click', () => goTo(i));
  lessonList.appendChild(li);
});

$('prevBtn').addEventListener('click', () => goTo(currentIdx - 1));
$('nextBtn').addEventListener('click', () => goTo(currentIdx + 1));

$('descBtn').addEventListener('click', () => openMobileDesc());
$('modalClose').addEventListener('click', () => $('modalScrim').classList.add('hidden'));
$('modalScrim').addEventListener('click', (e) => {
  if (e.target.id === 'modalScrim') $('modalScrim').classList.add('hidden');
});

function openMobileDesc() {
  const l = LESSONS[currentIdx];
  if (!l) return;
  modalTitle.textContent = l.title;
  modalBody.innerHTML = l.bodyHtml;
  $('modalScrim').classList.remove('hidden');
}

// tooltip fade
const tip = $('vizTip');
setTimeout(() => tip.classList.add('fade'), 100);
function flashTip() {
  tip.classList.remove('fade');
  setTimeout(() => tip.classList.add('fade'), 100);
}

// ------------------------------------------------------------------
// Module lifecycle
// ------------------------------------------------------------------
let currentIdx = -1;
let currentTeardown = null;

async function goTo(i) {
  i = Math.max(0, Math.min(LESSONS.length - 1, i));
  if (i === currentIdx) return;
  if (currentTeardown) { try { await currentTeardown(); } catch (e) { console.warn(e); } currentTeardown = null; }

  currentIdx = i;
  const l = LESSONS[i];
  controlsHost.innerHTML = '';
  if (helicopter) {
    helicopter.setMainRpm(0);
    helicopter.setCollective(0);
    helicopter.setCyclic(0, 0);
    helicopter.setTailRpm(0);
    helicopter.setSoloBladePitch(null);
    helicopter.resetToRest();
    helicopter.setBladesVisible(true);
  }
  env.setMode(l.env || 'ground');

  // Lesson chip on viz (shows lesson title at top)
  lessonChip.innerHTML = `<span class="num">${i + 1}</span><span>${l.title.replace(/^\d+\s*·\s*/, '')}</span>`;
  lessonChip.classList.remove('show');
  void lessonChip.offsetWidth;
  lessonChip.classList.add('show');

  // Active state in rail
  [...lessonList.children].forEach((li, idx) => li.classList.toggle('active', idx === i));

  // Modal content (description on demand)
  modalTitle.textContent = l.title;
  modalBody.innerHTML = l.bodyHtml;

  const m = MODULES[i];
  const ctx = {
    scene: scene3D.scene,
    camera: scene3D.camera,
    renderer: scene3D.renderer,
    controls: scene3D.controls,
    focusOn: scene3D.focusOn,
    addTick: scene3D.addTick,
    controlsHost,
    vizHost,
    helicopter,
    env,
    THREE,
  };
  try {
    const result = await m(ctx);
    currentTeardown = result?.teardown || null;
  } catch (err) {
    console.error('Module load error', err);
  }
  flashTip();
  requestAnimationFrame(applyFrameOffset);

  $('prevBtn').disabled = i === 0;
  $('nextBtn').disabled = i === LESSONS.length - 1;
}

// ------------------------------------------------------------------
// Splash dismissal — wait for the user to press the Take-off button.
// ------------------------------------------------------------------
function hideSplash() {
  if (!splash) return;
  splash.classList.add('hidden');
  setTimeout(() => splash.remove(), 700);
}
(async () => {
  if (splashStatus) splashStatus.textContent = 'preparing the cockpit…';
  await goTo(0);
  if (splashStatus) splashStatus.textContent = 'ready when you are';
  const enterBtn = document.getElementById('splashEnter');
  if (enterBtn) {
    enterBtn.disabled = false;
    enterBtn.addEventListener('click', hideSplash, { once: true });
  }
})();

function showFatal(msg) {
  if (!splash) return;
  if (splashStatus) splashStatus.textContent = 'unable to take off';
  const credit = splash.querySelector('.splash-credit');
  if (credit) credit.innerHTML = `<span style="color:#c44">${msg}</span>`;
}
