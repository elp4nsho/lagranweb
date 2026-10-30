// Recepción: check-in de pacientes, sala de espera y caja (pagos / bonos).
import { createRouter } from '../../../assets/core/router.js';
import { db, auth } from '../data/db.js';
import { mountShell } from '../shared/shell.js';
import { ymd } from '../shared/dates.js';
import { renderCheckin } from './checkin.js';
import { renderWaiting } from './waiting.js';
import { renderPayments } from './payments.js';

let user;
try { user = auth.require(['recepcion', 'admin']); } catch (e) { /* redirige */ }
if (user) {
  const shell = mountShell({
    brand: 'Alerce', sub: 'Recepción', logo: 'pin', user, auth, db,
    nav: [
      { section: 'Mesón' },
      { href: '#/', label: 'Check-in de hoy', ico: 'pin', count: () => db.count('appointments', a => a.date === ymd() && ['reservada', 'confirmada'].includes(a.status) && a.mode !== 'tele') },
      { href: '#/sala', label: 'Sala de espera', ico: 'tv', count: () => db.count('appointments', a => a.date === ymd() && a.status === 'en_espera') },
      { href: '#/pagos', label: 'Caja: pagos y bonos', ico: 'money', count: () => db.count('appointments', a => a.date === ymd() && !a.paid && ['en_espera', 'llamado', 'en_atencion', 'atendida'].includes(a.status)) },
      { section: 'Gestión' },
      { href: 'admin.html#/citas', label: 'Agenda completa', ico: 'calendar' },
      { href: 'admin.html#/pacientes', label: 'Pacientes', ico: 'users' },
      { href: 'pantalla.html', label: 'Abrir pantalla TV', ico: 'tv' }
    ]
  });
  document.querySelector('.side-nav a[href="pantalla.html"]')?.setAttribute('target', '_blank');
  const v = shell.view;
  const page = (title, fn) => (params, query) => { shell.crumb(title); return fn(v, params, query, { user }); };
  const router = createRouter({ '/': page('Check-in de hoy', renderCheckin), '/sala': page('Sala de espera', renderWaiting), '/pagos': page('Caja: pagos y bonos', renderPayments) },
    { after: () => router.highlight(document.querySelector('.admin-sidebar')), notFound: () => { v.innerHTML = '<div class="card empty">Sección no encontrada</div>'; } });
  router.start();
  let t;
  db.subscribe(ch => {
    if (ch.type === 'log') return;
    clearTimeout(t);
    t = setTimeout(() => { const ae = document.activeElement; if (document.querySelector('.modal-backdrop') || (ae && v.contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName))) return; router.refresh(); }, 150);
  });
}
