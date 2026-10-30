// Sitio público de Mecánica Integral Los Andes: cabecera, rutas, pie y refresco en vivo.
import { escape } from '../../../assets/core/ui.js';
import { createRouter } from '../../../assets/core/router.js';
import { db, auth, HOME } from '../data/db.js';
import { settings } from '../shared/domain.js';
import { renderHome } from './home.js';
import { renderServices, renderService } from './services.js';
import { renderQuote } from './quote.js';
import { renderBudget } from './budget.js';
import { renderTrack } from './track.js';
import { renderWarranty } from './warranty.js';
import { renderAccount } from './account.js';

const hdr = document.getElementById('hdr');
let view = document.getElementById('view');
const foot = document.getElementById('foot');
let current = null;

function paintChrome() {
  const c = settings(), u = auth.current();
  hdr.innerHTML = `<div class="container hdr-row">
    <a class="brand site-brand" href="#/"><span class="brand-mark" aria-hidden="true">🔧</span><span class="brand-text"><b>${escape(c.short || c.name)}</b><small>Mecánica integral</small></span></a>
    <nav class="site-nav" id="nav" aria-label="Principal">
      <a href="#/servicios">Servicios</a><a href="#/presupuesto">Aprobar presupuesto</a><a href="#/ot">Seguir mi OT</a><a href="#/garantia">Garantías</a>
      ${u ? (u.role === 'cliente' ? '<a href="#/cuenta">Mi cuenta</a>' : `<a href="${HOME[u.role] || 'admin.html'}">Panel</a>`) : '<a href="login.html">Ingresar</a>'}
    </nav>
    <div class="site-actions row nowrap" style="gap:8px"><a class="btn btn-primary btn-sm" href="#/cotizar">Cotizar o agendar</a>
    <button class="btn btn-icon btn-sm btn-ghost nav-toggle menu-toggle" aria-label="Menú" aria-expanded="false" aria-controls="nav">☰</button></div>
  </div>${c.announcement ? `<div class="announce"><div class="container">${escape(c.announcement)}</div></div>` : ''}`;
  foot.innerHTML = `<div class="container foot-grid">
    <div class="stack" style="gap:8px"><b class="foot-brand">🔧 ${escape(c.name)}</b><span class="muted small">${escape(c.tagline)}</span><span class="small">📍 ${escape(c.address)}</span><span class="small">📞 ${escape(c.phone)} · 💬 ${escape(c.whatsapp)}</span><span class="small">🕘 ${escape(c.hours)}</span></div>
    <div class="stack small" style="gap:6px"><b>Servicios</b><a href="#/servicios/mecanica">Mecánica general</a><a href="#/servicios/scanner">Diagnóstico computarizado</a><a href="#/servicios/pintura">Desabolladura y pintura</a><a href="#/servicios/siniestros">Siniestros con seguro</a></div>
    <div class="stack small" style="gap:6px"><b>Tu OT</b><a href="#/presupuesto">Aprobar presupuesto</a><a href="#/ot">Seguimiento en línea</a><a href="#/garantia">Consultar garantía</a></div>
    <div class="stack small" style="gap:6px"><b>Accesos</b><a href="#/cuenta">Mi cuenta</a><a href="aseguradora.html">Portal aseguradoras</a><a href="mecanico.html">App mecánicos</a><a href="login.html">Ingreso equipo</a></div>
  </div><div class="container small muted foot-legal">${escape(c.guarantee || '')} Taller ficticio creado como demostración; valores referenciales con IVA.</div>`;
  router.highlight(hdr);
}
hdr.addEventListener('click', e => {
  const t = e.target.closest('.nav-toggle'), nav = hdr.querySelector('#nav');
  if (t) { const open = nav.classList.toggle('open'); t.setAttribute('aria-expanded', open); return; }
  if (e.target.closest('#nav a')) nav.classList.remove('open');
});

function mount(name, fn, params, query, keep = false) {
  if (current?.res?.destroy) current.res.destroy();
  if (!keep) { document.querySelectorAll('.modal-backdrop').forEach(m => m.remove()); document.body.style.overflow = ''; }
  const y = window.scrollY;
  const fresh = document.createElement('main'); fresh.id = 'view'; fresh.className = view.className; view.replaceWith(fresh); view = fresh;
  const res = fn(view, params, query) || {};
  current = { name, fn, params, query, res };
  keep ? window.scrollTo(0, y) : window.scrollTo(0, 0);
  paintChrome();
}
const R = (n, fn) => (p, q) => mount(n, fn, p, q);
const router = createRouter({
  '/': R('home', renderHome), '/servicios': R('services', renderServices), '/servicios/:id': R('service', renderService),
  '/cotizar': R('quote', renderQuote), '/presupuesto': R('budget', renderBudget), '/presupuesto/:code': R('budget', renderBudget),
  '/ot': R('track', renderTrack), '/ot/:code': R('track', renderTrack), '/garantia': R('warranty', renderWarranty), '/cuenta': R('account', renderAccount)
}, { notFound: () => router.go('/') });

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
