// Productos: CRUD con código de barras, precio, costo, margen, stock mínimo y stock por sucursal.
import { html, raw, money, date, dateTime, toast, modal, confirm, escape, barChart } from '../../../assets/core/ui.js';
import { db, auth, settings, canEdit, category, stockAt, totalStock, margin, isLow, branchName, userName, valid, MOVE_TYPES, badge } from '../data/db.js';
import { pageHead, smartTable, exportCSV, log } from '../shared/common.js';
import { moveForm } from './inventory.js';

export function render(el) {
  const branches = db.query('branches', b => b.active);
  const rows = db.all('products').map(p => ({ ...p, cat: category(p.categoryId)?.name || '—', mg: margin(p), total: totalStock(p), low: p.trackStock && branches.some(b => isLow(p, b.id)) }));
  const edit = canEdit('products');
  el.innerHTML = html`${raw(pageHead('Productos', `${rows.length} productos · ${rows.filter(r => r.active).length} activos en caja`, `<button class="btn" data-csv>⬇ CSV</button>${edit ? '<button class="btn btn-primary" data-new>+ Nuevo producto</button>' : ''}`))}<div data-t></div>`;
  const t = smartTable(el.querySelector('[data-t]'), {
    key: 'pos-products', rows, pageSize: 15, search: r => `${r.name} ${r.sku} ${r.barcode} ${r.cat}`, defaultSort: { key: 'name', dir: 1 }, onRow: r => { location.hash = `#/productos/${r.id}`; },
    filters: [
      { key: 'categoryId', label: 'Categoría', options: db.all('categories').map(c => [c.id, c.name]) },
      { key: 'active', label: 'Estado', options: [['true', 'Activos'], ['false', 'Inactivos']], test: (r, v) => String(r.active) === v },
      { key: 'low', label: 'Stock', options: [['true', 'Bajo mínimo en alguna sucursal'], ['false', 'Sobre el mínimo']], test: (r, v) => String(r.low) === v }
    ],
    columns: [
      { key: 'name', label: 'Producto', render: r => html`<div class="cell-prod"><span class="emo">${r.emoji}</span><span><b>${r.name}</b><small class="mono">${r.sku}${r.barcode ? ' · ' + r.barcode : ''}</small></span></div>` },
      { key: 'cat', label: 'Categoría' },
      { key: 'price', label: 'Precio', render: r => `<b>${money(r.price)}</b>` },
      { key: 'cost', label: 'Costo', render: r => money(r.cost) },
      { key: 'mg', label: 'Margen', render: r => `<span class="badge badge-${r.mg > 55 ? 'success' : r.mg > 30 ? 'info' : 'warning'}">${r.mg.toFixed(0)}%</span>` },
      { key: 'total', label: 'Stock total', render: r => r.trackStock ? `<span class="stock-cell ${r.low ? 'low' : ''}" title="${branches.map(b => `${b.name}: ${stockAt(r, b.id)}`).join(' · ')}">${r.total}</span>` : '<span class="muted small">Preparado</span>' },
      { key: 'active', label: 'Estado', render: r => r.active ? '<span class="badge badge-success">Activo</span>' : '<span class="badge">Inactivo</span>' },
      { key: 'act', label: '', sort: false, class: 'actions', render: r => edit ? `<button class="btn btn-sm" data-edit="${r.id}">Editar</button><button class="btn btn-sm btn-ghost" data-del="${r.id}" aria-label="Eliminar">🗑</button>` : '' }
    ]
  });
  el.addEventListener('click', e => {
    if (e.target.closest('[data-new]')) productForm();
    const ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
    if (ed) productForm(db.get('products', ed.dataset.edit));
    if (del) remove(db.get('products', del.dataset.del));
    if (e.target.closest('[data-csv]')) exportCSV('productos', t.filtered().map(p => ({ sku: p.sku, codigo_barras: p.barcode, nombre: p.name, categoria: p.cat, precio: p.price, costo: p.cost, margen_pct: p.mg.toFixed(1), ...Object.fromEntries(branches.map(b => ['stock_' + b.code, stockAt(p, b.id)])), activo: p.active ? 'sí' : 'no' })));
  });
}

async function remove(p) {
  const sold = db.count('sales', s => s.items.some(i => i.productId === p.id));
  if (!await confirm(sold ? `${p.name} tiene ${sold} ventas registradas. Las boletas conservarán el detalle. Considera desactivarlo en su lugar. ¿Eliminar?` : `¿Eliminar ${p.name}?`, { title: 'Eliminar producto', danger: true, ok: 'Eliminar' })) return;
  db.remove('products', p.id);
  log('producto', `Eliminó ${p.name}`);
  toast('Producto eliminado', 'info');
  if (location.hash.startsWith('#/productos/')) location.hash = '#/productos';
}

export function productForm(p = null) {
  const isNew = !p;
  const branches = db.query('branches', b => b.active);
  const d = p || { name: '', categoryId: 'abarrotes', price: 1990, cost: 1000, emoji: '📦', unit: 'un', trackStock: true, minStock: 6, supplierId: '', active: true, favorite: false, sku: '', barcode: '', stock: {} };
  const form = document.createElement('form');
  form.className = 'stack';
  form.noValidate = true;
  form.innerHTML = html`<div class="form-grid">
      <div class="field full"><label for="pp-name">Nombre *</label><input class="input" id="pp-name" name="name" value="${d.name}"></div>
      <div class="field"><label for="pp-cat">Categoría</label><select class="select" id="pp-cat" name="categoryId">${db.all('categories').map(c => raw(html`<option value="${c.id}" ${c.id === d.categoryId ? 'selected' : ''}>${c.icon} ${c.name}</option>`))}</select></div>
      <div class="field"><label for="pp-emoji">Ícono (emoji)</label><input class="input" id="pp-emoji" name="emoji" value="${d.emoji}" maxlength="4"></div>
      <div class="field"><label for="pp-sku">SKU</label><input class="input" id="pp-sku" name="sku" value="${d.sku}" placeholder="Se genera si lo dejas vacío"></div>
      <div class="field"><label for="pp-bar">Código de barras (EAN-13)</label><input class="input" id="pp-bar" name="barcode" value="${d.barcode}" inputmode="numeric" placeholder="780…"></div>
      <div class="field"><label for="pp-price">Precio venta (IVA incl.) *</label><input class="input" id="pp-price" name="price" type="number" min="0" step="10" value="${d.price}"></div>
      <div class="field"><label for="pp-cost">Costo neto *</label><input class="input" id="pp-cost" name="cost" type="number" min="0" step="10" value="${d.cost}"></div>
      <div class="field"><label for="pp-unit">Unidad</label><select class="select" id="pp-unit" name="unit">${['un', 'taza', 'vaso', 'trozo', 'kg'].map(u => raw(`<option ${u === d.unit ? 'selected' : ''}>${u}</option>`))}</select></div>
      <div class="field"><label for="pp-sup">Proveedor</label><select class="select" id="pp-sup" name="supplierId"><option value="">—</option>${db.all('suppliers').map(s => raw(html`<option value="${s.id}" ${s.id === d.supplierId ? 'selected' : ''}>${s.name}</option>`))}</select></div>
      <div class="field"><label for="pp-min">Stock mínimo por sucursal</label><input class="input" id="pp-min" name="minStock" type="number" min="0" value="${d.minStock}"></div>
      <div class="field" style="justify-content:flex-end;gap:8px">
        <label class="check"><input type="checkbox" name="trackStock" ${d.trackStock ? 'checked' : ''}> Controla stock (desmarcar para preparados)</label>
        <label class="check"><input type="checkbox" name="favorite" ${d.favorite ? 'checked' : ''}> Mostrar en Favoritos de la caja</label>
        <label class="check"><input type="checkbox" name="active" ${d.active ? 'checked' : ''}> Activo (visible en caja)</label>
      </div>
    </div>
    <p class="small" data-margin style="margin:0"></p>
    ${isNew ? raw(html`<div><b>Stock inicial por sucursal</b><div class="form-grid" style="margin-top:8px">${branches.map(b => raw(html`<div class="field"><label for="st-${b.id}">${b.name}</label><input class="input" id="st-${b.id}" type="number" min="0" value="0" data-stock="${b.id}"></div>`))}</div></div>`)
      : raw(html`<p class="small muted" style="margin:0">Stock actual: ${branches.map(b => `${b.name} ${stockAt(d, b.id)}`).join(' · ')}. Para cambiarlo usa Entradas, Mermas o Ajustes en Inventario (queda registro).</p>`)}`;
  const upd = () => {
    const pr = +form.elements.price.value, c = +form.elements.cost.value;
    const neto = pr / (1 + (settings().iva || 19) / 100);
    const mg = neto ? (neto - c) / neto * 100 : 0;
    const el = form.querySelector('[data-margin]');
    el.innerHTML = `Precio neto ${money(neto)} · margen por unidad <b>${money(neto - c)}</b> (<b style="color:var(--${mg < 20 ? 'danger' : mg < 35 ? 'warning' : 'success'})">${mg.toFixed(1)}%</b>)`;
  };
  form.addEventListener('input', upd); upd();
  const m = modal({ title: isNew ? 'Nuevo producto' : `Editar · ${d.name}`, size: 'lg', body: form, foot: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-save>${isNew ? 'Crear' : 'Guardar'}</button>` });
  const save = e => {
    e && e.preventDefault();
    const f = form.elements;
    const name = f.name.value.trim(), price = Math.round(+f.price.value), cost = Math.round(+f.cost.value);
    f.name.classList.toggle('invalid', !name); f.price.classList.toggle('invalid', !(price > 0));
    if (!name || !(price > 0) || cost < 0) return toast('Nombre, precio y costo son obligatorios', 'warning');
    const barcode = f.barcode.value.replace(/\D/g, '');
    if (barcode && barcode.length !== 13) return toast('El código de barras debe tener 13 dígitos', 'warning');
    if (barcode && db.find('products', x => x.barcode === barcode && x.id !== p?.id)) return toast('Ese código de barras ya está asignado', 'warning');
    if (cost >= price / 1.19 && !window.confirm('El costo supera el precio neto (margen negativo). ¿Guardar igual?')) return;
    const n = db.count('products') + 1;
    const data = { name, categoryId: f.categoryId.value, emoji: f.emoji.value.trim() || '📦', sku: f.sku.value.trim() || `${f.categoryId.value.slice(0, 3).toUpperCase()}-${String(n).padStart(3, '0')}`, barcode, price, cost, unit: f.unit.value, supplierId: f.supplierId.value, minStock: Math.max(0, +f.minStock.value || 0), trackStock: f.trackStock.checked, favorite: f.favorite.checked, active: f.active.checked };
    if (db.find('products', x => x.sku === data.sku && x.id !== p?.id)) return toast('Ese SKU ya existe', 'warning');
    if (isNew) {
      const stock = {};
      form.querySelectorAll('[data-stock]').forEach(i => { stock[i.dataset.stock] = Math.max(0, +i.value || 0); });
      db.insert('products', { ...data, stock });
      log('producto', `Creó ${name} (${money(price)})`);
      toast('Producto creado · ya disponible en caja', 'success');
    } else {
      const ch = [];
      if (p.price !== price) ch.push(`precio ${money(p.price)} → ${money(price)}`);
      if (p.cost !== cost) ch.push(`costo ${money(p.cost)} → ${money(cost)}`);
      db.update('products', p.id, data);
      log('producto', `Editó ${name}${ch.length ? ': ' + ch.join(', ') : ''}`);
      toast('Cambios guardados · la caja se actualiza al instante', 'success');
    }
    m.close();
  };
  form.addEventListener('submit', save);
  m.el.querySelector('[data-save]').onclick = save;
}

export function detail(el, { id }) {
  const p = db.get('products', id);
  if (!p) { el.innerHTML = '<div class="empty card"><h2>Producto no encontrado</h2><a class="btn" href="#/productos">Volver</a></div>'; return; }
  const branches = db.query('branches', b => b.active);
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const days = settings().detailDays || 10;
  const sales = db.query('sales', s => valid(s) && s.items.some(i => i.productId === id));
  const perDay = Array.from({ length: days }, (_, k) => { const from = t0.getTime() - (days - 1 - k) * 864e5; return { label: new Date(from).getDate() + '', value: sales.filter(s => { const t = new Date(s.createdAt).getTime(); return t >= from && t < from + 864e5; }).reduce((a, s) => a + s.items.filter(i => i.productId === id).reduce((b, i) => b + i.qty, 0), 0) }; });
  const units = perDay.reduce((a, d) => a + d.value, 0);
  const moves = db.query('stockMoves', m => m.productId === id).slice(0, 10);
  const edit = canEdit('products'), inv = canEdit('inventory');
  el.innerHTML = html`<a class="small" href="#/productos">← Productos</a>
    ${raw(pageHead(`${p.emoji} ${p.name}`, `${category(p.categoryId)?.name} · SKU ${p.sku}${p.barcode ? ' · EAN ' + p.barcode : ''}`, edit ? '<button class="btn btn-danger" data-del>Eliminar</button><button class="btn btn-primary" data-edit>Editar</button>' : ''))}
    <div class="kpis">
      <div class="card stat"><span class="label">Precio</span><span class="value">${money(p.price)}</span><span class="small muted">Costo ${money(p.cost)}</span></div>
      <div class="card stat"><span class="label">Margen</span><span class="value">${margin(p).toFixed(1)}%</span><span class="small muted">${money(p.price / 1.19 - p.cost)} por unidad</span></div>
      <div class="card stat"><span class="label">Vendidas (${days} días)</span><span class="value">${units}</span><span class="small muted">${(units / days).toFixed(1)} por día</span></div>
      <div class="card stat"><span class="label">Stock total</span><span class="value">${p.trackStock ? totalStock(p) : '—'}</span><span class="small muted">${p.trackStock ? 'mínimo ' + p.minStock + ' por sucursal' : 'Producto preparado'}</span></div>
    </div>
    <div class="detail-grid">
      <div class="stack">
        <div class="card"><div class="card-head"><h3>Unidades vendidas por día</h3></div>${raw(barChart(perDay, { height: 160 }))}</div>
        <div class="card"><div class="card-head"><h3>Últimos movimientos</h3><a class="small" href="#/movimientos">Ver todos</a></div>
          ${moves.length ? raw(html`<ul class="list-plain">${moves.map(m => raw(html`<li><span>${raw(badge(MOVE_TYPES, m.type))} ${m.qty} u. · ${branchName(m.branchId)}${m.toBranchId ? ' → ' + branchName(m.toBranchId) : ''}<br><small class="muted">${m.note} · ${userName(m.userId)}</small></span><small class="muted">${dateTime(m.createdAt)}</small></li>`))}</ul>`) : raw('<p class="muted">Sin movimientos registrados.</p>')}</div>
      </div>
      <div class="card"><div class="card-head"><h3>Stock por sucursal</h3></div>
        ${p.trackStock ? raw(html`<ul class="list-plain">${branches.map(b => raw(html`<li><span><b>${b.name}</b><br><small class="muted">mínimo ${p.minStock}</small></span><span class="row" style="gap:6px"><span class="stock-cell ${stockAt(p, b.id) === 0 ? 'out' : isLow(p, b.id) ? 'low' : ''}">${stockAt(p, b.id)}</span>${inv ? raw(html`<button class="btn btn-sm" data-move="${b.id}">Mover</button>`) : ''}</span></li>`))}</ul>`) : raw('<p class="muted">Este producto se prepara al momento (no controla stock).</p>')}
        <dl class="kv" style="margin-top:14px"><dt>Proveedor</dt><dd>${db.get('suppliers', p.supplierId)?.name || '—'}</dd><dt>Unidad</dt><dd>${p.unit}</dd><dt>En favoritos</dt><dd>${p.favorite ? 'Sí' : 'No'}</dd><dt>Estado</dt><dd>${p.active ? 'Activo' : 'Inactivo'}</dd><dt>Creado</dt><dd>${date(p.createdAt)}</dd></dl>
      </div>
    </div>`;
  el.addEventListener('click', e => {
    if (e.target.closest('[data-edit]')) productForm(p);
    if (e.target.closest('[data-del]')) remove(p);
    const mv = e.target.closest('[data-move]');
    if (mv) moveForm({ productId: id, branchId: mv.dataset.move });
  });
}
