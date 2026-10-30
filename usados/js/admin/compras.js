// Compras desde tasaciones: cotizada → inspección agendada → inspeccionada → comprada (ingresa al inventario) / rechazada.
import { money, escape, date, toast, formModal } from '../../../assets/core/ui.js';
import { pageHead, smartTable, kpi } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { VAL_STATES, CONDITIONS, MODELS } from '../data/catalog.js';
import { statusBadge, branchById, kmFmt, valuate } from '../shared/domain.js';
import { fmtDay } from '../shared/util.js';
import { editCar, carSheet } from './inventario.js';

async function manage(v, ctx) {
  const fields = [{ name: 'status', label: 'Estado', type: 'select', options: Object.entries(VAL_STATES).map(([k, s]) => [k, s.label]), value: v.status },
    { name: 'finalOffer', label: 'Oferta final tras inspección (CLP)', type: 'number', value: v.finalOffer || Math.round((v.offerMin + v.offerMax) / 2 / 10000) * 10000 },
    { name: 'note', label: 'Observaciones de la inspección', type: 'textarea', value: v.note || '' }];
  const r = await formModal({ title: `${v.code} · ${v.brand} ${v.model} ${v.year} · ${kmFmt(v.km)}`, fields, submit: 'Guardar' });
  if (!r) return;
  if (r.status === 'comprada' && v.status !== 'comprada') {
    if (!MODELS.some(m => m.brand === v.brand && m.model === v.model)) toast('Modelo fuera de catálogo: elige el más parecido en la ficha', 'info');
    const car = await editCar(null, ctx, { model: `${v.brand}|${v.model}`, year: v.year, km: v.km, cost: r.finalOffer, source: 'tasacion' });
    if (!car) return;
    db.update('valuations', v.id, { status: 'comprada', finalOffer: r.finalOffer, note: r.note, carId: car.id, purchasedAt: new Date().toISOString() });
    db.log('tasaciones', `Compra aprobada ${v.code}: ${v.brand} ${v.model} por ${money(r.finalOffer)} → ${car.stock}`, ctx.user.id);
    toast('Compra registrada e ingresada al inventario', 'success');
    return;
  }
  db.update('valuations', v.id, { status: r.status, finalOffer: r.finalOffer, note: r.note });
  db.log('tasaciones', `${v.code}: ${VAL_STATES[r.status].label}`, ctx.user.id); toast('Tasación actualizada', 'success');
}
export default {
  id: 'compras', label: 'Compras (tasaciones)', icon: '🏷️', group: 'Comercial', roles: ['admin', 'gerente'],
  watch: ['valuations'],
  render(el, ctx) {
    const vs = db.all('valuations'), n = s => vs.filter(v => v.status === s).length;
    el.innerHTML = `${pageHead('Compras desde tasaciones', 'Autos ofrecidos por clientes: inspección, oferta final e ingreso al inventario')}
      <div class="kpi-grid">${kpi('Cotizadas', String(n('cotizada')))}${kpi('Inspecciones agendadas', String(n('agendada')))}${kpi('Por decidir', String(n('inspeccionada')), n('inspeccionada') ? 'requieren oferta final' : '', !n('inspeccionada'))}${kpi('Tasa de compra', (vs.length ? n('comprada') / vs.length * 100 : 0).toFixed(0) + '%', `${n('comprada')} compradas`)}${kpi('Invertido en compras', money(vs.filter(v => v.status === 'comprada').reduce((a, v) => a + (v.finalOffer || 0), 0)))}</div><div data-t></div>`;
    return smartTable(el.querySelector('[data-t]'), {
      rows: () => db.all('valuations').sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      filters: [{ key: 'status', label: 'Estado', options: Object.entries(VAL_STATES).map(([k, s]) => [k, s.label]) }, { key: 'branchId', label: 'Sucursal', options: db.all('branches').map(b => [b.id, b.name]) }],
      search: r => `${r.code} ${r.brand} ${r.model} ${r.name} ${r.email}`,
      columns: [
        { key: 'code', label: 'Código', render: r => `<span class="mono">${r.code}</span><small class="muted d-block">${date(r.createdAt)}</small>` },
        { key: 'model', label: 'Auto', render: r => `<b>${escape(r.brand)} ${escape(r.model)}</b> ${r.year}<small class="muted d-block">${kmFmt(r.km)} · ${escape(CONDITIONS[r.condition]?.[0] || r.condition)}</small>` },
        { key: 'name', label: 'Cliente', render: r => `${escape(r.name || '—')}<small class="muted d-block">${escape(r.phone || '')}</small>` },
        { key: 'offerMax', label: 'Oferta', render: r => r.finalOffer ? `<b>${money(r.finalOffer)}</b>` : `${money(r.offerMin)}–${money(r.offerMax)}` },
        { key: 'appointmentAt', label: 'Inspección', render: r => r.appointmentAt ? `${fmtDay(r.appointmentAt.slice(0, 10))} ${r.appointmentAt.slice(11)}<small class="muted d-block">${escape(branchById(r.branchId)?.name || '')}</small>` : '—' },
        { key: 'status', label: 'Estado', render: r => statusBadge(VAL_STATES, r.status) + (r.tradeIn ? ' <span class="badge">Parte de pago</span>' : '') }
      ],
      onRow: r => r.carId ? carSheet(r.carId, ctx) : manage(db.get('valuations', r.id), ctx),
      csv: { name: 'tasaciones', map: r => ({ codigo: r.code, marca: r.brand, modelo: r.model, anio: r.year, km: r.km, estado_auto: r.condition, cliente: r.name, oferta_min: r.offerMin, oferta_max: r.offerMax, oferta_final: r.finalOffer || '', estado: VAL_STATES[r.status].label }) }
    });
  }
};
export { valuate };
