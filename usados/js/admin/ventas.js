// Ventas y contratos: registro de ventas con margen, forma de pago, contrato imprimible.
import { money, escape, date } from '../../../assets/core/ui.js';
import { pageHead, smartTable, kpi } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { carName, userById, sellers } from '../shared/domain.js';
import { contractDoc } from '../shared/sales.js';
import { mm } from './dashboard.js';
import { DAY } from '../shared/util.js';

const PAY = { contado: 'Contado', financiado: 'Crédito', 'parte-de-pago': 'Parte de pago' };
export default {
  id: 'ventas', label: 'Ventas y contratos', icon: '🤝', group: 'Comercial', roles: ['admin', 'gerente', 'vendedor'],
  watch: ['sales'],
  render(el, ctx) {
    const s30 = db.query('sales', s => Date.now() - new Date(s.date) < 30 * DAY);
    el.innerHTML = `${pageHead('Ventas y contratos', 'Cada venta genera contrato de compraventa y transferencia', '<a class="btn btn-sm btn-primary" href="#/leads">Cerrar venta desde un lead</a>')}
      <div class="kpi-grid">${kpi('Ventas 30 días', String(s30.length))}${kpi('Facturación 30 días', mm(s30.reduce((a, s) => a + s.price, 0)))}${kpi('Margen bruto 30 días', mm(s30.reduce((a, s) => a + s.margin, 0)))}${kpi('Con crédito', (s30.length ? s30.filter(s => s.payment === 'financiado').length / s30.length * 100 : 0).toFixed(0) + '%')}</div><div data-t></div>`;
    return smartTable(el.querySelector('[data-t]'), {
      rows: () => db.all('sales').map(s => ({ ...s, car: carName(db.get('cars', s.carId)), seller: userById(s.sellerId)?.name || '' })).sort((a, b) => b.date.localeCompare(a.date)),
      filters: [{ key: 'payment', label: 'Pago', options: Object.entries(PAY) }, { key: 'sellerId', label: 'Vendedor', options: sellers().map(s => [s.id, s.name]), value: ctx.user.role === 'vendedor' ? ctx.user.id : '' }],
      search: r => `${r.code} ${r.name} ${r.car} ${r.contractNo}`,
      columns: [{ key: 'code', label: 'Venta', render: r => `<span class="mono">${r.code}</span>` }, { key: 'date', label: 'Fecha', render: r => date(r.date) }, { key: 'car', label: 'Auto' }, { key: 'name', label: 'Comprador' }, { key: 'seller', label: 'Vendedor' },
        { key: 'payment', label: 'Pago', render: r => escape(PAY[r.payment] || r.payment) }, { key: 'price', label: 'Precio', render: r => money(r.price) }, { key: 'margin', label: 'Margen', render: r => `<span style="color:var(--${r.margin > 0 ? 'success' : 'danger'})">${money(r.margin)}</span>` }],
      onRow: r => contractDoc(db.get('sales', r.id)),
      csv: { name: 'ventas', map: r => ({ venta: r.code, fecha: r.date.slice(0, 10), auto: r.car, comprador: r.name, rut: r.rut, vendedor: r.seller, pago: PAY[r.payment], precio: r.price, costo: r.cost, reacondicionamiento: r.recon, margen: r.margin, contrato: r.contractNo }) }
    });
  }
};
