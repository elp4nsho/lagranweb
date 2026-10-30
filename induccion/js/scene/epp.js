// Maniquí 3D para equipar con Elementos de Protección Personal.
import * as THREE from 'three';
import { C, mat, mesh, box } from './helpers.js';

/* ---------------- maniquí EPP ---------------- */
export function buildEpp(T) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1222);
  scene.fog = new THREE.Fog(0x0a1222, 8, 22);
  T.tint(scene.background, 'sky'); T.tint(scene.fog.color, 'sky');
  scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x1a1a22, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.8); key.position.set(2, 4, 3); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); scene.add(key);
  const rim = new THREE.PointLight(C.cyan, 8, 8);
  T.tint(rim.color, 'holo'); rim.position.set(-1.5, 2, -1.5); scene.add(rim);
  const rim2 = new THREE.PointLight(C.yellow, 4, 8);
  T.tint(rim2.color, 'accent'); rim2.position.set(1.8, 0.6, -1); scene.add(rim2);
  const grid = new THREE.GridHelper(30, 60, 0x1f6f88, 0x14304a); grid.material.transparent = true; grid.material.opacity = 0.5; scene.add(grid);
  const anim = [];

  // plataforma
  const plat = mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.12, 64), mat(0x1a2336, { metalness: 0.6, roughness: 0.3 }), 0, 0.06, 0); scene.add(plat);
  const glowM = new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
  T.tint(glowM.color, 'primary');
  const r1 = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.2, 64), glowM); r1.rotation.x = -Math.PI / 2; r1.position.y = 0.125; scene.add(r1);
  const holo = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.006, 6, 80), new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.6 }));
  holo.rotation.x = Math.PI / 2; scene.add(holo);
  T.tint(holo.material.color, 'holo');
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
  T.tint(yellowHard.color, 'warning');
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

