// Utilidades de la escena 3D procedural (Three.js r160): texturas en canvas, mallas y señalética.
import * as THREE from 'three';

export const C = {
  bg: 0x0a1222, concrete: 0x6b717c, wall: 0x2f3b50, steel: 0x56627a, rack: 0x2f6fd6, beam: 0xff8a1c,
  yellow: 0xffc533, green: 0x2bd47d, red: 0xe5323f, cyan: 0x3ee6ff, dark: 0x1b2130, orange: 0xff7a1a
};
export const ROUTE = [[10, -3.5], [10, 4], [12, 6], [21, 6], [24, 6.5], [28, 10], [30, 12]];

/* ---------------- helpers ---------------- */
export function tex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
export const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1, ...o });
export function mesh(geo, material, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  if (shadow) { m.castShadow = true; m.receiveShadow = true; }
  return m;
}
export const box = (w, h, d, m, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z);
export function decal(w, d, material, x, z, y = 0.012, rotY = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  m.rotation.set(-Math.PI / 2, 0, rotY);
  m.position.set(x, y, z);
  m.receiveShadow = true;
  return m;
}
export function decalMat(color, opacity = 1, map = null) {
  return new THREE.MeshStandardMaterial({ color, map, transparent: opacity < 1 || !!map, opacity, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false });
}
export function signTex(text, bg, fg = '#fff', opts = {}) {
  const w = opts.w || 512, h = opts.h || 160;
  return tex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = fg; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = fg; g.font = `700 ${opts.size || 64}px "Space Grotesk", Arial, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (opts.icon) opts.icon(g, w, h);
    g.fillText(text, opts.tx || w / 2, h / 2 + 4);
  });
}
export function runningMan(g, x, y, s, color) {
  g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = color; g.strokeStyle = color; g.lineCap = 'round'; g.lineWidth = 9;
  g.beginPath(); g.arc(12, -36, 9, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(6, -22); g.lineTo(-2, 8); g.lineTo(-20, 30); g.moveTo(-2, 8); g.lineTo(14, 18); g.lineTo(10, 38);
  g.moveTo(4, -16); g.lineTo(22, -4); g.lineTo(32, -12); g.moveTo(4, -16); g.lineTo(-14, -8); g.lineTo(-24, 2); g.stroke();
  g.restore();
}
export function wrapText(g, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); line = w; y += lh; } else line = test;
  }
  g.fillText(line, x, y);
}
