// Sitio público de Gremio: layout + router por hash.
import { db, auth, HOME_BY_ROLE } from '../data/db.js';
import { createRouter } from '../../../assets/core/router.js';
import { escape } from '../../../assets/core/ui.js';
import { liveRender } from '../shared/kit.js';
import { settings } from '../shared/market.js';
import { renderHome } from './home.js';
import { renderBrowse, renderGig, renderCheckout } from './gigs.js';
import { renderProfile } from './profiles.js';
import { renderBriefs, renderBrief, renderNewBrief } from './briefs.js';

import { logo } from '../shared/logo.js';

function layout() {
  const st = settings(), u = auth.current();
  document.getElementById('app').innerHTML = `
    ${st.announcement ? `<div class="announce">${escape(st.announcement)}</div>` : ''}
    <header class="site-header"><div class="container">
      <a class="brand" href="#/">${logo()}<span>${escape(st.name)}<small>Freelancers de Chile</small></span></a>
      <button class="btn btn-ghost btn-icon nav-toggle" aria-label="Abrir menú" aria-expanded="false">☰</button>
      <nav class="site-nav" aria-label="Principal">
        <a href="#/servicios">Explorar servicios</a><a href="#/proyectos">Proyectos</a><a href="#/proyectos/nuevo">Publicar proyecto</a>
        ${u ? `<a class="btn btn-primary btn-sm" href="${HOME_BY_ROLE[u.role]}">Mi panel · ${escape(u.name.split(' ')[0])}</a>` : `<a href="login.html?modo=freelancer">Vende tus servicios</a><a class="btn btn-primary btn-sm" href="login.html">Ingresar</a>`}
      </nav></div></header>
    <main id="view" tabindex="-1"></main>
    <footer class="site-footer"><div class="container footer-grid">
      <div class="stack" style="gap:10px"><a class="brand" href="#/">${logo(30)}<span>${escape(st.name)}</span></a><p class="small muted">${escape(st.tagline)}. Pagos protegidos: el dinero se libera al freelancer solo cuando apruebas la entrega.</p></div>
      <div><h4>Categorías</h4><ul>${db.query('categories', c => c.active !== false).sort((a, b) => a.order - b.order).map(c => `<li><a href="#/servicios?cat=${c.id}">${escape(c.name)}</a></li>`).join('')}</ul></div>
      <div><h4>Clientes</h4><ul><li><a href="#/proyectos/nuevo">Publicar un proyecto</a></li><li><a href="#/servicios">Explorar servicios</a></li><li><a href="cliente.html">Mis pedidos</a></li></ul></div>
      <div><h4>Freelancers</h4><ul><li><a href="login.html?modo=freelancer">Empieza a vender</a></li><li><a href="#/proyectos">Proyectos abiertos</a></li><li><a href="freelancer.html">Mi panel</a></li></ul></div>
    </div><div class="container small muted" style="margin-top:24px">© ${new Date().getFullYear()} ${escape(st.name)} · Marketplace de demostración con datos ficticios. Comisión de servicio ${st.serviceFeePct}%.</div></footer>`;
  const header = document.querySelector('.site-header');
  header.querySelector('.nav-toggle').addEventListener('click', e => { const o = header.classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', o); });
  header.querySelectorAll('.site-nav a').forEach(a => a.addEventListener('click', () => header.classList.remove('open')));
}

const view = () => document.getElementById('view');
const TITLES = { '/': 'Inicio', '/servicios': 'Servicios', '/proyectos': 'Proyectos', '/proyectos/nuevo': 'Publicar proyecto' };
let lastPath = null;
const router = createRouter({
  '/': () => renderHome(view()),
  '/servicios': (_, q) => renderBrowse(view(), q),
  '/servicio/:id': ({ id }, q) => renderGig(view(), id, q),
  '/checkout/:id/:pkg': ({ id, pkg }) => renderCheckout(view(), id, pkg),
  '/freelancer/:id': ({ id }) => renderProfile(view(), id),
  '/proyectos': () => renderBriefs(view()),
  '/proyectos/nuevo': () => renderNewBrief(view()),
  '/proyectos/:id': ({ id }) => renderBrief(view(), id)
}, {
  notFound: () => { view().innerHTML = '<section class="section"><div class="container"><div class="empty"><h2>Página no encontrada</h2><a class="btn btn-primary" href="#/">Volver al inicio</a></div></div></section>'; },
  after: cur => {
    router.highlight(document.querySelector('.site-nav'));
    document.title = `${settings().name} · ${TITLES[cur.path] || 'Marketplace freelance'}`;
    if (cur.path !== lastPath) { window.scrollTo(0, 0); lastPath = cur.path; }
  }
});
layout();
router.start();
liveRender(db, () => {
  if (/^\/checkout|^\/proyectos\/nuevo/.test(router.current?.path || '')) return; // formularios con estado propio
  layout(); router.refresh();
});
