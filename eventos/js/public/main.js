// Sitio público: cabecera, pie, router y refresco en vivo desde la DB.
import { db, auth, settings, HOME_BY_ROLE } from '../data/db.js';
import { createRouter } from '../../../assets/core/router.js';
import { html, raw, $, ago, escape } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { LOGO } from '../shared/format.js';
import { cleanHolds } from '../shared/inventory.js';
import { renderHome } from './home.js';
import { renderExplore } from './explore.js';
import { renderEvent } from './event.js';
import { renderSeats } from './seats.js';
import { renderCheckout, renderConfirm } from './checkout.js';
import { renderMyTickets, renderPass } from './tickets.js';

const app = $('#app');
let handle = null, lastPath = '';

function header() {
  const u = auth.current();
  const s = settings();
  $('#banner').innerHTML = s.bannerOn && s.banner ? html`<div class="promo-banner" role="note">${s.banner}</div>` : '';
  const notes = u ? db.query('notifications', n => n.userId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8) : [];
  const unread = notes.filter(n => !n.read).length;
  const panel = u && u.role !== 'cliente' ? HOME_BY_ROLE[u.role] : '';
  $('#header').innerHTML = html`<div class="container">
    <div class="bar">
      <a class="brand site-brand" href="#/"><span class="logo">${raw(LOGO)}</span><span>Tiquetera Volcán</span></a>
      <nav class="main-nav site-nav" aria-label="Principal">
        <a href="#/" class="nav-home"><span class="nav-ico" aria-hidden="true">🌋</span>Inicio</a><a href="#/explorar"><span class="nav-ico" aria-hidden="true">🔎</span>Explorar</a><a class="nav-cat" href="#/explorar?cat=conciertos"><span class="nav-ico" aria-hidden="true">🎸</span>Conciertos</a><a class="nav-cat" href="#/explorar?cat=teatro"><span class="nav-ico" aria-hidden="true">🎭</span>Teatro</a><a class="nav-cat" href="#/explorar?cat=deportes"><span class="nav-ico" aria-hidden="true">🏆</span>Deportes</a><a class="nav-cat" href="#/explorar?cat=conferencias"><span class="nav-ico" aria-hidden="true">🎤</span>Conferencias</a>${u ? raw('<a href="#/mis-entradas" class="nav-tickets"><span class="nav-ico" aria-hidden="true">🎟️</span>Mis entradas</a>') : ''}
      </nav>
      <div class="header-actions site-actions">
        ${u ? raw(html`
          <a class="btn btn-sm btn-ghost hide-sm" href="#/mis-entradas">🎟️ Mis entradas</a>
          <div class="rel"><button class="btn btn-ghost btn-icon icon-btn" id="bell" aria-label="Notificaciones" aria-expanded="false">🔔${unread ? raw(`<span class="dot">${unread}</span>`) : ''}</button>
            <div class="menu-pop" id="bellPop" hidden><div class="row between" style="padding:6px 10px"><b>Notificaciones</b>${unread ? raw('<button class="btn btn-sm btn-ghost" id="readAll">Marcar leídas</button>') : ''}</div>
              ${notes.length ? raw(notes.map(n => `<div class="notif ${n.read ? '' : 'unread'}">${escape(n.text)}<br><small class="muted">${ago(n.createdAt)}</small></div>`).join('')) : raw('<div class="empty">Sin notificaciones</div>')}</div></div>
          <div class="rel"><button class="btn btn-ghost btn-sm" id="userBtn" aria-expanded="false"><span class="avatar" style="--av:${u.color || 'var(--primary)'};--size:26px">${initials(u.name)}</span><span class="hide-sm">${u.name.split(' ')[0]}</span></button>
            <div class="menu-pop" id="userPop" hidden style="width:240px"><div style="padding:8px 12px"><b>${u.name}</b><br><small class="muted">${auth.roleName(u.role)}</small></div>
              <a class="item" href="#/mis-entradas">🎟️ Mis entradas</a>
              ${panel ? raw(`<a class="item" href="${panel}">🛠️ Ir a mi panel</a>`) : ''}
              <button class="item" id="logout">↩︎ Cerrar sesión</button></div></div>`)
        : raw(`<a class="btn btn-sm btn-primary" href="login.html?next=${encodeURIComponent('index.html' + location.hash)}">Ingresar</a>`)}
      </div>
    </div>
    <nav class="mobile-nav" aria-label="Categorías"><a class="chip" href="#/explorar">Todo</a><a class="chip" href="#/explorar?cat=conciertos">🎸 Conciertos</a><a class="chip" href="#/explorar?cat=teatro">🎭 Teatro</a><a class="chip" href="#/explorar?cat=deportes">🏆 Deportes</a><a class="chip" href="#/explorar?cat=conferencias">🎤 Conferencias</a>${u ? raw('<a class="chip" href="#/mis-entradas">🎟️ Mis entradas</a>') : ''}</nav>
  </div>`;
  const pop = (btn, el) => { $(btn)?.addEventListener('click', e => { e.stopPropagation(); const p = $(el); const open = p.hidden; document.querySelectorAll('.menu-pop').forEach(x => (x.hidden = true)); p.hidden = !open; $(btn).setAttribute('aria-expanded', String(open)); }); };
  pop('#bell', '#bellPop'); pop('#userBtn', '#userPop');
  $('#readAll')?.addEventListener('click', e => { e.stopPropagation(); notes.filter(n => !n.read).forEach(n => db.update('notifications', n.id, { read: true })); });
  $('#logout')?.addEventListener('click', () => { auth.logout(); location.hash = '#/'; header(); router.refresh(); });
  router?.highlight($('#header'));
}
document.addEventListener('click', e => { if (!e.target.closest('.menu-pop')) document.querySelectorAll('.menu-pop').forEach(x => (x.hidden = true)); });

function footer() {
  const s = settings();
  $('#footer').innerHTML = html`<div class="container footer-grid">
    <div class="stack" style="gap:8px"><a class="brand" href="#/"><span class="logo">${raw(LOGO)}</span>Tiquetera Volcán</a><p>Entradas para lo que te hace vibrar. Plataforma ficticia de demostración.</p></div>
    <div class="stack" style="gap:6px"><b>Explora</b><a href="#/explorar?cat=conciertos">Conciertos</a><a href="#/explorar?cat=teatro">Teatro</a><a href="#/explorar?cat=deportes">Deportes</a><a href="#/explorar?cat=conferencias">Conferencias</a></div>
    <div class="stack" style="gap:6px"><b>Para productoras</b><a href="productor.html">Portal productor</a><a href="acceso.html">App de acceso</a><a href="admin.html">Administración</a></div>
    <div class="stack" style="gap:6px"><b>Ayuda</b><span>${s.supportEmail}</span><span>Reembolsos hasta ${s.fees?.refundWindowDays || 7} días antes</span><span>Reventa oficial con tope de +${s.fees?.resaleCapPct || 10}%</span></div>
  </div>`;
}

const guardLogin = () => { if (!auth.current()) { location.href = `login.html?next=${encodeURIComponent('index.html' + location.hash)}`; return false; } return true; };

const wrap = fn => async (params, query) => { const h = await fn(params, query); handle = h && typeof h === 'object' ? h : null; };
const routes = {
  '/': () => renderHome(app),
  '/explorar': (_, q) => renderExplore(app, q),
  '/evento/:id': ({ id }) => renderEvent(app, id),
  '/evento/:id/entradas': ({ id }) => renderSeats(app, id),
  '/checkout': () => guardLogin() && renderCheckout(app),
  '/confirmacion/:id': ({ id }) => guardLogin() && renderConfirm(app, id),
  '/mis-entradas': () => guardLogin() && renderMyTickets(app),
  '/entrada/:id': ({ id }) => guardLogin() && renderPass(app, id)
};
const router = createRouter(Object.fromEntries(Object.entries(routes).map(([k, fn]) => [k, wrap(fn)])), {
  notFound: () => { app.innerHTML = '<section class="section"><div class="container empty"><span class="icon">🌋</span><h2>Página no encontrada</h2><a class="btn btn-primary" href="#/">Volver al inicio</a></div></section>'; },
  before: () => { handle?.destroy?.(); handle = null; return true; },
  after: cur => {
    header();
    if (cur.path !== lastPath) { window.scrollTo(0, 0); lastPath = cur.path; }
  }
});

// Refresco en vivo: cambios del admin / otra pestaña se reflejan al instante.
let t;
db.subscribe(() => {
  clearTimeout(t);
  t = setTimeout(() => {
    header(); footer();
    if (handle?.update) handle.update();
    else if (!handle?.static) router.refresh();
  }, 60);
});

cleanHolds();
footer();
router.start();
export { router };
