// Estructura común de la app y la administración: barra lateral según permisos,
// búsqueda global, notificaciones, menú de usuario, guardas de ruta y recordatorios.
import { db, auth } from '../data/db.js';
import { $, $$, escape, html, raw, ago, toast, norm, wireAdminShell, debounce } from '../../../assets/core/ui.js';
import { can, visibleDeals, visibleLeads } from './perms.js';
import { icon } from './icons.js';
import { avatar } from './util.js';
import { runAutomations, notify } from './automation.js';

// Devuelve el usuario con sesión o redirige al login (sin lanzar errores).
export function currentUserOrRedirect() {
  const u = auth.current();
  if (u && u.active !== false) return u;
  if (u) auth.logout();
  const back = encodeURIComponent(location.pathname.split('/').pop() + location.hash);
  location.replace(`login.html?next=${back}`);
  return null;
}

export function mountShell({ nav, area, otherArea }) {
  const user = currentUserOrRedirect();
  if (!user) return null;
  const root = document.getElementById('app');
  root.innerHTML = `
  <div class="admin-shell">
    <aside class="admin-sidebar" aria-label="Navegación">
      <a class="admin-brand" href="index.html" title="Ver sitio público"><span class="logo">${icon('bolt', 18)}</span><span>Pulso <small class="brand-area">${escape(area)}</small></span></a>
      <nav class="side-nav" data-nav></nav>
      <div class="side-foot" data-foot></div>
    </aside>
    <div class="admin-main">
      <header class="admin-topbar">
        <button class="btn btn-ghost btn-icon admin-burger" aria-label="Abrir menú">${icon('menu')}</button>
        <div class="search topsearch">
          <span class="topsearch-ico">${icon('search', 16)}</span>
          <input class="input" type="search" placeholder="Buscar negocios, empresas, contactos…" aria-label="Búsqueda global" data-gsearch>
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

  const navEl = $('[data-nav]', root);
  function renderNav() {
    const u = auth.current();
    const items = [];
    let pendingSection = null;
    nav.forEach(n => {
      if (n.section) { pendingSection = n.section; return; }
      if (n.perm && !can(n.perm, u)) return;
      if (n.roles && !n.roles.includes(u.role)) return;
      if (pendingSection) { items.push(`<div class="nav-section">${escape(pendingSection)}</div>`); pendingSection = null; }
      const c = n.count ? n.count(u) : 0;
      items.push(`<a class="nav-link" href="${n.href}"><span class="ico">${icon(n.icon)}</span><span>${escape(n.label)}</span>${c ? `<span class="count">${c}</span>` : ''}</a>`);
    });
    navEl.innerHTML = items.join('');
    highlight();
    $('[data-foot]', root).innerHTML = html`
      ${otherArea && (!otherArea.perm || can(otherArea.perm, u)) ? raw(`<a class="nav-link" href="${otherArea.href}"><span class="ico">${icon(otherArea.icon)}</span><span>${escape(otherArea.label)}</span></a>`) : ''}
      <a class="nav-link" href="index.html" target="_blank" rel="noopener"><span class="ico">${raw(icon('globe'))}</span><span>Ver sitio público</span></a>`;
  }
  function highlight() {
    const h = location.hash || '#/';
    $$('.side-nav .nav-link', root).forEach(a => {
      const href = a.getAttribute('href');
      const on = href === '#/' ? (h === '#/' || h === '#') : h === href || h.startsWith(href + '/') || h.startsWith(href + '?');
      a.classList.toggle('active', on);
      on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
    });
  }

  // ----- Notificaciones -----
  const bell = $('[data-bell]', root), notifs = $('[data-notifs]', root);
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
  bell.addEventListener('click', e => { e.stopPropagation(); closeAll(notifs); notifs.hidden = !notifs.hidden; });
  notifs.addEventListener('click', e => {
    if (e.target.closest('[data-readall]')) { db.query('notifications', n => n.userId === user.id && !n.read).forEach(n => db.update('notifications', n.id, { read: true })); return; }
    const a = e.target.closest('[data-nid]');
    if (a) { db.update('notifications', a.dataset.nid, { read: true }); notifs.hidden = true; }
  });

  // ----- Menú de usuario -----
  const userBtn = $('[data-usermenu]', root), userPanel = $('[data-userpanel]', root);
  userPanel.innerHTML = html`<div class="dd-head stack" style="gap:2px"><b>${user.name}</b><small class="muted">${auth.roleName(user.role)} · ${user.email}</small></div>
    ${otherArea && (!otherArea.perm || can(otherArea.perm, user)) ? raw(`<a class="dd-item" href="${otherArea.href}">${icon(otherArea.icon, 16)} ${escape(otherArea.label)}</a>`) : ''}
    <a class="dd-item" href="index.html" target="_blank" rel="noopener">${raw(icon('globe', 16))} Ver sitio público</a>
    <button class="dd-item" data-logout>${raw(icon('logout', 16))} Cerrar sesión</button>`;
  userBtn.addEventListener('click', e => { e.stopPropagation(); closeAll(userPanel); userPanel.hidden = !userPanel.hidden; });
  userPanel.addEventListener('click', e => { if (e.target.closest('[data-logout]')) { auth.logout(); location.href = 'login.html'; } });

  // ----- Búsqueda global -----
  const gs = $('[data-gsearch]', root), gr = $('[data-gresults]', root);
  gs.addEventListener('input', debounce(() => {
    const q = norm(gs.value.trim());
    if (q.length < 2) { gr.hidden = true; return; }
    const res = [
      ...visibleDeals().filter(d => norm(d.title).includes(q)).slice(0, 5).map(d => ({ t: d.title, k: 'Negocio', href: `app.html#/negocios/${d.id}`, ico: 'kanban' })),
      ...db.query('companies', c => norm(c.name).includes(q)).slice(0, 4).map(c => ({ t: c.name, k: 'Empresa', href: `app.html#/empresas/${c.id}`, ico: 'building' })),
      ...db.query('contacts', c => norm(c.name + ' ' + c.email).includes(q)).slice(0, 4).map(c => ({ t: c.name, k: 'Contacto', href: `app.html#/contactos/${c.id}`, ico: 'user' })),
      ...visibleLeads().filter(l => norm(l.name + ' ' + l.company).includes(q)).slice(0, 4).map(l => ({ t: `${l.name} · ${l.company}`, k: 'Lead', href: `app.html#/leads/${l.id}`, ico: 'target' }))
    ];
    gr.innerHTML = res.length ? res.map(r => `<a class="dd-item" href="${r.href}">${icon(r.ico, 16)}<span>${escape(r.t)}</span><small class="muted">${r.k}</small></a>`).join('') : '<div class="empty small">Sin resultados</div>';
    gr.hidden = false;
  }, 150));
  gr.addEventListener('click', e => { if (e.target.closest('a')) { gr.hidden = true; gs.value = ''; } });

  function closeAll(except) { [notifs, userPanel, gr].forEach(p => { if (p !== except) p.hidden = true; }); }
  document.addEventListener('click', e => { if (!e.target.closest('.dd-wrap, .topsearch')) closeAll(); });

  renderNav(); renderBell();
  window.addEventListener('hashchange', highlight);
  db.subscribe(ch => {
    if (!auth.current() || auth.current().active === false) { location.replace('login.html'); return; }
    if (!ch || ['notifications', 'leads', 'activities', 'deals', 'users'].includes(ch.col) || ch.type === 'sync' || ch.type === 'reset' || ch.type === 'value') { renderBell(); renderNav(); }
  });
  startReminders(user);
  return { user, view: $('#view', root), renderNav };
}

// Página de "sin permiso" para rutas protegidas.
export function forbidden(view, what = 'esta sección') {
  view.innerHTML = `<div class="card empty"><span class="icon">${icon('shield', 40)}</span><h2>Acceso restringido</h2><p>Tu rol no tiene permiso para ver ${escape(what)}.</p><a class="btn btn-primary" href="#/">Volver al inicio</a></div>`;
}

// Recordatorios de tareas y reglas de "tarea vencida".
function startReminders(user) {
  const tick = () => {
    const now = Date.now();
    db.query('activities', a => a.ownerId === user.id && !a.done && !a.reminded && a.dueAt && new Date(a.dueAt) - (a.reminder || 0) * 60000 <= now).forEach(a => {
      db.update('activities', a.id, { reminded: true });
      toast(`Recordatorio: ${a.subject}`, 'warning', 6000);
      notify(user.id, `Recordatorio: ${a.subject}`, a.dealId ? `app.html#/negocios/${a.dealId}` : 'app.html#/tareas');
    });
    if (db.count('automations', x => x.active && x.trigger === 'task.overdue')) {
      db.query('activities', a => a.ownerId === user.id && a.type === 'tarea' && !a.done && !a.overdueFired && new Date(a.dueAt) < now).forEach(a => {
        db.update('activities', a.id, { overdueFired: true });
        runAutomations('task.overdue', a, 'activity');
      });
    }
  };
  setTimeout(tick, 1200);
  setInterval(tick, 20000);
}
