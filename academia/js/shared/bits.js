// Piezas visuales compartidas: portada de curso, tarjeta, estrellas, precio y cabecera pública.
import { escape, money } from '../../../assets/core/ui.js';
import { db, auth, homeFor } from '../data/db.js';
import { getCategory, getUser, rating, priceOf, courseMinutes, fmtHours, studentsCount, lessonsOf } from '../data/model.js';
import { getCart, onCart } from './cart.js';

export const LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3l3 5h-6z" fill="currentColor"/><path d="M12.5 9h7l2 18h-11z" fill="currentColor" opacity=".85"/><path d="M4 12l7-1M28 12l-7-1M5 7l6 2.5M27 7l-6 2.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><rect x="9" y="27" width="14" height="2.5" rx="1" fill="currentColor"/></svg>';
export const brandHTML = (hook = true) => `<a class="brand${hook ? ' site-brand' : ''}" href="index.html#/" aria-label="Academia Faro, inicio">${LOGO}<span><b>Academia Faro</b><small>Cursos online</small></span></a>`;

export const cover = (c, cls = '') => `<div class="cover tone-${c.tone || 'primary'} ${cls}" aria-hidden="true"><span class="cover-emoji">${escape(c.emoji || '📘')}</span><span class="cover-cat">${escape(getCategory(c.categoryId)?.name || '')}</span></div>`;
export const starRow = (avg, count) => `<span class="stars" title="${avg} de 5"><b>${avg ? avg.toFixed(1).replace('.', ',') : '—'}</b> <span class="st" aria-hidden="true">${'★'.repeat(Math.round(avg))}${'☆'.repeat(5 - Math.round(avg))}</span>${count != null ? ` <small>(${count})</small>` : ''}</span>`;
export function priceTag(c) {
  const p = priceOf(c);
  if (!p) return '<span class="price free">Gratis</span>';
  return `<span class="price"><b>${money(p)}</b>${p < c.price ? ` <s>${money(c.price)}</s>` : ''}</span>`;
}
export function courseCard(c) {
  const r = rating(c.id), inst = getUser(c.instructorId);
  return `<article class="card course-card hover">
    <a href="index.html#/curso/${escape(c.slug)}" class="course-link" aria-label="${escape(c.title)}">${cover(c)}</a>
    <div class="course-body">
      <h3><a href="index.html#/curso/${escape(c.slug)}">${escape(c.title)}</a></h3>
      <p class="small muted">${escape(inst?.name || '')}</p>
      ${starRow(r.avg, r.count)}
      <p class="small muted course-meta">${fmtHours(courseMinutes(c))} · ${lessonsOf(c).length} lecciones · ${escape(c.level)}</p>
      <div class="row between">${priceTag(c)}${c.salePrice && c.salePrice < c.price ? '<span class="badge badge-danger">Oferta</span>' : studentsCount(c.id) > 30 ? '<span class="badge badge-warning">Popular</span>' : ''}</div>
    </div>
  </article>`;
}

export function mountHeader(el, { search = true } = {}) {
  const paint = () => {
    const u = auth.current();
    const n = getCart().length;
    el.className = 'site-header';
    el.innerHTML = `<div class="container bar">
      ${brandHTML()}
      ${search ? `<form class="head-search" role="search" data-search><input class="input" type="search" name="q" placeholder="¿Qué quieres aprender?" aria-label="Buscar cursos"></form>` : ''}
      <nav class="site-nav" aria-label="Principal"><a href="index.html#/cursos">Cursos</a><a href="index.html#/categorias">Categorías</a><a href="index.html#/ensena">Enseña en Faro</a>${u ? `<a class="show-m" href="${homeFor(u.role)}">${u.role === 'estudiante' ? 'Mi aprendizaje' : 'Mi panel'}</a>` : '<a class="show-m" href="login.html">Ingresar</a><a class="show-m" href="login.html#registro">Crear cuenta</a>'}</nav>
      <div class="head-actions site-actions">
        <a class="btn btn-ghost btn-icon cart-btn" href="index.html#/carrito" aria-label="Carrito (${n})">🛒${n ? `<span class="dot">${n}</span>` : ''}</a>
        ${u ? `<a class="btn btn-sm btn-primary auth-cta" href="${homeFor(u.role)}">${u.role === 'estudiante' ? 'Mi aprendizaje' : 'Mi panel'}</a><button class="btn btn-sm btn-ghost hide-m" data-logout>Salir</button>` : `<a class="btn btn-sm hide-m" href="login.html">Ingresar</a><a class="btn btn-sm btn-primary auth-cta" href="login.html#registro">Crear cuenta</a>`}
        <button class="btn btn-ghost btn-icon burger" aria-label="Abrir menú" aria-expanded="false">☰</button>
      </div></div>`;
    el.querySelector('.burger').onclick = e => { const o = el.classList.toggle('nav-open'); e.currentTarget.setAttribute('aria-expanded', o); };
    el.querySelector('.site-nav').onclick = e => { if (e.target.closest('a')) el.classList.remove('nav-open'); };
    el.querySelector('[data-logout]')?.addEventListener('click', () => { auth.logout(); location.href = 'index.html'; });
    el.querySelector('[data-search]')?.addEventListener('submit', e => { e.preventDefault(); const q = e.target.q.value.trim(); location.href = `index.html#/cursos${q ? '?q=' + encodeURIComponent(q) : ''}`; });
  };
  paint();
  onCart(paint);
  db.subscribe(ch => { if (ch?.type === 'reset' || ch?.type === 'sync') paint(); });
  return paint;
}
