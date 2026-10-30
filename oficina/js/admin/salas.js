// Salas de reuniones: calendario diario con alta/edición de reservas y lista.
import { escape } from '../../../assets/core/ui.js';
import { pageHead, personCell } from './common.js';
import { renderRoomCal, bookingDialog, bookableRooms } from '../shared/roomcal.js';
import { smartTable } from '../shared/table.js';
import { today, addDays, fmtDay, isWeekend } from '../shared/dates.js';

let day = today();

export function render(el, ctx) {
  const { db, idx } = ctx;
  const rooms = bookableRooms(idx);
  const list = db.query('roomBookings', b => b.companyId === idx.company.id && b.date === day).sort((a, b) => a.start.localeCompare(b.start));
  el.innerHTML = `${pageHead('Salas de reuniones', `${escape(idx.company.name)} · ${rooms.length} salas reservables`, '<button class="btn btn-primary" data-new>＋ Reservar sala</button>')}
    <div class="row between">
      <div class="row gap-sm"><button class="btn btn-sm" data-d="-1" aria-label="Día anterior">←</button><input class="input input-sm" type="date" data-day value="${day}" style="width:auto"><button class="btn btn-sm" data-d="1" aria-label="Día siguiente">→</button><button class="btn btn-sm btn-ghost" data-today>Hoy</button></div>
      <b>${escape(fmtDay(day, { weekday: 'long', day: 'numeric', month: 'long' }))}${isWeekend(day) ? ' · fin de semana' : ''}</b>
    </div>
    <div data-cal></div>
    <div class="card"><h3>Reservas del día (${list.length})</h3><div data-t></div></div>`;
  const open = b => bookingDialog({ db, idx, booking: b, user: ctx.user });
  renderRoomCal(el.querySelector('[data-cal]'), { db, idx, date: day, onSlot: (room, floor, t) => bookingDialog({ db, idx, date: day, room, floor, start: t, user: ctx.user }), onBooking: open });
  const rmap = Object.fromEntries(rooms.map(r => [r.room.id, r]));
  smartTable(el.querySelector('[data-t]'), {
    key: 'salas-list', rows: list.map(b => ({ ...b, roomName: rmap[b.roomId]?.room.name || '—', floorName: rmap[b.roomId]?.floor.name || '', org: idx.byId[b.organizerId] })), sort: 'start', pageSize: 8,
    search: r => `${r.title} ${r.roomName} ${r.org?.name || ''}`,
    columns: [
      { key: 'start', label: 'Horario', render: r => `<b>${r.start}–${r.end}</b>` }, { key: 'title', label: 'Reunión' },
      { key: 'roomName', label: 'Sala', render: r => `${escape(r.roomName)}<br><small class="muted">${escape(r.floorName)}</small>` },
      { key: 'organizerId', label: 'Organiza', render: r => personCell(r.org) }, { key: 'attendees', label: 'Asist.' }
    ],
    onRow: r => open(db.get('roomBookings', r.id)),
    csv: { filename: `salas-${day}.csv`, map: r => ({ fecha: r.date, inicio: r.start, fin: r.end, reunion: r.title, sala: r.roomName, organiza: r.org?.name || '', asistentes: r.attendees }) }
  });
  el.querySelector('[data-new]').onclick = () => { if (!rooms.length) return; const r = rooms[0]; bookingDialog({ db, idx, date: day, room: r.room, floor: r.floor, start: '09:00', user: ctx.user }); };
  el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { day = addDays(day, +b.dataset.d); render(el, ctx); });
  el.querySelector('[data-today]').onclick = () => { day = today(); render(el, ctx); };
  el.querySelector('[data-day]').onchange = e => { if (e.target.value) { day = e.target.value; render(el, ctx); } };
}
