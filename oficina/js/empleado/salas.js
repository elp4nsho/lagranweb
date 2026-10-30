// Salas para empleados: calendario del día y reservas propias.
import { escape, toast } from '../../../assets/core/ui.js';
import { renderRoomCal, bookingDialog, bookableRooms } from '../shared/roomcal.js';
import { today, addDays, fmtDay } from '../shared/dates.js';

let day = today();
export function render(el, ctx) {
  const { db, idx } = ctx, me = ctx.me;
  const mine = db.query('roomBookings', b => b.organizerId === me.id && b.date >= today()).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const rooms = Object.fromEntries(bookableRooms(idx).map(r => [r.room.id, r]));
  el.innerHTML = `<div class="page-head"><div><h1 style="font-size:clamp(24px,4vw,34px)">Salas de reuniones</h1><p class="muted" style="margin:0">Toca un bloque libre para reservar. Las reservas en color acento son tuyas.</p></div></div>
    <div class="row between"><div class="row gap-sm"><button class="btn btn-sm" data-d="-1" aria-label="Día anterior">←</button><input class="input input-sm" type="date" data-day value="${day}" min="${today()}" style="width:auto"><button class="btn btn-sm" data-d="1" aria-label="Día siguiente">→</button></div><b>${escape(fmtDay(day, { weekday: 'long', day: 'numeric', month: 'long' }))}</b></div>
    <div data-cal></div>
    <div class="card"><h3>Mis próximas reuniones</h3>${mine.length ? `<div class="stack" style="gap:8px">${mine.map(b => `<div class="row between"><span><b>${escape(fmtDay(b.date))} ${b.start}–${b.end}</b> · ${escape(b.title)} <span class="muted small">· ${escape(rooms[b.roomId]?.room.name || '')}</span></span><button class="btn btn-sm btn-ghost" data-edit="${b.id}">Editar</button></div>`).join('')}</div>` : '<p class="muted small" style="margin:0">No has reservado salas.</p>'}</div>`;
  const open = b => b.organizerId === me.id ? bookingDialog({ db, idx, booking: b, organizerId: me.id, user: ctx.user }) : toast(`«${b.title}» · ${b.start}–${b.end} · organiza ${idx.byId[b.organizerId]?.name || '—'}`, 'info', 4000);
  renderRoomCal(el.querySelector('[data-cal]'), { db, idx, date: day, mineId: me.id, onSlot: (room, floor, t) => bookingDialog({ db, idx, date: day, room, floor, start: t, organizerId: me.id, user: ctx.user }), onBooking: open });
  el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { const n = addDays(day, +b.dataset.d); if (n >= today()) { day = n; render(el, ctx); } });
  el.querySelector('[data-day]').onchange = e => { if (e.target.value) { day = e.target.value; render(el, ctx); } };
  el.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => open(db.get('roomBookings', b.dataset.edit)));
}
