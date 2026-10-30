// Panel de RRHH: shell, menú por rol, rutas protegidas y refresco en vivo.
import { db, auth } from '../data/db.js';
import { createRouter } from '../../../assets/core/router.js';
import { wireAdminShell, escape, toast } from '../../../assets/core/ui.js';
import { LOGO, userMenu } from '../shared/topnav.js';
import * as dashboard from './dashboard.js';
import * as colaboradores from './colaboradores.js';
import * as organizacion from './organizacion.js';
import * as remuneraciones from './remuneraciones.js';
import * as solicitudes from './solicitudes.js';
import * as politicas from './politicas.js';
import * as vacantes from './vacantes.js';
import * as candidatos from './candidatos.js';
import * as onboarding from './onboarding.js';
import * as desempeno from './desempeno.js';
import * as encuestas from './encuestas.js';
import * as anuncios from './anuncios.js';
import * as usuarios from './usuarios.js';
import * as ajustes from './ajustes.js';
import * as bitacora from './bitacora.js';

const STAFF = ['admin', 'reclutador'];
auth.require(STAFF);
const A = ['admin'], AR = ['admin', 'reclutador'];
const SECTIONS = [
  { id: 'dashboard', path: '/', label: 'Dashboard', ico: '📊', roles: AR, group: 'General', mod: dashboard },
  { id: 'colaboradores', path: '/colaboradores', label: 'Colaboradores', ico: '👥', roles: A, group: 'Personas', mod: colaboradores, count: () => db.count('employees', e => e.status !== 'desvinculado') },
  { id: 'organizacion', path: '/organizacion', label: 'Estructura', ico: '🏛️', roles: A, mod: organizacion },
  { id: 'solicitudes', path: '/solicitudes', label: 'Vacaciones y permisos', ico: '🏖️', roles: A, mod: solicitudes, count: () => db.count('requests', r => r.status === 'pendiente') },
  { id: 'politicas', path: '/politicas', label: 'Políticas', ico: '📐', roles: A, mod: politicas },
  { id: 'remuneraciones', path: '/remuneraciones', label: 'Remuneraciones', ico: '💵', roles: A, mod: remuneraciones },
  { id: 'vacantes', path: '/vacantes', label: 'Vacantes', ico: '📢', roles: AR, group: 'Talento', mod: vacantes },
  { id: 'candidatos', path: '/candidatos', label: 'Candidatos (ATS)', ico: '🧲', roles: AR, mod: candidatos, count: () => db.count('applications', a => a.stage === 'postulado') },
  { id: 'onboarding', path: '/onboarding', label: 'Onboarding', ico: '🚀', roles: AR, mod: onboarding },
  { id: 'desempeno', path: '/desempeno', label: 'Desempeño', ico: '🎯', roles: A, mod: desempeno },
  { id: 'encuestas', path: '/encuestas', label: 'Encuestas eNPS', ico: '📈', roles: A, mod: encuestas },
  { id: 'anuncios', path: '/anuncios', label: 'Comunicados', ico: '📣', roles: A, group: 'Comunicación', mod: anuncios },
  { id: 'usuarios', path: '/usuarios', label: 'Usuarios y roles', ico: '🔐', roles: A, group: 'Sistema', mod: usuarios },
  { id: 'ajustes', path: '/ajustes', label: 'Sitio de empleos', ico: '⚙️', roles: A, mod: ajustes },
  { id: 'bitacora', path: '/bitacora', label: 'Bitácora', ico: '🧾', roles: A, mod: bitacora }
];
const content = document.getElementById('content');
const ctx = {
  db, auth,
  get user() { return auth.current(); },
  can: id => SECTIONS.find(s => s.id === id)?.roles.includes(auth.current()?.role),
  go: p => router.go(p), refresh: () => router.refresh(),
  emp: id => db.get('employees', id), dept: id => db.get('departments', id),
  notify: (employeeId, text) => employeeId && db.insert('notifications', { employeeId, text, at: new Date().toISOString(), read: false })
};
let active = null;
function drawSidebar() {
  const u = auth.current();
  let html = `<div class="admin-brand"><span class="logo">${LOGO}</span><span>Personas · RRHH</span></div>`, group = '';
  SECTIONS.filter(s => s.roles.includes(u.role)).forEach(s => {
    if (s.group && s.group !== group) { group = s.group; html += `<div class="nav-section">${escape(group)}</div>`; }
    const n = s.count ? s.count() : 0;
    html += `<a class="nav-link" href="#${s.path}"><span class="ico" aria-hidden="true">${s.ico}</span>${escape(s.label)}${n ? `<span class="count">${n}</span>` : ''}</a>`;
  });
  html += `<div class="nav-section">Apps</div><a class="nav-link" href="portal.html"><span class="ico">🙋</span>Mi portal</a><a class="nav-link" href="index.html"><span class="ico">🌐</span>Sitio de empleos</a>`;
  document.getElementById('sidebar').innerHTML = html;
  router.highlight(document.getElementById('sidebar'));
}
const drawTop = () => { document.getElementById('userBox').innerHTML = userMenu(auth, auth.current()); };
document.getElementById('userBox').addEventListener('click', e => { if (e.target.closest('[data-logout]')) { auth.logout(); location.href = 'login.html'; } });
document.addEventListener('click', e => { document.querySelectorAll('details.menu[open]').forEach(d => { if (!d.contains(e.target)) d.removeAttribute('open'); }); });

function show(sec, params = {}, query = {}, mod = sec.mod) {
  const u = auth.current();
  if (!u || !STAFF.includes(u.role)) { location.replace('login.html?next=admin.html'); return; }
  document.getElementById('pageTitle').textContent = sec.label;
  document.title = `${sec.label} · RRHH`;
  if (!sec.roles.includes(u.role)) {
    active = null;
    content.innerHTML = `<div class="card no-access"><div style="font-size:48px">🔒</div><h1 style="font-size:26px">Sin acceso</h1><p class="muted">Tu rol (${escape(auth.roleName(u.role))}) no tiene permiso para «${escape(sec.label)}».</p><a class="btn btn-primary" href="#/">Volver al dashboard</a></div>`;
    toast('No tienes permiso para esa sección', 'error'); drawSidebar(); return;
  }
  active = { sec, params, query, mod };
  try { mod.render(content, ctx, params, query); } catch (err) { console.error(err); content.innerHTML = `<div class="card"><h2>Ocurrió un error</h2><p class="muted">${escape(err.message)}</p></div>`; }
  drawSidebar(); window.scrollTo(0, 0);
}
const routes = {};
SECTIONS.forEach(s => { routes[s.path] = (p, q) => show(s, p, q); });
routes['/colaboradores/:id'] = (p, q) => show(SECTIONS[1], p, q, { render: colaboradores.renderDetail });
routes['/candidatos/:id'] = (p, q) => show(SECTIONS[7], p, q, { render: candidatos.renderProfile });
routes['/encuestas/:id'] = (p, q) => show(SECTIONS[10], p, q, { render: encuestas.renderResults });
const router = createRouter(routes, { notFound: () => router.go('/') });
let t;
db.subscribe(ch => {
  clearTimeout(t);
  t = setTimeout(() => {
    const u = auth.current(); if (!u || u.active === false) { location.replace('login.html'); return; }
    drawTop(); drawSidebar();
    if (!active || active.mod.live === false || document.querySelector('.modal-backdrop')) return;
    const ae = document.activeElement; if (ae && content.contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName) && ch?.type === 'sync') return;
    if (ae && content.contains(ae) && /INPUT|TEXTAREA/.test(ae.tagName) && !ae.closest('.tbl-tools')) return;
    active.mod.render(content, ctx, active.params, active.query);
  }, 60);
});
wireAdminShell(); drawTop(); router.start();
