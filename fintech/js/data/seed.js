// Datos semilla de Cóndor Pay (todo ficticio). Se generan con rng() para que
// sean siempre los mismos y con historia de varios meses para que los gráficos luzcan reales.
import { rng } from '../../../assets/core/db.js';

const FIRST = ['Camila', 'Benjamín', 'Valentina', 'Matías', 'Isidora', 'Vicente', 'Antonia', 'Martín', 'Florencia', 'Agustín', 'Josefa', 'Tomás', 'Catalina', 'Joaquín', 'Fernanda', 'Diego', 'Javiera', 'Lucas', 'Constanza', 'Sebastián', 'Trinidad', 'Felipe', 'Emilia', 'Cristóbal', 'Paula', 'Ignacio', 'Daniela', 'Nicolás', 'Francisca', 'Gaspar', 'Amanda', 'Maximiliano', 'Renata', 'Alonso', 'Sofía', 'Bastián', 'Rocío', 'Pedro'];
const LAST = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López', 'Fuentes', 'Hernández', 'Torres', 'Araya', 'Flores', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Gutiérrez', 'Castro', 'Pizarro', 'Álvarez', 'Vásquez', 'Sánchez', 'Fernández', 'Carrasco', 'Gómez', 'Cortés', 'Herrera', 'Núñez', 'Jara', 'Vergara', 'Rivera'];
const COMUNAS = ['Providencia', 'Ñuñoa', 'Las Condes', 'Maipú', 'La Florida', 'Santiago', 'Puente Alto', 'Viña del Mar', 'Valparaíso', 'Concepción', 'Temuco', 'Antofagasta', 'La Serena', 'Puerto Montt', 'Rancagua', 'Talca'];
const JOBS = ['Ingeniera comercial', 'Profesor', 'Diseñadora', 'Técnico en enfermería', 'Desarrollador', 'Contadora', 'Kinesiólogo', 'Emprendedora', 'Abogado', 'Periodista', 'Arquitecta', 'Vendedor', 'Estudiante', 'Chef', 'Médica'];
const COLORS = ['#0ea5e9', '#e11d48', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#4f46e5', '#059669', '#ea580c'];

export const CATEGORIES = {
  Supermercado: ['Súper Andino', 'Mercado La Vega Central', 'Almacén Don Lucho', 'Hiper Cordillera'],
  Restaurantes: ['Sanguchería El Roble', 'Café Altamira', 'Sushi Pacífico', 'Picada Los Tres Hermanos', 'Pizzería Volcán'],
  Transporte: ['Recarga Bip!ficticia', 'Taxi Rápido Sur', 'Bencinera Copec-Demo', 'Peaje Ruta 68 Demo', 'App Viajes Ya'],
  Servicios: ['Luz del Valle', 'Aguas del Maipo Demo', 'Gas Austral', 'Fibra Total', 'Móvil Andes'],
  Entretención: ['Cine Estrella', 'Streamflix', 'Música Ya', 'Teatro del Puerto', 'Juegos Cumbre'],
  Salud: ['Farmacia Bienestar', 'Clínica Los Alerces', 'Óptica Mirada', 'Centro Dental Sonrisa'],
  Compras: ['Tienda Patagonia Hogar', 'Electro Austral', 'Librería Andina', 'Moda Pacífico', 'Ferretería El Clavo'],
  Educación: ['Instituto Cumbre', 'Cursos Online Pro', 'Colegio San Andrés Demo'],
};
export const BILLERS = [
  { id: 'luz', name: 'Luz del Valle', type: 'Electricidad', icon: '💡' },
  { id: 'agua', name: 'Aguas del Maipo Demo', type: 'Agua', icon: '💧' },
  { id: 'gas', name: 'Gas Austral', type: 'Gas', icon: '🔥' },
  { id: 'internet', name: 'Fibra Total', type: 'Internet y TV', icon: '📶' },
  { id: 'movil', name: 'Móvil Andes', type: 'Telefonía móvil', icon: '📱' },
  { id: 'tag', name: 'Autopistas Unidas Demo', type: 'TAG autopistas', icon: '🚗' },
  { id: 'gc', name: 'Gastos comunes Edificio Mirador', type: 'Gastos comunes', icon: '🏢' },
];
export const BANKS = ['Cóndor Pay', 'Banco Austral (ficticio)', 'Banco del Pacífico Demo', 'Banco Cordillera (ficticio)', 'Cooperativa Lago Sur Demo', 'Banco Puerto Nuevo (ficticio)'];

export function rutDV(n) {
  let s = 0, m = 2;
  for (const d of String(n).split('').reverse()) { s += +d * m; m = m === 7 ? 2 : m + 1; }
  const r = 11 - (s % 11);
  return r === 11 ? '0' : r === 10 ? 'K' : String(r);
}
export function fmtRut(n) {
  const body = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${body}-${rutDV(n)}`;
}

export function seed() {
  const r = rng(2026);
  const now = Date.now();
  const iso = ms => new Date(ms).toISOString();
  const users = [], accounts = [], transactions = [], cards = [], contacts = [], goals = [], investments = [],
    loans = [], notifications = [], devices = [], alerts = [], tickets = [], bills = [];
  let accSeq = 1000;
  const accNum = () => `00-${String(++accSeq).padStart(4, '0')}-${r.int(1000, 9999)}`;
  const cardNum = () => `4${r.int(100, 999)} ${r.int(1000, 9999)} ${r.int(1000, 9999)} ${r.int(1000, 9999)}`;

  // ---------- Equipo interno ----------
  const staff = [
    { id: 'u-admin', name: 'Rodrigo Pizarro', email: 'admin@condorpay.demo', password: 'admin123', role: 'admin', color: '#4f46e5' },
    { id: 'u-riesgo', name: 'Valeria Muñoz', email: 'riesgo@condorpay.demo', password: 'riesgo123', role: 'riesgo', color: '#e11d48' },
    { id: 'u-ejec', name: 'Tomás Herrera', email: 'ejecutivo@condorpay.demo', password: 'ejecutivo123', role: 'ejecutivo', color: '#16a34a' },
    { id: 'u-audit', name: 'Paula Contreras', email: 'auditor@condorpay.demo', password: 'auditor123', role: 'auditor', color: '#d97706' },
    { id: 'u-riesgo2', name: 'Andrés Vergara', email: 'avergara@condorpay.demo', password: 'demo123', role: 'riesgo', color: '#0891b2', demo: false },
    { id: 'u-ejec2', name: 'Carla Núñez', email: 'cnunez@condorpay.demo', password: 'demo123', role: 'ejecutivo', color: '#7c3aed', demo: false },
  ];
  staff.forEach(s => users.push({ demo: true, active: true, createdAt: iso(now - 400 * 864e5), ...s }));

  // ---------- Clientes ----------
  const mkCustomer = (o = {}) => {
    const fn = o.first || r.pick(FIRST), ln = `${r.pick(LAST)} ${r.pick(LAST)}`;
    const rutN = r.int(9_000_000, 24_999_999);
    const created = o.createdAt || iso(now - r.int(5, 420) * 864e5);
    const u = {
      id: o.id, name: o.name || `${fn} ${ln}`, email: o.email || `${fn}.${ln.split(' ')[0]}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + r.int(1, 99) + '@correo.demo',
      password: o.password || 'demo123', role: 'cliente', color: r.pick(COLORS), demo: !!o.demo, active: o.active ?? true,
      rut: fmtRut(rutN), phone: `+56 9 ${r.int(1000, 9999)} ${r.int(1000, 9999)}`, comuna: r.pick(COMUNAS), job: r.pick(JOBS),
      income: o.income || r.int(6, 40) * 100000, birth: iso(now - r.int(20, 62) * 365 * 864e5).slice(0, 10),
      kyc: o.kyc || 'aprobado', segment: o.segment || r.pick(['Esencial', 'Esencial', 'Plus', 'Plus', 'Black']), risk: o.risk || r.pick(['bajo', 'bajo', 'bajo', 'medio', 'alto']),
      createdAt: created,
    };
    if (u.kyc !== 'aprobado') {
      u.kycData = { submittedAt: created, selfieMatch: r.int(o.kyc === 'pendiente' ? 62 : 40, 99), docValid: r.bool(.85), pep: r.bool(.08), listas: r.bool(.06) ? 'Coincidencia parcial' : 'Sin coincidencias', address: `${r.pick(['Av. Los Leones', 'Calle Larga', 'Pasaje Los Aromos', 'Av. Grecia', 'Calle O’Higgins'])} ${r.int(100, 4999)}` };
    }
    users.push(u);
    return u;
  };

  const demo = mkCustomer({ id: 'u-cliente', name: 'Camila Fuentes Araya', first: 'Camila', email: 'cliente@condorpay.demo', password: 'cliente123', demo: true, income: 1850000, segment: 'Plus', risk: 'bajo', createdAt: iso(now - 540 * 864e5) });
  const customers = [demo];
  for (let i = 0; i < 38; i++) customers.push(mkCustomer({ id: 'c-' + i }));
  // Solicitudes de apertura pendientes de revisión KYC
  const pending = [];
  for (let i = 0; i < 9; i++) pending.push(mkCustomer({ id: 'k-' + i, kyc: i < 7 ? 'pendiente' : 'rechazado', createdAt: iso(now - r.int(0, 6) * 864e5 - r.int(1, 20) * 36e5), segment: 'Esencial' }));

  // ---------- Cuentas, tarjetas y movimientos ----------
  const cats = Object.keys(CATEGORIES);
  const amountFor = c => ({ Supermercado: [8, 95], Restaurantes: [6, 45], Transporte: [2, 40], Servicios: [15, 70], Entretención: [4, 30], Salud: [5, 80], Compras: [10, 180], Educación: [40, 250] }[c]);
  const addTx = (u, acc, t) => transactions.push({ id: 't' + transactions.length.toString(36) + r.int(100, 999), userId: u.id, accountId: acc.id, status: 'ok', channel: 'app', ...t, createdAt: t.date });

  [...customers, ...pending].forEach((u, idx) => {
    const isDemo = u.id === demo.id;
    const pend = u.kyc !== 'aprobado';
    const vista = { id: `a-${u.id}-v`, userId: u.id, type: 'vista', number: accNum(), balance: pend ? 0 : isDemo ? 1284350 : r.int(2, 260) * 10000, status: pend ? 'en revisión' : 'activa', createdAt: u.createdAt };
    const ahorro = { id: `a-${u.id}-s`, userId: u.id, type: 'ahorro', number: accNum(), balance: pend ? 0 : isDemo ? 3420000 : r.bool(.7) ? r.int(0, 900) * 10000 : 0, status: pend ? 'en revisión' : 'activa', createdAt: u.createdAt };
    const credito = { id: `a-${u.id}-c`, userId: u.id, type: 'credito', number: accNum(), limit: isDemo ? 2500000 : r.int(3, 40) * 100000, balance: 0, status: pend ? 'en revisión' : 'activa', createdAt: u.createdAt };
    accounts.push(vista, ahorro);
    if (!pend && (isDemo || r.bool(.75))) accounts.push(credito);
    const num = cardNum();
    cards.push({ id: `card-${u.id}`, userId: u.id, accountId: vista.id, kind: 'virtual', brand: 'Cóndor Débito', number: num, last4: num.slice(-4), exp: `${String(r.int(1, 12)).padStart(2, '0')}/${r.int(28, 31)}`, cvv: String(r.int(100, 999)), status: pend ? 'inactiva' : r.bool(.06) ? 'bloqueada' : 'activa', online: true, international: r.bool(.4), contactless: true, limitDaily: 500000, limitOnline: 300000, createdAt: u.createdAt });
    if (accounts.includes(credito)) {
      const n2 = cardNum();
      cards.push({ id: `cardc-${u.id}`, userId: u.id, accountId: credito.id, kind: 'física', brand: isDemo ? 'Cóndor Crédito Plus' : r.pick(['Cóndor Crédito Clásica', 'Cóndor Crédito Plus', 'Cóndor Black']), number: n2, last4: n2.slice(-4), exp: `${String(r.int(1, 12)).padStart(2, '0')}/${r.int(28, 31)}`, cvv: String(r.int(100, 999)), status: r.bool(.05) ? 'congelada' : 'activa', online: true, international: true, contactless: true, limitDaily: 800000, limitOnline: 600000, createdAt: u.createdAt });
    }
    if (pend) return;

    // Historia de movimientos (6 meses). La cliente demo tiene mucho más detalle.
    const months = 6;
    for (let m = months - 1; m >= 0; m--) {
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(9, 0, 0, 0); monthStart.setMonth(monthStart.getMonth() - m);
      const days = m === 0 ? new Date().getDate() : 28;
      const at = d => { const t = monthStart.getTime() + (d - 1) * 864e5 + r.int(0, 13) * 36e5 + r.int(0, 59) * 6e4; return t > now ? now - r.int(1, 30) * 6e4 : t; };
      if (days >= 1 || m > 0) {
        if (m > 0 || new Date().getDate() >= 1) addTx(u, vista, { date: iso(at(1)), amount: u.income, desc: isDemo ? 'Remuneración Estudio Cumbre SpA' : 'Abono remuneraciones', category: 'Ingresos', type: 'abono', counterpart: 'Empleador' });
      }
      const n = isDemo ? r.int(26, 34) : r.int(3, 6);
      for (let k = 0; k < n; k++) {
        const c = r.pick(cats); const [a, b] = amountFor(c);
        const useCredit = accounts.includes(credito) && r.bool(.3);
        addTx(u, useCredit ? credito : vista, { date: iso(at(r.int(1, days))), amount: -r.int(a, b) * 1000 - r.int(0, 9) * 90, desc: r.pick(CATEGORIES[c]), category: c, type: r.bool(.12) ? 'qr' : 'compra', channel: r.pick(['tarjeta', 'tarjeta', 'online', 'app']) });
      }
      const tr = isDemo ? r.int(3, 6) : r.int(0, 3);
      for (let k = 0; k < tr; k++) {
        const out = r.bool(.65);
        addTx(u, vista, { date: iso(at(r.int(1, days))), amount: (out ? -1 : 1) * r.int(10, 350) * 1000, desc: out ? `Transferencia a ${r.pick(FIRST)} ${r.pick(LAST)}` : `Transferencia de ${r.pick(FIRST)} ${r.pick(LAST)}`, category: 'Transferencias', type: 'transferencia', counterpart: r.pick(BANKS) });
      }
      if (isDemo && m > 0) {
        addTx(u, vista, { date: iso(at(8)), amount: -r.int(380, 420) * 100, desc: 'Pago cuenta Luz del Valle', category: 'Servicios', type: 'pago' });
        addTx(u, vista, { date: iso(at(12)), amount: -24990, desc: 'Pago cuenta Fibra Total', category: 'Servicios', type: 'pago' });
        addTx(u, ahorro, { date: iso(at(2)), amount: 150000, desc: 'Ahorro automático mensual', category: 'Ahorro', type: 'abono' });
      }
    }
    if (!isDemo && idx % 4 === 0) {
      // algunos movimientos grandes para el monitoreo de fraude
      addTx(u, vista, { date: iso(now - r.int(1, 55) * 864e5), amount: -r.int(10, 32) * 100000, desc: `Transferencia a ${r.pick(FIRST)} ${r.pick(LAST)}`, category: 'Transferencias', type: 'transferencia', counterpart: r.pick(BANKS), flagged: true });
    }
  });
  transactions.sort((a, b) => b.date.localeCompare(a.date));

  // ---------- Contactos, metas, inversiones, cuentas por pagar (cliente demo) ----------
  [['Matías Soto', 'Banco Austral (ficticio)', 'mati'], ['Mamá · Patricia Araya', 'Cóndor Pay', 'mamá'], ['Josefa Rojas', 'Banco del Pacífico Demo', 'jose'], ['Arriendo · Inmobiliaria Pehuén', 'Banco Cordillera (ficticio)', 'arriendo'], ['Diego Tapia', 'Cóndor Pay', 'dieguito'], ['Gimnasio Fuerza Sur', 'Cooperativa Lago Sur Demo', 'gym']]
    .forEach(([name, bank, alias], i) => contacts.push({ id: 'ct' + i, userId: demo.id, name, alias, bank, rut: fmtRut(r.int(8_000_000, 22_000_000)), accountType: r.pick(['Cuenta vista', 'Cuenta corriente']), accountNumber: String(r.int(10000000, 99999999)), email: '', fav: i < 3, createdAt: iso(now - (200 - i * 20) * 864e5) }));

  goals.push(
    { id: 'g1', userId: demo.id, name: 'Viaje a Torres del Paine', icon: '🏔️', target: 1800000, saved: 1170000, deadline: iso(now + 120 * 864e5).slice(0, 10), auto: 80000 },
    { id: 'g2', userId: demo.id, name: 'Fondo de emergencia', icon: '🛟', target: 3000000, saved: 2250000, deadline: iso(now + 300 * 864e5).slice(0, 10), auto: 100000 },
    { id: 'g3', userId: demo.id, name: 'Notebook nuevo', icon: '💻', target: 950000, saved: 210000, deadline: iso(now + 75 * 864e5).slice(0, 10), auto: 0 },
  );
  investments.push(
    { id: 'i1', userId: demo.id, fundId: 'f-conservador', amount: 1500000, since: iso(now - 300 * 864e5) },
    { id: 'i2', userId: demo.id, fundId: 'f-moderado', amount: 900000, since: iso(now - 210 * 864e5) },
    { id: 'i3', userId: demo.id, fundId: 'f-acciones', amount: 400000, since: iso(now - 120 * 864e5) },
  );
  customers.slice(1).forEach(u => { if (r.bool(.45)) investments.push({ id: 'i-' + u.id, userId: u.id, fundId: r.pick(['f-conservador', 'f-moderado', 'f-acciones', 'f-dolar']), amount: r.int(2, 60) * 50000, since: iso(now - r.int(20, 400) * 864e5) }); });

  const dueIn = d => iso(now + d * 864e5).slice(0, 10);
  bills.push(
    { id: 'b1', userId: demo.id, billerId: 'luz', clientNumber: '3301-772', amount: 41290, due: dueIn(6), status: 'pendiente' },
    { id: 'b2', userId: demo.id, billerId: 'agua', clientNumber: '88120-4', amount: 18750, due: dueIn(11), status: 'pendiente' },
    { id: 'b3', userId: demo.id, billerId: 'internet', clientNumber: 'FT-55102', amount: 24990, due: dueIn(3), status: 'pendiente' },
    { id: 'b4', userId: demo.id, billerId: 'gc', clientNumber: 'Depto 1204', amount: 96400, due: dueIn(15), status: 'pendiente' },
    { id: 'b5', userId: demo.id, billerId: 'movil', clientNumber: '+56 9 8812 3401', amount: 15990, due: dueIn(-12), status: 'pagada', paidAt: iso(now - 14 * 864e5) },
  );

  // ---------- Notificaciones y dispositivos ----------
  [['Abono recibido', 'Recibiste tu remuneración de Estudio Cumbre SpA.', 'abono', 2], ['Meta casi lista', 'Tu meta "Fondo de emergencia" va en 75%. ¡Sigue así!', 'meta', 26], ['Compra internacional bloqueada', 'Bloqueamos un intento de compra en el extranjero porque tu tarjeta no tiene uso internacional activo.', 'seguridad', 70], ['Nuevo inicio de sesión', 'Detectamos un inicio de sesión desde Chrome en macOS (Santiago).', 'seguridad', 140], ['Cuenta por vencer', 'Tu cuenta de Fibra Total vence en 3 días.', 'pago', 5], ['Tu fondo subió', 'Fondo Cóndor Moderado rentó 1,2% este mes.', 'inversion', 300]]
    .forEach(([title, body, kind, h], i) => notifications.push({ id: 'n' + i, userId: demo.id, title, body, kind, read: i > 2, at: iso(now - h * 36e5), createdAt: iso(now - h * 36e5) }));
  [['iPhone 15 · App Cóndor Pay', 'Santiago, CL', 0.1, true], ['Chrome · macOS', 'Santiago, CL', 30], ['Safari · iPad', 'Viña del Mar, CL', 400]]
    .forEach(([name, place, h, current], i) => devices.push({ id: 'd' + i, userId: demo.id, name, place, lastSeen: iso(now - h * 36e5), current: !!current, trusted: true }));

  // ---------- Créditos ----------
  const purposes = ['Consolidación de deudas', 'Remodelación hogar', 'Compra de vehículo', 'Estudios', 'Viaje', 'Capital de trabajo', 'Salud'];
  const loanStatus = ['en evaluación', 'en evaluación', 'en evaluación', 'solicitado', 'aprobado', 'rechazado', 'desembolsado', 'desembolsado'];
  customers.slice(1, 25).forEach((u, i) => {
    if (!r.bool(.7)) return;
    const amount = r.int(6, 120) * 50000, term = r.pick([12, 18, 24, 36, 48]);
    const rate = 1.29 + r.int(-20, 40) / 100;
    const st = r.pick(loanStatus);
    loans.push({ id: 'l' + i, userId: u.id, amount, term, rate, monthly: Math.round(pmt(amount, rate / 100, term)), purpose: r.pick(purposes), income: u.income, status: st, score: r.int(420, 890), createdAt: iso(now - r.int(0, 60) * 864e5), reviewer: st === 'solicitado' || st === 'en evaluación' ? null : 'u-riesgo', notes: '' });
  });
  loans.push({ id: 'l-demo', userId: demo.id, amount: 2000000, term: 24, rate: 1.19, monthly: Math.round(pmt(2000000, .0119, 24)), purpose: 'Remodelación hogar', income: demo.income, status: 'desembolsado', score: 812, createdAt: iso(now - 160 * 864e5), reviewer: 'u-riesgo', notes: 'Buen comportamiento de pago.', paid: 5 });

  // ---------- Reglas y alertas de fraude ----------
  const fraudRules = [
    { id: 'fr1', name: 'Monto alto', type: 'monto', threshold: 1000000, count: 0, windowMin: 0, channel: 'todos', severity: 'media', action: 'alertar', active: true },
    { id: 'fr2', name: 'Monto muy alto', type: 'monto', threshold: 2500000, count: 0, windowMin: 0, channel: 'todos', severity: 'alta', action: 'retener', active: true },
    { id: 'fr3', name: 'Velocidad de transferencias', type: 'velocidad', threshold: 0, count: 3, windowMin: 10, channel: 'transferencia', severity: 'alta', action: 'alertar', active: true },
    { id: 'fr4', name: 'Destinatario nuevo + monto', type: 'nuevo_destinatario', threshold: 500000, count: 0, windowMin: 0, channel: 'transferencia', severity: 'media', action: 'alertar', active: true },
    { id: 'fr5', name: 'Operación nocturna', type: 'horario', threshold: 200000, count: 0, windowMin: 0, channel: 'todos', severity: 'baja', action: 'alertar', active: true },
    { id: 'fr6', name: 'Pago QR elevado', type: 'monto', threshold: 300000, count: 0, windowMin: 0, channel: 'qr', severity: 'baja', action: 'alertar', active: false },
  ];
  const statuses = ['abierta', 'abierta', 'en investigación', 'en investigación', 'cerrada', 'cerrada', 'cerrada'];
  const flagged = transactions.filter(t => t.flagged || Math.abs(t.amount) >= 300000 && t.type === 'transferencia').slice(0, 34);
  flagged.forEach((t, i) => {
    const rule = Math.abs(t.amount) >= 2500000 ? fraudRules[1] : Math.abs(t.amount) >= 1000000 ? fraudRules[0] : r.pick([fraudRules[2], fraudRules[3], fraudRules[4]]);
    const st = i < 4 ? 'abierta' : r.pick(statuses);
    alerts.push({ id: 'al' + i, txId: t.id, userId: t.userId, ruleId: rule.id, ruleName: rule.name, severity: rule.severity, amount: Math.abs(t.amount), score: r.int(35, 98), status: st, resolution: st === 'cerrada' ? r.pick(['Falso positivo', 'Falso positivo', 'Fraude confirmado']) : '', assignee: st === 'abierta' ? null : r.pick(['u-riesgo', 'u-riesgo2']), notes: st === 'abierta' ? [] : [{ by: 'u-riesgo', at: iso(new Date(t.date).getTime() + 36e5), text: 'Se contacta al cliente por teléfono para validar la operación.' }], createdAt: t.date });
    if (rule.action === 'retener' && st !== 'cerrada') t.status = 'retenida';
  });

  // ---------- Casos de soporte ----------
  const subjects = [['No me llega el código de verificación', 'Seguridad'], ['Cargo desconocido en mi tarjeta', 'Reclamo'], ['¿Cómo aumento mi cupo?', 'Consulta'], ['Transferencia no abonada', 'Transferencias'], ['Quiero cerrar mi cuenta de ahorro', 'Cuentas'], ['Error al pagar cuenta de luz', 'Pagos'], ['Bloqueé mi tarjeta por error', 'Tarjetas'], ['Certificado de saldo para trámite', 'Consulta'], ['Cobro de comisión duplicado', 'Reclamo'], ['Cambio de número de teléfono', 'Seguridad']];
  for (let i = 0; i < 18; i++) {
    const [subject, category] = r.pick(subjects);
    const u = i === 0 ? demo : r.pick(customers);
    const st = r.pick(['abierto', 'abierto', 'en curso', 'esperando cliente', 'resuelto', 'resuelto']);
    const created = now - r.int(1, 40) * 864e5;
    const msgs = [{ from: 'cliente', by: u.id, text: 'Hola, ' + subject.toLowerCase() + '. ¿Me pueden ayudar?', at: iso(created) }];
    if (st !== 'abierto') msgs.push({ from: 'staff', by: 'u-ejec', text: 'Hola, gracias por escribirnos. Estamos revisando tu caso y te contactaremos a la brevedad.', at: iso(created + 5 * 36e5) });
    tickets.push({ id: 'tk' + i, code: `CP-${4100 + i}`, userId: u.id, subject, category, priority: r.pick(['baja', 'media', 'media', 'alta']), status: st, assignee: st === 'abierto' ? null : r.pick(['u-ejec', 'u-ejec2']), messages: msgs, createdAt: iso(created) });
  }

  // ---------- Productos, fondos y configuración del sitio público ----------
  const products = [
    { id: 'p-debito', name: 'Cóndor Débito', kind: 'Débito', annualFee: 0, desc: 'Tarjeta virtual al instante y física sin costo. Úsala en comercios y compras online.', perks: ['Sin costo de mantención', 'Tarjeta virtual inmediata', 'Pagos con QR'], featured: false, active: true, order: 1 },
    { id: 'p-plus', name: 'Cóndor Crédito Plus', kind: 'Crédito', annualFee: 24000, desc: 'Cupo flexible, cuotas sin interés en comercios asociados y 1% de devolución.', perks: ['1% cashback en todas tus compras', '3 cuotas sin interés', 'Seguro de compras protegidas'], featured: true, active: true, order: 2 },
    { id: 'p-black', name: 'Cóndor Black', kind: 'Crédito', annualFee: 89000, desc: 'Para quienes viajan: salas VIP, seguro de viaje y 2% de devolución en el extranjero.', perks: ['Acceso a salas VIP ficticias', 'Seguro de viaje internacional', '2% cashback en el extranjero'], featured: false, active: true, order: 3 },
  ];
  const funds = [
    { id: 'f-conservador', name: 'Fondo Cóndor Conservador', risk: 'Conservador', annual: 5.4, vol: 0.6, minInvest: 5000, desc: 'Renta fija local de corto plazo.', active: true },
    { id: 'f-moderado', name: 'Fondo Cóndor Moderado', risk: 'Moderado', annual: 8.1, vol: 1.8, minInvest: 10000, desc: 'Mezcla de renta fija y acciones globales.', active: true },
    { id: 'f-acciones', name: 'Fondo Andes Acciones', risk: 'Agresivo', annual: 12.6, vol: 4.2, minInvest: 10000, desc: 'Acciones de empresas latinoamericanas.', active: true },
    { id: 'f-dolar', name: 'Fondo Dólar Pacífico', risk: 'Moderado', annual: 4.2, vol: 2.4, minInvest: 20000, desc: 'Depósitos y bonos en dólares.', active: true },
  ];
  const site = {
    hero: { eyebrow: 'Banco digital · 100% ficticio', title: 'Tu dinero, a la altura de los Andes', subtitle: 'Abre tu cuenta en 5 minutos desde el celular. Transfiere, paga con QR, ahorra con metas e invierte desde $5.000, sin costos de mantención.', cta: 'Abrir mi cuenta gratis' },
    notice: 'Sitio de demostración: Cóndor Pay no es un banco real y todo el dinero es ficticio.',
    stats: [['+480 mil', 'clientes (ficticios)'], ['$0', 'costo de mantención'], ['4,8★', 'en tiendas de apps demo'], ['24/7', 'soporte en la app']],
    fees: [
      { id: 'mantencion', label: 'Mantención cuenta vista', value: 0, unit: 'clp' },
      { id: 'transfer', label: 'Transferencias a otros bancos', value: 0, unit: 'clp' },
      { id: 'giro', label: 'Giro en cajeros de la red', value: 390, unit: 'clp' },
      { id: 'avance', label: 'Comisión avance en efectivo', value: 2900, unit: 'clp' },
      { id: 'internacional', label: 'Compras internacionales', value: 1.5, unit: '%' },
      { id: 'tasaCredito', label: 'Tasa crédito de consumo (mensual desde)', value: 1.19, unit: '%' },
      { id: 'tasaAhorro', label: 'Rentabilidad cuenta de ahorro (anual)', value: 3.2, unit: '%' },
    ],
    limits: { transferDaily: 3000000, qrMax: 500000 },
    loan: { min: 300000, max: 15000000, minTerm: 6, maxTerm: 60 },
    faq: [
      { q: '¿Cóndor Pay es un banco real?', a: 'No. Es una demostración de portafolio. Todas las cuentas, tarjetas y montos son ficticios.' },
      { q: '¿Cuánto demora abrir una cuenta?', a: 'Unos 5 minutos: ingresas tu RUT, tus datos, una selfie y creas tu clave. Un ejecutivo revisa tu solicitud en menos de 24 horas.' },
      { q: '¿Tiene costo de mantención?', a: 'No. La cuenta vista y la tarjeta de débito no tienen costo de mantención.' },
      { q: '¿Cómo protegen mis transferencias?', a: 'Cada transferencia se confirma con un código de verificación de un solo uso y nuestro motor antifraude revisa montos y patrones inusuales.' },
      { q: '¿Puedo congelar mi tarjeta?', a: 'Sí, desde la app puedes congelarla y descongelarla al instante, además de activar o desactivar compras online.' },
    ],
  };

  // ---------- Bitácora histórica ----------
  const _log = [];
  const acts = [['login', u => `${u.name} inició sesión`], ['kyc', () => `Valeria Muñoz aprobó la apertura de ${r.pick(customers).name}`], ['fraude', () => `Alerta "${r.pick(fraudRules).name}" por $${r.int(5, 30) * 100}.000`], ['credito', () => `Andrés Vergara aprobó crédito de ${r.pick(customers).name}`], ['tarjeta', () => `Tomás Herrera bloqueó una tarjeta por extravío`], ['soporte', () => `Carla Núñez respondió el caso CP-${r.int(4100, 4117)}`], ['cms', () => 'Rodrigo Pizarro actualizó las tarifas del sitio público'], ['transferencia', () => `${demo.name} transfirió $${r.int(10, 90)}.000`]];
  for (let i = 0; i < 60; i++) {
    const [action, fn] = r.pick(acts); const u = r.pick(staff);
    _log.push({ id: 'lg' + i, at: iso(now - (i * 9 + r.int(1, 8)) * 36e5), action, detail: fn(u), user: action === 'transferencia' ? demo.id : u.id });
  }
  return { _log, users, accounts, transactions, cards, contacts, goals, investments, bills, notifications, devices, loans, fraudRules, alerts, tickets, products, funds, site };
}

export function pmt(P, i, n) { return i ? P * i / (1 - Math.pow(1 + i, -n)) : P / n; }
