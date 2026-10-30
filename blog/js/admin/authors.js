// Autores: perfiles públicos (pueden estar vinculados a una cuenta de redacción).
import { escape, toast, confirm, slug, num } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, isLive } from '../data/db.js';
import { pageHead, table, actBtn, formDialog, f } from '../shared/admin-kit.js';
import { PALETTE, COLOR_NAMES } from '../shared/art.js';

function edit(ctx, a = {}) {
  const staff = db.query('users', u => ['admin', 'editor', 'periodista'].includes(u.role));
  formDialog({
    title: a.id ? `Editar a ${a.name}` : 'Nuevo autor',
    body: `<div class="grid-2">${f.text('name', 'Nombre', a.name, { required: true })}${f.text('beat', 'Cargo / área', a.beat, { required: true })}</div>
      ${f.area('bio', 'Biografía', a.bio, { rows: 3 })}
      <div class="grid-3">${f.select('color', 'Color', PALETTE.map(p => [p, COLOR_NAMES[p]]), a.color || 'primary')}${f.text('twitter', 'Red social', a.twitter)}${f.select('userId', 'Cuenta vinculada', [['', '— Sin cuenta (invitado) —'], ...staff.map(u => [u.id, `${u.name} (${u.email})`])], a.userId || '')}</div>`,
    onSubmit: v => {
      if (v.userId && db.find('authors', x => x.userId === v.userId && x.id !== a.id)) { toast('Esa cuenta ya está vinculada a otro autor', 'error'); return false; }
      const data = { ...v, userId: v.userId || null, slug: slug(v.name) };
      if (a.id) db.update('authors', a.id, data); else db.insert('authors', data);
      db.log('autor', `${a.id ? 'Editó' : 'Creó'} el perfil de ${v.name}`, ctx.user.id); toast('Autor guardado', 'success');
    }
  });
}

export default {
  id: 'authors', path: '/autores', label: 'Autores', icon: '✒', group: 'Redacción', perm: 'authors',
  render(el, ctx) {
    const arts = db.all('articles');
    el.innerHTML = `${pageHead('Autores', 'Firmas que aparecen en los artículos y en las páginas de autor.', '<button class="btn btn-primary" data-new>＋ Nuevo autor</button>')}<div data-t></div>`;
    el.querySelector('[data-new]').onclick = () => edit(ctx);
    table(el.querySelector('[data-t]'), {
      id: 'authors', rows: db.all('authors').map(a => { const mine = arts.filter(x => x.authorId === a.id); return { ...a, _n: mine.filter(isLive).length, _views: mine.reduce((s, x) => s + (x.views || 0), 0), _user: db.get('users', a.userId)?.email || '' }; }),
      sort: '_views', dir: -1, search: a => `${a.name} ${a.beat} ${a._user}`,
      columns: [
        { key: 'name', label: 'Autor', render: a => `<div class="cell-main"><span class="avatar" style="--av:var(--${escape(a.color)})">${escape(initials(a.name))}</span><span><b>${escape(a.name)}</b><small>${escape(a.beat)}</small></span></div>` },
        { key: '_user', label: 'Cuenta', render: a => (a._user ? `<span class="small">${escape(a._user)}</span>` : '<span class="badge plain">Invitado</span>') },
        { key: '_n', label: 'Publicados' },
        { key: '_views', label: 'Lecturas', render: a => num(a._views) }
      ],
      actions: () => actBtn('view', 'Ver página', '↗') + actBtn('edit', 'Editar', '✎') + actBtn('del', 'Eliminar', '🗑'),
      onRow: a => edit(ctx, db.get('authors', a.id)),
      onAction: async (act, a) => {
        if (act === 'view') window.open(`index.html#/autor/${a.slug}`, '_blank');
        if (act === 'edit') edit(ctx, db.get('authors', a.id));
        if (act === 'del') {
          if (arts.some(x => x.authorId === a.id)) return toast('Tiene artículos asociados: reasígnalos antes de eliminar.', 'error');
          if (await confirm(`¿Eliminar a ${a.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('authors', a.id); toast('Autor eliminado', 'success'); }
        }
      },
      csv: { name: 'autores', map: a => ({ autor: a.name, area: a.beat, cuenta: a._user, publicados: a._n, lecturas: a._views }) }
    });
  }
};
