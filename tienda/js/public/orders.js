// Confirmación de pedido y seguimiento (con barra de estado y línea de tiempo).
import { html, raw, money, dateTime, date, toast } from '../../../assets/core/ui.js';
import { db, auth, ORDER_FLOW, ORDER_STATUS, statusBadge, colorHex } from '../data/db.js';
import { productArt } from '../shared/art.js';
import { emptyState } from './parts.js';

export function trackBar(o) {
  if (['cancelado', 'reembolsado'].includes(o.status)) return `<p>${statusBadge(o.status)}</p>`;
  const idx = ORDER_FLOW.indexOf(o.status);
  return `<div class="track-bar">${['Pagado', 'Preparando', 'Enviado', 'Entregado'].map((l, i) => `<span class="${i <= idx ? 'on' : ''}">${l}</span>`).join('')}</div>`;
}
export function timeline(o) {
  return `<ol class="timeline">${o.history.slice().reverse().map(h => html`<li class="${['cancelado', 'reembolsado'].includes(h.status) ? 'bad' : 'done'}"><span class="pin"></span><b>${ORDER_STATUS[h.status]?.label || h.status}</b><small>${dateTime(h.at)}${h.note ? ' · ' + h.note : ''}</small></li>`).join('')}</ol>`;
}

export function orderItems(o) {
  return o.items.map(i => {
    const p = db.get('products', i.productId);
    return html`<div class="line-item" style="grid-template-columns:56px minmax(0,1fr) auto"><span class="thumb" style="width:56px;height:56px">${raw(p ? productArt(p, colorHex(p, i.color)) : '')}</span><div>${p ? raw(html`<a class="name" href="#/producto/${p.id}">${i.name}</a>`) : raw(html`<b class="name">${i.name}</b>`)}<small>${i.color} · Talla ${i.size} · x${i.qty}</small></div><b class="nowrap">${money(i.price * i.qty)}</b></div>`;
  }).join('');
}

export function orderSummary(o) {
  return html`<div class="sum-row"><span>Subtotal</span><span>${money(o.subtotal)}</span></div>
    ${o.discount ? raw(html`<div class="sum-row"><span>Descuento ${o.couponCode}</span><span class="tag-sale">−${money(o.discount)}</span></div>`) : ''}
    <div class="sum-row"><span>${o.shippingMethod}</span><span>${o.shipping ? money(o.shipping) : 'Gratis'}</span></div>
    <div class="sum-row total"><span>Total</span><span>${money(o.total)}</span></div>
    ${o.refunded ? raw(html`<div class="sum-row"><span>Reembolsado</span><span class="tag-sale">−${money(o.refunded)}</span></div>`) : ''}`;
}

function canSee(o, query) {
  const u = auth.current();
  let last = null;
  try { last = sessionStorage.getItem('raiz:last-order'); } catch (e) { /* */ }
  return (u && (u.id === o.userId || u.role !== 'customer')) || last === o.id || (query.e && query.e.toLowerCase() === o.customer.email.toLowerCase());
}

export function renderOrder(view, id, query) {
  const o = db.get('orders', id);
  if (!o || !canSee(o, query)) {
    view.innerHTML = `<section class="section"><div class="container">${emptyState('📦', 'Pedido no encontrado', 'Revisa el número o búscalo con tu correo en Seguimiento.', '<a class="btn btn-primary" href="#/seguimiento">Seguir un pedido</a>')}</div></section>`;
    return;
  }
  const fresh = query.nuevo === '1';
  view.innerHTML = html`<section class="section tight"><div class="container stack">
    ${fresh ? raw(html`<div class="card stack" data-anim="bounceIn" style="text-align:center;align-items:center">
      <span style="font-size:48px">🎉</span><h1 style="margin:0">¡Gracias, ${o.customer.name.split(' ')[0]}!</h1>
      <p class="muted" style="margin:0">Recibimos tu pedido <b>#${o.number}</b>. Enviamos la confirmación a <b>${o.customer.email}</b>.</p>
      ${o.payment === 'transferencia' ? raw(html`<div class="card" style="box-shadow:none;text-align:left"><b>Datos para transferir ${money(o.total)}</b><br>Raíz SpA · RUT 76.543.210-K · Banco Andino · Cta. Cte. 0012345678 · pagos@raiz.cl<br><small class="muted">Indica el número de pedido #${o.number} en el comentario.</small></div>`) : ''}
    </div>`) : raw(html`<div class="row between"><h1 style="margin:0">Pedido #${o.number}</h1>${raw(statusBadge(o.status))}</div>`)}
    <div class="detail-grid">
      <div class="stack">
        <div class="card stack"><div class="card-head"><h3>Estado del envío</h3>${o.tracking ? raw(html`<span class="small">N° seguimiento <b class="mono">${o.tracking}</b></span>`) : ''}</div>${raw(trackBar(o))}${raw(timeline(o))}</div>
        <div class="card stack"><h3 style="margin:0">Productos</h3>${raw(orderItems(o))}<hr style="margin:0">${raw(orderSummary(o))}</div>
      </div>
      <div class="card stack">
        <h3 style="margin:0">Detalles</h3>
        <dl class="kv"><dt>Fecha</dt><dd>${date(o.createdAt)}</dd><dt>Pago</dt><dd>${o.payment === 'tarjeta' ? 'Tarjeta' : 'Transferencia'}</dd><dt>Despacho</dt><dd>${o.shippingMethod}</dd>
        ${o.address ? raw(html`<dt>Dirección</dt><dd>${o.address.street}, ${o.address.comuna}, ${o.address.region}</dd>`) : ''}<dt>Contacto</dt><dd>${o.customer.name}<br>${o.customer.phone}</dd></dl>
        <a class="btn btn-primary" href="#/catalogo">Seguir comprando</a>
        ${auth.current()?.role === 'customer' ? raw('<a class="btn" href="#/cuenta/pedidos">Mis pedidos</a>') : ''}
      </div>
    </div>
  </div></section>`;
}

export function renderTrack(view) {
  view.innerHTML = html`<section class="section"><div class="container" style="max-width:560px">
    <form class="card stack" id="track" data-anim>
      <span class="eyebrow">Seguimiento</span><h1 style="margin:0">¿Dónde está mi pedido?</h1>
      <p class="muted" style="margin:0">Ingresa el número de pedido y el correo con que compraste.</p>
      <div class="field"><label for="tr-n">Número de pedido</label><input class="input" id="tr-n" placeholder="Ej: 1428" inputmode="numeric" required></div>
      <div class="field"><label for="tr-e">Correo</label><input class="input" id="tr-e" type="email" placeholder="tu@correo.cl" required></div>
      <button class="btn btn-primary">Buscar pedido</button>
      <small class="muted">Demo: prueba con el pedido <b>${db.query('orders', o => o.userId === 'u-camila')[0]?.number}</b> y <b>camila@correo.cl</b>.</small>
    </form>
  </div></section>`;
  view.querySelector('#track').addEventListener('submit', e => {
    e.preventDefault();
    const n = +view.querySelector('#tr-n').value.replace(/\D/g, ''), em = view.querySelector('#tr-e').value.trim().toLowerCase();
    const o = db.find('orders', x => x.number === n && x.customer.email.toLowerCase() === em);
    if (!o) return toast('No encontramos un pedido con esos datos', 'error');
    location.hash = `#/pedido/${o.id}?e=${encodeURIComponent(em)}`;
  });
}
