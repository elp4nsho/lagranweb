// Panel de administración de Gremio: shell, matriz de permisos por rol y router de secciones.
import { db, auth, guardPage, logout } from '../data/db.js';
import { createRouter } from '../../../assets/core/router.js';
import { wireAdminShell } from '../../../assets/core/ui.js';
import { mountShell, denied, liveRender } from '../shared/kit.js';
import { settings } from '../shared/market.js';

import * as dashboard from './dashboard.js';
import * as members from './members.js';
import * as moderation from './moderation.js';
import * as orders from './orders.js';
import * as disputes from './disputes.js';
import * as categories from './categories.js';
import * as featured from './featured.js';
import * as fees from './fees.js';
import * as payouts from './payouts.js';
import * as team from './team.js';
import * as activity from './activity.js';

const STAFF = ['admin', 'moderador', 'soporte'];
export const SECTIONS = [
  { key: 'dashboard', path: '/', label: 'Resumen', ico: '◧', roles: STAFF, mod: dashboard, group: 'General' },
  { key: 'usuarios', path: '/usuarios', label: 'Clientes y freelancers', ico: '👥', roles: ['admin', 'moderador', 'soporte'], mod: members, group: 'Comunidad', count: () => db.count('users', u => u.role === 'freelancer' && !u.verified && u.active !== false) },
  { key: 'moderacion', path: '/moderacion', label: 'Moderación de servicios', ico: '✓', roles: ['admin', 'moderador'], mod: moderation, group: 'Comunidad', count: () => db.count('gigs', g => g.status === 'pendiente') },
  { key: 'pedidos', path: '/pedidos', label: 'Pedidos', ico: '📦', roles: ['admin', 'soporte'], mod: orders, group: 'Operación' },
  { key: 'disputas', path: '/disputas', label: 'Disputas', ico: '⚖', roles: ['admin', 'soporte'], mod: disputes, group: 'Operación', count: () => db.count('disputes', d => d.status !== 'resuelta') },
  { key: 'retiros', path: '/retiros', label: 'Pagos a freelancers', ico: '$', roles: ['admin'], mod: payouts, group: 'Operación', count: () => db.count('withdrawals', w => w.status === 'solicitado') },
  { key: 'categorias', path: '/categorias', label: 'Categorías', ico: '▦', roles: ['admin', 'moderador'], mod: categories, group: 'Contenido' },
  { key: 'destacados', path: '/destacados', label: 'Portada y destacados', ico: '★', roles: ['admin', 'moderador'], mod: featured, group: 'Contenido' },
  { key: 'comisiones', path: '/comisiones', label: 'Comisiones y ajustes', ico: '⚙', roles: ['admin'], mod: fees, group: 'Sistema' },
  { key: 'equipo', path: '/equipo', label: 'Usuarios y roles', ico: '🔑', roles: ['admin'], mod: team, group: 'Sistema' },
  { key: 'bitacora', path: '/bitacora', label: 'Bitácora', ico: '☰', roles: ['admin'], mod: activity, group: 'Sistema' }
];

const me = guardPage(STAFF);
if (me) start();

function start() {
  const st = settings();
  const can = key => { const u = auth.current(); const s = SECTIONS.find(x => x.key === key); return !!u && !!s && s.roles.includes(u.role); };
  const visible = SECTIONS.filter(s => s.roles.includes(me.role));
  const groups = [...new Set(visible.map(s => s.group))];
  const shell = mountShell({
    brand: st.name, sub: 'Panel de administración', logo: 'G',
    nav: groups.map(g => ({ section: g, items: visible.filter(s => s.group === g).map(s => ({ href: '#' + s.path, label: s.label, ico: s.ico, count: s.count })) })),
    user: me, roleName: `${auth.roleName(me.role)} · ${me.title || ''}`, onLogout: logout, siteLabel: 'Ver marketplace',
    footExtra: me.role === 'admin' ? '<button class="btn btn-sm btn-ghost btn-block" data-reset>↺ Restablecer datos demo</button>' : ''
  });
  wireAdminShell();
  document.querySelector('[data-reset]')?.addEventListener('click', () => fees.resetDemo());
  const ctx = { db, auth, me, can, isAdmin: me.role === 'admin', refresh: () => router.refresh(), go: p => router.go(p) };
  const routes = {};
  SECTIONS.forEach(s => {
    routes[s.path] = (params, query) => { shell.setTitle(s.label); if (!can(s.key)) { shell.view.innerHTML = denied(`La sección "${s.label}" no está disponible para el rol ${auth.roleName(me.role)}.`); return; } return s.mod.render(shell.view, { ...ctx, params, query }); };
    if (s.mod.detail) routes[s.path + '/:id'] = (params, query) => { shell.setTitle(s.label); if (!can(s.key)) { shell.view.innerHTML = denied(); return; } return s.mod.detail(shell.view, { ...ctx, params, query }, params.id); };
  });
  let last = null;
  const router = createRouter(routes, {
    notFound: () => { shell.view.innerHTML = denied('La página no existe.'); },
    after: cur => { shell.renderNav(); router.highlight(document.querySelector('.shell-nav')); if (cur.path !== last) { window.scrollTo(0, 0); last = cur.path; } }
  });
  router.start();
  liveRender(db, () => {
    const u = auth.current();
    if (!u || u.active === false || !STAFF.includes(u.role)) { location.replace('login.html'); return; }
    router.refresh();
  });
}
