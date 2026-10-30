// Gestionar mi reserva: búsqueda, detalle con folio, cambio de fechas, cancelación según política y check-in online.
import { money, escape, toast, sleep, confirm } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { RES_STATES, typeById, roomById, quote, availability, freeRooms, cancelTerms, folioTotals, settings } from '../shared/hotel.js';
import { fmtDay, fmtRange, diffDays, today, addDays } from '../shared/dates.js';
import { rangeCalendar } from './calendar.js';
import { roomArt } from './art.js';

export function findBooking(code, email) {
  return db.find('reservations', x => x.code.toUpperCase() === String(code).trim().toUpperCase() && (db.get('guests', x.guestId)?.email || '').toLowerCase() === String(email).trim().toLowerCase());
}

export function bookingPanel(box, res, opts = {}) {
  const { tab = 'detalle', base = '#/mi-reserva', userId = null } = opts;
  res = db.get('reservations', res.id);
  const t = typeById(res.roomTypeId), g = db.get('guests', res.guestId);
  const editable = res.status === 'confirmada' && res.checkIn >= today();
  const ft = folioTotals(res);
  const q = `code=${encodeURIComponent(res.code)}&email=${encodeURIComponent(g?.email || '')}`;
  const link = opts.link || (k => `${base}?${q}&tab=${k}`);
  const tabs = [['detalle', 'Detalle'], ['checkin', 'Check-in online'], ['modificar', 'Cambiar fechas'], ['cancelar', 'Cancelar']];
  box.innerHTML = `<div class="card stack bk-panel">
    <div class="row between"><div><small class="muted">Reserva</small><h2 style="margin:0">${escape(res.code)}</h2></div><span class="badge badge-${RES_STATES[res.status].badge}">${RES_STATES[res.status].label}</span></div>
    <div class="bk-head"><div class="bk-art">${roomArt(t.id, 0)}</div><div class="stack" style="gap:4px"><b>${escape(t.name)}</b><span class="small">${fmtRange(res.checkIn, res.checkOut)} · ${res.nights} noches</span><span class="small muted">${res.adults} adultos${res.children ? ` · ${res.children} niños` : ''} · ${escape(g?.name || res.guestName)}</span>${res.precheck ? '<span class="badge badge-success plain">Check-in online completado</span>' : ''}</div></div>
    <div class="tabs">${tabs.map(([k, l]) => `<a class="tab ${tab === k ? 'active' : ''}" href="${link(k)}">${l}</a>`).join('')}</div>
    <div data-tab></div>
  </div>`;
  const tb = box.querySelector('[data-tab]');
  if (tab === 'detalle') {
    tb.innerHTML = `<ul class="bill-lines small">${ft.lines.map(l => `<li><span>${escape(l.desc)} <small class="muted">${fmtDay(l.date)}${l.method ? ' · ' + escape(l.method) : ''}</small></span><b class="${l.kind === 'pago' ? 'pos' : ''}">${l.kind === 'pago' ? '−' : ''}${money(Math.abs(l.amount))}</b></li>`).join('')}</ul>
      <div class="row between total-row"><span>Saldo pendiente</span><b>${money(Math.max(0, ft.balance))}</b></div>
      ${res.roomId && res.status === 'check-in' ? `<p class="small">Habitación asignada: <b>${escape(roomById(res.roomId)?.number || '')}</b></p>` : ''}
      <p class="small muted">Check-in desde las ${escape(settings().checkInTime)} · Check-out hasta las ${escape(settings().checkOutTime)}.${res.notes ? ` Notas: ${escape(res.notes)}` : ''}</p>`;
  } else if (tab === 'checkin') {
    if (!['confirmada'].includes(res.status)) { tb.innerHTML = `<p class="muted">El check-in online está disponible solo para reservas confirmadas que aún no llegan.</p>`; return; }
    const p = res.precheck || {};
    tb.innerHTML = `<form class="stack" id="pc" novalidate>
      <p class="small muted" style="margin:0">Completa tu registro y sáltate la fila: en recepción solo retiras tu llave.</p>
      <div class="grid-2">
        <div class="field"><label for="pc-doc">RUT o pasaporte *</label><input class="input" id="pc-doc" value="${escape(p.doc || g?.doc || '')}"></div>
        <div class="field"><label for="pc-nat">Nacionalidad *</label><input class="input" id="pc-nat" value="${escape(p.nationality || g?.country || '')}"></div>
        <div class="field"><label for="pc-eta">Hora de llegada</label><select class="select" id="pc-eta">${['15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00+'].map(h => `<option ${h === p.eta ? 'selected' : ''}>${h}</option>`).join('')}</select></div>
        <div class="field"><label for="pc-car">Patente (si usas estacionamiento)</label><input class="input" id="pc-car" value="${escape(p.car || '')}"></div>
      </div>
      <div class="field"><label for="pc-sig">Firma (escribe tu nombre completo) *</label><input class="input sig" id="pc-sig" value="${escape(p.signature || '')}"></div>
      <label class="check"><input type="checkbox" id="pc-ok" ${p.signature ? 'checked' : ''}> Declaro que los datos son correctos y acepto las normas del hotel.</label>
      <button class="btn btn-primary">${p.signature ? 'Actualizar check-in online' : 'Completar check-in online'}</button></form>`;
    tb.querySelector('#pc').onsubmit = e => {
      e.preventDefault();
      const v = id => tb.querySelector(id).value.trim();
      const bad = { '#pc-doc': !v('#pc-doc'), '#pc-nat': !v('#pc-nat'), '#pc-sig': v('#pc-sig').length < 4 };
      Object.entries(bad).forEach(([id, x]) => tb.querySelector(id).classList.toggle('invalid', x));
      if (Object.values(bad).some(Boolean) || !tb.querySelector('#pc-ok').checked) { toast('Completa los campos y acepta las normas', 'warning'); return; }
      db.update('reservations', res.id, { precheck: { doc: v('#pc-doc'), nationality: v('#pc-nat'), eta: v('#pc-eta'), car: v('#pc-car'), signature: v('#pc-sig'), at: new Date().toISOString() } });
      if (g) db.update('guests', g.id, { doc: v('#pc-doc') });
      db.log('check-in online', `${res.code} · ${res.guestName} completó su check-in online`, userId);
      toast('¡Check-in online listo! Te esperamos', 'success');
      bookingPanel(box, res, { ...opts, tab: 'detalle' });
    };
  } else if (tab === 'modificar') {
    if (!editable) { tb.innerHTML = '<p class="muted">Solo se pueden cambiar las fechas de reservas confirmadas que aún no comienzan.</p>'; return; }
    tb.innerHTML = `<div data-cal></div><div data-out class="stack"></div>`;
    const out = tb.querySelector('[data-out]');
    let sel = null;
    rangeCalendar(tb.querySelector('[data-cal]'), { checkIn: res.checkIn, checkOut: res.checkOut, onChange: (a, c) => {
      if (!c) { out.innerHTML = ''; return; }
      const nq = quote(res.roomTypeId, a, c, { extras: res.extras.map(x => ({ extraId: x.extraId, qty: x.qty })), adults: res.adults, children: res.children, promo: res.offerCode });
      const ok = availability(res.roomTypeId, a, c, res.id) > 0;
      const diff = nq.total - res.total;
      sel = ok ? { a, c, nq } : null;
      out.innerHTML = `<div class="callout small">${fmtRange(a, c)} · ${nq.n} noches · nuevo total <b>${money(nq.total)}</b> (${diff >= 0 ? 'diferencia a pagar ' + money(diff) : 'a tu favor ' + money(-diff)})</div>
        ${ok ? '<button class="btn btn-primary" data-apply>Confirmar cambio de fechas</button>' : '<p class="badge badge-danger">Sin disponibilidad para esas fechas</p>'}`;
    } });
    out.addEventListener('click', async e => {
      if (!e.target.closest('[data-apply]') || !sel) return;
      const room = res.roomId && freeRooms(res.roomTypeId, sel.a, sel.c, res.id).some(r => r.id === res.roomId) ? res.roomId : (freeRooms(res.roomTypeId, sel.a, sel.c, res.id)[0]?.id || '');
      db.update('reservations', res.id, { checkIn: sel.a, checkOut: sel.c, nights: sel.nq.n, roomTotal: sel.nq.roomTotal, extras: sel.nq.extrasLines, extrasTotal: sel.nq.extrasTotal, discount: sel.nq.discount, total: sel.nq.total, roomId: room });
      db.log('reserva', `${res.code}: fechas cambiadas a ${sel.a} → ${sel.c}`, userId);
      toast('Fechas actualizadas', 'success');
      bookingPanel(box, res, { ...opts, tab: 'detalle' });
    });
  } else {
    if (res.status !== 'confirmada') { tb.innerHTML = `<p class="muted">Esta reserva no se puede cancelar (estado: ${RES_STATES[res.status].label}).</p>`; return; }
    const tm = cancelTerms(res);
    tb.innerHTML = `<div class="stack"><p>${tm.free ? `Estás dentro del plazo de <b>cancelación gratuita</b> (faltan ${tm.daysLeft} días).` : `Faltan ${tm.daysLeft} días para tu llegada: según la política se cobra <b>${money(tm.penalty)}</b> (${settings().penaltyNights} noche).`}</p>
      <ul class="bill-lines small"><li><span>Pagado</span><b>${money(res.paid || 0)}</b></li><li><span>Penalidad</span><b>${money(tm.penalty)}</b></li><li><span>Reembolso</span><b>${money(tm.refund)}</b></li></ul>
      <button class="btn btn-danger" data-cancel>Cancelar reserva</button></div>`;
    tb.querySelector('[data-cancel]').onclick = async () => {
      if (!await confirm(`¿Cancelar la reserva ${res.code}? ${tm.penalty ? `Se cobrará ${money(tm.penalty)}.` : 'No tiene costo.'}`, { danger: true, ok: 'Sí, cancelar' })) return;
      db.update('reservations', res.id, { status: 'cancelada', cancelledAt: new Date().toISOString(), penalty: tm.penalty, refund: tm.refund });
      db.log('cancelación', `${res.code} cancelada por el huésped (penalidad ${money(tm.penalty)})`, userId);
      toast('Reserva cancelada', 'success');
      bookingPanel(box, res, { ...opts, tab: 'detalle' });
    };
  }
}

export function renderManage(el, params, query) {
  const res = query.code ? findBooking(query.code, query.email || '') : null;
  el.innerHTML = `<section class="section page-top"><div class="container stack narrow">
    <span class="eyebrow">Mi reserva</span><h1>Gestiona tu estadía</h1>
    ${res ? '<div data-panel></div>' : `<form class="card stack" id="lk" novalidate>
      <p class="muted" style="margin:0">Ingresa el código que te enviamos por correo y el correo usado al reservar.</p>
      ${query.code ? '<p class="callout small">No encontramos una reserva con esos datos.</p>' : ''}
      <div class="grid-2"><div class="field"><label for="lk-c">Código de reserva</label><input class="input" id="lk-c" placeholder="BL-0000" value="${escape(query.code || '')}"></div>
      <div class="field"><label for="lk-e">Correo</label><input class="input" id="lk-e" type="email" value="${escape(query.email || '')}"></div></div>
      <button class="btn btn-primary">Buscar reserva</button>
      <small class="muted">Prueba con <code>BL-DEMO1</code> y <code>emma@correo.de</code>.</small></form>`}
  </div></section>`;
  if (res) { bookingPanel(el.querySelector('[data-panel]'), res, { tab: query.tab || 'detalle' }); return { refresh: () => {} }; }
  el.querySelector('#lk').onsubmit = e => {
    e.preventDefault();
    location.hash = `#/mi-reserva?code=${encodeURIComponent(el.querySelector('#lk-c').value.trim())}&email=${encodeURIComponent(el.querySelector('#lk-e').value.trim())}&tab=${query.tab || 'detalle'}`;
  };
  return { live: false };
}
export { diffDays, addDays, sleep };
