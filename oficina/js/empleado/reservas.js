// Reserva de puestos flexibles en el plano: día, piso, puesto; respeta las reglas.
import { escape, toast, confirm } from '../../../assets/core/ui.js';
import { buildIndex } from '../shared/util.js';
import { floorSVG, chairPos } from '../shared/floorplan.js';
import { panZoom } from '../shared/panzoom.js';
import { today, addDays, isWeekend, fmtDay, daysBetween } from '../shared/dates.js';
import { rulesFor, canBookDesk, validateBooking } from '../shared/booking.js';

const st = { date: null, floorId: null, handledDesk: null };
let pz = null;

function days(rules) {
  const out = []; let k = today();
  for (let i = 0; i <= rules.maxDaysAhead; i++, k = addDays(k, 1)) if (rules.allowWeekends || !isWeekend(k)) out.push(k);
  return out;
}

export function render(el, ctx, _p, q = {}) {
  const { db } = ctx, me = ctx.me, rules = rulesFor(db, me.companyId);
  const list = days(rules);
  if (!st.date || !list.includes(st.date)) st.date = list[0] || today();
  const idx = buildIndex(db, me.companyId, st.date);
  const person = idx.byId[me.id];
  if (q.desk && st.handledDesk !== q.desk && idx.desk[q.desk]) { st.floorId = idx.desk[q.desk].floor.id; }
  const floor = idx.floors.find(f => f.id === st.floorId) || idx.floors[0];
  if (!floor) { el.innerHTML = '<div class="card empty">Tu empresa aún no tiene pisos configurados.</div>'; return; }
  st.floorId = floor.id;
  const bookable = d => canBookDesk(idx, rules, person, d, floor.zones.find(z => z.id === d.zoneId));
  const freeCount = (ix, f) => f.desks.filter(d => ix.deskState(d.id).state === 'free' && canBookDesk(ix, rules, person, d, f.zones.find(z => z.id === d.zoneId))).length;
  const mine = db.query('reservations', r => r.personId === me.id && r.date >= today() && (r.status === 'reservada' || r.status === 'checkin')).sort((a, b) => a.date.localeCompare(b.date));
  const myOnDay = idx.resByPerson[me.id];

  el.innerHTML = `<div class="page-head"><div><h1 style="font-size:clamp(24px,4vw,34px)">Reservar puesto</h1><p class="muted" style="margin:0">${escape(idx.company.name)} · elige un día y toca un puesto libre <b>(+)</b>.</p></div></div>
    <div class="day-chips" role="group" aria-label="Día de la reserva">${list.map(k => { const ix = k === st.date ? idx : buildIndex(db, me.companyId, k); const n = ix.floors.reduce((s, f) => s + freeCount(ix, f), 0); const mineK = mine.some(r => r.date === k); return `<button type="button" class="chip ${k === st.date ? 'active' : ''}" data-day="${k}" aria-pressed="${k === st.date}">${escape(fmtDay(k, { weekday: 'short', day: 'numeric' }))}<small>${mineK ? '✓ reservado' : `${n} libres`}</small></button>`; }).join('')}</div>
    <div class="book-layout">
      <div class="card" style="padding:12px">
        <div class="row between" style="margin-bottom:10px"><div class="seg">${idx.floors.map(f => `<button type="button" class="chip ${f.id === floor.id ? 'active' : ''}" data-floor="${f.id}">${escape(f.name)} <small>${freeCount(idx, f)} libres</small></button>`).join('')}</div>
          <div class="row gap-sm"><button type="button" class="btn btn-icon btn-sm" data-z="in" aria-label="Acercar">＋</button><button type="button" class="btn btn-icon btn-sm" data-z="out" aria-label="Alejar">－</button><button type="button" class="btn btn-icon btn-sm" data-z="fit" aria-label="Ajustar">⤢</button></div></div>
        <div class="book-stage"><svg class="fp" viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid meet" role="group" aria-label="Plano para reservar"><g data-vp>${floorSVG(floor, idx, { me: me.id, highlight: myOnDay?.floorId === floor.id ? myOnDay.deskId : null, bookable })}</g></svg></div>
        <p class="muted small" style="margin:8px 0 0">Verde punteado = reservable · gris = no disponible para ti${rules.restrictNeighborhoods ? ' (barrio de otra área)' : ''} · borde naranjo = reservado.</p>
      </div>
      <aside class="stack">
        <div class="card"><div class="card-h"><h3>${escape(fmtDay(st.date, { weekday: 'long', day: 'numeric', month: 'long' }))}</h3></div>${myOnDay ? `<p>Tienes reservado <b>${escape(idx.desk[myOnDay.deskId]?.floor.name)} · ${escape(idx.desk[myOnDay.deskId]?.desk.code)}</b>.</p><button class="btn btn-ghost btn-sm" data-cancel="${myOnDay.id}">Cancelar esta reserva</button>` : person.deskId ? `<p class="muted small">Tienes puesto fijo (${escape(idx.desk[person.deskId]?.desk.code || '')}). Igual puedes reservar un flexible si vas a otra zona.</p>` : '<p class="muted small" style="margin:0">Aún no tienes puesto para este día.</p>'}</div>
        <div class="card"><div class="card-h"><h3>Mis reservas</h3><span class="badge">${mine.length}</span></div>${mine.length ? `<div class="stack" style="gap:8px">${mine.map(r => `<div class="row between" style="flex-wrap:nowrap"><span><b>${escape(fmtDay(r.date))}</b><br><small class="muted">${escape(buildIndexDesk(ctx, r))}</small></span>${r.status === 'checkin' ? '<span class="badge badge-success">Check-in</span>' : `<button class="btn btn-sm btn-ghost" data-cancel="${r.id}">Cancelar</button>`}</div>`).join('')}</div>` : '<p class="muted small" style="margin:0">Sin reservas próximas.</p>'}</div>
        <div class="card"><h3>Reglas</h3><ul class="log-list small"><li>🗓️ <span>Hasta ${rules.maxDaysAhead} días de anticipación</span></li><li>🔢 <span>Máximo ${rules.maxPerWeek} por semana, una por día</span></li><li>⏰ <span>Check-in hasta las ${escape(rules.checkinDeadline)}${rules.autoRelease ? ' (luego se libera)' : ''}</span></li>${rules.restrictNeighborhoods ? '<li>🏘️ <span>Solo zonas abiertas o del barrio de tu área</span></li>' : ''}</ul></div>
      </aside>
    </div>`;
  const svg = el.querySelector('.book-stage svg'), vp = el.querySelector('[data-vp]');
  pz = panZoom(svg, vp, { onTap: t => { const s = t.closest?.('.seat'); if (s) tap(s.dataset.seat); } });
  pz.reset(false);
  vp.addEventListener('keydown', e => { const s = e.target.closest('.seat'); if (s && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); tap(s.dataset.seat); } });
  async function tap(deskId) {
    const info = idx.desk[deskId], s = idx.deskState(deskId);
    if (s.person) return toast(s.person.id === me.id ? 'Este es tu puesto para ese día' : `Ocupado por ${s.person.name}`, 'info');
    const err = validateBooking(db, idx, rules, person, deskId, st.date);
    if (err) return toast(err, 'warning', 4000);
    if (!(await confirm(`¿Reservar el puesto ${info.desk.code} (${info.floor.name} · ${info.zone?.name || ''}) para el ${fmtDay(st.date, { weekday: 'long', day: 'numeric', month: 'long' })}?`, { title: 'Confirmar reserva', ok: 'Reservar' }))) return;
    const err2 = validateBooking(db, buildIndex(db, me.companyId, st.date), rules, person, deskId, st.date);
    if (err2) return toast(err2, 'warning');
    db.insert('reservations', { companyId: me.companyId, personId: me.id, deskId, floorId: info.floor.id, date: st.date, status: 'reservada', checkinAt: null });
    db.log('reserva', `${me.name} reservó ${info.desk.code} para el ${st.date}`, ctx.user.id);
    toast(`Reservado: ${info.desk.code} · ${fmtDay(st.date)}${daysBetween(today(), st.date) === 0 ? `. Haz check-in antes de las ${rules.checkinDeadline}` : ''}`, 'success', 4200);
  }
  el.querySelectorAll('[data-day]').forEach(b => b.onclick = () => { st.date = b.dataset.day; render(el, ctx); });
  el.querySelectorAll('[data-floor]').forEach(b => b.onclick = () => { st.floorId = b.dataset.floor; render(el, ctx); });
  el.querySelectorAll('[data-z]').forEach(b => b.onclick = () => b.dataset.z === 'fit' ? pz.reset(true) : pz.zoom(b.dataset.z === 'in' ? 1.4 : 1 / 1.4));
  el.querySelectorAll('[data-cancel]').forEach(b => b.onclick = () => { db.update('reservations', b.dataset.cancel, { status: 'cancelada' }); db.log('reserva', `${me.name} canceló una reserva`, ctx.user.id); toast('Reserva cancelada', 'success'); });
  if (q.desk && st.handledDesk !== q.desk && idx.desk[q.desk]) {
    st.handledDesk = q.desk;
    const c = chairPos(idx.desk[q.desk].desk);
    pz.focus(c.x, c.y, 2, () => tap(q.desk));
  }
}
function buildIndexDesk(ctx, r) {
  const f = ctx.idx.desk[r.deskId];
  return f ? `${f.floor.name} · ${f.desk.code}` : r.deskId;
}
