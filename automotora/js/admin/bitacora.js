// Bitácora de actividad.
import { escape, dateTime } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead } from '../shared/shell.js';
import { listView } from '../shared/crud.js';
import { userName } from '../shared/domain.js';

export function renderLog(v) {
  v.innerHTML = `${pageHead('Bitácora', 'Últimas 300 acciones del sistema: sitio público, apps de rol y panel.')}<div class="card" data-list></div>`;
  const all = db.all('_log');
  listView(v.querySelector('[data-list]'), { rows: () => db.all('_log'), search: l => `${l.action} ${l.detail} ${userName(l.user)}`, pageSize: 20,
    filters: [{ key: 'action', label: 'Acción', options: [...new Set(all.map(l => l.action))].sort() }],
    columns: [{ key: 'at', label: 'Fecha', render: l => dateTime(l.at) }, { key: 'action', label: 'Acción', render: l => `<span class="badge">${escape(l.action)}</span>` }, { key: 'detail', label: 'Detalle', render: l => escape(l.detail) }, { key: 'user', label: 'Usuario', render: l => escape(l.user ? userName(l.user) : 'Sitio público') }],
    empty: 'Sin actividad registrada todavía. Navega el sitio o las apps y vuelve aquí.',
    csv: { name: 'bitacora.csv', map: l => ({ fecha: l.at, accion: l.action, detalle: l.detail, usuario: l.user ? userName(l.user) : '' }) } });
}
