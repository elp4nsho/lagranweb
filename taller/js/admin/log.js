// Bitácora de actividad del sistema (sitio, recepción, bahías y panel).
import { escape, dateTime } from '../../../assets/core/ui.js';
import { pageHead, smartTable } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { userName } from '../shared/domain.js';

export default {
  id: 'actividad', label: 'Actividad', icon: '🕘', group: 'Sistema', roles: ['admin', 'jefe'], watch: ['_log'],
  render(el) {
    el.innerHTML = `${pageHead('Actividad', 'Últimos 300 eventos: OT, presupuestos, bodega, seguros, caja y accesos')}<div data-list></div>`;
    const rows = () => db.getValue('_log', []).map(l => ({ ...l, who: l.user ? userName(l.user) : 'Cliente / sitio' }));
    return smartTable(el.querySelector('[data-list]'), {
      rows, pageSize: 20,
      filters: [{ key: 'action', label: 'Tipo', options: [...new Set(rows().map(l => l.action))].sort() }],
      search: r => `${r.detail} ${r.who}`,
      columns: [{ key: 'at', label: 'Fecha', render: r => `<span class="nowrap">${dateTime(r.at)}</span>` }, { key: 'action', label: 'Tipo', render: r => `<span class="badge plain">${escape(r.action)}</span>` }, { key: 'detail', label: 'Detalle' }, { key: 'who', label: 'Usuario' }],
      csv: { name: 'actividad', map: r => ({ fecha: r.at, tipo: r.action, detalle: r.detail, usuario: r.who }) }
    });
  }
};
