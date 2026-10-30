// Órdenes de trabajo de mantención (manuales o generadas desde alarmas).
import { db, userName } from '../data/db.js';
import { date, toast, formModal, confirm, modal } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { pageHead, table, csv, selectFilter, woBadge, prioBadge, devName } from '../shared/common.js';

const st = { status: 'pendientes', priority: '', mine: false };

export function render(el, ctx) {
  const write = ctx.can('app.ordenes');
  const all = db.all('orders');
  const today = new Date().toISOString().slice(0, 10);
  const rows = all.filter(o => (st.status === 'pendientes' ? o.status !== 'completada' : !st.status || o.status === st.status) && (!st.priority || o.priority === st.priority) && (!st.mine || o.assignee === ctx.user.id))
    .sort((a, b) => a.due.localeCompare(b.due)).map(o => ({ ...o, dev: devName(o.deviceId), owner: userName(o.assignee), late: o.status !== 'completada' && o.due < today }));
  el.innerHTML = pageHead('Órdenes de trabajo', `${all.filter(o => o.status !== 'completada').length} pendientes · ${all.filter(o => o.status !== 'completada' && o.due < today).length} atrasadas`, `<button class="btn btn-sm" data-csv>⬇ CSV</button>${write ? '<button class="btn btn-sm btn-primary" data-new>+ Nueva OT</button>' : ''}`, !write) +
    `<div class="kpis">${['abierta', 'en curso', 'completada'].map(s => `<div class="card"><div class="stat"><span class="label">${s[0].toUpperCase() + s.slice(1)}</span><span class="value">${all.filter(o => o.status === s).length}</span></div></div>`).join('')}</div>
    <div class="card filters"><div class="field"><label for="os">Estado</label><select class="select" id="os">${[['pendientes', 'Pendientes'], ['', 'Todas'], ['abierta', 'Abierta'], ['en curso', 'En curso'], ['completada', 'Completada']].map(([v, l]) => `<option value="${v}" ${st.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>${selectFilter('op', 'Prioridad', ['alta', 'media', 'baja'], st.priority, 'Todas')}<label class="check"><input type="checkbox" id="om" ${st.mine ? 'checked' : ''}> Solo asignadas a mí</label></div><div data-t></div>`;
  table(el.querySelector('[data-t]'), {
    rows, search: o => `${o.code} ${o.title} ${o.dev} ${o.owner}`,
    columns: [
      { key: 'code', label: 'OT', render: o => h`<b class="mono">${o.code}</b>${o.alarmId ? raw('<br><span class="small muted">desde alarma</span>') : ''}` },
      { key: 'title', label: 'Trabajo', render: o => h`<b>${o.title}</b><br><span class="small muted">${o.dev}</span>` },
      { key: 'priority', label: 'Prioridad', render: o => raw(prioBadge(o.priority)) },
      { key: 'owner', label: 'Responsable' },
      { key: 'due', label: 'Vence', render: o => h`${date(o.due)}${o.late ? raw(' <span class="badge badge-danger">atrasada</span>') : ''}` },
      { key: 'progress', label: 'Avance', sort: false, render: o => { const p = Math.round(o.checklist.filter(c => c.done).length / Math.max(1, o.checklist.length) * 100); return raw(`<div class="progress" style="min-width:70px" title="${p}%"><i style="--v:${p}%"></i></div>`); } },
      { key: 'status', label: 'Estado', render: o => raw(woBadge(o.status)) },
    ],
    onRow: o => open(o.id, ctx, write),
  });
  el.querySelector('#os').onchange = e => { st.status = e.target.value; ctx.refresh(); };
  el.querySelector('#op').onchange = e => { st.priority = e.target.value; ctx.refresh(); };
  el.querySelector('#om').onchange = e => { st.mine = e.target.checked; ctx.refresh(); };
  el.querySelector('[data-csv]').onclick = () => csv('ordenes-sentinela.csv', rows.map(o => ({ ot: o.code, trabajo: o.title, dispositivo: o.dev, prioridad: o.priority, responsable: o.owner, vence: o.due, estado: o.status })));
  el.querySelector('[data-new]')?.addEventListener('click', () => edit(null, ctx));
}

const people = () => db.query('users', u => u.active !== false && u.role !== 'lectura').map(u => [u.id, u.name]);
async function edit(o, ctx) {
  const v = await formModal({ title: o ? `Editar ${o.code}` : 'Nueva orden de trabajo', fields: [
    { name: 'title', label: 'Trabajo', required: true, value: o?.title }, { name: 'deviceId', label: 'Dispositivo', type: 'select', options: db.all('devices').map(d => [d.id, d.name]), value: o?.deviceId },
    { name: 'priority', label: 'Prioridad', type: 'select', options: ['alta', 'media', 'baja'], value: o?.priority || 'media' }, { name: 'assignee', label: 'Responsable', type: 'select', options: people(), value: o?.assignee },
    { name: 'due', label: 'Fecha límite', type: 'date', required: true, value: o?.due || new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10) }, { name: 'notes', label: 'Notas', type: 'textarea', value: o?.notes }] });
  if (!v) return;
  if (o) { db.update('orders', o.id, v); db.log('orden', `${ctx.user.name} editó ${o.code}`, ctx.user.id); }
  else { const n = db.insert('orders', { code: `OT-${1500 + db.count('orders')}`, ...v, alarmId: null, status: 'abierta', checklist: [{ text: 'Bloqueo y etiquetado (LOTO)', done: false }, { text: 'Ejecutar trabajo', done: false }, { text: 'Prueba de funcionamiento', done: false }] }); db.log('orden', `${ctx.user.name} creó ${n.code}: ${v.title}`, ctx.user.id); }
  toast('Orden guardada', 'success');
}

function open(id, ctx, write) {
  const o = db.get('orders', id);
  const al = o.alarmId ? db.get('alarms', o.alarmId) : null;
  const m = modal({ title: `${o.code} · ${o.title}`, size: 'lg',
    body: h`<div class="stack"><div class="row">${raw(woBadge(o.status))}${raw(prioBadge(o.priority))}<span class="small muted">vence ${date(o.due)}</span></div>
      <dl class="kv"><dt>Dispositivo</dt><dd><a href="#/dispositivos/${o.deviceId}" data-close>${devName(o.deviceId)}</a></dd><dt>Responsable</dt><dd>${userName(o.assignee)}</dd>${al ? raw(h`<dt>Alarma</dt><dd><a href="#/alarmas/${al.id}" data-close>${al.code} · ${al.ruleName}</a></dd>`) : ''}<dt>Notas</dt><dd>${o.notes || '—'}</dd></dl>
      <b>Checklist</b>${o.checklist.map((c, i) => h`<label class="check-item"><input type="checkbox" data-ck="${i}" ${c.done ? 'checked' : ''} ${write ? '' : 'disabled'}> ${c.text}</label>`)}
      ${write ? raw('<div class="row"><input class="input" id="nck" placeholder="Agregar tarea al checklist" style="flex:1;min-width:160px"><button class="btn btn-sm" data-addck>Agregar</button></div>') : ''}</div>`,
    foot: write ? `<button class="btn btn-ghost btn-danger" data-del>Eliminar</button><button class="btn btn-ghost" data-edit>Editar</button>${o.status === 'abierta' ? '<button class="btn" data-st="en curso">Iniciar</button>' : ''}${o.status !== 'completada' ? '<button class="btn btn-primary" data-st="completada">Completar</button>' : '<button class="btn" data-st="en curso">Reabrir</button>'}` : '<button class="btn" data-close>Cerrar</button>' });
  if (!write) return;
  m.el.querySelectorAll('[data-ck]').forEach(c => c.onchange = () => { const list = o.checklist.map((x, i) => i === +c.dataset.ck ? { ...x, done: c.checked } : x); o.checklist = list; db.update('orders', o.id, { checklist: list, status: o.status === 'abierta' && c.checked ? 'en curso' : o.status }); });
  m.el.querySelector('[data-addck]').onclick = () => { const t = m.el.querySelector('#nck').value.trim(); if (!t) return; m.close(); db.update('orders', o.id, { checklist: [...o.checklist, { text: t, done: false }] }); open(id, ctx, write); };
  m.el.querySelectorAll('[data-st]').forEach(b => b.onclick = () => {
    m.close();
    const s = b.dataset.st;
    db.update('orders', o.id, { status: s, ...(s === 'completada' ? { completedAt: new Date().toISOString(), checklist: o.checklist.map(c => ({ ...c, done: true })) } : {}) });
    if (s === 'completada' && al && al.status !== 'resuelta') db.update('alarms', al.id, { status: 'resuelta', resolvedAt: new Date().toISOString(), comments: [...(al.comments || []), { by: ctx.user.id, at: new Date().toISOString(), text: `Resuelta al completar ${o.code}.` }] });
    db.log('orden', `${ctx.user.name} cambió ${o.code} a "${s}"`, ctx.user.id);
    toast(`${o.code}: ${s}`, 'success');
  });
  m.el.querySelector('[data-edit]').onclick = () => { m.close(); edit(o, ctx); };
  m.el.querySelector('[data-del]').onclick = async () => { m.close(); if (await confirm(`¿Eliminar ${o.code}?`, { title: 'Eliminar OT', ok: 'Eliminar', danger: true })) { db.remove('orders', o.id); db.log('orden', `${ctx.user.name} eliminó ${o.code}`, ctx.user.id); toast('OT eliminada', 'info'); } };
}
