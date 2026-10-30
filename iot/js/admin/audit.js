// Auditoría: bitácora de acciones con filtros y CSV.
import { db, ROLES } from '../data/db.js';
import { dateTime } from '../../../assets/core/ui.js';
import { h } from '../shared/h.js';
import { pageHead, table, csv, selectFilter } from '../shared/common.js';

const st = { action: '', role: '' };
export function render(el, ctx) {
  const log = db.getValue('_log', []).map(l => { const u = db.get('users', l.user); return { ...l, who: u?.name || 'Sistema', role: u?.role || '' }; });
  const rows = log.filter(l => (!st.action || l.action === st.action) && (!st.role || l.role === st.role));
  el.innerHTML = pageHead('Auditoría', `${log.length} eventos (se conservan los últimos 300)`, '<button class="btn btn-sm" data-csv>⬇ CSV</button><button class="btn btn-sm btn-ghost" data-reload>↻ Actualizar</button>') +
    `<div class="card filters">${selectFilter('aa', 'Acción', [...new Set(log.map(l => l.action))].sort(), st.action, 'Todas')}${selectFilter('ar', 'Rol', Object.entries(ROLES), st.role)}</div><div data-t></div>`;
  table(el.querySelector('[data-t]'), { rows, pageSize: 15, search: l => `${l.action} ${l.detail} ${l.who}`, columns: [
    { key: 'at', label: 'Fecha', render: l => dateTime(l.at) }, { key: 'who', label: 'Usuario', render: l => h`<b>${l.who}</b><br><span class="small muted">${ROLES[l.role] || 'motor de reglas'}</span>` },
    { key: 'action', label: 'Acción', render: l => h`<span class="badge badge-primary">${l.action}</span>` }, { key: 'detail', label: 'Detalle' }] });
  el.querySelector('#aa').onchange = e => { st.action = e.target.value; ctx.refresh(); };
  el.querySelector('#ar').onchange = e => { st.role = e.target.value; ctx.refresh(); };
  el.querySelector('[data-reload]').onclick = () => ctx.refresh();
  el.querySelector('[data-csv]').onclick = () => csv('auditoria-sentinela.csv', rows.map(l => ({ fecha: l.at, usuario: l.who, rol: l.role, accion: l.action, detalle: l.detail })));
}
