// Datos semilla de Pudú Envíos: reproducibles (rng) y relativos a la hora actual, para que la
// operación se vea viva a cualquier hora: 4 rutas simuladas avanzan solas, Daniela va a mitad de
// ruta y Jorge (cuenta demo) tiene su ruta lista para iniciar.
import { rng } from '../../assets/core/db.js';
import { rut } from '../../assets/core/domain.js';
import { COMUNAS, COMUNA, DEPOT, optimizeRoute, hrand } from './geo.js';
import { planRoute, simulateRoute, applyAttempt, stopCtx, iso, hm, dayAt, scribble, nextDay } from './engine.js';

const FIRST = ['Camila', 'Benjamín', 'Antonia', 'Joaquín', 'Isidora', 'Tomás', 'Florencia', 'Vicente', 'Martina', 'Agustín', 'Josefa', 'Matías', 'Trinidad', 'Lucas', 'Emilia', 'Cristóbal', 'Fernanda', 'Diego', 'Constanza', 'Ignacio', 'Javiera', 'Felipe', 'Catalina', 'Sebastián', 'María José', 'Gonzalo', 'Paz', 'Rodrigo', 'Valentina', 'Nicolás', 'Carmen', 'Raúl', 'Pía', 'Hernán', 'Gabriela', 'Patricio'];
const LAST = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López', 'Fuentes', 'Hernández', 'Torres', 'Araya', 'Flores', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Gutiérrez', 'Castro', 'Pizarro', 'Álvarez', 'Vásquez', 'Sánchez', 'Fernández', 'Ramírez', 'Carrasco', 'Gómez', 'Cortés', 'Herrera', 'Núñez'];
const DESCS = ['Ropa', 'Lanas y madejas', 'Libros', 'Medicamentos', 'Accesorio celular', 'Zapatillas', 'Cosméticos', 'Juguete', 'Repuesto electrónico', 'Té y café', 'Silla plegable', 'Lámpara', 'Plantas', 'Cervezas artesanales', 'Notebook'];
const ADDR_NOTES = [
  ['Conserje recibe hasta las 20:00; pedir que firme el libro de encomiendas.', 'Conserjería'],
  ['El timbre no funciona: llamar al celular al llegar.', 'Timbre malo'],
  ['Perro grande suelto en el antejardín. Esperar a que lo amarren.', 'Perro bravo'],
  ['Acceso por la calle lateral, portón verde. El número no se ve desde la avenida.', 'Acceso'],
  ['Estacionar en la vereda norte: en la sur pasa la grúa municipal.', 'Estacionamiento'],
  ['Edificio sin ascensor, 4.º piso. Bultos pesados: avisar antes.', 'Escaleras'],
  ['La dueña trabaja de noche, prefiere entregas después de las 12:00.', 'Horario'],
  ['Condominio: registrar patente en la caseta y dejar carnet.', 'Condominio'],
  ['Local comercial: entregar por la puerta de servicio, no por la tienda.', 'Comercio']
];
const REC_NOTES = [
  ['Dejar con conserje', 'Si no estoy, dejar en conserjería.'], ['Timbre malo', 'Golpear fuerte o llamar.'], ['Perro bravo', 'Hay perro, no abrir el portón.'],
  ['Llamar antes de llegar', 'Llamar 10 minutos antes, bajo a buscarlo.'], ['Portón negro', 'Casa de portón negro al fondo del pasaje.'], ['Depto. interior / pasaje', 'Depto. interior, tocar el timbre 2.'],
  ['Dejar con vecino', 'Si no hay nadie, dejar con la vecina del 1203.'], ['No dejar en la puerta', 'Por favor no dejar en la puerta, se lo roban.']
];
const PAD = n => String(n).padStart(2, '0');
const tstr = d => `${d.getFullYear()}-${PAD(d.getMonth() + 1)}-${PAD(d.getDate())}`;

export function seed() {
  const r = rng(2611);
  const now = Date.now();
  const today = tstr(new Date());
  const yesterday = tstr(new Date(now - 864e5));
  const tomorrow = tstr(new Date(now + 864e5));
  const name = () => `${r.pick(FIRST)} ${r.pick(LAST)} ${r.pick(LAST)}`;
  const phone = () => `+56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}`;

  // ---------- Catálogos ----------
  const zones = [
    ['centro', 'Centro', '#2563eb', 600], ['norte', 'Norte', '#7c3aed', 900], ['oriente', 'Oriente', '#db2777', 0],
    ['suroriente', 'Sur-Oriente', '#d97706', 900], ['sur', 'Sur', '#059669', 600], ['poniente', 'Poniente', '#0891b2', 600]
  ].map(([k, n, color, surcharge]) => ({ id: 'z-' + k, key: k, name: n, color, surcharge, cutoff: k === 'norte' || k === 'suroriente' ? '10:30' : '11:00', comunas: COMUNAS.filter(c => c.zone === k).map(c => c.n) }));
  const rates = [
    { id: 'rt-pyme', name: 'Pyme', base: 3490, perKg: 390, perPiece: 600, express: 2500, sameDay: 4500, codPct: 2.5 },
    { id: 'rt-emp', name: 'Empresa', base: 2990, perKg: 290, perPiece: 500, express: 2200, sameDay: 3900, codPct: 2 },
    { id: 'rt-mkt', name: 'Marketplace', base: 2590, perKg: 250, perPiece: 450, express: 1990, sameDay: 3500, codPct: 1.8 }
  ];
  const companies = [
    ['co-lana', 'Lana Austral SpA', 'Francisca Ibarra', 'Av. Italia 1180', 'Providencia', 'rt-pyme', 'contacto@lanaaustral.cl'],
    ['co-roble', 'Mueblería Roble Nativo Ltda.', 'Tomás Bravo', 'Camino a Melipilla 9870', 'Cerrillos', 'rt-emp', 'ventas@roblenativo.cl'],
    ['co-lirio', 'Botica Lirio', 'Pilar Marín', 'Irarrázaval 3021', 'Ñuñoa', 'rt-emp', 'despacho@boticalirio.cl'],
    ['co-tecno', 'TecnoPuerto SpA', 'Esteban Cáceres', 'Av. Departamental 4400', 'San Joaquín', 'rt-mkt', 'logistica@tecnopuerto.cl'],
    ['co-cumbre', 'Cervecería Cumbre Andina', 'Rocío Leiva', 'Lo Marcoleta 600', 'Quilicura', 'rt-pyme', 'pedidos@cumbreandina.cl'],
    ['co-quillay', 'Vivero Quillay', 'Germán Ulloa', 'Camino Otoñal 1450', 'Lo Barnechea', 'rt-pyme', 'hola@viveroquillay.cl']
  ].map(([id, n, contact, address, comuna, rateId, email], i) => {
    const c = COMUNA[comuna];
    return { id, name: n, rut: rut.make(76100200 + i * 913417), contact, email, phone: `+56 2 2${r.int(100, 999)} ${r.int(1000, 9999)}`, address, comuna, x: +(c.x + .3).toFixed(3), y: +(c.y - .2).toFixed(3), rateId, active: true, createdAt: iso(now - (400 - i * 40) * 864e5) };
  });
  const points = [
    ['pt-tob', 'Locker Tobalaba', 'Locker', 'Av. Providencia 2594', 'Providencia', 'Todos los días 07:00-22:00', 40],
    ['pt-nun', 'Locker Plaza Ñuñoa', 'Locker', 'Jorge Washington 26', 'Ñuñoa', 'Todos los días 08:00-21:00', 32],
    ['pt-stgo', 'Librería El Farol', 'Tienda aliada', 'San Diego 840', 'Santiago', 'L-S 10:00-19:30', 25],
    ['pt-mai', 'Ferretería Los Aromos', 'Tienda aliada', '5 de Abril 120', 'Maipú', 'L-S 09:00-20:00', 30],
    ['pt-flo', 'Locker Bellavista La Florida', 'Locker', 'Vicuña Mackenna 7110', 'La Florida', 'Todos los días 07:00-22:00', 48],
    ['pt-smi', 'Minimarket Don Lucho', 'Tienda aliada', 'Gran Avenida 5210', 'San Miguel', 'L-D 09:00-22:00', 20],
    ['pt-ind', 'Bazar La Vega', 'Tienda aliada', 'Av. Independencia 565', 'Independencia', 'L-S 08:30-18:30', 18]
  ].map(([id, n, kind, address, comuna, hours, capacity]) => { const c = COMUNA[comuna]; return { id, name: n, kind, address, comuna, hours, capacity, x: +(c.x + (hrand(id) - .5)).toFixed(3), y: +(c.y + (hrand(id + 'y') - .5)).toFixed(3), active: true }; });
  const vehicles = [
    ['v1', 'KTRZ-41', 'Peugeot Partner', 'Furgón', 'Diésel', 650, 3300, 84210],
    ['v2', 'LBXD-77', 'Citroën Berlingo', 'Furgón', 'Diésel', 700, 3600, 61540],
    ['v3', 'PGHS-12', 'Renault Master', 'Furgón grande', 'Diésel', 1300, 10800, 120330],
    ['v4', 'RJWT-58', 'Maxus eDeliver 3', 'Eléctrico', 'Eléctrico', 900, 4800, 22870],
    ['v5', 'JZKC-90', 'Hyundai H100', 'Camioneta', 'Diésel', 1000, 5200, 143900],
    ['v6', 'SVLP-33', 'Toyota Hiace', 'Furgón grande', 'Diésel', 1100, 9300, 98760],
    ['v7', 'HXFR-26', 'Peugeot Partner', 'Furgón', 'Diésel', 650, 3300, 39820],
    ['v8', 'TT-4821', 'Honda XR150 con caja', 'Moto', 'Bencina', 25, 90, 18300],
    ['v9', 'GKPW-64', 'Ford Transit', 'Furgón grande', 'Diésel', 1400, 11500, 156020]
  ].map(([id, plate, model, type, fuel, capKg, capL, odometer], i) => ({ id, plate, model, type, fuel, capKg, capL, odometer, nextService: Math.ceil(odometer / 10000) * 10000 + 10000, rtDue: tstr(new Date(now + (30 + i * 41) * 864e5)), status: id === 'v9' ? 'mantencion' : 'operativo' }));

  const users = [
    { id: 'u-admin', name: 'Paula Sepúlveda', email: 'admin@puduenvios.cl', password: 'admin123', role: 'admin', color: '#4f46e5', demo: true },
    { id: 'u-coord', name: 'Rodrigo Álvarez', email: 'despacho@puduenvios.cl', password: 'despacho123', role: 'coordinador', color: '#0891b2', demo: true },
    { id: 'u-coord2', name: 'Marcela Tapia', email: 'marcela@puduenvios.cl', password: 'despacho123', role: 'coordinador', color: '#be185d' },
    { id: 'u-c1', name: 'Jorge Fuentes', email: 'conductor@puduenvios.cl', password: 'conductor123', role: 'conductor', color: '#db2777', demo: true, vehicleId: 'v1', zoneId: 'z-oriente' },
    { id: 'u-c2', name: 'Daniela Contreras', email: 'daniela@puduenvios.cl', password: 'conductor123', role: 'conductor', color: '#059669', demo: true, vehicleId: 'v2', zoneId: 'z-sur' },
    { id: 'u-c3', name: 'Matías Pizarro', email: 'matias@puduenvios.cl', password: 'conductor123', role: 'conductor', color: '#2563eb', vehicleId: 'v3', zoneId: 'z-centro' },
    { id: 'u-c4', name: 'Pedro Araya', email: 'pedro@puduenvios.cl', password: 'conductor123', role: 'conductor', color: '#7c3aed', vehicleId: 'v4', zoneId: 'z-norte' },
    { id: 'u-c5', name: 'Carolina Vega', email: 'carolina@puduenvios.cl', password: 'conductor123', role: 'conductor', color: '#0891b2', vehicleId: 'v5', zoneId: 'z-poniente' },
    { id: 'u-c6', name: 'Luis Navarro', email: 'luis@puduenvios.cl', password: 'conductor123', role: 'conductor', color: '#d97706', vehicleId: 'v7', zoneId: 'z-suroriente' },
    { id: 'u-c7', name: 'Andrés Molina', email: 'andres@puduenvios.cl', password: 'conductor123', role: 'conductor', color: '#65a30d', vehicleId: 'v8', zoneId: 'z-centro' },
    { id: 'u-c8', name: 'Fernanda Ríos', email: 'fernanda@puduenvios.cl', password: 'conductor123', role: 'conductor', color: '#e11d48', vehicleId: 'v6', zoneId: 'z-oriente' },
    { id: 'u-rem', name: 'Francisca Ibarra', email: 'empresa@lanaaustral.cl', password: 'empresa123', role: 'remitente', color: '#ea580c', demo: true, companyId: 'co-lana' },
    { id: 'u-rem2', name: 'Tomás Bravo', email: 'tomas@roblenativo.cl', password: 'empresa123', role: 'remitente', color: '#92400e', companyId: 'co-roble' },
    { id: 'u-dest', name: 'Catalina Rojas Medina', email: 'catalina@correo.cl', password: 'cliente123', role: 'destinatario', color: '#9333ea', demo: true, phone: '+56 9 8123 4567' }
  ].map((u, i) => ({ active: true, createdAt: iso(now - (500 - i * 20) * 864e5), ...u, ...(u.role === 'conductor' ? { rut: rut.make(13200300 + i * 1230457), phone: phone(), license: u.vehicleId === 'v8' ? 'C (moto)' : 'A2', licenseDue: tstr(new Date(now + (200 + i * 90) * 864e5)) } : {}) }));

  // ---------- Envíos ----------
  const shipments = [];
  const byId = new Map();
  const get = id => byId.get(id);
  let seq = 482100, pseq = 7050;
  const zoneComunas = k => COMUNAS.filter(c => c.zone === k);
  function place(comuna, spread = 1.2) {
    const c = COMUNA[comuna];
    return { x: +(c.x + (r() - .5) * spread * 2).toFixed(3), y: +(c.y + (r() - .5) * spread * 1.7).toFixed(3) };
  }
  function addr(comuna) {
    const c = COMUNA[comuna], st = r.pick(c.streets), n = r.int(80, 9800);
    return `${st} ${n}${r.bool(.35) ? `, depto. ${r.int(2, 22)}0${r.int(1, 9)}` : ''}`;
  }
  function ship(o) {
    const comuna = o.comuna;
    const company = o.companyId || r.pick(['co-lana', 'co-lana', 'co-roble', 'co-lirio', 'co-tecno', 'co-tecno', 'co-cumbre', 'co-quillay']);
    const service = o.service || (r.bool(.14) ? 'express' : r.bool(.05) ? 'mismo_dia' : 'estandar');
    const pieces = o.pieces || (r.bool(.82) ? 1 : r.int(2, 4));
    const weight = o.weight || +(company === 'co-roble' ? r.int(8, 35) : company === 'co-cumbre' ? r.int(4, 12) : 0.3 + r() * 4).toFixed(1);
    const s = {
      id: o.id || 's' + (seq + 1), code: o.code || 'PE-' + (++seq), kind: 'entrega', companyId: company, ref: (company === 'co-lana' ? 'LA-' : company === 'co-tecno' ? 'TP-' : '#') + r.int(10000, 99999),
      rName: o.rName || name(), rPhone: o.rPhone || phone(), rEmail: o.rEmail || '', rUserId: o.rUserId || '',
      address: o.address || addr(comuna), comuna, ...(o.xy || place(comuna)), zoneId: 'z-' + COMUNA[comuna].zone,
      service, win: o.win ?? '', weight, vol: o.vol || Math.round(weight * (company === 'co-roble' ? 28 : 9) + r.int(2, 20)), pieces,
      cod: o.cod ?? (r.bool(.16) ? r.int(8, 79) * 1000 - 10 : 0), requirePin: o.requirePin ?? r.bool(.07), pin: String(r.int(1000, 9999)),
      desc: company === 'co-lana' ? 'Lanas y madejas' : company === 'co-roble' ? r.pick(['Velador de roble', 'Silla nórdica', 'Repisa flotante']) : company === 'co-lirio' ? 'Medicamentos' : company === 'co-cumbre' ? 'Cervezas artesanales (caja)' : company === 'co-quillay' ? 'Plantas' : r.pick(DESCS),
      priority: service === 'express' ? 'alta' : 'normal', notes: o.notes || [], safePlace: o.safePlace || '', prefWin: '',
      attempts: [], history: [], status: o.status || 'en_bodega', statusAt: '', routeId: o.routeId || '', date: o.date || today, createdAt: o.createdAt || iso(now - r.int(18, 40) * 3600e3)
    };
    s.price = Math.round((2990 + Math.max(0, Math.ceil(s.weight - 1)) * 320 + (s.service === 'express' ? 2300 : s.service === 'mismo_dia' ? 3900 : 0)) / 10) * 10;
    s.history = [{ at: s.createdAt, from: null, to: 'creado', by: null, note: 'Etiqueta creada por el remitente' }, { at: iso(Date.parse(s.createdAt) + r.int(3, 9) * 3600e3), from: 'creado', to: 'en_bodega', by: 'u-coord', note: 'Recibido en CD Cerrillos' }];
    if (s.status === 'creado') s.history = s.history.slice(0, 1);
    if (r.bool(.3) && !o.notes) { const [tag, text] = r.pick(REC_NOTES); s.notes = [{ at: iso(Date.parse(s.createdAt) + 5 * 3600e3), by: 'destinatario', text, tags: [tag] }]; }
    s.statusAt = s.history.at(-1).at;
    shipments.push(s); byId.set(s.id, s);
    return s;
  }
  function pickup(companyId, o = {}) {
    const c = companies.find(x => x.id === companyId);
    const s = { id: 'p' + (pseq + 1), code: 'RT-' + (++pseq), kind: 'retiro', companyId, rName: c.contact, rPhone: c.phone, address: c.address, comuna: c.comuna, x: c.x, y: c.y, zoneId: 'z-' + COMUNA[c.comuna].zone,
      pieces: o.pieces || r.int(4, 18), weight: o.weight || r.int(10, 60), vol: o.vol || r.int(80, 600), win: o.win || '', service: 'estandar', cod: 0, desc: o.desc || 'Retiro de paquetes del día en bodega',
      notes: [], attempts: [], history: [{ at: iso(now - r.int(2, 20) * 3600e3), from: null, to: 'solicitado', by: null, note: 'Solicitado por el cliente' }], status: 'solicitado', routeId: '', date: today, createdAt: iso(now - r.int(2, 20) * 3600e3) };
    s.statusAt = s.history[0].at;
    shipments.push(s); byId.set(s.id, s);
    return s;
  }

  // ---------- Rutas de hoy ----------
  const settings = { speed: 24, serviceMin: 4, breakMin: 30, breakAt: '13:30' };
  const ceil15 = ms => Math.ceil(ms / 9e5) * 9e5;
  const RDEF = [
    { id: 'r-jorge', code: 'R-2051', driver: 'u-c1', vehicle: 'v1', zone: 'oriente', n: 16, picks: ['co-lana'], status: 'planificada' },
    { id: 'r-dani', code: 'R-2052', driver: 'u-c2', vehicle: 'v2', zone: 'sur', n: 15, picks: ['co-tecno'], status: 'en_curso', ago: 1.8 },
    { id: 'r-mati', code: 'R-2053', driver: 'u-c3', vehicle: 'v3', zone: 'centro', n: 19, picks: [], status: 'en_curso', ago: 2.2, sim: true },
    { id: 'r-pedro', code: 'R-2054', driver: 'u-c4', vehicle: 'v4', zone: 'norte', n: 17, picks: ['co-cumbre'], status: 'en_curso', ago: 1.9, sim: true },
    { id: 'r-caro', code: 'R-2055', driver: 'u-c5', vehicle: 'v5', zone: 'poniente', n: 16, picks: ['co-roble'], status: 'en_curso', ago: 1.6, sim: true },
    { id: 'r-luis', code: 'R-2056', driver: 'u-c6', vehicle: 'v7', zone: 'suroriente', n: 16, picks: [], status: 'en_curso', ago: 2.4, sim: true }
  ];
  const routes = [];
  const incidents = [];
  const logs = [];
  const emit = (t, d) => { if (t === 'incident') incidents.push({ ...d, id: 'inc' + incidents.length, code: 'EX-' + (3100 + incidents.length), status: 'abierta', createdAt: d.at, priority: 'media' }); };

  // Catalina (destinataria demo): una entrega hoy en la ruta de Jorge, otra con Daniela, una mañana y una entregada.
  const CATA = { rName: 'Catalina Rojas Medina', rPhone: '+56 9 8123 4567', rEmail: 'catalina@correo.cl', rUserId: 'u-dest' };

  RDEF.forEach((d, ri) => {
    const v = vehicles.find(x => x.id === d.vehicle);
    const plannedStart = d.status === 'planificada' ? ceil15(now + 5 * 6e4) : ceil15(now - d.ago * 3600e3) - 15 * 6e4;
    const route = { id: d.id, code: d.code, date: today, driverId: d.driver, vehicleId: d.vehicle, zoneId: 'z-' + d.zone, color: ['#db2777', '#059669', '#2563eb', '#7c3aed', '#0891b2', '#d97706'][ri],
      status: d.status, order: [], plannedStart: iso(plannedStart), expressBy: iso(Math.max(dayAt(today, '13:00'), plannedStart + 3.5 * 3600e3)), sim: !!d.sim, breaks: [], kmDone: 0, cash: 0,
      history: [{ at: iso(plannedStart - 2 * 3600e3), from: null, to: 'planificada', by: 'u-coord', note: '' }], createdAt: iso(plannedStart - 2 * 3600e3) };
    const cs = zoneComunas(d.zone);
    const focus = cs.slice(0, Math.min(cs.length, d.zone === 'oriente' ? 3 : 4)); // rutas compactas
    for (let i = 0; i < d.n; i++) {
      const comuna = r.pick(focus).n;
      const extra = d.id === 'r-jorge' && i === 5 ? { ...CATA, address: 'Av. Pedro de Valdivia 1840, depto. 1203', notes: [{ at: iso(now - 20 * 3600e3), by: 'destinatario', text: 'Si no estoy, dejar con el conserje (Sr. Héctor). Timbre del 1203 no suena.', tags: ['Dejar con conserje', 'Timbre malo'] }], comuna: 'Providencia', service: 'estandar', cod: 0, requirePin: false }
        : d.id === 'r-dani' && i === 11 ? { ...CATA, address: 'Gran Avenida 4870, of. 302', comuna: 'San Miguel', service: 'express', cod: 0, requirePin: true, notes: [] } : { comuna };
      const s = ship({ ...extra, status: d.status === 'planificada' ? 'asignado' : 'en_ruta', routeId: route.id, companyId: extra.rUserId ? (d.id === 'r-jorge' ? 'co-lana' : 'co-tecno') : undefined });
      s.history.push({ at: route.createdAt, from: 'en_bodega', to: 'asignado', by: 'u-coord', note: route.code });
      if (d.status !== 'planificada') s.history.push({ at: iso(plannedStart + 20 * 6e4), from: 'asignado', to: 'en_ruta', by: d.driver, note: 'Cargado en ' + v.plate });
      s.status = s.history.at(-1).to; s.statusAt = s.history.at(-1).at;
      route.order.push(s.id);
    }
    d.picks.forEach(cid => { const p = pickup(cid, { win: '' }); p.status = d.status === 'planificada' ? 'asignado' : 'en_ruta'; p.routeId = route.id; p.history.push({ at: route.createdAt, from: 'solicitado', to: p.status, by: 'u-coord', note: route.code }); p.statusAt = route.createdAt; route.order.splice(Math.floor(route.order.length * .6), 0, p.id); });

    if (d.status === 'planificada') {
      // Ventanas relativas a la salida; el orden queda "como se cargó" para que optimizar muestre la mejora.
      route.order.forEach((id, i) => { const s = get(id); if (s.kind === 'entrega' && !s.rUserId && r.bool(.3)) { const a = ceil15(plannedStart + r.int(1, 4) * 3600e3); if (new Date(a).getDate() === new Date(a + 3 * 3600e3).getDate()) s.win = `${hm(a)}-${hm(a + 3 * 3600e3)}`; } });
      route.order.sort((a, b) => get(a).comuna.localeCompare(get(b).comuna) || hrand(a) - hrand(b));
    } else {
      route.startedAt = iso(plannedStart + 25 * 6e4);
      route.odoStart = v.odometer; route.fuelStart = r.int(70, 95);
      route.checklist = { at: iso(plannedStart + 10 * 6e4), items: {}, obs: '' };
      route.loaded = route.order.slice();
      route.history.push({ at: route.startedAt, from: 'planificada', to: 'en_curso', by: d.driver, note: '' });
      const ctx = planRoute({ ...route, status: 'en_curso' }, get, { ...settings, now, sim: true }).ctx;
      route.order = optimizeRoute(route.order, ctx, { maxPasses: 6 }).order;
      // Ventanas alrededor del ETA planificado (así la ruta optimizada las cumple casi todas).
      const p0 = planRoute(route, get, { ...settings, now, sim: true });
      p0.ev.legs.forEach(l => { const s = get(l.id); if (s.kind === 'entrega' && r.bool(.3)) { const a = Math.floor((l.eta - r.int(30, 80) * 6e4) / 18e5) * 18e5; if (new Date(a).getDate() === new Date(a + 3 * 3600e3).getDate()) s.win = `${hm(a)}-${hm(a + 3 * 3600e3)}`; } });
      route.optimized = { at: route.startedAt, kmBefore: +(p0.ev.km * 1.18).toFixed(1), kmAfter: +p0.ev.km.toFixed(1) };
      simulateRoute(route, get, now, settings, emit);
      if (d.id === 'r-luis') route.checklist = { at: route.checklist.at, items: { neumaticos: 'obs' }, obs: 'Neumático trasero derecho con baja presión; se infló en bencinera.' };
    }
    routes.push(route);
  });

  // Daniela queda en modo manual (la maneja quien entre con su cuenta).
  const dani = routes.find(x => x.id === 'r-dani');
  dani.sim = false;
  // Mensajes de chat de ejemplo en la ruta de Daniela
  const messages = [];
  const daniPending = dani.order.map(get).filter(s => s.status === 'en_ruta' && s.kind === 'entrega');
  if (daniPending[1]) {
    const s = daniPending[1];
    messages.push({ id: 'm1', shipmentId: s.id, from: 'destinatario', userId: '', text: '¿Llega antes de las 14:00? Salgo a almorzar.', at: iso(now - 40 * 6e4) });
    messages.push({ id: 'm2', shipmentId: s.id, from: 'conductor', userId: 'u-c2', text: 'Hola, estoy a unas paradas. Si no está, ¿lo dejo con conserjería?', at: iso(now - 34 * 6e4) });
    messages.push({ id: 'm3', shipmentId: s.id, from: 'destinatario', userId: '', text: 'Sí, con el conserje está perfecto. ¡Gracias!', at: iso(now - 31 * 6e4) });
  }

  // ---------- Bodega: pendientes de planificar (hoy) y retiros sin asignar ----------
  ['oriente', 'oriente', 'oriente', 'centro', 'centro', 'sur', 'sur', 'norte', 'poniente', 'poniente', 'suroriente', 'oriente', 'centro', 'sur'].forEach(z => ship({ comuna: r.pick(zoneComunas(z)).n, date: today }));
  pickup('co-lirio', { pieces: 9, weight: 14 });
  pickup('co-quillay', { pieces: 6, weight: 40, vol: 900, desc: 'Plantas en macetero: cargar con cuidado' });
  // Recién etiquetados por clientes (aún no llegan al CD)
  for (let i = 0; i < 5; i++) ship({ comuna: r.pick(COMUNAS).n, status: 'creado', companyId: i < 3 ? 'co-lana' : 'co-tecno', createdAt: iso(now - r.int(1, 5) * 3600e3), date: today });
  // Mañana
  for (let i = 0; i < 6; i++) ship({ comuna: r.pick(COMUNAS).n, date: tomorrow, createdAt: iso(now - r.int(1, 8) * 3600e3) });
  ship({ ...CATA, comuna: 'Providencia', address: 'Av. Pedro de Valdivia 1840, depto. 1203', date: tomorrow, companyId: 'co-quillay', service: 'estandar', cod: 15990, notes: [] });
  // Uno en punto de retiro (redirigido ayer)
  const enPunto = ship({ comuna: 'Ñuñoa', date: yesterday, status: 'en_bodega' });
  enPunto.history.push({ at: iso(now - 20 * 3600e3), from: 'en_bodega', to: 'en_punto', by: 'u-coord', note: 'Locker Plaza Ñuñoa · casillero 14' });
  enPunto.status = 'en_punto'; enPunto.redirectPointId = 'pt-nun'; enPunto.statusAt = iso(now - 20 * 3600e3);

  // ---------- Historial: rutas cerradas de ayer y entregas de días anteriores ----------
  const pastRoutes = [];
  [['r-jorge-ay', 'R-2041', 'u-c1', 'v1', 'oriente', 12], ['r-dani-ay', 'R-2042', 'u-c2', 'v2', 'sur', 11]].forEach(([id, code, drv, veh, zone, n], k) => {
    const start = dayAt(yesterday, '08:45');
    const route = { id, code, date: yesterday, driverId: drv, vehicleId: veh, zoneId: 'z-' + zone, color: k ? '#059669' : '#db2777', status: 'en_curso', order: [], plannedStart: iso(start), startedAt: iso(start + 15 * 6e4),
      expressBy: iso(dayAt(yesterday, '13:00')), sim: true, breaks: [], kmDone: 0, cash: 0, odoStart: vehicles.find(v => v.id === veh).odometer - 96, fuelStart: 88, history: [{ at: iso(start - 3600e3), from: null, to: 'planificada', by: 'u-coord', note: '' }, { at: iso(start + 15 * 6e4), from: 'planificada', to: 'en_curso', by: drv, note: '' }], createdAt: iso(start - 3600e3), checklist: { at: iso(start), items: {}, obs: '' } };
    for (let i = 0; i < n; i++) {
      const s = ship({ comuna: r.pick(zoneComunas(zone).slice(0, 3)).n, date: yesterday, routeId: id, createdAt: iso(start - r.int(20, 40) * 3600e3), status: 'en_ruta' });
      s.history.push({ at: iso(start + 15 * 6e4), from: 'en_bodega', to: 'en_ruta', by: drv, note: code });
      route.order.push(s.id);
    }
    simulateRoute(route, get, dayAt(yesterday, '19:30'), settings, emit);
    if (route.status !== 'cerrada') route.status = 'cerrada';
    if (k === 1) { route.closing.cashDeclared = route.closing.cashExpected - 2000; route.closing.diff = -2000; route.closing.notes = 'Faltan $2.000: vuelto mal entregado en una parada.'; }
    pastRoutes.push(route);
  });
  // Entregas de días anteriores (con prueba de entrega y evaluación) para remitentes y destinatarios.
  for (let d = 2; d <= 12; d++) {
    const day = tstr(new Date(now - d * 864e5));
    const n = d < 5 ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const s = ship({ comuna: r.pick(COMUNAS).n, date: day, createdAt: iso(dayAt(day, '08:00') - r.int(20, 40) * 3600e3), companyId: i === 0 ? 'co-lana' : undefined, ...(d === 2 && i === 1 ? { ...CATA, comuna: 'Providencia', address: 'Av. Pedro de Valdivia 1840, depto. 1203', companyId: 'co-lana' } : {}) });
      const at = dayAt(day, `${PAD(r.int(10, 18))}:${PAD(r.int(0, 59))}`);
      const fakeRoute = { id: 'hist', driverId: r.pick(['u-c1', 'u-c2', 'u-c3', 'u-c4', 'u-c5', 'u-c6']), kmDone: 0 };
      s.history.push({ at: iso(at - 3 * 3600e3), from: 'en_bodega', to: 'en_ruta', by: fakeRoute.driverId, note: '' });
      s.status = 'en_ruta';
      applyAttempt(s, fakeRoute, at, true, {});
      s.attempts[0].routeId = '';
      if (!s.rUserId && r.bool(.55)) s.rating = { stars: r.pick([5, 5, 5, 4, 4, 3, 2]), tags: r.pick([['Puntual'], ['Amable'], ['Puntual', 'Cuidó el paquete'], ['Llegó tarde'], []]), comment: r.pick(['', 'Muy amable el conductor.', 'Llegó dentro de la ventana, excelente.', 'Dejó el paquete con el conserje como pedí.', '']), at: iso(at + 2 * 3600e3) };
    }
  }

  // ---------- Notas de direcciones (historial de entregas previas) ----------
  const addressNotes = [];
  const jorge = routes.find(x => x.id === 'r-jorge');
  const targets = [...jorge.order.filter((_, i) => i % 2 === 0), ...dani.order.filter((_, i) => i % 3 === 0)].map(get).filter(s => s.kind === 'entrega');
  targets.forEach((s, i) => {
    const k = (s.address + '|' + s.comuna).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/(depto|dpto|of|oficina|casa)\.?\s*\S+/g, '').replace(/[^a-z0-9|]+/g, '');
    const count = 1 + (i % 3 === 0 ? 1 : 0);
    for (let j = 0; j < count; j++) { const [text, tag] = ADDR_NOTES[(i * 2 + j) % ADDR_NOTES.length]; addressNotes.push({ id: `an${i}-${j}`, addrKey: k, address: s.address, comuna: s.comuna, text, tag, by: r.pick(['u-c1', 'u-c2', 'u-c3', 'u-c6']), at: iso(now - r.int(4, 120) * 864e5) }); }
  });
  if (targets[0]) { const s = get(jorge.order[5]); addressNotes.push({ id: 'an-cata', addrKey: (s.address + '|' + s.comuna).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/(depto|dpto|of|oficina|casa)\.?\s*\S+/g, '').replace(/[^a-z0-9|]+/g, ''), address: s.address, comuna: s.comuna, text: 'Edificio con conserjería 24 h (Sr. Héctor de día). Estacionar en Pedro de Valdivia, no en el pasaje.', tag: 'Conserjería', by: 'u-c1', at: iso(now - 2 * 864e5) }); }

  // ---------- Excepciones adicionales ----------
  const add = (o) => incidents.push({ id: 'inc' + incidents.length, code: 'EX-' + (3100 + incidents.length), status: 'abierta', priority: 'media', createdAt: o.at, ...o });
  const jNote = get(jorge.order[2]);
  add({ type: 'nota', shipmentId: jNote.id, routeId: 'r-jorge', driverId: 'u-c1', text: `${jNote.code} · El destinatario indica que el acceso cambió: entrar por la calle lateral (portón verde).`, at: iso(now - 50 * 6e4) });
  add({ type: 'checklist', routeId: 'r-luis', driverId: 'u-c6', text: 'R-2056 · Neumático trasero derecho con baja presión (observado en checklist).', at: routes.find(x => x.id === 'r-luis').checklist.at, priority: 'baja', status: 'en_gestion' });
  add({ type: 'caja', routeId: 'r-dani-ay', driverId: 'u-c2', text: 'R-2042 · Diferencia de caja de -$2.000 en el cierre de ayer.', at: iso(dayAt(yesterday, '19:10')), priority: 'alta' });
  const lowRated = shipments.find(s => s.rating && s.rating.stars <= 2);
  if (lowRated) add({ type: 'reclamo', shipmentId: lowRated.id, text: `${lowRated.code} · Evaluación de ${lowRated.rating.stars}★: "${lowRated.rating.comment || 'Llegó tarde'}"`, at: lowRated.rating.at, priority: 'media' });
  // Las excepciones de días anteriores ya se gestionaron.
  incidents.forEach(x => { if (Date.parse(x.createdAt) < dayAt(today, '00:00')) { if (x.type !== 'caja') { x.status = 'resuelta'; x.resolution = 'Reprogramado para el día siguiente'; x.resolvedBy = 'u-coord'; x.resolvedAt = iso(Date.parse(x.createdAt) + 3600e3); } } });

  // ---------- Notificaciones al destinatario ----------
  const notifications = [];
  routes.filter(x => x.status !== 'planificada').forEach(rt => {
    const p = planRoute(rt, get, { ...settings, now, sim: rt.sim });
    rt.order.map(get).filter(s => s.kind === 'entrega').forEach(s => {
      const eta = p.eta[s.id]?.eta;
      notifications.push({ id: 'n' + notifications.length, shipmentId: s.id, channel: 'SMS', to: s.rPhone, text: `Pudú Envíos: tu pedido ${s.code} llega hoy${eta ? ` entre ${hm(eta - 30 * 6e4)} y ${hm(eta + 30 * 6e4)}` : ''}. Sigue a tu conductor en puduenvios.cl`, at: rt.startedAt });
    });
  });

  // ---------- Combustible, facturas y estadísticas ----------
  const fuelLogs = [];
  for (let i = 0; i < 12; i++) { const v = r.pick(vehicles.filter(x => x.fuel !== 'Eléctrico')); const l = r.int(25, 60); fuelLogs.push({ id: 'f' + i, vehicleId: v.id, driverId: users.find(u => u.vehicleId === v.id)?.id || 'u-c1', routeId: '', liters: l, amount: l * r.int(1090, 1180), odometer: v.odometer - r.int(50, 1500), station: r.pick(['Copec Pajaritos', 'Shell Vicuña Mackenna', 'Petrobras Kennedy', 'Copec Gran Avenida', 'Aramco Departamental']), at: iso(now - r.int(1, 25) * 864e5) }); }
  fuelLogs.sort((a, b) => b.at.localeCompare(a.at));
  const invoices = [];
  let fol = 20380;
  for (let m = 4; m >= 1; m--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - m);
    const period = `${d.getFullYear()}-${PAD(d.getMonth() + 1)}`;
    const due = new Date(d.getFullYear(), d.getMonth() + 1, 15);
    companies.forEach(c => { const count = r.int(60, 420); const total = Math.round(count * r.int(3100, 4300) * 1.19 / 10) * 10; invoices.push({ id: `fa${fol}`, code: 'F-' + (++fol), companyId: c.id, period, count, total, due: tstr(due), status: m > 1 ? (r.bool(.92) ? 'pagada' : 'vencida') : (due.getTime() < now ? 'vencida' : 'pendiente'), createdAt: iso(new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime()) }); });
  }
  const dailyStats = [];
  for (let d = 30; d >= 1; d--) {
    const day = new Date(now - d * 864e5), wd = day.getDay();
    const total = wd === 0 ? 0 : Math.round((wd === 6 ? 70 : 150 + r.int(-20, 30)) * (1 + (30 - d) * 0.006));
    if (!total) continue;
    const failed = Math.round(total * (0.05 + r() * 0.06));
    dailyStats.push({ id: 'd' + d, date: tstr(day), total, delivered: total - failed, failed, onTime: Math.round((total - failed) * (0.86 + r() * 0.1)), first: Math.round(total * (0.87 + r() * 0.08)), km: Math.round(total * (2.6 + r() * 0.6)), hours: +(total / 9.6).toFixed(1), drivers: wd === 6 ? 4 : 6 });
  }
  // Odómetros al día con las rutas cerradas
  [...pastRoutes].forEach(rt => { const v = vehicles.find(x => x.id === rt.vehicleId); if (rt.odoEnd) v.odometer = Math.max(v.odometer, rt.odoEnd); });

  // ---------- Bitácora inicial ----------
  const L = (minAgo, action, detail, user) => ({ id: 'l' + minAgo + action, at: iso(now - minAgo * 6e4), action, detail, user });
  const _log = [
    ...incidents.filter(i => Date.parse(i.createdAt) > now - 864e5).slice(0, 6).map(i => ({ id: 'li' + i.id, at: i.createdAt, action: 'excepción', detail: `${i.code}: ${i.text}`, user: i.driverId || null })),
    ...routes.filter(x => x.startedAt).map(x => ({ id: 'lr' + x.id, at: x.startedAt, action: 'ruta', detail: `${x.code}: salida del CD con ${x.order.length} paradas`, user: x.driverId })),
    L(150, 'planificación', 'Planificación automática: 96 asignados, 6 rutas, 0 sin cupo', 'u-coord'),
    L(170, 'bodega', '42 envíos recibidos en CD Cerrillos (turno mañana)', 'u-coord'),
    L(185, 'envío', 'Carga masiva: 18 envíos de Lana Austral SpA', 'u-rem'),
    L(60 * 14, 'ruta', 'R-2042: cierre — 10 entregas, 1 devueltos, 54 km', 'u-c2'),
    L(60 * 14 + 5, 'ruta', 'R-2041: cierre — 8 entregas, 4 devueltos, 76 km', 'u-c1'),
    L(60 * 20, 'config', 'Configuración actualizada', 'u-admin')
  ].sort((a, b) => b.at.localeCompare(a.at));

  return {
    _log,
    users, zones, rates, companies, points, vehicles, routes: [...routes, ...pastRoutes], shipments, incidents: incidents.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    seedDay: today, addressNotes, messages, notifications, fuelLogs, invoices, dailyStats,
    '_seq:ship': seq, '_seq:pick': pseq, '_seq:route': 2056, '_seq:inc': 3100 + incidents.length, '_seq:fac': fol
  };
}
