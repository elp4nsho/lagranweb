// Calendario de reservas: grilla habitaciones × días; clic en barra = editar, clic en celda vacía = nueva reserva.
import { escape } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { today, addDays, RES_STATES, HK_STATES } from '../shared/hotel.js';
import { fmtDay, dowShort, diffDays } from '../shared/dates.js';
import { resDetail, resForm } from './reservas.js';

export default {
  id: 'calendario', label: 'Calendario', icon: '🗓️', group: 'Operación', roles: ['admin', 'recepcion', 'revenue'], watch: ['reservations', 'rooms'],
  render(el, ctx) {
    const span = +(ctx.query.n || 14);
    const start = ctx.query.d || addDays(today(), -2);
    const days = Array.from({ length: span }, (_, i) => addDays(start, i));
    const end = addDays(start, span);
    const paint = () => {
      const types = db.all('roomTypes').sort((a, b) => a.order - b.order);
      const rooms = db.all('rooms').sort((a, b) => a.number.localeCompare(b.number));
      const res = db.query('reservations', r => ['confirmada', 'check-in', 'check-out', 'no-show'].includes(r.status) && r.checkIn < end && r.checkOut > start);
      const unassigned = res.filter(r => !r.roomId);
      const T = today();
      el.innerHTML = `${pageHead('Calendario', 'Clic en una reserva para verla · clic en una celda libre para crear una reserva', ctx.can('reservas') ? '<button class="btn btn-primary btn-sm" data-new>+ Nueva reserva</button>' : '')}
        <div class="row between cal-tools"><div class="row"><a class="btn btn-sm" href="#/calendario?d=${addDays(start, -7)}&n=${span}" aria-label="Semana anterior">←</a><a class="btn btn-sm btn-ghost" href="#/calendario?n=${span}">Hoy</a><a class="btn btn-sm" href="#/calendario?d=${addDays(start, 7)}&n=${span}" aria-label="Semana siguiente">→</a><b>${fmtDay(start)} – ${fmtDay(addDays(end, -1), { year: true })}</b></div>
          <div class="row chips">${[7, 14, 21].map(n => `<a class="chip ${n === span ? 'active' : ''}" href="#/calendario?d=${start}&n=${n}">${n} días</a>`).join('')}</div></div>
        <div class="row legend small">${Object.entries(RES_STATES).filter(([k]) => k !== 'cancelada').map(([k, v]) => `<span class="lg-item"><i class="lg-dot rs-${k}"></i>${v.label}</span>`).join('')}</div>
        ${unassigned.length ? `<p class="callout small">⚠️ ${unassigned.length} reserva(s) sin habitación asignada: ${unassigned.map(r => `<button class="btn btn-sm btn-ghost" data-res="${r.id}">${escape(r.code)}</button>`).join('')}</p>` : ''}
        <div class="tl-wrap"><div class="tl" style="--days:${span}">
          <div class="tl-corner">Hab.</div>${days.map(d => `<div class="tl-day ${d === T ? 'today' : ''} ${['vie', 'sáb'].includes(dowShort(d)) ? 'we' : ''}"><small>${dowShort(d)}</small><b>${fmtDay(d).split(' ')[0]}</b></div>`).join('')}
          ${types.map(t => `<div class="tl-group" style="grid-column:1 / -1">${escape(t.name)}</div>${rooms.filter(r => r.typeId === t.id).map(room => {
            const mine = res.filter(r => r.roomId === room.id);
            return `<div class="tl-room" title="${HK_STATES[room.hk].label}"><b>${room.number}</b><i class="hk-dot hk-${room.hk}" aria-label="${HK_STATES[room.hk].label}"></i></div>
              <div class="tl-row" style="grid-column:2 / -1">${days.map((d, i) => `<button class="tl-cell ${d === T ? 'today' : ''} ${room.hk === 'fuera' ? 'oos' : ''}" style="grid-column:${i + 1}" data-cell="${room.id}|${d}" aria-label="Hab. ${room.number} ${d}"></button>`).join('')}
              ${mine.map(r => { const a = Math.max(0, diffDays(start, r.checkIn)), b = Math.min(span, diffDays(start, r.checkOut)); return `<button class="tl-bar rs-${r.status} ${r.checkIn < start ? 'cut-l' : ''} ${r.checkOut > end ? 'cut-r' : ''}" style="grid-column:${a + 1} / ${b + 1}" data-res="${r.id}" title="${escape(r.code)} · ${escape(r.guestName)} · ${r.checkIn} → ${r.checkOut}">${escape(r.guestName)}</button>`; }).join('')}</div>`;
          }).join('')}`).join('')}
        </div></div>`;
    };
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-res]'); if (b) { resDetail(b.dataset.res, ctx); return; }
      const c = e.target.closest('[data-cell]');
      if (c && ctx.can('reservas')) { const [roomId, d] = c.dataset.cell.split('|'); const room = db.get('rooms', roomId); if (room.hk === 'fuera') return; resForm(null, ctx, { roomId, typeId: room.typeId, checkIn: d, checkOut: addDays(d, 2) }); }
      if (e.target.closest('[data-new]')) resForm(null, ctx);
    });
    paint();
    return { refresh: paint };
  }
};
