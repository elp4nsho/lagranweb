// App de suscriptor: router (inicio, series, películas, búsqueda, mi lista, detalle) y refresco en vivo.
import { db, auth } from '../data/db.js';
import { createRouter } from '../../../assets/core/router.js';
import { $ } from '../../../assets/core/ui.js';
import { requireViewer, renderHeader } from '../shared/header.js';
import { currentProfile } from '../shared/catalog.js';
import { renderHome } from './home.js';
import { renderBrowse, renderSearch, renderList } from './browse.js';
import { openTitle } from './title-modal.js';

const ctx = await requireViewer();
const main = $('#main');
let handle = null, active = 'inicio', lastBase = '';

function mount(fn, key) {
  return (params, query) => {
    const base = key;
    active = key;
    renderHeader($('#header'), { ...ctx, active });
    // Si solo se abre/cierra el modal de detalle no se vuelve a pintar la página.
    if (base !== lastBase || !handle) { handle?.destroy?.(); const fresh = mainRef.el.cloneNode(false); mainRef.el.replaceWith(fresh); mainRef.el = fresh; handle = fn(fresh, ctx, query) || null; lastBase = base; window.scrollTo(0, 0); }
  };
}
const mainRef = { el: main };
const router = createRouter({
  '/': mount(renderHome, 'inicio'),
  '/series': mount((el, c, q) => renderBrowse(el, c, 'serie', q), 'series'),
  '/peliculas': mount((el, c, q) => renderBrowse(el, c, 'pelicula', q), 'peliculas'),
  '/buscar': mount(renderSearch, 'buscar'),
  '/mi-lista': mount(renderList, 'lista'),
  '/titulo/:id': ({ id }) => {
    if (!lastBase) mount(renderHome, 'inicio')();
    const t = db.get('titles', id);
    if (t) openTitle(t, ctx, { onClose: () => { if (location.hash.startsWith('#/titulo/')) history.back(); } });
  }
}, { notFound: () => router.go('/') });

let t;
db.subscribe(() => {
  clearTimeout(t);
  t = setTimeout(() => {
    const u = auth.current();
    if (!u) { location.href = 'login.html'; return; }
    ctx.user = u; ctx.profile = currentProfile(u) || ctx.profile;
    if (!ctx.profile) { location.href = 'perfiles.html'; return; }
    renderHeader($('#header'), { ...ctx, active });
    if (handle?.update) handle.update(ctx);
  }, 80);
});
router.start();
