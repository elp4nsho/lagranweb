// Sitio público: router por hash con inicio, seguimiento y solicitud de envío.
import { db } from '../data/db.js';
import { createRouter } from '../../../assets/core/router.js';
import { debounce } from '../../../assets/core/ui.js';
import { startEngine } from '../shared/engine.js';
import { renderHeader, renderFooter } from './site.js';
import { mountHome } from './home.js';
import { mountTrack, mountTrackSearch } from './track.js';
import { mountRequest } from './request.js';

const view = document.getElementById('view');
const head = document.getElementById('site-head');
let current = null, active = '';

function show(mount, act, ...args) {
  current?.destroy?.();
  view.innerHTML = '';
  active = act;
  renderHeader(head, { active });
  current = mount(view, ...args) || {};
}
const home = section => () => {
  if (!current || current.kind !== 'home') { show(mountHome, '#/' + (section || '')); current.kind = 'home'; }
  else { active = '#/' + (section || ''); renderHeader(head, { active }); }
  requestAnimationFrame(() => {
    const el = section && document.getElementById(section);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); else if (!section) window.scrollTo({ top: 0 });
  });
};
const router = createRouter({
  '/': home(''),
  '/tarifas': home('tarifas'),
  '/cobertura': home('cobertura'),
  '/empresas': home('empresas'),
  '/rastrear': () => { show(mountTrackSearch, '#/rastrear'); window.scrollTo(0, 0); },
  '/rastrear/:code': ({ code }) => { show(mountTrack, '#/rastrear', code); window.scrollTo(0, 0); },
  '/solicitar': (_, q) => { show(mountRequest, '#/solicitar', q); window.scrollTo(0, 0); }
}, { notFound: () => router.go('/') });

renderFooter(document.getElementById('site-foot'));
router.start();
startEngine();
let chrome = false;
const refresh = debounce(() => {
  if (chrome) { chrome = false; renderHeader(head, { active }); renderFooter(document.getElementById('site-foot')); }
  current?.refresh?.();
}, 150);
db.subscribe(change => {
  if (change.type === 'sync' || change.type === 'reset' || (change.type === 'value' && change.key === 'settings')) chrome = true;
  refresh();
});
setInterval(() => current?.tick?.(), 1000);
