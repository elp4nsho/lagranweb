// Datos semilla de Almacén Pampa: sucursales, cajas, productos con stock por sucursal, ventas
// detalladas de las últimas 2 semanas + historial diario de 6 meses, turnos de caja, compras, etc.
import { rng } from '../../../assets/core/db.js';

const DAY = 864e5;
const iso = ms => new Date(ms).toISOString();

export const BRANCHES = [
  { id: 'b1', code: 'CEN', name: 'Pampa Centro', address: 'Huérfanos 1020', comuna: 'Santiago', phone: '+56 2 2611 4010', weight: 1.3, opens: '07:00', closes: '22:00' },
  { id: 'b2', code: 'PRO', name: 'Pampa Providencia', address: 'Av. Providencia 2350', comuna: 'Providencia', phone: '+56 2 2611 4020', weight: 1.1, opens: '07:30', closes: '22:00' },
  { id: 'b3', code: 'NUN', name: 'Pampa Ñuñoa', address: 'Av. Irarrázaval 3400', comuna: 'Ñuñoa', phone: '+56 2 2611 4030', weight: .85, opens: '08:00', closes: '21:30' },
  { id: 'b4', code: 'VAL', name: 'Pampa Valparaíso', address: 'Av. Pedro Montt 1850', comuna: 'Valparaíso', phone: '+56 32 261 4040', weight: .75, opens: '08:00', closes: '21:00' }
];
const REGISTERS = [
  { id: 'c1', branchId: 'b1', name: 'Caja 1' }, { id: 'c2', branchId: 'b1', name: 'Caja 2' },
  { id: 'c3', branchId: 'b2', name: 'Caja 1' }, { id: 'c4', branchId: 'b2', name: 'Caja 2' },
  { id: 'c5', branchId: 'b3', name: 'Caja 1' }, { id: 'c6', branchId: 'b4', name: 'Caja 1' }
];

export const CATEGORIES = [
  { id: 'cafe', name: 'Café', icon: '☕', weight: 34 }, { id: 'pasteleria', name: 'Pastelería', icon: '🥐', weight: 22 },
  { id: 'sandwiches', name: 'Sándwiches', icon: '🥪', weight: 10 }, { id: 'bebidas', name: 'Bebidas', icon: '🥤', weight: 12 },
  { id: 'abarrotes', name: 'Abarrotes', icon: '🛒', weight: 7 }, { id: 'lacteos', name: 'Lácteos', icon: '🥛', weight: 6 },
  { id: 'snacks', name: 'Snacks', icon: '🍫', weight: 7 }, { id: 'aseo', name: 'Aseo', icon: '🧴', weight: 2 }
];

// [nombre, categoría, precio, costo, emoji, unidad, controla stock, proveedor]
const RAW = [
  ['Espresso', 'cafe', 1800, 450, '☕', 'taza', false, 's1'], ['Americano', 'cafe', 2200, 500, '☕', 'taza', false, 's1'],
  ['Cortado', 'cafe', 2400, 600, '☕', 'taza', false, 's1'], ['Cappuccino', 'cafe', 2900, 750, '☕', 'taza', false, 's1'],
  ['Latte', 'cafe', 3100, 800, '☕', 'taza', false, 's1'], ['Mocaccino', 'cafe', 3300, 900, '☕', 'taza', false, 's1'],
  ['Chocolate caliente', 'cafe', 2900, 800, '🍫', 'taza', false, 's1'], ['Té Ceylán', 'cafe', 1600, 250, '🍵', 'taza', false, 's1'],
  ['Café helado', 'cafe', 3400, 900, '🧋', 'vaso', false, 's1'], ['Matcha latte', 'cafe', 3500, 1100, '🍵', 'taza', false, 's1'],
  ['Medialuna', 'pasteleria', 1200, 400, '🥐', 'un', true, 's2'], ['Croissant de almendras', 'pasteleria', 2400, 900, '🥐', 'un', true, 's2'],
  ['Brownie', 'pasteleria', 1900, 600, '🟫', 'un', true, 's2'], ['Queque de naranja', 'pasteleria', 1700, 500, '🍰', 'trozo', true, 's2'],
  ['Kuchen de frambuesa', 'pasteleria', 2600, 950, '🥧', 'trozo', true, 's2'], ['Alfajor de maicena', 'pasteleria', 1100, 350, '🍪', 'un', true, 's2'],
  ['Galleta de avena', 'pasteleria', 900, 280, '🍪', 'un', true, 's2'], ['Empanada de pino', 'pasteleria', 2800, 1100, '🥟', 'un', true, 's2'],
  ['Muffin de arándano', 'pasteleria', 1800, 600, '🧁', 'un', true, 's2'],
  ['Barros Luco', 'sandwiches', 5900, 2600, '🥪', 'un', true, 's2'], ['Ave palta', 'sandwiches', 4900, 2100, '🥪', 'un', true, 's2'],
  ['Sándwich vegetariano', 'sandwiches', 4500, 1800, '🥗', 'un', true, 's2'], ['Tostado jamón queso', 'sandwiches', 3200, 1300, '🥪', 'un', true, 's2'],
  ['Churrasco italiano', 'sandwiches', 6400, 2900, '🥩', 'un', true, 's2'], ['Wrap de pollo', 'sandwiches', 4200, 1800, '🌯', 'un', true, 's2'],
  ['Agua mineral 500 ml', 'bebidas', 900, 350, '💧', 'un', true, 's5'], ['Agua con gas 500 ml', 'bebidas', 1000, 380, '💧', 'un', true, 's5'],
  ['Bebida lata 350 ml', 'bebidas', 1100, 480, '🥤', 'un', true, 's5'], ['Jugo natural de naranja', 'bebidas', 2500, 900, '🍊', 'vaso', true, 's5'],
  ['Néctar durazno 1 L', 'bebidas', 1690, 890, '🍑', 'un', true, 's5'], ['Kombucha jengibre', 'bebidas', 2490, 1200, '🫙', 'un', true, 's5'],
  ['Bebida energética', 'bebidas', 1890, 950, '⚡', 'un', true, 's5'], ['Cerveza sin alcohol', 'bebidas', 1590, 800, '🍺', 'un', true, 's5'],
  ['Café en grano Pampa 250 g', 'abarrotes', 7990, 3900, '🫘', 'un', true, 's1'], ['Arroz grado 1, 1 kg', 'abarrotes', 1590, 950, '🍚', 'un', true, 's3'],
  ['Spaghetti 400 g', 'abarrotes', 990, 520, '🍝', 'un', true, 's3'], ['Aceite maravilla 1 L', 'abarrotes', 2890, 1900, '🫒', 'un', true, 's3'],
  ['Azúcar 1 kg', 'abarrotes', 1290, 780, '🧂', 'un', true, 's3'], ['Pan de molde integral', 'abarrotes', 2290, 1350, '🍞', 'un', true, 's2'],
  ['Mermelada de mora', 'abarrotes', 2190, 1200, '🫐', 'un', true, 's3'], ['Té en bolsitas x20', 'abarrotes', 1790, 900, '🍵', 'un', true, 's3'],
  ['Leche entera 1 L', 'lacteos', 1190, 760, '🥛', 'un', true, 's4'], ['Leche de avena 1 L', 'lacteos', 2490, 1500, '🥛', 'un', true, 's4'],
  ['Yogurt natural', 'lacteos', 650, 360, '🥣', 'un', true, 's4'], ['Queso gauda 250 g', 'lacteos', 3490, 2200, '🧀', 'un', true, 's4'],
  ['Mantequilla 250 g', 'lacteos', 2990, 1900, '🧈', 'un', true, 's4'], ['Huevos x12', 'lacteos', 3890, 2600, '🥚', 'un', true, 's4'],
  ['Papas fritas 110 g', 'snacks', 1490, 700, '🥔', 'un', true, 's3'], ['Barra de cereal', 'snacks', 690, 330, '🌾', 'un', true, 's3'],
  ['Chocolate 70% cacao', 'snacks', 1290, 650, '🍫', 'un', true, 's3'], ['Maní salado 150 g', 'snacks', 1190, 560, '🥜', 'un', true, 's3'],
  ['Chicles menta', 'snacks', 590, 250, '🍬', 'un', true, 's3'],
  ['Lavaloza 750 ml', 'aseo', 1890, 1000, '🧴', 'un', true, 's6'], ['Papel higiénico x4', 'aseo', 2690, 1600, '🧻', 'un', true, 's6'],
  ['Toalla de papel x2', 'aseo', 1990, 1100, '🧻', 'un', true, 's6'], ['Detergente líquido 3 L', 'aseo', 6990, 4300, '🫧', 'un', true, 's6']
];

const SUPPLIERS = [
  { id: 's1', name: 'Tostaduría Altiplano', rut: '76.410.220-3', contact: 'Ignacio Mamani', email: 'pedidos@altiplano.cl', phone: '+56 9 7712 3344', category: 'Café y té', leadDays: 3, paymentTerms: '30 días' },
  { id: 's2', name: 'Panificadora La Espiga', rut: '77.902.115-K', contact: 'Marta Leiva', email: 'ventas@laespiga.cl', phone: '+56 9 6620 1188', category: 'Pastelería y sándwiches', leadDays: 1, paymentTerms: 'Contado' },
  { id: 's3', name: 'Distribuidora Andina', rut: '78.230.001-5', contact: 'Rubén Cárdenas', email: 'contacto@dandina.cl', phone: '+56 2 2890 4400', category: 'Abarrotes y snacks', leadDays: 4, paymentTerms: '45 días' },
  { id: 's4', name: 'Lácteos del Sur', rut: '79.555.430-2', contact: 'Paola Schmidt', email: 'pedidos@lacteosdelsur.cl', phone: '+56 64 223 9900', category: 'Lácteos', leadDays: 2, paymentTerms: '30 días' },
  { id: 's5', name: 'Bebidas Cordillera', rut: '76.118.772-9', contact: 'Felipe Rivas', email: 'b2b@cordillera.cl', phone: '+56 2 2741 2200', category: 'Bebidas', leadDays: 3, paymentTerms: '30 días' },
  { id: 's6', name: 'Limpiezas Pacífico', rut: '77.004.661-1', contact: 'Sandra Ortiz', email: 'ventas@lpacifico.cl', phone: '+56 32 245 6612', category: 'Aseo', leadDays: 5, paymentTerms: '60 días', active: false }
];

const FIRST = ['Camila', 'Valentina', 'Martina', 'Josefa', 'Catalina', 'Antonia', 'Fernanda', 'Javiera', 'Sofía', 'Matías', 'Benjamín', 'Vicente', 'Joaquín', 'Tomás', 'Agustín', 'Cristóbal', 'Diego', 'Felipe', 'Ignacio', 'Francisca', 'Paula', 'Rodrigo', 'Gonzalo', 'Andrés', 'Carla', 'Pía', 'Esteban', 'Macarena'];
const LAST = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López', 'Fuentes', 'Hernández', 'Torres', 'Araya', 'Flores', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Gutiérrez'];
const AV = ['#e11d48', '#0891b2', '#7c3aed', '#059669', '#d97706', '#2563eb', '#db2777', '#4d7c0f', '#9333ea', '#0f766e'];

// Dígito verificador de RUT chileno (módulo 11).
export function rutDv(n) {
  let s = 0, m = 2;
  for (const d of String(n).split('').reverse()) { s += +d * m; m = m === 7 ? 2 : m + 1; }
  const r = 11 - (s % 11);
  return r === 11 ? '0' : r === 10 ? 'K' : String(r);
}
const fmtRut = n => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${rutDv(n)}`;

export function seed() {
  const r = rng(7781);
  const now = Date.now();
  const today0 = new Date(); today0.setHours(0, 0, 0, 0);
  const t0 = today0.getTime();

  const products = RAW.map(([name, cat, price, cost, emoji, unit, track, supplierId], i) => {
    const stock = {};
    BRANCHES.forEach(b => { stock[b.id] = track ? Math.round(r.int(8, 70) * b.weight) : 0; });
    const minStock = track ? (cat === 'pasteleria' || cat === 'sandwiches' ? 10 : 6) : 0;
    if (track && r.bool(.18)) stock[r.pick(BRANCHES).id] = r.int(0, minStock - 1);
    return {
      id: 'pr' + String(i + 1).padStart(2, '0'), sku: `${cat.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
      barcode: track ? '780' + String(4100000000 + i * 7919 + 13).slice(0, 10) : '', name, categoryId: cat, price, cost, emoji, unit,
      trackStock: track, stock, minStock, supplierId, active: true, favorite: i < 6 || [10, 11, 19, 26].includes(i), createdAt: iso(now - (300 - i) * DAY)
    };
  });
  const byCat = Object.fromEntries(CATEGORIES.map(c => [c.id, products.filter(p => p.categoryId === c.id)]));
  const catWeights = CATEGORIES.flatMap(c => Array(c.weight).fill(c.id));

  // ---------- Usuarios / empleados ----------
  const users = [
    { id: 'u-admin', name: 'Carolina Vidal', email: 'admin@pampa.cl', password: 'pampa123', role: 'admin', branchId: null, shift: 'Completo', pin: '1111', color: '#7c3aed', demo: true, active: true, createdAt: iso(now - 700 * DAY) },
    { id: 'u-super', name: 'Jorge Ramírez', email: 'supervisor@pampa.cl', password: 'pampa123', role: 'supervisor', branchId: 'b1', shift: 'Completo', pin: '2222', color: '#0891b2', demo: true, active: true, createdAt: iso(now - 520 * DAY) },
    { id: 'u-cajero', name: 'Daniela Pérez', email: 'cajero@pampa.cl', password: 'pampa123', role: 'cajero', branchId: 'b1', shift: 'Mañana', pin: '3333', color: '#e11d48', demo: true, active: true, createdAt: iso(now - 210 * DAY) },
    { id: 'u-bodega', name: 'Luis Herrera', email: 'bodega@pampa.cl', password: 'pampa123', role: 'bodeguero', branchId: 'b1', shift: 'Mañana', pin: '4444', color: '#d97706', demo: true, active: true, createdAt: iso(now - 400 * DAY) }
  ];
  const staffNames = [['Ana María Lagos', 'b1', 'Tarde'], ['Kevin Torres', 'b1', 'Tarde'], ['Romina Castro', 'b2', 'Mañana'], ['Sebastián Vera', 'b2', 'Tarde'], ['Constanza Ríos', 'b2', 'Mañana'],
    ['Pablo Núñez', 'b2', 'Tarde'], ['Fabiola Mena', 'b3', 'Mañana'], ['Héctor Salinas', 'b3', 'Tarde'], ['Gabriela Ulloa', 'b4', 'Mañana'], ['Marcelo Ibáñez', 'b4', 'Tarde'], ['Tamara Quiroz', 'b1', 'Mañana']];
  staffNames.forEach(([name, branchId, shift], i) => {
    const em = name.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    users.push({ id: `u-e${i}`, name, email: `${em}${i}@pampa.cl`, password: 'pampa123', role: 'cajero', branchId, shift, pin: String(5000 + i * 37), color: AV[i % AV.length], demo: false, active: i !== 10, createdAt: iso(now - r.int(60, 600) * DAY) });
  });
  users.push({ id: 'u-sup2', name: 'Verónica Saavedra', email: 'veronica@pampa.cl', password: 'pampa123', role: 'supervisor', branchId: 'b2', shift: 'Completo', pin: '6262', color: '#059669', demo: false, active: true, createdAt: iso(now - 480 * DAY) });
  users.push({ id: 'u-bod2', name: 'Arturo Peña', email: 'arturo@pampa.cl', password: 'pampa123', role: 'bodeguero', branchId: 'b4', shift: 'Mañana', pin: '7171', color: '#2563eb', demo: false, active: true, createdAt: iso(now - 330 * DAY) });
  // Cajeros por registradora y turno (M: mañana, T: tarde)
  const cashierFor = { c1: ['u-cajero', 'u-e0'], c2: ['u-e10', 'u-e1'], c3: ['u-e2', 'u-e3'], c4: ['u-e4', 'u-e5'], c5: ['u-e6', 'u-e7'], c6: ['u-e8', 'u-e9'] };

  // ---------- Clientes (programa de puntos) ----------
  const customers = [];
  for (let i = 0; i < 64; i++) {
    const fn = FIRST[(i * 5 + 1) % FIRST.length], ln = LAST[(i * 7 + 3) % LAST.length], ln2 = LAST[(i * 3 + 11) % LAST.length];
    const num = 10000000 + ((i * 2654435761) % 12000000);
    customers.push({
      id: `cl${i}`, name: `${fn} ${ln} ${ln2}`, rut: fmtRut(num), email: `${fn}.${ln}${i}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + '@correo.cl',
      phone: `+56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}`, points: 0, pointsEarned: 0, visits: 0, totalSpent: 0, lastVisit: '', favoriteBranch: r.pick(BRANCHES).id,
      birthday: `${String(r.int(1, 28)).padStart(2, '0')}-${String(r.int(1, 12)).padStart(2, '0')}`, createdAt: iso(now - r.int(30, 500) * DAY)
    });
  }
  customers[0] = { ...customers[0], id: 'cl0', name: 'Matías Rojas Fuentes', rut: '16.543.210-' + rutDv(16543210), email: 'matias.rojas@correo.cl' };

  // ---------- Simulación de ventas ----------
  const HOURS = [[7, 4], [8, 10], [9, 9], [10, 6], [11, 5], [12, 7], [13, 9], [14, 6], [15, 4], [16, 4], [17, 6], [18, 8], [19, 6], [20, 4], [21, 2]];
  const hourBag = HOURS.flatMap(([h, w]) => Array(w).fill(h));
  const sales = [], shifts = {}, daily = [];
  let boleta = 100230;
  const DETAIL_DAYS = 10;
  const productCost = Object.fromEntries(products.map(p => [p.id, p.cost]));

  function makeItems() {
    const n = r.bool(.45) ? 1 : r.bool(.6) ? 2 : r.int(3, 5);
    const items = [];
    for (let k = 0; k < n; k++) {
      const cat = k === 1 && items[0]?.cat === 'cafe' && r.bool(.6) ? 'pasteleria' : r.pick(catWeights);
      const p = r.pick(byCat[cat]);
      const ex = items.find(x => x.productId === p.id);
      if (ex) { ex.qty++; continue; }
      const it = { productId: p.id, price: p.price, qty: r.bool(.85) ? 1 : r.int(2, 3), cat };
      if (r.bool(.04)) it.discount = 10;
      items.push(it);
    }
    items.forEach(i => delete i.cat);
    return items;
  }

  for (let d = 180; d >= 0; d--) {
    const dayStart = t0 - d * DAY;
    const dow = new Date(dayStart).getDay();
    const trend = 1 + (180 - d) / 180 * .25;
    for (const b of BRANCHES) {
      const weekend = dow === 0 ? (b.id === 'b4' ? 1.1 : .7) : dow === 6 ? (b.id === 'b4' ? 1.3 : .85) : 1;
      const count = Math.round((24 + r.int(-4, 6)) * b.weight * weekend * trend);
      const regs = REGISTERS.filter(x => x.branchId === b.id);
      let total = 0, cost = 0, tx = 0;
      for (let k = 0; k < count; k++) {
        const hour = r.pick(hourBag);
        const at = dayStart + hour * 3600e3 + r.int(0, 59) * 60e3 + r.int(0, 59) * 1e3;
        if (at > now) continue;
        const reg = regs[k % regs.length];
        const slot = hour < 15 ? 'M' : 'T';
        const slotStart = dayStart + (slot === 'M' ? 7 : 15) * 3600e3, slotEnd = dayStart + (slot === 'M' ? 15 : 22) * 3600e3 + 600e3;
        const isOpenSlot = slotStart <= now && now < slotEnd;
        if (d === 0 && reg.id === 'c1' && isOpenSlot) continue; // la caja de la demo queda libre para abrir turno
        const items = makeItems();
        const subtotal = items.reduce((s, i) => s + Math.round(i.price * i.qty * (1 - (i.discount || 0) / 100)), 0);
        tx++; total += subtotal; cost += items.reduce((s, i) => s + productCost[i.productId] * i.qty, 0);
        if (d >= DETAIL_DAYS) continue;
        const shiftId = `sh-${reg.id}-${d}-${slot}`;
        const cashierId = cashierFor[reg.id][slot === 'M' ? 0 : 1];
        if (!shifts[shiftId]) shifts[shiftId] = { id: shiftId, registerId: reg.id, branchId: b.id, userId: cashierId, openedAt: iso(slotStart + r.int(0, 8) * 60e3), openingCash: 50000, status: isOpenSlot ? 'abierto' : 'cerrado', closesAt: slotEnd, movements: [], createdAt: iso(slotStart) };
        const cust = r.bool(.33) ? r.pick(customers) : null;
        let pointsUsed = 0;
        if (cust && cust.points > 3000 && r.bool(.15)) { pointsUsed = Math.min(cust.points, Math.floor(subtotal / 2 / 100) * 100); cust.points -= pointsUsed; }
        const due = subtotal - pointsUsed;
        const pm = r();
        let payments, change = 0;
        if (pm < .3) { const tendered = Math.ceil(due / 1000) * 1000 + (r.bool(.3) ? 5000 : 0); payments = [{ method: 'efectivo', amount: due }]; change = tendered - due; }
        else if (pm < .86) payments = [{ method: 'tarjeta', amount: due }];
        else if (pm < .96) payments = [{ method: 'transferencia', amount: due }];
        else { const half = Math.round(due / 2 / 10) * 10; payments = [{ method: 'efectivo', amount: half }, { method: 'tarjeta', amount: due - half }]; }
        if (pointsUsed) payments.unshift({ method: 'puntos', amount: pointsUsed });
        const earned = cust ? Math.floor((subtotal - pointsUsed) / 100) : 0;
        if (cust) { cust.points += earned; cust.pointsEarned += earned; cust.visits++; cust.totalSpent += subtotal; if (!cust.lastVisit || cust.lastVisit < iso(at)) cust.lastVisit = iso(at); }
        const num = boleta++;
        const extra = {};
        if (change) extra.change = change;
        if (earned) extra.pointsEarned = earned;
        if (pointsUsed) extra.pointsUsed = pointsUsed;
        if (cust) extra.customerId = cust.id;
        sales.push({ ...extra,
          id: 's' + num, number: num, branchId: b.id, registerId: reg.id, shiftId, cashierId,
          items, subtotal: items.reduce((s, i) => s + i.price * i.qty, 0), discount: items.reduce((s, i) => s + i.price * i.qty, 0) - subtotal, total: subtotal,
          payments, status: r.bool(.008) ? 'anulada' : 'completada', createdAt: iso(at)
        });
      }
      if (d >= DETAIL_DAYS) daily.push({ id: `d-${b.id}-${d}`, date: new Date(dayStart).toISOString().slice(0, 10), branchId: b.id, total, cost, count: tx, createdAt: iso(dayStart) });
    }
  }
  sales.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  // Clientes históricos: aproximan visitas anteriores al detalle
  customers.forEach(c => { const extra = r.int(0, 40); c.visits += extra; c.pointsEarned += extra * 45; c.points += Math.round(extra * 45 * .6); c.totalSpent += extra * 4500; });

  // Cierra turnos: arqueo con diferencias realistas
  const shiftRows = Object.values(shifts).map(s => {
    const ss = sales.filter(x => x.shiftId === s.id && x.status === 'completada');
    const by = { efectivo: 0, tarjeta: 0, transferencia: 0, puntos: 0 };
    ss.forEach(x => x.payments.forEach(p => { by[p.method] += p.amount; }));
    const out = { ...s, salesCount: ss.length, salesTotal: ss.reduce((t, x) => t + x.total, 0), byMethod: by };
    if (s.status === 'cerrado') {
      const expected = s.openingCash + by.efectivo;
      const diff = r.bool(.72) ? 0 : r.pick([-1, 1]) * r.int(1, 30) * 100;
      Object.assign(out, { closedAt: iso(s.closesAt), expectedCash: expected, countedCash: expected + diff, difference: diff, notes: diff ? (diff < 0 ? 'Faltante revisado con supervisor' : 'Sobrante, posible vuelto mal entregado') : '' });
    }
    delete out.closesAt;
    return out;
  }).sort((a, b) => b.openedAt.localeCompare(a.openedAt));

  // ---------- Órdenes de compra ----------
  const purchaseOrders = [];
  const poStatus = ['recibida', 'recibida', 'recibida', 'recibida', 'parcial', 'enviada', 'enviada', 'borrador', 'recibida', 'cancelada', 'recibida', 'enviada', 'recibida', 'borrador'];
  poStatus.forEach((status, i) => {
    const sup = SUPPLIERS[i % 5];
    const branch = BRANCHES[i % 4];
    const pool = products.filter(p => p.supplierId === sup.id && p.trackStock);
    const lines = [];
    for (let k = 0; k < Math.min(pool.length, r.int(2, 5)); k++) {
      const p = pool[(k + i) % pool.length];
      if (lines.some(l => l.productId === p.id)) continue;
      const qty = r.int(2, 8) * 6;
      lines.push({ productId: p.id, name: p.name, qty, cost: p.cost, received: status === 'recibida' ? qty : status === 'parcial' ? Math.floor(qty / 2) : 0 });
    }
    if (!lines.length) return;
    const created = now - (40 - i * 2.8) * DAY;
    purchaseOrders.push({
      id: `oc${i}`, number: 3200 + i, supplierId: sup.id, branchId: branch.id, lines, status, total: lines.reduce((s, l) => s + l.qty * l.cost, 0),
      notes: status === 'cancelada' ? 'Proveedor sin stock' : '', expectedAt: iso(created + sup.leadDays * DAY).slice(0, 10), userId: i % 2 ? 'u-bodega' : 'u-super',
      sentAt: status !== 'borrador' ? iso(created + 3600e3) : '', receivedAt: ['recibida', 'parcial'].includes(status) ? iso(created + sup.leadDays * DAY) : '', createdAt: iso(created)
    });
  });
  purchaseOrders.reverse();

  // ---------- Movimientos de stock ----------
  const stockMoves = [];
  purchaseOrders.filter(p => ['recibida', 'parcial'].includes(p.status)).forEach(po => po.lines.forEach(l => {
    if (l.received) stockMoves.push({ type: 'entrada', productId: l.productId, branchId: po.branchId, qty: l.received, note: `Recepción OC #${po.number}`, userId: po.userId, createdAt: po.receivedAt });
  }));
  for (let i = 0; i < 26; i++) {
    const p = r.pick(products.filter(x => x.trackStock));
    const b = r.pick(BRANCHES);
    const at = iso(now - r.int(0, 30) * DAY - r.int(1, 12) * 3600e3);
    if (i % 3 === 0) {
      const to = r.pick(BRANCHES.filter(x => x.id !== b.id));
      stockMoves.push({ type: 'transferencia', productId: p.id, branchId: b.id, toBranchId: to.id, qty: r.int(3, 12), note: `Reposición a ${to.name}`, userId: 'u-bodega', createdAt: at });
    } else if (i % 3 === 1) {
      stockMoves.push({ type: 'merma', productId: p.id, branchId: b.id, qty: r.int(1, 4), note: r.pick(['Producto vencido', 'Dañado en traslado', 'Sobrante del día (pastelería)', 'Envase roto']), userId: r.pick(['u-bodega', 'u-super', 'u-bod2']), createdAt: at });
    } else {
      stockMoves.push({ type: 'ajuste', productId: p.id, branchId: b.id, qty: r.pick([-2, -1, 1, 2, 3]), note: 'Conteo cíclico', userId: 'u-bodega', createdAt: at });
    }
  }
  stockMoves.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  stockMoves.forEach((m, i) => { m.id = 'mv' + i; });

  const LOGS = [
    ['u-admin', 'login', 'Carolina Vidal inició sesión'], ['u-super', 'caja', 'Cerró turno Caja 2 · Pampa Centro (sin diferencias)'], ['u-bodega', 'compra', 'Recibió OC #3208 de Distribuidora Andina'],
    ['u-super', 'producto', 'Cambió precio de Cappuccino: $2.700 → $2.900'], ['u-bodega', 'inventario', 'Merma de 3 Medialuna en Pampa Ñuñoa (sobrante del día)'], ['u-admin', 'usuarios', 'Desactivó a Tamara Quiroz'],
    ['u-super', 'cliente', 'Ajustó +500 puntos a Matías Rojas Fuentes (compensación)'], ['u-bodega', 'inventario', 'Transferencia de 10 Leche entera 1 L de Pampa Centro a Pampa Valparaíso'], ['u-admin', 'ajustes', 'Actualizó programa de puntos: 1 punto cada $100']
  ];

  return {
    _log: LOGS.map(([user, action, detail], i) => ({ id: 'lg' + i, at: iso(now - (i * 1.3 + .2) * DAY), action, detail, user })),
    branches: BRANCHES.map(({ weight, ...b }) => ({ ...b, active: true, manager: b.id === 'b1' ? 'u-super' : b.id === 'b2' ? 'u-sup2' : '' })),
    registers: REGISTERS, categories: CATEGORIES.map(({ weight, ...c }, i) => ({ ...c, order: i + 1 })),
    products, suppliers: SUPPLIERS.map(s => ({ active: true, ...s })), users, customers, sales, daily, shifts: shiftRows,
    purchaseOrders, stockMoves, held: [],
    settings: {
      businessName: 'Almacén Pampa', legalName: 'Comercial Pampa SpA', rut: '77.123.456-7', giro: 'Cafetería y minimarket', email: 'contacto@almacenpampa.cl',
      receiptFooter: '¡Gracias por preferir Almacén Pampa! Acumula puntos con tu RUT.', iva: 19,
      loyalty: { enabled: true, pesosPerPoint: 100, pointValue: 1, minRedeem: 500, tiers: [{ name: 'Bronce', min: 0 }, { name: 'Plata', min: 2500 }, { name: 'Oro', min: 7000 }] },
      cashierMaxDiscount: 10, openingCash: 50000, detailDays: DETAIL_DAYS
    },
    boletaSeq: boleta + 1, poSeq: 3200 + poStatus.length
  };
}
