// Ejemplo del kernel: una bicicletería completa (sitio + login + panel por rol) en pocas líneas.
// Todo lo declarativo vive aquí: datos semilla, roles, páginas, estados y recursos.
import { defineApp } from '../../../app.js';
import { resource } from '../../../resource.js';
import { stateMachine, nextCode, rut } from '../../../domain.js';
import { rng } from '../../../db.js';

// Estados de una orden de trabajo: etiquetas, colores, transiciones y efectos en un solo lugar.
export const ORDER = stateMachine({
  states: {
    recibida: { label: 'Recibida', tone: 'info' },
    en_taller: { label: 'En taller', tone: 'primary' },
    esperando: { label: 'Esperando repuesto', tone: 'warning', note: true },
    lista: { label: 'Lista para retiro', tone: 'success' },
    entregada: { label: 'Entregada', tone: '', final: true },
    cancelada: { label: 'Cancelada', tone: 'danger', note: true, final: true }
  },
  transitions: { recibida: ['en_taller', 'cancelada'], en_taller: ['esperando', 'lista'], esperando: ['en_taller', 'cancelada'], lista: ['entregada'] },
  onEnter: { entregada: (row, patch) => { patch.deliveredAt = new Date().toISOString(); } },
  guard: (row, to) => (to === 'en_taller' && !row.mechanicId ? 'Asigna un mecánico antes de pasar a taller' : true)
});

const SERVICES = [['basica', 'Mantención básica'], ['full', 'Mantención completa'], ['frenos', 'Frenos'], ['cambios', 'Ajuste de cambios'], ['rueda', 'Rueda / pinchazo']];
const PRICE = { basica: 19990, full: 44990, frenos: 15990, cambios: 12990, rueda: 7990 };

function seed() {
  const r = rng(7);
  const users = [
    { id: 'u-admin', name: 'Valentina Rojas', email: 'admin@ruedalibre.cl', password: 'demo123', role: 'admin', color: '#4f46e5', demo: true },
    { id: 'u-mec', name: 'Matías Soto', email: 'mecanico@ruedalibre.cl', password: 'demo123', role: 'mecanico', color: '#059669', demo: true },
    { id: 'u-mec2', name: 'Javiera Díaz', email: 'javiera@ruedalibre.cl', password: 'demo123', role: 'mecanico', color: '#db2777' }
  ].map(u => ({ active: true, ...u }));
  const NAMES = ['Camila Pérez', 'Benjamín Muñoz', 'Antonia Silva', 'Joaquín Torres', 'Isidora Flores', 'Tomás Reyes', 'Florencia Castro', 'Vicente Morales'];
  const customers = NAMES.map((name, i) => ({ id: 'c' + i, name, email: name.split(' ')[0].toLowerCase() + '@correo.cl', phone: '+56 9 ' + r.int(5000, 9999) + ' ' + r.int(1000, 9999), rut: rut.make(15000000 + i * 734121), comuna: r.pick(['Providencia', 'Ñuñoa', 'Santiago', 'Las Condes']), createdAt: r.daysAgo(200, 30) }));
  const PATH = ['recibida', 'en_taller', 'lista', 'entregada'];
  const orders = Array.from({ length: 18 }, (_, i) => {
    const service = r.pick(SERVICES)[0], steps = i < 4 ? i % 3 + 1 : 4, start = Date.now() - (i < 4 ? r.int(1, 3) : r.int(4, 150)) * 864e5;
    const path = PATH.slice(0, steps);
    return { id: 'o' + i, code: 'OT-' + (1001 + i), customerId: r.pick(customers).id, bike: r.pick(['Trek Marlin 5', 'Oxford Orion', 'Specialized Rockhopper', 'Bianchi Via Nirone', 'Brompton M6L']), service, price: PRICE[service],
      mechanicId: steps > 1 || i % 2 ? r.pick(['u-mec', 'u-mec2']) : '', status: path.at(-1), history: ORDER.seedHistory(path, { start, stepHours: 20, by: 'u-admin' }), createdAt: new Date(start).toISOString() };
  });
  orders[0].mechanicId = 'u-mec'; orders[1].mechanicId = 'u-mec';
  const parts = [['Cámara 29"', 'CAM-29', 24, 4990], ['Pastillas de freno', 'PAS-01', 3, 8990], ['Cadena 11v', 'CAD-11', 6, 21990], ['Cable de cambio', 'CAB-02', 40, 2490], ['Neumático 700x28', 'NEU-28', 2, 27990]]
    .map(([name, sku, stock, price], i) => ({ id: 'p' + i, name, sku, stock, price, active: true }));
  return { users, customers, orders, parts, '_seq:ot': 1018 };
}

export const app = defineApp({
  name: 'ejemplo-bicicleteria', version: 1, seed,
  brand: { name: 'Rueda Libre', logo: '🚲' },
  roles: { admin: 'Administración', mecanico: 'Mecánico' },
  pages: { 'admin.html': ['admin', 'mecanico'] },
  home: { admin: 'admin.html', mecanico: 'admin.html#/ordenes' },
  settings: { tagline: 'Tu bici como nueva en 48 horas', phone: '+56 2 2345 6789' }
});
const { db } = app;
const ADMIN = ['admin'];

export const customers = resource(app, {
  collection: 'customers', id: 'clientes', singular: 'cliente', plural: 'Clientes', icon: '👥',
  subtitle: c => c.email,
  fields: [
    { name: 'name', label: 'Nombre', required: true, search: true },
    { name: 'rut', label: 'RUT', type: 'rut', search: true },
    { name: 'phone', label: 'Teléfono', type: 'tel' },
    { name: 'email', label: 'Correo', type: 'email', table: false, search: true },
    { name: 'comuna', label: 'Comuna', type: 'select', options: ['Providencia', 'Ñuñoa', 'Santiago', 'Las Condes'], filter: true },
    { name: 'notes', label: 'Notas', type: 'textarea' }
  ],
  permissions: { delete: ADMIN },
  canDelete: c => (db.count('orders', o => o.customerId === c.id) ? 'Tiene órdenes: no se puede eliminar' : true),
  // Maestro-detalle: las órdenes del cliente, con su propio "Nueva orden" que ya trae el cliente puesto.
  detail: {
    render: () => '<div data-orders></div>',
    mount: (view, c, ctx) => orders.renderList(view.querySelector('[data-orders]'), ctx, { embedded: true, title: 'Órdenes del cliente', where: o => o.customerId === c.id, preset: { customerId: c.id } })
  }
});

export const orders = resource(app, {
  collection: 'orders', id: 'ordenes', singular: 'orden', plural: 'Órdenes de trabajo', feminine: true, icon: '🔧',
  title: o => o.code, subtitle: o => o.bike,
  fields: [
    { name: 'code', label: 'Código', form: false, search: true },
    { name: 'customerId', label: 'Cliente', type: 'ref', ref: 'customers', required: true, filter: false },
    { name: 'bike', label: 'Bicicleta', required: true, table: false, search: true },
    { name: 'service', label: 'Servicio', type: 'select', options: SERVICES, required: true, filter: true },
    { name: 'price', label: 'Precio', type: 'money', required: true },
    { name: 'mechanicId', label: 'Mecánico', type: 'ref', ref: 'users', refFilter: u => u.role === 'mecanico', filter: true },
    { name: 'status', label: 'Estado', type: 'status', machine: ORDER }
  ],
  // El mecánico ve solo sus órdenes; administración ve todas.
  rows: ctx => db.query('orders', o => ctx.user?.role !== 'mecanico' || o.mechanicId === ctx.user.id),
  permissions: { create: ADMIN, delete: ADMIN },
  defaults: () => ({ service: 'basica', price: PRICE.basica }),
  beforeSave: (v, row) => (row ? v : { ...v, code: nextCode(db, 'ot', 'OT-', 1001) }),
  count: () => db.count('orders', o => o.status === 'lista'),
  detail: true
});

export const parts = resource(app, {
  collection: 'parts', id: 'repuestos', singular: 'repuesto', plural: 'Repuestos', icon: '📦',
  fields: [
    { name: 'name', label: 'Repuesto', required: true, search: true },
    { name: 'sku', label: 'SKU', search: true },
    { name: 'stock', label: 'Stock', type: 'number', min: 0, required: true, render: v => (v <= 3 ? `<b style="color:var(--danger)">${v}</b>` : String(v)) },
    { name: 'price', label: 'Precio', type: 'money' },
    { name: 'active', label: 'A la venta', type: 'bool', toggle: true, default: true }
  ],
  filters: [{ key: 'low', label: 'Stock', options: [['1', 'Bajo (≤ 3)']], test: p => p.stock <= 3 }],
  rowActions: [{ id: 'plus', label: 'Sumar 10 al stock', icon: '＋', run: p => { db.update('parts', p.id, { stock: p.stock + 10 }); db.log('repuesto', `${p.name}: +10 unidades`, app.auth.current()?.id); } }],
  count: () => db.count('parts', p => p.stock <= 3)
});
