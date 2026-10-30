// Motor de reservas: fechas → habitación → extras → datos → pago → confirmación.
import { money, escape, toast, sleep } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { quote, availability, findOffer, createReservation, nightlyRate, settings, typeById, cancelTerms } from '../shared/hotel.js';
import { fmtDay, fmtRange, diffDays, today, addDays } from '../shared/dates.js';
import { rangeCalendar } from './calendar.js';
import { roomArt } from './art.js';
import { booking } from './state.js';

const STEPS = ['Fechas', 'Habitación', 'Extras', 'Tus datos', 'Pago'];
const go = n => { location.hash = `#/reservar?paso=${n}`; };

function extrasList() { return Object.entries(booking.get().extras || {}).filter(([, q]) => q > 0).map(([extraId, qty]) => ({ extraId, qty })); }
function currentQuote() { const b = booking.get(); return b.typeId ? quote(b.typeId, b.checkIn, b.checkOut, { extras: extrasList(), adults: b.adults, children: b.children, promo: b.promo }) : null; }

function summary() {
  const b = booking.get(), q = currentQuote(), t = b.typeId && typeById(b.typeId);
  return `<aside class="card stack sum-box">
    <h3 style="margin:0">Tu reserva</h3>
    ${t ? `<div class="sum-art">${roomArt(t.id, 0)}</div><b>${escape(t.name)}</b>` : ''}
    <div class="small"><div>📅 ${fmtRange(b.checkIn, b.checkOut)}</div><div>🌙 ${diffDays(b.checkIn, b.checkOut)} noches · 👥 ${b.adults} adulto${b.adults > 1 ? 's' : ''}${b.children ? `, ${b.children} niño${b.children > 1 ? 's' : ''}` : ''}</div></div>
    ${q ? `<ul class="bill-lines small"><li><span>Alojamiento (${q.n} noches)</span><b>${money(q.roomTotal)}</b></li>
      ${q.extrasLines.map(l => `<li><span>${escape(l.name)}${l.units > 1 ? ` ×${l.units}` : ''}</span><b>${money(l.total)}</b></li>`).join('')}
      ${q.discount ? `<li class="disc"><span>Descuento ${escape(q.offerCode)}</span><b>−${money(q.discount)}</b></li>` : ''}</ul>
      <div class="row between total-row"><span>Total</span><b>${money(q.total)}</b></div><small class="muted">IVA incluido. Cancelación gratuita hasta ${settings().freeCancelDays} días antes.</small>` : '<p class="muted small">Elige una habitación para ver el total.</p>'}
  </aside>`;
}

export function renderBooking(el, params, query) {
  const step = Math.min(6, Math.max(1, +(query.paso || 1)));
  const b = booking.get();
  if (step >= 3 && !b.typeId) { go(2); return; }
  const stepper = `<ol class="stepper">${STEPS.map((s, i) => `<li class="${i + 1 < step ? 'done' : i + 1 === step ? 'now' : ''}">${i + 1 < step ? `<a href="#/reservar?paso=${i + 1}">` : '<span>'}<i>${i + 1 < step ? '✓' : i + 1}</i><small>${s}</small>${i + 1 < step ? '</a>' : '</span>'}</li>`).join('')}</ol>`;
  const wrap = inner => `<section class="section page-top"><div class="container stack"><span class="eyebrow">Reserva directa · mejor precio garantizado</span>${step < 6 ? stepper : ''}${inner}</div></section>`;

  if (step === 1) {
    el.innerHTML = wrap(`<div class="book-grid"><div class="card stack">
      <h2 style="margin:0">¿Cuándo nos visitas?</h2>
      <div data-cal></div>
      <div class="grid-3">
        <div class="field"><label for="bk-a">Adultos</label><select class="select" id="bk-a">${[1, 2, 3, 4].map(n => `<option ${n === b.adults ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="field"><label for="bk-c">Niños</label><select class="select" id="bk-c">${[0, 1, 2].map(n => `<option ${n === b.children ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="field"><label for="bk-p">Código promocional</label><input class="input" id="bk-p" value="${escape(b.promo)}" placeholder="Ej: PRIMAVERA15"></div>
      </div>
      <div class="row between"><span class="muted small" data-sel>${fmtRange(b.checkIn, b.checkOut)} · ${diffDays(b.checkIn, b.checkOut)} noches</span><button class="btn btn-primary btn-lg" data-next>Buscar habitaciones</button></div>
    </div>${summary()}</div>`);
    const minAll = d => { const types = db.query('roomTypes', t => t.active !== false); return Math.round(Math.min(...types.map(t => nightlyRate(t.id, d).rate)) / 1000) + 'k'; };
    rangeCalendar(el.querySelector('[data-cal]'), { checkIn: b.checkIn, checkOut: b.checkOut, priceFor: minAll, onChange: (a, c) => {
      booking.set(c ? { checkIn: a, checkOut: c } : {});
      el.querySelector('[data-sel]').textContent = c ? `${fmtRange(a, c)} · ${diffDays(a, c)} noches` : 'Elige la fecha de salida';
    } });
    el.querySelector('[data-next]').onclick = () => {
      const promo = el.querySelector('#bk-p').value.trim();
      if (promo && !findOffer(promo)) { toast('Código promocional no válido', 'warning'); return; }
      booking.set({ adults: +el.querySelector('#bk-a').value, children: +el.querySelector('#bk-c').value, promo });
      go(2);
    };
    return { live: false };
  }

  if (step === 2) {
    const guests = b.adults + b.children;
    const offer = findOffer(b.promo);
    const types = db.query('roomTypes', t => t.active !== false).sort((a, c) => a.order - c.order);
    el.innerHTML = wrap(`<div class="book-grid"><div class="stack">
      <div class="row between"><h2 style="margin:0">Habitaciones disponibles</h2><a class="btn btn-sm" href="#/reservar?paso=1">Cambiar fechas</a></div>
      ${offer ? `<p class="callout small">Código <b>${escape(offer.code)}</b>: ${offer.discountPct}% de descuento ${offer.minNights > 1 ? `desde ${offer.minNights} noches` : ''}.</p>` : ''}
      ${types.map(t => {
        const q = quote(t.id, b.checkIn, b.checkOut, { adults: b.adults, children: b.children, promo: b.promo });
        const free = availability(t.id, b.checkIn, b.checkOut);
        const fits = t.maxGuests >= guests;
        const ok = free > 0 && fits;
        return `<article class="card result ${ok ? '' : 'is-off'} ${b.typeId === t.id ? 'sel' : ''}">
          <div class="result-art">${roomArt(t.id, 1, { label: t.name })}</div>
          <div class="stack" style="gap:6px">
            <div class="row between"><h3 style="margin:0">${escape(t.name)}</h3>${!fits ? `<span class="badge badge-warning">Máx. ${t.maxGuests} personas</span>` : free ? `<span class="badge ${free <= 2 ? 'badge-danger' : 'badge-success'}">${free <= 2 ? `¡Quedan ${free}!` : `${free} disponibles`}</span>` : '<span class="badge badge-danger">Agotada</span>'}</div>
            <p class="muted small" style="margin:0">${escape(t.short)} · ${t.size} m² · ${escape(t.beds)}</p>
            <details class="small"><summary>Detalle por noche</summary><ul class="bill-lines">${q.nights.map(n => `<li><span>${fmtDay(n.date, { weekday: true })} <small class="muted">${escape(n.season)}</small></span><b>${money(n.rate)}</b></li>`).join('')}</ul></details>
            <div class="row between"><span>${q.discount ? `<s class="muted small">${money(q.roomTotal)}</s> ` : ''}<b class="price">${money(q.roomTotal - q.discount)}</b> <small class="muted">${q.n} noches · ${money((q.roomTotal - q.discount) / q.n)}/noche</small></span>
            <button class="btn ${ok ? 'btn-primary' : ''}" data-pick="${t.id}" ${ok ? '' : 'disabled'}>${b.typeId === t.id ? 'Seleccionada ✓' : 'Seleccionar'}</button></div>
          </div></article>`;
      }).join('')}
    </div>${summary()}</div>`);
    el.addEventListener('click', e => { const p = e.target.closest('[data-pick]'); if (p) { booking.set({ typeId: p.dataset.pick }); go(3); } });
    return { live: false };
  }

  if (step === 3) {
    const cat = db.query('extras', x => x.active !== false);
    const paint = () => {
      const sel = booking.get().extras || {};
      el.innerHTML = wrap(`<div class="book-grid"><div class="card stack">
        <h2 style="margin:0">Completa tu estadía</h2><p class="muted" style="margin:0">Agrega lo que quieras; puedes cambiarlo después desde "Mi reserva".</p>
        <div class="extras">${cat.map(x => `<label class="extra ${sel[x.id] ? 'on' : ''}"><input type="checkbox" data-x="${x.id}" ${sel[x.id] ? 'checked' : ''}><span class="extra-ico" aria-hidden="true">${escape(x.icon)}</span><span class="grow"><b>${escape(x.name)}</b><small class="muted d-block">${escape(x.desc)}</small></span><span class="nowrap"><b>${money(x.price)}</b><small class="muted d-block">${{ 'persona-noche': 'por persona/noche', noche: 'por noche', estadia: 'por estadía' }[x.per]}</small></span>${x.id === 'x-spa' && sel[x.id] ? `<select class="select sm" data-q="${x.id}" aria-label="Personas">${[1, 2, 3, 4].map(n => `<option ${n === sel[x.id] ? 'selected' : ''}>${n}</option>`).join('')}</select>` : ''}</label>`).join('')}</div>
        <div class="row between"><a class="btn btn-ghost" href="#/reservar?paso=2">← Volver</a><button class="btn btn-primary btn-lg" data-next>Continuar</button></div>
      </div>${summary()}</div>`);
    };
    el.addEventListener('change', e => {
      const x = e.target.closest('[data-x]'), q = e.target.closest('[data-q]');
      const sel = { ...(booking.get().extras || {}) };
      if (x) sel[x.dataset.x] = x.checked ? 1 : 0;
      if (q) sel[q.dataset.q] = +q.value;
      booking.set({ extras: sel }); paint();
    });
    el.addEventListener('click', e => { if (e.target.closest('[data-next]')) go(4); });
    paint();
    return { live: false };
  }

  if (step === 4) {
    const u = auth.current();
    const g = { ...(u?.role === 'guest' ? db.get('guests', u.guestId) || {} : {}), ...b.guest };
    el.innerHTML = wrap(`<div class="book-grid"><form class="card stack" id="gf" novalidate>
      <h2 style="margin:0">Datos del huésped principal</h2>
      ${u?.role === 'guest' ? `<p class="callout small">Reservando como <b>${escape(u.name)}</b> (Club Lumen).</p>` : '<p class="small muted" style="margin:0">¿Ya tienes cuenta? <a href="login.html?next=index.html%23%2Freservar%3Fpaso%3D4">Ingresa</a> para completar tus datos.</p>'}
      <div class="grid-2">
        <div class="field"><label for="g-n">Nombre y apellido *</label><input class="input" id="g-n" value="${escape(g.name || '')}" autocomplete="name"></div>
        <div class="field"><label for="g-e">Correo *</label><input class="input" id="g-e" type="email" value="${escape(g.email || '')}" autocomplete="email"></div>
        <div class="field"><label for="g-p">Teléfono *</label><input class="input" id="g-p" type="tel" value="${escape(g.phone || '')}" autocomplete="tel"></div>
        <div class="field"><label for="g-c">País</label><select class="select" id="g-c">${['Chile', 'Argentina', 'Brasil', 'Perú', 'Estados Unidos', 'Alemania', 'Francia', 'España', 'Reino Unido', 'Otro'].map(c => `<option ${c === (g.country || 'Chile') ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
        <div class="field"><label for="g-d">RUT o pasaporte</label><input class="input" id="g-d" value="${escape(g.doc || '')}"></div>
        <div class="field"><label for="g-t">Hora estimada de llegada</label><select class="select" id="g-t">${['15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00 o más tarde'].map(h => `<option ${h === g.eta ? 'selected' : ''}>${h}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label for="g-r">Solicitudes especiales</label><textarea class="textarea" id="g-r" placeholder="Celebración, cuna, piso alto, alergias…">${escape(g.requests || '')}</textarea></div>
      <label class="check"><input type="checkbox" id="g-ok" ${g.ok ? 'checked' : ''}> Acepto la política de cancelación (gratis hasta ${settings().freeCancelDays} días antes; después se cobra ${settings().penaltyNights} noche).</label>
      <div class="row between"><a class="btn btn-ghost" href="#/reservar?paso=3">← Volver</a><button class="btn btn-primary btn-lg">Ir al pago</button></div>
    </form>${summary()}</div>`);
    el.querySelector('#gf').onsubmit = e => {
      e.preventDefault();
      const v = id => el.querySelector(id).value.trim();
      const data = { name: v('#g-n'), email: v('#g-e'), phone: v('#g-p'), country: v('#g-c'), doc: v('#g-d'), eta: v('#g-t'), requests: v('#g-r'), ok: el.querySelector('#g-ok').checked };
      const bad = { '#g-n': !data.name, '#g-e': !/^\S+@\S+\.\S+$/.test(data.email), '#g-p': data.phone.length < 6 };
      Object.entries(bad).forEach(([id, x]) => el.querySelector(id).classList.toggle('invalid', x));
      if (Object.values(bad).some(Boolean)) { toast('Revisa los campos marcados', 'warning'); return; }
      if (!data.ok) { toast('Debes aceptar la política de cancelación', 'warning'); return; }
      booking.set({ guest: data }); go(5);
    };
    return { live: false };
  }

  if (step === 5) {
    const q = currentQuote();
    const dep = Math.round(q.total * (settings().depositPct || 30) / 100);
    el.innerHTML = wrap(`<div class="book-grid"><form class="card stack" id="pf" novalidate>
      <h2 style="margin:0">Pago seguro</h2>
      <p class="callout small">🔒 Demostración: no se realiza ningún cobro. Usa cualquier tarjeta de 16 dígitos, p. ej. 4242 4242 4242 4242.</p>
      <div class="row chips"><label class="chip active"><input type="radio" name="plan" value="full" checked hidden> Pagar total ${money(q.total)}</label><label class="chip"><input type="radio" name="plan" value="dep" hidden> Abono ${settings().depositPct}% · ${money(dep)}</label></div>
      <div class="card-visual" aria-hidden="true"><span class="cv-chip"></span><b data-cvn>•••• •••• •••• ••••</b><div class="row between small"><span data-cvh>NOMBRE TITULAR</span><span data-cve>MM/AA</span></div></div>
      <div class="field"><label for="c-n">Número de tarjeta *</label><input class="input mono" id="c-n" inputmode="numeric" autocomplete="cc-number" placeholder="0000 0000 0000 0000" maxlength="19"></div>
      <div class="grid-3"><div class="field"><label for="c-h">Titular *</label><input class="input" id="c-h" autocomplete="cc-name" value="${escape(b.guest.name || '')}"></div>
        <div class="field"><label for="c-e">Vencimiento *</label><input class="input mono" id="c-e" placeholder="MM/AA" maxlength="5" autocomplete="cc-exp"></div>
        <div class="field"><label for="c-c">CVV *</label><input class="input mono" id="c-c" inputmode="numeric" maxlength="4" autocomplete="cc-csc"></div></div>
      <div class="row between"><a class="btn btn-ghost" href="#/reservar?paso=4">← Volver</a><button class="btn btn-primary btn-lg" data-pay>Pagar y confirmar</button></div>
    </form>${summary()}</div>`);
    const f = el.querySelector('#pf');
    f.addEventListener('change', e => { if (e.target.name === 'plan') f.querySelectorAll('.chips .chip').forEach(c => c.classList.toggle('active', c.querySelector('input').checked)); });
    f.addEventListener('input', e => {
      if (e.target.id === 'c-n') { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '); f.querySelector('[data-cvn]').textContent = (e.target.value || '•••• •••• •••• ••••').padEnd(19, '•'); }
      if (e.target.id === 'c-e') { let v = e.target.value.replace(/\D/g, '').slice(0, 4); if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2); e.target.value = v; f.querySelector('[data-cve]').textContent = v || 'MM/AA'; }
      if (e.target.id === 'c-h') f.querySelector('[data-cvh]').textContent = e.target.value.toUpperCase() || 'NOMBRE TITULAR';
    });
    f.onsubmit = async e => {
      e.preventDefault();
      const num = f.querySelector('#c-n').value.replace(/\s/g, ''), exp = f.querySelector('#c-e').value, cvv = f.querySelector('#c-c').value, holder = f.querySelector('#c-h').value.trim();
      const [mm, yy] = exp.split('/').map(Number);
      const expOk = mm >= 1 && mm <= 12 && yy >= 0 && new Date(2000 + yy, mm, 0) >= new Date();
      const bad = { '#c-n': num.length !== 16, '#c-e': !expOk, '#c-c': !/^\d{3,4}$/.test(cvv), '#c-h': !holder };
      Object.entries(bad).forEach(([id, x]) => f.querySelector(id).classList.toggle('invalid', x));
      if (Object.values(bad).some(Boolean)) { toast('Revisa los datos de la tarjeta', 'warning'); return; }
      const cur = booking.get();
      if (!availability(cur.typeId, cur.checkIn, cur.checkOut)) { toast('Lo sentimos, esa habitación se acaba de agotar. Elige otra.', 'error'); go(2); return; }
      const btn = f.querySelector('[data-pay]'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Procesando pago…';
      await sleep(1200);
      const plan = f.querySelector('[name=plan]:checked').value;
      const res = createReservation({ guest: { name: cur.guest.name, email: cur.guest.email, phone: cur.guest.phone, country: cur.guest.country, doc: cur.guest.doc }, typeId: cur.typeId, checkIn: cur.checkIn, checkOut: cur.checkOut, adults: cur.adults, children: cur.children, extras: extrasList(), promo: cur.promo, channel: 'web', paid: plan === 'full' ? q.total : dep, notes: [cur.guest.requests, cur.guest.eta ? `Llegada ${cur.guest.eta}` : ''].filter(Boolean).join(' · '), payMethod: `Tarjeta •••• ${num.slice(-4)}` });
      booking.set({ lastCode: res.code, lastEmail: cur.guest.email });
      go(6);
    };
    return { live: false };
  }

  // Paso 6: confirmación
  const res = db.find('reservations', x => x.code === b.lastCode);
  if (!res) { go(1); return; }
  const t = typeById(res.roomTypeId), terms = cancelTerms(res);
  el.innerHTML = wrap(`<div class="card stack confirm" data-anim="bounceIn">
    <span class="big-emoji">🎉</span><h1 style="margin:0">¡Reserva confirmada!</h1>
    <p class="lead">Te enviamos la confirmación a <b>${escape(b.lastEmail)}</b>.</p>
    <div class="code-box"><small>Código de reserva</small><b>${escape(res.code)}</b></div>
    <div class="grid-3 small"><div><span class="label">Habitación</span><b class="d-block">${escape(t.name)}</b></div><div><span class="label">Fechas</span><b class="d-block">${fmtRange(res.checkIn, res.checkOut)}</b></div><div><span class="label">Pagado</span><b class="d-block">${money(res.paid)} de ${money(res.total)}</b></div></div>
    <p class="small muted">${terms.free ? `Cancelación gratuita hasta el ${fmtDay(addDays(res.checkIn, -settings().freeCancelDays), { weekday: true, year: true })}.` : 'Esta reserva ya está dentro del plazo con penalidad por cancelación.'}</p>
    <div class="row"><a class="btn btn-primary" href="#/mi-reserva?code=${encodeURIComponent(res.code)}&email=${encodeURIComponent(b.lastEmail)}">Gestionar mi reserva</a><a class="btn" href="#/mi-reserva?code=${encodeURIComponent(res.code)}&email=${encodeURIComponent(b.lastEmail)}&tab=checkin">Hacer check-in online</a><a class="btn btn-ghost" href="#/" data-newb>Volver al inicio</a></div>
  </div>`);
  el.querySelector('[data-newb]').onclick = () => { const keep = booking.get(); booking.reset(); booking.set({ lastCode: keep.lastCode, lastEmail: keep.lastEmail }); };
  return { live: false };
}
export { today };
