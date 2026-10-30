// App del trabajador: inducciones asignadas, reproductor 3D/2D, evaluación, certificados y avisos.
import { escape, toast } from '../../../assets/core/ui.js';
import { createRouter } from '../../../assets/core/router.js';
import { db, auth, homeFor } from '../data/db.js';
import { mountHeader } from '../shared/brand.js';
import { renderDashboard } from './dashboard.js';
import { renderPlan } from './plan.js';
import { showModule, leaveModule } from './player.js';
import { renderQuiz } from './quiz.js';
import { renderCerts, renderCert } from './certs.js';
import { renderNotifications } from './notifications.js';
import { renderProfile } from './profile.js';

let user;
try { user = auth.require(['trabajador', 'admin', 'prevencionista', 'supervisor']); } catch (e) { /* redirigiendo al login */ }
const view = document.getElementById('view');
const header = document.getElementById('site-header');
const isWorker = () => auth.current()?.role === 'trabajador';

function paintHeader() {
  const u = auth.current();
  if (!u) return;
  const unread = db.count('notifications', n => n.userId === u.id && !n.read);
  const links = isWorker()
    ? [{ href: '#/', label: 'Mis inducciones' }, { href: '#/certificados', label: 'Certificados' }, { href: '#/perfil', label: 'Mi perfil' }]
    : [{ href: homeFor(u.role), label: '← Volver a mi panel' }];
  mountHeader(header, {
    links,
    actions: `${isWorker() ? `<a class="btn btn-ghost btn-icon bell" href="#/notificaciones" aria-label="Notificaciones (${unread} sin leer)">🔔${unread ? `<span class="dot">${unread}</span>` : ''}</a>` : ''}
      <span class="hide-m small muted">${escape(u.name.split(' ')[0])}</span><button class="btn btn-sm" data-logout>Salir</button>`
  });
  header.querySelector('[data-logout]').onclick = () => { auth.logout(); location.href = 'login.html'; };
  router.highlight(header);
}

const staffOnly = () => {
  if (isWorker()) return false;
  view.innerHTML = `<div class="card empty"><span class="icon">🦺</span><h2>Esta es la app del trabajador</h2><p>Con tu rol (${escape(auth.roleName(auth.current().role))}) puedes previsualizar módulos desde el panel.</p><a class="btn btn-primary" href="${homeFor(auth.current().role)}">Ir a mi panel</a></div>`;
  return true;
};

let onPlayer = false;
const router = !user ? null : createRouter({
  '/': () => staffOnly() || renderDashboard(view),
  '/plan/:aid': ({ aid }) => staffOnly() || renderPlan(view, aid),
  '/modulo/:aid/:mid': ({ aid, mid }) => staffOnly() || (onPlayer = true, showModule(view, { aid, mid })),
  '/preview/:mid': ({ mid }) => { onPlayer = true; showModule(view, { mid, preview: true }); },
  '/evaluacion/:aid': ({ aid }) => staffOnly() || (onPlayer = true, renderQuiz(view, aid)),
  '/certificados': () => staffOnly() || renderCerts(view),
  '/certificado/:id': ({ id }) => renderCert(view, id),
  '/notificaciones': () => staffOnly() || renderNotifications(view),
  '/perfil': () => staffOnly() || renderProfile(view)
}, {
  before: () => { onPlayer = false; leaveModule(); return true; },
  notFound: () => { view.innerHTML = '<div class="card empty"><h2>Página no encontrada</h2><a class="btn btn-primary" href="#/">Volver</a></div>'; },
  after: () => { paintHeader(); window.scrollTo(0, 0); }
});
router?.start();

// Repinta con los cambios de datos (también desde otras pestañas), salvo dentro del reproductor o la evaluación.
let t;
if (user) db.subscribe(ch => {
  clearTimeout(t);
  t = setTimeout(() => {
    const u = auth.current();
    if (!u || u.active === false) { location.href = 'login.html'; return; }
    paintHeader();
    if (onPlayer || ch?.type === 'log' || document.querySelector('.modal-backdrop')) return;
    router.refresh();
  }, 80);
});
window.__induccion = { db, auth, toast };
