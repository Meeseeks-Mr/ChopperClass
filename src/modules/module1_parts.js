import * as THREE from 'three';
import { el, pill } from '../ui/controls.js';
import { showPartInfo, restoreLesson } from '../ui/info.js';
import { PART_INFO } from './partInfos.js';

/**
 * Module 1 — Anatomy of a Helicopter.
 * Highlight-based identification. Tapping a part pill flashes that group of
 * meshes (emissive boost + dimming of the rest) and pans the camera to frame
 * the part. No floating dots.
 */
export async function module1(ctx) {
  const { helicopter, camera, controls, controlsHost, focusOn } = ctx;

  camera.position.set(10, 6, 14);
  controls.target.set(0, 1.8, 0);

  const parts = helicopter.getParts();

  const pillsRow = el('div', { class: 'hotspot-row' });
  const allPills = parts.map(p =>
    pill({ label: p.label, onClick: () => activate(p.id) })
  );
  allPills.forEach(p => pillsRow.appendChild(p));

  controlsHost.appendChild(el('div', { class: 'group' },
    el('label', {}, 'Tap a part to learn about it:'),
    pillsRow,
  ));

  function activate(id) {
    const part = parts.find(p => p.id === id);
    if (!part) return;
    allPills.forEach((p, i) => p.classList.toggle('active', parts[i].id === id));

    focusOn(part.focus, part.distance || 6, 0.7, part.camPos || null);

    const info = PART_INFO[id];
    if (info) showPartInfo({ lessonIdx: 0, title: info.title, html: info.html });
  }

  return {
    teardown() {
      restoreLesson(0);
    }
  };
}
