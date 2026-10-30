// Citas de taller (todas las sucursales).
import { escape, toast, formModal } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead, statCard } from '../shared/shell.js';
import { listView, actBtn, acts } from '../shared/crud.js';
import { apptBadge, APPT_STATUS, APPT_TYPES, showroom, userName, workshopLoad } from '../shared/domain.js';
import { receive } from '../shared/workshop.js';
import { log, showroomOpts, opts } from './kit.js';
import { ymd, addDays, fdate, patenteFormat, nf } from '../shared/util.js';
import { meter } from '../shared/charts.js';
import { icon } from '../shared/icons.js';

export function renderAppointments(v, _p, query) {
  const today = ymd(), srs = db.all('showrooms');
  v.innerHTML = `${pageHead('Citas de taller', 'Agenda de servicio de las 3 sucursales. La recepción crea la orden de trabajo.', `<a class="btn btn-primary" href="posventa.html">${icon('wrench', 16)} App asesor</a>`)}
  <div class="grid-3">${srs.map(s => { const l = workshopLoad(s.id, today); return `<div class="card"><div class="card-title"><h3>${escape(s.city)} · hoy</h3><b>${l.pct}%</b></div>${meter(l.pct, l.pct > 85 ? 'danger' : l.pct > 60 ? 'warning' : 'success')}<p class="small muted" style="margin:8px 0 0">${l.n} citas · ${s.bays} bahías · mañana ${workshopLoad(s.id, addDays(today, 1)).pct}%</p></div>`; }).join('')}</div><div class="card" data-list></div>`;
  const lv = listView(v.querySelector('[data-list]'), {
    rows: () => db.all('appointments').sort((a, b) => (b.date + b.slot).localeCompare(a.date + a.slot)), search: a => `${a.number} ${a.patente} ${a.owner} ${a.modelName}`,
    filters: [{ key: 'date', label: 'Fecha', options: [['hoy', 'Hoy'], ['proximas', 'Próximas'], ['pasadas', 'Pasadas']], value: query.f || 'hoy', test: (a, v) => v === 'hoy' ? a.date === today : v === 'proximas' ? a.date > today : a.date < today }, { key: 'showroomId', label: 'Sucursal', options: showroomOpts() }, { key: 'status', label: 'Estado', options: Object.entries(APPT_STATUS).map(([k, [l]]) => [k, l]) }, { key: 'type', label: 'Tipo', options: Object.entries(APPT_TYPES) }],
    columns: [{ key: 'date', label: 'Fecha', render: a => `<b>${fdate(a.date)}</b><br><span class="mono">${a.slot}</span>` }, { key: 'patente', label: 'Vehículo', render: a => `<b class="mono">${patenteFormat(a.patente)}</b><br><small class="muted">${escape(a.modelName)} · ${nf(a.km)} km</small>` }, { key: 'owner', label: 'Cliente', render: a => escape(a.owner) }, { key: 'type', label: 'Servicio', render: a => escape(APPT_TYPES[a.type]) }, { key: 'showroomId', label: 'Sucursal', render: a => escape(showroom(a.showroomId).city) }, { key: 'advisorId', label: 'Asesor', render: a => escape(userName(a.advisorId)) }, { key: 'status', label: 'Estado', render: a => ({ __raw: true, value: apptBadge(a.status) }) },
      { key: 'x', label: '', sort: false, render: a => ({ __raw: true, value: acts(a.status === 'agendada' ? actBtn('recv', a.id, 'clipboard', 'Recepcionar') + actBtn('move', a.id, 'calendar', 'Reagendar') + actBtn('cancel', a.id, 'x', 'Cancelar') : '', a.otId ? `<a class="btn btn-sm btn-ghost btn-icon" href="#/ot?id=${a.otId}" title="Ver OT" aria-label="Ver OT">${icon('wrench', 16)}</a>` : '') }) }],
    onAction: async (act, id) => {
      const a = db.get('appointments', id);
      if (act === 'recv') receive(a, () => lv.refresh());
      if (act === 'cancel') { db.update('appointments', id, { status: 'cancelada' }); log('taller', `Cita ${a.number} cancelada`); toast('Cita cancelada', 'success'); lv.refresh(); }
      if (act === 'move') { const r = await formModal({ title: 'Reagendar cita', fields: [{ name: 'date', label: 'Fecha', type: 'date', value: a.date, required: true }, { name: 'slot', label: 'Hora', type: 'select', options: db.getValue('settings').workshopSlots, value: a.slot }] }); if (r) { db.update('appointments', id, r); log('taller', `Cita ${a.number} → ${r.date} ${r.slot}`); toast('Cita reagendada', 'success'); lv.refresh(); } }
    },
    csv: { name: 'citas-taller.csv', map: a => ({ numero: a.number, fecha: a.date, hora: a.slot, patente: a.patente, modelo: a.modelName, cliente: a.owner, tipo: APPT_TYPES[a.type], sucursal: showroom(a.showroomId).city, estado: APPT_STATUS[a.status][0] }) }
  });
}
export { opts };
