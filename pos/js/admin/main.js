// Back-office de Almacén Pampa: shell, menú por rol, rutas protegidas, búsqueda global y avisos.
import { html, raw, $, toast, modal, confirm, debounce, norm, money, wireAdminShell, escape } from '../../../assets/core/ui.js';
import { createRouter } from '../../../assets/core/router.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth, can, BACKOFFICE, settings, isLow } from '../data/db.js';
import { deny } from '../shared/common.js';
import * as dashboard from './dashboard.js';
import * as products from './products.js';
import * as inventory from './inventory.js';
import * as movements from './movements.js';
import * as purchases from './purchases.js';
import * as suppliers from './suppliers.js';
import * as branches from './branches.js';
import * as employees from './employees.js';
import * as cash from './cash.js';
import * as customers from './customers.js';
import * as users from './users.js';
import * as settingsPage from './settings.js';
import * as activity from './activity.js';

let user = auth.current();
if (user && user.role === 'cajero') location.replace('pos.html');
else { try { user = auth.require(BACKOFFICE, 'login.html'); } catch (e) { user = null; } }

const lowCount = () => db.query('products', p => p.active && p.trackStock).reduce((s, p) => s + db.query('branches', b => b.active).filter(b => isLow(p, b.id)).length, 0);
const NAV = [
  ['Operación'],
  ['/', 'dashboard', '📊', 'Dashboard'],
  ['/caja', 'cash', '🧾', 'Reportes de caja', () => db.count('shifts', s => s.status === 'abierto')],
  ['/clientes', 'customers', '⭐', 'Clientes y puntos'],
  ['Inventario'],
  ['/productos', 'products', '🏷️', 'Productos'],
  ['/inventario', 'inventory', '📦', 'Stock por sucursal', lowCount],
  ['/movimientos', 'movements', '🔁', 'Movimientos'],
  ['/compras', 'purchases', '🚚', 'Órdenes de compra', () => db.count('purchaseOrders', p => ['enviada', 'parcial'].includes(p.status))],
  ['/proveedores', 'suppliers', '🏭', 'Proveedores'],
  ['Organización'],
  ['/sucursales', 'branches', '🏪', 'Sucursales'],
  ['/empleados', 'employees', '👥', 'Empleados y turnos'],
  ['/usuarios', 'users', '🔐', 'Usuarios y roles'],
  ['/ajustes', 'settings', '⚙️', 'Ajustes'],
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
  $('#sidebar').innerHTML = `<a class="admin-brand" href="index.html"><span class="logo">P</span>${escape(settings().businessName || 'Pampa')}</a>
    ${items.join('')}
    <div class="sidebar-foot">${u.role !== 'bodeguero' ? '<a class="btn btn-sm btn-primary" href="pos.html">▶ Abrir caja</a>' : ''}${u.role === 'admin' ? '<button class="btn btn-sm btn-ghost" data-reset>↺ Restablecer datos demo</button>' : ''}</div>`;
  router.highlight($('#sidebar'));
}

function notifications() {
  const out = [];
  const u = auth.current();
  const low = lowCount();
  if (low && can('inventory', u)) out.push({ icon: '📦', text: `${low} producto(s)-sucursal bajo el stock mínimo`, href: '#/inventario?bajo=1' });
  const pend = db.count('purchaseOrders', p => ['enviada', 'parcial'].includes(p.status));
  if (pend && can('purchases', u)) out.push({ icon: '🚚', text: `${pend} orden(es) de compra por recibir`, href: '#/compras' });
  const diffs = db.query('shifts', s => s.status === 'cerrado' && Math.abs(s.difference || 0) >= 2000 && Date.now() - new Date(s.closedAt) < 3 * 864e5).length;
  if (diffs && can('cash', u)) out.push({ icon: '⚠️', text: `${diffs} cierre(s) de caja con diferencia ≥ $2.000 (3 días)`, href: '#/caja' });
  const drafts = db.count('purchaseOrders', p => p.status === 'borrador');
  if (drafts && can('purchases', u)) out.push({ icon: '📝', text: `${drafts} OC en borrador sin enviar`, href: '#/compras' });
  return out;
}

function renderTopbar() {
  const u = auth.current();
  const notes = notifications();
  $('#topbar').innerHTML = html`<button class="btn btn-ghost btn-icon admin-burger" aria-label="Abrir menú">☰</button>
    <form class="search" data-gsearch role="search"><input class="input" type="search" name="q" placeholder="Buscar producto, boleta, cliente…" aria-label="Búsqueda global"></form>
    <div class="topbar-user">
      <div class="rel"><button class="btn btn-ghost btn-icon" data-bell aria-label="Avisos" aria-expanded="false">🔔${notes.length ? raw(`<span class="bubble">${notes.length}</span>`) : ''}</button>
        <div class="notif-panel card hidden" data-notif>${notes.length ? notes.map(n => raw(html`<a href="${n.href}"><span>${n.icon}</span><span>${n.text}</span></a>`)) : raw('<p class="muted small" style="padding:10px;margin:0">Sin avisos ✨</p>')}</div></div>
      <span class="avatar" style="--av:${u.color}">${initials(u.name)}</span>
      <div class="who"><b>${u.name}</b><small>${auth.roleName(u.role)}${u.branchId ? ' · ' + (db.get('branches', u.branchId)?.name || '') : ''}</small></div>
      <button class="btn btn-sm btn-ghost" data-logout>Salir</button>
    </div>`;
}

function guard(perm, fn) {
  return (params, q) => {
    currentRender = can(perm) ? el => fn(el, params, q) : el => deny(el);
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
  '/': (p, q) => { if (!can('dashboard')) return router.go('/inventario'); guard('dashboard', dashboard.render)(p, q); },
  '/productos': guard('products', products.render),
  '/productos/:id': guard('products', products.detail),
  '/inventario': guard('inventory', inventory.render),
  '/movimientos': guard('movements', movements.render),
  '/compras': guard('purchases', purchases.render),
  '/compras/:id': guard('purchases', purchases.detail),
  '/proveedores': guard('suppliers', suppliers.render),
  '/sucursales': guard('branches', branches.render),
  '/empleados': guard('employees', employees.render),
  '/caja': guard('cash', cash.render),
  '/clientes': guard('customers', customers.render),
  '/clientes/:id': guard('customers', customers.detail),
  '/usuarios': guard('users', users.render),
  '/ajustes': guard('settings', settingsPage.render),
  '/actividad': guard('activity', activity.render)
}, {
  notFound: () => { currentRender = el => { el.innerHTML = '<div class="empty card"><span class="icon">🧭</span><h2>Sección no encontrada</h2><a class="btn btn-primary" href="#/">Ir al inicio</a></div>'; }; mount(); },
  after: () => { document.querySelectorAll('.modal-backdrop').forEach(m => m.dispatchEvent(new MouseEvent('click', { bubbles: true }))); router.highlight($('#sidebar')); window.scrollTo(0, 0); $('.admin-shell').classList.remove('nav-open'); }
});

function globalSearch(q) {
  const t = norm(q).replace(/[.\-\s]/g, '');
  const ps = can('products') ? db.query('products', p => norm(`${p.name}${p.sku}${p.barcode}`).replace(/[.\-\s]/g, '').includes(t)).slice(0, 6) : [];
  const ss = can('cash') ? db.query('sales', s => String(s.number).includes(t)).slice(0, 5) : [];
  const cs = can('customers') ? db.query('customers', c => norm(`${c.name}${c.rut}${c.phone}`).replace(/[.\-\s]/g, '').includes(t)).slice(0, 6) : [];
  const sec = (title, list) => list.length ? `<h4 style="margin:12px 0 6px">${title}</h4><ul class="list-plain">${list.join('')}</ul>` : '';
  const m = modal({ title: `Resultados para “${q}”`, size: 'lg', body: (sec('Productos', ps.map(p => html`<li><a href="#/productos/${p.id}">${p.emoji} ${p.name}</a><span class="muted small">${p.sku} · ${money(p.price)}</span></li>`)) +
    sec('Boletas', ss.map(s => html`<li><a href="#/caja?boleta=${s.number}">Boleta N° ${s.number}</a><span>${money(s.total)}</span></li>`)) +
    sec('Clientes', cs.map(c => html`<li><a href="#/clientes/${c.id}">${c.name}</a><span class="muted small">${c.rut}</span></li>`))) || '<div class="empty">Sin coincidencias.</div>' });
  m.el.addEventListener('click', e => { if (e.target.closest('a')) m.close(); });
}

if (user && user.role !== 'cajero') {
  wireAdminShell();
  document.addEventListener('click', async e => {
    if (e.target.closest('[data-logout]')) { auth.logout(); location.href = 'login.html'; }
    const bell = e.target.closest('[data-bell]'), panel = $('[data-notif]');
    if (bell) { panel.classList.toggle('hidden'); bell.setAttribute('aria-expanded', !panel.classList.contains('hidden')); }
    else if (panel && !e.target.closest('[data-notif]')) panel.classList.add('hidden');
    if (e.target.closest('[data-reset]') && await confirm('Se borrarán todos los cambios (ventas, stock, usuarios…) y volverán los datos de ejemplo. ¿Continuar?', { title: 'Restablecer datos demo', ok: 'Restablecer', danger: true })) {
      const id = auth.current()?.id;
      db.reset();
      try { Object.keys(localStorage).filter(k => k.startsWith('pampa:')).forEach(k => localStorage.removeItem(k)); } catch (er) { /* */ }
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
  let pending = false;
  const refresh = debounce(() => {
    const u = auth.current();
    if (!u || u.active === false || !BACKOFFICE.includes(u.role)) { location.href = 'login.html'; return; }
    renderSidebar(); renderTopbar();
    const a = document.activeElement;
    if (document.querySelector('.modal-backdrop') || (a && view.contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && !['checkbox', 'radio', 'search'].includes(a.type))) { pending = true; return; }
    if (currentRender) { const y = window.scrollY; mount(); window.scrollTo(0, y); }
  }, 120);
  db.subscribe(refresh);
  new MutationObserver(() => { if (pending && !document.querySelector('.modal-backdrop')) { pending = false; refresh(); } }).observe(document.body, { childList: true });
  document.addEventListener('focusout', () => { if (pending && !document.querySelector('.modal-backdrop')) { pending = false; setTimeout(refresh, 60); } });
  renderSidebar();
  renderTopbar();
  router.start();
}
