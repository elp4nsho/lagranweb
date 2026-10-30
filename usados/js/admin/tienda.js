// Tienda: pedidos con flujo de despacho y CRUD de productos (stock y precios reflejados en el sitio).
import { money, escape, date, toast, formModal, modal, confirm } from '../../../assets/core/ui.js';
import { pageHead, smartTable, kpi } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { ORDER_STATES } from '../data/catalog.js';
import { statusBadge, branchById } from '../shared/domain.js';
import { DAY } from '../shared/util.js';

const NEXT = { pagado: 'preparando', preparando: 'enviado', enviado: 'entregado' };
async function editProduct(p, ctx) {
  const cats = [...new Set(db.all('products').map(x => x.cat))];
  const v = await formModal({ title: p ? `Editar ${p.name}` : 'Nuevo producto', fields: [{ name: 'name', label: 'Nombre', required: true, value: p?.name }, { name: 'cat', label: 'Categoría', type: 'select', options: cats, value: p?.cat }, { name: 'icon', label: 'Ícono', value: p?.icon || '🧩' },
    { name: 'price', label: 'Precio (CLP)', type: 'number', required: true, value: p?.price }, { name: 'stock', label: 'Stock', type: 'number', value: p?.stock ?? 10 }, { name: 'compat', label: 'Compatibilidad', value: p?.compat }, { name: 'active', label: 'Visible en la tienda', type: 'checkbox', value: p ? p.active : true }] });
  if (!v) return;
  if (!(v.price > 0) || v.stock < 0) { toast('Precio o stock inválido', 'warning'); return; }
  p ? db.update('products', p.id, v) : db.insert('products', { ...v, sku: 'RC-' + (3000 + db.count('products') * 7), desc: v.name });
  db.log('tienda', `Producto ${p ? 'editado' : 'creado'}: ${v.name} (${money(v.price)}, stock ${v.stock})`, ctx.user.id); toast('Producto guardado', 'success');
}
function orderSheet(o, ctx) {
  const nx = NEXT[o.status];
  const m = modal({ title: `Pedido ${o.code}`, body: `<div class="stack"><dl class="dl small"><dt>Cliente</dt><dd>${escape(o.name)}<small class="muted d-block">${escape(o.email)} · ${escape(o.phone || '')}</small></dd><dt>Entrega</dt><dd>${o.delivery === 'despacho' ? `🚚 ${escape(o.address)}, ${escape(o.comuna)}` : `🏢 Retiro en ${escape(branchById(o.branchId)?.name || '')}`}</dd><dt>Pago</dt><dd>Tarjeta •••• ${escape(o.card || '')} · ${date(o.createdAt)}</dd><dt>Estado</dt><dd>${statusBadge(ORDER_STATES, o.status)}</dd></dl>
    <ul class="lines small">${o.items.map(i => `<li><span>${i.qty} × ${escape(i.name)}</span><b>${money(i.qty * i.price)}</b></li>`).join('')}<li><span>Despacho</span><b>${o.shipping ? money(o.shipping) : 'Gratis'}</b></li></ul><div class="total-row"><span>Total</span><b>${money(o.total)}</b></div></div>`,
    foot: `${!['entregado', 'cancelado'].includes(o.status) ? '<button class="btn btn-danger btn-sm" data-cx>Cancelar y reembolsar</button>' : ''}<span class="grow"></span>${nx ? `<button class="btn btn-primary btn-sm" data-nx>→ ${ORDER_STATES[nx].label}</button>` : '<button class="btn btn-sm" data-close>Cerrar</button>'}` });
  m.el.querySelector('[data-nx]')?.addEventListener('click', () => { db.update('orders', o.id, { status: nx }); db.log('tienda', `${o.code}: ${ORDER_STATES[nx].label}`, ctx.user.id); toast(`${o.code} → ${ORDER_STATES[nx].label}`, 'success'); m.close(); });
  m.el.querySelector('[data-cx]')?.addEventListener('click', async () => { if (!(await confirm('Se cancela el pedido, se reembolsa y se repone el stock.', { danger: true, ok: 'Cancelar pedido' }))) return; o.items.forEach(i => { const p = db.get('products', i.productId); if (p) db.update('products', p.id, { stock: p.stock + i.qty }); }); db.update('orders', o.id, { status: 'cancelado' }); db.log('tienda', `${o.code}: cancelado y reembolsado`, ctx.user.id); m.close(); });
}
export default {
  id: 'tienda', label: 'Tienda (repuestos)', icon: '🛒', group: 'Posventa', roles: ['admin', 'gerente', 'taller'],
  watch: ['orders', 'products'],
  render(el, ctx) {
    const view = ctx.params.sub || 'pedidos', os = db.all('orders'), o30 = os.filter(o => o.status !== 'cancelado' && Date.now() - new Date(o.createdAt) < 30 * DAY);
    el.innerHTML = `${pageHead('Tienda de repuestos y accesorios', 'Pedidos web y catálogo')}
      <div class="kpi-grid">${kpi('Ventas 30 días', money(o30.reduce((a, o) => a + o.total, 0)))}${kpi('Pedidos 30 días', String(o30.length))}${kpi('Por preparar', String(os.filter(o => o.status === 'pagado').length))}${kpi('Productos agotados', String(db.count('products', p => p.stock === 0)), '', !db.count('products', p => p.stock === 0))}</div>
      <div class="tabs"><a class="tab ${view === 'pedidos' ? 'active' : ''}" href="#/tienda/pedidos">Pedidos</a><a class="tab ${view === 'productos' ? 'active' : ''}" href="#/tienda/productos">Productos</a></div><div data-t></div>`;
    const t = el.querySelector('[data-t]');
    t.addEventListener('click', e => { if (e.target.closest('[data-newp]')) editProduct(null, ctx); });
    if (view === 'productos') return smartTable(t, {
      rows: () => db.all('products'), filters: [{ key: 'cat', label: 'Categoría', options: [...new Set(db.all('products').map(p => p.cat))] }, { key: 'stock', label: 'Stock', options: [['0', 'Agotados']], test: r => r.stock === 0 }],
      search: r => `${r.sku} ${r.name} ${r.compat}`,
      columns: [{ key: 'name', label: 'Producto', render: r => `${escape(r.icon)} <b>${escape(r.name)}</b><small class="muted d-block mono">${escape(r.sku)}</small>` }, { key: 'cat', label: 'Categoría' }, { key: 'price', label: 'Precio', render: r => money(r.price) }, { key: 'stock', label: 'Stock', render: r => `<b style="color:${r.stock ? 'inherit' : 'var(--danger)'}">${r.stock}</b>` }, { key: 'active', label: 'Estado', render: r => r.active ? '<span class="badge badge-success">Visible</span>' : '<span class="badge">Oculto</span>' }],
      onRow: r => editProduct(db.get('products', r.id), ctx), actions: '<button class="btn btn-sm btn-primary" data-newp>+ Producto</button>',
      csv: { name: 'productos', map: r => ({ sku: r.sku, nombre: r.name, categoria: r.cat, precio: r.price, stock: r.stock }) }
    });
    return smartTable(t, {
      rows: () => db.all('orders').sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      filters: [{ key: 'status', label: 'Estado', options: Object.entries(ORDER_STATES).map(([k, s]) => [k, s.label]) }, { key: 'delivery', label: 'Entrega', options: [['despacho', 'Despacho'], ['retiro', 'Retiro']] }],
      search: r => `${r.code} ${r.name} ${r.email}`,
      columns: [{ key: 'code', label: 'Pedido', render: r => `<span class="mono">${r.code}</span>` }, { key: 'createdAt', label: 'Fecha', render: r => date(r.createdAt) }, { key: 'name', label: 'Cliente' }, { key: 'items', label: 'Productos', sort: false, render: r => `${r.items.reduce((a, i) => a + i.qty, 0)} ítems` }, { key: 'delivery', label: 'Entrega', render: r => r.delivery === 'despacho' ? '🚚 Despacho' : '🏢 Retiro' }, { key: 'total', label: 'Total', render: r => money(r.total) }, { key: 'status', label: 'Estado', render: r => statusBadge(ORDER_STATES, r.status) }],
      onRow: r => orderSheet(db.get('orders', r.id), ctx),
      csv: { name: 'pedidos', map: r => ({ pedido: r.code, fecha: r.createdAt.slice(0, 10), cliente: r.name, correo: r.email, entrega: r.delivery, total: r.total, estado: ORDER_STATES[r.status].label }) }
    });
  }
};
