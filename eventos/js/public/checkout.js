// Checkout: datos del comprador, código promocional, cargos y pago simulado. Confirmación de compra.
import { db, auth } from '../data/db.js';
import { html, raw, $, money, toast, sleep, escape } from '../../../assets/core/ui.js';
import { getHold, cartLines, totals, findPromo, purchase, holdKey } from '../shared/inventory.js';
import { poster } from '../shared/art.js';
import { fmtLong, fmtHour } from '../shared/format.js';

const luhn = n => { let s = 0, alt = false; for (let i = n.length - 1; i >= 0; i--) { let d = +n[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } s += d; alt = !alt; } return n.length >= 13 && s % 10 === 0; };
const brandOf = n => (/^4/.test(n) ? 'Visa' : /^5[1-5]/.test(n) ? 'Mastercard' : /^3[47]/.test(n) ? 'Amex' : 'Tarjeta');

export function paymentFields(u) {
  return `<div class="tabs" role="tablist" style="margin-bottom:4px"><button type="button" class="tab active" data-pm="card">💳 Tarjeta</button><button type="button" class="tab" data-pm="debit">🏦 Débito / transferencia</button></div>
  <div data-pane="card" class="stack" style="gap:12px">
    <div class="field"><label>Número de tarjeta</label><input class="input mono" name="num" inputmode="numeric" autocomplete="cc-number" placeholder="4242 4242 4242 4242" maxlength="19"></div>
    <div class="field"><label>Nombre en la tarjeta</label><input class="input" name="holder" autocomplete="cc-name" value="${escape(u?.name || '')}"></div>
    <div class="grid-2" style="gap:12px"><div class="field"><label>Vencimiento</label><input class="input mono" name="exp" placeholder="MM/AA" maxlength="5" inputmode="numeric"></div><div class="field"><label>CVV</label><input class="input mono" name="cvv" placeholder="123" maxlength="4" inputmode="numeric"></div></div>
    <small class="muted">Demo: usa 4242 4242 4242 4242 (aprobada) o 4000 0000 0000 0002 (rechazada).</small>
  </div>
  <div data-pane="debit" class="stack" hidden><p class="muted" style="margin:0">Serás redirigido a un banco simulado. Para la demo, el pago se aprueba al instante.</p>
    <div class="field"><label>Banco</label><select class="select" name="bank"><option>Banco Austral</option><option>Banco Pacífico</option><option>Banco del Norte</option><option>Cuenta Rut Volcán</option></select></div></div>
  <input type="hidden" name="pm" value="card">`;
}
function wirePayment(form) {
  form.querySelectorAll('[data-pm]').forEach(b => b.addEventListener('click', () => {
    form.querySelectorAll('[data-pm]').forEach(x => x.classList.toggle('active', x === b));
    form.querySelectorAll('[data-pane]').forEach(p => (p.hidden = p.dataset.pane !== b.dataset.pm));
    form.elements.pm.value = b.dataset.pm;
  }));
  const num = form.elements.num, exp = form.elements.exp;
  num?.addEventListener('input', () => { num.value = num.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim(); form.dispatchEvent(new Event('cardchange')); });
  exp?.addEventListener('input', () => { exp.value = exp.value.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2'); form.dispatchEvent(new Event('cardchange')); });
  form.elements.holder?.addEventListener('input', () => form.dispatchEvent(new Event('cardchange')));
}
export function readPayment(form) {
  if (!form.__wired) { wirePayment(form); form.__wired = true; }
  const el = form.elements;
  if (el.pm.value === 'debit') return { brand: 'Débito', last4: '0000', bank: el.bank.value };
  const n = el.num.value.replace(/\s/g, '');
  const bad = [];
  if (!luhn(n)) bad.push(el.num);
  if (!el.holder.value.trim()) bad.push(el.holder);
  const [mm, yy] = el.exp.value.split('/').map(Number);
  if (!mm || mm > 12 || !yy || new Date(2000 + yy, mm) < new Date()) bad.push(el.exp);
  if (!/^\d{3,4}$/.test(el.cvv.value)) bad.push(el.cvv);
  [el.num, el.holder, el.exp, el.cvv].forEach(x => x.classList.toggle('invalid', bad.includes(x)));
  if (bad.length) { toast('Revisa los datos de la tarjeta', 'warning'); return null; }
  if (n.endsWith('0002')) { toast('Pago rechazado por el emisor (tarjeta de prueba)', 'error'); return null; }
  return { brand: brandOf(n), last4: n.slice(-4) };
}
// Activa pestañas/formatos en formularios de pago insertados en modales.
document.addEventListener('focusin', e => { const f = e.target.closest?.('form'); if (f && f.elements?.pm && !f.__wired) { wirePayment(f); f.__wired = true; } });
document.addEventListener('click', e => { const b = e.target.closest?.('[data-pm]'); const f = b?.closest('form'); if (f && !f.__wired) { wirePayment(f); f.__wired = true; b.click(); } });

export function renderCheckout(app) {
  const u = auth.current();
  const h = getHold();
  if (!h) {
    app.innerHTML = '<section class="section"><div class="container empty"><span class="icon">⏳</span><h2>No tienes entradas reservadas</h2><p>Tu reserva expiró o aún no eliges entradas.</p><a class="btn btn-primary" href="#/explorar">Ver eventos</a></div></section>';
    return { static: true };
  }
  const ev = db.get('events', h.eventId);
  const lines = cartLines(ev, h);
  let promo = null;
  app.innerHTML = html`<section class="section" style="padding-top:20px"><div class="container stack">
    <div class="row between"><div><a class="small" href="#/evento/${ev.id}/entradas">← Cambiar entradas</a><h2 style="margin:4px 0 0">Pago</h2></div><div class="steps"><span>1. Entradas</span><span class="on">2. Pago</span><span>3. Listo</span></div></div>
    <div id="ctimer"></div>
    <div class="checkout">
      <form class="card stack" id="payform" novalidate>
        <h3 style="margin:0">Datos del comprador</h3>
        <div class="grid-2"><div class="field"><label>Nombre</label><input class="input" name="name" value="${u.name}" required></div><div class="field"><label>Correo</label><input class="input" name="email" type="email" value="${u.email}" required></div></div>
        <div class="grid-2"><div class="field"><label>RUT (opcional)</label><input class="input" name="rut" placeholder="12.345.678-9"></div><div class="field"><label>Teléfono</label><input class="input" name="phone" placeholder="+56 9 1234 5678"></div></div>
        <hr><h3 style="margin:0">Medio de pago</h3>
        <div class="card-preview" id="cprev" aria-hidden="true"><div class="row between"><b>VOLCÁN PAY</b><span>◉◉</span></div><div class="num" id="cpnum">•••• •••• •••• ••••</div><div class="row between small"><span id="cpname">${u.name.toUpperCase()}</span><span id="cpexp">MM/AA</span></div></div>
        ${raw(paymentFields(u))}
        <label class="check"><input type="checkbox" name="terms" checked> Acepto los términos y la política de reembolsos</label>
        <button class="btn btn-primary btn-lg" id="paybtn">Pagar</button>
      </form>
      <aside class="card stack co-sum">
        <div style="border-radius:var(--radius-sm);overflow:hidden;aspect-ratio:16/7">${raw(poster(ev))}</div>
        <div><b>${ev.title}</b><br><small class="muted">${fmtLong(ev.date)} · ${fmtHour(ev.date)} hrs</small></div>
        <ul class="cart-list">${lines.map(l => raw(html`<li><span>${l.label}</span><b>${money(l.price)}</b></li>`))}</ul>
        <div class="row" style="gap:6px;flex-wrap:nowrap"><input class="input" id="promo" placeholder="Código promocional" style="text-transform:uppercase"><button type="button" class="btn" id="applyPromo">Aplicar</button></div>
        <div id="totals" class="stack" style="gap:6px"></div>
      </aside>
    </div></div></section>`;
  const form = $('#payform');
  wirePayment(form); form.__wired = true;
  const drawTotals = () => {
    const t = totals(lines, promo);
    $('#totals').innerHTML = `<div class="sum-row"><span>Subtotal</span><span>${money(t.subtotal)}</span></div>${t.discount ? `<div class="sum-row" style="color:var(--success)"><span>Descuento ${escape(promo.code)}</span><span>−${money(t.discount)}</span></div>` : ''}<div class="sum-row"><span>Cargo por servicio</span><span>${money(t.service)}</span></div><div class="sum-row total"><span>Total</span><span>${money(t.total)}</span></div>`;
    $('#paybtn').textContent = `Pagar ${money(t.total)}`;
  };
  form.addEventListener('cardchange', () => {
    const n = form.elements.num.value || '•••• •••• •••• ••••';
    $('#cpnum').textContent = n; $('#cpexp').textContent = form.elements.exp.value || 'MM/AA'; $('#cpname').textContent = (form.elements.holder.value || '').toUpperCase();
  });
  $('#applyPromo').onclick = () => {
    const code = $('#promo').value;
    if (!code.trim()) return;
    try { promo = findPromo(code, ev); toast(`Código ${promo.code} aplicado`, 'success'); } catch (err) { promo = null; toast(err.message, 'error'); }
    drawTotals();
  };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.elements.terms.checked) return toast('Debes aceptar los términos', 'warning');
    const pay = readPayment(form); if (!pay) return;
    if (!getHold()) { toast('Tu reserva expiró', 'error'); location.hash = `#/evento/${ev.id}/entradas`; return; }
    const btn = $('#paybtn'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Procesando pago…';
    await sleep(1100);
    const order = purchase({ ev, buyer: u, lines: cartLines(ev, getHold()), promo, payment: pay });
    toast('¡Pago aprobado!', 'success');
    location.hash = `#/confirmacion/${order.id}`;
  });
  const tick = () => {
    const hh = db.find('holds', x => x.key === holdKey());
    if (!hh || Date.parse(hh.expiresAt) < Date.now()) { $('#ctimer').innerHTML = '<div class="timer-bar low">⌛ Tu reserva expiró. <a href="#/evento/' + ev.id + '/entradas">Vuelve a elegir</a></div>'; $('#paybtn').disabled = true; return; }
    const left = Date.parse(hh.expiresAt) - Date.now();
    $('#ctimer').innerHTML = `<div class="timer-bar ${left < 120000 ? 'low' : ''}"><span>⏳ Completa el pago en <span class="clock">${String(Math.floor(left / 6e4)).padStart(2, '0')}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}</span></span></div>`;
  };
  drawTotals(); tick();
  const timer = setInterval(tick, 1000);
  return { static: true, destroy: () => clearInterval(timer) };
}

export function renderConfirm(app, id) {
  const o = db.get('orders', id), u = auth.current();
  if (!o || o.buyerId !== u.id) { location.hash = '#/mis-entradas'; return; }
  const ev = db.get('events', o.eventId);
  app.innerHTML = html`<section class="section"><div class="container stack" style="max-width:720px">
    <div class="steps"><span>1. Entradas</span><span>2. Pago</span><span class="on">3. Listo</span></div>
    <div class="card stack" data-anim style="text-align:center">
      <div style="font-size:56px">🎉</div><h1 style="margin:0">¡Compra confirmada!</h1>
      <p class="muted">Pedido <b>${o.number}</b> · ${o.tickets.length} entrada${o.tickets.length > 1 ? 's' : ''} para <b>${ev.title}</b>. Enviamos el comprobante a ${u.email}.</p>
      <div class="sum-row" style="max-width:320px;margin:0 auto;width:100%"><span>Total pagado</span><b>${money(o.total)}</b></div>
      <div class="row" style="justify-content:center"><a class="btn btn-primary" href="#/mis-entradas">Ver mis entradas</a>${o.tickets[0] ? raw(`<a class="btn" href="#/entrada/${o.tickets[0]}">Abrir entrada</a>`) : ''}</div>
    </div></div></section>`;
}
