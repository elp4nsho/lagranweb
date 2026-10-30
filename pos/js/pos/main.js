// Caja de Almacén Pampa: grilla de productos, venta en curso, cobro, turnos, ventas retenidas y cola offline.
import { html, raw, money, time, toast, modal, confirm, norm, debounce, $, escape } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth, settings, POS_ROLES, stockAt, branchName, openShiftOf, shiftSummary, tierOf } from '../data/db.js';
import { cart } from './cart.js';
import { queue } from './queue.js';
import { openPayment } from './payment.js';
import { openCustomerLookup } from './customers.js';
import { renderGate, closeShift, cashMovement, lastSales, requireSupervisor } from './shift.js';

let user;
try { user = auth.require(POS_ROLES, 'login.html'); } catch (e) { /* redirigiendo */ }

const app = $('#pos');
const view = { cat: 'fav', q: '' };
let branchId, registerId, shift = null;

function pickRegister() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('pampa:register')); } catch (e) { /* */ }
  const allowed = r => r && (user.role !== 'cajero' || r.branchId === user.branchId);
  const r = allowed(db.get('registers', saved?.registerId)) ? db.get('registers', saved.registerId) : db.find('registers', x => x.branchId === (user.branchId || 'b1'));
  branchId = r.branchId; registerId = r.id;
}
function remember() { try { localStorage.setItem('pampa:register', JSON.stringify({ branchId, registerId })); } catch (e) { /* */ } }

function start() {
  const open = openShiftOf(registerId);
  shift = open && (open.userId === user.id || open.takenBy === user.id) ? open : null;
  cart.use(registerId);
  shift ? renderPOS() : renderGateView();
}

function renderGateView() {
  app.innerHTML = `<header class="pos-top">${brandHtml()}<span class="spacer"></span>${user.role !== 'cajero' ? '<a class="btn btn-sm" href="admin.html">Back-office</a>' : ''}<button class="btn btn-sm btn-ghost" data-logout>Salir</button></header><div data-gate></div>`;
  renderGate(app.querySelector('[data-gate]'), {
    user, branchId, registerId,
    onSelect: (b, r) => { branchId = b; registerId = r; remember(); start(); },
    onOpen: s => { if (s.userId !== user.id) db.update('shifts', s.id, { takenBy: user.id }); shift = db.get('shifts', s.id); remember(); renderPOS(); }
  });
}

const brandHtml = () => `<a class="lp-brand" href="index.html" title="Almacén Pampa" style="font-size:16px"><span class="brand-mark">P</span><span class="hide-sm">Pampa POS</span></a>`;

function renderPOS() {
  const reg = db.get('registers', registerId);
  app.innerHTML = html`<header class="pos-top">
    ${raw(brandHtml())}
    <div class="info"><b>${branchName(branchId)} · ${reg.name}</b><span class="muted">Turno desde ${time(shift.openedAt)} · ${user.name}</span></div>
    <span class="spacer"></span>
    <button class="net-pill" data-net title="Simular corte de conexión"></button>
    <button class="btn btn-sm rel" data-held title="Ventas retenidas (F7)">⏸ <span class="hide-sm">Retenidas</span><span data-heldcount></span></button>
    <button class="btn btn-sm" data-sales title="Ventas del turno">🧾 <span class="hide-sm">Ventas</span></button>
    <button class="btn btn-sm" data-move title="Retiro / ingreso de efectivo">💵 <span class="hide-sm">Caja</span></button>
    <button class="btn btn-sm btn-danger" data-close-shift>Cerrar turno</button>
    ${user.role !== 'cajero' ? raw('<a class="btn btn-sm btn-ghost hide-sm" href="admin.html">Back-office</a>') : ''}
    <span class="avatar" style="--av:${user.color};--size:32px" title="${user.name}">${initials(user.name)}</span>
    <button class="btn btn-sm btn-ghost" data-logout>Salir</button>
  </header>
  <div class="pos-main">
    <section class="pos-catalog" aria-label="Productos">
      <div class="pos-search">
        <input class="input" type="search" placeholder="Buscar producto (F2)…" data-q value="${view.q}" aria-label="Buscar producto">
        <form class="row barcode" style="gap:6px;flex-wrap:nowrap" data-barcode><input class="input" inputmode="numeric" placeholder="Código de barras ⏎" data-code aria-label="Código de barras" style="font-family:var(--font-mono)"></form>
        <button class="btn" data-scan title="Simular lector de código de barras">📷 Escanear</button>
      </div>
      <div class="pos-cats" role="tablist" data-cats></div>
      <div class="tiles" data-tiles></div>
    </section>
    <aside class="pos-cart" aria-label="Venta en curso" data-cart></aside>
  </div>
  <button class="btn btn-primary btn-lg cart-fab" data-fab></button>`;
  drawCats(); drawTiles(); drawCart(); drawNet(); drawHeld();
}

function drawCats() {
  const el = app.querySelector('[data-cats]');
  if (!el) return;
  const cats = db.all('categories').sort((a, b) => a.order - b.order);
  el.innerHTML = [['fav', '★ Favoritos'], ['all', 'Todo'], ...cats.map(c => [c.id, `${c.icon} ${c.name}`])].map(([k, l]) => `<button class="chip ${view.cat === k ? 'active' : ''}" data-cat="${k}" role="tab" aria-selected="${view.cat === k}">${escape(l)}</button>`).join('');
}

function drawTiles() {
  const el = app.querySelector('[data-tiles]');
  if (!el) return;
  const pend = queue.pendingQty(branchId);
  const inCart = {};
  cart.lines.forEach(l => { inCart[l.productId] = (inCart[l.productId] || 0) + l.qty; });
  const t = norm(view.q);
  const list = db.query('products', p => p.active && (t ? norm(`${p.name} ${p.sku} ${p.barcode}`).includes(t) : view.cat === 'all' || (view.cat === 'fav' ? p.favorite : p.categoryId === view.cat)));
  el.innerHTML = list.length ? list.map(p => {
    const avail = p.trackStock ? stockAt(p, branchId) - (pend[p.id] || 0) - (inCart[p.id] || 0) : Infinity;
    const stk = p.trackStock ? `<span class="stk badge ${avail <= 0 ? 'badge-danger' : avail <= p.minStock ? 'badge-warning' : 'plain'}">${Math.max(0, avail)}</span>` : '';
    return html`<button class="tile" data-add="${p.id}" ${avail <= 0 ? 'disabled' : ''} title="${p.name} · ${p.sku}">${raw(stk)}<span class="emo" aria-hidden="true">${p.emoji}</span><span class="nm">${p.name}</span><span class="pr">${money(p.price)}</span></button>`;
  }).join('') : '<div class="empty card" style="grid-column:1/-1">Sin productos para esta búsqueda.</div>';
}

function drawCart() {
  const el = app.querySelector('[data-cart]');
  if (!el) return;
  const t = cart.totals();
  const c = cart.customer();
  const fab = app.querySelector('[data-fab]');
  if (fab) fab.textContent = `🛒 ${t.units} · ${money(t.total)}`;
  el.innerHTML = html`<div class="cart-head">
      <div class="row between"><b>Venta en curso</b><span class="row" style="gap:6px"><span class="small muted">${t.units} unid.</span><button class="btn btn-sm btn-ghost btn-icon cart-close" data-closecart aria-label="Cerrar">✕</button></span></div>
      <button class="cust-box" data-customer title="Cliente (F4)">${c ? raw(html`<span class="avatar" style="--av:var(--accent);--size:30px;color:var(--text)">${initials(c.name)}</span><span class="grow"><b>${c.name}</b>${c.rut} · ${tierOf(c)} · ${c.points} pts</span><span class="small">Cambiar</span>`) : raw('<span style="font-size:20px">👤</span><span class="grow"><b>Agregar cliente</b>Acumula puntos con RUT (F4)</span>')}</button>
    </div>
    <div class="cart-lines">${cart.lines.length ? cart.lines.map((l, i) => raw(html`<div class="cline">
        <div><div class="nm">${l.name}</div><small>${money(l.price)} c/u${l.discount ? raw(html` · <span class="disc">−${l.discount}%</span>`) : ''}</small><button class="link small" data-ldisc="${i}" style="background:none;border:0;padding:0;color:var(--primary);cursor:pointer;font:inherit;font-size:12px">${l.discount ? 'Cambiar descuento' : 'Descuento'}</button></div>
        <div class="qty"><button data-dec="${i}" aria-label="Menos">−</button><span>${l.qty}</span><button data-inc="${i}" aria-label="Más">+</button></div>
        <b class="nowrap">${money(Math.round(l.price * l.qty * (1 - (l.discount || 0) / 100)))}</b>
      </div>`)) : raw('<div class="empty"><span class="icon">🧺</span>Toca un producto o escanea un código para empezar.</div>')}</div>
    <div class="cart-foot">
      <div class="sum-row"><span>Subtotal</span><span>${money(t.gross)}</span></div>
      ${t.discount ? raw(html`<div class="sum-row"><span>Descuentos${cart.state.discount ? ` (general ${cart.state.discount}%)` : ''}</span><span class="pos-up">−${money(t.discount)}</span></div>`) : ''}
      <div class="sum-row small muted"><span>IVA incluido</span><span>${money(t.iva)}</span></div>
      <div class="sum-row total"><span>Total</span><span>${money(t.total)}</span></div>
      <div class="cart-actions">
        <button class="btn btn-sm" data-odisc ${cart.isEmpty() ? 'disabled' : ''}>% Desc.</button>
        <button class="btn btn-sm" data-hold ${cart.isEmpty() ? 'disabled' : ''} title="F8">⏸ Retener</button>
        <button class="btn btn-sm btn-ghost" data-clear ${cart.isEmpty() ? 'disabled' : ''}>✕ Vaciar</button>
      </div>
      <button class="btn btn-primary btn-block pay-btn" data-pay ${cart.isEmpty() ? 'disabled' : ''}>Cobrar ${money(t.total)} <span class="kbd">F9</span></button>
    </div>`;
}

function drawNet() {
  const el = app.querySelector('[data-net]');
  if (!el) return;
  const off = queue.offline, n = queue.count;
  el.className = `net-pill ${queue.syncing ? 'sync' : off ? 'off' : ''}`;
  el.innerHTML = `<span class="led"></span>${queue.syncing ? 'Sincronizando…' : off ? 'Sin conexión' : 'En línea'}${n ? ` · ${n} en cola` : ''}`;
  el.title = off ? 'Clic para reconectar (simulado)' : 'Clic para simular un corte de conexión';
}
function drawHeld() {
  const el = app.querySelector('[data-heldcount]');
  if (!el) return;
  const n = db.count('held', h => h.branchId === branchId);
  el.innerHTML = n ? `<span class="bubble">${n}</span>` : '';
}

// ---------- Acciones ----------
function addProduct(p, from = 'tile') {
  if (!p || !p.active) return toast('Producto no encontrado', 'error');
  if (p.trackStock) {
    const used = cart.lines.filter(l => l.productId === p.id).reduce((s, l) => s + l.qty, 0) + (queue.pendingQty(branchId)[p.id] || 0);
    if (used + 1 > stockAt(p, branchId)) return toast(`Sin stock de ${p.name} en ${branchName(branchId)}`, 'warning');
  }
  cart.add(p);
  const tile = app.querySelector(`[data-add="${p.id}"]`);
  if (tile) { tile.classList.remove('flash'); void tile.offsetWidth; tile.classList.add('flash'); }
  if (from === 'scan') toast(`${p.emoji} ${p.name} · ${money(p.price)}`, 'success', 1500);
}

async function askDiscount(current, title) {
  const max = settings().cashierMaxDiscount || 10;
  const body = `<form class="stack" data-df><div class="quick">${[0, 5, 10, 15, 20, 30].map(v => `<button type="button" class="btn btn-sm ${v === current ? 'btn-primary' : ''}" data-pct="${v}">${v ? v + '%' : 'Sin descuento'}</button>`).join('')}</div><div class="field"><label for="dpct">Otro porcentaje</label><input class="input" id="dpct" type="number" min="0" max="100" value="${current || ''}"></div><small class="muted">Cajeros pueden aplicar hasta ${max}%. Sobre eso se pide PIN de supervisor.</small></form>`;
  const pct = await new Promise(resolve => {
    let done = false;
    const m = modal({ title, body, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Aplicar</button>', onClose: () => !done && resolve(null) });
    const finish = v => { done = true; m.close(); resolve(Math.max(0, Math.min(100, Math.round(+v || 0)))); };
    m.el.addEventListener('click', e => { const b = e.target.closest('[data-pct]'); if (b) finish(b.dataset.pct); });
    m.el.querySelector('[data-ok]').onclick = () => finish(m.el.querySelector('#dpct').value);
    m.el.querySelector('[data-df]').onsubmit = e => { e.preventDefault(); finish(m.el.querySelector('#dpct').value); };
  });
  if (pct == null) return null;
  if (pct > max && !await requireSupervisor(`Descuento de ${pct}% (máximo cajero ${max}%)`)) return null;
  return pct;
}

function holdOrder() {
  if (cart.isEmpty()) return;
  const c = cart.customer();
  const n = db.count('held') + 1;
  db.insert('held', { branchId, registerId, cashierId: user.id, label: c ? c.name : `Pedido ${n}`, state: JSON.parse(JSON.stringify(cart.state)), total: cart.totals().total, units: cart.totals().units });
  cart.clear();
  toast('Venta retenida. Puedes recuperarla cuando quieras.', 'info');
}

function openHeld() {
  const list = db.query('held', h => h.branchId === branchId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const m = modal({ title: 'Ventas retenidas', body: list.length ? `<ul class="list-plain">${list.map(h => html`<li><span><b>${h.label}</b><br><small class="muted">${time(h.createdAt)} · ${h.units} unid. · ${db.get('registers', h.registerId)?.name}</small></span><span class="row" style="gap:6px"><b>${money(h.total)}</b><button class="btn btn-sm btn-primary" data-resume="${h.id}">Recuperar</button><button class="btn btn-sm btn-ghost" data-drop="${h.id}" aria-label="Descartar">✕</button></span></li>`).join('')}</ul>` : '<div class="empty">No hay ventas retenidas en esta sucursal.</div>' });
  m.el.addEventListener('click', async e => {
    const r = e.target.closest('[data-resume]'), d = e.target.closest('[data-drop]');
    if (r) {
      const h = db.get('held', r.dataset.resume);
      if (!cart.isEmpty()) { if (!await confirm('Hay una venta en curso. ¿Retenerla y recuperar la seleccionada?', { ok: 'Sí, intercambiar' })) return; holdOrder(); }
      cart.load(h.state);
      db.remove('held', h.id);
      m.close();
      toast(`Venta “${h.label}” recuperada`, 'success');
    }
    if (d && await confirm('¿Descartar esta venta retenida?', { danger: true, ok: 'Descartar' })) { db.remove('held', d.dataset.drop); m.close(); openHeld(); }
  });
}

function scanRandom() {
  const pend = queue.pendingQty(branchId);
  const pool = db.query('products', p => p.active && p.barcode && stockAt(p, branchId) - (pend[p.id] || 0) > 0);
  const p = pool[Math.floor(Math.random() * pool.length)];
  const input = app.querySelector('[data-code]');
  input.value = p.barcode;
  input.classList.add('flash');
  setTimeout(() => { addProduct(p, 'scan'); input.value = ''; }, 250);
}

const ctx = () => ({ branchId, registerId, shiftId: () => shift.id });

if (user) {
  pickRegister();
  document.addEventListener('click', async e => {
    const tg = e.target;
    if (tg.closest('[data-logout]')) { e.preventDefault(); auth.logout(); location.href = 'login.html'; return; }
    if (!shift) return;
    const add = tg.closest('[data-add]');
    if (add) return addProduct(db.get('products', add.dataset.add));
    const cat = tg.closest('[data-cat]');
    if (cat) { view.cat = cat.dataset.cat; view.q = ''; const q = app.querySelector('[data-q]'); if (q) q.value = ''; drawCats(); drawTiles(); return; }
    const inc = tg.closest('[data-inc]'), dec = tg.closest('[data-dec]');
    if (inc) { const i = +inc.dataset.inc; const l = cart.lines[i]; const p = db.get('products', l.productId); if (p.trackStock && cart.lines.filter(x => x.productId === p.id).reduce((s, x) => s + x.qty, 0) + 1 > stockAt(p, branchId)) return toast('No hay más stock', 'warning'); cart.setQty(i, l.qty + 1); }
    if (dec) { const i = +dec.dataset.dec; cart.setQty(i, cart.lines[i].qty - 1); }
    const ld = tg.closest('[data-ldisc]');
    if (ld) { const i = +ld.dataset.ldisc; const v = await askDiscount(cart.lines[i].discount, `Descuento en ${cart.lines[i].name}`); if (v != null) cart.setLineDiscount(i, v); }
    if (tg.closest('[data-odisc]')) { const v = await askDiscount(cart.state.discount, 'Descuento general de la venta'); if (v != null) cart.setDiscount(v); }
    if (tg.closest('[data-customer]')) openCustomerLookup();
    if (tg.closest('[data-hold]')) holdOrder();
    if (tg.closest('[data-held]')) openHeld();
    if (tg.closest('[data-clear]') && await confirm('¿Vaciar la venta en curso?', { danger: true, ok: 'Vaciar' })) cart.clear();
    if (tg.closest('[data-pay]')) { document.body.classList.remove('cart-open'); openPayment(ctx()); }
    if (tg.closest('[data-scan]')) scanRandom();
    if (tg.closest('[data-net]')) { const off = !queue.offline; queue.setOffline(off); toast(off ? 'Conexión cortada (simulación). La caja sigue vendiendo.' : 'Conexión restablecida', off ? 'warning' : 'success'); }
    if (tg.closest('[data-sales]')) lastSales(shift);
    if (tg.closest('[data-move]')) cashMovement(shift);
    if (tg.closest('[data-close-shift]')) {
      if (!cart.isEmpty() && !await confirm('Hay una venta en curso sin cobrar. ¿Cerrar el turno igualmente?', { danger: true, ok: 'Continuar' })) return;
      if (queue.count) return toast('Hay ventas en cola sin sincronizar. Reconecta antes de cerrar.', 'warning');
      closeShift(shift, () => { shift = null; start(); });
    }
    if (tg.closest('[data-fab]')) document.body.classList.add('cart-open');
    if (tg.closest('[data-closecart]')) document.body.classList.remove('cart-open');
  });
  document.addEventListener('input', debounce(e => { if (e.target.matches('.pos-search [data-q]')) { view.q = e.target.value; drawTiles(); } }, 120));
  document.addEventListener('submit', e => {
    if (!e.target.matches('[data-barcode]')) return;
    e.preventDefault();
    const input = e.target.querySelector('[data-code]');
    const code = input.value.trim();
    if (!code) return;
    const p = db.find('products', x => x.barcode === code || x.sku.toLowerCase() === code.toLowerCase());
    if (!p) toast(`Código ${code} no encontrado`, 'error'); else addProduct(p, 'scan');
    input.value = '';
  });
  document.addEventListener('keydown', e => {
    if (!shift || document.querySelector('.modal-backdrop')) return;
    if (e.key === 'F2') { e.preventDefault(); app.querySelector('[data-q]')?.focus(); }
    if (e.key === 'F4') { e.preventDefault(); openCustomerLookup(); }
    if (e.key === 'F7') { e.preventDefault(); openHeld(); }
    if (e.key === 'F8') { e.preventDefault(); holdOrder(); }
    if (e.key === 'F9') { e.preventDefault(); openPayment(ctx()); }
  });
  cart.subscribe(() => { drawCart(); drawTiles(); });
  queue.subscribe(() => { drawNet(); drawTiles(); });
  db.subscribe(debounce(() => {
    const u = auth.current();
    if (!u || u.active === false || !POS_ROLES.includes(u.role)) { location.href = 'login.html'; return; }
    if (shift) {
      const s = db.get('shifts', shift.id);
      if (!s || s.status !== 'abierto') { shift = null; toast('El turno de esta caja fue cerrado desde otro equipo', 'warning'); start(); return; }
      shift = s; drawTiles(); drawCart(); drawHeld(); drawCats();
    } else if (!document.querySelector('.modal-backdrop')) start();
  }, 80));
  start();
  queue.sync();
}
