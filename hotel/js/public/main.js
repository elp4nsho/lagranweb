// Sitio público del hotel: navegación, rutas y pie de página.
import { escape } from '../../../assets/core/ui.js';
import { createRouter } from '../../../assets/core/router.js';
import { db, auth } from '../data/db.js';
import { settings } from '../shared/hotel.js';
import { renderHome } from './home.js';
import { renderRooms, renderRoom } from './rooms.js';
import { renderBooking } from './booking.js';
import { renderManage } from './manage.js';
import { renderSpa, renderRestaurant, renderOffers } from './pages.js';
import { renderPortal } from './portal.js';

const hdr = document.getElementById('hdr');
const view = document.getElementById('view');
const foot = document.getElementById('foot');
let current = null;

function paintChrome() {
  const c = settings();
  const u = auth.current();
  hdr.innerHTML = `<div class="container hdr-row">
    <a class="brand site-brand" href="#/"><span class="brand-mark" aria-hidden="true">✦</span><span class="brand-text"><b>${escape(c.name)}</b><small>Valparaíso</small></span></a>
    <nav class="site-nav" id="nav" aria-label="Principal">
      <a href="#/">Inicio</a><a href="#/habitaciones">Habitaciones</a><a href="#/spa">Spa</a><a href="#/restaurante">Restaurante</a><a href="#/ofertas">Ofertas</a><a href="#/mi-reserva">Mi reserva</a>
      ${u ? (u.role === 'guest' ? `<a href="#/portal">Mi cuenta</a>` : `<a href="admin.html">Panel</a>`) : '<a href="login.html">Ingresar</a>'}
    </nav>
    <div class="site-actions"><a class="btn btn-primary btn-sm" href="#/reservar">Reservar</a></div>
    <button class="btn btn-icon btn-sm btn-ghost nav-toggle" aria-label="Menú" aria-expanded="false" aria-controls="nav">☰</button>
  </div>${c.announcement ? `<div class="announce"><div class="container">${escape(c.announcement)}</div></div>` : ''}`;
  foot.innerHTML = `<div class="container foot-grid">
    <div class="stack" style="gap:8px"><b class="foot-brand">${escape(c.name)}</b><span class="muted small">${escape(c.tagline)}</span><span class="small">📍 ${escape(c.address)}</span><span class="small">📞 ${escape(c.phone)} · ✉️ ${escape(c.email)}</span></div>
    <div class="stack small" style="gap:6px"><b>Hotel</b><a href="#/habitaciones">Habitaciones y suites</a><a href="#/spa">Marejada Spa</a><a href="#/restaurante">Restaurante Marea Alta</a><a href="#/ofertas">Ofertas</a></div>
    <div class="stack small" style="gap:6px"><b>Tu estadía</b><a href="#/reservar">Reservar</a><a href="#/mi-reserva">Gestionar reserva</a><a href="#/mi-reserva?tab=checkin">Check-in online</a><a href="login.html">Acceso huéspedes y equipo</a></div>
  </div><div class="container small muted foot-legal">Check-in desde las ${escape(c.checkInTime)} · Check-out hasta las ${escape(c.checkOutTime)} · Cancelación gratuita hasta ${c.freeCancelDays} días antes. Hotel ficticio creado como demostración.</div>`;
  router.highlight(hdr);
}

hdr.addEventListener('click', e => {
  const t = e.target.closest('.nav-toggle');
  const nav = hdr.querySelector('#nav');
  if (t) { const open = nav.classList.toggle('open'); t.setAttribute('aria-expanded', open); return; }
  if (e.target.closest('#nav a')) nav.classList.remove('open');
});

function mount(name, fn, params, query) {
  const el = document.createElement('div');
  view.replaceChildren(el);
  const res = fn(el, params, query) || {};
  current = { name, el, fn, params, query, res };
  window.scrollTo(0, 0);
  paintChrome();
}
const R = (name, fn) => (p, q) => mount(name, fn, p, q);
const router = createRouter({
  '/': R('home', renderHome),
  '/habitaciones': R('rooms', renderRooms),
  '/habitacion/:id': R('room', renderRoom),
  '/reservar': R('booking', renderBooking),
  '/mi-reserva': R('manage', renderManage),
  '/spa': R('spa', renderSpa),
  '/restaurante': R('restaurant', renderRestaurant),
  '/ofertas': R('offers', renderOffers),
  '/portal': R('portal', renderPortal)
}, { notFound: () => router.go('/') });

// Cambios del panel → se reflejan al instante (sin interrumpir formularios en curso)
db.subscribe(change => {
  paintChrome();
  if (!current || document.querySelector('.modal-backdrop')) return;
  if (current.res.live === false) return;
  const ae = document.activeElement;
  if (ae && current.el.contains(ae) && ae.matches('input, textarea, select')) return;
  if (current.res.refresh) current.res.refresh(change);
  else if (['roomTypes', 'seasons', 'offers', 'extras', 'spa', 'dishes', 'rooms'].includes(change?.col) || ['value', 'sync', 'reset'].includes(change?.type)) {
    const y = window.scrollY; mount(current.name, current.fn, current.params, current.query); window.scrollTo(0, y);
  }
});
router.start();
