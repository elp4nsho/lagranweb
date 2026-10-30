// Calendario diario de salas de reuniones + diálogo de reserva (panel y app de empleado).
import { escape, toast } from '../../../assets/core/ui.js';
import { formDialog } from './form.js';
import { toMin, fromMin, today, hm, fmtDay } from './dates.js';
import { BOOKABLE } from './util.js';

export const START = 8 * 60, END = 19 * 60, STEP = 30;
const SLOTS = (END - START) / STEP;

export const bookableRooms = idx => idx.floors.flatMap(f => (f.rooms || []).filter(r => BOOKABLE.includes(r.type)).map(room => ({ room, floor: f })));

export function roomBusyNow(db, companyId, roomId) {
  if (new Date().getDay() % 6 === 0) return null;
  const now = hm();
  return db.find('roomBookings', b => b.companyId === companyId && b.roomId === roomId && b.date === today() && b.start <= now && b.end > now);
}

export function renderRoomCal(el, { db, idx, date, onSlot, onBooking, mineId }) {
  const rooms = bookableRooms(idx);
  const bookings = db.query('roomBookings', b => b.companyId === idx.company.id && b.date === date);
  const col = t => 2 + Math.round((toMin(t) - START) / STEP);
  let cells = '<div class="rcal-h rcal-corner">Sala</div>';
  for (let h = START; h < END; h += 60) cells += `<div class="rcal-h" style="grid-column:${col(fromMin(h))} / span 2">${fromMin(h)}</div>`;
  const nowM = date === today() ? toMin(hm()) : -1;
  rooms.forEach(({ room, floor }, i) => {
    const row = i + 2;
    cells += `<div class="rcal-room" style="grid-row:${row}"><b>${escape(room.name)}</b><small class="muted">${escape(floor.name)} · ${room.cap} pers.</small></div>`;
    for (let s = 0; s < SLOTS; s++) {
      const t = fromMin(START + s * STEP), past = START + s * STEP + STEP <= nowM;
      cells += `<button type="button" class="rcal-s${past ? ' past' : ''}${s % 2 ? ' half' : ''}" style="grid-row:${row};grid-column:${2 + s}" data-room="${room.id}" data-floor="${floor.id}" data-time="${t}" aria-label="Reservar ${escape(room.name)} a las ${t}" ${past ? 'disabled' : ''}></button>`;
    }
    bookings.filter(b => b.roomId === room.id).forEach(b => {
      const org = idx.byId[b.organizerId];
      const c0 = Math.max(2, col(b.start)), c1 = Math.min(2 + SLOTS, col(b.end));
      if (c1 <= c0) return;
      cells += `<button type="button" class="rcal-b${mineId && b.organizerId === mineId ? ' mine' : ''}" style="grid-row:${row};grid-column:${c0} / ${c1}" data-b="${b.id}" title="${escape(`${b.start}–${b.end} · ${b.title} · ${org?.name || ''}`)}"><b>${escape(b.title)}</b><small>${b.start}–${b.end}${org ? ' · ' + escape(org.first || org.name) : ''}</small></button>`;
    });
  });
  if (nowM > START && nowM < END) cells += `<div class="rcal-now" style="grid-row:2 / ${rooms.length + 2};grid-column:${2 + Math.floor((nowM - START) / STEP)};--off:${((nowM - START) % STEP) / STEP * 100}%" aria-hidden="true"></div>`;
  el.innerHTML = rooms.length ? `<div class="rcal-wrap"><div class="rcal" style="--slots:${SLOTS};grid-template-rows:auto repeat(${rooms.length}, 56px)">${cells}</div></div>` : '<div class="empty">Esta empresa aún no tiene salas reservables. Agrégalas en el editor de planos.</div>';
  el.onclick = e => {
    const s = e.target.closest('.rcal-s'), b = e.target.closest('.rcal-b');
    if (b) onBooking && onBooking(db.get('roomBookings', b.dataset.b));
    else if (s && !s.disabled) { const r = rooms.find(x => x.room.id === s.dataset.room); onSlot && onSlot(r.room, r.floor, s.dataset.time); }
  };
}

// Crea o edita una reserva. organizerId fijo para empleados; si no, se elige.
export async function bookingDialog({ db, idx, date, room, floor, start, booking, organizerId, user, allowDelete = true }) {
  const rooms = bookableRooms(idx);
  const times = []; for (let m = START; m <= END; m += STEP) times.push(fromMin(m));
  const b = booking || { roomId: room.id, floorId: floor.id, date, start, end: fromMin(Math.min(END, toMin(start) + 60)), title: '', organizerId: organizerId || idx.people[0]?.id, attendees: 4 };
  const fields = [
    { name: 'title', label: 'Motivo / título', required: true, span: 2, placeholder: 'Ej: Revisión de sprint' },
    { name: 'roomId', label: 'Sala', type: 'select', options: rooms.map(r => [r.room.id, `${r.room.name} · ${r.floor.name} (${r.room.cap})`]) },
    { name: 'date', label: 'Fecha', type: 'date', required: true },
    { name: 'start', label: 'Desde', type: 'select', options: times.slice(0, -1) },
    { name: 'end', label: 'Hasta', type: 'select', options: times.slice(1) },
    organizerId ? null : { name: 'organizerId', label: 'Organiza', type: 'select', options: idx.people.slice().sort((a, c) => a.name.localeCompare(c.name, 'es')).map(p => [p.id, p.name]) },
    { name: 'attendees', label: 'Asistentes', type: 'number', min: 1, max: 40 }
  ].filter(Boolean);
  const canDelete = booking && allowDelete;
  const res = await formDialog({
    title: booking ? 'Editar reserva de sala' : 'Reservar sala', fields, values: b, submit: booking ? 'Guardar cambios' : 'Reservar',
    extraFoot: canDelete ? '<button type="button" class="btn btn-danger" data-del style="margin-right:auto">Eliminar</button>' : '',
    validate: v => {
      if (toMin(v.end) <= toMin(v.start)) return 'La hora de término debe ser posterior al inicio';
      const r = rooms.find(x => x.room.id === v.roomId);
      if (v.attendees && r && v.attendees > r.room.cap) return `La sala tiene capacidad para ${r.room.cap} personas`;
      const clash = db.find('roomBookings', x => x.id !== booking?.id && x.roomId === v.roomId && x.companyId === idx.company.id && x.date === v.date && toMin(v.start) < toMin(x.end) && toMin(v.end) > toMin(x.start));
      if (clash) return `Choca con «${clash.title}» (${clash.start}–${clash.end})`;
      return null;
    },
    onOpen: (f, m) => {
      m.el.querySelector('[data-del]')?.addEventListener('click', () => {
        db.remove('roomBookings', booking.id);
        db.log('sala', `Eliminó la reserva «${booking.title}» del ${fmtDay(booking.date)}`, user?.id);
        toast('Reserva eliminada', 'success'); m.close();
      });
    }
  });
  if (!res) return null;
  const r = rooms.find(x => x.room.id === res.roomId);
  const data = { ...res, floorId: r.floor.id, companyId: idx.company.id, organizerId: res.organizerId || organizerId };
  let row;
  if (booking) { row = db.update('roomBookings', booking.id, data); db.log('sala', `Editó la reserva «${res.title}» en ${r.room.name}`, user?.id); }
  else { row = db.insert('roomBookings', data); db.log('sala', `Reservó ${r.room.name} el ${fmtDay(res.date)} ${res.start}–${res.end}`, user?.id); }
  toast(booking ? 'Reserva actualizada' : `Sala ${r.room.name} reservada`, 'success');
  return row;
}
