// Inventario de insumos: stock, mínimos, alertas, ajustes y reposición.
import { escape, toast, confirm, formModal, money } from '../../../assets/core/ui.js';
import { pageHead, smartTable, kpi } from '../shared/admin-kit.js';
import { db } from '../data/db.js';

const fmtQ = (n, u) => `${Number(n).toLocaleString('es-CL', { maximumFractionDigits: 2 })} ${u}`;
const level = i => i.stock <= i.min * .5 ? 'critico' : i.stock <= i.min ? 'bajo' : 'ok';
const LEVEL = { critico: ['Crítico', 'danger'], bajo: ['Bajo mínimo', 'warning'], ok: ['OK', 'success'] };

async function editIng(i, ctx) {
  const v = await formModal({ title: i ? `Editar · ${i.name}` : 'Nuevo insumo', fields: [
    { name: 'name', label: 'Nombre', required: true, value: i?.name }, { name: 'category', label: 'Categoría', type: 'select', options: ['Carnes', 'Mar', 'Verduras', 'Frutas', 'Lácteos', 'Secos', 'Bebidas', 'Insumos'], value: i?.category || 'Verduras' },
    { name: 'unit', label: 'Unidad', type: 'select', options: ['kg', 'l', 'un'], value: i?.unit || 'kg' }, { name: 'stock', label: 'Stock actual', type: 'number', step: '0.1', required: true, value: i?.stock ?? 0 },
    { name: 'min', label: 'Stock mínimo (alerta)', type: 'number', step: '0.1', required: true, value: i?.min ?? 1 }, { name: 'cost', label: 'Costo por unidad (CLP)', type: 'number', value: i?.cost ?? 1000 },
    { name: 'supplier', label: 'Proveedor', value: i?.supplier }] });
  if (!v) return;
  if (i) db.update('ingredients', i.id, v); else db.insert('ingredients', v);
  db.log('inventario', `Insumo ${i ? 'editado' : 'creado'}: ${v.name}`, ctx.user.id); toast('Insumo guardado', 'success');
}

async function adjust(i, ctx) {
  const v = await formModal({ title: `Movimiento · ${i.name}`, fields: [
    { name: 'type', label: 'Tipo', type: 'select', options: [['in', 'Entrada (compra/reposición)'], ['out', 'Salida (merma/consumo)'], ['set', 'Conteo físico (fijar stock)']], value: 'in' },
    { name: 'qty', label: `Cantidad (${i.unit})`, type: 'number', step: '0.1', required: true }, { name: 'note', label: 'Nota', placeholder: 'Factura, motivo de merma…' }] });
  if (!v || !(v.qty >= 0)) return;
  const stock = Math.max(0, Math.round((v.type === 'in' ? i.stock + v.qty : v.type === 'out' ? i.stock - v.qty : v.qty) * 100) / 100);
  db.update('ingredients', i.id, { stock, lastMove: new Date().toISOString() });
  db.log('inventario', `${i.name}: ${fmtQ(i.stock, i.unit)} → ${fmtQ(stock, i.unit)}${v.note ? ` (${v.note})` : ''}`, ctx.user.id);
  toast('Stock actualizado', 'success');
}

export default {
  id: 'inventario', label: 'Inventario', icon: '📦', group: 'Gestión', roles: ['admin', 'chef'], watch: ['ingredients'],
  render(el, ctx) {
    const all = db.all('ingredients');
    const low = all.filter(i => level(i) !== 'ok');
    const value = all.reduce((a, i) => a + i.stock * i.cost, 0);
    el.innerHTML = `${pageHead('Inventario', 'El stock se descuenta automáticamente según la receta de cada plato pedido', `<button class="btn btn-sm" data-restock ${low.length ? '' : 'disabled'}>Reponer todo lo bajo</button><button class="btn btn-primary btn-sm" data-new>+ Insumo</button>`)}
      <div class="kpi-grid">${kpi('Insumos', String(all.length))}${kpi('Bajo mínimo', String(low.length), low.filter(i => level(i) === 'critico').length + ' críticos', !low.length)}${kpi('Valor del inventario', money(value))}</div>
      ${low.length ? `<div class="card alert-card stack"><b>⚠️ Alertas de stock</b><div class="row">${low.map(i => `<span class="badge badge-${LEVEL[level(i)][1]}">${escape(i.name)} · ${fmtQ(i.stock, i.unit)} (mín. ${fmtQ(i.min, i.unit)})</span>`).join('')}</div></div>` : ''}
      <div data-list></div>`;
    el.addEventListener('click', async e => {
      if (e.target.closest('[data-new]')) editIng(null, ctx);
      const a = e.target.closest('[data-adj]'); if (a) adjust(db.get('ingredients', a.dataset.adj), ctx);
      if (e.target.closest('[data-restock]')) {
        const lows = db.all('ingredients').filter(i => level(i) !== 'ok');
        if (!await confirm(`Se generará una reposición para ${lows.length} insumos hasta el doble del mínimo.`, { ok: 'Reponer' })) return;
        lows.forEach(i => db.update('ingredients', i.id, { stock: i.min * 2, lastMove: new Date().toISOString() }));
        db.log('inventario', `Reposición masiva de ${lows.length} insumos`, ctx.user.id); toast('Pedido a proveedores registrado', 'success');
      }
      const d = e.target.closest('[data-delins]');
      if (d) { const i = db.get('ingredients', d.dataset.delins); if (await confirm(`¿Eliminar ${i.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('ingredients', i.id); db.log('inventario', `Insumo eliminado: ${i.name}`, ctx.user.id); } }
    });
    return smartTable(el.querySelector('[data-list]'), {
      rows: () => db.all('ingredients').map(i => ({ ...i, lvl: level(i), ratio: i.min ? i.stock / i.min : 9 })),
      filters: [
        { key: 'category', label: 'Categoría', options: [...new Set(db.all('ingredients').map(i => i.category))].sort() },
        { key: 'lvl', label: 'Nivel', options: [['critico', 'Crítico'], ['bajo', 'Bajo mínimo'], ['ok', 'OK']] },
        { key: 'supplier', label: 'Proveedor', options: [...new Set(db.all('ingredients').map(i => i.supplier))].sort() }
      ],
      search: r => `${r.name} ${r.supplier}`,
      pageSize: 12,
      columns: [
        { key: 'name', label: 'Insumo', render: r => `<b>${escape(r.name)}</b><small class="muted d-block">${escape(r.category)}</small>` },
        { key: 'ratio', label: 'Stock', render: r => `<div class="stock-cell"><span>${fmtQ(r.stock, r.unit)}</span><div class="progress ${r.lvl}"><i style="--v:${Math.min(100, r.ratio * 50).toFixed(0)}%"></i></div></div>` },
        { key: 'min', label: 'Mínimo', render: r => fmtQ(r.min, r.unit) },
        { key: 'cost', label: 'Costo', render: r => `${money(r.cost)}/${r.unit}` },
        { key: 'supplier', label: 'Proveedor', render: r => `<small>${escape(r.supplier || '')}</small>` },
        { key: 'lvl', label: 'Estado', render: r => `<span class="badge badge-${LEVEL[r.lvl][1]}">${LEVEL[r.lvl][0]}</span>` },
        { key: 'id', label: '', sort: false, render: r => `<span class="nowrap"><button class="btn btn-sm" data-adj="${r.id}">± Stock</button> <button class="btn btn-sm btn-ghost" data-delins="${r.id}" aria-label="Eliminar">🗑</button></span>` }
      ],
      onRow: r => editIng(db.get('ingredients', r.id), ctx),
      csv: { name: 'inventario', map: r => ({ insumo: r.name, categoria: r.category, stock: r.stock, unidad: r.unit, minimo: r.min, costo: r.cost, proveedor: r.supplier, estado: LEVEL[r.lvl][0] }) }
    });
  }
};
