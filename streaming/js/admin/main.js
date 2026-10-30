// CMS de Andes+: shell, navegación filtrada por rol, guardas de ruta y refresco en vivo.
import { db, auth, STAFF } from '../data/db.js';
import { createRouter } from '../../../assets/core/router.js';
import { $, wireAdminShell, escape, toast, confirm } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { denied } from '../shared/admin-kit.js';
import * as dashboard from './dashboard.js';
import * as catalog from './catalog.js';
import * as collections from './collections.js';
import * as billboard from './billboard.js';
import * as licenses from './licenses.js';
import * as subscribers from './subscribers.js';
import * as plans from './plans.js';
import * as support from './support.js';
import * as content from './content.js';
import * as users from './users.js';
import * as activity from './activity.js';

let user;
try { user = auth.require(STAFF, 'login.html'); } catch (e) { await new Promise(() => {}); }

// Permisos: editor = contenido; soporte = suscriptores y tickets; admin = todo.
export const SECTIONS = [
  { group: 'General' },
  { path: '/', label: 'Dashboard', ico: '📊', roles: ['admin', 'editor', 'soporte'], mod: dashboard },
  { group: 'Contenido' },
  { path: '/catalogo', label: 'Catálogo', ico: '🎬', roles: ['admin', 'editor'], mod: catalog },
  { path: '/colecciones', label: 'Filas de la portada', ico: '🧱', roles: ['admin', 'editor'], mod: collections },
  { path: '/destacado', label: 'Billboard destacado', ico: '⭐', roles: ['admin', 'editor'], mod: billboard },
  { path: '/licencias', label: 'Licencias', ico: '📅', roles: ['admin', 'editor'], mod: licenses, count: () => db.count('titles', t => t.availableTo && Date.parse(t.availableTo) > Date.now() && Date.parse(t.availableTo) - Date.now() < 15 * 864e5) },
  { path: '/landing', label: 'Landing y textos', ico: '📝', roles: ['admin', 'editor'], mod: content },
  { group: 'Clientes' },
  { path: '/suscriptores', label: 'Suscriptores', ico: '👥', roles: ['admin', 'soporte'], mod: subscribers },
  { path: '/soporte', label: 'Tickets de soporte', ico: '🎧', roles: ['admin', 'soporte'], mod: support, count: () => db.count('tickets', t => t.status === 'abierto') },
  { path: '/planes', label: 'Planes', ico: '💳', roles: ['admin'], mod: plans },
  { group: 'Sistema' },
  { path: '/usuarios', label: 'Usuarios y roles', ico: '🔐', roles: ['admin'], mod: users },
  { path: '/actividad', label: 'Actividad', ico: '🕑', roles: ['admin', 'editor', 'soporte'], mod: activity }
];
const can = base => { const s = SECTIONS.find(x => x.path === base); return !s || s.roles.includes(user.role); };
let view = $('#view'), handle = null;

function chrome() {
  $('#sidebar').innerHTML = `<div class="admin-brand"><span class="logo">A+</span><span>Andes+ CMS</span></div>` +
    SECTIONS.filter(s => s.group ? SECTIONS.some(x => x.roles && x.roles.includes(user.role) && SECTIONS.indexOf(x) > SECTIONS.indexOf(s) && SECTIONS.slice(SECTIONS.indexOf(s) + 1, SECTIONS.indexOf(x)).every(y => !y.group)) : s.roles.includes(user.role))
      .map(s => s.group ? `<div class="nav-section">${s.group}</div>` : `<a class="nav-link" href="#${s.path}"><span class="ico">${s.ico}</span>${s.label}${s.count?.() ? `<span class="count">${s.count()}</span>` : ''}</a>`).join('') +
    `<div style="margin-top:auto;padding-top:16px" class="stack"><a class="nav-link" href="index.html" target="_blank"><span class="ico">🌐</span>Ver landing</a><a class="nav-link" href="app.html" target="_blank"><span class="ico">▶️</span>Vista previa de la app</a>
     ${user.role === 'admin' ? '<button class="btn btn-sm btn-danger" id="reset">Restablecer datos demo</button>' : ''}</div>`;
  router.highlight($('#sidebar'));
  $('#reset')?.addEventListener('click', async () => {
    if (!await confirm('Se borrarán todos los cambios y se restaurará el catálogo de ejemplo. ¿Continuar?', { title: 'Restablecer datos demo', ok: 'Restablecer', danger: true })) return;
    db.reset(); toast('Datos demo restablecidos', 'success'); setTimeout(() => location.reload(), 400);
  });
  $('#topuser').innerHTML = `<span class="user-chip"><span class="avatar" style="--av:${user.color}">${initials(user.name)}</span><span class="hide-sm"><b>${escape(user.name)}</b><br><small class="muted">${auth.roleName(user.role)}</small></span></span><button class="btn btn-sm btn-ghost" id="logout">Salir</button>`;
  $('#logout').onclick = () => { auth.logout(); location.href = 'login.html'; };
}
const ctx = { user, isAdmin: user.role === 'admin' };
function mount(base, mod, fn, params, query) {
  const fresh = view.cloneNode(false); view.replaceWith(fresh); view = fresh;
  if (!can(base)) { view.innerHTML = denied(`Tu rol (${auth.roleName(user.role)}) no tiene acceso a esta sección.`); return; }
  const h = mod[fn](view, { ...ctx, params, query, go: p => router.go(p) });
  handle = h && typeof h === 'object' ? h : null;
}
const R = (base, mod, fn = 'render') => (p, q) => mount(base, mod, fn, p, q);
const router = createRouter({
  '/': R('/', dashboard),
  '/catalogo': R('/catalogo', catalog),
  '/catalogo/:id': R('/catalogo', catalog, 'editor'),
  '/colecciones': R('/colecciones', collections),
  '/destacado': R('/destacado', billboard),
  '/licencias': R('/licencias', licenses),
  '/landing': R('/landing', content),
  '/suscriptores': R('/suscriptores', subscribers),
  '/soporte': R('/soporte', support),
  '/planes': R('/planes', plans),
  '/usuarios': R('/usuarios', users),
  '/actividad': R('/actividad', activity)
}, {
  notFound: () => { view.innerHTML = denied('La sección no existe.'); },
  before: () => { handle?.destroy?.(); handle = null; },
  after: () => chrome()
});
$('#gsearch').addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const q = e.target.value.trim().toLowerCase(); if (!q) return;
  const t = db.find('titles', x => x.title.toLowerCase().includes(q));
  if (t && can('/catalogo')) router.go('/catalogo/' + t.id);
  else if (can('/suscriptores')) router.go('/suscriptores?q=' + encodeURIComponent(q));
  else toast('Sin resultados', 'warning');
});
let t;
db.subscribe(() => {
  clearTimeout(t);
  t = setTimeout(() => {
    const fresh = db.get('users', user.id);
    if (!fresh || fresh.active === false || !STAFF.includes(fresh.role)) { auth.logout(); location.href = 'login.html'; return; }
    if (fresh.role !== user.role) { location.reload(); return; }
    chrome();
    if (handle?.update) handle.update(); else if (!handle?.static) router.refresh();
  }, 80);
});
wireAdminShell();
router.start();
