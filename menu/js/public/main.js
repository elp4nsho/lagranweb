// App del comensal: index.html (portada) e index.html?mesa=N (pedir desde la mesa).
import { toast, escape, money } from '../../../assets/core/ui.js';
import { createRouter } from '../../../assets/core/router.js';
import { db } from '../data/db.js';
import { settings, callWaiter } from '../shared/logic.js';
import { t, tr, getLang, setLang } from './i18n.js';
import { cart } from './cart.js';
import { renderMenu } from './menu-view.js';
import { renderLanding } from './landing.js';
import { openCart, renderStatus, renderBill } from './order-views.js';

const mesaNum = parseInt(new URLSearchParams(location.search).get('mesa'), 10);
const findTable = () => db.find('tables', x => x.number === mesaNum);
const mesaMode = !!findTable();
const memKey = `lgw:menu:sess:${mesaNum}`;

const ctx = {
  table: findTable,
  session() { const tb = findTable(); const s = tb?.sessionId && db.get('sessions', tb.sessionId); return s && s.status === 'abierta' ? s : null; },
  lastSession() { try { const id = localStorage.getItem(memKey); return id ? db.get('sessions', id) : null; } catch (e) { return null; } },
  remember(id) { try { id ? localStorage.setItem(memKey, id) : localStorage.removeItem(memKey); } catch (e) { /* sin storage */ } }
};
if (mesaMode) { cart.init(mesaNum); const s = ctx.session(); if (s) ctx.remember(s.id); }

const header = document.getElementById('hdr');
const viewBox = document.getElementById('view');
const fab = document.getElementById('fab');
let current = null; // { name, refresh, sig }

function paintHeader() {
  const cfg = settings();
  const tb = findTable();
  const s = ctx.session();
  const activeOrders = s ? db.count('orders', o => o.sessionId === s.id && !['entregado', 'pagado', 'cancelado'].includes(o.status)) : 0;
  document.title = `${cfg.name} · ${mesaMode ? `${t('table')} ${mesaNum}` : tr(cfg.tagline)}`;
  header.innerHTML = `<div class="container hdr-row">
      <a class="brand site-brand" href="${mesaMode ? '#/' : 'index.html'}"><span class="brand-mark" aria-hidden="true">🔥</span><span class="brand-name">${escape(cfg.name)}</span></a>
      ${mesaMode ? `<span class="badge badge-primary plain mesa-chip">${escape(t('table'))} ${mesaNum}</span>` : ''}
      <span class="grow"></span>
      <div class="site-actions">
      <button class="btn btn-sm btn-ghost lang" id="lang" aria-label="Idioma / Language">${getLang() === 'es' ? 'EN' : 'ES'}</button>
      ${mesaMode ? `<button class="btn btn-sm ${tb.calling ? 'btn-accent' : ''}" id="callW" title="${escape(t('callWaiter'))}">🛎️<span class="hide-xs"> ${escape(tb.calling ? t('waiterCalled') : t('callWaiter'))}</span></button>
        <button class="btn btn-sm btn-primary cart-btn" id="cartBtn" aria-label="${escape(t('cart'))}">🛒 <b>${cart.count()}</b></button>` : `<a class="btn btn-sm" href="reservas.html">${getLang() === 'en' ? 'Book' : 'Reservar'}</a>`}
      </div>
    </div>
    <nav class="container subnav site-nav" aria-label="Principal">${mesaMode
      ? `<a href="#/">${escape(t('menu'))}</a><a href="#/pedido">${escape(t('myOrder'))}${activeOrders ? ` <span class="pill">${activeOrders}</span>` : ''}</a><a href="#/cuenta">${escape(t('bill'))}</a>`
      : `<a href="#/">${getLang() === 'en' ? 'Home' : 'Inicio'}</a><a href="#/carta">${escape(t('menu'))}</a><a href="reservas.html">${getLang() === 'en' ? 'Bookings' : 'Reservas'}</a>`}</nav>`;
  router.highlight(header);
  document.documentElement.style.setProperty('--hdr-h', header.offsetHeight + 'px');
  const showFab = mesaMode && cart.count() > 0 && current?.name !== 'cart';
  fab.hidden = !showFab;
  if (showFab) fab.innerHTML = `🛒 <b>${cart.count()}</b><span class="hide-xs">&nbsp;· ${money(cart.total())}</span>`;
}

header.addEventListener('click', e => {
  if (e.target.closest('#lang')) { setLang(getLang() === 'es' ? 'en' : 'es'); paintHeader(); router.refresh(); }
  else if (e.target.closest('#callW')) {
    const tb = findTable();
    if (tb.calling) { toast(t('waiterCalled'), 'info'); return; }
    callWaiter(tb.id, 'garzon'); toast(`🛎️ ${t('waiterCalled')}`, 'success');
  } else if (e.target.closest('#cartBtn')) openCart(ctx);
});
fab.addEventListener('click', () => openCart(ctx));

function mount(name, fn, sigFn = () => '') {
  const el = document.createElement('div');
  viewBox.replaceChildren(el);
  const res = fn(el) || {};
  current = { name, el, refresh: res.refresh || (() => fn(el)), sigFn, sig: sigFn() };
  window.scrollTo(0, 0);
  paintHeader();
}

const sessionSig = () => {
  const tb = findTable(), s = ctx.session(), last = ctx.lastSession();
  const os = s ? db.query('orders', o => o.sessionId === s.id).map(o => o.status + o.items.map(i => i.status).join()).join('|') : '';
  return JSON.stringify([tb?.calling, tb?.billRequested, s?.id, os, last?.status, db.count('ratings', r => r.sessionId === last?.id), getLang()]);
};

const routes = mesaMode ? {
  '/': () => mount('menu', el => renderMenu(el, { canOrder: true })),
  '/pedido': () => mount('status', el => renderStatus(el, ctx), sessionSig),
  '/cuenta': () => mount('bill', el => renderBill(el, ctx), sessionSig)
} : {
  '/': () => mount('landing', el => renderLanding(el)),
  '/carta': () => mount('menu', el => renderMenu(el, { canOrder: false }))
};
const router = createRouter(routes, { notFound: () => router.go('/') });

// Avisos al comensal y refresco en vivo
let seenReady = new Set(), seenAttended = new Set(), primed = false;
function notify() {
  const s = ctx.session();
  if (!s) return;
  const items = db.query('orders', o => o.sessionId === s.id).flatMap(o => o.items.filter(i => i.status === 'listo').map(i => i.id));
  const att = db.query('calls', c => c.tableId === findTable().id && c.status === 'atendida').map(c => c.id);
  if (primed) {
    if (items.some(i => !seenReady.has(i))) toast(`🍽️ ${t('ready')}`, 'success');
    if (att.some(i => !seenAttended.has(i))) toast(`🛎️ ${t('waiterOnWay')}`, 'info');
  }
  seenReady = new Set(items); seenAttended = new Set(att); primed = true;
}

db.subscribe(change => {
  if (mesaMode) { notify(); const s = ctx.session(); if (s) ctx.remember(s.id); }
  if (!current) return;
  if (current.name === 'menu' || current.name === 'landing') {
    if (!change || ['dishes', 'categories', 'modGroups', 'ratings'].includes(change.col) || ['value', 'sync', 'reset'].includes(change.type)) current.refresh();
  } else {
    const sig = current.sigFn();
    if (sig !== current.sig) { current.sig = sig; current.refresh(); }
  }
  paintHeader();
});
cart.on(() => { paintHeader(); if (current?.name === 'menu') current.refresh(); });

if (mesaMode) notify();
router.start();
