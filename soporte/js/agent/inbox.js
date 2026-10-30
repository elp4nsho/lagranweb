// Bandeja de tickets con vistas (mis tickets, sin asignar, urgentes, SLA en riesgo…), filtros,
// orden por urgencia de SLA, paginación y acciones masivas (asignarme, estado, fusionar).
import { db } from '../data/db.js';
import { escape, ago, toast, confirm, norm } from '../../../assets/core/ui.js';
import { STATUSES, PRIORITIES, status as statusOf, priority as prioOf, isOpen } from '../shared/constants.js';
import { can } from '../shared/perms.js';
import { pageHead } from '../shared/shell.js';
import { avatar, requester, catName, exportCSV, userName, groupName } from '../shared/util.js';
import { sla, slaBadge, updateTicket, mergeTickets } from '../shared/tickets.js';
import { opt } from '../shared/forms.js';
import { icon } from '../shared/icons.js';

export const VIEWS = [
  ['mios', 'Mis tickets', (t, u) => t.assigneeId === u.id && isOpen(t)],
  ['sin-asignar', 'Sin asignar', t => !t.assigneeId && isOpen(t)],
  ['urgentes', 'Urgentes', t => t.priority === 'urgente' && isOpen(t)],
  ['sla', 'SLA en riesgo', t => { const s = sla(t); return isOpen(t) && (s.risk || s.breached); }],
  ['abiertos', 'Todos abiertos', t => isOpen(t)],
  ['pendientes', 'Esperando cliente', t => t.status === 'pendiente'],
  ['resueltos', 'Resueltos', t => !isOpen(t)]
];
// Tickets que el agente puede ver: los de sus grupos o asignados a él (supervisión ve todo).
export const scope = u => db.query('tickets', t => !t.mergedInto && (can('tickets.all', u) || t.assigneeId === u.id || (u.groupIds || []).includes(t.groupId)));
export const viewCount = (u, key) => { const v = VIEWS.find(x => x[0] === key); return scope(u).filter(t => v[2](t, u)).length; };

const state = { group: '', prio: '', q: '', page: 0, sel: new Set(), sort: 'sla' };
const PAGE = 15;
const urgency = t => { const s = sla(t); return !isOpen(t) ? 1e9 + (Date.now() - new Date(t.updatedAt)) / 1000 : s.active ? s.left : 1e8; };

export function render(view, { user, query }) {
  const key = query.vista || (user.role === 'agente' ? 'mios' : 'abiertos');
  const v = VIEWS.find(x => x[0] === key) || VIEWS[0];
  if (state.key !== key) { state.key = key; state.page = 0; state.sel.clear(); }
  const all = scope(user);
  let rows = all.filter(t => v[2](t, user) && (!state.group || t.groupId === state.group) && (!state.prio || t.priority === state.prio) && (!state.q || norm(`${t.number} ${t.subject} ${requester(t)?.name || ''} ${requester(t)?.email || ''}`).includes(norm(state.q.replace(/^#/, '')))));
  rows.sort(state.sort === 'sla' ? (a, b) => urgency(a) - urgency(b) : state.sort === 'prio' ? (a, b) => prioOf(b.priority).w - prioOf(a.priority).w || urgency(a) - urgency(b) : (a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  state.page = Math.min(state.page, pages - 1);
  const slice = rows.slice(state.page * PAGE, state.page * PAGE + PAGE);
  const groups = db.all('groups');

  view.innerHTML = `
    ${pageHead('Tickets', `${escape(v[1])} · ${rows.length} ticket${rows.length === 1 ? '' : 's'}`, `<button class="btn" data-export>${icon('upload', 16)} CSV</button><button class="btn btn-primary" data-new>${icon('plus', 16)} Nuevo ticket</button>`)}
    <div class="view-chips row">${VIEWS.map(([k, l, fn]) => `<a class="chip ${k === key ? 'active' : ''}" href="#/?vista=${k}">${l} <small>${all.filter(t => fn(t, user)).length}</small></a>`).join('')}</div>
    <div class="card stack">
      <div class="row filters">
        <input class="input select-sm" type="search" placeholder="Buscar # o asunto o cliente…" value="${escape(state.q)}" data-q style="max-width:260px" aria-label="Buscar tickets">
        <select class="select select-sm" data-group aria-label="Grupo"><option value="">Todos los grupos</option>${groups.map(g => opt(g.id, g.name, state.group)).join('')}</select>
        <select class="select select-sm" data-prio aria-label="Prioridad"><option value="">Toda prioridad</option>${PRIORITIES.map(p => opt(p.id, p.name, state.prio)).join('')}</select>
        <select class="select select-sm" data-sort aria-label="Orden">${[['sla', 'Orden: vencimiento SLA'], ['prio', 'Orden: prioridad'], ['recent', 'Orden: actividad reciente']].map(([k, l]) => opt(k, l, state.sort)).join('')}</select>
      </div>
      <div class="bulk row" data-bulk ${state.sel.size ? '' : 'hidden'}>
        <b>${state.sel.size} seleccionado(s)</b>
        <button class="btn btn-sm" data-b="me">Asignarme</button>
        <select class="select select-sm" data-bstatus aria-label="Cambiar estado"><option value="">Cambiar estado…</option>${STATUSES.map(s => opt(s.id, s.name)).join('')}</select>
        ${can('tickets.merge') ? `<button class="btn btn-sm" data-b="merge" ${state.sel.size >= 2 ? '' : 'disabled'}>${icon('merge', 14)} Fusionar</button>` : ''}
        <button class="btn btn-sm btn-ghost" data-b="clear">Limpiar</button>
      </div>
      <div class="table-wrap"><table class="table inbox-table"><thead><tr><th><input type="checkbox" data-all aria-label="Seleccionar todos" ${slice.length && slice.every(t => state.sel.has(t.id)) ? 'checked' : ''}></th><th>Ticket</th><th>Estado</th><th>Prioridad</th><th>SLA</th><th>Asignado</th><th>Actualizado</th></tr></thead><tbody>
        ${slice.map(t => { const r = requester(t); return `<tr class="${t.status === 'nuevo' ? 'is-new' : ''}">
          <td><input type="checkbox" data-sel="${t.id}" ${state.sel.has(t.id) ? 'checked' : ''} aria-label="Seleccionar ticket ${t.number}"></td>
          <td class="tk-cell"><a href="#/ticket/${t.id}"><b>${escape(t.subject)}</b></a><small class="muted">#${t.number} · ${escape(r?.name || '—')} · ${escape(catName(t.categoryId))}${t.tags.length ? ' · ' + t.tags.map(x => `<span class="tag">${escape(x)}</span>`).join(' ') : ''}</small></td>
          <td><span class="badge badge-${statusOf(t.status).badge}">${statusOf(t.status).name}</span></td>
          <td><span class="badge badge-${prioOf(t.priority).badge} plain">${prioOf(t.priority).name}</span></td>
          <td>${slaBadge(t)}</td>
          <td>${avatar(db.get('users', t.assigneeId), 26)}</td>
          <td class="nowrap"><small>${ago(t.updatedAt)}</small></td></tr>`; }).join('') || `<tr><td colspan="7"><div class="empty">${icon('check', 30)}<br>¡Bandeja al día! No hay tickets en esta vista.</div></td></tr>`}
      </tbody></table></div>
      <div class="row between small muted"><span>${rows.length} registros</span><span class="row" style="gap:6px"><button class="btn btn-sm btn-ghost" data-p="-1" ${state.page ? '' : 'disabled'} aria-label="Página anterior">←</button>${state.page + 1} / ${pages}<button class="btn btn-sm btn-ghost" data-p="1" ${state.page < pages - 1 ? '' : 'disabled'} aria-label="Página siguiente">→</button></span></div>
    </div>`;
  const rerender = () => render(view, { user, query });
  const q = view.querySelector('[data-q]');
  q.oninput = () => { state.q = q.value; state.page = 0; const p = q.selectionStart; rerender(); const n = view.querySelector('[data-q]'); n.focus(); n.setSelectionRange(p, p); };
  view.querySelector('[data-group]').onchange = e => { state.group = e.target.value; rerender(); };
  view.querySelector('[data-prio]').onchange = e => { state.prio = e.target.value; rerender(); };
  view.querySelector('[data-sort]').onchange = e => { state.sort = e.target.value; rerender(); };
  view.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { state.page += +b.dataset.p; rerender(); });
  view.querySelectorAll('[data-sel]').forEach(c => c.onchange = () => { c.checked ? state.sel.add(c.dataset.sel) : state.sel.delete(c.dataset.sel); rerender(); });
  view.querySelector('[data-all]').onchange = e => { slice.forEach(t => e.target.checked ? state.sel.add(t.id) : state.sel.delete(t.id)); rerender(); };
  view.querySelector('[data-new]').onclick = () => import('./ticket.js').then(m => m.newTicketModal());
  view.querySelector('[data-export]').onclick = () => exportCSV('tickets.csv', rows.map(t => ({ numero: t.number, asunto: t.subject, cliente: requester(t)?.name || '', estado: statusOf(t.status).name, prioridad: prioOf(t.priority).name, grupo: groupName(t.groupId), asignado: userName(t.assigneeId), creado: t.createdAt, sla: sla(t).label })));
  const bulk = view.querySelector('[data-bulk]');
  bulk.addEventListener('click', async e => {
    const b = e.target.closest('[data-b]');
    if (!b) return;
    const ids = [...state.sel];
    if (b.dataset.b === 'clear') { state.sel.clear(); return rerender(); }
    if (b.dataset.b === 'me') { ids.forEach(id => updateTicket(id, { assigneeId: user.id, ...(db.get('tickets', id).status === 'nuevo' ? { status: 'abierto' } : {}) }, user.id)); toast(`${ids.length} ticket(s) asignados a ti`, 'success'); }
    if (b.dataset.b === 'merge') {
      const ts = ids.map(id => db.get('tickets', id)).sort((a, c) => a.createdAt.localeCompare(c.createdAt));
      const target = ts[0];
      if (!await confirm(`Se fusionarán ${ts.length - 1} ticket(s) en el #${target.number} (el más antiguo). Las conversaciones se unirán y los demás quedarán cerrados.`, { ok: 'Fusionar' })) return;
      ts.slice(1).forEach(t => mergeTickets(t.id, target.id, user.id));
      toast(`Fusionados en #${target.number}`, 'success');
    }
    state.sel.clear(); rerender();
  });
  bulk.querySelector('[data-bstatus]').onchange = e => { if (!e.target.value) return; [...state.sel].forEach(id => updateTicket(id, { status: e.target.value }, user.id)); toast(`Estado actualizado en ${state.sel.size} ticket(s)`, 'success'); state.sel.clear(); rerender(); };
}
