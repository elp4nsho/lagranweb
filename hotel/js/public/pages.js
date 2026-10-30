// Páginas de spa, restaurante y ofertas (contenido editable desde el panel) con solicitudes de reserva.
import { money, escape, toast, formModal } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { settings } from '../shared/hotel.js';
import { today } from '../shared/dates.js';
import { roomArt } from './art.js';
import { offerCard } from './home.js';

async function requestForm(type, detail) {
  const v = await formModal({ title: type === 'spa' ? `Reservar: ${detail}` : 'Reservar mesa en Marea Alta', fields: [
    { name: 'guestName', label: 'Nombre', required: true }, { name: 'email', label: 'Correo', type: 'email', required: true },
    { name: 'date', label: 'Fecha', type: 'date', required: true, value: today() }, { name: 'time', label: 'Hora', type: 'time', required: true, value: type === 'spa' ? '17:00' : '20:30' },
    { name: 'people', label: 'Personas', type: 'number', required: true, value: 2 }, { name: 'notes', label: 'Comentarios', type: 'textarea' }] });
  if (!v) return;
  db.insert('requests', { ...v, type, detail: detail + (v.notes ? ` · ${v.notes}` : ''), status: 'pendiente' });
  db.log('solicitud', `Solicitud de ${type}: ${v.guestName} · ${v.date} ${v.time}`);
  toast('Solicitud enviada. Te confirmaremos por correo.', 'success');
}

export function renderSpa(el) {
  const c = settings();
  el.innerHTML = `<section class="section page-top"><div class="container stack">
    <div class="split-hero"><div class="stack" data-anim><span class="eyebrow">Marejada Spa</span><h1>El mar, en calma</h1><p class="lead">${escape(c.spaText)}</p><p class="small muted">Abierto de 10:00 a 21:00 · Acceso al circuito incluido en suites.</p></div><div class="card art-frame" data-anim="zoomIn">${roomArt('deluxe', 2, { label: 'Spa' })}</div></div>
    <h2>Tratamientos</h2>
    <div class="grid-3">${db.all('spa').map(s => `<article class="card hover stack"><span class="big-ico" aria-hidden="true">${escape(s.icon)}</span><h3 style="margin:0">${escape(s.name)}</h3><span class="muted small">${s.mins} minutos</span><div class="row between"><b class="price">${money(s.price)}</b><button class="btn btn-sm btn-primary" data-req="${escape(s.name)}">Reservar</button></div></article>`).join('')}</div>
  </div></section>`;
  el.addEventListener('click', e => { const b = e.target.closest('[data-req]'); if (b) requestForm('spa', b.dataset.req); });
}

export function renderRestaurant(el) {
  const c = settings();
  const dishes = db.all('dishes');
  const cats = [...new Set(dishes.map(d => d.cat))];
  el.innerHTML = `<section class="section page-top"><div class="container stack">
    <div class="split-hero"><div class="stack" data-anim><span class="eyebrow">Restaurante Marea Alta</span><h1>Cocina del Pacífico</h1><p class="lead">${escape(c.restaurantText)}</p><div class="row"><button class="btn btn-primary" data-req="Mesa">Reservar mesa</button></div></div><div class="card art-frame" data-anim="zoomIn">${roomArt('panoramica', 3, { label: 'Terraza del restaurante' })}</div></div>
    <div class="grid-3">${cats.map(cat => `<div class="card stack"><h3 style="margin:0">${escape(cat)}</h3><ul class="menu-list">${dishes.filter(d => d.cat === cat).map(d => `<li><span>${escape(d.name)}</span><b>${money(d.price)}</b></li>`).join('')}</ul></div>`).join('')}</div>
  </div></section>`;
  el.addEventListener('click', e => { if (e.target.closest('[data-req]')) requestForm('restaurante', 'Mesa en Marea Alta'); });
}

export function renderOffers(el) {
  const offers = db.query('offers', o => o.active);
  el.innerHTML = `<section class="section page-top"><div class="container stack">
    <span class="eyebrow">Ofertas</span><h1>Beneficios de reservar directo</h1>
    <p class="lead">Usa el código al reservar en nuestro sitio. Los descuentos aplican sobre el alojamiento.</p>
    ${offers.length ? `<div class="grid-3">${offers.map(offerCard).join('')}</div>` : '<div class="card empty">No hay ofertas vigentes en este momento.</div>'}
    <div class="card stack"><h3 style="margin:0">Siempre incluido al reservar directo</h3><ul class="amenities"><li>✓ Mejor tarifa garantizada</li><li>✓ Upgrade sujeto a disponibilidad</li><li>✓ Café de bienvenida</li><li>✓ Check-in online</li></ul></div>
  </div></section>`;
}
