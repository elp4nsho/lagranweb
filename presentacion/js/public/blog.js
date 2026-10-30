// Blog / noticias del estudio.
import { escape, date, norm } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db } from '../data/db.js';
import { sectionHead } from './layout.js';
import { postCard, publishedPosts } from './cards.js';
import { art } from '../shared/art.js';

export function renderBlog(el, query = {}) {
  const all = publishedPosts();
  const cats = [...new Set(all.map(p => p.category))];
  let cat = query.cat || 'all', q = query.tag ? '' : '', tag = query.tag || '';
  const feat = all.find(p => p.featured) || all[0];
  el.innerHTML = `<section class="section page-top"><div class="container">
    ${sectionHead('Blog y noticias', 'Ideas, procesos y novedades del estudio')}
    ${feat ? `<a class="card hover post-feature" href="#/blog/${escape(feat.slug)}" data-anim>${art(feat.art, { ratio: '16/9' })}<div class="stack" style="gap:10px"><span class="badge badge-primary">Destacado</span><h2>${escape(feat.title)}</h2><p class="muted">${escape(feat.excerpt)}</p><span class="small muted">${date(feat.publishedAt)} · ${feat.readMin} min de lectura</span></div></a>` : ''}
    <div class="row between work-tools" style="margin-top:32px">
      <div class="row filters" style="gap:8px"><button class="chip" data-cat="all">Todo</button>${cats.map(c => `<button class="chip" data-cat="${escape(c)}">${escape(c)}</button>`).join('')}</div>
      <input class="input" type="search" placeholder="Buscar en el blog…" aria-label="Buscar en el blog" style="max-width:280px" data-q>
    </div>
    ${tag ? `<p class="small">Etiqueta: <span class="badge badge-primary">#${escape(tag)}</span> <a href="#/blog">Quitar filtro</a></p>` : ''}
    <div class="grid-3" data-grid></div>
  </div></section>`;
  const grid = el.querySelector('[data-grid]');
  const draw = () => {
    el.querySelectorAll('[data-cat]').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
    const list = all.filter(p => (cat === 'all' || p.category === cat) && (!tag || (p.tags || []).includes(tag)) && (!q || norm(p.title + p.excerpt).includes(norm(q))));
    grid.innerHTML = list.length ? list.map(postCard).join('') : `<div class="empty" style="grid-column:1/-1">No hay artículos con ese filtro.</div>`;
  };
  el.querySelector('.filters').addEventListener('click', e => { const b = e.target.closest('[data-cat]'); if (b) { cat = b.dataset.cat; draw(); } });
  el.querySelector('[data-q]').addEventListener('input', e => { q = e.target.value; draw(); });
  draw();
}

export function renderPost(el, slugId) {
  const all = publishedPosts();
  const p = all.find(x => x.slug === slugId);
  if (!p) { el.innerHTML = `<section class="section page-top"><div class="container empty"><h2>Artículo no encontrado</h2><a class="btn btn-primary" href="#/blog">Volver al blog</a></div></section>`; return null; }
  db.update('posts', p.id, { views: (p.views || 0) + 1 });
  const a = db.get('team', p.authorId);
  const related = all.filter(x => x.id !== p.id && x.category === p.category).concat(all.filter(x => x.id !== p.id && x.category !== p.category)).slice(0, 3);
  el.innerHTML = `<article class="page-top">
    <section class="section"><div class="container narrow">
      <a class="small" href="#/blog">← Blog</a>
      <span class="eyebrow" style="display:block;margin-top:16px">${escape(p.category)}</span>
      <h1>${escape(p.title)}</h1>
      <div class="row small muted" style="gap:12px">${a ? `<span class="avatar" style="--av:var(--${escape(a.color)});--size:32px">${escape(initials(a.name))}</span><span><b>${escape(a.name)}</b> · ${escape(a.role)}</span>` : ''}<span>${date(p.publishedAt)}</span><span>${p.readMin} min de lectura</span></div>
    </div>
    <div class="container" style="margin-top:28px">${art(p.art, { ratio: '21/9' })}</div>
    <div class="container narrow prose">
      ${(p.body || []).map((t, i) => i === 0 ? `<p class="lead">${escape(t)}</p>` : `<p>${escape(t)}</p>`).join('')}
      <div class="row" style="gap:6px">${(p.tags || []).map(t => `<a class="chip" href="#/blog?tag=${encodeURIComponent(t)}">#${escape(t)}</a>`).join('')}</div>
      <div class="row share" style="gap:8px"><span class="small muted">Compartir:</span><button class="btn btn-sm" data-share>Copiar enlace</button></div>
    </div></section>
    ${related.length ? `<section class="section alt"><div class="container"><h2>Sigue leyendo</h2><div class="grid-3">${related.map(postCard).join('')}</div></div></section>` : ''}
  </article>`;
  el.querySelector('[data-share]').onclick = () => {
    navigator.clipboard?.writeText(location.href).catch(() => {});
    import('../../../assets/core/ui.js').then(({ toast }) => toast('Enlace copiado al portapapeles', 'success'));
  };
  return p.title;
}
