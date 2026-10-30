// Inicio del empleado: estado del día, mi puesto, próximas reservas, equipo y anuncios.
import { escape, toast, ago } from '../../../assets/core/ui.js';
import { STATUS, STATUS_ORDER, avatar, areaTag, statusBadge } from '../shared/util.js';
import { today, fmtDay, hm } from '../shared/dates.js';
import { miniMap } from '../shared/floorplan.js';
import { rulesFor } from '../shared/booking.js';

export function render(el, ctx) {
  const { db, idx } = ctx, p = idx.byId[ctx.me.id], T = today();
  const rules = rulesFor(db, idx.company.id);
  const r = idx.resByPerson[p.id], sid = idx.seatOf(p);
  const upcoming = db.query('reservations', x => x.personId === p.id && x.date > T && x.status === 'reservada').sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  const team = idx.people.filter(x => x.areaId === p.areaId && x.id !== p.id);
  const inTeam = team.filter(x => ['oficina', 'reunion'].includes(idx.statusOf(x)));
  const ann = db.query('announcements', a => a.published && ['todos', 'empleados'].includes(a.audience) && (!a.companyId || a.companyId === idx.company.id)).sort((a, b) => (b.pinned - a.pinned) || b.date.localeCompare(a.date)).slice(0, 4);
  const visits = db.query('visitors', v => v.hostId === p.id && v.date === T).sort((a, b) => a.expectedAt.localeCompare(b.expectedAt));
  const myRooms = db.query('roomBookings', b => b.organizerId === p.id && b.date === T).sort((a, b) => a.start.localeCompare(b.start));
  const st = idx.statusOf(p);

  let seatCard;
  if (r) {
    const i = idx.desk[r.deskId];
    seatCard = `<div class="mine-card"><div><span class="muted small">${r.status === 'checkin' ? '✅ Check-in realizado' : `Reserva de hoy · check-in hasta las ${escape(rules.checkinDeadline)}`}</span><strong>${escape(i.floor.name)} · ${escape(i.desk.code)}</strong><span class="muted small">${escape(i.zone?.name || '')}</span></div>
      <div class="row gap-sm">${r.status === 'checkin' ? '<button class="btn" data-a="checkout">Terminar jornada</button>' : '<button class="btn btn-primary" data-a="checkin">Hacer check-in</button><button class="btn btn-ghost" data-a="cancel">Cancelar</button>'}</div></div><div style="margin-top:12px">${miniMap(i.floor, idx, r.deskId, { w: 560, h: 300 })}</div>`;
  } else if (p.deskId && sid) {
    const i = idx.desk[sid];
    seatCard = `<div class="mine-card"><div><span class="muted small">Tu puesto fijo</span><strong>${escape(i.floor.name)} · ${escape(i.desk.code)}</strong><span class="muted small">${escape(i.zone?.name || '')}</span></div><a class="btn" href="index.html#/mapa?p=${encodeURIComponent(p.id)}">Ver en el mapa</a></div><div style="margin-top:12px">${miniMap(i.floor, idx, sid, { w: 560, h: 300 })}</div>`;
  } else if (p.remoteOnly) {
    seatCard = '<div class="empty"><span class="icon">🏡</span>Trabajas 100 % remoto. Si vienes a la oficina, puedes reservar un puesto flexible.</div><a class="btn btn-primary btn-block" href="#/reservas">Reservar un puesto</a>';
  } else {
    seatCard = `<div class="empty" style="padding:24px"><span class="icon">🪑</span><b>No tienes puesto reservado hoy</b><br>Reserva un puesto flexible (hasta ${rules.maxDaysAhead} días antes).</div><a class="btn btn-primary btn-block" href="#/reservas">Reservar un puesto</a>`;
  }

  el.innerHTML = `
    <div class="card welcome" data-anim>${avatar(p, 64)}<div style="flex:1;min-width:200px"><span class="eyebrow">${escape(idx.company.name)}</span><h1 style="font-size:clamp(24px,4vw,34px);margin:4px 0">Hola, ${escape(p.first || p.name.split(' ')[0])} 👋</h1><p class="muted" style="margin:0">${escape(p.cargo)} · ${escape(fmtDay(T, { weekday: 'long', day: 'numeric', month: 'long' }))}</p></div>
      <div class="stack" style="gap:6px"><span class="muted small">¿Dónde trabajas hoy?</span><div class="chips" role="group" aria-label="Mi estado de hoy">${STATUS_ORDER.map(s => `<button type="button" class="chip ${st === s ? 'active' : ''}" data-status="${s}" aria-pressed="${st === s}">${STATUS[s].label}</button>`).join('')}</div></div></div>
    <div class="dash-grid">
      <div class="card span-6"><div class="card-h"><h3>Mi puesto hoy</h3>${upcoming.length ? '' : ''}</div>${seatCard}</div>
      <div class="stack span-6">
        <div class="card"><div class="card-h"><h3>Próximas reservas</h3><a class="small" href="#/reservas">Reservar</a></div>${upcoming.length ? `<div class="stack" style="gap:8px">${upcoming.map(x => `<div class="row between"><span><b>${escape(fmtDay(x.date))}</b> · ${escape(idx.desk[x.deskId]?.floor.name || '')} · <span class="mono">${escape(idx.desk[x.deskId]?.desk.code || '')}</span></span><button class="btn btn-sm btn-ghost" data-cancel="${x.id}">Cancelar</button></div>`).join('')}</div>` : '<p class="muted small" style="margin:0">No tienes reservas próximas.</p>'}</div>
        <div class="card"><div class="card-h"><h3>Hoy tengo</h3></div>
          ${visits.length || myRooms.length ? `<ul class="log-list">${myRooms.map(b => `<li>📅 <span><b>${b.start}–${b.end}</b> · ${escape(b.title)}<small>${escape(idx.floors.flatMap(f => f.rooms).find(x => x.id === b.roomId)?.name || '')}</small></span></li>`).join('')}${visits.map(v => `<li>🛎️ <span><b>${escape(v.expectedAt)}</b> · Visita de ${escape(v.name)} <span class="badge ${v.status === 'en sitio' ? 'badge-success' : v.status === 'esperada' ? 'badge-info' : ''}">${escape(v.status)}</span><small>${escape(v.org || '')} · ${escape(v.reason)}</small></span></li>`).join('')}</ul>` : '<p class="muted small" style="margin:0">Sin reuniones ni visitas agendadas para hoy.</p>'}</div>
      </div>
      <div class="card span-6"><div class="card-h"><h3>Mi equipo hoy</h3><span class="muted small">${inTeam.length} de ${team.length} en la oficina</span></div>
        <div class="stack" style="gap:6px">${team.slice(0, 8).map(x => `<div class="row between" style="flex-wrap:nowrap"><span class="cell-person">${avatar(x, 30)}<span><b>${escape(x.name)}</b><small>${escape(idx.whereText(x))}</small></span></span>${statusBadge(idx.statusOf(x))}</div>`).join('') || '<p class="muted">Sin compañeros en tu área.</p>'}</div>
        <a class="btn btn-ghost btn-sm" href="#/calendario" style="margin-top:10px">Ver calendario del equipo →</a></div>
      <div class="card span-6"><div class="card-h"><h3>Anuncios</h3></div><div class="announce-list">${ann.map(a => `<div class="announce card" style="box-shadow:none"><span class="ico">${a.pinned ? '📌' : '📣'}</span><div><h3>${escape(a.title)}</h3><p>${escape(a.body)}</p><small class="muted">${escape(ago(a.date))} · ${escape(a.author || '')}</small></div></div>`).join('') || '<p class="muted">Sin anuncios.</p>'}</div></div>
    </div>`;
  el.onclick = e => {
    const s = e.target.closest('[data-status]'), a = e.target.closest('[data-a]'), c = e.target.closest('[data-cancel]');
    if (s) { db.update('people', p.id, { status: s.dataset.status }); db.log('estado', `${p.name} marcó «${STATUS[s.dataset.status].label}» para hoy`, ctx.user.id); toast(`Estado actualizado: ${STATUS[s.dataset.status].label}`, 'success'); }
    if (a && r) {
      if (a.dataset.a === 'checkin') { db.update('reservations', r.id, { status: 'checkin', checkinAt: `${T}T${hm()}` }); db.update('people', p.id, { status: 'oficina' }); db.log('reserva', `${p.name} hizo check-in en ${idx.desk[r.deskId].desk.code}`, ctx.user.id); toast('Check-in listo. ¡Buen día!', 'success'); }
      if (a.dataset.a === 'checkout') { db.update('reservations', r.id, { status: 'completada' }); db.update('people', p.id, { status: 'remoto' }); db.log('reserva', `${p.name} liberó su puesto ${idx.desk[r.deskId].desk.code}`, ctx.user.id); toast('Puesto liberado. ¡Hasta mañana!', 'success'); }
      if (a.dataset.a === 'cancel') { db.update('reservations', r.id, { status: 'cancelada' }); db.log('reserva', `${p.name} canceló su reserva de hoy`, ctx.user.id); toast('Reserva cancelada', 'success'); }
    }
    if (c) { db.update('reservations', c.dataset.cancel, { status: 'cancelada' }); db.log('reserva', `${p.name} canceló una reserva`, ctx.user.id); toast('Reserva cancelada', 'success'); }
  };
}
