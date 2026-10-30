// Habitaciones: listado y ficha con galería, amenidades y tarifas de los próximos días.
import { money, escape } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { nightlyRate, availability } from '../shared/hotel.js';
import { today, addDays, fmtDay, dowShort } from '../shared/dates.js';
import { roomArt, sceneName } from './art.js';
import { typeCard, searchWidget } from './home.js';
import { booking } from './state.js';

export function renderRooms(el) {
  const types = db.query('roomTypes', t => t.active !== false).sort((a, b) => a.order - b.order);
  el.innerHTML = `<section class="section page-top"><div class="container stack">
    <span class="eyebrow">Habitaciones y suites</span><h1>Elige tu vista</h1>
    <p class="lead">Todas con calefacción, Wi-Fi de alta velocidad, amenities de autor y la calma de la casona. Precios por noche, IVA incluido.</p>
    <div data-search></div>
    <div class="grid-3">${types.map(typeCard).join('')}</div>
  </div></section>`;
  searchWidget(el.querySelector('[data-search]'), { compact: true });
}

export function renderRoom(el, { id }) {
  const t = db.get('roomTypes', id);
  if (!t || t.active === false) { el.innerHTML = '<div class="container section"><div class="card empty">Habitación no encontrada. <a href="#/habitaciones">Ver habitaciones</a></div></div>'; return; }
  let idx = 0;
  const b = booking.get();
  const days = Array.from({ length: 14 }, (_, i) => addDays(today(), i));
  const free = availability(t.id, b.checkIn, b.checkOut);
  el.innerHTML = `<section class="section page-top"><div class="container room-layout">
    <div class="stack">
      <a class="small" href="#/habitaciones">← Todas las habitaciones</a>
      <div class="gallery card" tabindex="0" aria-label="Galería de ${escape(t.name)}">
        <div class="gallery-main" data-main>${roomArt(t.id, 0, { label: t.name })}</div>
        <button class="btn btn-icon gal-prev" data-g="-1" aria-label="Foto anterior">‹</button><button class="btn btn-icon gal-next" data-g="1" aria-label="Foto siguiente">›</button>
        <span class="gal-cap" data-cap>${sceneName(0)} · 1/4</span>
      </div>
      <div class="thumbs">${[0, 1, 2, 3].map(i => `<button class="thumb ${i === 0 ? 'active' : ''}" data-t="${i}" aria-label="${sceneName(i)}">${roomArt(t.id, i)}</button>`).join('')}</div>
      <h1>${escape(t.name)}</h1>
      <p class="lead">${escape(t.desc)}</p>
      <div class="row specs"><span>📐 ${t.size} m²</span><span>🛏️ ${escape(t.beds)}</span><span>👥 Hasta ${t.maxGuests} personas</span><span>🪟 Vista ${escape(t.view)}</span></div>
      <h3>Comodidades</h3>
      <ul class="amenities">${t.amenities.map(a => `<li>✓ ${escape(a)}</li>`).join('')}</ul>
      <h3>Tarifas de los próximos 14 días</h3>
      <div class="rate-strip">${days.map(d => { const r = nightlyRate(t.id, d); return `<div class="rate-cell ${[5, 6].includes(new Date(d + 'T12:00').getDay()) ? 'we' : ''}" title="${escape(r.season)}"><small>${dowShort(d)}</small><b>${fmtDay(d).split(' ')[0]}</b><span>${money(r.rate / 1000).replace('$', '$')}k</span></div>`; }).join('')}</div>
      <p class="small muted">Precios por noche en CLP. Viernes y sábado tienen recargo de fin de semana; las temporadas los ajustan automáticamente.</p>
    </div>
    <aside class="card stack book-box">
      <span class="eyebrow">Reserva directa</span>
      <div><small class="muted">Esta noche desde</small><div class="price-xl">${money(nightlyRate(t.id, today()).rate)}</div></div>
      <div class="callout small">${fmtDay(b.checkIn, { weekday: true })} → ${fmtDay(b.checkOut, { weekday: true })}: ${free ? `<b>${free} disponible${free > 1 ? 's' : ''}</b>` : '<b>sin disponibilidad</b>, prueba otras fechas'}</div>
      <a class="btn btn-primary btn-lg btn-block" href="#/reservar" data-book="${t.id}">Reservar esta habitación</a>
      <ul class="mini-list small"><li>✓ Mejor precio garantizado en el sitio</li><li>✓ Cancelación gratuita hasta 3 días antes</li><li>✓ Check-in online</li></ul>
    </aside>
  </div></section>`;
  const show = i => {
    idx = (i + 4) % 4;
    el.querySelector('[data-main]').innerHTML = roomArt(t.id, idx, { label: `${t.name}: ${sceneName(idx)}` });
    el.querySelector('[data-cap]').textContent = `${sceneName(idx)} · ${idx + 1}/4`;
    el.querySelectorAll('.thumb').forEach((x, k) => x.classList.toggle('active', k === idx));
  };
  el.addEventListener('click', e => {
    const g = e.target.closest('[data-g]'); if (g) show(idx + +g.dataset.g);
    const th = e.target.closest('[data-t]'); if (th) show(+th.dataset.t);
    const bk = e.target.closest('[data-book]'); if (bk) booking.set({ typeId: bk.dataset.book });
  });
  el.querySelector('.gallery').addEventListener('keydown', e => { if (e.key === 'ArrowRight') show(idx + 1); if (e.key === 'ArrowLeft') show(idx - 1); });
}
