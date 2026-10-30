// Portada: hero editable desde el CMS, buscador, destacados, categorías y próximos eventos.
import { db, settings } from '../data/db.js';
import { html, raw, $ } from '../../../assets/core/ui.js';
import { CITIES, CATEGORIES } from '../data/seed.js';
import { volcano } from '../shared/art.js';
import { eventCard, CAT_ICON } from '../shared/format.js';
import { isPast } from '../shared/inventory.js';

export const upcoming = () => db.query('events', e => e.status === 'publicado' && !isPast(e)).sort((a, b) => a.date.localeCompare(b.date));

export function renderHome(app) {
  const s = settings();
  const list = upcoming();
  const featured = list.filter(e => e.featured).slice(0, 6);
  const weekEnd = Date.now() + 7 * 864e5;
  const thisWeek = list.filter(e => Date.parse(e.date) < weekEnd);
  const counts = Object.fromEntries(Object.keys(CATEGORIES).map(c => [c, list.filter(e => e.category === c).length]));
  app.innerHTML = html`
  <section class="hero hero-parallax">
    <div class="container hero-grid">
      <div data-anim>
        <span class="eyebrow">${list.length} eventos en ${new Set(list.map(e => e.city)).size} ciudades</span>
        <h1 id="heroTitle">${s.heroTitle}</h1>
        <p class="lead">${s.heroSubtitle}</p>
        <form class="searchbar" id="search" role="search">
          <input class="input q" name="q" type="search" placeholder="Artista, obra, equipo o recinto…" aria-label="Buscar">
          <select class="select" name="city" aria-label="Ciudad"><option value="">Todas las ciudades</option>${CITIES.map(c => raw(`<option>${c}</option>`))}</select>
          <select class="select" name="when" aria-label="Fecha"><option value="">Cualquier fecha</option><option value="semana">Esta semana</option><option value="mes">Próximos 30 días</option><option value="finde">Este fin de semana</option></select>
          <button class="btn btn-primary">${s.heroCta || 'Buscar'}</button>
        </form>
      </div>
      <div class="hero-art" data-anim data-anim-delay="200">${raw(volcano())}</div>
    </div>
  </section>

  <section class="section" style="padding-top:32px">
    <div class="container stack">
      <div class="row between" data-anim><h2 style="margin:0">Destacados</h2><a class="btn btn-ghost btn-sm" href="#/explorar">Ver todo →</a></div>
      <div class="grid-3" id="featured">${featured.length ? raw(featured.map(eventCard).join('')) : raw('<div class="empty">Pronto anunciaremos nuevos eventos</div>')}</div>
    </div>
  </section>

  <section class="section" style="padding-top:0">
    <div class="container stack">
      <h2 data-anim>Explora por categoría</h2>
      <div class="cat-tiles">${Object.entries(CATEGORIES).map(([k, l]) => raw(html`<a class="card hover cat-tile" href="#/explorar?cat=${k}"><span class="ico">${CAT_ICON[k]}</span><b>${l}</b><span class="muted small">${counts[k]} próximos</span></a>`))}</div>
    </div>
  </section>

  <section class="section" style="padding-top:0">
    <div class="container stack">
      <div class="row between" data-anim><h2 style="margin:0">Esta semana</h2><a class="btn btn-ghost btn-sm" href="#/explorar?when=semana">Ver semana →</a></div>
      <div class="grid-auto">${thisWeek.length ? raw(thisWeek.map(eventCard).join('')) : raw('<div class="empty">No hay eventos esta semana</div>')}</div>
    </div>
  </section>

  <section class="section" style="padding-top:0">
    <div class="container grid-3">
      <div class="card" data-anim><h3>🪑 Elige tu asiento</h3><p class="muted">Mapa interactivo por sectores con precios por zona. Te guardamos los asientos por 10 minutos mientras pagas.</p></div>
      <div class="card" data-anim data-anim-delay="100"><h3>📱 Entrada en tu celular</h3><p class="muted">Entradas con código QR en formato wallet. Muéstralas en la puerta, sin imprimir.</p></div>
      <div class="card" data-anim data-anim-delay="200"><h3>🔁 Transfiere o revende</h3><p class="muted">¿No puedes ir? Transfiere a un amigo o publícala en la reventa oficial con precio tope.</p></div>
    </div>
  </section>`;
  $('#search').addEventListener('submit', e => {
    e.preventDefault();
    const q = new URLSearchParams([...new FormData(e.target)].filter(([, v]) => v));
    location.hash = '#/explorar' + (q.toString() ? '?' + q : '');
  });
}
