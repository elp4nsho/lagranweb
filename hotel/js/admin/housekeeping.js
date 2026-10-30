// Tablero de housekeeping: columnas por estado, asignación de camareras, notas y fuera de servicio.
import { escape, toast, formModal } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { HK_STATES, typeById, today } from '../shared/hotel.js';

export function roomOcc(room) {
  const T = today();
  const r = db.query('reservations', x => x.roomId === room.id && ['confirmada', 'check-in'].includes(x.status) && x.checkIn <= T && x.checkOut >= T);
  if (r.some(x => x.status === 'check-in' && x.checkOut === T)) return ['Sale hoy', 'warning'];
  if (r.some(x => x.status === 'check-in')) return ['Ocupada', 'info'];
  if (r.some(x => x.checkIn === T)) return ['Llega hoy', 'primary'];
  return ['Libre', 'success'];
}
export function setHk(roomId, hk, userId, note) {
  const room = db.get('rooms', roomId);
  db.update('rooms', roomId, { hk, ...(note != null ? { note } : {}), hkAt: new Date().toISOString() });
  db.log('housekeeping', `Hab. ${room.number}: ${HK_STATES[room.hk].label} → ${HK_STATES[hk].label}`, userId);
}
const NEXT = { sucia: ['limpia'], limpia: ['inspeccionada', 'sucia'], inspeccionada: ['sucia'], fuera: ['sucia'] };

export default {
  id: 'housekeeping', label: 'Housekeeping', icon: '🧹', group: 'Operación', roles: ['admin', 'recepcion', 'housekeeping'], watch: ['rooms', 'reservations', 'users'],
  render(el, ctx) {
    let floor = 'all';
    const staff = () => db.query('users', u => u.role === 'housekeeping' && u.active !== false);
    const paint = () => {
      const rooms = db.all('rooms').filter(r => floor === 'all' || String(r.floor) === floor).sort((a, b) => a.number.localeCompare(b.number));
      el.innerHTML = `${pageHead('Housekeeping', 'Estado de limpieza de las habitaciones en tiempo real', '<a class="btn btn-sm" href="limpieza.html">📱 Vista móvil camareras</a>')}
        <div class="row chips">${['all', '1', '2', '3', '4', '5'].map(f => `<button class="chip ${floor === f ? 'active' : ''}" data-floor="${f}">${f === 'all' ? 'Todos los pisos' : 'Piso ' + f}</button>`).join('')}</div>
        <div class="hk-board">${Object.entries(HK_STATES).map(([k, s]) => `<section class="hk-col hk-${k}"><h3>${s.icon} ${s.label} <span class="badge plain">${rooms.filter(r => r.hk === k).length}</span></h3>
          ${rooms.filter(r => r.hk === k).map(r => { const [occ, b] = roomOcc(r); return `<div class="card hk-card"><div class="row between"><b class="hk-num">${r.number}</b><span class="badge badge-${b}">${occ}</span></div>
            <small class="muted">${escape(typeById(r.typeId)?.name || '')} · piso ${r.floor}</small>${r.note ? `<small class="hk-note">📝 ${escape(r.note)}</small>` : ''}
            <div class="row nowrap"><select class="select sm grow" data-assign="${r.id}" aria-label="Asignar camarera"><option value="">Sin asignar</option>${staff().map(u => `<option value="${u.id}" ${u.id === r.assignedTo ? 'selected' : ''}>${escape(u.name)}</option>`).join('')}</select></div>
            <div class="row" style="gap:6px">${NEXT[k].map(n => `<button class="btn btn-sm ${n === 'limpia' || n === 'inspeccionada' ? 'btn-primary' : ''}" data-hk="${r.id}|${n}">${HK_STATES[n].label}</button>`).join('')}${k !== 'fuera' ? `<button class="btn btn-sm btn-ghost" data-oos="${r.id}" title="Fuera de servicio" aria-label="Fuera de servicio">🚧</button>` : ''}<button class="btn btn-sm btn-ghost" data-note="${r.id}" aria-label="Nota">📝</button></div></div>`; }).join('') || '<p class="muted small">—</p>'}</section>`).join('')}</div>`;
    };
    el.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.floor) { floor = b.dataset.floor; paint(); return; }
      if (b.dataset.hk) { const [id, s] = b.dataset.hk.split('|'); setHk(id, s, ctx.user.id); toast(`Hab. ${db.get('rooms', id).number}: ${HK_STATES[s].label}`, 'success'); }
      if (b.dataset.oos) { const v = await formModal({ title: 'Fuera de servicio', fields: [{ name: 'note', label: 'Motivo', required: true }] }); if (v) setHk(b.dataset.oos, 'fuera', ctx.user.id, v.note); }
      if (b.dataset.note) { const r = db.get('rooms', b.dataset.note); const v = await formModal({ title: `Nota hab. ${r.number}`, fields: [{ name: 'note', label: 'Nota', value: r.note }] }); if (v) db.update('rooms', r.id, { note: v.note }); }
    });
    el.addEventListener('change', e => { const s = e.target.closest('[data-assign]'); if (s) { db.update('rooms', s.dataset.assign, { assignedTo: s.value }); toast('Asignación actualizada', 'success'); } });
    paint();
    return { refresh: paint };
  }
};
