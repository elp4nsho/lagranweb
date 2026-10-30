// Bitácora de actividad (db.log) con filtros y exportación.
import { db } from '../data/db.js';
import { pageHead, table } from '../shared/admin-kit.js';
import { escape, dateTime, ago } from '../../../assets/core/ui.js';

export default {
  id: 'actividad', label: 'Bitácora', ico: '🕑', group: 'Administración', roles: ['admin'],
  render(view) {
    const users = db.all('users');
    const rows = db.all('_log').map(l => ({ ...l, who: users.find(u => u.id === l.user)?.name || 'Sitio público' }));
    const actions = [...new Set(rows.map(r => r.action))].sort();
    view.innerHTML = `${pageHead('Bitácora de actividad', 'Últimas 300 acciones del equipo y del sitio público (compras, reseñas, postulaciones).')}<div class="card" id="tbl"></div>`;
    table(view.querySelector('#tbl'), {
      id: 'log', rows, pageSize: 15, search: r => `${r.action} ${r.detail} ${r.who}`,
      filters: [{ key: 'action', label: 'Acción', options: actions.map(a => [a, a]) }, { key: 'who', label: 'Usuario', options: [...new Set(rows.map(r => r.who))].map(w => [w, w]) }],
      columns: [
        { key: 'at', label: 'Fecha', render: r => `${escape(dateTime(r.at))}<br><small class="muted">${escape(ago(r.at))}</small>` },
        { key: 'who', label: 'Usuario' }, { key: 'action', label: 'Acción', render: r => `<b>${escape(r.action)}</b>` }, { key: 'detail', label: 'Detalle' }
      ],
      csv: { name: 'bitacora.csv', map: r => ({ fecha: r.at, usuario: r.who, accion: r.action, detalle: r.detail }) }
    });
  }
};
