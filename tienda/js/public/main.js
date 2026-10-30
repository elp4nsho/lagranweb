// Entrada del sitio público de Raíz: header, router, footer y sincronización en vivo con la DB.
import { html, raw, toast, $, debounce } from '../../../assets/core/ui.js';
import { createRouter } from '../../../assets/core/router.js';
import { db, auth, settings, STAFF } from '../data/db.js';
import { cart, wishlist } from '../shared/cart.js';
import { ICON } from './parts.js';
import { mountDrawer, openDrawer } from './drawer.js';
import { renderHome } from './home.js';
import { renderCatalog } from './catalog.js';
import { renderProduct } from './product.js';
import { renderCheckout } from './checkout.js';
import { renderOrder, renderTrack } from './orders.js';
import { renderAccount } from './account.js';

const outlet = $('#view');
let current = null;   // { fn } para volver a pintar
let pending = false;
let lastPath = null;

function mount(fn) {
  const el = document.createElement('div');
  el.className = 'view-root';
  outlet.replaceChildren(el);
  current = fn;
  fn(el);
}

const router = createRouter({
  '/': () => mount(el => renderHome(el)),
  '/catalogo': (_, q) => mount(el => renderCatalog(el, q)),
  '/producto/:id': ({ id }) => mount(el => renderProduct(el, id)),
  '/checkout': () => mount(el => renderCheckout(el)),
  '/pedido/:id': ({ id }, q) => mount(el => renderOrder(el, id, q)),
  '/seguimiento': () => mount(el => renderTrack(el)),
  '/favoritos': () => mount(el => renderAccount(el, 'favoritos')),
  '/cuenta': () => mount(el => renderAccount(el, '')),
  '/cuenta/:tab': ({ tab }) => mount(el => renderAccount(el, tab)),
  '/cuenta/:tab/:sub': ({ tab, sub }) => mount(el => renderAccount(el, tab, sub))
}, {
  notFound: () => mount(el => { el.innerHTML = '<section class="section"><div class="container"><div class="empty card"><span class="icon">🧭</span><h2>Página no encontrada</h2><a class="btn btn-primary" href="#/">Volver al inicio</a></div></div></section>'; }),
  after: (r) => {
    if (lastPath !== r.path) window.scrollTo(0, 0);
    lastPath = r.path;
    router.highlight($('.site-header'));
    $('.mobile-nav')?.classList.remove('open');
    const titles = { '/': 'Ropa con origen', '/catalogo': 'Catálogo', '/checkout': 'Checkout', '/seguimiento': 'Seguimiento' };
    document.title = `${settings().storeName || 'Raíz'} · ${titles[r.path] || (r.path.startsWith('/producto') ? (db.get('products', r.params.id)?.name || 'Producto') : r.path.startsWith('/cuenta') ? 'Mi cuenta' : 'Tienda')}`;
  }
});

function renderChrome() {
  const s = settings();
  const u = auth.current();
  const cats = db.query('categories', c => c.active).sort((a, b) => a.order - b.order);
  const promo = $('#promo');
  promo.hidden = !s.banner?.active;
  promo.textContent = s.banner?.text || '';
  const navLinks = [['#/catalogo', 'Todo'], ...cats.slice(0, 5).map(c => [`#/catalogo?cat=${c.slug}`, c.name]), ['#/seguimiento', 'Seguimiento']];
  const acc = u ? (STAFF.includes(u.role) ? ['admin.html', 'Panel'] : ['#/cuenta', u.name.split(' ')[0]]) : [`login.html?next=${encodeURIComponent('index.html' + location.hash)}`, 'Ingresar'];
  const count = cart.count(), wcount = wishlist.ids().length;
  $('.site-header').innerHTML = html`<div class="container bar">
    <button class="btn btn-ghost btn-icon icon-btn mobile-nav-btn" data-mnav aria-label="Menú">${raw(ICON.menu)}</button>
    <a class="brand site-brand" href="#/"><span class="mark">${raw(ICON.logo)}</span>${s.storeName || 'Raíz'}</a>
    <nav class="main-nav site-nav" aria-label="Principal">${navLinks.slice(0, 6).map(([h, l]) => raw(html`<a href="${h}">${l}</a>`))}</nav>
    <form class="header-search" role="search" data-search><input class="input" type="search" name="q" placeholder="Buscar prendas…" aria-label="Buscar productos" style="min-height:38px"></form>
    <div class="header-actions site-actions">
      <a class="btn btn-ghost btn-icon icon-btn" href="#/favoritos" aria-label="Favoritos (${wcount})">${raw(ICON.heart)}${wcount ? raw(`<span class="bubble">${wcount}</span>`) : ''}</a>
      <a class="btn btn-ghost icon-btn" href="${acc[0]}" aria-label="Cuenta" style="padding:0 10px">${raw(ICON.user)}<span class="acc-label">${acc[1]}</span></a>
      <button class="btn btn-primary btn-icon icon-btn" data-cart aria-label="Abrir carro (${count})">${raw(ICON.cart)}${count ? raw(`<span class="bubble" data-cart-count>${count}</span>`) : ''}</button>
    </div>
  </div>
  <nav class="container mobile-nav" aria-label="Menú móvil">
    <form data-search style="margin-bottom:8px"><input class="input" type="search" name="q" placeholder="Buscar prendas…" aria-label="Buscar"></form>
    ${navLinks.map(([h, l]) => raw(html`<a href="${h}">${l}</a>`))}<a href="#/cuenta">Mi cuenta</a>
  </nav>`;
  router.highlight($('.site-header'));
  $('#footer').innerHTML = html`<div class="container cols">
    <div><a class="brand" href="#/"><span class="mark">${raw(ICON.logo)}</span>${s.storeName}</a><p class="muted small" style="margin-top:12px">${s.tagline}. ${s.address}.</p><p class="small muted">${s.contactEmail} · ${s.phone}</p></div>
    <div><h4>Tienda</h4>${cats.slice(0, 5).map(c => raw(html`<a href="#/catalogo?cat=${c.slug}">${c.name}</a>`))}</div>
    <div><h4>Ayuda</h4><a href="#/seguimiento">Seguir mi pedido</a><a href="#/cuenta">Mi cuenta</a><a href="#/cuenta/pedidos">Cambios y devoluciones</a></div>
    <div><h4>Equipo</h4><a href="login.html">Acceso equipo</a><a href="admin.html">Panel de administración</a><p class="small muted">Demo: datos simulados en tu navegador.</p></div>
  </div>`;
}

document.addEventListener('click', e => {
  if (e.target.closest('[data-cart]')) openDrawer();
  if (e.target.closest('[data-mnav]')) $('.mobile-nav').classList.toggle('open');
  const f = e.target.closest('[data-fav]');
  if (f) {
    e.preventDefault();
    const on = wishlist.toggle(f.dataset.fav);
    document.querySelectorAll(`[data-fav="${f.dataset.fav}"]`).forEach(b => b.setAttribute('aria-pressed', on));
    toast(on ? 'Agregado a favoritos' : 'Quitado de favoritos', on ? 'success' : 'info', 1800);
    renderChrome();
  }
});
document.addEventListener('submit', e => {
  const f = e.target.closest('[data-search]');
  if (!f) return;
  e.preventDefault();
  const q = f.q.value.trim();
  location.hash = `#/catalogo${q ? '?q=' + encodeURIComponent(q) : ''}`;
});

// Cambios en la DB (desde el panel en otra pestaña o acciones propias) → refresco en vivo.
const refresh = debounce(() => {
  renderChrome();
  if (!current || router.current?.path === '/checkout') return;
  const a = document.activeElement;
  if (document.querySelector('.modal-backdrop') || (a && outlet.contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && a.type !== 'checkbox' && a.type !== 'radio' && a.type !== 'range')) { pending = true; return; }
  const y = window.scrollY;
  mount(current);
  window.scrollTo(0, y);
}, 60);
db.subscribe(refresh);
cart.subscribe(renderChrome);
document.addEventListener('focusout', () => { if (pending) { pending = false; setTimeout(refresh, 50); } });

renderChrome();
mountDrawer();
router.start();
