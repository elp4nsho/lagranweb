// Experiencia 3D/VR: cámara, controles, hotspots, recorrido, simulacro y WebXR.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { C, tex, wrapText } from './helpers.js';
import { buildPlant } from './plant.js';
import { buildEpp } from './epp.js';
import { createTinter } from './palette.js';

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

  const T = createTinter();
  const plant = buildPlant(T);
  const epp = buildEpp(T);
  const onTheme = () => { requestAnimationFrame(() => { T.retint(); paintHotspots(); }); };
  window.addEventListener('lgw:theme', onTheme);
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
      const mk = makeMarker(T.pal.warning);
      mk.group.position.set(p.pos[0], p.pos[1], p.pos[2]);
      // haz vertical hasta el piso
      const hgt = p.pos[1] + 1.1;
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, hgt, 8, 1, true), mk.beamM);
      beam.position.y = 1.1 - hgt / 2; mk.group.add(beam);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 32), new THREE.MeshBasicMaterial({ color: T.pal.warning, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
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
      const c = visited.has(h.p.id) ? T.pal.success : T.pal.warning;
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
    renderer,
    dispose() { window.removeEventListener('lgw:theme', onTheme); renderer.setAnimationLoop(null); }
  };
  return api;
}

