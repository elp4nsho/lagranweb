import { escape, dateTime } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead } from '../shared/shell.js';
import { listView } from '../shared/crud.js';

export function renderLog(v) {
  v.innerHTML = `${pageHead('Bitácora de actividad', 'Últimos 300 eventos del sistema (inicios de sesión, reservas, cambios de estado, configuración).')}<div class="card" data-list></div>`;
  const users = Object.fromEntries(db.all('users').map(u => [u.id, u.name]));
  const actions = [...new Set(db.all('_log').map(l => l.action))];
  listView(v.querySelector('[data-list]'), {
    rows: () => db.all('_log').map(l => ({ ...l, uname: users[l.user] || (l.user ? '—' : 'Sitio web') })),
    search: l => `${l.action} ${l.detail} ${l.uname}`, pageSize: 15,
    filters: [{ key: 'action', label: 'Acción', options: actions }],
    columns: [
      { key: 'at', label: 'Fecha', render: l => `<small class="nowrap">${escape(dateTime(l.at))}</small>` },
      { key: 'uname', label: 'Usuario' }, { key: 'action', label: 'Acción', render: l => `<span class="badge">${escape(l.action)}</span>` },
      { key: 'detail', label: 'Detalle', sort: false }
    ],
    empty: 'Aún no hay actividad registrada. Prueba reservar una hora en el sitio.',
    csv: { name: 'bitacora.csv', map: l => ({ fecha: l.at, usuario: l.uname, accion: l.action, detalle: l.detail }) }
  });
}
