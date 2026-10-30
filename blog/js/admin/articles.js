// Artículos: listado con filtros por estado/sección/autor; el editor vive en editor.js.
import { escape, toast, confirm, num, date } from '../../../assets/core/ui.js';
import { db, STATUS, rules, authorOfUser, category, author, isLive } from '../data/db.js';
import { pageHead, table, actBtn, badge } from '../shared/admin-kit.js';
import { art } from '../shared/art.js';
import { renderEditor } from './editor.js';

let scope = 'mine';

function list(el, ctx) {
  const u = ctx.user, chief = ['admin', 'editor'].includes(u.role), me = authorOfUser(u);
  const all = db.all('articles');
  const rows = (!chief && scope === 'mine' ? all.filter(a => a.authorId === me?.id) : all).map(a => ({ ...a, _when: a.publishedAt || a.publishAt || a.createdAt }));
  el.innerHTML = `${pageHead('Artículos', chief ? `${all.filter(a => a.status === 'review').length} esperando revisión · ${all.filter(a => a.status === 'scheduled').length} programados` : 'Como periodista puedes crear y editar tus borradores y enviarlos a revisión.', '<a class="btn btn-primary" href="#/articulos/nuevo">＋ Nuevo artículo</a>')}
    ${chief ? '' : `<div class="tabs"><button class="tab ${scope === 'mine' ? 'active' : ''}" data-scope="mine">Mis artículos</button><button class="tab ${scope === 'all' ? 'active' : ''}" data-scope="all">Toda la redacción (lectura)</button></div>`}
    <div class="row" style="gap:6px">${Object.entries(STATUS).map(([k, [l]]) => `<span class="badge ${STATUS[k][1] ? 'badge-' + STATUS[k][1] : ''}">${l}: ${rows.filter(a => a.status === k).length}</span>`).join('')}</div>
    <div data-t></div>`;
  el.querySelectorAll('[data-scope]').forEach(b => b.onclick = () => { scope = b.dataset.scope; list(el, ctx); });
  table(el.querySelector('[data-t]'), {
    id: 'articles-' + (chief ? 'all' : scope), rows, sort: '_when', dir: -1, pageSize: 12,
    search: a => `${a.title} ${a.dek} ${(a.tags || []).join(' ')} ${author(a.authorId)?.name || ''}`,
    filters: [
      { key: 'status', label: 'Estado', options: Object.entries(STATUS).map(([k, [l]]) => [k, l]) },
      { key: 'categoryId', label: 'Sección', options: db.all('categories').map(c => [c.id, c.name]) },
      ...(chief || scope === 'all' ? [{ key: 'authorId', label: 'Autor', options: db.all('authors').map(a => [a.id, a.name]) }] : []),
      { key: 'premium', label: 'Acceso', options: [['true', 'Premium'], ['false', 'Abierto']], test: (a, v) => String(!!a.premium) === v }
    ],
    columns: [
      { key: 'title', label: 'Título', render: a => `<div class="cell-main"><span class="thumb">${art(a.cover, { ratio: '4/3' })}</span><span><b>${escape(a.title)}</b><small>${a.premium ? '★ Premium · ' : ''}${a.breaking ? 'Último minuto · ' : ''}${a.featured ? 'Destacado · ' : ''}${escape((a.tags || []).map(t => '#' + t).join(' '))}</small></span></div>` },
      { key: 'categoryId', label: 'Sección', value: a => category(a.categoryId)?.name, render: a => `<span class="small">${escape(category(a.categoryId)?.name || '')}</span>` },
      { key: 'authorId', label: 'Autor', value: a => author(a.authorId)?.name, render: a => `<span class="small">${escape(author(a.authorId)?.name || '—')}</span>` },
      { key: '_when', label: 'Fecha', render: a => `<span class="small">${a.status === 'scheduled' ? '⏱ ' : ''}${date(a._when)}</span>` },
      { key: 'views', label: 'Lecturas', render: a => (isLive(a) ? num(a.views) : '—') },
      { key: 'status', label: 'Estado', render: a => badge(a.status, STATUS) }
    ],
    actions: a => { const r = rules(u, a); return actBtn('view', 'Ver en sitio', '↗') + actBtn('edit', r.edit ? 'Editar' : 'Abrir (lectura)', r.edit ? '✎' : '👁') + (r.remove ? actBtn('del', 'Eliminar', '🗑') : ''); },
    onRow: a => ctx.go(`/articulos/${a.id}`),
    onAction: async (act, a) => {
      if (act === 'edit') ctx.go(`/articulos/${a.id}`);
      if (act === 'view') window.open(`index.html#/articulo/${a.slug}`, '_blank');
      if (act === 'del' && await confirm(`¿Eliminar “${a.title}”? No se puede deshacer.`, { danger: true, ok: 'Eliminar' })) {
        db.remove('articles', a.id); db.query('comments', c => c.articleId === a.id).forEach(c => db.remove('comments', c.id));
        db.log('artículo', `Eliminó “${a.title}”`, u.id); toast('Artículo eliminado', 'success');
      }
    },
    csv: { name: 'articulos', map: a => ({ titulo: a.title, seccion: category(a.categoryId)?.name, autor: author(a.authorId)?.name, estado: STATUS[a.status][0], fecha: date(a._when), lecturas: a.views, premium: a.premium ? 'sí' : 'no' }) }
  });
}

export default {
  id: 'articles', path: '/articulos', label: 'Artículos', icon: '✎', group: 'Redacción', perm: 'articles', live: true,
  render(el, ctx, params) {
    this.live = !params.id;
    params.id ? renderEditor(el, ctx, params.id) : list(el, ctx);
  }
};
