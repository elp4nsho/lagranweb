// Bitácora de actividad (db.log) con filtros y exportación.
import { db } from '../data/db.js';
import { html, raw, dateTime, downloadCSV } from '../../../assets/core/ui.js';
import { dataTable } from '../shared/table.js';
import { pageHead } from '../shared/shell.js';
import { avatar } from '../shared/views.js';

export function mountActividad(el, ctx) {
  let f = '';
  const users = () => Object.fromEntries(db.all('users').map(u => [u.id, u]));
  const rows = () => { const us = users(); return (db.getValue('_log', []) || []).map(l => ({ ...l, who: us[l.user]?.name || 'Sistema', role: us[l.user]?.role || '' })).filter(l => !f || l.action === f); };
  const actions = () => [...new Set((db.getValue('_log', []) || []).map(l => l.action))].sort();
  el.innerHTML = html`${raw(pageHead('Actividad', 'Registro de acciones de usuarios en todo el sistema (últimas 300).', '<button class="btn" data-csv>⇩ CSV</button>'))}
    <div class="filters card" style="padding:12px"><select class="select" data-act aria-label="Acción"><option value="">Todas las acciones</option>${actions().map(a => raw(html`<option>${a}</option>`))}</select></div><div data-t></div>`;
  const table = dataTable(el.querySelector('[data-t]'), {
    rows: rows(), pageSize: 20, search: l => `${l.who} ${l.action} ${l.detail}`,
    columns: [
      { key: 'at', label: 'Fecha', render: l => dateTime(l.at) },
      { key: 'who', label: 'Usuario', render: l => raw(html`<span class="row" style="gap:8px;flex-wrap:nowrap">${avatar(l.who, users()[l.user]?.color, 26)}<span>${l.who}<br><small class="muted">${l.role}</small></span></span>`) },
      { key: 'action', label: 'Acción', render: l => raw(html`<span class="badge plain">${l.action}</span>`) },
      { key: 'detail', label: 'Detalle' }
    ], empty: 'Sin actividad registrada'
  });
  el.querySelector('[data-act]').onchange = e => { f = e.target.value; table.update(rows()); };
  el.querySelector('[data-csv]').onclick = () => downloadCSV('actividad-rayo.csv', rows().map(l => ({ fecha: dateTime(l.at), usuario: l.who, accion: l.action, detalle: l.detail })));
  let n = 0;
  return { refresh() { const c = (db.getValue('_log', []) || []).length + ((db.getValue('_log', []) || [])[0]?.id || ''); if (c === n) return; n = c; table.update(rows()); } };
}
