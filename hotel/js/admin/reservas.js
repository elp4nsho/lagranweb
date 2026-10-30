// Reservas: CRUD, detalle con flujo de estados, filtros y CSV.
import { money, escape, modal, toast, confirm, dateTime } from '../../../assets/core/ui.js';
import { pageHead, badge, smartTable } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { RES_STATES, typeById, roomById, channelName, quote, freeRooms, createReservation, setStatus, folioTotals, cancelTerms, today, addDays, diffDays } from '../shared/hotel.js';
import { fmtDay, fmtRange } from '../shared/dates.js';
import { folioModal } from '../shared/folio.js';

const FLOW = { confirmada: ['check-in', 'no-show', 'cancelada'], 'check-in': ['check-out'], 'check-out': [], cancelada: ['confirmada'], 'no-show': ['confirmada'] };
const ACT = { 'check-in': 'Hacer check-in', 'check-out': 'Hacer check-out', 'no-show': 'Marcar no-show', cancelada: 'Cancelar', confirmada: 'Reactivar' };

export function resForm(res, ctx, preset = {}) {
  const isNew = !res;
  const r = res || { roomTypeId: preset.typeId || 'clasica', roomId: preset.roomId || '', checkIn: preset.checkIn || today(), checkOut: preset.checkOut || addDays(preset.checkIn || today(), 2), adults: 2, children: 0, channel: 'telefono', status: 'confirmada', notes: '', extras: [], guestId: '' };
  const g = r.guestId ? db.get('guests', r.guestId) : null;
  const types = db.all('roomTypes').sort((a, b) => a.order - b.order);
  const f = document.createElement('form');
  f.className = 'stack'; f.noValidate = true;
  f.innerHTML = `
    <div class="grid-2">
      <div class="field"><label for="rf-gn">Huésped (nombre) *</label><input class="input" id="rf-gn" name="gname" list="rf-guests" value="${escape(g?.name || r.guestName || '')}"><datalist id="rf-guests">${db.all('guests').slice(0, 200).map(x => `<option value="${escape(x.name)}">${escape(x.email)}</option>`).join('')}</datalist></div>
      <div class="field"><label for="rf-ge">Correo *</label><input class="input" id="rf-ge" name="gemail" type="email" value="${escape(g?.email || '')}"></div>
      <div class="field"><label for="rf-gp">Teléfono</label><input class="input" id="rf-gp" name="gphone" value="${escape(g?.phone || '')}"></div>
      <div class="field"><label for="rf-ch">Canal</label><select class="select" id="rf-ch" name="channel">${db.all('channels').map(c => `<option value="${c.id}" ${c.id === r.channel ? 'selected' : ''}>${escape(c.name)}</option>`).join('')}</select></div>
    </div>
    <div class="grid-3">
      <div class="field"><label for="rf-in">Llegada *</label><input class="input" id="rf-in" name="checkIn" type="date" value="${r.checkIn}"></div>
      <div class="field"><label for="rf-out">Salida *</label><input class="input" id="rf-out" name="checkOut" type="date" value="${r.checkOut}"></div>
      <div class="field"><label for="rf-t">Tipo</label><select class="select" id="rf-t" name="typeId">${types.map(t => `<option value="${t.id}" ${t.id === r.roomTypeId ? 'selected' : ''}>${escape(t.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="rf-r">Habitación</label><select class="select" id="rf-r" name="roomId"></select></div>
      <div class="field"><label for="rf-a">Adultos</label><input class="input" id="rf-a" name="adults" type="number" min="1" max="4" value="${r.adults}"></div>
      <div class="field"><label for="rf-c">Niños</label><input class="input" id="rf-c" name="children" type="number" min="0" max="3" value="${r.children}"></div>
    </div>
    <fieldset class="fs"><legend>Extras</legend><div class="row">${db.query('extras', x => x.active !== false).map(x => `<label class="check"><input type="checkbox" name="ex" value="${x.id}" ${r.extras.some(e => e.extraId === x.id) ? 'checked' : ''}> ${escape(x.icon)} ${escape(x.name)}</label>`).join('')}</div></fieldset>
    <div class="grid-2"><div class="field"><label for="rf-st">Estado</label><select class="select" id="rf-st" name="status">${Object.entries(RES_STATES).map(([k, v]) => `<option value="${k}" ${k === r.status ? 'selected' : ''}>${v.label}</option>`).join('')}</select></div>
      <div class="field"><label for="rf-pd">Pagado (CLP)</label><input class="input" id="rf-pd" name="paid" type="number" min="0" step="1000" value="${r.paid || 0}"></div></div>
    <div class="field"><label for="rf-n">Notas</label><textarea class="textarea" id="rf-n" name="notes">${escape(r.notes || '')}</textarea></div>
    <div class="callout small" data-q></div>`;
  const m = modal({ title: isNew ? 'Nueva reserva' : `Editar ${r.code}`, size: 'lg', body: f, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-save>Guardar</button>' });
  const el = n => f.elements[n];
  const update = () => {
    const a = el('checkIn').value, b = el('checkOut').value, t = el('typeId').value;
    const valid = a && b && b > a;
    const rooms = valid ? freeRooms(t, a, b, res?.id) : [];
    const cur = el('roomId').value || r.roomId;
    el('roomId').innerHTML = `<option value="">Sin asignar</option>${rooms.map(x => `<option value="${x.id}" ${x.id === cur ? 'selected' : ''}>${x.number} · piso ${x.floor} (${x.hk})</option>`).join('')}`;
    if (!valid) { f.querySelector('[data-q]').textContent = 'La salida debe ser posterior a la llegada.'; return; }
    const q = quote(t, a, b, { adults: +el('adults').value, children: +el('children').value, extras: [...f.querySelectorAll('[name=ex]:checked')].map(i => ({ extraId: i.value, qty: 1 })) });
    f.querySelector('[data-q]').innerHTML = `${q.n} noches · alojamiento ${money(q.roomTotal)} + extras ${money(q.extrasTotal)} = <b>${money(q.total)}</b> · ${rooms.length} habitaciones libres de este tipo`;
  };
  f.addEventListener('change', update);
  f.addEventListener('input', e => {
    if (e.target.name === 'gname') { const x = db.find('guests', z => z.name === e.target.value); if (x) { el('gemail').value = x.email; el('gphone').value = x.phone; } }
  });
  update();
  m.el.querySelector('[data-save]').onclick = async () => {
    const v = n => el(n).value.trim();
    const bad = { gname: !v('gname'), gemail: !/^\S+@\S+\.\S+$/.test(v('gemail')), checkOut: !(v('checkOut') > v('checkIn')) };
    Object.entries(bad).forEach(([k, x]) => el(k).classList.toggle('invalid', x));
    if (Object.values(bad).some(Boolean)) { toast('Revisa los campos marcados', 'warning'); return; }
    const extras = [...f.querySelectorAll('[name=ex]:checked')].map(i => ({ extraId: i.value, qty: 1 }));
    const t = v('typeId'), a = v('checkIn'), b = v('checkOut');
    if (v('roomId') && !freeRooms(t, a, b, res?.id).some(x => x.id === v('roomId'))) { toast('Esa habitación está ocupada en esas fechas', 'warning'); return; }
    const guest = { name: v('gname'), email: v('gemail'), phone: v('gphone') };
    if (isNew) {
      const created = createReservation({ guest, typeId: t, checkIn: a, checkOut: b, adults: +v('adults'), children: +v('children'), extras, channel: v('channel'), paid: +v('paid') || 0, notes: v('notes'), status: v('status'), roomId: v('roomId') || null, userId: ctx.user.id, payMethod: 'Recepción' });
      if (!v('roomId')) db.update('reservations', created.id, { roomId: '' });
      toast(`Reserva ${created.code} creada`, 'success');
    } else {
      const q = quote(t, a, b, { adults: +v('adults'), children: +v('children'), extras, promo: r.offerCode });
      const gg = db.find('guests', x => x.email.toLowerCase() === guest.email.toLowerCase()) || db.insert('guests', { ...guest, country: 'Chile', doc: '', vip: false, tags: [], notes: '' });
      db.update('reservations', r.id, { guestId: gg.id, guestName: gg.name, roomTypeId: t, roomId: v('roomId'), checkIn: a, checkOut: b, nights: q.n, adults: +v('adults'), children: +v('children'), extras: q.extrasLines, roomTotal: q.roomTotal, extrasTotal: q.extrasTotal, discount: q.discount, total: q.total, channel: v('channel'), status: v('status'), paid: +v('paid') || 0, notes: v('notes') });
      db.log('reserva', `${r.code} editada`, ctx.user.id);
      toast('Reserva actualizada', 'success');
    }
    m.close();
  };
}

export function resDetail(id, ctx) {
  const body = document.createElement('div');
  body.className = 'stack';
  const m = modal({ title: 'Reserva', size: 'lg', body, foot: '<span></span>' });
  const paint = () => {
    const r = db.get('reservations', id);
    if (!r) { m.close(); return; }
    const g = db.get('guests', r.guestId), ft = folioTotals(r), t = typeById(r.roomTypeId);
    m.el.querySelector('.modal-head h3').textContent = `${r.code} · ${r.guestName}`;
    body.innerHTML = `<div class="row between">${badge(RES_STATES, r.status)}<small class="muted">Creada ${dateTime(r.createdAt)} · ${escape(channelName(r.channel))}</small></div>
      <div class="grid-3 small detail-grid">
        <div><span class="label">Fechas</span><b class="d-block">${fmtRange(r.checkIn, r.checkOut)}</b>${r.nights} noches</div>
        <div><span class="label">Habitación</span><b class="d-block">${escape(t?.name || '')}</b>${r.roomId ? 'N° ' + escape(roomById(r.roomId)?.number || '') : '<span class="text-warning">Sin asignar</span>'}</div>
        <div><span class="label">Huéspedes</span><b class="d-block">${r.adults} adultos${r.children ? `, ${r.children} niños` : ''}</b>${escape(g?.email || '')}</div>
        <div><span class="label">Total</span><b class="d-block">${money(r.total)}</b>${r.discount ? `incl. desc. ${escape(r.offerCode)}` : ''}</div>
        <div><span class="label">Pagado</span><b class="d-block">${money(ft.payments)}</b>saldo ${money(Math.max(0, ft.balance))}</div>
        <div><span class="label">Check-in online</span><b class="d-block">${r.precheck ? '✓ ' + escape(r.precheck.eta || '') : '—'}</b>${r.precheck ? escape(r.precheck.doc) : ''}</div>
      </div>
      ${r.extras?.length ? `<div class="row small">${r.extras.map(e => `<span class="badge plain">${escape(e.name)}</span>`).join('')}</div>` : ''}
      ${r.notes ? `<p class="callout small">📝 ${escape(r.notes)}</p>` : ''}
      ${r.status === 'cancelada' ? `<p class="small muted">Cancelada ${r.cancelledAt ? dateTime(r.cancelledAt) : ''}${r.penalty != null ? ` · penalidad ${money(r.penalty)}` : ''}</p>` : ''}`;
    m.el.querySelector('.modal-foot').innerHTML = `${ctx.can('reservas') ? `<button class="btn btn-ghost" data-del>Eliminar</button>` : ''}<span class="grow"></span><button class="btn" data-folio>Folio</button>${ctx.can('reservas') ? '<button class="btn" data-edit>Editar</button>' : ''}${FLOW[r.status].map(s => `<button class="btn ${s === 'check-in' || s === 'check-out' ? 'btn-primary' : s === 'cancelada' ? 'btn-danger' : ''}" data-st="${s}">${ACT[s]}</button>`).join('')}`;
  };
  m.el.addEventListener('click', async e => {
    const r = db.get('reservations', id);
    const b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-folio')) folioModal(id, ctx.user);
    if (b.hasAttribute('data-edit')) { m.close(); resForm(r, ctx); return; }
    if (b.hasAttribute('data-del')) { if (await confirm(`¿Eliminar definitivamente ${r.code}?`, { danger: true, ok: 'Eliminar' })) { db.remove('reservations', id); db.log('reserva', `${r.code} eliminada`, ctx.user.id); m.close(); } return; }
    const st = b.dataset.st; if (!st) return;
    if (st === 'check-in') {
      if (!r.roomId) { const free = freeRooms(r.roomTypeId, r.checkIn, r.checkOut, r.id).sort((x, y) => (y.hk === 'inspeccionada') - (x.hk === 'inspeccionada'))[0]; if (!free) { toast('No hay habitaciones libres de ese tipo', 'warning'); return; } db.update('reservations', id, { roomId: free.id }); }
      const room = roomById(db.get('reservations', id).roomId);
      if (room.hk === 'sucia' && !await confirm(`La habitación ${room.number} figura SUCIA. ¿Hacer check-in igual?`, { ok: 'Sí, continuar' })) return;
      setStatus(id, 'check-in', ctx.user.id); toast(`Check-in: hab. ${room.number}`, 'success');
    } else if (st === 'check-out') {
      folioModal(id, ctx.user, { onSettle: () => { setStatus(id, 'check-out', ctx.user.id); toast('Check-out realizado · habitación a limpieza', 'success'); } });
    } else if (st === 'cancelada') {
      const tm = cancelTerms(r);
      if (!await confirm(`¿Cancelar ${r.code}? ${tm.free ? 'Sin penalidad.' : `Penalidad según política: ${money(tm.penalty)}.`}`, { danger: true, ok: 'Cancelar reserva' })) return;
      setStatus(id, 'cancelada', ctx.user.id, { penalty: tm.penalty, refund: tm.refund, roomId: '' });
    } else setStatus(id, st, ctx.user.id);
    paint();
  });
  paint();
}

export default {
  id: 'reservas', label: 'Reservas', icon: '📋', group: 'Operación', roles: ['admin', 'recepcion'], watch: ['reservations'],
  render(el, ctx) {
    el.innerHTML = `${pageHead('Reservas', 'Todas las reservas de todos los canales', '<button class="btn btn-primary btn-sm" data-new>+ Nueva reserva</button>')}<div data-list></div>`;
    el.querySelector('[data-new]').onclick = () => resForm(null, ctx);
    const T = today();
    return smartTable(el.querySelector('[data-list]'), {
      rows: () => db.all('reservations').map(r => ({ ...r, typeName: typeById(r.roomTypeId)?.name || '', roomNum: roomById(r.roomId)?.number || '', chName: channelName(r.channel) })),
      filters: [
        { key: 'status', label: 'Estado', options: Object.entries(RES_STATES).map(([k, v]) => [k, v.label]) },
        { key: 'channel', label: 'Canal', options: db.all('channels').map(c => [c.id, c.name]) },
        { key: 'roomTypeId', label: 'Tipo', options: db.all('roomTypes').map(t => [t.id, t.name]) },
        { key: 'period', label: 'Periodo', value: 'upcoming', options: [['upcoming', 'Próximas y en casa'], ['today', 'Llegan hoy'], ['past', 'Pasadas']], test: (r, v) => v === 'today' ? r.checkIn === T : v === 'upcoming' ? r.checkOut >= T : r.checkOut < T }
      ],
      search: r => `${r.code} ${r.guestName} ${r.roomNum}`,
      columns: [
        { key: 'code', label: 'Código', render: r => `<code>${escape(r.code)}</code>` },
        { key: 'guestName', label: 'Huésped', render: r => `<b>${escape(r.guestName)}</b>` },
        { key: 'checkIn', label: 'Llegada', render: r => `<span class="nowrap">${fmtDay(r.checkIn, { weekday: true })}</span>` },
        { key: 'nights', label: 'Noches' },
        { key: 'typeName', label: 'Tipo', render: r => `<small>${escape(r.typeName)}</small>` },
        { key: 'roomNum', label: 'Hab.', render: r => r.roomNum || '<span class="muted">—</span>' },
        { key: 'chName', label: 'Canal', render: r => `<small>${escape(r.chName)}</small>` },
        { key: 'total', label: 'Total', render: r => money(r.total) },
        { key: 'status', label: 'Estado', render: r => badge(RES_STATES, r.status) }
      ],
      onRow: r => resDetail(r.id, ctx),
      csv: { name: 'reservas', map: r => ({ codigo: r.code, huesped: r.guestName, llegada: r.checkIn, salida: r.checkOut, noches: r.nights, tipo: r.typeName, habitacion: r.roomNum, canal: r.chName, total: r.total, pagado: r.paid, estado: r.status }) }
    });
  }
};
export { diffDays };
