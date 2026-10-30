// Bitácora de actividad (db.log): filtros por usuario y tipo, exportable.
import { db } from '../data/db.js';
import { escape, dateTime, ago, dataTable } from '../../../assets/core/ui.js';
import { pageHead, opt } from '../app/components.js';
import { avatar, userName, exportCSV } from '../shared/util.js';
import { icon } from '../shared/icons.js';

const state = { user: '', action: '' };

export function render(view, ctx) {
  const all = (db.getValue('_log', []) || []).map(l => ({ ...l, who: l.user ? userName(l.user) : 'Sistema / sitio web' }));
  const actions = [...new Set(all.map(l => l.action))].sort();
  const rows = all.filter(l => (!state.user || l.user === state.user) && (!state.action || l.action === state.action));
  view.innerHTML = `
    ${pageHead('Bitácora', `${all.length} eventos (se guardan los últimos 300)`, `<button class="btn" data-export>${icon('upload', 16)} Exportar CSV</button>`)}
    <div class="card stack">
      <div class="row filters">
        <select class="select select-sm" data-user aria-label="Usuario"><option value="">Todos los usuarios</option>${db.all('users').map(u => opt(u.id, u.name, state.user)).join('')}</select>
        <select class="select select-sm" data-action aria-label="Tipo"><option value="">Todos los tipos</option>${actions.map(a => opt(a, a, state.action)).join('')}</select>
      </div>
      <div data-table></div>
    </div>`;
  dataTable(view.querySelector('[data-table]'), {
    rows, pageSize: 20, search: l => `${l.action} ${l.detail} ${l.who}`, empty: 'Sin eventos registrados',
    columns: [
      { key: 'at', label: 'Fecha', render: l => `<span title="${dateTime(l.at)}">${ago(l.at)}</span>` },
      { key: 'who', label: 'Usuario', render: l => `<span class="user-chip">${avatar(db.get('users', l.user), 24)}<span>${escape(l.who)}</span></span>` },
      { key: 'action', label: 'Tipo', render: l => `<span class="badge plain">${escape(l.action)}</span>` },
      { key: 'detail', label: 'Detalle' }
    ]
  });
  view.querySelector('[data-user]').onchange = e => { state.user = e.target.value; render(view, ctx); };
  view.querySelector('[data-action]').onchange = e => { state.action = e.target.value; render(view, ctx); };
  view.querySelector('[data-export]').onclick = () => exportCSV('bitacora.csv', rows.map(l => ({ fecha: dateTime(l.at), usuario: l.who, tipo: l.action, detalle: l.detail })));
}
