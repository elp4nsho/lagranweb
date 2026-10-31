// Panel de despacho y administración: tablero en vivo, rutas (reasignar paradas), planificación por
// zona y capacidad, bandeja de excepciones, envíos, retiros, indicadores y la red (flota, conductores,
// zonas, puntos, clientes, tarifas, facturación), más usuarios, configuración y bitácora del kernel.
import './boot.js';
import { app, db, S, SHIP, PICK, ROUTE, INC, INC_TYPES, machineOf, stBadge, userName, companyName, hhmm, km, kg, money, escape, todayStr, tomorrowStr,
  shipments, pickups, vehicles, drivers, zones, points, companies, rates, invoices, pointUse } from './app.js';
import * as ops from './ops.js';
import { routeMap, boardMap, proofCard, shipTimeline, capBars, progressOf, flagsHtml, labelHtml, labelModal, chatBox, svcLabel } from './views.js';
import { cityMap, DEPOT } from './geo.js';
import { lastAttempt, isPending } from './engine.js';
import { usersSection, settingsSection, logSection } from '../../assets/core/pages.js';
import { pageHead, kpis, card, chartCard, emptyState, kv, badge, activityFeed, tabs } from '../../assets/core/blocks.js';
import { html, raw, toast, modal, confirm, dateTime, ago, date as fmtDate, barChart, lineChart, donutChart, downloadCSV, debounce } from '../../assets/core/ui.js';
import { fieldsModal } from '../../assets/core/resource.js';
import { countBy } from '../../assets/core/domain.js';

const ADMIN = ['admin'];
const me = () => app.auth.current();
const rlink = r => html`<a href="#/rutas/${r.id}"><span class="rp-sw" style="--mk:${r.color}"></span>${r.code}</a>`;

// ================= Tablero en vivo =================
function board(view, ctx) {
  let hl = null;
  const paint = () => {
    const k = ops.kpisToday();
    const rs = ops.todayRoutes().sort((a, b) => a.code.localeCompare(b.code));
    const open = db.query('incidents', i => i.status !== 'resuelta');
    view.innerHTML = html`${pageHead('Tablero de operación', raw(`Hoy · ${escape(new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }))} · <span class="rp-live">● en vivo</span>`), '<a class="btn" href="#/planificar">🧩 Planificar</a><a class="btn btn-primary" href="#/excepciones">⚠ Excepciones</a>')}
      ${kpis([
        { label: 'Envíos en ruta hoy', value: k.total, hint: `${k.delivered} entregados · ${k.pending} pendientes`, icon: '📦' },
        { label: 'A tiempo', value: `${k.onTimePct}%`, hint: 'dentro de ventana / express', icon: '⏱️', up: k.onTimePct >= 90, delta: k.onTimePct >= 90 ? 'meta 90 %' : 'bajo meta 90 %' },
        { label: 'Éxito al primer intento', value: `${k.firstPct}%`, hint: `${k.failed} intentos fallidos`, icon: '🎯' },
        { label: 'Paradas por hora', value: String(k.stopsHour).replace('.', ','), hint: `${k.active} rutas en curso`, icon: '⚡' },
        { label: 'Km recorridos', value: km(k.km), hint: `${k.routes} rutas hoy`, icon: '🛣️' },
        { label: 'Excepciones abiertas', value: open.length, hint: `${k.backlog} envíos por planificar`, icon: '⚠', href: '#/excepciones' }
      ])}
      <div class="rp-board">
        <section class="card rp-mapcard"><div class="k-card-head"><div><h3>Mapa de operación</h3><p>Vehículos simulados en movimiento; toca una ruta para destacarla.</p></div></div><div data-map>${raw(boardMap(rs, { highlight: hl }))}</div></section>
        <section class="card"><div class="k-card-head"><h3>Excepciones recientes</h3><a class="btn btn-sm btn-ghost" href="#/excepciones">Ver todas</a></div>
          ${open.length ? html`<ul class="rp-exlist">${open.slice(0, 6).map(i => html`<li><span aria-hidden="true">${INC_TYPES[i.type]?.[1] || '⚠'}</span><span><b>${INC_TYPES[i.type]?.[0] || i.type}</b><small>${i.text}</small><small class="muted">${ago(i.createdAt)}</small></span></li>`)}</ul>` : raw(emptyState({ icon: '✅', title: 'Sin excepciones abiertas' }))}
        </section>
      </div>
      <h2 class="rp-h2">Rutas del día</h2>
      ${rs.length ? html`<div class="rp-routes">${rs.map(r => raw(routeCard(r, hl)))}</div>` : raw(emptyState({ icon: '🗺️', title: 'Aún no hay rutas hoy', action: '<a class="btn btn-primary" href="#/planificar">Planificar rutas</a>' }))}
      ${raw(card('Actividad reciente', activityFeed(db, { limit: 8, filter: l => l.action !== 'simulación' && l.action !== 'login' })))}`;
    view.querySelectorAll('[data-hl]').forEach(b => b.addEventListener('click', e => { if (e.target.closest('a')) return; hl = hl === b.dataset.hl ? null : b.dataset.hl; paint(); }));
  };
  paint();
  const t = setInterval(() => {
    if (!view.isConnected) return clearInterval(t);
    const m = view.querySelector('[data-map]');
    if (m && !document.hidden) m.innerHTML = boardMap(ops.todayRoutes(), { highlight: hl });
  }, 4000);
  return { refresh: paint };
}
function routeCard(r, hl) {
  const p = ops.plan(r), pr = progressOf(r, p), pos = ops.vehiclePos(r, p), v = db.get('vehicles', r.vehicleId);
  const late = p.ev.legs.filter(l => l.late > 0).length;
  const fails = p.done.filter(s => s.status === 'fallido' || (s.attempts || []).some(a => !a.ok && a.routeId === r.id)).length;
  return html`<article class="card rp-rcard ${hl === r.id ? 'sel' : ''}" data-hl="${r.id}" style="--mk:${r.color}">
    <header><span class="rp-sw"></span><b>${r.code}</b>${raw(ROUTE.badge(r.status))}<a class="btn btn-sm btn-ghost" href="#/rutas/${r.id}">Abrir</a></header>
    <div class="rp-rmeta"><span>🧑‍✈️ ${userName(r.driverId)}</span><span>🚐 ${v?.plate || '—'}</span><span>🗺️ ${db.get('zones', r.zoneId)?.name || ''}</span></div>
    <div class="row between small"><span>${pr.done}/${pr.total} paradas</span><span>${r.status === 'en_curso' ? pos.state : r.status === 'planificada' ? `Sale ${hhmm(Date.parse(r.plannedStart))}` : `Cerró ${hhmm(Date.parse(r.closedAt))}`}</span></div>
    <div class="progress"><i style="--v:${pr.pct}%"></i></div>
    ${raw(capBars(r))}
    <div class="rp-rstats"><span><b>${km(r.kmDone || 0)}</b><small>recorridos</small></span><span><b>${r.status === 'cerrada' ? '—' : hhmm(p.end)}</b><small>término</small></span><span class="${late ? 'rp-bad' : ''}"><b>${late}</b><small>atrasos</small></span><span class="${fails ? 'rp-bad' : ''}"><b>${fails}</b><small>fallidos</small></span></div>
    ${r.lastAt ? html`<small class="muted">Último evento ${ago(r.lastAt)}${r.sim ? ' · simulado' : ''}</small>` : ''}
  </article>`;
}

// ================= Rutas =================
function routesList(view) {
  const state = { d: 'hoy' };
  const paint = () => {
    const rs = db.query('routes', r => state.d === 'hoy' ? r.date === todayStr() : state.d === 'ayer' ? r.date < todayStr() : true).sort((a, b) => b.date.localeCompare(a.date) || a.code.localeCompare(b.code));
    view.innerHTML = html`${pageHead('Rutas', 'Rutas por conductor con su avance, carga y cierre.', '<button class="btn btn-primary" data-new>＋ Nueva ruta</button>')}
      <section class="card"><div class="k-toolbar"><div class="tabs" role="tablist">${[['hoy', 'Hoy'], ['ayer', 'Anteriores'], ['todas', 'Todas']].map(([k, l]) => html`<button type="button" class="tab ${state.d === k ? 'active' : ''}" data-d="${k}">${l}</button>`)}</div><span class="k-grow"></span><button class="btn btn-sm" data-csv>⇩ CSV</button></div>
      ${rs.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Ruta</th><th>Fecha</th><th>Conductor</th><th>Vehículo</th><th>Zona</th><th>Avance</th><th>Km</th><th>Estado</th></tr></thead><tbody>${rs.map(r => { const p = ops.plan(r), pr = progressOf(r, p); return html`<tr><td><b>${rlink(r)}</b></td><td>${r.date === todayStr() ? 'Hoy' : fmtDate(r.date + 'T12:00')}</td><td>${userName(r.driverId)}</td><td>${db.get('vehicles', r.vehicleId)?.plate || '—'}</td><td>${db.get('zones', r.zoneId)?.name || ''}</td><td style="min-width:120px"><div class="progress"><i style="--v:${pr.pct}%"></i></div><small class="muted">${pr.done}/${pr.total}</small></td><td>${km(r.kmDone || 0)}</td><td>${raw(ROUTE.badge(r.status))}</td></tr>`; })}</tbody></table></div>` : raw(emptyState({ icon: '🗺️', title: 'No hay rutas en este período' }))}</section>`;
    view.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => { state.d = b.dataset.d; paint(); }));
    view.querySelector('[data-new]').onclick = () => newRouteModal();
    view.querySelector('[data-csv]').onclick = () => { if (!rs.length) return toast('No hay filas', 'warning'); downloadCSV(`rutas-${todayStr()}.csv`, rs.map(r => { const items = r.order.map(ops.get).filter(Boolean); return { ruta: r.code, fecha: r.date, conductor: userName(r.driverId), vehiculo: db.get('vehicles', r.vehicleId)?.plate || '', zona: db.get('zones', r.zoneId)?.name || '', paradas: items.length, entregadas: items.filter(ops.isDone).length, km: (r.kmDone || 0).toFixed(1), estado: ROUTE.label(r.status), caja_diferencia: r.closing?.diff ?? '' }; })); };
  };
  paint();
  return { refresh: paint };
}
async function newRouteModal(zoneId = '') {
  const busyD = new Set(ops.todayRoutes().filter(r => r.status !== 'cerrada').map(r => r.driverId)), busyV = new Set(ops.todayRoutes().filter(r => r.status !== 'cerrada').map(r => r.vehicleId));
  const drs = db.query('users', u => u.role === 'conductor' && u.active !== false && !busyD.has(u.id));
  const vs = db.query('vehicles', v => v.status === 'operativo' && !busyV.has(v.id));
  if (!drs.length || !vs.length) return toast(!drs.length ? 'No hay conductores libres hoy' : 'No hay vehículos operativos libres', 'warning');
  const v = await fieldsModal({ title: 'Nueva ruta', size: '', submit: 'Crear ruta', intro: 'Solo se listan conductores y vehículos sin ruta activa hoy.', fields: [
    { name: 'driverId', label: 'Conductor', type: 'select', required: true, options: drs.map(u => [u.id, u.name]) },
    { name: 'vehicleId', label: 'Vehículo', type: 'select', required: true, options: vs.map(x => [x.id, `${x.plate} · ${x.model} (${x.capKg} kg)`]) },
    { name: 'zoneId', label: 'Zona', type: 'select', required: true, options: db.all('zones').map(z => [z.id, z.name]) }
  ], values: { zoneId, driverId: drs[0].id, vehicleId: db.get('users', drs[0].id)?.vehicleId && vs.some(x => x.id === db.get('users', drs[0].id).vehicleId) ? db.get('users', drs[0].id).vehicleId : vs[0].id },
  onSubmit: val => { try { const r = ops.createRoute(val); toast(`${r.code} creada`, 'success'); location.hash = '#/rutas/' + r.id; return true; } catch (e) { return e.message; } } });
  return v;
}
function routeDetail(view, ctx) {
  const sel = new Set();
  const paint = () => {
    const r = db.get('routes', ctx.params.id);
    if (!r) { view.innerHTML = emptyState({ icon: '🔎', title: 'Ruta no encontrada', action: '<a class="btn" href="#/rutas">← Rutas</a>' }); return; }
    const p = ops.plan(r), pr = progressOf(r, p), v = db.get('vehicles', r.vehicleId), pos = ops.vehiclePos(r, p);
    const others = ops.todayRoutes().filter(x => x.id !== r.id && x.status !== 'cerrada');
    const rows = [...p.done, ...p.pending, ...p.skipped];
    [...sel].forEach(id => { if (!p.pending.some(s => s.id === id)) sel.delete(id); });
    const fuel = db.query('fuelLogs', f => f.routeId === r.id);
    view.innerHTML = html`<a href="#/rutas" class="small">← Rutas</a>
      ${pageHead(`Ruta ${r.code}`, raw(`${ROUTE.badge(r.status)} · ${escape(userName(r.driverId))} · ${escape(v?.plate || '')} ${escape(v?.model || '')} · ${escape(db.get('zones', r.zoneId)?.name || '')}`), r.status !== 'cerrada' && p.pending.length > 2 ? '<button class="btn" data-opt>✨ Optimizar</button>' : '')}
      ${kpis([
        { label: 'Avance', value: `${pr.done}/${pr.total}`, hint: r.status === 'en_curso' ? pos.state : ROUTE.label(r.status), icon: '📍' },
        { label: 'Km', value: km(r.kmDone || 0), hint: r.status === 'cerrada' ? `odómetro ${r.odoStart}→${r.odoEnd}` : `faltan ${km(p.kmLeft)}`, icon: '🛣️' },
        { label: 'Término', value: r.status === 'cerrada' ? hhmm(Date.parse(r.closedAt)) : hhmm(p.end), hint: `${p.ev.lateCount} fuera de ventana`, icon: '🏁' },
        { label: 'Efectivo', value: money(r.cash || 0), hint: r.closing ? `declarado ${money(r.closing.cashDeclared)}` : 'cobrado en ruta', icon: '💵' }
      ])}
      <div class="rp-route-grid">
        <section class="card rp-mapcard">${raw(routeMap(r, { p }))}${raw(capBars(r))}</section>
        <section class="card">
          <div class="k-card-head"><div><h3>Paradas</h3><p>Selecciona pendientes para reasignarlas a otro conductor.</p></div></div>
          ${r.status !== 'cerrada' ? html`<div class="k-toolbar rp-selbar"><span class="small"><b data-n>${sel.size}</b> seleccionadas</span><select class="select" data-to aria-label="Ruta destino"><option value="">Mover a…</option>${others.map(o => html`<option value="${o.id}">${o.code} · ${userName(o.driverId)} (${ROUTE.label(o.status)})</option>`)}</select><button class="btn btn-sm" data-move>Mover</button><button class="btn btn-sm btn-ghost" data-unassign>Devolver a bodega</button></div>` : ''}
          <div class="table-wrap"><table class="table rp-stoptable"><thead><tr><th></th><th>#</th><th>Envío</th><th>ETA / hecho</th><th>Estado</th></tr></thead><tbody>${rows.map(s => {
            const l = p.eta[s.id], a = lastAttempt(s, r.id), idx = p.pending.indexOf(s);
            return html`<tr class="${l?.late > 0 ? 'rp-late' : ''}"><td>${isPending(s) && r.status !== 'cerrada' ? html`<input type="checkbox" data-sel="${s.id}" ${sel.has(s.id) ? 'checked' : ''} aria-label="Seleccionar ${s.code}">` : ''}</td><td>${idx >= 0 ? idx + 1 : ''}</td><td><a href="#/envios/${s.id}" class="k-cell-main"><b>${s.code} ${s.kind === 'retiro' ? '· retiro' : ''}</b><small>${s.address}, ${s.comuna}</small></a><div class="rp-flags">${raw(flagsHtml(s))}</div></td><td class="k-nowrap">${l ? html`<b>${hhmm(l.eta)}</b>${l.late > 0 ? html`<small class="rp-bad"> +${Math.round(l.late)}′</small>` : ''}` : a ? hhmm(Date.parse(a.at)) : '—'}</td><td>${raw(stBadge(s))}${a && !a.ok ? html`<small class="muted" style="display:block">${a.reason}</small>` : ''}</td></tr>`;
          })}</tbody></table></div>
        </section>
      </div>
      <div class="grid-2">
        ${raw(card('Jornada', kv([
          ['Salida planificada', hhmm(Date.parse(r.plannedStart))], ['Inicio', r.startedAt ? dateTime(r.startedAt) : 'Por iniciar'],
          ['Checklist', r.checklist ? (Object.values(r.checklist.items || {}).some(x => x === 'obs' || x === 'falla') ? raw(`<span class="badge badge-warning">Con observaciones</span> ${escape(r.checklist.obs || '')}`) : raw('<span class="badge badge-success">OK</span>')) : '—'],
          ['Odómetro / combustible', r.odoStart ? `${r.odoStart.toLocaleString('es-CL')} km · ${r.fuelStart}%` : '—'],
          ['Colación', (r.breaks || []).length ? r.breaks.map(b => `${hhmm(Date.parse(b.start))}–${b.end ? hhmm(Date.parse(b.end)) : 'en curso'}`).join(', ') : 'Pendiente'],
          ['Cargas de combustible', fuel.length ? fuel.map(f => `${f.liters} L (${money(f.amount)})`).join(', ') : 'Ninguna'],
          r.optimized ? ['Optimización', `${km(r.optimized.kmBefore)} → ${km(r.optimized.kmAfter)}`] : null
        ])))}
        ${raw(card('Cierre', r.closing ? kv([['Cerrada', dateTime(r.closing.at)], ['Paquetes devueltos', String((r.closing.returned || []).length)], ['Efectivo esperado', money(r.closing.cashExpected)], ['Efectivo declarado', money(r.closing.cashDeclared)], ['Diferencia', raw(r.closing.diff ? `<b class="rp-bad">${escape(money(r.closing.diff))}</b>` : '<span class="badge badge-success">Cuadra</span>')], ['Odómetro final', `${(r.odoEnd || 0).toLocaleString('es-CL')} km`], ['Notas', r.closing.notes || (r.closing.auto ? 'Cierre automático (simulación)' : '')]]) : '<p class="muted small">La ruta aún no se cierra.</p>'))}
      </div>`;
    const n = view.querySelector('[data-n]');
    view.querySelectorAll('[data-sel]').forEach(c => c.addEventListener('change', () => { c.checked ? sel.add(c.dataset.sel) : sel.delete(c.dataset.sel); if (n) n.textContent = sel.size; }));
    view.querySelector('[data-move]')?.addEventListener('click', async () => {
      const to = db.get('routes', view.querySelector('[data-to]').value);
      if (!sel.size) return toast('Selecciona paradas pendientes', 'warning');
      if (!to) return toast('Elige la ruta destino', 'warning');
      const loaded = [...sel].some(id => ops.get(id)?.status === 'en_ruta');
      if (loaded && to.status === 'planificada' && !await confirm('Hay paquetes ya cargados en el vehículo: deberán volver al CD para salir en la otra ruta.', { title: 'Reasignar paradas', ok: 'Reasignar' })) return;
      if (loaded && to.status === 'en_curso' && !await confirm(`Transbordo: ${userName(r.driverId)} y ${userName(to.driverId)} deben encontrarse para pasar los paquetes.`, { title: 'Transbordo entre conductores', ok: 'Confirmar transbordo' })) return;
      try { ops.assign([...sel], to); toast(`${sel.size} parada(s) movidas a ${to.code}`, 'success'); sel.clear(); paint(); } catch (e) { toast(e.message, 'warning'); }
    });
    view.querySelector('[data-unassign]')?.addEventListener('click', async () => {
      if (!sel.size) return toast('Selecciona paradas pendientes', 'warning');
      if (!await confirm(`${sel.size} parada(s) volverán a la bodega para planificarse de nuevo.`, { title: 'Devolver a bodega', ok: 'Devolver' })) return;
      ops.unassign([...sel]); sel.clear(); toast('Paradas devueltas a bodega', 'success'); paint();
    });
    view.querySelector('[data-opt]')?.addEventListener('click', () => optimizeAdmin(r));
  };
  paint();
  return { refresh: () => { if (!view.querySelector('[data-sel]:checked')) paint(); } };
}
function optimizeAdmin(r) {
  const res = ops.computeOptimization(db.get('routes', r.id));
  const m = modal({ title: `Optimizar ${r.code}`, body: html`<p class="muted" style="margin-top:0">Vecino más cercano + 2-opt + reubicación sobre las ${res.order.length} paradas pendientes, con ventanas horarias y prioridad express.</p>
    <div class="rp-opt"><div class="rp-opt-col"><span class="eyebrow">Actual</span><b>${km(res.before.km)}</b><span>Término ${hhmm(res.before.end)}</span><span>${res.before.lateCount} atrasos</span></div><div class="rp-opt-arrow">→</div><div class="rp-opt-col best"><span class="eyebrow">Optimizada</span><b>${km(res.after.km)}</b><span>Término ${hhmm(res.after.end)}</span><span>${res.after.lateCount} atrasos</span></div></div>
    ${res.changed ? '' : raw('<p class="small">El orden actual ya es el mejor encontrado.</p>')}`, foot: `<button class="btn btn-ghost" data-close>Cerrar</button>${res.changed ? '<button class="btn btn-primary" data-ok>Aplicar y avisar al conductor</button>' : ''}` });
  m.el.querySelector('[data-ok]')?.addEventListener('click', () => { ops.applyOptimization(db.get('routes', r.id), res); m.close(); toast('Ruta optimizada', 'success'); });
}

// ================= Planificación =================
function planner(view, ctx) {
  const sel = new Set();
  let zf = '';
  const paint = () => {
    const bl = ops.backlog().sort((a, b) => a.zoneId.localeCompare(b.zoneId) || (b.service === 'express') - (a.service === 'express'));
    const list = bl.filter(s => !zf || s.zoneId === zf);
    [...sel].forEach(id => { if (!bl.some(s => s.id === id)) sel.delete(id); });
    const zs = db.all('zones');
    const planned = ops.todayRoutes().filter(r => r.status === 'planificada');
    const busyD = new Set(ops.todayRoutes().filter(r => r.status !== 'cerrada').map(r => r.driverId)), busyV = new Set(ops.todayRoutes().filter(r => r.status !== 'cerrada').map(r => r.vehicleId));
    const freeD = db.query('users', u => u.role === 'conductor' && u.active !== false && !busyD.has(u.id));
    const freeV = db.query('vehicles', v => v.status === 'operativo' && !busyV.has(v.id));
    const toReceive = db.query('shipments', s => s.status === 'creado');
    const tomorrow = db.count('shipments', s => s.date === tomorrowStr() && s.status === 'en_bodega');
    view.innerHTML = html`${pageHead('Planificación', 'Agrupa los envíos de la bodega en rutas por zona y capacidad del vehículo.', `<button class="btn" data-new>＋ Nueva ruta</button><button class="btn btn-primary" data-auto ${bl.length ? '' : 'disabled'}>🧩 Armar rutas automáticamente</button>`)}
      <div class="rp-zones">${zs.map(z => { const zl = bl.filter(s => s.zoneId === z.id); return html`<button type="button" class="card rp-zone-card ${zf === z.id ? 'sel' : ''}" data-zone="${z.id}" style="--mk:${z.color}"><span class="rp-sw"></span><b>${z.name}</b><span class="rp-zn">${zl.length}</span><small>${kg(zl.reduce((a, s) => a + (+s.weight || 0), 0))} · ${Math.round(zl.reduce((a, s) => a + (+s.vol || 0), 0) / 100) / 10} m³</small><small class="muted">corte ${z.cutoff}</small></button>`; })}</div>
      <div class="rp-route-grid">
        <section class="card rp-mapcard"><div class="k-card-head"><div><h3>Por planificar ${zf ? '· ' + (db.get('zones', zf)?.name || '') : ''}</h3><p>${list.length} envíos y retiros en bodega · ${tomorrow} ya programados para mañana</p></div></div>
          ${raw(cityMap({ points: list.map(s => ({ x: s.x, y: s.y, kind: s.kind === 'retiro' ? 'pickup' : 'point', label: s.kind === 'retiro' ? 'R' : '', title: `${s.code} · ${s.address}, ${s.comuna}`, color: db.get('zones', s.zoneId)?.color })), zones: Object.fromEntries(zs.map(z => [z.key, z.color])), fit: list.length ? [...list, DEPOT] : null, label: 'Envíos por planificar', ratio: 1.5 }))}</section>
        <section class="card"><div class="k-card-head"><div><h3>Recursos libres</h3><p>Sin ruta activa hoy</p></div></div>
          <p class="small"><b>Conductores (${freeD.length}):</b> ${freeD.length ? freeD.map(u => `${u.name} (${db.get('zones', u.zoneId)?.name || '—'})`).join(', ') : 'ninguno'}</p>
          <p class="small"><b>Vehículos (${freeV.length}):</b> ${freeV.length ? freeV.map(v => `${v.plate} ${v.type} ${v.capKg} kg`).join(', ') : 'ninguno'}</p>
          <h4 class="rp-h4">Rutas por iniciar</h4>
          ${planned.length ? html`<ul class="rp-mini">${planned.map(r => html`<li><span>${rlink(r)} · ${userName(r.driverId)} · ${r.order.length} paradas</span>${raw(capBars(r))}</li>`)}</ul>` : raw('<p class="muted small">No hay rutas por iniciar.</p>')}
        </section>
      </div>
      <section class="card">
        <div class="k-toolbar rp-selbar"><span class="small"><b data-n>${sel.size}</b> seleccionados</span><button class="btn btn-sm btn-ghost" data-all>Seleccionar todos</button><select class="select" data-to aria-label="Ruta"><option value="">Asignar a ruta…</option>${planned.map(r => html`<option value="${r.id}">${r.code} · ${userName(r.driverId)} · ${db.get('zones', r.zoneId)?.name}</option>`)}</select><button class="btn btn-sm btn-primary" data-assign>Asignar</button><span class="k-grow"></span>${zf ? raw('<button class="btn btn-sm btn-ghost" data-zone="">Ver todas las zonas</button>') : ''}</div>
        ${list.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th></th><th>Envío</th><th>Zona</th><th>Servicio</th><th>Peso</th><th>Ventana</th></tr></thead><tbody>${list.map(s => html`<tr><td><input type="checkbox" data-sel="${s.id}" ${sel.has(s.id) ? 'checked' : ''} aria-label="Seleccionar ${s.code}"></td><td><a href="#/${s.kind === 'retiro' ? 'retiros' : 'envios'}/${s.id}" class="k-cell-main"><b>${s.code}${s.kind === 'retiro' ? ' · retiro' : ''}</b><small>${s.address}, ${s.comuna}</small></a>${s.nextAction ? html`<small class="badge badge-warning">${s.nextAction === 'reintento' ? 'Reintento' : s.nextAction}</small>` : ''}</td><td>${db.get('zones', s.zoneId)?.name || ''}</td><td>${s.kind === 'retiro' ? 'Retiro' : svcLabel(s)}</td><td class="k-nowrap">${kg(s.weight)}</td><td>${s.win || '—'}</td></tr>`)}</tbody></table></div>` : raw(emptyState({ icon: '✅', title: 'Bodega al día', text: 'No quedan envíos por planificar para hoy.' }))}
      </section>
      ${raw(card(`Por recibir en el CD (${toReceive.length})`, toReceive.length ? `<p class="small muted">Etiquetados por los clientes, aún no llegan al andén.</p><ul class="rp-mini">${toReceive.map(s => `<li><span><b>${escape(s.code)}</b> · ${escape(companyName(s.companyId))} · ${escape(s.comuna)}</span><button class="btn btn-sm" data-recv="${s.id}">Recibir</button></li>`).join('')}</ul>` : '<p class="muted small">Nada pendiente de recepción.</p>', { actions: toReceive.length ? '<button class="btn btn-sm" data-recvall>Recibir todos</button>' : '' }))}`;
    const n = view.querySelector('[data-n]');
    view.querySelectorAll('[data-sel]').forEach(c => c.addEventListener('change', () => { c.checked ? sel.add(c.dataset.sel) : sel.delete(c.dataset.sel); n.textContent = sel.size; }));
    view.querySelector('[data-all]').onclick = () => { list.forEach(s => sel.add(s.id)); paint(); };
    view.querySelectorAll('[data-zone]').forEach(b => b.addEventListener('click', () => { zf = zf === b.dataset.zone ? '' : b.dataset.zone; paint(); }));
    view.querySelector('[data-new]').onclick = () => newRouteModal(zf);
    view.querySelector('[data-assign]').onclick = () => {
      const r = db.get('routes', view.querySelector('[data-to]').value);
      if (!sel.size) return toast('Selecciona envíos', 'warning');
      if (!r) return toast('Elige una ruta por iniciar', 'warning');
      const l = ops.load(r), add = [...sel].map(ops.get);
      const kgAdd = add.reduce((a, s) => a + (+s.weight || 0), 0), lAdd = add.reduce((a, s) => a + (+s.vol || 0), 0);
      if (l.kgPlan + kgAdd > l.v.capKg || l.lPlan + lAdd > l.v.capL) return toast(`Excede la capacidad de ${l.v.plate} (${Math.round(l.kgPlan + kgAdd)}/${l.v.capKg} kg, ${Math.round((l.lPlan + lAdd) / 100) / 10}/${l.v.capL / 1000} m³)`, 'error');
      ops.assign([...sel], r); toast(`${sel.size} asignados a ${r.code}`, 'success'); sel.clear(); paint();
    };
    view.querySelector('[data-auto]').onclick = async () => {
      if (!await confirm(`Se asignarán ${zf ? 'los envíos de la zona seleccionada' : `los ${bl.length} envíos y retiros`} a rutas por iniciar de su zona y, si no caben, a rutas nuevas con conductores y vehículos libres. Luego se optimiza cada ruta.`, { title: 'Planificación automática', ok: 'Armar rutas' })) return;
      const res = ops.autoPlan({ zoneIds: zf ? [zf] : null });
      modal({ title: 'Resultado de la planificación', body: html`${kpis([{ label: 'Asignados', value: res.assigned, icon: '✅' }, { label: 'Rutas nuevas', value: res.created.length, icon: '🆕' }, { label: 'Sin cupo', value: res.left.length, icon: '⏳' }])}
        ${res.touched.length ? html`<h4 class="rp-h4">Rutas modificadas</h4><ul class="rp-mini">${res.touched.map(id => db.get('routes', id)).map(r => html`<li><span>${rlink(r)} · ${userName(r.driverId)} · ${r.order.length} paradas${r.optimized ? ` · ${km(r.optimized.kmAfter)}` : ''}</span></li>`)}</ul>` : ''}
        ${res.left.length ? html`<p class="small">Quedaron ${res.left.length} envíos sin conductor o vehículo disponible: ${res.left.map(s => s.code).join(', ')}. Puedes asignarlos a mano o dejarlos para mañana.</p>` : ''}`, foot: '<button class="btn btn-primary" data-close>Listo</button>' });
      paint();
    };
    view.querySelectorAll('[data-recv]').forEach(b => b.addEventListener('click', () => { ops.receiveAtDepot(ops.get(b.dataset.recv)); toast('Recibido en CD', 'success'); }));
    view.querySelector('[data-recvall]')?.addEventListener('click', () => { toReceive.forEach(s => ops.receiveAtDepot(s)); toast(`${toReceive.length} envíos recibidos`, 'success'); });
  };
  paint();
  return { refresh: () => { if (!sel.size) paint(); } };
}

// ================= Excepciones =================
function exceptions(view) {
  const state = { st: 'abiertas', type: '', q: '' };
  const paint = () => {
    const all = db.all('incidents');
    const list = all.filter(i => (state.st === 'abiertas' ? i.status !== 'resuelta' : state.st === 'resueltas' ? i.status === 'resuelta' : true) && (!state.type || i.type === state.type)).sort((a, b) => (a.status === 'resuelta') - (b.status === 'resuelta') || ({ alta: 0, media: 1, baja: 2 }[a.priority] - { alta: 0, media: 1, baja: 2 }[b.priority]) || b.createdAt.localeCompare(a.createdAt));
    view.innerHTML = html`${pageHead('Excepciones', 'Intentos fallidos, cambios pedidos por destinatarios con el paquete en ruta, diferencias de caja y observaciones de vehículos.')}
      <section class="card"><div class="k-toolbar">
        <div class="tabs">${[['abiertas', `Abiertas (${all.filter(i => i.status !== 'resuelta').length})`], ['resueltas', 'Resueltas'], ['todas', 'Todas']].map(([k, l]) => html`<button type="button" class="tab ${state.st === k ? 'active' : ''}" data-st="${k}">${l}</button>`)}</div>
        <select class="select" data-type aria-label="Tipo"><option value="">Tipo: todos</option>${Object.entries(INC_TYPES).map(([k, [l]]) => html`<option value="${k}" ${state.type === k ? 'selected' : ''}>${l}</option>`)}</select>
        <span class="k-grow"></span><button class="btn btn-sm" data-csv>⇩ CSV</button></div>
      ${list.length ? html`<ul class="rp-inbox">${list.map(i => { const s = i.shipmentId && ops.get(i.shipmentId), r = i.routeId && db.get('routes', i.routeId); return html`<li class="rp-inc prio-${i.priority} ${i.status === 'resuelta' ? 'done' : ''}">
          <span class="rp-inc-ico" aria-hidden="true">${INC_TYPES[i.type]?.[1] || '⚠'}</span>
          <div class="rp-inc-main"><div class="row" style="gap:6px"><b>${INC_TYPES[i.type]?.[0] || i.type}</b>${raw(INC.badge(i.status))}<span class="badge ${i.priority === 'alta' ? 'badge-danger' : i.priority === 'media' ? 'badge-warning' : ''}">Prioridad ${i.priority}</span><small class="muted">${i.code} · ${ago(i.createdAt)}</small></div>
            <p>${i.text}</p>
            <small class="muted">${r ? html`Ruta ${rlink(r)} · ${userName(r.driverId)}` : ''}${s ? html` · ${stBadge(s)} <a href="#/${s.kind === 'retiro' ? 'retiros' : 'envios'}/${s.id}">${s.code}</a>` : ''}</small>
            ${i.resolution ? html`<p class="small rp-res">✔ ${i.resolution} — ${userName(i.resolvedBy)}</p>` : ''}</div>
          ${i.status !== 'resuelta' ? html`<div class="rp-inc-acts"><button class="btn btn-sm btn-primary" data-handle="${i.id}">Gestionar</button></div>` : ''}</li>`; })}</ul>` : raw(emptyState({ icon: '✅', title: 'Sin excepciones', text: 'No hay casos con esos filtros.' }))}</section>`;
    view.querySelectorAll('[data-st]').forEach(b => b.addEventListener('click', () => { state.st = b.dataset.st; paint(); }));
    view.querySelector('[data-type]').addEventListener('change', e => { state.type = e.target.value; paint(); });
    view.querySelectorAll('[data-handle]').forEach(b => b.addEventListener('click', () => handleIncident(db.get('incidents', b.dataset.handle))));
    view.querySelector('[data-csv]').onclick = () => { if (!list.length) return toast('No hay filas', 'warning'); downloadCSV('excepciones.csv', list.map(i => ({ codigo: i.code, tipo: INC_TYPES[i.type]?.[0] || i.type, estado: INC.label(i.status), prioridad: i.priority, detalle: i.text, ruta: db.get('routes', i.routeId)?.code || '', envio: ops.get(i.shipmentId)?.code || '', creada: i.createdAt, resolucion: i.resolution || '' }))); };
  };
  paint();
  return { refresh: paint };
}
function handleIncident(inc) {
  const s = inc.shipmentId && ops.get(inc.shipmentId);
  const r = inc.routeId && db.get('routes', inc.routeId);
  const acts = [];
  if (s && s.kind === 'entrega' && !ops.isDone(s)) {
    if (s.status === 'fallido' && r?.status === 'en_curso') acts.push(['retry', '↻ Reintentar hoy (al final de la ruta)']);
    if (['fallido', 'en_bodega'].includes(s.status)) acts.push(['punto', '🏪 Enviar a punto de retiro'], ['date', '📅 Reprogramar'], ['return', '↩ Devolver al remitente']);
    if (s.status === 'en_ruta' || s.status === 'fallido') acts.push(['msg', '💬 Avisar al conductor']);
  }
  if (inc.type === 'checklist' && r) acts.push(['maint', '🛠️ Enviar vehículo a mantención']);
  const pts = db.query('points', p => p.active !== false);
  const m = modal({ title: `${inc.code} · ${INC_TYPES[inc.type]?.[0] || inc.type}`, size: 'lg', body: html`<p style="margin-top:0">${inc.text}</p>
      ${s ? raw(card(`${s.code} · ${s.rName}`, `${kv([['Dirección', `${s.address}, ${s.comuna}`], ['Teléfono', s.rPhone], ['Estado', raw(stBadge(s))], ['Intentos', String((s.attempts || []).length)], ['Indicaciones', (s.notes || []).map(n => [...(n.tags || []), n.text].filter(Boolean).join(' · ')).join(' / ') || '—']])}`)) : ''}
      ${acts.length ? html`<h4 class="rp-h4">Acciones</h4><div class="rp-acts">${acts.map(([k, l]) => html`<button type="button" class="btn btn-sm" data-a="${k}">${l}</button>`)}</div>` : ''}
      <div data-extra></div>
      <div class="field" style="margin-top:12px"><label for="inc-res">Resolución / nota *</label><textarea class="textarea" id="inc-res" maxlength="300" placeholder="Qué se hizo para resolver el caso"></textarea></div>`,
    foot: `<button class="btn btn-ghost" data-close>Cerrar</button>${inc.status === 'abierta' ? '<button class="btn" data-gestion>Marcar en gestión</button>' : ''}<button class="btn btn-primary" data-ok>Resolver</button>` });
  const res = m.el.querySelector('#inc-res'), extra = m.el.querySelector('[data-extra]');
  const setRes = t => { res.value = t; };
  m.el.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.a, fresh = s && ops.get(s.id);
    try {
      if (a === 'retry') { ops.retryLater(db.get('routes', r.id), fresh); setRes('Se reintenta hoy al final de la ruta'); toast('Parada devuelta a la ruta', 'success'); }
      if (a === 'msg') { extra.innerHTML = html`<div class="field"><label for="inc-msg">Mensaje al conductor</label><div class="row" style="flex-wrap:nowrap"><input class="input" id="inc-msg" value="Ojo con ${fresh.code}: ${(fresh.notes || []).at(-1)?.text || 'revisa las indicaciones'}"><button type="button" class="btn btn-sm" data-send>Enviar</button></div></div>`; extra.querySelector('[data-send]').onclick = () => { ops.sendMessage(fresh, 'despacho', extra.querySelector('#inc-msg').value); setRes('Conductor avisado por chat'); toast('Mensaje enviado al conductor', 'success'); }; }
      if (a === 'punto') { extra.innerHTML = html`<div class="field"><label for="inc-pt">Punto de retiro</label><div class="row" style="flex-wrap:nowrap"><select class="select" id="inc-pt">${pts.map(p => html`<option value="${p.id}">${p.name} · ${p.comuna} (${pointUse(p)}/${p.capacity})</option>`)}</select><button type="button" class="btn btn-sm" data-go>Aplicar</button></div></div>`; extra.querySelector('[data-go]').onclick = () => { const pid = extra.querySelector('#inc-pt').value, p = db.get('points', pid), cur = ops.get(s.id); if (cur.status === 'fallido') { db.update('shipments', s.id, { nextAction: 'punto', redirectPointId: pid }); setRes(`Al cierre irá a ${p.name}`); } else { ops.redirectToPoint(cur, pid); setRes(`Enviado a ${p.name}`); } toast('Listo', 'success'); }; }
      if (a === 'date') { extra.innerHTML = html`<div class="field"><label for="inc-d">Nueva fecha</label><div class="row" style="flex-wrap:nowrap"><input class="input" type="date" id="inc-d" min="${tomorrowStr()}" value="${tomorrowStr()}"><button type="button" class="btn btn-sm" data-go>Aplicar</button></div></div>`; extra.querySelector('[data-go]').onclick = () => { const d = extra.querySelector('#inc-d').value; if (!d || d < tomorrowStr()) return toast('Elige una fecha desde mañana', 'warning'); const cur = ops.get(s.id); db.update('shipments', s.id, cur.status === 'fallido' ? { nextAction: 'reprogramar', nextDate: d } : { date: d }); db.log('reprogramación', `${s.code}: reprogramado para ${d} (despacho)`, me()?.id); setRes(`Reprogramado para el ${d}`); toast('Reprogramado', 'success'); }; }
      if (a === 'return') { const cur = ops.get(s.id); if (cur.status === 'fallido') { db.update('shipments', s.id, { nextAction: 'devolver' }); setRes('Se devolverá al remitente al cierre de la ruta'); } else { SHIP.move(db, 'shipments', s.id, 'devuelto', { by: me()?.id, note: 'Devolución al remitente (despacho)', title: x => x.code }); setRes('Devuelto al remitente'); } toast('Listo', 'success'); }
      if (a === 'maint') { db.update('vehicles', r.vehicleId, { status: r.status === 'cerrada' ? 'mantencion' : db.get('vehicles', r.vehicleId).status, pendingMaint: true }); db.log('vehículo', `${db.get('vehicles', r.vehicleId)?.plate}: mantención solicitada`, me()?.id); setRes('Vehículo agendado para mantención al volver al CD'); toast('Mantención solicitada', 'success'); }
      b.disabled = true;
    } catch (e) { toast(e.message, 'warning'); }
  }));
  m.el.querySelector('[data-gestion]')?.addEventListener('click', () => { ops.resolveIncident(inc, res.value.trim() || 'Tomado por despacho', 'en_gestion'); m.close(); toast('En gestión', 'success'); });
  m.el.querySelector('[data-ok]').onclick = () => { const t = res.value.trim(); if (t.length < 4) { res.classList.add('invalid'); return toast('Escribe la resolución', 'warning'); } try { ops.resolveIncident(db.get('incidents', inc.id), t); m.close(); toast(`${inc.code} resuelta`, 'success'); } catch (e) { toast(e.message, 'warning'); } };
}

// ================= Indicadores =================
function kpiView(view) {
  const k = ops.kpisToday();
  const stats = db.all('dailyStats').sort((a, b) => a.date.localeCompare(b.date));
  const last14 = stats.slice(-14);
  const lbl = d => d.date.slice(8) + '/' + d.date.slice(5, 7);
  const reasons = countBy(db.all('shipments').flatMap(s => (s.attempts || []).filter(a => !a.ok)), a => a.reason || 'Otro');
  const rs = ops.todayRoutes();
  const per = rs.map(r => { const items = r.order.map(ops.get).filter(Boolean); const att = items.filter(s => lastAttempt(s, r.id)); const ok = att.filter(ops.isDone); const hrs = r.startedAt ? Math.max(.25, ((r.status === 'cerrada' ? Date.parse(r.closedAt) : Date.parse(r.lastAt || r.startedAt)) - Date.parse(r.startedAt)) / 3600e3) : 0; return { r, n: items.length, att: att.length, ok: ok.length, first: ok.filter(s => s.attempts.length === 1).length, sph: hrs ? att.length / hrs : 0 }; });
  const ratings = db.query('shipments', s => s.rating);
  const avg = ratings.length ? (ratings.reduce((a, s) => a + s.rating.stars, 0) / ratings.length).toFixed(1) : '—';
  view.innerHTML = html`${pageHead('Indicadores', 'Hoy en vivo y los últimos 30 días.', '<button class="btn" data-csv>⇩ CSV 30 días</button>')}
    ${kpis([
      { label: 'A tiempo (hoy)', value: `${k.onTimePct}%`, icon: '⏱️' }, { label: 'Primer intento (hoy)', value: `${k.firstPct}%`, icon: '🎯' },
      { label: 'Paradas/hora (hoy)', value: String(k.stopsHour).replace('.', ','), icon: '⚡' }, { label: 'Km (hoy)', value: km(k.km), icon: '🛣️' },
      { label: 'Evaluación promedio', value: `${avg} ★`, hint: `${ratings.length} evaluaciones`, icon: '⭐' }
    ])}
    <div class="grid-2">
      ${raw(chartCard('Envíos por día (14 días)', lineChart(last14.map(d => ({ label: lbl(d), value: d.total })))))}
      ${raw(chartCard('% a tiempo por día', barChart(last14.map(d => ({ label: lbl(d), value: Math.round((d.onTime / d.delivered) * 100) })), { format: v => v + '%' })))}
      ${raw(chartCard('% éxito al primer intento', barChart(last14.map(d => ({ label: lbl(d), value: Math.round((d.first / d.total) * 100) })), { format: v => v + '%' })))}
      ${raw(chartCard('Motivos de intento fallido', reasons.length ? donutChart(reasons.sort((a, b) => b.value - a.value).slice(0, 6), { label: reasons.reduce((a, x) => a + x.value, 0) }) : '<p class="muted small">Sin intentos fallidos.</p>'))}
    </div>
    ${raw(card('Conductores hoy', per.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Conductor</th><th>Ruta</th><th class="k-num">Paradas</th><th class="k-num">Visitadas</th><th class="k-num">Éxito</th><th class="k-num">1er intento</th><th class="k-num">Paradas/h</th><th class="k-num">Km</th></tr></thead><tbody>${per.map(x => `<tr><td>${escape(userName(x.r.driverId))}</td><td>${rlink(x.r)}</td><td class="k-num">${x.n}</td><td class="k-num">${x.att}</td><td class="k-num">${x.att ? Math.round(x.ok / x.att * 100) : 0}%</td><td class="k-num">${x.att ? Math.round(x.first / x.att * 100) : 0}%</td><td class="k-num">${x.sph.toFixed(1).replace('.', ',')}</td><td class="k-num">${km(x.r.kmDone || 0)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small">Sin rutas hoy.</p>'))}`;
  view.querySelector('[data-csv]').onclick = () => downloadCSV('indicadores-30-dias.csv', stats.map(d => ({ fecha: d.date, envios: d.total, entregados: d.delivered, fallidos: d.failed, a_tiempo: d.onTime, primer_intento: d.first, km: d.km, horas: d.hours, conductores: d.drivers })));
}

// ================= Envíos: detalle enriquecido =================
const shipDetail = {
  render: s => html`<section class="card rp-mapcard">${raw(cityMap({ points: [{ x: s.x, y: s.y, kind: s.kind === 'retiro' ? 'pickup' : 'home', label: s.kind === 'retiro' ? 'R' : '' }], fit: [s, DEPOT], minW: 6, ratio: 2, label: 'Ubicación del destino' }))}</section>
    ${s.proof ? raw(card(s.kind === 'retiro' ? 'Comprobante de retiro' : 'Prueba de entrega', proofCard(s))) : ''}
    ${raw(card('Intentos', (s.attempts || []).length ? `<ul class="rp-mini">${s.attempts.map(a => `<li><span class="badge ${a.ok ? 'badge-success' : 'badge-danger'}">${a.ok ? 'Entregado' : 'Fallido'}</span> ${escape(dateTime(a.at))} · ${escape(userName(a.by))}${a.reason ? ` · ${escape(a.reason)}` : ''}${a.note ? `<small>${escape(a.note)}</small>` : ''}</li>`).join('')}</ul>` : '<p class="muted small">Sin intentos aún.</p>'))}
    ${raw(card('Indicaciones del destinatario', (s.notes || []).length || s.safePlace || s.prefWin ? `<ul class="rp-notes">${(s.notes || []).map(n => `<li><span>${(n.tags || []).map(t => `<span class="chip active rp-tag">${escape(t)}</span>`).join(' ')} ${escape(n.text)}</span><small>${escape(n.by)} · ${escape(ago(n.at))}</small></li>`).join('')}${s.safePlace ? `<li><span>Lugar seguro: ${escape(s.safePlace)}</span></li>` : ''}${s.prefWin ? `<li><span>Ventana preferida: ${escape(s.prefWin)}</span></li>` : ''}</ul>` : '<p class="muted small">Sin indicaciones.</p>'))}
    ${raw(card('Chat', chatBox(s, 'despacho')))}`,
  aside: s => html`${raw(card('Resumen', kv([['Tipo', s.kind === 'retiro' ? 'Retiro' : 'Entrega'], ['Remitente', companyName(s.companyId)], ['Ruta', s.routeId ? raw(rlink(db.get('routes', s.routeId) || { id: '', code: '—', color: '' })) : 'Sin ruta'], ['Precio', money(s.price || 0)], ['PIN', s.pin], s.rating ? ['Evaluación', `${'★'.repeat(s.rating.stars)} ${s.rating.comment || ''}`] : null, s.redirectPointId ? ['Punto de retiro', db.get('points', s.redirectPointId)?.name] : null])))}${raw(card('Seguimiento', shipTimeline(s)))}`
};
shipments.cfg.detail = shipDetail;
pickups.cfg.detail = shipDetail;
const labelAction = { id: 'label', label: 'Etiqueta', icon: '🏷️', run: s => labelModal([s]) };
shipments.cfg.rowActions = [labelAction, { id: 'recv', label: 'Recibir en CD', icon: '📥', when: s => s.status === 'creado', run: s => { ops.receiveAtDepot(s); toast('Recibido en CD', 'success'); } }];
app.panel({
  page: 'admin.html', sub: 'Despacho y administración', topbar: '<span class="rp-live k-hide-sm">● Simulación en vivo</span>',
  nav: [
    { section: 'Operación' },
    { id: '', label: 'Tablero', icon: '📡', render: board, watch: ['routes', 'shipments', 'incidents'] },
    { id: 'rutas', label: 'Rutas', icon: '🗺️', render: routesList, watch: ['routes'], routes: { ':id': { label: 'Ruta', render: routeDetail } }, count: () => db.count('routes', r => r.date === todayStr() && r.status === 'en_curso') },
    { id: 'planificar', label: 'Planificación', icon: '🧩', render: planner, watch: ['shipments', 'routes'], count: () => ops.backlog().length },
    { id: 'excepciones', label: 'Excepciones', icon: '⚠️', render: exceptions, watch: ['incidents', 'shipments'], count: () => db.count('incidents', i => i.status === 'abierta') },
    shipments.section(),
    pickups.section(),
    { id: 'indicadores', label: 'Indicadores', icon: '📈', render: kpiView, watch: ['dailyStats'] },
    { section: 'Red y flota' },
    drivers.section(),
    vehicles.section(),
    zones.section({ roles: ADMIN }),
    points.section(),
    companies.section({ roles: ADMIN }),
    rates.section({ roles: ADMIN }),
    invoices.section({ roles: ADMIN }),
    { section: 'Sistema' },
    usersSection(app, { roles: ADMIN }),
    settingsSection(app, { roles: ADMIN, groups: [
      { title: 'Sitio público', fields: [{ name: 'tagline', label: 'Eslogan', required: true }, { name: 'phone', label: 'Teléfono', type: 'tel', required: true }, { name: 'email', label: 'Correo', type: 'email', required: true }] },
      { title: 'Operación', sub: 'Se usan para calcular ETA, optimizar rutas y decidir la fecha de reparto.', fields: [
        { name: 'speed', label: 'Velocidad media urbana (km/h)', type: 'number', min: 8, max: 60, required: true },
        { name: 'serviceMin', label: 'Minutos de atención por parada', type: 'number', min: 1, max: 20, required: true },
        { name: 'breakMin', label: 'Colación (minutos, 0 = sin colación)', type: 'number', min: 0, max: 90, required: true },
        { name: 'breakAt', label: 'Hora de colación', required: true, check: v => (/^\d{2}:\d{2}$/.test(v) ? '' : 'usa HH:MM') },
        { name: 'cutoff', label: 'Hora de corte (envíos después salen mañana)', required: true, check: v => (/^\d{2}:\d{2}$/.test(v) ? '' : 'usa HH:MM') },
        { name: 'maxAttempts', label: 'Intentos máximos antes de devolución', type: 'number', min: 1, max: 5, required: true },
        { name: 'notifyEta', label: 'Enviar SMS con ventana de llegada al iniciar ruta', type: 'bool' }
      ] }
    ] }),
    logSection(app, { roles: ADMIN })
  ]
});
