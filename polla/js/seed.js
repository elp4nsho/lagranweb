// Semilla de Gallada. En vez de escribir a mano cientos de pagos (y arriesgar que no cuadren), la semilla
// SIMULA la historia: crea las pollas, inscribe gente, sortea, inicia y paga ronda a ronda con las mismas
// funciones de logic.js que usa el panel, sobre una base en memoria con un reloj (db.clock) que avanza
// por una cola de eventos ordenada en el tiempo. Todas las fechas son relativas a hoy y el azar sale de
// rng() con semilla fija: la demo siempre está "viva" y es reproducible.
import { rng } from '../../assets/core/db.js';
import { rut } from '../../assets/core/domain.js';
import * as L from './logic.js';

const { ymd, addDays, roundsOf, membersOf } = L;

function memDB() {
  const data = {}, values = {};
  let n = 0;
  const col = c => (data[c] ||= []);
  const db = {
    clock: null, name: 'polla-seed',
    all: c => col(c).slice(),
    get: (c, id) => col(c).find(r => r.id === id) || null,
    find: (c, fn) => col(c).find(fn) || null,
    query: (c, fn = () => true) => col(c).filter(fn),
    count: (c, fn) => (fn ? col(c).filter(fn) : col(c)).length,
    insert(c, obj) { const row = { id: `${c.slice(0, 3)}${(++n).toString(36)}`, createdAt: db.clock, ...obj }; col(c).unshift(row); return row; },
    update(c, id, patch) { const row = db.get(c, id); if (!row) return null; Object.assign(row, typeof patch === 'function' ? patch(row) : patch, { updatedAt: db.clock }); return row; },
    remove(c, id) { const a = col(c), i = a.findIndex(r => r.id === id); if (i >= 0) a.splice(i, 1); return i >= 0; },
    getValue: (k, d = null) => (k in values ? values[k] : d),
    setValue: (k, v) => (values[k] = v),
    log(action, detail = '', user = null) { col('_log').unshift({ id: 'lg' + (++n).toString(36), at: db.clock, action, detail, user }); },
    dump: () => ({ ...data, ...values })
  };
  return db;
}

const PEOPLE = [
  // id, nombre, rol, comuna, puntualidad (prob. de atraso), demo
  ['u-admin', 'Andrea Lagos Prieto', 'admin', 'Providencia', 0, true, 'admin@gallada.cl', '#7c3aed'],
  ['u-org', 'Marisol Cárcamo Vidal', 'organizador', 'Ñuñoa', 0.02, true, 'organiza@gallada.cl', '#c2410c'],
  ['u-tes', 'Patricio Vergara Rojas', 'tesorero', 'La Florida', 0.04, true, 'tesorero@gallada.cl', '#0e7490'],
  ['u-par', 'Javiera Soto Henríquez', 'participante', 'Maipú', 0.06, true, 'participante@gallada.cl', '#be185d'],
  ['u-luis', 'Luis Henríquez Toro', 'participante', 'Puente Alto', 0.45, true, 'luis@gallada.cl', '#4d7c0f'],
  ['u-hector', 'Héctor Muñoz Lagos', 'organizador', 'Concepción', 0.05, false, 'hector.munoz@correo.cl', '#1d4ed8'],
  ['u-carla', 'Carla Pizarro Núñez', 'organizador', 'Valparaíso', 0.03, false, 'carla.pizarro@correo.cl', '#9333ea'],
  ['u-1', 'Camila Fuentes Araya', 'participante', 'Ñuñoa', 0.05], ['u-2', 'Benjamín Rojas Silva', 'participante', 'Santiago', 0.12],
  ['u-3', 'Fernanda Morales Díaz', 'participante', 'Providencia', 0.04], ['u-4', 'Cristóbal Castro Peña', 'participante', 'Macul', 0.18],
  ['u-5', 'Antonia Reyes Bravo', 'participante', 'La Reina', 0.03], ['u-6', 'Diego Contreras Lillo', 'participante', 'San Miguel', 0.1],
  ['u-7', 'Constanza Gutiérrez Mora', 'participante', 'Peñalolén', 0.06], ['u-8', 'Ignacio Valenzuela Ortiz', 'participante', 'Quilicura', 0.2],
  ['u-9', 'Rosa Sepúlveda Cáceres', 'participante', 'Maipú', 0.02], ['u-10', 'Tomás Henríquez Soto', 'participante', 'Maipú', 0.25],
  ['u-11', 'Isidora Soto Pavez', 'participante', 'Cerrillos', 0.08], ['u-12', 'Gloria Pavez Tapia', 'participante', 'Maipú', 0.02],
  ['u-13', 'Jorge Soto Alarcón', 'participante', 'Pudahuel', 0.1], ['u-14', 'Martina Espinoza Vera', 'participante', 'Estación Central', 0.07],
  ['u-15', 'Sergio Navarro Ríos', 'participante', 'Talcahuano', 0.15], ['u-16', 'Yolanda Fuentealba Sáez', 'participante', 'Concepción', 0.05],
  ['u-17', 'Raúl Cifuentes Neira', 'participante', 'Hualpén', 0.3], ['u-18', 'Marcela Jara Inostroza', 'participante', 'Chiguayante', 0.04],
  ['u-19', 'Pedro Alarcón Vega', 'participante', 'San Pedro de la Paz', 0.08], ['u-20', 'Daniela Riquelme Salas', 'participante', 'Coronel', 0.12],
  ['u-21', 'Óscar Tapia Molina', 'participante', 'Concepción', 0.06], ['u-22', 'Paula Bustos Carrasco', 'participante', 'Lota', 0.1],
  ['u-23', 'Francisco Lagos Arancibia', 'participante', 'Talcahuano', 0.05], ['u-24', 'Valeria Medina Ponce', 'participante', 'Viña del Mar', 0.04],
  ['u-25', 'Rodrigo Saavedra Leiva', 'participante', 'Valparaíso', 0.22], ['u-26', 'Elena Quiroz Figueroa', 'participante', 'Quilpué', 0.03],
  ['u-27', 'Matías Herrera Cortés', 'participante', 'Viña del Mar', 0.09], ['u-28', 'Nicole Vidal Zamora', 'participante', 'La Granja', 0.05],
  ['u-29', 'Héctor Cárdenas Uribe', 'participante', 'Lo Espejo', 0.35], ['u-30', 'Sofía Ibarra Godoy', 'participante', 'Independencia', 0.04],
  ['u-31', 'Alonso Fernández Rivas', 'participante', 'Recoleta', 0.07], ['u-32', 'Carolina Muñoz Cid', 'participante', 'Ñuñoa', 0.03]
];
const COLORS = ['#b45309', '#0f766e', '#be123c', '#4338ca', '#15803d', '#a21caf', '#0369a1', '#c2410c'];
const slugMail = n => n.split(' ').slice(0, 2).join('.').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + '@correo.cl';

export function seed() {
  const r = rng(2026);
  const db = memDB();
  const now = Date.now(), T = ymd(new Date());
  const at = (day, h = 12, m = 0) => { const [y, mo, d] = day.split('-').map(Number); return new Date(y, mo - 1, d, h, m).toISOString(); };
  const past = iso => new Date(iso).getTime() <= now - 60e3;
  const ago = (days, h = 10, m = 0) => at(addDays(T, -days), h, m);

  // Cola de eventos ordenada en el tiempo: los eventos pueden agendar otros.
  const Q = [];
  const ev = (t, fn) => { if (past(t)) Q.push({ t, fn, i: Q.length }); };
  const run = () => { while (Q.length) { Q.sort((a, b) => a.t.localeCompare(b.t) || a.i - b.i); const e = Q.shift(); db.clock = e.t; e.fn(); } };

  // ---------- Usuarios ----------
  const late = {};
  PEOPLE.forEach(([id, name, role, comuna, lp, demo, email, color], i) => {
    late[id] = lp;
    db.insert('users', { id, name, email: email || slugMail(name), password: 'demo123', role, color: color || COLORS[i % COLORS.length], demo: !!demo, active: true,
      phone: `+56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}`, rut: rut.make(9800000 + i * 412337 + r.int(0, 999)), comuna, bank: r.pick(['BancoEstado CuentaRUT', 'Banco de Chile', 'Santander', 'BCI', 'Banco Falabella', 'Mercado Pago']) });
  });
  db.query('users').forEach(u => { u.createdAt = ago(r.int(200, 600)); });

  // ---------- Plantillas ----------
  [
    ['Recordatorio amable', 'whatsapp', 'Hola {nombre} 👋 Te recuerdo que la cuota de la *{polla}* ({monto}) vence el {fecha}. Datos: {datos}. ¡Gracias por mantener la gallada al día! 🐣'],
    ['Cuota atrasada', 'whatsapp', 'Hola {nombre}, la cuota de la ronda {ronda} de la *{polla}* está atrasada. Debes {deuda} (incluye multa). Si tienes un problema, escríbeme y lo conversamos. — {organizador}'],
    ['Pozo entregado', 'whatsapp', '🎉 ¡Se entregó el pozo de la ronda {ronda} de la *{polla}*! Pozo: {pozo}. Gracias a todos por pagar a tiempo.'],
    ['Recordatorio formal', 'email', 'Estimado/a {nombre}:\n\nLe recordamos que la cuota de la polla "{polla}" por {monto} vence el {fecha}. Puede pagar por transferencia a: {datos}.\n\nSaludos,\n{organizador}'],
    ['Bienvenida', 'email', '¡Bienvenido/a a la {polla}, {nombre}! Tu turno es el {turno}. El pozo es de {pozo}. Código de la polla: {codigo}.']
  ].forEach(([name, channel, text], i) => db.insert('templates', { id: 'tpl-' + (i + 1), name, channel, text, active: true, createdAt: ago(300) }));

  const pickOthers = (ids, n) => { const pool = ids.slice(); const out = []; while (out.length < n && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]); return out; };
  const addMonths = (day, k) => { const [y, m, d] = day.split('-').map(Number); const t = new Date(y, m - 1 + k, 1, 12); t.setDate(Math.min(d, new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate())); return ymd(t); };

  // Programa una ronda: pagos (a tiempo, atrasados, cubiertos, informados o sin pagar), remate, entrega y confirmación.
  function planRound(pid, n, { plan = {}, payout = true, confirm = true, bids = null, awardAt = null, reminders = null } = {}) {
    const p = db.get('pollas', pid), rd = roundsOf(db, pid).find(x => x.n === n), due = rd.dueDate, per = L.periodDays(p), g = +p.graceDays || 0;
    const pays = db.query('payments', x => x.roundId === rd.id);
    let lastT = at(due, 18, 0), complete = true;
    if (bids) bids.forEach(([uid, amount, daysBefore]) => ev(at(addDays(due, -daysBefore), r.int(9, 21), r.int(0, 59)), () => { const m = db.find('members', x => x.pollaId === pid && x.userId === uid && x.status === 'activo'); L.bid(db, rd.id, m.id, amount); }));
    if (bids || p.mode === 'remate') ev(awardAt || at(addDays(due, -1), 9, 30), () => L.award(db, rd.id, p.organizerId, `SEMILLA-${pid}-${n}`));
    const staff = () => (p.treasurerId && r.bool(0.5) ? p.treasurerId : p.organizerId);
    pays.forEach(x => {
      const beh = plan[x.userId] || (r() < (late[x.userId] || 0) ? 'late' : 'ontime');
      if (beh === 'ontime' || beh === 'informado') {
        const t = at(addDays(due, -r.int(0, Math.min(per - 1, 6))), r.int(8, 22), r.int(0, 59));
        const cash = r.bool(0.18);
        ev(t, () => L.reportPayment(db, x.id, { method: cash ? 'efectivo' : 'transferencia', ref: cash ? '' : String(r.int(10000000, 99999999)), file: cash ? '' : `comprobante-${r.int(100, 999)}.jpg`, by: x.userId }));
        if (beh === 'informado') { complete = false; return; }
        const c = new Date(new Date(t).getTime() + r.int(1, 16) * 3600e3).toISOString();
        ev(c, () => L.confirmPayment(db, x.id, staff()));
        if (c > lastT) lastT = c;
      } else if (beh === 'late') {
        const t = at(addDays(due, g + r.int(1, 4)), r.int(9, 22), r.int(0, 59));
        ev(t, () => L.reportPayment(db, x.id, { method: 'transferencia', ref: String(r.int(10000000, 99999999)), file: 'comprobante.jpg', by: x.userId }));
        const c = new Date(new Date(t).getTime() + r.int(1, 10) * 3600e3).toISOString();
        ev(c, () => L.confirmPayment(db, x.id, staff()));
        if (c > lastT) lastT = c;
      } else if (beh === 'cover') {
        const c = at(addDays(due, g + 2), 12, 15);
        ev(c, () => L.coverPayment(db, x.id, p.organizerId, p.organizerId, 'No respondió: la organización adelanta la cuota'));
        if (c > lastT) lastT = c;
      } else complete = false; // 'skip': queda pendiente (o atrasado al pasar la gracia)
    });
    ev(at(addDays(due, g + 1), 0, 10), () => L.sweepLate(db));
    if (reminders) reminders.forEach(([day, h, tplId, who]) => ev(at(day, h, 5), () => { const ids = who || db.query('payments', x => x.roundId === rd.id && L.OPEN_PAY.includes(x.status) && x.status !== 'informado').map(x => x.userId); if (ids.length) L.sendReminders(db, { pollaId: pid, userIds: ids, templateId: tplId, by: p.organizerId }); }));
    if (payout && complete) {
      const pt = new Date(new Date(lastT).getTime() + 3600e3 * r.int(1, 3)).toISOString();
      ev(pt, () => L.payout(db, rd.id, p.organizerId, { method: 'transferencia', ref: String(r.int(10000000, 99999999)) }));
      if (confirm) ev(new Date(new Date(pt).getTime() + 3600e3 * r.int(2, 26)).toISOString(), () => { const s = db.get('slots', db.get('rounds', rd.id).slotId); L.confirmReceipt(db, rd.id, L.holders(db, s)[0].userId); if (L.holders(db, s).length > 1) L.confirmReceipt(db, rd.id, L.holders(db, s)[1].userId); });
      return pt;
    }
    return null;
  }
  // Crea, abre, inscribe y (si corresponde) asigna turnos e inicia.
  function makePolla(cfg) {
    const { created, members, half = [], turns = null, drawSeed = null, startAt = null, after = null, requests = [] } = cfg;
    let pid = null;
    ev(created, () => {
      const p = L.createPolla(db, cfg.data, cfg.data.organizerId);
      pid = p.id;
      L.openPolla(db, pid, p.organizerId);
      const span = Math.max(1, (new Date(startAt || cfg.lastJoin || ago(0)) - new Date(created)) / 864e5 - 2);
      members.forEach((uid, i) => ev(new Date(new Date(created).getTime() + (0.1 + (i / members.length) * span) * 864e5).toISOString(), () => {
        L.joinPolla(db, pid, uid, { half: half.includes(uid), turn: turns?.[uid] || null, by: uid, viaCode: false });
      }));
      requests.forEach(([uid, t]) => ev(t, () => L.joinPolla(db, pid, uid, { viaCode: true })));
      if (startAt) {
        ev(new Date(new Date(startAt).getTime() - 864e5 * 1.2).toISOString(), () => {
          if (cfg.data.mode === 'sorteo') L.draw(db, pid, cfg.data.organizerId, drawSeed);
          if (cfg.data.mode === 'fijo') L.setOrder(db, pid, cfg.order(db, pid), cfg.data.organizerId);
        });
        ev(startAt, () => { L.startPolla(db, pid, cfg.data.organizerId); after && after(pid); });
      }
    });
    return () => pid;
  }
  // Busca una semilla de sorteo que deje a ciertas personas en ciertos turnos (para que la historia cuadre).
  function findSeed(prefix, labels, want, extra = () => true) {
    for (let i = 0; i < 9000; i++) {
      const s = `${prefix}-${1000 + i}-BOLDO`, order = L.shuffle(labels, s);
      if (Object.entries(want).every(([k, t]) => order.indexOf(k) === t - 1) && extra(order)) return s;
    }
    return `${prefix}-1000-BOLDO`;
  }
  const post = (pidFn, day, h, uid, text, o) => ev(at(day, h, r.int(0, 59)), () => L.post(db, pidFn(), uid, text, o));

  // ===== P1 · Polla de la Pega (mensual, sorteo, 10 cupos) — ronda 5 recaudando, Luis ya recibió y debe =====
  const P1members = ['u-org', 'u-tes', 'u-par', 'u-luis', 'u-1', 'u-2', 'u-3', 'u-4', 'u-5', 'u-6'];
  const d5 = addDays(T, 4), p1Start = addMonths(d5, -4);
  const labels1 = P1members.map((u, i) => 'C' + String(i + 1).padStart(2, '0'));
  const seed1 = findSeed('ALERCE', labels1, { C04: 2, C03: 7 }, o => o.indexOf('C01') === 4 && o.indexOf('C08') > 6); // Luis 2.º, Marisol 5.º, Javiera 7.º, Antonia después
  const P1 = makePolla({
    created: at(addDays(p1Start, -24), 19, 40), startAt: at(addDays(p1Start, -5), 20, 0), members: P1members, drawSeed: seed1,
    data: { id: 'p-pega', name: 'Polla de la Pega', emoji: '💼', organizerId: 'u-org', treasurerId: 'u-tes', amount: 100000, frequency: 'mensual', startDate: p1Start, cupos: 10, mode: 'sorteo', allowHalf: false, lateFee: 5000, graceDays: 3, approval: false, code: 'PEGA-482',
      paymentInfo: 'Marisol Cárcamo · Banco de Chile · Cta. Cte. 00-123-45678-09 · RUT 13.456.789-2 · organiza@gallada.cl', rules: 'Cuota el día del pago de sueldo. 3 días de gracia; después, multa de $5.000 que va al fondo común y se reparte al final. Si alguien no paga, la organización cubre y la persona queda debiendo. Cambios de turno solo con acuerdo de ambos y visto bueno de la organización.' },
    after: pid => {
      planRound(pid, 1, { plan: {} });
      planRound(pid, 2, { plan: { 'u-luis': 'ontime' } });
      planRound(pid, 3, { plan: { 'u-luis': 'late', 'u-4': 'late' } });
      planRound(pid, 4, { plan: { 'u-luis': 'cover', 'u-2': 'late' }, reminders: [[addDays(roundsOf(db, pid)[3].dueDate, 4), 10, 'tpl-2', ['u-luis']]] });
      planRound(pid, 5, { plan: { 'u-par': 'skip', 'u-luis': 'skip', 'u-4': 'informado', 'u-6': 'informado', 'u-2': 'skip' }, payout: false, reminders: [[addDays(T, -1), 11, 'tpl-1']] });
    }
  });
  post(P1, addDays(p1Start, -20), 20, 'u-org', '¡Bienvenidos a la Polla de la Pega! 🐣 Cuota de $100.000 el día de pago. Los datos para transferir están en "Reglas". Cualquier duda me escriben.', { kind: 'aviso', pinned: true });
  post(P1, addDays(p1Start, -6), 13, 'u-3', '¿El sorteo es hoy? Quiero verlo en vivo jaja');
  post(P1, addDays(p1Start, -4), 9, 'u-org', 'Sorteo listo y publicado con su semilla. Cualquiera lo puede verificar en el sitio con "Verificar sorteo". ¡Suerte a todos!', { kind: 'aviso' });
  post(P1, addDays(p1Start, 1), 18, 'u-5', 'Me llegó mi pozo, confirmado en la app. ¡Gracias gallada! 🙌');
  post(P1, addDays(T, -6), 21, 'u-org', 'Recordatorio: Luis tiene pendiente la cuota de la ronda 4 que cubrí yo. Luis, avísame cuándo puedes regularizar 🙏', { kind: 'aviso' });
  post(P1, addDays(T, -5), 22, 'u-luis', 'Perdón a todos, se me complicó con el finiquito. A fin de mes me pongo al día con todo.');
  post(P1, addDays(T, -1), 12, 'u-par', 'Yo pago la de esta ronda el viernes cuando me caiga el sueldo 👍');
  ev(ago(1, 15, 20), () => { const pid = P1(), a = db.find('members', m => m.pollaId === pid && m.userId === 'u-4'), b = db.find('members', m => m.pollaId === pid && m.userId === 'u-par'); const sa = L.slotOfMember(db, a); if (!L.received(db, sa)) L.requestSwap(db, pid, a.id, b.slotId, 'Javi, ¿me cambias tu turno? Tengo que pagar la matrícula de mi hija en marzo 🙏'); });
  ev(ago(1, 15, 22), () => { const pid = P1(), a = db.find('members', m => m.pollaId === pid && m.userId === 'u-3'), b = db.find('members', m => m.pollaId === pid && m.userId === 'u-par'); try { L.requestSwap(db, pid, a.id, b.slotId, ''); } catch (e) { /* ya hay una abierta: la semilla lo prueba a propósito */ } });

  // ===== P2 · Polla Familia Soto (semanal, orden fijo, medio cupo, gracia 0) — ronda 5 atrasada, turno de Javiera =====
  const P2members = ['u-org', 'u-12', 'u-par', 'u-13', 'u-10', 'u-11', 'u-9', 'u-14', 'u-28'];
  const p2Start = addDays(T, -29);
  const P2 = makePolla({
    created: at(addDays(p2Start, -12), 21, 10), startAt: at(addDays(p2Start, -2), 21, 0), members: P2members, half: ['u-10', 'u-11'],
    order: (d, pid) => { const want = ['u-12', 'u-13', 'u-org', 'u-9', 'u-par', 'u-14', 'u-10', 'u-28']; return want.map(u => d.find('members', m => m.pollaId === pid && m.userId === u).slotId); },
    data: { id: 'p-familia', name: 'Polla Familia Soto', emoji: '👨‍👩‍👧', organizerId: 'u-org', treasurerId: '', amount: 25000, frequency: 'semanal', startDate: p2Start, cupos: 8, mode: 'fijo', allowHalf: true, lateFee: 1000, graceDays: 0, approval: false, code: 'FAMIL-215',
      paymentInfo: 'Marisol Cárcamo · BancoEstado CuentaRUT 13456789 · o en efectivo en el almuerzo del domingo', rules: 'Se paga cada domingo. Sin días de gracia: el lunes ya corre la multa de $1.000. Tomás e Isidora comparten un cupo (pagan $12.500 cada uno y se reparten el pozo). El orden lo acordamos en el cumpleaños de la Tía Gloria.' },
    after: pid => {
      planRound(pid, 1, {}); planRound(pid, 2, { plan: { 'u-10': 'late' } }); planRound(pid, 3, {}); planRound(pid, 4, { plan: { 'u-13': 'late' } });
      planRound(pid, 5, { plan: { 'u-par': 'ontime', 'u-10': 'skip', 'u-28': 'skip', 'u-14': 'informado', 'u-12': 'ontime', 'u-org': 'ontime', 'u-13': 'ontime', 'u-9': 'ontime', 'u-11': 'ontime' }, payout: false, reminders: [[T, 9, 'tpl-2']] });
    }
  });
  post(P2, addDays(p2Start, -10), 22, 'u-org', 'Familia: el orden quedó como lo conversamos. Javi recibe en la ronda 5 para la pintura de la casa 🏠', { kind: 'aviso', pinned: true });
  post(P2, addDays(T, -1), 20, 'u-par', 'Tomás, Nicole: ¡falta poquito para completar mi pozo! 🙏😅');
  post(P2, addDays(T, 0), 8, 'u-10', 'Tía, hoy transfiero sin falta, me pagan a mediodía.');
  ev(ago(2, 19, 0), () => { const pid = P2(), a = db.find('members', m => m.pollaId === pid && m.userId === 'u-14'), b = db.find('members', m => m.pollaId === pid && m.userId === 'u-28'); const s = L.requestSwap(db, pid, a.id, b.slotId, 'Nicole, ¿cambiamos? Me sirve más tarde.'); db.clock = ago(1, 9, 0); L.answerSwap(db, s.id, 'aceptado', 'u-28'); });

  // ===== P3 · Polla Feria Persa (quincenal, remate, 12 cupos) — ronda 7 con pujas abiertas =====
  const P3members = ['u-org', 'u-tes', 'u-par', 'u-7', 'u-8', 'u-9', 'u-2', 'u-30', 'u-31', 'u-32', 'u-3', 'u-14'];
  let p3Start = addDays(T, -100);
  for (let i = 0; i < 40; i++) { const s = addDays(T, -100 + i), d7 = L.roundDate(s, 'quincenal', 6); if (L.diffDays(d7, T) >= 3 && L.diffDays(d7, T) <= 8) { p3Start = s; break; } }
  const B = [[62000, 58000, 41000], [54500, 50000], [47000, 45000, 30000], [41000, 39500], [30000, 26000, 15000], [24000, 18000]];
  const P3 = makePolla({
    created: at(addDays(p3Start, -20), 18, 0), startAt: at(addDays(p3Start, -4), 19, 30), members: P3members,
    data: { id: 'p-feria', name: 'Polla Feria Persa Biobío', emoji: '🧺', organizerId: 'u-org', treasurerId: 'u-tes', amount: 50000, frequency: 'quincenal', startDate: p3Start, cupos: 12, mode: 'remate', maxBidPct: 25, allowHalf: false, lateFee: 3000, graceDays: 2, approval: false, code: 'FERIA-731',
      paymentInfo: 'Patricio Vergara (tesorero) · Mercado Pago CVU 1000-2233-4455 · o en el puesto 14 los sábados', rules: 'Pozo de $600.000 cada 15 días (días 1 y 16, o el último hábil). Cada ronda se remata: quien ofrece el mayor descuento se lleva el pozo y ese descuento se reparte en partes iguales entre los otros 11 cupos. Puja máxima: 25% del pozo. Si nadie puja, se sortea entre quienes aún no reciben.' },
    after: pid => {
      const order = ['u-7', 'u-31', 'u-8', 'u-30', 'u-2', 'u-9'];
      B.forEach((amounts, k) => {
        const bidders = [order[k], ...pickOthers(P3members.filter(u => !order.slice(0, k + 1).includes(u) && u !== 'u-par'), amounts.length - 1)];
        planRound(pid, k + 1, { bids: amounts.map((a, j) => [bidders[j], a, r.int(2, 9)]) });
      });
      const k7 = L.diffDays(roundsOf(db, pid)[6].dueDate, T);
      planRound(pid, 7, { bids: [['u-3', 21000, k7 + 3], ['u-32', 19500, k7 + 2], ['u-par', 17000, k7 + 1]], payout: false, awardAt: at(addDays(T, 30), 9), plan: { 'u-par': 'skip', 'u-14': 'skip', 'u-org': 'informado', 'u-32': 'informado', 'u-3': 'skip' } });
    }
  });
  post(P3, addDays(p3Start, -15), 10, 'u-tes', 'Recuerden: la puja se hace en la app hasta el día antes de cada pozo. Gana el mayor descuento y se reparte entre todos 💸', { kind: 'aviso', pinned: true });
  post(P3, addDays(T, -2), 17, 'u-32', 'Este pozo lo necesito para la patente del puesto, voy con todo 😤');

  // ===== P4 · Polla Navideña Villa Los Aromos (cada 10 días, por llegada, medio cupo, con aprobación) — inscripción abierta =====
  const P4 = makePolla({
    created: ago(9, 20, 30), lastJoin: ago(1), members: ['u-org', 'u-28', 'u-29', 'u-26'], half: ['u-26'], turns: { 'u-org': 6, 'u-28': 2, 'u-29': 4, 'u-26': 5 },
    requests: [['u-30', ago(0, 8, 40)]],
    data: { id: 'p-aromos', name: 'Polla Navideña Villa Los Aromos', emoji: '🎄', organizerId: 'u-org', treasurerId: '', amount: 15000, frequency: 'cada_n', everyDays: 10, startDate: addDays(T, 12), cupos: 6, mode: 'llegada', allowHalf: true, lateFee: 1000, graceDays: 2, approval: true, code: 'AROMOS-24',
      paymentInfo: 'Junta de Vecinos Villa Los Aromos · BancoEstado Cta. Vista 2233445 · tesorería en la sede los martes', rules: 'Cada 10 días hasta las fiestas. Eliges tu turno al inscribirte (el que llega primero escoge). Se aceptan medios cupos. La directiva aprueba cada inscripción.' }
  });
  post(P4, addDays(T, -8), 21, 'u-org', 'Vecinos: quedan cupos para la polla navideña 🎄 Inscríbanse con el código AROMOS-24 y elijan su turno.', { kind: 'aviso', pinned: true });

  // ===== P5 · Polla Vacaciones de Invierno (mensual, sorteo pendiente) — cupos llenos, falta sortear =====
  const P5 = makePolla({
    created: ago(16, 22, 0), lastJoin: ago(2), members: ['u-org', 'u-1', 'u-3', 'u-5', 'u-7', 'u-32'],
    data: { id: 'p-vacaciones', name: 'Polla Vacaciones de Invierno', emoji: '🏔️', organizerId: 'u-org', treasurerId: 'u-tes', amount: 80000, frequency: 'mensual', startDate: addDays(T, 9), cupos: 6, mode: 'sorteo', allowHalf: false, lateFee: 4000, graceDays: 3, approval: false,
      paymentInfo: 'Marisol Cárcamo · Banco de Chile · Cta. Cte. 00-123-45678-09', rules: 'Pozo de $480.000 al mes para las vacaciones de julio. El orden se sortea en vivo con semilla pública.' }
  });

  // ===== P6 · Polla Peluquería Estilo Valpo (organiza Carla, mensual, orden fijo) =====
  const p6Start = addMonths(addDays(T, -5), -2);
  const P6m = ['u-carla', 'u-24', 'u-25', 'u-26', 'u-27', 'u-30'];
  const P6 = makePolla({
    created: at(addDays(p6Start, -15), 20), startAt: at(addDays(p6Start, -3), 20), members: P6m,
    order: (d, pid) => ['u-24', 'u-carla', 'u-27', 'u-26', 'u-25', 'u-30'].map(u => d.find('members', m => m.pollaId === pid && m.userId === u).slotId),
    data: { id: 'p-peluqueria', name: 'Polla Peluquería Estilo Valpo', emoji: '✂️', organizerId: 'u-carla', treasurerId: '', amount: 200000, frequency: 'mensual', startDate: p6Start, cupos: 6, mode: 'fijo', allowHalf: false, lateFee: 8000, graceDays: 3, approval: false,
      paymentInfo: 'Carla Pizarro · Santander Cta. Cte. 7788990', rules: 'Entre colegas del salón. Pago el 5 de cada mes.' },
    after: pid => { planRound(pid, 1, {}); planRound(pid, 2, { plan: { 'u-25': 'late' } }); planRound(pid, 3, { plan: { 'u-25': 'skip', 'u-30': 'informado' }, payout: false }); }
  });

  // ===== P7 · Club Deportivo Unión Estrella (finalizada) =====
  const p7Start = addMonths(T, -11);
  const P7m = ['u-hector', 'u-par', 'u-luis', 'u-15', 'u-16', 'u-17', 'u-18', 'u-19'];
  const lab7 = P7m.map((u, i) => 'C' + String(i + 1).padStart(2, '0'));
  const P7 = makePolla({
    created: at(addDays(p7Start, -20), 19), startAt: at(addDays(p7Start, -4), 19), members: P7m, drawSeed: findSeed('PEUMO', lab7, { C03: 6 }),
    data: { id: 'p-club', name: 'Polla Club Deportivo Unión Estrella', emoji: '⚽', organizerId: 'u-hector', treasurerId: '', amount: 30000, frequency: 'mensual', startDate: p7Start, cupos: 8, mode: 'sorteo', allowHalf: false, lateFee: 2000, graceDays: 3, approval: false,
      paymentInfo: 'Héctor Muñoz · BancoEstado CuentaRUT 9876543', rules: 'Para la camiseta nueva y los viajes del campeonato.' },
    after: pid => {
      let last = null;
      for (let k = 1; k <= 8; k++) last = planRound(pid, k, { plan: k % 3 === 0 ? { 'u-luis': 'late', 'u-17': 'late' } : k === 5 ? { 'u-17': 'late' } : {} });
      if (last) ev(new Date(new Date(last).getTime() + 3 * 864e5).toISOString(), () => L.finishPolla(db, pid, 'u-hector'));
    }
  });

  // ===== P8 · Colectiveros Línea 8 (terminada antes, con liquidación) =====
  const p8Start = addDays(T, -110);
  const P8m = ['u-hector', 'u-luis', 'u-20', 'u-21', 'u-22', 'u-23', 'u-29', 'u-15'];
  const P8 = makePolla({
    created: at(addDays(p8Start, -14), 20), startAt: at(addDays(p8Start, -3), 20), members: P8m,
    order: (d, pid) => ['u-luis', 'u-21', 'u-29', 'u-20', 'u-22', 'u-23', 'u-15', 'u-hector'].map(u => d.find('members', m => m.pollaId === pid && m.userId === u).slotId),
    data: { id: 'p-colectivo', name: 'Polla Colectiveros Línea 8', emoji: '🚕', organizerId: 'u-hector', treasurerId: '', amount: 40000, frequency: 'quincenal', startDate: p8Start, cupos: 8, mode: 'fijo', allowHalf: false, lateFee: 2000, graceDays: 2, approval: false,
      paymentInfo: 'Héctor Muñoz · BancoEstado CuentaRUT 9876543', rules: 'Cuota quincenal en el paradero. Pozo para mantención de los autos.' },
    after: pid => {
      planRound(pid, 1, {}); planRound(pid, 2, { plan: { 'u-luis': 'late' } }); planRound(pid, 3, { plan: { 'u-luis': 'cover', 'u-29': 'late' } });
      planRound(pid, 4, { plan: { 'u-luis': 'skip', 'u-29': 'skip' }, payout: false });
      const d4 = roundsOf(db, pid)[3].dueDate;
      ev(at(addDays(d4, 12), 21), () => L.cancelPolla(db, pid, 'u-hector', 'Dos socios dejaron de pagar después de recibir y la línea cambió de recorrido. Se liquida lo que hay en caja.'));
    }
  });

  // ===== P10 · Cumpleaños de la Pega (orden fijo, cupos llenos, falta ordenar) =====
  makePolla({
    created: ago(6, 13, 10), lastJoin: ago(1), members: ['u-org', 'u-1', 'u-3', 'u-5', 'u-7'],
    data: { id: 'p-cumple', name: 'Polla Cumpleaños de la Pega', emoji: '🎂', organizerId: 'u-org', treasurerId: '', amount: 20000, frequency: 'mensual', startDate: addDays(T, 20), cupos: 5, mode: 'fijo', allowHalf: false, lateFee: 1000, graceDays: 3, approval: false,
      paymentInfo: 'Marisol Cárcamo · Banco de Chile · Cta. Cte. 00-123-45678-09', rules: 'Cada mes recibe quien está de cumpleaños ese mes: el orden sigue el calendario de cumpleaños.' }
  });

  // ===== P9 · borrador =====
  makePolla({ created: ago(1, 23, 15), members: [], data: { id: 'p-fondo', name: 'Polla Fondo de Emergencia', emoji: '🧯', organizerId: 'u-org', treasurerId: '', amount: 30000, frequency: 'quincenal', startDate: addDays(T, 30), cupos: 8, mode: 'remate', maxBidPct: 20, allowHalf: true, lateFee: 1500, graceDays: 2, approval: true, paymentInfo: '', rules: 'Borrador: definir con la gallada.' } });

  run();
  // Abre la P9 vuelve a borrador (makePolla la abrió)
  const p9 = db.find('pollas', p => p.name === 'Polla Fondo de Emergencia');
  if (p9) { db.clock = ago(0, 7, 0); L.POLLA.move(db, 'pollas', p9.id, 'borrador', { by: 'u-org', note: 'Vuelve a borrador para ajustar reglas', at: db.clock, log: 'polla', title: x => x.name }); }

  // ---------- Reportes / disputas ----------
  const p1 = db.find('pollas', p => p.code === 'PEGA-482'), p8 = db.find('pollas', p => p.name.includes('Línea 8')), p6 = db.find('pollas', p => p.name.includes('Peluquería'));
  db.clock = ago(5, 18, 30);
  db.insert('reports', { code: 'REP-301', pollaId: p1.id, reporterId: 'u-3', againstId: 'u-luis', kind: 'no_pago', text: 'Luis recibió el pozo en la ronda 2 y desde la 4 no paga. La organizadora tuvo que cubrirlo. Pido que quede registrado.', status: 'abierto', statusAt: db.clock, history: [{ at: db.clock, from: null, to: 'abierto', by: 'u-3', note: '' }] });
  db.clock = ago(40, 11, 0);
  const rep2 = db.insert('reports', { code: 'REP-298', pollaId: p8.id, reporterId: 'u-21', againstId: 'u-hector', kind: 'no_entrega', text: 'Se terminó la polla y aún no recibo la devolución de mi parte.', status: 'abierto', statusAt: db.clock, history: [{ at: db.clock, from: null, to: 'abierto', by: 'u-21', note: '' }] });
  db.clock = ago(38, 10, 0); L.REPORT.move(db, 'reports', rep2.id, 'en_revision', { by: 'u-admin', note: 'Se pidió al organizador la liquidación', at: db.clock, log: 'disputa', title: x => x.code });
  db.clock = ago(70, 16, 0);
  const rep3 = db.insert('reports', { code: 'REP-284', pollaId: p6.id, reporterId: 'u-25', againstId: 'u-carla', kind: 'otro', text: 'No me aparece confirmado un pago que hice en efectivo.', status: 'abierto', statusAt: db.clock, history: [{ at: db.clock, from: null, to: 'abierto', by: 'u-25', note: '' }] });
  db.clock = ago(69, 10, 0); L.REPORT.move(db, 'reports', rep3.id, 'en_revision', { by: 'u-admin', at: db.clock, log: 'disputa', title: x => x.code });
  db.clock = ago(68, 12, 0); L.REPORT.move(db, 'reports', rep3.id, 'resuelto', { by: 'u-admin', note: 'La organizadora confirmó el pago con el comprobante. Se cierra.', at: db.clock, log: 'disputa', title: x => x.code });
  db.setValue('_seq:rep', 301);

  // Las notificaciones viejas se marcan leídas; se guardan las 30 más recientes de cada cuenta demo (6 del resto).
  const notifs = db.all('notifs').sort((a, b) => b.at.localeCompare(a.at)), per = {};
  const demoIds = PEOPLE.filter(x => x[5]).map(x => x[0]);
  const keep = notifs.filter(nf => (per[nf.userId] = (per[nf.userId] || 0) + 1) <= (demoIds.includes(nf.userId) ? 30 : 6)).map(nf => ({ ...nf, read: nf.read || new Date(nf.at).getTime() < now - 4 * 864e5 }));
  const out = db.dump();
  out.notifs = keep;
  out._log = (out._log || []).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 300);
  delete out.dump;
  return out;
}
