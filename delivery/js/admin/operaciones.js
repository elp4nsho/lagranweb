// Operaciones en vivo: mapa con toda la flota moviéndose, cola de pendientes, asignación
// manual/automática y control del reloj de simulación.
import { db } from '../data/db.js';
import { html, raw, money, toast, escape } from '../../../assets/core/ui.js';
import { createMap } from '../shared/map.js';
import { courierPos, shipmentLines, hasLeg, ACTIVE_ST, fmtEta, progress } from '../shared/sim.js';
import { VEHICLE_ICON, VEHICLES } from '../shared/status.js';
import { statusBadge, avatar, etaText } from '../shared/views.js';
import { generate } from '../shared/engine.js';
import { openAssign } from './shipment.js';
import * as ops from '../shared/ops.js';

export function mountOps(el, ctx) {
  let tab = 'cola', sel = null, selShip = null, key = '';
  const set = ops.settings();
  el.innerHTML = html`<div class="page-head"><div><h1>Operaciones en vivo</h1><p class="muted" style="margin:4px 0 0">Flota y envíos activos sobre el mapa de Santiago.</p></div>
    <div class="row ops-ctrls">
      <label class="check"><span class="switch"><input type="checkbox" data-auto ${set.autoAssign ? 'checked' : ''}><span></span></span> Asignación automática</label>
      <div class="chips" role="group" aria-label="Velocidad de simulación" data-speed>${[['p', '⏸'], ['1', '1×'], ['3', '3×'], ['10', '10×']].map(([k, l]) => raw(html`<button class="chip" data-sp="${k}" aria-label="${k === 'p' ? 'Pausar' : 'Velocidad ' + l}">${l}</button>`))}</div>
      <button class="btn btn-sm" data-gen>＋ Envío de prueba</button>
    </div></div>
    <div class="ops-grid">
      <div class="card map-card ops-map-card"><div class="ops-map"></div>
        <div class="map-legend"><span><i class="lg free"></i>Libre</span><span><i class="lg busy"></i>En ruta</span><span><i class="lg late"></i>Atrasado</span><span><i class="lg offer"></i>Oferta</span><span><i class="lg pend"></i>Por asignar</span></div></div>
      <aside class="card ops-side">
        <div class="ops-stats" data-stats></div>
        <div class="tabs" role="tablist">${[['cola', 'Cola'], ['curso', 'En curso'], ['flota', 'Flota']].map(([k, l]) => raw(html`<button class="tab" data-tab="${k}" role="tab">${l} <span class="badge plain" data-n="${k}">0</span></button>`))}</div>
        <div class="ops-list" data-list></div>
      </aside>
    </div>`;
  const map = createMap(el.querySelector('.ops-map'), { wheel: true, hq: true, label: 'Mapa de operaciones' });
  map.fit([[-33.36, -70.75], [-33.58, -70.53]]);
  const list = el.querySelector('[data-list]');

  const speedSync = () => { const c = db.getValue('clock') || {}; el.querySelectorAll('[data-sp]').forEach(b => b.classList.toggle('active', c.paused ? b.dataset.sp === 'p' : b.dataset.sp === String(c.speed || 1))); };
  el.querySelector('[data-speed]').onclick = e => {
    const b = e.target.closest('[data-sp]'); if (!b) return;
    if (!ctx.can('sim.control')) return toast('Sin permiso', 'error');
    ops.setClock(b.dataset.sp === 'p' ? { paused: true } : { speed: +b.dataset.sp, paused: false });
    db.log('simulación', b.dataset.sp === 'p' ? 'Simulación en pausa' : `Velocidad ${b.dataset.sp}×`, ctx.user.id);
    speedSync();
  };
  el.querySelector('[data-auto]').onchange = e => {
    db.setValue('settings', { ...ops.settings(), autoAssign: e.target.checked });
    db.log('ajustes', `Asignación automática ${e.target.checked ? 'activada' : 'desactivada'}`, ctx.user.id);
    toast(`Asignación automática ${e.target.checked ? 'activada' : 'desactivada'}`, 'info');
  };
  el.querySelector('[data-gen]').onclick = () => { const s = generate(); if (s) toast(`Envío ${s.code} creado`, 'success'); };
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; key = ''; drawList(); });

  function drawList() {
    const t = ops.simNow();
    const active = ops.activeShipments();
    const pend = active.filter(s => s.status === 'pendiente').sort((a, b) => Date.parse(a.slaAt) - Date.parse(b.slaAt));
    const curso = active.filter(s => s.status !== 'pendiente').sort((a, b) => (ops.isLate(b) - ops.isLate(a)) || Date.parse(a.slaAt) - Date.parse(b.slaAt));
    const fleet = db.query('couriers', c => c.status === 'activo').sort((a, b) => (b.online - a.online) || a.name.localeCompare(b.name));
    el.querySelector('[data-n="cola"]').textContent = pend.length;
    el.querySelector('[data-n="curso"]').textContent = curso.length;
    el.querySelector('[data-n="flota"]').textContent = fleet.filter(c => c.online).length;
    el.querySelectorAll('[data-tab]').forEach(b => { b.classList.toggle('active', b.dataset.tab === tab); b.setAttribute('aria-selected', b.dataset.tab === tab); });
    const late = curso.filter(ops.isLate).length + pend.filter(ops.isLate).length;
    el.querySelector('[data-stats]').innerHTML = html`<div><b>${pend.length}</b><small>por asignar</small></div><div><b>${curso.length}</b><small>en curso</small></div><div class="${late ? 'is-late' : ''}"><b>${late}</b><small>atrasados</small></div><div><b>${fleet.filter(c => c.online).length}</b><small>en línea</small></div>`;
    const k = tab + JSON.stringify(tab === 'flota' ? fleet.map(c => [c.id, c.online, ops.courierQueue(c.id).length, sel === c.id]) : (tab === 'cola' ? pend : curso).map(s => [s.id, s.status, !!s.offer, ops.isLate(s), selShip === s.id]));
    if (k === key) { updateEtas(); return; }
    key = k;
    if (tab === 'cola') list.innerHTML = pend.length ? pend.map(s => html`<div class="ops-item ${ops.isLate(s) ? 'late' : ''} ${selShip === s.id ? 'sel' : ''}" data-ship="${s.id}">
        <div class="row between"><b class="mono">${s.code}</b>${s.offer ? raw(html`<span class="badge badge-warning">Oferta · ${db.get('couriers', s.offer.courierId)?.name.split(' ')[0]}</span>`) : ops.isLate(s) ? raw('<span class="badge badge-danger">Atrasado</span>') : raw('<span class="badge badge-warning">Sin asignar</span>')}</div>
        <small class="muted">${s.sender.comuna} → ${s.receiver.comuna} · ${ops.pricing().sizes[s.size]?.name} · ${ops.pricing().services[s.service]?.name}</small>
        <div class="row between"><small data-sla="${s.id}"></small>${ctx.can('envios.assign') ? raw(html`<button class="btn btn-sm btn-primary" data-assign="${s.id}">Asignar</button>`) : ''}</div></div>`).join('') : '<div class="empty-inline">✓ Cola vacía: todo asignado</div>';
    if (tab === 'curso') list.innerHTML = curso.map(s => { const c = ops.courierOf(s); return html`<div class="ops-item ${ops.isLate(s) ? 'late' : ''} ${selShip === s.id ? 'sel' : ''}" data-ship="${s.id}">
        <div class="row between"><b class="mono">${s.code}</b>${raw(statusBadge(s.status, ops.isLate(s)))}</div>
        <small class="muted">${c ? c.name : '—'} · ${s.sender.comuna} → ${s.receiver.comuna}</small>
        <div class="progress"><i data-pg="${s.id}" style="--v:${Math.round(progress(s, t) * 100)}%"></i></div><small data-eta="${s.id}"></small></div>`; }).join('') || '<div class="empty-inline">Sin envíos en curso</div>';
    if (tab === 'flota') list.innerHTML = fleet.map(c => { const q = ops.courierQueue(c.id); return html`<div class="ops-item row ${sel === c.id ? 'sel' : ''}" data-courier="${c.id}" style="flex-wrap:nowrap">${avatar(c.name, c.color, 34)}
        <span class="grow"><b>${c.name}</b><small class="muted">${VEHICLE_ICON[c.vehicle]} ${VEHICLES[c.vehicle]} · ${String(c.rating).replace('.', ',')}★${q[0] ? ' · ' + q[0].code : ''}${ops.isControlled(c.id) ? ' · 📱 app' : ''}</small></span>
        ${!c.online ? raw('<span class="badge">Offline</span>') : q.length ? raw(html`<span class="badge badge-info">${q.length} envío${q.length > 1 ? 's' : ''}</span>`) : raw('<span class="badge badge-success">Libre</span>')}</div>`; }).join('');
    updateEtas();
  }
  function updateEtas() {
    const t = ops.simNow();
    list.querySelectorAll('[data-sla]').forEach(n => { const s = db.get('shipments', n.dataset.sla); if (!s) return; const d = Date.parse(s.slaAt) - t; n.textContent = d >= 0 ? `SLA en ${fmtEta(d)}` : `Atrasado ${fmtEta(-d)}`; n.className = d < 0 ? 'text-danger' : 'muted'; });
    list.querySelectorAll('[data-eta]').forEach(n => { const s = db.get('shipments', n.dataset.eta); if (s) n.textContent = etaText(s); });
    list.querySelectorAll('[data-pg]').forEach(n => { const s = db.get('shipments', n.dataset.pg); if (s) n.style.setProperty('--v', Math.round(progress(s, t) * 100) + '%'); });
  }
  function drawMap() {
    const t = ops.simNow();
    const active = ops.activeShipments();
    const cs = db.query('couriers', c => c.status === 'activo' && (c.online || active.some(s => s.courierId === c.id && s.status !== 'pendiente')));
    const offered = new Set(active.filter(s => s.offer).map(s => s.offer.courierId));
    const marks = cs.map(c => {
      const q = active.filter(s => s.courierId === c.id && s.status !== 'pendiente');
      const st = !c.online && !q.length ? 'offline' : q.some(ops.isLate) ? 'late' : offered.has(c.id) ? 'offer' : q.length ? 'busy' : 'free';
      return { id: 'c:' + c.id, kind: 'courier', pos: courierPos(c, active, t), state: st + (sel === c.id ? ' sel' : ''), title: `${c.name}${q[0] ? ' · ' + q[0].code : ' · libre'}`, label: sel === c.id ? c.name.split(' ')[0] : '', onClick: () => select(c.id) };
    });
    active.filter(s => s.status === 'pendiente').forEach(s => marks.push({ id: 'p:' + s.id, kind: 'pending', pos: s.pickup, state: ops.isLate(s) ? 'late' : '', title: `${s.code} · por asignar (${s.sender.comuna})`, onClick: () => selectShip(s.id) }));
    const focus = selShip ? db.get('shipments', selShip) : null;
    const lines = [];
    const showFor = s => { lines.push(...shipmentLines(s, t)); marks.push({ id: 'a:' + s.id, kind: 'pickup', pos: s.pickup, title: 'Retiro ' + s.code }, { id: 'b:' + s.id, kind: 'drop', pos: s.drop, title: 'Entrega ' + s.code }); };
    if (focus && ACTIVE_ST.includes(focus.status)) showFor(focus);
    else if (sel) active.filter(s => s.courierId === sel && s.status !== 'pendiente').forEach(showFor);
    else active.filter(s => s.status === 'en_camino').forEach(s => lines.push(...shipmentLines(s, t).filter(l => l.kind === 'done')));
    map.setMarkers(marks); map.setLines(lines);
  }
  function select(id) { sel = sel === id ? null : id; selShip = null; tab = 'flota'; key = ''; drawList(); drawMap(); if (sel) { const c = db.get('couriers', sel); map.focus(ops.posOf(c)); } }
  function selectShip(id) { selShip = selShip === id ? null : id; sel = null; const s = db.get('shipments', id); tab = s?.status === 'pendiente' ? 'cola' : 'curso'; key = ''; drawList(); drawMap(); if (selShip && s) map.fit([s.pickup, s.drop, ...(s.courierId ? [ops.posOf(ops.courierOf(s))] : [])]); }
  list.addEventListener('click', e => {
    const a = e.target.closest('[data-assign]');
    if (a) { openAssign(db.get('shipments', a.dataset.assign), ctx); return; }
    const sh = e.target.closest('[data-ship]');
    if (sh) { if (selShip === sh.dataset.ship) ctx.open(sh.dataset.ship); else selectShip(sh.dataset.ship); return; }
    const c = e.target.closest('[data-courier]'); if (c) select(c.dataset.courier);
  });
  speedSync(); drawList(); drawMap();
  return {
    tick() { drawMap(); updateEtas(); },
    refresh() { el.querySelector('[data-auto]').checked = !!ops.settings().autoAssign; speedSync(); drawList(); },
    destroy() { map.destroy(); }
  };
}
