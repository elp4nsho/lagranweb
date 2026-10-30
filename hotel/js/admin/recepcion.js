// Recepción (front desk): llegadas, salidas, en casa y solicitudes; check-in/out con folio.
import { money, escape, toast, confirm } from '../../../assets/core/ui.js';
import { pageHead, badge } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { RES_STATES, HK_STATES, typeById, roomById, freeRooms, setStatus, folioTotals, today } from '../shared/hotel.js';
import { fmtDay, fmtRange } from '../shared/dates.js';
import { folioModal } from '../shared/folio.js';
import { resDetail, resForm } from './reservas.js';

const REQ = { pendiente: { label: 'Pendiente', badge: 'warning' }, confirmada: { label: 'Confirmada', badge: 'success' }, rechazada: { label: 'Rechazada', badge: 'danger' } };

export default {
  id: 'recepcion', label: 'Recepción', icon: '🛎️', group: 'Operación', roles: ['admin', 'recepcion'], watch: ['reservations', 'rooms', 'requests'],
  render(el, ctx) {
    const tab = ctx.params.sub || 'llegadas';
    const paint = () => {
      const T = today();
      const arr = db.query('reservations', r => r.checkIn === T && r.status === 'confirmada');
      const dep = db.query('reservations', r => r.checkOut <= T && r.status === 'check-in');
      const inh = db.query('reservations', r => r.status === 'check-in').sort((a, b) => (roomById(a.roomId)?.number || '').localeCompare(roomById(b.roomId)?.number || ''));
      const reqs = db.all('requests').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const tabs = [['llegadas', `Llegadas (${arr.length})`], ['salidas', `Salidas (${dep.length})`], ['encasa', `En casa (${inh.length})`], ['solicitudes', `Solicitudes (${reqs.filter(r => r.status === 'pendiente').length})`]];
      const card = (r, kind) => {
        const room = roomById(r.roomId), ft = folioTotals(r);
        const opts = kind === 'arr' ? freeRooms(r.roomTypeId, r.checkIn, r.checkOut, r.id) : [];
        return `<div class="card stack fd-card">
          <div class="row between"><b>${escape(r.guestName)}</b>${badge(RES_STATES, r.status)}</div>
          <small class="muted">${escape(r.code)} · ${escape(typeById(r.roomTypeId)?.name || '')} · ${fmtRange(r.checkIn, r.checkOut)} · ${r.adults + r.children} pers.</small>
          ${r.precheck ? `<span class="badge badge-success plain">Check-in online ✓ llega ${escape(r.precheck.eta || '')}</span>` : ''}${r.notes ? `<small>📝 ${escape(r.notes)}</small>` : ''}
          ${kind === 'arr' ? `<div class="row nowrap"><select class="select sm grow" data-room="${r.id}" aria-label="Habitación">${opts.map(x => `<option value="${x.id}" ${x.id === r.roomId ? 'selected' : ''}>Hab. ${x.number} · ${HK_STATES[x.hk].label}</option>`).join('') || '<option value="">Sin habitaciones libres</option>'}</select><button class="btn btn-sm btn-primary" data-ci="${r.id}">Check-in</button></div>`
          : `<div class="row between"><span class="small">Hab. <b>${escape(room?.number || '—')}</b> · saldo <b class="${ft.balance > 0 ? 'text-warning' : ''}">${money(Math.max(0, ft.balance))}</b></span><span class="row nowrap" style="gap:6px"><button class="btn btn-sm" data-folio="${r.id}">Folio</button>${kind === 'dep' || r.checkOut <= T ? `<button class="btn btn-sm btn-primary" data-co="${r.id}">Check-out</button>` : ''}</span></div>`}
          <button class="btn btn-sm btn-ghost" data-res="${r.id}">Ver reserva</button></div>`;
      };
      el.innerHTML = `${pageHead('Recepción', fmtDay(T, { weekday: true, year: true }), '<button class="btn btn-sm btn-primary" data-walkin>+ Walk-in</button>')}
        <div class="tabs">${tabs.map(([k, l]) => `<a class="tab ${tab === k ? 'active' : ''}" href="#/recepcion/${k}">${l}</a>`).join('')}</div>
        ${tab === 'solicitudes' ? `<div class="table-wrap"><table class="table"><thead><tr><th>Tipo</th><th>Huésped</th><th>Fecha</th><th>Detalle</th><th>Estado</th><th></th></tr></thead><tbody>${reqs.map(q => `<tr><td>${q.type === 'spa' ? '💆 Spa' : q.type === 'restaurante' ? '🍽️ Restaurante' : '🗝️ Conserjería'}</td><td><b>${escape(q.guestName)}</b><small class="muted d-block">${escape(q.email || '')}</small></td><td class="nowrap">${fmtDay(q.date)} ${escape(q.time)} · ${q.people}p</td><td class="small">${escape(q.detail)}</td><td>${badge(REQ, q.status)}</td><td class="nowrap">${q.status === 'pendiente' ? `<button class="btn btn-sm btn-primary" data-rq="${q.id}|confirmada">Confirmar</button> <button class="btn btn-sm btn-ghost" data-rq="${q.id}|rechazada">Rechazar</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`
        : `<div class="grid-auto">${(tab === 'llegadas' ? arr.map(r => card(r, 'arr')) : tab === 'salidas' ? dep.map(r => card(r, 'dep')) : inh.map(r => card(r, 'inh'))).join('') || '<div class="card empty"><span class="icon">✅</span>Nada pendiente aquí.</div>'}</div>`}`;
    };
    el.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.res) return resDetail(b.dataset.res, ctx);
      if (b.dataset.folio) return folioModal(b.dataset.folio, ctx.user);
      if (b.hasAttribute('data-walkin')) return resForm(null, ctx, { checkIn: today() });
      if (b.dataset.ci) {
        const roomId = el.querySelector(`[data-room="${b.dataset.ci}"]`)?.value;
        if (!roomId) { toast('No hay habitación disponible', 'warning'); return; }
        const room = roomById(roomId);
        if (room.hk === 'sucia' && !await confirm(`La habitación ${room.number} está SUCIA. ¿Continuar con el check-in?`, { ok: 'Continuar' })) return;
        setStatus(b.dataset.ci, 'check-in', ctx.user.id, { roomId });
        toast(`Check-in listo · hab. ${room.number}`, 'success');
      }
      if (b.dataset.co) { const id = b.dataset.co; folioModal(id, ctx.user, { onSettle: () => { setStatus(id, 'check-out', ctx.user.id); toast('Check-out realizado · habitación enviada a limpieza', 'success'); } }); }
      if (b.dataset.rq) { const [id, st] = b.dataset.rq.split('|'); db.update('requests', id, { status: st }); db.log('solicitud', `Solicitud ${st}`, ctx.user.id); toast('Solicitud actualizada', 'success'); }
    });
    paint();
    return { refresh: paint };
  }
};
