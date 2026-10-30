// Portafolio: listado con filtros y ficha de proyecto.
import { escape, norm } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db } from '../data/db.js';
import { sectionHead } from './layout.js';
import { projectCard, catName, publishedProjects, stars } from './cards.js';
import { art } from '../shared/art.js';

export function renderWork(el, query = {}) {
  const cats = db.all('categories');
  const all = publishedProjects();
  let cat = query.cat || 'all', q = '';
  el.innerHTML = `<section class="section page-top"><div class="container">
    ${sectionHead('Portafolio', 'Trabajos seleccionados', `${all.length} proyectos de branding, producto digital, motion y packaging.`)}
    <div class="row between work-tools" data-anim>
      <div class="row filters" role="group" aria-label="Filtrar por categoría" style="gap:8px">
        <button class="chip" data-cat="all">Todos</button>${cats.map(c => `<button class="chip" data-cat="${escape(c.id)}">${escape(c.name)} <small>${all.filter(p => p.category === c.id).length}</small></button>`).join('')}
      </div>
      <input class="input" type="search" placeholder="Buscar proyecto o cliente…" aria-label="Buscar proyecto" style="max-width:280px" data-q>
    </div>
    <div class="grid-3" data-grid></div>
  </div></section>`;
  const grid = el.querySelector('[data-grid]');
  const draw = () => {
    el.querySelectorAll('[data-cat]').forEach(b => { b.classList.toggle('active', b.dataset.cat === cat); b.setAttribute('aria-pressed', b.dataset.cat === cat); });
    const list = all.filter(p => (cat === 'all' || p.category === cat) && (!q || norm(p.title + ' ' + p.client + ' ' + p.summary).includes(norm(q))));
    grid.innerHTML = list.length ? list.map(projectCard).join('') : `<div class="empty" style="grid-column:1/-1"><span class="icon">⌕</span>No encontramos proyectos con ese filtro.</div>`;
  };
  el.querySelector('.filters').addEventListener('click', e => { const b = e.target.closest('[data-cat]'); if (b) { cat = b.dataset.cat; draw(); } });
  el.querySelector('[data-q]').addEventListener('input', e => { q = e.target.value; draw(); });
  draw();
}

export function renderProject(el, slugId) {
  const all = publishedProjects();
  const i = all.findIndex(p => p.slug === slugId);
  const p = all[i];
  if (!p) { el.innerHTML = `<section class="section page-top"><div class="container empty"><span class="icon">?</span><h2>Proyecto no encontrado</h2><p>Puede que haya sido despublicado.</p><a class="btn btn-primary" href="#/trabajos">Volver al portafolio</a></div></section>`; return null; }
  const prev = all[(i - 1 + all.length) % all.length], next = all[(i + 1) % all.length];
  const tm = db.find('testimonials', t => t.projectId === p.id && t.published);
  el.innerHTML = `<article class="page-top">
    <section class="section project-hero"><div class="container">
      <a class="small" href="#/trabajos">← Portafolio</a>
      <div class="project-head" data-anim>
        <div><span class="eyebrow">${escape(catName(p.category))} · ${escape(p.year)}</span><h1>${escape(p.title)}</h1><p class="lead">${escape(p.summary)}</p></div>
        <dl class="card facts"><div><dt>Cliente</dt><dd>${escape(p.client)}</dd></div><div><dt>Año</dt><dd>${escape(p.year)}</dd></div><div><dt>Servicios</dt><dd>${escape((p.services || []).join(', '))}</dd></div><div><dt>Etiquetas</dt><dd>${(p.tags || []).map(t => `<span class="badge plain">${escape(t)}</span>`).join(' ')}</dd></div></dl>
      </div>
      ${art(p.art, { ratio: '21/9', cls: 'project-cover', label: p.title, icon: p.icon })}
    </div></section>
    <section class="section"><div class="container grid-2 case">
      <div data-anim><span class="eyebrow">El desafío</span><p class="big-p">${escape(p.challenge)}</p></div>
      <div data-anim><span class="eyebrow">Nuestra respuesta</span><p class="big-p">${escape(p.solution)}</p></div>
    </div></section>
    <section class="section alt"><div class="container">
      <div class="gallery">${(p.gallery || []).map((g, k) => `<figure class="${k === 0 ? 'wide' : ''}" data-anim>${art(g, { ratio: k === 0 ? '16/7' : '4/3', label: g.caption })}<figcaption class="small muted">${escape(g.caption || '')}</figcaption></figure>`).join('')}</div>
    </div></section>
    <section class="section"><div class="container">
      <div class="grid-3">${(p.results || []).map(r => `<div class="card result"><span class="big-num">${escape(r.value)}</span><p class="muted">${escape(r.label)}</p></div>`).join('')}</div>
      ${tm ? `<figure class="card quote solo" data-anim>${stars(tm.rating)}<blockquote>“${escape(tm.quote)}”</blockquote><figcaption class="row" style="gap:12px"><span class="avatar">${escape(initials(tm.author))}</span><span><b>${escape(tm.author)}</b><br><small class="muted">${escape(tm.role)}, ${escape(tm.company)}</small></span></figcaption></figure>` : ''}
    </div></section>
    <nav class="container project-nav row between" aria-label="Otros proyectos">
      <a class="card hover" href="#/trabajos/${escape(prev.slug)}"><small class="muted">← Anterior</small><b>${escape(prev.title)}</b></a>
      <a class="btn btn-primary" href="#/cotizar">Quiero algo así</a>
      <a class="card hover" href="#/trabajos/${escape(next.slug)}" style="text-align:right"><small class="muted">Siguiente →</small><b>${escape(next.title)}</b></a>
    </nav>
  </article>`;
  return p.title;
}
