// Recepción: kiosco de check-in, punto de venta y consulta rápida de socios.
import { createRouter } from '../../../assets/core/router.js';
import { db, auth } from '../data/db.js';
import { mountShell } from '../shared/shell.js';
import { ymd } from '../shared/dates.js';
import { renderKiosk } from './kiosk.js';
import { renderPOS } from './pos.js';
import { renderMembers } from './members.js';

let user;
try { user = auth.require(['recepcion', 'admin']); } catch (e) { /* redirige */ }
if (user) {
  const shell = mountShell({
    brand: 'Titán Fit', sub: 'Recepción', logo: 'qr', user, auth, db,
    nav: [
      { section: 'Mesón' },
      { href: '#/', label: 'Kiosco check-in', ico: 'qr', count: () => db.count('checkins', k => k.at.slice(0, 10) === ymd() || new Date(k.at).toDateString() === new Date().toDateString()) },
      { href: '#/pos', label: 'Tienda (POS)', ico: 'cart' },
      { href: '#/socios', label: 'Socios y cobros', ico: 'users', count: () => db.count('members', m => m.status === 'moroso') },
      { section: 'Gestión' },
      { href: 'admin.html', label: 'Panel admin', ico: 'chart' }
    ]
  });
  const v = shell.view;
  const page = (title, fn) => (params, query) => { shell.crumb(title); return fn(v, params, query, { user }); };
  const router = createRouter({ '/': page('Kiosco check-in', renderKiosk), '/pos': page('Tienda (POS)', renderPOS), '/socios': page('Socios y cobros', renderMembers) },
    { after: () => router.highlight(document.querySelector('.admin-sidebar')), notFound: () => { v.innerHTML = '<div class="card empty">Sección no encontrada</div>'; } });
  router.start();
  let t;
  db.subscribe(ch => {
    if (ch.type === 'log' || location.hash.startsWith('#/pos') || !location.hash || location.hash === '#/') return; // kiosco y POS se actualizan solos
    clearTimeout(t);
    t = setTimeout(() => { const ae = document.activeElement; if (document.querySelector('.modal-backdrop') || (ae && v.contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName))) return; router.refresh(); }, 150);
  });
}
