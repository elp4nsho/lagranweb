// Portada: buscador, banners CMS, destacadas, comunas y proyectos.
import { escape, num } from '../../../assets/core/ui.js';
import { db, settings, uf } from '../data/db.js';
import { COMUNAS } from '../shared/geo.js';
import { TYPES, fmtUF, ufM2, qs } from '../shared/format.js';
import { propertyArt, icon } from '../shared/art.js';
import { propertyCard, V } from './cards.js';

export function searchForm(q = {}, compact = false) {
  const op = q.op || 'venta';
  return `<form class="card searchbox" data-search>
    <div class="tabs" role="tablist">
      <button type="button" class="tab ${op === 'venta' ? 'active' : ''}" data-op="venta" role="tab" aria-selected="${op === 'venta'}">Comprar</button>
      <button type="button" class="tab ${op === 'arriendo' ? 'active' : ''}" data-op="arriendo" role="tab" aria-selected="${op === 'arriendo'}">Arrendar</button>
    </div>
    <input type="hidden" name="op" value="${op}">
    <div class="search-grid">
      <div class="field"><label for="s-com">Comuna</label><select class="select" id="s-com" name="comuna"><option value="">Todas</option>${COMUNAS.slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => `<option value="${c.id}" ${q.comuna === c.id ? 'selected' : ''}>${escape(c.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="s-tipo">Tipo</label><select class="select" id="s-tipo" name="tipo"><option value="">Todos</option>${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${q.tipo === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div class="field"><label for="s-dorm">Dormitorios</label><select class="select" id="s-dorm" name="dorm"><option value="">Indiferente</option>${[1, 2, 3, 4].map(n => `<option value="${n}" ${q.dorm == n ? 'selected' : ''}>${n}+</option>`).join('')}</select></div>
      <div class="field"><label for="s-max">Precio máximo</label><div class="price-in"><input class="input" id="s-max" name="max" type="number" min="0" inputmode="numeric" placeholder="${op === 'venta' ? '8000' : '900000'}" value="${escape(q.max || '')}"><select class="select" name="unit" aria-label="Moneda"><option ${q.unit !== 'CLP' && op === 'venta' ? 'selected' : ''}>UF</option><option ${q.unit === 'CLP' || (op === 'arriendo' && q.unit !== 'UF') ? 'selected' : ''}>CLP</option></select></div></div>
      <button class="btn btn-primary btn-lg" type="submit">${icon('search')} Buscar</button>
    </div></form>`;
}
export function wireSearchForm(root) {
  const f = root.querySelector('[data-search]');
  if (!f) return;
  f.addEventListener('click', e => {
    const t = e.target.closest('[data-op]'); if (!t) return;
    f.querySelectorAll('[data-op]').forEach(b => { b.classList.toggle('active', b === t); b.setAttribute('aria-selected', b === t); });
    f.elements.op.value = t.dataset.op;
    f.elements.unit.value = t.dataset.op === 'venta' ? 'UF' : 'CLP';
    f.elements.max.placeholder = t.dataset.op === 'venta' ? '8000' : '900000';
  });
  f.addEventListener('submit', e => { e.preventDefault(); location.hash = '/buscar?' + qs(Object.fromEntries(new FormData(f))); });
}

export function renderHome() {
  const s = settings(), view = V();
  const pub = db.query('properties', p => p.status === 'publicada');
  const ids = s.featuredIds || [];
  let featured = ids.map(id => db.get('properties', id)).filter(p => p && ['publicada', 'reservada'].includes(p.status));
  if (!featured.length) featured = pub.slice(0, 6);
  const banners = (s.banners || []).filter(b => b.active);
  const byComuna = COMUNAS.map(c => { const ps = pub.filter(p => p.comuna === c.id && p.op === 'venta' && p.type !== 'terreno'); return { c, n: pub.filter(p => p.comuna === c.id).length, avg: ps.length ? ps.reduce((a, p) => a + ufM2(p, uf()), 0) / ps.length : 0 }; })
    .filter(x => x.n).sort((a, b) => b.n - a.n).slice(0, 8);
  const projects = db.query('projects', p => p.published).sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)).slice(0, 3);
  const heroP = featured[0] || pub[0];
  view.innerHTML = `
  <section class="hero site-hero"><div class="container">
    <div class="hero-text" data-anim>
      <span class="eyebrow">Corredora de propiedades · Santiago</span>
      <h1 data-hero-title>${escape(s.heroTitle)}</h1>
      <p class="muted" style="font-size:1.1em;max-width:560px" data-hero-sub>${escape(s.heroSubtitle)}</p>
      ${searchForm({})}
      <div class="hero-stats"><div><b>${num(pub.length)}</b><span>propiedades publicadas</span></div><div><b>${db.count('agents', a => a.active)}</b><span>corredores certificados</span></div><div><b>${db.count('projects', p => p.published)}</b><span>proyectos nuevos</span></div><div><b>${fmtUF(1).replace('UF 1', 'UF')} $${Math.round(uf()).toLocaleString('es-CL')}</b><span>valor UF hoy</span></div></div>
    </div>
    ${heroP ? `<a class="hero-art hero-media" href="#/propiedad/${heroP.id}" data-anim="zoomIn" aria-label="Ver ${escape(heroP.title)}">${propertyArt(heroP, 'vista', { label: false })}</a>` : ''}
  </div></section>

  ${banners.length ? `<section class="container" data-anim><div class="banners">${banners.map(b => `<a class="banner tone-${escape(b.tone || 'primary')}" href="${escape(b.link || '#/')}"><div><h3>${escape(b.title)}</h3><p>${escape(b.text)}</p></div><span class="btn btn-sm">Ver</span></a>`).join('')}</div></section>` : ''}

  <section class="section"><div class="container stack">
    <div class="row between" data-anim><div><span class="eyebrow">Selección del equipo</span><h2 style="margin:0">Propiedades destacadas</h2></div><a class="btn" href="#/buscar?op=venta">Ver todas</a></div>
    <div class="prop-grid">${featured.map(propertyCard).join('')}</div>
  </div></section>

  ${s.showComunas !== false ? `<section class="section" style="padding-top:0"><div class="container stack">
    <div data-anim><span class="eyebrow">Explora por barrio</span><h2 style="margin:0">Comunas con más oferta</h2><p class="muted">Precio promedio de venta en UF por m² útil. <a href="#/buscar?view=mapa">Ver mapa de precios →</a></p></div>
    <div class="grid-4">${byComuna.map(x => `<a class="card hover comuna-tile" href="#/buscar?comuna=${x.c.id}"><span><b>${escape(x.c.name)}</b><br><span class="muted small">${x.n} propiedades</span></span><span class="badge badge-primary">${x.avg ? fmtUF(x.avg) + '/m²' : '—'}</span></a>`).join('')}</div>
  </div></section>` : ''}

  ${s.showProjects !== false && projects.length ? `<section class="section" style="padding-top:0"><div class="container stack">
    <div class="row between" data-anim><div><span class="eyebrow">Proyectos nuevos</span><h2 style="margin:0">Compra en verde, en blanco o con entrega inmediata</h2></div><a class="btn" href="#/proyectos">Todos los proyectos</a></div>
    <div class="grid-3">${projects.map(projectCard).join('')}</div>
  </div></section>` : ''}

  <section class="section" style="padding-top:0"><div class="container">
    <div class="card" data-anim style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:24px;align-items:center">
      <div><span class="eyebrow">Propietarios</span><h2>¿Vendes o arriendas?</h2><p class="muted">Publica tu propiedad en minutos. Nuestro equipo revisa la ficha, la valoriza con datos reales de la comuna y un corredor te contacta en menos de 24 horas.</p><a class="btn btn-primary" href="#/publicar">${icon('upload')} Publicar mi propiedad</a></div>
      <div class="grid-2">${[['Tasación gratuita', 'Con comparables de la zona'], ['Fotos y plano', 'Ficha profesional'], ['Visitas coordinadas', 'Agenda en línea'], ['Contrato y cobranza', 'Gestión de arriendos']].map(([a, b]) => `<div class="spec"><b>${a}</b><small>${b}</small></div>`).join('')}</div>
    </div>
  </div></section>`;
  const sf = view.querySelector('[data-search]');
  wireSearchForm(view);
  return sf;
}

export function projectCard(p) {
  const fake = { art: p.art, type: p.comuna === 'lo-barnechea' || p.comuna === 'la-florida' ? 'casa' : 'departamento' };
  return `<article class="card hover prop-card proj-card"><a class="media" href="#/proyecto/${p.id}">${propertyArt(fake, 'fachada', { label: false })}<span class="tags"><span class="badge plain stage">${escape(p.stage)}</span></span></a>
    <div class="body"><span class="muted small">${escape(p.developer)}</span><h3><a href="#/proyecto/${p.id}">${escape(p.name)}</a></h3>
    <span class="loc">${icon('pin', 14)} ${escape(COMUNAS.find(c => c.id === p.comuna)?.name || '')} · Entrega ${escape(p.delivery)}</span>
    <div class="prop-meta"><span>Desde <b>${fmtUF(p.fromUF)}</b></span><span>${p.typologies.length} tipologías</span></div></div></article>`;
}
