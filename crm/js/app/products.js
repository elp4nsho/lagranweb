// Catálogo de productos y servicios (usado por el cotizador).
import { db, auth } from '../data/db.js';
import { escape, money, toast, confirm, dataTable } from '../../../assets/core/ui.js';
import { can } from '../shared/perms.js';
import { exportCSV } from '../shared/util.js';
import { pageHead, openForm, field, opt } from './components.js';
import { icon } from '../shared/icons.js';

const state = { cat: '', inactive: false };

export function render(view, { user }) {
  const edit = can('products.edit');
  const all = db.all('products');
  const cats = [...new Set(all.map(p => p.category))];
  const sold = {};
  db.query('deals', d => d.stage === 'ganado').forEach(d => (d.items || []).forEach(it => { sold[it.productId] = (sold[it.productId] || 0) + it.qty; }));
  const rows = all.filter(p => (!state.cat || p.category === state.cat) && (state.inactive || p.active !== false)).map(p => ({ ...p, sold: sold[p.id] || 0, status: p.active === false ? 0 : 1 }));
  view.innerHTML = `
    ${pageHead('Productos', `${rows.length} ítems en el catálogo${edit ? '' : ' · solo lectura'}`, `${can('export') ? `<button class="btn" data-export>${icon('upload', 16)} CSV</button>` : ''}${edit ? `<button class="btn btn-primary" data-new>${icon('plus', 16)} Nuevo producto</button>` : ''}`)}
    <div class="card stack">
      <div class="row filters">${[['', 'Todos'], ...cats.map(c => [c, c])].map(([k, l]) => `<button class="chip ${state.cat === k ? 'active' : ''}" data-cat="${escape(k)}">${escape(l)}</button>`).join('')}
        <label class="check small" style="margin-left:auto"><input type="checkbox" data-inactive ${state.inactive ? 'checked' : ''}> Mostrar descontinuados</label></div>
      <div data-table></div>
    </div>`;
  dataTable(view.querySelector('[data-table]'), {
    rows, pageSize: 12, search: p => `${p.name} ${p.sku} ${p.category}`,
    columns: [
      { key: 'name', label: 'Producto', render: p => `<b>${escape(p.name)}</b><br><small class="muted">${escape(p.description || '')}</small>` },
      { key: 'sku', label: 'SKU', render: p => `<code>${escape(p.sku)}</code>` },
      { key: 'category', label: 'Categoría' },
      { key: 'price', label: 'Precio', render: p => `${money(p.price)} <small class="muted">/ ${escape(p.unit)}</small>` },
      { key: 'sold', label: 'Unidades vendidas' },
      { key: 'status', label: 'Estado', render: p => p.active === false ? '<span class="badge plain">Descontinuado</span>' : '<span class="badge badge-success">Activo</span>' },
      ...(edit ? [{ key: 'id', label: '', sort: false, render: p => `<span class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn btn-sm" data-edit="${p.id}" aria-label="Editar">${icon('edit', 14)}</button><button class="btn btn-sm btn-ghost" data-del="${p.id}" aria-label="Eliminar">${icon('trash', 14)}</button></span>` }] : [])
    ]
  });
  view.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { state.cat = b.dataset.cat; render(view, { user }); });
  view.querySelector('[data-inactive]').onchange = e => { state.inactive = e.target.checked; render(view, { user }); };
  view.querySelector('[data-new]')?.addEventListener('click', () => productModal());
  const tbl = view.querySelector('[data-table]');
  tbl.addEventListener('click', async e => {
    const ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
    if (ed) productModal(db.get('products', ed.dataset.edit));
    if (del) {
      const p = db.get('products', del.dataset.del);
      const used = db.all('deals').some(d => (d.items || []).some(it => it.productId === p.id));
      if (used) { if (await confirm(`"${p.name}" está en cotizaciones existentes. ¿Marcarlo como descontinuado?`, { ok: 'Descontinuar' })) { db.update('products', p.id, { active: false }); toast('Producto descontinuado', 'success'); } return; }
      if (await confirm(`¿Eliminar "${p.name}"?`, { danger: true, ok: 'Eliminar' })) { db.remove('products', p.id); db.log('producto', `Eliminó ${p.name}`, user.id); toast('Producto eliminado', 'success'); }
    }
  });
  view.querySelector('[data-export]')?.addEventListener('click', () => exportCSV('productos.csv', rows.map(p => ({ producto: p.name, sku: p.sku, categoria: p.category, precio: p.price, unidad: p.unit, activo: p.active === false ? 'no' : 'sí', vendidos: p.sold }))));
}

function productModal(p = null) {
  const user = auth.current();
  openForm({
    title: p ? 'Editar producto' : 'Nuevo producto',
    body: `${field('Nombre *', `<input class="input" name="name" value="${escape(p?.name || '')}" required>`)}
      <div class="grid-2">
        ${field('SKU *', `<input class="input" name="sku" value="${escape(p?.sku || '')}" required>`)}
        ${field('Categoría', `<select class="select" name="category">${['Licencias', 'Módulos', 'Servicios', 'Soporte'].map(c => opt(c, c, p?.category)).join('')}</select>`)}
        ${field('Precio (CLP) *', `<input class="input" type="number" min="0" step="1000" name="price" value="${p?.price ?? ''}" required>`)}
        ${field('Unidad', `<select class="select" name="unit">${['usuario/año', 'año', 'único', 'sesión', 'mes'].map(c => opt(c, c, p?.unit)).join('')}</select>`)}
      </div>
      ${field('Descripción', `<textarea class="textarea" name="description" style="min-height:70px">${escape(p?.description || '')}</textarea>`)}
      <label class="check"><input type="checkbox" name="active" ${p?.active === false ? '' : 'checked'}> Activo (disponible para cotizar)</label>`,
    onSubmit: (f, v) => {
      if (db.find('products', x => x.sku.toLowerCase() === v.sku.trim().toLowerCase() && x.id !== p?.id)) { toast('Ese SKU ya existe', 'warning'); return false; }
      const patch = { name: v.name.trim(), sku: v.sku.trim().toUpperCase(), category: v.category, price: Math.max(0, +v.price || 0), unit: v.unit, description: v.description, active: !!v.active };
      p ? db.update('products', p.id, patch) : db.insert('products', patch);
      db.log('producto', `${p ? 'Editó' : 'Creó'} el producto ${patch.name} (${money(patch.price)})`, user.id);
      toast('Producto guardado', 'success');
    }
  });
}
