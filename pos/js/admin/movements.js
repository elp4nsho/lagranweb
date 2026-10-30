// Historial de movimientos de stock (entradas, mermas, transferencias y ajustes).
import { html, raw, dateTime, ago } from '../../../assets/core/ui.js';
import { db, canEdit, branchName, userName, MOVE_TYPES, badge } from '../data/db.js';
import { pageHead, smartTable, exportCSV } from '../shared/common.js';
import { moveForm } from './inventory.js';

const DAY = 864e5;
export function render(el) {
  const rows = db.all('stockMoves').map(m => { const p = db.get('products', m.productId); return { ...m, pname: p?.name || '—', emoji: p?.emoji || '', bname: branchName(m.branchId), uname: userName(m.userId) }; });
  const last30 = rows.filter(m => Date.now() - new Date(m.createdAt) < 30 * DAY);
  const mermaValue = last30.filter(m => m.type === 'merma').reduce((s, m) => s + m.qty * (db.get('products', m.productId)?.cost || 0), 0);
  el.innerHTML = html`${raw(pageHead('Movimientos de stock', 'Trazabilidad de cada unidad que entra, sale o se mueve entre sucursales.', `<button class="btn" data-csv>⬇ CSV</button>${canEdit('movements') ? '<button class="btn btn-primary" data-new>+ Registrar movimiento</button>' : ''}`))}
    <div class="kpis">${Object.entries(MOVE_TYPES).map(([k, v]) => raw(html`<div class="card stat"><span class="label">${v[0]}s (30 días)</span><span class="value">${last30.filter(m => m.type === k).length}</span>${k === 'merma' ? raw(html`<span class="small muted">${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(mermaValue)} a costo</span>`) : ''}</div>`))}</div>
    <div data-t></div>`;
  const t = smartTable(el.querySelector('[data-t]'), {
    key: 'moves', rows, pageSize: 15, search: m => `${m.pname} ${m.note} ${m.uname}`, defaultSort: { key: 'createdAt', dir: -1 },
    filters: [
      { key: 'type', label: 'Tipo', options: Object.entries(MOVE_TYPES).map(([k, v]) => [k, v[0]]) },
      { key: 'branchId', label: 'Sucursal', options: db.all('branches').map(b => [b.id, b.name]), test: (m, v) => m.branchId === v || m.toBranchId === v },
      { key: 'period', label: 'Periodo', options: [['1', 'Hoy'], ['7', '7 días'], ['30', '30 días']], test: (m, v) => Date.now() - new Date(m.createdAt) < +v * DAY }
    ],
    columns: [
      { key: 'createdAt', label: 'Fecha', render: m => `${dateTime(m.createdAt)}<br><small class="muted">${ago(m.createdAt)}</small>` },
      { key: 'type', label: 'Tipo', render: m => badge(MOVE_TYPES, m.type) },
      { key: 'pname', label: 'Producto', render: m => html`<a href="#/productos/${m.productId}">${m.emoji} ${m.pname}</a>` },
      { key: 'qty', label: 'Cant.', render: m => `<b>${m.type === 'merma' ? '−' : m.type === 'ajuste' && m.qty > 0 ? '+' : m.type === 'entrada' ? '+' : ''}${m.qty}</b>` },
      { key: 'bname', label: 'Sucursal', render: m => html`${m.bname}${m.toBranchId ? raw(html` → <b>${branchName(m.toBranchId)}</b>`) : ''}` },
      { key: 'note', label: 'Nota' }, { key: 'uname', label: 'Usuario' }
    ]
  });
  el.addEventListener('click', e => {
    if (e.target.closest('[data-new]')) moveForm();
    if (e.target.closest('[data-csv]')) exportCSV('movimientos', t.filtered().map(m => ({ fecha: m.createdAt, tipo: m.type, producto: m.pname, cantidad: m.qty, sucursal: m.bname, destino: m.toBranchId ? branchName(m.toBranchId) : '', nota: m.note, usuario: m.uname })));
  });
}
