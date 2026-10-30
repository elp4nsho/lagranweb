// Panel de administración: shell, menú por rol, rutas protegidas y refresco en vivo.
import { db, auth, ADMIN_ROLES } from '../data/db.js';
import { createRouter } from '../../../assets/core/router.js';
import { wireAdminShell, escape, toast } from '../../../assets/core/ui.js';
import { buildIndex, getCompanyId, setCompanyId } from '../shared/util.js';
import { LOGO, userMenu } from '../shared/topnav.js';
import { today } from '../shared/dates.js';
import * as dashboard from './dashboard.js';
import * as empresas from './empresas.js';
import * as areas from './areas.js';
import * as empleados from './empleados.js';
import * as pisos from './pisos.js';
import * as editor from './editor.js';
import * as asignacion from './asignacion.js';
import * as reglas from './reglas.js';
import * as salas from './salas.js';
import * as visitas from './visitas.js';
import * as anuncios from './anuncios.js';
import * as usuarios from './usuarios.js';
import * as ajustes from './ajustes.js';
import * as bitacora from './bitacora.js';

let user;
try { user = auth.require(ADMIN_ROLES); } catch (e) { throw e; }

const ALL = ['admin', 'rrhh', 'recepcion'];
export const SECTIONS = [
  { id: 'dashboard', path: '/', label: 'Dashboard', ico: '📊', roles: ALL, group: 'General', mod: dashboard },
  { id: 'empresas', path: '/empresas', label: 'Empresas', ico: '🏢', roles: ['admin'], group: 'Organización', mod: empresas },
  { id: 'areas', path: '/areas', label: 'Áreas y equipos', ico: '🧩', roles: ['admin', 'rrhh'], mod: areas },
  { id: 'empleados', path: '/empleados', label: 'Personas', ico: '👥', roles: ['admin', 'rrhh'], mod: empleados, count: c => c.idx.people.length },
  { id: 'pisos', path: '/pisos', label: 'Pisos y planos', ico: '🗺️', roles: ['admin'], group: 'Espacios', mod: pisos },
  { id: 'asignacion', path: '/asignacion', label: 'Puestos y reservas', ico: '🪑', roles: ['admin', 'rrhh'], mod: asignacion },
  { id: 'reglas', path: '/reglas', label: 'Reglas y barrios', ico: '📐', roles: ['admin'], mod: reglas },
  { id: 'salas', path: '/salas', label: 'Salas de reuniones', ico: '📅', roles: ALL, mod: salas },
  { id: 'visitas', path: '/visitas', label: 'Visitas', ico: '🛎️', roles: ALL, group: 'Recepción', mod: visitas, count: c => db.count('visitors', v => v.companyId === c.coId && v.date === today() && v.status !== 'salió') },
  { id: 'anuncios', path: '/anuncios', label: 'Anuncios', ico: '📣', roles: ALL, mod: anuncios },
  { id: 'usuarios', path: '/usuarios', label: 'Usuarios y roles', ico: '🔐', roles: ['admin'], group: 'Sistema', mod: usuarios },
  { id: 'ajustes', path: '/ajustes', label: 'Ajustes del sitio', ico: '⚙️', roles: ['admin'], mod: ajustes },
  { id: 'bitacora', path: '/bitacora', label: 'Bitácora', ico: '🧾', roles: ['admin', 'rrhh'], mod: bitacora }
];

const content = document.getElementById('content');
const ctx = {
  db, auth,
  get user() { return auth.current(); },
  coId: getCompanyId(db),
  idx: null,
  can: id => SECTIONS.find(s => s.id === id)?.roles.includes(auth.current()?.role),
  go: p => router.go(p),
  setCompany(id) { ctx.coId = id; setCompanyId(id); ctx.idx = buildIndex(db, id); drawTop(); drawSidebar(); },
  refresh: () => { ctx.idx = buildIndex(db, ctx.coId); router.refresh(); }
};
ctx.idx = buildIndex(db, ctx.coId);
let active = null;

function drawSidebar() {
  const u = auth.current();
  let html = `<div class="admin-brand"><span class="logo">${LOGO}</span><span>¿Quién es quién?</span></div>`;
  let group = '';
  SECTIONS.filter(s => s.roles.includes(u.role)).forEach(s => {
    if (s.group && s.group !== group) { group = s.group; html += `<div class="nav-section">${escape(group)}</div>`; }
    const n = s.count ? s.count(ctx) : 0;
    html += `<a class="nav-link" href="#${s.path}"><span class="ico" aria-hidden="true">${s.ico}</span>${escape(s.label)}${n ? `<span class="count">${n}</span>` : ''}</a>`;
  });
  html += `<div class="nav-section">Apps</div>
    <a class="nav-link" href="index.html"><span class="ico">🌐</span>Directorio público</a>
    ${['admin', 'recepcion'].includes(u.role) ? '<a class="nav-link" href="recepcion.html"><span class="ico">🖥️</span>Recepción / kiosko</a>' : ''}
    ${u.personId ? '<a class="nav-link" href="empleado.html"><span class="ico">🙋</span>Mi espacio</a>' : ''}`;
  document.getElementById('sidebar').innerHTML = html;
  router.highlight(document.getElementById('sidebar'));
}
function drawTop() {
  const sel = document.getElementById('coSel');
  sel.innerHTML = db.all('companies').map(c => `<option value="${c.id}" ${c.id === ctx.coId ? 'selected' : ''}>${escape(c.name)}${c.active === false ? ' (inactiva)' : ''}</option>`).join('');
  document.getElementById('userBox').innerHTML = userMenu(auth, auth.current());
}
document.getElementById('coSel').addEventListener('change', e => { ctx.coId = e.target.value; setCompanyId(ctx.coId); ctx.idx = buildIndex(db, ctx.coId); drawSidebar(); router.refresh(); toast(`Empresa: ${ctx.idx.company.name}`, 'info'); });
document.getElementById('userBox').addEventListener('click', e => { if (e.target.closest('[data-logout]')) { auth.logout(); location.href = 'login.html'; } });
document.addEventListener('click', e => { document.querySelectorAll('details.menu[open]').forEach(d => { if (!d.contains(e.target)) d.removeAttribute('open'); }); });

function show(sec, params = {}, query = {}, mod = sec.mod) {
  const u = auth.current();
  if (!u || !ADMIN_ROLES.includes(u.role)) { location.replace('login.html?next=admin.html'); return; }
  document.getElementById('pageTitle').textContent = sec.label;
  document.title = `${sec.label} · Administración`;
  if (!sec.roles.includes(u.role)) {
    active = null;
    content.innerHTML = `<div class="card no-access"><div style="font-size:48px">🔒</div><h1 style="font-size:26px">Sin acceso</h1><p class="muted">Tu rol (${escape(auth.roleName(u.role))}) no tiene permiso para «${escape(sec.label)}».</p><a class="btn btn-primary" href="#/">Volver al dashboard</a></div>`;
    toast('No tienes permiso para esa sección', 'error');
    drawSidebar();
    return;
  }
  active = { sec, params, query, mod };
  try { mod.render(content, ctx, params, query); }
  catch (err) { console.error(err); content.innerHTML = `<div class="card"><h2>Ocurrió un error</h2><p class="muted">${escape(err.message)}</p></div>`; }
  drawSidebar();
  window.scrollTo(0, 0);
}

const routes = {};
SECTIONS.forEach(s => { routes[s.path] = (p, q) => show(s, p, q); });
routes['/empleados/:id'] = (p, q) => show(SECTIONS.find(s => s.id === 'empleados'), p, q, { render: empleados.renderDetail });
routes['/pisos/:id'] = (p, q) => show(SECTIONS.find(s => s.id === 'pisos'), p, q, editor);
const router = createRouter(routes, { notFound: () => router.go('/') });

let t;
db.subscribe(ch => {
  clearTimeout(t);
  t = setTimeout(() => {
    if (!auth.current() || auth.current().active === false) { location.replace('login.html'); return; }
    if (!db.get('companies', ctx.coId)) { ctx.coId = getCompanyId(db); }
    ctx.idx = buildIndex(db, ctx.coId);
    drawTop(); drawSidebar();
    if (!active || active.mod.live === false) return;
    if (document.querySelector('.modal-backdrop')) return;
    const ae = document.activeElement;
    if (ch?.type === 'sync' && ae && /INPUT|TEXTAREA|SELECT/.test(ae.tagName)) return;
    active.mod.render(content, ctx, active.params, active.query);
  }, 60);
});

wireAdminShell();
drawTop();
router.start();
