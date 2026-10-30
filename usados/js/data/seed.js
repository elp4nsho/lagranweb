// Datos semilla de Ruta Certificada (seminuevos certificados, ficticio). Reproducibles con rng().
import { rng } from '../../../assets/core/db.js';
import { ymd, addDays, genRut, genPlate, fullName, emailOf, phone, DAY } from '../shared/util.js';
import { MODELS, PAINT, EQUIP, POINTS, SLOTS } from './catalog.js';

// Valor de mercado: depreciación por antigüedad y kilometraje.
export function marketValue(m, year, km) {
  const age = Math.max(0, 2026 - year);
  const v = (m?.newPrice || 15000000) * Math.pow(.87, age) * (1 - Math.min(.35, km / 400000));
  return Math.round(v / 10000) * 10000;
}
export const listPrice = v => Math.max(3990000, Math.round(v / 100000) * 100000 - 10000);

const BRANCHES = [
  { id: 'b1', name: 'Las Condes', address: 'Av. Las Condes 11.200', comuna: 'Las Condes', region: 'Metropolitana', phone: '+56 2 2799 4100', hours: 'Lun a sáb 09:30–19:00', services: true, lat: 1 },
  { id: 'b2', name: 'La Florida', address: 'Av. Vicuña Mackenna 7.110', comuna: 'La Florida', region: 'Metropolitana', phone: '+56 2 2799 4200', hours: 'Lun a sáb 09:30–19:00', services: true },
  { id: 'b3', name: 'Viña del Mar', address: 'Av. Libertad 1.050', comuna: 'Viña del Mar', region: 'Valparaíso', phone: '+56 32 279 4300', hours: 'Lun a sáb 10:00–19:00', services: true },
  { id: 'b4', name: 'Concepción', address: 'Av. Paicaví 2.300', comuna: 'Concepción', region: 'Biobío', phone: '+56 41 279 4400', hours: 'Lun a vie 09:30–18:30', services: false },
  { id: 'b5', name: 'Antofagasta', address: 'Av. Grecia 1.880', comuna: 'Antofagasta', region: 'Antofagasta', phone: '+56 55 279 4500', hours: 'Lun a vie 09:30–18:30', services: false }
].map(b => ({ active: true, ...b }));
const RECON = [['Pintura parcial parachoques', 180000], ['Juego de neumáticos', 320000], ['Mantención completa', 150000], ['Pulido y detailing', 90000], ['Parabrisas', 210000], ['Pastillas y discos', 140000], ['Batería nueva', 95000], ['Desabolladura puerta', 120000], ['Tapiz interior', 70000]];
const OBS = ['Desgaste normal para el kilometraje', 'Piquete menor reparado', 'Rayón superficial pulido', 'Neumático al 60% de vida útil', 'Pastillas al 50%', 'Pequeña trizadura reparada', 'Batería con 3 años de uso'];
const FAIL = ['Requiere reemplazo antes de publicar', 'Falla detectada en escáner', 'Desgaste fuera de tolerancia'];
const SERVICE_TYPES = [
  { id: 'st1', name: 'Mantención según pauta', desc: 'Cambio de aceite y filtros según el manual del fabricante, revisión de 40 puntos e informe digital.', price: 89990, mins: 120, modes: ['sucursal', 'domicilio'], icon: '🔧' },
  { id: 'st2', name: 'Preparación revisión técnica', desc: 'Revisamos luces, frenos, emisiones y alineación para que apruebes la revisión técnica a la primera.', price: 34990, mins: 60, modes: ['sucursal'], icon: '📋' },
  { id: 'st3', name: 'Inspección precompra', desc: '150 puntos y prueba en ruta antes de comprar un usado a un particular. Vamos a donde esté el auto.', price: 59990, mins: 90, modes: ['sucursal', 'domicilio'], icon: '🔎' },
  { id: 'st4', name: 'Diagnóstico con escáner', desc: 'Lectura de fallas de todos los módulos y presupuesto sin compromiso.', price: 29990, mins: 45, modes: ['sucursal', 'domicilio'], icon: '🩺' },
  { id: 'st5', name: 'Cambio de aceite express', desc: 'Aceite sintético, filtro y revisión de niveles en 45 minutos.', price: 49990, mins: 45, modes: ['sucursal', 'domicilio'], icon: '🛢️' },
  { id: 'st6', name: 'Alineación y balanceo', desc: 'Alineación computarizada y balanceo de las 4 ruedas.', price: 29990, mins: 60, modes: ['sucursal'], icon: '📐' }
].map(s => ({ active: true, ...s }));
const PLANS = [
  { id: 'pl1', name: 'Plan Esencial', price: 19990, maint: 1, roadside: true, includes: ['1 mantención anual según pauta', 'Asistencia en ruta 24/7 (grúa 50 km)', 'Preparación revisión técnica', '10% en repuestos de la tienda'], order: 1, active: true, tone: 'info' },
  { id: 'pl2', name: 'Plan Plus', price: 34990, maint: 2, roadside: true, includes: ['2 mantenciones al año', 'Asistencia en ruta 24/7 (grúa 150 km)', 'Auto de reemplazo 3 días', 'Lavado mensual', '15% en repuestos'], order: 2, active: true, tone: 'primary', featured: true },
  { id: 'pl3', name: 'Plan Total', price: 54990, maint: 99, roadside: true, includes: ['Mantenciones ilimitadas según pauta', 'Frenos y rotación de neumáticos incluidos', 'Retiro y entrega a domicilio', 'Asistencia premium nacional', '20% en repuestos'], order: 3, active: true, tone: 'success' }
];
const PRODUCTS = [
  ['Neumáticos', 'Neumático 185/65 R15 EcoRoute', 54990, '🛞', 'Yaris, Accent, Versa, Sail'], ['Neumáticos', 'Neumático 215/60 R17 AllTerrain', 89990, '🛞', 'SUV compactos'], ['Neumáticos', 'Neumático 265/65 R17 AT pickup', 139990, '🛞', 'Hilux, Navara, L200, Ranger'],
  ['Aceites y filtros', 'Aceite sintético 5W-30 (4 L)', 38990, '🛢️', 'Bencina, universal'], ['Aceites y filtros', 'Aceite diésel 10W-40 (5 L)', 42990, '🛢️', 'Camionetas diésel'], ['Aceites y filtros', 'Kit filtros (aire + aceite + polen)', 29990, '🧰', 'Según modelo'],
  ['Baterías', 'Batería 60 Ah libre de mantención', 79990, '🔋', 'Sedanes y hatch'], ['Baterías', 'Batería 75 Ah AGM start-stop', 129990, '🔋', 'SUV con start-stop'], ['Baterías', 'Partidor portátil 1000 A', 59990, '⚡', 'Universal'],
  ['Plumillas y luces', 'Plumillas aerodinámicas (par)', 14990, '🌧️', 'Universal'], ['Plumillas y luces', 'Ampolletas LED H4 (par)', 24990, '💡', 'H4'], ['Plumillas y luces', 'Ampolletas LED H7 (par)', 24990, '💡', 'H7'],
  ['Accesorios', 'Pisos de goma a medida', 34990, '🧩', 'Según modelo'], ['Accesorios', 'Cubre asientos impermeable', 29990, '💺', 'Universal'], ['Accesorios', 'Barras de techo aluminio', 119990, '🏔️', 'SUV con rieles'],
  ['Accesorios', 'Cámara de retroceso inalámbrica', 49990, '📷', 'Universal'], ['Accesorios', 'Cargador portátil EV tipo 2 (3,6 kW)', 239990, '🔌', 'Eléctricos e híbridos enchufables'], ['Accesorios', 'Kit de emergencia (triángulos, chaleco, botiquín)', 19990, '🦺', 'Obligatorio'],
  ['Cuidado del auto', 'Kit de lavado premium', 24990, '🧽', 'Universal'], ['Cuidado del auto', 'Cera cerámica en spray', 19990, '✨', 'Universal'], ['Cuidado del auto', 'Aspiradora portátil 12 V', 27990, '🌀', 'Universal'],
  ['Cuidado del auto', 'Ambientador de cuero', 6990, '🌿', 'Universal'], ['Neumáticos', 'Compresor de aire digital', 32990, '🎈', 'Universal'], ['Accesorios', 'Soporte magnético para celular', 9990, '📱', 'Universal']
];

export function seed() {
  const r = rng(2026);
  const NOW = Date.now();
  const at = (daysAgo, h = r.int(9, 19)) => { const d = new Date(NOW - daysAgo * DAY); d.setHours(h, r.int(0, 59), 0, 0); return d.toISOString(); };
  const users = [
    { id: 'u-admin', name: 'Paula Fuentes', email: 'admin@rutacertificada.cl', role: 'admin', color: '#1abc9c' },
    { id: 'u-gerente', name: 'Ricardo Sepúlveda', email: 'gerente@rutacertificada.cl', role: 'gerente', color: '#2c3e50' },
    { id: 'u-v1', name: 'Sofía Muñoz', email: 'vendedor@rutacertificada.cl', role: 'vendedor', color: '#8e44ad', branchId: 'b1' },
    { id: 'u-v2', name: 'Martín Araya', email: 'martin@rutacertificada.cl', role: 'vendedor', color: '#2980b9', branchId: 'b2', demo: false },
    { id: 'u-v3', name: 'Daniela Soto', email: 'daniela@rutacertificada.cl', role: 'vendedor', color: '#e67e22', branchId: 'b3', demo: false },
    { id: 'u-i1', name: 'Benjamín Torres', email: 'inspector@rutacertificada.cl', role: 'inspector', color: '#16a085', branchId: 'b1' },
    { id: 'u-i2', name: 'Josefa Vidal', email: 'josefa@rutacertificada.cl', role: 'inspector', color: '#c0392b', branchId: 'b3', demo: false },
    { id: 'u-t1', name: 'Felipe Contreras', email: 'taller@rutacertificada.cl', role: 'taller', color: '#d35400', branchId: 'b1' },
    { id: 'u-c1', name: 'Camila Rojas', email: 'cliente@correo.cl', role: 'cliente', color: '#2980b9', phone: '+56 9 7712 3344', rut: '16.432.118-7' },
    { id: 'u-c2', name: 'Tomás Pérez', email: 'tomas@correo.cl', role: 'cliente', color: '#8e44ad', phone: '+56 9 6620 1188', rut: '18.902.334-1' }
  ].map(u => ({ password: 'demo123', active: true, demo: true, phone: phone(r), ...u, createdAt: at(300) }));
  const sellers = ['u-v1', 'u-v2', 'u-v3'], inspectors = ['u-i1', 'u-i2'];

  // ---------- Inventario ----------
  const cars = [], inspections = [];
  let stock = 1001;
  function mkCar(status, acquiredDaysAgo, extra = {}) {
    const m = extra.m || r.pick(MODELS);
    const year = r.int(2016, 2024), km = Math.round(Math.max(4000, (2026 - year) * r.int(9000, 17000) + r.int(-4000, 4000)) / 100) * 100;
    const mv = marketValue(m, year, km), price = listPrice(mv * (0.96 + r() * .09)), cost = Math.round(mv * (0.76 + r() * .08) / 10000) * 10000;
    const [colorName, color] = r.pick(PAINT);
    const branch = r.pick(['b1', 'b1', 'b2', 'b2', 'b3', 'b4', 'b5']);
    const nRecon = r.int(1, 3), recon = Array.from({ length: nRecon }, () => { const [desc, amount] = r.pick(RECON); return { desc, amount }; });
    const acquiredAt = at(acquiredDaysAgo);
    const c = { id: 'car' + stock, stock: 'RC-' + stock++, brand: m.brand, model: m.model, version: m.version, year, km, price, marketPrice: mv, cost, recon, transmission: m.transmission, fuel: m.fuel, body: m.body, engine: m.engine, hp: m.hp,
      color, colorName, doors: m.body === 'pickup' ? 4 : m.body === 'hatch' ? 5 : 4, seats: 5, owners: r.int(1, 2), plate: genPlate(r), branchId: branch, status, source: r.pick(['tasacion', 'tasacion', 'parte-de-pago', 'remate']), acquiredAt, featured: false, views: r.int(40, 900) };
    if (['publicado', 'reservado', 'vendido'].includes(status)) c.publishedAt = new Date(new Date(acquiredAt).getTime() + r.int(6, 14) * DAY).toISOString();
    if (status !== 'vendido') {
      c.equipment = EQUIP.filter((e, i) => (i < 6 || r.bool(.45)) && (e !== 'Tracción 4x4' || m.body === 'pickup') && (e !== 'Carga rápida DC' || m.fuel === 'Eléctrico'));
      const nh = r.int(2, 5);
      c.history = Array.from({ length: nh }, (_, i) => ({ date: ymd(addDays(new Date(), -(nh - i) * r.int(300, 380) + 120)), km: Math.round(km * (i + 1) / (nh + .4) / 1000) * 1000, desc: r.pick(['Mantención 10.000 km', 'Mantención según pauta', 'Cambio de aceite y filtros', 'Cambio de pastillas', 'Mantención mayor', 'Alineación y balanceo']), where: r.pick(['Concesionario oficial', 'Concesionario oficial', 'Servicio técnico autorizado', 'Taller independiente']) }));
      c.rtUntil = ymd(addDays(new Date(), r.int(40, 330)));
    }
    Object.assign(c, extra); delete c.m;
    cars.push(c);
    return c;
  }
  function inspect(c, { done = true, fails = 0, progress = 1 } = {}) {
    const res = POINTS.map((_, i) => { if (!done && i / POINTS.length > progress) return '-'; const x = r(); return x < .955 ? 'p' : 'o'; });
    const notes = {}, photos = {};
    for (let k = 0; k < fails; k++) { const i = r.int(0, 149); res[i] = 'f'; }
    res.forEach((s, i) => { if (s === 'o') { notes[i] = r.pick(OBS); photos[i] = 1; } if (s === 'f') { notes[i] = r.pick(FAIL); photos[i] = 2; } });
    const ins = { id: 'ins' + c.stock.slice(3), carId: c.id, inspectorId: c.branchId === 'b3' ? 'u-i2' : 'u-i1', at: new Date(new Date(c.acquiredAt).getTime() + 2 * DAY).toISOString(), status: done ? 'completada' : 'en-curso', results: res.join(''), notes, photos };
    ins.score = Math.round(res.filter(x => x === 'p').length / 150 * 1000) / 10;
    inspections.push(ins); c.inspectionId = ins.id;
  }
  // Vendidos (8 meses, tendencia al alza)
  for (let mo = 7; mo >= 0; mo--) {
    const n = 9 + (7 - mo) + r.int(0, 3);
    for (let k = 0; k < n; k++) {
      const soldAgo = mo * 30 + r.int(1, 29);
      if (soldAgo < 2) continue;
      const c = mkCar('vendido', soldAgo + r.int(18, 70));
      c.soldAt = at(soldAgo); c.soldPrice = Math.round(c.price * (0.96 + r() * .04) / 10000) * 10000;
    }
  }
  // Stock activo
  const ACTIVE = [['publicado', 30], ['reservado', 3], ['certificado', 4], ['reacondicionamiento', 5], ['evaluacion', 5]];
  ACTIVE.forEach(([st, n]) => { for (let k = 0; k < n; k++) { const age = st === 'evaluacion' ? r.int(0, 4) : st === 'reacondicionamiento' ? r.int(4, 12) : st === 'certificado' ? r.int(10, 16) : r.int(16, 95); const c = mkCar(st, age); if (st === 'publicado' && k < 6) c.featured = true; } });
  cars.filter(c => ['publicado', 'reservado', 'certificado'].includes(c.status)).forEach(c => inspect(c));
  cars.filter(c => c.status === 'reacondicionamiento').forEach(c => inspect(c, { fails: r.int(1, 3) }));
  cars.filter(c => c.status === 'evaluacion').slice(0, 3).forEach((c, i) => inspect(c, { done: false, progress: [.35, .7, .1][i] }));
  cars.filter(c => c.status === 'vendido').slice(-8).forEach(c => inspect(c));

  // ---------- Leads, reservas, ventas, financiamiento ----------
  const leads = [], reservations = [], sales = [], financing = [];
  const person = () => { const name = fullName(r); return { name, email: emailOf(name, r.pick(['gmail.com', 'hotmail.com', 'outlook.cl', 'yahoo.com'])), phone: phone(r), rut: genRut(r) }; };
  const NOTES = ['Llamé, interesado/a en financiamiento.', 'Pide descuento por pago contado.', 'Tiene auto en parte de pago, agendar tasación.', 'Quiere ver el auto el sábado.', 'Envié cotización por correo.', 'No contesta, reintentar mañana.'];
  const pmt = (M, i, n) => M * i / (1 - Math.pow(1 + i, -n));
  let vt = 501, ln = 1;
  cars.filter(c => c.status === 'vendido').forEach(c => {
    const p = person(), seller = c.branchId === 'b3' ? 'u-v3' : c.branchId === 'b2' ? 'u-v2' : r.pick(sellers);
    const payment = r.pick(['contado', 'financiado', 'financiado', 'parte-de-pago']);
    const s = { id: 'sale' + vt, code: 'VT-' + vt++, carId: c.id, ...p, sellerId: seller, price: c.soldPrice, cost: c.cost, recon: c.recon.reduce((a, x) => a + x.amount, 0), date: c.soldAt, payment, contractNo: 'CC-' + (20000 + vt) };
    s.margin = s.price - s.cost - s.recon;
    if (payment === 'financiado') { const pie = Math.round(s.price * .3 / 10000) * 10000, n = r.pick([24, 36, 48]), t = 1.49; const f = { id: 'fin' + ln, carId: c.id, ...p, price: s.price, pie, cuotas: n, tasa: t, cuota: Math.round(pmt(s.price - pie, t / 100, n)), cae: 23.4, income: r.int(9, 30) * 100000, status: 'aprobada', createdAt: new Date(new Date(c.soldAt).getTime() - 4 * DAY).toISOString(), bank: r.pick(['Financiera Ruta', 'Banco Austral', 'Crédito Andino']) }; financing.push(f); s.financingId = f.id; }
    sales.push(s);
    leads.push({ id: 'ld' + ln++, type: r.pick(['visita', 'test-drive', 'reserva', 'contacto']), carId: c.id, ...p, status: 'ganado', sellerId: seller, createdAt: new Date(new Date(c.soldAt).getTime() - r.int(3, 20) * DAY).toISOString(), source: r.pick(['web', 'web', 'web', 'whatsapp', 'sucursal']), notes: [{ at: c.soldAt, by: seller, text: 'Venta cerrada.' }] });
  });
  // Leads abiertos y perdidos (últimos 90 días)
  const live = cars.filter(c => ['publicado', 'reservado'].includes(c.status));
  for (let i = 0; i < 70; i++) {
    const age = r.int(0, 90), c = r.pick(live), p = person(), type = r.pick(['visita', 'test-drive', 'test-drive', 'contacto', 'financiamiento', 'reserva']);
    const status = age > 30 ? r.pick(['perdido', 'perdido', 'ganado', 'contactado']) : age > 7 ? r.pick(['contactado', 'negociacion', 'perdido', 'nuevo']) : r.pick(['nuevo', 'nuevo', 'contactado']);
    const l = { id: 'ld' + ln++, type, carId: c.id, ...p, status, sellerId: status === 'nuevo' && r.bool(.5) ? null : r.pick(sellers), createdAt: at(age), source: r.pick(['web', 'web', 'whatsapp', 'portal', 'sucursal']), notes: status === 'nuevo' ? [] : [{ at: at(Math.max(0, age - 1)), by: r.pick(sellers), text: r.pick(NOTES) }] };
    if (['visita', 'test-drive'].includes(type)) { const d = addDays(new Date(), r.int(-age, Math.min(8, 8 - age))); l.scheduledAt = `${ymd(d)}T${r.pick(SLOTS)}`; l.branchId = c.branchId; }
    if (type === 'financiamiento' || r.bool(.15)) { const pie = Math.round(c.price * .25 / 10000) * 10000, n = r.pick([24, 36, 48, 60]); financing.push({ id: 'fin' + ln, carId: c.id, ...p, price: c.price, pie, cuotas: n, tasa: 1.59, cuota: Math.round(pmt(c.price - pie, .0159, n)), cae: 25.1, income: r.int(8, 25) * 100000, status: age > 5 ? r.pick(['aprobada', 'rechazada', 'condicionada', 'aprobada']) : 'pendiente', createdAt: at(age), leadId: l.id, bank: r.pick(['Financiera Ruta', 'Banco Austral', 'Crédito Andino']) }); }
    leads.push(l);
  }
  // Reservas de autos reservados
  let rs = 301;
  cars.filter(c => c.status === 'reservado').forEach((c, i) => {
    const p = i === 0 ? { name: 'Tomás Pérez', email: 'tomas@correo.cl', phone: '+56 9 6620 1188', rut: '18.902.334-1' } : person();
    const l = { id: 'ld' + ln++, type: 'reserva', carId: c.id, ...p, status: 'negociacion', sellerId: i === 0 ? 'u-v1' : r.pick(sellers), createdAt: at(i + 1), source: 'web', notes: [{ at: at(i + 1), by: 'u-v1', text: 'Reserva pagada en línea. Coordinar firma.' }] };
    leads.push(l);
    reservations.push({ id: 'rs' + rs, code: 'RS-' + rs++, carId: c.id, leadId: l.id, ...p, deposit: 250000, card: '4242', paidAt: l.createdAt, expiresAt: ymd(addDays(new Date(), 5 - i)), status: 'activa' });
  });
  sales.slice(-10).forEach(s => { reservations.push({ id: 'rs' + rs, code: 'RS-' + rs++, carId: s.carId, name: s.name, email: s.email, phone: s.phone, rut: s.rut, deposit: 250000, card: String(r.int(1000, 9999)), paidAt: new Date(new Date(s.date).getTime() - 3 * DAY).toISOString(), expiresAt: ymd(s.date), status: 'convertida' }); });

  // ---------- Tasaciones ----------
  const valuations = [];
  let vl = 801;
  for (let i = 0; i < 60; i++) {
    const age = r.int(0, 200), m = r.pick(MODELS), year = r.int(2012, 2023), km = r.int(20, 180) * 1000, cond = r.pick(['excelente', 'bueno', 'bueno', 'regular', 'malo']);
    const v = marketValue(m, year, km) * ({ excelente: 1, bueno: .93, regular: .82, malo: .66 }[cond]);
    const p = person();
    const status = age < 4 ? r.pick(['cotizada', 'agendada']) : age < 20 ? r.pick(['cotizada', 'agendada', 'inspeccionada', 'comprada', 'rechazada']) : r.pick(['cotizada', 'comprada', 'comprada', 'rechazada']);
    const val = { id: 'val' + vl, code: 'TS-' + vl++, brand: m.brand, model: m.model, year, km, condition: cond, offerMin: Math.round(v * .8 / 10000) * 10000, offerMax: Math.round(v * .88 / 10000) * 10000, ...p, status, createdAt: at(age), branchId: r.pick(['b1', 'b2', 'b3']) };
    if (status !== 'cotizada') val.appointmentAt = `${ymd(addDays(new Date(), age < 4 ? r.int(1, 5) : -age + 2))}T${r.pick(SLOTS)}`;
    if (['comprada', 'inspeccionada'].includes(status)) val.finalOffer = Math.round(v * .85 / 10000) * 10000;
    valuations.push(val);
  }
  valuations.push({ id: 'val' + vl, code: 'TS-' + vl++, brand: 'Suzuki', model: 'Swift', year: 2017, km: 98000, condition: 'bueno', offerMin: 5320000, offerMax: 5850000, name: 'Camila Rojas', email: 'cliente@correo.cl', phone: '+56 9 7712 3344', rut: '16.432.118-7', status: 'cotizada', createdAt: at(6), branchId: 'b1' });

  // ---------- Planes y suscripciones ----------
  const subscriptions = [];
  for (let i = 0; i < 64; i++) {
    const age = r.int(5, 240), p = person(), m = r.pick(MODELS), plan = r.pick(['pl1', 'pl1', 'pl2', 'pl2', 'pl3']);
    const status = age > 60 && r.bool(.18) ? 'cancelada' : r.bool(.05) ? 'pausada' : 'activa';
    subscriptions.push({ id: 'sub' + i, planId: plan, name: p.name, email: p.email, car: `${m.brand} ${m.model} ${r.int(2015, 2024)}`, plate: genPlate(r), startedAt: at(age), status, ...(status === 'cancelada' ? { canceledAt: at(r.int(1, age - 30)) } : {}), price: PLANS.find(x => x.id === plan).price, nextBilling: ymd(addDays(new Date(), r.int(1, 28))) });
  }

  // ---------- Servicios ----------
  const bookings = [];
  let bk = 1201;
  for (let i = 0; i < 70; i++) {
    const d = r.int(-60, 12), st = r.pick(SERVICE_TYPES), mode = st.modes.length > 1 && r.bool(.3) ? 'domicilio' : 'sucursal', p = person(), m = r.pick(MODELS);
    const status = d < -1 ? r.pick(['completada', 'completada', 'completada', 'cancelada']) : d <= 0 ? r.pick(['en-proceso', 'confirmada']) : r.pick(['agendada', 'confirmada']);
    bookings.push({ id: 'bk' + bk, code: 'SV-' + bk++, serviceId: st.id, name: p.name, email: p.email, phone: p.phone, carDesc: `${m.brand} ${m.model}`, plate: genPlate(r), date: ymd(addDays(new Date(), d)), slot: r.pick(SLOTS), mode, branchId: mode === 'sucursal' ? r.pick(['b1', 'b2', 'b3']) : null, address: mode === 'domicilio' ? `${r.pick(['Av. Grecia', 'Los Leones', 'Av. Irarrázaval', 'Gran Avenida', 'Av. Pajaritos'])} ${r.int(100, 9000)}, Santiago` : '', status, price: st.price, createdAt: at(Math.max(0, -d + r.int(1, 10))) });
  }

  // ---------- Tienda ----------
  const products = PRODUCTS.map(([cat, name, price, icon, compat], i) => ({ id: 'pr' + (i + 1), sku: 'RC-' + (3000 + i * 7), cat, name, price, icon, compat, stock: r.int(0, 40), active: true, desc: `${name}. Compatible con: ${compat}. Garantía de 6 meses y retiro gratis en sucursal.` }));
  const orders = [];
  let od = 7001;
  for (let i = 0; i < 48; i++) {
    const age = r.int(0, 120), p = person(), items = Array.from({ length: r.int(1, 3) }, () => { const pr = r.pick(products); return { productId: pr.id, name: pr.name, qty: r.int(1, pr.cat === 'Neumáticos' ? 4 : 2), price: pr.price }; });
    const ship = r.bool(.6) ? 4990 : 0, sub = items.reduce((a, x) => a + x.qty * x.price, 0);
    orders.push({ id: 'od' + od, code: 'PD-' + od++, name: p.name, email: p.email, phone: p.phone, address: ship ? `${r.pick(['Los Militares', 'Av. Matta', 'Av. Brasil', 'Av. Colón'])} ${r.int(100, 5000)}` : '', comuna: r.pick(['Las Condes', 'Providencia', 'Ñuñoa', 'Maipú', 'Viña del Mar', 'Concepción']), shipping: ship, delivery: ship ? 'despacho' : 'retiro', branchId: ship ? null : r.pick(['b1', 'b2', 'b3']), items, subtotal: sub, total: sub + ship, status: age > 6 ? r.pick(['entregado', 'entregado', 'entregado', 'cancelado']) : r.pick(['pagado', 'preparando', 'enviado']), createdAt: at(age), card: String(r.int(1000, 9999)) });
  }

  // ---------- Cuentas demo ----------
  const bought = cars.filter(c => c.status === 'vendido').sort((a, b) => b.soldAt.localeCompare(a.soldAt))[12];
  const sale = sales.find(s => s.carId === bought.id);
  Object.assign(sale, { name: 'Camila Rojas', email: 'cliente@correo.cl', phone: '+56 9 7712 3344', rut: '16.432.118-7', sellerId: 'u-v1' });
  bought.history = [{ date: ymd(bought.soldAt), km: bought.km, desc: 'Entrega certificada Ruta Certificada', where: 'Ruta Certificada Las Condes' }];
  const garage = [
    { id: 'g1', userId: 'u-c1', brand: bought.brand, model: bought.model, year: bought.year, plate: bought.plate, km: bought.km + 6200, carId: bought.id, color: bought.color, body: bought.body },
    { id: 'g2', userId: 'u-c1', brand: 'Suzuki', model: 'Swift', year: 2017, plate: 'GHTL-82', km: 98000, color: '#b3221f', body: 'hatch' },
    { id: 'g3', userId: 'u-c2', brand: 'Kia', model: 'Rio 5', year: 2015, plate: 'FKRW-19', km: 132000, color: '#b8bdc3', body: 'hatch' }
  ];
  subscriptions.push({ id: 'sub-demo', planId: 'pl2', name: 'Camila Rojas', email: 'cliente@correo.cl', userId: 'u-c1', car: `${bought.brand} ${bought.model} ${bought.year}`, plate: bought.plate, startedAt: bought.soldAt, status: 'activa', price: 34990, nextBilling: ymd(addDays(new Date(), 9)) });
  bookings.push({ id: 'bk-d1', code: 'SV-' + bk++, serviceId: 'st1', name: 'Camila Rojas', email: 'cliente@correo.cl', phone: '+56 9 7712 3344', carDesc: `${bought.brand} ${bought.model}`, plate: bought.plate, date: ymd(addDays(new Date(), 6)), slot: '11:00', mode: 'sucursal', branchId: 'b1', address: '', status: 'confirmada', price: 0, plan: true, createdAt: at(2) });
  bookings.push({ id: 'bk-d2', code: 'SV-' + bk++, serviceId: 'st2', name: 'Camila Rojas', email: 'cliente@correo.cl', phone: '+56 9 7712 3344', carDesc: 'Suzuki Swift', plate: 'GHTL-82', date: ymd(addDays(new Date(), -40)), slot: '09:30', mode: 'sucursal', branchId: 'b1', address: '', status: 'completada', price: 34990, createdAt: at(45) });
  orders.push({ id: 'od-d1', code: 'PD-' + od++, name: 'Camila Rojas', email: 'cliente@correo.cl', phone: '+56 9 7712 3344', address: 'Av. Ossa 1450', comuna: 'La Reina', shipping: 4990, delivery: 'despacho', items: [{ productId: 'pr13', name: 'Pisos de goma a medida', qty: 1, price: 34990 }, { productId: 'pr18', name: 'Kit de emergencia (triángulos, chaleco, botiquín)', qty: 1, price: 19990 }], subtotal: 54980, total: 59970, status: 'enviado', createdAt: at(3), card: '4242' });
  leads.push({ id: 'ld' + ln++, type: 'test-drive', carId: reservations[0].carId, name: 'Tomás Pérez', email: 'tomas@correo.cl', phone: '+56 9 6620 1188', rut: '18.902.334-1', status: 'contactado', sellerId: 'u-v1', createdAt: at(3), source: 'web', scheduledAt: `${ymd(addDays(new Date(), 1))}T11:00`, branchId: cars.find(c => c.id === reservations[0].carId).branchId, notes: [] });
  const tc = cars.find(c => c.id === reservations[0].carId);
  financing.push({ id: 'fin-demo', carId: tc.id, name: 'Tomás Pérez', email: 'tomas@correo.cl', phone: '+56 9 6620 1188', rut: '18.902.334-1', price: tc.price, pie: Math.round(tc.price * .3 / 10000) * 10000, cuotas: 36, tasa: 1.49, cuota: Math.round(pmt(tc.price - Math.round(tc.price * .3 / 10000) * 10000, .0149, 36)), cae: 22.8, income: 1850000, status: 'pendiente', createdAt: at(1), bank: 'Financiera Ruta' });

  const testimonials = [
    { name: 'Camila R.', city: 'La Reina', text: 'Compré mi SUV con el informe de 150 puntos en la mano. Cero sorpresas y el plan de mantención me ordena la vida.', rating: 5, active: true },
    { name: 'Jorge M.', city: 'Concepción', text: 'Vendí mi camioneta en dos días: tasación en línea, inspección y transferencia el mismo día.', rating: 5, active: true },
    { name: 'Fernanda L.', city: 'Viña del Mar', text: 'El simulador de crédito mostraba el CAE real, sin letra chica. Muy buena atención de Daniela.', rating: 5, active: true },
    { name: 'Ignacio V.', city: 'Maipú', text: 'Buen precio y garantía, aunque el test drive se atrasó un poco.', rating: 4, active: true }
  ];
  const faqs = [
    { q: '¿Qué significa que un auto sea certificado?', a: 'Pasó nuestra inspección de 150 puntos, se reacondicionó todo lo observado y tiene historial verificado, sin multas ni prendas. Además incluye garantía mecánica de 12 meses.', active: true },
    { q: '¿Cómo funciona la reserva?', a: 'Pagas $250.000 en línea y el auto queda reservado por 7 días. Si decides no comprarlo, te devolvemos el 100% sin preguntas.', active: true },
    { q: '¿Reciben mi auto en parte de pago?', a: 'Sí. Tasamos tu auto en línea en 1 minuto y confirmamos la oferta con una inspección gratuita en sucursal.', active: true },
    { q: '¿Qué incluye el plan de mantención?', a: 'Mantenciones según pauta del fabricante, asistencia en ruta 24/7 y descuentos en repuestos. Funciona para cualquier auto, lo hayas comprado con nosotros o no.', active: true },
    { q: '¿Puedo financiar?', a: 'Trabajamos con financieras asociadas. Simula tu cuota con pie desde 20% y conoce el CAE antes de postular.', active: true }
  ];
  const settings = {
    name: 'Ruta Certificada', tagline: 'Seminuevos certificados con garantía', heroTitle: 'Autos usados como deberían ser: revisados, certificados y sin letra chica.',
    heroText: '150 puntos de inspección, historial verificado, garantía de 12 meses y reserva en línea. Vende tu auto en minutos y mantenlo con nuestros planes.',
    announcement: 'Garantía mecánica de 12 meses en todos los autos certificados · Reserva en línea con devolución 100%',
    phone: '600 360 4100', whatsapp: '+56 9 3360 4100', email: 'hola@rutacertificada.cl', deposit: 250000, reserveDays: 7, warrantyMonths: 12, baseRate: 1.49, minPie: 20, shipping: 4990, freeShippingOver: 99990,
    heroCar: { body: 'suv', color: '#24508f' }, showPlans: true, showStore: true, showTestimonials: true
  };
  const LOGS = [['inventario', 'u-gerente', 'publicó'], ['leads', 'u-v1', 'contactó a'], ['inspeccion', 'u-i1', 'completó inspección de'], ['ventas', 'u-v2', 'cerró venta de'], ['tasaciones', 'u-gerente', 'aprobó compra de']];
  const _log = cars.slice(-24).map((c, i) => { const [action, user, verb] = LOGS[i % LOGS.length]; return { id: 'lg' + i, at: new Date(NOW - (i + 1) * 4 * 3600e3).toISOString(), action, detail: `${users.find(u => u.id === user).name} ${verb} ${c.brand} ${c.model} ${c.stock}`, user }; });

  return { _log, users, branches: BRANCHES, cars, inspections, leads, reservations, sales, financing, valuations, plans: PLANS, subscriptions, serviceTypes: SERVICE_TYPES, bookings, products, orders, garage, testimonials, faqs, settings };
}
