// Comunicados internos que aparecen en el portal del colaborador.
import { escape, toast, date } from '../../../assets/core/ui.js';
import { pageHead, actBtn, onActs, confirmDelete } from './common.js';
import { smartTable } from '../shared/table.js';
import { formDialog } from '../shared/form.js';

const CATS = ['Personas', 'Remuneraciones', 'Normativa', 'Desempeño', 'Bienestar', 'Eventos'];
export function render(el, ctx) {
  const { db } = ctx;
  const fields = [{ name: 'title', label: 'Título', required: true, span: 2 }, { name: 'body', label: 'Mensaje', type: 'textarea', required: true, span: 2 }, { name: 'category', label: 'Categoría', type: 'select', options: CATS }, { name: 'pinned', label: 'Destacar (fijar arriba)', type: 'checkbox', span: 1 }, { name: 'published', label: 'Publicado en el portal', type: 'checkbox' }, { name: 'notify', label: 'Notificar a todos los colaboradores', type: 'checkbox' }];
  el.innerHTML = pageHead('Comunicados', 'Se muestran al instante en el portal del colaborador.', '<button class="btn btn-primary" data-act="new">＋ Nuevo comunicado</button>') + '<div data-t></div>';
  smartTable(el.querySelector('[data-t]'), {
    key: 'ann', rows: db.all('announcements'), sort: 'date', dir: -1, search: r => `${r.title} ${r.body}`,
    filters: [{ key: 'c', label: 'Categoría', options: CATS.map(c => [c, c]), test: (r, v) => r.category === v }],
    columns: [
      { key: 'title', label: 'Comunicado', render: r => `<b>${r.pinned ? '📌 ' : ''}${escape(r.title)}</b><br><small class="muted">${escape(r.body.slice(0, 90))}${r.body.length > 90 ? '…' : ''}</small>` },
      { key: 'category', label: 'Categoría' }, { key: 'date', label: 'Fecha', render: r => escape(date(r.date)) },
      { key: 'published', label: 'Publicado', render: r => `<label class="switch"><input type="checkbox" data-pub="${r.id}" ${r.published ? 'checked' : ''} aria-label="Publicado"><span></span></label>` },
      { key: 'a', label: '', sort: false, render: r => `<div class="acts">${actBtn('edit', r.id, '✎', 'btn-ghost', 'Editar')}${actBtn('del', r.id, '🗑', 'btn-ghost', 'Eliminar')}</div>` }
    ]
  });
  el.querySelector('[data-t]').addEventListener('change', e => { const s = e.target.closest('[data-pub]'); if (!s) return; db.update('announcements', s.dataset.pub, { published: s.checked }); db.log('comunicado', `${s.checked ? 'Publicó' : 'Despublicó'} un comunicado`, ctx.user.id); toast(s.checked ? 'Publicado' : 'Despublicado', 'success'); });
  const save = (v, id) => {
    const { notify, ...data } = v;
    if (id) db.update('announcements', id, data); else db.insert('announcements', { ...data, date: new Date().toISOString(), author: ctx.user.name });
    if (notify && v.published) db.query('employees', e => e.status === 'activo').forEach(e => ctx.notify(e.id, `Nuevo comunicado: ${v.title}`));
    db.log('comunicado', `${id ? 'Editó' : 'Creó'} «${v.title}»`, ctx.user.id); toast('Comunicado guardado', 'success');
  };
  onActs(el, {
    new: async () => { const v = await formDialog({ title: 'Nuevo comunicado', fields, values: { category: 'Personas', published: true, notify: true } }); if (v) save(v); },
    edit: async id => { const v = await formDialog({ title: 'Editar comunicado', fields, values: db.get('announcements', id) }); if (v) save(v, id); },
    del: id => { const a = db.get('announcements', id); confirmDelete(`«${a.title}»`, () => db.remove('announcements', id), { db, user: ctx.user, log: `Eliminó «${a.title}»` }); }
  });
}
