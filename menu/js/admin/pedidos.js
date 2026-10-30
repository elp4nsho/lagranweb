// Historial de pedidos con filtros, detalle, cambios de estado y CSV.
import { money, dateTime, escape, modal, toast, confirm } from '../../../assets/core/ui.js';
import { pageHead, badge, smartTable } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { ORDER_STATES, ITEM_STATES, lineTotal, dishName, patchItems, deriveOrderStatus, STATIONS } from '../shared/logic.js';

const DAY = 864e5;
const userName = id => db.get('users', id)?.name || '—';

export function orderDetail(o, ctx) {
  const render = () => {
    o = db.get('orders', o.id);
    const editable = !['pagado', 'cancelado'].includes(o.status);
    return `<div class="stack">
      <div class="row between"><div class="row">${badge(ORDER_STATES, o.status)}<span class="muted small">Mesa ${o.tableNumber} · ${o.source === 'mesa' ? 'pedido desde la mesa (QR)' : 'tomado por ' + escape(userName(o.waiterId))}</span></div><small class="muted">${dateTime(o.createdAt)}</small></div>
      ${o.note ? `<p class="callout small">📝 ${escape(o.note)}</p>` : ''}
      <div class="table-wrap"><table class="table"><thead><tr><th>Ítem</th><th>Estación</th><th>Estado</th><th>Total</th>${editable ? '<th></th>' : ''}</tr></thead><tbody>
        ${o.items.map(i => `<tr><td><b>${i.qty}× ${escape(dishName(i))}</b>${i.mods?.length ? `<small class="muted d-block">${escape(i.mods.join(' · '))}</small>` : ''}${i.note ? `<small class="muted d-block">📝 ${escape(i.note)}</small>` : ''}</td><td class="small">${escape(STATIONS[i.station] || '—')}</td><td>${badge(Object.fromEntries(Object.entries(ITEM_STATES).map(([k, v]) => [k, v])), i.status || 'entregado')}</td><td>${money(i.price * i.qty)}</td>${editable ? `<td>${i.status !== 'anulado' ? `<button class="btn btn-sm btn-ghost" data-void="${i.id}">Anular</button>` : ''}</td>` : ''}</tr>`).join('')}
      </tbody></table></div>
      <div class="row between total-row"><span>Total del pedido</span><b>${money(lineTotal(o.items))}</b></div>
    </div>`;
  };
  const editable = !['pagado', 'cancelado'].includes(o.status);
  const m = modal({ title: `Pedido #${o.number}`, size: 'lg', body: render(), foot: editable ? `<button class="btn btn-danger" data-cancel>Cancelar pedido</button><button class="btn" data-deliver>Marcar todo entregado</button><button class="btn btn-primary" data-close>Listo</button>` : '<button class="btn btn-primary" data-close>Cerrar</button>' });
  m.el.addEventListener('click', async e => {
    const v = e.target.closest('[data-void]');
    if (v) { patchItems(o.id, i => i.id === v.dataset.void ? { status: 'anulado' } : null); db.log('pedido', `Ítem anulado en pedido #${o.number}`, ctx.user.id); m.el.querySelector('.modal-body').innerHTML = render(); toast('Ítem anulado', 'success'); return; }
    if (e.target.closest('[data-deliver]')) { patchItems(o.id, i => i.status !== 'anulado' ? { status: 'entregado' } : null); db.log('pedido', `Pedido #${o.number} marcado como entregado`, ctx.user.id); m.el.querySelector('.modal-body').innerHTML = render(); toast('Pedido entregado', 'success'); return; }
    if (e.target.closest('[data-cancel]')) {
      if (!await confirm(`¿Cancelar el pedido #${o.number}? Se quitará de cocina y de la cuenta.`, { danger: true, ok: 'Cancelar pedido' })) return;
      db.update('orders', o.id, { status: 'cancelado' });
      db.log('pedido', `Pedido #${o.number} cancelado`, ctx.user.id);
      toast('Pedido cancelado', 'success'); m.close();
    }
  });
}

export default {
  id: 'pedidos', label: 'Pedidos', icon: '🧾', group: 'Operación', roles: ['admin', 'cajero', 'chef'], watch: ['orders'],
  render(el, ctx) {
    el.innerHTML = pageHead('Pedidos', 'Historial completo de comandas enviadas a cocina') + '<div data-list></div>';
    const now = Date.now();
    const rows = () => db.all('orders').map(o => ({ ...o, total: lineTotal(o.items), count: o.items.reduce((a, i) => a + i.qty, 0), when: o.createdAt }));
    return smartTable(el.querySelector('[data-list]'), {
      rows,
      filters: [
        { key: 'status', label: 'Estado', options: Object.entries(ORDER_STATES).map(([k, v]) => [k, v.label]) },
        { key: 'source', label: 'Origen', options: [['mesa', 'QR mesa'], ['garzon', 'Garzón']] },
        { key: 'range', label: 'Fecha', value: '7', options: [['1', 'Hoy'], ['7', 'Últimos 7 días'], ['30', 'Últimos 30 días']], test: (r, v) => +new Date(r.createdAt) > now - +v * DAY },
        { key: 'tableNumber', label: 'Mesa', options: db.all('tables').sort((a, b) => a.number - b.number).map(t => [t.number, 'Mesa ' + t.number]) }
      ],
      search: r => `${r.number} mesa ${r.tableNumber} ${r.items.map(i => dishName(i)).join(' ')}`,
      columns: [
        { key: 'number', label: '#', render: r => `<b>#${r.number}</b>` },
        { key: 'when', label: 'Fecha', render: r => `<span class="small">${dateTime(r.createdAt)}</span>` },
        { key: 'tableNumber', label: 'Mesa' },
        { key: 'count', label: 'Ítems', render: r => `${r.count} <small class="muted">${escape(r.items.slice(0, 2).map(i => dishName(i)).join(', '))}${r.items.length > 2 ? '…' : ''}</small>` },
        { key: 'total', label: 'Total', render: r => money(r.total) },
        { key: 'source', label: 'Origen', render: r => r.source === 'mesa' ? '📱 QR' : '🧑‍🍳 Garzón' },
        { key: 'status', label: 'Estado', render: r => badge(ORDER_STATES, r.status) }
      ],
      onRow: r => orderDetail(r, ctx),
      csv: { name: 'pedidos', map: r => ({ numero: r.number, fecha: r.createdAt, mesa: r.tableNumber, items: r.items.map(i => `${i.qty}x ${dishName(i)}`).join(' | '), total: r.total, origen: r.source, estado: r.status }) }
    });
  }
};
export { deriveOrderStatus };
