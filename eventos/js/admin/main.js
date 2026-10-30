// Panel de administración: shell, navegación por rol, guardas de ruta y refresco en vivo.
import { db, auth } from '../data/db.js';
import { createRouter } from '../../../assets/core/router.js';
import { $, wireAdminShell, escape, toast, confirm, ago } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { LOGO } from '../shared/format.js';
import { denied } from '../shared/admin-kit.js';
import * as dashboard from './dashboard.js';
import * as events from './events.js';
import * as venues from './venues.js';
import * as organizers from './organizers.js';
import * as orders from './orders.js';
import * as promos from './promos.js';
import * as fees from './fees.js';
import * as content from './content.js';
import * as users from './users.js';
import * as activity from './activity.js';

let user;
// Sin sesión o sin rol: redirige al login y detiene el módulo sin lanzar errores.
try { user = auth.require(['admin', 'soporte'], 'login.html'); } catch (e) { await new Promise(() => {}); }

// Permisos por sección. "soporte" ve pedidos y eventos (solo lectura), no configura nada.
const SECTIONS = [
  { group: 'General' },
  { path: '/', label: 'Dashboard', ico: '📊', roles: ['admin', 'soporte'], mod: dashboard },
  { group: 'Operación' },
  { path: '/eventos', label: 'Eventos', ico: '🎫', roles: ['admin', 'soporte'], mod: events, count: () => db.count('events', e => e.status === 'pendiente') },
  { path: '/pedidos', label: 'Pedidos y reembolsos', ico: '🧾', roles: ['admin', 'soporte'], mod: orders, count: () => db.count('orders', o => o.status === 'reembolso_solicitado') },
  { path: '/recintos', label: 'Recintos', ico: '🏟️', roles: ['admin'], mod: venues },
  { path: '/productoras', label: 'Productoras', ico: '🎛️', roles: ['admin'], mod: organizers, count: () => db.count('organizers', o => o.status === 'pendiente') },
  { path: '/promos', label: 'Códigos promo', ico: '🏷️', roles: ['admin'], mod: promos },
  { group: 'Configuración' },
  { path: '/tarifas', label: 'Tarifas y cargos', ico: '💲', roles: ['admin'], mod: fees },
  { path: '/contenido', label: 'Contenido del sitio', ico: '📝', roles: ['admin'], mod: content },
  { path: '/usuarios', label: 'Usuarios y roles', ico: '👥', roles: ['admin'], mod: users },
  { path: '/actividad', label: 'Actividad', ico: '🕑', roles: ['admin', 'soporte'], mod: activity }
];
const can = path => { const s = SECTIONS.find(x => x.path === path); return !s || s.roles.includes(user.role); };
let view = $('#view');
let handle = null;

function sidebar() {
  $('#sidebar').innerHTML = `<div class="admin-brand"><span class="logo">${LOGO}</span><span>Volcán Admin</span></div>` +
    SECTIONS.filter(s => s.group || s.roles.includes(user.role)).map(s => {
      if (s.group) return `<div class="nav-section">${s.group}</div>`;
      const c = s.count?.();
      return `<a class="nav-link" href="#${s.path}"><span class="ico">${s.ico}</span>${s.label}${c ? `<span class="count">${c}</span>` : ''}</a>`;
    }).join('') +
    `<div style="margin-top:auto;padding-top:16px" class="stack"><a class="nav-link" href="index.html" target="_blank"><span class="ico">🌐</span>Ver sitio público</a>
     <a class="nav-link" href="productor.html"><span class="ico">🎛️</span>Portal productor</a><a class="nav-link" href="acceso.html"><span class="ico">📲</span>App de acceso</a>
     ${user.role === 'admin' ? '<button class="btn btn-sm btn-danger" id="reset">Restablecer datos demo</button>' : ''}</div>`;
  router.highlight($('#sidebar'));
  $('#reset')?.addEventListener('click', async () => {
    if (!await confirm('Se borrarán todos los cambios y se restaurarán los datos de ejemplo. ¿Continuar?', { title: 'Restablecer datos demo', ok: 'Restablecer', danger: true })) return;
    db.reset(); toast('Datos demo restablecidos', 'success'); setTimeout(() => location.reload(), 400);
  });
}
function topbar() {
  const notes = db.query('notifications', n => n.userId === user.id && !n.read);
  $('#topuser').innerHTML = `<div class="rel"><button class="btn btn-ghost btn-icon icon-btn" id="bell" aria-label="Notificaciones">🔔${notes.length ? `<span class="dot">${notes.length}</span>` : ''}</button>
    <div class="menu-pop" id="bellPop" hidden>${notes.length ? notes.map(n => `<div class="notif unread">${escape(n.text)}<br><small class="muted">${ago(n.createdAt)}</small></div>`).join('') + '<button class="item" id="readAll">Marcar todas como leídas</button>' : '<div class="empty">Sin notificaciones nuevas</div>'}</div></div>
    <span class="user-chip"><span class="avatar" style="--av:${user.color}">${initials(user.name)}</span><span class="hide-sm"><b>${escape(user.name)}</b><br><small class="muted">${auth.roleName(user.role)}</small></span></span>
    <button class="btn btn-sm btn-ghost" id="logout">Salir</button>`;
  $('#bell').onclick = e => { e.stopPropagation(); $('#bellPop').hidden = !$('#bellPop').hidden; };
  $('#readAll')?.addEventListener('click', () => notes.forEach(n => db.update('notifications', n.id, { read: true })));
  $('#logout').onclick = () => { auth.logout(); location.href = 'login.html'; };
}
document.addEventListener('click', e => { if (!e.target.closest('.menu-pop')) document.querySelectorAll('.menu-pop').forEach(x => (x.hidden = true)); });

const ctx = { user, isAdmin: user.role === 'admin', go: p => router.go(p) };
function mount(path, mod, fnName, params, query) {
  // Nodo nuevo en cada montaje: así los listeners de la sección anterior desaparecen.
  const fresh = view.cloneNode(false); view.replaceWith(fresh); view = fresh;
  const base = '/' + (path.split('/')[1] || '');
  if (!can(base)) { view.innerHTML = denied(`Tu rol (${auth.roleName(user.role)}) no puede acceder a esta sección.`); return; }
  const h = mod[fnName](view, { ...ctx, params, query });
  handle = h && typeof h === 'object' ? h : null;
}
const router = createRouter({
  '/': (p, q) => mount('/', dashboard, 'render', p, q),
  '/eventos': (p, q) => mount('/eventos', events, 'render', p, q),
  '/eventos/:id': (p, q) => mount('/eventos', events, 'detail', p, q),
  '/eventos/:id/editar': (p, q) => mount('/eventos', events, 'edit', p, q),
  '/pedidos': (p, q) => mount('/pedidos', orders, 'render', p, q),
  '/recintos': (p, q) => mount('/recintos', venues, 'render', p, q),
  '/recintos/:id': (p, q) => mount('/recintos', venues, 'editor', p, q),
  '/productoras': (p, q) => mount('/productoras', organizers, 'render', p, q),
  '/promos': (p, q) => mount('/promos', promos, 'render', p, q),
  '/tarifas': (p, q) => mount('/tarifas', fees, 'render', p, q),
  '/contenido': (p, q) => mount('/contenido', content, 'render', p, q),
  '/usuarios': (p, q) => mount('/usuarios', users, 'render', p, q),
  '/actividad': (p, q) => mount('/actividad', activity, 'render', p, q)
}, {
  notFound: () => { view.innerHTML = denied('La sección no existe.'); },
  before: () => { handle?.destroy?.(); handle = null; },
  after: () => { sidebar(); topbar(); view.focus({ preventScroll: true }); }
});

$('#gsearch').addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !e.target.value.trim()) return;
  const q = e.target.value.trim();
  const ev = db.find('events', x => x.title.toLowerCase().includes(q.toLowerCase()));
  if (/^VLC-\w{4}-\w{4}$/i.test(q) || /^VLC-\d+$/i.test(q) || !ev) router.go('/pedidos?q=' + encodeURIComponent(q));
  else router.go('/eventos/' + ev.id);
});

let t;
db.subscribe(() => {
  clearTimeout(t);
  t = setTimeout(() => {
    const fresh = db.get('users', user.id);
    if (!fresh || fresh.active === false || !['admin', 'soporte'].includes(fresh.role)) { auth.logout(); location.href = 'login.html'; return; }
    Object.assign(user, fresh);
    sidebar(); topbar();
    if (handle?.update) handle.update(); else if (!handle?.static) router.refresh();
  }, 80);
});
wireAdminShell();
router.start();
