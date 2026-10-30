// Estructura común de la consola de agentes y la administración: menú según rol, búsqueda global,
// notificaciones, menú de usuario y página de "acceso restringido".
import { db, auth, homeFor } from '../data/db.js';
import { $, $$, escape, html, raw, ago, norm, wireAdminShell, debounce } from '../../../assets/core/ui.js';
import { can } from './perms.js';
import { icon } from './icons.js';
import { avatar, requester } from './util.js';

// Devuelve el usuario si su rol está permitido; si no, redirige (sin lanzar errores).
export function currentUserOrRedirect(roles) {
  const u = auth.current();
  if (u && u.active !== false && (!roles || roles.includes(u.role))) return u;
  if (u && u.active === false) auth.logout();
  if (u && u.active !== false) { location.replace(homeFor(u)); return null; }
  location.replace(`login.html?next=${encodeURIComponent(location.pathname.split('/').pop() + location.hash)}`);
  return null;
}

export function mountShell({ nav, area, roles, links = [] }) {
  const user = currentUserOrRedirect(roles);
  if (!user) return null;
  const root = document.getElementById('app');
  root.innerHTML = `
  <div class="admin-shell">
    <aside class="admin-sidebar" aria-label="Navegación">
      <a class="admin-brand" href="index.html" title="Centro de ayuda"><span class="logo">${icon('chat', 18)}</span><span>Atiende <small class="brand-area">${escape(area)}</small></span></a>
      <nav class="side-nav" data-nav></nav>
      <div class="side-foot" data-foot></div>
    </aside>
    <div class="admin-main">
      <header class="admin-topbar">
        <button class="btn btn-ghost btn-icon admin-burger" aria-label="Abrir menú">${icon('menu')}</button>
        <div class="search topsearch">
          <span class="topsearch-ico">${icon('search', 16)}</span>
          <input class="input" type="search" placeholder="Buscar ticket #, cliente o artículo…" aria-label="Búsqueda global" data-gsearch>
          <div class="dropdown search-results" data-gresults hidden></div>
        </div>
        <div class="topbar-actions">
          <div class="dd-wrap">
            <button class="btn btn-ghost btn-icon bell" aria-label="Notificaciones" data-bell>${icon('bell')}<span class="bell-dot" data-bellcount hidden></span></button>
            <div class="dropdown notif-panel" data-notifs hidden></div>
          </div>
          <div class="dd-wrap">
            <button class="user-btn" data-usermenu aria-label="Menú de usuario">${avatar(user, 32)}<span class="user-btn-name">${escape(user.name.split(' ')[0])}</span></button>
            <div class="dropdown user-panel" data-userpanel hidden></div>
          </div>
        </div>
      </header>
      <main class="admin-content" id="view" tabindex="-1"></main>
    </div>
  </div>`;
  wireAdminShell(root.querySelector('.admin-shell'));
  const visibleLinks = () => links.filter(l => !l.perm || can(l.perm));

  const navEl = $('[data-nav]', root);
  function renderNav() {
    const u = auth.current();
    if (!u) return;
    const items = [];
    let pending = null;
    nav.forEach(n => {
      if (n.section) { pending = n.section; return; }
      if (n.perm && !can(n.perm, u)) return;
      if (pending) { items.push(`<div class="nav-section">${escape(pending)}</div>`); pending = null; }
      const c = n.count ? n.count(u) : 0;
      items.push(`<a class="nav-link" href="${n.href}"><span class="ico">${icon(n.icon)}</span><span>${escape(n.label)}</span>${c ? `<span class="count">${c}</span>` : ''}</a>`);
    });
    navEl.innerHTML = items.join('');
    highlight();
    $('[data-foot]', root).innerHTML = visibleLinks().map(l => `<a class="nav-link" href="${l.href}" ${l.blank ? 'target="_blank" rel="noopener"' : ''}><span class="ico">${icon(l.icon)}</span><span>${escape(l.label)}</span></a>`).join('');
  }
  function highlight() {
    const h = location.hash || '#/';
    const base = h.split('?')[0];
    $$('.side-nav .nav-link', root).forEach(a => {
      const href = a.getAttribute('href');
      const on = href.includes('?') ? h === href : href === '#/' ? (base === '#/' || base === '#') && !h.includes('vista=') : base === href || base.startsWith(href + '/');
      a.classList.toggle('active', on);
      on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
    });
  }

  // Notificaciones
  const notifs = $('[data-notifs]', root);
  function renderBell() {
    const u = auth.current();
    if (!u) return;
    const list = db.query('notifications', n => n.userId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 12);
    const unread = list.filter(n => !n.read).length;
    const dot = $('[data-bellcount]', root);
    dot.hidden = !unread; dot.textContent = unread;
    notifs.innerHTML = `<div class="dd-head"><b>Notificaciones</b>${unread ? '<button class="btn btn-ghost btn-sm" data-readall>Marcar leídas</button>' : ''}</div>` +
      (list.length ? list.map(n => `<a class="dd-item ${n.read ? '' : 'unread'}" href="${escape(n.link || '#/')}" data-nid="${n.id}"><span>${escape(n.text)}</span><small class="muted">${ago(n.createdAt)}</small></a>`).join('') : '<div class="empty small">Sin notificaciones</div>');
  }
  $('[data-bell]', root).addEventListener('click', e => { e.stopPropagation(); closeAll(notifs); notifs.hidden = !notifs.hidden; });
  notifs.addEventListener('click', e => {
    if (e.target.closest('[data-readall]')) { db.query('notifications', n => n.userId === user.id && !n.read).forEach(n => db.update('notifications', n.id, { read: true })); return; }
    const a = e.target.closest('[data-nid]');
    if (a) { db.update('notifications', a.dataset.nid, { read: true }); notifs.hidden = true; }
  });

  // Menú de usuario
  const userPanel = $('[data-userpanel]', root);
  userPanel.innerHTML = html`<div class="dd-head stack" style="gap:2px"><b>${user.name}</b><small class="muted">${auth.roleName(user.role)} · ${user.email}</small></div>
    ${raw(visibleLinks().map(l => `<a class="dd-item" href="${l.href}">${icon(l.icon, 16)} ${escape(l.label)}</a>`).join(''))}
    <button class="dd-item" data-logout>${raw(icon('logout', 16))} Cerrar sesión</button>`;
  $('[data-usermenu]', root).addEventListener('click', e => { e.stopPropagation(); closeAll(userPanel); userPanel.hidden = !userPanel.hidden; });
  userPanel.addEventListener('click', e => { if (e.target.closest('[data-logout]')) { auth.logout(); location.href = 'login.html'; } });

  // Búsqueda global
  const gs = $('[data-gsearch]', root), gr = $('[data-gresults]', root);
  gs.addEventListener('input', debounce(() => {
    const q = norm(gs.value.trim().replace(/^#/, ''));
    if (q.length < 2) { gr.hidden = true; return; }
    const res = [
      ...db.query('tickets', t => String(t.number).includes(q) || norm(t.subject).includes(q)).slice(0, 6).map(t => ({ t: `#${t.number} · ${t.subject}`, k: requester(t)?.name || '', href: `agente.html#/ticket/${t.id}`, ico: 'inbox' })),
      ...db.query('users', u => u.role === 'cliente' && norm(u.name + ' ' + u.email + ' ' + (u.rut || '')).includes(q)).slice(0, 4).map(u => ({ t: u.name, k: 'Cliente', href: `agente.html#/clientes/${u.id}`, ico: 'user' })),
      ...db.query('articles', a => norm(a.title).includes(q)).slice(0, 4).map(a => ({ t: a.title, k: 'Artículo', href: can('kb.edit') ? `admin.html#/articulos/${a.id}` : `index.html#/articulo/${a.id}`, ico: 'book' }))
    ];
    gr.innerHTML = res.length ? res.map(r => `<a class="dd-item" href="${r.href}">${icon(r.ico, 16)}<span>${escape(r.t)}</span><small class="muted">${escape(r.k)}</small></a>`).join('') : '<div class="empty small">Sin resultados</div>';
    gr.hidden = false;
  }, 150));
  gr.addEventListener('click', e => { if (e.target.closest('a')) { gr.hidden = true; gs.value = ''; } });
  function closeAll(except) { [notifs, userPanel, gr].forEach(p => { if (p !== except) p.hidden = true; }); }
  document.addEventListener('click', e => { if (!e.target.closest('.dd-wrap, .topsearch')) closeAll(); });

  renderNav(); renderBell();
  window.addEventListener('hashchange', highlight);
  db.subscribe(ch => {
    const u = auth.current();
    if (!u || u.active === false || (roles && !roles.includes(u.role))) { location.replace(u ? homeFor(u) : 'login.html'); return; }
    if (ch.type !== 'log') { renderBell(); renderNav(); }
  });
  return { user, view: $('#view', root), renderNav };
}

export function forbidden(view, what = 'esta sección') {
  view.innerHTML = `<div class="card empty"><span class="icon">${icon('shield', 40)}</span><h2>Acceso restringido</h2><p>Tu rol no tiene permiso para ver ${escape(what)}.</p><a class="btn btn-primary" href="#/">Volver al inicio</a></div>`;
}
export const pageHead = (title, sub = '', actions = '') => `<div class="page-head"><div><h1>${escape(title)}</h1>${sub ? `<p class="muted" style="margin:4px 0 0">${sub}</p>` : ''}</div><div class="row page-actions">${actions}</div></div>`;
export const kpi = (label, value, sub = '', cls = '') => `<div class="card kpi"><div class="stat"><span class="label">${escape(label)}</span><span class="value">${value}</span>${sub ? `<span class="delta ${cls}">${sub}</span>` : ''}</div></div>`;
