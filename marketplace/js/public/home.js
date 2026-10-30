// Portada: buscador, categorías, servicios destacados (CMS), cómo funciona y freelancers top.
import { db, auth } from '../data/db.js';
import { escape, money, num } from '../../../assets/core/ui.js';
import { settings, activeCategories, gigCard, freelancerStats, levelOf, levelBadge, stars, user } from '../shared/market.js';
import { wireFavs, favState } from './favs.js';

function heroArt() {
  return `<svg viewBox="0 0 420 320" role="img" aria-label="Ilustración de personas colaborando en un proyecto">
    <rect x="40" y="60" width="250" height="170" rx="14" fill="var(--surface)" stroke="var(--text)" stroke-width="3"/>
    <rect x="40" y="60" width="250" height="30" rx="12" fill="var(--primary)" stroke="var(--text)" stroke-width="3"/>
    <circle cx="62" cy="75" r="5" fill="var(--surface)"/><circle cx="78" cy="75" r="5" fill="var(--surface)"/>
    <rect x="62" y="110" width="110" height="70" rx="8" fill="var(--accent)" opacity=".5" stroke="var(--text)" stroke-width="2"/>
    <rect x="186" y="110" width="84" height="12" rx="6" fill="var(--surface-3)"/><rect x="186" y="132" width="64" height="12" rx="6" fill="var(--surface-3)"/>
    <rect x="186" y="160" width="70" height="22" rx="8" fill="var(--success)" stroke="var(--text)" stroke-width="2"/>
    <rect x="62" y="196" width="208" height="10" rx="5" fill="var(--surface-3)"/>
    <g stroke="var(--text)" stroke-width="3">
      <circle cx="330" cy="120" r="34" fill="var(--warning)"/><path d="M290 240c4-44 76-44 80 0" fill="var(--primary)"/>
      <circle cx="96" cy="262" r="22" fill="var(--accent)"/><path d="M62 318c3-34 65-34 68 0" fill="var(--success)"/>
    </g>
    <path d="M300 168 l18 18 32-36" fill="none" stroke="var(--success)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <g fill="var(--primary)"><circle cx="370" cy="40" r="6"/><circle cx="20" cy="140" r="5"/><circle cx="400" cy="270" r="7"/></g>
  </svg>`;
}

export function renderHome(el) {
  const st = settings(), cats = activeCategories();
  const feat = (st.featured || []).map(id => db.get('gigs', id)).filter(g => g && g.status === 'activo');
  const fav = favState();
  const top = db.query('users', u => u.role === 'freelancer' && u.active !== false).map(f => ({ f, st: freelancerStats(f.id), lv: levelOf(f.id).level })).sort((a, b) => b.st.done - a.st.done).slice(0, 4);
  const done = db.count('orders', o => o.status === 'completado');
  const nF = db.count('users', u => u.role === 'freelancer' && u.active !== false);
  const avg = (() => { const r = db.all('reviews'); return r.length ? r.reduce((a, x) => a + x.rating, 0) / r.length : 0; })();
  const u = auth.current();
  el.innerHTML = `
  <section class="hero site-hero"><div class="container hero-grid">
    <div class="hero-text" data-anim>
      <span class="eyebrow">${escape(st.tagline)}</span>
      <h1>${escape(st.heroTitle)}</h1>
      <p class="lead">${escape(st.heroSubtitle)}</p>
      <form class="hero-search" role="search" data-search><label class="sr-only" for="q">Buscar servicios</label><input class="input" id="q" name="q" placeholder="Ej: logo para cafetería, tienda Shopify, subtítulos…"><button class="btn btn-primary btn-lg">Buscar</button></form>
      <div class="pop-tags"><span class="muted">Populares:</span>${['Logo', 'WordPress', 'Reels', 'SEO', 'Traducción'].map(t => `<a class="chip" href="#/servicios?q=${encodeURIComponent(t)}">${t}</a>`).join('')}</div>
      ${st.showStats ? `<div class="hero-stats"><div><b>${nF}</b><span>freelancers verificados</span></div><div><b>${num(done)}</b><span>pedidos completados</span></div><div><b>${avg.toFixed(1).replace('.', ',')}★</b><span>valoración promedio</span></div></div>` : ''}
    </div>
    <div class="hero-art hero-media" data-anim="zoomIn">${heroArt()}</div>
  </div></section>
  <section class="section alt home-cats"><div class="container">
    <div class="section-head" data-anim><div><span class="eyebrow">Categorías</span><h2>¿Qué necesitas hoy?</h2></div><a class="btn btn-ghost" href="#/servicios">Ver todo →</a></div>
    <div class="cat-grid">${cats.map(c => `<a class="card hover cat-card" href="#/servicios?cat=${c.id}"><span class="cat-ico" aria-hidden="true">${c.icon}</span><h3>${escape(c.name)}</h3><span class="small muted">${escape(c.description)}</span><span class="small"><b>${db.count('gigs', g => g.categoryId === c.id && g.status === 'activo')}</b> servicios</span></a>`).join('')}</div>
  </div></section>
  <section class="section home-feat"><div class="container">
    <div class="section-head" data-anim><div><span class="eyebrow">Destacados</span><h2>Servicios recomendados por Gremio</h2></div></div>
    <div class="gig-grid" data-favs>${feat.map(g => gigCard(g, { fav: fav ? fav.includes(g.id) : null })).join('')}</div>
  </div></section>
  <section class="section alt home-how"><div class="container">
    <div class="section-head" data-anim><div><span class="eyebrow">Cómo funciona</span><h2>Contrata con tranquilidad</h2></div></div>
    <div class="steps">
      <div class="card step"><h3>Elige o publica</h3><p class="muted mb-0">Compra un servicio con precio cerrado o publica tu proyecto y recibe propuestas.</p></div>
      <div class="card step"><h3>Paga protegido</h3><p class="muted mb-0">Tu pago queda retenido en garantía. El freelancer comienza a trabajar.</p></div>
      <div class="card step"><h3>Revisa la entrega</h3><p class="muted mb-0">Conversa por el chat del pedido y pide revisiones incluidas en tu paquete.</p></div>
      <div class="card step"><h3>Aprueba y libera</h3><p class="muted mb-0">Cuando estés conforme, liberas los fondos. Si algo sale mal, mediamos.</p></div>
    </div>
  </div></section>
  <section class="section home-top"><div class="container">
    <div class="section-head" data-anim><div><span class="eyebrow">Comunidad</span><h2>Freelancers destacados</h2></div><a class="btn btn-ghost" href="#/proyectos">Ver proyectos abiertos →</a></div>
    <div class="grid-4 top-grid">${top.map(({ f, st: s, lv }) => `<a class="card hover" href="#/freelancer/${f.id}" style="text-decoration:none;color:inherit;text-align:center"><span class="avatar" style="--size:64px;--av:${escape(f.color)}">${escape(f.name.split(' ').map(w => w[0]).join(''))}</span><h3 style="margin:10px 0 2px">${escape(f.name)}</h3><p class="small muted">${escape(f.title)}</p><div class="small">${stars(s.rating, s.reviews)}</div><div style="margin-top:8px">${levelBadge(lv)}</div></a>`).join('')}</div>
    <div class="card sell-cta" style="margin-top:24px" data-anim><div class="row between"><div><h3 class="mb-0">¿Tienes talento? Vende tus servicios en ${escape(st.name)}</h3><p class="muted mb-0">Publica gratis. Solo cobramos ${st.commissionPct}% cuando vendes.</p></div><a class="btn btn-primary" href="${u?.role === 'freelancer' ? 'freelancer.html' : 'login.html?modo=freelancer'}">Empezar a vender</a></div></div>
  </div></section>`;
  el.querySelector('[data-search]').addEventListener('submit', e => { e.preventDefault(); location.hash = '#/servicios?q=' + encodeURIComponent(e.currentTarget.q.value.trim()); });
  wireFavs(el);
  void money; void user;
}
