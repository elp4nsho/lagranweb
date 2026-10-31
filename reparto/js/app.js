// Pudú Envíos — reparto de última milla. Configuración declarativa de la app (kernel):
// datos semilla, roles, páginas, máquinas de estado y recursos. La importan todas las páginas.
// La lógica de operación (plan de ruta con ETA, simulación en vivo, entregas, cierres, planificación
// automática por zona y capacidad) vive en ops.js.
import { defineApp } from '../../assets/core/app.js';
import { resource, fieldType, fieldTypes } from '../../assets/core/resource.js';
import { stateMachine, nextCode, rut } from '../../assets/core/domain.js';
import { rng } from '../../assets/core/db.js';
import { html, raw, money, escape, toast } from '../../assets/core/ui.js';
import { COMUNA, COMUNAS, COMUNA_NAMES, DEPOT, xy, hrand } from './geo.js';
import { seed } from './seed.js';

// ---------- Estados ----------
export const SHIP = stateMachine({
  states: {
    creado: { label: 'Etiquetado', tone: 'info' },
    en_bodega: { label: 'En centro de distribución', tone: 'info' },
    asignado: { label: 'Asignado a ruta', tone: 'primary' },
    en_ruta: { label: 'En reparto', tone: 'primary' },
    entregado: { label: 'Entregado', tone: 'success', final: true },
    parcial: { label: 'Entrega parcial', tone: 'warning', final: true },
    fallido: { label: 'Intento fallido', tone: 'danger', note: true },
    en_punto: { label: 'En punto de retiro', tone: 'warning' },
    retirado_punto: { label: 'Retirado en punto', tone: 'success', final: true },
    devuelto: { label: 'Devuelto al remitente', tone: '', final: true, note: true },
    cancelado: { label: 'Cancelado', tone: 'danger', final: true, note: true }
  },
  transitions: {
    creado: ['en_bodega', 'cancelado'],
    en_bodega: ['asignado', 'en_punto', 'devuelto', 'cancelado'],
    asignado: ['en_ruta', 'en_bodega'],
    en_ruta: ['entregado', 'parcial', 'fallido', 'en_bodega', 'asignado'],
    fallido: ['en_ruta', 'en_bodega', 'asignado'],
    en_punto: ['retirado_punto', 'devuelto']
  },
  onEnter: { entregado: (r, p) => { p.deliveredAt = p.deliveredAt || new Date().toISOString(); } }
});
export const PICK = stateMachine({
  states: {
    solicitado: { label: 'Solicitado', tone: 'info' },
    asignado: { label: 'Asignado a ruta', tone: 'primary' },
    en_ruta: { label: 'En camino', tone: 'primary' },
    retirado: { label: 'Retirado', tone: 'success', final: true },
    fallido: { label: 'Retiro fallido', tone: 'danger', note: true },
    cancelado: { label: 'Cancelado', tone: 'danger', final: true, note: true }
  },
  transitions: { solicitado: ['asignado', 'cancelado'], asignado: ['en_ruta', 'solicitado'], en_ruta: ['retirado', 'fallido', 'asignado'], fallido: ['en_ruta', 'asignado', 'solicitado', 'cancelado'] }
});
export const ROUTE = stateMachine({
  states: {
    planificada: { label: 'Por iniciar', tone: 'info' },
    en_curso: { label: 'En curso', tone: 'primary' },
    cerrada: { label: 'Cerrada', tone: 'success', final: true }
  },
  transitions: { planificada: ['en_curso'], en_curso: ['cerrada'] }
});
export const INC = stateMachine({
  states: { abierta: { label: 'Abierta', tone: 'danger' }, en_gestion: { label: 'En gestión', tone: 'warning' }, resuelta: { label: 'Resuelta', tone: 'success', final: true } },
  transitions: { abierta: ['en_gestion', 'resuelta'], en_gestion: ['resuelta', 'abierta'] }
});
export const machineOf = s => (s?.kind === 'retiro' ? PICK : SHIP);
export const stLabel = s => machineOf(s).label(s.status);
export const stBadge = s => machineOf(s).badge(s.status);

export const INC_TYPES = {
  intento_fallido: ['Intento fallido', '🚫'], nota: ['Nota del destinatario', '📝'], cambio: ['Cambio solicitado', '🔁'],
  caja: ['Diferencia de caja', '💵'], checklist: ['Checklist de vehículo', '🛠️'], retraso: ['Retraso', '⏱️'],
  danio: ['Paquete dañado', '📦'], reclamo: ['Reclamo / mala evaluación', '⭐'], direccion: ['Dirección por validar', '📍']
};
export const FAIL_REASONS = ['Nadie en el domicilio', 'Dirección incorrecta o incompleta', 'Rechazado por el destinatario', 'Sin acceso (conserjería cerrada / condominio)', 'Sin dinero para el pago contra entrega', 'Zona insegura / sin estacionamiento', 'Paquete dañado', 'Sin tiempo en la jornada', 'Reprogramado por el destinatario'];
export const NOTE_TAGS = ['Dejar con conserje', 'Timbre malo', 'Perro bravo', 'Llamar antes de llegar', 'Portón negro', 'Depto. interior / pasaje', 'Dejar con vecino', 'No dejar en la puerta'];
export const WINDOWS = ['09:00-12:00', '10:00-13:00', '12:00-15:00', '14:00-17:00', '15:00-18:00', '17:00-20:00'];
export const SERVICES = [['estandar', 'Estándar (24-48 h)'], ['express', 'Express (antes de 13:00)'], ['mismo_dia', 'Mismo día']];
export const RELATIONS = ['Titular', 'Conserje', 'Familiar', 'Vecino', 'Compañero de trabajo', 'Guardia'];
export const ROUTE_COLORS = ['#2563eb', '#db2777', '#059669', '#d97706', '#7c3aed', '#0891b2', '#dc2626', '#65a30d'];
export const CHECK_ITEMS = [
  ['luces', 'Luces y señalizadores', true], ['neumaticos', 'Neumáticos y presión', true], ['frenos', 'Frenos', true],
  ['niveles', 'Niveles (aceite, agua, líquido de frenos)', false], ['docs', 'Documentos al día (permiso, SOAP, revisión técnica)', true],
  ['extintor', 'Extintor y botiquín', false], ['carga', 'Amarras y orden de la carga', false], ['limpieza', 'Limpieza de cabina y caja', false]
];

// ---------- App ----------
export const app = defineApp({
  name: 'reparto', version: 4, seed,
  brand: { name: 'Pudú Envíos', logo: '📦' },
  roles: { admin: 'Administrador', coordinador: 'Coordinador de despacho', conductor: 'Conductor', remitente: 'Cliente empresa', destinatario: 'Destinatario' },
  pages: { 'admin.html': ['admin', 'coordinador'], 'conductor.html': ['conductor'], 'empresa.html': ['remitente'] },
  home: { admin: 'admin.html', coordinador: 'admin.html', conductor: 'conductor.html', remitente: 'empresa.html', destinatario: 'index.html#/mis-envios' },
  settings: {
    tagline: 'Tu paquete, a la puerta y a la hora', phone: '+56 2 2940 7700', email: 'hola@puduenvios.cl',
    speed: 24, serviceMin: 4, breakMin: 30, breakAt: '13:30', cutoff: '11:00', maxAttempts: 3, notifyEta: true
  }
});
export const { db, auth } = app;
export const S = () => app.settings();
export const me = () => auth.current();
export const userName = id => db.get('users', id)?.name || '—';
export const companyName = id => db.get('companies', id)?.name || '—';
export const zoneOf = id => db.get('zones', id);
export const todayStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const tomorrowStr = () => todayStr(new Date(Date.now() + 864e5));
export const hhmm = ms => new Date(ms).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
export const km = n => `${(n || 0).toLocaleString('es-CL', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} km`;
export const kg = n => `${(+n || 0).toLocaleString('es-CL', { maximumFractionDigits: 1 })} kg`;
export const addrKey = (address, comuna) => `${address}|${comuna}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/(depto|dpto|of|oficina|casa)\.?\s*\S+/g, '').replace(/[^a-z0-9|]+/g, '');

// Precio de un envío según la tarifa del remitente.
export function priceFor(v, company) {
  const rate = db.get('rates', company?.rateId) || db.all('rates')[0] || { base: 3490, perKg: 390, perPiece: 600, codPct: 2, express: 2500, sameDay: 4500 };
  let p = rate.base + Math.max(0, Math.ceil((+v.weight || 0) - 1)) * rate.perKg + Math.max(0, (+v.pieces || 1) - 1) * rate.perPiece;
  if (v.service === 'express') p += rate.express;
  if (v.service === 'mismo_dia') p += rate.sameDay;
  if (+v.cod) p += Math.round((+v.cod) * rate.codPct / 100);
  const z = db.get('zones', COMUNA[v.comuna] ? 'z-' + COMUNA[v.comuna].zone : '');
  if (z?.surcharge) p += z.surcharge;
  return Math.round(p / 10) * 10;
}

// Ubicación (km) para una dirección nueva: centro de la comuna + desplazamiento determinista por dirección.
export function locate(address, comuna) {
  const c = COMUNA[comuna] || COMUNAS[0];
  const a = hrand(address + comuna), b = hrand(comuna + address + 'y');
  return { x: +(c.x + (a - 0.5) * 2.6).toFixed(3), y: +(c.y + (b - 0.5) * 2.2).toFixed(3), zoneId: 'z-' + c.zone };
}

// ---------- Tipos de campo propios ----------
fieldType('comuna', { ...fieldTypes.select, input: (fd, v, id, res) => fieldTypes.select.input({ ...fd, options: COMUNA_NAMES }, v, id, res), text: v => v || '' });
fieldType('window', { ...fieldTypes.select, input: (fd, v, id, res) => fieldTypes.select.input({ ...fd, options: [['', 'Todo el día'], ...WINDOWS.map(w => [w, w.replace('-', ' a ')])], required: true }, v, id, res), text: v => (v ? v.replace('-', '–') : 'Todo el día') });
fieldType('patente', { ...fieldTypes.text, read: el => el.value.trim().toUpperCase().replace(/\s+/g, ''), check: v => (v && !/^[A-Z]{2,4}-?\d{2,4}$/.test(v) ? 'Formato de patente no válido (ej. KTRZ-41)' : '') });

const ADMIN = ['admin'];
const OPS = ['admin', 'coordinador'];

// ---------- Recursos ----------
const ships = (ctx, kind) => db.query('shipments', s => s.kind === kind && (ctx.user?.role !== 'remitente' || s.companyId === ctx.user.companyId));

export const shipments = resource(app, {
  collection: 'shipments', id: 'envios', singular: 'envío', plural: 'Envíos', icon: '📦', machine: SHIP,
  title: s => s.code, subtitle: s => `${s.rName} · ${s.comuna}`,
  intro: 'Todos los envíos (entregas). Búscalos por código, destinatario, dirección o referencia del remitente.',
  fields: [
    { name: 'code', label: 'Código', form: false, search: true },
    { name: 'companyId', label: 'Remitente', type: 'ref', ref: 'companies', refFilter: c => me()?.role !== 'remitente' || c.id === me().companyId, required: true, filter: true, createOnly: true },
    { name: 'rName', label: 'Destinatario', required: true, search: true, table: false },
    { name: 'rPhone', label: 'Teléfono destinatario', type: 'tel', required: true, table: false, check: v => (v.replace(/\D/g, '').length < 8 ? 'teléfono incompleto' : '') },
    { name: 'rEmail', label: 'Correo destinatario', type: 'email', table: false },
    { name: 'address', label: 'Dirección', required: true, search: true, wide: true, placeholder: 'Calle, número, depto.' },
    { name: 'comuna', label: 'Comuna', type: 'comuna', required: true, filter: true },
    { name: 'service', label: 'Servicio', type: 'select', options: SERVICES, required: true, table: false, filter: true },
    { name: 'win', label: 'Ventana horaria', type: 'window', table: false },
    { name: 'weight', label: 'Peso (kg)', type: 'number', min: 0.1, max: 70, step: 0.1, required: true, table: false },
    { name: 'vol', label: 'Volumen (litros)', type: 'number', min: 1, max: 600, required: true, table: false },
    { name: 'pieces', label: 'Bultos', type: 'number', min: 1, max: 20, required: true, table: false, default: 1 },
    { name: 'cod', label: 'Cobro contra entrega', type: 'money', table: false, help: '0 si ya está pagado' },
    { name: 'requirePin', label: 'Exigir PIN al entregar (alto valor)', type: 'bool', table: false },
    { name: 'ref', label: 'Referencia / N° de pedido', search: true, table: false },
    { name: 'desc', label: 'Contenido', table: false },
    { name: 'date', label: 'Fecha de reparto', type: 'date', form: false, render: v => (v === todayStr() ? 'Hoy' : v === tomorrowStr() ? 'Mañana' : escape(v || '—')) },
    { name: 'status', label: 'Estado', type: 'status', machine: SHIP }
  ],
  rows: ctx => ships(ctx, 'entrega'),
  sort: (a, b) => String(b.createdAt).localeCompare(String(a.createdAt)),
  filters: [{ key: 'today', label: 'Fecha', options: [['hoy', 'Hoy'], ['manana', 'Mañana'], ['sin', 'Sin ruta']], test: (s, v) => (v === 'hoy' ? s.date === todayStr() : v === 'manana' ? s.date === tomorrowStr() : !s.routeId && !SHIP.isFinal(s.status)) }],
  permissions: { create: ['admin', 'coordinador', 'remitente'], edit: ['admin', 'coordinador'], delete: ADMIN },
  defaults: ctx => ({ service: 'estandar', pieces: 1, weight: 1.5, vol: 12, cod: 0, win: '', companyId: ctx?.user?.companyId || '' }),
  beforeSave(v, row, ctx) {
    const company = db.get('companies', v.companyId || row?.companyId || ctx?.user?.companyId);
    if (!company) { toast('Elige el remitente', 'warning'); return false; }
    const loc = (!row || row.address !== v.address || row.comuna !== v.comuna) ? locate(v.address, v.comuna) : {};
    if (row) return { ...v, ...loc };
    const cut = S().cutoff.split(':').map(Number), now = new Date();
    const late = now.getHours() * 60 + now.getMinutes() > cut[0] * 60 + cut[1];
    return { ...v, ...loc, kind: 'entrega', companyId: company.id, code: nextCode(db, 'ship', 'PE-', 482300), pin: String(1000 + Math.floor(Math.random() * 9000)),
      price: priceFor(v, company), date: v.service === 'mismo_dia' || !late ? todayStr() : tomorrowStr(), status: ctx?.user?.role === 'remitente' ? 'creado' : 'en_bodega',
      notes: [], attempts: [], routeId: '' };
  },
  afterSave(row, { isNew }) { if (isNew) notify(row, 'Email', `Hola ${row.rName.split(' ')[0]}: ${companyName(row.companyId)} te envió un paquete con Pudú Envíos. Síguelo con el código ${row.code}.`); },
  canDelete: s => (s.routeId ? 'Está en una ruta: quítalo de la ruta primero' : true),
  count: () => db.count('shipments', s => s.kind === 'entrega' && s.status === 'creado'),
  csv: s => ({ codigo: s.code, remitente: companyName(s.companyId), referencia: s.ref || '', destinatario: s.rName, telefono: s.rPhone, direccion: s.address, comuna: s.comuna, servicio: s.service, ventana: s.win || '', peso_kg: s.weight, bultos: s.pieces, cobro: s.cod || 0, fecha: s.date, estado: SHIP.label(s.status), ruta: db.get('routes', s.routeId)?.code || '', intentos: (s.attempts || []).length, entregado: s.deliveredAt || '' }),
  detail: true
});

export const pickups = resource(app, {
  collection: 'shipments', id: 'retiros', singular: 'retiro', plural: 'Retiros', icon: '📥', machine: PICK,
  title: s => s.code, subtitle: s => `${companyName(s.companyId)} · ${s.comuna}`,
  intro: 'Retiros en bodegas de clientes que se mezclan en las rutas del día.',
  fields: [
    { name: 'code', label: 'Código', form: false, search: true },
    { name: 'companyId', label: 'Cliente', type: 'ref', ref: 'companies', refFilter: c => me()?.role !== 'remitente' || c.id === me().companyId, required: true, filter: true },
    { name: 'address', label: 'Dirección de retiro', required: true, wide: true, search: true },
    { name: 'comuna', label: 'Comuna', type: 'comuna', required: true, filter: true },
    { name: 'win', label: 'Ventana horaria', type: 'window' },
    { name: 'pieces', label: 'Bultos estimados', type: 'number', min: 1, max: 80, required: true, default: 5 },
    { name: 'weight', label: 'Peso estimado (kg)', type: 'number', min: 1, max: 600, required: true, default: 15, table: false },
    { name: 'vol', label: 'Volumen (litros)', type: 'number', min: 1, max: 3000, required: true, default: 120, table: false },
    { name: 'rName', label: 'Contacto', required: true, table: false },
    { name: 'rPhone', label: 'Teléfono', type: 'tel', required: true, table: false },
    { name: 'desc', label: 'Indicaciones', type: 'textarea' },
    { name: 'date', label: 'Fecha', type: 'date', form: false },
    { name: 'status', label: 'Estado', type: 'status', machine: PICK }
  ],
  rows: ctx => ships(ctx, 'retiro'),
  sort: (a, b) => String(b.createdAt).localeCompare(String(a.createdAt)),
  permissions: { create: ['admin', 'coordinador', 'remitente'], edit: OPS, delete: ADMIN },
  defaults: ctx => { const c = db.get('companies', ctx?.user?.companyId); return { pieces: 5, weight: 15, vol: 120, companyId: c?.id || '', address: c?.address || '', comuna: c?.comuna || '', rName: c?.contact || '', rPhone: c?.phone || '' }; },
  beforeSave(v, row, ctx) {
    const loc = (!row || row.address !== v.address || row.comuna !== v.comuna) ? locate(v.address, v.comuna) : {};
    if (row) return { ...v, ...loc };
    return { ...v, ...loc, companyId: v.companyId || ctx?.user?.companyId, kind: 'retiro', code: nextCode(db, 'pick', 'RT-', 7100), date: todayStr(), status: 'solicitado', notes: [], attempts: [], routeId: '', cod: 0 };
  },
  canDelete: s => (s.routeId ? 'Está en una ruta' : true),
  count: () => db.count('shipments', s => s.kind === 'retiro' && s.status === 'solicitado'),
  detail: true
});

export const vehicles = resource(app, {
  collection: 'vehicles', id: 'vehiculos', singular: 'vehículo', plural: 'Vehículos', icon: '🚐',
  title: v => v.plate, subtitle: v => v.model,
  intro: 'Flota propia: capacidad de carga, kilometraje, documentos y estado.',
  fields: [
    { name: 'plate', label: 'Patente', type: 'patente', required: true, search: true },
    { name: 'model', label: 'Modelo', required: true, search: true, table: false },
    { name: 'type', label: 'Tipo', type: 'select', options: ['Furgón', 'Furgón grande', 'Camioneta', 'Eléctrico', 'Moto'], required: true, filter: true },
    { name: 'fuel', label: 'Energía', type: 'select', options: ['Diésel', 'Bencina', 'Eléctrico'], required: true, table: false },
    { name: 'capKg', label: 'Capacidad (kg)', type: 'number', min: 10, max: 5000, required: true },
    { name: 'capL', label: 'Capacidad (litros)', type: 'number', min: 50, max: 20000, required: true },
    { name: 'odometer', label: 'Kilometraje', type: 'number', min: 0, required: true, render: v => `${(v || 0).toLocaleString('es-CL')} km` },
    { name: 'nextService', label: 'Próxima mantención (km)', type: 'number', min: 0, table: false },
    { name: 'rtDue', label: 'Vence revisión técnica', type: 'date', table: false },
    { name: 'status', label: 'Estado', type: 'select', options: [['operativo', 'Operativo'], ['mantencion', 'En mantención'], ['fuera', 'Fuera de servicio']], required: true, filter: true,
      render: v => ({ operativo: '<span class="badge badge-success">Operativo</span>', mantencion: '<span class="badge badge-warning">En mantención</span>', fuera: '<span class="badge badge-danger">Fuera de servicio</span>' }[v] || '') }
  ],
  permissions: { create: ADMIN, edit: ADMIN, delete: ADMIN },
  defaults: () => ({ status: 'operativo', fuel: 'Diésel', type: 'Furgón', capKg: 650, capL: 3300, odometer: 0 }),
  canDelete: v => (db.count('routes', r => r.vehicleId === v.id && r.status !== 'cerrada') ? 'Tiene una ruta activa' : true),
  count: () => db.count('vehicles', v => v.status !== 'operativo'),
  detail: {
    aside: v => {
      const logs = db.query('fuelLogs', f => f.vehicleId === v.id).slice(0, 6);
      return html`<section class="card"><div class="k-card-head"><h3>Cargas de combustible</h3></div>${logs.length ? raw(`<ul class="rp-mini">${logs.map(f => `<li><b>${f.liters} L</b> · ${money(f.amount)}<small>${escape(f.station)} · ${new Date(f.at).toLocaleDateString('es-CL')} · ${f.odometer.toLocaleString('es-CL')} km</small></li>`).join('')}</ul>`) : raw('<p class="muted small">Sin cargas registradas.</p>')}</section>`;
    }
  }
});

export const drivers = resource(app, {
  collection: 'users', id: 'conductores', singular: 'conductor', plural: 'Conductores', icon: '🧑‍✈️', log: 'conductor',
  title: u => u.name, subtitle: u => u.phone || u.email,
  intro: 'Conductores propios: licencia, vehículo y zona habituales. Su cuenta abre la app del conductor.',
  fields: [
    { name: 'name', label: 'Nombre', required: true, search: true },
    { name: 'rut', label: 'RUT', type: 'rut', required: true, search: true, table: false },
    { name: 'email', label: 'Correo (usuario)', type: 'email', required: true, table: false },
    { name: 'phone', label: 'Teléfono', type: 'tel', required: true },
    { name: 'license', label: 'Licencia', type: 'select', options: ['B', 'A2', 'A3', 'A4', 'C (moto)'], required: true, table: false },
    { name: 'licenseDue', label: 'Vencimiento licencia', type: 'date', table: false },
    { name: 'vehicleId', label: 'Vehículo habitual', type: 'ref', ref: 'vehicles', refLabel: v => `${v.plate} · ${v.model}` },
    { name: 'zoneId', label: 'Zona habitual', type: 'ref', ref: 'zones', filter: true },
    { name: 'active', label: 'Activo', type: 'bool', toggle: true, default: true }
  ],
  rows: () => db.query('users', u => u.role === 'conductor'),
  permissions: { create: ADMIN, edit: ADMIN, delete: ADMIN },
  defaults: () => ({ active: true, license: 'A2' }),
  validate: (v, row) => (db.find('users', x => x.email.toLowerCase() === String(v.email).toLowerCase() && x.id !== row?.id) ? 'Ese correo ya está en uso' : null),
  beforeSave: (v, row) => (row ? v : { ...v, role: 'conductor', password: 'conductor123', color: ROUTE_COLORS[db.count('users') % ROUTE_COLORS.length] }),
  canDelete: u => (db.count('routes', r => r.driverId === u.id) ? 'Tiene rutas registradas: desactívalo en vez de eliminarlo' : true),
  csv: u => ({ nombre: u.name, rut: u.rut, telefono: u.phone, licencia: u.license, vehiculo: db.get('vehicles', u.vehicleId)?.plate || '', zona: zoneOf(u.zoneId)?.name || '', activo: u.active !== false ? 'sí' : 'no' }),
  detail: {
    render: u => {
      const rs = db.query('routes', r => r.driverId === u.id).slice(0, 8);
      return html`<section class="card"><div class="k-card-head"><h3>Últimas rutas</h3></div>${rs.length ? raw(`<div class="table-wrap"><table class="table"><thead><tr><th>Ruta</th><th>Fecha</th><th>Paradas</th><th>Estado</th></tr></thead><tbody>${rs.map(r => `<tr><td><a href="#/rutas/${r.id}">${escape(r.code)}</a></td><td>${escape(r.date)}</td><td>${r.order.length}</td><td>${ROUTE.badge(r.status)}</td></tr>`).join('')}</tbody></table></div>`) : raw('<p class="muted small">Sin rutas.</p>')}</section>`;
    }
  }
});

export const zones = resource(app, {
  collection: 'zones', id: 'zonas', singular: 'zona', plural: 'Zonas', icon: '🗺️', feminine: true,
  title: z => z.name, subtitle: z => (z.comunas || []).join(', '),
  intro: 'Zonas de reparto: agrupan comunas para armar rutas y definen la hora de corte y recargos.',
  fields: [
    { name: 'name', label: 'Nombre', required: true, search: true },
    { name: 'color', label: 'Color en el mapa', type: 'color', required: true },
    { name: 'comunas', label: 'Comunas', type: 'tags', wide: true, required: true, check: v => { const bad = v.filter(c => !COMUNA[c]); return bad.length ? `comunas desconocidas: ${bad.join(', ')}` : ''; } },
    { name: 'cutoff', label: 'Hora de corte', placeholder: '11:00', check: v => (/^\d{2}:\d{2}$/.test(v) ? '' : 'usa HH:MM') },
    { name: 'surcharge', label: 'Recargo por envío', type: 'money' }
  ],
  permissions: { create: ADMIN, edit: ADMIN, delete: ADMIN },
  canDelete: z => (db.count('routes', r => r.zoneId === z.id && r.status !== 'cerrada') ? 'Hay rutas activas en esta zona' : true)
});

export const points = resource(app, {
  collection: 'points', id: 'puntos', singular: 'punto de retiro', plural: 'Puntos de retiro', icon: '🏪',
  title: p => p.name, subtitle: p => `${p.address}, ${p.comuna}`,
  intro: 'Lockers y tiendas aliadas donde el destinatario puede retirar si no está en casa.',
  fields: [
    { name: 'name', label: 'Nombre', required: true, search: true },
    { name: 'kind', label: 'Tipo', type: 'select', options: ['Locker', 'Tienda aliada'], required: true, filter: true },
    { name: 'address', label: 'Dirección', required: true, wide: true },
    { name: 'comuna', label: 'Comuna', type: 'comuna', required: true, filter: true },
    { name: 'hours', label: 'Horario', required: true, placeholder: 'L-V 09:00-20:00' },
    { name: 'capacity', label: 'Capacidad (casilleros/paquetes)', type: 'number', min: 1, required: true },
    { name: 'active', label: 'Activo', type: 'bool', toggle: true, default: true }
  ],
  permissions: { create: ADMIN, edit: ADMIN, delete: ADMIN },
  beforeSave: (v, row) => ({ ...v, ...((!row || row.address !== v.address || row.comuna !== v.comuna) ? locate(v.address, v.comuna) : {}) }),
  columns: cols => { cols.splice(cols.length - 1, 0, { key: 'used', label: 'Ocupación', sort: false, render: p => raw(`${pointUse(p)}/${p.capacity}`) }); return cols; }
});
export const pointUse = p => db.count('shipments', s => s.status === 'en_punto' && s.redirectPointId === p.id);

export const companies = resource(app, {
  collection: 'companies', id: 'empresas', singular: 'empresa', plural: 'Clientes empresa', icon: '🏢', feminine: true,
  title: c => c.name, subtitle: c => c.rut,
  intro: 'Remitentes con contrato: su tarifa, contacto y dirección de retiro.',
  fields: [
    { name: 'name', label: 'Razón social / fantasía', required: true, search: true },
    { name: 'rut', label: 'RUT', type: 'rut', required: true, search: true },
    { name: 'contact', label: 'Contacto', required: true, table: false },
    { name: 'email', label: 'Correo', type: 'email', required: true, table: false },
    { name: 'phone', label: 'Teléfono', type: 'tel', table: false },
    { name: 'address', label: 'Dirección de retiro', required: true, wide: true, table: false },
    { name: 'comuna', label: 'Comuna', type: 'comuna', required: true },
    { name: 'rateId', label: 'Tarifa', type: 'ref', ref: 'rates', required: true, filter: true },
    { name: 'active', label: 'Activa', type: 'bool', toggle: true, default: true }
  ],
  permissions: { create: ADMIN, edit: ADMIN, delete: ADMIN },
  canDelete: c => (db.count('shipments', s => s.companyId === c.id) ? 'Tiene envíos: desactívala en vez de eliminarla' : true),
  columns: cols => { cols.splice(cols.length - 1, 0, { key: 'n', label: 'Envíos (30 d)', sort: false, render: c => raw(`<span class="k-num" style="display:block">${db.count('shipments', s => s.companyId === c.id)}</span>`) }); return cols; },
  detail: true
});

export const rates = resource(app, {
  collection: 'rates', id: 'tarifas', singular: 'tarifa', plural: 'Tarifas', icon: '💲', feminine: true,
  intro: 'Tarifario por plan. El precio de cada envío = base + kilos extra + bultos extra + recargos de servicio, zona y cobro contra entrega.',
  fields: [
    { name: 'name', label: 'Plan', required: true, search: true },
    { name: 'base', label: 'Base (hasta 1 kg)', type: 'money', required: true },
    { name: 'perKg', label: 'Kilo adicional', type: 'money', required: true },
    { name: 'perPiece', label: 'Bulto adicional', type: 'money', required: true },
    { name: 'express', label: 'Recargo express', type: 'money', required: true },
    { name: 'sameDay', label: 'Recargo mismo día', type: 'money', required: true },
    { name: 'codPct', label: 'Comisión contra entrega (%)', type: 'number', min: 0, max: 10, step: 0.1, required: true }
  ],
  permissions: { create: ADMIN, edit: ADMIN, delete: ADMIN },
  canDelete: r => (db.count('companies', c => c.rateId === r.id) ? 'Hay empresas con esta tarifa' : true)
});

export const invoices = resource(app, {
  collection: 'invoices', id: 'facturas', singular: 'factura', plural: 'Facturación', icon: '🧾', feminine: true,
  title: f => f.code, subtitle: f => companyName(f.companyId),
  intro: 'Facturas mensuales por cliente empresa (envíos del período + IVA).',
  fields: [
    { name: 'code', label: 'Folio', form: false, search: true },
    { name: 'companyId', label: 'Cliente', type: 'ref', ref: 'companies', required: true, filter: true },
    { name: 'period', label: 'Período', required: true, placeholder: '2026-10' },
    { name: 'count', label: 'Envíos', type: 'number', min: 0, required: true },
    { name: 'total', label: 'Total (IVA incl.)', type: 'money', required: true },
    { name: 'due', label: 'Vence', type: 'date', required: true },
    { name: 'status', label: 'Estado', type: 'select', options: [['pendiente', 'Pendiente'], ['pagada', 'Pagada'], ['vencida', 'Vencida']], required: true, filter: true,
      render: v => ({ pendiente: '<span class="badge badge-warning">Pendiente</span>', pagada: '<span class="badge badge-success">Pagada</span>', vencida: '<span class="badge badge-danger">Vencida</span>' }[v] || '') }
  ],
  rows: ctx => db.query('invoices', f => ctx.user?.role !== 'remitente' || f.companyId === ctx.user.companyId),
  sort: (a, b) => String(b.period).localeCompare(String(a.period)),
  permissions: { create: ADMIN, edit: ADMIN, delete: ADMIN },
  beforeSave: (v, row) => (row ? v : { ...v, code: nextCode(db, 'fac', 'F-', 20410) }),
  rowActions: [{ id: 'pay', label: 'Registrar pago', icon: '✓', when: (f, ctx) => f.status !== 'pagada' && ctx?.user?.role === 'admin', run: f => { db.update('invoices', f.id, { status: 'pagada', paidAt: new Date().toISOString() }); db.log('factura', `${f.code}: pago registrado`, me()?.id); } }],
  count: () => db.count('invoices', f => f.status === 'vencida')
});

// ---------- Notificaciones (simuladas) ----------
export function notify(ship, channel, text) {
  db.insert('notifications', { shipmentId: ship.id, channel, to: channel === 'Email' ? ship.rEmail || '—' : ship.rPhone, text, at: new Date().toISOString() });
}
export { html, raw, money, escape, rut, DEPOT, xy, COMUNA };
