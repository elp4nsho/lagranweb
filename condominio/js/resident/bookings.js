// Reservas de espacios comunes: reglas, calendario de disponibilidad, turnos y mis reservas.
import { escape, money, date, toast, confirm } from '../../../assets/core/ui.js';
import { notify } from '../data/db.js';
import { icon } from '../shared/icons.js';
import { pageHead, monthGrid, monthName, dayKey } from '../shared/kit.js';

const st = { space: null, y: new Date().getFullYear(), m: new Date().getMonth(), day: null };

export function renderBookings(el, p, q, ctx, { unit }) {
  const { db, user } = ctx;
  const spaces = db.query('spaces', s => s.active);
  if (!st.space || !spaces.some(s => s.id === st.space)) st.space = spaces[0]?.id;
  const sp = db.get('spaces', st.space);
  const today = dayKey(new Date());
  const minDay = dayKey(new Date(Date.now() + (sp?.price ? 2 : 0) * 864e5));
  // Si el mes visible ya no tiene días reservables, salta al siguiente.
  if (dayKey(new Date(st.y, st.m + 1, 0)) < minDay) { st.m++; if (st.m > 11) { st.m = 0; st.y++; } }
  const taken = (day, slot) => db.count('bookings', b => b.spaceId === sp.id && b.date === day && b.slot === slot && b.status !== 'cancelada');
  const free = day => sp.slots.filter(s => taken(day, s) < sp.perSlot).length;
  const mine = db.query('bookings', b => b.unitId === unit.id).sort((a, b) => b.date.localeCompare(a.date));
  const monthUsed = (y, m) => mine.filter(b => b.spaceId === sp.id && b.status !== 'cancelada' && b.date.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`)).length;
  el.innerHTML = `${pageHead('Reservas de espacios comunes', 'Elige un espacio, un día y un turno. El valor se carga a tu gasto común del mes.')}
    <div class="tile-grid">${spaces.map(s => `<button class="card tile ${s.id === st.space ? 'sel' : ''}" data-space="${s.id}" style="text-align:left;font:inherit;cursor:pointer;${s.id === st.space ? 'outline:2px solid var(--primary);outline-offset:2px' : ''}"><span class="icon-tile">${icon(s.icon, 22)}</span><span><b>${escape(s.name)}</b><span class="muted small">${s.price ? money(s.price) : 'Sin costo'} · hasta ${s.capacity} personas</span></span></button>`).join('')}</div>
    ${sp ? `<div class="split">
      <div class="card"><div class="row between" style="margin-bottom:10px"><button class="btn btn-sm" data-mv="-1" aria-label="Mes anterior">←</button><h3 style="margin:0;text-transform:capitalize">${monthName(st.y, st.m)}</h3><button class="btn btn-sm" data-mv="1" aria-label="Mes siguiente">→</button></div>
        ${monthGrid(st.y, st.m, (d, k) => { if (k < minDay) return ''; const f = free(k); return `<span class="dots">${sp.slots.map((s, i) => `<i class="${i < sp.slots.length - f ? 'busy' : ''}"></i>`).join('')}</span><span class="small muted">${f ? f + ' libre' + (f > 1 ? 's' : '') : 'Completo'}</span>`; })}
        <p class="small muted" style="margin:8px 0 0">● verde: turno disponible · ● rojo: ocupado. ${sp.price ? 'Reservas con 48 h de anticipación.' : ''}</p></div>
      <div class="stack"><div class="card" data-slots>${st.day ? '' : '<p class="muted" style="margin:0">Selecciona un día en el calendario para ver los turnos disponibles.</p>'}</div>
        <div class="card"><h3>Reglas de uso</h3><p class="small" style="margin:0">${escape(sp.rules)}</p><p class="small muted" style="margin:8px 0 0">Máximo ${sp.maxPerMonth} reservas al mes por departamento${sp.deposit ? ` · garantía ${money(sp.deposit)}` : ''}.</p></div></div>
    </div>` : '<div class="card empty">No hay espacios disponibles.</div>'}
    <div class="card"><h3>Mis reservas</h3>${mine.length ? mine.slice(0, 12).map(b => { const s = db.get('spaces', b.spaceId); const future = b.date >= today && b.status === 'confirmada'; return `<div class="list-row"><span><b>${escape(s?.name || '')}</b> · ${date(b.date + 'T12:00', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · ${escape(b.slot)}<br><span class="muted small">${b.guests} invitados · ${b.price ? money(b.price) : 'sin costo'}</span></span><span class="row" style="gap:6px"><span class="badge ${b.status === 'confirmada' ? 'badge-success' : b.status === 'cancelada' ? 'badge-danger' : ''}">${b.status[0].toUpperCase() + b.status.slice(1)}</span>${future ? `<button class="btn btn-sm btn-ghost" data-cancel="${b.id}">Cancelar</button>` : ''}</span></div>`; }).join('') : '<p class="muted">Aún no tienes reservas.</p>'}</div>`;

  const drawSlots = () => {
    const box = el.querySelector('[data-slots]'); if (!box || !st.day) return;
    el.querySelectorAll('.cal-d').forEach(c => c.classList.toggle('sel', c.dataset.day === st.day));
    box.innerHTML = `<h3>${date(st.day + 'T12:00', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
      <div class="slots">${sp.slots.map(s => { const n = taken(st.day, s), full = n >= sp.perSlot; return `<button class="slot" data-slot="${escape(s)}" ${full ? 'disabled' : ''}>${escape(s)}<small>${full ? 'Ocupado' : sp.perSlot > 1 ? `${sp.perSlot - n} cupos` : 'Disponible'}</small></button>`; }).join('')}</div>
      <div class="field" style="margin-top:12px"><label for="bk-g">Número de invitados</label><input class="input" id="bk-g" type="number" min="1" max="${sp.capacity}" value="${Math.min(6, sp.capacity)}"></div>
      <label class="check" style="margin-top:10px"><input type="checkbox" id="bk-ok"> Acepto las reglas de uso${sp.deposit ? ' y la garantía' : ''}</label>`;
    box.querySelectorAll('[data-slot]').forEach(b => b.onclick = async () => {
      const guests = +box.querySelector('#bk-g').value;
      if (!box.querySelector('#bk-ok').checked) return toast('Debes aceptar las reglas de uso', 'warning');
      if (!(guests >= 1 && guests <= sp.capacity)) return toast(`Invitados: entre 1 y ${sp.capacity}`, 'warning');
      const [y, mo] = st.day.split('-');
      if (monthUsed(+y, +mo - 1) >= sp.maxPerMonth) return toast(`Ya usaste tus ${sp.maxPerMonth} reservas de este mes`, 'warning');
      if (!(await confirm(`Reservar ${sp.name} el ${date(st.day + 'T12:00')} (${b.dataset.slot}).${sp.price ? ` Se cargarán ${money(sp.price)} a tu gasto común.` : ''}`, { title: 'Confirmar reserva', ok: 'Reservar' }))) return;
      db.insert('bookings', { spaceId: sp.id, unitId: unit.id, date: st.day, slot: b.dataset.slot, guests, status: 'confirmada', price: sp.price, userId: user.id });
      db.log('reserva', `${user.name} (${unit.tower}-${unit.number}) reservó ${sp.name} el ${st.day} ${b.dataset.slot}`, user.id);
      notify(unit.id, `Reserva confirmada: ${sp.name} el ${date(st.day + 'T12:00')} (${b.dataset.slot})`, '#/reservas');
      toast('¡Reserva confirmada!', 'success'); ctx.refresh();
    });
  };
  drawSlots();
  el.querySelectorAll('[data-space]').forEach(b => b.onclick = () => { st.space = b.dataset.space; st.day = null; ctx.refresh(); });
  el.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => { st.m += +b.dataset.mv; if (st.m < 0) { st.m = 11; st.y--; } if (st.m > 11) { st.m = 0; st.y++; } st.day = null; ctx.refresh(); });
  el.querySelectorAll('.cal-d[data-day]').forEach(c => { if (c.dataset.day >= minDay) { c.classList.add('pick'); c.tabIndex = 0; c.onclick = () => { st.day = c.dataset.day; drawSlots(); }; c.onkeydown = e => { if (e.key === 'Enter') c.click(); }; } else c.classList.add('past'); });
  el.querySelectorAll('[data-cancel]').forEach(b => b.onclick = async () => {
    const bk = db.get('bookings', b.dataset.cancel);
    if ((new Date(bk.date + 'T12:00') - Date.now()) < 48 * 3600e3 && bk.price) return toast('Solo puedes cancelar con 48 horas de anticipación. Contacta a la administración.', 'warning', 4500);
    if (await confirm('¿Cancelar esta reserva?', { danger: true, ok: 'Cancelar reserva' })) { db.update('bookings', bk.id, { status: 'cancelada' }); db.log('reserva', `${user.name} canceló reserva ${bk.date}`, user.id); toast('Reserva cancelada', 'info'); ctx.refresh(); }
  });
}
