// Bitácora de actividad (db.log): quién hizo qué y cuándo, con filtros y exportación.
import { html, raw, dateTime, ago } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db } from '../data/db.js';
import { pageHead, smartTable, exportCSV } from '../shared/common.js';

export function render(el) {
  const rows = db.all('_log').map(l => { const u = l.user ? db.get('users', l.user) : null; return { ...l, uname: u?.name || 'Visitante', color: u?.color || '#888888', createdAt: l.at }; });
  const actions = [...new Set(rows.map(r => r.action))].sort();
  el.innerHTML = html`${raw(pageHead('Actividad', 'Registro de acciones en caja y back-office (últimos 300 eventos).', '<button class="btn" data-csv>⬇ Exportar CSV</button>'))}<div data-t></div>`;
  const t = smartTable(el.querySelector('[data-t]'), {
    key: 'activity', rows, pageSize: 20, search: r => `${r.action} ${r.detail} ${r.uname}`, defaultSort: { key: 'at', dir: -1 },
    empty: 'Aún no hay actividad registrada. Prueba hacer cambios en el panel o vender en la caja.',
    filters: [{ key: 'action', label: 'Acción', options: actions.map(a => [a, a]) }, { key: 'uname', label: 'Usuario', options: [...new Set(rows.map(r => r.uname))].map(u => [u, u]) }],
    columns: [
      { key: 'at', label: 'Cuándo', render: r => `${ago(r.at)}<br><small class="muted">${dateTime(r.at)}</small>` },
      { key: 'uname', label: 'Usuario', render: r => html`<span class="row" style="gap:8px;flex-wrap:nowrap"><span class="avatar" style="--av:${r.color};--size:28px">${initials(r.uname)}</span>${r.uname}</span>` },
      { key: 'action', label: 'Acción', render: r => html`<span class="badge badge-info plain">${r.action}</span>` },
      { key: 'detail', label: 'Detalle' }
    ]
  });
  el.querySelector('[data-csv]').onclick = () => exportCSV('actividad', t.filtered().map(r => ({ fecha: r.at, usuario: r.uname, accion: r.action, detalle: r.detail })));
}
