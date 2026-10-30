// Sitio público de Pits Rápido: cabecera, rutas, pie y refresco en vivo.
import { escape } from '../../../assets/core/ui.js';
import { createRouter } from '../../../assets/core/router.js';
import { db, auth } from '../data/db.js';
import { settings } from '../shared/domain.js';
import { renderHome } from './home.js';
import { renderPrices } from './prices.js';
import { renderBranches } from './branches.js';
import { renderBooking } from './booking.js';
import { renderCheckin } from './checkin.js';
import { renderStatus } from './status.js';
import { renderPlans } from './plans.js';
import { renderReminders } from './reminders.js';
import { renderAccount } from './account.js';

const hdr = document.getElementById('hdr');
let view = document.getElementById('view');
const foot = document.getElementById('foot');
let current = null;

function paintChrome() {
  const c = settings(), u = auth.current();
  hdr.innerHTML = `<div class="container hdr-row">
    <a class="brand site-brand" href="#/"><span class="brand-mark" aria-hidden="true">🛢️</span><span class="brand-text"><b>${escape(c.name)}</b><small>Lubricentro express</small></span></a>
    <nav class="site-nav" id="nav" aria-label="Principal">
      <a href="#/precios">Servicios y precios</a><a href="#/sucursales">Sucursales</a><a href="#/planes">Planes</a><a href="#/llegue">Llegué</a><a href="#/estado">Estado</a><a href="#/recordatorios">Recordatorios</a>
      ${u ? (u.role === 'cliente' ? '<a href="#/cuenta">Mi cuenta</a>' : `<a href="${u.role === 'tecnico' ? 'operario.html' : u.role === 'recepcion' ? 'recepcion.html' : 'admin.html'}">Panel</a>`) : '<a href="login.html">Ingresar</a>'}
    </nav>
    <div class="site-actions row nowrap" style="gap:8px"><a class="btn btn-primary btn-sm" href="#/reservar">Reservar hora</a>
    <button class="btn btn-icon btn-sm btn-ghost nav-toggle menu-toggle" aria-label="Menú" aria-expanded="false" aria-controls="nav">☰</button></div>
  </div>${c.announcement ? `<div class="announce"><div class="container">${escape(c.announcement)}</div></div>` : ''}`;
  foot.innerHTML = `<div class="container foot-grid">
    <div class="stack" style="gap:8px"><b class="foot-brand">🛢️ ${escape(c.name)}</b><span class="muted small">${escape(c.tagline)}</span><span class="small">📞 ${escape(c.phone)} · 💬 ${escape(c.whatsapp)}</span><span class="small">✉️ ${escape(c.email)}</span></div>
    <div class="stack small" style="gap:6px"><b>Servicios</b><a href="#/precios">Lista de precios por segmento</a><a href="#/planes">Planes de mantención</a><a href="#/reservar">Reservar hora</a></div>
    <div class="stack small" style="gap:6px"><b>En la sucursal</b><a href="#/sucursales">Tiempos de espera</a><a href="#/llegue">Check-in "Llegué"</a><a href="#/estado">Seguir mi auto</a></div>
    <div class="stack small" style="gap:6px"><b>Tu cuenta</b><a href="#/cuenta">Mis vehículos y boletas</a><a href="#/recordatorios">Recordatorios</a><a href="login.html">Acceso clientes y equipo</a></div>
  </div><div class="container small muted foot-legal">${escape(c.guarantee || '')} Marca ficticia creada como demostración; precios referenciales con IVA incluido.</div>`;
  router.highlight(hdr);
}

hdr.addEventListener('click', e => {
  const t = e.target.closest('.nav-toggle'), nav = hdr.querySelector('#nav');
  if (t) { const open = nav.classList.toggle('open'); t.setAttribute('aria-expanded', open); return; }
  if (e.target.closest('#nav a')) nav.classList.remove('open');
});

function mount(name, fn, params, query, keepScroll = false) {
  if (current?.res?.destroy) current.res.destroy();
  const y = window.scrollY;
  // Un <main> nuevo por vista: así no se acumulan listeners y las secciones quedan como hijas directas (layouts).
  const fresh = document.createElement('main');
  fresh.id = 'view'; fresh.className = view.className;
  view.replaceWith(fresh); view = fresh;
  const res = fn(view, params, query) || {};
  current = { name, fn, params, query, res };
  keepScroll ? window.scrollTo(0, y) : window.scrollTo(0, 0);
  paintChrome();
}
const R = (name, fn) => (p, q) => mount(name, fn, p, q);
const router = createRouter({
  '/': R('home', renderHome),
  '/precios': R('prices', renderPrices),
  '/sucursales': R('branches', renderBranches),
  '/reservar': R('booking', renderBooking),
  '/llegue': R('checkin', renderCheckin),
  '/estado': R('status', renderStatus),
  '/estado/:code': R('status', renderStatus),
  '/planes': R('plans', renderPlans),
  '/recordatorios': R('reminders', renderReminders),
  '/cuenta': R('account', renderAccount)
}, { notFound: () => router.go('/') });

// Cambios del panel/apps → se reflejan al instante sin interrumpir formularios.
db.subscribe(change => {
  paintChrome();
  if (!current || document.querySelector('.modal-backdrop')) return;
  if (current.res.live === false) return;
  const ae = document.activeElement;
  if (ae && view.contains(ae) && ae.matches('input, textarea, select')) return;
  if (current.res.refresh) current.res.refresh(change);
  else mount(current.name, current.fn, current.params, current.query, true);
});
router.start();
