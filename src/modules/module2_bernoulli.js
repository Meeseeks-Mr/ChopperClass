import { el, slider, button } from '../ui/controls.js';

/**
 * Module 2 — Bernoulli's principle (2D airfoil illustration).
 *
 * Pure 2D canvas: a NACA-2412-ish airfoil with animated streamlines flowing
 * left → right. The user controls airspeed and angle of attack. The curved
 * (cambered) surface sits on TOP. Positive AoA tips the leading edge UP.
 * Pink highlights the low-pressure upper surface, blue the high-pressure
 * lower surface, and the vertical lift arrow scales with v² × CL(α).
 */
export async function module2(ctx) {
  const { vizHost, controlsHost, helicopter, env } = ctx;

  env.setMode('sky');
  if (helicopter) helicopter.root.visible = false;

  // ---- 2D overlay canvas ----
  const overlay = document.createElement('canvas');
  overlay.className = 'mod2-canvas';
  Object.assign(overlay.style, {
    position: 'absolute', inset: '0',
    width: '100%', height: '100%',
    zIndex: '4',
    pointerEvents: 'none',
  });
  vizHost.appendChild(overlay);
  const c = overlay.getContext('2d');

  let W = 0, H = 0, DPR = 1;
  function resize() {
    const r = vizHost.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(2, Math.floor(r.width));
    H = Math.max(2, Math.floor(r.height));
    overlay.width  = Math.floor(W * DPR);
    overlay.height = Math.floor(H * DPR);
    overlay.style.width  = W + 'px';
    overlay.style.height = H + 'px';
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(vizHost);
  resize();

  // ---- State ----
  const stt = {
    aoaDeg: 4,
    airspeed: 1.0,
    play: true,
  };
  const STALL_DEG = 16;

  // NACA-2412-ish profile, all in aerodynamic convention (y positive = UP).
  // x ∈ [0, 1] runs from leading edge to trailing edge.
  function thickness(x) {
    return 0.12 / 0.2 * (0.2969*Math.sqrt(x) - 0.1260*x - 0.3516*x*x + 0.2843*x*x*x - 0.1015*x*x*x*x);
  }
  function camber(x) {
    return (x < 0.4)
      ? (0.02 / (0.4*0.4)) * (2*0.4*x - x*x)
      : (0.02 / (0.6*0.6)) * ((1 - 2*0.4) + 2*0.4*x - x*x);
  }
  function airfoilTop(x) { return camber(x) + thickness(x); }   // > 0
  function airfoilBot(x) { return camber(x) - thickness(x); }   // can be slightly < 0

  // ---- Particles (positions in aerodynamic frame, y positive = above) ----
  const PCOUNT = 240;
  const ps = [];
  function rand(a, b) { return a + Math.random() * (b - a); }
  function reseed(p, initial) {
    p.x = initial ? rand(-0.4, 0.4) : rand(-0.7, -0.6);
    p.y = rand(-0.35, 0.35);
    p.life = 0;
    p.maxLife = rand(1.6, 3.0);
  }
  for (let i = 0; i < PCOUNT; i++) {
    const p = { x: 0, y: 0, life: 0, maxLife: 2 };
    reseed(p, true);
    ps.push(p);
  }

  // Velocity field — same aerodynamic convention.
  function velocityAt(x, y) {
    let vx = 1.0;
    let vy = 0;
    const aoa = stt.aoaDeg * Math.PI / 180;
    const stallActive = Math.abs(stt.aoaDeg) > STALL_DEG;
    if (x > -0.05 && x < 1.05) {
      const sx = Math.max(0, Math.min(1, x));
      const top = airfoilTop(sx);
      const bot = airfoilBot(sx);
      if (y > top) {
        const d = y - top;
        if (d < 0.45) {
          const k = Math.exp(-d * 3.5);
          const speedup = stallActive ? 0.25 : (0.7 + Math.max(0, aoa) * 1.4);
          vx += k * speedup;
          vy += k * (Math.sin(Math.PI * sx) * 0.5 + aoa * 0.8);  // hump UP over top, fall DOWN past peak
          if (stallActive && sx > 0.3) {
            vy += Math.sin(performance.now() * 0.012 + sx * 28) * 0.55 * k;
            vx *= 0.7;
          }
        }
      } else if (y < bot) {
        const d = bot - y;
        if (d < 0.45) {
          const k = Math.exp(-d * 3.5);
          vx += k * (-0.18 + aoa * 0.4);
          vy += k * (Math.sin(Math.PI * sx) * 0.15 + aoa * 0.6);
        }
      }
      if (sx < 0.06 && Math.abs(y) < 0.06) { vx *= 0.35; vy *= 0.5; }
    }
    vy += aoa * 0.15;   // freestream tilt
    return { vx, vy };
  }

  function layout() {
    const chordPx = Math.min(W * 0.5, H * 0.5);
    return { cx: W / 2, cy: H / 2, chord: chordPx };
  }

  // The canonical airfoil-local → canvas transform.
  // Order: translate to centre → rotate (+a) → scale(1,-1) → translate(-0.25,0)
  // (rotate before flip makes positive `a` put the LE UP, since the flip
  // reverses the rotation direction so that aero-up = canvas-up everywhere.)
  function applyAirfoilTransform(L, a) {
    c.translate(L.cx, L.cy);
    c.rotate(a);
    c.scale(1, -1);
    c.translate(-0.25 * L.chord, 0);
  }

  function drawAirfoil(L, a) {
    c.save();
    applyAirfoilTransform(L, a);

    // Body fill
    c.beginPath();
    const N = 90;
    for (let i = 0; i <= N; i++) {
      const x = i / N;
      const y = airfoilTop(x);
      if (i === 0) c.moveTo(x * L.chord, y * L.chord);
      else         c.lineTo(x * L.chord, y * L.chord);
    }
    for (let i = N; i >= 0; i--) {
      const x = i / N;
      const y = airfoilBot(x);
      c.lineTo(x * L.chord, y * L.chord);
    }
    c.closePath();
    const grad = c.createLinearGradient(0, 0.15 * L.chord, 0, -0.15 * L.chord);
    grad.addColorStop(0, '#e8eef0');
    grad.addColorStop(0.5, '#f3f0e8');
    grad.addColorStop(1, '#ffffff');
    c.fillStyle = grad;
    c.fill();
    c.lineWidth = 1.6;
    c.strokeStyle = 'rgba(40,50,60,0.55)';
    c.stroke();

    // Pressure colour bands
    const aoaAbs = Math.abs(stt.aoaDeg);
    const stallActive = aoaAbs > STALL_DEG;
    const intens = Math.min(1, Math.max(0.15, aoaAbs / 14)) * (stallActive ? 0.35 : 1);

    // Upper (curved) surface: LOW pressure (pink)
    c.beginPath();
    for (let i = 0; i <= N; i++) {
      const x = i / N, y = airfoilTop(x);
      if (i === 0) c.moveTo(x * L.chord, y * L.chord);
      else         c.lineTo(x * L.chord, y * L.chord);
    }
    c.lineWidth = 5;
    c.strokeStyle = `rgba(244,143,177,${intens * 0.85})`;
    c.stroke();

    // Lower surface: HIGH pressure (blue)
    c.beginPath();
    for (let i = 0; i <= N; i++) {
      const x = i / N, y = airfoilBot(x);
      if (i === 0) c.moveTo(x * L.chord, y * L.chord);
      else         c.lineTo(x * L.chord, y * L.chord);
    }
    c.lineWidth = 5;
    c.strokeStyle = `rgba(79,195,247,${intens * 0.85})`;
    c.stroke();

    c.restore();
  }

  function drawParticles(L, a) {
    c.save();
    applyAirfoilTransform(L, a);
    c.lineWidth = 1.4;
    for (const p of ps) {
      const f = velocityAt(p.x, p.y);
      const norm = Math.hypot(f.vx, f.vy) || 1;
      const trailLen = 0.06 + 0.04 * Math.min(2, norm);
      const ex = p.x - (f.vx / norm) * trailLen;
      const ey = p.y - (f.vy / norm) * trailLen;
      const s = norm;
      let stroke;
      if (s > 1.1)      stroke = `rgba(255,138,101,${Math.min(1, (s - 1) * 0.9 + 0.2)})`;
      else if (s < 0.9) stroke = `rgba(79,195,247,${Math.min(1, (1 - s) * 0.9 + 0.2)})`;
      else              stroke = 'rgba(60,75,90,0.55)';
      c.strokeStyle = stroke;
      c.beginPath();
      c.moveTo(ex * L.chord, ey * L.chord);
      c.lineTo(p.x * L.chord, p.y * L.chord);
      c.stroke();
    }
    c.restore();
  }

  function drawLiftArrow(L) {
    const aoa = stt.aoaDeg;
    const abs = Math.abs(aoa);
    let CL;
    if (abs <= STALL_DEG) CL = (aoa / 14) * 1.2;
    else CL = Math.sign(aoa) * Math.max(0.2, 1.2 - (abs - STALL_DEG) * 0.07);
    const liftMag = CL * stt.airspeed * stt.airspeed;
    if (Math.abs(liftMag) < 0.05) return;

    const len = Math.min(L.chord * 1.2, Math.abs(liftMag) * L.chord * 0.85);
    const sign = liftMag >= 0 ? -1 : 1; // negative y on canvas = visually UP
    const startX = L.cx, startY = L.cy;
    const endX = L.cx, endY = L.cy + sign * len;

    c.save();
    c.lineWidth = 7;
    c.strokeStyle = '#4fc3f7';
    c.shadowColor = 'rgba(79,195,247,0.5)';
    c.shadowBlur = 14;
    c.beginPath();
    c.moveTo(startX, startY);
    c.lineTo(endX, endY);
    c.stroke();
    // Arrowhead
    const ah = 14;
    c.beginPath();
    c.moveTo(endX, endY);
    c.lineTo(endX - 8, endY - sign * ah);
    c.lineTo(endX + 8, endY - sign * ah);
    c.closePath();
    c.fillStyle = '#4fc3f7';
    c.fill();
    c.restore();

    // Label sits *beyond* the arrowhead (further in the lift direction) so it
    // never crosses the shaft.
    c.save();
    c.font = '600 13px Inter, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = sign < 0 ? 'bottom' : 'top';
    c.fillStyle = '#4fc3f7';
    c.fillText('Lift', endX, endY + sign * 18);
    c.restore();
  }

  function drawAoAArc(L, a) {
    c.save();
    c.translate(L.cx, L.cy);

    // Freestream reference (horizontal, dashed)
    c.strokeStyle = 'rgba(40,50,60,0.5)';
    c.lineWidth = 1.2;
    c.setLineDash([4, 4]);
    c.beginPath();
    c.moveTo(-0.30 * L.chord, 0);
    c.lineTo(+0.78 * L.chord, 0);
    c.stroke();

    // Chord line (rotated by +a; canvas y-down, so positive a = LE up via the
    // same scale-flip trick used by the airfoil transform — but we draw the
    // chord here in raw canvas coords, so for "+a in code → LE up on canvas"
    // we project the chord direction using the same sign rules.)
    // After the airfoil transform with rotate(+a) then scale(1,-1), the chord
    // endpoint (x, 0) lands on canvas at (cx + x*cos a, cy - x*sin a).
    const cosA = Math.cos(a), sinA = Math.sin(a);
    const leExtX = -0.30 * L.chord * cosA;
    const leExtY = +0.30 * L.chord * sinA;   // y POSITIVE on canvas = DOWN, but with the flip LE is UP, so canvas LE y = -sin*x
    // Hmm: chord point in airfoil-local is (x_local, 0). After transform:
    //   canvas_x = cx + x_local * cos a
    //   canvas_y = cy - x_local * sin a
    // For LE extension at x_local = -0.30: canvas pos = (cx - 0.30 cos a, cy + 0.30 sin a)
    // For TE extension at x_local = +0.78: canvas pos = (cx + 0.78 cos a, cy - 0.78 sin a)
    const leX = -0.30 * L.chord * cosA;
    const leY = +0.30 * L.chord * sinA;
    const teX = +0.78 * L.chord * cosA;
    const teY = -0.78 * L.chord * sinA;
    c.beginPath();
    c.moveTo(leX, leY);
    c.lineTo(teX, teY);
    c.stroke();
    c.setLineDash([]);

    // AoA arc — between freestream (horizontal-right) and chord-LE-side
    // (which is up-left for positive a). We draw the arc on the LE side
    // (top-left quadrant) so the eye reads it as "angle the airfoil tips up".
    const arcR = L.chord * 0.40;
    c.strokeStyle = 'rgba(149,117,205,0.85)';
    c.lineWidth = 2;
    c.beginPath();
    // Horizontal-left direction is at math-angle π. LE direction is at
    // math-angle (π - a) [a > 0 → upper-left quadrant on a y-down canvas
    // because LE canvas-y is negative].
    if (a >= 0) {
      c.arc(0, 0, arcR, Math.PI, Math.PI - a, true);
    } else {
      c.arc(0, 0, arcR, Math.PI, Math.PI - a, false);
    }
    c.stroke();

    // α label, positioned at the midpoint of the arc
    const midA = Math.PI - a / 2;
    c.font = '600 13px Inter, sans-serif';
    c.fillStyle = '#9575cd';
    c.textAlign = 'right';
    c.fillText(`α = ${stt.aoaDeg.toFixed(1)}°`,
      (arcR + 6) * Math.cos(midA) - 6,
      (arcR + 6) * Math.sin(midA) - 4);

    c.restore();
  }

  function drawFreestreamHint() {
    c.save();
    c.fillStyle = 'rgba(40,50,60,0.4)';
    c.font = '600 11px Inter, sans-serif';
    c.fillText('air →', 24, H / 2 - 6);
    c.restore();
  }

  function drawStallTag() {
    if (Math.abs(stt.aoaDeg) <= STALL_DEG) return;
    // Anchor top-LEFT so the tag never collides with the Read-Me pill at
    // the top-right of the viewport.
    c.save();
    c.fillStyle = 'rgba(244,143,177,0.9)';
    c.font = '700 12px Inter, sans-serif';
    c.textAlign = 'left';
    c.textBaseline = 'top';
    c.fillText('STALL — airflow has separated', 18, 18);
    c.restore();
  }

  // ---- Render loop ----
  let running = true;
  let lastT = performance.now();
  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - lastT) / 1000, 0.05);
    lastT = now;

    const L = layout();
    const a = stt.aoaDeg * Math.PI / 180;

    c.clearRect(0, 0, W, H);
    const skyGrad = c.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, 'rgba(220,235,245,0.85)');
    skyGrad.addColorStop(1, 'rgba(245,239,225,0.85)');
    c.fillStyle = skyGrad;
    c.fillRect(0, 0, W, H);

    if (stt.play) {
      const v0 = 1.4 * stt.airspeed;
      for (const p of ps) {
        const f = velocityAt(p.x, p.y);
        p.x += f.vx * v0 * dt;
        p.y += f.vy * v0 * dt;
        p.life += dt;
        if (p.x > 0.78 || p.life > p.maxLife) reseed(p, false);
      }
    }

    drawAoAArc(L, a);
    drawParticles(L, a);
    drawAirfoil(L, a);
    drawLiftArrow(L);
    drawFreestreamHint();
    drawStallTag();

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---- Controls ----
  const aoaSlider = slider({
    label: 'Angle of Attack', min: -10, max: 22, step: 0.5, value: stt.aoaDeg, unit: '°',
    onInput: v => { stt.aoaDeg = v; }
  });
  const speedSlider = slider({
    label: 'Air speed', min: 0.3, max: 2.2, step: 0.05, value: stt.airspeed,
    formatter: v => `${(v * 100).toFixed(0)} kph`,
    onInput: v => { stt.airspeed = v; }
  });
  const playBtn = button({ label: stt.play ? 'Pause' : 'Play', primary: true, onClick: () => {
    stt.play = !stt.play;
    playBtn.textContent = stt.play ? 'Pause' : 'Play';
  }});

  controlsHost.appendChild(el('div', { class: 'group wide' }, aoaSlider.el));
  controlsHost.appendChild(el('div', { class: 'group wide' }, speedSlider.el));
  controlsHost.appendChild(el('div', { class: 'row' }, playBtn));

  return {
    teardown() {
      running = false;
      ro.disconnect();
      overlay.remove();
      if (helicopter) helicopter.root.visible = true;
    }
  };
}
