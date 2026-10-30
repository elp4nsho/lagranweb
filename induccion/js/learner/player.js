// Reproductor de módulos: escena 3D (Three.js, carga diferida) o vista 2D equivalente si el CDN falla.
import { escape, toast } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { getModule, getPlan, planModules, modulePct, checkpoints, markCheckpoint, resetModule, addTime } from '../data/model.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ROUTE = [[10, -3.5], [10, 4], [12, 6], [21, 6], [24, 6.5], [28, 10], [30, 12]];
let viewer = null, exp = null, expPromise = null, threeFailed = false;
let S = null; // { aid, m, preview, mem:Set, t0 }
const tour = { on: false, i: 0, timer: null };
let activePoint = null, simRunning = false;
const $ = (s, r = viewer) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ---------- Visor persistente (el canvas WebGL se reutiliza entre módulos) ----------
function buildViewer() {
  const v = document.createElement('div');
  v.className = 'viewer';
  v.innerHTML = `<div class="stage" data-stage></div><div class="markers" data-markers></div>
    <div class="viewer-tools"><button class="btn btn-sm" type="button" data-tour hidden>▶ Recorrido guiado</button><button class="btn btn-sm" type="button" data-reset title="Restablecer cámara">⟲ Vista</button><span data-vr></span></div>
    <div class="viewer-loading" data-loading><span class="spinner"></span>Cargando escena 3D…</div>
    <div class="viewer-fallback" data-fallback hidden><div class="ak-note warn fb-msg" role="status"><b>Vista 2D.</b> No pudimos cargar el motor 3D (conexión, bloqueador o CDN no disponible). El contenido y tu avance funcionan igual.</div><div class="fb-body" data-fb></div></div>
    <div class="alarm-vignette" data-alarm aria-hidden="true"></div>
    <div class="card info-card" data-card role="dialog" aria-modal="false" hidden><p class="kicker" data-kicker></p><h2 data-title></h2><p data-text></p><div class="row" style="gap:8px"><button class="btn btn-sm btn-primary" type="button" data-ok>Entendido</button><button class="btn btn-sm" type="button" data-next hidden>Siguiente →</button></div></div>
    <p class="viewer-hint" data-hint></p>`;
  $('[data-tour]', v).onclick = toggleTour;
  $('[data-reset]', v).onclick = () => { stopTour(); closeCard(); if (exp && !threeFailed) exp.resetView(); };
  $('[data-ok]', v).onclick = () => { stopTour(); closeCard(); };
  $('[data-next]', v).onclick = () => {
    const m = S?.m; if (!m) return;
    const idx = m.points.findIndex(p => p.id === activePoint);
    if (tour.on) { clearTimeout(tour.timer); tour.i = idx + 1; tourStep(); } else selectPoint(m.points[Math.min(idx + 1, m.points.length - 1)].id);
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && viewer && !$('[data-card]').hidden) { stopTour(); closeCard(); } });
  return v;
}

function ensureExperience() {
  if (expPromise) return expPromise;
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000));
  expPromise = Promise.race([import('../scene/experience.js'), timeout]).then(mod => {
    exp = mod.createExperience({
      container: $('[data-stage]'), markers: $('[data-markers]'), vrSlot: $('[data-vr]'), reducedMotion,
      onSelect: id => { if (S) selectPoint(id); },
      onPart: part => { if (S?.m.mode === 'epp') eppHint(part); }
    });
    return exp;
  }).catch(err => { threeFailed = true; console.warn('[Inducción XR] 3D no disponible, se usa vista 2D:', err?.message); throw err; });
  return expPromise;
}

// ---------- Progreso ----------
const assignment = () => (S && !S.preview ? db.get('assignments', S.aid) : null);
function doneSet() { if (!S) return []; return S.preview ? [...S.mem] : (assignment()?.progress?.[S.m.id] || []); }
function pct() { const all = checkpoints(S.m), d = doneSet(); return all.length ? all.filter(c => d.includes(c)).length / all.length : 1; }
function markDone(cp) {
  const before = pct();
  if (S.preview) S.mem.add(cp); else markCheckpoint(S.aid, S.m.id, cp);
  if (before < 1 && pct() >= 1) {
    toast(`Módulo «${S.m.title}» completado`, 'success');
    if (!S.preview) db.log('módulo completado', `${auth.current()?.name} · ${S.m.title}`, auth.current()?.id);
  }
  updateProgress();
}
function updateProgress() {
  if (!S) return;
  const p = Math.round(pct() * 100), d = doneSet();
  const host = document.getElementById('player');
  if (!host) return;
  host.querySelector('[data-bar]').style.setProperty('--v', p + '%');
  host.querySelector('[data-pct]').textContent = p + '%';
  $$('#side [data-cp]').forEach(b => { const ok = d.includes(b.dataset.cp); b.classList.toggle('done', ok); const n = b.querySelector('.n'); if (n) n.textContent = ok ? '✓' : n.dataset.n; });
  $$('.hs-marker', viewer).forEach(mk => mk.classList.toggle('visited', d.includes(mk.dataset.id)));
  if (exp && !threeFailed) exp.setVisited(d);
  const box = document.getElementById('complete-box'); if (box) box.hidden = p < 100;
}

// ---------- Entrar / salir ----------
export function leaveModule() {
  if (!S) return;
  stopTour(); closeCard(); stopAlarm();
  if (exp) exp.pause();
  if (!S.preview) { const mins = (Date.now() - S.t0) / 60000; if (mins > 0.3) addTime(S.aid, S.m.id, Math.max(1, Math.round(mins))); }
  S = null;
}

export function showModule(view, { aid, mid, preview }) {
  const m = getModule(mid);
  const u = auth.current();
  const a = aid ? db.get('assignments', aid) : null;
  if (!m || m.mode === 'quiz' || (!preview && (!a || a.userId !== u.id))) { view.innerHTML = '<div class="card empty"><h2>Módulo no disponible</h2><a class="btn btn-primary" href="#/">Volver</a></div>'; return; }
  const plan = a ? getPlan(a.planId) : null;
  const mods = plan ? planModules(plan) : [m];
  const idx = mods.findIndex(x => x.id === m.id);
  S = { aid, m, preview, mem: new Set(), t0: Date.now() };
  if (!viewer) viewer = buildViewer();
  view.innerHTML = `<div id="player">
    ${preview ? `<div class="ak-note preview-banner">Vista previa del módulo (como lo verá el trabajador). El avance no se guarda. <a href="admin.html#/modulos/${escape(m.id)}">Volver al editor</a></div>` : `<a class="back" href="#/plan/${escape(aid)}">← ${escape(plan.name)}</a>`}
    <div class="player-head"><div><span class="eyebrow">Módulo ${idx + 1} de ${mods.length} · ${m.minutes} min</span><h1>${escape(m.title)}</h1></div>
      <div class="mod-progress" aria-label="Progreso del módulo"><div class="progress"><i data-bar style="--v:0%"></i></div><b data-pct>0%</b></div></div>
    <div class="player-grid"><div data-viewer-slot></div><aside class="card side-panel" id="side"></aside></div>
  </div>`;
  view.querySelector('[data-viewer-slot]').appendChild(viewer);
  $('[data-tour]').hidden = m.mode !== 'plant';
  $('[data-hint]').textContent = m.mode === 'epp' ? 'Arrastra para girar el maniquí · Toca una parte del cuerpo para una pista' : 'Arrastra para girar · Rueda o pellizco para acercar · Toca los puntos numerados';
  $('[data-markers]').innerHTML = '';
  closeCard();
  renderSide(m, mods, idx, a);
  updateProgress();
  if (threeFailed) { showFallback(m); return; }
  $('[data-loading]').hidden = false;
  ensureExperience().then(e => {
    if (S?.m !== m) return;
    $('[data-loading]').hidden = true;
    viewer.classList.remove('is-fallback');
    $('[data-fallback]').hidden = true;
    e.setMode(m.mode, { points: m.mode === 'plant' ? m.points : [], view: m.view, route: !!m.route });
    e.setVisited(doneSet());
    if (m.mode === 'epp') { e.resetEquip(); doneSet().forEach(id => e.equip(id, true)); }
    e.resume();
  }).catch(() => { if (S?.m === m) showFallback(m); });
}

function nextHref(mods, idx) {
  const nx = mods[idx + 1];
  if (!S || S.preview || !nx) return S && !S.preview ? `#/plan/${S.aid}` : '#/';
  return nx.mode === 'quiz' ? `#/evaluacion/${S.aid}` : `#/modulo/${S.aid}/${nx.id}`;
}

function renderSide(m, mods, idx, a) {
  const side = document.getElementById('side');
  const nx = mods[idx + 1];
  let h = `<h2>${m.mode === 'epp' ? 'Equipa al trabajador' : m.route ? 'Protocolo de evacuación' : m.id === 'bienvenida' ? 'Recorrido de bienvenida' : 'Puntos de interés'}</h2><p>${escape(m.intro || '')}</p>`;
  if (m.mode === 'epp') {
    const opts = [...m.points, ...(m.distractors || [])];
    const order = opts.map((o, i) => [o, (i * 5) % opts.length]).sort((x, y) => x[1] - y[1]).map(x => x[0]);
    h += `<div class="epp-grid" role="group" aria-label="Elementos disponibles">${order.map(o => `<button type="button" class="epp-opt ${doneSet().includes(o.id) ? 'ok' : ''}" data-epp="${escape(o.id)}"><span class="e" aria-hidden="true">${escape(o.e || '•')}</span>${escape(o.title)}</button>`).join('')}</div>
      <p class="feedback" id="epp-fb" role="status" aria-live="polite"></p>
      <h2 style="margin-top:16px">Equipado</h2><ul class="checklist">${m.points.map((p, i) => `<li><div class="ck" data-cp="${escape(p.id)}"><span class="n" data-n="${i + 1}">${i + 1}</span><span><b>${escape(p.title)}</b><small>${escape(p.text)}</small></span></div></li>`).join('')}</ul>
      <div class="row" style="margin-top:10px"><button type="button" class="btn btn-sm btn-ghost" id="epp-reset">Quitar todo y reintentar</button></div>`;
  } else {
    h += m.route
      ? `<div class="row"><button type="button" class="btn btn-sm btn-primary" id="sim-btn">🚨 Iniciar simulacro</button></div><p class="feedback" id="sim-fb" role="status" aria-live="polite"></p>`
      : `<div class="row"><button type="button" class="btn btn-sm btn-primary" id="tour-btn2">▶ Iniciar recorrido guiado</button></div>`;
    h += `<ul class="checklist">${m.points.map((p, i) => `<li><button type="button" class="ck" data-cp="${escape(p.id)}" data-point="${escape(p.id)}"><span class="n" data-n="${i + 1}">${i + 1}</span><span><b>${escape(p.title)}</b><small>${escape(p.text.slice(0, 72))}…</small></span></button></li>`).join('')}
      ${m.route ? '<li><div class="ck" data-cp="simulacro"><span class="n" data-n="★">★</span><span><b>Simulacro de evacuación</b><small>Completa el simulacro con la ruta animada.</small></span></div></li>' : ''}</ul>`;
  }
  h += `<div class="complete-box" id="complete-box" hidden><p>✓ ¡Módulo completado!</p><div class="row" style="gap:8px"><a class="btn btn-sm btn-primary" href="${nextHref(mods, idx)}">${nx && !S.preview ? `Siguiente: ${escape(nx.title)}` : 'Volver'}</a></div></div>`;
  side.innerHTML = h;
  side.onclick = ev => {
    const t = ev.target.closest('button'); if (!t || !S) return;
    if (t.dataset.point) { stopTour(); selectPoint(t.dataset.point); }
    else if (t.dataset.epp) chooseEpp(t.dataset.epp, t);
    else if (t.id === 'epp-reset') resetEpp();
    else if (t.id === 'tour-btn2') toggleTour();
    else if (t.id === 'sim-btn') runSimulation();
  };
}

// ---------- Puntos de interés ----------
function selectPoint(id) {
  const m = S?.m; if (!m || m.mode !== 'plant') return;
  const idx = m.points.findIndex(p => p.id === id);
  if (idx < 0) return;
  activePoint = id;
  if (exp && !threeFailed) { exp.focus(id); exp.setActive(id); }
  $$('.hs-marker', viewer).forEach(mk => mk.classList.toggle('active', mk.dataset.id === id));
  $$('#side .ck').forEach(b => b.classList.toggle('active', b.dataset.point === id));
  const p = m.points[idx];
  $('[data-kicker]').textContent = `${m.kicker || 'Punto'} ${idx + 1} de ${m.points.length}`;
  $('[data-title]').textContent = p.title;
  $('[data-text]').textContent = p.text;
  $('[data-next]').hidden = idx >= m.points.length - 1;
  $('[data-card]').hidden = false;
  markDone(id);
}
function closeCard() {
  if (!viewer) return;
  $('[data-card]').hidden = true;
  activePoint = null;
  $$('.hs-marker.active', viewer).forEach(mk => mk.classList.remove('active'));
  $$('#side .ck.active').forEach(b => b.classList.remove('active'));
  if (exp && !threeFailed) exp.setActive(null);
}

function toggleTour() { if (tour.on) { stopTour(); closeCard(); } else startTour(); }
function startTour() { if (!S || S.m.mode !== 'plant') return; tour.on = true; tour.i = 0; setTourUI(true); tourStep(); }
function tourStep() {
  const m = S?.m; if (!tour.on || !m) return;
  if (tour.i >= m.points.length) { stopTour(); toast('Recorrido guiado finalizado', 'info'); if (exp && !threeFailed) exp.resetView(); return; }
  selectPoint(m.points[tour.i].id);
  tour.timer = setTimeout(() => { tour.i++; tourStep(); }, reducedMotion ? 9000 : 7000);
}
function stopTour() { tour.on = false; clearTimeout(tour.timer); setTourUI(false); }
function setTourUI(on) {
  if (!viewer) return;
  $('[data-tour]').textContent = on ? '❚❚ Detener recorrido' : '▶ Recorrido guiado';
  $('[data-tour]').setAttribute('aria-pressed', on);
  const b2 = document.getElementById('tour-btn2'); if (b2) b2.textContent = on ? '❚❚ Detener recorrido' : '▶ Iniciar recorrido guiado';
}

// ---------- EPP ----------
function chooseEpp(id, btn) {
  const m = S.m, fb = document.getElementById('epp-fb');
  const good = m.points.find(p => p.id === id), bad = (m.distractors || []).find(p => p.id === id);
  if (good) {
    btn.classList.remove('bad'); btn.classList.add('ok');
    fb.className = 'feedback ok'; fb.textContent = `✓ Correcto: ${good.title}. ${good.text}`;
    markDone(id);
    if (exp && !threeFailed) exp.equip(id); else updateEpp2d();
    if (pct() >= 1) fb.textContent += ' ¡Trabajador completamente equipado!';
  } else if (bad) {
    btn.classList.remove('bad'); void btn.offsetWidth; btn.classList.add('bad');
    fb.className = 'feedback bad'; fb.textContent = `✗ ${bad.title} no es un EPP adecuado. ${bad.text}`;
  }
}
function eppHint(part) {
  const m = S.m, fb = document.getElementById('epp-fb'); if (!fb) return;
  const item = m.points.find(p => p.part === part);
  fb.className = 'feedback';
  fb.textContent = item && doneSet().includes(item.id) ? `✓ Esta zona ya está protegida con: ${item.title}.` : `Pista: ${m.parts?.[part] || 'Observa qué parte del cuerpo está expuesta.'}`;
}
function resetEpp() {
  if (S.preview) S.mem.clear(); else resetModule(S.aid, S.m.id);
  $$('.epp-opt').forEach(b => b.classList.remove('ok', 'bad'));
  const fb = document.getElementById('epp-fb'); fb.textContent = ''; fb.className = 'feedback';
  if (exp && !threeFailed) exp.resetEquip(); else updateEpp2d();
  updateProgress();
}

// ---------- Simulacro ----------
function runSimulation() {
  if (simRunning) return;
  simRunning = true; stopTour(); closeCard();
  const btn = document.getElementById('sim-btn'), fb = document.getElementById('sim-fb');
  btn.disabled = true;
  fb.className = 'feedback'; fb.textContent = '🚨 Alarma activada. Siguiendo la ruta verde hacia la salida de emergencia…';
  $('[data-alarm]').classList.add('on');
  const m = S.m;
  const dur = reducedMotion ? 4000 : 9000;
  const p = exp && !threeFailed ? exp.runEvacuation(dur) : run2dEvac(dur);
  p.then(() => {
    stopAlarm(); simRunning = false;
    if (S?.m !== m) return;
    btn.disabled = false; btn.textContent = '↻ Repetir simulacro';
    fb.className = 'feedback ok'; fb.textContent = '✓ Llegaste al punto de encuentro. Repórtate con el líder de evacuación.';
    markDone('simulacro');
  });
}
function stopAlarm() { viewer && $('[data-alarm]').classList.remove('on'); }

// ---------- Vista 2D ----------
function showFallback(m) {
  viewer.classList.add('is-fallback');
  $('[data-loading]').hidden = true;
  $('[data-fallback]').hidden = false;
  const body = $('[data-fb]');
  if (m.mode === 'epp') { body.innerHTML = epp2dSVG(); updateEpp2d(); return; }
  body.innerHTML = map2d(m);
  $$('.map2d .hs-marker', body).forEach(b => b.addEventListener('click', () => { stopTour(); selectPoint(b.dataset.id); }));
  updateProgress();
}
function map2d(m) {
  const pts = ROUTE.map(p => p.join(',')).join(' ');
  const svg = `<svg viewBox="-24 -17 60 34" role="img" aria-label="Plano de la planta visto desde arriba">
    <rect x="-24" y="-17" width="60" height="34" style="fill:var(--bg)"/>
    <rect x="-22" y="-15" width="44" height="30" style="fill:var(--surface);stroke:var(--line)" stroke-width=".3"/>
    <g style="fill:var(--primary)">${[-11, -7, -3].map(z => `<rect x="-19" y="${z - 0.6}" width="14" height="1.2"/>`).join('')}</g>
    <defs><pattern id="hatch" width="1.4" height="1.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width=".7" height="1.4" style="fill:var(--warning)"/></pattern></defs>
    <rect x="5" y="-14" width="16" height="10" fill="url(#hatch)" opacity=".35"/>
    <circle cx="10" cy="-9" r="2.4" style="fill:var(--muted)"/><rect x="12" y="-9.5" width="7" height="1" style="fill:var(--text)" opacity=".5"/>
    <rect x="-21" y="5" width="42" height="2" style="fill:var(--warning)" opacity=".18"/>
    <path d="M-21 5H21M-21 7H21" style="stroke:var(--warning)" stroke-width=".25"/>
    <rect x="21.4" y="5" width="1.2" height="2" style="fill:var(--success)"/><rect x="-22.6" y="5" width="1.2" height="2" style="fill:var(--success)"/>
    <g style="fill:var(--danger)"><circle cx="21.3" cy="1.5" r=".6"/><circle cx="-21.3" cy="1.5" r=".6"/><circle cx="2" cy="-14.4" r=".6"/></g>
    <circle cx="16" cy="11.5" r="1.4" style="fill:var(--surface-3);stroke:var(--line)" stroke-width=".2"/><circle cx="19.5" cy="11.5" r="1.4" style="fill:var(--surface-3);stroke:var(--line)" stroke-width=".2"/>
    <circle cx="30" cy="12" r="2.6" fill="none" style="stroke:var(--success)" stroke-width=".4"/><text x="30" y="12.6" font-size="1.6" text-anchor="middle" style="fill:var(--success)" font-weight="700">PE</text>
    <rect x="-13.3" y="12.3" width="2.6" height="2.2" style="fill:var(--info)" opacity=".7"/>
    ${m.route ? `<polyline points="${pts}" fill="none" style="stroke:var(--success)" stroke-width=".6" stroke-linecap="round" stroke-linejoin="round" class="map-route"/><circle id="walker2d" r=".9" cx="10" cy="-3.5" style="fill:var(--warning);stroke:var(--text)" stroke-width=".2"/>` : ''}
  </svg>`;
  const markers = m.points.map((p, i) => `<button type="button" class="hs-marker" data-id="${escape(p.id)}" style="left:${((p.pos[0] + 24) / 60 * 100).toFixed(2)}%;top:${((p.pos[2] + 17) / 34 * 100).toFixed(2)}%" aria-label="${escape(p.title)}">${i + 1}</button>`).join('');
  return `<div class="map2d">${svg}${markers}</div>`;
}
function run2dEvac(dur) {
  return new Promise(resolve => {
    const w = document.getElementById('walker2d');
    const segs = []; let total = 0;
    for (let i = 1; i < ROUTE.length; i++) { const a = ROUTE[i - 1], b = ROUTE[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]); segs.push({ a, b, len }); total += len; }
    const t0 = performance.now();
    (function step(now) {
      const k = Math.min(1, (now - t0) / dur); let d = k * total;
      if (w) for (let j = 0; j < segs.length; j++) {
        if (d <= segs[j].len || j === segs.length - 1) { const f = Math.min(1, d / segs[j].len); w.setAttribute('cx', segs[j].a[0] + (segs[j].b[0] - segs[j].a[0]) * f); w.setAttribute('cy', segs[j].a[1] + (segs[j].b[1] - segs[j].a[1]) * f); break; }
        d -= segs[j].len;
      }
      if (k < 1) requestAnimationFrame(step); else resolve();
    })(t0);
  });
}
function epp2dSVG() {
  return `<svg class="epp2d" viewBox="0 0 200 320" role="img" aria-label="Maniquí con los elementos de protección seleccionados">
    <g style="fill:var(--muted)" opacity=".8"><circle cx="100" cy="48" r="24"/><rect x="92" y="70" width="16" height="10"/><rect x="68" y="80" width="64" height="96" rx="20"/>
    <rect x="46" y="86" width="16" height="84" rx="8" transform="rotate(8 54 86)"/><rect x="138" y="86" width="16" height="84" rx="8" transform="rotate(-8 146 86)"/>
    <rect x="74" y="170" width="22" height="110" rx="10"/><rect x="104" y="170" width="22" height="110" rx="10"/></g>
    <g class="item" data-item="chaleco"><path d="M70 92q30-16 60 0v74q-30 10-60 0z" style="fill:var(--accent)"/><path d="M70 130h60M70 146h60" style="stroke:var(--surface)" stroke-width="5"/></g>
    <g class="item" data-item="casco"><path d="M74 44a26 26 0 0 1 52 0z" style="fill:var(--warning)"/><rect x="68" y="42" width="64" height="6" rx="3" style="fill:var(--warning)"/></g>
    <g class="item" data-item="lentes"><rect x="80" y="46" width="40" height="11" rx="5" style="fill:var(--info);stroke:var(--text)" opacity=".85" stroke-width="2"/></g>
    <g class="item" data-item="guantes" style="fill:var(--primary)"><circle cx="44" cy="172" r="11"/><circle cx="156" cy="172" r="11"/></g>
    <g class="item" data-item="zapatos" style="fill:var(--text)"><rect x="68" y="276" width="32" height="16" rx="6"/><rect x="100" y="276" width="32" height="16" rx="6"/></g>
  </svg>`;
}
function updateEpp2d() { const d = doneSet(); $$('.epp2d .item').forEach(g => g.classList.toggle('on', d.includes(g.dataset.item))); }

export const playerState = () => S;
