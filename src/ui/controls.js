/**
 * Lightweight DOM helpers for the glass control panel.
 * No framework — direct DOM, easy to read.
 */

export function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'style') Object.assign(e.style, v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') e.innerHTML = v;
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const k of kids.flat()) {
    if (k == null || k === false) continue;
    e.appendChild(typeof k === 'string' ? document.createTextNode(k) : k);
  }
  return e;
}

export function slider({ label, min, max, step = 0.01, value = 0, unit = '', formatter, onInput }) {
  const valSpan = el('span', { class: 'val' });
  const input = el('input', { type: 'range', min, max, step, value });
  const fmt = formatter || (v => `${v}${unit}`);
  function refresh() {
    valSpan.textContent = fmt(parseFloat(input.value));
  }
  input.addEventListener('input', () => {
    onInput?.(parseFloat(input.value));
    refresh();
  });
  refresh();
  const labelEl = el('label', {}, label, valSpan);
  const wrap = el('div', { class: 'group' }, labelEl, input);
  return {
    el: wrap, input,
    setValue(v) { input.value = v; refresh(); },
    getValue() { return parseFloat(input.value); }
  };
}

export function button({ label, primary, onClick }) {
  return el('button', {
    class: 'action' + (primary ? ' primary' : ''),
    onClick,
  }, label);
}

export function pill({ label, active, onClick }) {
  const e = el('button', { class: 'pill' + (active ? ' active' : ''), onClick: () => onClick?.(e) }, label);
  return e;
}

/**
 * 2D virtual joystick. Calls onMove({x, y}) with normalised values in [-1,1].
 * Labels are rendered as compass arrows inside the rim so they don't clash
 * with surrounding panel labels. Pass `caption` for a single label below.
 */
export function joystick({ size = 120, labels = {}, caption, onMove, sticky = false }) {
  const joy = el('div', { class: 'joy', style: { width: `${size}px`, height: `${size}px` } });
  const nub = el('div', { class: 'nub' });
  joy.appendChild(nub);
  // Compass arrows inside the rim (only when a label exists for that side)
  if (labels.top    !== false) joy.appendChild(el('span', { class: 'compass top'    }, '▲'));
  if (labels.bottom !== false) joy.appendChild(el('span', { class: 'compass bottom' }, '▼'));
  if (labels.left   !== false) joy.appendChild(el('span', { class: 'compass left'   }, '◀'));
  if (labels.right  !== false) joy.appendChild(el('span', { class: 'compass right'  }, '▶'));
  // Wrap with an optional caption below
  const wrap = caption
    ? el('div', { class: 'joy-wrap' }, joy, el('span', { class: 'cap' }, caption))
    : joy;

  let dragging = false;
  let state = { x: 0, y: 0 };
  function setNub(x, y) {
    const r = size / 2;
    nub.style.left = `${50 + (x * 38)}%`;
    nub.style.top = `${50 + (y * 38)}%`;
  }
  function update(clientX, clientY) {
    const rect = joy.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const r = size / 2;
    let x = Math.max(-1, Math.min(1, dx / r));
    let y = Math.max(-1, Math.min(1, dy / r));
    state.x = x; state.y = y;
    setNub(x, y);
    onMove?.({ x, y });
  }
  function start(e) {
    dragging = true;
    e.preventDefault();
    const t = e.touches?.[0] || e;
    update(t.clientX, t.clientY);
    document.addEventListener('mousemove', move);
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('mouseup', end);
    document.addEventListener('touchend', end);
  }
  function move(e) {
    if (!dragging) return;
    e.preventDefault();
    const t = e.touches?.[0] || e;
    update(t.clientX, t.clientY);
  }
  function end() {
    dragging = false;
    document.removeEventListener('mousemove', move);
    document.removeEventListener('touchmove', move);
    document.removeEventListener('mouseup', end);
    document.removeEventListener('touchend', end);
    if (!sticky) {
      state.x = 0; state.y = 0;
      setNub(0, 0);
      onMove?.({ x: 0, y: 0 });
    }
  }
  joy.addEventListener('mousedown', start);
  joy.addEventListener('touchstart', start, { passive: false });

  return {
    el: wrap,
    getState: () => state,
    reset() {
      state.x = 0; state.y = 0; setNub(0, 0); onMove?.({ x: 0, y: 0 });
    }
  };
}
