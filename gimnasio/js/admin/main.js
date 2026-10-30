// Panel de administración de Titán Fit.
import { createRouter } from '../../../assets/core/router.js';
import { db, auth } from '../data/db.js';
import { mountShell } from '../shared/shell.js';
import { renderDashboard } from './dashboard.js';
import { renderMembers, renderMember } from './members.js';
import { renderPlans } from './plans.js';
import { renderSchedule } from './schedule.js';
import { renderBranches } from './branches.js';
import { renderTrainers } from './trainers.js';
import { renderPayments } from './payments.js';
import { renderProducts } from './products.js';
import { renderCampaigns } from './campaigns.js';
import { renderChallenges } from './challenges.js';
import { renderUsers } from './users.js';
import { renderSettings } from './settings.js';
import { renderLog } from './log.js';

let user;
try { user = auth.require(['admin', 'recepcion']); } catch (e) { /* redirigiendo a login */ }

if (user) {
  const A = ['admin'], AR = ['admin', 'recepcion'];
  const shell = mountShell({
    brand: 'Titán Fit', sub: 'Administración', logo: 'dumbbell', user, auth, db,
    onReset: user.role === 'admin' ? () => router.refresh() : null,
    nav: [
      { section: 'General' },
      { href: '#/', label: 'Dashboard', ico: 'chart', roles: AR },
      { href: '#/socios', label: 'Socios', ico: 'users', roles: AR },
      { href: '#/pagos', label: 'Pagos y cobranza', ico: 'money', roles: AR, count: () => db.count('members', m => m.status === 'moroso') },
      { href: '#/tienda', label: 'Tienda y stock', ico: 'cart', roles: AR, count: () => db.count('products', p => p.stock <= 5) },
      { section: 'Oferta' },
      { href: '#/planes', label: 'Planes', ico: 'tag', roles: A },
      { href: '#/horario', label: 'Clases y horario', ico: 'calendar', roles: A },
      { href: '#/sedes', label: 'Sedes', ico: 'pin', roles: A },
      { href: '#/entrenadores', label: 'Entrenadores', ico: 'dumbbell', roles: A },
      { section: 'Marketing' },
      { href: '#/campanas', label: 'Campañas', ico: 'megaphone', roles: A },
      { href: '#/desafios', label: 'Desafíos', ico: 'trophy', roles: A },
      { section: 'Sistema' },
      { href: '#/usuarios', label: 'Usuarios y roles', ico: 'shield', roles: A },
      { href: '#/config', label: 'Configuración del sitio', ico: 'sliders', roles: A },
      { href: '#/bitacora', label: 'Bitácora', ico: 'list', roles: A }
    ],
    topExtra: `<a class="btn btn-sm hide-sm" href="recepcion.html">Recepción</a>${user.role === 'admin' ? '<a class="btn btn-sm hide-sm" href="entrenador.html">App entrenador</a>' : ''}`
  });
  const v = shell.view;
  const page = (title, fn) => (params, query) => { shell.crumb(title); return fn(v, params, query, { user, shell }); };
  const router = createRouter({
    '/': page('Dashboard', renderDashboard),
    '/socios': page('Socios', renderMembers), '/socios/:id': page('Ficha de socio', renderMember),
    '/pagos': page('Pagos y cobranza', renderPayments), '/tienda': page('Tienda y stock', renderProducts),
    '/planes': page('Planes', renderPlans), '/horario': page('Clases y horario', renderSchedule),
    '/sedes': page('Sedes', renderBranches), '/entrenadores': page('Entrenadores', renderTrainers),
    '/campanas': page('Campañas', renderCampaigns), '/desafios': page('Desafíos', renderChallenges),
    '/usuarios': page('Usuarios y roles', renderUsers), '/config': page('Configuración del sitio', renderSettings), '/bitacora': page('Bitácora', renderLog)
  }, {
    before: path => { if (!shell.can(path)) { shell.crumb('Acceso restringido'); shell.denied(); router.highlight(document.querySelector('.admin-sidebar')); return false; } },
    notFound: () => { v.innerHTML = '<div class="card empty"><h2>Sección no encontrada</h2><a class="btn" href="#/">Ir al dashboard</a></div>'; },
    after: () => router.highlight(document.querySelector('.admin-sidebar'))
  });
  router.start();
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
