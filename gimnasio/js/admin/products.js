import { escape, money, toast, confirm, formModal, dateTime } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { pageHead, statCard } from '../shared/shell.js';
import { listView, actBtn } from '../shared/crud.js';
import { hbars } from '../shared/charts.js';
import { ymd, addDays } from '../shared/dates.js';
import { icon } from '../shared/icons.js';

export function renderProducts(v) {
  const sales = db.query('sales', s => s.at >= addDays(ymd(), -30));
  const units = {}; sales.forEach(s => s.items.forEach(i => units[i.name] = (units[i.name] || 0) + i.qty));
  const top = Object.entries(units).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value }));
  v.innerHTML = `${pageHead('Tienda y stock', 'Productos que se venden en el POS de recepción.', `<a class="btn" href="recepcion.html#/pos">${icon('cart', 16)} Abrir POS</a><button class="btn btn-primary" data-new>${icon('plus', 16)} Nuevo producto</button>`)}
  <div class="grid-main"><div class="card" data-list></div>
    <div class="stack">${statCard('Ventas 30 días', money(sales.reduce((s, x) => s + x.total, 0)), `<span class="muted small">${sales.length} boletas</span>`, 'money')}<div class="card"><h3>Más vendidos</h3>${hbars(top, { format: x => x + ' un.' })}</div></div></div>`;
  const edit = async p => {
    const val = await formModal({ title: p ? `Editar ${p.name}` : 'Nuevo producto', fields: [
      { name: 'name', label: 'Nombre', required: true, value: p?.name }, { name: 'sku', label: 'SKU', required: true, value: p?.sku || 'TF' + (200 + db.count('products')) },
      { name: 'category', label: 'Categoría', type: 'select', options: ['Bebidas', 'Snacks', 'Suplementos', 'Accesorios', 'Ropa'], value: p?.category },
      { name: 'price', label: 'Precio (CLP)', type: 'number', required: true, value: p?.price }, { name: 'stock', label: 'Stock', type: 'number', required: true, value: p?.stock ?? 10 },
      { name: 'active', label: 'Disponible a la venta', type: 'checkbox', value: p ? p.active !== false : true }] });
    if (!val) return;
    if (val.price <= 0 || val.stock < 0) return toast('Precio y stock deben ser válidos', 'warning');
    p ? db.update('products', p.id, val) : db.insert('products', val);
    db.log('producto', `${p ? 'Editado' : 'Creado'}: ${val.name}`, auth.current()?.id); toast('Producto guardado', 'success');
  };
  listView(v.querySelector('[data-list]'), {
    rows: () => db.all('products').map(p => ({ ...p, sold: units[p.name] || 0 })), search: p => `${p.name} ${p.sku}`,
    filters: [{ key: 'category', label: 'Categoría', options: [...new Set(db.all('products').map(p => p.category))] }, { key: 'low', label: 'Stock', options: [['1', 'Stock bajo (≤5)']], test: p => p.stock <= 5 }],
    columns: [{ key: 'name', label: 'Producto', render: p => `<b>${escape(p.name)}</b><br><small class="muted">${p.sku} · ${escape(p.category)}</small>` }, { key: 'price', label: 'Precio', render: p => money(p.price) },
      { key: 'stock', label: 'Stock', render: p => `<span class="badge ${p.stock <= 5 ? 'badge-warning' : 'plain'}">${p.stock}</span>` }, { key: 'sold', label: 'Vendidos 30 d' },
      { key: 'id', label: '', sort: false, render: p => `<div class="acts-cell">${actBtn('restock', p.id, 'plus', 'Reponer +10')}${actBtn('edit', p.id, 'edit', 'Editar')}${actBtn('del', p.id, 'trash', 'Eliminar')}</div>` }],
    onRow: p => edit(db.get('products', p.id)),
    onAction: async (act, id) => {
      const p = db.get('products', id);
      if (act === 'edit') return edit(p);
      if (act === 'restock') { db.update('products', id, { stock: p.stock + 10 }); db.log('stock', `Reposición +10 ${p.name}`, auth.current()?.id); return toast(`${p.name}: stock ${p.stock + 10}`, 'success'); }
      if (await confirm(`¿Eliminar ${p.name}?`, { title: 'Eliminar producto', danger: true, ok: 'Eliminar' })) { db.remove('products', id); toast('Producto eliminado', 'success'); }
    },
    csv: { name: 'productos.csv', map: p => ({ sku: p.sku, producto: p.name, categoria: p.category, precio: p.price, stock: p.stock, vendidos_30d: p.sold }) }
  });
  v.querySelector('[data-new]').onclick = () => edit(null);
}
