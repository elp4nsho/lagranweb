// Sitio público del Colegio Los Aromos: layout + router por hash.
import { db, auth, HOME_BY_ROLE } from '../data/db.js';
import { createRouter } from '../../../assets/core/router.js';
import { escape } from '../../../assets/core/ui.js';
import { liveRender } from '../shared/kit.js';
import { site, seal } from '../shared/academic.js';
import { renderHome, renderProyecto, renderNiveles, renderContacto } from './pages.js';
import { renderNoticias, renderNoticia, renderCalendario } from './news.js';
import { renderAdmision, renderPostular, renderEstado } from './admission.js';

const NAV = [['#/', 'Inicio'], ['#/proyecto', 'Proyecto educativo'], ['#/niveles', 'Niveles'], ['#/noticias', 'Noticias'], ['#/calendario', 'Calendario'], ['#/admision', 'Admisión'], ['#/contacto', 'Contacto']];

function layout() {
  const st = site(), u = auth.current();
  document.getElementById('app').innerHTML = `
    ${st.announcement ? `<div class="announce">${escape(st.announcement)} · <a href="#/admision">Ver más</a></div>` : ''}
    <header class="site-header">
      <div class="container">
        <a class="brand" href="#/">${seal(40)}<span>${escape(st.name)}<small>${escape(st.city || '')}</small></span></a>
        <button class="btn btn-ghost btn-icon nav-toggle" aria-label="Abrir menú" aria-expanded="false">☰</button>
        <nav class="site-nav" aria-label="Principal">
          ${NAV.map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}
          ${u ? `<a class="btn btn-primary btn-sm" href="${HOME_BY_ROLE[u.role] || 'login.html'}">Mi ${escape(st.platform)}</a>` : `<a class="btn btn-primary btn-sm" href="login.html">Ingresar a ${escape(st.platform)}</a>`}
        </nav>
      </div>
    </header>
    <main id="view" tabindex="-1"></main>
    <footer class="site-footer">
      <div class="container footer-grid">
        <div class="stack" style="gap:10px">
          <a class="brand" href="#/">${seal(36)}<span>${escape(st.name)}<small>Desde ${st.founded}</small></span></a>
          <p class="muted small">${escape(st.address)}<br>${escape(st.phone)} · ${escape(st.email)}<br>${escape(st.hours)}</p>
        </div>
        <div><h4>Colegio</h4><ul><li><a href="#/proyecto">Proyecto educativo</a></li><li><a href="#/niveles">Niveles</a></li><li><a href="#/noticias">Noticias</a></li></ul></div>
        <div><h4>Familias</h4><ul><li><a href="#/admision">Admisión ${st.admissionYear}</a></li><li><a href="#/admision/estado">Estado de postulación</a></li><li><a href="#/calendario">Calendario</a></li></ul></div>
        <div><h4>${escape(st.platform)}</h4><ul><li><a href="login.html">Ingresar</a></li><li><a href="#/contacto">Contacto</a></li></ul></div>
      </div>
      <div class="container small muted" style="margin-top:24px">© ${new Date().getFullYear()} ${escape(st.name)} · Sitio de demostración con datos ficticios.</div>
    </footer>`;
  const header = document.querySelector('.site-header');
  header.querySelector('.nav-toggle').addEventListener('click', e => { const o = header.classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', o); });
  header.querySelectorAll('.site-nav a').forEach(a => a.addEventListener('click', () => header.classList.remove('open')));
}

const view = () => document.getElementById('view');
const routes = {
  '/': () => renderHome(view()),
  '/proyecto': () => renderProyecto(view()),
  '/niveles': () => renderNiveles(view()),
  '/noticias': () => renderNoticias(view()),
  '/noticias/:id': ({ id }) => renderNoticia(view(), id),
  '/calendario': () => renderCalendario(view()),
  '/admision': () => renderAdmision(view()),
  '/admision/postular': () => renderPostular(view()),
  '/admision/estado': (_, q) => renderEstado(view(), q),
  '/contacto': () => renderContacto(view())
};
let lastPath = null;
const router = createRouter(routes, {
  notFound: () => { view().innerHTML = `<section class="section"><div class="container"><div class="empty"><span class="icon">🧭</span><h2>Página no encontrada</h2><a class="btn btn-primary" href="#/">Volver al inicio</a></div></div></section>`; },
  after: cur => {
    router.highlight(document.querySelector('.site-nav'));
    const st = site();
    document.title = `${st.name} · ${NAV.find(([h]) => h === '#' + cur.path)?.[1] || 'Colegio'}`;
    if (cur.path !== lastPath) { window.scrollTo(0, 0); lastPath = cur.path; }
  }
});

layout();
router.start();
// Cambios del panel (otra pestaña o misma sesión) se reflejan al instante.
liveRender(db, () => {
  if (router.current?.path === '/admision/postular') return; // el asistente conserva su propio estado
  layout(); router.refresh();
});
