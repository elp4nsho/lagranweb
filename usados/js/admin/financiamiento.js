// Solicitudes de crédito: evaluación, aprobación / condiciones / rechazo.
import { money, escape, date, toast, formModal } from '../../../assets/core/ui.js';
import { pageHead, smartTable, kpi } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { FIN_STATES } from '../data/catalog.js';
import { carName, statusBadge } from '../shared/domain.js';

async function review(f, ctx) {
  const ratio = f.income ? f.cuota / f.income : 1;
  const v = await formModal({ title: `Crédito · ${f.name}`, fields: [
    { name: 'status', label: `Resolución (cuota/renta ${(ratio * 100).toFixed(0)}% · ${ratio <= .25 ? 'dentro de política' : 'sobre política 25%'})`, type: 'select', options: Object.entries(FIN_STATES).map(([k, s]) => [k, s.label]), value: f.status },
    { name: 'bank', label: 'Financiera', type: 'select', options: ['Financiera Ruta', 'Banco Austral', 'Crédito Andino'], value: f.bank }, { name: 'cond', label: 'Condiciones / comentario', type: 'textarea', value: f.cond || '' }] });
  if (!v) return;
  db.update('financing', f.id, v); db.log('financiamiento', `${f.name}: ${FIN_STATES[v.status].label} (${v.bank})`, ctx.user.id); toast('Solicitud actualizada', 'success');
}
export default {
  id: 'financiamiento', label: 'Financiamiento', icon: '🏦', group: 'Comercial', roles: ['admin', 'gerente', 'vendedor'],
  watch: ['financing'],
  render(el, ctx) {
    const fs = db.all('financing'), n = s => fs.filter(f => f.status === s).length;
    el.innerHTML = `${pageHead('Financiamiento', 'Postulaciones a crédito automotriz')}<div class="kpi-grid">${kpi('En evaluación', String(n('pendiente')), '', !n('pendiente'))}${kpi('Aprobadas', String(n('aprobada') + n('condicionada')))}${kpi('Rechazadas', String(n('rechazada')))}${kpi('Tasa de aprobación', (fs.length ? (n('aprobada') + n('condicionada')) / fs.length * 100 : 0).toFixed(0) + '%')}</div><div data-t></div>`;
    return smartTable(el.querySelector('[data-t]'), {
      rows: () => db.all('financing').map(f => ({ ...f, car: f.carId ? carName(db.get('cars', f.carId)) : 'Monto libre', ratio: f.income ? Math.round(f.cuota / f.income * 100) : 0 })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      filters: [{ key: 'status', label: 'Estado', options: Object.entries(FIN_STATES).map(([k, s]) => [k, s.label]) }, { key: 'bank', label: 'Financiera', options: ['Financiera Ruta', 'Banco Austral', 'Crédito Andino'] }],
      search: r => `${r.name} ${r.rut} ${r.car}`,
      columns: [{ key: 'createdAt', label: 'Fecha', render: r => date(r.createdAt) }, { key: 'name', label: 'Solicitante', render: r => `<b>${escape(r.name)}</b><small class="muted d-block">${escape(r.rut || '')}</small>` }, { key: 'car', label: 'Auto' },
        { key: 'price', label: 'Crédito', render: r => `${money(r.price - r.pie)}<small class="muted d-block">pie ${money(r.pie)}</small>` }, { key: 'cuota', label: 'Cuota', render: r => `${r.cuotas} × ${money(r.cuota)}` },
        { key: 'ratio', label: 'Cuota/renta', render: r => `<span class="badge ${r.ratio > 25 ? 'badge-warning' : 'badge-success'}">${r.ratio}%</span>` }, { key: 'status', label: 'Estado', render: r => statusBadge(FIN_STATES, r.status) }],
      onRow: r => review(db.get('financing', r.id), ctx),
      csv: { name: 'creditos', map: r => ({ fecha: r.createdAt.slice(0, 10), nombre: r.name, rut: r.rut, auto: r.car, precio: r.price, pie: r.pie, cuotas: r.cuotas, cuota: r.cuota, cae: r.cae, renta: r.income, estado: FIN_STATES[r.status].label, financiera: r.bank }) }
    });
  }
};
