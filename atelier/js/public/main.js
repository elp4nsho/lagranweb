// Sitio público de Atelier Torque: cabecera, rutas y refresco en vivo desde el panel.
import { escape } from '../../../assets/core/ui.js';
import { createRouter } from '../../../assets/core/router.js';
import { db, auth } from '../data/db.js';
import { settings } from '../shared/domain.js';
import { renderHome } from './home.js';
import { renderPrograms } from './programas.js';
import { renderServices } from './servicios.js';
import { renderBooking } from './agendar.js';
import { renderTracking } from './seguimiento.js';
import { renderInspection } from './inspeccion.js';
import { renderDynoList, renderDyno } from './dyno.js';
import { renderTiers } from './membresias.js';
import { renderGarage } from './garage.js';

const hdr = document.getElementById('hdr');
let view = document.getElementById('view');
const foot = document.getElementById('foot');
let current = null;

function paintChrome() {
  const c = settings(), u = auth.current();
  hdr.innerHTML = `<div class="container hdr-row">
    <a class="site-brand brand" href="#/"><span class="brand-mark" aria-hidden="true">AT</span><span class="brand-text"><b>${escape(c.name)}</b><small>Vitacura · Santiago</small></span></a>
    <nav class="site-nav" id="nav" aria-label="Principal">
      <a href="#/programas">Programas</a><a href="#/servicios">Servicios</a>${c.showDyno ? '<a href="#/dyno">Dyno</a>' : ''}${c.showMemberships ? '<a href="#/membresias">Membresías</a>' : ''}<a href="#/seguimiento">Seguimiento</a>
      ${u ? (u.role === 'cliente' ? '<a href="#/garage">Mi garage</a>' : `<a href="login.html">Mi app</a>`) : '<a href="login.html">Ingresar</a>'}
    </nav>
    <div class="site-actions"><a class="btn btn-primary btn-sm" href="#/agendar">Agendar concierge</a></div>
    <button class="btn btn-icon btn-sm btn-ghost nav-burger" aria-label="Menú" aria-expanded="false" aria-controls="nav">☰</button>
  </div>${c.announcement ? `<div class="announce"><div class="container">${escape(c.announcement)}</div></div>` : ''}`;
  foot.innerHTML = `<div class="container foot-grid">
    <div class="stack" style="gap:8px"><a class="brand" href="#/"><span class="brand-mark" aria-hidden="true">AT</span><b>${escape(c.name)}</b></a><span class="muted small">${escape(c.tagline)}</span><span class="small">📍 ${escape(c.address)}</span><span class="small">🕘 ${escape(c.hours)}</span></div>
    <div class="stack small" style="gap:6px"><b>Servicios</b><a href="#/programas">Mantención por marca</a><a href="#/servicios/performance">Performance y dyno</a><a href="#/servicios/estetica">Cerámico, PPF y detailing</a><a href="#/servicios/ev">Eléctricos y cargadores</a></div>
    <div class="stack small" style="gap:6px"><b>Clientes</b><a href="#/agendar">Agendar con retiro</a><a href="#/seguimiento">Seguir mi auto</a><a href="#/garage">Mi garage</a><a href="#/membresias">Membresías</a></div>
    <div class="stack small" style="gap:6px"><b>Contacto</b><span>📞 ${escape(c.phone)}</span><span>💬 ${escape(c.whatsapp)}</span><span>✉️ ${escape(c.email)}</span><a href="login.html">Acceso equipo</a></div>
  </div><div class="container small muted foot-legal">Marcas y modelos se mencionan solo como referencia de compatibilidad. ${escape(c.name)} es un taller ficticio creado como demostración.</div>`;
  router.highlight(hdr);
}
hdr.addEventListener('click', e => {
  const t = e.target.closest('.nav-burger'), nav = hdr.querySelector('#nav');
  if (t) { const open = nav.classList.toggle('open'); t.setAttribute('aria-expanded', open); return; }
  if (e.target.closest('#nav a')) nav.classList.remove('open');
});

function mount(name, fn, params, query, keepScroll) {
  if (current?.res?.destroy) current.res.destroy();
  const y = window.scrollY;
  // Nodo nuevo en cada vista: así los listeners de la vista anterior no se acumulan.
  const fresh = view.cloneNode(false); view.replaceWith(fresh); view = fresh;
  const res = fn(view, params, query) || {};
  current = { name, fn, params, query, res };
  window.scrollTo(0, keepScroll ? y : 0);
  paintChrome();
}
const R = (name, fn) => (p, q) => mount(name, fn, p, q);
const router = createRouter({
  '/': R('home', renderHome),
  '/programas': R('programs', renderPrograms),
  '/servicios': R('services', renderServices),
  '/servicios/:line': R('services', renderServices),
  '/agendar': R('booking', renderBooking),
  '/seguimiento': R('tracking', renderTracking),
  '/seguimiento/:code': R('tracking', renderTracking),
  '/inspeccion/:id': R('inspection', renderInspection),
  '/dyno': R('dyno', renderDynoList),
  '/dyno/:id': R('dynoOne', renderDyno),
  '/membresias': R('tiers', renderTiers),
  '/garage': R('garage', renderGarage)
}, { notFound: () => router.go('/') });

// Cambios desde el panel o las apps de rol → se reflejan al instante (sin pisar formularios en curso).
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
