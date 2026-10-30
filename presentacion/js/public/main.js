// Sitio público de Estudio Nébula: router por hash + refresco en vivo desde la DB.
import { createRouter } from '../../../assets/core/router.js';
import { $ } from '../../../assets/core/ui.js';
import { db, settings } from '../data/db.js';
import { renderHeader, renderFooter, applySEO } from './layout.js';
import { renderHome } from './home.js';
import { renderWork, renderProject } from './work.js';
import { renderStudio } from './studio.js';
import { renderBlog, renderPost } from './blog.js';
import { renderCareers, renderJob } from './careers.js';
import { renderContact, renderQuote } from './contact.js';

const header = $('#site-header'), main = $('#main'), footer = $('#site-footer');
let lastPath = null;

function page(fn, title) {
  return (params, query) => {
    const t = fn(main, params, query);
    applySEO(typeof t === 'string' ? t : title);
  };
}

const router = createRouter({
  '/': page(el => renderHome(el)),
  '/trabajos': page((el, p, q) => renderWork(el, q), 'Trabajos'),
  '/trabajos/:slug': page((el, p) => renderProject(el, p.slug)),
  '/estudio': page(el => renderStudio(el), 'Estudio'),
  '/blog': page((el, p, q) => renderBlog(el, q), 'Blog'),
  '/blog/:slug': page((el, p) => renderPost(el, p.slug)),
  '/carreras': page(el => renderCareers(el), 'Carreras'),
  '/carreras/:slug': page((el, p) => renderJob(el, p.slug)),
  '/contacto': page(el => renderContact(el), 'Contacto'),
  '/cotizar': page(el => renderQuote(el), 'Cotizador')
}, {
  notFound: () => { main.innerHTML = `<section class="section page-top"><div class="container empty"><span class="icon">404</span><h2>Página no encontrada</h2><a class="btn btn-primary" href="#/">Ir al inicio</a></div></section>`; applySEO('No encontrado'); },
  after: cur => {
    router.highlight(header);
    if (cur.path !== lastPath) { window.scrollTo(0, 0); lastPath = cur.path; }
    main.focus({ preventScroll: true });
  }
});

function shell() { renderHeader(header); renderFooter(footer); }

function maintenance() {
  const s = settings();
  if (!s.maintenance) return false;
  main.innerHTML = `<section class="section page-top"><div class="container empty"><span class="icon">⚙</span><h1>Volvemos pronto</h1><p class="lead">Estamos actualizando el sitio de ${s.name}. Escríbenos a ${s.email}.</p></div></section>`;
  return true;
}

let started = false;
const go = () => { if (maintenance()) return; if (started) router.refresh(); else { started = true; router.start(); } };
shell();
go();

// Cambios desde el panel (otra pestaña) → refresco inmediato, sin perder lo que el usuario escribe.
let pending = false;
db.subscribe(change => {
  if (change.type !== 'sync' && change.type !== 'reset') return;
  const typing = document.activeElement && main.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  const inWizard = router.current && ['/cotizar', '/contacto'].includes(router.current.path) && main.querySelector('form, .wizard');
  if (typing || inWizard) { renderHeader(header); renderFooter(footer); pending = true; return; }
  const y = window.scrollY;
  shell();
  go();
  requestAnimationFrame(() => window.scrollTo(0, y));
});
// Si hubo cambios mientras se escribía, se aplican al salir del formulario.
main.addEventListener('focusout', () => setTimeout(() => {
  if (!pending || main.contains(document.activeElement)) return;
  if (router.current && ['/cotizar', '/contacto'].includes(router.current.path)) return;
  pending = false; go();
}, 50));
window.addEventListener('hashchange', () => { pending = false; });
