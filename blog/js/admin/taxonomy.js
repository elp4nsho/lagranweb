// Secciones (categorías) y etiquetas.
import { escape, toast, confirm, slug } from '../../../assets/core/ui.js';
import { db, isLive } from '../data/db.js';
import { pageHead, table, actBtn, formDialog, f } from '../shared/admin-kit.js';
import { PALETTE, COLOR_NAMES } from '../shared/art.js';

let tab = 'cats';

function editCat(ctx, c = {}) {
  formDialog({
    title: c.id ? `Editar sección ${c.name}` : 'Nueva sección',
    body: `${f.text('name', 'Nombre', c.name, { required: true })}${f.area('description', 'Descripción', c.description, { rows: 2 })}
      <div class="grid-2">${f.select('color', 'Color', PALETTE.map(p => [p, COLOR_NAMES[p]]), c.color || 'primary')}${f.text('order', 'Orden en el menú', c.order || db.count('categories') + 1, { type: 'number' })}</div>`,
    onSubmit: v => {
      if (c.id) db.update('categories', c.id, v);
      else { const id = slug(v.name); if (db.get('categories', id)) { toast('Ya existe una sección con ese nombre', 'error'); return false; } db.insert('categories', { id, ...v }); }
      db.log('sección', `${c.id ? 'Editó' : 'Creó'} la sección ${v.name}`, ctx.user.id); toast('Sección guardada', 'success');
    }
  });
}

export default {
  id: 'taxonomy', path: '/secciones', label: 'Secciones y etiquetas', icon: '⌗', group: 'Redacción', perm: 'taxonomy',
  render(el, ctx) {
    const arts = db.all('articles');
    el.innerHTML = `${pageHead('Secciones y etiquetas', 'Organizan la navegación, las portadas de sección y las páginas de etiqueta.', tab === 'cats' ? '<button class="btn btn-primary" data-new>＋ Nueva sección</button>' : '<button class="btn btn-primary" data-new>＋ Nueva etiqueta</button>')}
      <div class="tabs"><button class="tab ${tab === 'cats' ? 'active' : ''}" data-tab="cats">Secciones</button><button class="tab ${tab === 'tags' ? 'active' : ''}" data-tab="tags">Etiquetas</button></div><div data-t></div>`;
    el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; this.render(el, ctx); });
    const t = el.querySelector('[data-t]');
    if (tab === 'cats') {
      el.querySelector('[data-new]').onclick = () => editCat(ctx);
      table(t, {
        id: 'cats', rows: db.all('categories').map(c => ({ ...c, _n: arts.filter(a => a.categoryId === c.id).length, _live: arts.filter(a => a.categoryId === c.id && isLive(a)).length })), sort: 'order', search: c => c.name + c.description,
        columns: [
          { key: 'order', label: '#' },
          { key: 'name', label: 'Sección', render: c => `<div class="cell-main"><span class="avatar" style="--av:var(--${escape(c.color)});--size:28px">${escape(c.name[0])}</span><span><b>${escape(c.name)}</b><small>${escape(c.description || '')}</small></span></div>` },
          { key: '_live', label: 'Publicados' }, { key: '_n', label: 'Total' }
        ],
        actions: () => actBtn('view', 'Ver portada de sección', '↗') + actBtn('edit', 'Editar', '✎') + actBtn('del', 'Eliminar', '🗑'),
        onRow: c => editCat(ctx, db.get('categories', c.id)),
        onAction: async (a, c) => {
          if (a === 'view') window.open(`index.html#/seccion/${c.id}`, '_blank');
          if (a === 'edit') editCat(ctx, db.get('categories', c.id));
          if (a === 'del') {
            if (c._n) return toast(`No se puede eliminar: tiene ${c._n} artículos. Muévelos antes.`, 'error');
            if (await confirm(`¿Eliminar la sección ${c.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('categories', c.id); db.log('sección', `Eliminó la sección ${c.name}`, ctx.user.id); toast('Sección eliminada', 'success'); }
          }
        },
        csv: { name: 'secciones', map: c => ({ seccion: c.name, publicados: c._live, total: c._n }) }
      });
    } else {
      el.querySelector('[data-new]').onclick = () => formDialog({ title: 'Nueva etiqueta', body: f.text('name', 'Nombre', '', { required: true }), onSubmit: v => { const id = slug(v.name); if (db.get('tags', id)) { toast('La etiqueta ya existe', 'error'); return false; } db.insert('tags', { id, name: v.name }); toast('Etiqueta creada', 'success'); } });
      table(t, {
        id: 'tags', rows: db.all('tags').map(g => ({ ...g, _n: arts.filter(a => (a.tags || []).includes(g.id)).length })), sort: '_n', dir: -1, search: g => g.name + g.id,
        columns: [{ key: 'name', label: 'Etiqueta', render: g => `<b>#${escape(g.name)}</b> <small class="muted">${escape(g.id)}</small>` }, { key: '_n', label: 'Artículos' }],
        actions: () => actBtn('view', 'Ver página', '↗') + actBtn('edit', 'Renombrar', '✎') + actBtn('merge', 'Fusionar en otra', '⇄') + actBtn('del', 'Eliminar', '🗑'),
        onAction: async (a, g) => {
          if (a === 'view') window.open(`index.html#/tag/${g.id}`, '_blank');
          if (a === 'edit') formDialog({ title: 'Renombrar etiqueta', body: f.text('name', 'Nombre visible', g.name, { required: true }), onSubmit: v => { db.update('tags', g.id, { name: v.name }); toast('Etiqueta renombrada', 'success'); } });
          if (a === 'merge') formDialog({ title: `Fusionar #${g.name}`, submit: 'Fusionar', body: f.select('into', 'Fusionar en', db.all('tags').filter(x => x.id !== g.id).map(x => [x.id, x.name])), onSubmit: v => {
            arts.filter(x => (x.tags || []).includes(g.id)).forEach(x => db.update('articles', x.id, { tags: [...new Set(x.tags.map(t2 => (t2 === g.id ? v.into : t2)))] }));
            db.remove('tags', g.id); db.log('etiqueta', `Fusionó #${g.id} en #${v.into}`, ctx.user.id); toast('Etiquetas fusionadas', 'success'); } });
          if (a === 'del' && await confirm(`¿Eliminar #${g.name}? Se quitará de ${g._n} artículos.`, { danger: true, ok: 'Eliminar' })) {
            arts.filter(x => (x.tags || []).includes(g.id)).forEach(x => db.update('articles', x.id, { tags: x.tags.filter(t2 => t2 !== g.id) }));
            db.remove('tags', g.id); toast('Etiqueta eliminada', 'success');
          }
        },
        csv: { name: 'etiquetas', map: g => ({ etiqueta: g.name, slug: g.id, articulos: g._n }) }
      });
    }
  }
};
