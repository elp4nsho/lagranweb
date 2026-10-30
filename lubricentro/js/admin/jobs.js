// Atenciones: reservas, fila, bahías y entregas. CRUD con filtros, detalle y flujo de estados.
import { escape, money } from '../../../assets/core/ui.js';
import { pageHead, smartTable } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { JOB_STATES, SOURCES, branchName, customerById, today, iso, addDays, timeHM, dayLabel } from '../shared/domain.js';
import { plate, stBadge } from '../shared/bits.js';
import { jobDetail, jobForm } from '../shared/job-ui.js';
import { myBranch, branchOptions } from './common.js';

const when = j => j.paidAt || j.startedAt || j.arrivedAt || j.bookedFor || j.createdAt;

export default {
  id: 'atenciones', label: 'Atenciones', icon: '🚗', group: 'Operación', roles: ['admin', 'jefe', 'recepcion'], watch: ['jobs', 'customers'],
  render(el, ctx) {
    const T = today();
    el.innerHTML = `${pageHead('Atenciones', 'Reservas, fila, bahías, caja e historial de servicios', '<button class="btn btn-primary btn-sm" data-new>+ Nueva atención</button>')}<div data-list></div>`;
    el.querySelector('[data-new]').onclick = () => jobForm(null, ctx.user);
    if (ctx.params.sub) setTimeout(() => db.get('jobs', ctx.params.sub) && jobDetail(ctx.params.sub, ctx.user), 0);
    return smartTable(el.querySelector('[data-list]'), {
      rows: () => db.all('jobs').map(j => ({ ...j, when: when(j), cust: customerById(j.customerId)?.name || '', branch: branchName(j.branchId), svc: j.items.map(i => i.n).join(', ') })).sort((a, b) => b.when.localeCompare(a.when)),
      filters: [
        { key: 'period', label: 'Periodo', value: 'hoy', options: [['hoy', 'Hoy'], ['proximas', 'Próximas reservas'], ['7', 'Últimos 7 días'], ['activas', 'En curso (fila/bahía/listo)']], test: (r, v) => v === 'hoy' ? iso(r.when) === T : v === 'proximas' ? r.status === 'reservado' : v === 'activas' ? ['en-fila', 'en-bahia', 'listo'].includes(r.status) : r.when >= addDays(T, -7) },
        { key: 'status', label: 'Estado', options: Object.entries(JOB_STATES).map(([k, v]) => [k, v.label]) },
        { key: 'branchId', label: 'Sucursal', value: myBranch(ctx), options: branchOptions() },
        { key: 'source', label: 'Origen', options: Object.entries(SOURCES) }
      ],
      search: r => `${r.code} ${r.plate} ${r.cust} ${r.car}`,
      columns: [
        { key: 'code', label: 'Código', render: r => `<code>${escape(r.code)}</code>` },
        { key: 'when', label: 'Fecha', render: r => `<span class="nowrap">${escape(dayLabel(r.when, { day: 'numeric', month: 'short' }))} ${timeHM(r.when)}</span>` },
        { key: 'plate', label: 'Patente', render: r => plate(r.plate) },
        { key: 'cust', label: 'Cliente / vehículo', render: r => `<b>${escape(r.cust)}</b><small class="muted d-block">${escape(r.car)}</small>` },
        { key: 'branch', label: 'Sucursal' },
        { key: 'svc', label: 'Servicios', render: r => `<small>${escape(r.svc)}</small>${r.upsells.some(u => u.st === 'pendiente') ? ' <span class="badge badge-warning plain">🔔</span>' : ''}` },
        { key: 'total', label: 'Total', render: r => money(r.total) },
        { key: 'status', label: 'Estado', render: r => stBadge(r.status) }
      ],
      onRow: r => jobDetail(r.id, ctx.user),
      csv: { name: 'atenciones', map: r => ({ codigo: r.code, fecha: r.when, patente: r.plate, vehiculo: r.car, cliente: r.cust, sucursal: r.branch, servicios: r.svc, total: r.total, estado: JOB_STATES[r.status]?.label, origen: SOURCES[r.source], boleta: r.pay?.folio || '' }) }
    });
  }
};
