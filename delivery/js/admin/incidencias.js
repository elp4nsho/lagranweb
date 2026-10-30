// Incidencias y reclamos: tablero por estado, flujo (abierto → en revisión → resuelto/rechazado),
// asignación a soporte, notas y compensaciones.
import { db } from '../data/db.js';
import { html, raw, money, modal, formModal, toast, dateTime, ago, downloadCSV, escape } from '../../../assets/core/ui.js';
import { pageHead, kpi } from '../shared/shell.js';
import { INCIDENT_STATUS, INCIDENT_TYPES, PRIORITY, badgeOf } from '../shared/status.js';
import { avatar } from '../shared/views.js';
import * as ops from '../shared/ops.js';

const COLS = ['abierto', 'en_revision', 'resuelto', 'rechazado'];
const PB = { alta: 'danger', media: 'warning', baja: 'info' };

export function mountIncidencias(el, ctx) {
  const st = { q: '', type: '', prio: '' };
  el.innerHTML = html`${raw(pageHead('Incidencias', 'Reclamos de clientes y problemas operativos.', `<button class="btn" data-csv>⇩ CSV</button><button class="btn btn-primary" data-new>＋ Nueva incidencia</button>`))}
    <div class="kpis" data-k></div>
    <div class="filters card" style="padding:12px"><input class="input" type="search" placeholder="Buscar número, envío, cliente…" data-f="q" aria-label="Buscar">
      <select class="select" data-f="type" aria-label="Tipo"><option value="">Todos los tipos</option>${Object.entries(INCIDENT_TYPES).map(([k, v]) => raw(html`<option value="${k}">${v}</option>`))}</select>
      <select class="select" data-f="prio" aria-label="Prioridad"><option value="">Toda prioridad</option>${Object.entries(PRIORITY).map(([k, v]) => raw(html`<option value="${k}">${v}</option>`))}</select></div>
    <div class="kanban" data-board></div>`;
  const users = () => Object.fromEntries(db.all('users').map(u => [u.id, u]));
  const custs = () => Object.fromEntries(db.all('customers').map(c => [c.id, c.name]));
  const rows = () => { const cs = custs(); return db.all('incidents').map(i => ({ ...i, cust: cs[i.customerId] || 'Cliente ocasional' })).filter(i => (!st.type || i.type === st.type) && (!st.prio || i.priority === st.prio) && (!st.q || `${i.number} ${i.shipmentCode} ${i.cust} ${i.description}`.toLowerCase().includes(st.q.toLowerCase()))).sort((a, b) => ({ alta: 0, media: 1, baja: 2 }[a.priority] - { alta: 0, media: 1, baja: 2 }[b.priority]) || Date.parse(b.createdAt) - Date.parse(a.createdAt)); };
  let sig = '';
  const draw = (force) => {
    const r = rows(), us = users();
    const n = JSON.stringify(r.map(i => [i.id, i.status, i.priority, i.assigneeId, (i.notes || []).length])) + JSON.stringify(st);
    if (n === sig && !force) return; sig = n;
    const all = db.all('incidents');
    const res = all.filter(i => i.status === 'resuelto');
    el.querySelector('[data-k]').innerHTML = kpi('Abiertas', all.filter(i => i.status === 'abierto').length) + kpi('En revisión', all.filter(i => i.status === 'en_revision').length) + kpi('Prioridad alta', all.filter(i => i.priority === 'alta' && ['abierto', 'en_revision'].includes(i.status)).length) + kpi('Compensado', money(res.reduce((a, i) => a + (i.compensation || 0), 0)));
    el.querySelector('[data-board]').innerHTML = COLS.map(col => {
      const list = r.filter(i => i.status === col);
      return html`<section class="kanban-col"><header class="row between"><b>${INCIDENT_STATUS[col].label}</b><span class="badge badge-${INCIDENT_STATUS[col].badge}">${list.length}</span></header>
        <div class="kanban-list">${list.slice(0, 30).map(i => raw(html`<button class="kanban-card card" data-open="${i.id}"><div class="row between"><b class="mono small">${i.number}</b><span class="badge badge-${PB[i.priority]} plain">${PRIORITY[i.priority]}</span></div>
          <b class="small">${INCIDENT_TYPES[i.type]}</b><small class="muted">${i.cust} · ${i.shipmentCode}</small><small class="muted">${ago(i.createdAt)}</small>
          <div class="row between">${i.assigneeId && us[i.assigneeId] ? raw(html`<span class="row small" style="gap:6px">${avatar(us[i.assigneeId].name, us[i.assigneeId].color, 22)}${us[i.assigneeId].name.split(' ')[0]}</span>`) : raw('<small class="muted">Sin asignar</small>')}${(i.notes || []).length ? raw(html`<small class="muted">💬 ${i.notes.length}</small>`) : ''}</div></button>`)) || raw('<div class="empty-inline">—</div>')}</div></section>`;
    }).join('');
  };
  el.querySelectorAll('[data-f]').forEach(i => i.addEventListener('input', () => { st[i.dataset.f] = i.value; draw(true); }));
  el.addEventListener('click', async e => {
    const o = e.target.closest('[data-open]'); if (o) { openIncident(o.dataset.open, ctx); return; }
    if (e.target.closest('[data-new]')) newIncident(ctx);
    if (e.target.closest('[data-csv]')) downloadCSV('incidencias-rayo.csv', rows().map(i => ({ numero: i.number, envio: i.shipmentCode, cliente: i.cust, tipo: INCIDENT_TYPES[i.type], prioridad: PRIORITY[i.priority], estado: INCIDENT_STATUS[i.status].label, creada: dateTime(i.createdAt), compensacion: i.compensation || 0 })));
  });
  draw();
  return { refresh: () => draw() };
}

async function newIncident(ctx) {
  const v = await formModal({ title: 'Nueva incidencia', fields: [
    { name: 'code', label: 'Código de envío', required: true, placeholder: 'RX-12345' },
    { name: 'type', label: 'Tipo', type: 'select', options: Object.entries(INCIDENT_TYPES) },
    { name: 'priority', label: 'Prioridad', type: 'select', options: Object.entries(PRIORITY), value: 'media' },
    { name: 'description', label: 'Descripción', type: 'textarea', required: true }] });
  if (!v) return;
  const s = ops.findByCode(v.code);
  if (!s) { toast('No existe ese código de envío', 'error'); return; }
  const n = 'INC-' + (1100 + db.count('incidents'));
  db.insert('incidents', { number: n, shipmentCode: s.code, customerId: s.customerId, courierId: s.courierId, type: v.type, priority: v.priority, status: 'abierto', description: v.description, assigneeId: null, compensation: 0, notes: [] });
  db.log('incidencia', `${n} creada en ${s.code}`, ctx.user.id);
  toast(`Incidencia ${n} creada`, 'success');
}

export function openIncident(id, ctx) {
  const m = modal({ title: 'Incidencia', size: 'lg', body: '<div data-b></div>', onClose: () => unsub() });
  const box = m.el.querySelector('[data-b]');
  const edit = ctx.can('incidencias.edit');
  let sig = '';
  const draw = () => {
    const i = db.get('incidents', id); if (!i) { m.close(); return; }
    const n = JSON.stringify(i); if (n === sig) return; sig = n;
    const us = Object.fromEntries(db.all('users').map(u => [u.id, u]));
    const cust = db.get('customers', i.customerId), cour = db.get('couriers', i.courierId), s = ops.findByCode(i.shipmentCode);
    const sup = db.query('users', u => ['soporte', 'admin'].includes(u.role) && u.active !== false);
    m.el.querySelector('.modal-head h3').textContent = `${i.number} · ${INCIDENT_TYPES[i.type]}`;
    box.innerHTML = html`<div class="stack">
      <div class="row">${raw(badgeOf(INCIDENT_STATUS, i.status))}<span class="badge badge-${PB[i.priority]}">Prioridad ${PRIORITY[i.priority]}</span><span class="muted small">Abierta ${dateTime(i.createdAt)}${i.contact ? ' · contacto ' + i.contact : ''}</span></div>
      ${edit ? raw(html`<div class="row action-bar">
        ${i.status === 'abierto' ? raw('<button class="btn btn-sm btn-primary" data-a="take">Tomar caso</button>') : ''}
        ${['abierto', 'en_revision'].includes(i.status) ? raw('<button class="btn btn-sm btn-accent" data-a="resolve">Resolver</button><button class="btn btn-sm btn-danger" data-a="reject">Rechazar</button>') : raw('<button class="btn btn-sm" data-a="reopen">Reabrir</button>')}
        <select class="select select-sm" data-assign aria-label="Asignar a"><option value="">Sin asignar</option>${sup.map(u => raw(html`<option value="${u.id}" ${u.id === i.assigneeId ? 'selected' : ''}>${u.name}</option>`))}</select>
        <select class="select select-sm" data-prio aria-label="Prioridad">${Object.entries(PRIORITY).map(([k, v]) => raw(html`<option value="${k}" ${k === i.priority ? 'selected' : ''}>${v}</option>`))}</select></div>`) : raw('<div class="notice small">Tu rol puede ver incidencias, pero solo Soporte y Administración las gestionan.</div>')}
      <div class="detail-grid"><div class="stack"><div><b>Descripción</b><p style="margin:4px 0">${i.description}</p></div>
        <dl class="kv"><dt>Cliente</dt><dd>${cust ? cust.name : 'Ocasional'}</dd><dt>Envío</dt><dd>${s ? raw(html`<a href="#" data-ship="${s.id}" class="mono">${s.code}</a>`) : i.shipmentCode}</dd><dt>Repartidor</dt><dd>${cour?.name || '—'}</dd><dt>Compensación</dt><dd>${i.compensation ? money(i.compensation) : '—'}</dd></dl></div>
      <div class="stack"><b>Conversación y notas</b><div class="chat-log mini">${(i.notes || []).map(x => raw(html`<div class="msg ${x.internal ? 'sys' : us[x.by]?.role === 'cliente' ? 'them' : 'me'}"><small>${us[x.by]?.name || 'Sistema'}${x.internal ? ' · nota interna' : ''} · ${dateTime(x.at)}</small><p>${x.text}</p></div>`)) || raw('<div class="msg sys">Sin notas</div>')}</div>
        ${edit ? raw('<form class="stack" data-note style="gap:6px"><textarea class="textarea" name="t" placeholder="Responder al cliente o agregar nota…" style="min-height:64px"></textarea><div class="row between"><label class="check small"><input type="checkbox" name="internal"> Nota interna (no la ve el cliente)</label><button class="btn btn-sm btn-primary">Agregar</button></div></form>') : ''}</div></div></div>`;
  };
  const L = (t) => db.log('incidencia', `${db.get('incidents', id).number}: ${t}`, ctx.user.id);
  const note = (text, internal = true) => db.update('incidents', id, x => ({ notes: [...(x.notes || []), { by: ctx.user.id, text, at: ops.nowIso(), internal }] }));
  box.addEventListener('change', e => {
    if (e.target.matches('[data-assign]')) { db.update('incidents', id, { assigneeId: e.target.value || null }); L('asignada'); toast('Asignación actualizada', 'success'); }
    if (e.target.matches('[data-prio]')) { db.update('incidents', id, { priority: e.target.value }); L('prioridad ' + e.target.value); }
  });
  box.addEventListener('submit', e => { e.preventDefault(); const f = e.target.elements; if (!f.t.value.trim()) return; note(f.t.value.trim(), f.internal.checked); L('nota agregada'); });
  box.addEventListener('click', async e => {
    const sh = e.target.closest('[data-ship]'); if (sh) { e.preventDefault(); ctx.open(sh.dataset.ship); return; }
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    const i = db.get('incidents', id);
    if (a === 'take') { db.update('incidents', id, { status: 'en_revision', assigneeId: i.assigneeId || ctx.user.id }); note(`${ctx.user.name} tomó el caso.`); L('en revisión'); }
    if (a === 'resolve') {
      const s = ops.findByCode(i.shipmentCode);
      const v = await formModal({ title: 'Resolver incidencia', fields: [{ name: 'comp', label: 'Compensación (nota de crédito, CLP)', type: 'number', value: s && ['retraso', 'dano', 'extravio'].includes(i.type) ? Math.round(s.price * .5 / 10) * 10 : 0 }, { name: 'msg', label: 'Mensaje al cliente', type: 'textarea', required: true, value: 'Lamentamos lo ocurrido. Resolvimos tu caso y aplicamos una compensación.' }], submit: 'Resolver' });
      if (!v) return;
      db.update('incidents', id, { status: 'resuelto', compensation: v.comp || 0, resolvedAt: ops.nowIso() }); note(v.msg, false); L(`resuelta (compensación ${money(v.comp || 0)})`); toast('Incidencia resuelta', 'success');
    }
    if (a === 'reject') {
      const v = await formModal({ title: 'Rechazar incidencia', fields: [{ name: 'msg', label: 'Motivo (se informa al cliente)', type: 'textarea', required: true }], submit: 'Rechazar' });
      if (!v) return;
      db.update('incidents', id, { status: 'rechazado', resolvedAt: ops.nowIso() }); note(v.msg, false); L('rechazada'); toast('Incidencia rechazada', 'success');
    }
    if (a === 'reopen') { db.update('incidents', id, { status: 'en_revision' }); note('Caso reabierto.'); L('reabierta'); }
  });
  const unsub = db.subscribe(() => draw());
  draw();
}
