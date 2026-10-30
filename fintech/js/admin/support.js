// Casos de soporte: bandeja con filtros y conversación con el cliente.
import { db, userName, STAFF } from '../data/db.js';
import { ago, dateTime, toast } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { badge, notify } from '../shared/bank.js';
import { pageHead, table, csv, selectFilter } from './kit.js';

const st = { status: 'activos', priority: '', category: '' };
const STATUSES = ['abierto', 'en curso', 'esperando cliente', 'resuelto'];

export function render(el, ctx) {
  if (ctx.params.id) return detail(el, ctx);
  const all = db.all('tickets').map(t => ({ ...t, customer: userName(t.userId), owner: t.assignee ? userName(t.assignee) : '—', last: t.updatedAt || t.createdAt }));
  const rows = all.filter(t => (st.status === 'activos' ? t.status !== 'resuelto' : !st.status || t.status === st.status) && (!st.priority || t.priority === st.priority) && (!st.category || t.category === st.category)).sort((a, b) => b.last.localeCompare(a.last));
  el.innerHTML = pageHead('Soporte', `${all.filter(t => t.status !== 'resuelto').length} casos activos`, '<button class="btn btn-sm" data-csv>⬇ CSV</button>', !ctx.canWrite) +
    `<div class="kpis">${STATUSES.map(s => `<div class="card"><div class="stat"><span class="label">${s[0].toUpperCase() + s.slice(1)}</span><span class="value">${all.filter(t => t.status === s).length}</span></div></div>`).join('')}</div>
    <div class="card filters"><div class="field"><label for="ss">Estado</label><select class="select" id="ss">${[['activos', 'Activos'], ['', 'Todos'], ...STATUSES.map(s => [s, s])].map(([v, l]) => `<option value="${v}" ${st.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    ${selectFilter('sp', 'Prioridad', ['alta', 'media', 'baja'], st.priority)}${selectFilter('sc', 'Tema', [...new Set(all.map(t => t.category))], st.category)}</div><div data-t></div>`;
  table(el.querySelector('[data-t]'), {
    rows, search: t => `${t.code} ${t.subject} ${t.customer}`,
    columns: [
      { key: 'code', label: 'Caso', render: t => h`<b class="mono">${t.code}</b>` },
      { key: 'subject', label: 'Asunto', render: t => h`<b>${t.subject}</b><br><span class="small muted">${t.customer} · ${t.category}</span>` },
      { key: 'priority', label: 'Prioridad', render: t => raw(badge(t.priority)) },
      { key: 'status', label: 'Estado', render: t => raw(badge(t.status)) },
      { key: 'owner', label: 'Asignado' },
      { key: 'last', label: 'Actividad', render: t => ago(t.last) },
    ],
    onRow: t => ctx.go('/soporte/' + t.id),
  });
  [['#ss', 'status'], ['#sp', 'priority'], ['#sc', 'category']].forEach(([s, k]) => el.querySelector(s).onchange = e => { st[k] = e.target.value; render(el, ctx); });
  el.querySelector('[data-csv]').onclick = () => csv('soporte-condor.csv', rows.map(t => ({ caso: t.code, asunto: t.subject, cliente: t.customer, tema: t.category, prioridad: t.priority, estado: t.status, asignado: t.owner, creado: t.createdAt })));
}

function detail(el, { params, user: staff, canWrite }) {
  const t = db.get('tickets', params.id);
  if (!t) { el.innerHTML = '<div class="empty">Caso no encontrado. <a href="#/soporte">Volver</a></div>'; return; }
  const agents = db.query('users', u => ['admin', 'ejecutivo'].includes(u.role) && u.active !== false);
  const u = db.get('users', t.userId);
  el.innerHTML = h`<div class="page-head"><div><a href="#/soporte" class="small">← Soporte</a><h1>${t.code} · ${t.subject}</h1><p class="muted" style="margin:4px 0 0">${t.category} · abierto ${ago(t.createdAt)}</p></div><div class="row">${raw(badge(t.priority))}${raw(badge(t.status))}</div></div>
  <div class="grid-2" style="align-items:start;grid-template-columns:minmax(0,2fr) minmax(0,1fr)">
    <section class="card stack"><div class="thread" style="max-height:480px">${t.messages.map(m => h`<div class="msg ${m.from === 'staff' ? 'me' : ''}">${m.text}<small>${m.from === 'staff' ? userName(m.by) + ' (Cóndor Pay)' : userName(m.by)} · ${dateTime(m.at)}</small></div>`)}</div>
      ${canWrite ? raw('<div class="field"><label for="rp">Respuesta al cliente</label><textarea class="textarea" id="rp" placeholder="Escribe tu respuesta…"></textarea></div><div class="row"><button class="btn btn-primary" data-send="esperando cliente">Responder y esperar cliente</button><button class="btn" data-send="resuelto">Responder y resolver</button></div>') : raw('<span class="badge badge-warning">Solo lectura</span>')}</section>
    <section class="card stack"><h3 style="margin:0">Detalles</h3>
      <dl class="kv"><dt>Cliente</dt><dd><a href="#/cuentas/${u?.id}">${u?.name}</a></dd><dt>RUT</dt><dd>${u?.rut}</dd><dt>Correo</dt><dd>${u?.email}</dd></dl>
      <div class="field"><label for="ts">Estado</label><select class="select" id="ts" ${canWrite ? '' : 'disabled'}>${STATUSES.map(s => h`<option ${t.status === s ? 'selected' : ''}>${s}</option>`)}</select></div>
      <div class="field"><label for="tp">Prioridad</label><select class="select" id="tp" ${canWrite ? '' : 'disabled'}>${['alta', 'media', 'baja'].map(s => h`<option ${t.priority === s ? 'selected' : ''}>${s}</option>`)}</select></div>
      <div class="field"><label for="ta">Asignado a</label><select class="select" id="ta" ${canWrite ? '' : 'disabled'}><option value="">Sin asignar</option>${agents.map(a => h`<option value="${a.id}" ${t.assignee === a.id ? 'selected' : ''}>${a.name}</option>`)}</select></div>
    </section>
  </div>`;
  if (!canWrite) return;
  const upd = (patch, msg) => { db.update('tickets', t.id, patch); db.log('soporte', `${staff.name}: ${msg} en ${t.code}`, staff.id); toast('Caso actualizado', 'success'); };
  el.querySelector('#ts').onchange = e => upd({ status: e.target.value }, `estado → ${e.target.value}`);
  el.querySelector('#tp').onchange = e => upd({ priority: e.target.value }, `prioridad → ${e.target.value}`);
  el.querySelector('#ta').onchange = e => upd({ assignee: e.target.value || null }, `asignado a ${e.target.value ? userName(e.target.value) : 'nadie'}`);
  el.querySelectorAll('[data-send]').forEach(b => b.onclick = () => {
    const text = el.querySelector('#rp').value.trim();
    if (!text) return toast('Escribe una respuesta', 'warning');
    db.update('tickets', t.id, x => ({ messages: [...x.messages, { from: 'staff', by: staff.id, text, at: new Date().toISOString() }], status: b.dataset.send, assignee: x.assignee || staff.id }));
    notify(t.userId, `Respuesta a tu caso ${t.code}`, text.slice(0, 120), 'soporte');
    db.log('soporte', `${staff.name} respondió el caso ${t.code}`, staff.id);
    toast('Respuesta enviada al cliente', 'success');
  });
  void STAFF;
}
