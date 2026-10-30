// Bitácora de actividad (db.log) con filtros y CSV.
import { escape, dateTime } from '../../../assets/core/ui.js';
import { pageHead, smartTable } from '../shared/admin-kit.js';
import { db } from '../data/db.js';

export default {
  id: 'actividad', label: 'Actividad', icon: '🕑', group: 'Sistema', roles: ['admin', 'gerente'], watch: ['_log'],
  render(el) {
    el.innerHTML = pageHead('Actividad', 'Registro de acciones del equipo y del sistema (últimas 300)') + '<div data-list></div>';
    const rows = () => db.getValue('_log', []).map(l => ({ ...l, userName: db.get('users', l.user)?.name || 'Sistema / cliente web' }));
    return smartTable(el.querySelector('[data-list]'), {
      rows,
      filters: [{ key: 'action', label: 'Acción', options: [...new Set(rows().map(l => l.action))].sort() }, { key: 'userName', label: 'Usuario', options: [...new Set(rows().map(l => l.userName))].sort() }],
      search: r => `${r.action} ${r.detail} ${r.userName}`,
      pageSize: 15,
      columns: [
        { key: 'at', label: 'Fecha', render: r => `<small class="nowrap">${dateTime(r.at)}</small>` },
        { key: 'action', label: 'Acción', render: r => `<span class="badge plain">${escape(r.action)}</span>` },
        { key: 'detail', label: 'Detalle' },
        { key: 'userName', label: 'Usuario' }
      ],
      csv: { name: 'actividad', map: r => ({ fecha: r.at, accion: r.action, detalle: r.detail, usuario: r.userName }) }
    });
  }
};
