// Planta de procesamiento procedural: racks, grúa, chancador, correa, salidas y ruta de evacuación.
import * as THREE from 'three';
import { C, ROUTE, tex, mat, mesh, box, decal, decalMat, signTex, runningMan } from './helpers.js';


/* ---------------- planta ---------------- */
export function buildPlant(T) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.bg);
  scene.fog = new THREE.Fog(C.bg, 60, 130);
  T.tint(scene.background, 'sky'); T.tint(scene.fog.color, 'sky');
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
  T.tint(yellow.color, 'warning'); T.tint(yFill.color, 'warning');
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
  T.tint(wallM.color, 'wallTint');
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
  T.tint(band.color, 'warning');
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
  T.tint(uprM.color, 'primary'); T.tint(beamM.color, 'accent');
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
  T.tint(railM.color, 'warning');
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
  T.tint(exitM.color, 'success');
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
  T.tint(bol.color, 'warning');
  for (let x = -21; x <= 21; x += 2) {
    if (x > -10 && x < -6) continue;
    scene.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 10), bol, x, 0.45, 15.2));
  }

  // punto de encuentro
  const peM = decalMat(C.green, 0.9);
  T.tint(peM.color, 'success');
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.4, 2.8, 48), peM); ring.rotation.x = -Math.PI / 2; ring.position.set(30, 0.02, 12); scene.add(ring);
  scene.add(decal(4.2, 4.2, decalMat(0xffffff, 1, tex(256, 256, (g) => { g.clearRect(0, 0, 256, 256); g.fillStyle = 'rgba(43,212,125,.25)'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill(); g.fillStyle = '#2bd47d'; g.font = '700 110px Arial'; g.textAlign = 'center'; g.fillText('PE', 128, 166); })), 30, 12, 0.018));
  scene.add(box(0.12, 3, 0.12, mat(0xcccccc, { metalness: 0.6 }), 32.8, 1.5, 12));
  const peSign = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.0), new THREE.MeshBasicMaterial({ map: tex(400, 200, (g, w, h) => { g.fillStyle = '#14a85a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = '#fff'; g.font = '700 40px Arial'; g.textAlign = 'center'; g.fillText('PUNTO DE', w / 2, 86); g.fillText('ENCUENTRO', w / 2, 136); for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(70 + i * 86, 172, 8, 0, 7); g.fill(); } }), side: THREE.DoubleSide }));
  peSign.position.set(32.8, 3.1, 12); peSign.rotation.y = -Math.PI / 2 + 0.4; scene.add(peSign);

  // guía (Ana)
  const guide = buildGuide(T);
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
  const walker = buildWorker(T);
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

function buildWorker(T) {
  const g = new THREE.Group();
  const vest = mat(C.orange, { emissive: 0x401800 });
  g.add(mesh(new THREE.CapsuleGeometry(0.2, 0.55, 4, 10), vest, 0, 1.05, 0));
  g.add(mesh(new THREE.CapsuleGeometry(0.08, 0.5, 4, 8), mat(0x24324a), -0.1, 0.4, 0));
  g.add(mesh(new THREE.CapsuleGeometry(0.08, 0.5, 4, 8), mat(0x24324a), 0.1, 0.4, 0));
  g.add(mesh(new THREE.SphereGeometry(0.15, 14, 10), mat(0xc98e6b), 0, 1.6, 0));
  g.add(mesh(new THREE.SphereGeometry(0.17, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xffffff, { roughness: 0.3 }), 0, 1.64, 0));
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.6, 32), new THREE.MeshBasicMaterial({ color: C.yellow, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  T.tint(halo.material.color, 'warning');
  halo.rotation.x = -Math.PI / 2; halo.position.y = 0.05; g.add(halo);
  return g;
}

function buildGuide(T) {
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
  T.tint(holoM.color, 'holo');
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

