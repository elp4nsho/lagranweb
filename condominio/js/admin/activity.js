// Bitácora de actividad (db.log) con filtros y exportación.
import { escape, dateTime } from '../../../assets/core/ui.js';
import { pageHead, crudTable } from '../shared/kit.js';

export function renderActivity(el, p, q, { db }) {
  const rows = () => db.all('_log');
  const actions = [...new Set(rows().map(l => l.action))];
  el.innerHTML = `${pageHead('Bitácora', 'Registro de acciones de usuarios y del sistema (últimas 300)')}<div data-t></div>`;
  crudTable(el.querySelector('[data-t]'), {
    rows, pageSize: 15, search: l => `${l.action} ${l.detail} ${db.get('users', l.user)?.name || ''}`,
    filters: [{ key: 'action', label: 'Tipo', options: actions }],
    columns: [
      { key: 'at', label: 'Fecha', render: l => `<span class="nowrap small">${dateTime(l.at)}</span>` },
      { key: 'action', label: 'Tipo', render: l => `<span class="badge plain">${escape(l.action)}</span>` },
      { key: 'detail', label: 'Detalle' },
      { key: 'user', label: 'Usuario', render: l => escape(db.get('users', l.user)?.name || 'Visitante') }
    ],
    empty: 'Aún no hay actividad. Las acciones del sitio y del panel aparecerán aquí.',
    csv: { name: 'bitacora.csv', map: l => ({ fecha: dateTime(l.at), tipo: l.action, detalle: l.detail, usuario: db.get('users', l.user)?.name || '' }) }
  });
}
