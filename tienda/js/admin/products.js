// Productos: CRUD completo con variantes (talla × color), stock por variante, ilustración y estado.
import { html, raw, money, date, toast, modal, confirm, escape, lineChart, slug } from '../../../assets/core/ui.js';
import { db, category, productStock, productRating, colorHex, statusBadge, can } from '../data/db.js';
import { productArt, SHAPE_OPTIONS } from '../shared/art.js';
import { pageHead, smartTable, exportCSV, log } from './common.js';
import { adjust } from './inventory.js';

const PSTATUS = { activo: ['Activo', 'success'], borrador: ['Borrador', 'warning'], archivado: ['Archivado', 'danger'] };
const pBadge = s => `<span class="badge badge-${PSTATUS[s]?.[1] || 'info'}">${PSTATUS[s]?.[0] || s}</span>`;
const SHAPE_LABEL = { tee: 'Polera', longsleeve: 'Manga larga', shirt: 'Camisa', hoodie: 'Polerón capucha', crew: 'Polerón cuello redondo', jacket: 'Chaqueta', parka: 'Parka', pants: 'Pantalón', shorts: 'Short', dress: 'Vestido', skirt: 'Falda', sneaker: 'Zapatilla', boot: 'Botín', cap: 'Jockey', tote: 'Bolso', beanie: 'Gorro', socks: 'Calcetines', backpack: 'Mochila', scarf: 'Bufanda' };

export function render(el) {
  const th = db.getValue('settings', {}).lowStock || 5;
  const rows = db.all('products').map(p => ({ ...p, stock: productStock(p), rating: productRating(p).avg, catName: category(p.categoryId)?.name || '—' }));
  el.innerHTML = html`${raw(pageHead('Productos', `${rows.length} productos · ${rows.filter(r => r.status === 'activo').length} activos en la tienda`, '<button class="btn" data-csv>⬇ CSV</button><button class="btn btn-primary" data-new>+ Nuevo producto</button>'))}<div data-t></div>`;
  const t = smartTable(el.querySelector('[data-t]'), {
    key: 'products', rows, search: r => `${r.name} ${r.catName} ${r.variants.map(v => v.sku).join(' ')} ${(r.tags || []).join(' ')}`,
    defaultSort: { key: 'name', dir: 1 },
    filters: [
      { key: 'categoryId', label: 'Categoría', options: db.all('categories').map(c => [c.id, c.name]) },
      { key: 'status', label: 'Estado', options: Object.entries(PSTATUS).map(([k, v]) => [k, v[0]]) },
      { key: 'stockF', label: 'Stock', options: [['out', 'Agotado'], ['low', 'Stock bajo'], ['ok', 'Con stock']], test: (r, v) => v === 'out' ? r.stock === 0 : v === 'low' ? r.variants.some(x => x.stock <= th) : r.stock > 0 }
    ],
    onRow: r => { location.hash = `#/productos/${r.id}`; },
    columns: [
      { key: 'name', label: 'Producto', render: r => html`<div class="cell-prod"><span class="mini-thumb">${raw(productArt(r, r.colors[0]?.hex))}</span><span><b>${r.name}</b><small>${r.catName} · ${r.variants.length} variantes</small></span></div>` },
      { key: 'price', label: 'Precio', render: r => `${money(r.price)}${r.comparePrice > r.price ? `<br><small class="strike">${money(r.comparePrice)}</small>` : ''}` },
      { key: 'stock', label: 'Stock', render: r => `<b style="color:var(--${r.stock === 0 ? 'danger' : r.variants.some(v => v.stock <= th) ? 'warning' : 'text'})">${r.stock}</b>` },
      { key: 'sold', label: 'Vendidos' },
      { key: 'rating', label: 'Valoración', render: r => r.rating ? `★ ${r.rating.toFixed(1)}` : '<span class="muted">—</span>' },
      { key: 'status', label: 'Estado', render: r => pBadge(r.status) + (r.featured ? ' <span class="badge badge-primary plain">Destacado</span>' : '') },
      { key: 'act', label: '', sort: false, class: 'actions', render: r => `<button class="btn btn-sm" data-edit="${r.id}">Editar</button><button class="btn btn-sm btn-ghost" data-dup="${r.id}" title="Duplicar">⧉</button><button class="btn btn-sm btn-ghost" data-del="${r.id}" title="Eliminar" aria-label="Eliminar">🗑</button>` }
    ]
  });
  el.addEventListener('click', e => {
    if (e.target.closest('[data-new]')) productForm();
    const ed = e.target.closest('[data-edit]'), dup = e.target.closest('[data-dup]'), del = e.target.closest('[data-del]');
    if (ed) productForm(db.get('products', ed.dataset.edit));
    if (dup) duplicate(db.get('products', dup.dataset.dup));
    if (del) remove(db.get('products', del.dataset.del));
    if (e.target.closest('[data-csv]')) exportCSV('productos', t.filtered().map(p => ({ id: p.id, nombre: p.name, categoria: p.catName, precio: p.price, precio_antes: p.comparePrice || '', costo: p.cost, stock: p.stock, vendidos: p.sold, estado: p.status })));
  });
}

function duplicate(p) {
  const copy = JSON.parse(JSON.stringify(p));
  delete copy.id; delete copy.createdAt;
  const id = 'p' + Date.now().toString(36).slice(-4);
  copy.id = id; copy.name = p.name + ' (copia)'; copy.status = 'borrador'; copy.sold = 0; copy.featured = false;
  copy.variants.forEach(v => { v.sku = v.sku.replace(/^RZ-[^-]+/, 'RZ-' + id.toUpperCase()); v.stock = 0; });
  db.insert('products', copy);
  log('producto', `Duplicó ${p.name}`);
  toast('Producto duplicado como borrador', 'success');
}

async function remove(p) {
  const n = db.count('orders', o => o.items.some(i => i.productId === p.id));
  const ok = await confirm(n ? `${p.name} aparece en ${n} pedidos. Los pedidos conservarán el detalle, pero el producto desaparecerá de la tienda. Considera archivarlo. ¿Eliminar igualmente?` : `¿Eliminar ${p.name}? Esta acción no se puede deshacer.`, { title: 'Eliminar producto', ok: 'Eliminar', danger: true });
  if (!ok) return;
  db.remove('products', p.id);
  log('producto', `Eliminó ${p.name}`);
  toast('Producto eliminado', 'info');
  if (location.hash.startsWith('#/productos/')) location.hash = '#/productos';
}

// Formulario de producto con editor de colores, tallas y stock por variante + vista previa.
export function productForm(p = null) {
  const isNew = !p;
  const d = p ? JSON.parse(JSON.stringify(p)) : { name: '', categoryId: db.all('categories')[0]?.id, status: 'borrador', price: 19990, comparePrice: 0, cost: 7000, description: '', tags: [], featured: false, shape: 'tee', sizes: ['S', 'M', 'L'], colors: [{ name: 'Hueso', hex: '#e9e1d3' }], variants: [] };
  const stockMap = Object.fromEntries((d.variants || []).map(v => [`${v.size}|${v.color}`, v.stock]));
  const form = document.createElement('form');
  form.className = 'stack';
  form.noValidate = true;
  form.innerHTML = html`<div class="grid-2" style="align-items:start">
      <div class="stack">
        <div class="field"><label for="pf-name">Nombre *</label><input class="input" id="pf-name" name="name" value="${d.name}" required></div>
        <div class="form-grid">
          <div class="field"><label for="pf-cat">Categoría</label><select class="select" id="pf-cat" name="categoryId">${db.all('categories').map(c => raw(html`<option value="${c.id}" ${c.id === d.categoryId ? 'selected' : ''}>${c.name}</option>`))}</select></div>
          <div class="field"><label for="pf-st">Estado</label><select class="select" id="pf-st" name="status">${Object.entries(PSTATUS).map(([k, v]) => raw(`<option value="${k}" ${k === d.status ? 'selected' : ''}>${v[0]}</option>`))}</select></div>
          <div class="field"><label for="pf-price">Precio (CLP) *</label><input class="input" id="pf-price" name="price" type="number" min="0" step="10" value="${d.price}"></div>
          <div class="field"><label for="pf-cmp">Precio antes (oferta)</label><input class="input" id="pf-cmp" name="comparePrice" type="number" min="0" step="10" value="${d.comparePrice || ''}" placeholder="Opcional"></div>
          <div class="field"><label for="pf-cost">Costo unitario</label><input class="input" id="pf-cost" name="cost" type="number" min="0" step="10" value="${d.cost}"></div>
          <div class="field"><label for="pf-tags">Etiquetas</label><input class="input" id="pf-tags" name="tags" value="${(d.tags || []).join(', ')}" placeholder="Nuevo, Top ventas"></div>
        </div>
        <div class="field"><label for="pf-desc">Descripción</label><textarea class="textarea" id="pf-desc" name="description">${d.description}</textarea></div>
        <label class="check"><input type="checkbox" name="featured" ${d.featured ? 'checked' : ''}> Destacar en la portada</label>
      </div>
      <div class="stack">
        <div class="card" style="padding:0;overflow:hidden;aspect-ratio:1;max-width:260px" data-preview></div>
        <div class="field"><label for="pf-shape">Ilustración</label><select class="select" id="pf-shape" name="shape">${SHAPE_OPTIONS.map(s => raw(`<option value="${s}" ${s === d.shape ? 'selected' : ''}>${SHAPE_LABEL[s] || s}</option>`))}</select><small class="muted">Imagen de marcador (SVG) teñida con el color de cada variante.</small></div>
        <small class="muted" data-margin></small>
      </div>
    </div>
    <hr style="margin:0">
    <div class="grid-2" style="align-items:start">
      <div class="stack" style="gap:10px">
        <h3 style="margin:0">Colores</h3>
        <div class="color-rows" data-colors></div>
        <button type="button" class="btn btn-sm" data-addcolor>+ Agregar color</button>
        <div class="field"><label for="pf-sizes">Tallas (separadas por coma)</label><input class="input" id="pf-sizes" name="sizes" value="${d.sizes.join(', ')}"></div>
      </div>
      <div class="stack" style="gap:10px"><h3 style="margin:0">Stock por variante</h3><div class="variant-grid" data-variants></div></div>
    </div>`;
  const colorsBox = form.querySelector('[data-colors]'), varBox = form.querySelector('[data-variants]');
  const drawColors = () => {
    colorsBox.innerHTML = d.colors.map((c, i) => html`<div class="crow"><input class="input" data-cname="${i}" value="${c.name}" aria-label="Nombre del color"><input type="color" data-chex="${i}" value="${c.hex}" aria-label="Color"><button type="button" class="btn btn-sm btn-ghost btn-icon" data-crm="${i}" aria-label="Quitar color" ${d.colors.length < 2 ? 'disabled' : ''}>✕</button></div>`).join('');
  };
  const sizes = () => form.elements.sizes.value.split(',').map(s => s.trim()).filter(Boolean);
  const drawVariants = () => {
    varBox.querySelectorAll('[data-vk]').forEach(i => { stockMap[i.dataset.vk] = +i.value || 0; });
    const list = [];
    d.colors.forEach(c => sizes().forEach(s => list.push(`${s}|${c.name}`)));
    varBox.innerHTML = list.length ? list.map(k => { const [s, c] = k.split('|'); return html`<label class="vrow"><span>${c} · <b>${s}</b></span><input class="input" type="number" min="0" data-vk="${k}" value="${stockMap[k] ?? 0}" style="min-height:34px;padding:4px 8px" aria-label="Stock ${c} ${s}"></label>`; }).join('') : '<p class="muted small">Agrega al menos un color y una talla.</p>';
  };
  const drawPreview = () => {
    const tmp = { name: form.elements.name.value || 'Producto', shape: form.elements.shape.value, colors: d.colors };
    form.querySelector('[data-preview]').innerHTML = productArt(tmp, d.colors[0]?.hex);
    const price = +form.elements.price.value, cost = +form.elements.cost.value;
    form.querySelector('[data-margin]').textContent = price ? `Margen bruto: ${money(price / 1.19 - cost)} (${Math.round((1 - cost / (price / 1.19)) * 100)}% sin IVA)` : '';
  };
  drawColors(); drawVariants(); drawPreview();
  form.addEventListener('input', e => {
    const n = e.target.dataset;
    if (n.cname !== undefined) { const old = d.colors[n.cname].name; d.colors[n.cname].name = e.target.value; Object.keys(stockMap).forEach(k => { if (k.endsWith('|' + old)) stockMap[k.replace('|' + old, '|' + e.target.value)] = stockMap[k]; }); drawVariants(); }
    if (n.chex !== undefined) { d.colors[n.chex].hex = e.target.value; drawPreview(); }
    if (e.target.name === 'sizes') drawVariants();
    if (['shape', 'name', 'price', 'cost'].includes(e.target.name)) drawPreview();
  });
  form.addEventListener('click', e => {
    if (e.target.closest('[data-addcolor]')) { d.colors.push({ name: 'Nuevo color ' + (d.colors.length + 1), hex: '#8c8780' }); drawColors(); drawVariants(); drawPreview(); }
    const rm = e.target.closest('[data-crm]');
    if (rm) { d.colors.splice(+rm.dataset.crm, 1); drawColors(); drawVariants(); drawPreview(); }
  });
  const m = modal({ title: isNew ? 'Nuevo producto' : `Editar · ${p.name}`, size: 'lg', body: form, foot: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-save>${isNew ? 'Crear producto' : 'Guardar cambios'}</button>` });
  const save = e => {
    e && e.preventDefault();
    const f = form.elements;
    const name = f.name.value.trim(), price = Math.round(+f.price.value);
    f.name.classList.toggle('invalid', !name); f.price.classList.toggle('invalid', !(price > 0));
    if (!name || !(price > 0)) return toast('Nombre y precio son obligatorios', 'warning');
    const cmp = Math.round(+f.comparePrice.value || 0);
    if (cmp && cmp <= price) return toast('El precio “antes” debe ser mayor al precio actual', 'warning');
    const sz = sizes();
    if (!sz.length || !d.colors.length || d.colors.some(c => !c.name.trim())) return toast('Define al menos una talla y colores con nombre', 'warning');
    varBox.querySelectorAll('[data-vk]').forEach(i => { stockMap[i.dataset.vk] = Math.max(0, Math.round(+i.value || 0)); });
    const id = p?.id || 'p' + Date.now().toString(36).slice(-5);
    const code = id.replace(/^p/, '').toUpperCase();
    const variants = [];
    d.colors.forEach(c => sz.forEach(s => {
      const prev = p?.variants.find(v => v.size === s && v.color === c.name);
      variants.push({ sku: prev?.sku || `RZ-${code}-${slug(c.name).slice(0, 3).toUpperCase()}-${s}`, size: s, color: c.name.trim(), stock: stockMap[`${s}|${c.name}`] ?? 0 });
    }));
    const tags = f.tags.value.split(',').map(t => t.trim()).filter(Boolean);
    if (cmp && !tags.includes('Oferta')) tags.push('Oferta');
    const data = { name, categoryId: f.categoryId.value, status: f.status.value, price, comparePrice: cmp, cost: Math.round(+f.cost.value || 0), description: f.description.value.trim(), tags: cmp ? tags : tags.filter(t => t !== 'Oferta'), featured: f.featured.checked, shape: f.shape.value, sizes: sz, colors: d.colors.map(c => ({ name: c.name.trim(), hex: c.hex })), variants };
    if (isNew) { db.insert('products', { id, ...data, sold: 0, views: 0 }); log('producto', `Creó ${name}`); toast('Producto creado', 'success'); }
    else {
      const changes = [];
      if (p.price !== price) changes.push(`precio ${money(p.price)} → ${money(price)}`);
      if (p.status !== data.status) changes.push(`estado ${p.status} → ${data.status}`);
      db.update('products', p.id, data);
      log('producto', `Editó ${name}${changes.length ? ': ' + changes.join(', ') : ''}`);
      toast('Cambios guardados · visibles en la tienda', 'success');
    }
    m.close();
  };
  form.addEventListener('submit', save);
  m.el.querySelector('[data-save]').onclick = save;
}

export function detail(el, { id }) {
  const p = db.get('products', id);
  if (!p) { el.innerHTML = '<div class="empty card"><h2>Producto no encontrado</h2><a class="btn" href="#/productos">Volver</a></div>'; return; }
  const DAY = 864e5, now = Date.now();
  const orders = db.query('orders', o => o.items.some(i => i.productId === id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const weeks = [];
  for (let w = 11; w >= 0; w--) {
    const to = now - w * 7 * DAY, from = to - 7 * DAY;
    weeks.push({ label: new Date(from).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }), value: orders.filter(o => { const t = new Date(o.createdAt).getTime(); return t >= from && t < to && o.status !== 'cancelado'; }).reduce((s, o) => s + o.items.filter(i => i.productId === id).reduce((a, i) => a + i.qty, 0), 0) });
  }
  const rv = db.query('reviews', r => r.productId === id);
  const rating = productRating(p);
  const revenue = orders.filter(o => !['cancelado', 'reembolsado'].includes(o.status)).reduce((s, o) => s + o.items.filter(i => i.productId === id).reduce((a, i) => a + i.qty * i.price, 0), 0);
  el.innerHTML = html`<a class="small" href="#/productos">← Productos</a>
    ${raw(pageHead(p.name, `${category(p.categoryId)?.name} · creado ${date(p.createdAt)}`, `<a class="btn" href="index.html#/producto/${p.id}" target="_blank" rel="noopener">↗ Ver en tienda</a><button class="btn btn-danger" data-del>Eliminar</button><button class="btn btn-primary" data-edit>Editar</button>`))}
    <div class="kpis">
      <div class="card stat"><span class="label">Precio</span><span class="value">${money(p.price)}</span><span class="small muted">Margen ${Math.round((1 - p.cost / (p.price / 1.19)) * 100)}%</span></div>
      <div class="card stat"><span class="label">Stock total</span><span class="value">${productStock(p)}</span><span class="small muted">${p.variants.length} variantes</span></div>
      <div class="card stat"><span class="label">Unidades vendidas</span><span class="value">${p.sold}</span><span class="small muted">${money(revenue)} en ingresos</span></div>
      <div class="card stat"><span class="label">Valoración</span><span class="value">${rating.count ? '★ ' + rating.avg.toFixed(1) : '—'}</span><span class="small muted">${rating.count} reseñas aprobadas</span></div>
    </div>
    <div class="detail-grid">
      <div class="stack">
        <div class="card"><div class="card-head"><h3>Unidades vendidas por semana</h3></div>${raw(lineChart(weeks))}</div>
        <div class="card"><div class="card-head"><h3>Variantes e inventario</h3></div>
          <div class="table-wrap"><table class="table"><thead><tr><th>SKU</th><th>Color</th><th>Talla</th><th>Stock</th><th></th></tr></thead><tbody>
          ${p.variants.map(v => raw(html`<tr><td class="mono small">${v.sku}</td><td><span class="row" style="gap:6px;flex-wrap:nowrap"><i class="dot-color" style="background:${colorHex(p, v.color)}"></i>${v.color}</span></td><td>${v.size}</td><td><span class="badge badge-${v.stock === 0 ? 'danger' : v.stock <= 5 ? 'warning' : 'success'}">${v.stock}</span></td><td class="actions">${can('inventory') ? raw(html`<button class="btn btn-sm" data-adj="${v.sku}">Ajustar</button>`) : ''}</td></tr>`))}
          </tbody></table></div></div>
        <div class="card"><div class="card-head"><h3>Pedidos recientes con este producto</h3></div>
          <ul class="list-plain">${orders.slice(0, 8).map(o => raw(html`<li><a href="#/pedidos/${o.id}">#${o.number} · ${o.customer.name}</a><span>${raw(statusBadge(o.status))}</span></li>`))}</ul></div>
      </div>
      <div class="stack">
        <div class="card stack"><div class="grid-2">${p.colors.map(c => raw(html`<figure style="margin:0"><div class="mini-thumb" style="width:100%;height:auto;aspect-ratio:1">${raw(productArt(p, c.hex))}</div><figcaption class="small muted">${c.name}</figcaption></figure>`))}</div></div>
        <div class="card"><dl class="kv"><dt>Estado</dt><dd>${raw(pBadge(p.status))}</dd><dt>Precio antes</dt><dd>${p.comparePrice ? money(p.comparePrice) : '—'}</dd><dt>Costo</dt><dd>${money(p.cost)}</dd><dt>Tallas</dt><dd>${p.sizes.join(', ')}</dd><dt>Etiquetas</dt><dd>${(p.tags || []).join(', ') || '—'}</dd><dt>Destacado</dt><dd>${p.featured ? 'Sí' : 'No'}</dd><dt>Vistas</dt><dd>${p.views || 0}</dd></dl><p class="small muted" style="margin:12px 0 0">${p.description}</p></div>
        <div class="card"><div class="card-head"><h3>Reseñas</h3><a class="small" href="#/resenas">Moderar</a></div>
          <ul class="list-plain">${rv.slice(0, 5).map(r => raw(html`<li><span><b>${'★'.repeat(r.rating)}</b> ${r.title}<br><small class="muted">${r.author}</small></span><span class="badge badge-${r.status === 'aprobada' ? 'success' : r.status === 'pendiente' ? 'warning' : 'danger'}">${r.status}</span></li>`))}</ul>${rv.length ? '' : raw('<p class="muted small">Sin reseñas.</p>')}</div>
      </div>
    </div>`;
  el.addEventListener('click', e => {
    if (e.target.closest('[data-edit]')) productForm(p);
    if (e.target.closest('[data-del]')) remove(p);
    const a = e.target.closest('[data-adj]');
    if (a) adjust(db.get('products', id), a.dataset.adj);
  });
}
