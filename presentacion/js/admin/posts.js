// Blog y noticias: listado, editor con vista previa y publicación programada.
import { escape, toast, confirm, date, dateTime, slug, num } from '../../../assets/core/ui.js';
import { db, POST_STATUS } from '../data/db.js';
import { pageHead, table, actBtn, f, readForm, validate, badge } from '../shared/admin-kit.js';
import { art, artPicker, wireArtPickers, pickArtFields } from '../shared/art.js';

const CATS = ['Noticias', 'Estrategia', 'Branding', 'Producto', 'Motion', 'Packaging'];
const effStatus = p => (p.status === 'published' && new Date(p.publishedAt) > new Date() ? 'scheduled' : p.status);

function list(el, ctx) {
  el.innerHTML = `${pageHead('Blog y noticias', `${db.count('posts', p => p.status === 'published')} publicados · ${db.count('posts', p => p.status === 'draft')} borradores`, '<a class="btn btn-primary" href="#/blog/nuevo">＋ Nuevo artículo</a>')}<div data-t></div>`;
  table(el.querySelector('[data-t]'), {
    id: 'posts', rows: db.all('posts').map(p => ({ ...p, _st: effStatus(p) })), sort: 'publishedAt', dir: -1, search: p => p.title + p.excerpt,
    filters: [{ key: '_st', label: 'Estado', options: Object.entries(POST_STATUS).map(([k, [l]]) => [k, l]) }, { key: 'category', label: 'Categoría', options: CATS }],
    columns: [
      { key: 'title', label: 'Título', render: p => `<div class="cell-main"><span class="thumb">${art(p.art, { ratio: '16/10' })}</span><span><b>${escape(p.title)}</b><small>${escape(db.get('team', p.authorId)?.name || '—')}</small></span></div>` },
      { key: 'category', label: 'Categoría' },
      { key: 'publishedAt', label: 'Fecha', render: p => date(p.publishedAt) },
      { key: 'views', label: 'Lecturas', render: p => num(p.views) },
      { key: '_st', label: 'Estado', render: p => badge(p._st, POST_STATUS) }
    ],
    actions: p => (p._st === 'draft' ? actBtn('pub', 'Publicar ahora', '⇪') : actBtn('unpub', 'Pasar a borrador', '⇩')) + actBtn('edit', 'Editar', '✎') + actBtn('del', 'Eliminar', '🗑'),
    onRow: p => ctx.go(`/blog/${p.id}`),
    onAction: async (a, p) => {
      if (a === 'edit') ctx.go(`/blog/${p.id}`);
      if (a === 'pub') { db.update('posts', p.id, { status: 'published', publishedAt: new Date().toISOString() }); db.log('blog', `Publicó “${p.title}”`, ctx.user.id); toast('Artículo publicado', 'success'); }
      if (a === 'unpub') { db.update('posts', p.id, { status: 'draft' }); db.log('blog', `Despublicó “${p.title}”`, ctx.user.id); toast('Pasado a borrador', 'info'); }
      if (a === 'del' && await confirm(`¿Eliminar “${p.title}”?`, { danger: true, ok: 'Eliminar' })) { db.remove('posts', p.id); db.log('blog', `Eliminó “${p.title}”`, ctx.user.id); toast('Artículo eliminado', 'success'); }
    },
    csv: { name: 'articulos', map: p => ({ titulo: p.title, categoria: p.category, estado: POST_STATUS[p._st][0], fecha: date(p.publishedAt), lecturas: p.views }) }
  });
}

function editor(el, ctx, id) {
  const isNew = id === 'nuevo';
  const p = isNew ? { title: '', excerpt: '', body: [], category: 'Noticias', authorId: db.all('team')[0]?.id, status: 'draft', tags: [], readMin: 4, featured: false, publishedAt: new Date().toISOString(), art: { c1: 'accent', c2: 'primary', shape: 'wave', seed: 5 } } : db.get('posts', id);
  if (!p) { el.innerHTML = `<div class="card empty"><h2>Artículo no encontrado</h2><a class="btn" href="#/blog">Volver</a></div>`; return; }
  const local = new Date(new Date(p.publishedAt).getTime() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
  el.innerHTML = `${pageHead(isNew ? 'Nuevo artículo' : 'Editar artículo', `<a href="#/blog">← Blog</a>${isNew ? '' : ` · ${badge(effStatus(p), POST_STATUS)} · ${num(p.views)} lecturas`}`, `${!isNew && effStatus(p) === 'published' ? `<a class="btn" href="index.html#/blog/${escape(p.slug)}" target="_blank" rel="noopener">↗ Ver</a>` : ''}<button class="btn" data-save="draft">Guardar borrador</button><button class="btn btn-primary" data-save="published">Publicar</button>`)}
    <form class="detail-grid" data-f novalidate>
      <div class="stack"><div class="card stack">
        ${f.text('title', 'Título', p.title, { required: true })}
        ${f.area('excerpt', 'Bajada / extracto', p.excerpt, { required: true, rows: 2 })}
        ${f.area('body', 'Contenido (un párrafo por línea en blanco)', (p.body || []).join('\n\n'), { rows: 14 })}
      </div>
      <div class="card"><div class="card-head"><h3>Vista previa</h3><span class="badge plain" data-words></span></div><div class="prose" data-prev style="margin:0"></div></div></div>
      <div class="stack">
        <div class="card stack"><h3>Publicación</h3>
          ${f.text('publishedAt', 'Fecha de publicación', local, { type: 'datetime-local', help: 'Si es futura, queda programado.' })}
          ${f.select('category', 'Categoría', CATS, p.category)}
          ${f.select('authorId', 'Autor', db.all('team').map(t => [t.id, t.name]), p.authorId)}
          ${f.text('tags', 'Etiquetas (coma)', (p.tags || []).join(', '))}
          ${f.sw('featured', 'Destacado en el blog', p.featured)}
        </div>
        <div class="card stack"><h3>Imagen de portada</h3>${artPicker('art', p.art)}</div>
        ${isNew ? '' : `<div class="card small muted">Creado ${dateTime(p.createdAt)}${p.updatedAt ? `<br>Actualizado ${dateTime(p.updatedAt)}` : ''}</div>`}
      </div>
    </form>`;
  const form = el.querySelector('[data-f]');
  wireArtPickers(form);
  const prev = () => {
    const v = readForm(form);
    const paras = v.body.split(/\n\s*\n/).filter(Boolean);
    const words = (v.body + ' ' + v.excerpt).split(/\s+/).filter(Boolean).length;
    el.querySelector('[data-words]').textContent = `${words} palabras · ${Math.max(1, Math.round(words / 200))} min`;
    el.querySelector('[data-prev]').innerHTML = `<h2>${escape(v.title || 'Sin título')}</h2><p class="lead">${escape(v.excerpt)}</p>${paras.map(t => `<p>${escape(t)}</p>`).join('')}`;
  };
  form.addEventListener('input', prev); prev();
  el.querySelectorAll('[data-save]').forEach(b => b.onclick = () => {
    if (!validate(form)) return;
    const v = readForm(form);
    const artV = pickArtFields(v, 'art');
    const body = v.body.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
    const words = (v.body + ' ' + v.excerpt).split(/\s+/).length;
    const data = { ...v, body, art: artV, status: b.dataset.save, tags: v.tags.split(',').map(s => s.trim().toLowerCase()).filter(Boolean), slug: slug(v.title), readMin: Math.max(1, Math.round(words / 200)), publishedAt: new Date(v.publishedAt || Date.now()).toISOString() };
    const scheduled = data.status === 'published' && new Date(data.publishedAt) > new Date();
    if (isNew) { const row = db.insert('posts', { ...data, views: 0 }); ctx.go(`/blog/${row.id}`); }
    else db.update('posts', p.id, data);
    db.log('blog', `${data.status === 'draft' ? 'Guardó borrador' : scheduled ? 'Programó' : 'Publicó'} “${data.title}”`, ctx.user.id);
    toast(data.status === 'draft' ? 'Borrador guardado' : scheduled ? `Programado para ${dateTime(data.publishedAt)}` : 'Artículo publicado', 'success');
    if (!isNew) ctx.refresh();
  });
}

export default {
  id: 'posts', path: '/blog', label: 'Blog y noticias', icon: '✍', group: 'Contenido', perm: 'posts', live: true,
  render(el, ctx, params) { this.live = !params.id; params.id ? editor(el, ctx, params.id) : list(el, ctx); }
};
