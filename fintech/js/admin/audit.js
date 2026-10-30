// Auditoría: bitácora de todas las acciones (db.log) con filtros y exportación.
import { db, userName, ROLES } from '../data/db.js';
import { dateTime } from '../../../assets/core/ui.js';
import { h } from '../shared/h.js';
import { pageHead, table, csv, selectFilter } from './kit.js';

const st = { action: '', role: '', from: '' };

export function render(el) {
  const log = db.getValue('_log', []).map(l => { const u = db.get('users', l.user); return { ...l, who: u?.name || 'Sistema', role: u?.role || '' }; });
  const rows = log.filter(l => (!st.action || l.action === st.action) && (!st.role || l.role === st.role) && (!st.from || l.at.slice(0, 10) >= st.from));
  el.innerHTML = pageHead('Auditoría', `${log.length} eventos registrados (se guardan los últimos 300)`, '<button class="btn btn-sm" data-csv>⬇ CSV</button><button class="btn btn-sm btn-ghost" data-reload>↻ Actualizar</button>') +
    `<div class="card filters">${selectFilter('aa', 'Acción', [...new Set(log.map(l => l.action))].sort(), st.action)}${selectFilter('ar', 'Rol', Object.entries(ROLES), st.role)}<div class="field"><label for="af">Desde</label><input class="input" type="date" id="af" value="${st.from}"></div></div><div data-t></div>`;
  table(el.querySelector('[data-t]'), {
    rows, pageSize: 15, search: l => `${l.action} ${l.detail} ${l.who}`,
    columns: [
      { key: 'at', label: 'Fecha', render: l => dateTime(l.at) },
      { key: 'who', label: 'Usuario', render: l => h`<b>${l.who}</b><br><span class="small muted">${ROLES[l.role] || ''}</span>` },
      { key: 'action', label: 'Acción', render: l => h`<span class="badge badge-primary">${l.action}</span>` },
      { key: 'detail', label: 'Detalle' },
    ],
  });
  [['#aa', 'action'], ['#ar', 'role'], ['#af', 'from']].forEach(([s, k]) => el.querySelector(s).onchange = e => { st[k] = e.target.value; render(el); });
  el.querySelector('[data-reload]').onclick = () => render(el);
  el.querySelector('[data-csv]').onclick = () => csv('auditoria-condor.csv', rows.map(l => ({ fecha: l.at, usuario: l.who, rol: l.role, accion: l.action, detalle: l.detail })));
  void userName;
}
