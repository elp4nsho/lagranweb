// Stock por sucursal (matriz producto × sucursal) con entradas, mermas, transferencias y ajustes.
import { html, raw, money, toast, modal, escape } from '../../../assets/core/ui.js';
import { db, auth, canEdit, category, stockAt, totalStock, isLow, applyMove, MOVE_TYPES } from '../data/db.js';
import { pageHead, smartTable, exportCSV } from '../shared/common.js';

// Formulario de movimiento de stock (también se usa desde la ficha de producto).
export function moveForm({ productId = '', branchId = '', type = 'entrada' } = {}) {
  const branches = db.query('branches', b => b.active);
  const u = auth.current();
  const prods = db.query('products', p => p.trackStock).sort((a, b) => a.name.localeCompare(b.name));
  const form = document.createElement('form');
  form.className = 'stack';
  form.noValidate = true;
  form.innerHTML = html`<div class="form-grid">
      <div class="field"><label for="mv-type">Tipo</label><select class="select" id="mv-type" name="type">${Object.entries(MOVE_TYPES).map(([k, v]) => raw(`<option value="${k}" ${k === type ? 'selected' : ''}>${v[0]}</option>`))}</select></div>
      <div class="field"><label for="mv-prod">Producto</label><select class="select" id="mv-prod" name="productId">${prods.map(p => raw(html`<option value="${p.id}" ${p.id === productId ? 'selected' : ''}>${p.emoji} ${p.name}</option>`))}</select></div>
      <div class="field"><label for="mv-branch">Sucursal</label><select class="select" id="mv-branch" name="branchId">${branches.map(b => raw(html`<option value="${b.id}" ${b.id === (branchId || u.branchId) ? 'selected' : ''}>${b.name}</option>`))}</select></div>
      <div class="field" data-to><label for="mv-to">Hacia sucursal</label><select class="select" id="mv-to" name="toBranchId">${branches.map(b => raw(html`<option value="${b.id}">${b.name}</option>`))}</select></div>
      <div class="field"><label for="mv-qty" data-qlabel>Cantidad</label><input class="input" id="mv-qty" name="qty" type="number" value="10"></div>
      <div class="field"><label for="mv-note">Nota</label><input class="input" id="mv-note" name="note" placeholder="Ej: guía de despacho 8812"></div>
    </div><p class="small muted" data-hint style="margin:0"></p>`;
  const upd = () => {
    const f = form.elements, p = db.get('products', f.productId.value), t = f.type.value;
    form.querySelector('[data-to]').style.display = t === 'transferencia' ? '' : 'none';
    form.querySelector('[data-qlabel]').textContent = t === 'ajuste' ? 'Diferencia (+/−)' : 'Cantidad';
    form.querySelector('[data-hint]').textContent = `Stock actual en sucursal: ${stockAt(p, f.branchId.value)}${t === 'transferencia' ? ` · destino: ${stockAt(p, f.toBranchId.value)}` : ''}`;
  };
  form.addEventListener('input', upd);
  if (branches[1]) form.elements.toBranchId.value = branches.find(b => b.id !== form.elements.branchId.value)?.id;
  upd();
  const m = modal({ title: 'Movimiento de inventario', size: 'lg', body: form, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-save>Registrar</button>' });
  const save = e => {
    e && e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const q = Math.round(+d.qty);
    if (!q || (d.type !== 'ajuste' && q < 0)) return toast('Cantidad inválida', 'warning');
    const p = db.get('products', d.productId);
    if (d.type === 'transferencia') {
      if (d.toBranchId === d.branchId) return toast('Origen y destino deben ser distintos', 'warning');
      if (q > stockAt(p, d.branchId)) return toast(`Solo hay ${stockAt(p, d.branchId)} en origen`, 'warning');
    }
    if (d.type === 'merma' && q > stockAt(p, d.branchId)) return toast('La merma supera el stock', 'warning');
    applyMove({ ...d, qty: q, toBranchId: d.type === 'transferencia' ? d.toBranchId : null, note: d.note || MOVE_TYPES[d.type][0] }, auth.current());
    toast('Movimiento registrado', 'success');
    m.close();
  };
  form.addEventListener('submit', save);
  m.el.querySelector('[data-save]').onclick = save;
}

export function render(el, _p, query = {}) {
  const branches = db.query('branches', b => b.active);
  const rows = db.query('products', p => p.trackStock).map(p => ({ ...p, cat: category(p.categoryId)?.name, total: totalStock(p), low: branches.some(b => isLow(p, b.id)), value: totalStock(p) * p.cost }));
  const edit = canEdit('inventory');
  const lowN = rows.reduce((s, p) => s + branches.filter(b => isLow(p, b.id)).length, 0);
  el.innerHTML = html`${raw(pageHead('Stock por sucursal', 'Inventario valorizado a costo. Celdas en color: bajo el mínimo.', `<button class="btn" data-csv>⬇ CSV</button>${edit ? '<button class="btn" data-type="merma">− Merma</button><button class="btn" data-type="transferencia">⇄ Transferir</button><button class="btn btn-primary" data-type="entrada">+ Entrada</button>' : ''}`))}
    <div class="kpis">
      <div class="card stat"><span class="label">Unidades totales</span><span class="value">${rows.reduce((s, r) => s + r.total, 0).toLocaleString('es-CL')}</span></div>
      <div class="card stat"><span class="label">Valor a costo</span><span class="value">${money(rows.reduce((s, r) => s + r.value, 0))}</span></div>
      <div class="card stat"><span class="label">Bajo mínimo</span><span class="value" style="color:var(--warning)">${lowN}</span><span class="small muted">producto-sucursal</span></div>
      <div class="card stat"><span class="label">Agotados</span><span class="value" style="color:var(--danger)">${rows.reduce((s, p) => s + branches.filter(b => stockAt(p, b.id) === 0).length, 0)}</span></div>
    </div><div data-t></div>`;
  const t = smartTable(el.querySelector('[data-t]'), {
    key: 'inv' + (query.bajo ? '-low' : ''), rows, pageSize: 15, search: r => `${r.name} ${r.sku} ${r.barcode}`, defaultSort: { key: 'name', dir: 1 },
    filters: [
      { key: 'categoryId', label: 'Categoría', options: db.all('categories').filter(c => rows.some(r => r.categoryId === c.id)).map(c => [c.id, c.name]) },
      { key: 'low', label: 'Alerta', options: [['true', 'Bajo mínimo'], ['false', 'OK']], test: (r, v) => String(r.low) === v }
    ],
    columns: [
      { key: 'name', label: 'Producto', render: r => html`<a class="cell-prod" href="#/productos/${r.id}"><span class="emo">${r.emoji}</span><span><b>${r.name}</b><small>${r.cat} · mín. ${r.minStock}</small></span></a>` },
      ...branches.map(b => ({ key: 'b_' + b.id, label: b.name.replace('Pampa ', ''), value: r => stockAt(r, b.id), render: r => { const n = stockAt(r, b.id); return `<span class="stock-cell ${n === 0 ? 'out' : n <= r.minStock ? 'low' : ''}">${n}</span>`; } })),
      { key: 'total', label: 'Total', render: r => `<b>${r.total}</b>` },
      { key: 'value', label: 'Valor', render: r => money(r.value) },
      { key: 'act', label: '', sort: false, class: 'actions', render: r => edit ? `<button class="btn btn-sm" data-mv="${escape(r.id)}">Mover</button>` : '' }
    ]
  });
  if (query.bajo) { const s = el.querySelector('[data-f="low"]'); if (s && s.value !== 'true') { s.value = 'true'; s.dispatchEvent(new Event('change')); } }
  el.addEventListener('click', e => {
    const ty = e.target.closest('[data-type]'), mv = e.target.closest('[data-mv]');
    if (ty) moveForm({ type: ty.dataset.type });
    if (mv) moveForm({ productId: mv.dataset.mv });
    if (e.target.closest('[data-csv]')) exportCSV('stock-sucursales', t.filtered().map(r => ({ sku: r.sku, producto: r.name, ...Object.fromEntries(branches.map(b => [b.name, stockAt(r, b.id)])), total: r.total, minimo: r.minStock, valor_costo: r.value })));
  });
}
