// Carrito, cupones y checkout con pago simulado (validación de tarjeta con Luhn).
import { escape, money, toast, date } from '../../../assets/core/ui.js';
import { api } from '../../../assets/core/db.js';
import { db, auth } from '../data/db.js';
import { getCourse, getUser, priceOf, isPublic, enrollment, validateCoupon, checkout, site } from '../data/model.js';
import { cover, starRow } from '../shared/bits.js';
import { getCart, removeFromCart, clearCart, getCoupon, setCoupon } from '../shared/cart.js';

let coupon = getCoupon(); // { code }
const items = () => getCart().map(getCourse).filter(isPublic);
function totals(list) {
  const its = list.map(c => ({ courseId: c.id, price: priceOf(c) }));
  const subtotal = its.reduce((t, x) => t + x.price, 0);
  let discount = 0;
  if (coupon) { const v = validateCoupon(coupon.code, its); if (v.ok) discount = v.discount; else { coupon = null; setCoupon(null); } }
  return { subtotal, discount, total: subtotal - discount, its };
}
const summary = (t, cta) => `<div class="card summary"><h3>Resumen</h3><dl><dt>Subtotal</dt><dd>${money(t.subtotal)}</dd>${t.discount ? `<dt>Cupón ${escape(coupon.code)}</dt><dd style="color:var(--success)">− ${money(t.discount)}</dd>` : ''}<dt class="total">Total</dt><dd class="total">${money(t.total)}</dd></dl>
  <form class="row" data-coupon style="gap:8px;flex-wrap:nowrap;margin-bottom:12px"><input class="input" name="code" placeholder="Código de cupón" aria-label="Código de cupón" value="${escape(coupon?.code || '')}"><button class="btn">Aplicar</button></form>
  ${coupon ? '<button class="btn btn-sm btn-ghost" data-uncoupon style="margin:-6px 0 10px">Quitar cupón</button>' : ''}${cta}</div>`;
function wireCoupon(view, rerender) {
  view.querySelector('[data-coupon]').addEventListener('submit', e => {
    e.preventDefault();
    const code = e.target.code.value.trim();
    if (!code) return;
    const v = validateCoupon(code, items().map(c => ({ courseId: c.id, price: priceOf(c) })));
    if (!v.ok) return toast(v.error, 'error');
    coupon = { code: v.coupon.code }; setCoupon(coupon); toast(`Cupón aplicado: −${money(v.discount)}`, 'success'); rerender();
  });
  view.querySelector('[data-uncoupon]')?.addEventListener('click', () => { coupon = null; setCoupon(null); rerender(); });
}

export function renderCart(view) {
  coupon = getCoupon();
  const u = auth.current();
  const list = items();
  const owned = u ? list.filter(c => enrollment(u.id, c.id)) : [];
  owned.forEach(c => removeFromCart(c.id));
  const ls = list.filter(c => !owned.includes(c));
  const t = totals(ls);
  view.innerHTML = `<section class="page"><div class="container"><div class="section-head"><div><span class="eyebrow">Tu compra</span><h1 style="margin:0">Carrito</h1></div></div>
    ${owned.length ? `<p class="ak-note">Quitamos ${owned.length} curso(s) que ya tienes en tu biblioteca.</p>` : ''}
    ${ls.length ? `<div class="cart-grid"><div class="card">${ls.map(c => `<div class="cart-item"><a href="#/curso/${c.slug}">${cover(c)}</a><div><h3><a href="#/curso/${c.slug}" style="color:var(--text);text-decoration:none">${escape(c.title)}</a></h3><p class="small muted" style="margin:0 0 4px">${escape(getUser(c.instructorId)?.name)}</p></div>
      <div class="row" style="gap:10px;flex-wrap:nowrap"><b>${priceOf(c) ? money(priceOf(c)) : 'Gratis'}</b><button class="btn btn-sm btn-ghost" data-rm="${c.id}" aria-label="Quitar ${escape(c.title)}">✕</button></div></div>`).join('')}</div>
      ${summary(t, '<a class="btn btn-primary btn-lg btn-block" href="#/checkout">Ir a pagar</a>')}</div>`
    : '<div class="card empty"><span class="icon">🛒</span><p>Tu carrito está vacío.</p><a class="btn btn-primary" href="#/cursos">Explorar cursos</a></div>'}
  </div></section>`;
  view.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { removeFromCart(b.dataset.rm); renderCart(view); });
  if (ls.length) wireCoupon(view, () => renderCart(view));
}

const luhn = n => { const d = n.replace(/\D/g, ''); let s = 0; for (let i = 0; i < d.length; i++) { let x = +d[d.length - 1 - i]; if (i % 2) { x *= 2; if (x > 9) x -= 9; } s += x; } return d.length >= 13 && s % 10 === 0; };

export function renderCheckout(view) {
  coupon = getCoupon();
  const u = auth.current();
  const ls = items().filter(c => !u || !enrollment(u.id, c.id));
  if (!ls.length) { location.hash = '#/carrito'; return; }
  if (!u) { view.innerHTML = `<section class="page"><div class="container" style="max-width:640px"><div class="card stack"><h1 style="font-size:28px;margin:0">Inicia sesión para pagar</h1><p class="muted">Tus cursos quedarán asociados a tu cuenta. ¿No tienes una? Créala en segundos.</p><div class="row"><a class="btn btn-primary" href="login.html?next=${encodeURIComponent('index.html#/checkout')}">Ingresar</a><a class="btn" href="login.html?next=${encodeURIComponent('index.html#/checkout')}#registro">Crear cuenta</a></div></div></div></section>`; return; }
  if (u.role !== 'estudiante') { view.innerHTML = '<section class="page"><div class="container"><div class="card empty"><h2>Usa una cuenta de estudiante</h2><p>Las compras se realizan con cuentas de estudiante.</p><a class="btn" href="login.html">Cambiar de cuenta</a></div></div></section>'; return; }
  const t = totals(ls);
  view.innerHTML = `<section class="page"><div class="container"><div class="section-head"><div><span class="eyebrow">Pago seguro (simulado)</span><h1 style="margin:0">Checkout</h1></div><a class="btn btn-ghost" href="#/carrito">← Volver al carrito</a></div>
    <div class="cart-grid"><form class="card stack" data-pay novalidate>
      <h3 style="margin:0">Datos de facturación</h3>
      <div class="form-grid"><div class="field"><label for="bn">Nombre</label><input class="input" id="bn" name="name" value="${escape(u.name)}" autocomplete="name"><small class="error" data-e="name"></small></div>
      <div class="field"><label for="be">Correo</label><input class="input" id="be" name="email" type="email" value="${escape(u.email)}" autocomplete="email"><small class="error" data-e="email"></small></div></div>
      <h3 style="margin:8px 0 0">Medio de pago</h3>
      <div class="pay-methods"><label><input type="radio" name="method" value="Tarjeta de crédito" checked> 💳 Tarjeta de crédito o débito</label><label><input type="radio" name="method" value="Webpay"> 🏦 Webpay (simulado)</label><label><input type="radio" name="method" value="Transferencia"> 🔁 Transferencia bancaria</label></div>
      <div class="form-grid" data-card>
        <div class="field full"><label for="cn">Número de tarjeta</label><input class="input" id="cn" name="card" inputmode="numeric" placeholder="4242 4242 4242 4242" autocomplete="cc-number"><small class="muted">Prueba con 4242 4242 4242 4242. Ninguna tarjeta se cobra.</small><small class="error" data-e="card"></small></div>
        <div class="field"><label for="cx">Vencimiento (MM/AA)</label><input class="input" id="cx" name="exp" placeholder="12/28" autocomplete="cc-exp"><small class="error" data-e="exp"></small></div>
        <div class="field"><label for="cv">CVV</label><input class="input" id="cv" name="cvv" inputmode="numeric" placeholder="123" autocomplete="cc-csc"><small class="error" data-e="cvv"></small></div>
      </div>
      <label class="check"><input type="checkbox" name="terms"> Acepto los términos y la política de reembolso de ${site().refundDays} días</label><small class="error" data-e="terms"></small>
      <button class="btn btn-primary btn-lg" data-submit>Pagar ${money(t.total)}</button>
    </form>
    <div class="stack">${summary(t, '')}<div class="card"><h3>Cursos (${ls.length})</h3><ul class="small" style="padding-left:18px;margin:0">${ls.map(c => `<li>${escape(c.title)} — ${priceOf(c) ? money(priceOf(c)) : 'Gratis'}</li>`).join('')}</ul></div></div></div></div></section>`;
  wireCoupon(view, () => renderCheckout(view));
  const f = view.querySelector('[data-pay]');
  const syncMethod = () => { view.querySelector('[data-card]').hidden = f.method.value !== 'Tarjeta de crédito' || t.total === 0; };
  f.addEventListener('change', syncMethod); syncMethod();
  f.card.addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim(); });
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const err = {};
    if (!f.name.value.trim()) err.name = 'Ingresa tu nombre';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.value)) err.email = 'Correo no válido';
    if (f.method.value === 'Tarjeta de crédito' && totals(ls).total > 0) {
      if (!luhn(f.card.value)) err.card = 'Número de tarjeta no válido';
      const m = f.exp.value.match(/^(\d{2})\/(\d{2})$/);
      if (!m || +m[1] < 1 || +m[1] > 12 || new Date(2000 + +m[2], +m[1]) < new Date()) err.exp = 'Fecha no válida o vencida';
      if (!/^\d{3,4}$/.test(f.cvv.value)) err.cvv = 'CVV no válido';
    }
    if (!f.terms.checked) err.terms = 'Debes aceptar los términos';
    view.querySelectorAll('[data-e]').forEach(s => { s.textContent = err[s.dataset.e] || ''; });
    if (Object.keys(err).length) return toast('Revisa los datos del pago', 'warning');
    const btn = view.querySelector('[data-submit]'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Procesando pago…';
    try {
      const o = await api(() => checkout(u, ls.map(c => c.id), coupon?.code, f.method.value), { latency: [700, 1100] });
      clearCart(); coupon = null; setCoupon(null);
      location.hash = `#/gracias/${o.id}`;
    } catch (ex) { toast(ex.message, 'error'); btn.disabled = false; btn.textContent = 'Reintentar pago'; }
  });
}

export function renderThanks(view, id) {
  const o = db.get('orders', id), u = auth.current();
  if (!o || !u || o.userId !== u.id) { location.hash = '#/'; return; }
  view.innerHTML = `<section class="page"><div class="container" style="max-width:760px"><div class="card stack" style="text-align:center">
    <span style="font-size:54px">🎉</span><h1 style="margin:0">¡Gracias por tu compra!</h1><p class="muted">Pedido <b>#${o.number}</b> · ${date(o.createdAt)} · ${escape(o.method)} · Total ${money(o.total)}</p>
    <div class="stack" style="text-align:left">${o.items.map(x => { const c = getCourse(x.courseId); return `<div class="row between card" style="padding:12px"><b>${escape(c.title)}</b><a class="btn btn-primary btn-sm" href="aprender.html#/curso/${c.id}">Comenzar</a></div>`; }).join('')}</div>
    <div class="row" style="justify-content:center"><a class="btn" href="aprender.html">Ir a mi aprendizaje</a><a class="btn btn-ghost" href="#/cursos">Seguir explorando</a></div>
  </div></div></section>`;
}
