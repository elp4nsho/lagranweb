// Panel de redacción de Brújula: shell, permisos por rol, router y refresco en vivo.
import { createRouter } from '../../../assets/core/router.js';
import { $, escape, toast, confirm, wireAdminShell, debounce, norm } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth, STAFF, can, settings, promoteScheduled, authorOfUser } from '../data/db.js';
import { denied } from '../shared/admin-kit.js';
import dashboard from './dashboard.js';
import articles from './articles.js';
import taxonomy from './taxonomy.js';
import authors from './authors.js';
import comments from './comments.js';
import newsletter from './newsletter.js';
import ads from './ads.js';
import subscriptions from './subscriptions.js';
import users from './users.js';
import settingsSec from './settings.js';
import activity from './activity.js';

let user = auth.current();
if (!user || user.active === false || !STAFF.includes(user.role)) {
  location.replace(`login.html?next=${encodeURIComponent('admin.html' + location.hash)}`);
  await new Promise(() => {}); // detiene el módulo mientras redirige
}
promoteScheduled();

const SECTIONS = [dashboard, articles, taxonomy, authors, comments, newsletter, ads, subscriptions, users, settingsSec, activity];
const GROUPS = ['Redacción', 'Audiencia', 'Negocio', 'Sistema'];
const sidebar = $('#sidebar'), topbar = $('#topbar'), content = $('#content');
let router, current = null;

function counts() {
  const mine = authorOfUser(user)?.id;
  return {
    articles: ['admin', 'editor'].includes(user.role) ? db.count('articles', a => a.status === 'review') : db.count('articles', a => a.authorId === mine && a.status === 'draft'),
    comments: db.count('comments', c => c.status === 'pending')
  };
}

function renderSidebar() {
  const c = counts();
  sidebar.innerHTML = `<a class="admin-brand" href="#/"><span class="logo" aria-hidden="true">✦</span><span>${escape(settings().name)}</span></a>
    ${GROUPS.map(g => { const items = SECTIONS.filter(x => x.group === g && can(user, x.perm)); return items.length ? `<div class="nav-section">${g}</div>${items.map(x => `<a class="nav-link" href="#${x.path}"><span class="ico" aria-hidden="true">${x.icon}</span>${escape(x.label)}${c[x.id] ? `<span class="count" title="${x.id === 'articles' ? 'Pendientes' : 'Por moderar'}">${c[x.id]}</span>` : ''}</a>`).join('')}` : ''; }).join('')}
    <div class="sidebar-foot stack" style="gap:8px"><a class="btn btn-sm btn-block" href="index.html" target="_blank" rel="noopener">↗ Ver sitio público</a><span class="muted">Rol: <b>${escape(auth.roleName(user.role))}</b></span></div>`;
  router && router.highlight(sidebar);
}

function notifications() {
  const out = [];
  if (['admin', 'editor'].includes(user.role)) {
    db.query('articles', a => a.status === 'review').forEach(a => out.push({ at: a.updatedAt || a.createdAt, text: `Para revisar: ${a.title}`, href: `#/articulos/${a.id}` }));
    db.query('comments', c => c.status === 'pending').slice(0, 5).forEach(c => out.push({ at: c.createdAt, text: `Comentario de ${c.name} por moderar`, href: '#/comentarios' }));
  } else {
    const mine = authorOfUser(user)?.id;
    db.query('articles', a => a.authorId === mine && a.editorNote && a.status === 'draft').forEach(a => out.push({ at: a.updatedAt || a.createdAt, text: `Nota de edición en: ${a.title}`, href: `#/articulos/${a.id}` }));
  }
  return out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

function renderTopbar() {
  const n = notifications();
  topbar.innerHTML = `<button class="btn btn-ghost btn-icon admin-burger" aria-label="Menú">☰</button>
    <div class="search"><input class="input" type="search" placeholder="Buscar artículos, autores, usuarios…" aria-label="Búsqueda global" data-gsearch><div class="search-results" hidden data-gres></div></div>
    <span class="spacer"></span>
    <a class="btn btn-primary btn-sm hide-sm" href="#/articulos/nuevo">＋ Nuevo artículo</a>
    <div class="pop"><button class="btn btn-ghost btn-icon" data-pop="bell" aria-label="Notificaciones (${n.length})" style="position:relative">🔔${n.length ? `<span class="bell-count">${n.length}</span>` : ''}</button>
      <div class="pop-panel" hidden data-panel="bell"><b style="display:block;padding:6px 10px">Notificaciones</b>${n.slice(0, 8).map(x => `<a href="${x.href}">${escape(x.text)}</a>`).join('') || '<p class="muted small" style="padding:10px">Todo al día ✓</p>'}</div></div>
    <div class="pop"><button class="btn btn-ghost user-chip" data-pop="user" aria-label="Menú de usuario"><span class="avatar" style="--av:${escape(user.color || 'var(--primary)')};--size:30px">${escape(initials(user.name))}</span><span class="who"><b>${escape(user.name)}</b><small class="muted">${escape(auth.roleName(user.role))}</small></span></button>
      <div class="pop-panel" hidden data-panel="user"><a href="index.html" target="_blank" rel="noopener">↗ Ver sitio</a><a href="index.html#/cuenta">☺ Mi cuenta de lector</a><a href="#" data-reset>↺ Restablecer datos demo</a><a href="#" data-logout>⎋ Cerrar sesión</a></div></div>`;
}

topbar.addEventListener('click', e => {
  const pop = e.target.closest('[data-pop]');
  topbar.querySelectorAll('[data-panel]').forEach(p => { p.hidden = !pop || p.dataset.panel !== pop.dataset.pop || !p.hidden; });
  if (e.target.closest('[data-logout]')) { e.preventDefault(); auth.logout(); location.href = 'login.html'; }
  if (e.target.closest('[data-reset]')) { e.preventDefault(); resetDemo(); }
  if (e.target.closest('[data-gres] a')) { topbar.querySelector('[data-gres]').hidden = true; topbar.querySelector('[data-gsearch]').value = ''; }
});
document.addEventListener('click', e => {
  if (!e.target.closest('.pop')) topbar.querySelectorAll('[data-panel]').forEach(p => (p.hidden = true));
  if (!e.target.closest('.search')) { const r = topbar.querySelector('[data-gres]'); if (r) r.hidden = true; }
});
topbar.addEventListener('input', debounce(e => {
  if (!e.target.matches('[data-gsearch]')) return;
  const q = norm(e.target.value.trim()), box = topbar.querySelector('[data-gres]');
  if (q.length < 2) { box.hidden = true; return; }
  const res = [];
  const add = (perm, list, label, href, kind) => { if (!can(user, perm)) return; list.filter(x => norm(label(x)).includes(q)).slice(0, 6).forEach(x => res.push({ t: label(x), href: href(x), kind })); };
  add('articles', db.all('articles'), a => a.title, a => `#/articulos/${a.id}`, 'Artículo');
  add('authors', db.all('authors'), a => a.name, () => '#/autores', 'Autor');
  add('users', db.query('users', u => u.role !== 'lector'), u => `${u.name} · ${u.email}`, () => '#/usuarios', 'Usuario');
  add('newsletter', db.all('subscribers'), s => s.email, () => '#/newsletter', 'Suscriptor');
  box.innerHTML = res.length ? res.map(r => `<a href="${r.href}"><span>${escape(r.t)}</span><small class="muted">${r.kind}</small></a>`).join('') : '<p class="muted small" style="padding:8px">Sin resultados</p>';
  box.hidden = false;
}, 150));

export async function resetDemo() {
  if (!await confirm('Se borrarán todos los cambios y se restaurarán los datos de ejemplo. ¿Continuar?', { title: 'Restablecer datos demo', ok: 'Restablecer', danger: true })) return;
  const uid = user.id;
  db.reset();
  if (!db.get('users', uid)) { auth.logout(); location.href = 'login.html'; return; }
  auth.loginAs(uid);
  db.log('reset', 'Datos demo restablecidos', uid);
  toast('Datos demo restablecidos', 'success');
}

const ctx = { get user() { return user; }, can: p => can(user, p), go: p => router.go(p), refresh: () => router.refresh(), resetDemo };

function makeRoute(sec) {
  return (params, query) => {
    current = sec;
    if (!can(user, sec.perm)) {
      content.replaceChildren(); content.innerHTML = denied(`Tu rol (${auth.roleName(user.role)}) no tiene acceso a “${sec.label}”.`);
      document.title = 'Acceso restringido · Redacción';
      toast('No tienes permisos para esa sección', 'error');
      return;
    }
    document.title = `${sec.label} · Redacción ${settings().name}`;
    const page = document.createElement('div');
    page.className = 'admin-page';
    content.replaceChildren(page);
    sec.render(page, ctx, params, query);
  };
}
const routes = { '/': makeRoute(dashboard) };
SECTIONS.forEach(s => { routes[s.path] = makeRoute(s); routes[s.path + '/:id'] = makeRoute(s); });
router = createRouter(routes, {
  notFound: () => { current = null; content.innerHTML = `<div class="card empty"><h2>Sección no encontrada</h2><a class="btn btn-primary" href="#/">Ir al escritorio</a></div>`; },
  after: () => router.highlight(sidebar)
});

renderSidebar(); renderTopbar(); wireAdminShell(); router.start();

const live = debounce(change => {
  const fresh = db.get('users', user.id);
  if (!fresh || fresh.active === false || !STAFF.includes(fresh.role)) { auth.logout(); location.href = 'login.html'; return; }
  const roleChanged = fresh.role !== user.role;
  user = fresh;
  renderSidebar(); if (!topbar.contains(document.activeElement)) renderTopbar();
  if (document.querySelector('.modal-backdrop')) return;
  if (current && current.live === false && change.type !== 'reset' && !roleChanged) return;
  const y = window.scrollY;
  router.refresh();
  requestAnimationFrame(() => window.scrollTo(0, y));
}, 80);
db.subscribe(ch => { if (ch.type !== 'log') live(ch); });
setInterval(promoteScheduled, 30000);
