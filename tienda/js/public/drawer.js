// Carrito lateral: cantidades, cupón, barra de envío gratis y totales.
import { html, raw, money, toast, $ } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { productArt } from '../shared/art.js';
import { cart } from '../shared/cart.js';
import { colorHex } from '../data/db.js';

let root;
export function mountDrawer() {
  root = document.createElement('div');
  root.innerHTML = `<div class="drawer-backdrop" data-close-drawer></div>
    <aside class="drawer" role="dialog" aria-modal="true" aria-label="Carro de compras" aria-hidden="true">
      <div class="drawer-head"><h3>Tu carro</h3><button class="btn btn-ghost btn-icon btn-sm" data-close-drawer aria-label="Cerrar carro">✕</button></div>
      <div class="drawer-body"></div><div class="drawer-foot"></div>
    </aside>`;
  document.body.appendChild(root);
  root.addEventListener('click', onClick);
  root.addEventListener('submit', e => {
    e.preventDefault();
    const code = e.target.querySelector('input').value;
    cart.setCoupon(code);
    const t = cart.totals();
    if (t.couponError) { toast(t.couponError, 'warning'); if (!/mínima/.test(t.couponError)) cart.setCoupon(''); } else toast(`Cupón ${t.coupon.code} aplicado`, 'success');
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('drawer-open')) closeDrawer(); });
  cart.subscribe(renderDrawer);
  db.subscribe(() => renderDrawer());
  renderDrawer();
}

export function openDrawer() {
  renderDrawer();
  document.body.classList.add('drawer-open');
  root.querySelector('.drawer').setAttribute('aria-hidden', 'false');
  setTimeout(() => root.querySelector('.drawer-head button').focus(), 50);
}
export function closeDrawer() {
  document.body.classList.remove('drawer-open');
  root.querySelector('.drawer').setAttribute('aria-hidden', 'true');
}

function onClick(e) {
  if (e.target.closest('[data-close-drawer]') || e.target.closest('a[href]')) return closeDrawer();
  const q = e.target.closest('[data-qd]');
  if (q) {
    const l = cart.raw().lines.find(x => x.sku === q.dataset.sku);
    const r = cart.setQty(q.dataset.sku, l.qty + +q.dataset.qd);
    if (!r.ok && r.msg) toast(r.msg, 'warning');
  }
  const rm = e.target.closest('[data-rm]');
  if (rm) cart.remove(rm.dataset.rm);
  if (e.target.closest('[data-uncoupon]')) cart.setCoupon('');
}

export function renderDrawer() {
  if (!root) return;
  const lines = cart.lines();
  const t = cart.totals();
  const body = root.querySelector('.drawer-body'), foot = root.querySelector('.drawer-foot');
  if (!lines.length) {
    body.innerHTML = `<div class="empty"><span class="icon">🛍️</span><h3>Tu carro está vacío</h3><p>Descubre las prendas de la temporada.</p><a class="btn btn-primary" href="#/catalogo">Ir al catálogo</a></div>`;
    foot.innerHTML = '';
    return;
  }
  const pct = t.threshold ? Math.min(100, ((t.subtotal - t.discount) / t.threshold) * 100) : 100;
  body.innerHTML = html`
    ${t.threshold ? raw(html`<div class="free-ship">${t.free ? raw('<b>🎉 ¡Tienes envío gratis!</b>') : raw(html`<span>Te faltan <b>${money(t.missing)}</b> para envío gratis</span>`)}<div class="progress"><i style="--v:${pct}%"></i></div></div>`) : ''}
    ${lines.map(l => raw(html`<div class="line-item">
      <a class="thumb" href="#/producto/${l.productId}">${raw(productArt(l.product, colorHex(l.product, l.color)))}</a>
      <div><a class="name" href="#/producto/${l.productId}">${l.name}</a><small>${l.color} · Talla ${l.size}</small>
        ${l.short ? raw(`<small class="tag-sale">Solo quedan ${l.stock}</small>`) : ''}
        <div class="row" style="gap:8px;margin-top:6px"><div class="qty sm"><button data-qd="-1" data-sku="${l.sku}" aria-label="Menos">−</button><input value="${l.qty}" readonly aria-label="Cantidad"><button data-qd="1" data-sku="${l.sku}" aria-label="Más">+</button></div><button class="link small" data-rm="${l.sku}">Quitar</button></div>
      </div>
      <b class="nowrap">${money(l.price * l.qty)}</b>
    </div>`))}`;
  foot.innerHTML = html`
    ${t.coupon ? raw(html`<div class="row between small"><span class="badge badge-success">${t.coupon.code}</span><button class="link" data-uncoupon>Quitar cupón</button></div>`)
      : raw(html`<form class="row" style="gap:8px;flex-wrap:nowrap"><input class="input" placeholder="Código de cupón" aria-label="Cupón" style="min-height:38px" value="${cart.raw().coupon || ''}"><button class="btn btn-sm">Aplicar</button></form>${t.couponError ? raw(html`<small class="tag-sale">${cart.raw().coupon}: ${t.couponError}</small>`) : ''}`)}
    <div class="sum-row"><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
    ${t.discount ? raw(html`<div class="sum-row"><span>Descuento</span><span class="tag-sale">−${money(t.discount)}</span></div>`) : ''}
    <div class="sum-row"><span>Envío (${t.rate.name})</span><span>${t.shipping ? money(t.shipping) : 'Gratis'}</span></div>
    <div class="sum-row total"><span>Total</span><span>${money(t.total)}</span></div>
    <a class="btn btn-primary btn-lg btn-block" href="#/checkout">Ir a pagar</a>`;
}
