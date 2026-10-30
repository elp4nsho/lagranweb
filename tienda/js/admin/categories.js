// Categorías: CRUD, orden en el menú, visibilidad en la tienda.
import { html, raw, toast, formModal, confirm, slug } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead, smartTable, log } from './common.js';

export function render(el) {
  const rows = db.all('categories').map(c => ({ ...c, count: db.count('products', p => p.categoryId === c.id), active: c.active !== false }));
  el.innerHTML = html`${raw(pageHead('Categorías', 'Ordenan el catálogo y el menú de la tienda. Las primeras 5 activas aparecen en la barra de navegación.', '<button class="btn btn-primary" data-new>+ Nueva categoría</button>'))}<div data-t></div>`;
  smartTable(el.querySelector('[data-t]'), {
    key: 'cats', rows, search: c => c.name + ' ' + c.description, defaultSort: { key: 'order', dir: 1 },
    columns: [
      { key: 'order', label: '#' },
      { key: 'name', label: 'Nombre', render: c => html`<b>${c.name}</b><br><small class="muted">/${c.slug}</small>` },
      { key: 'description', label: 'Descripción' },
      { key: 'count', label: 'Productos' },
      { key: 'active', label: 'Visible', render: c => `<label class="switch" title="Visible en la tienda"><input type="checkbox" data-toggle="${c.id}" ${c.active ? 'checked' : ''} aria-label="Visible"><span></span></label>` },
      { key: 'act', label: '', sort: false, class: 'actions', render: c => `<button class="btn btn-sm" data-edit="${c.id}">Editar</button><button class="btn btn-sm btn-ghost" data-del="${c.id}" aria-label="Eliminar">🗑</button>` }
    ]
  });
  el.addEventListener('change', e => {
    const t = e.target.closest('[data-toggle]');
    if (!t) return;
    const c = db.get('categories', t.dataset.toggle);
    db.update('categories', c.id, { active: t.checked });
    log('categoría', `${c.name} ${t.checked ? 'visible' : 'oculta'} en la tienda`);
    toast(`${c.name} ${t.checked ? 'visible' : 'oculta'} en la tienda`, 'success');
  });
  el.addEventListener('click', async e => {
    const ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
    if (e.target.closest('[data-new]') || ed) {
      const c = ed ? db.get('categories', ed.dataset.edit) : { name: '', description: '', order: rows.length + 1 };
      const v = await formModal({ title: ed ? 'Editar categoría' : 'Nueva categoría', fields: [
        { name: 'name', label: 'Nombre', value: c.name, required: true },
        { name: 'description', label: 'Descripción', type: 'textarea', value: c.description },
        { name: 'order', label: 'Orden', type: 'number', value: c.order }
      ] });
      if (!v) return;
      if (db.find('categories', x => x.name.toLowerCase() === v.name.toLowerCase() && x.id !== c.id)) return toast('Ya existe una categoría con ese nombre', 'warning');
      if (ed) { db.update('categories', c.id, { ...v, slug: slug(v.name) }); log('categoría', `Editó ${v.name}`); }
      else { db.insert('categories', { id: 'cat-' + slug(v.name), ...v, slug: slug(v.name), active: true }); log('categoría', `Creó ${v.name}`); }
      toast('Categoría guardada', 'success');
    }
    if (del) {
      const c = db.get('categories', del.dataset.del);
      const n = db.count('products', p => p.categoryId === c.id);
      if (n) {
        const others = db.query('categories', x => x.id !== c.id);
        const v = await formModal({ title: `Eliminar ${c.name}`, submit: 'Mover y eliminar', fields: [{ name: 'to', label: `Tiene ${n} productos. Moverlos a:`, type: 'select', options: others.map(o => [o.id, o.name]), value: others[0]?.id }] });
        if (!v) return;
        db.query('products', p => p.categoryId === c.id).forEach(p => db.update('products', p.id, { categoryId: v.to }));
      } else if (!await confirm(`¿Eliminar la categoría ${c.name}?`, { danger: true, ok: 'Eliminar' })) return;
      db.remove('categories', c.id);
      log('categoría', `Eliminó ${c.name}`);
      toast('Categoría eliminada', 'info');
    }
  });
}
