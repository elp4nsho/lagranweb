// Checkout en 4 pasos: contacto → despacho → pago → revisión. Crea el pedido en la DB.
import { html, raw, money, toast } from '../../../assets/core/ui.js';
import { api } from '../../../assets/core/db.js';
import { db, auth, settings, placeOrder, colorHex } from '../data/db.js';
import { productArt } from '../shared/art.js';
import { cart } from '../shared/cart.js';
import { emptyState } from './parts.js';

const STEPS = ['Contacto', 'Despacho', 'Pago', 'Revisión'];
const REGIONS = ['Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo', 'Valparaíso', 'Metropolitana', "O'Higgins", 'Maule', 'Ñuble', 'Biobío', 'Araucanía', 'Los Ríos', 'Los Lagos', 'Aysén', 'Magallanes'];
let st = null;

function initState() {
  const u = auth.current();
  const isCust = u && u.role === 'customer';
  const def = isCust ? (u.addresses || []).find(a => a.isDefault) || (u.addresses || [])[0] : null;
  st = {
    step: 0, email: isCust ? u.email : '', name: isCust ? u.name : '', phone: isCust ? (u.phone || '') : '',
    addrId: def ? def.id : 'new', street: '', comuna: '', region: 'Metropolitana', saveAddr: true,
    payment: 'tarjeta', card: '', cardName: '', exp: '', cvv: '', terms: false, busy: false
  };
}

export function renderCheckout(view) {
  if (!st) initState();
  const lines = cart.lines();
  if (!lines.length) {
    view.innerHTML = `<section class="section"><div class="container">${emptyState('🛒', 'No hay nada que pagar', 'Tu carro está vacío. Agrega productos para continuar.', '<a class="btn btn-primary" href="#/catalogo">Ir al catálogo</a>')}</div></section>`;
    return;
  }
  const u = auth.current();
  const isCust = u && u.role === 'customer';
  const sett = settings();
  const rates = sett.shipping?.rates || [];
  if (!rates.some(r => r.id === cart.raw().shippingId) && rates[0]) cart.setShipping(rates[0].id);
  const t = cart.totals();

  view.innerHTML = html`<section class="section tight checkout-page"><div class="container">
    <h1>Finalizar compra</h1>
    <ol class="steps">${STEPS.map((s, i) => raw(`<li class="${i < st.step ? 'done' : i === st.step ? 'current' : ''}">${s}</li>`))}</ol>
    <div class="checkout">
      <form class="card stack" id="co-form" novalidate>${raw(stepBody(st.step, { u, isCust, rates, t, lines }))}
        <div class="row between" style="margin-top:8px">
          ${st.step > 0 ? raw('<button type="button" class="btn btn-ghost" data-back>← Volver</button>') : raw('<a class="btn btn-ghost" href="#/catalogo">← Seguir comprando</a>')}
          <button class="btn btn-primary btn-lg" ${st.busy ? 'disabled' : ''}>${st.busy ? raw('<span class="spinner"></span> Procesando…') : st.step === 3 ? `Confirmar y pagar ${money(t.total)}` : 'Continuar →'}</button>
        </div>
      </form>
      <aside class="card stack">
        <h3 style="margin:0">Resumen (${lines.reduce((s, l) => s + l.qty, 0)})</h3>
        ${lines.map(l => raw(html`<div class="line-item" style="grid-template-columns:56px minmax(0,1fr) auto"><span class="thumb" style="width:56px;height:56px">${raw(productArt(l.product, colorHex(l.product, l.color)))}</span><div><b class="name">${l.name}</b><small>${l.color} · ${l.size} · x${l.qty}</small>${l.short ? raw(`<small class="tag-sale">Stock insuficiente (${l.stock})</small>`) : ''}</div><b class="nowrap">${money(l.price * l.qty)}</b></div>`))}
        <hr style="margin:4px 0">
        <div class="sum-row"><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
        ${t.discount ? raw(html`<div class="sum-row"><span>Descuento ${t.coupon?.code}</span><span class="tag-sale">−${money(t.discount)}</span></div>`) : ''}
        <div class="sum-row"><span>${t.rate.name}</span><span>${t.shipping ? money(t.shipping) : 'Gratis'}</span></div>
        <div class="sum-row total"><span>Total</span><span>${money(t.total)}</span></div>
        <small class="muted">Incluye IVA ${money(t.iva)}${t.coupon ? '' : ' · ¿Tienes cupón? Aplícalo en el carro.'}</small>
      </aside>
    </div>
  </div></section>`;

  const form = view.querySelector('#co-form');
  form.addEventListener('input', e => {
    const k = e.target.name;
    if (!k) return;
    st[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (k === 'addrId' || k === 'payment') renderCheckout(swap(view));
  });
  form.addEventListener('change', e => {
    if (e.target.name === 'ship') { cart.setShipping(e.target.value); renderCheckout(swap(view)); }
  });
  form.addEventListener('click', e => { if (e.target.closest('[data-back]')) { st.step--; renderCheckout(swap(view)); } });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const err = validate(st.step, { isCust, u });
    if (err) return toast(err, 'warning');
    if (st.step < 3) { st.step++; renderCheckout(swap(view)); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    // Confirmar
    const ls = cart.lines();
    const short = ls.find(l => l.short);
    if (short) return toast(`No hay stock suficiente de ${short.name} (${short.size})`, 'error');
    if (st.payment === 'tarjeta' && st.card.replace(/\D/g, '').endsWith('0000')) return toast('Pago rechazado por el banco emisor. Prueba con otra tarjeta.', 'error');
    st.busy = true; renderCheckout(swap(view));
    const address = shippingAddress(u, isCust);
    const order = await api(() => placeOrder({
      user: isCust ? u : null, customer: { name: st.name.trim(), email: st.email.trim(), phone: st.phone.trim() },
      address, lines: ls, couponCode: cart.raw().coupon, shippingId: cart.raw().shippingId, payment: st.payment
    }), { latency: [700, 1100] });
    if (isCust && st.addrId === 'new' && st.saveAddr && address) {
      const addresses = [...(u.addresses || []), { id: 'a' + Date.now().toString(36), label: 'Nueva', name: st.name, ...address, phone: st.phone, isDefault: !(u.addresses || []).length }];
      db.update('users', u.id, { addresses, phone: u.phone || st.phone });
    }
    try { sessionStorage.setItem('raiz:last-order', order.id); } catch (er) { /* sin storage */ }
    cart.clear();
    st = null;
    location.hash = `#/pedido/${order.id}?nuevo=1`;
  });
}

function shippingAddress(u, isCust) {
  if (cart.raw().shippingId === 'pickup') return null;
  if (isCust && st.addrId !== 'new') {
    const a = (u.addresses || []).find(x => x.id === st.addrId);
    if (a) return { street: a.street, comuna: a.comuna, region: a.region };
  }
  return { street: st.street.trim(), comuna: st.comuna.trim(), region: st.region };
}

function validate(step, { isCust, u }) {
  if (step === 0) {
    if (!st.name.trim()) return 'Ingresa tu nombre';
    if (!/^\S+@\S+\.\S+$/.test(st.email)) return 'Ingresa un correo válido';
    if (st.phone.replace(/\D/g, '').length < 8) return 'Ingresa un teléfono válido';
  }
  if (step === 1 && cart.raw().shippingId !== 'pickup' && (!isCust || st.addrId === 'new')) {
    if (!st.street.trim() || !st.comuna.trim()) return 'Completa la dirección de despacho';
  }
  if (step === 2 && st.payment === 'tarjeta') {
    if (st.card.replace(/\D/g, '').length !== 16) return 'El número de tarjeta debe tener 16 dígitos';
    if (!st.cardName.trim()) return 'Ingresa el nombre del titular';
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(st.exp)) return 'Vencimiento en formato MM/AA';
    if (!/^\d{3,4}$/.test(st.cvv)) return 'CVV inválido';
  }
  if (step === 3 && !st.terms) return 'Debes aceptar los términos y condiciones';
  return '';
}

function stepBody(step, { u, isCust, rates, t }) {
  const v = k => st[k] ?? '';
  if (step === 0) return html`<h2 style="margin:0">Datos de contacto</h2>
    ${!isCust ? raw(`<div class="card" style="background:var(--surface-2);box-shadow:none"><b>¿Ya tienes cuenta?</b> <a href="login.html?next=${encodeURIComponent('index.html#/checkout')}">Inicia sesión</a> para usar tus direcciones guardadas y seguir tus pedidos. También puedes comprar como invitado.</div>`) : raw(html`<p class="muted" style="margin:0">Comprando como <b>${u.name}</b>.</p>`)}
    <div class="form-grid">
      <div class="field full"><label for="co-email">Correo electrónico *</label><input class="input" id="co-email" name="email" type="email" value="${v('email')}" autocomplete="email"></div>
      <div class="field"><label for="co-name">Nombre completo *</label><input class="input" id="co-name" name="name" value="${v('name')}" autocomplete="name"></div>
      <div class="field"><label for="co-phone">Teléfono *</label><input class="input" id="co-phone" name="phone" value="${v('phone')}" placeholder="+56 9 1234 5678" autocomplete="tel"></div>
    </div>`;
  if (step === 1) {
    const ship = cart.raw().shippingId;
    const addrs = isCust ? (u.addresses || []) : [];
    return html`<h2 style="margin:0">Despacho</h2>
      <div class="stack" style="gap:10px">${rates.map(r => raw(html`<label class="option"><input type="radio" name="ship" value="${r.id}" ${ship === r.id ? 'checked' : ''}><span class="grow"><b>${r.name}</b><small>${r.days}</small></span><b>${t.free && r.price ? raw(`<span class="strike small">${money(r.price)}</span> Gratis`) : r.price ? money(r.price) : 'Gratis'}</b></label>`))}</div>
      ${ship === 'pickup' ? raw(html`<p class="card" style="box-shadow:none;margin:0">📍 Retira en <b>${settings().address}</b>. Te avisaremos por correo cuando esté listo.</p>`) : raw(html`
        <h3 style="margin:8px 0 0">Dirección</h3>
        ${addrs.length ? raw(html`<div class="stack" style="gap:10px">${addrs.map(a => raw(html`<label class="option"><input type="radio" name="addrId" value="${a.id}" ${st.addrId === a.id ? 'checked' : ''}><span class="grow"><b>${a.label}</b><small>${a.street}, ${a.comuna}, ${a.region}</small></span></label>`))}<label class="option"><input type="radio" name="addrId" value="new" ${st.addrId === 'new' ? 'checked' : ''}><span class="grow"><b>Usar otra dirección</b></span></label></div>`) : ''}
        ${!addrs.length || st.addrId === 'new' ? raw(html`<div class="form-grid">
          <div class="field full"><label for="co-street">Calle, número y depto *</label><input class="input" id="co-street" name="street" value="${v('street')}" autocomplete="street-address"></div>
          <div class="field"><label for="co-comuna">Comuna *</label><input class="input" id="co-comuna" name="comuna" value="${v('comuna')}"></div>
          <div class="field"><label for="co-region">Región</label><select class="select" id="co-region" name="region">${REGIONS.map(r => raw(`<option ${r === st.region ? 'selected' : ''}>${r}</option>`))}</select></div>
          ${isCust ? raw(`<label class="check full"><input type="checkbox" name="saveAddr" ${st.saveAddr ? 'checked' : ''}> Guardar en mis direcciones</label>`) : ''}
        </div>`) : ''}`)}`;
  }
  if (step === 2) return html`<h2 style="margin:0">Pago</h2>
    <label class="option"><input type="radio" name="payment" value="tarjeta" ${st.payment === 'tarjeta' ? 'checked' : ''}><span class="grow"><b>Tarjeta de crédito o débito</b><small>Pago inmediato · Visa, Mastercard, Amex</small></span></label>
    <label class="option"><input type="radio" name="payment" value="transferencia" ${st.payment === 'transferencia' ? 'checked' : ''}><span class="grow"><b>Transferencia bancaria</b><small>Tu pedido se prepara cuando confirmemos el pago (máx. 24 h)</small></span></label>
    ${st.payment === 'tarjeta' ? raw(html`<div class="form-grid">
      <div class="field full"><label for="co-card">Número de tarjeta *</label><input class="input mono" id="co-card" name="card" inputmode="numeric" maxlength="19" value="${v('card')}" placeholder="4242 4242 4242 4242"><small class="muted">Demo: cualquier número de 16 dígitos funciona; uno que termine en 0000 será rechazado.</small></div>
      <div class="field full"><label for="co-cname">Nombre del titular *</label><input class="input" id="co-cname" name="cardName" value="${v('cardName')}"></div>
      <div class="field"><label for="co-exp">Vencimiento *</label><input class="input mono" id="co-exp" name="exp" maxlength="5" value="${v('exp')}" placeholder="MM/AA"></div>
      <div class="field"><label for="co-cvv">CVV *</label><input class="input mono" id="co-cvv" name="cvv" maxlength="4" inputmode="numeric" value="${v('cvv')}" placeholder="123"></div>
    </div>`) : raw('<p class="card" style="box-shadow:none;margin:0">Al confirmar te mostraremos los datos bancarios de <b>Raíz SpA</b>. Envía el comprobante a pagos@raiz.cl indicando tu número de pedido.</p>')}`;
  const addr = shippingAddress(u, isCust);
  return html`<h2 style="margin:0">Revisa tu pedido</h2>
    <dl class="kv">
      <dt>Contacto</dt><dd>${st.name} · ${st.email} · ${st.phone}</dd>
      <dt>Despacho</dt><dd>${t.rate.name}${addr ? ` · ${addr.street}, ${addr.comuna}, ${addr.region}` : ''}</dd>
      <dt>Pago</dt><dd>${st.payment === 'tarjeta' ? `Tarjeta terminada en ${st.card.replace(/\D/g, '').slice(-4)}` : 'Transferencia bancaria'}</dd>
      <dt>Total</dt><dd>${money(t.total)}</dd>
    </dl>
    <label class="check"><input type="checkbox" name="terms" ${st.terms ? 'checked' : ''}> Acepto los términos y condiciones y la política de cambios.</label>`;
}

function swap(el) { const n = document.createElement('div'); el.replaceWith(n); return n; }
export const resetCheckout = () => { st = null; };
