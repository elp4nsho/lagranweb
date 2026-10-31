// Módulos del producto "Taller" (metadatos PUROS: sin DOM). Los usan:
//   - js/app.js (navegador) → defineApp({ modules }) junto con el código de cada módulo (js/modules/<id>.js)
//   - tools/build-client.mjs → qué páginas copiar · tools/supabase-schema.mjs → tablas y RLS por rol
//   - configurar.html → el configurador de paquetes
//
// Acceso por colección (lo traduce supabase-schema a políticas RLS; en local lo hacen los recursos):
//   read / insert / update / delete: 'public' (anónimos) | [roles]  ·  write = insert + update + delete
//   own: { rol: { field, profile, ops } } → ese rol solo toca filas donde row[field] = su perfil[profile]
//   index: campos con columna generada + índice · unique: campos únicos · lookup: búsqueda pública acotada
import { seedBase, seedClientes, seedAgenda, seedOrdenes, seedPresupuestos, seedInventario, seedPortal, seedFacturacion } from './seed.js';

const STAFF = ['admin', 'asesor', 'jefe', 'mecanico', 'bodega'];
const OFFICE = ['admin', 'asesor', 'jefe'];

export const MODULES = [
  {
    id: 'base', base: true, name: 'Base', icon: '🏁', tier: 'Básico',
    description: 'Sitio público (portada, servicios, contacto con formulario), ingreso, panel con resumen, usuarios y roles, configuración del sitio y bitácora.',
    roles: { admin: 'Administrador' },
    pages: { 'admin.html': ['admin'] },
    home: { admin: 'admin.html' },
    settings: {
      name: 'Mecánica Integral Los Andes', short: 'Los Andes', tagline: 'Taller mecánico, desabolladura y pintura · todas las marcas',
      heroTitle: 'Tu auto en manos de especialistas, con presupuesto claro.',
      heroText: 'Diagnóstico computarizado, mecánica, electricidad y carrocería. Te explicamos qué tiene tu auto antes de tocarlo.',
      address: 'Av. Vicuña Mackenna 3840, San Joaquín, Santiago', phone: '+56 2 2933 4400', whatsapp: '+56 9 6100 4400', email: 'contacto@mecanicalosandes.cl',
      hours: 'Lun–Vie 8:00–18:30 · Sáb 9:00–13:00', announcement: '', guarantee: 'Garantía escrita en mano de obra y repuestos.'
    },
    collections: {
      services: { label: 'Servicios del sitio', read: 'public', write: ['admin'], index: ['active'] },
      leads: { label: 'Mensajes de contacto', insert: 'public', read: OFFICE, update: OFFICE, delete: ['admin'], index: ['status'] }
    },
    catalog: ['services'],
    seed: seedBase
  },
  {
    id: 'clientes', name: 'Clientes y vehículos', icon: '🚗', tier: 'Pro',
    description: 'Ficha de clientes (RUT, contacto) y sus vehículos (patente, marca, modelo, kilometraje). Lo necesitan la agenda, las órdenes, los presupuestos y el portal.',
    roles: { asesor: 'Asesor de servicio' },
    pages: { 'admin.html': ['asesor'] },
    home: { asesor: 'admin.html#/clientes' },
    collections: {
      customers: { label: 'Clientes', read: STAFF, write: OFFICE, delete: ['admin'], own: { cliente: { field: 'id', profile: 'customerId', ops: ['select', 'update'] } } },
      vehicles: { label: 'Vehículos', read: STAFF, write: OFFICE, delete: ['admin'], index: ['customerId', 'plate'], unique: ['plate'], own: { cliente: { field: 'customerId', profile: 'customerId', ops: ['select', 'insert', 'update'] } } }
    },
    seed: seedClientes
  },
  {
    id: 'agenda', name: 'Agenda y citas', icon: '📅', tier: 'Pro', deps: ['clientes'],
    description: 'Reserva de horas desde el sitio (sin cuenta), agenda del taller por día, confirmación y estados de la cita; una cita se convierte en OT si está el módulo de órdenes.',
    roles: { asesor: 'Asesor de servicio' },
    pages: { 'admin.html': ['asesor'] },
    home: { asesor: 'admin.html#/citas' },
    settings: { slots: '09:00, 10:00, 11:00, 12:00, 15:00, 16:00, 17:00', bookingDays: 14 },
    collections: {
      appointments: { label: 'Citas', insert: 'public', read: OFFICE, update: OFFICE, delete: ['admin'], index: ['date', 'status', 'customerId'], own: { cliente: { field: 'customerId', profile: 'customerId', ops: ['select', 'insert'] } } }
    },
    seed: seedAgenda
  },
  {
    id: 'ordenes', name: 'Órdenes de trabajo', icon: '🔧', tier: 'Pro', deps: ['clientes'],
    description: 'OT con 8 etapas (recepción → entrega), tablero kanban, asignación de mecánico, foto de ingreso, plazo prometido y seguimiento público por código + patente.',
    roles: { jefe: 'Jefe de taller', mecanico: 'Mecánico' },
    pages: { 'admin.html': ['jefe', 'mecanico'] },
    home: { jefe: 'admin.html#/tablero', mecanico: 'admin.html#/ordenes' },
    collections: {
      ots: {
        label: 'Órdenes de trabajo', read: OFFICE, write: OFFICE, delete: ['admin'], files: true,
        index: ['code', 'status', 'customerId', 'vehicleId', 'mechanicId'], unique: ['code'],
        own: { mecanico: { field: 'mechanicId', profile: 'id', ops: ['select', 'update'] }, cliente: { field: 'customerId', profile: 'customerId', ops: ['select'] } },
        lookup: { match: ['code', 'plate'], fields: ['code', 'status', 'statusAt', 'history', 'car', 'promisedAt', 'type'] }
      }
    },
    seed: seedOrdenes
  },
  {
    id: 'presupuestos', name: 'Presupuestos', icon: '🧮', tier: 'Pro+', deps: ['clientes'],
    description: 'Presupuestos con líneas de mano de obra y repuestos, neto + IVA, envío y aprobación (por el asesor o por el cliente en el portal). Si hay OT ligada, aprobarlo la mueve a "Aprobado".',
    roles: {},
    collections: {
      quotes: { label: 'Presupuestos', read: OFFICE, write: OFFICE, delete: ['admin'], index: ['code', 'status', 'customerId', 'otId'], unique: ['code'], own: { cliente: { field: 'customerId', profile: 'customerId', ops: ['select', 'update'] } } }
    },
    seed: seedPresupuestos
  },
  {
    id: 'inventario', name: 'Inventario y repuestos', icon: '📦', tier: 'Pro+',
    description: 'Repuestos con stock, mínimo, costo y ubicación; proveedores; ingresos y salidas con bitácora; alerta de stock bajo.',
    roles: { bodega: 'Bodega' },
    pages: { 'admin.html': ['bodega'] },
    home: { bodega: 'admin.html#/repuestos' },
    collections: {
      parts: { label: 'Repuestos', read: STAFF, write: ['admin', 'bodega', 'jefe'], delete: ['admin'], index: ['sku', 'supplierId'], unique: ['sku'] },
      suppliers: { label: 'Proveedores', read: STAFF, write: ['admin', 'bodega'], delete: ['admin'] }
    },
    catalog: ['parts', 'suppliers'],
    seed: seedInventario
  },
  {
    id: 'portal', name: 'Portal del cliente', icon: '🙋', tier: 'Pro', deps: ['clientes'],
    description: 'El cliente crea su cuenta y ve sus vehículos, el avance de sus OT, aprueba presupuestos, agenda horas y descarga sus documentos (según los módulos activos).',
    roles: { cliente: 'Cliente' },
    pages: { 'portal.html': ['cliente'] },
    home: { cliente: 'portal.html' },
    collections: {},
    seed: seedPortal
  },
  {
    id: 'facturacion', name: 'Facturación', icon: '🧾', tier: 'Pro+', deps: ['clientes'],
    description: 'Boletas y facturas internas (neto, IVA, total, medio de pago, pagada/por cobrar) emitidas desde la OT o sueltas; ventas por mes. No emite DTE ante el SII (integración futura).',
    roles: {},
    settings: { ivaPct: 19, razonSocial: '', rutEmpresa: '', giro: 'Taller mecánico' },
    collections: {
      invoices: { label: 'Documentos de venta', read: ['admin', 'asesor'], write: ['admin', 'asesor'], delete: ['admin'], index: ['number', 'customerId', 'otId', 'paid'], unique: ['number'], own: { cliente: { field: 'customerId', profile: 'customerId', ops: ['select'] } } }
    },
    seed: seedFacturacion
  }
];

// Paquetes comerciales sugeridos (el configurador los ofrece como atajos).
export const PACKAGES = [
  { id: 'basico', name: 'Básico', modules: ['base'], desc: 'Sitio + panel para editar servicios y recibir mensajes.' },
  { id: 'pro', name: 'Pro', modules: ['base', 'agenda', 'ordenes', 'portal'], desc: 'Agenda online, órdenes de trabajo con seguimiento y portal del cliente.' },
  { id: 'completo', name: 'Completo', modules: MODULES.map(m => m.id), desc: 'Todo: presupuestos, inventario y facturación incluidos.' }
];
