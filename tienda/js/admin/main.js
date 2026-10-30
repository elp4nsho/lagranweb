// Panel de administración de Raíz: shell, menú por rol, rutas protegidas, búsqueda y avisos.
import { html, raw, $, toast, modal, confirm, debounce, norm, money, wireAdminShell, escape } from '../../../assets/core/ui.js';
import { createRouter } from '../../../assets/core/router.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth, can, STAFF, settings, PERMS } from '../data/db.js';
import { deny } from './common.js';
import { lowStockList } from './inventory.js';
import * as dashboard from './dashboard.js';
import * as products from './products.js';
import * as categories from './categories.js';
import * as orders from './orders.js';
import * as customers from './customers.js';
import * as coupons from './coupons.js';
import * as inventory from './inventory.js';
import * as reviews from './reviews.js';
import * as content from './content.js';
import * as settingsPage from './settings.js';
import * as users from './users.js';
import * as activity from './activity.js';

let user;
try { user = auth.require(STAFF, 'login.html'); } catch (e) { /* redirigiendo */ }

const NAV = [
  ['Tienda'],
  ['/', 'dashboard', '📊', 'Dashboard'],
  ['/pedidos', 'orders', '🧾', 'Pedidos', () => db.count('orders', o => ['pagado', 'preparando', 'pendiente'].includes(o.status))],
  ['/productos', 'products', '👕', 'Productos'],
  ['/categorias', 'categories', '🗂️', 'Categorías'],
  ['/inventario', 'inventory', '📦', 'Inventario', () => lowStockList().length],
  ['/clientes', 'customers', '👥', 'Clientes'],
  ['Marketing'],
  ['/cupones', 'coupons', '🏷️', 'Cupones'],
  ['/resenas', 'reviews', '⭐', 'Reseñas', () => db.count('reviews', r => r.status === 'pendiente')],
  ['/contenido', 'content', '🖼️', 'Contenido del sitio'],
  ['Administración'],
  ['/usuarios', 'users', '🔐', 'Usuarios y roles'],
  ['/ajustes', 'settings', '⚙️', 'Ajustes de tienda'],
  ['/actividad', 'activity', '🕘', 'Actividad']
];

const view = $('#admin-view');
let currentRender = null;

function renderSidebar() {
  const u = auth.current();
  const items = [];
  NAV.forEach((n, i) => {
    if (n.length === 1) {
      const next = NAV.slice(i + 1); const end = next.findIndex(x => x.length === 1);
      if ((end < 0 ? next : next.slice(0, end)).some(x => can(x[1], u))) items.push(`<div class="nav-section">${n[0]}</div>`);
      return;
    }
    const [href, perm, ico, label, count] = n;
    if (!can(perm, u)) return;
    const c = count ? count() : 0;
    items.push(`<a class="nav-link" href="#${href}"><span class="ico" aria-hidden="true">${ico}</span>${label}${c ? `<span class="count">${c}</span>` : ''}</a>`);
  });
  $('#sidebar').innerHTML = `<a class="admin-brand" href="index.html" title="Ver tienda"><span class="logo">R</span>${escape(settings().storeName || 'Raíz')}<small class="muted" style="font-size:11px;font-family:var(--font-body);text-transform:none;letter-spacing:0">admin</small></a>
    ${items.join('')}
    <div class="sidebar-foot"><a class="btn btn-sm btn-ghost" href="index.html" target="_blank" rel="noopener">↗ Ver tienda</a>${u.role === 'admin' ? '<button class="btn btn-sm btn-ghost" data-reset>↺ Restablecer datos demo</button>' : ''}</div>`;
  router.highlight($('#sidebar'));
}

function renderTopbar() {
  const u = auth.current();
  const notes = notifications();
  $('#topbar').innerHTML = html`<button class="btn btn-ghost btn-icon admin-burger" aria-label="Abrir menú">☰</button>
    <form class="search" data-gsearch role="search"><input class="input" type="search" name="q" placeholder="Buscar pedidos, productos, clientes…" aria-label="Búsqueda global"></form>
    <div class="topbar-user">
      <div class="rel"><button class="btn btn-ghost btn-icon" data-bell aria-label="Notificaciones" aria-expanded="false">🔔${notes.length ? raw(`<span class="bubble">${notes.length}</span>`) : ''}</button>
        <div class="notif-panel card hidden" data-notif>${notes.length ? notes.map(n => raw(html`<a href="${n.href}"><span>${n.icon}</span><span>${n.text}</span></a>`)) : raw('<p class="muted small" style="padding:10px;margin:0">Todo al día ✨</p>')}</div></div>
      <span class="avatar" style="--av:${u.color}">${initials(u.name)}</span>
      <div class="who"><b>${u.name}</b><small>${auth.roleName(u.role)}</small></div>
      <button class="btn btn-sm btn-ghost" data-logout>Salir</button>
    </div>`;
}

function notifications() {
  const out = [];
  const u = auth.current();
  const pend = db.count('orders', o => o.status === 'pagado');
  if (pend && can('orders', u)) out.push({ icon: '🧾', text: `${pend} pedido(s) pagados por preparar`, href: '#/pedidos?estado=pagado' });
  const tr = db.count('orders', o => o.status === 'pendiente');
  if (tr && can('orders', u)) out.push({ icon: '🏦', text: `${tr} transferencia(s) por confirmar`, href: '#/pedidos?estado=pendiente' });
  const low = lowStockList().length;
  if (low && can('inventory', u)) out.push({ icon: '📦', text: `${low} variante(s) con stock bajo`, href: '#/inventario' });
  const rv = db.count('reviews', r => r.status === 'pendiente');
  if (rv && can('reviews', u)) out.push({ icon: '⭐', text: `${rv} reseña(s) por moderar`, href: '#/resenas' });
  return out;
}

function guard(perm, fn) {
  return (params, q) => {
    if (!can(perm)) { currentRender = el => deny(el); return mount(); }
    currentRender = el => fn(el, params, q);
    mount();
  };
}
function mount() {
  const el = document.createElement('div');
  el.className = 'stack';
  el.style.gap = '20px';
  view.replaceChildren(el);
  currentRender(el);
}

const router = createRouter({
  '/': (p, q) => {
    if (!can('dashboard')) { const first = NAV.find(n => n.length > 1 && can(n[1])); return router.go(first[0]); }
    guard('dashboard', dashboard.render)(p, q);
  },
  '/productos': guard('products', products.render),
  '/productos/:id': guard('products', products.detail),
  '/categorias': guard('categories', categories.render),
  '/pedidos': guard('orders', orders.render),
  '/pedidos/:id': guard('orders', orders.detail),
  '/pedidos/:id/boleta': guard('orders', orders.invoice),
  '/clientes': guard('customers', customers.render),
  '/clientes/:id': guard('customers', customers.detail),
  '/cupones': guard('coupons', coupons.render),
  '/inventario': guard('inventory', inventory.render),
  '/resenas': guard('reviews', reviews.render),
  '/contenido': guard('content', content.render),
  '/ajustes': guard('settings', settingsPage.render),
  '/usuarios': guard('users', users.render),
  '/actividad': guard('activity', activity.render)
}, {
  notFound: () => { currentRender = el => { el.innerHTML = '<div class="empty card"><span class="icon">🧭</span><h2>Sección no encontrada</h2><a class="btn btn-primary" href="#/">Ir al inicio</a></div>'; }; mount(); },
  after: () => { router.highlight($('#sidebar')); window.scrollTo(0, 0); $('.admin-shell').classList.remove('nav-open'); }
});

function globalSearch(q) {
  const t = norm(q);
  const ps = can('products') ? db.query('products', p => norm(p.name + ' ' + p.variants.map(v => v.sku).join(' ')).includes(t)).slice(0, 6) : [];
  const os = can('orders') ? db.query('orders', o => norm(`${o.number} ${o.customer.name} ${o.customer.email} ${o.tracking}`).includes(t)).slice(0, 6) : [];
  const cs = can('customers') ? db.query('users', u => u.role === 'customer' && norm(u.name + ' ' + u.email).includes(t)).slice(0, 6) : [];
  const sec = (title, list) => list.length ? `<h4 style="margin:12px 0 6px">${title}</h4><ul class="list-plain">${list.join('')}</ul>` : '';
  const m = modal({ title: `Resultados para “${q}”`, size: 'lg', body: (sec('Pedidos', os.map(o => html`<li><a href="#/pedidos/${o.id}">#${o.number} · ${o.customer.name}</a><span>${money(o.total)}</span></li>`)) +
    sec('Productos', ps.map(p => html`<li><a href="#/productos/${p.id}">${p.name}</a><span>${money(p.price)}</span></li>`)) +
    sec('Clientes', cs.map(c => html`<li><a href="#/clientes/${c.id}">${c.name}</a><span class="muted small">${c.email}</span></li>`))) || '<div class="empty">Sin coincidencias.</div>' });
  m.el.addEventListener('click', e => { if (e.target.closest('a')) m.close(); });
}

if (user) {
  wireAdminShell();
  document.addEventListener('click', async e => {
    if (e.target.closest('[data-logout]')) { auth.logout(); location.href = 'login.html'; }
    const bell = e.target.closest('[data-bell]');
    const panel = $('[data-notif]');
    if (bell) { panel.classList.toggle('hidden'); bell.setAttribute('aria-expanded', !panel.classList.contains('hidden')); }
    else if (panel && !e.target.closest('[data-notif]')) panel.classList.add('hidden');
    if (e.target.closest('[data-reset]') && await confirm('Se borrarán todos los cambios y se restaurarán los datos de ejemplo. ¿Continuar?', { title: 'Restablecer datos demo', ok: 'Restablecer', danger: true })) {
      const id = auth.current()?.id;
      db.reset();
      if (!db.get('users', id)) { location.href = 'login.html'; return; }
      db.log('sistema', 'Datos demo restablecidos', id);
      toast('Datos de demostración restablecidos', 'success');
    }
  });
  document.addEventListener('submit', e => {
    if (!e.target.closest('[data-gsearch]')) return;
    e.preventDefault();
    const q = e.target.q.value.trim();
    if (q) globalSearch(q);
  });
  // Refresco en vivo cuando cambian los datos (también desde la tienda en otra pestaña).
  let pending = false;
  const refresh = debounce(() => {
    const u = auth.current();
    if (!u || !STAFF.includes(u.role)) { location.href = 'login.html'; return; }
    renderSidebar(); renderTopbar();
    const a = document.activeElement;
    if (document.querySelector('.modal-backdrop') || (a && view.contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && !['checkbox', 'radio', 'search'].includes(a.type))) { pending = true; return; }
    if (currentRender) { const y = window.scrollY; mount(); window.scrollTo(0, y); }
  }, 80);
  db.subscribe(refresh);
  new MutationObserver(() => { if (pending && !document.querySelector('.modal-backdrop')) { pending = false; refresh(); } }).observe(document.body, { childList: true });
  document.addEventListener('focusout', () => { if (pending && !document.querySelector('.modal-backdrop')) { pending = false; setTimeout(refresh, 60); } });
  renderSidebar();
  renderTopbar();
  router.start();
}
export { router };
