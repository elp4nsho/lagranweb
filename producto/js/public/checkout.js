// Checkout en 5 pasos: pack/colores → envío → pago (+ order bump) → upsell post-compra → confirmación.
import { db, landing, colors, bundles, colorByKey, checkCoupon, trackCheckout, currentRef, abVariant, abConversion, nextOrderNumber, adjustStock, sendEmail, shop } from '../data/db.js';
import { bottleSVG } from '../shared/bottle.js';
import { escape, money, toast, $, $$ } from '../../../assets/core/ui.js';
import { uid, api } from '../../../assets/core/db.js';

const KEY = 'aquilo:co';
const REGIONS = ['Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo', 'Valparaíso', 'Metropolitana', "O'Higgins", 'Maule', 'Ñuble', 'Biobío', 'La Araucanía', 'Los Ríos', 'Los Lagos', 'Aysén', 'Magallanes'];
const load = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) || null; } catch (e) { return null; } };
const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* */ } };

const params = new URLSearchParams(location.search);
let S = load();
if (!S || S.step === 5 || params.get('pack') || params.get('color')) {
  const avail = colors().filter(c => c.stock > 0 && c.active !== false);
  const pref = colorByKey(params.get('color'));
  const color = pref && pref.stock > 0 ? pref.key : (avail[0] || colors()[0]).key;
  const b = bundles().find(x => x.id === params.get('pack')) || bundles().find(x => x.qty === 2) || bundles()[0];
  S = { step: 1, bundleId: b.id, items: Array(b.qty).fill(color), bump: false, coupon: '', customer: {}, ship: 'estandar', orderId: null, cartId: null };
  save();
}
trackCheckout();

const bundle = () => bundles(true).find(b => b.id === S.bundleId) || bundles()[0];
function totals() {
  const L = landing(), b = bundle();
  const bump = S.bump && L.bump.enabled ? L.bump.price : 0;
  const subtotal = b.price + bump;
  const cp = S.coupon ? checkCoupon(S.coupon, subtotal) : null;
  const discount = cp && cp.ok ? cp.discount : 0;
  const shipping = S.ship === 'express' && b.qty < 2 ? L.expressPrice : 0;
  return { b, bump, subtotal, discount, cp, shipping, total: subtotal - discount + shipping };
}

// ---------- Resumen lateral ----------
function renderSummary() {
  const t = totals(), L = landing();
  const order = S.orderId ? db.get('orders', S.orderId) : null;
  const counts = {};
  (order ? order.items : S.items).forEach(k => { counts[k] = (counts[k] || 0) + 1; });
  const lines = order ? [
    ['Subtotal', money(order.subtotal)], order.discount ? ['Descuento ' + order.coupon, '−' + money(order.discount), 'disc'] : null, ['Envío', order.shipping ? money(order.shipping) : 'Gratis']
  ] : [
    [t.b.name, money(t.b.price)], t.bump ? [L.bump.name, money(t.bump)] : null, t.discount ? [`Cupón ${t.cp.coupon.code}`, '−' + money(t.discount), 'disc'] : null,
    ['Envío', t.shipping ? money(t.shipping) : 'Gratis']
  ];
  $('#summary').innerHTML = `<div class="card stack">
    <h3 style="margin:0">Tu pedido</h3>
    <div class="sum-items">${Object.entries(counts).map(([k, n]) => { const c = colorByKey(k); return `<div class="sum-item">${bottleSVG(c)}<div class="grow"><b>Aquilo Pulse 650 ml</b><br><span class="muted">${escape(c ? c.name : k)}</span></div><b>×${n}</b></div>`; }).join('')}</div>
    <div>${lines.filter(Boolean).map(([a, b, cls]) => `<div class="sum-line ${cls || ''}"><span>${escape(a)}</span><span>${escape(b)}</span></div>`).join('')}
    <div class="sum-line total"><span>Total</span><span>${money(order ? order.total : t.total)}</span></div></div>
    ${!order ? `<form class="row" id="couponForm" style="gap:8px;flex-wrap:nowrap"><input class="input" name="code" placeholder="Cupón de descuento" aria-label="Cupón" value="${escape(S.coupon)}"><button class="btn" type="submit">Aplicar</button></form>
      ${S.coupon ? `<p class="small" style="margin:0;color:var(--${t.cp && t.cp.ok ? 'success' : 'danger'})">${escape(t.cp ? t.cp.msg : '')}${t.cp && t.cp.ok ? ' ✓' : ''} <button class="btn btn-ghost btn-sm" type="button" data-rmcoupon>Quitar</button></p>` : '<p class="small muted" style="margin:0">Prueba con <b class="mono">BIENVENIDA10</b></p>'}` : ''}
  </div>
  <div class="card small stack" style="gap:6px">
    <span>🚚 Despacho en 24 h hábiles</span><span>↩️ ${L.guaranteeDays} días de prueba sin riesgo</span><span>🛡️ 2 años de garantía</span>
  </div>`;
  $('#couponForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const code = e.target.code.value.trim().toUpperCase();
    if (!code) return;
    const r = checkCoupon(code, totals().subtotal);
    if (!r.ok) return toast(r.msg, 'error');
    S.coupon = code; save(); renderSummary(); toast(`Cupón aplicado: ${r.msg}`, 'success');
  });
  $('[data-rmcoupon]')?.addEventListener('click', () => { S.coupon = ''; save(); renderSummary(); });
}

function setSteps() {
  $$('#steps li').forEach((li, i) => { li.classList.toggle('done', i + 1 < S.step); li.classList.toggle('on', i + 1 === S.step); li.setAttribute('aria-current', i + 1 === S.step ? 'step' : 'false'); });
}

// ---------- Paso 1: pack y colores ----------
function step1(view) {
  const cols = colors().filter(c => c.active !== false);
  const b = bundle();
  view.innerHTML = `<div class="card stack">
    <h2 style="margin:0">1. Elige tu pack</h2>
    <div class="stack" style="gap:10px" id="packs">${bundles().map(x => `<label class="pack-opt"><input type="radio" name="pack" value="${x.id}" ${x.id === b.id ? 'checked' : ''}>
      <span class="grow"><b>${escape(x.name)}</b><span class="small muted">${escape(x.gift ? '🎁 ' + x.gift : x.desc)}</span></span>
      ${x.badge ? `<span class="badge badge-primary">${escape(x.badge)}</span>` : ''}
      <span class="pp"><b>${money(x.price)}</b><br><s class="small muted">${money(x.listPrice)}</s></span></label>`).join('')}</div>
  </div>
  <div class="card stack">
    <h3 style="margin:0">Color de cada botella</h3>
    <div id="units">${S.items.map((k, i) => `<div class="unit-row">${bottleSVG(colorByKey(k))}<b>Botella ${i + 1}</b>
      <div class="sw-row" role="radiogroup" aria-label="Color botella ${i + 1}">${cols.map(c => `<button type="button" class="sw-btn ${c.key === k ? 'on' : ''}" style="--sw:${c.base}" data-unit="${i}" data-color="${c.key}" aria-pressed="${c.key === k}" title="${escape(c.name)}${c.stock <= 0 ? ' (agotado)' : ''}" ${c.stock <= 0 ? 'data-out disabled' : ''}><span class="sr-only">${escape(c.name)}</span></button>`).join('')}</div>
      <span class="small muted">${escape(colorByKey(k)?.name || '')}</span></div>`).join('')}</div>
    <button class="btn btn-primary btn-lg btn-block" id="next1">Continuar al envío →</button>
  </div>`;
  $('#packs').addEventListener('change', e => {
    const nb = bundles().find(x => x.id === e.target.value);
    S.bundleId = nb.id;
    S.items = Array.from({ length: nb.qty }, (_, i) => S.items[i] || S.items[0]);
    save(); render();
  });
  $('#units').addEventListener('click', e => {
    const btn = e.target.closest('[data-unit]');
    if (!btn || btn.disabled) return;
    S.items[+btn.dataset.unit] = btn.dataset.color; save(); render();
  });
  $('#next1').addEventListener('click', () => {
    const need = {};
    S.items.forEach(k => { need[k] = (need[k] || 0) + 1; });
    const lacking = Object.entries(need).find(([k, n]) => (colorByKey(k)?.stock || 0) < n);
    if (lacking) return toast(`No hay stock suficiente de ${colorByKey(lacking[0]).name}`, 'error');
    go(2);
  });
}

// ---------- Paso 2: envío ----------
function step2(view) {
  const c = S.customer, L = landing(), b = bundle();
  const f = (name, label, attrs = '', full = false) => `<div class="field" ${full ? 'style="grid-column:1/-1"' : ''}><label for="s-${name}">${label}</label><input class="input" id="s-${name}" name="${name}" value="${escape(c[name] || '')}" ${attrs} required></div>`;
  view.innerHTML = `<form class="card stack" id="shipForm" novalidate>
    <h2 style="margin:0">2. Datos de envío</h2>
    <div class="grid-2">
      ${f('name', 'Nombre completo', 'autocomplete="name"')}${f('email', 'Correo', 'type="email" autocomplete="email"')}
      ${f('phone', 'Teléfono', 'type="tel" autocomplete="tel" placeholder="+56 9 1234 5678"')}
      <div class="field"><label for="s-region">Región</label><select class="select" id="s-region" name="region" required><option value="">Selecciona</option>${REGIONS.map(r => `<option ${c.region === r ? 'selected' : ''}>${escape(r)}</option>`).join('')}</select></div>
      ${f('address', 'Dirección', 'autocomplete="street-address" placeholder="Calle, número, depto."', true)}
      ${f('city', 'Comuna', 'autocomplete="address-level2"')}
    </div>
    <fieldset class="stack" style="border:0;padding:0;margin:0;gap:8px"><legend class="label" style="margin-bottom:8px">Método de envío</legend>
      <label class="pack-opt ship-opt"><input type="radio" name="ship" value="estandar" ${S.ship !== 'express' ? 'checked' : ''}><span class="grow">Estándar (2–4 días hábiles)</span><b>Gratis</b></label>
      <label class="pack-opt ship-opt"><input type="radio" name="ship" value="express" ${S.ship === 'express' ? 'checked' : ''}><span class="grow">Express (24 h)</span><b>${b.qty >= 2 ? 'Gratis con tu pack' : money(L.expressPrice)}</b></label>
    </fieldset>
    <div class="row between"><button class="btn btn-ghost" type="button" data-back>← Volver</button><button class="btn btn-primary btn-lg" type="submit">Continuar al pago →</button></div>
  </form>`;
  const form = $('#shipForm');
  form.addEventListener('change', e => { if (e.target.name === 'ship') { S.ship = e.target.value; save(); renderSummary(); } });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    let ok = true;
    ['name', 'email', 'phone', 'region', 'address', 'city'].forEach(k => {
      let bad = !String(d[k] || '').trim();
      if (k === 'email' && !/^\S+@\S+\.\S+$/.test(d[k])) bad = true;
      if (k === 'phone' && String(d[k]).replace(/\D/g, '').length < 8) bad = true;
      form.elements[k].classList.toggle('invalid', bad);
      if (bad) ok = false;
    });
    if (!ok) return toast('Revisa los campos marcados', 'warning');
    const { ship, ...customer } = d;
    S.customer = Object.fromEntries(Object.entries(customer).map(([k, v]) => [k, String(v).trim()]));
    S.ship = ship;
    // Registra el carrito: si no paga, queda como "abandonado" para las automatizaciones.
    const t = totals();
    const cart = { name: S.customer.name, email: S.customer.email, bundleId: t.b.id, bundleName: t.b.name, total: t.total, step: 'Pago', reminders: 0, recovered: false };
    if (S.cartId && db.get('carts', S.cartId)) db.update('carts', S.cartId, cart);
    else S.cartId = db.insert('carts', { id: uid('k'), ...cart }).id;
    go(3);
  });
  form.querySelector('[data-back]').addEventListener('click', () => go(1));
}

// ---------- Paso 3: pago + order bump ----------
function step3(view) {
  const L = landing();
  view.innerHTML = `<form class="card stack" id="payForm" novalidate>
    <h2 style="margin:0">3. Pago</h2>
    <p class="demo-note">🔒 Pago de demostración: no ingreses datos reales. Usa <b class="mono">4242 4242 4242 4242</b> (aprobada) o <b class="mono">4000 0000 0000 0002</b> (rechazada).</p>
    <div class="card-prev" aria-hidden="true"><span class="chipc"></span><span class="num" data-cp="num">•••• •••• •••• ••••</span><div class="rowc"><span data-cp="name">NOMBRE APELLIDO</span><span data-cp="exp">MM/AA</span></div></div>
    <div class="grid-2">
      <div class="field" style="grid-column:1/-1"><label for="p-num">Número de tarjeta</label><input class="input mono" id="p-num" name="num" inputmode="numeric" autocomplete="off" maxlength="19" placeholder="1234 5678 9012 3456" required></div>
      <div class="field" style="grid-column:1/-1"><label for="p-name">Nombre en la tarjeta</label><input class="input" id="p-name" name="cname" autocomplete="off" value="${escape(S.customer.name || '')}" required></div>
      <div class="field"><label for="p-exp">Vencimiento</label><input class="input mono" id="p-exp" name="exp" inputmode="numeric" maxlength="5" placeholder="MM/AA" required></div>
      <div class="field"><label for="p-cvc">CVC</label><input class="input mono" id="p-cvc" name="cvc" inputmode="numeric" maxlength="4" placeholder="123" required></div>
    </div>
    ${L.bump.enabled ? `<div class="bump"><label class="check"><input type="checkbox" name="bump" ${S.bump ? 'checked' : ''}>
      <span>Sí, agrega ${escape(L.bump.name)} por <b>${money(L.bump.price)}</b> <s class="muted small">${money(L.bump.listPrice)}</s><br><span class="small muted" style="font-weight:400">${escape(L.bump.desc)}</span></span></label></div>` : ''}
    <div class="row between"><button class="btn btn-ghost" type="button" data-back>← Volver</button><button class="btn btn-primary btn-lg" type="submit" data-pay>Pagar ${money(totals().total)}</button></div>
  </form>`;
  const form = $('#payForm');
  const cp = n => form.parentElement.querySelector(`[data-cp="${n}"]`);
  form.addEventListener('input', e => {
    const el = e.target;
    if (el.name === 'num') { el.value = el.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim(); cp('num').textContent = (el.value + ' •••• •••• •••• ••••').slice(0, 19); }
    if (el.name === 'exp') { let v = el.value.replace(/\D/g, '').slice(0, 4); if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2); el.value = v; cp('exp').textContent = v || 'MM/AA'; }
    if (el.name === 'cvc') el.value = el.value.replace(/\D/g, '').slice(0, 4);
    if (el.name === 'cname') cp('name').textContent = el.value.toUpperCase() || 'NOMBRE APELLIDO';
  });
  form.addEventListener('change', e => {
    if (e.target.name === 'bump') { S.bump = e.target.checked; save(); renderSummary(); form.querySelector('[data-pay]').textContent = `Pagar ${money(totals().total)}`; if (S.bump) toast('Kit Pro agregado a tu pedido', 'success', 1600); }
  });
  form.querySelector('[data-back]').addEventListener('click', () => go(2));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const digits = d.num.replace(/\D/g, '');
    const checks = { num: digits.length === 16, cname: d.cname.trim().length > 2, exp: /^(0[1-9]|1[0-2])\/\d\d$/.test(d.exp), cvc: /^\d{3,4}$/.test(d.cvc) };
    Object.entries(checks).forEach(([k, ok]) => form.elements[k].classList.toggle('invalid', !ok));
    if (Object.values(checks).includes(false)) return toast('Revisa los datos de la tarjeta', 'warning');
    const btn = form.querySelector('[data-pay]');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Procesando…';
    try {
      await api(() => { if (digits === '4000000000000002') throw new Error('Pago rechazado por el banco emisor (simulado)'); }, { latency: [900, 1400] });
      placeOrder(digits.slice(-4));
    } catch (err) {
      toast(err.message, 'error', 4500);
      btn.disabled = false; btn.textContent = `Pagar ${money(totals().total)}`;
    }
  });
}

function placeOrder(last4) {
  const t = totals(), L = landing();
  const ref = currentRef();
  const variant = abVariant() || '';
  const number = nextOrderNumber();
  const order = db.insert('orders', {
    id: 'o' + number.slice(3), number, customer: S.customer, bundleId: t.b.id, bundleName: t.b.name, bundlePrice: t.b.price, items: [...S.items],
    bump: !!t.bump, bumpPrice: t.bump, upsell: false, upsellPrice: 0, coupon: t.discount ? t.cp.coupon.code : '', discount: t.discount,
    shipping: t.shipping, shipMethod: S.ship, subtotal: t.subtotal, total: t.total, status: 'pagado',
    history: [{ status: 'pagado', at: new Date().toISOString(), note: `Pago aprobado · tarjeta •••• ${last4}` }],
    ref: ref ? ref.code : '', variant, carrier: '', tracking: '', notes: []
  });
  adjustStock(order.items, -1);
  if (t.discount) db.update('coupons', t.cp.coupon.id, { uses: t.cp.coupon.uses + 1 });
  abConversion(variant);
  if (S.cartId) {
    const cart = db.get('carts', S.cartId);
    if (cart && cart.reminders) db.update('carts', cart.id, { recovered: true }); else if (cart) db.remove('carts', cart.id);
  }
  sendEmail(order.customer.email, `Tu pedido ${order.number} está confirmado`, 'au3');
  db.log('Nuevo pedido', `${order.number} · ${order.customer.name} · ${money(order.total)}${ref ? ' · ref ' + ref.code : ''}`);
  S.orderId = order.id;
  go(L.upsell.enabled && colors().some(c => c.stock > 0) ? 4 : 5);
}

// ---------- Paso 4: upsell de un clic ----------
let upTimer;
function step4(view) {
  const L = landing(), order = db.get('orders', S.orderId);
  const avail = colors().filter(c => c.stock > 0 && c.active !== false);
  let pick = avail.find(c => c.key === order.items[0]) || avail[0];
  const end = Date.now() + 5 * 60e3;
  view.innerHTML = `<div class="card upsell-card">
    <span class="badge badge-success">✓ Pago aprobado · pedido ${escape(order.number)}</span>
    <span class="timer-pill">⏱ Oferta única · <b id="upT">05:00</b></span>
    <h2 style="margin:0">¡Espera! ${escape(L.upsell.name)}</h2>
    <p class="muted" style="margin:0">${escape(L.upsell.desc)}</p>
    <div id="upBottle">${bottleSVG(pick)}</div>
    <div class="sw-row" id="upColors">${avail.map(c => `<button type="button" class="sw-btn ${c.key === pick.key ? 'on' : ''}" style="--sw:${c.base}" data-color="${c.key}" aria-pressed="${c.key === pick.key}" title="${escape(c.name)}"><span class="sr-only">${escape(c.name)}</span></button>`).join('')}</div>
    <p style="margin:0"><s class="muted">${money(L.upsell.listPrice)}</s> <b class="big-num">${money(L.upsell.price)}</b></p>
    <button class="btn btn-primary btn-lg btn-block" id="upYes">Sí, agrégala a mi pedido (1 clic)</button>
    <button class="btn btn-ghost btn-block" id="upNo">No, gracias</button>
    <p class="small muted" style="margin:0">Se cobra a la misma tarjeta y viaja en el mismo envío.</p>
  </div>`;
  $('#upColors').addEventListener('click', e => {
    const b = e.target.closest('[data-color]'); if (!b) return;
    pick = colorByKey(b.dataset.color);
    $('#upBottle').innerHTML = bottleSVG(pick);
    $$('#upColors .sw-btn').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
  });
  clearInterval(upTimer);
  upTimer = setInterval(() => {
    const left = Math.max(0, end - Date.now());
    const el = $('#upT'); if (!el) return clearInterval(upTimer);
    el.textContent = `${String(Math.floor(left / 6e4)).padStart(2, '0')}:${String(Math.floor(left / 1e3) % 60).padStart(2, '0')}`;
    if (!left) { clearInterval(upTimer); go(5); }
  }, 1000);
  $('#upYes').addEventListener('click', async e => {
    e.target.disabled = true; e.target.innerHTML = '<span class="spinner"></span> Agregando…';
    await api(() => null, { latency: [500, 800] });
    const o = db.get('orders', S.orderId);
    db.update('orders', o.id, { upsell: true, upsellPrice: L.upsell.price, items: [...o.items, pick.key], subtotal: o.subtotal + L.upsell.price, total: o.total + L.upsell.price, history: [...o.history, { status: 'pagado', at: new Date().toISOString(), note: `Upsell aceptado: +1 ${pick.name}` }] });
    adjustStock([pick.key], -1);
    db.log('Upsell aceptado', `${o.number} +1 ${pick.name}`);
    clearInterval(upTimer);
    toast('¡Listo! Agregamos otra Aquilo a tu pedido', 'success');
    go(5);
  });
  $('#upNo').addEventListener('click', () => { clearInterval(upTimer); go(5); });
}

// ---------- Paso 5: confirmación ----------
function step5(view) {
  const o = db.get('orders', S.orderId);
  if (!o) { S = null; sessionStorage.removeItem(KEY); location.href = 'index.html'; return; }
  view.innerHTML = `<div class="card stack" style="text-align:center;align-items:center">
    <div class="done-ico" aria-hidden="true">✓</div>
    <h2 style="margin:0">¡Pedido confirmado!</h2>
    <p style="margin:0">Gracias, <b>${escape(o.customer.name.split(' ')[0])}</b>. Tu pedido <b class="mono">${escape(o.number)}</b> ya está en nuestro sistema.</p>
    <p class="muted" style="margin:0">Enviamos el comprobante a ${escape(o.customer.email)}. Despachamos en 24 h hábiles con ${escape(shop().carrier)}.</p>
    <div class="row" style="justify-content:center">
      <a class="btn btn-primary" href="seguimiento.html?n=${encodeURIComponent(o.number)}&e=${encodeURIComponent(o.customer.email)}">Seguir mi pedido</a>
      <a class="btn" href="index.html" id="again">Volver a la tienda</a>
    </div>
  </div>
  <div class="card stack"><h3 style="margin:0">🎁 Comparte y regala $5.000</h3><p class="muted" style="margin:0">Tus amigos obtienen $5.000 de descuento con el cupón <b class="mono">AGUA5000</b>.</p></div>`;
  sessionStorage.removeItem(KEY);
}

const STEPS = { 1: step1, 2: step2, 3: step3, 4: step4, 5: step5 };
function go(n) {
  if (S.orderId && n < 4) n = 5; // un pedido pagado no vuelve atrás
  S.step = n; save(); render(); window.scrollTo({ top: 0, behavior: 'smooth' });
}
function render() {
  setSteps();
  STEPS[S.step]($('#stepView'));
  renderSummary();
}

// Precios, stock o cupones cambiados desde el panel se reflejan sin recargar.
db.subscribe(ch => {
  if (['traffic', 'emails', 'carts'].includes(ch.col) || ch.type === 'log') return;
  if (document.activeElement && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) { renderSummary(); return; }
  if (S.step === 1) render(); else renderSummary();
});

render();
