// Panel de Dirección / UTP: shell, permisos por rol y router de secciones.
import { db, auth, guardPage, logout } from '../data/db.js';
import { createRouter } from '../../../assets/core/router.js';
import { wireAdminShell, toast } from '../../../assets/core/ui.js';
import { mountShell, denied, liveRender } from '../shared/kit.js';
import { site } from '../shared/academic.js';

import * as dashboard from './dashboard.js';
import * as courses from './courses.js';
import * as subjects from './subjects.js';
import * as teachers from './teachers.js';
import * as students from './students.js';
import * as guardians from './guardians.js';
import * as timetable from './timetable.js';
import * as evaluations from './evaluations.js';
import * as admissions from './admissions.js';
import * as reports from './reports.js';
import * as communications from './communications.js';
import * as content from './content.js';
import * as payments from './payments.js';
import * as contacts from './contacts.js';
import * as users from './users.js';
import * as settings from './settings.js';
import * as activity from './activity.js';

const A = ['admin'], AU = ['admin', 'utp'];
// Matriz de permisos: sección → roles. Se usa para el menú y para proteger cada ruta.
export const SECTIONS = [
  { key: 'dashboard', path: '/', label: 'Resumen', ico: '◧', roles: AU, mod: dashboard, group: 'General' },
  { key: 'cursos', path: '/cursos', label: 'Cursos', ico: '▦', roles: AU, mod: courses, group: 'Académico' },
  { key: 'asignaturas', path: '/asignaturas', label: 'Asignaturas', ico: '✎', roles: AU, mod: subjects, group: 'Académico' },
  { key: 'docentes', path: '/docentes', label: 'Docentes', ico: '👩‍🏫', roles: AU, mod: teachers, group: 'Académico' },
  { key: 'horarios', path: '/horarios', label: 'Horarios', ico: '⌚', roles: AU, mod: timetable, group: 'Académico' },
  { key: 'evaluaciones', path: '/evaluaciones', label: 'Evaluaciones', ico: '✓', roles: AU, mod: evaluations, group: 'Académico', count: () => db.count('evaluations', e => e.status === 'pendiente') },
  { key: 'informes', path: '/informes', label: 'Informes de notas', ico: '⎙', roles: AU, mod: reports, group: 'Académico' },
  { key: 'estudiantes', path: '/estudiantes', label: 'Estudiantes', ico: '🎒', roles: AU, mod: students, group: 'Comunidad' },
  { key: 'apoderados', path: '/apoderados', label: 'Apoderados', ico: '👪', roles: AU, mod: guardians, group: 'Comunidad' },
  { key: 'admision', path: '/admision', label: 'Admisión', ico: '✉', roles: AU, mod: admissions, group: 'Comunidad', count: () => db.count('applications', a => a.status === 'recibida') },
  { key: 'comunicados', path: '/comunicados', label: 'Comunicados', ico: '📣', roles: AU, mod: communications, group: 'Comunidad' },
  { key: 'contenido', path: '/contenido', label: 'Noticias y eventos', ico: '📰', roles: AU, mod: content, group: 'Sitio web' },
  { key: 'contacto', path: '/contacto', label: 'Mensajes web', ico: '☏', roles: A, mod: contacts, group: 'Sitio web', count: () => db.count('contacts', c => c.status === 'nuevo') },
  { key: 'sitio', path: '/sitio', label: 'Configuración del sitio', ico: '⚙', roles: A, mod: settings, group: 'Sitio web' },
  { key: 'pagos', path: '/pagos', label: 'Mensualidades', ico: '$', roles: A, mod: payments, group: 'Administración', count: () => db.count('payments', p => p.status === 'vencido') },
  { key: 'usuarios', path: '/usuarios', label: 'Usuarios y roles', ico: '🔑', roles: A, mod: users, group: 'Administración' },
  { key: 'bitacora', path: '/bitacora', label: 'Bitácora', ico: '☰', roles: A, mod: activity, group: 'Administración' }
];

const me = guardPage(AU);
if (me) start();

function start() {
  const st = site();
  const can = key => { const u = auth.current(); const s = SECTIONS.find(x => x.key === key); return !!u && !!s && s.roles.includes(u.role); };
  const visible = SECTIONS.filter(s => s.roles.includes(me.role));
  const groups = [...new Set(visible.map(s => s.group))];
  const shell = mountShell({
    brand: st.platform, sub: st.name, logo: 'A',
    nav: groups.map(g => ({ section: g, items: visible.filter(s => s.group === g).map(s => ({ href: '#' + s.path, label: s.label, ico: s.ico, count: s.count })) })),
    user: me, roleName: `${auth.roleName(me.role)} · ${me.title || ''}`, onLogout: logout,
    footExtra: me.role === 'admin' ? '<button class="btn btn-sm btn-ghost btn-block" data-reset>↺ Restablecer datos demo</button>' : ''
  });
  wireAdminShell();
  document.querySelector('[data-reset]')?.addEventListener('click', () => settings.resetDemo());

  const ctx = { db, auth, me, can, isAdmin: me.role === 'admin', refresh: () => router.refresh(), go: p => router.go(p) };
  const routes = {};
  SECTIONS.forEach(s => {
    const handler = params => {
      shell.setTitle(s.label);
      if (!can(s.key)) { shell.view.innerHTML = denied(`La sección "${s.label}" es solo para Dirección.`); return; }
      return s.mod.render(shell.view, { ...ctx, params });
    };
    routes[s.path] = handler;
    if (s.mod.detail) routes[s.path + '/:id'] = params => {
      shell.setTitle(s.label);
      if (!can(s.key)) { shell.view.innerHTML = denied(); return; }
      return s.mod.detail(shell.view, { ...ctx, params }, params.id);
    };
  });
  let last = null;
  const router = createRouter(routes, {
    notFound: () => { shell.view.innerHTML = denied('La página no existe.'); },
    after: cur => {
      shell.renderNav();
      router.highlight(document.querySelector('.shell-nav'));
      if (cur.path !== last) { window.scrollTo(0, 0); last = cur.path; }
    }
  });
  router.start();
  liveRender(db, () => {
    const u = auth.current();
    if (!u || u.active === false || !AU.includes(u.role)) { location.replace('login.html'); return; }
    router.refresh();
  });
  if (new URLSearchParams(location.search).get('welcome')) toast(`Bienvenido/a, ${me.name}`, 'success');
}
