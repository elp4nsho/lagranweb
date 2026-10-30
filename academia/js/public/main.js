// Sitio público (SPA por hash): portada, catálogo, ficha de curso, instructores, carrito, checkout y certificados.
import { escape } from '../../../assets/core/ui.js';
import { createRouter } from '../../../assets/core/router.js';
import { db } from '../data/db.js';
import { site } from '../data/model.js';
import { mountHeader, brandHTML } from '../shared/bits.js';
import { renderHome, renderCategories, renderTeach } from './home.js';
import { renderCatalog } from './catalog.js';
import { renderCourse } from './course.js';
import { renderInstructor } from './instructor.js';
import { renderCart, renderCheckout, renderThanks } from './checkout.js';
import { renderCertificate } from './cert.js';

const view = document.getElementById('view');
mountHeader(document.getElementById('site-header'));
let live = true; // las vistas con formularios en curso no se repintan solas

function chrome() {
  const s = site();
  document.getElementById('announce').innerHTML = s.announcementOn && s.announcement ? `<div class="announce"><div class="container"><span aria-hidden="true">🎁</span><span>${escape(s.announcement)}</span></div></div>` : '';
  document.getElementById('footer').innerHTML = `<div class="grid-4">
    <div>${brandHTML(false)}<p style="margin-top:10px">Cursos online prácticos, hechos en Chile. Empresa ficticia (demo de portafolio).</p></div>
    <div><h4>Aprende</h4><a href="#/cursos">Todos los cursos</a><a href="#/cursos?precio=gratis">Cursos gratuitos</a><a href="#/categorias">Categorías</a></div>
    <div><h4>Comunidad</h4><a href="#/ensena">Enseña en Faro</a><a href="login.html">Ingresar</a><a href="login.html#registro">Crear cuenta</a></div>
    <div><h4>Ayuda</h4><a href="mailto:${escape(s.supportEmail)}">${escape(s.supportEmail)}</a><a href="#/certificado/">Verificar certificado</a><span>Reembolsos dentro de ${escape(s.refundDays)} días</span></div>
  </div>`;
}

const router = createRouter({
  '/': () => renderHome(view),
  '/cursos': (_p, q) => renderCatalog(view, q),
  '/categorias': () => renderCategories(view),
  '/ensena': () => renderTeach(view),
  '/curso/:slug': ({ slug }) => renderCourse(view, slug),
  '/instructor/:id': ({ id }) => renderInstructor(view, id),
  '/carrito': () => renderCart(view),
  '/checkout': () => { live = false; renderCheckout(view); },
  '/gracias/:id': ({ id }) => renderThanks(view, id),
  '/certificado': () => { live = false; renderCertificate(view, ''); },
  '/certificado/:code': ({ code }) => { live = false; renderCertificate(view, code); }
}, {
  before: () => { live = true; return true; },
  notFound: () => { view.innerHTML = '<section class="page"><div class="container"><div class="card empty"><span class="icon">🧭</span><h2>Página no encontrada</h2><a class="btn btn-primary" href="#/">Volver al inicio</a></div></div></section>'; },
  after: () => { router.highlight(document.getElementById('site-header')); }
});
let last = location.hash;
window.addEventListener('hashchange', () => { const base = h => h.split('?')[0]; if (base(location.hash) !== base(last)) window.scrollTo(0, 0); last = location.hash; });
chrome();
router.start();
let t;
db.subscribe(() => { clearTimeout(t); t = setTimeout(() => { chrome(); if (live && !document.querySelector('.modal-backdrop')) { const y = scrollY; router.refresh(); scrollTo(0, y); } }, 80); });
