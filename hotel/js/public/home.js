// Portada: hero editable, buscador de disponibilidad, habitaciones destacadas, spa/restaurante y ofertas.
import { money, escape } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { settings, minRate, currentSeason } from '../shared/hotel.js';
import { fmtDay, addDays, diffDays } from '../shared/dates.js';
import { roomArt } from './art.js';
import { booking } from './state.js';
import { rangeCalendar } from './calendar.js';

export function searchWidget(el, { compact = false } = {}) {
  const b = booking.get();
  el.innerHTML = `<form class="search-bar card" id="sb" novalidate>
      <button type="button" class="sb-field" data-dates><span class="label">Llegada → salida</span><b data-range>${fmtDay(b.checkIn, { weekday: true })} → ${fmtDay(b.checkOut, { weekday: true })}</b><small class="muted" data-n>${diffDays(b.checkIn, b.checkOut)} noches</small></button>
      <div class="sb-field"><label class="label" for="sb-a">Adultos</label><select class="select sm" id="sb-a">${[1, 2, 3, 4].map(n => `<option ${n === b.adults ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="sb-field"><label class="label" for="sb-c">Niños</label><select class="select sm" id="sb-c">${[0, 1, 2].map(n => `<option ${n === b.children ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      ${compact ? '' : `<div class="sb-field"><label class="label" for="sb-p">Código promocional</label><input class="input sm" id="sb-p" value="${escape(b.promo)}" placeholder="Opcional"></div>`}
      <button class="btn btn-primary btn-lg sb-go">Ver disponibilidad</button>
      <div class="sb-cal" hidden></div>
    </form>`;
  const f = el.querySelector('#sb'), calBox = f.querySelector('.sb-cal');
  let cal;
  f.querySelector('[data-dates]').onclick = () => {
    calBox.hidden = !calBox.hidden;
    if (!calBox.hidden && !cal) cal = rangeCalendar(calBox, { checkIn: b.checkIn, checkOut: b.checkOut, onChange: (a, c) => {
      if (!c) return;
      booking.set({ checkIn: a, checkOut: c });
      f.querySelector('[data-range]').textContent = `${fmtDay(a, { weekday: true })} → ${fmtDay(c, { weekday: true })}`;
      f.querySelector('[data-n]').textContent = `${diffDays(a, c)} noches`;
      setTimeout(() => { calBox.hidden = true; }, 250);
    } });
  };
  f.onsubmit = e => {
    e.preventDefault();
    booking.set({ adults: +f.querySelector('#sb-a').value, children: +f.querySelector('#sb-c').value, promo: f.querySelector('#sb-p')?.value.trim() ?? booking.get().promo, typeId: '' });
    location.hash = '#/reservar';
  };
}

export function renderHome(el) {
  const c = settings();
  const types = db.query('roomTypes', t => t.active !== false).sort((a, b) => a.order - b.order);
  const offers = db.query('offers', o => o.active);
  const season = currentSeason();
  el.innerHTML = `
    <section class="hero site-hero">
      <div class="hero-bg hero-media" aria-hidden="true">${roomArt('superior', 3, { label: 'Atardecer en la bahía' })}</div>
      <div class="container hero-inner"><div class="hero-text stack" data-anim>
        <span class="eyebrow">${escape(c.tagline)}</span>
        <h1>${escape(c.heroTitle)}</h1>
        <p class="lead">${escape(c.heroText)}</p>
      </div></div>
    </section>
    <div class="container search-wrap" data-search></div>
    <section class="section home-rooms">
      <div class="container stack">
        <div class="row between"><div><span class="eyebrow">Habitaciones y suites</span><h2>Cinco maneras de mirar el puerto</h2></div><a class="btn" href="#/habitaciones">Ver todas</a></div>
        <div class="grid-3 type-grid">${types.slice(0, 3).map(t => typeCard(t)).join('')}</div>
      </div>
    </section>
    <section class="section band home-about">
      <div class="container grid-2 about">
        <div class="stack" data-anim><span class="eyebrow">La casona</span><h2>Una casa de 1910 con alma porteña</h2><p>${escape(c.about)}</p>
          <div class="row facts"><div><b>21</b><small>habitaciones</small></div><div><b>1910</b><small>casona patrimonial</small></div><div><b>4,8★</b><small>en reseñas</small></div></div></div>
        <div class="about-art card" data-anim data-anim-delay="150">${roomArt('suite', 1, { label: 'Suite Lumen' })}</div>
      </div>
    </section>
    <section class="section home-features">
      <div class="container grid-2">
        <a class="card hover feature" href="#/spa"><div class="feature-art">${roomArt('deluxe', 2, { label: 'Spa' })}</div><span class="eyebrow">Marejada Spa</span><h3>Aguas temperadas frente al puerto</h3><p class="muted">${escape(c.spaText)}</p></a>
        <a class="card hover feature" href="#/restaurante"><div class="feature-art">${roomArt('panoramica', 0, { label: 'Restaurante' })}</div><span class="eyebrow">Marea Alta</span><h3>Cocina del Pacífico</h3><p class="muted">${escape(c.restaurantText)}</p></a>
      </div>
    </section>
    ${offers.length ? `<section class="section band home-offers"><div class="container stack"><div class="row between"><div><span class="eyebrow">Ofertas</span><h2>Reserva directo y ahorra</h2></div>${season ? `<span class="badge plain">Ahora: ${escape(season.name)}</span>` : ''}</div>
      <div class="grid-3 offer-grid">${offers.map(o => offerCard(o)).join('')}</div></div></section>` : ''}`;
  searchWidget(el.querySelector('[data-search]'));
}

export function typeCard(t) {
  return `<article class="card hover type-card">
    <a class="type-art" href="#/habitacion/${t.id}" aria-label="${escape(t.name)}">${roomArt(t.id, 0, { label: t.name })}</a>
    <div class="stack" style="gap:6px"><h3 style="margin:0">${escape(t.name)}</h3><p class="muted small" style="margin:0">${escape(t.short)}</p>
      <div class="row small muted" style="gap:10px"><span>📐 ${t.size} m²</span><span>🛏️ ${escape(t.beds)}</span><span>👥 ${t.maxGuests}</span></div>
      <div class="row between"><span><small class="muted">desde</small> <b class="price">${money(minRate(t.id))}</b><small class="muted">/noche</small></span><a class="btn btn-sm" href="#/habitacion/${t.id}">Ver detalles</a></div></div>
  </article>`;
}
export function offerCard(o) {
  return `<article class="card offer tone-${escape(o.tone || 'primary')}"><span class="offer-pct">-${o.discountPct}%</span><h3>${escape(o.title)}</h3><p class="muted small">${escape(o.desc)}</p>
    <div class="row between"><code class="promo">${escape(o.code)}</code><a class="btn btn-sm btn-primary" href="#/reservar" data-promo="${escape(o.code)}">Usar código</a></div></article>`;
}
document.addEventListener('click', e => { const p = e.target.closest('[data-promo]'); if (p) booking.set({ promo: p.dataset.promo }); });
export { addDays };
