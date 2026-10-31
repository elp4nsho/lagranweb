// Módulo clientes: fichas de clientes y vehículos (dependencia de agenda, órdenes, presupuestos, portal).
import { resource } from '../../../../assets/core/resource.js';
import { OFFICE, STAFF } from '../shared.js';

export function install(app) {
  const { db } = app;
  const R = (app.res ||= {});
  const vehLabel = v => `${v.plate} · ${v.make} ${v.model}`;

  R.vehicleFields = [
    { name: 'plate', label: 'Patente', type: 'patente', required: true, search: true },
    { name: 'customerId', label: 'Dueño', type: 'ref', ref: 'customers', required: true },
    { name: 'make', label: 'Marca', required: true, search: true },
    { name: 'model', label: 'Modelo', required: true, search: true },
    { name: 'year', label: 'Año', type: 'number', min: 1960, max: 2030 },
    { name: 'km', label: 'Kilometraje', type: 'number', min: 0 },
    { name: 'color', label: 'Color', table: false }
  ];
  const plateTaken = (v, row) => (db.find('vehicles', x => x.plate === v.plate && x.id !== row?.id) ? 'Ya existe un vehículo con esa patente' : null);

  R.vehicles = resource(app, {
    collection: 'vehicles', id: 'vehiculos', singular: 'vehículo', plural: 'Vehículos', icon: '🚗',
    title: v => v.plate, subtitle: v => `${v.make} ${v.model} ${v.year || ''}`,
    fields: R.vehicleFields, validate: plateTaken,
    permissions: { create: OFFICE, edit: OFFICE, delete: ['admin'] },
    canDelete: v => (db.count('ots', o => o.vehicleId === v.id) ? 'Tiene órdenes de trabajo: no se puede eliminar' : true),
    detail: true
  });
  R.vehLabel = vehLabel;

  R.customers = resource(app, {
    collection: 'customers', id: 'clientes', singular: 'cliente', plural: 'Clientes', icon: '👥',
    subtitle: c => c.email || c.phone,
    fields: [
      { name: 'name', label: 'Nombre o razón social', required: true, search: true },
      { name: 'rut', label: 'RUT', type: 'rut', search: true },
      { name: 'phone', label: 'Teléfono', type: 'tel', search: true },
      { name: 'email', label: 'Correo', type: 'email', search: true, table: false },
      { name: 'address', label: 'Dirección / comuna' },
      { name: 'notes', label: 'Notas', type: 'textarea' }
    ],
    permissions: { create: OFFICE, edit: OFFICE, delete: ['admin'] },
    canDelete: c => (db.count('vehicles', v => v.customerId === c.id) ? 'Tiene vehículos: elimínalos o reasígnalos primero' : true),
    detail: {
      render: () => '<div data-veh></div><div data-ots></div><div data-quotes></div><div data-docs></div>',
      mount: (view, c, ctx) => {
        R.vehicles.renderList(view.querySelector('[data-veh]'), ctx, { embedded: true, title: 'Vehículos', where: v => v.customerId === c.id, preset: { customerId: c.id } });
        if (R.ots) R.ots.renderList(view.querySelector('[data-ots]'), ctx, { embedded: true, title: 'Órdenes de trabajo', where: o => o.customerId === c.id, onRow: o => { location.hash = `#/ordenes/${o.id}`; } });
        if (R.quotes) R.quotes.renderList(view.querySelector('[data-quotes]'), ctx, { embedded: true, title: 'Presupuestos', where: q => q.customerId === c.id, preset: { customerId: c.id }, onRow: q => { location.hash = `#/presupuestos/${q.id}`; } });
        if (R.invoices) R.invoices.renderList(view.querySelector('[data-docs]'), ctx, { embedded: true, title: 'Documentos', where: d => d.customerId === c.id, onRow: d => { location.hash = `#/documentos/${d.id}`; } });
      }
    }
  });

  app.contribute('admin.html', [R.customers.section({ roles: STAFF.filter(r => r !== 'bodega' && r !== 'mecanico') }), R.vehicles.section({ roles: OFFICE })], { slot: 'operacion' });
  app.contribute('kpis', { order: 60, roles: OFFICE, kpi: () => ({ label: 'Clientes', value: db.count('customers'), icon: '👥', href: '#/clientes', hint: `${db.count('vehicles')} vehículos` }) });
}
