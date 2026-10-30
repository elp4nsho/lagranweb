// Sitio público de Titán Fit (router por hash).
import { createRouter } from '../../../assets/core/router.js';
import { $ } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { header, footer } from './layout.js';
import { renderHome } from './home.js';
import { renderPlans, renderSignup } from './plans.js';
import { renderSchedule } from './schedule.js';
import { renderBranches } from './branches.js';
import { renderTrainers } from './trainers.js';

const page = $('#page'), head = $('#site-header'), foot = $('#site-footer');
let current = {}, lastPath = null;
const view = (fn, opts = {}) => (params, query) => { current = opts; return fn(page, params, query); };
const router = createRouter({
  '/': view(renderHome), '/planes': view(renderPlans), '/inscripcion/:id': view(renderSignup, { keep: true }),
  '/horario': view(renderSchedule), '/sedes': view(renderBranches), '/entrenadores': view(renderTrainers)
}, {
  notFound: () => { current = {}; page.innerHTML = `<section class="section"><div class="container empty"><h1>Página no encontrada</h1><a class="btn btn-primary" href="#/">Volver al inicio</a></div></section>`; },
  after: r => { router.highlight(head); if (r.path !== lastPath) { window.scrollTo(0, 0); lastPath = r.path; } }
});
function chrome() { header(head); footer(foot); router.highlight(head); }
chrome();
router.start();
db.subscribe(ch => {
  if (ch.type === 'log') return;
  chrome();
  if (current.keep) return;
  const ae = document.activeElement;
  if (ae && page.contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName)) return;
  if (!document.querySelector('.modal-backdrop')) router.refresh();
});
