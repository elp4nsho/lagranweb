// Piezas reutilizables del sitio público: íconos, estrellas, tarjetas de producto, precios.
import { html, raw, money } from '../../../assets/core/ui.js';
import { productRating, productStock, isVisible, db, category } from '../data/db.js';
import { productArt } from '../shared/art.js';
import { wishlist } from '../shared/cart.js';

export const ICON = {
  cart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14l-1.4 10.2a2 2 0 0 1-2 1.8H8.4a2 2 0 0 1-2-1.8z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>',
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
  user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  logo: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 3v9m0 0c-2 0-4 1.5-4.8 4.5M12 12c2 0 4 1.5 4.8 4.5M12 12v9"/></svg>'
};

export function stars(avg, count) {
  const full = Math.round(avg);
  const s = [1, 2, 3, 4, 5].map(i => `<span class="${i <= full ? '' : 'off'}">★</span>`).join('');
  return `<span class="stars" title="${avg.toFixed(1)} de 5" aria-label="${avg.toFixed(1)} de 5 estrellas">${s}</span>${count != null ? ` <small class="muted">(${count})</small>` : ''}`;
}

export function priceHtml(p) {
  return p.comparePrice > p.price
    ? `<span class="price tag-sale">${money(p.price)}</span> <span class="strike small">${money(p.comparePrice)}</span>`
    : `<span class="price">${money(p.price)}</span>`;
}

export function tagBadges(p) {
  const out = [];
  if (p.comparePrice > p.price) out.push(`<span class="badge badge-danger plain">-${Math.round((1 - p.price / p.comparePrice) * 100)}%</span>`);
  (p.tags || []).filter(t => t !== 'Oferta').forEach(t => out.push(`<span class="badge badge-primary plain">${t}</span>`));
  if (!productStock(p)) out.push('<span class="badge plain">Agotado</span>');
  return out.join('');
}

export function productCard(p) {
  const r = productRating(p);
  const fav = wishlist.has(p.id);
  return html`<article class="card hover p-card">
    <a class="thumb" href="#/producto/${p.id}" aria-label="${p.name}">${raw(productArt(p, p.colors[0]?.hex))}</a>
    <div class="tags">${raw(tagBadges(p))}</div>
    <button class="btn btn-icon btn-sm fav" data-fav="${p.id}" aria-pressed="${fav}" aria-label="${fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}">${raw(ICON.heart)}</button>
    <div class="body">
      <small class="muted">${category(p.categoryId)?.name || ''}</small>
      <a class="name" href="#/producto/${p.id}">${p.name}</a>
      <div>${raw(r.count ? stars(r.avg, r.count) : '<small class="muted">Sin reseñas aún</small>')}</div>
      <div class="meta"><div>${raw(priceHtml(p))}</div><div class="dots">${p.colors.map(c => raw(`<i class="dot-color" style="background:${c.hex}" title="${c.name}"></i>`))}</div></div>
    </div>
  </article>`;
}

export const visibleProducts = () => db.query('products', isVisible);

export function emptyState(icon, title, text, action = '') {
  return `<div class="empty card"><span class="icon">${icon}</span><h3>${title}</h3><p>${text}</p>${action}</div>`;
}
