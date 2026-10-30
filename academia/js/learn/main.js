// Aula del estudiante: mis cursos, reproductor, certificados, pedidos y avisos.
import { escape } from '../../../assets/core/ui.js';
import { createRouter } from '../../../assets/core/router.js';
import { db, auth } from '../data/db.js';
import { brandHTML } from '../shared/bits.js';
import { renderDashboard } from './dashboard.js';
import { renderPlayer, openCourse, leavePlayer } from './player.js';
import { renderCerts, renderCert, renderOrders, renderNotifications } from './account.js';

let user;
try { user = auth.require(['estudiante']); } catch (e) { /* redirigiendo al login */ }
const view = document.getElementById('view');
const header = document.getElementById('site-header');
let live = true;

function paintHeader() {
  const u = auth.current(); if (!u) return;
  const unread = db.count('notifications', n => n.userId === u.id && !n.read);
  header.className = 'site-header';
  header.innerHTML = `<div class="container bar">${brandHTML()}
    <nav class="site-nav" aria-label="Aula"><a href="#/">Mis cursos</a><a href="#/certificados">Certificados</a><a href="#/pedidos">Pedidos</a><a href="index.html#/cursos">Catálogo</a></nav>
    <div class="head-actions"><a class="btn btn-ghost btn-icon bell" href="#/notificaciones" aria-label="Notificaciones (${unread} sin leer)">🔔${unread ? `<span class="dot">${unread}</span>` : ''}</a>
      <span class="hide-m small muted">${escape(u.name.split(' ')[0])}</span><button class="btn btn-sm" data-logout>Salir</button>
      <button class="btn btn-ghost btn-icon burger" aria-label="Abrir menú">☰</button></div></div>`;
  header.querySelector('[data-logout]').onclick = () => { auth.logout(); location.href = 'index.html'; };
  header.querySelector('.burger').onclick = () => header.classList.toggle('nav-open');
  header.querySelector('.site-nav').onclick = e => { if (e.target.closest('a')) header.classList.remove('nav-open'); };
  router.highlight(header);
}

const router = !user ? null : createRouter({
  '/': () => renderDashboard(view),
  '/curso/:id': ({ id }) => openCourse(id),
  '/curso/:id/:lid': ({ id, lid }) => { live = false; renderPlayer(view, id, lid); },
  '/certificados': () => renderCerts(view),
  '/certificado/:id': ({ id }) => renderCert(view, id),
  '/pedidos': () => renderOrders(view),
  '/notificaciones': () => renderNotifications(view)
}, {
  before: () => { live = true; leavePlayer(); return true; },
  notFound: () => { view.innerHTML = '<div class="card empty"><h2>Página no encontrada</h2><a class="btn btn-primary" href="#/">Volver</a></div>'; },
  after: () => paintHeader()
});
let last = '';
window.addEventListener('hashchange', () => { if (location.hash.split('/').slice(0, 3).join('/') !== last) window.scrollTo(0, 0); last = location.hash.split('/').slice(0, 3).join('/'); });
router?.start();
let t;
if (user) db.subscribe(ch => {
  clearTimeout(t);
  t = setTimeout(() => {
    const u = auth.current();
    if (!u || u.active === false) { location.href = 'login.html'; return; }
    paintHeader();
    if (!live || ch?.type === 'log' || document.querySelector('.modal-backdrop')) return;
    const y = scrollY; router.refresh(); scrollTo(0, y);
  }, 80);
});
