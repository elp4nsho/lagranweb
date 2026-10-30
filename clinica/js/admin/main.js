// Panel de administración del Centro Médico Alerce.
import { createRouter } from '../../../assets/core/router.js';
import { db, auth } from '../data/db.js';
import { mountShell } from '../shared/shell.js';
import { ymd } from '../shared/dates.js';
import { renderDashboard } from './dashboard.js';
import { renderAppointments } from './appointments.js';
import { renderPatients, renderPatient } from './patients.js';
import { renderDoctors } from './doctors.js';
import { renderSpecialties } from './specialties.js';
import { renderBoxes } from './boxes.js';
import { renderPricing } from './pricing.js';
import { renderReminders } from './reminders.js';
import { renderUsers } from './users.js';
import { renderSettings } from './settings.js';
import { renderLog } from './log.js';

let user;
try { user = auth.require(['admin', 'recepcion']); } catch (e) { /* redirigiendo a login */ }

if (user) {
  const A = ['admin'], AR = ['admin', 'recepcion'];
  const shell = mountShell({
    brand: 'Alerce', sub: 'Administración', logo: 'heart', user, auth, db,
    onReset: user.role === 'admin' ? () => router.refresh() : null,
    nav: [
      { section: 'General' },
      { href: '#/', label: 'Dashboard', ico: 'chart', roles: AR },
      { href: '#/citas', label: 'Citas', ico: 'calendar', roles: AR, count: () => db.count('appointments', a => a.date === ymd() && a.status === 'en_espera') },
      { href: '#/pacientes', label: 'Pacientes', ico: 'users', roles: AR },
      { section: 'Centro médico' },
      { href: '#/medicos', label: 'Médicos y horarios', ico: 'steth', roles: A },
      { href: '#/especialidades', label: 'Especialidades', ico: 'heart', roles: A },
      { href: '#/boxes', label: 'Boxes y salas', ico: 'door', roles: A },
      { href: '#/precios', label: 'Precios y previsión', ico: 'tag', roles: A },
      { section: 'Comunicación' },
      { href: '#/recordatorios', label: 'Recordatorios', ico: 'bell', roles: AR, count: () => db.count('reminders', r => r.status === 'fallido') },
      { section: 'Sistema' },
      { href: '#/usuarios', label: 'Usuarios y roles', ico: 'shield', roles: A },
      { href: '#/config', label: 'Configuración del sitio', ico: 'sliders', roles: A },
      { href: '#/bitacora', label: 'Bitácora', ico: 'list', roles: A }
    ],
    topExtra: `<a class="btn btn-sm hide-sm" href="recepcion.html">Recepción</a>${user.role === 'admin' ? '<a class="btn btn-sm hide-sm" href="medico.html">App médico</a>' : ''}`
  });
  const v = shell.view;
  const page = (title, fn) => (params, query) => { shell.crumb(title); return fn(v, params, query, { user, shell }); };
  const router = createRouter({
    '/': page('Dashboard', renderDashboard),
    '/citas': page('Citas', renderAppointments),
    '/pacientes': page('Pacientes', renderPatients),
    '/pacientes/:id': page('Ficha de paciente', renderPatient),
    '/medicos': page('Médicos y horarios', renderDoctors),
    '/especialidades': page('Especialidades', renderSpecialties),
    '/boxes': page('Boxes y salas', renderBoxes),
    '/precios': page('Precios y previsión', renderPricing),
    '/recordatorios': page('Recordatorios', renderReminders),
    '/usuarios': page('Usuarios y roles', renderUsers),
    '/config': page('Configuración del sitio', renderSettings),
    '/bitacora': page('Bitácora', renderLog)
  }, {
    before: path => { if (!shell.can(path)) { shell.crumb('Acceso restringido'); shell.denied(); router.highlight(document.querySelector('.admin-sidebar')); return false; } },
    notFound: () => { v.innerHTML = '<div class="card empty"><h2>Sección no encontrada</h2><a class="btn" href="#/">Ir al dashboard</a></div>'; },
    after: () => { router.highlight(document.querySelector('.admin-sidebar')); }
  });
  router.start();
  // Refresca la vista cuando cambian los datos (otra pestaña, sitio público…) salvo si hay un modal abierto o se está escribiendo.
  let t;
  db.subscribe(ch => {
    if (ch.type === 'log' && !location.hash.includes('bitacora')) return;
    clearTimeout(t);
    t = setTimeout(() => {
      const ae = document.activeElement;
      if (document.querySelector('.modal-backdrop') || (ae && v.contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName))) return;
      if (!auth.current() || auth.current().active === false) { location.href = 'login.html'; return; }
      router.refresh();
    }, 120);
  });
}
