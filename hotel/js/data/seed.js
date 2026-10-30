// Datos semilla de Hotel Bahía Lumen (hotel boutique ficticio en Valparaíso). Reproducibles con rng().
import { rng } from '../../../assets/core/db.js';
import { iso, addDays, diffDays } from '../shared/dates.js';
import { quoteCore } from './pricing-core.js';

export const COLORS = ['#b08a46', '#2f5d62', '#7a4f9a', '#a8432f', '#3d6bb3', '#5b8c51', '#8a6247', '#c06c84'];

const TYPES = [
  { id: 'clasica', name: 'Clásica Cerro', short: 'Acogedora, con vista a los techos de colores del Cerro Alegre.', size: 22, beds: '1 queen o 2 twin', maxGuests: 2, view: 'Cerro', baseRate: 89000, tone: 'accent', icon: '🏘️',
    desc: 'Pisos de roble restaurado, ventanales de guillotina y vista a los techos de calamina del cerro. Ideal para escapadas cortas y viajeros que salen a recorrer la ciudad.',
    amenities: ['Wi-Fi 300 Mbps', 'Ducha lluvia', 'Smart TV', 'Cafetera de cápsulas', 'Amenities de autor', 'Calefacción'] },
  { id: 'superior', name: 'Superior Vista Bahía', short: 'Ventanal panorámico hacia la bahía y los barcos.', size: 28, beds: '1 king', maxGuests: 3, view: 'Bahía', baseRate: 129000, tone: 'info', icon: '🌊',
    desc: 'Un ventanal de piso a cielo hacia la bahía de Valparaíso. Despierta con los barcos entrando al puerto y el sonido de las gaviotas.',
    amenities: ['Wi-Fi 300 Mbps', 'Vista al mar', 'Cama king', 'Bañera exenta', 'Minibar local', 'Smart TV', 'Calefacción'] },
  { id: 'deluxe', name: 'Deluxe Balcón', short: 'Balcón privado de hierro forjado sobre el puerto.', size: 34, beds: '1 king + sofá cama', maxGuests: 3, view: 'Bahía', baseRate: 159000, tone: 'success', icon: '🌅',
    desc: 'Balcón de hierro forjado original de 1910, sillones de lectura y una vista abierta al puerto. Perfecta para atardeceres con una copa de carmenere.',
    amenities: ['Balcón privado', 'Vista al mar', 'Cama king', 'Sofá cama', 'Nespresso', 'Bata y pantuflas', 'Minibar local'] },
  { id: 'suite', name: 'Suite Lumen', short: 'Living independiente, tina de hidromasaje y terraza.', size: 52, beds: '1 king', maxGuests: 4, view: 'Bahía 180°', baseRate: 239000, tone: 'primary', icon: '✨',
    desc: 'Nuestra suite insignia: living independiente con chimenea, tina de hidromasaje frente al ventanal y terraza con vista de 180° a la bahía.',
    amenities: ['Terraza 180°', 'Hidromasaje', 'Chimenea', 'Living independiente', 'Tocadiscos y vinilos', 'Desayuno en la habitación', 'Late check-out sujeto a disponibilidad'] },
  { id: 'panoramica', name: 'Suite Ascensor Panorámica', short: 'Penthouse junto al ascensor histórico, mirador privado.', size: 70, beds: '1 king + 1 queen', maxGuests: 4, view: 'Mirador privado', baseRate: 349000, tone: 'warning', icon: '🔭',
    desc: 'El penthouse del hotel, junto al ascensor histórico. Dos dormitorios, mirador privado en la azotea y servicio de mayordomía.',
    amenities: ['Mirador privado', 'Dos dormitorios', 'Mayordomía', 'Hidromasaje', 'Bar equipado', 'Traslado incluido', 'Vista 360°'] }
];
const ROOMS = [['101', 'clasica', 1], ['102', 'clasica', 1], ['103', 'clasica', 1], ['104', 'clasica', 1], ['105', 'superior', 1], ['106', 'superior', 1],
  ['201', 'clasica', 2], ['202', 'clasica', 2], ['203', 'superior', 2], ['204', 'superior', 2], ['205', 'deluxe', 2], ['206', 'deluxe', 2],
  ['301', 'clasica', 3], ['302', 'clasica', 3], ['303', 'superior', 3], ['304', 'superior', 3], ['305', 'deluxe', 3], ['306', 'deluxe', 3],
  ['401', 'suite', 4], ['402', 'suite', 4], ['501', 'panoramica', 5]];

const SEASONS = [
  { id: 'ss-alta', name: 'Temporada alta (verano)', from: '12-15', to: '03-10', multiplier: 1.35, active: true },
  { id: 'ss-ano', name: 'Año Nuevo en el mar', from: '12-28', to: '01-02', multiplier: 1.9, active: true },
  { id: 'ss-patrias', name: 'Fiestas Patrias', from: '09-16', to: '09-20', multiplier: 1.4, active: true },
  { id: 'ss-media', name: 'Temporada media (primavera)', from: '09-21', to: '12-14', multiplier: 1.1, active: true },
  { id: 'ss-baja', name: 'Temporada baja (invierno)', from: '05-01', to: '08-31', multiplier: .85, active: true }
];
const EXTRAS = [
  { id: 'x-desayuno', name: 'Desayuno buffet porteño', desc: 'Panadería de la casa, frutas, huevos a la carta y café de grano.', price: 16000, per: 'persona-noche', icon: '🥐', active: true },
  { id: 'x-spa', name: 'Circuito spa Marejada', desc: 'Piscina temperada, sauna y sala de relajo (2 h por persona).', price: 32000, per: 'estadia', icon: '💆', active: true },
  { id: 'x-transfer', name: 'Transfer aeropuerto SCL', desc: 'Traslado privado ida desde el aeropuerto de Santiago.', price: 65000, per: 'estadia', icon: '🚐', active: true },
  { id: 'x-parking', name: 'Estacionamiento', desc: 'Estacionamiento techado a 50 m del hotel.', price: 12000, per: 'noche', icon: '🅿️', active: true },
  { id: 'x-espumante', name: 'Espumante y chocolates de bienvenida', desc: 'Espumante del valle de Casablanca y bombones artesanales.', price: 29000, per: 'estadia', icon: '🍾', active: true },
  { id: 'x-late', name: 'Late check-out (16:00)', desc: 'Disfruta tu habitación hasta las 16:00.', price: 35000, per: 'estadia', icon: '🕓', active: true }
];
const CHANNELS = [
  { id: 'web', name: 'Sitio web (directo)', commission: 0, markup: 0, active: true, tone: 'primary', icon: '🌐' },
  { id: 'booklink', name: 'Booklink', commission: 17, markup: 12, active: true, tone: 'info', icon: '🅱️' },
  { id: 'viajafacil', name: 'ViajaFácil', commission: 15, markup: 10, active: true, tone: 'warning', icon: '🧳' },
  { id: 'tripnest', name: 'TripNest', commission: 18, markup: 14, active: true, tone: 'success', icon: '🪺' },
  { id: 'telefono', name: 'Teléfono / correo', commission: 0, markup: 0, active: true, tone: 'accent', icon: '☎️' },
  { id: 'agencia', name: 'Agencias corporativas', commission: 10, markup: 0, active: false, tone: 'danger', icon: '🏢' }
];
const OFFERS = [
  { id: 'of-1', title: 'Escapada de primavera', desc: '3 noches o más con 15% de descuento y circuito spa de regalo.', code: 'PRIMAVERA15', discountPct: 15, minNights: 3, active: true, tone: 'success' },
  { id: 'of-2', title: 'Reserva anticipada', desc: 'Reserva directo con 30 días de anticipación y ahorra 10%.', code: 'ANTICIPA10', discountPct: 10, minNights: 1, active: true, tone: 'info' },
  { id: 'of-3', title: 'Semana porteña', desc: '7 noches para vivir Valparaíso como local: 25% de descuento.', code: 'PORTENO25', discountPct: 25, minNights: 7, active: true, tone: 'warning' }
];
const SPA = [
  { id: 'sp1', name: 'Masaje de piedras volcánicas', mins: 60, price: 58000, icon: '🪨' }, { id: 'sp2', name: 'Ritual de algas del Pacífico', mins: 75, price: 69000, icon: '🌿' },
  { id: 'sp3', name: 'Masaje descontracturante', mins: 50, price: 49000, icon: '💆' }, { id: 'sp4', name: 'Facial de rosa mosqueta', mins: 45, price: 45000, icon: '🌹' },
  { id: 'sp5', name: 'Circuito de aguas para dos', mins: 120, price: 62000, icon: '♨️' }
];
const DISHES = [
  { id: 'rs1', name: 'Ceviche de reineta y leche de tigre de maqui', price: 14900, cat: 'Entradas' }, { id: 'rs2', name: 'Machas a la parmesana', price: 13900, cat: 'Entradas' },
  { id: 'rs3', name: 'Congrio en caldillo nerudiano', price: 19900, cat: 'Fondos' }, { id: 'rs4', name: 'Pulpo al carbón con papas chilotas', price: 21900, cat: 'Fondos' },
  { id: 'rs5', name: 'Risotto de quínoa y hongos de pino', price: 16900, cat: 'Fondos' }, { id: 'rs6', name: 'Suspiro limeño de lúcuma', price: 7900, cat: 'Postres' }
];
const FIRST = ['Valentina', 'Matías', 'Camila', 'Benjamín', 'Antonia', 'Vicente', 'Josefa', 'Martín', 'Isidora', 'Tomás', 'Florencia', 'Agustín', 'Catalina', 'Joaquín', 'Fernanda', 'Diego', 'Javiera', 'Cristóbal', 'Lucía', 'Sofía', 'Emma', 'Hugo', 'Liam', 'Olivia', 'Noah', 'Mía', 'Lukas', 'Clara', 'Julien', 'Ana'];
const LAST = ['Rojas', 'Muñoz', 'González', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Fuentes', 'Araya', 'Espinoza', 'Pereira', 'Schmidt', 'Dubois', 'Smith', 'Rossi', 'Fernández', 'López', 'Costa'];
const COUNTRIES = [['Chile', 12], ['Argentina', 3], ['Brasil', 3], ['Estados Unidos', 2], ['Alemania', 1], ['Francia', 1], ['España', 1], ['Perú', 1], ['Reino Unido', 1]];

export function seed() {
  const r = rng(77031);
  const now = new Date();
  const T = iso(now);
  const settings = {
    name: 'Hotel Bahía Lumen', tagline: 'Hotel boutique en el Cerro Alegre · Valparaíso',
    heroTitle: 'Despierta frente a la bahía más colorida del Pacífico',
    heroText: 'Veintiún habitaciones en una casona patrimonial de 1910, a pasos del ascensor Reina Victoria. Diseño, calma y el mejor atardecer de Valparaíso.',
    about: 'Bahía Lumen nació de la restauración de una casona de comerciantes ingleses. Conservamos sus pisos de roble, vitrales y escaleras de fierro, y sumamos un spa, un restaurante de cocina del Pacífico y un servicio cercano, de barrio.',
    spaText: 'Marejada Spa: piscina temperada con vista al puerto, sauna de ciprés y tratamientos con algas y rosa mosqueta.',
    restaurantText: 'Marea Alta: cocina del Pacífico con pesca artesanal de la caleta Portales y vinos de Casablanca. Abierto todos los días de 13:00 a 23:00.',
    announcement: 'Primavera en el puerto: 15% de descuento por 3 noches o más con el código PRIMAVERA15',
    address: 'Pasaje Templeman 455, Cerro Alegre, Valparaíso', phone: '+56 32 555 0410', email: 'reservas@bahialumen.cl',
    checkInTime: '15:00', checkOutTime: '12:00', freeCancelDays: 3, penaltyNights: 1, weekendMult: 1.15, depositPct: 30, minNights: 1
  };
  const types = TYPES.map((t, i) => ({ ...t, order: i + 1, active: true }));
  const rooms = ROOMS.map(([number, typeId, floor]) => ({ id: 'r' + number, number, typeId, floor, hk: 'inspeccionada', note: '', assignedTo: '' }));
  const users = [
    { id: 'u-admin', name: 'Isabel Undurraga', email: 'admin@bahialumen.cl', password: 'demo123', role: 'admin', color: COLORS[0], demo: true, active: true },
    { id: 'u-rec', name: 'Felipe Navarro', email: 'recepcion@bahialumen.cl', password: 'demo123', role: 'recepcion', color: COLORS[1], demo: true, active: true },
    { id: 'u-hk', name: 'Marisol Vidal', email: 'limpieza@bahialumen.cl', password: 'demo123', role: 'housekeeping', color: COLORS[5], demo: true, active: true },
    { id: 'u-rev', name: 'Andrés Lagos', email: 'revenue@bahialumen.cl', password: 'demo123', role: 'revenue', color: COLORS[4], demo: true, active: true },
    { id: 'u-guest', name: 'Emma Schmidt', email: 'emma@correo.de', password: 'demo123', role: 'guest', color: COLORS[7], demo: true, active: true, guestId: 'g-demo' },
    { id: 'u-hk2', name: 'Rosa Cárdenas', email: 'rosa@bahialumen.cl', password: 'demo123', role: 'housekeeping', color: COLORS[6], demo: false, active: true },
    { id: 'u-rec2', name: 'Paula Ibáñez', email: 'paula@bahialumen.cl', password: 'demo123', role: 'recepcion', color: COLORS[2], demo: false, active: false }
  ];
  const countryPool = COUNTRIES.flatMap(([c, w]) => Array(w).fill(c));
  const guests = [{ id: 'g-demo', name: 'Emma Schmidt', email: 'emma@correo.de', phone: '+49 151 2345 6789', country: 'Alemania', doc: 'C01X00T47', vip: true, tags: ['Club Lumen'], notes: 'Prefiere piso alto. Alergia a las plumas.', createdAt: new Date(Date.now() - 300 * 864e5).toISOString() }];
  for (let i = 0; i < 110; i++) {
    const name = `${r.pick(FIRST)} ${r.pick(LAST)}`;
    const country = r.pick(countryPool);
    guests.push({ id: 'g' + i, name, email: name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(' ', '.') + (i % 7) + '@correo.com',
      phone: country === 'Chile' ? `+56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}` : `+${r.int(1, 99)} ${r.int(100, 999)} ${r.int(100000, 999999)}`, country, doc: country === 'Chile' ? `${r.int(8, 22)}.${r.int(100, 999)}.${r.int(100, 999)}-${r.int(0, 9)}` : 'P' + r.int(1000000, 9999999),
      vip: r.bool(.08), tags: r.bool(.2) ? [r.pick(['Luna de miel', 'Corporativo', 'Repite', 'Club Lumen'])] : [], notes: '', createdAt: new Date(Date.now() - r.int(10, 700) * 864e5).toISOString() });
  }
  const chanPool = ['web', 'web', 'web', 'web', 'booklink', 'booklink', 'booklink', 'viajafacil', 'viajafacil', 'tripnest', 'telefono', 'telefono'];
  const extrasFor = () => {
    const ex = [];
    if (r.bool(.62)) ex.push({ extraId: 'x-desayuno', qty: 1 });
    if (r.bool(.2)) ex.push({ extraId: 'x-spa', qty: r.int(1, 2) });
    if (r.bool(.14)) ex.push({ extraId: 'x-transfer', qty: 1 });
    if (r.bool(.18)) ex.push({ extraId: 'x-parking', qty: 1 });
    if (r.bool(.08)) ex.push({ extraId: 'x-espumante', qty: 1 });
    return ex;
  };
  const reservations = [];
  let seq = 4800;
  const mk = (room, ci, co, status, extra = {}) => {
    const type = types.find(t => t.id === room.typeId);
    const adults = Math.min(type.maxGuests, r.pick([1, 2, 2, 2, 2, 3])), children = type.maxGuests > adults && r.bool(.15) ? 1 : 0;
    const channel = extra.channel || r.pick(chanPool);
    const offer = channel === 'web' && r.bool(.18) ? OFFERS[r.int(0, 1)] : null;
    const q = quoteCore(type, ci, co, { seasons: SEASONS, settings, extras: extra.extras || extrasFor(), extrasCatalog: EXTRAS, adults, children, offer });
    const guest = extra.guestId ? guests.find(g => g.id === extra.guestId) : r.pick(guests.slice(1));
    const lead = r.int(1, 60);
    const created = new Date(+new Date(ci + 'T12:00') - lead * 864e5);
    let paid = 0;
    if (status === 'check-out') paid = q.total;
    else if (status === 'check-in') paid = channel === 'web' ? q.total : Math.round(q.total * .3);
    else if (status === 'confirmada') paid = channel === 'web' ? q.total : channel === 'telefono' ? Math.round(q.total * .3) : 0;
    const res = {
      id: 'b' + (++seq), code: 'BL-' + seq, guestId: guest.id, guestName: guest.name, roomTypeId: type.id, roomId: room.id, checkIn: ci, checkOut: co, nights: q.n, adults, children,
      status, channel, extras: q.extrasLines, roomTotal: q.roomTotal, extrasTotal: q.extrasTotal, discount: q.discount, offerCode: q.offerCode, total: q.total, paid,
      notes: r.bool(.12) ? r.pick(['Llegada tarde (23:00)', 'Aniversario: decoración', 'Cuna para bebé', 'Celíaco', 'Piso alto, por favor']) : '',
      createdAt: created.toISOString(), checkin: status === 'check-in' || status === 'check-out' ? { done: true, at: ci + 'T15:20:00' } : null, ...extra.patch
    };
    reservations.push(res);
    return res;
  };
  rooms.forEach(room => {
    let d = -120 + r.int(0, 3);
    while (d < 75) {
      const ahead = d > 0 ? Math.floor(d / 8) : 0;
      d += d > 0 ? r.int(1, 3 + ahead) : r.bool(.35) ? 0 : r.int(0, 2);
      const nights = r.pick([1, 2, 2, 2, 3, 3, 3, 4, 5, 7]);
      const ci = addDays(T, d), co = addDays(T, d + nights);
      if (room.number === '304' && d + nights > -2) break; // fuera de servicio
      if (d >= 75) break;
      let status;
      if (d + nights < 0) status = r.bool(.03) ? 'no-show' : 'check-out';
      else if (d + nights === 0) status = r.bool(.55) ? 'check-in' : 'check-out'; // salidas de hoy
      else if (d < 0) status = 'check-in';
      else if (d === 0) status = r.bool(.4) ? 'check-in' : 'confirmada'; // llegadas de hoy
      else status = 'confirmada';
      mk(room, ci, co, status);
      d += nights;
    }
  });
  // Reservas canceladas (no ocupan habitación)
  for (let i = 0; i < 46; i++) {
    const room = r.pick(rooms), d = r.int(-110, 60), n = r.int(1, 4);
    mk(room, addDays(T, d), addDays(T, d + n), 'cancelada', { patch: { roomId: '', cancelledAt: new Date(Date.now() - r.int(1, 30) * 864e5).toISOString() } });
  }
  // Reserva futura del huésped demo + estadía pasada
  const freeRoom = (typeId, a, b) => rooms.find(rm => rm.typeId === typeId && rm.number !== '304' && !reservations.some(x => x.roomId === rm.id && x.status !== 'cancelada' && x.checkIn < b && a < x.checkOut));
  const da = addDays(T, 9), db2 = addDays(T, 12);
  const rmDemo = freeRoom('deluxe', da, db2) || freeRoom('superior', da, db2) || rooms[0];
  const demoRes = mk(rmDemo, da, db2, 'confirmada', { guestId: 'g-demo', channel: 'web', extras: [{ extraId: 'x-desayuno', qty: 1 }, { extraId: 'x-transfer', qty: 1 }] });
  demoRes.code = 'BL-DEMO1'; demoRes.adults = 2; demoRes.children = 0;
  const pa = addDays(T, -95), pb = addDays(T, -92);
  const rmPast = freeRoom('superior', pa, pb);
  if (rmPast) mk(rmPast, pa, pb, 'check-out', { guestId: 'g-demo', channel: 'web' });

  // Folios materializados para huéspedes en casa (cargos extra)
  reservations.filter(x => x.status === 'check-in').forEach(x => {
    x.folio = [];
    const addC = (date, desc, amount, kind = 'cargo', method = '') => x.folio.push({ id: 'f' + Math.floor(r() * 1e9).toString(36), date, desc, amount, kind, method });
    if (x.paid) addC(x.checkIn, x.paid === x.total ? 'Prepago web' : 'Abono de reserva', x.paid, 'pago', x.channel === 'web' ? 'Tarjeta (web)' : 'Transferencia');
    for (let d = x.checkIn; d < T && d < x.checkOut; d = addDays(d, 1)) {
      if (r.bool(.35)) addC(d, r.pick(['Minibar', 'Restaurante Marea Alta', 'Bar del lobby', 'Lavandería', 'Room service']), r.pick([6500, 12900, 18500, 24900, 34900]));
    }
  });

  // Ama de llaves: estado de habitaciones según ocupación de hoy
  const hkStaff = ['u-hk', 'u-hk2'];
  rooms.forEach((room, i) => {
    const inHouse = reservations.find(x => x.roomId === room.id && x.status === 'check-in');
    const departedToday = reservations.find(x => x.roomId === room.id && x.status === 'check-out' && x.checkOut === T);
    if (room.number === '304') { room.hk = 'fuera'; room.note = 'Filtración en el baño: gasfíter agendado'; return; }
    room.hk = departedToday ? 'sucia' : inHouse ? r.pick(['sucia', 'sucia', 'limpia', 'inspeccionada']) : r.pick(['inspeccionada', 'inspeccionada', 'limpia', 'sucia']);
    room.assignedTo = hkStaff[i % 2];
  });

  const requests = [];
  for (let i = 0; i < 9; i++) {
    const g = r.pick(guests);
    const type = r.pick(['spa', 'spa', 'restaurante', 'restaurante', 'conserjería']);
    requests.push({ id: 'rq' + i, type, guestName: g.name, email: g.email, date: addDays(T, r.int(-3, 6)), time: r.pick(['13:30', '16:00', '18:00', '20:30', '21:00']), people: r.int(1, 4),
      detail: type === 'spa' ? r.pick(SPA).name : type === 'restaurante' ? 'Mesa junto a la ventana' : r.pick(['Tour por los cerros', 'Arriendo de bicicletas', 'Reserva en viña Casablanca']), status: r.pick(['pendiente', 'confirmada', 'confirmada']), createdAt: new Date(Date.now() - r.int(0, 5) * 864e5).toISOString() });
  }
  return {
    settings, seq, roomTypes: types, rooms, seasons: SEASONS, extras: EXTRAS, channels: CHANNELS.map(c => ({ ...c, lastSync: new Date(Date.now() - r.int(5, 90) * 6e4).toISOString(), allotment: Object.fromEntries(types.map(t => [t.id, c.id === 'web' || c.id === 'telefono' ? null : r.int(1, 3)])) })),
    offers: OFFERS, spa: SPA, dishes: DISHES, users, guests, reservations, requests
  };
}
export const daysBetween = diffDays;
