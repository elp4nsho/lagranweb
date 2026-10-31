// Módulo facturación: boletas y facturas internas (neto, IVA, total, medio de pago, pagada).
// No emite Documentos Tributarios Electrónicos ante el SII: eso requiere un proveedor de facturación
// electrónica (integración futura, ver PRODUCTION.md §9).
import { resource } from '../../../../assets/core/resource.js';
import { chartCard } from '../../../../assets/core/blocks.js';
import { nextCode, byMonth, sumBy } from '../../../../assets/core/domain.js';
import { money, barChart } from '../../../../assets/core/ui.js';
import { PAY } from '../shared.js';

const SALES = ['admin', 'asesor'];
const month = () => new Date().toISOString().slice(0, 7);

export function install(app) {
  const { db } = app;
  const R = (app.res ||= {});
  const iva = () => +app.settings().ivaPct || 19;
  const fields = [
    { name: 'number', label: 'N°', form: false, search: true },
    { name: 'kind', label: 'Tipo', type: 'select', options: [['boleta', 'Boleta'], ['factura', 'Factura']], required: true, filter: true, default: 'boleta' },
    { name: 'customerId', label: 'Cliente', type: 'ref', ref: 'customers', required: true },
    ...(app.has('ordenes') ? [{ name: 'otId', label: 'OT', type: 'ref', ref: 'ots', refLabel: o => `${o.code} · ${o.plate}`, table: false }] : []),
    { name: 'concept', label: 'Concepto', required: true, search: true, table: false },
    { name: 'total', label: 'Total (IVA incluido)', type: 'money', required: true, min: 1 },
    { name: 'method', label: 'Medio de pago', type: 'select', options: PAY, filter: true },
    { name: 'issuedAt', label: 'Fecha', type: 'date', required: true, default: () => new Date().toISOString().slice(0, 10) },
    { name: 'paid', label: 'Pagado', type: 'bool', toggle: true, default: true, filter: true }
  ];
  R.invoices = resource(app, {
    collection: 'invoices', id: 'documentos', singular: 'documento', plural: 'Documentos de venta', icon: '🧾',
    title: d => `${d.kind === 'factura' ? 'Factura' : 'Boleta'} N° ${d.number}`, subtitle: d => db.get('customers', d.customerId)?.name || '',
    fields,
    intro: 'Registro interno de ventas. Para emitir boletas y facturas electrónicas válidas ante el SII se integra un proveedor de DTE.',
    permissions: { create: SALES, edit: SALES, delete: ['admin'] },
    beforeSave: (v, row) => { const net = Math.round(v.total / (1 + iva() / 100)); return { ...v, net, iva: v.total - net, ...(row ? {} : { number: nextCode(db, 'doc', '', 18420) }) }; },
    count: () => db.count('invoices', d => !d.paid),
    detail: true
  });
  app.contribute('admin.html', R.invoices.section({ roles: SALES }), { slot: 'ventas' });
  app.contribute('settings', { title: 'Datos tributarios', fields: [{ name: 'razonSocial', label: 'Razón social' }, { name: 'rutEmpresa', label: 'RUT empresa', type: 'rut' }, { name: 'giro', label: 'Giro', wide: true }, { name: 'ivaPct', label: 'IVA (%)', type: 'number', min: 0, max: 30 }] });
  app.contribute('kpis', [
    { order: 40, roles: SALES, kpi: () => ({ label: 'Ventas del mes', value: money(sumBy(db.query('invoices', d => String(d.issuedAt).startsWith(month())), 'total')), icon: '💰', href: '#/documentos' }) },
    { order: 41, roles: SALES, kpi: () => { const unpaid = db.query('invoices', d => !d.paid); return { label: 'Por cobrar', value: money(sumBy(unpaid, 'total')), icon: '🧾', hint: `${unpaid.length} documentos` }; } }
  ]);
  app.contribute('dashboard', { order: 50, roles: SALES, render: () => chartCard('Ventas por mes', barChart(byMonth(db.all('invoices'), 'createdAt', d => d.total), { format: v => money(v) })) });
  if (app.has('portal')) {
    const mine = resource(app, {
      collection: 'invoices', id: 'mis-documentos', singular: 'documento', plural: 'Mis documentos', icon: '🧾',
      title: R.invoices.title, fields: fields.filter(f => ['number', 'kind', 'total', 'issuedAt', 'paid'].includes(f.name)),
      rows: ctx => db.query('invoices', d => d.customerId === ctx.user?.customerId), readonly: true, csv: false
    });
    app.contribute('portal.html', mine.section({ roles: ['cliente'] }), { slot: 'portal' });
  }
}
