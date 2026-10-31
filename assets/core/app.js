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

import { createDB, rng } from './db.js';
import { createAuth } from './auth.js';
import { createRouter } from './router.js';
import { html, raw, escape, wireAdminShell, debounce, slug, toast } from './ui.js';
import { userChip, emptyState, ensureKernelStyles } from './blocks.js';
import { loginPage, resetDemo } from './pages.js';
import { resolveModules, mergeModules, blockedPages, modulesKey } from './modules.js';
import { applyClient } from './client.js';

// Opciones nuevas (todas opcionales; sin ellas la app funciona exactamente como antes):
//   modules: [módulo, …]   ver modules.js · enabled: ['agenda', …] (por defecto todos; el base siempre)
//   client:  configuración del cliente (client.js → defineClient): marca, módulos, modo, textos
//   mode:    'demo' (cuentas demo, "Restablecer datos demo") | 'production' (nada de eso)
//   adapter: motor de datos (store/local.js por defecto, store/supabase.js para backend real)
export function defineApp({ name, version = 1, seed = () => ({}), roles = {}, brand = {}, pages = {}, home = {}, settings = {}, plugins = [], modules = null, enabled, client = null, mode, adapter = null } = {}) {
  if (!name) throw new Error('defineApp: falta name');
  ensureKernelStyles();
  mode = mode || client?.mode || 'demo';
  const production = mode === 'production';
  const all = modules || [];
  const res = resolveModules(all, enabled !== undefined ? enabled : client?.modules ?? null);
  if (res.unknown.length) console.warn('[módulos] desconocidos:', res.unknown.join(', '));
  const active = modules ? res.active : [];
  const on = new Set(active.map(m => m.id));
  const merged = mergeModules(active);
  roles = { ...roles, ...merged.roles };
  for (const [p, rs] of Object.entries(merged.pages)) pages = { ...pages, [p]: [...new Set([...(pages[p] || []), ...rs])] };
  home = { ...home, ...merged.home };
  settings = { ...settings, ...merged.settings, ...(client?.settings || {}) };
  brand = { ...brand, ...(client?.brand || {}) };
  const blocked = new Set(modules ? blockedPages(all, active) : []);
  const dbName = client?.slug ? `${name}--${client.slug}` : name;
  const dbVersion = modules ? `${version}|${modulesKey(res.ids)}|${mode}|${client?.data || 'demo'}` : version;

  // Semilla: la de la app + la de cada módulo activo (en orden de dependencias). En producción con
  // data: 'empty' quedan solo los catálogos (colecciones `catalog` de los módulos) y las cuentas del cliente.
  const fullSeed = () => {
    const out = { ...(seed() || {}) };
    const ctx = { has: id => on.has(id), data: out, rng, mode, client };
    for (const m of active) {
      const part = m.seed ? m.seed(ctx) || {} : {};
      for (const [k, v] of Object.entries(part)) out[k] = Array.isArray(v) && Array.isArray(out[k]) ? [...out[k], ...v] : v;
    }
    if (!production) return out;
    const accounts = (client?.accounts || []).map((a, i) => ({ id: a.id || 'u-' + slug(a.email || 'admin' + i), active: true, color: '#4f46e5', ...a, demo: false }));
    if ((client?.data || 'empty') === 'demo') return { ...out, users: [...accounts, ...(out.users || []).map(u => ({ ...u, demo: false }))] };
    const keep = new Set(active.flatMap(m => m.catalog || []));
    const clean = {};
    for (const [k, v] of Object.entries(out)) if (!Array.isArray(v) || keep.has(k)) clean[k] = v;
    clean._log = [];
    clean.users = accounts;
    return clean;
  };
  adapter?.configure?.({ app: dbName, collections: merged.collections, modules: res.ids });
  const db = createDB(dbName, { version: dbVersion, seed: modules ? fullSeed : seed, adapter });
  const auth = createAuth(db, { roles, demo: !production });
  const contributions = {}; // clave → ítems aportados por plugins y módulos (página, 'kpis', 'site:nav'…)
  let installing = null;
  if (client) applyClient(client);
  if (typeof document !== 'undefined') document.documentElement.dataset.mode = mode;
  // Errores de escritura remota (RLS, red): se avisan; el adaptador ya repuso la verdad del servidor.
  db.subscribe(ch => { if (ch?.type === 'error') toast(`No se pudo guardar en el servidor: ${ch.error?.message || ch.error}`, 'error', 6000); });

  const app = {
    name, version, db, auth, roles, brand: { name, ...brand }, pages, home, mode, production, client,
    modules: active, allModules: all, collections: merged.collections,
    // ¿Está activo el módulo? Sin módulos declarados, todo cuenta como activo.
    has: id => !modules || on.has(id),
    // Página que solo declaran módulos inactivos (o nada que ver con esta instalación).
    blocked: page => blocked.has(page),
    // Restablecer datos demo solo en modo demo y con almacenamiento local.
    canReset: !production && db.adapter?.kind === 'local',
    // ¿Ese rol puede abrir esa página? (páginas no declaradas = públicas)
    canOpen: (page, role) => !blocked.has(page) && (!pages[page] || pages[page].includes(role)),
    // Adónde va un usuario al entrar: home[rol] (si su página sigue abierta) o la primera página que su rol puede abrir.
    homeFor(user) {
      if (!user) return 'index.html';
      const h = home[user.role];
      if (h && app.canOpen(h.split('#')[0], user.role)) return h;
      return Object.keys(pages).find(p => app.canOpen(p, user.role) && pages[p].includes(user.role)) || 'index.html';
    },
    // Configuración editable del sitio (settingsSection la guarda en db 'settings').
    settings: () => ({ ...settings, ...(db.getValue('settings', {}) || {}) }),
    saveSettings: patch => db.setValue('settings', { ...(db.getValue('settings', {}) || {}), ...patch }),
    // Plugins: fn(app) o { install(app) }. Pueden aportar ítems de menú con app.contribute().
    use(plugin) { (typeof plugin === 'function' ? plugin : plugin.install)(app); return app; },
    // contribute(clave, ítems, { slot }): clave = página ('admin.html'), 'kpis', 'dashboard', 'settings',
    // 'site:nav', 'site:routes', 'site:home'. slot = hueco con nombre dentro del nav de esa página.
    contribute(key, items, { slot = null } = {}) {
      (contributions[key] ||= []).push(...[items].flat().filter(Boolean).map(it => (typeof it === 'object' ? { ...it, _slot: it._slot ?? slot, _module: it._module ?? installing } : it)));
      return app;
    },
    contributions: key => (contributions[key] || []).filter(it => !it?.module || app.has(it.module)),
    // Ordenados por `order` (los aportes de dashboard, KPIs y secciones del sitio lo usan).
    ordered: key => app.contributions(key).slice().sort((a, b) => (a.order ?? 50) - (b.order ?? 50)),
    // KPIs aportados por los módulos activos y visibles para el usuario: [{ order, roles?, kpi(ctx) → { label, value, … } | null }]
    kpis: ctx => app.ordered('kpis').filter(k => !k.roles || k.roles.includes(ctx?.user?.role)).map(k => k.kpi(ctx)).filter(Boolean),
    // Monta fn cuando la base está lista (inmediato en local; con un "Conectando…" si es remota).
    whenReady(el, fn) {
      if (db.isReady) return fn();
      const root = typeof el === 'string' ? document.querySelector(el) : el || document.getElementById('app');
      if (root) root.innerHTML = '<div class="k-loading" role="status" style="display:grid;place-items:center;min-height:60vh;gap:12px"><span class="spinner"></span><span class="muted small">Conectando…</span></div>';
      return db.ready.then(fn).catch(err => {
        console.error(err);
        if (root) root.innerHTML = html`<div class="container section">${raw(emptyState({ icon: '📡', title: 'No pudimos conectar con el servidor', text: String(err?.message || err), action: '<button class="btn btn-primary" onclick="location.reload()">Reintentar</button>' }))}</div>`;
      });
    },
    panel: opts => app.whenReady(opts?.el || '#app', () => mountPanel(app, opts)),
    site: opts => app.whenReady(opts?.el || '#app', () => mountSite(app, opts)),
    login: opts => app.whenReady(opts?.el || document.getElementById('app'), () => loginPage(app, opts))
  };
  plugins.forEach(p => app.use(p));
  for (const m of active) { if (m.install) { installing = m.id; m.install(app); } }
  installing = null;
  return app;
}

// Inserta los aportes en los huecos { slot: 'x' } del nav (los que no tienen hueco van al final) y
// descarta lo que pertenece a módulos inactivos ({ module: 'agenda' }).
function expandNav(app, nav, key) {
  const extra = app.contributions(key);
  const slots = new Set(nav.filter(it => it && it.slot).map(it => it.slot));
  const out = [];
  for (const it of nav) {
    if (!it) continue;
    if (it.slot) { out.push(...extra.filter(x => x._slot === it.slot)); continue; }
    out.push(it);
  }
  out.push(...extra.filter(x => !x._slot || !slots.has(x._slot)));
  return out.filter(it => it && (!it.module || app.has(it.module)));
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
  if (app.blocked?.(page)) {
    root.innerHTML = `<div class="container section">${emptyState({ icon: '🧩', title: 'Módulo no disponible', text: 'Esta sección no está incluida en esta instalación.', action: `<a class="btn btn-primary" href="${escape(siteHref)}">Ir al inicio</a>` })}</div>`;
    return null;
  }
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
  const all = app.has ? expandNav(app, nav, page) : [...nav, ...app.contributions(page)].filter(Boolean);
  if (app.canReset === false) reset = false;
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
  if (app.has) {
    // Enlaces y rutas aportados por módulos: nav [['Agenda', '#/agendar', 'agenda']] o { label, href, module, slot }
    const norm = n => (Array.isArray(n) ? { label: n[0], href: n[1], module: n[2] } : n);
    nav = expandNav(app, nav.map(norm), 'site:nav').map(n => [n.label, n.href]);
    routes = { ...routes };
    for (const r of app.contributions('site:routes')) routes[r.path] = r.render;
    for (const [p, r] of Object.entries(routes)) {
      if (r && typeof r === 'object') { if (r.module && !app.has(r.module)) delete routes[p]; else routes[p] = r.render; }
    }
  }
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
  root.innerHTML = html`<header class="site-header k-site-header"></header><main class="site-main" id="view"></main><footer class="site-footer k-site-footer"><div class="container">${raw(footer || `© ${new Date().getFullYear()} ${escape(brand.name)}${app.production ? '' : ' · demo simulada en el navegador'}`)}</div></footer>`;
  const header = root.querySelector('.site-header'), view = root.querySelector('#view');
  let router = null;
  const drawHeader = () => { header.innerHTML = paintHeader(); router && router.highlight(header); };
  header.addEventListener('click', e => { if (e.target.closest('[data-logout]')) { auth.logout(); if (auth.remote) location.reload(); else { drawHeader(); router.refresh(); } } });
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
