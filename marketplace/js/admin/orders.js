// Supervisión de pedidos: filtros, detalle (vista staff) e intervenciones de soporte.
import { escape, money, date, downloadCSV, toast, confirm as ask } from '../../../assets/core/ui.js';
import { pageHead, smartTable } from '../shared/kit.js';
import { user, category, ORDER_STATUS, ESCROW, statusBadge, take, activeCategories } from '../shared/market.js';
import { renderOrder } from '../shared/orderview.js';

export function render(el, { db, go }) {
  const rows = db.all('orders').map(o => ({ ...o, cname: user(o.clientId)?.name || '', fname: user(o.freelancerId)?.name || '', catName: category(o.categoryId).name, rev: take(o), late: ['pendiente', 'en_progreso', 'revision'].includes(o.status) && o.due < new Date().toISOString() }));
  el.innerHTML = `${pageHead('Pedidos', `${rows.length} pedidos · ${rows.filter(r => r.late).length} atrasados`, '<button class="btn btn-ghost btn-sm" data-csv>⭳ CSV</button>')}<div class="card" data-t></div>`;
  const t = smartTable(el.querySelector('[data-t]'), {
    id: 'adm-orders', rows, pageSize: 12, search: r => r.code + r.title + r.cname + r.fname,
    filters: [{ key: 'status', label: 'Estado', options: Object.entries(ORDER_STATUS).map(([k, v]) => [k, v[0]]) }, { key: 'escrow', label: 'Garantía', options: Object.entries(ESCROW).map(([k, v]) => [k, v[0]]) }, { key: 'categoryId', label: 'Categoría', options: activeCategories().map(c => [c.id, c.name]) }, { key: 'late', label: 'Plazo', options: [['true', 'Atrasados']], test: (r, v) => String(r.late) === v }],
    columns: [
      { key: 'createdAt', label: 'Fecha', render: r => `<span class="small nowrap">${date(r.createdAt)}</span>` },
      { key: 'code', label: 'Pedido', render: r => `<b>${escape(r.code)}</b><div class="small muted">${escape(r.title)}</div>` },
      { key: 'cname', label: 'Cliente → Freelancer', render: r => `<span class="small">${escape(r.cname)} → ${escape(r.fname)}</span>` },
      { key: 'price', label: 'Precio', render: r => money(r.price) },
      { key: 'rev', label: 'Ingreso Gremio', render: r => money(r.rev) },
      { key: 'status', label: 'Estado', render: r => statusBadge(ORDER_STATUS, r.status) + (r.late ? ' <span class="badge badge-danger">Atrasado</span>' : '') },
      { key: 'escrow', label: 'Garantía', render: r => statusBadge(ESCROW, r.escrow) }
    ],
    onRow: r => go('/pedidos/' + r.id)
  });
  el.querySelector('[data-csv]').onclick = () => downloadCSV('pedidos-gremio.csv', t.filtered().map(r => ({ codigo: r.code, fecha: r.createdAt.slice(0, 10), servicio: r.title, categoria: r.catName, cliente: r.cname, freelancer: r.fname, precio: r.price, cargo_cliente: r.serviceFee, comision: r.commission, ingreso_gremio: r.rev, estado: ORDER_STATUS[r.status][0], garantia: ESCROW[r.escrow]?.[0] })));
}

export function detail(el, ctx, id) {
  renderOrder(el, ctx, id, { back: '#/pedidos' });
  const o = ctx.db.get('orders', id);
  if (!o || !['pendiente', 'en_progreso', 'revision'].includes(o.status)) return;
  const box = document.createElement('div');
  box.className = 'card';
  box.innerHTML = '<h3>Intervención de soporte</h3><p class="small muted">Cancela el pedido y reembolsa al cliente (p. ej. freelancer inactivo o pedido duplicado).</p><button class="btn btn-danger btn-sm" data-refund>Cancelar y reembolsar</button>';
  el.querySelector('.split > .stack:last-child')?.prepend(box);
  box.querySelector('[data-refund]').onclick = async () => {
    if (!await ask(`¿Cancelar ${o.code} y reembolsar ${money(o.total)} al cliente?`, { danger: true, ok: 'Reembolsar' })) return;
    ctx.db.update('orders', o.id, x => ({ status: 'cancelado', escrow: 'reembolsado', timeline: [...x.timeline, { at: new Date().toISOString(), text: 'Soporte canceló el pedido y reembolsó al cliente', by: ctx.me.id }] }));
    ctx.db.log('pedido', `${o.code} cancelado por soporte (reembolso)`, ctx.me.id); toast('Pedido cancelado y reembolsado', 'success');
  };
}
