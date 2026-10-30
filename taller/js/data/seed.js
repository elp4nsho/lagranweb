// Datos semilla de Mecánica Integral Los Andes (taller ficticio en Santiago). Reproducibles con rng().
import { rng } from '../../../assets/core/db.js';
import { LABOR, PARTS, VEHICLES, COLORS, STAGES, CHECKLIST } from './catalog.js';

const pad = n => String(n).padStart(2, '0');
const iso = d => { const x = new Date(d); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
const rutDV = n => { let s = 0, m = 2; for (const d of String(n).split('').reverse()) { s += +d * m; m = m === 7 ? 2 : m + 1; } const r = 11 - (s % 11); return r === 11 ? '0' : r === 10 ? 'K' : String(r); };
const fmtRut = n => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${rutDV(n)}`;
const FIRST = ['Ignacio', 'Valentina', 'Cristóbal', 'Francisca', 'Matías', 'Antonia', 'Felipe', 'Josefa', 'Rodrigo', 'Catalina', 'Gonzalo', 'Daniela', 'Sebastián', 'Constanza', 'Tomás', 'Macarena', 'Andrés', 'Paula', 'Jorge', 'Fernanda', 'Pablo', 'Javiera', 'Claudio', 'Carolina', 'Esteban', 'Marcela', 'Víctor', 'Bárbara'];
const LAST = ['Pérez', 'González', 'Muñoz', 'Rojas', 'Díaz', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'Fuentes', 'Araya', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Gutiérrez', 'Castro', 'Pizarro', 'Vásquez', 'Carrasco', 'Herrera', 'Núñez', 'Jara', 'Vergara'];
const PL = 'BCDFGHJKLPRSTVWXYZ';

// Escenarios típicos: síntoma, diagnóstico, mano de obra y repuestos.
const SCEN = [
  { k: 'mant', type: 'mantencion', sym: 'Mantención de los 40.000 km según pauta.', dx: 'Vehículo en buen estado general. Se realiza pauta 40.000 km; bujías con desgaste normal.', labor: [['l-mant40', 1]], parts: [['AC-0530-5', 1], ['FA-1108', 1], ['FI-220', 1], ['FC-108', 1], ['BU-ENC4', 1]], extra: [['l-past', 'PF-A01', 'Pastillas delanteras al 25%: recomendamos cambio', 'recomendado']] },
  { k: 'frenos', type: 'mecanica', sym: 'Ruido metálico al frenar y vibración en el volante.', dx: 'Pastillas delanteras agotadas (2 mm) y discos con alabeo de 0,12 mm. Líquido con 3% de humedad.', labor: [['l-past', 1], ['l-disc', 1]], parts: [['PF-A01', 1], ['DF-A01', 1], ['LF-DOT4', 1]], extra: [['l-alin', null, 'Desgaste irregular en neumáticos: alineación', 'opcional']] },
  { k: 'embrague', type: 'mecanica', sym: 'El embrague patina en subidas y el pedal quedó alto.', dx: 'Disco de embrague al límite de desgaste, prensa con zonas de recalentamiento. Volante en buen estado.', labor: [['l-embr', 1]], parts: [['EM-KIT1', 1]], extra: [] },
  { k: 'dist', type: 'mecanica', sym: 'Cambio preventivo de distribución a los 100.000 km.', dx: 'Correa con grietas transversales y bomba de agua con juego. Se recomienda cambio de kit completo.', labor: [['l-dist', 1]], parts: [['KD-4C01', 1]], extra: [['l-mant10', 'FA-1108', 'Aprovechar para cambio de aceite y filtro', 'opcional']] },
  { k: 'susp', type: 'mecanica', sym: 'Golpeteo al pasar lomos de toro y dirección imprecisa.', dx: 'Amortiguadores delanteros sin carga, bujes de bandeja cortados y rótula izquierda con juego.', labor: [['l-amort', 1], ['l-bujes', 1], ['l-alin', 1]], parts: [['AM-DEL2', 1], ['BJ-KIT', 1]], extra: [['l-alin', 'TD-01', 'Terminal de dirección derecho con juego', 'urgente']] },
  { k: 'ac', type: 'mecanica', sym: 'El aire acondicionado no enfría, solo tira aire.', dx: 'Compresor con embrague magnético dañado y fuga en válvula de servicio. Sistema sin gas.', labor: [['l-comp', 1], ['l-acgas', 1]], parts: [['COMP-AC', 1], ['GAS-134', 1]], extra: [['l-acgas', 'FC-108', 'Filtro de cabina saturado', 'recomendado']] },
  { k: 'elec', type: 'mecanica', sym: 'Testigo de batería encendido y luces que bajan de intensidad.', dx: 'Alternador entrega 12,4 V en carga (debe ser 13,8–14,4 V). Regulador defectuoso.', labor: [['l-diag', 1], ['l-alt', 1]], parts: [['ALT-90', 1]], extra: [['l-alt', 'BAT-70', 'Batería con 52% de salud', 'recomendado']] },
  { k: 'culata', type: 'mecanica', sym: 'Recalienta en taco y pierde agua sin fuga visible.', dx: 'Prueba de CO2 positiva en refrigerante: empaquetadura de culata dañada. Culata requiere rectificado.', labor: [['l-culata', 1], ['l-bomba', 1]], parts: [['EMP-CUL', 1]], extra: [] },
  { k: 'pintura', type: 'carroceria', sym: 'Choque menor en estacionamiento: puerta y tapabarro trasero.', dx: 'Abolladura de 12 cm en puerta trasera derecha y rayones en tapabarro. Se reparan y pintan 2 paños.', labor: [['l-desab', 2], ['l-pint', 2], ['l-pulido', 1]], parts: [['PIN-BASE', 2], ['PIN-BAR', 1], ['MAS-POL', 1]], extra: [['l-pulido', null, 'Pulido completo para igualar brillo', 'opcional']] },
  { k: 'siniestro', type: 'siniestro', sym: 'Colisión frontal leve (alcance) — siniestro con seguro.', dx: 'Parachoques delantero fisurado, óptico derecho roto y soporte deformado. Radiador sin daño.', labor: [['l-desmon', 2], ['l-parach', 1], ['l-pint', 1]], parts: [['PAR-DEL', 1], ['FOCO-DEL', 1], ['PIN-BASE', 1], ['PIN-BAR', 1]], extra: [] }
];

export function seed() {
  const r = rng(77031);
  const now = Date.now(), T = iso(now);
  const RATE = 34000, PAINT = 38000;
  const at = (daysAgo, h = 10) => { const d = new Date(now - daysAgo * 864e5); d.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0); return d.toISOString(); };
  const hrs = h => new Date(now - h * 3600e3).toISOString();
  const plate = () => r.bool(.75) ? Array.from({ length: 4 }, () => r.pick(PL)).join('') + '-' + r.int(10, 99) : Array.from({ length: 2 }, () => r.pick(PL)).join('') + '-' + r.int(1000, 9999);
  const laborOf = id => LABOR.find(l => l[0] === id);
  const partOf = sku => PARTS.find(p => p[0] === sku);

  // ---------- Personas ----------
  const staff = [
    ['u-admin', 'Patricia Rojas', 'admin@losandes.cl', 'admin', true], ['u-jefe', 'Hernán Alarcón', 'jefe@losandes.cl', 'jefe', true],
    ['u-asesor', 'Camila Bustos', 'asesor@losandes.cl', 'asesor', true], ['u-as2', 'Diego Pino', 'dpino@losandes.cl', 'asesor'],
    ['u-mec', 'Juan Carrasco', 'mecanico@losandes.cl', 'mecanico', true, 'Motor y transmisión', 13500, 'Maestro'],
    ['u-m2', 'Pedro Lagos', 'plagos@losandes.cl', 'mecanico', false, 'Frenos y suspensión', 11000, 'Senior'],
    ['u-m3', 'Luis Vera', 'lvera@losandes.cl', 'mecanico', false, 'Electricidad y electrónica', 12500, 'Senior'],
    ['u-m4', 'Andrés Soto', 'asoto@losandes.cl', 'mecanico', false, 'Aire acondicionado', 10500, 'Técnico'],
    ['u-m5', 'Rubén Tapia', 'rtapia@losandes.cl', 'mecanico', false, 'Desabolladura', 11500, 'Senior'],
    ['u-m6', 'Marco Henríquez', 'mhenriquez@losandes.cl', 'mecanico', false, 'Pintura', 12000, 'Maestro'],
    ['u-bod', 'Raúl Medina', 'bodega@losandes.cl', 'bodega', true],
    ['u-seg', 'Marcela Ibáñez', 'liquidador@segcordillera.cl', 'aseguradora', true],
    ['u-seg2', 'Tomás Riquelme', 'trique@australseguros.cl', 'aseguradora', false]
  ];
  const users = staff.map(([id, name, email, role, demo, specialty, tariff, level], i) => ({ id, name, email, password: 'demo123', role, demo: !!demo, active: true, color: COLORS[i % COLORS.length], phone: `+56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}`, ...(role === 'mecanico' ? { specialty, tariff, level, hoursDay: 8 } : {}), ...(role === 'aseguradora' ? { insurerId: id === 'u-seg' ? 'ins1' : 'ins2' } : {}), createdAt: at(r.int(200, 900)) }));
  const mechs = users.filter(u => u.role === 'mecanico');
  const mechFor = s => s.type === 'carroceria' || s.type === 'siniestro' ? r.pick(['u-m5', 'u-m6']) : s.k === 'elec' || s.k === 'ac' ? r.pick(['u-m3', 'u-m4']) : s.k === 'frenos' || s.k === 'susp' ? 'u-m2' : r.pick(['u-mec', 'u-m2']);

  const customers = [], vehicles = [];
  const addVeh = (cid, make, model, year, p, km) => { const v = { id: 'v' + vehicles.length, plate: p, customerId: cid, make, model, year, vin: '9BW' + Array.from({ length: 14 }, () => r.pick('ABCDEFGHJKLMNPRSTUVWXYZ0123456789')).join(''), color: r.pick(['Blanco', 'Gris plata', 'Negro', 'Rojo', 'Azul', 'Gris grafito']), km, history: [], createdAt: at(r.int(30, 900)) }; vehicles.push(v); return v; };
  customers.push({ id: 'c-demo', name: 'Ignacio Pérez', rut: fmtRut(15873204), email: 'cliente@losandes.cl', phone: '+56 9 7712 4410', address: 'Los Leones 1420, Providencia', company: '', notes: 'Prefiere contacto por WhatsApp.', createdAt: at(720) });
  const vTuc = addVeh('c-demo', 'Hyundai', 'Tucson', 2019, 'PRWT-63', 87400);
  const vMaz = addVeh('c-demo', 'Mazda', '3', 2016, 'HKLS-21', 121300);
  for (let i = 0; i < 70; i++) {
    const name = `${r.pick(FIRST)} ${r.pick(LAST)}`, id = 'c' + i;
    customers.push({ id, name, rut: fmtRut(r.int(7000000, 23000000)), email: name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(' ', '.') + (i % 5 ? '' : i) + '@' + r.pick(['gmail.com', 'outlook.com', 'empresa.cl']), phone: `+56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}`, address: r.pick(['Providencia', 'Ñuñoa', 'Las Condes', 'La Reina', 'Macul', 'Peñalolén', 'Vitacura', 'Santiago']), company: r.bool(.1) ? r.pick(['Transportes Maipo Ltda.', 'Constructora Pocuro', 'Distribuidora Andina']) : '', notes: '', createdAt: at(r.int(5, 1200)) });
    const [mk, md] = r.pick(VEHICLES); addVeh(id, mk, md, r.int(2010, 2024), plate(), r.int(15, 220) * 1000);
    if (r.bool(.15)) { const [m2, d2] = r.pick(VEHICLES); addVeh(id, m2, d2, r.int(2010, 2024), plate(), r.int(15, 220) * 1000); }
  }
  // Historial antiguo (antes de las OT del sistema)
  vehicles.forEach(v => { let km = v.km, d = r.int(50, 120); for (let k = 0; k < (v.customerId === 'c-demo' ? 4 : r.int(0, 2)); k++) { km -= r.int(8, 15) * 1000; if (km < 5000) break; const s = r.pick(SCEN); v.history.push({ d: iso(now - d * 864e5), km, s: s.sym.replace(/\.$/, ''), t: Math.round(r.int(80, 900) * 1000), ot: 'OT-' + r.int(21000, 23900) }); d += r.int(120, 260); } });

  // ---------- OT ----------
  const ots = [], claims = [], invoices = [], warranties = [], partRequests = [];
  let otN = 24790, invN = 18420, garN = 3310;
  const item = (o) => ({ id: 'i' + Math.floor(r() * 1e9).toString(36), st: 'pendiente', photo: false, note: '', prio: 'urgente', ...o });
  const buildBudget = s => {
    const its = [];
    s.labor.forEach(([id, q]) => { const l = laborOf(id); const rate = /Pintura|Carrocería/.test(l[2]) ? PAINT : RATE; its.push(item({ kind: 'mano', laborId: id, desc: l[1], qty: q, hours: l[3], price: Math.round(l[3] * rate / 10) * 10, photo: false })); });
    s.parts.forEach(([sku, q]) => { const p = partOf(sku); its.push(item({ kind: 'repuesto', partId: 'p-' + sku, desc: p[1], qty: q, price: p[3], photo: r.bool(.35) })); });
    s.extra.forEach(([lid, sku, note, prio]) => { if (lid) { const l = laborOf(lid); its.push(item({ kind: 'mano', laborId: lid, desc: l[1], qty: 1, hours: l[3], price: Math.round(l[3] * RATE / 10) * 10, prio, note, photo: true })); } if (sku) { const p = partOf(sku); its.push(item({ kind: 'repuesto', partId: 'p-' + sku, desc: p[1], qty: 1, price: p[3], prio, note, photo: true })); } });
    its[0].note = its[0].note || 'Según baremo de horas estándar.';
    return its;
  };
  const tot = its => its.filter(i => i.st !== 'rechazado').reduce((s, i) => s + i.qty * i.price, 0);
  const DAMAGES = () => r.bool(.5) ? Array.from({ length: r.int(1, 3) }, () => ({ x: r.int(40, 360), y: r.int(30, 170), type: r.pick(['rayon', 'abolladura', 'rayon', 'trizadura']), note: r.pick(['Rayón superficial previo', 'Abolladura pequeña previa', 'Piquete en parabrisas', 'Marca de estacionamiento']) })) : [];
  const mkOT = (v, s, stage, opts = {}) => {
    const idx = STAGES.findIndex(x => x[0] === stage);
    const start = opts.start ?? r.int(1, 6) * 24 + r.int(1, 8);
    const span = start / Math.max(1, (stage === 'entregado' ? 7 : idx + 1));
    const tl = []; let t = start;
    for (let k = 0; k <= Math.max(0, idx); k++) { tl.push({ s: STAGES[k][0], at: hrs(t), by: k === 0 ? 'u-asesor' : k === 4 || k === 5 ? mechFor(s) : k === 6 ? 'u-jefe' : 'u-asesor' }); t -= span * (0.6 + r() * .8); if (t < .2) t = .2; }
    const budget = idx >= 2 ? buildBudget(s) : [];
    if (idx >= 3) budget.forEach(i => { i.st = i.prio === 'opcional' && r.bool(.6) ? 'rechazado' : 'aprobado'; });
    const mech = opts.mech || mechFor(s);
    const tasks = idx >= 3 ? budget.filter(i => i.kind === 'mano' && i.st === 'aprobado').map((i, k) => ({ id: 't' + k, desc: i.desc, mech, std: +(i.hours * i.qty).toFixed(1), spent: idx > 4 ? Math.round(i.hours * i.qty * 60 * (0.8 + r() * .45)) : idx === 4 ? (k === 0 ? Math.round(i.hours * 60 * .7) : 0) : 0, run: idx === 4 && k === 0 && opts.running !== false ? hrs(.4) : null, done: idx > 4 || (idx === 4 && k < 0) })) : [];
    const total = tot(budget);
    const o = { id: 'ot' + ots.length, code: 'OT-' + (otN++), vehicleId: v.id, customerId: v.customerId, plate: v.plate, car: `${v.make} ${v.model} ${v.year}`, type: s.type, scen: s.k, status: stage, advisorId: r.bool(.7) ? 'u-asesor' : 'u-as2', mechanicId: idx >= 3 ? mech : '', bayId: '', km: v.km, fuel: r.int(1, 8),
      intake: { check: Object.fromEntries(CHECKLIST.map(([k]) => [k, r.bool(.88)])), damages: DAMAGES(), notes: r.bool(.3) ? 'Cliente deja silla de niño en el maletero.' : '' },
      symptom: s.sym, diagnosis: idx >= 2 ? s.dx : '', budget, budgetSentAt: idx >= 2 ? tl[2]?.at || hrs(5) : '', deposit: idx >= 3 && s.type !== 'siniestro' ? { amount: Math.round(total * .3 / 10) * 10, paidAt: tl[3]?.at, method: r.pick(['debito', 'credito', 'transferencia']) } : null,
      tasks, timeline: tl, promisedAt: new Date(now + r.int(1, 5) * 864e5).toISOString(), deliveredAt: stage === 'entregado' ? tl.at(-1).at : '', claimId: '', invoiceId: '', photos: r.int(2, 8), notes: '', createdAt: tl[0].at };
    ots.push(o);
    return o;
  };

  // Entregadas (últimas 5 semanas)
  for (let i = 0; i < 38; i++) {
    const v = r.pick(vehicles.slice(2)), s = r.pick(SCEN);
    const o = mkOT(v, s, 'entregado', { start: r.int(30, 34 * 24) });
    o.km = v.km - r.int(100, 3000);
    if (s.type === 'siniestro') o.claimId = 'cl' + claims.length;
    const parts = o.budget.filter(i => i.kind === 'repuesto' && i.st === 'aprobado').reduce((a, i) => a + i.qty * i.price, 0), labor = tot(o.budget) - parts;
    const inv = { id: 'inv' + invoices.length, number: invN++, otId: o.id, otCode: o.code, customerId: o.customerId, plate: o.plate, kind: r.bool(.25) ? 'factura' : 'boleta', parts, labor, net: Math.round((parts + labor) / 1.19), total: parts + labor, issuedAt: o.deliveredAt, method: s.type === 'siniestro' ? 'seguro' : r.pick(['debito', 'credito', 'transferencia']), paid: true, createdAt: o.deliveredAt };
    inv.iva = inv.total - inv.net; invoices.push(inv); o.invoiceId = inv.id;
    const months = { frenos: 6, embrague: 12, dist: 12, susp: 6, ac: 6, elec: 12, culata: 12, pintura: 24, siniestro: 24, mant: 3 }[s.k];
    warranties.push({ id: 'w' + warranties.length, code: 'GAR-' + (garN++), otId: o.id, otCode: o.code, plate: o.plate, customerId: o.customerId, desc: o.budget.filter(i => i.st === 'aprobado' && i.kind === 'mano').map(i => i.desc).join(', '), months, km: months * 2000, from: iso(o.deliveredAt), until: iso(Date.parse(o.deliveredAt) + months * 30 * 864e5), status: 'vigente', claims: [], createdAt: o.deliveredAt });
  }
  // Abiertas en distintas etapas
  const plan = [['recepcion', 2], ['diagnostico', 3], ['presupuesto', 3], ['aprobado', 2], ['reparacion', 5], ['control', 2], ['listo', 3]];
  const pool = vehicles.slice(2).filter(v => !ots.some(o => o.vehicleId === v.id));
  let pi = 0;
  plan.forEach(([st, n]) => { for (let k = 0; k < n; k++) mkOT(pool[pi++ % pool.length], r.pick(SCEN), st, { start: r.int(4, 90) }); });
  // OT de la clienta demo: presupuesto esperando aprobación online (Tucson) y siniestro en evaluación (Mazda)
  const demoOT = mkOT(vTuc, SCEN[4], 'presupuesto', { start: 26 });
  demoOT.budget.forEach((i, k) => { i.photo = k % 2 === 0; if (k === 0) i.note = 'Ver foto: amortiguador con fuga de aceite.'; });
  demoOT.photos = 6; demoOT.advisorId = 'u-asesor';
  const sinOT = mkOT(vMaz, SCEN[9], 'presupuesto', { start: 50 }); sinOT.type = 'siniestro';
  const carOT = ots.filter(o => o.status === 'reparacion')[0]; if (carOT) { carOT.mechanicId = 'u-mec'; carOT.tasks.forEach(t => { t.mech = 'u-mec'; }); }
  const ctrlOT = ots.find(o => o.status === 'aprobado'); if (ctrlOT) { ctrlOT.mechanicId = 'u-mec'; ctrlOT.tasks.forEach(t => { t.mech = 'u-mec'; }); }
  // Bahías / elevadores
  const bays = [['E1', 'Elevador 1', 'Elevador 2 columnas'], ['E2', 'Elevador 2', 'Elevador 2 columnas'], ['E3', 'Elevador 3', 'Elevador 2 columnas'], ['E4', 'Elevador 4', 'Elevador tijera + alineadora'], ['B1', 'Box diagnóstico', 'Box con escáner'], ['BE', 'Banco de enderezado', 'Carrocería'], ['C1', 'Cabina de pintura', 'Cabina presurizada'], ['PT', 'Patio de espera', 'Estacionamiento']].map(([id, name, type]) => ({ id: 'bay-' + id, name, type, active: true }));
  const bodyBays = ['bay-BE', 'bay-C1'], mechBays = ['bay-E1', 'bay-E2', 'bay-E3', 'bay-E4', 'bay-B1'];
  let mb = 0, bb = 0;
  ots.filter(o => ['diagnostico', 'reparacion', 'control'].includes(o.status)).forEach(o => { if (o.type === 'carroceria' || o.type === 'siniestro') { if (bb < bodyBays.length) o.bayId = bodyBays[bb++]; } else if (mb < mechBays.length) o.bayId = mechBays[mb++]; });
  ots.filter(o => ['aprobado', 'listo', 'recepcion', 'presupuesto'].includes(o.status)).forEach(o => { o.bayId = 'bay-PT'; });

  // ---------- Aseguradoras y siniestros ----------
  const insurers = [
    { id: 'ins1', name: 'Seguros Cordillera', contact: 'siniestros@segcordillera.cl', phone: '600 400 1200', deductible: 5, payDays: 30, laborCap: 36000, active: true },
    { id: 'ins2', name: 'Austral Seguros Generales', contact: 'autos@australseguros.cl', phone: '600 400 3300', deductible: 3, payDays: 45, laborCap: 34000, active: true },
    { id: 'ins3', name: 'Pacífico Sur Seguros', contact: 'liquidaciones@pacificosur.cl', phone: '600 400 5500', deductible: 10, payDays: 30, laborCap: 33000, active: true }
  ];
  const UF = 39800;
  const sinOTs = ots.filter(o => o.type === 'siniestro');
  sinOTs.forEach((o, i) => {
    const ins = o === sinOT ? insurers[0] : r.pick(insurers);
    const amount = tot(o.budget);
    const st = o.status === 'entregado' ? 'pagado' : o === sinOT ? 'en-evaluacion' : ['recepcion', 'diagnostico'].includes(o.status) ? 'denunciado' : o.status === 'presupuesto' ? 'en-evaluacion' : 'aprobado';
    const c = { id: 'cl' + claims.length, number: `SIN-2026-${r.int(10000, 99999)}`, insurerId: ins.id, otId: o.id, otCode: o.code, plate: o.plate, customerId: o.customerId, policy: 'POL-' + r.int(100000, 999999), deductibleUF: ins.deductible, deductible: ins.deductible * UF, amount, approved: ['aprobado', 'pagado'].includes(st) ? Math.round(amount * (0.92 + r() * .08)) : 0, status: st, liquidator: ins.id === 'ins1' ? 'Marcela Ibáñez' : 'Tomás Riquelme', event: r.pick(['Colisión por alcance en Av. Kennedy', 'Choque en estacionamiento de mall', 'Colisión lateral en intersección', 'Daño por portón eléctrico']), eventAt: iso(Date.parse(o.createdAt) - r.int(1, 6) * 864e5), notes: [], createdAt: o.createdAt };
    if (st === 'aprobado' || st === 'pagado') c.notes.push({ at: o.timeline[3]?.at || o.createdAt, by: c.liquidator, text: 'Presupuesto aprobado según peritaje fotográfico.' });
    claims.push(c); o.claimId = c.id;
  });
  // Siniestros de la cartera del liquidador demo pendientes
  ots.filter(o => o.status === 'presupuesto' && o.type === 'carroceria').slice(0, 1).forEach(o => { o.type = 'siniestro'; const amount = tot(o.budget); claims.push({ id: 'cl' + claims.length, number: `SIN-2026-${r.int(10000, 99999)}`, insurerId: 'ins1', otId: o.id, otCode: o.code, plate: o.plate, customerId: o.customerId, policy: 'POL-' + r.int(100000, 999999), deductibleUF: 5, deductible: 5 * UF, amount, approved: 0, status: 'en-evaluacion', liquidator: 'Marcela Ibáñez', event: 'Choque en estacionamiento de supermercado', eventAt: iso(now - 4 * 864e5), notes: [], createdAt: o.createdAt }); o.claimId = 'cl' + (claims.length - 1); });

  // ---------- Repuestos, proveedores, compras, solicitudes a bodega ----------
  const suppliers = [
    { id: 'pv1', name: 'Filtros y Lubricantes Ñuble', contact: 'ventas@fln.cl', phone: '+56 2 2777 0101', cat: 'Filtros y aceites', days: 1 },
    { id: 'pv2', name: 'Frenotec Repuestos', contact: 'pedidos@frenotec.cl', phone: '+56 2 2777 0202', cat: 'Frenos', days: 1 },
    { id: 'pv3', name: 'Motorpartes Santa Rosa', contact: 'b2b@motorpartes.cl', phone: '+56 2 2777 0303', cat: 'Motor, transmisión y eléctrico', days: 2 },
    { id: 'pv4', name: 'Suspensiones del Sur', contact: 'ventas@suspsur.cl', phone: '+56 2 2777 0404', cat: 'Suspensión', days: 2 },
    { id: 'pv5', name: 'FríoAuto Distribuidora', contact: 'pedidos@frioauto.cl', phone: '+56 2 2777 0505', cat: 'Aire acondicionado', days: 3 },
    { id: 'pv6', name: 'Carrocerías y Pinturas Lircay', contact: 'ventas@lircay.cl', phone: '+56 2 2777 0606', cat: 'Pintura y carrocería', days: 3 }
  ];
  const parts = PARTS.map(([sku, name, cat, price, cost, min, stock, sup]) => ({ id: 'p-' + sku, sku, name, cat, price, cost, min, stock, supplierId: sup, location: `R${r.int(1, 6)}-${r.pick('ABCD')}${r.int(1, 5)}`, active: true }));
  parts.find(p => p.sku === 'EMP-CUL').stock = 1; parts.find(p => p.sku === 'MP-12').stock = 0;
  const purchaseOrders = [['pv3', 'enviada', 2], ['pv6', 'recibida', 9], ['pv2', 'recibida', 14], ['pv1', 'borrador', 0], ['pv5', 'enviada', 1]].map(([sid, status, d], i) => {
    const lines = parts.filter(p => p.supplierId === sid).slice(0, r.int(2, 3)).map(p => ({ partId: p.id, qty: r.int(2, 8), cost: p.cost }));
    return { id: 'po' + i, code: 'OC-' + (5120 + i), supplierId: sid, status, lines, total: lines.reduce((s, l) => s + l.qty * l.cost, 0), notes: '', receivedAt: status === 'recibida' ? at(d) : '', createdAt: at(d + 2) };
  });
  ots.filter(o => o.status === 'reparacion').slice(0, 3).forEach((o, i) => { const it = o.budget.find(b => b.kind === 'repuesto'); if (it) partRequests.push({ id: 'pr' + i, otId: o.id, otCode: o.code, partId: it.partId, qty: it.qty, mechanicId: o.mechanicId, status: i === 0 ? 'entregado' : 'solicitado', note: i === 2 ? 'Urgente, auto en elevador' : '', createdAt: hrs(i + .5) }); });

  // ---------- Solicitudes del sitio ----------
  const requests = Array.from({ length: 11 }, (_, i) => { const s = r.pick(SCEN), c = r.pick(customers.slice(1)), [mk, md] = r.pick(VEHICLES); return { id: 'rq' + i, code: 'SOL-' + (880 + i), kind: r.bool(.6) ? 'cotizacion' : 'hora', service: r.pick(['mecanica', 'scanner', 'motor', 'suspension', 'electricidad', 'ac', 'pintura', 'siniestros']), name: c.name, phone: c.phone, email: c.email, plate: plate(), car: `${mk} ${md} ${r.int(2012, 2024)}`, symptom: s.sym, photos: r.int(0, 4), date: iso(now + r.int(1, 7) * 864e5), time: r.pick(['09:00', '10:30', '12:00', '15:00', '16:30']), status: i < 4 ? 'nueva' : r.pick(['contactada', 'agendada', 'convertida', 'descartada']), createdAt: hrs(i * 7 + r.int(1, 5)) }; });

  // ---------- Estadística mensual (12 meses) ----------
  const monthStats = [];
  for (let m = 12; m >= 1; m--) {
    const d = new Date(now); d.setDate(1); d.setMonth(d.getMonth() - m);
    const season = 1 + .1 * Math.sin((d.getMonth() + 3) / 12 * Math.PI * 2) + (12 - m) * .012;
    const otsN = Math.round(48 * season * (.9 + r() * .2));
    const laborRev = Math.round(otsN * r.int(185, 225) * 1000), partsRev = Math.round(otsN * r.int(210, 270) * 1000);
    const avail = mechs.length * 8 * 22, billed = Math.round(avail * (.68 + r() * .14));
    monthStats.push({ id: 'ms' + m, m: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`, ots: otsN, laborRev, partsRev, hoursBilled: billed, hoursAvail: avail, approval: Math.round(72 + r() * 14),
      stage: { recepcion: +(1 + r()).toFixed(1), diagnostico: +(4 + r() * 4).toFixed(1), presupuesto: +(10 + r() * 14).toFixed(1), aprobado: +(3 + r() * 10).toFixed(1), reparacion: +(16 + r() * 14).toFixed(1), control: +(1.5 + r() * 2).toFixed(1), listo: +(6 + r() * 12).toFixed(1) },
      mech: Object.fromEntries(mechs.map(u => { const w = Math.round(8 * 21 * (.8 + r() * .15)); return [u.id, { billed: Math.round(w * (.78 + r() * .3)), worked: w }]; })) });
  }

  users.push({ id: 'u-cli', name: 'Ignacio Pérez', email: 'cliente@losandes.cl', password: 'demo123', role: 'cliente', customerId: 'c-demo', demo: true, active: true, color: '#d35400', createdAt: at(700) });

  const _log = [];
  const L = (h, action, detail, user) => _log.push({ id: 'lg' + _log.length, at: hrs(h), action, detail, user });
  L(.3, 'ot', `${demoOT.code} · presupuesto enviado al cliente (${demoOT.plate})`, 'u-asesor');
  L(.8, 'bodega', 'Repuesto entregado a Juan Carrasco', 'u-bod');
  L(1.6, 'seguro', `${sinOT.code} · siniestro enviado a Seguros Cordillera para evaluación`, 'u-asesor');
  L(3, 'ot', 'Kanban: OT movida a Control de calidad', 'u-jefe');
  L(5, 'compras', 'OC-5120 enviada a Motorpartes Santa Rosa', 'u-bod');
  L(20, 'login', 'Patricia Rojas inició sesión', 'u-admin');

  const settings = {
    name: 'Mecánica Integral Los Andes', short: 'Los Andes', tagline: 'Taller mecánico, desabolladura y pintura · todas las marcas',
    heroTitle: 'Tu auto en manos de especialistas, con presupuesto claro y seguimiento en línea.',
    heroText: 'Diagnóstico computarizado, mecánica, carrocería y siniestros con seguro. Apruebas cada ítem del presupuesto desde tu celular y sigues tu OT etapa por etapa.',
    announcement: '🛡️ Convenio directo con Seguros Cordillera, Austral y Pacífico Sur · Pagas solo el deducible',
    address: 'Av. Vicuña Mackenna 3840, San Joaquín, Santiago', phone: '+56 2 2933 4400', whatsapp: '+56 9 6100 4400', email: 'contacto@mecanicalosandes.cl',
    hours: 'Lun–Vie 8:00–18:30 · Sáb 9:00–13:00', laborRate: RATE, paintRate: PAINT, depositPct: 30, uf: UF, nextOT: otN, nextInvoice: invN, nextWarranty: garN,
    guarantee: 'Garantía escrita en mano de obra y repuestos: 6 a 24 meses según el trabajo.'
  };
  return { _anchor: now, _log, settings, users, customers, vehicles, ots, claims, insurers, invoices, warranties, parts, suppliers, purchaseOrders, partRequests, requests, bays, monthStats, labor: LABOR.map(([id, name, cat, hours]) => ({ id, name, cat, hours, active: true })) };
}
