// Portal del colaborador (autoservicio) + sección de jefatura.
import { db, auth } from '../data/db.js';
import { createRouter } from '../../../assets/core/router.js';
import { wireAdminShell, escape, ago, toast } from '../../../assets/core/ui.js';
import { LOGO, userMenu } from '../shared/topnav.js';
import * as inicio from './inicio.js';
import * as solicitudes from './solicitudes.js';
import * as liquidaciones from './liquidaciones.js';
import * as asistencia from './asistencia.js';
import * as documentos from './documentos.js';
import * as evaluacion from './evaluacion.js';
import * as anuncios from './anuncios.js';
import * as celebraciones from './celebraciones.js';
import * as equipo from './equipo.js';

auth.require(['admin', 'reclutador', 'jefatura', 'empleado']);
const content = document.getElementById('content');
const ctx = {
  db, auth,
  get user() { return auth.current(); },
  get me() { return db.get('employees', auth.current()?.employeeId); },
  get team() { const me = ctx.me; return me ? db.query('employees', e => e.managerId === me.id && e.status !== 'desvinculado') : []; },
  go: p => router.go(p),
  dept: id => db.get('departments', id),
  notify: (employeeId, text) => db.insert('notifications', { employeeId, text, at: new Date().toISOString(), read: false })
};
const SECTIONS = [
  { path: '/', label: 'Inicio', ico: '🏠', mod: inicio, group: 'Mi portal' },
  { path: '/solicitudes', label: 'Vacaciones y permisos', ico: '🏖️', mod: solicitudes, count: () => db.count('requests', r => r.employeeId === ctx.me?.id && r.status === 'pendiente') },
  { path: '/liquidaciones', label: 'Liquidaciones', ico: '💵', mod: liquidaciones },
  { path: '/asistencia', label: 'Asistencia', ico: '⏱️', mod: asistencia },
  { path: '/documentos', label: 'Mis documentos', ico: '📁', mod: documentos, count: () => db.count('documents', d => d.employeeId === ctx.me?.id && !d.signed) },
  { path: '/evaluacion', label: 'Desempeño', ico: '🎯', mod: evaluacion },
  { path: '/anuncios', label: 'Comunicados', ico: '📣', mod: anuncios, group: 'Comunidad' },
  { path: '/celebraciones', label: 'Cumpleaños y aniversarios', ico: '🎂', mod: celebraciones },
  { path: '/equipo', label: 'Mi equipo', ico: '👥', mod: equipo, group: 'Jefatura', show: () => ctx.team.length > 0, count: () => { const ids = new Set(ctx.team.map(e => e.id)); return db.count('requests', r => ids.has(r.employeeId) && r.status === 'pendiente'); } }
];

function drawSidebar() {
  const u = auth.current();
  let html = `<div class="admin-brand"><span class="logo">${LOGO}</span><span>Grupo Cordillera</span></div>`, group = '';
  SECTIONS.filter(s => !s.show || s.show()).forEach(s => {
    if (s.group && s.group !== group) { group = s.group; html += `<div class="nav-section">${escape(group)}</div>`; }
    const n = s.count ? s.count() : 0;
    html += `<a class="nav-link" href="#${s.path}"><span class="ico" aria-hidden="true">${s.ico}</span>${escape(s.label)}${n ? `<span class="count">${n}</span>` : ''}</a>`;
  });
  html += `<div class="nav-section">Enlaces</div><a class="nav-link" href="index.html"><span class="ico">🌐</span>Sitio de empleos</a>${['admin', 'reclutador'].includes(u.role) ? '<a class="nav-link" href="admin.html"><span class="ico">🛠️</span>Panel de RRHH</a>' : ''}`;
  document.getElementById('sidebar').innerHTML = html;
  router.highlight(document.getElementById('sidebar'));
}
function drawTop() {
  const me = ctx.me;
  const list = me ? db.query('notifications', n => n.employeeId === me.id).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8) : [];
  const unread = list.filter(n => !n.read).length;
  const box = document.getElementById('bellBox'), wasOpen = box.querySelector('details')?.open;
  box.innerHTML = `<details class="menu"><summary class="btn btn-ghost btn-sm btn-icon notif-btn" aria-label="Notificaciones (${unread} sin leer)">🔔${unread ? `<span class="dot">${unread}</span>` : ''}</summary><div class="menu-pop card"><div class="menu-head" style="flex-direction:row;justify-content:space-between;align-items:center"><b>Notificaciones</b>${unread ? '<button type="button" class="btn btn-sm btn-ghost" data-readall>Marcar leídas</button>' : ''}</div>${list.map(n => `<div class="menu-link" style="cursor:default${n.read ? ';opacity:.65' : ''}">${n.read ? '' : '● '}${escape(n.text)}<br><small class="muted">${escape(ago(n.at))}</small></div>`).join('') || '<p class="muted small" style="padding:8px">Sin notificaciones.</p>'}</div></details>`;
  if (wasOpen) box.querySelector('details').open = true;
  document.getElementById('userBox').innerHTML = userMenu(auth, auth.current());
}
document.getElementById('bellBox').addEventListener('click', e => { if (e.target.closest('[data-readall]')) db.query('notifications', n => n.employeeId === ctx.me?.id && !n.read).forEach(n => db.update('notifications', n.id, { read: true })); });
document.getElementById('userBox').addEventListener('click', e => { if (e.target.closest('[data-logout]')) { auth.logout(); location.href = 'index.html'; } });
document.addEventListener('click', e => { document.querySelectorAll('details.menu[open]').forEach(d => { if (!d.contains(e.target)) d.removeAttribute('open'); }); });

let active = null;
function show(sec, params = {}, query = {}) {
  document.getElementById('pageTitle').textContent = sec.label;
  document.title = `${sec.label} · Mi portal`;
  if (!ctx.me) { content.innerHTML = '<div class="card no-access"><div style="font-size:48px">🙋</div><h1 style="font-size:26px">Tu usuario no tiene ficha de colaborador</h1><p class="muted">Pide a RRHH que vincule tu cuenta.</p></div>'; return; }
  if (sec.show && !sec.show()) { content.innerHTML = '<div class="card no-access"><div style="font-size:48px">🔒</div><h1 style="font-size:26px">Sin acceso</h1><p class="muted">Esta sección es solo para jefaturas con equipo a cargo.</p><a class="btn btn-primary" href="#/">Volver</a></div>'; toast('Sección solo para jefaturas', 'error'); active = null; drawSidebar(); return; }
  active = { sec, params, query };
  sec.mod.render(content, ctx, params, query);
  drawSidebar();
}
const routes = {}; SECTIONS.forEach(s => { routes[s.path] = (p, q) => { show(s, p, q); window.scrollTo(0, 0); }; });
routes['/liquidaciones/:period'] = (p, q) => show(SECTIONS[2], p, q);
const router = createRouter(routes, { notFound: () => router.go('/') });

let t, lastUnread = null;
db.subscribe(ch => {
  clearTimeout(t);
  t = setTimeout(() => {
    const u = auth.current(); if (!u || u.active === false) { location.replace('login.html'); return; }
    const unread = db.count('notifications', n => n.employeeId === ctx.me?.id && !n.read);
    if (lastUnread !== null && unread > lastUnread && ch?.type === 'sync') { const n = db.query('notifications', x => x.employeeId === ctx.me?.id && !x.read).sort((a, b) => b.at.localeCompare(a.at))[0]; if (n) toast(`🔔 ${n.text}`, 'info', 6000); }
    lastUnread = unread;
    drawTop(); drawSidebar();
    if (!active || active.sec.mod.live === false || document.querySelector('.modal-backdrop')) return;
    const ae = document.activeElement; if (ae && content.contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName)) return;
    active.sec.mod.render(content, ctx, active.params, active.query);
  }, 60);
});
lastUnread = db.count('notifications', n => n.employeeId === ctx.me?.id && !n.read);
wireAdminShell(); drawTop(); router.start();
