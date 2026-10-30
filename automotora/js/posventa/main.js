// App del asesor de servicio: citas del día, recepción, tablero de taller, OT y vehículos.
import { createRouter } from '../../../assets/core/router.js';
import { escape, money, toast } from '../../../assets/core/ui.js';
import { db, auth, PAGE_ROLES } from '../data/db.js';
import { mountShell, startPanel, host, pageHead, statCard } from '../shared/shell.js';
import { apptBadge, APPT_TYPES, APPT_STATUS, OT_FLOW, showroom, otTotal, userName, model, brand, recallsFor, warrantyFor, nextService, workshopLoad } from '../shared/domain.js';
import { receive, otPanelHTML, otAction, otChange, otSubmit } from '../shared/workshop.js';
import { carSVG } from '../shared/car.js';
import { meter } from '../shared/charts.js';
import { ymd, addDays, parseYmd, patenteFormat, patenteClean, nf, fdate, uiGet, uiSet } from '../shared/util.js';
import { icon } from '../shared/icons.js';

let user;
try { user = auth.require(PAGE_ROLES['posventa.html']); } catch (e) { /* redirigiendo */ }
if (user) {
  const sr = () => uiGet('pvShowroom', user.showroomId || 'scl');
  const NAV = [{ section: 'Taller' }, { href: '#/', label: 'Citas de hoy', ico: 'calendar', count: () => db.count('appointments', a => a.date === ymd() && a.showroomId === sr() && a.status === 'agendada') }, { href: '#/taller', label: 'Tablero de taller', ico: 'kanban', count: () => db.count('workorders', o => o.showroomId === sr() && o.status === 'lista') }, { href: '#/agenda', label: 'Próximos días', ico: 'clock' }, { href: '#/vehiculos', label: 'Vehículos y clientes', ico: 'car' }];
  const shell = mountShell({ brand: 'Autoplaza', sub: 'Posventa · ' + (showroom(sr())?.city || ''), logo: 'wrench', user, auth, db, nav: NAV, topExtra: `<select class="select inline-edit" data-sr aria-label="Sucursal" style="max-width:150px">${db.all('showrooms').map(s => `<option value="${s.id}" ${s.id === sr() ? 'selected' : ''}>${escape(s.city)}</option>`).join('')}</select>`, appClass: 'app-posventa' });
  document.querySelector('[data-sr]').onchange = e => { uiSet('pvShowroom', e.target.value); router.refresh(); shell.refreshCounts(); };
  const page = (t, fn) => (p, q) => { shell.crumb(t); return fn(host(shell.view), p, q); };
  const router = createRouter({ '/': page('Citas de hoy', today), '/taller': page('Tablero de taller', board), '/ot/:id': page('Orden de trabajo', otPage), '/agenda': page('Próximos días', agenda), '/vehiculos': page('Vehículos', vehicles) }, {
    notFound: () => { shell.view.innerHTML = '<div class="card empty">No encontrado</div>'; }, after: () => router.highlight(document.querySelector('.admin-sidebar')) });
  startPanel({ shell, router, db, auth });

  function today(v) {
    const list = db.query('appointments', a => a.date === ymd() && a.showroomId === sr()).sort((a, b) => a.slot.localeCompare(b.slot));
    const ots = db.query('workorders', o => o.showroomId === sr() && o.date === ymd());
    const load = workshopLoad(sr(), ymd()), now = new Date().toTimeString().slice(0, 5);
    v.innerHTML = `${pageHead(`Hoy en ${showroom(sr()).city}`, parseYmd(ymd()).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }), `<a class="btn" href="#/taller">${icon('kanban', 16)} Tablero</a>`)}
    <div class="grid-4">${statCard('Citas', list.filter(a => a.status !== 'cancelada').length, meter(load.pct, load.pct > 85 ? 'danger' : ''), 'calendar')}${statCard('Por recepcionar', list.filter(a => a.status === 'agendada').length, '', 'clipboard')}${statCard('En taller', ots.filter(o => !['lista', 'entregada'].includes(o.status)).length, '', 'wrench')}${statCard('Facturado hoy', money(ots.filter(o => o.status === 'entregada').reduce((a, o) => a + otTotal(o), 0)), `<span class="muted small">${money(ots.reduce((a, o) => a + (o.upsellItems || []).filter(x => x.status === 'aceptado').reduce((s, x) => s + x.price, 0), 0))} en adicionales</span>`, 'money')}</div>
    <div class="card"><div class="stack">${list.map(a => { const v2 = a.vehicleId && db.get('vehicles', a.vehicleId), rc = v2 ? recallsFor(v2) : []; return `<div class="appt-row ${a.status === 'agendada' && a.slot <= now ? 'now' : ''}"><span class="time">${a.slot}</span><div style="width:90px">${carSVG({ body: model(a.modelId)?.body || 'sedan', paint: v2?.hex || '#9aa0a6' })}</div><div class="who"><b class="mono">${patenteFormat(a.patente)}</b><small>${escape(a.modelName)} ${a.year || ''} · ${escape(a.owner)} · ${escape(a.phone || '')}</small><small>${escape(APPT_TYPES[a.type])}${a.planId ? ' · pauta ' + nf(db.get('servicePlans', a.planId)?.km) + ' km' : ''}${a.notes ? ' · ' + escape(a.notes) : ''}</small>${rc.length ? `<small style="color:var(--danger)">${icon('alert', 12)} Recall pendiente ${rc.map(r => r.code).join(', ')}</small>` : ''}</div>${apptBadge(a.status)}${a.status === 'agendada' ? `<button class="btn btn-primary btn-sm" data-recv="${a.id}">${icon('clipboard', 15)} Recepcionar</button><button class="btn btn-ghost btn-sm" data-cancel="${a.id}">No llegó</button>` : a.otId ? `<a class="btn btn-sm" href="#/ot/${a.otId}">${icon('wrench', 15)} Ver OT</a>` : ''}</div>`; }).join('') || '<div class="empty">Sin citas hoy.</div>'}</div></div>`;
    v.addEventListener('click', e => { const r = e.target.closest('[data-recv]'); if (r) receive(db.get('appointments', r.dataset.recv), ot => location.hash = '#/ot/' + ot.id); const c = e.target.closest('[data-cancel]'); if (c) { db.update('appointments', c.dataset.cancel, { status: 'cancelada' }); db.log('taller', 'Cliente no llegó a su cita', user.id); toast('Cita marcada como no asistida', 'info'); } });
  }
  function board(v) {
    const ots = db.query('workorders', o => o.showroomId === sr() && (o.status !== 'entregada' || o.date === ymd()));
    v.innerHTML = `${pageHead('Tablero de taller', `${showroom(sr()).bays} bahías · los cambios de estado los ve el cliente en línea`)}
    <div class="board">${OT_FLOW.map(s => { const l = ots.filter(o => o.status === s); return `<section class="kcol"><div class="kcol-head"><span>${APPT_STATUS[s][0]}</span><small>${l.length}</small></div>${l.map(o => { const d = o.checklist.filter(c => c.ok).length, pend = (o.upsellItems || []).filter(x => x.status === 'propuesto').length; return `<a class="ot-card" href="#/ot/${o.id}" style="text-decoration:none;color:inherit"><span class="plate">${patenteFormat(o.patente)}</span><span>${escape(o.modelName)} · ${escape(APPT_TYPES[o.type])}</span>${meter(d / Math.max(1, o.checklist.length) * 100)}<span class="row between small"><span>${d}/${o.checklist.length}</span><b>${money(otTotal(o))}</b></span>${pend ? `<span class="badge badge-warning">${pend} adicional por aprobar</span>` : ''}</a>`; }).join('')}</section>`; }).join('')}</div>`;
  }
  function otPage(v, { id }) {
    const ot = db.get('workorders', id); if (!ot) { v.innerHTML = '<div class="card empty">OT no encontrada</div>'; return; }
    v.innerHTML = `${pageHead('Orden ' + ot.number, escape(showroom(ot.showroomId).name), `<a class="btn btn-ghost" href="#/taller">${icon('back', 16)} Tablero</a>`)}${otPanelHTML(ot)}`;
    v.addEventListener('click', otAction); v.addEventListener('change', otChange); v.addEventListener('submit', otSubmit);
  }
  function agenda(v) {
    const days = Array.from({ length: 7 }, (_, i) => addDays(ymd(), i + 1));
    v.innerHTML = `${pageHead('Próximos días', 'Prepara repuestos y bahías con anticipación.')}${days.map(d => { const l = db.query('appointments', a => a.date === d && a.showroomId === sr() && a.status !== 'cancelada').sort((a, b) => a.slot.localeCompare(b.slot)), load = workshopLoad(sr(), d); return l.length ? `<div class="card"><div class="card-title"><h3>${parseYmd(d).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'short' })}</h3><span class="small">${l.length} citas · ${load.pct}% ${meter(load.pct)}</span></div><div class="table-wrap"><table class="table"><tbody>${l.map(a => `<tr><td class="mono">${a.slot}</td><td class="mono"><b>${patenteFormat(a.patente)}</b></td><td>${escape(a.modelName)}</td><td>${escape(a.owner)}</td><td>${escape(APPT_TYPES[a.type])}</td><td>${a.planId ? nf(db.get('servicePlans', a.planId)?.km) + ' km' : ''}</td></tr>`).join('')}</tbody></table></div></div>` : ''; }).join('') || '<div class="card empty">Sin citas próximas.</div>'}`;
  }
  function vehicles(v, _p, q) {
    v.innerHTML = `${pageHead('Vehículos y clientes', 'Busca por patente, VIN o nombre para ver historial, garantía, recalls y próxima mantención.')}<div class="card"><label class="search-box" style="max-width:none">${icon('search', 16)}<input class="input" type="search" placeholder="Patente, VIN o cliente" data-q aria-label="Buscar vehículo" value="${escape(q.q || '')}"></label></div><div class="stack" data-res></div>`;
    const res = v.querySelector('[data-res]');
    const run = t => { const s = t.trim().toLowerCase(); if (s.length < 2) { res.innerHTML = '<p class="muted">Escribe al menos 2 caracteres.</p>'; return; }
      const l = db.query('vehicles', x => patenteClean(x.patente).toLowerCase().includes(patenteClean(s).toLowerCase() || '§') || String(x.vin).toLowerCase().includes(s) || x.owner.toLowerCase().includes(s)).slice(0, 12);
      res.innerHTML = l.map(x => { const m = model(x.modelId), ns = nextService(x), w = warrantyFor(x), rc = recallsFor(x), hist = db.query('appointments', a => a.vehicleId === x.id).sort((a, b) => b.date.localeCompare(a.date)); return `<div class="card my-car"><div>${carSVG({ body: m?.body || 'sedan', paint: x.hex })}</div><div class="stack"><div><b class="mono">${patenteFormat(x.patente)}</b> · ${escape(brand(x.brandId)?.name)} ${escape(x.modelName)} ${x.year}<br><small class="muted">${escape(x.owner)} · ${escape(x.phone || '')} · VIN ${escape(x.vin)} · ${nf(x.km)} km</small></div>
        <div class="row small"><span class="badge badge-${ns.due ? 'warning' : 'success'}">Próx. ${nf(ns.nextKm)} km</span>${w ? `<span class="badge badge-${w.active ? 'success' : 'danger'}">Garantía ${w.active ? 'vigente' : 'vencida'}</span>` : ''}${rc.map(r => `<span class="badge badge-danger">Recall ${r.code}</span>`).join('')}</div>
        <div class="small">${hist.slice(0, 4).map(a => `<div class="line"><span>${fdate(a.date)} · ${escape(APPT_TYPES[a.type])}</span><span>${apptBadge(a.status)}</span></div>`).join('') || '<span class="muted">Sin historial de taller</span>'}</div></div></div>`; }).join('') || '<div class="card empty">Sin resultados.</div>'; };
    v.querySelector('[data-q]').oninput = e => run(e.target.value);
    run(q.q || db.find('vehicles', x => x.ownerId)?.patente || '');
  }
}
