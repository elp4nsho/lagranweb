// Raíz de composición de una app: a partir de una configuración declarativa arma la base de
// datos, la autenticación, las páginas por rol y, en cada HTML, el panel (shell + menú por rol +
// rutas protegidas + refresco en vivo), el sitio público o el login. Opt-in: las apps antiguas
// siguen usando createDB/createAuth/createRouter directamente; ver ARCHITECTURE.md.
//
//   // js/app.js — se importa desde todas las páginas
//   export const app = defineApp({
//     name: 'demo', version: 1, seed,
//     brand: { name: 'Mi Sistema', logo: '◆' },
//     roles: { admin: 'Administrador', staff: 'Equipo', cliente: 'Cliente' },
//     pages: { 'admin.html': ['admin', 'staff'] },              // quién puede abrir cada página
//     home:  { admin: 'admin.html', staff: 'admin.html#/pedidos', cliente: 'index.html' },
//     settings: { tagline: 'Hola' }                               // valores por defecto de app.settings()
//   });
//   // js/admin.js
//   app.panel({ page: 'admin.html', sub: 'Administración', nav: [ { section: 'General' }, { id: '', label: 'Inicio', icon: '🏠', render } ] });
//   // js/login.js
//   app.login();

import { createDB } from './db.js';
import { createAuth } from './auth.js';
import { createRouter } from './router.js';
import { html, raw, escape, wireAdminShell, debounce, slug } from './ui.js';
import { userChip, emptyState, ensureKernelStyles } from './blocks.js';
import { loginPage, resetDemo } from './pages.js';

export function defineApp({ name, version = 1, seed = () => ({}), roles = {}, brand = {}, pages = {}, home = {}, settings = {}, plugins = [] } = {}) {
  if (!name) throw new Error('defineApp: falta name');
  ensureKernelStyles();
  const db = createDB(name, { version, seed });
  const auth = createAuth(db, { roles });
  const contributions = {}; // página → ítems de menú aportados por plugins

  const app = {
    name, version, db, auth, roles, brand: { name, ...brand }, pages, home,
    // ¿Ese rol puede abrir esa página? (páginas no declaradas = públicas)
    canOpen: (page, role) => !pages[page] || pages[page].includes(role),
    // Adónde va un usuario al entrar: home[rol] o la primera página que su rol puede abrir.
    homeFor(user) {
      if (!user) return 'index.html';
      return home[user.role] || Object.keys(pages).find(p => pages[p].includes(user.role)) || 'index.html';
    },
    // Configuración editable del sitio (settingsSection la guarda en db 'settings').
    settings: () => ({ ...settings, ...(db.getValue('settings', {}) || {}) }),
    saveSettings: patch => db.setValue('settings', { ...(db.getValue('settings', {}) || {}), ...patch }),
    // Plugins: fn(app) o { install(app) }. Pueden aportar ítems de menú con app.contribute().
    use(plugin) { (typeof plugin === 'function' ? plugin : plugin.install)(app); return app; },
    contribute(page, items) { (contributions[page] ||= []).push(...[items].flat()); return app; },
    contributions: page => contributions[page] || [],
    panel: opts => mountPanel(app, opts),
    site: opts => mountSite(app, opts),
    login: opts => loginPage(app, opts)
  };
  plugins.forEach(p => app.use(p));
  return app;
}

// ---------- Panel por rol ----------
// nav: lista de ítems
//   { section: 'Título' }                                    separador (se oculta si queda vacío)
//   { id: 'pedidos', label, icon, roles?, render(view, ctx), // ruta #/pedidos (id '' = #/)
//     routes?: { ':id': render | { label, render } },         // subrutas #/pedidos/:id (heredan roles)
//     count?: () => n, watch?: ['orders'] }                    // contador en el menú · colecciones que refrescan la vista
//   { href: 'otra.html', label, icon, roles? }                 enlace externo
// ctx que recibe render: { app, db, auth, user, params, query, item, panel, refresh() }
// render puede devolver { refresh() } para actualizarse sin repintar (conserva filtros y búsqueda).
export function mountPanel(app, { page = location.pathname.split('/').pop() || 'admin.html', roles, el = '#app', sub = '', nav = [], topbar = '', siteHref = 'index.html', loginHref = 'login.html', reset = true, onRoute } = {}) {
  const { db, auth, brand } = app;
  const root = typeof el === 'string' ? document.querySelector(el) : el;
  const allowedRoles = roles || app.pages[page] || null;
  const user = auth.current();
  if (!user || user.active === false) {
    location.replace(`${loginHref}?next=${encodeURIComponent(page + location.hash)}`);
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const dest = app.homeFor(user);
    if (dest.split('#')[0] !== page) { location.replace(dest); return null; }
  }

  const can = it => !it.roles || it.roles.includes(auth.current()?.role);
  const all = [...nav, ...app.contributions(page)].filter(Boolean);
  // Quita ítems no permitidos y secciones que quedan vacías
  const items = [];
  let pending = null;
  all.forEach(it => {
    if (it.section) { pending = it; return; }
    if (!can(it) || it.hidden) return;
    if (pending) { items.push(pending); pending = null; }
    items.push(it);
  });
  const routed = all.filter(it => !it.section && it.render);
  const hrefOf = it => it.href || `#/${it.id}`;

  root.innerHTML = html`<div class="admin-shell">
    <aside class="admin-sidebar" aria-label="Menú principal">
      <a class="admin-brand" href="${siteHref}"><span class="logo" aria-hidden="true">${brand.logo || '◆'}</span><span>${brand.name}${sub ? html`<small>${sub}</small>` : ''}</span></a>
      <nav class="k-nav">${items.map(it => it.section ? html`<div class="nav-section">${it.section}</div>`
        : html`<a class="nav-link" href="${hrefOf(it)}" ${it.href ? raw('data-ext') : ''}><span class="ico" aria-hidden="true">${it.icon || '•'}</span><span>${it.label}</span>${it.count ? raw('<span class="count" hidden></span>') : ''}</a>`)}</nav>
      <div class="k-side-foot">
        ${userChip(user, auth.roleName)}
        <div class="k-foot-btns">${reset ? raw('<button type="button" class="btn btn-ghost btn-sm btn-icon" data-reset title="Restablecer datos demo" aria-label="Restablecer datos demo">↺</button>') : ''}<button type="button" class="btn btn-sm btn-icon" data-logout title="Cerrar sesión" aria-label="Cerrar sesión">⎋</button></div>
      </div>
    </aside>
    <div class="admin-main">
      <header class="admin-topbar">
        <button type="button" class="btn btn-icon admin-burger" aria-label="Abrir menú">☰</button>
        <span class="k-crumb" data-crumb></span>
        <div class="k-top-actions">${raw(topbar)}<a class="btn btn-ghost btn-sm k-hide-sm" href="${siteHref}">Ver sitio</a></div>
      </header>
      <main class="admin-content" id="view" tabindex="-1"></main>
    </div>
  </div>`;
  wireAdminShell(root.querySelector('.admin-shell'));
  const view = root.querySelector('#view');
  root.querySelector('[data-logout]').onclick = () => { auth.logout(); location.href = loginHref; };
  root.querySelector('[data-reset]')?.addEventListener('click', async () => { if (await resetDemo(app, { loginHref })) router.refresh(); });

  function paintCounts() {
    root.querySelectorAll('.k-nav .nav-link:not([data-ext])').forEach(a => {
      const it = items.find(x => !x.section && hrefOf(x) === a.getAttribute('href'));
      const c = a.querySelector('.count');
      if (it?.count && c) { const n = it.count(); c.hidden = !n; c.textContent = n || ''; }
    });
  }

  let active = null;
  async function show(it, render, label, params = {}, query = {}, isRefresh = false) {
    const u = auth.current();
    if (!u || u.active === false) { auth.logout(); location.href = loginHref; return; }
    root.querySelector('[data-crumb]').textContent = label;
    document.title = `${label} · ${brand.name}`;
    view.dataset.page = slug(it?.id || 'inicio');
    if (!can(it)) {
      active = null;
      view.innerHTML = emptyState({ icon: '🔒', title: 'Acceso restringido', text: `Tu rol (${auth.roleName(u.role)}) no tiene permiso para ver esta sección.`, action: `<a class="btn btn-primary" href="${escape(hrefOf(firstItem() || { id: '' }))}">Ir a mi inicio</a>` });
      return;
    }
    const ctx = { app, db, auth, user: u, params, query, item: it, panel, refresh: () => show(it, render, label, params, query, true) };
    view.replaceChildren();
    const out = await render(view, ctx);
    active = { it, ctx, out: out || {}, again: ctx.refresh };
    if (!isRefresh) window.scrollTo(0, 0);
    paintCounts();
    onRoute && onRoute(ctx);
  }
  const firstItem = () => items.find(x => !x.section && !x.href && x.render);

  const table = {};
  routed.forEach(it => {
    table['/' + it.id] = (p, q) => show(it, it.render, it.label, p, q);
    Object.entries(it.routes || {}).forEach(([k, r]) => {
      const sub = typeof r === 'function' ? { render: r } : r;
      table[`/${it.id}/${k}`.replace('//', '/')] = (p, q) => show(it, sub.render, sub.label || it.label, p, q);
    });
  });
  if (!table['/']) table['/'] = () => { const f = firstItem(); if (f) router.go('/' + f.id); };
  const router = createRouter(table, {
    notFound: () => { active = null; root.querySelector('[data-crumb]').textContent = 'No encontrado'; view.innerHTML = emptyState({ icon: '🧭', title: 'Sección no encontrada', action: '<a class="btn" href="#/">Ir al inicio</a>' }); },
    after: () => router.highlight(root.querySelector('.admin-sidebar'))
  });

  // Refresco en vivo: acumula cambios, no repinta bajo un modal ni mientras se escribe.
  const queued = new Set();
  const flush = debounce(() => {
    paintCounts();
    if (!active) { queued.clear(); return; }
    if (document.querySelector('.modal-backdrop')) return; // se reintenta al cerrar el modal
    const ae = document.activeElement;
    if (ae && view.contains(ae) && ae.matches('input:not([type=checkbox]):not([type=search]), textarea, select')) { queued.clear(); return; }
    const w = active.it.watch;
    const hit = queued.has('*') || !w || [...queued].some(c => w.includes(c));
    queued.clear();
    if (hit) active.out.refresh ? active.out.refresh() : active.again();
  }, 120);
  db.subscribe(ch => {
    const t = ch?.type;
    queued.add(t === 'reset' || t === 'sync' ? '*' : t === 'log' ? '_log' : t === 'value' ? ch.key : ch?.col);
    flush();
  });
  new MutationObserver(() => { if (!document.querySelector('.modal-backdrop') && queued.size) flush(); }).observe(document.body, { childList: true });

  const panel = { router, view, user, root, paintCounts, refresh: () => router.refresh(), go: p => router.go(p) };
  router.start();
  return panel;
}

// ---------- Sitio público ----------
// app.site({ nav: [['Inicio', '#/'], ['Planes', '#/planes']], routes: { '/': (view, ctx) => … }, footer })
// Usa las clases-gancho de layouts.css (site-header/site-brand/site-nav/site-actions/site-main/site-footer).
export function mountSite(app, { el = '#app', nav = [], routes = {}, actions = '', footer = '', loginHref = 'login.html', notFound } = {}) {
  const { db, auth, brand } = app;
  const root = typeof el === 'string' ? document.querySelector(el) : el;
  const paintHeader = () => {
    const u = auth.current();
    return html`<div class="container">
      <a class="site-brand" href="#/"><span class="logo" aria-hidden="true">${brand.logo || '◆'}</span><span>${brand.name}</span></a>
      <nav class="site-nav" aria-label="Secciones">${nav.map(([l, h]) => html`<a href="${h}">${l}</a>`)}</nav>
      <div class="site-actions">${raw(actions)}${u
        ? html`<a class="btn btn-sm btn-primary" href="${app.homeFor(u)}">Mi panel</a><button type="button" class="btn btn-sm btn-ghost" data-logout title="Salir (${u.name})">Salir</button>`
        : html`<a class="btn btn-sm btn-primary" href="${loginHref}">Ingresar</a>`}</div>
    </div>`;
  };
  root.innerHTML = html`<header class="site-header k-site-header"></header><main class="site-main" id="view"></main><footer class="site-footer k-site-footer"><div class="container">${raw(footer || `© ${new Date().getFullYear()} ${escape(brand.name)} · demo simulada en el navegador`)}</div></footer>`;
  const header = root.querySelector('.site-header'), view = root.querySelector('#view');
  let router = null;
  const drawHeader = () => { header.innerHTML = paintHeader(); router && router.highlight(header); };
  header.addEventListener('click', e => { if (e.target.closest('[data-logout]')) { auth.logout(); drawHeader(); router.refresh(); } });
  let current = null;
  const table = Object.fromEntries(Object.entries(routes).map(([p, fn]) => [p, async (params, query) => {
    const ctx = { app, db, auth, user: auth.current(), params, query, refresh: () => table[p](params, query) };
    current = { refresh: ctx.refresh };
    view.replaceChildren();
    const out = await fn(view, ctx);
    if (out?.refresh) current.refresh = out.refresh;
  }]));
  router = createRouter(table, {
    notFound: notFound || (() => { view.innerHTML = `<div class="container section">${emptyState({ icon: '🧭', title: 'Página no encontrada', action: '<a class="btn" href="#/">Ir al inicio</a>' })}</div>`; }),
    after: () => { router.highlight(header); window.scrollTo(0, 0); }
  });
  drawHeader();
  db.subscribe(debounce(() => {
    if (document.querySelector('.modal-backdrop')) return;
    const ae = document.activeElement;
    if (ae && view.contains(ae) && ae.matches('input, textarea, select')) return;
    drawHeader();
    current?.refresh();
  }, 150));
  router.start();
  return { router, view, header };
}
