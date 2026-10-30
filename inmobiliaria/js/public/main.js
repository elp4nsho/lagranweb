// Sitio público de Hogar Austral: encabezado, pie, router y sincronización con el panel.
import { createRouter } from '../../../assets/core/router.js';
import { escape, $, debounce } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth, settings, homeFor } from '../data/db.js';
import { icon } from '../shared/art.js';
import { compareList, wireCardActions } from './cards.js';
import { renderHome } from './home.js';
import { renderSearch } from './search.js';
import { renderProperty } from './property.js';
import { renderCompare } from './compare.js';
import { renderProjects, renderProject } from './projects.js';
import { renderPublish } from './publish.js';
import { renderAccount } from './account.js';

const app = document.getElementById('app');
app.innerHTML = `<header class="site-head site-header"><div class="container">
    <a class="brand site-brand" href="#/"><span class="mark">${icon('building', 22)}</span><span><span data-brand></span><small>Propiedades</small></span></a>
    <button class="btn btn-ghost btn-icon nav-toggle" aria-label="Menú" aria-expanded="false">☰</button>
    <nav class="site-nav" aria-label="Principal">
      <a class="nl" href="#/buscar?op=venta">Comprar</a>
      <a class="nl" href="#/buscar?op=arriendo">Arrendar</a>
      <a class="nl" href="#/proyectos">Proyectos nuevos</a>
      <a class="nl" href="#/publicar">Publicar</a>
    </nav>
    <div class="head-actions site-actions" data-actions></div>
  </div></header>
  <main class="site-main" id="view"></main>
  <footer class="site-foot site-footer"><div class="container grid-4" data-foot></div></footer>
  <div data-cbar></div>`;
const view = $('#view'), head = $('.site-head');
wireCardActions(app);
head.querySelector('.nav-toggle').onclick = e => { head.classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', head.classList.contains('open')); };
head.addEventListener('click', e => { if (e.target.closest('.site-nav a')) head.classList.remove('open'); });

function renderChrome() {
  const s = settings(), u = auth.current();
  $('[data-brand]').textContent = s.brand || 'Hogar Austral';
  const unread = u ? db.count('notifications', n => n.userId === u.id && !n.read) : 0;
  const n = compareList().length;
  $('[data-actions]').innerHTML = `
    <a class="btn btn-ghost btn-sm icon-btn" href="#/comparar" title="Comparar">${icon('compare')}<span class="lbl">Comparar</span>${n ? `<span class="dot-count">${n}</span>` : ''}</a>
    ${u ? `<a class="btn btn-ghost btn-sm icon-btn" href="#/cuenta/alertas" title="Alertas">${icon('bell')}${unread ? `<span class="dot-count">${unread}</span>` : ''}</a>
      <a class="btn btn-sm" href="${['admin', 'editor', 'corredor'].includes(u.role) ? homeFor(u) : '#/cuenta'}"><span class="avatar" style="--av:${escape(u.color || 'var(--primary)')};--size:24px">${escape(initials(u.name))}</span><span class="lbl">${escape(u.name.split(' ')[0])}</span></a>`
      : `<a class="btn btn-primary btn-sm" aria-label="Ingresar" href="login.html?next=${encodeURIComponent('index.html' + location.hash)}">${icon('user', 16)}<span class="lbl"> Ingresar</span></a>`}`;
  $('[data-foot]').innerHTML = `
    <div><a class="brand" href="#/"><span class="mark">${icon('building', 20)}</span>${escape(s.brand || 'Hogar Austral')}</a><p class="muted small" style="margin-top:12px">Corredora de propiedades ficticia creada como demo. Datos simulados en tu navegador.</p></div>
    <div><h4>Explorar</h4><a href="#/buscar?op=venta">Propiedades en venta</a><a href="#/buscar?op=arriendo">Propiedades en arriendo</a><a href="#/proyectos">Proyectos nuevos</a><a href="#/buscar?view=mapa">Mapa de precios</a></div>
    <div><h4>Para ti</h4><a href="#/publicar">Publica tu propiedad</a><a href="#/cuenta">Mi cuenta</a><a href="#/comparar">Comparador</a><a href="login.html">Acceso equipo</a></div>
    <div><h4>Contacto</h4><a href="tel:${escape(s.phone)}">${escape(s.phone)}</a><a href="mailto:${escape(s.email)}">${escape(s.email)}</a><span class="muted small">${escape(s.address)}</span><p class="small muted" style="margin-top:8px">UF hoy: <b>$${Number(s.uf).toLocaleString('es-CL', { minimumFractionDigits: 2 })}</b></p></div>`;
  const ids = compareList();
  $('[data-cbar]').innerHTML = ids.length && !location.hash.startsWith('#/comparar') ? `<div class="compare-bar"><span>${icon('compare')} <b>${ids.length}</b> para comparar</span><a class="btn btn-primary btn-sm" href="#/comparar">Comparar</a></div>` : '';
}

const router = createRouter({
  '/': renderHome,
  '/buscar': (p, q) => renderSearch(q),
  '/propiedad/:id': ({ id }) => renderProperty(id),
  '/comparar': renderCompare,
  '/proyectos': renderProjects,
  '/proyecto/:id': ({ id }) => renderProject(id),
  '/publicar': renderPublish,
  '/cuenta': () => renderAccount('favoritos'),
  '/cuenta/:tab': ({ tab }) => renderAccount(tab)
}, {
  notFound: () => { view.innerHTML = `<section class="section"><div class="container empty"><h1>Página no encontrada</h1><a class="btn btn-primary" href="#/">Volver al inicio</a></div></section>`; },
  before: () => { view.dataset.route = location.hash; return true; },
  after: () => { renderChrome(); router.highlight(head); if (!window.__hapKeep) window.scrollTo(0, 0); window.__hapKeep = false; }
});
const ctx = { rerender: () => { window.__hapKeep = true; router.refresh(); } };
window.addEventListener('hap:compare', renderChrome);

// Cambios desde el panel (otra pestaña) o del propio sitio → refresco.
const sync = debounce(() => {
  const a = document.activeElement;
  if (document.querySelector('.modal-backdrop') || (a && view.contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName))) { renderChrome(); return; }
  ctx.rerender();
}, 150);
db.subscribe(ch => { if (ch.type === 'sync' || ch.type === 'reset' || ch.type === 'value') sync(); else renderChrome(); });
router.start();
