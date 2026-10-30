// Listados: sección, etiqueta, autor y búsqueda.
import { escape, norm } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, liveArticles, category } from '../data/db.js';
import { story, mostRead, adSlot, newsletterBox } from './cards.js';

function paged(el, list, { empty = 'No hay artículos.', size = 9 } = {}) {
  let n = size;
  const box = el.querySelector('[data-list]');
  const draw = () => {
    box.innerHTML = list.length ? `<div class="grid-3 story-grid">${list.slice(0, n).map(a => story(a, 'card')).join('')}</div>${n < list.length ? `<div class="row" style="justify-content:center;margin-top:24px"><button class="btn" data-more>Cargar más (${list.length - n})</button></div>` : ''}` : `<div class="empty card"><span class="icon">⌕</span>${escape(empty)}</div>`;
    box.querySelector('[data-more]')?.addEventListener('click', () => { n += size; draw(); });
  };
  draw();
}

const layout = (head, extra = '') => `<div class="container page-top">${head}<div class="with-sidebar"><div class="main-col">${extra}<div data-list></div></div><aside class="sidebar">${mostRead()}${adSlot('sidebar')}${newsletterBox(true)}</aside></div></div>`;

export function renderSection(el, id) {
  const c = category(id);
  if (!c) { el.innerHTML = `<div class="container page-top empty"><h1>Sección no encontrada</h1><a class="btn btn-primary" href="#/">Ir a portada</a></div>`; return null; }
  const list = liveArticles().filter(a => a.categoryId === id);
  const tags = [...new Set(list.flatMap(a => a.tags || []))].slice(0, 10);
  el.innerHTML = layout(`<header class="list-head" style="--kc:var(--${escape(c.color)})" data-anim><span class="eyebrow">Sección</span><h1>${escape(c.name)}</h1><p class="muted">${escape(c.description)}</p>
    <div class="row" style="gap:6px">${tags.map(t => `<a class="chip" href="#/tag/${escape(t)}">#${escape(db.get('tags', t)?.name || t)}</a>`).join('')}</div></header>`,
    list[0] ? `<div class="sec-lead">${story(list[0], 'lead')}</div>` : '');
  paged(el, list.slice(1), { empty: 'Todavía no hay más artículos en esta sección.' });
  return c.name;
}

export function renderTag(el, id) {
  const t = db.get('tags', id);
  const list = liveArticles().filter(a => (a.tags || []).includes(id));
  el.innerHTML = layout(`<header class="list-head"><span class="eyebrow">Etiqueta</span><h1>#${escape(t?.name || id)}</h1><p class="muted">${list.length} artículo${list.length === 1 ? '' : 's'}</p></header>`);
  paged(el, list, { empty: 'No hay artículos con esta etiqueta.' });
  return '#' + (t?.name || id);
}

export function renderAuthor(el, slugId) {
  const au = db.find('authors', a => a.slug === slugId);
  if (!au) { el.innerHTML = `<div class="container page-top empty"><h1>Autor no encontrado</h1></div>`; return null; }
  const list = liveArticles().filter(a => a.authorId === au.id);
  el.innerHTML = layout(`<header class="list-head author-head card" data-anim><span class="avatar" style="--av:var(--${escape(au.color)});--size:84px">${escape(initials(au.name))}</span><div><span class="eyebrow">${escape(au.beat)}</span><h1>${escape(au.name)}</h1><p class="muted">${escape(au.bio)}</p><p class="small">${escape(au.twitter || '')} · ${list.length} artículos publicados</p></div></header>`);
  paged(el, list, { empty: 'Este autor aún no tiene artículos publicados.' });
  return au.name;
}

export function renderSearch(el, query = {}) {
  const q = query.q || '', cat = query.cat || '';
  const terms = norm(q).split(/\s+/).filter(Boolean);
  const scored = liveArticles().map(a => {
    const hay = norm(`${a.title} ${a.dek} ${(a.tags || []).join(' ')} ${(a.blocks || []).map(b => b.text || '').join(' ')}`);
    const title = norm(a.title);
    const score = terms.reduce((s, t) => s + (title.includes(t) ? 3 : 0) + (hay.includes(t) ? 1 : 0), 0);
    return { a, score, all: terms.every(t => hay.includes(t)) };
  }).filter(x => terms.length && x.all && (!cat || x.a.categoryId === cat)).sort((x, y) => y.score - x.score).map(x => x.a);
  const cats = db.all('categories').sort((a, b) => a.order - b.order);
  el.innerHTML = layout(`<header class="list-head"><span class="eyebrow">Buscador</span><h1>${q ? `Resultados para “${escape(q)}”` : 'Buscar en Brújula'}</h1>
    <form class="row search-big" data-s role="search" style="gap:8px;flex-wrap:nowrap"><input class="input" type="search" name="q" value="${escape(q)}" placeholder="Ej: pensiones, cobre, La Roja…" aria-label="Términos de búsqueda"><button class="btn btn-primary">Buscar</button></form>
    ${q ? `<div class="row" style="gap:6px;margin-top:12px"><a class="chip ${!cat ? 'active' : ''}" href="#/buscar?q=${encodeURIComponent(q)}">Todas</a>${cats.map(c => `<a class="chip ${cat === c.id ? 'active' : ''}" href="#/buscar?q=${encodeURIComponent(q)}&cat=${c.id}">${escape(c.name)}</a>`).join('')}</div><p class="small muted">${scored.length} resultado${scored.length === 1 ? '' : 's'}</p>` : ''}</header>`);
  el.querySelector('[data-s]').onsubmit = e => { e.preventDefault(); location.hash = `#/buscar?q=${encodeURIComponent(e.target.q.value.trim())}`; };
  paged(el, scored, { empty: q ? 'No encontramos artículos. Prueba con otras palabras.' : 'Escribe algo para buscar.' });
  if (q && terms.length) el.querySelectorAll('.story h3 a').forEach(h => { let html = h.innerHTML; terms.forEach(t => { html = html.replace(new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark>$1</mark>'); }); h.innerHTML = html; });
  return 'Buscar';
}
