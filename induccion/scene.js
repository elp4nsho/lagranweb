// Escena 3D procedural de la inducción (Three.js r160). Sin modelos ni texturas externas.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';

const C = {
  bg: 0x0a1222, concrete: 0x6b717c, wall: 0x2f3b50, steel: 0x56627a, rack: 0x2f6fd6, beam: 0xff8a1c,
  yellow: 0xffc533, green: 0x2bd47d, red: 0xe5323f, cyan: 0x3ee6ff, dark: 0x1b2130, orange: 0xff7a1a
};
const ROUTE = [[10, -3.5], [10, 4], [12, 6], [21, 6], [24, 6.5], [28, 10], [30, 12]];

/* ---------------- helpers ---------------- */
function tex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1, ...o });
function mesh(geo, material, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  if (shadow) { m.castShadow = true; m.receiveShadow = true; }
  return m;
}
const box = (w, h, d, m, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z);
function decal(w, d, material, x, z, y = 0.012, rotY = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  m.rotation.set(-Math.PI / 2, 0, rotY);
  m.position.set(x, y, z);
  m.receiveShadow = true;
  return m;
}
function decalMat(color, opacity = 1, map = null) {
  return new THREE.MeshStandardMaterial({ color, map, transparent: opacity < 1 || !!map, opacity, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false });
}
function signTex(text, bg, fg = '#fff', opts = {}) {
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
function runningMan(g, x, y, s, color) {
  g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = color; g.strokeStyle = color; g.lineCap = 'round'; g.lineWidth = 9;
  g.beginPath(); g.arc(12, -36, 9, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(6, -22); g.lineTo(-2, 8); g.lineTo(-20, 30); g.moveTo(-2, 8); g.lineTo(14, 18); g.lineTo(10, 38);
  g.moveTo(4, -16); g.lineTo(22, -4); g.lineTo(32, -12); g.moveTo(4, -16); g.lineTo(-14, -8); g.lineTo(-24, 2); g.stroke();
  g.restore();
}
function wrapText(g, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); line = w; y += lh; } else line = test;
  }
  g.fillText(line, x, y);
}

/* ---------------- planta ---------------- */
function buildPlant() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.bg);
  scene.fog = new THREE.Fog(C.bg, 60, 130);
  const anim = [];

  // luces
  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x2a2620, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(18, 30, 16);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -36, right: 40, top: 30, bottom: -30, near: 1, far: 90 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  const alarmLight = new THREE.PointLight(0xff2030, 0, 40, 1.5);
  alarmLight.position.set(6, 6, -6);
  scene.add(alarmLight);

  // terreno y losa
  const gravel = tex(256, 256, (g, w, h) => {
    g.fillStyle = '#3a3630'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) { const v = 40 + Math.random() * 50; g.fillStyle = `rgb(${v + 10},${v + 5},${v})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  }, [40, 40]);
  const ground = mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ map: gravel, roughness: 1 }), 0, -0.21, 0, false);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);
  const concrete = tex(512, 512, (g, w, h) => {
    g.fillStyle = '#7b818b'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) { const v = 105 + Math.random() * 40; g.fillStyle = `rgba(${v},${v + 2},${v + 6},.35)`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
    g.strokeStyle = 'rgba(40,44,52,.6)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h);
  }, [11, 7.5]);
  scene.add(box(44, 0.4, 30, new THREE.MeshStandardMaterial({ map: concrete, roughness: 0.85 }), 0, -0.2, 0));
  // explanada exterior hacia punto de encuentro
  scene.add(box(14, 0.3, 14, mat(0x4a4d52, { roughness: 0.95 }), 29, -0.2, 10));

  // pasillo peatonal y demarcaciones
  const yellow = decalMat(C.yellow);
  const yFill = decalMat(C.yellow, 0.12);
  scene.add(decal(42, 2, yFill, 0, 6));
  scene.add(decal(42, 0.18, yellow, 0, 5)); scene.add(decal(42, 0.18, yellow, 0, 7));
  scene.add(decal(2, 8, yFill, -8, 11)); scene.add(decal(0.18, 8, yellow, -9, 11)); scene.add(decal(0.18, 8, yellow, -7, 11));
  // pictogramas peatón sobre el pasillo
  const walkTex = tex(128, 128, (g) => { g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, 128, 128); runningMan(g, 64, 70, 1.3, '#ffc533'); });
  [-16, -4, 8, 18].forEach((x) => scene.add(decal(1.4, 1.4, decalMat(0xffffff, 1, walkTex), x, 6, 0.014, Math.PI / 2)));
  // carril de grúas horquilla (bordes discontinuos blancos)
  const dash = tex(128, 16, (g) => { g.clearRect(0, 0, 128, 16); g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, 80, 16); }, [24, 1]);
  scene.add(decal(24, 0.16, decalMat(0xffffff, 1, dash), -8, 0)); scene.add(decal(24, 0.16, decalMat(0xffffff, 1, dash.clone()), -8, 3));
  // paso cebra
  for (let i = 0; i < 6; i++) scene.add(decal(2, 0.3, decalMat(0xffffff, 0.9), -12, 0.3 + i * 0.5));
  const forkTxt = tex(512, 96, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '700 54px Arial'; g.textAlign = 'center'; g.fillText('TRÁNSITO DE GRÚAS', w / 2, 66); });
  scene.add(decal(6, 1.1, decalMat(0xffffff, 1, forkTxt), 0, 1.5, 0.014));
  // zona restringida achurada
  const hatch = tex(128, 128, (g, w, h) => {
    g.fillStyle = '#111'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffc533';
    for (let i = -w; i < w * 2; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 32, 0); g.lineTo(i + 32 - h, h); g.lineTo(i - h, h); g.fill(); }
  }, [1, 1]);
  const frame = (x, z, w, d) => {
    const t1 = hatch.clone(); t1.repeat.set(w / 0.8, 1); t1.needsUpdate = true;
    const t2 = hatch.clone(); t2.repeat.set(d / 0.8, 1); t2.needsUpdate = true;
    scene.add(decal(w, 0.6, decalMat(0xffffff, 1, t1), x, z - d / 2 + 0.3));
    scene.add(decal(w, 0.6, decalMat(0xffffff, 1, t1), x, z + d / 2 - 0.3));
    scene.add(decal(d, 0.6, decalMat(0xffffff, 1, t2), x - w / 2 + 0.3, z, 0.013, Math.PI / 2));
    scene.add(decal(d, 0.6, decalMat(0xffffff, 1, t2), x + w / 2 - 0.3, z, 0.013, Math.PI / 2));
  };
  frame(13, -9, 16, 10);
  scene.add(decal(15, 9, decalMat(C.yellow, 0.06), 13, -9));
  const restr = tex(512, 96, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#ffc533'; g.font = '700 50px Arial'; g.textAlign = 'center'; g.fillText('ZONA RESTRINGIDA', w / 2, 64); });
  scene.add(decal(6, 1.1, decalMat(0xffffff, 1, restr), 9, -4.9, 0.014));

  // muros (cortados al frente para ver el interior)
  const clad = tex(256, 256, (g, w, h) => {
    g.fillStyle = '#3a4860'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) { g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(x, 0, 6, h); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + 12, 0, 3, h); }
  }, [8, 1]);
  const wallM = new THREE.MeshStandardMaterial({ map: clad, roughness: 0.6, metalness: 0.3 });
  const H = 7;
  scene.add(box(44.6, H, 0.3, wallM, 0, H / 2, -15.15));
  const sideWall = (x) => {
    scene.add(box(0.3, H, 19.8, wallM, x, H / 2, -5.1));
    scene.add(box(0.3, H, 7.8, wallM, x, H / 2, 11.1));
    scene.add(box(0.3, H - 2.6, 2.4, wallM, x, 2.6 + (H - 2.6) / 2, 6));
  };
  sideWall(22.15); sideWall(-22.15);
  // franja de color y zócalo
  const band = mat(C.yellow, { emissive: 0x332200 });
  scene.add(box(44, 0.25, 0.32, band, 0, 1.2, -14.98));
  // pilares y cerchas
  const steel = mat(C.steel, { metalness: 0.6, roughness: 0.4 });
  const trussM = mat(0x8796b0, { metalness: 0.6, roughness: 0.4 });
  const lampM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdff4ff, emissiveIntensity: 1.6 });
  for (let x = -21.5; x <= 21.5; x += 8.6) {
    scene.add(box(0.4, H + 0.6, 0.4, steel, x, (H + 0.6) / 2, -14.7));
    if (Math.abs(x) > 21) continue;
    const tr = box(0.12, 0.3, 30, trussM, x, H + 0.5, 0); tr.castShadow = false; scene.add(tr);
    // luminarias colgando de la cercha
    for (let z = -9; z <= 9; z += 9) { const l = box(0.3, 0.08, 1.6, lampM, x, H + 0.3, z); l.castShadow = false; scene.add(l); }
  }

  // racks
  const uprM = mat(C.rack, { metalness: 0.4, roughness: 0.5 });
  const beamM = mat(C.beam, { metalness: 0.3, roughness: 0.5 });
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const boxes = [];
  const palletM = mat(0x8b6a43);
  [-11, -7, -3].forEach((z) => {
    for (let x = -19; x <= -5; x += 2.8) {
      scene.add(box(0.12, 5.2, 0.12, uprM, x, 2.6, z - 0.55));
      scene.add(box(0.12, 5.2, 0.12, uprM, x, 2.6, z + 0.55));
    }
    [0.15, 1.75, 3.35, 4.95].forEach((y, li) => {
      if (li > 0) { scene.add(box(14, 0.14, 0.08, beamM, -12, y, z - 0.55)); scene.add(box(14, 0.14, 0.08, beamM, -12, y, z + 0.55)); }
      for (let x = -17.6; x < -5; x += 2.8) {
        if (li === 3 && Math.random() < 0.5) continue;
        scene.add(box(2.4, 0.14, 1.0, palletM, x, y + 0.14, z));
        const n = 1 + Math.floor(Math.random() * 2);
        for (let k = 0; k < n; k++) {
          const hgt = 0.6 + Math.random() * 0.7;
          boxes.push({ x: x - 0.6 + k * 1.2, y: y + 0.21 + hgt / 2, z, w: 1.05, h: hgt, d: 0.95 });
        }
      }
    });
    // placa carga máxima
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.5), new THREE.MeshBasicMaterial({ map: signTex('MÁX 1.000 kg', '#ffc533', '#111', { w: 384, h: 160, size: 48 }) }));
    plate.position.set(-4.85, 1.2, z + 0.6); plate.rotation.y = Math.PI / 2; scene.add(plate);
  });
  const boxInst = new THREE.InstancedMesh(boxGeo, mat(0xffffff, { roughness: 0.9 }), boxes.length);
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  const cardboard = [0xb8875a, 0xc69a6b, 0xa77a4f, 0x5d7fa8, 0xd2b48c];
  boxes.forEach((b, i) => {
    dummy.position.set(b.x, b.y, b.z); dummy.scale.set(b.w, b.h, b.d); dummy.updateMatrix();
    boxInst.setMatrixAt(i, dummy.matrix); boxInst.setColorAt(i, col.setHex(cardboard[i % cardboard.length]));
  });
  boxInst.castShadow = boxInst.receiveShadow = true;
  scene.add(boxInst);

  // grúa horquilla
  const fork = new THREE.Group();
  const fy = mat(0xf5b400, { metalness: 0.3, roughness: 0.45 });
  const blk = mat(0x1a1a1a, { roughness: 0.8 });
  fork.add(box(1.2, 0.9, 1.9, fy, 0, 0.75, 0));
  fork.add(box(1.25, 0.6, 0.5, mat(0x333842), 0, 0.85, -1.05));
  [[-0.5, 0.75], [0.5, 0.75], [-0.5, -0.65], [0.5, -0.65]].forEach(([x, z]) => {
    const p = box(0.07, 1.4, 0.07, blk, x, 1.9, z * 0.9); fork.add(p);
  });
  fork.add(box(1.15, 0.06, 1.5, blk, 0, 2.6, 0.05));
  fork.add(box(0.5, 0.5, 0.5, mat(0x222), 0, 1.45, -0.2));
  [[-0.62, 0.6], [0.62, 0.6], [-0.62, -0.65], [0.62, -0.65]].forEach(([x, z]) => {
    const w = mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.25, 18), blk, x, 0.32, z); w.rotation.z = Math.PI / 2; fork.add(w);
  });
  fork.add(box(0.1, 2.8, 0.12, mat(0x444b57), -0.4, 1.4, 1.05)); fork.add(box(0.1, 2.8, 0.12, mat(0x444b57), 0.4, 1.4, 1.05));
  const carriage = new THREE.Group(); carriage.position.set(0, 0.3, 1.15); fork.add(carriage);
  carriage.add(box(0.12, 0.06, 1.1, blk, -0.3, 0, 0.55)); carriage.add(box(0.12, 0.06, 1.1, blk, 0.3, 0, 0.55));
  carriage.add(box(1.0, 0.12, 1.0, palletM, 0, 0.09, 0.55)); carriage.add(box(0.9, 0.7, 0.9, mat(0xb8875a), 0, 0.5, 0.55));
  const beaconM = new THREE.MeshStandardMaterial({ color: 0xff9900, emissive: 0xff7700, emissiveIntensity: 2 });
  fork.add(mesh(new THREE.SphereGeometry(0.1, 12, 8), beaconM, 0, 2.72, -0.5, false));
  fork.position.set(-8, 0, 1.5);
  scene.add(fork);
  let forkX = -8;
  anim.push((t) => {
    const nx = -8 + 9 * Math.sin(t * 0.22);
    const dir = nx - forkX; forkX = nx;
    fork.position.x = nx;
    if (Math.abs(dir) > 1e-4) fork.rotation.y = THREE.MathUtils.lerp(fork.rotation.y, dir > 0 ? Math.PI / 2 : -Math.PI / 2, 0.06);
    carriage.position.y = 0.3 + 0.25 * (1 + Math.sin(t * 0.9)) * 0.5;
    beaconM.emissiveIntensity = 1 + Math.abs(Math.sin(t * 6)) * 2;
  });

  // chancador y correa
  const mach = mat(0x8a94a6, { metalness: 0.5, roughness: 0.45 });
  const machY = mat(0xf2b705, { metalness: 0.3, roughness: 0.5 });
  const crusher = new THREE.Group(); crusher.position.set(10, 0, -9); scene.add(crusher);
  crusher.add(box(4, 2.2, 3.4, machY, 0, 1.1, 0));
  const hopper = mesh(new THREE.CylinderGeometry(2.4, 1.2, 1.8, 4, 1, true), new THREE.MeshStandardMaterial({ color: 0x8a94a6, metalness: 0.5, roughness: 0.45, side: THREE.DoubleSide }), 0, 3.1, 0);
  hopper.rotation.y = Math.PI / 4; crusher.add(hopper);
  const fly = mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.3, 24), mach, -2.2, 1.6, 0); fly.rotation.z = Math.PI / 2; crusher.add(fly);
  for (let i = 0; i < 4; i++) { const s = box(0.08, 2, 0.12, mat(0x333), 0, 0, 0); s.rotation.x = i * Math.PI / 4; fly.add(s); s.position.y = 0; s.rotation.order = 'XYZ'; s.rotation.z = Math.PI / 2; }
  crusher.add(box(1.4, 1.2, 1.2, mat(0x2d5fa8, { metalness: 0.4 }), -2.6, 0.6, 1.6));
  // barandas de protección
  const railM = mat(C.yellow);
  [[-3.2, 0, 0.06, 7], [3.2, 0, 0.06, 7]].forEach(([x, z, w, d]) => { crusher.add(box(w, 0.06, d, railM, x, 1.1, z)); crusher.add(box(w, 0.06, d, railM, x, 0.6, z)); });
  for (let z = -3.4; z <= 3.4; z += 1.7) { crusher.add(box(0.06, 1.1, 0.06, railM, -3.2, 0.55, z)); crusher.add(box(0.06, 1.1, 0.06, railM, 3.2, 0.55, z)); }
  anim.push((t) => { fly.rotation.x = t * 3; });

  const conv = new THREE.Group();
  const a = new THREE.Vector3(12.3, 1.3, -9), b = new THREE.Vector3(18.6, 3.6, -9);
  const len = a.distanceTo(b), ang = Math.atan2(b.y - a.y, b.x - a.x);
  conv.position.copy(a).add(b).multiplyScalar(0.5); conv.rotation.z = ang; scene.add(conv);
  conv.add(box(len, 0.12, 1.0, mat(0x1d1f24, { roughness: 0.95 }), 0, 0, 0));
  conv.add(box(len, 0.25, 0.08, mach, 0, 0.05, 0.55)); conv.add(box(len, 0.25, 0.08, mach, 0, 0.05, -0.55));
  for (let i = 1; i < 4; i++) {
    const px = a.x + (b.x - a.x) * i / 4, py = a.y + (b.y - a.y) * i / 4;
    scene.add(box(0.12, py, 0.12, mach, px, py / 2, -9.5)); scene.add(box(0.12, py, 0.12, mach, px, py / 2, -8.5));
  }
  const ore = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.16), mat(0x6e6258, { roughness: 1 }), 18);
  ore.castShadow = true; conv.add(ore);
  anim.push((t) => {
    for (let i = 0; i < 18; i++) {
      const k = ((t * 0.12 + i / 18) % 1);
      dummy.position.set(-len / 2 + k * len, 0.18, ((i * 37) % 7) / 10 - 0.3);
      dummy.rotation.set(i, i * 2, 0); dummy.scale.setScalar(0.8 + (i % 3) * 0.2); dummy.updateMatrix();
      ore.setMatrixAt(i, dummy.matrix);
    }
    ore.instanceMatrix.needsUpdate = true;
  });
  scene.add(mesh(new THREE.ConeGeometry(2.2, 2.6, 20), mat(0x6e6258, { roughness: 1, flatShading: true }), 19.6, 1.3, -9));

  // estanques
  [[15.5, 11.5, 0xd9dee6], [19, 11.5, 0xd9dee6]].forEach(([x, z, c]) => {
    scene.add(mesh(new THREE.CylinderGeometry(1.4, 1.4, 4.2, 24), mat(c, { metalness: 0.5, roughness: 0.3 }), x, 2.1, z));
    scene.add(mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.2, 24), mat(0x2d5fa8), x, 3.0, z));
  });
  const haz = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: tex(128, 128, (g) => { g.fillStyle = '#fff'; g.save(); g.translate(64, 64); g.rotate(Math.PI / 4); g.fillRect(-40, -40, 80, 80); g.strokeStyle = '#e5323f'; g.lineWidth = 8; g.strokeRect(-36, -36, 72, 72); g.restore(); g.fillStyle = '#111'; g.font = '700 40px Arial'; g.textAlign = 'center'; g.fillText('8', 64, 78); }) }));
  haz.position.set(15.5, 2.2, 10.08); haz.rotation.y = Math.PI; scene.add(haz);

  // salidas de emergencia
  const exitM = mat(C.green, { emissive: 0x0b5a2c });
  const salidaTex = signTex('SALIDA', '#14a85a', '#fff', { size: 70, tx: 300, icon: (g) => runningMan(g, 110, 86, 1.4, '#fff') });
  const exitSign = (x, face) => {
    const g = new THREE.Group(); g.position.set(x, 0, 6); g.rotation.y = face; scene.add(g);
    g.add(box(0.36, 2.7, 0.18, exitM, 0, 1.35, -1.25)); g.add(box(0.36, 2.7, 0.18, exitM, 0, 1.35, 1.25)); g.add(box(0.36, 0.18, 2.68, exitM, 0, 2.7, 0));
    const doorM = mat(0x9aa4b2, { metalness: 0.5, roughness: 0.4 });
    const d1 = box(0.06, 2.5, 1.12, doorM, 0.35, 1.25, -0.58); d1.rotation.y = -0.9; d1.position.set(0.55, 1.25, -0.9); g.add(d1);
    const d2 = box(0.06, 2.5, 1.12, doorM, 0.35, 1.25, 0.58); d2.rotation.y = 0.9; d2.position.set(0.55, 1.25, 0.9); g.add(d2);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.6), new THREE.MeshBasicMaterial({ map: salidaTex }));
    s.position.set(-0.2, 3.2, 0); s.rotation.y = -Math.PI / 2; g.add(s);
    const s2 = s.clone(); s2.position.x = 0.2; s2.rotation.y = Math.PI / 2; g.add(s2);
    const l = new THREE.PointLight(C.green, 2, 6); l.position.set(-0.8, 2.6, 0); g.add(l);
  };
  exitSign(22.15, 0); exitSign(-22.15, Math.PI);

  // extintores
  const extTex = signTex('EXTINTOR', '#d81f2c', '#fff', { size: 60, w: 400, h: 140 });
  const extinguisher = (x, z, ry) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
    g.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.62, 18), mat(C.red, { metalness: 0.3, roughness: 0.35 }), 0, 0.95, 0));
    g.add(mesh(new THREE.SphereGeometry(0.15, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(C.red, { metalness: 0.3, roughness: 0.35 }), 0, 1.26, 0));
    g.add(box(0.08, 0.12, 0.2, mat(0x222), 0, 1.44, 0));
    const hose = mesh(new THREE.TorusGeometry(0.16, 0.025, 6, 16, Math.PI), mat(0x111), 0, 1.15, 0.12); hose.rotation.y = Math.PI / 2; g.add(hose);
    g.add(box(0.5, 0.06, 0.06, mat(0x333), 0, 1.05, -0.17));
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.32), new THREE.MeshBasicMaterial({ map: extTex }));
    s.position.set(0, 1.85, -0.16); g.add(s);
  };
  extinguisher(21.75, 1.5, -Math.PI / 2); extinguisher(-21.75, 1.5, Math.PI / 2); extinguisher(2, -14.75, 0);

  // balizas de alarma
  const alarmM = new THREE.MeshStandardMaterial({ color: 0x661018, emissive: 0xff1a2a, emissiveIntensity: 0.2 });
  [[0, 6.3, -14.85], [21.85, 5.6, -2]].forEach(([x, y, z]) => {
    scene.add(mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.15, 16), mat(0x333), x, y - 0.12, z, false));
    scene.add(mesh(new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), alarmM, x, y - 0.05, z, false));
  });

  // control de acceso
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fdcff, transparent: true, opacity: 0.35, metalness: 0.2, roughness: 0.05 });
  scene.add(box(2.6, 2.8, 2.2, mat(0xdfe5ee), -12, 1.4, 13.4));
  scene.add(box(2.62, 0.9, 1.8, glass, -12, 1.9, 13.4));
  scene.add(box(2.9, 0.15, 2.5, mat(0x2d5fa8), -12, 2.86, 13.4));
  const acc = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.5), new THREE.MeshBasicMaterial({ map: signTex('CONTROL DE ACCESO', '#1f4f99', '#fff', { size: 44, w: 640, h: 130 }) }));
  acc.position.set(-12, 3.3, 14.55); scene.add(acc);
  for (const x of [-9.2, -8, -6.8]) {
    scene.add(box(0.25, 1.0, 0.8, mat(0xb8c2d0, { metalness: 0.6, roughness: 0.3 }), x, 0.5, 14.6));
  }
  for (const x of [-8.6, -7.4]) scene.add(box(0.9, 0.04, 0.04, mat(0xe5323f), x, 0.9, 14.6));
  // bolardos frontales
  const bol = mat(C.yellow, { roughness: 0.4 });
  for (let x = -21; x <= 21; x += 2) {
    if (x > -10 && x < -6) continue;
    scene.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 10), bol, x, 0.45, 15.2));
  }

  // punto de encuentro
  const peM = decalMat(C.green, 0.9);
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.4, 2.8, 48), peM); ring.rotation.x = -Math.PI / 2; ring.position.set(30, 0.02, 12); scene.add(ring);
  scene.add(decal(4.2, 4.2, decalMat(0xffffff, 1, tex(256, 256, (g) => { g.clearRect(0, 0, 256, 256); g.fillStyle = 'rgba(43,212,125,.25)'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill(); g.fillStyle = '#2bd47d'; g.font = '700 110px Arial'; g.textAlign = 'center'; g.fillText('PE', 128, 166); })), 30, 12, 0.018));
  scene.add(box(0.12, 3, 0.12, mat(0xcccccc, { metalness: 0.6 }), 32.8, 1.5, 12));
  const peSign = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.0), new THREE.MeshBasicMaterial({ map: tex(400, 200, (g, w, h) => { g.fillStyle = '#14a85a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = '#fff'; g.font = '700 40px Arial'; g.textAlign = 'center'; g.fillText('PUNTO DE', w / 2, 86); g.fillText('ENCUENTRO', w / 2, 136); for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(70 + i * 86, 172, 8, 0, 7); g.fill(); } }), side: THREE.DoubleSide }));
  peSign.position.set(32.8, 3.1, 12); peSign.rotation.y = -Math.PI / 2 + 0.4; scene.add(peSign);

  // guía (Ana)
  const guide = buildGuide();
  guide.group.position.set(-6, 0, 11);
  scene.add(guide.group);
  anim.push(guide.update);

  // ruta de evacuación (cinta con flechas animadas)
  const curve = new THREE.CatmullRomCurve3(ROUTE.map(([x, z]) => new THREE.Vector3(x, 0.03, z)), false, 'centripetal');
  const routeLen = curve.getLength();
  const arrowTex = tex(128, 64, (g, w, h) => {
    g.fillStyle = 'rgba(20,168,90,.55)'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d9ffe9'; g.beginPath(); g.moveTo(30, 10); g.lineTo(70, 32); g.lineTo(30, 54); g.lineTo(44, 32); g.closePath(); g.fill();
    g.fillStyle = '#2bd47d'; g.fillRect(0, 0, w, 5); g.fillRect(0, h - 5, w, 5);
  });
  arrowTex.wrapS = THREE.RepeatWrapping;
  const N = 160, pos = [], uv = [], idx = [], wHalf = 0.45;
  for (let i = 0; i <= N; i++) {
    const u = i / N, p = curve.getPointAt(u), t = curve.getTangentAt(u);
    const nx = -t.z, nz = t.x;
    pos.push(p.x + nx * wHalf, 0.035, p.z + nz * wHalf, p.x - nx * wHalf, 0.035, p.z - nz * wHalf);
    uv.push(u * routeLen / 1.2, 1, u * routeLen / 1.2, 0);
    if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  rg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  rg.setIndex(idx); rg.computeVertexNormals();
  const routeMesh = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ map: arrowTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
  routeMesh.visible = false; scene.add(routeMesh);
  let routeSpeed = 0.6;
  anim.push((t, dt) => { arrowTex.offset.x -= dt * routeSpeed; });

  // trabajador que evacúa
  const walker = buildWorker();
  walker.visible = false; walker.scale.setScalar(1.4); scene.add(walker);

  return {
    scene, anim, curve, routeMesh, walker, guide,
    setRouteSpeed: (s) => { routeSpeed = s; },
    setAlarm(on, t) {
      const k = on ? (0.5 + 0.5 * Math.sin(t * 10)) : 0;
      alarmM.emissiveIntensity = on ? 0.4 + k * 3 : 0.2;
      alarmLight.intensity = on ? k * 60 : 0;
      hemi.color.setHex(on ? 0xffc8c8 : 0xbfd8ff);
    }
  };
}

function buildWorker() {
  const g = new THREE.Group();
  const vest = mat(C.orange, { emissive: 0x401800 });
  g.add(mesh(new THREE.CapsuleGeometry(0.2, 0.55, 4, 10), vest, 0, 1.05, 0));
  g.add(mesh(new THREE.CapsuleGeometry(0.08, 0.5, 4, 8), mat(0x24324a), -0.1, 0.4, 0));
  g.add(mesh(new THREE.CapsuleGeometry(0.08, 0.5, 4, 8), mat(0x24324a), 0.1, 0.4, 0));
  g.add(mesh(new THREE.SphereGeometry(0.15, 14, 10), mat(0xc98e6b), 0, 1.6, 0));
  g.add(mesh(new THREE.SphereGeometry(0.17, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xffffff, { roughness: 0.3 }), 0, 1.64, 0));
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.6, 32), new THREE.MeshBasicMaterial({ color: C.yellow, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = 0.05; g.add(halo);
  return g;
}

function buildGuide() {
  const group = new THREE.Group();
  const body = new THREE.Group(); group.add(body);
  const skin = mat(0xc98e6b, { roughness: 0.6 });
  const pants = mat(0x1f2a40);
  const vestM = mat(C.orange, { emissive: 0x3a1500, roughness: 0.5 });
  const refl = new THREE.MeshStandardMaterial({ color: 0xe8eef8, emissive: 0x9aa6b8, emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.2 });
  body.add(mesh(new THREE.CapsuleGeometry(0.09, 0.7, 4, 10), pants, -0.11, 0.46, 0));
  body.add(mesh(new THREE.CapsuleGeometry(0.09, 0.7, 4, 10), pants, 0.11, 0.46, 0));
  body.add(box(0.14, 0.09, 0.26, mat(0x222), -0.11, 0.05, 0.04)); body.add(box(0.14, 0.09, 0.26, mat(0x222), 0.11, 0.05, 0.04));
  const torso = mesh(new THREE.CapsuleGeometry(0.2, 0.42, 4, 14), mat(0x2b4c7e), 0, 1.22, 0); torso.scale.z = 0.75; body.add(torso);
  const vest = mesh(new THREE.CylinderGeometry(0.225, 0.21, 0.5, 20, 1, true), vestM, 0, 1.22, 0); vest.scale.z = 0.78; body.add(vest);
  [1.12, 1.3].forEach((y) => { const r = mesh(new THREE.CylinderGeometry(0.228, 0.228, 0.035, 20, 1, true), refl, 0, y, 0); r.scale.z = 0.79; body.add(r); });
  body.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 10), skin, 0, 1.6, 0));
  const head = mesh(new THREE.SphereGeometry(0.14, 20, 16), skin, 0, 1.76, 0); head.scale.y = 1.08; body.add(head);
  const hair = mesh(new THREE.SphereGeometry(0.15, 20, 16, Math.PI * 0.5, Math.PI, 0, Math.PI * 0.7), mat(0x2a1a12), 0, 1.77, -0.01); body.add(hair);
  const ponytail = mesh(new THREE.CapsuleGeometry(0.05, 0.16, 4, 8), mat(0x2a1a12), 0, 1.66, -0.15); ponytail.rotation.x = 0.4; body.add(ponytail);
  [-0.05, 0.05].forEach((x) => body.add(mesh(new THREE.SphereGeometry(0.018, 8, 6), mat(0x111), x, 1.78, 0.13, false)));
  const smile = mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 12, Math.PI), mat(0x7a2e2e), 0, 1.72, 0.128, false); smile.rotation.z = Math.PI; body.add(smile);
  body.add(mesh(new THREE.SphereGeometry(0.165, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xffffff, { roughness: 0.25 }), 0, 1.82, 0));
  const brim = mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.015, 24), mat(0xffffff, { roughness: 0.25 }), 0, 1.82, 0.03); body.add(brim);
  const arm = (side) => {
    const sh = new THREE.Group(); sh.position.set(side * 0.27, 1.45, 0); body.add(sh);
    sh.add(mesh(new THREE.CapsuleGeometry(0.06, 0.3, 4, 8), mat(0x2b4c7e), 0, -0.2, 0));
    sh.add(mesh(new THREE.CapsuleGeometry(0.055, 0.26, 4, 8), mat(0x2b4c7e), 0, -0.52, 0));
    sh.add(mesh(new THREE.SphereGeometry(0.065, 10, 8), mat(0xff9f1c), 0, -0.72, 0));
    sh.rotation.z = side * 0.12;
    return sh;
  };
  arm(-1);
  const right = arm(1);
  // tablet en la mano izquierda
  const tablet = box(0.28, 0.2, 0.02, new THREE.MeshStandardMaterial({ color: 0x111827, emissive: 0x1f6fff, emissiveIntensity: 0.5 }), -0.32, 0.86, 0.14);
  tablet.rotation.x = -0.6; body.add(tablet);
  // base holográfica
  const holoM = new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  const base = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.62, 48), holoM); base.rotation.x = -Math.PI / 2; base.position.y = 0.03; group.add(base);
  const base2 = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.75, 6), holoM); base2.rotation.x = -Math.PI / 2; base2.position.y = 0.03; group.add(base2);
  // etiqueta
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(512, 128, (g, w, h) => { g.fillStyle = 'rgba(7,11,20,.85)'; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 40); g.fill(); g.strokeStyle = '#3ee6ff'; g.lineWidth = 4; g.stroke(); g.fillStyle = '#fff'; g.font = '700 52px Arial'; g.textAlign = 'center'; g.fillText('Ana · Guía', w / 2, 82); }), depthTest: true }));
  label.scale.set(1.6, 0.4, 1); label.position.y = 2.35; group.add(label);
  let wave = 0;
  return {
    group,
    wave() { wave = 3; },
    update(t, dt, camera) {
      body.position.y = Math.sin(t * 2) * 0.015;
      base2.rotation.z = t * 0.6;
      wave = Math.max(0, wave - dt);
      const w = 0.5 + 0.5 * Math.sin(t * 1.3);
      right.rotation.z = 0.12 + (wave > 0 ? 2.5 : 0) + (wave > 0 ? Math.sin(t * 9) * 0.35 : w * 0.05);
      if (camera) {
        const cp = new THREE.Vector3(); camera.getWorldPosition(cp);
        const target = Math.atan2(cp.x - group.position.x, cp.z - group.position.z);
        let d = target - group.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
        group.rotation.y += d * Math.min(1, dt * 3);
      }
    }
  };
}

/* ---------------- maniquí EPP ---------------- */
function buildEpp() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1222);
  scene.fog = new THREE.Fog(0x0a1222, 8, 22);
  scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x1a1a22, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.8); key.position.set(2, 4, 3); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); scene.add(key);
  const rim = new THREE.PointLight(C.cyan, 8, 8); rim.position.set(-1.5, 2, -1.5); scene.add(rim);
  const rim2 = new THREE.PointLight(C.yellow, 4, 8); rim2.position.set(1.8, 0.6, -1); scene.add(rim2);
  const grid = new THREE.GridHelper(30, 60, 0x1f6f88, 0x14304a); grid.material.transparent = true; grid.material.opacity = 0.5; scene.add(grid);
  const anim = [];

  // plataforma
  const plat = mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.12, 64), mat(0x1a2336, { metalness: 0.6, roughness: 0.3 }), 0, 0.06, 0); scene.add(plat);
  const glowM = new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
  const r1 = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.2, 64), glowM); r1.rotation.x = -Math.PI / 2; r1.position.y = 0.125; scene.add(r1);
  const holo = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.006, 6, 80), new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.6 }));
  holo.rotation.x = Math.PI / 2; scene.add(holo);
  anim.push((t) => { holo.position.y = 0.2 + (Math.sin(t * 0.8) * 0.5 + 0.5) * 1.7; holo.material.opacity = 0.25 + 0.35 * Math.abs(Math.sin(t * 0.8)); });

  // maniquí
  const m = new THREE.Group(); m.position.y = 0.12; scene.add(m);
  const skinM = () => new THREE.MeshStandardMaterial({ color: 0x8994aa, roughness: 0.45, metalness: 0.25, emissive: 0x000000 });
  const parts = [];
  const part = (name, obj) => { obj.userData.part = name; parts.push(obj); return obj; };
  const head = part('head', mesh(new THREE.SphereGeometry(0.115, 24, 18), skinM(), 0, 1.74, 0)); head.scale.y = 1.1; m.add(head);
  const eyes = part('eyes', mesh(new THREE.BoxGeometry(0.17, 0.045, 0.06), new THREE.MeshStandardMaterial({ color: 0x3a4458, roughness: 0.3, metalness: 0.5, emissive: 0x000000 }), 0, 1.755, 0.085)); m.add(eyes);
  m.add(mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.12, 12), skinM(), 0, 1.6, 0));
  const torso = part('torso', mesh(new THREE.CapsuleGeometry(0.17, 0.36, 6, 16), skinM(), 0, 1.25, 0)); torso.scale.set(1.1, 1, 0.7); m.add(torso);
  m.add(mesh(new THREE.BoxGeometry(0.34, 0.16, 0.2), skinM(), 0, 0.98, 0));
  const legs = [];
  [-0.1, 0.1].forEach((x) => { const l = part('feet', mesh(new THREE.CapsuleGeometry(0.075, 0.72, 6, 12), skinM(), x, 0.52, 0)); legs.push(l); m.add(l); });
  const feet = [];
  [-0.1, 0.1].forEach((x) => { const f = part('feet', mesh(new THREE.BoxGeometry(0.11, 0.07, 0.24), skinM(), x, 0.035, 0.04)); feet.push(f); m.add(f); });
  const arms = [];
  [-1, 1].forEach((s) => {
    const sh = new THREE.Group(); sh.position.set(s * 0.25, 1.47, 0); sh.rotation.z = s * 0.14; m.add(sh);
    sh.add(mesh(new THREE.SphereGeometry(0.065, 12, 10), skinM(), 0, 0, 0));
    sh.add(part('torso', mesh(new THREE.CapsuleGeometry(0.05, 0.26, 4, 10), skinM(), 0, -0.19, 0)));
    sh.add(part('hands', mesh(new THREE.CapsuleGeometry(0.045, 0.24, 4, 10), skinM(), 0, -0.5, 0)));
    const hand = part('hands', mesh(new THREE.SphereGeometry(0.055, 12, 10), skinM(), 0, -0.72, 0)); hand.scale.set(0.9, 1.25, 0.7); sh.add(hand);
    arms.push(sh);
  });

  // EPP
  const items = {};
  const add = (id, parent, obj, from) => {
    obj.visible = false; obj.userData.from = from; parent.add(obj);
    (items[id] || (items[id] = [])).push(obj);
  };
  const yellowHard = mat(C.yellow, { roughness: 0.3, metalness: 0.1 });
  const casco = new THREE.Group(); casco.position.set(0, 1.765, 0);
  casco.add(mesh(new THREE.SphereGeometry(0.142, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), yellowHard));
  casco.add(mesh(new THREE.CylinderGeometry(0.168, 0.17, 0.014, 32), yellowHard, 0, 0.004, 0.025));
  casco.add(box(0.035, 0.03, 0.26, yellowHard, 0, 0.14, 0));
  casco.add(mesh(new THREE.TorusGeometry(0.11, 0.006, 6, 24, Math.PI), mat(0x222), 0, -0.06, 0).rotateY(Math.PI / 2).rotateZ(Math.PI));
  add('casco', m, casco, 'drop');
  const lentes = new THREE.Group(); lentes.position.set(0, 1.755, 0);
  lentes.add(mesh(new THREE.CylinderGeometry(0.128, 0.128, 0.06, 32, 1, true, -Math.PI * 0.33, Math.PI * 0.66), new THREE.MeshStandardMaterial({ color: C.cyan, transparent: true, opacity: 0.45, metalness: 0.6, roughness: 0.05, side: THREE.DoubleSide, emissive: 0x0b4f5c })));
  lentes.add(mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.008, 32, 1, true, -Math.PI * 0.45, Math.PI * 0.9), mat(0x111), 0, 0.032, 0));
  add('lentes', m, lentes, 'front');
  const gloveM = mat(0xff9f1c, { roughness: 0.8 });
  arms.forEach((sh) => {
    const g = new THREE.Group(); g.position.set(0, -0.71, 0);
    const p = mesh(new THREE.SphereGeometry(0.066, 14, 10), gloveM); p.scale.set(0.95, 1.35, 0.8); g.add(p);
    g.add(mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.09, 14), mat(0x334155), 0, 0.09, 0));
    add('guantes', sh, g, 'scale');
  });
  feet.forEach((f) => {
    const g = new THREE.Group(); g.position.set(f.position.x, 0.045, 0.045);
    g.add(box(0.135, 0.09, 0.285, mat(0x1c2230, { roughness: 0.6 })));
    g.add(box(0.14, 0.025, 0.29, mat(0x6b4a1f), 0, -0.04, 0));
    g.add(box(0.138, 0.07, 0.08, mat(C.yellow, { metalness: 0.4 }), 0, 0, 0.11));
    g.add(mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.12, 14), mat(0x1c2230), 0, 0.09, -0.04));
    add('zapatos', m, g, 'drop');
  });
  const chaleco = new THREE.Group(); chaleco.position.set(0, 1.29, 0);
  const vm = mesh(new THREE.CylinderGeometry(0.205, 0.19, 0.44, 28, 1, true), new THREE.MeshStandardMaterial({ color: C.orange, emissive: 0x4a1a00, roughness: 0.55, side: THREE.DoubleSide })); vm.scale.z = 0.78; chaleco.add(vm);
  const refl = new THREE.MeshStandardMaterial({ color: 0xeef3fa, emissive: 0xaab4c4, emissiveIntensity: 0.6, metalness: 0.7, roughness: 0.2 });
  [-0.1, 0.06].forEach((y) => { const r = mesh(new THREE.CylinderGeometry(0.208, 0.205, 0.035, 28, 1, true), refl, 0, y, 0); r.scale.z = 0.79; chaleco.add(r); });
  add('chaleco', m, chaleco, 'drop');

  const anims = [];
  function equip(id, instant) {
    (items[id] || []).forEach((o) => {
      o.visible = true;
      if (!o.userData.base) o.userData.base = o.position.clone();
      if (instant) { o.position.copy(o.userData.base); o.scale.setScalar(1); return; }
      anims.push({ o, t: 0 });
    });
  }
  function reset() { Object.values(items).flat().forEach((o) => { o.visible = false; }); anims.length = 0; }
  const easeOutBack = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  anim.push((t, dt) => {
    for (let i = anims.length - 1; i >= 0; i--) {
      const a = anims[i]; a.t = Math.min(1, a.t + dt / 0.7);
      const k = easeOutBack(a.t), base = a.o.userData.base, from = a.o.userData.from;
      a.o.position.copy(base);
      if (from === 'drop') a.o.position.y += (1 - k) * 0.6;
      if (from === 'front') a.o.position.z += (1 - k) * 0.5;
      a.o.scale.setScalar(Math.max(0.001, from === 'scale' ? k : Math.min(1, 0.4 + a.t * 0.6)));
      if (a.t >= 1) anims.splice(i, 1);
    }
  });
  function highlight(name) {
    parts.forEach((p) => p.material.emissive.setHex(p.userData.part === name ? 0x1d5f73 : 0x000000));
  }
  return { scene, anim, parts, equip, reset, highlight };
}

/* ---------------- marcadores ---------------- */
function makeMarker(color) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2, metalness: 0.2, roughness: 0.3 });
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.32), m); gem.position.y = 1.1; g.add(gem);
  const beamM = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending });
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.position.y = 1.1; g.add(hit);
  return { group: g, gem, hit, mat: m, beamM };
}

/* ---------------- experiencia ---------------- */
export function createExperience({ container, markers, vrSlot, reducedMotion, onSelect, onPart }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.xr.enabled = true;
  const canvas = renderer.domElement;
  canvas.setAttribute('tabindex', '0');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Escena 3D interactiva. Usa la lista del panel lateral como alternativa accesible.');
  container.appendChild(canvas);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 300);
  const rig = new THREE.Group(); rig.add(camera);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.listenToKeyEvents(canvas);

  const plant = buildPlant();
  const epp = buildEpp();
  let world = plant, mode = 'plant', view = null;
  let hotspots = [];
  let visited = new Set(), activeId = null;
  let fly = null, evac = null, running = false;
  const clock = new THREE.Clock();

  function setControlsFor(m) {
    if (m === 'epp') {
      Object.assign(controls, { minDistance: 1.4, maxDistance: 5, enablePan: false, autoRotate: !reducedMotion, autoRotateSpeed: 0.8, maxPolarAngle: Math.PI * 0.6 });
    } else {
      Object.assign(controls, { minDistance: 3, maxDistance: 70, enablePan: true, autoRotate: false, maxPolarAngle: Math.PI * 0.47 });
    }
  }
  controls.addEventListener('start', () => { fly = null; controls.autoRotate = false; });

  function flyTo(cam, target, dur = 1.6) {
    const to = new THREE.Vector3(...cam), tt = new THREE.Vector3(...target);
    if (reducedMotion || dur === 0) { camera.position.copy(to); controls.target.copy(tt); controls.update(); fly = null; return; }
    fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: to, t1: tt, k: 0, dur, start: performance.now() };
  }

  // en pantallas verticales (móvil) aleja la cámara para que entre la escena
  function fit(v) {
    const a = camera.aspect, k = a < 1.25 ? Math.pow(1.25 / a, 0.8) : 1;
    const t = v.target, c = v.cam;
    return [t[0] + (c[0] - t[0]) * k, t[1] + (c[1] - t[1]) * k, t[2] + (c[2] - t[2]) * k];
  }
  function clearHotspots() {
    hotspots.forEach((h) => { plant.scene.remove(h.marker.group); h.el.remove(); });
    hotspots = [];
    markers.innerHTML = '';
  }
  function buildHotspots(points) {
    clearHotspots();
    points.forEach((p, i) => {
      const mk = makeMarker(C.yellow);
      mk.group.position.set(p.pos[0], p.pos[1], p.pos[2]);
      // haz vertical hasta el piso
      const hgt = p.pos[1] + 1.1;
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, hgt, 8, 1, true), mk.beamM);
      beam.position.y = 1.1 - hgt / 2; mk.group.add(beam);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 32), new THREE.MeshBasicMaterial({ color: C.yellow, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = -p.pos[1] + 0.05; mk.group.add(ring);
      mk.ring = ring;
      mk.hit.userData.hotspot = p.id;
      mk.gem.userData.hotspot = p.id;
      plant.scene.add(mk.group);
      const el = document.createElement('button');
      el.type = 'button'; el.className = 'hs-marker'; el.dataset.id = p.id; el.textContent = String(i + 1);
      el.setAttribute('aria-label', p.title);
      el.addEventListener('click', () => onSelect && onSelect(p.id));
      markers.appendChild(el);
      hotspots.push({ p, marker: mk, el, v: new THREE.Vector3(p.pos[0], p.pos[1], p.pos[2]) });
    });
    paintHotspots();
  }
  function paintHotspots() {
    hotspots.forEach((h) => {
      const c = visited.has(h.p.id) ? C.green : C.yellow;
      h.marker.mat.color.setHex(c); h.marker.mat.emissive.setHex(c); h.marker.beamM.color.setHex(c); h.marker.ring.material.color.setHex(c);
      h.el.classList.toggle('visited', visited.has(h.p.id));
      h.el.classList.toggle('active', activeId === h.p.id);
    });
  }

  function resize() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  // selección por raycasting
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return intersect();
  }
  function intersect() {
    if (mode === 'epp') {
      const hit = ray.intersectObjects(epp.parts, false)[0];
      return hit ? { part: hit.object.userData.part } : null;
    }
    const objs = hotspots.flatMap((h) => [h.marker.gem, h.marker.hit]);
    const hit = ray.intersectObjects(objs, false)[0];
    if (hit) return { hotspot: hit.object.userData.hotspot };
    const g = ray.intersectObject(plant.guide.group, true)[0];
    if (g) return { guide: true };
    return null;
  }
  function handlePick(res) {
    if (!res) return;
    if (res.hotspot) { onSelect && onSelect(res.hotspot); showVRPanel(res.hotspot); }
    else if (res.part) { onPart && onPart(res.part); epp.highlight(res.part); setTimeout(() => epp.highlight(null), 900); }
    else if (res.guide) plant.guide.wave();
  }
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
    if (moved < 6) handlePick(pick(e.clientX, e.clientY));
  });
  let hoverT = 0;
  canvas.addEventListener('pointermove', (e) => {
    const now = performance.now(); if (now - hoverT < 60 || e.pointerType === 'touch') return; hoverT = now;
    const res = pick(e.clientX, e.clientY);
    canvas.style.cursor = res ? 'pointer' : 'grab';
    if (mode === 'epp') epp.highlight(res && res.part);
  });

  // WebXR
  const tmpM = new THREE.Matrix4();
  const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
  const ctrls = [0, 1].map((i) => {
    const c = renderer.xr.getController(i);
    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: C.cyan }));
    line.scale.z = 8; c.add(line);
    c.addEventListener('select', () => {
      tmpM.identity().extractRotation(c.matrixWorld);
      ray.ray.origin.setFromMatrixPosition(c.matrixWorld);
      ray.ray.direction.set(0, 0, -1).applyMatrix4(tmpM);
      ray.camera = camera;
      handlePick(intersect());
    });
    rig.add(c);
    return c;
  });
  let vrPanel = null;
  function showVRPanel(id) {
    if (!renderer.xr.isPresenting) return;
    const h = hotspots.find((x) => x.p.id === id); if (!h) return;
    const t = tex(1024, 560, (g, w, hh) => {
      g.fillStyle = 'rgba(9,15,29,.94)'; g.beginPath(); g.roundRect(0, 0, w, hh, 40); g.fill();
      g.strokeStyle = '#3ee6ff'; g.lineWidth = 6; g.stroke();
      g.fillStyle = '#ffc533'; g.font = '700 58px Arial'; wrapText(g, h.p.title, 50, 100, w - 100, 64);
      g.fillStyle = '#e8eefb'; g.font = '400 38px Arial'; wrapText(g, h.p.text, 50, 200, w - 100, 50);
    });
    if (vrPanel) { world.scene.remove(vrPanel); vrPanel.material.map.dispose(); }
    vrPanel = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.875), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
    const cp = new THREE.Vector3(), dir = new THREE.Vector3();
    camera.getWorldPosition(cp); camera.getWorldDirection(dir); dir.y = 0; dir.normalize();
    vrPanel.position.copy(cp).addScaledVector(dir, 2); vrPanel.position.y = cp.y - 0.1;
    vrPanel.lookAt(cp.x, vrPanel.position.y, cp.z);
    world.scene.add(vrPanel);
  }
  let saved = null;
  renderer.xr.addEventListener('sessionstart', () => {
    saved = { p: camera.position.clone(), t: controls.target.clone() };
    controls.enabled = false;
    camera.position.set(0, 0, 0); camera.rotation.set(0, 0, 0);
    if (mode === 'epp') rig.position.set(0, 0, 1.8); else { rig.position.set(4, 0, 9.5); }
    rig.rotation.set(0, 0, 0);
  });
  renderer.xr.addEventListener('sessionend', () => {
    rig.position.set(0, 0, 0);
    controls.enabled = true;
    if (vrPanel) { world.scene.remove(vrPanel); vrPanel = null; }
    if (saved) { camera.position.copy(saved.p); controls.target.copy(saved.t); controls.update(); }
  });
  if (vrSlot && 'xr' in navigator && window.isSecureContext) {
    navigator.xr.isSessionSupported('immersive-vr').then((ok) => {
      if (!ok) return;
      const btn = VRButton.createButton(renderer);
      btn.removeAttribute('style');
      btn.id = 'vr-button';
      vrSlot.appendChild(btn);
      // VRButton escribe estilos en línea al hacer hover; el CSS con !important los neutraliza.
      const relabel = () => { if (/ENTER VR/i.test(btn.textContent)) btn.textContent = 'Entrar en VR'; else if (/EXIT VR/i.test(btn.textContent)) btn.textContent = 'Salir de VR'; };
      new MutationObserver(relabel).observe(btn, { childList: true, characterData: true, subtree: true });
      relabel();
    }).catch(() => {});
  }

  // bucle
  const proj = new THREE.Vector3();
  function updateMarkers() {
    if (mode !== 'plant' || !hotspots.length) return;
    const w = container.clientWidth, h = container.clientHeight;
    hotspots.forEach((hs) => {
      proj.copy(hs.v).project(camera);
      const vis = proj.z < 1 && proj.z > -1 && Math.abs(proj.x) < 1.02 && Math.abs(proj.y) < 1.02 && !renderer.xr.isPresenting;
      hs.el.style.display = vis ? '' : 'none';
      if (vis) hs.el.style.transform = `translate(${((proj.x + 1) / 2 * w).toFixed(1)}px, ${((1 - proj.y) / 2 * h).toFixed(1)}px)`;
    });
  }
  function loop() {
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    world.anim.forEach((f) => f(t, dt, camera));
    if (mode === 'plant') {
      hotspots.forEach((h, i) => {
        h.marker.gem.rotation.y = t * 1.2 + i;
        h.marker.gem.position.y = 1.1 + Math.sin(t * 2 + i) * 0.12;
        const s = activeId === h.p.id ? 1.5 : 1;
        h.marker.gem.scale.lerp(proj.set(s, s, s), 0.15);
        h.marker.ring.scale.setScalar(1 + ((t * 0.8 + i * 0.3) % 1) * 0.6);
        h.marker.ring.material.opacity = 0.75 * (1 - ((t * 0.8 + i * 0.3) % 1));
      });
      // evacuación
      if (evac) {
        evac.k = Math.min(1, (performance.now() - evac.start) / 1000 / evac.dur);
        const p = plant.curve.getPointAt(evac.k), tg = plant.curve.getTangentAt(evac.k);
        plant.walker.position.set(p.x, 0, p.z);
        plant.walker.rotation.y = Math.atan2(tg.x, tg.z);
        plant.walker.children[1].rotation.x = Math.sin(t * 12) * 0.5; plant.walker.children[2].rotation.x = -Math.sin(t * 12) * 0.5;
        plant.setAlarm(true, t);
        if (!renderer.xr.isPresenting && !reducedMotion) {
          const want = new THREE.Vector3(p.x - 7, 9, p.z + 9);
          camera.position.lerp(want, 0.04); controls.target.lerp(new THREE.Vector3(p.x + 2, 0, p.z), 0.08);
        }
        if (evac.k >= 1) { const done = evac.resolve; evac = null; plant.setAlarm(false, 0); plant.setRouteSpeed(0.6); done(); }
      }
    }
    if (fly) {
      fly.k = Math.min(1, (performance.now() - fly.start) / 1000 / fly.dur);
      const e = fly.k < 0.5 ? 4 * fly.k ** 3 : 1 - Math.pow(-2 * fly.k + 2, 3) / 2;
      camera.position.lerpVectors(fly.p0, fly.p1, e);
      controls.target.lerpVectors(fly.t0, fly.t1, e);
      if (fly.k >= 1) fly = null;
    }
    if (!renderer.xr.isPresenting) controls.update();
    renderer.render(world.scene, camera);
    updateMarkers();
  }

  function attachRig() { world.scene.add(rig); }

  const api = {
    setMode(m, opts = {}) {
      mode = m === 'epp' ? 'epp' : 'plant';
      world = mode === 'epp' ? epp : plant;
      attachRig();
      setControlsFor(mode);
      evac = null; plant.setAlarm(false, 0); plant.walker.visible = false;
      activeId = null;
      if (mode === 'plant') {
        buildHotspots(opts.points || []);
        plant.routeMesh.visible = !!opts.route;
        view = opts.view || { cam: [-10, 18, 28], target: [0, 0, 0] };
        resize();
        const vc = fit(view);
        camera.position.set(vc[0] + 8, vc[1] + 14, vc[2] + 10);
        controls.target.set(...view.target);
        controls.update();
        flyTo(vc, view.target, 2.2);
      } else {
        clearHotspots();
        view = { cam: [0.4, 1.45, 3.1], target: [0, 1.0, 0] };
        resize();
        camera.position.set(1.8, 2.2, 4.2); controls.target.set(...view.target); controls.update();
        flyTo(fit(view), view.target, 1.4);
      }
      resize();
    },
    focus(id) {
      const h = hotspots.find((x) => x.p.id === id); if (!h) return;
      controls.autoRotate = false;
      flyTo(fit({ cam: h.p.cam, target: h.p.pos }), h.p.pos, 1.8);
      if (id === 'guia') plant.guide.wave();
    },
    setActive(id) { activeId = id; paintHotspots(); },
    setVisited(ids) { visited = new Set(ids); paintHotspots(); },
    resetView() { if (view) flyTo(fit(view), view.target, 1.4); if (mode === 'epp') controls.autoRotate = !reducedMotion; },
    equip(id, instant) { epp.equip(id, instant); },
    resetEquip() { epp.reset(); },
    runEvacuation(ms) {
      return new Promise((resolve) => {
        plant.routeMesh.visible = true;
        plant.walker.visible = true;
        plant.setRouteSpeed(1.6);
        fly = null;
        evac = { k: 0, dur: ms / 1000, resolve, start: performance.now() };
      });
    },
    pause() { if (!renderer.xr.isPresenting) { renderer.setAnimationLoop(null); running = false; } },
    resume() { if (!running) { clock.getDelta(); renderer.setAnimationLoop(loop); running = true; } },
    renderer
  };
  return api;
}
