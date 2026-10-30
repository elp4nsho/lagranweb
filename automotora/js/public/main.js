// Sitio público de Autoplaza Pacífico (router por hash).
import { createRouter } from '../../../assets/core/router.js';
import { $ } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { header, footer } from './layout.js';
import { renderHome } from './home.js';
import { renderCatalog, renderCompare } from './catalog.js';
import { renderModel, renderSpec } from './model.js';
import { renderOffers } from './offers.js';
import { renderFinance } from './finance.js';
import { renderTradeIn } from './tradein.js';
import { renderTestDrive, renderQuote } from './leads.js';
import { renderStock, renderShowrooms } from './stock.js';
import { renderService } from './service.js';
import { renderAccount } from './account.js';

let page = $('#view');
const head = $('#hdr'), foot = $('#foot');
let current = null, lastPath = null;
// Cada vista recibe un <main> nuevo (sin listeners de la vista anterior)
const view = (fn, opts = {}) => (params, query) => {
  current = opts;
  const fresh = page.cloneNode(false); page.replaceWith(fresh); page = fresh;
  page.className = 'site-main page-' + (opts.cls || 'std');
  return fn(page, params, query);
};

const router = createRouter({
  '/': view(renderHome, { cls: 'home' }),
  '/modelos': view(renderCatalog, { cls: 'catalog' }),
  '/comparar': view(renderCompare, { cls: 'compare' }),
  '/modelo/:id': view(renderModel, { keep: true, cls: 'model' }),
  '/config/:code': view((el, p, q) => renderModel(el, { code: p.code }, q), { keep: true, cls: 'model' }),
  '/ficha/:code': view(renderSpec, { cls: 'spec' }),
  '/ofertas': view(renderOffers),
  '/financiamiento': view(renderFinance, { keep: true, cls: 'finance' }),
  '/tasacion': view(renderTradeIn, { keep: true }),
  '/test-drive': view(renderTestDrive, { keep: true }),
  '/cotizar': view(renderQuote, { keep: true }),
  '/stock': view(renderStock),
  '/sucursales': view(renderShowrooms),
  '/posventa': view(renderService, { keep: true, cls: 'service' }),
  '/posventa/:tab': view(renderService, { keep: true, cls: 'service' }),
  '/cuenta': view(renderAccount, { cls: 'account' }),
  '/cuenta/:tab': view(renderAccount, { cls: 'account' })
}, {
  notFound: () => { current = {}; const fresh = page.cloneNode(false); page.replaceWith(fresh); page = fresh; page.innerHTML = `<section class="section"><div class="container empty"><h1>Página no encontrada</h1><a class="btn btn-primary" href="#/">Volver al inicio</a></div></section>`; },
  after: r => {
    router.highlight(head);
    if (r.path !== lastPath) { window.scrollTo(0, 0); lastPath = r.path; }
  }
});

function chrome() { header(head); footer(foot); router.highlight(head); }
chrome();
router.start();

// Cambios hechos en el panel (u otra pestaña) se reflejan al instante.
let t;
db.subscribe(change => {
  if (change.type === 'log') return;
  clearTimeout(t);
  t = setTimeout(() => {
    chrome();
    const ae = document.activeElement;
    const busy = ae && page.contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName);
    if (current && current.keep && change.type !== 'sync' && change.type !== 'reset') return; // vistas con estado propio
    if (!busy && !document.querySelector('.modal-backdrop')) router.refresh();
  }, 80);
});
