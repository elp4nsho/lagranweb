// Categorías de la base de conocimiento (orden, ícono, descripción).
import { db } from '../data/db.js';
import { escape, toast, confirm } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/shell.js';
import { openForm, field, opt } from '../shared/forms.js';
import { icon } from '../shared/icons.js';

const ICONS = ['wifi', 'card', 'truck', 'tv', 'user', 'phone', 'gear', 'shield', 'mail', 'book', 'star', 'bolt'];
export function render(view, { user }) {
  const cats = db.all('categories').sort((a, b) => a.order - b.order);
  view.innerHTML = `${pageHead('Categorías', 'Ordenan la base de conocimiento y el formulario de contacto', `<button class="btn btn-primary" data-new>${icon('plus', 16)} Nueva categoría</button>`)}
    <div class="stack">${cats.map((c, i) => `<div class="card row between cat-admin"><div class="user-chip"><span class="cat-ico">${icon(c.icon, 22)}</span><span><b>${escape(c.name)}</b><br><small class="muted">${escape(c.description)} · ${db.count('articles', a => a.categoryId === c.id)} artículos · ${db.count('tickets', t => t.categoryId === c.id)} tickets</small></span></div>
      <div class="row" style="gap:4px"><button class="btn btn-sm btn-ghost" data-mv="${i}:-1" ${i ? '' : 'disabled'} aria-label="Subir">↑</button><button class="btn btn-sm btn-ghost" data-mv="${i}:1" ${i < cats.length - 1 ? '' : 'disabled'} aria-label="Bajar">↓</button><button class="btn btn-sm" data-edit="${c.id}" aria-label="Editar">${icon('edit', 14)}</button><button class="btn btn-sm btn-ghost" data-del="${c.id}" aria-label="Eliminar">${icon('trash', 14)}</button></div></div>`).join('')}</div>`;
  const modalFor = c => openForm({
    title: c ? 'Editar categoría' : 'Nueva categoría',
    body: `${field('Nombre *', `<input class="input" name="name" value="${escape(c?.name || '')}" required>`)}${field('Descripción', `<input class="input" name="description" value="${escape(c?.description || '')}">`)}${field('Ícono', `<select class="select" name="icon">${ICONS.map(i => opt(i, i, c?.icon)).join('')}</select>`)}`,
    onSubmit: (f, v) => { const p = { name: v.name.trim(), description: v.description.trim(), icon: v.icon }; c ? db.update('categories', c.id, p) : db.insert('categories', { ...p, order: cats.length + 1 }); db.log('categoría', `${c ? 'Editó' : 'Creó'} la categoría ${p.name}`, user.id); toast('Categoría guardada', 'success'); }
  });
  view.querySelector('[data-new]').onclick = () => modalFor();
  view.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => modalFor(db.get('categories', b.dataset.edit)));
  view.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => { const [i, d] = b.dataset.mv.split(':').map(Number); const a = cats[i], c = cats[i + d]; db.update('categories', a.id, { order: c.order }); db.update('categories', c.id, { order: a.order }); });
  view.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    const c = db.get('categories', b.dataset.del);
    if (db.count('articles', a => a.categoryId === c.id)) return toast('Mueve o elimina primero sus artículos', 'warning');
    if (await confirm(`¿Eliminar la categoría ${c.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('categories', c.id); toast('Categoría eliminada', 'success'); }
  });
}
