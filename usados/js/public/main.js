// Sitio público de Ruta Certificada: cabecera, rutas y refresco en vivo desde el panel.
import { escape } from '../../../assets/core/ui.js';
import { createRouter } from '../../../assets/core/router.js';
import { db, auth } from '../data/db.js';
import { settings, cartGet } from '../shared/domain.js';
import { renderHome } from './home.js';
import { renderSearch, renderCompare } from './buscar.js';
import { renderCar, renderReserve } from './auto.js';
import { renderFinance } from './financiamiento.js';
import { renderSell } from './vende.js';
import { renderPlans } from './planes.js';
import { renderServices, renderBranches } from './servicios.js';
import { renderStore, renderCart } from './tienda.js';
import { renderAccount } from './cuenta.js';

const hdr = document.getElementById('hdr'), foot = document.getElementById('foot');
let view = document.getElementById('view');
let current = null;

function paintChrome() {
  const c = settings(), u = auth.current(), n = cartGet().reduce((a, x) => a + x.qty, 0);
  hdr.innerHTML = `<div class="container hdr-row">
    <a class="site-brand brand" href="#/"><span class="brand-mark" aria-hidden="true">✓</span><span class="brand-text"><b>${escape(c.name)}</b><small>Seminuevos certificados</small></span></a>
    <nav class="site-nav" id="nav" aria-label="Principal">
      <a href="#/autos">Comprar</a><a href="#/vende">Vender</a><a href="#/financiamiento">Financiamiento</a>${c.showPlans ? '<a href="#/planes">Planes</a>' : ''}<a href="#/servicios">Servicios</a>${c.showStore ? `<a href="#/tienda">Tienda</a>` : ''}<a href="#/sucursales">Sucursales</a>
      ${u ? (u.role === 'cliente' ? '<a href="#/cuenta">Mi cuenta</a>' : '<a href="login.html">Mi app</a>') : '<a href="login.html">Ingresar</a>'}
    </nav>
    <div class="site-actions">${c.showStore ? `<a class="btn btn-sm btn-ghost" href="#/carrito" aria-label="Carrito">🛒<span class="cart-pill" ${n ? '' : 'hidden'}>${n}</span></a>` : ''}<a class="btn btn-primary btn-sm" href="#/vende">Tasar<span class="hide-xs"> mi auto</span></a></div>
    <button class="btn btn-icon btn-sm btn-ghost nav-burger" aria-label="Menú" aria-expanded="false" aria-controls="nav">☰</button>
  </div>${c.announcement ? `<div class="announce"><div class="container">${escape(c.announcement)}</div></div>` : ''}`;
  foot.innerHTML = `<div class="container foot-grid">
    <div class="stack" style="gap:8px"><a class="brand" href="#/"><span class="brand-mark" aria-hidden="true">✓</span><b>${escape(c.name)}</b></a><span class="muted small">${escape(c.tagline)}</span><span class="small">📞 ${escape(c.phone)} · 💬 ${escape(c.whatsapp)}</span><span class="small">✉️ ${escape(c.email)}</span></div>
    <div class="stack small" style="gap:6px"><b>Comprar</b><a href="#/autos">Autos certificados</a><a href="#/autos?fuel=Eléctrico">Eléctricos e híbridos</a><a href="#/financiamiento">Simulador de crédito</a><a href="#/comparar">Comparador</a></div>
    <div class="stack small" style="gap:6px"><b>Servicios</b><a href="#/vende">Vende o permuta tu auto</a><a href="#/planes">Planes de mantención</a><a href="#/servicios">Agenda de servicios</a><a href="#/tienda">Repuestos y accesorios</a></div>
    <div class="stack small" style="gap:6px"><b>Ruta Certificada</b><a href="#/sucursales">Sucursales</a><a href="#/cuenta">Mi cuenta</a><a href="login.html">Acceso equipo</a></div>
  </div><div class="container small muted foot-legal">Marcas y modelos se usan solo como referencia. ${escape(c.name)} es una automotora ficticia creada como demostración; los pagos son simulados.</div>`;
  router.highlight(hdr);
}
hdr.addEventListener('click', e => {
  const t = e.target.closest('.nav-burger'), nav = hdr.querySelector('#nav');
  if (t) { const open = nav.classList.toggle('open'); t.setAttribute('aria-expanded', open); return; }
  if (e.target.closest('#nav a')) nav.classList.remove('open');
});
window.addEventListener('ruta:cart', () => paintChrome());

function mount(name, fn, params, query, keepScroll) {
  if (current?.res?.destroy) current.res.destroy();
  const y = window.scrollY;
  const fresh = view.cloneNode(false); view.replaceWith(fresh); view = fresh;
  const res = fn(view, params, query) || {};
  current = { name, fn, params, query, res };
  window.scrollTo(0, keepScroll ? y : 0);
  paintChrome();
}
const R = (name, fn) => (p, q) => mount(name, fn, p, q);
const router = createRouter({
  '/': R('home', renderHome), '/autos': R('search', renderSearch), '/auto/:id': R('car', renderCar), '/reservar/:id': R('reserve', renderReserve), '/comparar': R('compare', renderCompare),
  '/financiamiento': R('finance', renderFinance), '/vende': R('sell', renderSell), '/planes': R('plans', renderPlans), '/servicios': R('services', renderServices), '/sucursales': R('branches', renderBranches),
  '/tienda': R('store', renderStore), '/carrito': R('cart', renderCart), '/cuenta': R('account', renderAccount)
}, { notFound: () => router.go('/') });

db.subscribe(() => {
  paintChrome();
  if (!current || document.querySelector('.modal-backdrop')) return;
  if (current.res.live === false) return;
  const ae = document.activeElement;
  if (ae && view.contains(ae) && ae.matches('input, textarea, select')) return;
  if (current.res.refresh) current.res.refresh();
  else mount(current.name, current.fn, current.params, current.query, true);
});
router.start();
