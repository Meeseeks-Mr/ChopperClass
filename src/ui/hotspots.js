import * as THREE from 'three';

/**
 * 2D HTML dots that follow 3D world positions every frame.
 * Designed for Module 1 (parts of a helicopter) and reused later.
 */
export function createHotspots({ host, camera, renderer, spots, onClick }) {
  const items = spots.map(spot => {
    const dot = document.createElement('div');
    dot.className = 'hotspot';
    dot.dataset.id = spot.id;
    dot.title = spot.label;
    dot.addEventListener('click', () => onClick?.(spot, dot));
    host.appendChild(dot);
    return { ...spot, dot };
  });

  function setActive(id) {
    items.forEach(it => it.dot.classList.toggle('active', it.id === id));
  }

  const tmp = new THREE.Vector3();
  function tick() {
    const r = renderer.domElement.getBoundingClientRect();
    const hostR = host.getBoundingClientRect();
    items.forEach(it => {
      tmp.copy(it.position);
      tmp.project(camera);
      const x = (tmp.x * 0.5 + 0.5) * r.width;
      const y = (-tmp.y * 0.5 + 0.5) * r.height;
      // host might be offset from renderer
      const offsetX = r.left - hostR.left;
      const offsetY = r.top - hostR.top;
      it.dot.style.left = `${x + offsetX}px`;
      it.dot.style.top = `${y + offsetY}px`;
      it.dot.style.display = (tmp.z > 1) ? 'none' : 'grid';
    });
  }

  function dispose() {
    items.forEach(it => it.dot.remove());
  }

  return { tick, dispose, items, setActive };
}
