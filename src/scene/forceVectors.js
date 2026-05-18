import * as THREE from 'three';

/**
 * Creates a labeled arrow that points in a 3D direction with a magnitude.
 * Used everywhere we visualize lift, thrust, drag, weight, yaw torque etc.
 */
export class ForceArrow {
  constructor({ color = 0x6ee7ff, label = '', scene, lengthScale = 1, headRatio = 0.25 }) {
    this.color = color;
    this.lengthScale = lengthScale;
    this.headRatio = headRatio;
    this.group = new THREE.Group();
    this.group.name = `Arrow:${label}`;
    scene.add(this.group);

    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthTest: false });
    // shaft
    this.shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 14), mat);
    this.shaft.position.y = 0.5;
    // head
    this.head = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 18), mat);
    this.head.position.y = 1.15;
    this.shaft.renderOrder = 999;
    this.head.renderOrder = 999;
    this.group.add(this.shaft, this.head);

    if (label) {
      this.label = makeLabelSprite(label, color);
      this.label.renderOrder = 1000;
      this.group.add(this.label);
    }

    this.setMagnitude(0);
  }

  // Position the arrow at world `pos`, pointing in world-direction `dir`,
  // length proportional to `mag` (clamped/scaled by lengthScale).
  set(pos, dir, mag) {
    this.group.position.copy(pos);
    const m = Math.max(0.001, mag * this.lengthScale);
    this.setMagnitude(m);
    // orient: default arrow points +Y. Rotate to align with dir.
    const up = new THREE.Vector3(0, 1, 0);
    const d = dir.clone().normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(up, d);
    this.group.quaternion.copy(q);
  }

  setMagnitude(len) {
    const m = Math.max(0.0001, len);
    this.shaft.scale.set(1, m, 1);
    this.shaft.position.y = m / 2;
    this.head.position.y = m + 0.15;
    if (this.label) this.label.position.set(0.25, m + 0.35, 0);
  }

  setVisible(v) { this.group.visible = v; }
  setColor(c) {
    this.color = c;
    this.shaft.material.color.set(c);
    this.head.material.color.set(c);
    if (this.label) {
      this.group.remove(this.label);
      this.label = makeLabelSprite(this.label.userData.text || '', c);
      this.group.add(this.label);
    }
  }

  dispose() {
    this.shaft.geometry.dispose();
    this.head.geometry.dispose();
    this.shaft.material.dispose();
    if (this.label) this.label.material.map.dispose();
    if (this.group.parent) this.group.parent.remove(this.group);
  }
}

export function makeLabelSprite(text, color = 0xffffff) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '600 56px Inter, system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const cstr = '#' + new THREE.Color(color).getHexString();
  // soft shadow / glow
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = cstr;
  ctx.fillText(text, 14, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(2.2, 0.55, 1);
  sp.userData.text = text;
  return sp;
}

// Curved arc arrow for torque / rotation (used for yaw, counter-torque).
export class TorqueArc {
  constructor({ color = 0xff6b8a, scene, radius = 1, segments = 32, label = '' }) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.radius = radius;
    this.color = color;
    this.segments = segments;
    this._buildArc(0.8);
    if (label) {
      this.label = makeLabelSprite(label, color);
      this.label.position.set(radius, 0.2, 0);
      this.group.add(this.label);
    }
  }
  _buildArc(arcFrac, dirSign = 1) {
    if (this.mesh) {
      this.group.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
    if (this.head) {
      this.group.remove(this.head);
      this.head.geometry.dispose();
      this.head.material.dispose();
    }
    const r = this.radius;
    const a = Math.PI * 2 * arcFrac;
    // dirSign +1 ⇒ sweep one way, -1 ⇒ sweep the other. We do this by
    // negating the END angle when reversing, *not* by setting aClockwise=true
    // with a positive end angle — that combination would render an arc of
    // length 2π − a (the long way around) instead of length a.
    const endAngle = dirSign < 0 ? -a : a;
    const curve = new THREE.EllipseCurve(0, 0, r, r, 0, endAngle, dirSign < 0, 0);
    const points = curve.getPoints(this.segments);
    const pts3 = points.map(p => new THREE.Vector3(p.x, 0, p.y));
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts3), 64, 0.035, 8, false);
    const mat = new THREE.MeshBasicMaterial({ color: this.color, transparent: true, opacity: 0.9, depthTest: false });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.renderOrder = 999;
    this.group.add(this.mesh);
    // arrowhead at end
    const tip = pts3[pts3.length - 1];
    const prev = pts3[pts3.length - 2];
    const dir = tip.clone().sub(prev).normalize();
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 16), mat);
    head.position.copy(tip);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    head.quaternion.copy(q);
    head.renderOrder = 999;
    this.head = head;
    this.group.add(head);
  }
  setArc(frac, dirSign = 1) {
    this._buildArc(THREE.MathUtils.clamp(frac, 0.05, 0.99), dirSign);
  }
  setPosition(p) { this.group.position.copy(p); }
  setNormal(n) {
    // default plane is XZ (normal = +Y). Rotate so plane normal matches n.
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(up, n.clone().normalize());
    this.group.quaternion.copy(q);
  }
  setVisible(v) { this.group.visible = v; }
  dispose() {
    if (this.mesh) { this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
    if (this.head) { this.head.geometry.dispose(); this.head.material.dispose(); }
    if (this.group.parent) this.group.parent.remove(this.group);
  }
}
