// Base de conocimiento pública: portada con buscador, categorías, artículo con votación y búsqueda.
import { db } from '../data/db.js';
import { escape, date, toast, norm } from '../../../assets/core/ui.js';
import { icon } from '../shared/icons.js';
import { md, excerpt, searchArticles, catName } from '../shared/util.js';
import { visitorId } from '../shared/chat-widget.js';

const published = () => db.query('articles', a => a.status === 'publicado');
const searchBox = (q = '') => `<form class="kb-search" data-search role="search"><span class="kb-search-ico">${icon('search', 20)}</span><input class="input" name="q" type="search" value="${escape(q)}" placeholder="Ej: internet lento, boleta, cambiar clave WiFi…" aria-label="Buscar en el centro de ayuda" autocomplete="off"><button class="btn btn-primary">Buscar</button><div class="kb-suggest card" data-suggest hidden></div></form>`;
const artCard = a => `<a class="card hover art-card" href="#/articulo/${a.id}"><small class="eyebrow">${escape(catName(a.categoryId))}</small><b>${escape(a.title)}</b><span class="muted small">${escape(excerpt(a.body, 110))}</span></a>`;

export function home(view) {
  const help = db.getValue('help', {});
  const cats = db.all('categories').sort((a, b) => a.order - b.order);
  const arts = published();
  const featured = arts.filter(a => a.featured).slice(0, 6);
  const popular = [...arts].sort((a, b) => b.views - a.views).slice(0, 5);
  const live = db.query('incidents', i => i.status !== 'resuelto');
  view.innerHTML = `
    <section class="kb-hero site-hero"><div class="container stack center-stack" data-anim>
      <div class="hero-text stack center-stack"><h1>${escape(help.heroTitle)}</h1>
      <p class="lead">${escape(help.heroSubtitle)}</p>
      ${searchBox()}</div>
      <div class="row chips-row hero-media">${['velocidad', 'boleta', 'router', 'traslado', 'wifi'].map(t => `<a class="chip" href="#/buscar?q=${t}">${t}</a>`).join('')}</div>
    </div></section>
    ${live.length ? `<div class="container status-wrap"><a class="card status-strip" href="estado.html" data-anim>${icon('activity', 20)}<span><b>${live.length === 1 ? 'Hay 1 incidente activo' : `Hay ${live.length} incidentes activos`}:</b> ${escape(live[0].title)}</span><span class="btn btn-sm">Ver estado</span></a></div>` : ''}
    <section class="section kb-cats"><div class="container stack">
      <h2 data-anim>Explora por tema</h2>
      <div class="grid-3">${cats.map(c => `<a class="card hover cat-card" href="#/categoria/${c.id}"><span class="cat-ico">${icon(c.icon, 26)}</span><b>${escape(c.name)}</b><span class="muted small">${escape(c.description)}</span><small class="muted">${arts.filter(a => a.categoryId === c.id).length} artículos</small></a>`).join('')}</div>
    </div></section>
    <section class="section alt kb-featured"><div class="container kb-two">
      <div class="stack"><h2 data-anim>Guías destacadas</h2><div class="grid-2">${featured.map(artCard).join('')}</div></div>
      <aside class="stack"><h3 data-anim>Más leídos</h3><ol class="popular card">${popular.map(a => `<li><a href="#/articulo/${a.id}">${escape(a.title)}</a><small class="muted">${a.views.toLocaleString('es-CL')} lecturas</small></li>`).join('')}</ol></aside>
    </div></section>
    <section class="section kb-ways"><div class="container grid-3 help-ways">
      <div class="card stack" data-anim><span class="cat-ico">${icon('chat', 24)}</span><h3>Chat en línea</h3><p class="muted">Nuestro asistente responde al instante y te deriva a un agente si lo necesitas.</p><button class="btn" data-openchat>Abrir chat</button></div>
      <div class="card stack" data-anim data-anim-delay="100"><span class="cat-ico">${icon('mail', 24)}</span><h3>Escríbenos</h3><p class="muted">Crea un ticket y sigue la respuesta desde tu portal de clientes.</p><a class="btn" href="#/contacto">Crear ticket</a></div>
      <div class="card stack" data-anim data-anim-delay="200"><span class="cat-ico">${icon('phone', 24)}</span><h3>Llámanos</h3><p class="muted"><b>${escape(help.phone)}</b><br>${escape(help.hours)}</p><a class="btn" href="estado.html">Estado del servicio</a></div>
    </div></section>`;
}

export function category(view, id) {
  const c = db.get('categories', id);
  if (!c) return notFound(view);
  const arts = published().filter(a => a.categoryId === id).sort((a, b) => b.views - a.views);
  view.innerHTML = `<section class="section"><div class="container stack">
    ${crumbs([[c.name]])}
    <div class="row" style="gap:14px"><span class="cat-ico lg">${icon(c.icon, 30)}</span><div><h1 style="margin:0">${escape(c.name)}</h1><p class="muted" style="margin:0">${escape(c.description)}</p></div></div>
    ${searchBox()}
    <div class="art-list">${arts.map(a => `<a class="art-row" href="#/articulo/${a.id}"><span>${icon('book', 18)}</span><span><b>${escape(a.title)}</b><small class="muted">${escape(excerpt(a.body, 150))}</small></span>${icon('arrow', 16)}</a>`).join('') || '<div class="empty card">Aún no hay artículos publicados en esta categoría.</div>'}</div>
  </div></section>`;
}

export function article(view, id) {
  const a = db.get('articles', id);
  if (!a || a.status !== 'publicado') return notFound(view);
  // Una vista por sesión de navegador
  try { const k = 'atiende:seen:' + id; if (!sessionStorage.getItem(k)) { sessionStorage.setItem(k, '1'); db.update('articles', id, x => ({ views: (x.views || 0) + 1 })); } } catch (e) { /* sin almacenamiento */ }
  const c = db.get('categories', a.categoryId);
  const vote = db.find('votes', v => v.articleId === id && v.visitorId === visitorId());
  const related = published().filter(x => x.categoryId === a.categoryId && x.id !== id).slice(0, 4);
  const total = a.helpfulYes + a.helpfulNo;
  view.innerHTML = `<section class="section kb-article"><div class="container kb-two">
    <article class="stack" style="min-width:0">
      ${crumbs([[c?.name, `#/categoria/${a.categoryId}`], [a.title]])}
      <h1 class="art-title">${escape(a.title)}</h1>
      <p class="muted small">Actualizado el ${date(a.editedAt || a.createdAt)} · ${a.views.toLocaleString('es-CL')} lecturas${total ? ` · a ${Math.round(a.helpfulYes / total * 100)}% le resultó útil` : ''}</p>
      <div class="card prose">${md(a.body)}</div>
      <div class="card vote-box" data-vote>
        ${vote ? `<p style="margin:0">${vote.value ? '¡Gracias! Nos alegra que te sirviera.' : 'Gracias por contarnos. ¿Quieres que te ayudemos directamente?'}</p>${vote.value ? '' : '<a class="btn btn-primary btn-sm" href="#/contacto">Crear un ticket</a>'}`
          : `<b>¿Te resultó útil este artículo?</b><div class="row" style="gap:8px"><button class="btn btn-sm" data-v="1">${icon('thumbup', 16)} Sí</button><button class="btn btn-sm" data-v="0">${icon('thumbdown', 16)} No</button></div>`}
      </div>
    </article>
    <aside class="stack">
      <div class="card stack"><h3 style="margin:0">Artículos relacionados</h3>${related.map(r => `<a href="#/articulo/${r.id}">${escape(r.title)}</a>`).join('') || '<small class="muted">Sin relacionados</small>'}</div>
      <div class="card stack"><h3 style="margin:0">¿Sigues con problemas?</h3><p class="muted small" style="margin:0">Nuestro equipo te responde en minutos.</p><button class="btn btn-primary" data-openchat>Chatear ahora</button><a class="btn" href="#/contacto">Crear ticket</a></div>
    </aside>
  </div></section>`;
  view.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
    const value = b.dataset.v === '1';
    db.insert('votes', { articleId: id, visitorId: visitorId(), value });
    db.update('articles', id, x => value ? { helpfulYes: x.helpfulYes + 1 } : { helpfulNo: x.helpfulNo + 1 });
    toast('¡Gracias por tu opinión!', 'success');
  });
}

export function search(view, q = '') {
  const res = searchArticles(q, { limit: 20 });
  view.innerHTML = `<section class="section"><div class="container stack">
    ${crumbs([['Búsqueda']])}
    <h1 style="margin:0">Resultados para “${escape(q)}”</h1>
    ${searchBox(q)}
    <p class="muted" style="margin:0">${res.length} artículo${res.length === 1 ? '' : 's'} encontrado${res.length === 1 ? '' : 's'}</p>
    <div class="art-list">${res.map(a => `<a class="art-row" href="#/articulo/${a.id}"><span>${icon('book', 18)}</span><span><b>${highlight(a.title, q)}</b><small class="muted">${escape(catName(a.categoryId))} · ${escape(excerpt(a.body, 140))}</small></span>${icon('arrow', 16)}</a>`).join('') ||
      `<div class="card empty"><span class="icon">${icon('search', 36)}</span><p>No encontramos artículos para tu búsqueda.</p><a class="btn btn-primary" href="#/contacto">Escríbenos</a></div>`}</div>
  </div></section>`;
}

function highlight(text, q) {
  let out = escape(text);
  norm(q).split(/\s+/).filter(w => w.length > 2).forEach(w => { out = out.replace(new RegExp(`(${w.replace(/[^a-z0-9ñ]/g, '')})`, 'ig'), '<mark>$1</mark>'); });
  return out;
}
const crumbs = items => `<nav class="crumbs small" aria-label="Ruta"><a href="#/">Centro de ayuda</a>${items.map(([l, h]) => ` <span>›</span> ${h ? `<a href="${h}">${escape(l)}</a>` : `<span>${escape(l)}</span>`}`).join('')}</nav>`;
export function notFound(view) { view.innerHTML = `<section class="section"><div class="container card empty"><h2>No encontramos esa página</h2><a class="btn btn-primary" href="#/">Volver al centro de ayuda</a></div></section>`; }

// Buscador con sugerencias en vivo (delegado sobre el contenedor principal).
export function wireSearch(root) {
  root.addEventListener('submit', e => {
    const f = e.target.closest('[data-search]');
    if (!f) return;
    e.preventDefault();
    const q = f.q.value.trim();
    if (q) location.hash = `#/buscar?q=${encodeURIComponent(q)}`;
  });
  root.addEventListener('input', e => {
    const f = e.target.closest('[data-search]');
    if (!f) return;
    const box = f.querySelector('[data-suggest]');
    const res = searchArticles(e.target.value, { limit: 5 });
    box.hidden = !res.length || e.target.value.trim().length < 3;
    box.innerHTML = res.map(a => `<a href="#/articulo/${a.id}">${icon('book', 14)} ${escape(a.title)}</a>`).join('');
  });
  document.addEventListener('click', e => { if (!e.target.closest('[data-search]')) root.querySelectorAll('[data-suggest]').forEach(b => { b.hidden = true; }); });
}
