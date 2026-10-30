// Inventario por sucursal: aceites, filtros, baterías, neumáticos, frenos. Alertas de stock y ajustes.
import { escape, money, modal, toast, confirm, formModal } from '../../../assets/core/ui.js';
import { pageHead, smartTable } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { branches, branchName, lowStock } from '../shared/domain.js';
import { myBranch, branchOptions } from './common.js';
import { newPO } from './purchases.js';

const CATS = ['Aceites', 'Filtros', 'Baterías', 'Neumáticos', 'Frenos', 'Otros'];

function productModal(p, ctx) {
  const isNew = !p;
  const x = p || { sku: '', name: '', cat: 'Aceites', unit: 'un', price: 0, cost: 0, min: 5, supplierId: db.all('suppliers')[0]?.id, oil: '', active: true, stock: Object.fromEntries(branches(true).map(b => [b.id, 0])) };
  const f = document.createElement('form'); f.className = 'stack'; f.noValidate = true;
  f.innerHTML = `<div class="grid-3">
    <div class="field"><label for="pm-s">SKU *</label><input class="input" id="pm-s" name="sku" value="${escape(x.sku)}"></div>
    <div class="field" style="grid-column:span 2"><label for="pm-n">Nombre *</label><input class="input" id="pm-n" name="name" value="${escape(x.name)}"></div>
    <div class="field"><label for="pm-c">Categoría</label><select class="select" id="pm-c" name="cat">${CATS.map(c => `<option ${c === x.cat ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    <div class="field"><label for="pm-u">Unidad</label><select class="select" id="pm-u" name="unit">${['un', 'L', 'jgo', 'par'].map(c => `<option ${c === x.unit ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    <div class="field"><label for="pm-pr">Proveedor</label><select class="select" id="pm-pr" name="supplierId">${db.all('suppliers').map(s => `<option value="${s.id}" ${s.id === x.supplierId ? 'selected' : ''}>${escape(s.name)}</option>`).join('')}</select></div>
    <div class="field"><label for="pm-p">Precio venta *</label><input class="input" id="pm-p" name="price" type="number" min="0" value="${x.price}"></div>
    <div class="field"><label for="pm-co">Costo *</label><input class="input" id="pm-co" name="cost" type="number" min="0" value="${x.cost}"></div>
    <div class="field"><label for="pm-m">Stock mínimo por sucursal</label><input class="input" id="pm-m" name="min" type="number" min="0" value="${x.min}"></div></div>
    <fieldset class="fs"><legend>Stock por sucursal (ajuste manual)</legend><div class="grid-4">${branches(true).map(b => `<div class="field"><label for="pm-st-${b.id}">${escape(b.name)}</label><input class="input" id="pm-st-${b.id}" type="number" min="0" data-st="${b.id}" value="${x.stock[b.id] || 0}"></div>`).join('')}</div>
    <div class="field" style="margin-top:8px"><label for="pm-r">Motivo del ajuste</label><select class="select" id="pm-r" name="reason"><option>Conteo físico</option><option>Merma / producto dañado</option><option>Traspaso entre sucursales</option><option>Venta directa</option></select></div></fieldset>
    <label class="check"><input type="checkbox" name="active" ${x.active !== false ? 'checked' : ''}> Activo</label>`;
  const m = modal({ title: isNew ? 'Nuevo producto' : x.name, size: 'lg', body: f, foot: `${isNew ? '' : '<button class="btn btn-ghost" data-del>🗑 Eliminar</button>'}<span class="grow"></span><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-save>Guardar</button>` });
  m.el.querySelector('[data-save]').onclick = () => {
    const g = n => f.elements[n];
    const bad = { sku: !g('sku').value.trim(), name: g('name').value.trim().length < 3 };
    Object.entries(bad).forEach(([k, b]) => g(k).classList.toggle('invalid', b));
    if (bad.sku || bad.name) { toast('Completa SKU y nombre', 'warning'); return; }
    if (db.find('products', y => y.sku === g('sku').value.trim() && y.id !== p?.id)) { toast('Ese SKU ya existe', 'warning'); return; }
    const stock = Object.fromEntries([...f.querySelectorAll('[data-st]')].map(i => [i.dataset.st, Math.max(0, +i.value || 0)]));
    const data = { sku: g('sku').value.trim(), name: g('name').value.trim(), cat: g('cat').value, unit: g('unit').value, supplierId: g('supplierId').value, price: +g('price').value || 0, cost: +g('cost').value || 0, min: +g('min').value || 0, active: g('active').checked, stock };
    if (p) {
      const diffs = Object.entries(stock).filter(([b, n]) => n !== (p.stock[b] || 0)).map(([b, n]) => `${branchName(b)} ${p.stock[b] || 0}→${n}`);
      db.update('products', p.id, data);
      db.log('inventario', `${data.name}: ${diffs.length ? 'ajuste ' + diffs.join(', ') + ' (' + g('reason').value + ')' : 'ficha editada'}`, ctx.user.id);
    } else { db.insert('products', { ...data, oil: '' }); db.log('inventario', `Producto creado: ${data.name}`, ctx.user.id); }
    toast('Producto guardado', 'success'); m.close();
  };
  m.el.querySelector('[data-del]')?.addEventListener('click', async () => { if (await confirm(`¿Eliminar ${x.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('products', p.id); db.log('inventario', `Producto eliminado: ${x.name}`, ctx.user.id); m.close(); } });
}

export default {
  id: 'inventario', label: 'Inventario', icon: '📦', group: 'Catálogo', roles: ['admin', 'jefe'], watch: ['products', 'suppliers'],
  render(el, ctx) {
    const mb = myBranch(ctx);
    const low = lowStock(mb);
    el.innerHTML = `${pageHead('Inventario', 'Stock por sucursal con alertas de mínimo. El stock se descuenta solo al cobrar cada atención.', '<button class="btn btn-sm" data-po>🧾 OC para stock bajo</button><button class="btn btn-primary btn-sm" data-new>+ Producto</button>')}
      ${low.length ? `<p class="callout warn small">⚠️ <b>${low.length} productos</b> bajo el mínimo${mb ? ' en ' + escape(branchName(mb)) : ''}: ${low.slice(0, 5).map(p => escape(p.name)).join(', ')}${low.length > 5 ? '…' : ''}</p>` : ''}
      <div data-list></div>`;
    el.querySelector('[data-new]').onclick = () => productModal(null, ctx);
    el.querySelector('[data-po]').onclick = () => {
      if (!low.length) { toast('No hay productos bajo el mínimo', 'info'); return; }
      const bid = mb || Object.entries(low[0].stock).find(([, n]) => n < low[0].min)?.[0] || branches()[0].id;
      const items = lowStock(bid);
      const sup = items[0].supplierId;
      newPO(ctx, { supplierId: sup, branchId: bid, lines: items.filter(p => p.supplierId === sup).map(p => ({ productId: p.id, qty: Math.max(p.min * 2 - (p.stock[bid] || 0), 1), cost: p.cost })) });
    };
    const bs = branches(true);
    return smartTable(el.querySelector('[data-list]'), {
      rows: () => db.all('products').map(p => ({ ...p, total: bs.reduce((s, b) => s + (p.stock[b.id] || 0), 0), isLow: bs.some(b => (p.stock[b.id] || 0) < p.min), value: bs.reduce((s, b) => s + (p.stock[b.id] || 0), 0) * p.cost })),
      filters: [{ key: 'cat', label: 'Categoría', options: CATS }, { key: 'isLow', label: 'Alerta', options: [['true', 'Bajo mínimo']], test: (r, v) => String(r.isLow) === v }, { key: 'supplierId', label: 'Proveedor', options: db.all('suppliers').map(s => [s.id, s.name]) }],
      search: r => `${r.sku} ${r.name}`,
      columns: [
        { key: 'name', label: 'Producto', render: r => `<b>${escape(r.name)}</b><small class="muted d-block"><code>${escape(r.sku)}</code> · ${escape(r.cat)}${r.active === false ? ' · inactivo' : ''}</small>` },
        ...bs.map(b => ({ key: 'st_' + b.id, label: b.name, sort: false, render: r => `<span class="${(r.stock[b.id] || 0) < r.min ? 'stock-low' : ''}">${r.stock[b.id] || 0} ${escape(r.unit)}</span>` })),
        { key: 'min', label: 'Mín.' },
        { key: 'price', label: 'Precio', render: r => money(r.price) },
        { key: 'value', label: 'Valor stock', render: r => money(r.value) }
      ],
      onRow: r => productModal(db.get('products', r.id), ctx),
      csv: { name: 'inventario', map: r => ({ sku: r.sku, producto: r.name, categoria: r.cat, ...Object.fromEntries(bs.map(b => [b.name, r.stock[b.id] || 0])), minimo: r.min, costo: r.cost, precio: r.price }) }
    });
  }
};
export { branchOptions };
