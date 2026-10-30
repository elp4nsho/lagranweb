// Inventario por variante: alertas de stock bajo, ajustes (ingreso/merma/conteo) y movimientos.
import { html, raw, money, dateTime, toast, formModal, escape } from '../../../assets/core/ui.js';
import { db, settings, category, colorHex, variantBySku } from '../data/db.js';
import { productArt } from '../shared/art.js';
import { pageHead, smartTable, exportCSV, log, me } from './common.js';

export function lowStockList() {
  const th = settings().lowStock || 5;
  const out = [];
  db.query('products', p => p.status === 'activo').forEach(p => p.variants.forEach(v => { if (v.stock <= th) out.push({ product: p, v, hex: colorHex(p, v.color) }); }));
  return out.sort((a, b) => a.v.stock - b.v.stock);
}

let tab = 'variantes';

export async function adjust(p, sku) {
  const v = variantBySku(p, sku);
  const d = await formModal({ title: `Ajustar stock · ${p.name} (${v.color}, ${v.size})`, submit: 'Registrar', fields: [
    { name: 'type', label: 'Tipo de movimiento', type: 'select', value: 'ingreso', options: [['ingreso', 'Ingreso (suma)'], ['merma', 'Merma / falla (resta)'], ['ajuste', 'Conteo físico (fija el valor)']] },
    { name: 'qty', label: 'Cantidad', type: 'number', value: 10, required: true, help: `Stock actual: ${v.stock}` },
    { name: 'note', label: 'Nota', value: '', placeholder: 'Ej: guía de despacho 4512' }
  ] });
  if (!d) return;
  const q = Math.abs(Math.round(d.qty));
  let next = v.stock, delta;
  if (d.type === 'ingreso') next = v.stock + q;
  else if (d.type === 'merma') next = Math.max(0, v.stock - q);
  else next = q;
  delta = next - v.stock;
  db.update('products', p.id, x => { variantBySku(x, sku).stock = next; return { variants: x.variants }; });
  db.insert('stockMoves', { productId: p.id, sku, type: d.type, qty: delta, note: d.note || '', userId: me().id });
  log('inventario', `${p.name} ${v.color}/${v.size}: ${v.stock} → ${next} (${d.type})`);
  toast(`Stock actualizado: ${next} unidades`, 'success');
}

export function render(el) {
  const th = settings().lowStock || 5;
  const rows = [];
  db.all('products').forEach(p => p.variants.forEach(v => rows.push({ id: v.sku, p, sku: v.sku, name: p.name, color: v.color, size: v.size, stock: v.stock, cat: p.categoryId, status: v.stock === 0 ? 'agotado' : v.stock <= th ? 'bajo' : 'ok', pstatus: p.status })));
  const total = rows.reduce((s, r) => s + r.stock, 0);
  const value = db.all('products').reduce((s, p) => s + p.variants.reduce((t, v) => t + v.stock, 0) * p.cost, 0);
  const low = rows.filter(r => r.status === 'bajo' && r.pstatus === 'activo').length, out = rows.filter(r => r.status === 'agotado' && r.pstatus === 'activo').length;
  el.innerHTML = html`${raw(pageHead('Inventario', `Umbral de stock bajo: ${th} unidades (configurable en Ajustes).`, '<button class="btn" data-csv>⬇ Exportar CSV</button>'))}
    <div class="kpis">
      <div class="card stat"><span class="label">Unidades en bodega</span><span class="value">${total.toLocaleString('es-CL')}</span></div>
      <div class="card stat"><span class="label">Valor a costo</span><span class="value">${money(value)}</span></div>
      <div class="card stat"><span class="label">Variantes con stock bajo</span><span class="value" style="color:var(--warning)">${low}</span></div>
      <div class="card stat"><span class="label">Variantes agotadas</span><span class="value" style="color:var(--danger)">${out}</span></div>
    </div>
    <div class="tabs"><button class="tab ${tab === 'variantes' ? 'active' : ''}" data-tab="variantes">Stock por variante</button><button class="tab ${tab === 'movs' ? 'active' : ''}" data-tab="movs">Movimientos</button></div>
    <div data-table></div>`;
  const box = el.querySelector('[data-table]');
  let table;
  if (tab === 'variantes') {
    table = smartTable(box, {
      key: 'inv', rows, pageSize: 15, search: r => `${r.name} ${r.sku} ${r.color} ${r.size}`, defaultSort: { key: 'stock', dir: 1 },
      filters: [
        { key: 'status', label: 'Estado', options: [['agotado', 'Agotado'], ['bajo', 'Stock bajo'], ['ok', 'Normal']] },
        { key: 'cat', label: 'Categoría', options: db.all('categories').map(c => [c.id, c.name]) }
      ],
      columns: [
        { key: 'name', label: 'Producto', render: r => html`<div class="cell-prod"><span class="mini-thumb">${raw(productArt(r.p, colorHex(r.p, r.color)))}</span><span><b>${r.name}</b><small>${r.pstatus !== 'activo' ? r.pstatus : category(r.cat)?.name}</small></span></div>` },
        { key: 'sku', label: 'SKU', render: r => `<span class="mono small">${escape(r.sku)}</span>` },
        { key: 'color', label: 'Color' }, { key: 'size', label: 'Talla' },
        { key: 'stock', label: 'Stock', render: r => `<div class="row" style="gap:6px;flex-wrap:nowrap"><button class="btn btn-sm btn-icon" data-dec="${escape(r.sku)}" aria-label="Restar 1">−</button><b style="min-width:28px;text-align:center">${r.stock}</b><button class="btn btn-sm btn-icon" data-inc="${escape(r.sku)}" aria-label="Sumar 1">+</button></div>` },
        { key: 'status', label: 'Estado', render: r => r.status === 'agotado' ? '<span class="badge badge-danger">Agotado</span>' : r.status === 'bajo' ? '<span class="badge badge-warning">Bajo</span>' : '<span class="badge badge-success">OK</span>' },
        { key: 'act', label: '', sort: false, class: 'actions', render: r => `<button class="btn btn-sm" data-adj="${escape(r.sku)}">Ajustar</button>` }
      ]
    });
  } else {
    const moves = db.all('stockMoves').map(m => ({ ...m, pname: db.get('products', m.productId)?.name || '—', uname: db.get('users', m.userId)?.name || '—' }));
    table = smartTable(box, {
      key: 'moves', rows: moves, search: m => `${m.pname} ${m.sku} ${m.note}`, defaultSort: { key: 'createdAt', dir: -1 },
      filters: [{ key: 'type', label: 'Tipo', options: [['ingreso', 'Ingreso'], ['merma', 'Merma'], ['ajuste', 'Ajuste']] }],
      columns: [
        { key: 'createdAt', label: 'Fecha', render: m => dateTime(m.createdAt) },
        { key: 'pname', label: 'Producto', render: m => html`<b>${m.pname}</b><br><small class="mono muted">${m.sku}</small>` },
        { key: 'type', label: 'Tipo', render: m => `<span class="badge badge-${m.type === 'ingreso' ? 'success' : m.type === 'merma' ? 'danger' : 'info'}">${m.type}</span>` },
        { key: 'qty', label: 'Cantidad', render: m => `<b style="color:var(--${m.qty >= 0 ? 'success' : 'danger'})">${m.qty > 0 ? '+' : ''}${m.qty}</b>` },
        { key: 'note', label: 'Nota' }, { key: 'uname', label: 'Usuario' }
      ]
    });
  }
  el.addEventListener('click', e => {
    const t = e.target.closest('[data-tab]');
    if (t) { tab = t.dataset.tab; const n = document.createElement('div'); n.className = el.className; n.style.cssText = el.style.cssText; el.replaceWith(n); render(n); return; }
    const find = sku => rows.find(r => r.sku === sku);
    const inc = e.target.closest('[data-inc]'), dec = e.target.closest('[data-dec]'), adj = e.target.closest('[data-adj]');
    if (inc || dec) {
      const r = find((inc || dec).dataset[inc ? 'inc' : 'dec']);
      const d = inc ? 1 : -1;
      if (r.stock + d < 0) return;
      db.update('products', r.p.id, x => { variantBySku(x, r.sku).stock += d; return { variants: x.variants }; });
      db.insert('stockMoves', { productId: r.p.id, sku: r.sku, type: 'ajuste', qty: d, note: 'Ajuste rápido', userId: me().id });
      log('inventario', `${r.name} ${r.color}/${r.size}: ${d > 0 ? '+1' : '−1'}`);
    }
    if (adj) { const r = find(adj.dataset.adj); adjust(r.p, r.sku); }
    if (e.target.closest('[data-csv]')) exportCSV('inventario', rows.map(r => ({ sku: r.sku, producto: r.name, color: r.color, talla: r.size, stock: r.stock, estado: r.status })));
  });
}
