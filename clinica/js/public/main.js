// Sitio público del Centro Médico Alerce (router por hash).
import { createRouter } from '../../../assets/core/router.js';
import { $ } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { header, footer } from './layout.js';
import { renderHome } from './home.js';
import { renderSpecialties, renderSpecialty } from './specialties.js';
import { renderDoctors, renderDoctor } from './doctors.js';
import { renderBooking } from './booking.js';
import { renderManage } from './manage.js';
import { renderTele } from './tele.js';
import { renderResults } from './results.js';
import { renderPortal } from './portal.js';

const page = $('#page'), head = $('#site-header'), foot = $('#site-footer');
let current = null, lastPath = null;
const view = (fn, opts = {}) => (params, query) => { current = opts; return fn(page, params, query); };

const router = createRouter({
  '/': view(renderHome),
  '/especialidades': view(renderSpecialties),
  '/especialidades/:id': view(renderSpecialty),
  '/medicos': view(renderDoctors),
  '/medicos/:id': view(renderDoctor),
  '/reservar': view(renderBooking, { keep: true }),
  '/mi-hora': view(renderManage, { keep: true }),
  '/telemedicina': view(renderTele, { keep: true }),
  '/telemedicina/:code': view(renderTele, { keep: true }),
  '/resultados': view(renderResults, { keep: true }),
  '/portal': view(renderPortal),
  '/portal/:tab': view(renderPortal)
}, {
  notFound: () => { current = {}; page.innerHTML = `<section class="section"><div class="container empty"><h1>Página no encontrada</h1><a class="btn btn-primary" href="#/">Volver al inicio</a></div></section>`; },
  after: r => {
    router.highlight(head);
    if (r.path !== lastPath) { window.scrollTo(0, 0); lastPath = r.path; }
  }
});

function chrome() { header(head); footer(foot); router.highlight(head); }
chrome();
router.start();

// Cambios en la DB (desde el panel u otra pestaña) se reflejan al instante.
db.subscribe(change => {
  if (change.type === 'log') return;
  chrome();
  const busy = document.activeElement && page.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  if (current && current.keep) return; // vistas con estado propio (formularios, chat) se actualizan solas
  if (!busy && !document.querySelector('.modal-backdrop')) router.refresh();
});
