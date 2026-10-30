// Categorías del marketplace: CRUD, orden y activación (se reflejan en portada, filtros y formularios).
import { escape, formModal, toast, confirm as ask, slug, downloadCSV, money } from '../../../assets/core/ui.js';
import { pageHead, smartTable, badge } from '../shared/kit.js';

async function edit(db, me, c = null) {
  const v = await formModal({ title: c ? `Editar ${c.name}` : 'Nueva categoría', fields: [
    { name: 'name', label: 'Nombre', required: true, value: c?.name },
    { name: 'icon', label: 'Ícono (emoji)', required: true, value: c?.icon || '✨' },
    { name: 'description', label: 'Descripción', type: 'textarea', value: c?.description },
    { name: 'order', label: 'Orden en portada', type: 'number', value: c?.order ?? db.count('categories') + 1 },
    { name: 'active', label: 'Visible en el marketplace', type: 'checkbox', value: c ? c.active !== false : true }
  ] });
  if (!v) return;
  if (c) db.update('categories', c.id, v);
  else { const id = slug(v.name); if (db.get('categories', id)) return toast('Ya existe una categoría con ese nombre', 'error'); db.insert('categories', { ...v, id }); }
  db.log('categoria', `Categoría ${c ? 'editada' : 'creada'}: ${v.name}`, me.id); toast('Categoría guardada', 'success');
}

export function render(el, { db, me }) {
  const rows = db.all('categories').map(c => { const gs = db.query('gigs', g => g.categoryId === c.id); return { ...c, gigs: gs.filter(g => g.status === 'activo').length, gmv: db.query('orders', o => o.categoryId === c.id && o.status !== 'cancelado').reduce((a, o) => a + o.price, 0), any: gs.length }; });
  el.innerHTML = `${pageHead('Categorías', 'Ordénalas, desactívalas o crea nuevas', '<button class="btn btn-ghost btn-sm" data-csv>⭳ CSV</button><button class="btn btn-primary btn-sm" data-new>+ Nueva categoría</button>')}<div class="card" data-t></div>`;
  smartTable(el.querySelector('[data-t]'), {
    id: 'cats', rows, search: r => r.name + r.description,
    columns: [
      { key: 'order', label: '#' },
      { key: 'name', label: 'Categoría', render: r => `<b>${escape(r.icon)} ${escape(r.name)}</b><div class="small muted">${escape(r.description || '')}</div>` },
      { key: 'gigs', label: 'Servicios activos' },
      { key: 'gmv', label: 'GMV histórico', render: r => money(r.gmv) },
      { key: 'active', label: 'Estado', render: r => r.active !== false ? badge('Visible', 'success') : badge('Oculta') },
      { key: 'x', label: '', sort: false, render: () => '<div class="actions"><button class="btn btn-sm btn-ghost" data-act="up" aria-label="Subir">↑</button><button class="btn btn-sm btn-ghost" data-act="edit">Editar</button><button class="btn btn-sm btn-ghost" data-act="del" aria-label="Eliminar">🗑</button></div>' }
    ],
    onAction: async (act, r) => {
      if (act === 'edit') return edit(db, me, db.get('categories', r.id));
      if (act === 'up') { const sorted = db.all('categories').sort((a, b) => a.order - b.order); const i = sorted.findIndex(x => x.id === r.id); if (i > 0) { const p = sorted[i - 1]; db.update('categories', p.id, { order: r.order }); db.update('categories', r.id, { order: p.order === r.order ? p.order - 1 : p.order }); } return; }
      if (r.any) return toast(`Tiene ${r.any} servicios. Ocúltala en vez de eliminarla.`, 'warning');
      if (await ask(`¿Eliminar la categoría ${r.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('categories', r.id); db.log('categoria', `Categoría eliminada: ${r.name}`, me.id); toast('Categoría eliminada', 'success'); }
    }
  });
  el.querySelector('[data-new]').onclick = () => edit(db, me);
  el.querySelector('[data-csv]').onclick = () => downloadCSV('categorias.csv', rows.map(r => ({ categoria: r.name, servicios: r.gigs, gmv: r.gmv, visible: r.active !== false ? 'sí' : 'no' })));
}
