// App del socio: reservas de clases, carnet digital, rutina, progreso, desafíos y pagos.
import { createRouter } from '../../../assets/core/router.js';
import { db, auth } from '../data/db.js';
import { mountShell } from '../shared/shell.js';
import { member } from '../shared/domain.js';
import { ymd } from '../shared/dates.js';
import { renderHome } from './home.js';
import { renderClasses } from './classes.js';
import { renderCard } from './card.js';
import { renderRoutine } from './routine.js';
import { renderProgress } from './progress.js';
import { renderChallenges } from './challenges.js';
import { renderPayments } from './payments.js';

let user;
try { user = auth.require(['socio']); } catch (e) { /* redirige */ }
if (user) {
  const shell = mountShell({
    brand: 'Titán Fit', sub: 'App del socio', logo: 'dumbbell', user, auth, db,
    nav: [
      { section: 'Mi entrenamiento' },
      { href: '#/', label: 'Inicio', ico: 'home' },
      { href: '#/clases', label: 'Reservar clases', ico: 'calendar', count: () => db.count('bookings', b => b.memberId === user.memberId && b.date >= ymd() && ['reservada', 'espera'].includes(b.status)) },
      { href: '#/carnet', label: 'Carnet digital', ico: 'qr' },
      { href: '#/rutina', label: 'Mi rutina', ico: 'dumbbell' },
      { href: '#/progreso', label: 'Progreso', ico: 'chart' },
      { href: '#/desafios', label: 'Desafíos', ico: 'trophy' },
      { section: 'Cuenta' },
      { href: '#/pagos', label: 'Pagos y membresía', ico: 'card' }
    ]
  });
  const v = shell.view;
  const ctx = { user, get m() { return member(user.memberId); } };
  const page = (title, fn) => (params, query) => { shell.crumb(title); if (!ctx.m) { v.innerHTML = '<div class="card empty">Tu cuenta no está vinculada a un socio.</div>'; return; } return fn(v, params, query, ctx); };
  const router = createRouter({
    '/': page('Inicio', renderHome), '/clases': page('Reservar clases', renderClasses), '/carnet': page('Carnet digital', renderCard),
    '/rutina': page('Mi rutina', renderRoutine), '/progreso': page('Progreso', renderProgress), '/desafios': page('Desafíos', renderChallenges), '/pagos': page('Pagos y membresía', renderPayments)
  }, { after: () => router.highlight(document.querySelector('.admin-sidebar')), notFound: () => { v.innerHTML = '<div class="card empty">Sección no encontrada</div>'; } });
  router.start();
  let t;
  db.subscribe(ch => {
    if (ch.type === 'log') return;
    clearTimeout(t);
    t = setTimeout(() => { const ae = document.activeElement; if (document.querySelector('.modal-backdrop') || (ae && v.contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName))) return; router.refresh(); }, 150);
  });
}
