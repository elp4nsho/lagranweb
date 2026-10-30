// Testimonios de clientes.
import { escape, toast, confirm } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead, table, actBtn, formDialog, f, badge } from '../shared/admin-kit.js';

function edit(ctx, t = {}) {
  const projects = [['', '— Ninguno —'], ...db.all('projects').map(p => [p.id, p.title])];
  formDialog({
    title: t.id ? 'Editar testimonio' : 'Nuevo testimonio',
    body: `${f.area('quote', 'Cita', t.quote, { required: true, rows: 3 })}
      <div class="grid-2">${f.text('author', 'Autor/a', t.author, { required: true })}${f.text('role', 'Cargo', t.role)}</div>
      <div class="grid-2">${f.text('company', 'Empresa', t.company, { required: true })}${f.select('projectId', 'Proyecto relacionado', projects, t.projectId || '')}</div>
      <div class="grid-2">${f.select('rating', 'Calificación', [5, 4, 3, 2, 1].map(n => [n, '★'.repeat(n)]), t.rating || 5)}${f.text('order', 'Orden', t.order || db.count('testimonials') + 1, { type: 'number' })}</div>
      ${f.sw('published', 'Publicado', t.id ? t.published : true)}`,
    onSubmit: v => {
      const data = { ...v, rating: Number(v.rating) };
      if (t.id) db.update('testimonials', t.id, data); else db.insert('testimonials', data);
      db.log('testimonio', `${t.id ? 'Editó' : 'Agregó'} testimonio de ${v.author}`, ctx.user.id);
      toast('Testimonio guardado', 'success');
    }
  });
}

export default {
  id: 'testimonials', path: '/testimonios', label: 'Testimonios', icon: '❝', group: 'Contenido', perm: 'testimonials',
  render(el, ctx) {
    el.innerHTML = `${pageHead('Testimonios', 'Citas de clientes para la portada y las fichas de proyecto.', '<button class="btn btn-primary" data-new>＋ Nuevo testimonio</button>')}<div data-t></div>`;
    el.querySelector('[data-new]').onclick = () => edit(ctx);
    table(el.querySelector('[data-t]'), {
      id: 'testimonials', rows: db.all('testimonials'), sort: 'order', search: t => `${t.quote} ${t.author} ${t.company}`,
      filters: [{ key: 'published', label: 'Estado', options: [['true', 'Publicado'], ['false', 'Borrador']], test: (t, v) => String(!!t.published) === v }],
      columns: [
        { key: 'order', label: '#' },
        { key: 'quote', label: 'Cita', render: t => `<span class="small">“${escape(t.quote.length > 90 ? t.quote.slice(0, 90) + '…' : t.quote)}”</span>` },
        { key: 'author', label: 'Autor', render: t => `<b>${escape(t.author)}</b><br><small class="muted">${escape(t.company)}</small>` },
        { key: 'rating', label: 'Nota', render: t => `<span class="stars">${'★'.repeat(t.rating)}</span>` },
        { key: 'published', label: 'Estado', render: t => badge(t.published ? 'on' : 'off', { on: ['Publicado', 'success'], off: ['Borrador', ''] }) }
      ],
      actions: () => actBtn('toggle', 'Publicar/ocultar', '◐') + actBtn('edit', 'Editar', '✎') + actBtn('del', 'Eliminar', '🗑'),
      onRow: t => edit(ctx, t),
      onAction: async (a, t) => {
        if (a === 'edit') edit(ctx, t);
        if (a === 'toggle') { db.update('testimonials', t.id, { published: !t.published }); toast(t.published ? 'Testimonio oculto' : 'Testimonio publicado', 'success'); }
        if (a === 'del' && await confirm('¿Eliminar este testimonio?', { danger: true, ok: 'Eliminar' })) { db.remove('testimonials', t.id); db.log('testimonio', `Eliminó testimonio de ${t.author}`, ctx.user.id); toast('Eliminado', 'success'); }
      },
      csv: { name: 'testimonios', map: t => ({ autor: t.author, empresa: t.company, cita: t.quote, nota: t.rating, publicado: t.published ? 'sí' : 'no' }) }
    });
  }
};
