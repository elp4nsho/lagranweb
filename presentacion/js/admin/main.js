// Panel de Estudio Nébula: shell, navegación por permisos, router y refresco en vivo.
import { createRouter } from '../../../assets/core/router.js';
import { $, escape, toast, confirm, wireAdminShell, debounce, norm } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth, STAFF, can, settings } from '../data/db.js';
import { denied } from '../shared/admin-kit.js';
import dashboard from './dashboard.js';
import pages from './pages.js';
import projects from './projects.js';
import team from './team.js';
import testimonials from './testimonials.js';
import posts from './posts.js';
import media from './media.js';
import leads from './leads.js';
import jobs from './jobs.js';
import applicants from './applicants.js';
import settingsSec from './settings.js';
import users from './users.js';
import activity from './activity.js';

// Guardia de sesión (sin lanzar el error 'auth-redirect' de auth.require, que ensucia la consola).
let user = auth.current();
if (!user || user.active === false || !STAFF.includes(user.role)) {
  location.replace(`login.html?next=${encodeURIComponent('admin.html' + location.hash)}`);
  await new Promise(() => {}); // detiene el módulo mientras se redirige
}

const SECTIONS = [dashboard, pages, projects, team, testimonials, posts, media, leads, jobs, applicants, settingsSec, users, activity];
const GROUPS = ['General', 'Contenido', 'Comercial', 'Talento', 'Sistema'];
const sidebar = $('#sidebar'), topbar = $('#topbar'), content = $('#content');
let router;

const counts = () => ({
  leads: db.count('leads', l => l.status === 'nuevo'),
  applicants: db.count('applications', a => a.status === 'nuevo')
});

function renderSidebar() {
  const c = counts(), s = settings();
  sidebar.innerHTML = `<a class="admin-brand" href="#/"><span class="logo" aria-hidden="true">◉</span><span>${escape(s.name || 'Nébula')}</span></a>
    ${GROUPS.map(g => {
      const items = SECTIONS.filter(x => x.group === g && can(user, x.perm));
      if (!items.length) return '';
      return `<div class="nav-section">${g}</div>${items.map(x => `<a class="nav-link" href="#${x.path}"><span class="ico" aria-hidden="true">${x.icon}</span>${escape(x.label)}${c[x.id] ? `<span class="count">${c[x.id]}</span>` : ''}</a>`).join('')}`;
    }).join('')}
    <div class="sidebar-foot stack" style="gap:8px">
      <a class="btn btn-sm btn-block" href="index.html" target="_blank" rel="noopener">↗ Ver sitio público</a>
      <span class="muted">Rol: <b>${escape(auth.roleName(user.role))}</b></span>
    </div>`;
  router && router.highlight(sidebar);
}

function notifications() {
  return [
    ...db.query('leads', l => l.status === 'nuevo').map(l => ({ at: l.createdAt, text: `${l.type === 'cotizacion' ? 'Cotización' : 'Contacto'}: ${l.name} (${l.company || '—'})`, href: `#/leads/${l.id}`, perm: 'leads' })),
    ...db.query('applications', a => a.status === 'nuevo').map(a => ({ at: a.createdAt, text: `Postulación: ${a.name}`, href: `#/postulantes/${a.id}`, perm: 'applicants' }))
  ].filter(n => can(user, n.perm)).sort((a, b) => b.at.localeCompare(a.at));
}

function renderTopbar() {
  const n = notifications();
  topbar.innerHTML = `<button class="btn btn-ghost btn-icon admin-burger" aria-label="Menú">☰</button>
    <div class="search"><input class="input" type="search" placeholder="Buscar proyectos, leads, personas…" aria-label="Búsqueda global" data-gsearch><div class="search-results" hidden data-gres></div></div>
    <span class="spacer"></span>
    <div class="pop"><button class="btn btn-ghost btn-icon" data-pop="bell" aria-label="Notificaciones (${n.length})" style="position:relative">🔔${n.length ? `<span class="bell-count">${n.length}</span>` : ''}</button>
      <div class="pop-panel" hidden data-panel="bell"><b style="display:block;padding:6px 10px">Notificaciones</b>${n.slice(0, 8).map(x => `<a href="${x.href}">${escape(x.text)}</a>`).join('') || '<p class="muted small" style="padding:10px">Todo al día ✓</p>'}</div></div>
    <div class="pop"><button class="btn btn-ghost user-chip" data-pop="user" aria-label="Menú de usuario"><span class="avatar" style="--av:${escape(user.color || 'var(--primary)')};--size:30px">${escape(initials(user.name))}</span><span class="who"><b>${escape(user.name)}</b><small class="muted">${escape(auth.roleName(user.role))}</small></span></button>
      <div class="pop-panel" hidden data-panel="user"><a href="index.html" target="_blank" rel="noopener">↗ Ver sitio</a>${can(user, 'settings') ? '<a href="#/ajustes">⚙ Ajustes</a>' : ''}<a href="#" data-reset>↺ Restablecer datos demo</a><a href="#" data-logout>⎋ Cerrar sesión</a></div></div>`;
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

export async function resetDemo() {
  if (!await confirm('Se borrarán todos los cambios y se restaurarán los datos de ejemplo. ¿Continuar?', { title: 'Restablecer datos demo', ok: 'Restablecer', danger: true })) return;
  const uid = user.id;
  db.reset();
  if (!db.get('users', uid)) { auth.logout(); location.href = 'login.html'; return; }
  auth.loginAs(uid);
  db.log('reset', 'Datos demo restablecidos', uid);
  toast('Datos demo restablecidos', 'success');
}

// Búsqueda global
topbar.addEventListener('input', debounce(e => {
  if (!e.target.matches('[data-gsearch]')) return;
  const q = norm(e.target.value.trim()), box = topbar.querySelector('[data-gres]');
  if (q.length < 2) { box.hidden = true; return; }
  const res = [];
  const add = (perm, list, label, href, kind) => { if (!can(user, perm)) return; list.filter(x => norm(label(x)).includes(q)).slice(0, 5).forEach(x => res.push({ t: label(x), href: href(x), kind })); };
  add('projects', db.all('projects'), p => `${p.title} · ${p.client}`, p => `#/proyectos/${p.id}`, 'Proyecto');
  add('leads', db.all('leads'), l => `${l.name} · ${l.company || ''}`, l => `#/leads/${l.id}`, 'Lead');
  add('applicants', db.all('applications'), a => a.name, a => `#/postulantes/${a.id}`, 'Postulante');
  add('team', db.all('team'), t => t.name, () => '#/equipo', 'Equipo');
  add('posts', db.all('posts'), b => b.title, b => `#/blog/${b.id}`, 'Artículo');
  add('users', db.all('users'), u => `${u.name} · ${u.email}`, () => '#/usuarios', 'Usuario');
  box.innerHTML = res.length ? res.map(r => `<a href="${r.href}"><span>${escape(r.t)}</span><small class="muted">${r.kind}</small></a>`).join('') : '<p class="muted small" style="padding:8px">Sin resultados</p>';
  box.hidden = false;
}, 150));

const ctx = {
  get user() { return user; },
  can: perm => can(user, perm),
  go: path => router.go(path),
  refresh: () => router.refresh(),
  resetDemo
};

let current = null;
function makeRoute(sec) {
  return params => {
    current = sec;
    if (!can(user, sec.perm)) {
      content.replaceChildren(); content.innerHTML = denied(`Tu rol (${auth.roleName(user.role)}) no tiene acceso a “${sec.label}”.`);
      document.title = `Acceso restringido · Panel`;
      toast('No tienes permisos para esa sección', 'error');
      return;
    }
    document.title = `${sec.label} · Panel ${settings().name}`;
    const page = document.createElement('div');
    page.className = 'admin-page';
    content.replaceChildren(page);
    sec.render(page, ctx, params);
  };
}
const routes = { '/': makeRoute(dashboard) };
SECTIONS.forEach(s => { routes[s.path] = makeRoute(s); routes[s.path + '/:id'] = makeRoute(s); });
router = createRouter(routes, {
  notFound: () => { current = null; content.innerHTML = `<div class="card empty"><h2>Sección no encontrada</h2><a class="btn btn-primary" href="#/">Ir al escritorio</a></div>`; },
  after: () => { router.highlight(sidebar); }
});

renderSidebar();
renderTopbar();
wireAdminShell();
router.start();

// Refresco en vivo: cambios locales u otra pestaña.
const live = debounce(change => {
  const fresh = db.get('users', user.id);
  if (!fresh || fresh.active === false || !STAFF.includes(fresh.role)) { auth.logout(); location.href = 'login.html'; return; }
  const roleChanged = fresh.role !== user.role;
  user = fresh;
  const typingTop = topbar.contains(document.activeElement);
  renderSidebar(); if (!typingTop) renderTopbar();
  if (document.querySelector('.modal-backdrop')) return;
  if (current && current.live === false && change.type !== 'reset' && !roleChanged) return;
  const y = window.scrollY;
  router.refresh();
  requestAnimationFrame(() => window.scrollTo(0, y));
}, 60);
db.subscribe(ch => { if (ch.type !== 'log') live(ch); });
