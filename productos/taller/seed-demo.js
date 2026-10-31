// Datos de DEMOSTRACIÓN del producto Taller, por módulo (PURO): personas, cuentas demo, OT, citas…
// Los catálogos (servicios, repuestos, proveedores) viven en seed.js. En builds de producción con
// data: 'empty', build-client reemplaza este archivo por funciones vacías: ni los nombres ni las cuentas
// demo llegan al código publicado. Cada función recibe ctx = { has(id), data, rng(n), mode }.
import { LABOR, PARTS, VEHICLES, STAGES } from '../../taller/js/data/catalog.js';

const DAY = 864e5;
const iso = t => new Date(t).toISOString();
const ymd = t => iso(t).slice(0, 10);
const FIRST = ['Ignacio', 'Valentina', 'Cristóbal', 'Francisca', 'Matías', 'Antonia', 'Felipe', 'Josefa', 'Rodrigo', 'Catalina', 'Gonzalo', 'Daniela', 'Sebastián', 'Constanza', 'Tomás', 'Macarena', 'Andrés', 'Paula'];
const LAST = ['Pérez', 'González', 'Muñoz', 'Rojas', 'Díaz', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Fuentes', 'Araya', 'Espinoza'];
const COMUNAS = ['Providencia', 'Ñuñoa', 'Las Condes', 'La Reina', 'Macul', 'San Joaquín', 'Santiago', 'La Florida'];
const PL = 'BCDFGHJKLPRSTVWXYZ';
const rutDV = n => { let s = 0, m = 2; for (const d of String(n).split('').reverse()) { s += +d * m; m = m === 7 ? 2 : m + 1; } const r = 11 - (s % 11); return r === 11 ? '0' : r === 10 ? 'K' : String(r); };
const fmtRut = n => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${rutDV(n)}`;
const user = (id, name, email, role, extra = {}) => ({ id, name, email, password: 'demo123', role, active: true, demo: true, color: extra.color || '#0b3d91', createdAt: iso(Date.now() - 400 * DAY), ...extra });
export const OT_TYPES = [['mecanica', 'Mecánica'], ['mantencion', 'Mantención'], ['electricidad', 'Electricidad'], ['carroceria', 'Desabolladura y pintura']];
const SYMPTOMS = [
  ['mantencion', 'Mantención de los 40.000 km según pauta.', 'Pauta 40.000 km realizada; bujías con desgaste normal.'],
  ['mecanica', 'Ruido metálico al frenar y vibración en el volante.', 'Pastillas delanteras agotadas y discos con alabeo.'],
  ['mecanica', 'El embrague patina en subidas.', 'Disco de embrague al límite de desgaste.'],
  ['mecanica', 'Golpeteo al pasar lomos de toro.', 'Amortiguadores delanteros sin carga y bujes cortados.'],
  ['electricidad', 'Testigo de batería encendido.', 'Alternador entrega 12,4 V en carga: regulador defectuoso.'],
  ['mecanica', 'El aire acondicionado no enfría.', 'Fuga en válvula de servicio, sistema sin gas.'],
  ['carroceria', 'Choque menor en estacionamiento: puerta trasera.', 'Abolladura de 12 cm en puerta trasera derecha.']
];

export function demoBase(ctx) {
  const r = ctx.rng(11);
  const leads = Array.from({ length: 6 }, (_, i) => ({ id: 'ld' + i, name: `${r.pick(FIRST)} ${r.pick(LAST)}`, email: `contacto${i}@correo.cl`, phone: `+56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}`, message: r.pick(['¿Cuánto cuesta la mantención de 20.000 km de un Yaris?', 'Necesito revisar los frenos esta semana.', '¿Trabajan con Seguros Cordillera?', 'Quiero cotizar pintura de un parachoques.']), status: i < 2 ? 'nuevo' : r.pick(['respondido', 'archivado']), createdAt: iso(Date.now() - (i * 19 + r.int(1, 9)) * 3600e3) }));
  return { users: [user('u-admin', 'Patricia Rojas', 'admin@losandes.cl', 'admin', { color: '#0b3d91' })], leads };
}

export function demoClientes(ctx) {
  const r = ctx.rng(22);
  const customers = [{ id: 'c-demo', name: 'Ignacio Pérez', rut: fmtRut(15873204), email: 'cliente@losandes.cl', phone: '+56 9 7712 4410', address: 'Los Leones 1420, Providencia', notes: 'Prefiere WhatsApp.', createdAt: iso(Date.now() - 700 * DAY) }];
  for (let i = 0; i < 28; i++) {
    const name = `${r.pick(FIRST)} ${r.pick(LAST)}`;
    customers.push({ id: 'c' + i, name, rut: fmtRut(r.int(7000000, 23000000)), email: name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(' ', '.') + i + '@correo.cl', phone: `+56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}`, address: r.pick(COMUNAS), notes: '', createdAt: iso(Date.now() - r.int(10, 900) * DAY) });
  }
  const plate = () => Array.from({ length: 4 }, () => r.pick(PL)).join('') + '-' + r.int(10, 99);
  const vehicles = [
    { id: 'v-demo1', customerId: 'c-demo', plate: 'PRWT-63', make: 'Hyundai', model: 'Tucson', year: 2019, km: 87400, color: 'Gris plata' },
    { id: 'v-demo2', customerId: 'c-demo', plate: 'HKLS-21', make: 'Mazda', model: '3', year: 2016, km: 121300, color: 'Rojo' }
  ];
  customers.slice(1).forEach((c, i) => { const [make, model] = r.pick(VEHICLES); vehicles.push({ id: 'v' + i, customerId: c.id, plate: plate(), make, model, year: r.int(2010, 2025), km: r.int(15, 220) * 1000, color: r.pick(['Blanco', 'Negro', 'Gris', 'Azul', 'Rojo']) }); });
  const users = [user('u-asesor', 'Camila Bustos', 'asesor@losandes.cl', 'asesor', { color: '#16a085' })];
  return { users, customers, vehicles };
}

export function demoAgenda(ctx) {
  const r = ctx.rng(33);
  const cs = ctx.data.customers || [], vs = ctx.data.vehicles || [], svcs = ctx.data.services || [];
  const slots = ['09:00', '10:00', '11:00', '12:00', '15:00', '16:00', '17:00'];
  const appointments = Array.from({ length: 16 }, (_, i) => {
    const day = i - 5; // de hace 5 días a 10 días más
    const c = i % 4 === 0 ? null : r.pick(cs), v = c && vs.find(x => x.customerId === c.id);
    const status = day < 0 ? r.pick(['atendida', 'atendida', 'no_asistio', 'cancelada']) : day === 0 ? r.pick(['confirmada', 'atendida']) : r.pick(['solicitada', 'confirmada', 'confirmada']);
    return { id: 'ap' + i, code: 'CITA-' + (5100 + i), customerId: c?.id || '', name: c?.name || `${r.pick(FIRST)} ${r.pick(LAST)}`, phone: c?.phone || `+56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}`, email: c?.email || '', plate: v?.plate || '', car: v ? `${v.make} ${v.model}` : r.pick(VEHICLES).join(' '), serviceId: r.pick(svcs)?.id || '', date: ymd(Date.now() + day * DAY), time: r.pick(slots), notes: r.pick(['', '', 'Viene con grúa', 'Dejará el auto todo el día']), status, createdAt: iso(Date.now() - (6 - Math.min(day, 5)) * DAY) };
  });
  appointments.push({ id: 'ap-demo', code: 'CITA-5199', customerId: 'c-demo', name: 'Ignacio Pérez', phone: '+56 9 7712 4410', email: 'cliente@losandes.cl', plate: 'HKLS-21', car: 'Mazda 3', serviceId: 'svc-scanner', date: ymd(Date.now() + 3 * DAY), time: '10:00', notes: 'Luz de motor encendida', status: 'confirmada', createdAt: iso(Date.now() - DAY) });
  return { appointments, '_seq:cita': 5199 };
}

export function demoOrdenes(ctx) {
  const r = ctx.rng(44);
  const mechs = [['u-mec', 'Juan Carrasco', 'mecanico@losandes.cl', 'Motor y transmisión', '#d68910'], ['u-m2', 'Pedro Lagos', 'plagos@losandes.cl', 'Frenos y suspensión', '#8e44ad'], ['u-m3', 'Luis Vera', 'lvera@losandes.cl', 'Electricidad', '#2e86c1']];
  const users = [user('u-jefe', 'Hernán Alarcón', 'jefe@losandes.cl', 'jefe', { color: '#c0392b' }), ...mechs.map(([id, name, email, specialty, color], i) => user(id, name, email, 'mecanico', { specialty, color, demo: i === 0 }))];
  const vs = ctx.data.vehicles || [];
  const path = STAGES.map(s => s[0]);
  const plan = [...Array(14).fill('entregado'), 'recepcion', 'recepcion', 'diagnostico', 'diagnostico', 'presupuesto', 'presupuesto', 'aprobado', 'reparacion', 'reparacion', 'reparacion', 'control', 'listo', 'listo'];
  let n = 24790;
  const ots = plan.map((stage, i) => {
    const v = i === plan.length - 6 ? vs[0] : i === 15 ? vs[1] : vs[2 + (i * 7) % Math.max(1, vs.length - 2)];
    const [type, symptom, dx] = r.pick(SYMPTOMS);
    const steps = path.slice(0, path.indexOf(stage) + 1);
    const start = Date.now() - (stage === 'entregado' ? r.int(6, 150) : r.int(1, 5)) * DAY;
    const history = steps.map((to, k) => ({ at: iso(start + k * r.int(3, 20) * 3600e3), from: k ? steps[k - 1] : null, to, by: k === 0 ? 'u-jefe' : k >= 4 && k <= 5 ? 'u-mec' : 'u-jefe', note: '' }));
    const idx = steps.length - 1;
    return { id: 'ot' + i, code: 'OT-' + (n++), customerId: v?.customerId || '', vehicleId: v?.id || '', plate: v?.plate || '', car: v ? `${v.make} ${v.model} ${v.year}` : '', km: v?.km || 0, type, symptom, diagnosis: idx >= 1 ? dx : '',
      mechanicId: idx >= 3 || stage === 'entregado' ? mechs[i % 3][0] : '', promisedAt: ymd(start + r.int(2, 6) * DAY), total: idx >= 2 ? r.int(8, 60) * 10000 : 0,
      status: stage, statusAt: history.at(-1).at, history, createdAt: history[0].at };
  });
  ots.find(o => o.status === 'reparacion').mechanicId = 'u-mec';
  return { users, ots, '_seq:ot': n - 1 };
}

const LINE = (kind, desc, qty, price) => ({ kind, desc, qty, price });
function quoteLines(r) {
  const out = [];
  for (let k = 0; k < r.int(1, 3); k++) { const l = r.pick(LABOR); out.push(LINE('mano', l[1], 1, Math.round(l[3] * 34000 / 10) * 10)); }
  for (let k = 0; k < r.int(1, 3); k++) { const p = r.pick(PARTS); out.push(LINE('repuesto', p[1], r.int(1, 2), p[3])); }
  return out;
}
export const quoteTotals = (lines = [], ivaPct = 19) => { const net = lines.reduce((s, l) => s + (+l.qty || 0) * (+l.price || 0), 0); const iva = Math.round(net * ivaPct / 100); return { net, iva, total: net + iva }; };

export function demoPresupuestos(ctx) {
  const r = ctx.rng(55);
  const ots = ctx.data.ots || [];
  const linked = ots.filter(o => ['presupuesto', 'aprobado', 'reparacion', 'control', 'listo'].includes(o.status));
  let n = 3400;
  const quotes = linked.map(o => {
    const lines = quoteLines(r);
    const status = o.status === 'presupuesto' ? 'enviado' : 'aprobado';
    return { id: 'q-' + o.id, code: 'PRE-' + (n++), customerId: o.customerId, vehicleId: o.vehicleId, otId: o.id, lines, ...quoteTotals(lines), validUntil: ymd(Date.now() + 10 * DAY), status, statusAt: o.statusAt, history: [{ at: o.createdAt, from: null, to: 'borrador', by: 'u-asesor', note: '' }, { at: o.statusAt, from: 'borrador', to: 'enviado', by: 'u-asesor', note: '' }, ...(status === 'aprobado' ? [{ at: o.statusAt, from: 'enviado', to: 'aprobado', by: null, note: '' }] : [])], createdAt: o.createdAt };
  });
  const cs = ctx.data.customers || [], vs = ctx.data.vehicles || [];
  for (let i = 0; i < (ctx.has('ordenes') ? 3 : 10); i++) {
    const c = i === 0 ? cs[0] : r.pick(cs), v = vs.find(x => x.customerId === c?.id), lines = quoteLines(r);
    const status = i === 0 ? 'enviado' : r.pick(['borrador', 'enviado', 'aprobado', 'rechazado']);
    quotes.push({ id: 'q' + i, code: 'PRE-' + (n++), customerId: c?.id || '', vehicleId: v?.id || '', otId: '', lines, ...quoteTotals(lines), validUntil: ymd(Date.now() + r.int(-3, 15) * DAY), status, statusAt: iso(Date.now() - r.int(1, 20) * DAY), history: [{ at: iso(Date.now() - 25 * DAY), from: null, to: 'borrador', by: 'u-asesor', note: '' }], createdAt: iso(Date.now() - r.int(1, 30) * DAY) });
  }
  return { quotes, '_seq:pre': n - 1 };
}

export function demoInventario() {
  return { users: [user('u-bod', 'Raúl Medina', 'bodega@losandes.cl', 'bodega', { color: '#7f8c8d' })] };
}

export function demoPortal() {
  return { users: [user('u-cli', 'Ignacio Pérez', 'cliente@losandes.cl', 'cliente', { customerId: 'c-demo', color: '#d35400' })] };
}

export function demoFacturacion(ctx) {
  const r = ctx.rng(77);
  let n = 18420;
  const src = ctx.has('ordenes') ? (ctx.data.ots || []).filter(o => o.status === 'entregado') : Array.from({ length: 14 }, (_, i) => ({ id: '', customerId: r.pick(ctx.data.customers || [{}]).id || '', code: '', total: r.int(5, 50) * 10000, statusAt: iso(Date.now() - r.int(2, 150) * DAY) }));
  const invoices = src.map((o, i) => {
    const total = o.total || r.int(5, 50) * 10000, net = Math.round(total / 1.19);
    return { id: 'inv' + i, number: n++, kind: r.bool(.25) ? 'factura' : 'boleta', customerId: o.customerId, otId: o.id || '', concept: o.code ? `Servicio ${o.code} · ${o.car}` : 'Servicio de taller', net, iva: total - net, total, method: r.pick(['debito', 'credito', 'transferencia', 'efectivo']), paid: i % 6 !== 5, issuedAt: ymd(o.statusAt), createdAt: o.statusAt };
  });
  return { invoices, '_seq:doc': n - 1 };
}
