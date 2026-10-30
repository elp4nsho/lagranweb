// Semilla reproducible: ~12 meses de ventas, leads, inventario por VIN, créditos, taller.
import { rng } from '../../../assets/core/db.js';
import { BRANDS, PALETTES, MODELS, LAUNCHES, SHOWROOMS, PLAN_BASE, PLAN_ITEMS, PARTS, ACCESSORIES, RECALLS } from './catalog.js';
import { ymd, addDays, makeRut, makePatente, VIN_CH, DAY } from '../shared/util.js';

export const STAGES = ['nuevo', 'contactado', 'test_drive', 'cotizacion', 'negociacion', 'credito', 'vendido', 'perdido'];
const WMI = { toyota: 'JTD', kia: 'KNA', hyundai: 'KMH', chevrolet: '9BG', mazda: 'JM1', bmw: 'WBA', volvo: 'YV1', byd: 'LGX' };
const FIRST = ['Camila', 'Valentina', 'Javiera', 'Constanza', 'Fernanda', 'Catalina', 'Francisca', 'Isidora', 'Antonia', 'Daniela', 'Carolina', 'Paula', 'María José', 'Josefa', 'Macarena', 'Sebastián', 'Matías', 'Benjamín', 'Vicente', 'Joaquín', 'Martín', 'Diego', 'Nicolás', 'Felipe', 'Tomás', 'Cristóbal', 'Ignacio', 'Rodrigo', 'Gonzalo', 'Patricio', 'Claudio', 'Andrés', 'Jorge', 'Luis', 'Ricardo'];
const LAST = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López', 'Fuentes', 'Hernández', 'Torres', 'Araya', 'Flores', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Gutiérrez', 'Castro', 'Pizarro', 'Álvarez', 'Vásquez', 'Sánchez', 'Fernández', 'Ramírez', 'Carrasco', 'Gómez', 'Cortés', 'Herrera', 'Núñez', 'Jara', 'Vergara', 'Rivera', 'Figueroa'];
const SLOTS_TD = ['10:00', '11:00', '12:00', '15:00', '16:00', '17:00', '18:00'];
export const SLOTS_WS = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '14:30', '15:00', '15:30', '16:00'];

export function seed() {
  const r = rng(20261);
  const today = ymd();
  const now = Date.now();
  const isoAgo = (d, h = 9 + r.int(0, 9)) => { const x = new Date(now - d * DAY); x.setHours(h, r.int(0, 59), 0, 0); return x.toISOString(); };
  let seq = 0; const id = p => p + (++seq).toString(36);
  const person = () => { const f = r.pick(FIRST), l1 = r.pick(LAST), l2 = r.pick(LAST); return { name: `${f} ${l1} ${l2}`, email: `${f}.${l1}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '') + r.int(1, 99) + '@' + r.pick(['gmail.com', 'outlook.com', 'yahoo.com', 'icloud.com']), phone: `+56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}`, rut: makeRut(r.int(9000000, 21999999)) }; };
  const vin = b => WMI[b] + Array.from({ length: 14 }, () => VIN_CH[Math.floor(r() * VIN_CH.length)]).join('');

  // ---------- Marcas y modelos ----------
  const brands = BRANDS.map(b => ({ ...b, active: true }));
  const inchOf = m => ({ citycar: 15, sedan: 16, suv: 18, pickup: 17, premium: 18, electrico: 19 })[m.segment];
  const buildModel = (m, extra = {}) => {
    const n = m.versions.length, prem = ['bmw', 'volvo'].includes(m.brand);
    const inch = inchOf(m), ev = m.fuel === 'electrico';
    return {
      id: m.id, brandId: m.brand, name: m.name, segment: m.segment, body: m.body, fuel: m.fuel, seats: m.seats, trunk: m.trunk,
      tagline: m.tagline, year: 2026, featured: !!m.featured, status: 'activo', ...extra,
      versions: m.versions.map((v, i) => {
        const tier = Math.min(2, (prem ? 1 : 0) + (n === 1 ? 1 : Math.round(i * 2 / (n - 1))));
        return { id: `${m.id}-${i + 1}`, name: v[0], price: v[1], cost: Math.round(v[1] * (prem ? .84 : .87) / 1000) * 1000, engine: v[2], hp: v[3], trans: v[4], cons: v[5], traction: v[6] || (m.body === 'pickup' ? '4x2' : 'Delantera'), tier };
      }),
      colors: PALETTES[m.brand].map((c, i) => ({ id: `c${i + 1}`, name: c[0], hex: c[1], price: c[2] })),
      wheels: [
        { id: 'w1', name: `Llantas ${inch}" de serie`, inch, style: ev ? 'aero' : 'std', rim: 'silver', price: 0 },
        { id: 'w2', name: `Llantas ${inch + 1}" diamantadas`, inch: inch + 1, style: 'multi', rim: 'two', price: prem ? 990000 : 590000 },
        { id: 'w3', name: `Llantas ${inch + 1}" negras Sport`, inch: inch + 1, style: 'sport', rim: 'black', price: prem ? 1290000 : 790000 }
      ],
      packs: [
        { id: 'p-tech', name: 'Pack Tecnología', price: prem ? 1890000 : 890000, desc: 'Pantalla 12,3", cargador inalámbrico, head-up display y sonido 8 parlantes.' },
        { id: 'p-adas', name: 'Pack Seguridad ADAS', price: prem ? 2290000 : 1190000, desc: 'Frenado autónomo, control crucero adaptativo, punto ciego y alerta de tráfico cruzado.' },
        m.body === 'pickup' || m.body === 'suv'
          ? { id: 'p-adv', name: 'Pack Aventura', price: 690000, desc: 'Estribos, protector de cárter, ganchos de arrastre y pisos 3D.' }
          : { id: 'p-conf', name: 'Pack Confort', price: 590000, desc: 'Asientos calefaccionados, espejo electrocrómico y cortinas traseras.' }
      ]
    };
  };
  const models = MODELS.map(m => buildModel(m));
  LAUNCHES.forEach(l => models.push({ ...buildModel({ ...l, versions: [['Por confirmar', l.from, 'Por confirmar', 0, '—', '—']] }, { status: 'lanzamiento', launchDate: addDays(today, l.inDays) }), colors: [{ id: 'c1', name: 'Color de lanzamiento', hex: l.color, price: 0 }] }));
  const active = models.filter(m => m.status === 'activo');
  const M = Object.fromEntries(models.map(m => [m.id, m]));
  const brandShowrooms = b => SHOWROOMS.filter(s => s.brands.includes(b));

  // ---------- Usuarios ----------
  const users = [
    { id: 'u-admin', name: 'Sofía Lagos', email: 'admin@autoplaza.cl', password: 'admin123', role: 'admin', color: '#7c3aed', demo: true, active: true, showroomId: 'scl' },
    { id: 'u-ger', name: 'Rodrigo Valenzuela', email: 'gerente@autoplaza.cl', password: 'gerente123', role: 'gerente', color: '#0f766e', demo: true, active: true, showroomId: 'scl' },
    { id: 'u-v1', name: 'Catalina Muñoz', email: 'vendedor@autoplaza.cl', password: 'vende123', role: 'vendedor', color: '#db2777', demo: true, active: true, showroomId: 'scl', goal: 9, brands: [] },
    { id: 'u-v2', name: 'Felipe Araya', email: 'faraya@autoplaza.cl', password: 'vende123', role: 'vendedor', color: '#2563eb', active: true, showroomId: 'scl', goal: 9, brands: ['bmw', 'volvo'] },
    { id: 'u-v3', name: 'Javiera Soto', email: 'jsoto@autoplaza.cl', password: 'vende123', role: 'vendedor', color: '#ea580c', active: true, showroomId: 'vina', goal: 8, brands: [] },
    { id: 'u-v4', name: 'Tomás Bravo', email: 'tbravo@autoplaza.cl', password: 'vende123', role: 'vendedor', color: '#16a34a', active: true, showroomId: 'vina', goal: 7, brands: [] },
    { id: 'u-v5', name: 'Matías Contreras', email: 'mcontreras@autoplaza.cl', password: 'vende123', role: 'vendedor', color: '#9333ea', active: true, showroomId: 'ccp', goal: 8, brands: [] },
    { id: 'u-v6', name: 'Constanza Vera', email: 'cvera@autoplaza.cl', password: 'vende123', role: 'vendedor', color: '#0891b2', active: true, showroomId: 'ccp', goal: 7, brands: [] },
    { id: 'u-cred', name: 'Ignacio Pérez', email: 'credito@autoplaza.cl', password: 'credito123', role: 'analista', color: '#b45309', demo: true, active: true, showroomId: 'scl' },
    { id: 'u-pv1', name: 'Paula Herrera', email: 'posventa@autoplaza.cl', password: 'servicio123', role: 'asesor', color: '#0284c7', demo: true, active: true, showroomId: 'scl' },
    { id: 'u-pv2', name: 'Andrés Fuentes', email: 'afuentes@autoplaza.cl', password: 'servicio123', role: 'asesor', color: '#65a30d', active: true, showroomId: 'ccp' },
    { id: 'u-pv3', name: 'Marcela Ortiz', email: 'mortiz@autoplaza.cl', password: 'servicio123', role: 'asesor', color: '#be123c', active: true, showroomId: 'vina' },
    { id: 'u-cli', name: 'Camila Fuentes Rojas', email: 'cliente@autoplaza.cl', password: 'cliente123', role: 'cliente', color: '#e11d48', demo: true, active: true, rut: '16.245.873-6', phone: '+56 9 8765 4321' }
  ];
  const sellersOf = sid => users.filter(u => u.role === 'vendedor' && u.showroomId === sid);
  const advisorOf = sid => users.find(u => u.role === 'asesor' && u.showroomId === sid).id;

  // ---------- Ventas (12 meses) ----------
  const weight = { morning: 9, i10: 7, yaris: 7, onix: 9, accent: 5, mazda2: 4, corolla: 6, mazda3: 3, sonet: 6, tracker: 7, sportage: 8, tucson: 7, cx5: 5, rav4: 5, hilux: 8, colorado: 5, shark: 2, ev6: 1.5, ioniq5: 1.5, dolphin: 3, seal: 1.5, serie3: 1.5, x3: 1, ix1: .8, xc40: 1.5, ex30: 2 };
  const pool = []; active.forEach(m => { for (let i = 0; i < Math.round((weight[m.id] || 1) * 2); i++) pool.push(m); });
  const sales = [], vehicles = [], units = [];
  const FIN = ['contado', 'contado', 'contado', 'convencional', 'convencional', 'inteligente', 'inteligente', 'leasing'];
  let saleNo = 0;
  for (let d = 360; d >= 0; d--) {
    const dt = new Date(now - d * DAY);
    if (dt.getDay() === 0) continue;
    const season = 1 + .25 * Math.sin((dt.getMonth() - 2) / 12 * Math.PI * 2) + (dt.getMonth() === 11 ? .3 : 0) + (360 - d) / 360 * .2;
    const n = Math.max(0, Math.round(season * (dt.getDay() === 6 ? .75 : 1.2) + (r() - .5) * 2));
    for (let k = 0; k < n; k++) {
      const m = r.pick(pool), v = m.versions[Math.min(m.versions.length - 1, Math.floor(r() * r() * m.versions.length * 1.4))];
      const c = m.colors[r.int(0, m.colors.length - 1)];
      const sr = r.pick(brandShowrooms(m.brandId));
      const seller = (m.brandId === 'bmw' || m.brandId === 'volvo') && sr.id === 'scl' && r.bool(.7) ? users.find(u => u.id === 'u-v2') : r.pick(sellersOf(sr.id));
      const fin = r.pick(FIN), list = v.price + c.price;
      const bonus = r.bool(.6) ? r.pick([500000, 800000, 1000000, 1500000]) : 0;
      const discount = Math.round(list * r() * .03 / 10000) * 10000;
      const p = person(), date = ymd(dt);
      const status = d > 12 ? 'entregado' : d > 4 ? r.pick(['facturado', 'por_entregar']) : 'por_entregar';
      const s = { id: id('s'), number: `V-${String(++saleNo).padStart(5, '0')}`, date, modelId: m.id, versionId: v.id, colorId: c.id, brandId: m.brandId, showroomId: sr.id, sellerId: seller.id, customer: p.name, listPrice: list, bonus, discount, price: list - bonus - discount, cost: v.cost + Math.round(c.price * .5), financing: fin, tradeIn: r.bool(.3) ? r.int(40, 120) * 100000 : 0, daysInStock: r.int(3, 95), status, createdAt: date };
      if (d < 60) { s.vin = vin(m.brandId); s.rut = p.rut; }
      sales.push(s);
      if (status !== 'entregado') units.push({ id: id('u'), vin: s.vin, modelId: m.id, versionId: v.id, colorId: c.id, showroomId: sr.id, status: status === 'por_entregar' ? 'vendido' : 'vendido', arrivedAt: addDays(date, -s.daysInStock), cost: s.cost, saleId: s.id, customer: p.name, deliveryDate: addDays(today, r.int(1, 9)), deliverySlot: r.pick(['10:00', '11:30', '12:30', '16:00', '17:30']), createdAt: isoAgo(d + s.daysInStock) });
      if (d < 75 && r.bool(.4)) vehicles.push({ id: id('h'), owner: p.name, phone: p.phone, patente: makePatente(r), vin: s.vin, brandId: m.brandId, modelId: m.id, modelName: m.name, year: dt.getFullYear(), colorName: c.name, hex: c.hex, km: Math.round(d * r.int(28, 55)), purchaseDate: date, showroomId: sr.id, saleId: s.id });
    }
  }
  // Algunas ventas recientes ya entregadas: unidades en estado "entregado"
  units.filter(u => u.status === 'vendido').slice(0, 4).forEach(u => { u.status = 'entregado'; u.deliveryDate = addDays(today, -r.int(1, 4)); });
  // Autos más antiguos (clientes de posventa)
  for (let i = 0; i < 60; i++) {
    const m = r.pick(pool), c = r.pick(m.colors), p = person(), y = r.int(2020, 2024), sr = r.pick(brandShowrooms(m.brandId));
    vehicles.push({ id: id('h'), owner: p.name, phone: p.phone, patente: r.bool(.25) ? `${'BCDFGHJKLPRSTVWXYZ'[r.int(0, 17)]}${'BCDFGHJKLPRSTVWXYZ'[r.int(0, 17)]}${r.int(1000, 9999)}` : makePatente(r), vin: vin(m.brandId), brandId: m.brandId, modelId: m.id, modelName: m.name, year: y, colorName: c.name, hex: c.hex, km: (2026 - y) * r.int(9, 18) * 1000 + r.int(0, 9) * 1000, purchaseDate: `${y}-${String(r.int(1, 12)).padStart(2, '0')}-${String(r.int(1, 28)).padStart(2, '0')}`, showroomId: sr.id });
  }

  // ---------- Inventario por VIN ----------
  active.forEach(m => brandShowrooms(m.brandId).forEach(sr => {
    const max = ['bmw', 'volvo'].includes(m.brandId) ? 2 : (weight[m.id] || 1) > 5 ? 5 : 3;
    const n = r.int(m.id === 'shark' ? 0 : -1, max);
    for (let i = 0; i < n; i++) {
      const v = r.pick(m.versions), c = r.pick(m.colors), transit = r.bool(.28);
      const days = r.int(2, 150);
      units.push({ id: id('u'), vin: vin(m.brandId), modelId: m.id, versionId: v.id, colorId: c.id, showroomId: sr.id, status: transit ? 'transito' : r.bool(.08) ? 'reservado' : 'stock', arrivedAt: transit ? null : addDays(today, -days), eta: transit ? addDays(today, r.int(6, 50)) : null, cost: v.cost, createdAt: isoAgo(transit ? r.int(5, 40) : days + 30) });
    }
  }));

  // ---------- Leads, test drives, cotizaciones ----------
  const leads = [], testdrives = [], quotes = [];
  const SOURCES = ['web', 'web', 'web', 'showroom', 'telefono', 'redes', 'redes', 'evento', 'referido'];
  const LOST = ['Compró en otra marca', 'Precio fuera de presupuesto', 'Crédito rechazado', 'No responde', 'Posterga la compra', 'Tasación baja de su usado'];
  let qNo = 3400;
  const tl = (at, kind, text, by = null) => ({ at, kind, text, by });
  for (let i = 0; i < 160; i++) {
    const d = Math.floor(Math.pow(r(), 1.25) * 120);
    const m = r.pick(pool), v = r.pick(m.versions), sr = r.pick(brandShowrooms(m.brandId)), seller = sr.id === 'scl' && r.bool(.7) ? users.find(u => u.id === 'u-v1') : r.pick(sellersOf(sr.id)), p = person();
    let maxStage, stage;
    if (d > 35) { const won = r.bool(.24); maxStage = won ? 6 : r.int(0, 5); stage = won ? 'vendido' : 'perdido'; }
    else { maxStage = Math.min(5, Math.floor(r() * r() * 7 + (d > 10 ? 1 : 0))); stage = STAGES[maxStage]; if (d > 15 && r.bool(.25)) stage = 'perdido'; if (d > 8 && r.bool(.12)) { stage = 'vendido'; maxStage = 6; } }
    const created = isoAgo(d);
    const source = r.pick(SOURCES);
    const lead = { id: id('l'), name: p.name, email: p.email, phone: p.phone, rut: p.rut, modelId: m.id, versionId: v.id, showroomId: sr.id, sellerId: seller.id, source, type: r.pick(['cotizacion', 'cotizacion', 'test_drive', 'financiamiento', 'contacto']), stage, maxStage, value: v.price, createdAt: created, updatedAt: isoAgo(Math.max(0, d - r.int(0, 6))), lostReason: stage === 'perdido' ? r.pick(LOST) : '', temp: r.pick(['frio', 'tibio', 'caliente']), timeline: [tl(created, 'sistema', `Lead creado desde ${source === 'web' ? 'el sitio web' : source}. Interés: ${m.name} ${v.name}.`)] };
    if (maxStage >= 1) lead.timeline.push(tl(isoAgo(Math.max(0, d - 1)), r.pick(['llamada', 'whatsapp', 'email']), r.pick(['Primer contacto, interesado en conocer precios y bonos.', 'Se envía ficha técnica y lista de precios.', 'Pregunta por plazos de entrega y colores disponibles.', 'Consulta por tasación de su auto actual.']), seller.id));
    if (maxStage >= 2) {
      const tdDate = addDays(today, -Math.max(0, d - 2));
      if (d < 90) testdrives.push({ id: id('t'), leadId: lead.id, modelId: m.id, showroomId: sr.id, date: tdDate, slot: r.pick(SLOTS_TD), status: tdDate < today ? (r.bool(.87) ? 'realizado' : 'no_asistio') : 'agendado', sellerId: seller.id, createdAt: created });
      lead.timeline.push(tl(isoAgo(Math.max(0, d - 2)), 'test_drive', `Test drive ${m.name} en ${sr.city}.`, seller.id));
    }
    if (maxStage >= 3 && d < 70) {
      const c = r.pick(m.colors), list = v.price + c.price, pctD = r.pick([0, 1, 1.5, 2, 2.5, 3, 4, 5]);
      const disc = Math.round(list * pctD / 100 / 10000) * 10000, bonus = r.pick([0, 800000, 1000000, 1500000]);
      const st = stage === 'vendido' ? 'aceptada' : stage === 'perdido' ? 'vencida' : pctD > 3 && r.bool(.6) ? 'pendiente_aprobacion' : r.pick(['enviada', 'enviada', 'aprobada']);
      const q = { id: id('q'), number: `COT-${++qNo}`, leadId: lead.id, customer: p.name, email: p.email, modelId: m.id, versionId: v.id, colorId: c.id, wheelId: 'w1', packIds: r.bool(.3) ? ['p-adas'] : [], accIds: r.bool(.4) ? ['acc-pisos', 'acc-laminas'] : [], listPrice: list, bonus, discountPct: pctD, discount: disc, total: list - bonus - disc, status: st, sellerId: seller.id, validUntil: addDays(today, 7 - Math.max(0, d - 3)), createdAt: isoAgo(Math.max(0, d - 3)), approvedBy: st === 'aprobada' && pctD > 3 ? 'u-ger' : null };
      quotes.push(q);
      lead.quoteId = q.id;
      lead.timeline.push(tl(q.createdAt, 'cotizacion', `Cotización ${q.number} por ${m.name} con ${pctD}% de descuento.`, seller.id));
    }
    if (stage === 'perdido') lead.timeline.push(tl(lead.updatedAt, 'etapa', `Lead marcado como perdido: ${lead.lostReason}.`, seller.id));
    if (stage === 'vendido') lead.timeline.push(tl(lead.updatedAt, 'etapa', '¡Venta cerrada! Se emite nota de venta.', seller.id));
    if (d > 35) { lead.timeline = lead.timeline.slice(-1); delete lead.rut; delete lead.phone; }
    leads.push(lead);
  }
  // Test drives agendados para los próximos días
  for (let i = 0; i < 14; i++) {
    const m = r.pick(pool), sr = r.pick(brandShowrooms(m.brandId)), p = person(), seller = r.pick(sellersOf(sr.id));
    const l = { id: id('l'), name: p.name, email: p.email, phone: p.phone, rut: p.rut, modelId: m.id, versionId: m.versions[0].id, showroomId: sr.id, sellerId: seller.id, source: 'web', type: 'test_drive', stage: 'test_drive', maxStage: 2, value: m.versions[0].price, temp: 'tibio', createdAt: isoAgo(r.int(0, 3)), timeline: [] };
    const date = addDays(today, r.int(0, 8));
    l.timeline.push(tl(l.createdAt, 'sistema', `Test drive agendado en la web para el ${date}.`));
    leads.push(l);
    testdrives.push({ id: id('t'), leadId: l.id, modelId: m.id, showroomId: sr.id, date, slot: r.pick(SLOTS_TD), status: 'agendado', sellerId: seller.id, createdAt: l.createdAt });
  }

  // ---------- Financiamiento ----------
  const finProducts = [
    { id: 'fp-conv', name: 'Crédito Convencional', type: 'convencional', active: true, minPie: 20, rates: { 12: 1.19, 24: 1.29, 36: 1.35, 48: 1.42, 60: 1.49 }, fees: 290000, insurancePct: .045, desc: 'Cuotas fijas en pesos, de 12 a 60 meses. Al final el auto es tuyo.' },
    { id: 'fp-smart', name: 'Compra Inteligente', type: 'inteligente', active: true, minPie: 20, rates: { 24: 1.09, 36: 1.15 }, vfmg: { 24: 55, 36: 45 }, fees: 290000, insurancePct: .045, desc: 'Cuotas más bajas y una cuota final (VFMG). Al término: renuevas, te lo quedas o lo devuelves.' },
    { id: 'fp-green', name: 'Crédito Verde (eléctricos e híbridos enchufables)', type: 'convencional', active: true, minPie: 10, rates: { 12: .89, 24: .95, 36: .99, 48: 1.05 }, fees: 190000, insurancePct: .045, onlyFuel: ['electrico', 'phev'], desc: 'Tasa preferente para movilidad eléctrica, con pie desde 10%.' },
    { id: 'fp-leasing', name: 'Leasing Empresas', type: 'leasing', active: true, minPie: 10, rates: { 24: .99, 36: 1.05, 48: 1.12 }, fees: 150000, insurancePct: 0, desc: 'Para empresas y personas con giro: cuotas con IVA recuperable y opción de compra.' }
  ];
  const finApps = [];
  let solNo = 7100;
  const finLeads = leads.filter(l => l.maxStage >= 4 && !(l.stage === 'perdido' && r.bool(.5)));
  finLeads.slice(0, 55).forEach(l => {
    const m = M[l.modelId], v = m.versions.find(x => x.id === l.versionId), d = Math.max(0, (now - new Date(l.createdAt)) / DAY - 3);
    const pie = Math.round(v.price * r.pick([.2, .25, .3, .35, .4]) / 100000) * 100000, plazo = r.pick([24, 36, 36, 48]);
    const renta = r.int(9, 45) * 100000, cuota = Math.round((v.price - pie) * .0135 / (1 - Math.pow(1.0135, -plazo)));
    const ratio = cuota / renta, score = Math.max(320, Math.min(940, Math.round(900 - ratio * 900 + (r() - .5) * 240)));
    let status = d < 4 ? r.pick(['recibida', 'en_evaluacion']) : score > 640 ? 'aprobada' : score > 520 ? 'aprobada_condiciones' : 'rechazada';
    if (l.stage === 'vendido' && status === 'rechazada') status = 'aprobada';
    const a = { id: id('f'), number: `SOL-${++solNo}`, leadId: l.id, name: l.name, rut: l.rut, email: l.email, phone: l.phone, employment: r.pick(['dependiente', 'dependiente', 'independiente', 'empresa']), seniority: r.int(1, 15), renta, otherDebt: r.int(0, 8) * 50000, modelId: m.id, versionId: v.id, price: v.price, pie, plazo, productId: plazo > 36 ? 'fp-conv' : r.pick(['fp-conv', 'fp-smart']), cuota, score, status, analystId: status === 'recibida' ? null : 'u-cred', conditions: status === 'aprobada_condiciones' ? r.pick(['Aumentar pie a 35%', 'Requiere aval o codeudor', 'Plazo máximo 36 meses']) : '', createdAt: isoAgo(d), decidedAt: ['aprobada', 'aprobada_condiciones', 'rechazada'].includes(status) ? isoAgo(Math.max(0, d - r() * 1.5)) : null, notes: [] };
    if (status !== 'recibida') l.stage === 'credito' || (l.stage !== 'vendido' && l.stage !== 'perdido' && (l.stage = 'credito'));
    finApps.push(a);
  });

  // ---------- Tasaciones ----------
  const tradeins = [];
  const USED = [['Toyota', 'Yaris'], ['Chevrolet', 'Sail'], ['Suzuki', 'Swift'], ['Nissan', 'Versa'], ['Hyundai', 'Accent'], ['Kia', 'Rio 5'], ['Mazda', 'CX-3'], ['Peugeot', '208'], ['Mitsubishi', 'L200'], ['Toyota', 'RAV4'], ['Nissan', 'Qashqai'], ['Volkswagen', 'Gol'], ['Subaru', 'XV'], ['Ford', 'Ranger']];
  for (let i = 0; i < 42; i++) {
    const [b, mo] = r.pick(USED), y = r.int(2014, 2023), km = (2026 - y) * r.int(10, 20) * 1000, p = person(), d = r.int(0, 90);
    const base = r.int(55, 190) * 100000, est = Math.round(base * Math.pow(.89, 2026 - y) / 10000) * 10000;
    const st = d < 5 ? r.pick(['estimada', 'inspeccion']) : r.pick(['ofertada', 'aceptada', 'aceptada', 'rechazada', 'recibida']);
    tradeins.push({ id: id('r'), patente: makePatente(r), brand: b, model: mo, year: y, km, condition: r.pick(['excelente', 'bueno', 'bueno', 'regular']), estimateMin: Math.round(est * .94 / 10000) * 10000, estimateMax: Math.round(est * 1.06 / 10000) * 10000, offer: st === 'estimada' ? 0 : Math.round(est * r.pick([.95, .98, 1]) / 10000) * 10000, status: st, customer: p.name, email: p.email, phone: p.phone, createdAt: isoAgo(d) });
  }

  // ---------- Posventa ----------
  const servicePlans = [];
  brands.forEach(b => {
    const [step] = b.plan, base = PLAN_BASE[b.id];
    for (let i = 1; i <= 6; i++) {
      const km = step * i * 1000, f = 1 + (i % 2 === 0 ? .35 : 0) + (i % 4 === 0 ? .4 : 0) + (i % 6 === 0 ? .55 : 0);
      const items = b.id === 'byd' ? [...PLAN_ITEMS.ev] : [...PLAN_ITEMS.base, ...(i % 2 === 0 ? PLAN_ITEMS.m20 : []), ...(i % 4 === 0 ? PLAN_ITEMS.m40 : []), ...(i % 6 === 0 ? PLAN_ITEMS.m60 : [])];
      servicePlans.push({ id: `sp-${b.id}-${km / 1000}`, brandId: b.id, km, months: b.plan[1] * i, price: Math.round(base * f / 1000) * 1000 - 10, hours: +(1.2 * f).toFixed(1), items });
    }
  });
  const planFor = (b, km) => servicePlans.filter(p => p.brandId === b).sort((a, c) => a.km - c.km).find(p => p.km >= km - 1500) || servicePlans.filter(p => p.brandId === b).at(-1);
  const appointments = [], workorders = [];
  let otNo = 18200, apNo = 9300;
  // Historial resumido de OT (12 meses) para ingresos y ocupación
  // Historial de taller resumido por mes y sucursal (OT cerradas)
  const workshopHistory = [];
  for (let i = 12; i >= 1; i--) {
    const dt = new Date(); dt.setDate(1); dt.setMonth(dt.getMonth() - i);
    const month = ymd(dt).slice(0, 7);
    SHOWROOMS.forEach(sr => {
      const cap = sr.bays * 2 * 24, ots = Math.round(cap * (.58 + r() * .3) * (1 + (12 - i) * .01));
      const avg = r.int(150, 190) * 1000, rev = ots * avg;
      workshopHistory.push({ month, showroomId: sr.id, ots, capacity: cap, revenue: rev, labor: Math.round(rev * .44), parts: Math.round(rev * .48), upsell: Math.round(rev * (.06 + r() * .04)), mant: Math.round(ots * .62), rep: Math.round(ots * .22), body: Math.round(ots * .1) });
    });
  }
  // Citas: hoy, próximos días y algunas pasadas
  const TYPES = ['mantencion', 'mantencion', 'mantencion', 'reparacion', 'diagnostico', 'carroceria'];
  const pickVehicle = sid => { const l = vehicles.filter(v => v.showroomId === sid); return r.pick(l.length ? l : vehicles); };
  for (let dd = -6; dd <= 10; dd++) {
    const date = addDays(today, dd), dw = new Date(Date.now() + dd * DAY).getDay();
    if (dw === 0) continue;
    SHOWROOMS.forEach(sr => {
      const n = dd === 0 ? (sr.id === 'scl' ? 9 : 6) : r.int(dw === 6 ? 1 : 2, dw === 6 ? 3 : 6);
      const slots = [...SLOTS_WS].sort(() => r() - .5).slice(0, n).sort();
      slots.forEach((slot, i) => {
        const v = pickVehicle(sr.id), type = r.pick(TYPES), plan = type === 'mantencion' ? planFor(v.brandId, v.km + 1000) : null;
        let status = 'agendada';
        if (dd < 0) status = r.bool(.9) ? 'entregada' : 'cancelada';
        if (dd === 0) status = ['entregada', 'lista', 'en_proceso', 'en_proceso', 'esperando_repuestos', 'recepcionada'][i] || 'agendada';
        const a = { id: id('a'), number: `CT-${++apNo}`, vehicleId: v.id, patente: v.patente, owner: v.owner, phone: v.phone, brandId: v.brandId, modelId: v.modelId, modelName: v.modelName, year: v.year, showroomId: sr.id, date, slot, type, km: v.km + r.int(100, 900), planId: plan?.id || null, notes: type === 'reparacion' ? r.pick(['Ruido en suspensión delantera al pasar lomos.', 'Luz de check engine encendida.', 'Vibración al frenar a alta velocidad.', 'Aire acondicionado no enfría.']) : type === 'carroceria' ? 'Rayón y abolladura en puerta trasera derecha.' : '', status, advisorId: advisorOf(sr.id), createdAt: addDays(date, -r.int(2, 12)) };
        if (!['agendada', 'cancelada'].includes(status)) {
          const items = plan ? plan.items : ['Diagnóstico y prueba de ruta', 'Escaneo electrónico'];
          const done = { recepcionada: 0, en_proceso: .5, esperando_repuestos: .4, lista: 1, entregada: 1 }[status];
          const ot = { id: id('o'), number: `OT-${++otNo}`, date, showroomId: sr.id, type, appointmentId: a.id, vehicleId: v.id, patente: v.patente, owner: v.owner, modelName: v.modelName, brandId: v.brandId, km: a.km, fuel: r.pick([25, 50, 75]), status: status === 'entregada' ? 'entregada' : status, advisorId: a.advisorId, checklist: items.map((t, j) => ({ t, ok: j < Math.round(items.length * done) })), lines: [{ desc: plan ? `Pauta de mantención ${plan.km.toLocaleString('es-CL')} km` : 'Diagnóstico', kind: 'mano_obra', qty: 1, price: plan ? plan.price : 39990 }], upsellItems: status === 'en_proceso' || status === 'lista' ? [{ id: 'x1', desc: r.pick(['Pastillas de freno delanteras (desgaste 80%)', 'Plumillas limpiaparabrisas', 'Batería con baja carga', 'Neumáticos delanteros bajo 2 mm']), price: r.pick([54990, 22990, 109990, 179980]), status: r.pick(['propuesto', 'aceptado']) }] : [], log: [{ at: isoAgo(0, 8), text: 'Vehículo recepcionado' }], receivedAt: isoAgo(0, 8), labor: 0, parts: 0, total: 0 };
          ot.total = ot.lines.reduce((s, l) => s + l.price * l.qty, 0) + ot.upsellItems.filter(u => u.status === 'aceptado').reduce((s, u) => s + u.price, 0);
          ot.labor = Math.round(ot.total * .45); ot.parts = ot.total - ot.labor;
          if (dd === 0) { workorders.push(ot); a.otId = ot.id; }
          else if (dd > -3) { workorders.push({ ...ot, checklist: ot.checklist.map(c => ({ ...c, ok: true })), status: 'entregada', deliveredAt: date }); a.otId = ot.id; }
        }
        appointments.push(a);
      });
    });
  }

  // ---------- Cliente demo: Camila Fuentes ----------
  const cam = users.find(u => u.id === 'u-cli');
  const workday = n => { let d = addDays(today, n); if (new Date(d + 'T12:00').getDay() === 0) d = addDays(d, 1); return d; };
  const sp = M.sportage, yar = M.yaris, tuc = M.tucson;
  const v1 = { id: 'h-cam1', ownerId: cam.id, owner: cam.name, phone: cam.phone, email: cam.email, patente: 'SKTR42', vin: 'KNAPX81GBR' + 'S482917', brandId: 'kia', modelId: 'sportage', modelName: 'Sportage', year: 2025, colorName: 'Gris Gravedad', hex: '#5a5e63', km: 18400, purchaseDate: addDays(today, -420), showroomId: 'scl', saleId: 's-cam1', lastServiceKm: 10000, lastServiceDate: addDays(today, -190), warrantyUntil: addDays(today, -420 + 365 * 7) };
  const v2 = { id: 'h-cam2', ownerId: cam.id, owner: cam.name, phone: cam.phone, email: cam.email, patente: 'HJPW71', vin: 'JTDKBRFU3P3' + '051776', brandId: 'toyota', modelId: 'yaris', modelName: 'Yaris Hatchback', year: 2023, colorName: 'Rojo Emoción', hex: '#a3141e', km: 41200, purchaseDate: '2023-03-14', showroomId: 'scl', saleId: 's-cam2', lastServiceKm: 40000, lastServiceDate: addDays(today, -40) };
  vehicles.unshift(v1, v2);
  sales.push({ id: 's-cam1', number: 'V-00021', date: v1.purchaseDate, modelId: 'sportage', versionId: 'sportage-2', colorId: 'c2', brandId: 'kia', showroomId: 'scl', sellerId: 'u-v1', customer: cam.name, rut: cam.rut, customerId: cam.id, listPrice: sp.versions[1].price + 390000, bonus: 1000000, discount: 280000, price: sp.versions[1].price + 390000 - 1280000, cost: sp.versions[1].cost, financing: 'inteligente', tradeIn: 5200000, daysInStock: 21, status: 'entregado', vin: v1.vin, createdAt: new Date(now - 420 * DAY).toISOString() });
  sales.push({ id: 's-cam2', number: 'V-00004', date: v2.purchaseDate, modelId: 'yaris', versionId: 'yaris-2', colorId: 'c5', brandId: 'toyota', showroomId: 'scl', sellerId: 'u-v1', customer: cam.name, rut: cam.rut, customerId: cam.id, listPrice: yar.versions[1].price, bonus: 600000, discount: 0, price: yar.versions[1].price - 600000, cost: yar.versions[1].cost, financing: 'contado', tradeIn: 0, daysInStock: 12, status: 'entregado', vin: v2.vin, createdAt: '2023-03-14T15:00:00.000Z' });
  const camLead = { id: 'l-cam', name: cam.name, email: cam.email, phone: cam.phone, rut: cam.rut, customerId: cam.id, modelId: 'tucson', versionId: 'tucson-3', showroomId: 'scl', sellerId: 'u-v1', source: 'web', type: 'cotizacion', stage: 'negociacion', maxStage: 4, value: tuc.versions[2].price, temp: 'caliente', createdAt: isoAgo(9), updatedAt: isoAgo(1), quoteId: 'q-cam', timeline: [tl(isoAgo(9), 'sistema', 'Cotización solicitada desde el configurador (Tucson Limited HEV, Azul Intenso).'), tl(isoAgo(8), 'llamada', 'Cliente quiere renovar su Yaris y dejarlo en parte de pago.', 'u-v1'), tl(isoAgo(5), 'cotizacion', 'Cotización COT-3399 enviada con 2% de descuento.', 'u-v1'), tl(isoAgo(1), 'nota', 'Pide mejorar la tasación del Yaris. Evaluar bono retoma.', 'u-v1')] };
  leads.unshift(camLead);
  const tucList = tuc.versions[2].price + 350000 + 890000;
  quotes.unshift({ id: 'q-cam', number: 'COT-3399', leadId: 'l-cam', customer: cam.name, email: cam.email, customerId: cam.id, modelId: 'tucson', versionId: 'tucson-3', colorId: 'c5', wheelId: 'w2', packIds: ['p-tech'], accIds: ['acc-pisos'], listPrice: tucList + 590000 + 49990, bonus: 1500000, discountPct: 2, discount: 750000, total: tucList + 590000 + 49990 - 2250000, status: 'enviada', sellerId: 'u-v1', validUntil: addDays(today, 3), createdAt: isoAgo(5) });
  testdrives.unshift({ id: 't-cam', leadId: 'l-cam', customerId: cam.id, name: cam.name, phone: cam.phone, email: cam.email, modelId: 'tucson', showroomId: 'scl', date: workday(2), slot: '11:00', status: 'agendado', sellerId: 'u-v1', createdAt: isoAgo(3) });
  finApps.unshift({ id: 'f-cam', number: 'SOL-7099', leadId: 'l-cam', customerId: cam.id, name: cam.name, rut: cam.rut, email: cam.email, phone: cam.phone, employment: 'dependiente', seniority: 6, renta: 2850000, otherDebt: 180000, modelId: 'tucson', versionId: 'tucson-3', price: tuc.versions[2].price, pie: 11000000, plazo: 36, productId: 'fp-smart', cuota: 487000, score: 712, status: 'en_evaluacion', analystId: 'u-cred', conditions: '', createdAt: isoAgo(2), decidedAt: null, notes: [] });
  const configs = [
    { id: 'cfg-cam1', code: 'tucson~tucson-3~c5~w2~p-tech~acc-pisos', userId: cam.id, modelId: 'tucson', name: 'Mi Tucson híbrida', createdAt: isoAgo(9) },
    { id: 'cfg-cam2', code: 'ev6~ev6-2~c6~w3~p-adas~acc-wallbox', userId: cam.id, modelId: 'ev6', name: 'Sueño eléctrico', createdAt: isoAgo(30) }
  ];
  const camPlan = planFor('kia', 20000);
  // Su Sportage entra hoy al taller: el asesor la recepciona y ella sigue el avance (y aprueba adicionales) en su cuenta.
  appointments.unshift({ id: 'a-cam', number: 'CT-9299', vehicleId: v1.id, customerId: cam.id, patente: v1.patente, owner: cam.name, phone: cam.phone, email: cam.email, brandId: 'kia', modelId: 'sportage', modelName: 'Sportage', year: 2025, showroomId: 'scl', date: workday(0), slot: '09:30', type: 'mantencion', km: 19200, planId: camPlan.id, notes: 'Aprovechar de revisar el recall de frenos.', status: 'agendada', advisorId: 'u-pv1', createdAt: isoAgo(4) });
  const camPrev = { id: 'a-cam0', number: 'CT-8812', vehicleId: v2.id, customerId: cam.id, patente: v2.patente, owner: cam.name, phone: cam.phone, email: cam.email, brandId: 'toyota', modelId: 'yaris', modelName: 'Yaris Hatchback', year: 2023, showroomId: 'scl', date: addDays(today, -40), slot: '09:00', type: 'mantencion', km: 40000, planId: 'sp-toyota-40', notes: '', status: 'entregada', advisorId: 'u-pv1', otId: 'o-cam0', createdAt: isoAgo(48) };
  appointments.unshift(camPrev);
  const p40 = servicePlans.find(p => p.id === 'sp-toyota-40');
  workorders.unshift({ id: 'o-cam0', number: 'OT-18011', date: camPrev.date, showroomId: 'scl', type: 'mantencion', appointmentId: camPrev.id, vehicleId: v2.id, patente: v2.patente, owner: cam.name, modelName: 'Yaris Hatchback', brandId: 'toyota', km: 40000, fuel: 50, status: 'entregada', advisorId: 'u-pv1', checklist: p40.items.map(t => ({ t, ok: true })), lines: [{ desc: 'Pauta de mantención 40.000 km', kind: 'mano_obra', qty: 1, price: p40.price }], upsellItems: [{ id: 'x1', desc: 'Plumillas limpiaparabrisas', price: 22990, status: 'aceptado' }], log: [{ at: isoAgo(40, 8), text: 'Vehículo recepcionado' }, { at: isoAgo(40, 15), text: 'Entregado al cliente' }], receivedAt: isoAgo(40, 8), deliveredAt: isoAgo(40, 16), total: p40.price + 22990, labor: Math.round((p40.price + 22990) * .45), parts: Math.round((p40.price + 22990) * .55) });
  tradeins.unshift({ id: 'r-cam', patente: v2.patente, brand: 'Toyota', model: 'Yaris', year: 2023, km: 41200, condition: 'bueno', estimateMin: 10900000, estimateMax: 11900000, offer: 11200000, status: 'ofertada', customer: cam.name, email: cam.email, phone: cam.phone, customerId: cam.id, leadId: 'l-cam', createdAt: isoAgo(7) });

  // Servicio: última mantención de cada vehículo
  vehicles.forEach(v => { if (v.lastServiceKm == null) { const step = BRANDS.find(b => b.id === v.brandId).plan[0] * 1000; v.lastServiceKm = Math.floor(v.km / step) * step; v.lastServiceDate = addDays(today, -r.int(20, 300)); } });

  // ---------- Campañas / bonos ----------
  const campaigns = [
    { id: 'cp1', name: 'Bono Sportage', type: 'marca', amount: 1500000, scope: 'modelos', modelIds: ['sportage'], brandId: 'kia', from: addDays(today, -20), to: addDays(today, 25), active: true, featured: true, desc: 'Bono directo en todas las versiones Sportage.' },
    { id: 'cp2', name: 'Bono financiamiento Toyota', type: 'financiamiento', amount: 1000000, scope: 'marca', modelIds: [], brandId: 'toyota', from: addDays(today, -12), to: addDays(today, 18), active: true, featured: true, desc: 'Al financiar con Autoplaza Financiamiento (crédito convencional o Compra Inteligente).' },
    { id: 'cp3', name: 'Bono retoma', type: 'retoma', amount: 800000, scope: 'todos', modelIds: [], brandId: null, from: addDays(today, -40), to: addDays(today, 50), active: true, featured: true, desc: 'Deja tu usado en parte de pago y suma $800.000 extra.' },
    { id: 'cp4', name: 'Tucson Cyber', type: 'financiamiento', amount: 2000000, scope: 'modelos', modelIds: ['tucson'], brandId: 'hyundai', from: addDays(today, -5), to: addDays(today, 9), active: true, featured: true, desc: 'Bono de $2.000.000 financiando con Compra Inteligente.' },
    { id: 'cp5', name: 'Wallbox de regalo', type: 'regalo', amount: 990000, scope: 'modelos', modelIds: ['dolphin', 'seal'], brandId: 'byd', from: addDays(today, -30), to: addDays(today, 30), active: true, featured: true, desc: 'Cargador domiciliario 7 kW con instalación incluida.' },
    { id: 'cp6', name: 'Hilux Faena', type: 'marca', amount: 1200000, scope: 'modelos', modelIds: ['hilux'], brandId: 'toyota', from: addDays(today, -15), to: addDays(today, 15), active: true, featured: false, desc: 'Para pymes y empresas, también en leasing.' },
    { id: 'cp7', name: 'CX-5 Primavera', type: 'marca', amount: 1800000, scope: 'modelos', modelIds: ['cx5'], brandId: 'mazda', from: addDays(today, -8), to: addDays(today, 22), active: true, featured: true, desc: 'Bono marca en versiones 2026.' },
    { id: 'cp8', name: 'Morning a tu medida', type: 'marca', amount: 500000, scope: 'modelos', modelIds: ['morning'], brandId: 'kia', from: addDays(today, -60), to: addDays(today, -2), active: true, featured: false, desc: 'Campaña finalizada.' },
    { id: 'cp9', name: 'Black Friday Autoplaza', type: 'marca', amount: 1000000, scope: 'todos', modelIds: [], brandId: null, from: addDays(today, 25), to: addDays(today, 30), active: true, featured: false, desc: 'Campaña programada: bono en todo el stock.' },
    { id: 'cp10', name: 'Onix tasa preferente', type: 'financiamiento', amount: 700000, scope: 'modelos', modelIds: ['onix', 'tracker'], brandId: 'chevrolet', from: addDays(today, -3), to: addDays(today, 27), active: true, featured: false, desc: 'Bono al financiar con crédito convencional.' }
  ];

  const parts = PARTS.map((p, i) => ({ id: `pt${i + 1}`, sku: `AP-${String(1000 + i * 7)}`, name: p[0], cat: p[1], price: p[2], stock: r.int(0, 40), brandId: null, active: true }));
  const accessories = ACCESSORIES.map(a => ({ ...a, active: true }));
  const recalls = RECALLS.map((x, i) => ({ id: `rc${i + 1}`, ...x, active: true, affected: r.int(40, 900), done: 0 }));
  recalls.forEach(x => { x.done = Math.round(x.affected * (.3 + r() * .5)); });
  const requests = [];
  for (let i = 0; i < 12; i++) { const p = person(); requests.push({ id: id('q'), type: r.pick(['repuestos', 'carroceria', 'repuestos', 'contacto']), name: p.name, email: p.email, phone: p.phone, detail: r.pick(['Pastillas de freno + discos', 'Parachoques trasero con rayón', 'Consulta horario taller sábado', 'Kit de embrague Hilux 2019']), total: r.int(5, 90) * 10000, status: r.pick(['nueva', 'respondida', 'respondida']), createdAt: isoAgo(r.int(0, 25)) }); }

  const settings = {
    name: 'Autoplaza Pacífico', tagline: 'Grupo automotriz multimarca', phone: '+56 2 2940 5500', whatsapp: '+56 9 4455 6677', email: 'contacto@autoplazapacifico.cl',
    announcement: 'Bonos de hasta $2.000.000 este mes · Tasación de tu usado en 2 minutos',
    maxDiscountSeller: 3, maxDiscountManager: 8, quoteValidity: 7, testDriveSlots: SLOTS_TD, workshopSlots: SLOTS_WS,
    deliveryDays: 'Entrega de 0 km en 48 horas para unidades en stock.'
  };
  const cms = {
    hero: [
      { modelId: 'tucson', title: 'Nuevo Tucson Híbrido', text: 'Hasta 16,9 km/l y tracción AWD. Bono Cyber de $2.000.000 financiando.', badge: 'Bono $2.000.000', colorId: 'c5' },
      { modelId: 'corolla', title: 'Corolla Hybrid', text: 'El sedán más confiable, ahora con 24 km/l. Bono de financiamiento Toyota.', badge: 'Híbrido', colorId: 'c5' },
      { modelId: 'ex30', title: 'Volvo EX30', text: 'El Volvo eléctrico más compacto. Hasta 476 km de autonomía.', badge: '100% eléctrico', colorId: 'c5' },
      { modelId: 'hilux', title: 'Hilux GR-Sport', text: 'Más potencia y suspensión deportiva para la faena y la aventura.', badge: 'Leasing empresas', colorId: 'c4' }
    ],
    heroInterval: 6, offersTitle: 'Ofertas y bonos del mes', launchesTitle: 'Próximos lanzamientos',
    sections: { brands: true, offers: true, launches: true, showrooms: true, tools: true, testimonials: true },
    testimonials: [['Valentina R.', 'Configuré mi Sportage en la web, me llamaron en 10 minutos y lo retiré en 3 días.'], ['Jorge M.', 'La tasación de mi Hilux fue justa y la usé completa como pie.'], ['Fernanda S.', 'El taller me avisa cada avance de la mantención en mi cuenta. Impecable.']]
  };
  const leadRules = { mode: 'round_robin', autoAssign: true, preferBrandSpecialist: true, maxOpen: 30, slaHours: 2, rrIndex: {} };

  const LOGS = [['login', 'Catalina Muñoz inició sesión', 'u-v1'], ['cotización', 'COT-3399 Camila Fuentes Rojas · Tucson', 'u-v1'], ['crédito', 'SOL-7099 Camila Fuentes Rojas: En evaluación', 'u-cred'], ['inventario', 'Recibida Sportage en Santiago', 'u-ger'], ['campaña', 'Nueva: Tucson Cyber ($2.000.000)', 'u-admin'], ['taller', 'Recepción de vehículo · OT abierta', 'u-pv1'], ['lead', 'Nuevo lead desde el sitio web', null], ['test drive', 'Test drive agendado en la web', null], ['precios', 'Ajuste 1,5% en 4 modelos Mazda', 'u-admin'], ['contenido', 'Billboard: nueva diapositiva Volvo EX30', 'u-admin'], ['venta', 'Nota de venta emitida', 'u-v3'], ['entrega', 'Entregado Hilux a cliente de Concepción', 'u-ger'], ['tasación', 'Tasación online Toyota Yaris 2023', null], ['usuarios', 'Andrés Fuentes: rol Asesor de servicio', 'u-admin']];
  const _log = LOGS.map(([action, detail, user], i) => ({ id: 'g' + i, at: new Date(now - (i * 3 + 1) * 36e5 * (1 + i * .4)).toISOString(), action, detail, user }));
  return { _log, users, brands, showrooms: SHOWROOMS.map(s => ({ ...s, active: true })), models, campaigns, units, sales, leads, testdrives, quotes, configs, finProducts, finApps, tradeins, servicePlans, vehicles, appointments, workorders, recalls, parts, accessories, requests, settings, cms, leadRules, workshopHistory, seededOn: today };
}
