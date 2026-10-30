// Datos semilla de Pits Rápido (cadena ficticia de lubricentros express). Reproducibles con rng().
import { rng } from '../../../assets/core/db.js';
import { MODELS, TASKS, UPSELLS, COLORS } from './catalog.js';
import { servicePrice, iso, addDays, fmtRut } from '../shared/pricing.js';

const OILS = [
  { id: '10w40', name: '10W-40 Semisintético', short: '10W-40', pricePerL: 7990, interval: 5000, desc: 'Autos con algunos años y motores simples.' },
  { id: '5w30', name: '5W-30 Sintético', short: '5W-30', pricePerL: 11990, interval: 10000, desc: 'El más usado en autos modernos y diésel livianos.' },
  { id: '0w20', name: '0W-20 Sintético', short: '0W-20', pricePerL: 13490, interval: 10000, desc: 'Japoneses modernos e híbridos: baja fricción.' },
  { id: '5w40e', name: '5W-40 Sintético Europa', short: '5W-40 EU', pricePerL: 15990, interval: 15000, desc: 'Norma VW 502 / MB 229.5 / BMW LL-01.' },
  { id: '15w40d', name: '15W-40 Diésel CK-4', short: '15W-40 D', pricePerL: 8990, interval: 7500, desc: 'Camionetas diésel de trabajo.' },
  { id: '0w40p', name: '0W-40 Alto desempeño', short: '0W-40', pricePerL: 21990, interval: 10000, desc: 'Deportivos y motores turbo exigentes.' }
];

const SERVICES = [
  { id: 'aceite', name: 'Cambio de aceite y filtro', cat: 'Lubricación', icon: '🛢️', mins: 30, oil: true, popular: true, prices: { city: 8990, sedan: 10990, suv: 13990, pickup: 15990, premium: 24990 }, desc: 'Aceite recomendado para tu motor, filtro nuevo, revisión de 12 niveles y sticker de próximo cambio.' },
  { id: 'filtros', name: 'Filtros de aire y cabina', cat: 'Lubricación', icon: '💨', mins: 15, prices: { city: 14990, sedan: 16990, suv: 19990, pickup: 21990, premium: 34990 }, desc: 'Mejor consumo y aire limpio en la cabina.' },
  { id: 'frenos', name: 'Pastillas de freno (eje)', cat: 'Frenos', icon: '🛑', mins: 60, popular: true, prices: { city: 39990, sedan: 44990, suv: 54990, pickup: 59990, premium: 99990 }, desc: 'Pastillas cerámicas, medición de discos y prueba de frenado.' },
  { id: 'liquido-frenos', name: 'Cambio de líquido de frenos', cat: 'Frenos', icon: '💧', mins: 30, prices: { city: 19990, sedan: 21990, suv: 24990, pickup: 26990, premium: 39990 }, desc: 'DOT 4 con purga completa del circuito.' },
  { id: 'neumaticos', name: 'Montaje y balanceo 4 neumáticos', cat: 'Neumáticos', icon: '🛞', mins: 45, prices: { city: 19990, sedan: 23990, suv: 27990, pickup: 31990, premium: 49990 }, desc: 'Montaje, válvulas nuevas y balanceo computarizado (neumáticos aparte).' },
  { id: 'rotacion', name: 'Rotación de neumáticos', cat: 'Neumáticos', icon: '🔄', mins: 20, prices: { city: 7990, sedan: 8990, suv: 9990, pickup: 11990, premium: 15990 }, desc: 'Desgaste parejo y mayor vida útil.' },
  { id: 'alineacion', name: 'Alineación y balanceo', cat: 'Neumáticos', icon: '🎯', mins: 40, popular: true, prices: { city: 19990, sedan: 22990, suv: 27990, pickup: 32990, premium: 44990 }, desc: 'Alineadora 3D con reporte impreso antes/después.' },
  { id: 'bateria', name: 'Test y cambio de batería', cat: 'Batería', icon: '🔋', mins: 20, prices: { city: 69990, sedan: 79990, suv: 94990, pickup: 109990, premium: 189990 }, desc: 'Incluye batería libre de mantención con 18 meses de garantía.' },
  { id: 'pretecnica', name: 'Revisión pre-técnica 40 puntos', cat: 'Revisión', icon: '📋', mins: 30, prices: { city: 14990, sedan: 14990, suv: 16990, pickup: 18990, premium: 24990 }, desc: 'Llega tranquilo a la planta de revisión técnica.' },
  { id: 'refrigerante', name: 'Cambio de refrigerante', cat: 'Lubricación', icon: '🌡️', mins: 30, prices: { city: 24990, sedan: 27990, suv: 31990, pickup: 34990, premium: 49990 }, desc: 'Refrigerante orgánico de larga duración.' },
  { id: 'scanner', name: 'Escáner de fallas OBD2', cat: 'Revisión', icon: '🖥️', mins: 15, prices: { city: 12990, sedan: 12990, suv: 14990, pickup: 14990, premium: 24990 }, desc: 'Lectura de códigos de falla e informe simple.' },
  { id: 'lavado', name: 'Lavado exterior + aspirado', cat: 'Lavado', icon: '🫧', mins: 30, prices: { city: 7990, sedan: 8990, suv: 10990, pickup: 12990, premium: 14990 }, desc: 'Mientras esperas: espuma activa, secado y aspirado.' }
].map((s, i) => ({ ...s, order: i, active: true, tasks: TASKS[s.id] }));

const BRANCHES = [
  { id: 'b1', name: 'Providencia', address: 'Av. Nueva Providencia 2155, Providencia', phone: '+56 2 2940 1100', hours: 'Lun–Vie 8:30–19:30 · Sáb 9:00–14:00', open: '08:30', close: '19:30', satClose: '14:00', active: true, bays: 4 },
  { id: 'b2', name: 'Las Condes', address: 'Av. Apoquindo 7340, Las Condes', phone: '+56 2 2940 1200', hours: 'Lun–Vie 8:30–19:30 · Sáb 9:00–14:00', open: '08:30', close: '19:30', satClose: '14:00', active: true, bays: 5 },
  { id: 'b3', name: 'Maipú', address: 'Av. Pajaritos 3021, Maipú', phone: '+56 2 2940 1300', hours: 'Lun–Vie 8:30–19:00 · Sáb 9:00–14:00', open: '08:30', close: '19:00', satClose: '14:00', active: true, bays: 3 },
  { id: 'b4', name: 'Viña del Mar', address: 'Av. Libertad 1180, Viña del Mar', phone: '+56 32 294 1400', hours: 'Lun–Vie 9:00–19:00 · Sáb 9:00–14:00', open: '09:00', close: '19:00', satClose: '14:00', active: true, bays: 4 }
];
const BAY_TYPES = ['Fosa rápida', 'Elevador', 'Elevador', 'Alineadora', 'Fosa rápida'];

const SUPPLIERS = [
  { id: 'sp1', name: 'Lubricantes Cordillera SpA', contact: 'ventas@lubcordillera.cl', phone: '+56 2 2555 0101', cat: 'Aceites' },
  { id: 'sp2', name: 'FiltraMax Chile', contact: 'pedidos@filtramax.cl', phone: '+56 2 2555 0202', cat: 'Filtros' },
  { id: 'sp3', name: 'VoltaCell Baterías', contact: 'b2b@voltacell.cl', phone: '+56 2 2555 0303', cat: 'Baterías' },
  { id: 'sp4', name: 'RutaSur Neumáticos', contact: 'mayorista@rutasur.cl', phone: '+56 2 2555 0404', cat: 'Neumáticos' },
  { id: 'sp5', name: 'Frenotec Repuestos', contact: 'ventas@frenotec.cl', phone: '+56 2 2555 0505', cat: 'Frenos' }
];

// [sku, nombre, categoría, unidad, precio, costo, mínimo, base de stock, proveedor, aceite]
const PRODUCTS = [
  ['AC-1040', 'Aceite Cóndor 10W-40 semisintético', 'Aceites', 'L', 7990, 3900, 40, 120, 'sp1', '10w40'],
  ['AC-0530', 'Aceite Cóndor 5W-30 sintético', 'Aceites', 'L', 11990, 5600, 60, 200, 'sp1', '5w30'],
  ['AC-0020', 'Aceite Cóndor 0W-20 sintético', 'Aceites', 'L', 13490, 6400, 60, 180, 'sp1', '0w20'],
  ['AC-0540', 'Aceite Cóndor 5W-40 Europa', 'Aceites', 'L', 15990, 7800, 30, 90, 'sp1', '5w40e'],
  ['AC-1540', 'Aceite Cóndor 15W-40 Diésel CK-4', 'Aceites', 'L', 8990, 4300, 40, 120, 'sp1', '15w40d'],
  ['AC-0040', 'Aceite Cóndor Racing 0W-40', 'Aceites', 'L', 21990, 11200, 12, 30, 'sp1', '0w40p'],
  ['FL-OIL-A', 'Filtro de aceite FiltraMax (línea asiática)', 'Filtros', 'un', 5990, 1900, 30, 70, 'sp2'],
  ['FL-OIL-E', 'Filtro de aceite FiltraMax (línea europea)', 'Filtros', 'un', 9990, 3400, 12, 30, 'sp2'],
  ['FL-AIR', 'Filtro de aire FiltraMax', 'Filtros', 'un', 8990, 2900, 20, 45, 'sp2'],
  ['FL-CAB', 'Filtro de cabina carbón activado', 'Filtros', 'un', 9990, 3100, 15, 35, 'sp2'],
  ['BT-45', 'Batería VoltaCell 45 Ah', 'Baterías', 'un', 64990, 38000, 4, 10, 'sp3'],
  ['BT-60', 'Batería VoltaCell 60 Ah', 'Baterías', 'un', 79990, 46000, 5, 12, 'sp3'],
  ['BT-75', 'Batería VoltaCell 75 Ah', 'Baterías', 'un', 94990, 55000, 4, 10, 'sp3'],
  ['BT-90A', 'Batería VoltaCell 90 Ah AGM', 'Baterías', 'un', 189990, 112000, 2, 5, 'sp3'],
  ['NE-1757013', 'Neumático RutaSur 175/70 R13', 'Neumáticos', 'un', 42990, 26000, 8, 24, 'sp4'],
  ['NE-1856515', 'Neumático RutaSur 185/65 R15', 'Neumáticos', 'un', 54990, 33000, 8, 24, 'sp4'],
  ['NE-2055516', 'Neumático RutaSur 205/55 R16', 'Neumáticos', 'un', 69990, 42000, 8, 24, 'sp4'],
  ['NE-2256517', 'Neumático RutaSur 225/65 R17', 'Neumáticos', 'un', 94990, 58000, 8, 20, 'sp4'],
  ['NE-2657016', 'Neumático RutaSur 265/70 R16 A/T', 'Neumáticos', 'un', 119990, 74000, 4, 16, 'sp4'],
  ['NE-2454019', 'Neumático RutaSur Sport 245/40 R19', 'Neumáticos', 'un', 189990, 118000, 4, 8, 'sp4'],
  ['FR-PAST-A', 'Pastillas cerámicas Frenotec (eje, asiático)', 'Frenos', 'jgo', 29990, 14000, 6, 16, 'sp5'],
  ['FR-PAST-E', 'Pastillas cerámicas Frenotec (eje, europeo)', 'Frenos', 'jgo', 59990, 31000, 3, 8, 'sp5'],
  ['FR-DOT4', 'Líquido de frenos DOT 4 (1 L)', 'Frenos', 'un', 8990, 3300, 10, 24, 'sp5'],
  ['RF-ORG', 'Refrigerante orgánico (4 L)', 'Otros', 'un', 16990, 7000, 8, 20, 'sp1'],
  ['PL-UNI', 'Plumillas limpiaparabrisas (par)', 'Otros', 'par', 14990, 5200, 10, 26, 'sp2']
];

const FIRST = ['Javiera', 'Matías', 'Catalina', 'Benjamín', 'Sofía', 'Vicente', 'Antonia', 'Agustín', 'Isidora', 'Tomás', 'Florencia', 'Martín', 'Josefa', 'Lucas', 'Fernanda', 'Diego', 'Constanza', 'Sebastián', 'Valentina', 'Joaquín', 'Camila', 'Felipe', 'Daniela', 'Cristóbal', 'Francisca', 'Nicolás', 'Paz', 'Ignacio', 'Trinidad', 'Gonzalo', 'Macarena', 'Rodrigo', 'Bárbara', 'Pablo', 'Carla', 'Héctor', 'Marcela', 'Patricio', 'Verónica', 'Jorge'];
const LAST = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López', 'Fuentes', 'Hernández', 'Torres', 'Araya', 'Flores', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Gutiérrez', 'Castro', 'Pizarro', 'Álvarez', 'Vásquez', 'Sánchez', 'Fernández', 'Carrasco', 'Gómez', 'Cortés', 'Herrera', 'Núñez', 'Jara', 'Vergara', 'Rivera', 'Figueroa', 'Riquelme'];
const COMUNAS = ['Providencia', 'Ñuñoa', 'Las Condes', 'Vitacura', 'La Reina', 'Maipú', 'Santiago', 'Peñalolén', 'Macul', 'Viña del Mar', 'Valparaíso', 'Concón', 'Quilpué', 'Lo Barnechea', 'Cerrillos'];
const PL = 'BCDFGHJKLPRSTVWXYZ';

export function seed() {
  const r = rng(20261);
  const now = Date.now();
  const T = iso(now);
  const plateNew = () => Array.from({ length: 4 }, () => r.pick(PL)).join('') + '-' + String(r.int(10, 99));
  const plateOld = () => Array.from({ length: 2 }, () => r.pick(PL)).join('') + '-' + String(r.int(1000, 9999));
  const usedPlates = new Set(['KJTR-45', 'BBCL-12']);
  const newPlate = () => { let p; do { p = r.bool(.75) ? plateNew() : plateOld(); } while (usedPlates.has(p)); usedPlates.add(p); return p; };

  // ---------- Bahías ----------
  const bays = [];
  BRANCHES.forEach(b => { for (let i = 1; i <= b.bays; i++) bays.push({ id: `${b.id}-y${i}`, branchId: b.id, name: `Bahía ${i}`, type: BAY_TYPES[(i - 1) % BAY_TYPES.length], active: true }); });

  // ---------- Usuarios y personal ----------
  const pat = k => k === 'a' ? ['M', 'M', 'M', 'T', 'T', 'M', 'L'] : k === 'b' ? ['T', 'T', 'T', 'M', 'M', 'L', 'L'] : ['C', 'M', 'T', 'C', 'M', 'M', 'L'];
  const staff = [
    ['u-admin', 'Carolina Fuentes', 'admin@pitsrapido.cl', 'admin', null, true],
    ['u-jefe', 'Rodrigo Muñoz', 'jefe@pitsrapido.cl', 'jefe', 'b1', true],
    ['u-recep', 'Daniela Soto', 'recepcion@pitsrapido.cl', 'recepcion', 'b1', true],
    ['u-tec', 'Felipe Araya', 'tecnico@pitsrapido.cl', 'tecnico', 'b1', true],
    ['u-t2', 'Bastián Rojas', 'brojas@pitsrapido.cl', 'tecnico', 'b1'],
    ['u-t3', 'Luis Carrasco', 'lcarrasco@pitsrapido.cl', 'tecnico', 'b1'],
    ['u-j2', 'Paula Herrera', 'pherrera@pitsrapido.cl', 'jefe', 'b2'],
    ['u-r2', 'Camila Vergara', 'cvergara@pitsrapido.cl', 'recepcion', 'b2'],
    ['u-t4', 'Matías Contreras', 'mcontreras@pitsrapido.cl', 'tecnico', 'b2'],
    ['u-t5', 'Joaquín Pizarro', 'jpizarro@pitsrapido.cl', 'tecnico', 'b2'],
    ['u-t6', 'Ignacio Tapia', 'itapia@pitsrapido.cl', 'tecnico', 'b2'],
    ['u-j3', 'Cristián Lagos', 'clagos@pitsrapido.cl', 'jefe', 'b3'],
    ['u-r3', 'Fernanda Núñez', 'fnunez@pitsrapido.cl', 'recepcion', 'b3'],
    ['u-t7', 'Diego Valenzuela', 'dvalenzuela@pitsrapido.cl', 'tecnico', 'b3'],
    ['u-t8', 'Sebastián Fuentes', 'sfuentes@pitsrapido.cl', 'tecnico', 'b3'],
    ['u-j4', 'Andrea Castillo', 'acastillo@pitsrapido.cl', 'jefe', 'b4'],
    ['u-r4', 'Valentina Reyes', 'vreyes@pitsrapido.cl', 'recepcion', 'b4'],
    ['u-t9', 'Tomás Gallardo', 'tgallardo@pitsrapido.cl', 'tecnico', 'b4'],
    ['u-t10', 'Benjamín Silva', 'bsilva@pitsrapido.cl', 'tecnico', 'b4']
  ];
  const users = staff.map(([id, name, email, role, branchId, demo], i) => ({ id, name, email, password: 'demo123', role, branchId, demo: !!demo, active: true, color: COLORS[i % COLORS.length], phone: `+56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}`, shifts: role === 'admin' ? ['M', 'M', 'M', 'M', 'M', 'L', 'L'] : pat(['a', 'b', 'c'][i % 3]), createdAt: new Date(now - r.int(120, 900) * 864e5).toISOString() }));
  const techsOf = b => users.filter(u => u.role === 'tecnico' && u.branchId === b).map(u => u.id);

  // ---------- Clientes y vehículos ----------
  const customers = [], vehicles = [];
  const mkModel = () => r.pick(MODELS);
  const vehFrom = (m, year, plate, customerId, km) => ({ id: 'v' + vehicles.length, plate, customerId, modelId: m.id, make: m.make, model: m.model, year, segment: m.segment, oil: m.oil, liters: m.liters, km, nextDueKm: 0, nextDueDate: '', lastServiceAt: '', history: [], createdAt: new Date(now - r.int(30, 700) * 864e5).toISOString() });
  // Cliente demo con historial rico
  customers.push({ id: 'c-demo', name: 'Javiera Morales', rut: fmtRut(16482937), email: 'cliente@pitsrapido.cl', phone: '+56 9 8123 4567', comuna: 'Providencia', optSms: true, optWa: true, optEmail: true, notes: 'Prefiere WhatsApp. Cliente desde 2022.', createdAt: new Date(now - 980 * 864e5).toISOString() });
  const rav = MODELS.find(m => m.model === 'RAV4'), swift = MODELS.find(m => m.model === 'Swift');
  vehicles.push(vehFrom(rav, 2019, 'KJTR-45', 'c-demo', 68400));
  vehicles.push(vehFrom(swift, 2017, 'BBCL-12', 'c-demo', 92100));
  for (let i = 0; i < 118; i++) {
    const name = `${r.pick(FIRST)} ${r.pick(LAST)} ${r.pick(LAST)}`.split(' ').slice(0, r.bool(.6) ? 2 : 3).join(' ');
    const id = 'c' + i;
    const mail = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(' ').slice(0, 2).join('.') + (i % 7 ? '' : i) + '@' + r.pick(['gmail.com', 'outlook.com', 'yahoo.es', 'icloud.com', 'empresa.cl']);
    customers.push({ id, name, rut: fmtRut(r.int(8000000, 24000000)), email: mail, phone: `+56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}`, comuna: r.pick(COMUNAS), optSms: r.bool(.7), optWa: r.bool(.8), optEmail: r.bool(.5), notes: '', company: r.bool(.08) ? r.pick(['Transportes Quilín Ltda.', 'Constructora Andalién', 'Agrícola Los Maitenes']) : '', createdAt: new Date(now - r.int(10, 1200) * 864e5).toISOString() });
    const nv = r.bool(.18) ? 2 : 1;
    for (let k = 0; k < nv; k++) { const m = mkModel(); vehicles.push(vehFrom(m, r.int(Math.max(m.from, 2010), Math.min(m.to, 2025)), newPlate(), id, r.int(12, 190) * 1000)); }
  }
  const custOf = v => customers.find(c => c.id === v.customerId);

  // ---------- Historial antiguo en cada vehículo ----------
  let folio = 184200;
  const oilOf = id => OILS.find(o => o.id === id);
  vehicles.forEach(v => {
    const n = v.customerId === 'c-demo' ? 5 : r.int(1, 3);
    let km = v.km;
    let days = r.int(60, 160);
    const h = [];
    for (let k = 0; k < n; k++) {
      km -= oilOf(v.oil).interval * (r.int(80, 110) / 100);
      if (km < 3000) break;
      const sv = ['aceite', ...(r.bool(.3) ? [r.pick(['filtros', 'rotacion', 'alineacion', 'lavado', 'pretecnica'])] : [])];
      const total = sv.reduce((s, id) => s + servicePrice(SERVICES.find(x => x.id === id), v, OILS), 0);
      h.push({ d: iso(now - days * 864e5), km: Math.round(km / 100) * 100, s: sv.map(id => SERVICES.find(x => x.id === id).name).join(' + '), t: total, b: r.pick(BRANCHES).id, f: folio++ });
      days += r.int(120, 220);
    }
    v.history = h;
  });

  // ---------- Atenciones (jobs) ----------
  const jobs = [];
  let code = 41200;
  const atMin = (dayIso, mins) => { const [y, m, d] = dayIso.split('-').map(Number); return new Date(y, m - 1, d, 0, mins).toISOString(); };
  const pickServices = () => {
    const list = r.bool(.78) ? ['aceite'] : [r.pick(['alineacion', 'frenos', 'neumaticos', 'bateria', 'pretecnica', 'lavado', 'scanner'])];
    if (r.bool(.28)) { const x = r.pick(['filtros', 'rotacion', 'lavado', 'alineacion', 'pretecnica']); if (!list.includes(x)) list.push(x); }
    return list;
  };
  const items = (sv, v) => sv.map(id => { const s = SERVICES.find(x => x.id === id); return { s: id, n: s.name, p: servicePrice(s, v, OILS) }; });
  const est = sv => sv.reduce((s, id) => s + SERVICES.find(x => x.id === id).mins, 0);
  const makeJob = (o) => {
    const v = o.vehicle;
    const sv = o.services;
    const it = items(sv, v);
    const ups = [];
    if (o.upsell) {
      const u = r.pick(UPSELLS.filter(x => !x.serviceId || !sv.includes(x.serviceId)));
      const p = u.serviceId ? servicePrice(SERVICES.find(x => x.id === u.serviceId), v, OILS) : u.price;
      const st = o.upsellState || (r.bool(.46) ? 'aprobado' : 'rechazado');
      ups.push({ id: 'up' + jobs.length, label: u.label, s: u.serviceId || '', p, st, icon: u.icon });
      if (st === 'aprobado') it.push({ s: u.serviceId || 'extra', n: u.serviceId ? SERVICES.find(x => x.id === u.serviceId).name : u.label, p, up: true });
    }
    const total = it.reduce((s, x) => s + x.p, 0);
    const j = { id: 'j' + jobs.length, code: 'PR-' + (code++), branchId: o.branchId, bayId: o.bayId || '', vehicleId: v.id, customerId: v.customerId, plate: v.plate, car: `${v.make} ${v.model} ${v.year}`, segment: v.segment, items: it, upsells: ups, tasks: [], status: o.status, source: o.source, bookedFor: o.bookedFor || '', arrivedAt: o.arrivedAt || '', startedAt: o.startedAt || '', doneAt: o.doneAt || '', paidAt: o.paidAt || '', km: o.km || v.km, techId: o.techId || '', est: est(sv) + (ups.some(u => u.st === 'aprobado') ? 20 : 0), discount: 0, coupon: '', total, pay: null, photos: o.photos ?? r.int(0, 4), notes: o.notes || '', createdAt: o.createdAt || o.arrivedAt || o.bookedFor || new Date(now).toISOString() };
    if (o.status === 'pagado') { j.pay = { m: r.pick(['debito', 'debito', 'credito', 'efectivo', 'transferencia']), folio: folio++ }; }
    jobs.push(j);
    return j;
  };
  const baseCars = { b1: 11, b2: 13, b3: 8, b4: 9 };
  // Últimos 12 días con detalle
  for (let d = 12; d >= 1; d--) {
    const day = addDays(T, -d), dow = new Date(day + 'T12:00').getDay();
    if (dow === 0) continue;
    BRANCHES.forEach(b => {
      const n = Math.round(baseCars[b.id] * (dow === 6 ? .55 : 1) * (.75 + r() * .5));
      for (let k = 0; k < n; k++) {
        const v = r.pick(vehicles.slice(2)), sv = pickServices();
        const open = b.id === 'b4' ? 540 : 510, close = dow === 6 ? 840 : 1140;
        const arr = r.int(open, close - 60), wait = r.int(2, 28), dur = est(sv) + r.int(-5, 15);
        const booked = r.bool(.42);
        const fail = booked && r.bool(.06);
        makeJob({ vehicle: v, services: sv, branchId: b.id, bayId: `${b.id}-y${r.int(1, b.bays)}`, techId: r.pick(techsOf(b.id)), source: booked ? 'web' : r.pick(['walkin', 'walkin', 'llegue']), status: fail ? r.pick(['cancelado', 'no-show']) : 'pagado', bookedFor: booked ? atMin(day, Math.round(arr / 30) * 30) : '', arrivedAt: fail ? '' : atMin(day, arr), startedAt: fail ? '' : atMin(day, arr + wait), doneAt: fail ? '' : atMin(day, arr + wait + dur), paidAt: fail ? '' : atMin(day, arr + wait + dur + r.int(3, 12)), upsell: !fail && r.bool(.36), km: v.km - r.int(100, 900) });
      }
    });
  }
  // Hoy: operación en vivo, relativa a la hora actual
  const ago = m => new Date(now - m * 6e4).toISOString();
  const ahead = m => { const t = new Date(now + m * 6e4); t.setMinutes(Math.ceil(t.getMinutes() / 30) * 30, 0, 0); return t.toISOString(); };
  const demoRav = vehicles[0], demoSwift = vehicles[1];
  BRANCHES.forEach(b => {
    const pool = vehicles.slice(2).filter((_, i) => i % 4 === +b.id.slice(1) - 1);
    let pi = r.int(0, 20);
    const nextV = () => pool[(pi++) % pool.length];
    const tech = techsOf(b.id);
    // Atendidos y pagados más temprano
    for (let k = 0; k < r.int(4, 7); k++) {
      const v = nextV(), sv = pickServices(), a = r.int(120, 420);
      makeJob({ vehicle: v, services: sv, branchId: b.id, bayId: `${b.id}-y${r.int(1, b.bays)}`, techId: r.pick(tech), source: r.pick(['web', 'walkin', 'llegue']), status: 'pagado', arrivedAt: ago(a), startedAt: ago(a - 10), doneAt: ago(a - 10 - est(sv)), paidAt: ago(a - 18 - est(sv)), upsell: r.bool(.4) });
    }
    // Listo para retiro
    { const v = nextV(); makeJob({ vehicle: v, services: ['aceite'], branchId: b.id, bayId: '', techId: r.pick(tech), source: 'walkin', status: 'listo', arrivedAt: ago(70), startedAt: ago(58), doneAt: ago(12), upsell: r.bool(.5) }); }
    // En bahía ahora (deja una libre en Maipú)
    const busy = b.id === 'b3' ? 1 : b.bays - 1;
    for (let k = 1; k <= busy; k++) {
      const isDemo = b.id === 'b1' && k === 1;
      const v = isDemo ? demoRav : nextV();
      const sv = isDemo ? ['aceite', 'rotacion'] : pickServices();
      const started = r.int(6, 34);
      const j = makeJob({ vehicle: v, services: sv, branchId: b.id, bayId: `${b.id}-y${k}`, techId: isDemo ? 'u-tec' : tech[k % tech.length], source: isDemo ? 'web' : r.pick(['web', 'walkin', 'llegue']), status: 'en-bahia', bookedFor: isDemo ? ago(30) : '', arrivedAt: ago(started + r.int(4, 14)), startedAt: ago(isDemo ? 22 : started), upsell: isDemo || r.bool(.35), upsellState: 'pendiente', km: isDemo ? 68400 : v.km + r.int(1000, 6000), photos: 4 });
      if (isDemo) { j.upsells = [{ id: 'up-demo', label: 'Pastillas de freno delanteras al 20%', s: 'frenos', p: servicePrice(SERVICES.find(x => x.id === 'frenos'), v, OILS), st: 'pendiente', icon: '🛑', note: 'Quedan ~3 mm. Recomendamos cambiarlas en este servicio.' }]; j.notes = 'Cliente espera en sala. Pidió revisar ruido al frenar.'; }
      const tasks = sv.flatMap(id => SERVICES.find(x => x.id === id).tasks);
      const doneN = Math.min(tasks.length - 1, Math.floor(tasks.length * Math.min(.9, (isDemo ? 22 : started) / j.est)));
      j.tasks = tasks.map((t, i) => ({ t, d: i < doneN }));
    }
    // En fila
    for (let k = 0; k < (b.id === 'b2' ? 3 : b.id === 'b3' ? 0 : r.int(1, 2)); k++) {
      const v = nextV(); makeJob({ vehicle: v, services: pickServices(), branchId: b.id, source: r.pick(['walkin', 'llegue', 'web']), status: 'en-fila', arrivedAt: ago(r.int(2, 16)), photos: r.int(0, 2) });
    }
    // Reservas de más tarde y próximos días
    for (let k = 0; k < r.int(3, 5); k++) { const v = nextV(); makeJob({ vehicle: v, services: pickServices(), branchId: b.id, source: 'web', status: 'reservado', bookedFor: ahead(r.int(1, 8) * 40) }); }
    for (let d = 1; d <= 6; d++) for (let k = 0; k < r.int(1, 4); k++) {
      const v = nextV(), day = addDays(T, d); if (new Date(day + 'T12:00').getDay() === 0) continue;
      makeJob({ vehicle: v, services: pickServices(), branchId: b.id, source: r.bool(.8) ? 'web' : 'telefono', status: 'reservado', bookedFor: atMin(day, 570 + r.int(0, 16) * 30), createdAt: ago(r.int(60, 4000)) });
    }
  });
  // Swift de la clienta demo: reserva en 3 días
  makeJob({ vehicle: demoSwift, services: ['aceite', 'alineacion'], branchId: 'b1', source: 'web', status: 'reservado', bookedFor: atMin(addDays(T, 3), 600), createdAt: ago(1500) });
  // Últimos servicios de la clienta (pagados dentro del detalle)
  { const d = addDays(T, -9); makeJob({ vehicle: demoSwift, services: ['lavado'], branchId: 'b1', bayId: 'b1-y2', techId: 'u-t2', source: 'walkin', status: 'pagado', arrivedAt: atMin(d, 660), startedAt: atMin(d, 668), doneAt: atMin(d, 700), paidAt: atMin(d, 706), km: 91800 }); }

  // Vehículos: próximo mantenimiento según último servicio
  vehicles.forEach(v => {
    const last = jobs.filter(j => j.vehicleId === v.id && j.status === 'pagado' && j.items.some(i => i.s === 'aceite')).sort((a, b) => b.paidAt.localeCompare(a.paidAt))[0];
    const lastD = last ? iso(last.paidAt) : v.history[0]?.d;
    const lastKm = last ? last.km : v.history[0]?.km || v.km;
    v.lastServiceAt = lastD || '';
    v.nextDueKm = Math.round((lastKm + oilOf(v.oil).interval) / 100) * 100;
    v.nextDueDate = lastD ? addDays(lastD, 180) : addDays(T, r.int(-40, 90));
  });

  // ---------- Historial agregado (meses anteriores) ----------
  const dailyStats = [];
  for (let d = 180; d >= 13; d--) {
    const day = addDays(T, -d), dt = new Date(day + 'T12:00'), dow = dt.getDay();
    if (dow === 0) continue;
    const season = 1 + .12 * Math.sin((dt.getMonth() + 2) / 12 * Math.PI * 2) + (180 - d) / 1400;
    BRANCHES.forEach(b => {
      const cars = Math.max(2, Math.round(baseCars[b.id] * (dow === 6 ? .55 : dow === 1 ? 1.12 : 1) * season * (.78 + r() * .44)));
      const ticket = 41000 + r.int(-4000, 9000) + (b.id === 'b2' ? 7000 : 0);
      const upO = Math.round(cars * (.3 + r() * .12)), upA = Math.round(upO * (.36 + r() * .2));
      dailyStats.push({ d: day, b: b.id, cars, rev: cars * ticket, wait: r.int(6, 24) + (b.id === 'b2' ? 3 : 0), upO, upA, bayMin: cars * r.int(34, 46) });
    });
  }

  // ---------- Stock ----------
  const products = PRODUCTS.map(([sku, name, cat, unit, price, cost, min, base, supplierId, oil], i) => ({ id: 'p' + i, sku, name, cat, unit, price, cost, min, supplierId, oil: oil || '', active: true, stock: Object.fromEntries(BRANCHES.map(b => [b.id, Math.max(0, Math.round(base * (.25 + r() * 1.1)))])) }));
  products.find(p => p.sku === 'BT-60').stock.b3 = 2;
  products.find(p => p.sku === 'AC-0020').stock.b2 = 38;
  products.find(p => p.sku === 'FL-OIL-E').stock.b1 = 5;
  const pos = [];
  const posSpec = [['sp1', 'b2', 'enviada', 3], ['sp2', 'b1', 'borrador', 0], ['sp3', 'b3', 'recibida', 12], ['sp4', 'b4', 'recibida', 20], ['sp1', 'b1', 'recibida', 25], ['sp5', 'b2', 'enviada', 2], ['sp2', 'b3', 'cancelada', 30]];
  posSpec.forEach(([sid, bid, status, daysAgo], i) => {
    const prods = products.filter(p => p.supplierId === sid);
    const lines = prods.slice(0, r.int(2, Math.min(4, prods.length))).map(p => ({ productId: p.id, qty: p.unit === 'L' ? r.int(4, 12) * 20 : r.int(4, 20), cost: p.cost }));
    pos.push({ id: 'po' + i, code: 'OC-' + (3310 + i), supplierId: sid, branchId: bid, status, lines, total: lines.reduce((s, l) => s + l.qty * l.cost, 0), notes: '', createdAt: new Date(now - (daysAgo + 2) * 864e5).toISOString(), receivedAt: status === 'recibida' ? new Date(now - daysAgo * 864e5).toISOString() : '' });
  });

  // ---------- Planes ----------
  const P = (svcs, f) => Object.fromEntries(['city', 'sedan', 'suv', 'pickup', 'premium'].map(seg => {
    const veh = { segment: seg, oil: seg === 'premium' ? '5w40e' : seg === 'pickup' ? '15w40d' : '5w30', liters: { city: 3.4, sedan: 3.8, suv: 4.6, pickup: 7, premium: 5.6 }[seg] };
    const full = svcs.reduce((s, [id, q]) => s + q * servicePrice(SERVICES.find(x => x.id === id), veh, OILS), 0);
    return [seg, Math.round(full * f / 1000) * 1000 - 10];
  }));
  const planDefs = [
    { id: 'pl-duo', name: 'Plan Dúo', tag: 'Para el auto del día a día', icon: '🛢️', months: 12, includes: [['aceite', 2], ['lavado', 2]], f: .85, popular: false },
    { id: 'pl-anual', name: 'Plan Anual Total', tag: 'Todo el año cubierto', icon: '⭐', months: 12, includes: [['aceite', 3], ['alineacion', 2], ['rotacion', 2], ['pretecnica', 1], ['lavado', 3]], f: .78, popular: true },
    { id: 'pl-ruta', name: 'Plan Ruta Larga', tag: 'Para quienes manejan mucho', icon: '🛣️', months: 18, includes: [['aceite', 5], ['filtros', 2], ['alineacion', 2], ['liquido-frenos', 1]], f: .8, popular: false },
    { id: 'pl-flota', name: 'Plan Flota Pyme', tag: 'Camionetas de trabajo', icon: '🚚', months: 12, includes: [['aceite', 6], ['alineacion', 3], ['scanner', 2]], f: .74, popular: false, b2b: true }
  ];
  const plans = planDefs.map((p, i) => ({ id: p.id, name: p.name, tag: p.tag, icon: p.icon, months: p.months, includes: p.includes.map(([s, q]) => ({ s, q })), prices: P(p.includes, p.f), savePct: Math.round((1 - p.f) * 100), popular: p.popular, active: true, order: i, desc: `${p.includes.map(([s, q]) => `${q}× ${SERVICES.find(x => x.id === s).name.toLowerCase()}`).join(', ')}. Válido ${p.months} meses en todas las sucursales.` }));
  const planPurchases = [];
  const addPP = (cust, veh, plan, daysAgo, usedFrac) => {
    const remaining = Object.fromEntries(plan.includes.map(x => [x.s, Math.max(0, x.q - Math.round(x.q * usedFrac))]));
    planPurchases.push({ id: 'pp' + planPurchases.length, code: 'PL-' + (7200 + planPurchases.length), planId: plan.id, planName: plan.name, customerId: cust.id, vehicleId: veh.id, plate: veh.plate, segment: veh.segment, paid: plan.prices[veh.segment], remaining, status: 'activo', expiresAt: addDays(T, plan.months * 30 - daysAgo), createdAt: new Date(now - daysAgo * 864e5).toISOString() });
  };
  addPP(customers[0], vehicles[0], plans[1], 140, .34);
  for (let i = 0; i < 26; i++) { const v = r.pick(vehicles.slice(2)); addPP(custOf(v), v, r.pick(v.segment === 'pickup' ? plans : plans.slice(0, 3)), r.int(5, 330), r() * .8); }

  // ---------- Cupones ----------
  const coupons = [
    { id: 'cp1', code: 'PITS10', desc: '10% en cualquier servicio reservando online', type: 'pct', value: 10, serviceId: '', active: true, public: true, uses: 214, maxUses: 0, validTo: addDays(T, 45) },
    { id: 'cp2', code: 'PRIMERA5000', desc: '$5.000 de descuento en tu primera visita', type: 'amount', value: 5000, serviceId: '', active: true, public: true, uses: 87, maxUses: 500, validTo: addDays(T, 90) },
    { id: 'cp3', code: 'ALINEA20', desc: '20% en alineación y balanceo', type: 'pct', value: 20, serviceId: 'alineacion', active: true, public: true, uses: 46, maxUses: 300, validTo: addDays(T, 20) },
    { id: 'cp4', code: 'INVIERNO15', desc: 'Campaña invierno: 15% en baterías', type: 'pct', value: 15, serviceId: 'bateria', active: false, public: false, uses: 132, maxUses: 0, validTo: addDays(T, -40) }
  ];

  // ---------- Recordatorios ----------
  const signups = [];
  for (let i = 0; i < 34; i++) { const v = r.pick(vehicles.slice(2)), c = custOf(v); signups.push({ id: 's' + i, name: c.name, phone: c.phone, email: c.email, plate: v.plate, channel: r.pick(['whatsapp', 'whatsapp', 'sms', 'email']), every: r.pick(['km', 'fecha']), createdAt: new Date(now - r.int(1, 200) * 864e5).toISOString() }); }
  const campaigns = [
    ['Recordatorio cambio vencido', 'whatsapp', 'vencidos', 'Hola {nombre}, tu {auto} ({patente}) ya pasó su cambio de aceite. Reserva en 1 minuto: pitsrapido.cl/r', 160, 'enviada'],
    ['Próximos a vencer (30 días)', 'sms', 'proximos', 'Pits Rápido: a tu {auto} le toca mantención pronto. Usa PITS10 al reservar online.', 120, 'enviada'],
    ['Invierno: test de batería gratis', 'whatsapp', 'todos', '{nombre}, este invierno revisamos tu batería gratis en cualquier sucursal. Sin cita.', 95, 'enviada'],
    ['Saldo de plan sin usar', 'email', 'plan', 'Tienes servicios disponibles en tu plan. ¡Úsalos antes de que venzan!', 62, 'enviada'],
    ['Fiestas Patrias: pre-técnica', 'sms', 'todos', 'Antes de salir a la ruta: revisión pre-técnica a $14.990. Pits Rápido.', 40, 'enviada'],
    ['Recordatorio semanal automático', 'whatsapp', 'proximos', 'Hola {nombre}, tu {auto} está por cumplir {km} km. ¿Agendamos?', 5, 'borrador']
  ].map(([name, channel, audience, message, daysAgo, status], i) => {
    const sent = status === 'enviada' ? r.int(140, 620) : 0;
    const delivered = Math.round(sent * (.93 + r() * .05)), clicks = Math.round(delivered * (channel === 'email' ? .09 : .21 + r() * .1)), bookings = Math.round(clicks * (.28 + r() * .15));
    return { id: 'cm' + i, name, channel, audience, message, status, sent, delivered, clicks, bookings, sentAt: status === 'enviada' ? new Date(now - daysAgo * 864e5).toISOString() : '', createdAt: new Date(now - (daysAgo + 2) * 864e5).toISOString() };
  });
  const messages = [];
  campaigns.filter(c => c.status === 'enviada').forEach(c => {
    for (let k = 0; k < 12; k++) {
      const v = r.pick(vehicles.slice(2)), cu = custOf(v);
      messages.push({ id: 'ms' + messages.length, campaignId: c.id, channel: c.channel, to: c.channel === 'email' ? cu.email : cu.phone, name: cu.name, text: c.message.replace('{nombre}', cu.name.split(' ')[0]).replace('{auto}', `${v.make} ${v.model}`).replace('{patente}', v.plate).replace('{km}', String(v.nextDueKm)), status: r.bool(.94) ? (r.bool(.3) ? 'leído' : 'entregado') : 'fallido', at: new Date(Date.parse(c.sentAt) + k * 6e4).toISOString() });
    }
  });
  messages.sort((a, b) => b.at.localeCompare(a.at));

  users.push({ id: 'u-cli', name: 'Javiera Morales', email: 'cliente@pitsrapido.cl', password: 'demo123', role: 'cliente', customerId: 'c-demo', demo: true, active: true, color: '#e67e22', createdAt: customers[0].createdAt });

  const settings = {
    name: 'Pits Rápido', tagline: 'Lubricentro express · sin cita o reservando online',
    heroTitle: 'Tu cambio de aceite en 30 minutos, con precio claro según tu auto.',
    heroText: 'Ingresa tu patente y te decimos el aceite exacto que lleva tu motor, cuánto cuesta y cuánto hay que esperar en cada sucursal ahora mismo.',
    announcement: '🎯 Alineación y balanceo con 20% de descuento usando ALINEA20 · Hasta fin de mes',
    phone: '600 748 7000', whatsapp: '+56 9 4000 7487', email: 'hola@pitsrapido.cl',
    showWait: true, bookingDays: 10, walkinBuffer: 1, nextFolio: folio, nextCode: code,
    guarantee: 'Garantía Pits: si algo no quedó bien, lo corregimos gratis dentro de 30 días o 1.000 km.',
    reminderMsg: 'Hola {nombre}, a tu {auto} ({patente}) le toca su mantención. Reserva en pitsrapido.cl'
  };

  return { _anchor: now, settings, oils: OILS, services: SERVICES, branches: BRANCHES.map(({ bays: _, ...b }) => b), bays, users, customers, vehicles, jobs, dailyStats, products, suppliers: SUPPLIERS, purchaseOrders: pos, plans, planPurchases, coupons, signups, campaigns, messages };
}
