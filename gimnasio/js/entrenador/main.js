// App del entrenador: mis clases y asistencia, constructor de rutinas, progreso de clientes.
import { createRouter } from '../../../assets/core/router.js';
import { escape } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { mountShell } from '../shared/shell.js';
import { ymd } from '../shared/dates.js';
import { renderMyClasses, renderAttendance } from './classes.js';
import { renderRoutines, renderRoutineEditor } from './routines.js';
import { renderClients, renderClient } from './clients.js';

let user;
try { user = auth.require(['entrenador', 'admin']); } catch (e) { /* redirige */ }
if (user) {
  const KEY = 'gimnasio:coach-view';
  let tid = user.role === 'entrenador' ? user.trainerId : (sessionStorage.getItem(KEY) || 't2');
  const ctx = { user, get t() { return db.get('trainers', tid); } };
  const shell = mountShell({
    brand: 'Titán Fit', sub: 'App entrenador', logo: 'dumbbell', user, auth, db,
    nav: [
      { section: 'Coaching' },
      { href: '#/', label: 'Mis clases', ico: 'calendar', count: () => db.count('classes', c => c.trainerId === tid && c.day === new Date().getDay()) },
      { href: '#/rutinas', label: 'Rutinas', ico: 'dumbbell' },
      { href: '#/clientes', label: 'Mis clientes', ico: 'users' }
    ],
    topExtra: user.role === 'admin' ? `<select class="select" data-t style="width:auto;min-height:34px;padding-top:4px;padding-bottom:4px" aria-label="Ver como">${db.all('trainers').map(t => `<option value="${t.id}" ${t.id === tid ? 'selected' : ''}>${escape(t.name)}</option>`).join('')}</select>` : ''
  });
  document.querySelector('[data-t]')?.addEventListener('change', e => { tid = e.target.value; sessionStorage.setItem(KEY, tid); shell.refreshCounts(); router.refresh(); });
  const v = shell.view;
  const page = (title, fn) => (params, query) => { shell.crumb(title); return fn(v, params, query, ctx); };
  const router = createRouter({
    '/': page('Mis clases', renderMyClasses), '/clase/:id/:date': page('Asistencia', renderAttendance),
    '/rutinas': page('Rutinas', renderRoutines), '/rutinas/nueva': page('Nueva rutina', renderRoutineEditor), '/rutinas/:id': page('Editar rutina', renderRoutineEditor),
    '/clientes': page('Mis clientes', renderClients), '/clientes/:id': page('Cliente', renderClient)
  }, { after: () => router.highlight(document.querySelector('.admin-sidebar')), notFound: () => { v.innerHTML = '<div class="card empty">Sección no encontrada</div>'; } });
  if (!ctx.t) v.innerHTML = '<div class="card empty">Tu usuario no está vinculado a un entrenador.</div>'; else router.start();
  let t;
  db.subscribe(ch => {
    if (ch.type === 'log' || location.hash.startsWith('#/rutinas/')) return; // el editor mantiene su borrador
    clearTimeout(t);
    t = setTimeout(() => { const ae = document.activeElement; if (document.querySelector('.modal-backdrop') || (ae && v.contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName))) return; router.refresh(); }, 150);
  });
}
