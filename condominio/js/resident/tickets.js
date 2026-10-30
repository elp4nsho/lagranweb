// Incidencias / solicitudes de mantención del residente con seguimiento de estado.
import { escape, toast, dateTime, ago } from '../../../assets/core/ui.js';
import { TSTATUS, TFLOW, TCATS, PRIORITY, badge } from '../shared/format.js';
import { pageHead, editForm, timeline } from '../shared/kit.js';

export function renderTickets(el, { sub }, query, ctx, { unit }) {
  const { db, user } = ctx;
  const mine = db.query('tickets', t => t.unitId === unit.id || t.reporterId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (sub) {
    const t = db.get('tickets', sub);
    if (!t || !mine.includes(t) && t.unitId !== unit.id) { el.innerHTML = '<div class="card empty">Solicitud no encontrada.</div>'; return; }
    const pv = db.get('providers', t.providerId);
    const idx = TFLOW.indexOf(t.status);
    el.innerHTML = `${pageHead(`#${t.number} · ${t.title}`, `${escape(t.category)} · creada ${dateTime(t.createdAt)}`, '<a class="btn btn-ghost" href="#/incidencias">← Volver</a>')}
      <div class="card"><div class="wf">${TFLOW.map((s, i) => `${i ? '<span class="arrow">→</span>' : ''}<span class="step-pill ${i <= idx ? 'on' : ''}">${TSTATUS[s][0]}</span>`).join('')}</div></div>
      <div class="split"><div class="card"><h3>Seguimiento</h3>${timeline(t.history.slice().reverse().map(h => ({ title: `${escape(TSTATUS[h.status]?.[0] || h.status)}`, meta: `${dateTime(h.at)} · ${escape(h.by)}`, body: escape(h.note || '') })))}
        <form class="row" data-c style="margin-top:14px;flex-wrap:nowrap"><input class="input" name="c" placeholder="Agregar un comentario…" aria-label="Comentario"><button class="btn btn-primary">Enviar</button></form></div>
        <div class="stack"><div class="card"><h3>Detalle</h3><p>${escape(t.description)}</p><div class="row" style="gap:6px">${badge(PRIORITY, t.priority)}${badge(TSTATUS, t.status)}</div></div>
        ${pv ? `<div class="card"><h3>Proveedor asignado</h3><b>${escape(pv.name)}</b><div class="muted small">${escape(pv.service)} · ${escape(pv.phone)}</div></div>` : ''}
        ${t.status === 'resuelto' ? '<div class="card"><h3>¿Quedó resuelto?</h3><div class="row"><button class="btn btn-primary" data-ok>Sí, cerrar solicitud</button><button class="btn" data-reopen>No, reabrir</button></div></div>' : ''}</div></div>`;
    const push = (status, note, msg) => { db.update('tickets', t.id, { status, history: [...t.history, { at: new Date().toISOString(), status, by: user.name, note }] }); db.log('incidencia', `#${t.number}: ${note}`, user.id); toast(msg, 'success'); ctx.refresh(); };
    el.querySelector('[data-c]').addEventListener('submit', e => { e.preventDefault(); const c = e.target.c.value.trim(); if (c) push(t.status, c, 'Comentario enviado'); });
    el.querySelector('[data-ok]')?.addEventListener('click', () => push('cerrado', 'Cerrado con conformidad del residente', 'Solicitud cerrada'));
    el.querySelector('[data-reopen]')?.addEventListener('click', () => push('abierto', 'Reabierta por el residente: el problema persiste', 'Solicitud reabierta'));
    return;
  }
  el.innerHTML = `${pageHead('Incidencias y mantención', 'Reporta problemas en tu depto o en áreas comunes y sigue su estado', '<button class="btn btn-primary" data-new>+ Reportar incidencia</button>')}
    <div class="card">${mine.length ? mine.map(t => `<a class="list-row" href="#/incidencias/${t.id}" style="color:var(--text);text-decoration:none"><span><b>#${t.number} · ${escape(t.title)}</b><br><span class="muted small">${escape(t.category)} · ${ago(t.createdAt)} · ${t.history.length} actualizaciones</span></span><span class="row" style="gap:6px">${badge(PRIORITY, t.priority)}${badge(TSTATUS, t.status)}</span></a>`).join('') : '<p class="empty">No has reportado incidencias.</p>'}</div>`;
  const create = async () => {
    const r = await editForm({ title: 'Reportar incidencia', fields: [
      { name: 'title', label: 'Título', required: true, full: true, placeholder: 'Ej: Filtración en techo del baño' },
      { name: 'category', label: 'Categoría', type: 'select', options: TCATS }, { name: 'scope', label: 'Ubicación', type: 'select', options: [['unidad', 'Mi departamento'], ['común', 'Área común']] },
      { name: 'priority', label: 'Urgencia', type: 'select', options: Object.entries(PRIORITY).map(([k, v]) => [k, v[0]]), value: 'media' },
      { name: 'description', label: 'Descripción', type: 'textarea', full: true, required: true }] });
    if (!r) return;
    const number = Math.max(1200, ...db.all('tickets').map(t => t.number)) + 1;
    const t = db.insert('tickets', { ...r, number, unitId: unit.id, reporter: user.name, reporterId: user.id, status: 'abierto', providerId: null, cost: 0, history: [{ at: new Date().toISOString(), status: 'abierto', by: user.name, note: 'Solicitud creada desde la app' }] });
    db.log('incidencia', `Nueva solicitud #${number}: ${r.title} (${unit.tower}-${unit.number})`, user.id);
    toast(`Solicitud #${number} creada`, 'success'); ctx.go('/incidencias/' + t.id);
  };
  el.querySelector('[data-new]').onclick = create;
  if (query.nueva) { history.replaceState(null, '', '#/incidencias'); create(); }
}
