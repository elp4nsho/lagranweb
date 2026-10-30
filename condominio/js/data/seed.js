// Datos semilla reproducibles de la Comunidad Plaza Ñuñoa (plataforma Vecindario).
import { rng } from '../../../assets/core/db.js';
import { CATEGORIES, TCATS } from '../shared/format.js';

const FIRST = ['Valentina', 'Matías', 'Catalina', 'Benjamín', 'Javiera', 'Sebastián', 'Antonia', 'Tomás', 'Fernanda', 'Diego', 'Isidora', 'Joaquín', 'Constanza', 'Nicolás',
  'Martina', 'Felipe', 'Francisca', 'Cristóbal', 'Daniela', 'Vicente', 'Camila', 'Agustín', 'Josefa', 'Maximiliano', 'Paula', 'Gonzalo', 'Trinidad', 'Ignacio', 'Florencia',
  'Rodrigo', 'Macarena', 'Andrés', 'Bárbara', 'Pablo', 'Carolina', 'Héctor', 'Patricia', 'Jorge', 'Verónica', 'Luis', 'Marcela', 'Raúl', 'Gloria', 'Claudio'];
const LAST = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López', 'Fuentes',
  'Hernández', 'Torres', 'Araya', 'Flores', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Gutiérrez', 'Castro', 'Pizarro', 'Álvarez', 'Vásquez', 'Sánchez',
  'Fernández', 'Ramírez', 'Carrasco', 'Gómez', 'Cortés', 'Herrera', 'Núñez', 'Jara', 'Vergara', 'Rivera', 'Figueroa'];
const COLORS = ['#3d6bb3', '#6b4a2e', '#4c9a2a', '#c6362f', '#7c3aed', '#0891b2', '#db2777', '#b45309', '#0f766e', '#475569'];
const DAY = 864e5;
const iso = t => new Date(t).toISOString();
const ym = d => d.toISOString().slice(0, 7);
const addM = (p, n) => { const d = new Date(p + '-15'); d.setMonth(d.getMonth() + n); return ym(d); };
function rut(r) {
  const n = r.int(6000000, 24999999); let s = 0, m = 2;
  for (const ch of String(n).split('').reverse()) { s += +ch * m; m = m === 7 ? 2 : m + 1; }
  const dv = 11 - (s % 11);
  return `${n.toLocaleString('es-CL')}-${dv === 11 ? 0 : dv === 10 ? 'K' : dv}`;
}
const mail = (n, d) => n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, '').trim().replace(/\s+/g, '.') + '@' + d;
const phone = r => `+56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}`;
const plate = r => 'BCDFGHJKLPRSTVWXYZ'.split('').sort(() => r() - .5).slice(0, 4).join('') + '-' + r.int(10, 99);
export const code6 = r => Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(r() * 32)]).join('');

export function seed() {
  const r = rng(1974);
  const person = () => `${r.pick(FIRST)} ${r.pick(LAST)}`;
  const now = Date.now();
  const cur = ym(new Date());

  // ---------- Unidades (Torre A: 10 pisos, Torre B: 8 pisos, 4 deptos por piso) ----------
  const units = [];
  const TYPE = { 1: 48, 2: 63, 3: 82, 4: 57 };
  for (const [tower, floors] of [['A', 10], ['B', 8]]) for (let f = 1; f <= floors; f++) for (let n = 1; n <= 4; n++) {
    const top = f === floors;
    const m2 = Math.round(TYPE[n] * (top ? 1.15 : 1) * 10) / 10;
    units.push({ id: `${tower}-${f}0${n}`, tower, floor: f, number: `${f}0${n}`, m2, parking: n === 3 || top ? 2 : n === 1 ? r.int(0, 1) : 1, storage: n === 1 ? 0 : 1, ownerName: '', occupancy: 'propietario', alicuota: 0, active: true });
  }
  const weight = u => u.m2 + u.parking * 12 + u.storage * 4;
  const W = units.reduce((s, u) => s + weight(u), 0);
  units.forEach(u => { u.alicuota = Math.round(weight(u) / W * 1e6) / 1e4; });

  // ---------- Residentes ----------
  const residents = [];
  units.forEach(u => {
    const n = r.int(1, 3), rent = r.bool(.3);
    u.occupancy = rent ? 'arrendatario' : 'propietario';
    u.ownerName = person();
    for (let i = 0; i < n; i++) {
      const name = i === 0 && !rent ? u.ownerName : person();
      residents.push({ id: `r-${u.id}-${i}`, unitId: u.id, name, rut: rut(r), email: mail(name, r.pick(['gmail.com', 'outlook.com', 'yahoo.es'])), phone: phone(r), type: i === 0 ? (rent ? 'arrendatario' : 'propietario') : 'residente', titular: i === 0, vehicles: i === 0 && u.parking ? [plate(r)] : [], createdAt: r.daysAgo(900, 30) });
    }
  });
  // Residentes demo
  const setRes = (uid, name, email, extra = {}) => { const x = residents.find(z => z.unitId === uid && z.titular); Object.assign(x, { name, email, ...extra }); units.find(u => u.id === uid).ownerName = name; return x; };
  setRes('B-302', 'Fernanda Soto', 'residente@plazanunoa.cl', { type: 'propietario', phone: '+56 9 7712 3344', vehicles: ['RTSK-42'] });
  units.find(u => u.id === 'B-302').occupancy = 'propietario';
  setRes('A-704', 'Jorge Muñoz', 'comite@plazanunoa.cl', { type: 'propietario', phone: '+56 9 6655 1020' });
  units.find(u => u.id === 'A-704').occupancy = 'propietario';

  // ---------- Usuarios ----------
  const users = [
    { id: 'u-admin', name: 'Patricia Lagos', email: 'admin@vecindario.cl', password: 'admin123', role: 'administrador', color: '#3d6bb3', demo: true, active: true, phone: '+56 9 6100 2000' },
    { id: 'u-comite', name: 'Jorge Muñoz', email: 'comite@plazanunoa.cl', password: 'comite123', role: 'comite', color: '#6b4a2e', demo: true, active: true, unitId: 'A-704', phone: '+56 9 6655 1020' },
    { id: 'u-conserje', name: 'Luis Carrasco', email: 'conserje@plazanunoa.cl', password: 'conserje123', role: 'conserje', color: '#4c9a2a', demo: true, active: true, phone: '+56 9 6233 4455' },
    { id: 'u-res', name: 'Fernanda Soto', email: 'residente@plazanunoa.cl', password: 'residente123', role: 'residente', color: '#c6362f', demo: true, active: true, unitId: 'B-302', phone: '+56 9 7712 3344' }
  ];
  residents.filter(x => x.titular && !['B-302', 'A-704'].includes(x.unitId)).slice(0, 40).forEach((x, i) => {
    if (i % 3) return;
    users.push({ id: 'u-' + x.id, name: x.name, email: x.email, password: 'demo123', role: 'residente', color: r.pick(COLORS), active: true, unitId: x.unitId, phone: x.phone, createdAt: r.daysAgo(500, 10) });
  });
  users.push({ id: 'u-conserje2', name: 'Héctor Pizarro', email: 'hpizarro@plazanunoa.cl', password: 'conserje123', role: 'conserje', color: '#0f766e', active: true, phone: '+56 9 6233 9988' });

  // ---------- Espacios comunes ----------
  const spaces = [
    { id: 'quincho-a', name: 'Quincho Torre A', icon: 'fire', capacity: 20, price: 15000, deposit: 30000, slots: ['12:00–16:30', '18:00–23:30'], maxPerMonth: 2, perSlot: 1, active: true, rules: 'Máximo 20 personas. Dejar limpio y la parrilla sin brasas. Música hasta las 23:00. Garantía reembolsable de $30.000. Reserva con al menos 48 horas.' },
    { id: 'quincho-b', name: 'Quincho Torre B', icon: 'fire', capacity: 16, price: 15000, deposit: 30000, slots: ['12:00–16:30', '18:00–23:30'], maxPerMonth: 2, perSlot: 1, active: true, rules: 'Máximo 16 personas. Prohibido el uso de fuegos artificiales. Retirar la basura al contenedor del subterráneo.' },
    { id: 'sala', name: 'Sala multiuso', icon: 'users', capacity: 30, price: 20000, deposit: 0, slots: ['10:00–14:00', '15:00–19:00', '19:30–23:30'], maxPerMonth: 3, perSlot: 1, active: true, rules: 'Ideal para cumpleaños y reuniones. Incluye mesas y 30 sillas. No se permite cocinar. Entregar las llaves en conserjería.' },
    { id: 'piscina', name: 'Piscina', icon: 'swim', capacity: 40, price: 0, deposit: 0, slots: ['10:00–13:00', '13:00–16:00', '16:00–19:00', '19:00–21:00'], maxPerMonth: 12, perSlot: 8, active: true, rules: 'Temporada del 15 de octubre al 31 de marzo. Máximo 4 personas por departamento por turno. Menores de 12 años acompañados por un adulto. Ducha obligatoria.' }
  ];
  const bookings = [];
  for (let i = 0; i < 110; i++) {
    const sp = r.pick([spaces[0], spaces[0], spaces[1], spaces[2], spaces[3], spaces[3]]);
    const off = r.int(-150, 21);
    const d = new Date(now + off * DAY);
    if (sp.id === 'piscina' && !(d.getMonth() >= 9 || d.getMonth() <= 2)) continue;
    const u = r.pick(units);
    const date = d.toISOString().slice(0, 10), slot = r.pick(sp.slots);
    if (bookings.some(b => b.spaceId === sp.id && b.date === date && b.slot === slot && sp.perSlot === 1)) continue;
    bookings.push({ id: 'bk' + i, spaceId: sp.id, unitId: u.id, date, slot, guests: r.int(2, sp.capacity / 2), status: off < 0 ? 'realizada' : r.bool(.92) ? 'confirmada' : 'cancelada', price: sp.price, createdAt: iso(now + (off - r.int(2, 10)) * DAY) });
  }
  const nextSat = new Date(now); nextSat.setDate(nextSat.getDate() + ((6 - nextSat.getDay() + 7) % 7 || 7));
  bookings.push({ id: 'bk-demo', spaceId: 'quincho-b', unitId: 'B-302', date: nextSat.toISOString().slice(0, 10), slot: '12:00–16:30', guests: 12, status: 'confirmada', price: 15000, createdAt: iso(now - 3 * DAY) });

  // ---------- Períodos de gasto común ----------
  const providers = [
    ['Ascensores Cordillera SpA', 'Ascensores', 'Mantención mensual de ascensores'], ['Limpieza Integral Austral', 'Aseo y jardines', 'Insumos de aseo y jardinería'], ['Vigilancia Andina Ltda.', 'Seguridad y CCTV', 'Monitoreo CCTV y control de acceso'],
    ['Piscinas Pacífico', 'Piscina', 'Mantención y químicos de piscina'], ['Eléctrica Los Aromos', 'Electricidad', 'Electricista de turno'], ['Gasfitería Ñuñoa Express', 'Gasfitería', 'Gasfitería y destapes'],
    ['Seguros Volcán S.A.', 'Seguros', 'Póliza incendio y sismo áreas comunes'], ['Administraciones Andes Ltda.', 'Administración', 'Administración del condominio'], ['Jardines del Valle', 'Áreas verdes', 'Poda y riego'], ['Pinturas y Fachadas Sur', 'Reparaciones', 'Pintura y reparaciones menores']
  ].map(([name, category, service], i) => ({ id: 'pv' + (i + 1), name, rut: rut(r).replace(/^\d+/, m => String(76 + (i % 3)) + m.slice(2)), category, service, contact: person(), phone: '+56 2 2' + r.int(100, 999) + ' ' + r.int(1000, 9999), email: mail(name.split(' ')[0] + ' contacto', 'proveedores.cl'), rating: +(3.6 + r() * 1.4).toFixed(1), active: true }));
  const pvBy = cat => providers.find(p => p.category === cat)?.id || null;
  const periods = [];
  const PUB = 7;
  for (let k = PUB; k >= 0; k--) {
    const p = addM(cur, -k), mo = +p.slice(5, 7);
    const winter = [6, 7, 8].includes(mo), summer = [11, 12, 1, 2, 3].includes(mo) || (mo === 10);
    const e = [
      ['Remuneraciones', 'Sueldos conserjes, aseo y mayordomo', 6180000 + (mo === 12 ? 900000 : 0), null],
      ['Leyes sociales', 'AFP, salud, seguro de cesantía', 1148000, null],
      ['Electricidad áreas comunes', 'Boleta electricidad (iluminación, bombas, ascensores)', Math.round((winter ? 2050000 : 1420000) * (0.93 + r() * .14)), null],
      ['Agua áreas comunes', 'Riego y aseo de áreas comunes', Math.round((summer ? 520000 : 360000) * (0.9 + r() * .2)), null],
      ['Ascensores', 'Mantención mensual 4 ascensores', 692000, pvBy('Ascensores')],
      ['Aseo y jardines', 'Insumos de aseo y jardinería', Math.round(520000 * (0.9 + r() * .2)), pvBy('Aseo y jardines')],
      ['Seguridad y CCTV', 'Monitoreo y mantención cámaras', 418000, pvBy('Seguridad y CCTV')],
      ['Administración', 'Honorarios administración', 1250000, pvBy('Administración')],
      ['Seguros', 'Prima mensual póliza áreas comunes', 312000, pvBy('Seguros')],
      ['Gastos bancarios', 'Mantención cuenta corriente y comisiones', 38500, null]
    ];
    if (summer) e.push(['Piscina', 'Químicos y mantención', 648000, pvBy('Piscina')]);
    if (r.bool(.7)) e.push(['Reparaciones', r.pick(['Cambio bomba de agua', 'Reparación portón vehicular', 'Pintura hall Torre B', 'Cambio luminarias LED estacionamientos', 'Reparación filtración azotea']), r.int(180, 1350) * 1000, r.pick(providers).id]);
    const expenses = e.map(([category, description, amount, providerId], i) => ({ id: `e-${p}-${i}`, category, description, amount, providerId }));
    periods.push({ id: 'per-' + p, period: p, status: k === 0 ? 'borrador' : 'publicado', reservePct: 5, expenses, generated: k !== 0, publishedAt: k === 0 ? null : iso(new Date(addM(p, 1) + '-02T10:00').getTime()) });
  }

  // ---------- Cargos por unidad ----------
  const charges = [];
  const morosos = { 'A-203': 4, 'A-608': 3, 'B-104': 2, 'B-701': 2, 'A-901': 2, 'B-503': 1, 'A-402': 1 };
  let folio = 18400;
  periods.filter(x => x.status === 'publicado').forEach((per, idx, arr) => {
    const total = per.expenses.reduce((s, e) => s + e.amount, 0);
    const age = arr.length - idx; // 1 = último publicado
    units.forEach(u => {
      const common = Math.round(total * u.alicuota / 100), reserve = Math.round(common * per.reservePct / 100);
      const m3 = Math.round((5 + u.m2 / 12 + r() * 7) * 10) / 10, water = Math.round(m3 * 1150);
      const bk = bookings.filter(b => b.unitId === u.id && b.date.slice(0, 7) === per.period && b.status !== 'cancelada' && b.price).reduce((s, b) => s + b.price, 0);
      const fine = r.bool(.015) ? 25000 : 0;
      const tot = common + reserve + water + bk + fine;
      let paid = (morosos[u.id] || 0) < age && (age > 1 ? r.bool(.985) : r.bool(.86));
      if (u.id === 'B-302') paid = age > 1;
      const paidAt = paid ? iso(new Date(addM(per.period, 1) + `-${String(r.int(2, age > 1 ? 14 : 9)).padStart(2, '0')}T${String(r.int(9, 22)).padStart(2, "0")}:${r.int(10, 59)}`).getTime()) : null;
      charges.push({ id: `ch-${per.period}-${u.id}`, period: per.period, unitId: u.id, alicuota: u.alicuota, common, reserve, water, m3, bookings: bk, fines: fine, total: tot, paid, paidAt, method: paid ? r.pick(['Webpay', 'Webpay', 'Transferencia', 'Transferencia', 'PAC', 'Caja vecina']) : null, folio: paid ? ++folio : null });
    });
  });

  // ---------- Visitas ----------
  const visitors = [];
  for (let i = 0; i < 90; i++) {
    const u = r.pick(units), off = -r.int(0, 30), name = person();
    const t = now + off * DAY - r.int(1, 10) * 3600e3;
    const pre = r.bool(.45);
    const inT = off === 0 && i % 9 === 0 ? now - r.int(1, 3) * 3600e3 : t;
    const inside = off === 0 && i % 9 === 0;
    visitors.push({ id: 'vi' + i, unitId: u.id, name, rut: rut(r), plate: r.bool(.3) ? plate(r) : '', date: iso(inT).slice(0, 10), preauth: pre, code: pre ? code6(r) : null, status: inside ? 'dentro' : 'salio', inAt: iso(inT), outAt: inside ? null : iso(inT + r.int(1, 5) * 3600e3), by: r.pick(['Luis Carrasco', 'Héctor Pizarro']), note: '', createdAt: iso(inT - DAY) });
  }
  const upcoming = [['B-302', 'Ricardo Soto', 0, 'KLTP-21'], ['B-302', 'María José Ibáñez', 2, ''], ['A-704', 'Técnico VTR Fibra', 0, ''], ['A-305', 'Carlos Medina', 1, 'HJRS-90'], ['B-605', 'Ana María Rivas', 0, ''], ['A-1002', 'Mudanzas Express', 3, 'TRWB-55']];
  upcoming.forEach(([unitId, name, d, pl], i) => visitors.push({ id: 'vu' + i, unitId, name, rut: rut(r), plate: pl, date: iso(now + d * DAY).slice(0, 10), preauth: true, code: code6(r), status: 'esperada', inAt: null, outAt: null, by: null, note: i === 5 ? 'Mudanza: usar ascensor de servicio' : '', createdAt: iso(now - DAY) }));

  // ---------- Encomiendas ----------
  const CARRIERS = ['Chilexpress', 'Starken', 'Correos de Chile', 'Blue Express', 'Mercado Envíos', 'Despacho tienda', 'Rayo Express'];
  const parcels = [];
  for (let i = 0; i < 70; i++) {
    const u = r.pick(units), off = r.int(0, 40), t = now - off * DAY - r.int(1, 9) * 3600e3, pending = off <= 3 && i % 3 === 0;
    parcels.push({ id: 'pa' + i, unitId: u.id, carrier: r.pick(CARRIERS), tracking: String(r.int(100000000, 999999999)), size: r.pick(['Sobre', 'Pequeña', 'Pequeña', 'Mediana', 'Grande']), receivedAt: iso(t), receivedBy: r.pick(['Luis Carrasco', 'Héctor Pizarro']), status: pending ? 'conserjeria' : 'entregada', deliveredAt: pending ? null : iso(t + r.int(1, 30) * 3600e3), deliveredTo: pending ? null : r.pick(residents.filter(x => x.unitId === u.id)).name, note: '' });
  }
  parcels.push({ id: 'pa-d1', unitId: 'B-302', carrier: 'Mercado Envíos', tracking: '448812093', size: 'Mediana', receivedAt: iso(now - 5 * 3600e3), receivedBy: 'Luis Carrasco', status: 'conserjeria', deliveredAt: null, deliveredTo: null, note: '' });
  parcels.push({ id: 'pa-d2', unitId: 'B-302', carrier: 'Chilexpress', tracking: '993001277', size: 'Sobre', receivedAt: iso(now - 26 * 3600e3), receivedBy: 'Héctor Pizarro', status: 'conserjeria', deliveredAt: null, deliveredTo: null, note: 'Documento certificado' });

  // ---------- Mantención ----------
  const TT = [['Filtración en techo de baño', 'Gasfitería', 'unidad'], ['Ascensor Torre B detenido en piso 4', 'Ascensores', 'común'], ['Luminaria quemada pasillo piso 6', 'Electricidad', 'común'], ['Portón vehicular no cierra', 'Seguridad', 'común'],
    ['Ruidos molestos después de las 23:00', 'Ruidos / convivencia', 'común'], ['Pasto seco en jardín poniente', 'Áreas verdes', 'común'], ['Agua turbia en piscina', 'Piscina', 'común'], ['Enchufe sin corriente en logia', 'Electricidad', 'unidad'],
    ['Auto mal estacionado en mi estacionamiento', 'Estacionamientos', 'común'], ['Basura acumulada en sala de basura Torre A', 'Aseo', 'común'], ['Citófono no funciona', 'Electricidad', 'unidad'], ['Humedad en muro de dormitorio', 'Gasfitería', 'unidad']];
  const tickets = [];
  for (let i = 0; i < 30; i++) {
    const [title, category, scope] = TT[i % TT.length];
    const u = r.pick(units), off = Math.floor(Math.pow(r(), 1.4) * 90), t = now - off * DAY;
    const st = off < 3 ? r.pick(['abierto', 'abierto', 'asignado']) : off < 12 ? r.pick(['asignado', 'progreso', 'resuelto']) : r.pick(['resuelto', 'cerrado', 'cerrado']);
    const pv = providers.find(p => p.category === category) || r.pick(providers);
    const history = [{ at: iso(t), status: 'abierto', by: scope === 'unidad' ? residents.find(x => x.unitId === u.id).name : 'Luis Carrasco', note: 'Solicitud creada' }];
    const flow = ['asignado', 'progreso', 'resuelto', 'cerrado'];
    for (let k = 0; k <= flow.indexOf(st); k++) history.push({ at: iso(t + (k + 1) * r.int(4, 30) * 3600e3), status: flow[k], by: 'Patricia Lagos', note: [`Asignado a ${pv.name}`, 'Proveedor en terreno', 'Trabajo terminado, se adjunta boleta', 'Cerrado con conformidad del residente'][k] });
    tickets.push({ id: 'tk' + String(i + 1).padStart(3, '0'), number: 1200 + i, title, category, scope, unitId: scope === 'unidad' ? u.id : null, reporter: history[0].by, description: `${title}. ${r.pick(['Se nota desde hace algunos días.', 'Urgente por favor.', 'Adjunto detalle a conserjería.', 'Ocurre principalmente en las noches.'])}`, priority: r.pick(['baja', 'media', 'media', 'alta', 'urgente']), status: st, providerId: st === 'abierto' ? null : pv.id, cost: ['resuelto', 'cerrado'].includes(st) ? r.int(25, 380) * 1000 : 0, history, createdAt: iso(t) });
  }
  tickets.push({ id: 'tk-demo', number: 1299, title: 'Llave de cocina gotea', category: 'Gasfitería', scope: 'unidad', unitId: 'B-302', reporter: 'Fernanda Soto', description: 'La llave monomando de la cocina gotea constantemente.', priority: 'media', status: 'asignado', providerId: 'pv6', cost: 0, createdAt: iso(now - 2 * DAY), history: [{ at: iso(now - 2 * DAY), status: 'abierto', by: 'Fernanda Soto', note: 'Solicitud creada' }, { at: iso(now - DAY), status: 'asignado', by: 'Patricia Lagos', note: 'Asignado a Gasfitería Ñuñoa Express, visita el jueves' }] });

  // ---------- Avisos ----------
  const ann = [
    ['Corte de agua programado', 'Aguas Andinas informa corte de agua el próximo martes entre 09:00 y 14:00 por trabajos en la matriz. Recomendamos acumular agua.', 'Servicios', true],
    ['Inicio temporada de piscina', 'La piscina abre el 15 de octubre. Reserva tu turno desde la app. Recuerda: máximo 4 personas por departamento por turno.', 'Áreas comunes', true],
    ['Asamblea ordinaria de copropietarios', 'Se cita a asamblea ordinaria en la sala multiuso. Tabla: cuenta anual, presupuesto 2027 y pintura de fachada.', 'Asambleas', false],
    ['Fumigación de áreas comunes', 'El sábado se realizará fumigación de subterráneos y salas de basura. Mantener mascotas en sus departamentos.', 'Mantención', false],
    ['Nuevo sistema de encomiendas', 'Desde ahora recibirás un aviso en la app cuando llegue tu encomienda a conserjería.', 'Comunidad', false],
    ['Recordatorio: uso de estacionamientos de visita', 'Los estacionamientos de visita son para visitas y tienen un máximo de 4 horas.', 'Convivencia', false],
    ['Mantención de ascensores Torre A', 'El ascensor 2 de la Torre A estará detenido el jueves de 10:00 a 13:00 por mantención preventiva.', 'Mantención', false],
    ['Reciclaje: nuevos contenedores', 'Instalamos contenedores para vidrio, latas y cartón en el subterráneo -1.', 'Comunidad', false],
    ['Gastos comunes de septiembre publicados', 'Ya están disponibles los gastos comunes de septiembre. Vencimiento: día 10.', 'Gastos comunes', false]
  ];
  const announcements = ann.map(([title, body, category, pinned], i) => ({ id: 'an' + i, title, body, category, pinned, published: true, public: i < 5, author: 'Patricia Lagos', createdAt: iso(now - (i * 4 + 1) * DAY) }));
  announcements.push({ id: 'an-draft', title: 'Cambio de horario conserjería nocturna', body: 'Borrador: a partir de noviembre el turno noche será de 22:00 a 07:00.', category: 'Comunidad', pinned: false, published: false, public: false, author: 'Patricia Lagos', createdAt: iso(now - DAY) });

  // ---------- Votaciones ----------
  const vote = (opts, n, bias) => units.slice().sort(() => r() - .5).slice(0, n).map(u => ({ unitId: u.id, option: bias(r()), at: iso(now - r.int(1, 12) * DAY) }));
  const polls = [
    { id: 'po1', title: 'Pintura de fachada 2027', description: 'Elegir entre los dos presupuestos recibidos para pintar la fachada de ambas torres, o postergar el proyecto.', options: ['Presupuesto A: Pinturas y Fachadas Sur ($48.200.000)', 'Presupuesto B: Fachadas Pro ($39.900.000)', 'Postergar para 2028'], status: 'abierta', closesAt: iso(now + 9 * DAY), assemblyId: 'as3', votes: vote(3, 41, x => x < .32 ? 0 : x < .8 ? 1 : 2).filter(v => v.unitId !== 'B-302'), createdAt: iso(now - 12 * DAY) },
    { id: 'po2', title: 'Horario piscina temporada 2026-2027', description: '¿Extender el horario de la piscina hasta las 22:00 los fines de semana?', options: ['Sí, hasta las 22:00', 'No, mantener hasta las 21:00'], status: 'cerrada', closesAt: iso(now - 20 * DAY), votes: vote(2, 52, x => (x < .64 ? 0 : 1)), createdAt: iso(now - 40 * DAY) },
    { id: 'po3', title: 'Instalación de cargadores para autos eléctricos', description: 'Instalar 4 cargadores en el subterráneo -2, financiados con fondo de reserva y cobro por uso.', options: ['Aprobar', 'Rechazar', 'Abstención'], status: 'cerrada', closesAt: iso(now - 75 * DAY), votes: vote(3, 47, x => (x < .58 ? 0 : x < .86 ? 1 : 2)), createdAt: iso(now - 95 * DAY) },
    { id: 'po4', title: 'Cambio de empresa de seguridad', description: 'Evaluar el cambio de Vigilancia Andina por una nueva empresa con guardia nocturno adicional.', options: ['Cambiar de empresa', 'Mantener la actual'], status: 'borrador', closesAt: iso(now + 30 * DAY), votes: [], createdAt: iso(now - 2 * DAY) }
  ];

  // ---------- Documentos y asambleas ----------
  const DOCS = [
    ['Reglamento de copropiedad', 'reglamento', 380, 'Título I. De la copropiedad. Artículo 1: El presente reglamento regula los derechos y obligaciones de los copropietarios de la Comunidad Plaza Ñuñoa, conforme a la Ley 21.442 de Copropiedad Inmobiliaria.\n\nArtículo 12: Los gastos comunes se prorratean según la alícuota de cada unidad, determinada por su superficie, estacionamientos y bodegas.\n\nArtículo 18: Se prohíben ruidos molestos entre las 23:00 y las 08:00 horas.\n\nArtículo 25: El atraso en el pago de gastos comunes devengará un interés del 1,5% mensual.'],
    ['Reglamento de uso de piscina', 'reglamento', 900, 'Temporada: 15 de octubre a 31 de marzo. Horario: 10:00 a 21:00. Turnos reservables desde la app. Máximo 4 personas por unidad por turno. Prohibido ingresar con vidrios. Menores de 12 años siempre acompañados.'],
    ['Reglamento de quinchos y sala multiuso', 'reglamento', 120, 'Reservas con 48 horas de anticipación desde la app. Valor quincho $15.000 y sala $20.000, cargados al gasto común del mes. Garantía de $30.000 para quinchos. Uso hasta las 23:30.'],
    ['Acta asamblea ordinaria marzo 2026', 'acta', 60, 'Asistencia: 58% de los derechos. Acuerdos: 1) Se aprueba la cuenta anual 2025. 2) Se aprueba presupuesto 2026 por $13.800.000 mensuales. 3) Se reelige el comité de administración por un año.'],
    ['Acta asamblea extraordinaria julio 2026', 'acta', 45, 'Asistencia: 63% de los derechos. Acuerdos: 1) Se aprueba evaluar instalación de cargadores eléctricos. 2) Se encarga a la administración cotizar pintura de fachada.'],
    ['Presupuesto anual 2026', 'presupuesto', 50, 'Presupuesto mensual estimado: Remuneraciones $6.180.000; Leyes sociales $1.148.000; Electricidad $1.600.000; Agua $420.000; Ascensores $692.000; Aseo $520.000; Seguridad $418.000; Administración $1.250.000; Seguros $312.000. Fondo de reserva: 5%.'],
    ['Póliza de seguro áreas comunes', 'contrato', 200, 'Póliza N° 77-221903 con Seguros Volcán S.A. Cobertura: incendio, sismo y responsabilidad civil de áreas comunes. Vigencia: enero a diciembre 2026.'],
    ['Contrato administración', 'contrato', 210, 'Contrato de prestación de servicios de administración entre la Comunidad Plaza Ñuñoa y Administraciones Andes Ltda. Duración: 24 meses renovables.'],
    ['Manual del residente', 'otro', 400, 'Bienvenido/a a la Comunidad Plaza Ñuñoa. En este manual encontrarás horarios, contactos, uso de la app Vecindario, retiro de basura, mudanzas y normas de convivencia.'],
    ['Plan de emergencia y evacuación', 'otro', 300, 'En caso de sismo: mantener la calma, alejarse de ventanas. Zonas de seguridad: plaza central y estacionamiento de visitas. Extintores en cada piso junto al ascensor.']
  ];
  const documents = DOCS.map(([title, category, ago, content], i) => ({ id: 'doc' + i, title, category, content, size: `${r.int(80, 900)} KB`, visible: true, createdAt: iso(now - ago * DAY) }));
  const assemblies = [
    { id: 'as1', title: 'Asamblea ordinaria anual', type: 'ordinaria', date: iso(now - 210 * DAY), place: 'Sala multiuso', status: 'realizada', agenda: 'Cuenta anual 2025; presupuesto 2026; elección del comité.', quorum: 58, docId: 'doc3' },
    { id: 'as2', title: 'Asamblea extraordinaria', type: 'extraordinaria', date: iso(now - 105 * DAY), place: 'Sala multiuso', status: 'realizada', agenda: 'Cargadores eléctricos; cotización pintura de fachada.', quorum: 63, docId: 'doc4' },
    { id: 'as3', title: 'Asamblea ordinaria: pintura de fachada', type: 'ordinaria', date: iso(now + 12 * DAY), place: 'Sala multiuso y en línea', status: 'programada', agenda: 'Votación pintura de fachada 2027; presupuesto 2027; varios.', quorum: null, docId: null }
  ];

  // ---------- Personal y turnos ----------
  const staff = [['Luis Carrasco', 'Conserje', 'u-conserje'], ['Héctor Pizarro', 'Conserje', 'u-conserje2'], ['Marcela Vergara', 'Conserje', null], ['Raúl Jara', 'Mayordomo', null], ['Gloria Núñez', 'Aseo', null], ['Claudio Reyes', 'Aseo', null], ['Pedro Tapia', 'Jardinero', null]]
    .map(([name, role, userId], i) => ({ id: 'st' + i, name, role, userId, phone: phone(r), rut: rut(r), active: true, since: iso(now - r.int(200, 2000) * DAY) }));
  const shifts = [];
  const mon = new Date(now); mon.setHours(12, 0, 0, 0); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7) - 7);
  for (let d = 0; d < 28; d++) {
    const day = new Date(mon.getTime() + d * DAY), key = day.toISOString().slice(0, 10), dow = day.getDay();
    ['M', 'T', 'N'].forEach((s, k) => shifts.push({ id: `sh-${key}-c${k}`, staffId: 'st' + ((k + Math.floor(d / 2)) % 3), date: key, shift: s }));
    if (dow !== 0) shifts.push({ id: `sh-${key}-m`, staffId: 'st3', date: key, shift: 'M' });
    if (dow !== 0) shifts.push({ id: `sh-${key}-a1`, staffId: dow % 2 ? 'st4' : 'st5', date: key, shift: 'M' });
    if ([2, 5].includes(dow)) shifts.push({ id: `sh-${key}-j`, staffId: 'st6', date: key, shift: 'M' });
  }

  // ---------- Novedades de conserjería ----------
  const NOV = [['ronda', 'Ronda completa: subterráneos, azotea y perímetro sin novedad.'], ['novedad', 'Se recibe camión de mudanza en Torre B, piso 7.'], ['novedad', 'Proveedor de ascensores realiza mantención en Torre A.'], ['incidente', 'Alarma de incendio activada por humo de cocina en piso 5, falsa alarma.'], ['ronda', 'Ronda nocturna: luz quemada en estacionamiento -2, se informa a mantención.'], ['novedad', 'Corte de luz de 10 minutos, generador funcionó correctamente.'], ['incidente', 'Vecino reporta ruidos molestos en Torre A piso 3. Se conversa con residentes.']];
  const logbook = Array.from({ length: 46 }, (_, i) => { const [type, text] = NOV[r.int(0, NOV.length - 1)]; return { id: 'lb' + i, type, text, by: r.pick(['Luis Carrasco', 'Héctor Pizarro', 'Marcela Vergara']), at: iso(now - i * 15 * 3600e3 - r.int(0, 5) * 3600e3), checkpoints: type === 'ronda' ? ['Hall Torre A', 'Hall Torre B', 'Subterráneo -1', 'Subterráneo -2', 'Piscina', 'Quinchos', 'Azotea'] : [] }; });

  const notifications = [
    { id: 'nt1', unitId: 'B-302', text: 'Llegó una encomienda de Mercado Envíos a conserjería', link: '#/encomiendas', read: false, createdAt: iso(now - 5 * 3600e3) },
    { id: 'nt2', unitId: 'B-302', text: 'Tu solicitud #1299 fue asignada a Gasfitería Ñuñoa Express', link: '#/incidencias/tk-demo', read: false, createdAt: iso(now - DAY) },
    { id: 'nt3', unitId: 'B-302', text: 'Gastos comunes de septiembre publicados', link: '#/gastos', read: true, createdAt: iso(now - 28 * DAY) },
    { id: 'nt4', unitId: 'A-704', text: 'Nueva votación abierta: Pintura de fachada 2027', link: '#/votaciones', read: false, createdAt: iso(now - 12 * DAY) }
  ];
  const reminders = Object.keys(morosos).slice(0, 4).map((unitId, i) => ({ id: 'rm' + i, unitId, channel: 'App y correo', amount: 0, by: 'Patricia Lagos', createdAt: iso(now - (i + 3) * DAY) }));
  const LOGS = [['gastos', 'Patricia Lagos publicó los gastos comunes de septiembre'], ['pago', 'Pago recibido de B-205 (Webpay)'], ['visita', 'Ingreso de visita a A-305 registrado por conserjería'], ['encomienda', 'Encomienda recibida para B-302'], ['incidencia', 'Nueva solicitud #1229: Luminaria quemada'], ['reserva', 'Reserva de Quincho Torre B para B-302'], ['votación', 'Jorge Muñoz votó en «Pintura de fachada 2027»'], ['morosidad', 'Recordatorio enviado a A-203'], ['login', 'Patricia Lagos inició sesión']];
  const _log = Array.from({ length: 40 }, (_, i) => { const [action, detail] = LOGS[i % LOGS.length]; return { id: 'lg' + i, at: iso(now - (i * 7 + r.int(0, 6)) * 3600e3), action, detail, user: i % 3 ? 'u-admin' : null }; });

  return {
    _log, users, units, residents, spaces, bookings, periods, charges, providers, visitors, parcels, tickets, announcements, polls, documents, assemblies, staff, shifts, logbook, notifications, reminders,
    settings: {
      community: 'Comunidad Plaza Ñuñoa', address: 'Av. Irarrázaval 2850, Ñuñoa, Santiago', rut: '53.318.442-7', adminCompany: 'Administraciones Andes Ltda.', adminPhone: '+56 2 2899 4100', adminEmail: 'admin@vecindario.cl',
      conciergePhone: '+56 2 2899 4111', bank: 'Banco Austral · Cta. Cte. 00-418-22719-03', reservePct: 5, interestPct: 1.5, dueDay: 10, waterPrice: 1150,
      heroTitle: 'La administración de tu edificio, en una sola app', heroSubtitle: 'Gastos comunes transparentes, reservas, visitas con QR, encomiendas y votaciones. Vecindario conecta a la administración, el comité, la conserjería y cada residente.',
      plans: [{ name: 'Básico', price: 590, features: ['Gastos comunes y pagos en línea', 'Avisos y documentos', 'Soporte por correo'] }, { name: 'Comunidad', price: 890, features: ['Todo lo del plan Básico', 'Reservas y visitas con QR', 'Encomiendas y conserjería digital', 'Votaciones'], highlight: true }, { name: 'Pro', price: 1290, features: ['Todo lo del plan Comunidad', 'Mantención con proveedores', 'Turnos del personal', 'Reportes avanzados'] }],
      showAnnouncements: true
    }
  };
}
export { CATEGORIES, TCATS };
