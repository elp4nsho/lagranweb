// Arranque común de las apps por rol (cliente y freelancer) sobre el shell del panel.
import { db, auth, guardPage, logout } from '../data/db.js';
import { createRouter } from '../../../assets/core/router.js';
import { wireAdminShell } from '../../../assets/core/ui.js';
import { mountShell, liveRender, empty } from './kit.js';
import { settings } from './market.js';

// pages: [{ path, label, ico, render(view, ctx, params, query), count?(ctx), hidden? }]
export function bootRoleApp({ roles, sub, pages, extraRoutes = {}, before }) {
  const me = guardPage(roles);
  if (!me) return;
  const st = settings();
  const ctx = { db, auth, me, state: {} };
  before && before(ctx);
  const shell = mountShell({
    brand: st.name, sub: sub || 'Marketplace', logo: 'G', user: me, roleName: auth.roleName(me.role), onLogout: logout,
    nav: [{ items: pages.filter(p => !p.hidden).map(p => ({ href: '#' + p.path, label: p.label, ico: p.ico, count: p.count ? () => p.count(ctx) : null })) }]
  });
  ctx.shell = shell;
  wireAdminShell();
  const routes = {};
  const wrap = (label, fn) => (params, query) => { shell.setTitle(label); return fn(shell.view, ctx, params, query); };
  pages.forEach(p => { routes[p.path] = wrap(p.label, p.render); });
  Object.entries(extraRoutes).forEach(([path, { label, render }]) => { routes[path] = wrap(label, render); });
  let last = null;
  const router = createRouter(routes, {
    notFound: () => { shell.view.innerHTML = empty('Página no encontrada'); },
    after: cur => { shell.renderNav(); router.highlight(document.querySelector('.shell-nav')); if (cur.path !== last) { window.scrollTo(0, 0); last = cur.path; } }
  });
  ctx.router = router;
  ctx.refresh = () => router.refresh();
  router.start();
  liveRender(db, () => {
    const u = auth.current();
    if (!u || u.active === false || !roles.includes(u.role)) { location.replace('login.html'); return; }
    ctx.me = u;
    router.refresh();
  });
  return ctx;
}
