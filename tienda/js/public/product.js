// Ficha de producto: galería, variantes (color/talla con stock por variante), favoritos, reseñas.
import { html, raw, money, date, toast, escape } from '../../../assets/core/ui.js';
import { db, auth, settings, category, findVariant, productRating, isVisible, colorHex } from '../data/db.js';
import { productArt } from '../shared/art.js';
import { cart, wishlist } from '../shared/cart.js';
import { stars, priceHtml, productCard, visibleProducts, emptyState, ICON } from './parts.js';
import { openDrawer } from './drawer.js';

const sel = {};

export function renderProduct(view, id) {
  const p = db.get('products', id);
  if (!p || !isVisible(p)) {
    view.innerHTML = `<section class="section"><div class="container">${emptyState('🧺', 'Producto no disponible', 'Puede que se haya agotado o ya no esté en el catálogo.', '<a class="btn btn-primary" href="#/catalogo">Ver catálogo</a>')}</div></section>`;
    return;
  }
  const s = (sel[id] ||= { color: (p.colors.find(c => p.variants.some(v => v.color === c.name && v.stock > 0)) || p.colors[0]).name, size: null, view: 0, qty: 1 });
  if (!p.colors.some(c => c.name === s.color)) s.color = p.colors[0].name;
  const cat = category(p.categoryId);
  const rating = productRating(p);
  const reviews = db.query('reviews', r => r.productId === p.id && r.status === 'aprobada').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const dist = [5, 4, 3, 2, 1].map(n => ({ n, c: reviews.filter(r => r.rating === n).length }));
  const related = visibleProducts().filter(x => x.categoryId === p.categoryId && x.id !== p.id).slice(0, 4);
  const v = s.size ? findVariant(p, s.size, s.color) : null;
  const colorStock = p.variants.filter(x => x.color === s.color).reduce((t, x) => t + x.stock, 0);
  const sett = settings();
  const fav = wishlist.has(p.id);
  const u = auth.current();
  let stockNote = '';
  if (!colorStock) stockNote = '<span class="stock-note out">Agotado en este color</span>';
  else if (!v) stockNote = '<span class="stock-note muted">Elige una talla para ver disponibilidad</span>';
  else if (!v.stock) stockNote = '<span class="stock-note out">Sin stock en esta talla</span>';
  else if (v.stock <= (sett.lowStock || 5)) stockNote = `<span class="stock-note low">¡Últimas ${v.stock} unidades!</span>`;
  else stockNote = `<span class="stock-note ok">En stock · despacho en 24 h</span>`;

  view.innerHTML = html`<section class="section tight"><div class="container">
    <nav class="small muted" aria-label="Migas"><a href="#/">Inicio</a> / <a href="#/catalogo?cat=${cat?.slug}">${cat?.name}</a> / ${p.name}</nav>
    <div class="pdp" style="margin-top:16px">
      <div class="gallery">
        <div class="main">${raw(productArt(p, colorHex(p, s.color), { view: s.view, label: `${p.name} color ${s.color}` }))}</div>
        <div class="thumbs">${[0, 1, 2].map(i => raw(`<button data-view="${i}" aria-pressed="${s.view === i}" aria-label="Vista ${i + 1}">${productArt(p, colorHex(p, s.color), { view: i })}</button>`))}</div>
      </div>
      <div class="pdp-info">
        <div class="row" style="gap:8px">${(p.tags || []).map(t => raw(`<span class="badge badge-primary plain">${escape(t)}</span>`))}<small class="muted">SKU ${v ? v.sku : p.variants[0]?.sku.split('-').slice(0, 2).join('-')}</small></div>
        <h1>${p.name}</h1>
        <div class="row" style="gap:10px">${raw(rating.count ? stars(rating.avg, rating.count) : '<small class="muted">Sin reseñas</small>')} <a class="small" href="#reviews" data-scroll>Ver reseñas</a></div>
        <div class="pdp-price">${raw(priceHtml(p))}</div>
        <small class="muted">IVA incluido · ${sett.shipping?.freeThreshold ? `Envío gratis sobre ${money(sett.shipping.freeThreshold)}` : ''}</small>
        <p>${p.description}</p>
        <div><div class="label" style="margin-bottom:8px">Color: <b>${s.color}</b></div>
          <div class="row" style="gap:10px">${p.colors.map(c => raw(html`<button class="swatch" data-color="${c.name}" aria-pressed="${c.name === s.color}" title="${c.name}" aria-label="Color ${c.name}" style="background:${c.hex}"></button>`))}</div></div>
        <div><div class="label" style="margin-bottom:8px">Talla ${s.size ? raw(`: <b>${escape(s.size)}</b>`) : ''}</div>
          <div class="size-grid">${p.sizes.map(z => { const vv = findVariant(p, z, s.color); return raw(html`<button class="btn btn-sm size-btn" data-size="${z}" aria-pressed="${z === s.size}" ${!vv || !vv.stock ? 'disabled' : ''}>${z}</button>`); })}</div></div>
        <div>${raw(stockNote)}</div>
        <div class="row">
          <div class="qty"><button data-q="-1" aria-label="Menos">−</button><input type="number" min="1" value="${s.qty}" data-qty aria-label="Cantidad"><button data-q="1" aria-label="Más">+</button></div>
          <button class="btn btn-primary btn-lg grow" data-add ${!colorStock ? 'disabled' : ''}>${colorStock ? 'Agregar al carro' : 'Agotado'}</button>
          <button class="btn btn-lg btn-icon fav icon-btn" data-fav="${p.id}" aria-pressed="${fav}" aria-label="Favorito">${raw(ICON.heart)}</button>
        </div>
        <ul class="info-list card">
          <li>🚚 <span>${(sett.shipping?.rates || []).map(r => `${r.name}: ${r.price ? money(r.price) : 'gratis'}`).join(' · ')}</span></li>
          <li>↺ <span>Cambios y devoluciones gratis durante 30 días.</span></li>
          <li>🌱 <span>Confeccionado en Santiago con materiales trazables.</span></li>
        </ul>
      </div>
    </div>
  </div></section>

  <section class="section tight" id="reviews"><div class="container grid-2" style="align-items:start">
    <div class="stack">
      <h2>Reseñas</h2>
      <div class="card row" style="gap:24px;align-items:center">
        <div style="text-align:center"><div class="stat"><span class="value">${rating.count ? rating.avg.toFixed(1).replace('.', ',') : '–'}</span></div>${raw(stars(rating.avg))}<div class="small muted">${rating.count} reseña${rating.count === 1 ? '' : 's'}</div></div>
        <div class="rating-bars grow">${dist.map(d => raw(`<div class="row"><span>${d.n}★</span><div class="progress"><i style="--v:${reviews.length ? d.c / reviews.length * 100 : 0}%"></i></div><span>${d.c}</span></div>`))}</div>
      </div>
      <div>${reviews.length ? reviews.slice(0, 8).map(r => raw(html`<article class="review"><div class="row between">${raw(stars(r.rating))}<small class="muted">${date(r.createdAt)}</small></div><b>${r.title}</b><p style="margin:4px 0">${r.body}</p><small class="muted">${r.author}${r.verified ? ' · ✓ Compra verificada' : ''}</small></article>`)) : raw('<p class="muted">Aún no hay reseñas. ¡Sé la primera persona en opinar!</p>')}</div>
    </div>
    <form class="card stack" id="review-form">
      <h3>Escribe una reseña</h3>
      <div class="field"><span class="label">Tu calificación</span><div class="star-input">${[5, 4, 3, 2, 1].map(n => raw(`<input type="radio" name="rating" id="st${n}" value="${n}" ${n === 5 ? 'checked' : ''}><label for="st${n}" title="${n} estrellas">★</label>`))}</div></div>
      <div class="field"><label for="rv-name">Nombre</label><input class="input" id="rv-name" name="author" value="${u?.name || ''}" required></div>
      <div class="field"><label for="rv-title">Título</label><input class="input" id="rv-title" name="title" required placeholder="Resume tu experiencia"></div>
      <div class="field"><label for="rv-body">Comentario</label><textarea class="textarea" id="rv-body" name="body" required></textarea></div>
      <small class="muted">Las reseñas se publican tras una revisión del equipo.</small>
      <button class="btn btn-primary">Enviar reseña</button>
    </form>
  </div></section>

  ${related.length ? raw(html`<section class="section tight"><div class="container"><div class="section-head"><h2>También te puede gustar</h2></div><div class="products">${related.map(x => raw(productCard(x)))}</div></div></section>`) : ''}`;

  const rerender = () => renderProduct(swap(view), id);
  view.addEventListener('click', e => {
    const c = e.target.closest('[data-color]'), z = e.target.closest('[data-size]'), vw = e.target.closest('[data-view]'), q = e.target.closest('[data-q]');
    if (c) { s.color = c.dataset.color; const vv = s.size && findVariant(p, s.size, s.color); if (!vv || !vv.stock) s.size = null; rerender(); }
    else if (z) { s.size = z.dataset.size; rerender(); }
    else if (vw) { s.view = +vw.dataset.view; rerender(); }
    else if (q) { s.qty = Math.max(1, s.qty + +q.dataset.q); view.querySelector('[data-qty]').value = s.qty; }
    else if (e.target.closest('[data-scroll]')) { e.preventDefault(); view.querySelector('#reviews').scrollIntoView(); }
    else if (e.target.closest('[data-add]')) {
      if (!s.size) { toast('Elige una talla primero', 'warning'); view.querySelector('.size-grid').scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
      const vv = findVariant(p, s.size, s.color);
      const res = cart.add(p.id, vv.sku, s.qty);
      if (!res.ok) return toast(res.msg, 'warning');
      toast(`${p.name} (${s.color}, ${s.size}) agregado al carro`, 'success');
      s.qty = 1;
      openDrawer();
    }
  });
  view.querySelector('[data-qty]').addEventListener('change', e => { s.qty = Math.max(1, parseInt(e.target.value, 10) || 1); e.target.value = s.qty; });
  view.querySelector('#review-form').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, data = Object.fromEntries(new FormData(f));
    if (!data.author.trim() || !data.title.trim() || !data.body.trim()) return toast('Completa todos los campos', 'warning');
    const bought = u && db.find('orders', o => o.userId === u.id && o.items.some(i => i.productId === p.id));
    db.insert('reviews', { productId: p.id, userId: u?.id || null, author: data.author.trim(), title: data.title.trim(), body: data.body.trim(), rating: +data.rating, status: 'pendiente', verified: !!bought });
    db.log('reseña', `Nueva reseña (${data.rating}★) para ${p.name}`, u?.id);
    toast('¡Gracias! Tu reseña quedó pendiente de moderación', 'success');
    f.reset();
  });
}

// Reemplaza el contenedor por uno nuevo (evita listeners duplicados al volver a pintar).
function swap(el) { const n = document.createElement('div'); el.replaceWith(n); return n; }
