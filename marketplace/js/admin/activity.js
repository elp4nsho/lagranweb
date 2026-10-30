// Bitácora de actividad (db.log) con filtros y exportación.
import { escape, dateTime, downloadCSV } from '../../../assets/core/ui.js';
import { pageHead, smartTable, badge } from '../shared/kit.js';

export function render(el, { db }) {
  const rows = db.all('_log').map(l => ({ ...l, who: db.get('users', l.user)?.name || 'Sistema / visitante' }));
  const actions = [...new Set(rows.map(r => r.action))].sort();
  el.innerHTML = `${pageHead('Bitácora de actividad', 'Últimos 300 eventos del sistema', '<button class="btn btn-ghost btn-sm" data-csv>⭳ CSV</button>')}<div class="card" data-t></div>`;
  smartTable(el.querySelector('[data-t]'), {
    id: 'log', rows, pageSize: 15, search: r => r.detail + r.who + r.action, empty: 'Aún no hay actividad. Navega por el sistema y vuelve.',
    filters: [{ key: 'action', label: 'Acción', options: actions }],
    columns: [
      { key: 'at', label: 'Fecha', render: r => `<span class="small nowrap">${dateTime(r.at)}</span>` },
      { key: 'action', label: 'Acción', render: r => badge(r.action, r.action === 'login' ? 'info' : r.action === 'logout' ? '' : 'primary') },
      { key: 'detail', label: 'Detalle', render: r => escape(r.detail) },
      { key: 'who', label: 'Usuario' }
    ]
  });
  el.querySelector('[data-csv]').onclick = () => downloadCSV('bitacora.csv', rows.map(r => ({ fecha: r.at, accion: r.action, detalle: r.detail, usuario: r.who })));
}
