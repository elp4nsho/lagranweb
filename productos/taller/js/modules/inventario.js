// Módulo inventario: repuestos con stock y mínimo, proveedores, ingresos/salidas con bitácora.
import { resource, fieldsModal } from '../../../../assets/core/resource.js';
import { card } from '../../../../assets/core/blocks.js';
import { escape, money, toast } from '../../../../assets/core/ui.js';

const STOCK = ['admin', 'bodega', 'jefe'];

export function install(app) {
  const { db } = app;
  const R = (app.res ||= {});
  const low = p => p.active !== false && p.stock <= (p.min || 0);
  async function move(p, sign, ctx) {
    const v = await fieldsModal({ title: `${sign > 0 ? 'Ingreso' : 'Salida'} · ${p.name}`, size: '', submit: 'Registrar', intro: `Stock actual: ${p.stock}`,
      fields: [{ name: 'qty', label: 'Cantidad', type: 'number', min: 1, required: true, default: 1 }, { name: 'note', label: sign > 0 ? 'Factura / guía del proveedor' : 'OT o motivo' }],
      onSubmit: v => (sign < 0 && v.qty > db.get('parts', p.id).stock ? 'No hay stock suficiente' : true) });
    if (!v) return;
    const row = db.update('parts', p.id, x => ({ stock: x.stock + sign * v.qty }));
    db.log('bodega', `${p.sku} ${p.name}: ${sign > 0 ? '+' : '−'}${v.qty} (${v.note || 'sin nota'}) → stock ${row.stock}`, ctx.user.id);
    toast(`Stock de ${p.name}: ${row.stock}`, 'success');
  }
  R.parts = resource(app, {
    collection: 'parts', id: 'repuestos', singular: 'repuesto', plural: 'Repuestos', icon: '📦',
    title: p => p.name, subtitle: p => `${p.sku} · ${p.location || ''}`,
    fields: [
      { name: 'name', label: 'Repuesto', required: true, search: true },
      { name: 'sku', label: 'SKU', required: true, search: true },
      { name: 'cat', label: 'Categoría', type: 'select', options: ['Filtros', 'Lubricantes', 'Frenos', 'Motor', 'Transmisión', 'Suspensión', 'Electricidad', 'Aire acondicionado', 'Pintura', 'Carrocería', 'Otro'], filter: true },
      { name: 'stock', label: 'Stock', type: 'number', min: 0, required: true, render: (v, p) => (low(p) ? `<b style="color:var(--danger)">${v}</b>` : String(v)) },
      { name: 'min', label: 'Mínimo', type: 'number', min: 0 },
      { name: 'price', label: 'Precio venta', type: 'money' },
      { name: 'cost', label: 'Costo', type: 'money', table: false },
      { name: 'location', label: 'Ubicación', table: false },
      { name: 'supplierId', label: 'Proveedor', type: 'ref', ref: 'suppliers', table: false },
      { name: 'active', label: 'Activo', type: 'bool', toggle: true, default: true, table: false }
    ],
    validate: (v, row) => (db.find('parts', p => p.sku === v.sku && p.id !== row?.id) ? 'Ya existe un repuesto con ese SKU' : null),
    filters: [{ key: 'low', label: 'Stock', options: [['1', 'Bajo el mínimo']], test: low }],
    permissions: { create: STOCK, edit: STOCK, delete: ['admin'] },
    rowActions: [{ id: 'in', label: 'Ingreso', icon: '＋', when: (p, ctx) => STOCK.includes(ctx.user.role), run: (p, ctx) => move(p, 1, ctx) }, { id: 'out', label: 'Salida', icon: '−', when: (p, ctx) => STOCK.includes(ctx.user.role), run: (p, ctx) => move(p, -1, ctx) }],
    count: () => db.count('parts', low)
  });
  R.suppliers = resource(app, {
    collection: 'suppliers', id: 'proveedores', singular: 'proveedor', plural: 'Proveedores', icon: '🚚',
    subtitle: s => s.cat,
    fields: [{ name: 'name', label: 'Proveedor', required: true, search: true }, { name: 'cat', label: 'Rubro' }, { name: 'contact', label: 'Correo', type: 'email' }, { name: 'phone', label: 'Teléfono', type: 'tel' }, { name: 'days', label: 'Días de despacho', type: 'number', min: 0 }],
    permissions: { create: ['admin', 'bodega'], edit: ['admin', 'bodega'], delete: ['admin'] },
    canDelete: s => (db.count('parts', p => p.supplierId === s.id) ? 'Tiene repuestos asociados' : true)
  });
  app.contribute('admin.html', [R.parts.section({ roles: [...STOCK, 'asesor', 'mecanico'] }), R.suppliers.section({ roles: ['admin', 'bodega'] })], { slot: 'bodega' });
  app.contribute('kpis', { order: 30, roles: [...STOCK], kpi: () => { const n = db.count('parts', low); return { label: 'Repuestos bajo el mínimo', value: n, icon: '📦', href: '#/repuestos', up: !n, delta: n ? 'reponer' : 'ok' }; } });
  app.contribute('dashboard', { order: 40, roles: STOCK, render: () => card('Reponer', db.query('parts', low).slice(0, 6).map(p => `<p style="margin:0 0 8px"><b>${escape(p.name)}</b> <small class="muted">${escape(p.sku)}</small><br><small>Stock ${p.stock} / mínimo ${p.min} · ${money(p.cost)} c/u</small></p>`).join('') || '<p class="muted small">Todo sobre el mínimo.</p>', { actions: '<a class="btn btn-sm" href="#/repuestos">Inventario</a>' }) });
}
