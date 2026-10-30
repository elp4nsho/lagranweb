// Mantención: tickets con flujo abierto → asignado → en progreso → resuelto → cerrado, proveedores y costos (kanban o tabla).
import { escape, money, toast, ago, dateTime, modal } from '../../../assets/core/ui.js';
import { notify, unitName } from '../data/db.js';
import { TSTATUS, TFLOW, TCATS, PRIORITY, badge } from '../shared/format.js';
import { pageHead, crudTable, editForm, timeline, kpi } from '../shared/kit.js';

let mode = 'kanban';
export function ticketModal(t, ctx, done) {
  const { db, user } = ctx, admin = user.role === 'administrador';
  const idx = TFLOW.indexOf(t.status);
  const m = modal({ title: `#${t.number} · ${t.title}`, size: 'lg', body: `<div class="stack">
    <div class="row" style="gap:6px">${badge(TSTATUS, t.status)}${badge(PRIORITY, t.priority)}<span class="badge plain">${escape(t.category)}</span><span class="muted small">${t.unitId ? 'Depto ' + escape(unitName(t.unitId)) : 'Área común'} · ${escape(t.reporter)} · ${dateTime(t.createdAt)}</span></div>
    <p style="margin:0">${escape(t.description)}</p>
    ${admin ? `<div class="form-grid"><div class="field"><label for="tm-p">Proveedor</label><select class="select" id="tm-p"><option value="">— Sin asignar —</option>${db.query('providers', p => p.active).map(p => `<option value="${p.id}" ${p.id === t.providerId ? 'selected' : ''}>${escape(p.name)} (${escape(p.category)})</option>`).join('')}</select></div>
      <div class="field"><label for="tm-c">Costo (CLP)</label><input class="input" id="tm-c" type="number" min="0" value="${t.cost || 0}"></div>
      <div class="field"><label for="tm-pr">Prioridad</label><select class="select" id="tm-pr">${Object.entries(PRIORITY).map(([k, v]) => `<option value="${k}" ${k === t.priority ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div>
      <div class="field"><label for="tm-n">Comentario / nota</label><input class="input" id="tm-n" placeholder="Visita agendada el jueves…"></div></div>` : `<p class="small muted" style="margin:0">Proveedor: ${escape(db.get('providers', t.providerId)?.name || 'sin asignar')} · costo ${money(t.cost || 0)}</p>`}
    <div><h4 style="margin:0 0 8px">Historial</h4>${timeline(t.history.slice().reverse().map(h => ({ title: escape(TSTATUS[h.status]?.[0] || h.status), meta: `${dateTime(h.at)} · ${escape(h.by)}`, body: escape(h.note || '') })))}</div></div>`,
    foot: admin ? `${TFLOW[idx + 1] ? `<button class="btn btn-primary" data-adv="${TFLOW[idx + 1]}">Mover a «${TSTATUS[TFLOW[idx + 1]][0]}»</button>` : ''}<button class="btn" data-save>Guardar cambios</button><button class="btn btn-ghost" data-close>Cerrar</button>` : '<button class="btn btn-ghost" data-close>Cerrar</button>' });
  const apply = to => {
    const providerId = m.el.querySelector('#tm-p').value || null, cost = +m.el.querySelector('#tm-c').value || 0, priority = m.el.querySelector('#tm-pr').value, note = m.el.querySelector('#tm-n').value.trim();
    let status = to || t.status;
    if (!to && providerId && t.status === 'abierto') status = 'asignado';
    const pv = db.get('providers', providerId);
    const autoNote = status !== t.status ? (status === 'asignado' && pv ? `Asignado a ${pv.name}` : `Estado: ${TSTATUS[status][0]}`) : '';
    const history = (note || autoNote) ? [...t.history, { at: new Date().toISOString(), status, by: user.name, note: [autoNote, note].filter(Boolean).join(' · ') }] : t.history;
    db.update('tickets', t.id, { providerId, cost, priority, status, history });
    if (status !== t.status) {
      db.log('incidencia', `#${t.number} → ${TSTATUS[status][0]}`, user.id);
      if (t.unitId) notify(t.unitId, `Tu solicitud #${t.number} cambió a «${TSTATUS[status][0]}»${pv && status === 'asignado' ? ' · ' + pv.name : ''}`, '#/incidencias/' + t.id);
    }
    toast('Ticket actualizado', 'success'); m.close(); done && done();
  };
  m.el.querySelector('[data-save]')?.addEventListener('click', () => apply(null));
  m.el.querySelector('[data-adv]')?.addEventListener('click', e => apply(e.target.dataset.adv));
}

export function renderTickets(el, p, q, ctx) {
  const { db, user } = ctx;
  const ts = db.all('tickets');
  const open = ts.filter(t => !['resuelto', 'cerrado'].includes(t.status));
  const closed = ts.filter(t => t.status === 'cerrado' || t.status === 'resuelto');
  const avgH = closed.length ? closed.reduce((s, t) => { const r = t.history.find(h => h.status === 'resuelto'); return s + (r ? (new Date(r.at) - new Date(t.createdAt)) / 3600e3 : 0); }, 0) / closed.length : 0;
  el.innerHTML = `${pageHead('Mantención', 'Solicitudes de residentes y trabajos en áreas comunes', `<div class="seg"><button data-mode="kanban" class="${mode === 'kanban' ? 'active' : ''}">Tablero</button><button data-mode="tabla" class="${mode === 'tabla' ? 'active' : ''}">Tabla</button></div><button class="btn btn-primary" data-new>+ Nuevo ticket</button>`)}
    <div class="kpis">${kpi('Abiertos', open.length, `${open.filter(t => t.priority === 'urgente').length} urgentes`, false)}${kpi('Sin proveedor', ts.filter(t => t.status === 'abierto').length)}${kpi('Tiempo medio de resolución', `${Math.round(avgH / 24 * 10) / 10} días`)}${kpi('Costo últimos 90 días', money(ts.filter(t => Date.now() - new Date(t.createdAt) < 90 * 864e5).reduce((s, t) => s + (t.cost || 0), 0)))}</div>
    <div data-body></div>`;
  const body = el.querySelector('[data-body]');
  if (mode === 'kanban') {
    body.innerHTML = `<div class="kanban">${TFLOW.map(s => { const items = ts.filter(t => t.status === s).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); return `<div class="kcol"><h4><span>${TSTATUS[s][0]}</span><span class="badge plain">${items.length}</span></h4>${items.slice(0, s === 'cerrado' ? 6 : 30).map(t => `<button class="kcard" data-t="${t.id}"><span class="row between small"><b>#${t.number}</b>${badge(PRIORITY, t.priority)}</span><span style="font-size:14px;font-weight:600">${escape(t.title)}</span><span class="muted small">${t.unitId ? escape(unitName(t.unitId)) : 'Área común'} · ${ago(t.createdAt)}</span>${t.providerId ? `<span class="small">🔧 ${escape(db.get('providers', t.providerId)?.name || '')}</span>` : ''}</button>`).join('')}</div>`; }).join('')}</div>`;
  } else {
    crudTable(body, {
      rows: () => db.all('tickets').sort((a, b) => b.createdAt.localeCompare(a.createdAt)), search: t => `${t.number} ${t.title} ${t.reporter} ${unitName(t.unitId)}`,
      filters: [{ key: 'status', label: 'Estado', options: Object.entries(TSTATUS).map(([k, v]) => [k, v[0]]) }, { key: 'priority', label: 'Prioridad', options: Object.entries(PRIORITY).map(([k, v]) => [k, v[0]]) }, { key: 'category', label: 'Categoría', options: TCATS }],
      columns: [
        { key: 'number', label: 'N°', render: t => `#${t.number}` }, { key: 'title', label: 'Solicitud', render: t => `<b>${escape(t.title)}</b><br><span class="muted small">${escape(t.category)} · ${t.unitId ? escape(unitName(t.unitId)) : 'Área común'}</span>` },
        { key: 'priority', label: 'Prioridad', render: t => badge(PRIORITY, t.priority) }, { key: 'status', label: 'Estado', render: t => badge(TSTATUS, t.status) },
        { key: 'providerId', label: 'Proveedor', render: t => escape(db.get('providers', t.providerId)?.name || '—') }, { key: 'cost', label: 'Costo', render: t => t.cost ? money(t.cost) : '—' },
        { key: 'createdAt', label: 'Creado', render: t => `<span class="small">${ago(t.createdAt)}</span>` }
      ],
      onRow: t => ticketModal(db.get('tickets', t.id), ctx, () => ctx.refresh()),
      csv: { name: 'mantencion.csv', map: t => ({ numero: t.number, titulo: t.title, categoria: t.category, unidad: unitName(t.unitId), prioridad: t.priority, estado: t.status, proveedor: db.get('providers', t.providerId)?.name || '', costo: t.cost, creado: t.createdAt }) }
    });
  }
  el.addEventListener('click', e => { const k = e.target.closest('[data-t]'); if (k) ticketModal(db.get('tickets', k.dataset.t), ctx, () => ctx.refresh()); });
  el.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { mode = b.dataset.mode; ctx.refresh(); });
  el.querySelector('[data-new]').onclick = async () => {
    const r = await editForm({ title: 'Nuevo ticket de mantención', fields: [
      { name: 'title', label: 'Título', required: true, full: true }, { name: 'category', label: 'Categoría', type: 'select', options: TCATS },
      { name: 'unitId', label: 'Ubicación', type: 'select', options: [['', 'Área común'], ...db.all('units').map(u => [u.id, 'Depto ' + unitName(u.id)])] },
      { name: 'priority', label: 'Prioridad', type: 'select', options: Object.entries(PRIORITY).map(([k, v]) => [k, v[0]]), value: 'media' },
      { name: 'providerId', label: 'Proveedor', type: 'select', options: [['', '— Asignar después —'], ...db.all('providers').map(p => [p.id, p.name])] },
      { name: 'description', label: 'Descripción', type: 'textarea', full: true, required: true }] });
    if (!r) return;
    const number = Math.max(1200, ...db.all('tickets').map(t => t.number)) + 1, now = new Date().toISOString();
    const pv = db.get('providers', r.providerId);
    const history = [{ at: now, status: 'abierto', by: user.name, note: 'Creado por la administración' }];
    if (pv) history.push({ at: now, status: 'asignado', by: user.name, note: `Asignado a ${pv.name}` });
    db.insert('tickets', { ...r, unitId: r.unitId || null, providerId: r.providerId || null, number, scope: r.unitId ? 'unidad' : 'común', reporter: user.name, status: pv ? 'asignado' : 'abierto', cost: 0, history });
    db.log('incidencia', `${user.name} creó ticket #${number}: ${r.title}`, user.id); toast(`Ticket #${number} creado`, 'success'); ctx.refresh();
  };
}
