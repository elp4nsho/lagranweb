// Portada: hero editable desde el CMS, categorías, destacados, novedades, beneficios y reseñas.
import { html, raw, money, escape, toast } from '../../../assets/core/ui.js';
import { db, settings, category, productStock } from '../data/db.js';
import { productArt } from '../shared/art.js';
import { productCard, visibleProducts, stars } from './parts.js';

export function renderHome(view) {
  const s = settings();
  const h = s.hero || {};
  const all = visibleProducts();
  const heroP = db.get('products', h.productId) || all[0];
  const featured = all.filter(p => p.featured).slice(0, 8);
  const fresh = all.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
  const best = all.slice().sort((a, b) => b.sold - a.sold).slice(0, 4);
  const cats = db.query('categories', c => c.active).sort((a, b) => a.order - b.order);
  const reviews = db.query('reviews', r => r.status === 'aprobada' && r.rating >= 4).slice(0, 3);
  const free = s.shipping?.freeThreshold;
  const ctaHref = h.ctaCategory ? `#/catalogo?cat=${h.ctaCategory}` : '#/catalogo';
  const customers = db.count('users', u => u.role === 'customer');

  view.innerHTML = html`
  <section class="hero site-hero"><div class="container hero-grid">
    <div class="hero-text" data-anim>
      <span class="eyebrow">${h.eyebrow}</span>
      <h1 data-hero-title>${h.title}</h1>
      <p class="lead">${h.subtitle}</p>
      <div class="row">
        <a class="btn btn-primary btn-lg" href="${ctaHref}">${h.cta || 'Ver colección'}</a>
        ${heroP ? raw(html`<a class="btn btn-lg btn-ghost" href="#/producto/${heroP.id}">Ver ${heroP.name}</a>`) : ''}
      </div>
      <div class="hero-stats">
        <div><b>${all.length}</b><span>prendas en catálogo</span></div>
        <div><b>${customers}+</b><span>clientes felices</span></div>
        <div><b>4,7 ★</b><span>valoración promedio</span></div>
      </div>
    </div>
    ${heroP ? raw(html`<a class="hero-art hero-media" href="#/producto/${heroP.id}" data-anim="zoomIn" aria-label="${heroP.name}">${raw(productArt(heroP, heroP.colors[0]?.hex, { view: 2 }))}<span class="badge badge-primary">${heroP.name} · ${money(heroP.price)}</span></a>`) : ''}
  </div></section>

  <section class="section tight home-cats"><div class="container">
    <div class="section-head" data-anim><div><span class="eyebrow">Explora</span><h2>Categorías</h2></div><a class="btn btn-ghost" href="#/catalogo">Ver todo →</a></div>
    <div class="grid-4">${cats.map(c => {
      const p = all.find(x => x.categoryId === c.id);
      const n = all.filter(x => x.categoryId === c.id).length;
      return raw(html`<a class="card hover cat-tile" href="#/catalogo?cat=${c.slug}"><div class="thumb">${raw(p ? productArt(p, p.colors[p.colors.length - 1]?.hex) : '')}</div><div class="body"><h3>${c.name}</h3><small class="muted">${n} producto${n === 1 ? '' : 's'}</small></div></a>`);
    })}</div>
  </div></section>

  <section class="section tight home-featured"><div class="container">
    <div class="section-head" data-anim><div><span class="eyebrow">Selección</span><h2>Destacados de la temporada</h2></div></div>
    <div class="products">${featured.map(p => raw(productCard(p)))}</div>
  </div></section>

  <section class="section tight home-perks"><div class="container perks">
    <div class="perk" data-anim><span class="ico">🚚</span><div><b>Envío gratis</b><small>${free ? 'En compras sobre ' + money(free) : 'En todo el país'}</small></div></div>
    <div class="perk" data-anim data-anim-delay="100"><span class="ico">↺</span><div><b>Cambios en 30 días</b><small>Sin preguntas, en tienda o por correo</small></div></div>
    <div class="perk" data-anim data-anim-delay="200"><span class="ico">🌱</span><div><b>Materiales trazables</b><small>Cada prenda dice de dónde viene</small></div></div>
    <div class="perk" data-anim data-anim-delay="300"><span class="ico">🔒</span><div><b>Pago seguro</b><small>Tarjetas y transferencia</small></div></div>
  </div></section>

  <section class="section tight home-duo"><div class="container grid-2">
    <div>
      <div class="section-head" data-anim><div><span class="eyebrow">Recién llegados</span><h2>Novedades</h2></div></div>
      <div class="grid-2">${fresh.map(p => raw(productCard(p)))}</div>
    </div>
    <div>
      <div class="section-head" data-anim><div><span class="eyebrow">Lo que más se llevan</span><h2>Más vendidos</h2></div></div>
      <div class="grid-2">${best.map(p => raw(productCard(p)))}</div>
    </div>
  </div></section>

  <section class="section tight home-reviews"><div class="container">
    <div class="section-head" data-anim><div><span class="eyebrow">Opiniones reales</span><h2>Lo que dicen de Raíz</h2></div></div>
    <div class="grid-3">${reviews.map(r => {
      const p = db.get('products', r.productId);
      return raw(html`<figure class="card stack" style="margin:0"><div>${raw(stars(r.rating))}</div><b>${r.title}</b><p class="muted" style="margin:0">“${r.body}”</p><figcaption class="small"><b>${r.author}</b> sobre <a href="#/producto/${p?.id}">${p?.name}</a></figcaption></figure>`);
    })}</div>
  </div></section>

  <section class="section tight home-story"><div class="container">
    <div class="card grid-2" data-anim style="align-items:center">
      <div><span class="eyebrow">Nuestra historia</span><h2>Hecho cerca, hecho bien</h2><p class="muted">${s.about}</p></div>
      <form class="stack" id="newsletter">
        <label class="label" for="nl-email">Recibe novedades y un 10% en tu primera compra</label>
        <div class="row" style="flex-wrap:nowrap"><input class="input" id="nl-email" type="email" placeholder="tu@correo.cl" required><button class="btn btn-primary">Suscribirme</button></div>
        <small class="muted">${db.count('subscribers')} personas ya reciben nuestras novedades.</small>
      </form>
    </div>
  </div></section>`;

  view.querySelector('#newsletter').addEventListener('submit', e => {
    e.preventDefault();
    const email = view.querySelector('#nl-email').value.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast('Ingresa un correo válido', 'warning');
    if (db.find('subscribers', x => x.email === email)) return toast('Ese correo ya está suscrito', 'info');
    db.insert('subscribers', { email });
    db.log('newsletter', `Nueva suscripción: ${email}`);
    toast('¡Listo! Te enviamos el cupón BIENVENIDA10', 'success');
  });
}
