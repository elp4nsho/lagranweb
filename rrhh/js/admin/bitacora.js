// Bitácora de actividad (db.log) con filtros y exportación.
import { escape, dateTime, ago } from '../../../assets/core/ui.js';
import { pageHead } from './common.js';
import { smartTable } from '../shared/table.js';

export function render(el, ctx) {
  const { db, auth } = ctx;
  const users = Object.fromEntries(db.all('users').map(u => [u.id, u]));
  const rows = db.all('_log').map(l => ({ ...l, userName: users[l.user]?.name || 'Sistema', role: users[l.user] ? auth.roleName(users[l.user].role) : '' }));
  const actions = [...new Set(rows.map(r => r.action))].sort();
  el.innerHTML = pageHead('Bitácora de actividad', `${rows.length} eventos recientes (se guardan los últimos 300).`) + '<div data-t></div>';
  smartTable(el.querySelector('[data-t]'), {
    key: 'bitacora', rows, sort: 'at', dir: -1, pageSize: 15, search: r => `${r.detail} ${r.userName} ${r.action}`,
    filters: [{ key: 'action', label: 'Acción', options: actions.map(a => [a, a]), test: (r, v) => r.action === v }, { key: 'user', label: 'Usuario', options: Object.values(users).map(u => [u.id, u.name]), test: (r, v) => r.user === v }],
    columns: [
      { key: 'at', label: 'Cuándo', render: r => `<span class="nowrap">${escape(dateTime(r.at))}</span><br><small class="muted">${escape(ago(r.at))}</small>` },
      { key: 'userName', label: 'Usuario', render: r => `${escape(r.userName)}<br><small class="muted">${escape(r.role)}</small>` },
      { key: 'action', label: 'Acción', render: r => `<span class="badge">${escape(r.action)}</span>` },
      { key: 'detail', label: 'Detalle' }
    ],
    csv: { filename: 'bitacora.csv', map: r => ({ fecha: r.at, usuario: r.userName, accion: r.action, detalle: r.detail }) }
  });
}
