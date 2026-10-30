// Sitio público de Brújula Noticias.
import { createRouter } from '../../../assets/core/router.js';
import { $, toast } from '../../../assets/core/ui.js';
import { db, promoteScheduled } from '../data/db.js';
import { renderHeader, renderFooter, applySEO } from './layout.js';
import { renderHome } from './home.js';
import { renderSection, renderTag, renderAuthor, renderSearch } from './lists.js';
import { renderArticle } from './article.js';
import { renderPlans, renderAccount } from './account.js';

const header = $('#site-header'), main = $('#main'), footer = $('#site-footer');
let lastPath = null;
promoteScheduled();

const refresh = () => { renderHeader(header); router.refresh(); };
const page = (fn, title) => (params, query) => { const t = fn(params, query); applySEO(typeof t === 'string' ? t : title); };

const router = createRouter({
  '/': page(() => renderHome(main)),
  '/seccion/:id': page(p => renderSection(main, p.id)),
  '/tag/:id': page(p => renderTag(main, p.id)),
  '/autor/:slug': page(p => renderAuthor(main, p.slug)),
  '/buscar': page((p, q) => renderSearch(main, q)),
  '/articulo/:slug': page(p => renderArticle(main, p.slug, refresh)),
  '/planes': page((p, q) => renderPlans(main, q, refresh)),
  '/cuenta': page(() => renderAccount(main, refresh))
}, {
  notFound: () => { main.innerHTML = `<div class="container page-top empty"><span class="icon">404</span><h1>Página no encontrada</h1><a class="btn btn-primary" href="#/">Ir a portada</a></div>`; applySEO('No encontrado'); },
  after: cur => {
    router.highlight(header.querySelector('.sec-nav'));
    if (cur.path !== lastPath) { window.scrollTo(0, 0); lastPath = cur.path; }
    // Impresiones de publicidad (una por anuncio visible y por vista)
    main.parentElement.querySelectorAll('[data-ad]').forEach(a => db.update('ads', a.dataset.ad, x => ({ impressions: (x.impressions || 0) + 1 })));
  }
});

renderHeader(header); renderFooter(footer);
router.start();

// Newsletter y clics de publicidad (delegados)
document.addEventListener('submit', e => {
  const f = e.target.closest('[data-newsletter]'); if (!f) return;
  e.preventDefault();
  const email = f.email.value.trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) { f.email.classList.add('invalid'); toast('Ingresa un correo válido', 'warning'); return; }
  const lists = ['diario', 'semanal'].filter(l => f[l]?.checked);
  if (!lists.length) return toast('Elige al menos una edición', 'warning');
  const ex = db.find('subscribers', s => s.email.toLowerCase() === email.toLowerCase());
  if (ex) db.update('subscribers', ex.id, { status: 'active', lists: [...new Set([...(ex.lists || []), ...lists])] });
  else db.insert('subscribers', { email, name: '', lists, status: 'active', source: 'Portada' });
  db.log('newsletter', `Nueva suscripción al newsletter: ${email}`);
  f.innerHTML = `<p class="success-msg">✓ ¡Listo! Revisa tu correo ${email.replace(/[<>&"]/g, '')} para confirmar.</p>`;
  toast('Suscripción al newsletter confirmada', 'success');
});
document.addEventListener('click', e => {
  const a = e.target.closest('[data-ad-click]'); if (!a) return;
  e.preventDefault();
  db.update('ads', a.dataset.adClick, x => ({ clicks: (x.clicks || 0) + 1 }));
  toast('Abriendo sitio del anunciante (simulado)', 'info');
});

// Cambios desde la redacción (otra pestaña) → refresco inmediato.
db.subscribe(ch => {
  if (ch.type !== 'sync' && ch.type !== 'reset') return;
  const typing = document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName);
  if (document.querySelector('.modal-backdrop') || typing) return;
  const y = window.scrollY;
  renderHeader(header); renderFooter(footer); router.refresh();
  requestAnimationFrame(() => window.scrollTo(0, y));
});
setInterval(() => { const before = db.count('articles', a => a.status === 'scheduled'); promoteScheduled(); if (db.count('articles', a => a.status === 'scheduled') !== before) refresh(); }, 30000);
