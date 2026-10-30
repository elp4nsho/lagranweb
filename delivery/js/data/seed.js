// Datos semilla de Rayo Express: personal, flota, clientes, 60 días de historial,
// operación en curso, facturas e incidencias. Reproducible con rng().
import { rng } from '../../../assets/core/db.js';
import { COMUNAS, COM, jitter, HQ, round5 } from './geo.js';
import { DEFAULT_PRICING, quote } from '../shared/pricing.js';
import { buildGeo, makePlan, slaFor, WAIT_MS } from '../shared/sim.js';

const FIRST = ['Valentina', 'Matías', 'Camila', 'Benjamín', 'Javiera', 'Diego', 'Catalina', 'Joaquín', 'Antonia', 'Tomás', 'Florencia', 'Vicente', 'Martina', 'Agustín', 'Isidora', 'Cristóbal', 'Fernanda', 'Sebastián', 'Constanza', 'Ignacio', 'Josefina', 'Felipe', 'Trinidad', 'Nicolás', 'Paula', 'Andrés', 'Daniela', 'Gonzalo', 'Carla', 'Rodrigo', 'Rocío', 'Pablo', 'Macarena', 'Francisco', 'Bárbara', 'Esteban'];
const LAST = ['Rojas', 'Soto', 'Muñoz', 'González', 'Díaz', 'Pérez', 'Fuentes', 'Silva', 'Contreras', 'Sepúlveda', 'Morales', 'Araya', 'Vergara', 'Lagos', 'Rivas', 'Olave', 'Vera', 'Tapia', 'Reyes', 'Castillo', 'Navarro', 'Espinoza', 'Cáceres', 'Bravo', 'Herrera', 'Salinas', 'Pizarro', 'Valenzuela'];
const STREETS = ['Av. Irarrázaval', 'Av. Providencia', 'Av. Apoquindo', 'Av. Vicuña Mackenna', 'Av. Grecia', 'Av. Matta', 'Av. Pajaritos', 'Av. La Florida', 'Av. Macul', 'Av. Los Leones', 'Av. Italia', 'José Pedro Alessandri', 'Av. Tobalaba', 'Av. Ossa', 'Gran Avenida', 'Av. Recoleta', 'Av. Independencia', 'Av. Departamental', 'Av. Kennedy', 'Av. Las Condes', 'Av. Vitacura', 'Pedro de Valdivia', 'Av. Santa Rosa', 'Av. Concha y Toro', 'Av. Mapocho', 'Huérfanos', 'Agustinas', 'Av. Suecia', 'Av. Lyon', 'Av. Manquehue'];
const BUSINESSES = [
  ['Librería Andes', 'Ñuñoa', 'Irarrázaval 3150', 'Corporativo'], ['Tienda Nómade', 'Las Condes', 'Apoquindo 4400', 'Pyme'],
  ['Panadería Trigal', 'Macul', 'Av. Macul 2890', 'Pyme'], ['Ferretería Bellavista', 'Recoleta', 'Pío Nono 210', 'Pyme'],
  ['Estudio Pino Abogados', 'Providencia', 'Suecia 84, of. 31', 'Corporativo'], ['Distribuidora Sur', 'Maipú', 'Av. Pajaritos 2400', 'Corporativo'],
  ['Florería Pétalo', 'Providencia', 'Av. Lyon 1120', 'Pyme'], ['Óptica Mirada', 'Santiago', 'Huérfanos 1160, local 4', 'Pyme'],
  ['Vinos Cordillera', 'Vitacura', 'Av. Vitacura 3600', 'Corporativo'], ['Mascotas Felices SpA', 'La Florida', 'Av. La Florida 9100', 'Pyme']
];
const COMMENTS5 = ['Súper rápido, llegó antes de lo esperado.', 'Excelente servicio, muy amable el repartidor.', 'Impecable, el seguimiento en vivo es lo mejor.', 'Todo perfecto, lo recomiendo.', 'Llegó en perfecto estado y con foto de respaldo.', 'Muy puntual, 10/10.'];
const COMMENTS4 = ['Buen servicio, un poco de demora en el retiro.', 'Bien, aunque costó encontrar la dirección.', 'Rápido y ordenado.'];
const COMMENTS_LOW = ['Llegó tarde y no avisaron.', 'La caja venía algo golpeada.', 'El repartidor no encontraba la dirección.'];
const COLORS = ['#e11d48', '#0891b2', '#7c3aed', '#059669', '#d97706', '#2563eb', '#db2777', '#0d9488', '#9333ea', '#ea580c', '#4f46e5', '#16a34a'];

const day = 864e5;
const iso = ms => new Date(ms).toISOString();

export function seed() {
  const r = rng(20261030);
  const now = Date.now();
  const P = DEFAULT_PRICING;
  const usedCodes = new Set();
  const code = () => { let c; do { c = 'RX-' + r.int(10000, 99999); } while (usedCodes.has(c)); usedCodes.add(c); return c; };
  ['RX-48213', 'RX-51027', 'RX-30981'].forEach(c => usedCodes.add(c));
  const person = () => `${r.pick(FIRST)} ${r.pick(LAST)}`;
  const phone = () => `+56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}`;
  const addr = () => `${r.pick(STREETS)} ${r.int(100, 9800)}${r.bool(.35) ? ', depto ' + r.int(101, 2405) : ''}`;
  const comunaW = () => r.bool(.55) ? r.pick(COMUNAS.filter(c => c.z === 'A')).n : r.bool(.6) ? r.pick(COMUNAS.filter(c => c.z === 'B')).n : r.pick(COMUNAS.filter(c => c.z === 'C')).n;

  // ---------- Personal ----------
  const users = [
    { id: 'u-admin', name: 'Francisca Ibáñez', email: 'admin@rayoexpress.cl', password: 'demo123', role: 'admin', color: '#7c3aed', demo: true, active: true, phone: '+56 9 6100 2001' },
    { id: 'u-desp', name: 'Tomás Herrera', email: 'despacho@rayoexpress.cl', password: 'demo123', role: 'despachador', color: '#0891b2', demo: true, active: true, phone: '+56 9 6100 2002' },
    { id: 'u-sop', name: 'Daniela Fuentes', email: 'soporte@rayoexpress.cl', password: 'demo123', role: 'soporte', color: '#db2777', demo: true, active: true, phone: '+56 9 6100 2003' },
    { id: 'u-sop2', name: 'Rodrigo Salinas', email: 'rsalinas@rayoexpress.cl', password: 'demo123', role: 'soporte', color: '#ea580c', active: true, phone: '+56 9 6100 2004' },
    { id: 'u-desp2', name: 'Macarena Vergara', email: 'mvergara@rayoexpress.cl', password: 'demo123', role: 'despachador', color: '#16a34a', active: false, phone: '+56 9 6100 2005' }
  ];

  // ---------- Flota ----------
  const fleet = [
    ['Camila Rojas', 'moto', 'Honda CB125F', 'RXPL21', ['A', 'B'], 'Providencia'], ['Matías Soto', 'bici', 'Bici eléctrica Volta', 'BICI-07', ['A'], 'Santiago'],
    ['Javiera Muñoz', 'furgon', 'Peugeot Partner', 'KXTR55', ['A', 'B', 'C'], 'Las Condes'], ['Diego Fuentes', 'moto', 'Yamaha FZ', 'RXDF09', ['B', 'C'], 'Maipú'],
    ['Antonia Vera', 'moto', 'Suzuki GN125', 'PLMV33', ['A', 'B'], 'Ñuñoa'], ['Joaquín Tapia', 'auto', 'Toyota Yaris', 'HJKT72', ['B', 'C'], 'La Florida'],
    ['Florencia Araya', 'bici', 'Bici eléctrica Volta', 'BICI-12', ['A'], 'Providencia'], ['Vicente Reyes', 'moto', 'Honda Wave', 'RXVR18', ['A', 'B'], 'Recoleta'],
    ['Isidora Castillo', 'furgon', 'Renault Kangoo', 'LKPR90', ['B', 'C'], 'San Miguel'], ['Cristóbal Navarro', 'moto', 'Bajaj Pulsar', 'RXCN44', ['C'], 'Puente Alto'],
    ['Paula Espinoza', 'auto', 'Kia Morning', 'GTRW15', ['A', 'B'], 'Vitacura'], ['Gonzalo Bravo', 'moto', 'Yamaha YBR', 'RXGB27', ['B', 'C'], 'Pudahuel'],
    ['Bárbara Pizarro', 'bici', 'Bici eléctrica Volta', 'BICI-21', ['A'], 'Ñuñoa'], ['Esteban Cáceres', 'furgon', 'Hyundai H-1', 'JJRT61', ['A', 'B', 'C'], 'Quilicura']
  ];
  const couriers = fleet.map(([name, vehicle, model, plate, zones, base], i) => {
    const id = 'c' + (i + 1), uidv = 'u-' + id;
    const docExp = k => iso(now + (k * 30 + r.int(-20, 200)) * day);
    const docs = [
      { name: 'Licencia de conducir', status: vehicle === 'bici' ? 'aprobado' : (i === 9 ? 'vencido' : 'aprobado'), expires: vehicle === 'bici' ? null : (i === 9 ? iso(now - 12 * day) : docExp(6)) },
      { name: 'Cédula de identidad', status: 'aprobado', expires: docExp(20) },
      { name: 'Certificado de antecedentes', status: i === 13 ? 'pendiente' : 'aprobado', expires: docExp(4) },
      ...(vehicle === 'bici' ? [] : [{ name: 'SOAP y permiso de circulación', status: i === 5 ? 'pendiente' : 'aprobado', expires: i === 11 ? iso(now + 9 * day) : docExp(5) }])
    ];
    users.push({ id: uidv, name, email: i === 0 ? 'camila@rayoexpress.cl' : `${name.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}.${name.split(' ')[1].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}@rayoexpress.cl`, password: 'demo123', role: 'repartidor', courierId: id, color: COLORS[i % COLORS.length], demo: i === 0, active: true, phone: phone() });
    return {
      id, userId: uidv, name, vehicle, model, plate, zones, phone: phone(), color: COLORS[i % COLORS.length],
      status: i === 12 ? 'suspendido' : 'activo', online: i !== 12 && i !== 10 && i !== 6, rating: 4.8, ratings: 0,
      joinedAt: iso(now - r.int(90, 900) * day), pos: jitter(COM[base], r, 0.02), phase: r() * 6.28, base, docs
    };
  });
  const fleetW = couriers.filter(c => c.status === 'activo');

  // ---------- Clientes ----------
  const customers = [], addresses = [];
  BUSINESSES.forEach(([name, comuna, a, plan], i) => {
    const id = 'k' + (i + 1);
    customers.push({ id, type: 'empresa', name, rut: `${r.int(76, 77)}.${r.int(100, 999)}.${r.int(100, 999)}-${r.int(0, 9)}`, email: i === 0 ? 'contacto@libreriaandes.cl' : `contacto@${name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '')}.cl`, phone: phone(), plan, comuna, contact: person(), creditLimit: plan === 'Corporativo' ? 1500000 : 400000, active: true, createdAt: iso(now - r.int(120, 700) * day) });
    addresses.push({ customerId: id, label: 'Local principal', name, phone: phone(), addr: a, comuna, isDefault: true });
    if (i < 4) addresses.push({ customerId: id, label: 'Bodega', name: name + ' · Bodega', phone: phone(), addr: addr(), comuna: comunaW(), isDefault: false });
  });
  const personas = [['Valentina Pérez', 'Vitacura', 'Av. Vitacura 5480, depto 1203', 'valentina@correo.cl']];
  for (let i = 0; i < 25; i++) personas.push([person(), comunaW(), addr(), null]);
  personas.forEach(([name, comuna, a, email], i) => {
    const id = 'p' + (i + 1);
    customers.push({ id, type: 'persona', name, rut: `${r.int(10, 22)}.${r.int(100, 999)}.${r.int(100, 999)}-${r.int(0, 9)}`, email: email || `${name.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}${r.int(10, 99)}@correo.cl`, phone: phone(), plan: 'Persona', comuna, active: true, createdAt: iso(now - r.int(10, 500) * day) });
    addresses.push({ customerId: id, label: 'Casa', name, phone: phone(), addr: a, comuna, isDefault: true });
    if (i === 0) {
      addresses.push({ customerId: id, label: 'Oficina', name, phone: '+56 9 4444 2233', addr: 'Av. Apoquindo 3000, piso 8', comuna: 'Las Condes', isDefault: false });
      addresses.push({ customerId: id, label: 'Mamá', name: 'Carmen Pérez', phone: '+56 9 4444 8811', addr: 'Av. Grecia 1420', comuna: 'Ñuñoa', isDefault: false });
    }
  });
  users.push({ id: 'u-cli', name: 'Valentina Pérez', email: 'valentina@correo.cl', password: 'demo123', role: 'cliente', customerId: 'p1', color: '#e11d48', demo: true, active: true, phone: '+56 9 4444 2233' });
  users.push({ id: 'u-emp', name: 'Librería Andes', email: 'contacto@libreriaandes.cl', password: 'demo123', role: 'cliente', customerId: 'k1', color: '#059669', demo: true, active: true, phone: '+56 2 2600 1020' });
  customers.find(c => c.id === 'p1').userId = 'u-cli';
  customers.find(c => c.id === 'k1').userId = 'u-emp';
  const empresas = customers.filter(c => c.type === 'empresa');
  const pers = customers.filter(c => c.type === 'persona');
  const defAddr = cid => addresses.find(a => a.customerId === cid && a.isDefault);

  // ---------- Historial (60 días) ----------
  const shipments = [];
  const starsPick = () => { const x = r(); return x < .6 ? 5 : x < .88 ? 4 : x < .96 ? 3 : x < .99 ? 2 : 1; };
  for (let d = 60; d >= 0; d--) {
    const dayStart = new Date(now - d * day); dayStart.setHours(0, 0, 0, 0);
    const wd = dayStart.getDay();
    const factor = wd === 0 ? .35 : wd === 6 ? .7 : 1;
    let n = Math.round((9 + (60 - d) / 60 * 8 + r.int(-3, 4)) * factor);
    for (let k = 0; k < n; k++) {
      const created = dayStart.getTime() + (8 + r() * 13) * 3600e3;
      if (created > now - 40 * 60e3) continue;
      const biz = r.bool(.65);
      const cust = biz ? (r.bool(.3) ? empresas[0] : r.pick(empresas)) : (r.bool(.12) ? pers[0] : r.pick(pers));
      const from = biz ? cust.comuna : (r.bool(.5) ? cust.comuna : comunaW());
      const to = comunaW();
      const size = r.pick(['S', 'S', 'M', 'M', 'M', 'L', 'L', 'XL']);
      const service = r.pick(['estandar', 'estandar', 'estandar', 'express', 'express', 'programado']);
      const q = quote(P, from, to, size, service, { business: biz, at: created });
      const st = r() < .94 ? 'entregado' : r.bool() ? 'fallido' : 'cancelado';
      const sla = created + (q.totalMin + 15) * 60e3;
      const late = r() < .09;
      const picked = created + (q.pickupMin + r.int(-6, 8)) * 60e3;
      const delivered = late ? sla + r.int(6, 45) * 60e3 : picked + (q.transitMin + r.int(-4, 6)) * 60e3;
      const courier = r.pick(fleetW);
      const sa = biz ? defAddr(cust.id) : null;
      const s = {
        code: code(), customerId: cust.id, courierId: st === 'cancelado' ? null : courier.id,
        sender: { name: biz ? cust.name : cust.name, phone: cust.phone, addr: sa ? sa.addr : addr(), comuna: from },
        receiver: { name: person(), phone: phone(), addr: addr(), comuna: to },
        size, service, km: q.km, zone: q.zone, price: q.price, tip: r.bool(.18) ? r.pick([500, 1000, 1500, 2000]) : 0,
        status: st, createdAt: iso(created), slaAt: iso(sla), paid: true, channel: biz ? r.pick(['portal', 'portal', 'api', 'masivo']) : r.pick(['web', 'portal']),
        history: [{ s: 'pendiente', at: iso(created) }]
      };
      if (st !== 'cancelado') {
        s.assignedAt = iso(created + r.int(1, 6) * 60e3);
        s.history.push({ s: 'asignado', at: s.assignedAt });
        s.pickedAt = iso(picked); s.history.push({ s: 'retirado', at: s.pickedAt }, { s: 'en_camino', at: iso(picked + 3 * 60e3) });
        if (st === 'entregado') {
          s.deliveredAt = iso(delivered); s.history.push({ s: 'entregado', at: s.deliveredAt });
          s.pod = { name: r.bool(.8) ? s.receiver.name : 'Conserjería', auto: true, at: s.deliveredAt, photo: true };
          if (r.bool(.55)) { const stars = late ? Math.min(starsPick(), 3) : starsPick(); s.rating = { stars, comment: r.bool(.35) ? (stars >= 5 ? r.pick(COMMENTS5) : stars === 4 ? r.pick(COMMENTS4) : r.pick(COMMENTS_LOW)) : '', at: iso(delivered + 20 * 60e3) }; }
        } else {
          s.failedAt = iso(delivered); s.failReason = r.pick(['Destinatario ausente', 'Dirección incorrecta', 'Rechazado por el destinatario']);
          s.history.push({ s: 'fallido', at: s.failedAt, note: s.failReason });
        }
      } else { s.history.push({ s: 'cancelado', at: iso(created + 5 * 60e3), note: 'Cancelado por el cliente' }); }
      shipments.push(s);
    }
  }
  // Envío demo ya entregado (con prueba de entrega, sin calificar).
  const t30 = now - 25 * 60e3;
  shipments.push({
    code: 'RX-30981', customerId: 'k2', courierId: 'c1', demo: true,
    sender: { name: 'Tienda Nómade', phone: '+56 9 4444 5566', addr: 'Apoquindo 4400', comuna: 'Las Condes' },
    receiver: { name: 'Josefina Rivas', phone: '+56 9 4444 9900', addr: 'Príncipe de Gales 6820', comuna: 'La Reina' },
    size: 'L', service: 'estandar', km: 5.1, zone: 'A', price: 6980, tip: 1500, status: 'entregado', paid: true, channel: 'portal',
    createdAt: iso(t30 - 42 * 60e3), assignedAt: iso(t30 - 40 * 60e3), pickedAt: iso(t30 - 22 * 60e3), deliveredAt: iso(t30), slaAt: iso(t30 + 10 * 60e3),
    history: [{ s: 'pendiente', at: iso(t30 - 42 * 60e3) }, { s: 'asignado', at: iso(t30 - 40 * 60e3) }, { s: 'retirado', at: iso(t30 - 22 * 60e3) }, { s: 'en_camino', at: iso(t30 - 20 * 60e3) }, { s: 'entregado', at: iso(t30) }],
    pod: { name: 'Josefina Rivas', auto: true, at: iso(t30), photo: true },
    ...buildGeo('RX-30981', 'Las Condes', 'La Reina'),
    chat: [{ from: 'courier', text: 'Hola Josefina, voy en camino con tu pedido de Tienda Nómade.', at: iso(t30 - 18 * 60e3) }, { from: 'cliente', text: '¡Gracias! Estoy en casa.', at: iso(t30 - 17 * 60e3) }]
  });

  // ---------- Operación en curso ----------
  const live = (c, d) => {
    const g = buildGeo(c, d.from, d.to);
    const q = quote(P, d.from, d.to, d.size, d.service, { business: d.business });
    const created = now - (d.ago || 3) * 60e3;
    return {
      code: c, customerId: d.customerId, courierId: d.courierId || null, demo: !!d.demo,
      sender: d.sender, receiver: d.receiver, notes: d.notes || '', size: d.size, service: d.service,
      km: q.km, zone: q.zone, price: q.price, tip: d.tip || 0, status: 'pendiente', paid: !d.business, channel: d.channel || 'portal',
      createdAt: iso(created), slaAt: iso(d.lateBy ? now - d.lateBy * 60e3 : slaFor(now - 20e3, q.km, d.service) + 60e3),
      history: [{ s: 'pendiente', at: iso(created) }], chat: d.chat || [], slow: !!d.slow, ...g
    };
  };
  const startAt = (s, c, status, frac) => {
    const cour = couriers.find(x => x.id === c);
    const t = now;
    s.courierId = c; s.assignedAt = iso(now - 60e3); s.history.push({ s: 'asignado', at: s.assignedAt });
    s.plan = makePlan(s, cour.pos, t);
    if (status === 'asignado') { s.plan.preStart = t - s.plan.preDur * frac; }
    else {
      s.plan.preStart = t - s.plan.preDur - WAIT_MS - 1000;
      s.pickedAt = iso(s.plan.preStart + s.plan.preDur); s.history.push({ s: 'retirado', at: s.pickedAt });
      if (status === 'en_camino') { s.plan.transitStart = t - s.plan.transitDur * frac; s.history.push({ s: 'en_camino', at: iso(s.plan.transitStart) }); }
      else { s.pickedAt = iso(t - 3000); s.plan.preStart = t - 3000 - s.plan.preDur; }
    }
    s.status = status;
  };
  const S = (name, comuna, a, ph) => ({ name, phone: ph || phone(), addr: a || addr(), comuna });
  const L1 = live('RX-48213', { from: 'Ñuñoa', to: 'Vitacura', size: 'M', service: 'express', business: true, customerId: 'k1', demo: true, tip: 1000, ago: 4,
    sender: S('Librería Andes', 'Ñuñoa', 'Irarrázaval 3150', '+56 9 4444 1020'), receiver: S('Valentina Pérez', 'Vitacura', 'Av. Vitacura 5480, depto 1203', '+56 9 4444 2233'), notes: 'Dejar en conserjería si no estoy',
    chat: [{ from: 'sys', text: 'Chat con tu repartidor (simulado).', at: iso(now - 4 * 60e3) }, { from: 'courier', text: '¡Hola Valentina! Ya retiré tu pedido en Librería Andes, voy en camino.', at: iso(now - 60e3) }] });
  L1.customerId = 'k1'; L1.watchers = ['p1'];
  startAt(L1, 'c1', 'en_camino', .3);
  const L2 = live('RX-51027', { from: 'Santiago', to: 'Providencia', size: 'S', service: 'estandar', business: true, customerId: 'k5', demo: true, ago: 2,
    sender: S('Estudio Pino Abogados', 'Providencia', 'Suecia 84, of. 31', '+56 2 2600 1111'), receiver: S('Andrés Lagos', 'Providencia', 'Av. Nueva Providencia 2155', '+56 9 4444 7788') });
  L2.sender.comuna = 'Santiago'; L2.sender.addr = 'Huérfanos 1160, of. 402';
  startAt(L2, 'c2', 'asignado', .2);
  const more = [
    ['c3', 'en_camino', .6, 'Vinos Cordillera', 'Vitacura', 'k9', 'Lo Barnechea', 'L', false],
    ['c4', 'retirado', 0, 'Distribuidora Sur', 'Maipú', 'k6', 'Estación Central', 'L', false],
    ['c5', 'asignado', .5, 'Florería Pétalo', 'Providencia', 'k7', 'Ñuñoa', 'M', false],
    ['c6', 'en_camino', .15, 'Mascotas Felices SpA', 'La Florida', 'k10', 'Puente Alto', 'XL', true],
    ['c8', 'en_camino', .45, 'Ferretería Bellavista', 'Recoleta', 'k4', 'Las Condes', 'M', false],
    ['c9', 'asignado', .1, 'Óptica Mirada', 'Santiago', 'k8', 'San Miguel', 'S', false]
  ];
  const liveList = [L1, L2];
  more.forEach(([cid, st, f, bname, from, kid, to, size, slow], i) => {
    const s = live(code(), { from, to, size, service: i % 3 === 1 ? 'express' : 'estandar', business: true, customerId: kid, ago: 3 + i, slow,
      sender: S(bname, from, defAddr(kid).addr), receiver: S(person(), to), lateBy: slow ? 1 : 0 });
    startAt(s, cid, st, f);
    liveList.push(s);
  });
  // Pendientes (uno atrasado sin asignar)
  liveList.push(live(code(), { from: 'Las Condes', to: 'Peñalolén', size: 'M', service: 'estandar', business: false, customerId: 'p4', ago: 34, lateBy: 4, channel: 'web',
    sender: S(pers[3].name, 'Las Condes'), receiver: S(person(), 'Peñalolén'), notes: 'Llamar antes de llegar' }));
  liveList.push(live(code(), { from: 'Providencia', to: 'Santiago', size: 'S', service: 'express', business: true, customerId: 'k5', ago: 1,
    sender: S('Estudio Pino Abogados', 'Providencia', 'Suecia 84, of. 31'), receiver: S('Notaría Central', 'Santiago', 'Agustinas 1070') }));
  shipments.push(...liveList);
  // Valentina también tiene un envío propio en curso para su portal
  const own = live(code(), { from: 'Vitacura', to: 'Ñuñoa', size: 'S', service: 'estandar', business: false, customerId: 'p1', ago: 2, channel: 'portal',
    sender: S('Valentina Pérez', 'Vitacura', 'Av. Vitacura 5480, depto 1203', '+56 9 4444 2233'), receiver: S('Carmen Pérez', 'Ñuñoa', 'Av. Grecia 1420', '+56 9 4444 8811'), notes: 'Regalo, frágil' });
  startAt(own, 'c11', 'asignado', .35);
  couriers[10].online = true;
  shipments.push(own);

  // Calificación promedio por repartidor
  couriers.forEach(c => {
    const rs = shipments.filter(s => s.courierId === c.id && s.rating);
    c.ratings = rs.length;
    c.rating = rs.length ? Math.round(rs.reduce((a, s) => a + s.rating.stars, 0) / rs.length * 100) / 100 : 5;
    c.trips = shipments.filter(s => s.courierId === c.id && s.status === 'entregado').length + r.int(200, 1400);
    const last = shipments.filter(s => s.courierId === c.id && s.status === 'entregado' && !s.plan).pop();
    if (last && !shipments.some(s => s.courierId === c.id && s.plan)) c.pos = jitter(COM[last.receiver.comuna], r, 0.01);
  });

  // ---------- Facturas ----------
  const invoices = [];
  const monthKey = ms => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  const curMonth = monthKey(now);
  let fn = 18420, bn = 52310;
  customers.forEach(c => {
    const byMonth = {};
    shipments.filter(s => s.customerId === c.id && s.status !== 'cancelado').forEach(s => { const k = monthKey(Date.parse(s.createdAt)); (byMonth[k] = byMonth[k] || []).push(s); });
    Object.keys(byMonth).sort().forEach((k, idx, arr) => {
      const list = byMonth[k];
      const amount = list.reduce((a, s) => a + s.price, 0);
      const [y, m] = k.split('-').map(Number);
      const issued = new Date(y, m, 1, 9).getTime();
      let status = 'pagada';
      if (c.type === 'empresa') {
        if (k === curMonth) status = 'abierta';
        else if (idx === arr.length - 2 || (k !== curMonth && idx === arr.length - 1)) status = r.bool(.5) ? 'pendiente' : 'pagada';
        if (c.id === 'k6' && idx === 0) status = 'vencida';
      } else if (k === curMonth) return;
      const inv = { number: c.type === 'empresa' ? `F-${fn++}` : `B-${bn++}`, type: c.type === 'empresa' ? 'factura' : 'boleta', customerId: c.id, period: k, amount, count: list.length,
        status, issuedAt: iso(Math.min(issued, now)), dueAt: iso(issued + 30 * day), paidAt: status === 'pagada' ? iso(Math.min(issued + r.int(2, 20) * day, now)) : null };
      invoices.push(inv);
      if (c.type === 'empresa') list.forEach(s => { s.paid = status === 'pagada'; s.invoice = inv.number; });
    });
  });
  // Persona demo: la última boleta pendiente no aplica; todo pagado con tarjeta.

  // ---------- Incidencias ----------
  const incidents = [];
  const delivered = shipments.filter(s => s.status === 'entregado' && !s.plan && s.rating && s.rating.stars <= 3).slice(-8)
    .concat(shipments.filter(s => s.status === 'fallido').slice(-4), shipments.filter(s => s.status === 'entregado' && !s.plan).slice(-6, -2));
  const statuses = ['abierto', 'abierto', 'en_revision', 'en_revision', 'resuelto', 'resuelto', 'resuelto', 'rechazado'];
  delivered.forEach((s, i) => {
    const type = s.status === 'fallido' ? 'retraso' : s.rating?.stars <= 2 ? 'dano' : r.pick(['retraso', 'cobro', 'conducta', 'dano', 'otro']);
    const status = statuses[i % statuses.length];
    const opened = Date.parse(s.deliveredAt || s.failedAt || s.createdAt) + 2 * 3600e3;
    const desc = { retraso: 'El envío llegó mucho después de la hora comprometida.', dano: 'La caja llegó abollada y el contenido con daños.', extravio: 'No encuentro el paquete aunque figura entregado.', cobro: 'Me cobraron un monto mayor al cotizado.', conducta: 'El repartidor fue poco amable al entregar.', otro: 'Necesito el comprobante de entrega para mi contabilidad.' }[type];
    incidents.push({
      number: 'INC-' + (1040 + i), shipmentId: null, shipmentCode: s.code, customerId: s.customerId, courierId: s.courierId, type, priority: type === 'dano' || type === 'extravio' ? 'alta' : r.pick(['baja', 'media', 'media']),
      status, description: desc, assigneeId: status === 'abierto' && i % 2 ? null : r.pick(['u-sop', 'u-sop2']), compensation: status === 'resuelto' && (type === 'dano' || type === 'retraso') ? Math.round(s.price * .5 / 10) * 10 : 0,
      createdAt: iso(Math.min(opened, now - 3600e3)),
      notes: status === 'abierto' ? [] : [{ by: 'u-sop', text: 'Revisando evidencia de entrega y GPS del repartidor.', at: iso(Math.min(opened + 3600e3, now)) }, ...(status === 'resuelto' ? [{ by: 'u-sop', text: 'Se aplica nota de crédito al cliente.', at: iso(Math.min(opened + 7200e3, now)) }] : status === 'rechazado' ? [{ by: 'u-sop2', text: 'La evidencia muestra entrega conforme con firma.', at: iso(Math.min(opened + 7200e3, now)) }] : [])]
    });
  });

  const settings = {
    heroEyebrow: 'Courier en Santiago · 32 comunas',
    heroTitle: 'Tu envío cruza Santiago a la velocidad de un rayo.',
    heroSubtitle: 'Mensajería en moto, bici eléctrica y furgón. Retiramos en 30 minutos, lo sigues en vivo en el mapa y recibes la firma digital al entregar.',
    heroCta: 'Solicitar envío',
    announcement: 'Nuevo: carga masiva de envíos para empresas desde tu portal.',
    showAnnouncement: true,
    businessTitle: 'Rayo para empresas',
    businessText: 'Facturación mensual, carga masiva de envíos, API y un ejecutivo dedicado. Las cuentas empresa tienen 10% de descuento en todos los envíos.',
    courierTitle: '¿Eres repartidor independiente?',
    courierText: 'Súmate a la flota Rayo: eliges tus horarios y te quedas con el 70% de cada envío más el 100% de las propinas.',
    phone: '+56 2 2940 1234', email: 'hola@rayoexpress.cl', address: 'Av. Providencia 1650, Providencia', hours: 'Lun a sáb · 08:00 a 22:00',
    faqs: [
      { q: '¿Cuánto demora el retiro?', a: 'En Zona A retiramos en unos 20 minutos; en Zona B, 30; y en Zona C, 45. Express sale directo sin paradas.' },
      { q: '¿Qué pasa si no hay nadie para recibir?', a: 'El repartidor te escribe por el chat y puede dejarlo en conserjería con foto de respaldo. Si no es posible, el envío vuelve a origen.' },
      { q: '¿Cómo pago?', a: 'Personas pagan con tarjeta al solicitar. Las cuentas empresa reciben una factura mensual con todos sus envíos.' },
      { q: '¿Hacen envíos fuera de Santiago?', a: 'Por ahora cubrimos 32 comunas de la Región Metropolitana. Revisa el mapa de cobertura.' }
    ],
    autoAssign: true, offerSeconds: 30, simGenerate: true, simMaxActive: 12
  };

  return {
    users, couriers, customers, addresses, shipments, invoices, incidents,
    pricing: JSON.parse(JSON.stringify(P)), settings, seededAt: now,
    clock: { base: now, anchor: now, speed: 1 }, feed: []
  };
}
