// Órdenes de trabajo del taller.
import { escape, money, modal } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead, statCard } from '../shared/shell.js';
import { listView } from '../shared/crud.js';
import { apptBadge, APPT_STATUS, APPT_TYPES, showroom, userName, otTotal } from '../shared/domain.js';
import { otPanelHTML, otAction, otChange, otSubmit } from '../shared/workshop.js';
import { showroomOpts } from './kit.js';
import { fdate, patenteFormat, ymd } from '../shared/util.js';

export function renderWorkOrders(v, _p, query) {
  if (query.id && db.get('workorders', query.id)) {
    const ot = db.get('workorders', query.id);
    v.innerHTML = `${pageHead('Orden ' + ot.number, escape(showroom(ot.showroomId).name), '<a class="btn btn-ghost" href="#/ot">← Órdenes</a>')}${otPanelHTML(ot)}`;
    v.addEventListener('click', otAction); v.addEventListener('change', otChange); v.addEventListener('submit', otSubmit);
    return;
  }
  const all = db.all('workorders'), open = all.filter(o => o.status !== 'entregada');
  v.innerHTML = `${pageHead('Órdenes de trabajo', 'OT abiertas y cerradas recientes. Los cambios de estado los ve el cliente en su cuenta.')}
  <div class="grid-4">${statCard('Abiertas', open.length, '', 'wrench')}${statCard('Listas para retiro', all.filter(o => o.status === 'lista').length, '', 'check')}${statCard('Esperando repuestos', all.filter(o => o.status === 'esperando_repuestos').length, '', 'clock')}${statCard('Facturado hoy', money(all.filter(o => o.status === 'entregada' && o.date === ymd()).reduce((a, o) => a + otTotal(o), 0)), '', 'money')}</div><div class="card" data-list></div>`;
  listView(v.querySelector('[data-list]'), {
    rows: () => db.all('workorders').sort((a, b) => b.date.localeCompare(a.date)), search: o => `${o.number} ${o.patente} ${o.owner} ${o.modelName}`,
    filters: [{ key: 'status', label: 'Estado', options: Object.entries(APPT_STATUS).filter(([k]) => !['agendada', 'cancelada'].includes(k)).map(([k, [l]]) => [k, l]) }, { key: 'showroomId', label: 'Sucursal', options: showroomOpts() }],
    columns: [{ key: 'number', label: 'OT', render: o => `<b class="mono">${o.number}</b><br><small class="muted">${fdate(o.date)}</small>` }, { key: 'patente', label: 'Vehículo', render: o => `<b class="mono">${patenteFormat(o.patente)}</b><br><small class="muted">${escape(o.modelName)}</small>` }, { key: 'owner', label: 'Cliente', render: o => escape(o.owner) }, { key: 'type', label: 'Trabajo', render: o => escape(APPT_TYPES[o.type]) }, { key: 'check', label: 'Avance', sort: false, render: o => `${o.checklist.filter(c => c.ok).length}/${o.checklist.length}` }, { key: 'total', label: 'Total', render: o => money(otTotal(o)) }, { key: 'advisorId', label: 'Asesor', render: o => escape(userName(o.advisorId)) }, { key: 'status', label: 'Estado', render: o => ({ __raw: true, value: apptBadge(o.status) }) }],
    onRow: o => location.hash = '#/ot?id=' + o.id,
    csv: { name: 'ordenes-trabajo.csv', map: o => ({ ot: o.number, fecha: o.date, patente: o.patente, modelo: o.modelName, cliente: o.owner, tipo: APPT_TYPES[o.type], total: otTotal(o), estado: APPT_STATUS[o.status][0] }) }
  });
}
export { modal };
