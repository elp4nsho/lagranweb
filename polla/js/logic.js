// Gallada · lógica de negocio de las pollas (sin interfaz): fechas, dinero, estados y operaciones.
// Todas las operaciones reciben `db` (la base real del navegador o la base en memoria de la semilla)
// y usan db.clock si existe como "ahora": así la semilla simula meses de historia con las MISMAS
// funciones que usa el panel, y los totales siempre cuadran.
//
// Reglas de dinero (todo en pesos enteros):
//  · Cada cupo aporta `amount` por ronda; un medio cupo lo paga entre dos (splitInt: el primero paga el
//    peso impar). El pozo de cada ronda = amount × cupos y lo recibe el cupo del turno (también partido).
//  · Remate: quien se adjudica la ronda recibe pozo − descuento; el descuento se reparte entre los
//    demás cupos en partes iguales (resto repartido por orden de turno, nunca se pierde un peso).
//  · Multas por atraso → fondo común; al cerrar la polla el fondo se reparte por cupo.
//  · Cubrir una cuota: alguien (organizador/a) adelanta la plata y el moroso queda debiéndole;
//    al regularizar se le reembolsa. Cada peso queda en el libro (movements) con su ronda o grupo.
import { stateMachine, nextCode } from '../../assets/core/domain.js';

export const DAY = 864e5;
const pad2 = n => String(n).padStart(2, '0');

// ---------- Fechas (YYYY-MM-DD en hora local, a mediodía para evitar saltos de horario) ----------
export const ymd = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const parseYmd = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d, 12); };
export const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
export const diffDays = (a, b) => Math.round((parseYmd(a) - parseYmd(b)) / DAY); // a − b
export const nowIso = db => db?.clock || new Date().toISOString();
export const today = db => ymd(db?.clock ? new Date(db.clock) : new Date());
const dim = (y, m) => new Date(y, m + 1, 0).getDate();
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
export const fdate = s => { if (!s) return '—'; const d = parseYmd(s); return `${d.getDate()} ${MES[d.getMonth()]} ${d.getFullYear()}`; };
export const fdateShort = s => { const d = parseYmd(s); return `${DIA[d.getDay()]} ${d.getDate()} ${MES[d.getMonth()]}`; };
export const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export function relDay(s, ref) {
  const n = diffDays(s, ref);
  if (n === 0) return 'hoy';
  if (n === 1) return 'mañana';
  if (n === -1) return 'ayer';
  return n > 0 ? `en ${n} días` : `hace ${-n} días`;
}

// ---------- Frecuencias ----------
export const FREQ = {
  semanal: { label: 'Semanal', days: 7 },
  quincenal: { label: 'Quincenal', days: 15 },
  mensual: { label: 'Mensual', days: 30 },
  cada_n: { label: 'Cada N días', days: null }
};
export const freqLabel = p => (p.frequency === 'cada_n' ? `Cada ${p.everyDays} días` : FREQ[p.frequency]?.label || p.frequency);
export const periodDays = p => (p.frequency === 'cada_n' ? +p.everyDays || 10 : FREQ[p.frequency]?.days || 30);
// Fecha de la ronda k (0 = primera). Mensual respeta fin de mes (31 → 30/28); quincenal = día d y d+15.
export function roundDate(start, freq, k, every = 10) {
  const s = parseYmd(start), y = s.getFullYear(), m = s.getMonth(), d = s.getDate();
  if (freq === 'semanal') return addDays(start, 7 * k);
  if (freq === 'cada_n') return addDays(start, (+every || 10) * k);
  if (freq === 'mensual') { const t = new Date(y, m + k, 1, 12); t.setDate(Math.min(d, dim(t.getFullYear(), t.getMonth()))); return ymd(t); }
  if (freq === 'quincenal') {
    const base = d <= 15 ? d : d - 15, idx = (d <= 15 ? 0 : 1) + k;
    const t = new Date(y, m + Math.floor(idx / 2), 1, 12), last = dim(t.getFullYear(), t.getMonth());
    t.setDate(idx % 2 === 0 ? Math.min(base, last) : Math.min(base + 15, last));
    return ymd(t);
  }
  return addDays(start, 30 * k);
}
export const schedule = (start, freq, n, every) => Array.from({ length: n }, (_, k) => roundDate(start, freq, k, every));

// ---------- Dinero ----------
// Reparte un entero según pesos (método del resto mayor): la suma da exactamente `total`.
export function splitInt(total, weights) {
  const W = weights.reduce((s, w) => s + w, 0);
  if (!W || !total) return weights.map(() => 0);
  const raw = weights.map(w => (total * w) / W), out = raw.map(Math.floor);
  let rest = total - out.reduce((s, v) => s + v, 0);
  raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).forEach(([, i]) => { if (rest > 0) { out[i]++; rest--; } });
  return out;
}

// ---------- Máquinas de estado ----------
export const POLLA = stateMachine({
  states: {
    borrador: { label: 'Borrador', tone: '' },
    inscripcion: { label: 'Inscripción abierta', tone: 'info' },
    en_curso: { label: 'En curso', tone: 'primary' },
    finalizada: { label: 'Finalizada', tone: 'success', final: true },
    cancelada: { label: 'Terminada antes', tone: 'danger', final: true, note: true }
  },
  transitions: { borrador: ['inscripcion', 'cancelada'], inscripcion: ['en_curso', 'borrador', 'cancelada'], en_curso: ['finalizada', 'cancelada'] }
});
export const ROUND = stateMachine({
  states: {
    programada: { label: 'Programada', tone: '' },
    recaudando: { label: 'Recaudando', tone: 'info' },
    completa: { label: 'Pozo completo', tone: 'warning' },
    entregada: { label: 'Pozo entregado', tone: 'primary' },
    confirmada: { label: 'Recepción confirmada', tone: 'success', final: true },
    anulada: { label: 'Anulada', tone: 'danger', final: true }
  },
  transitions: { programada: ['recaudando', 'anulada'], recaudando: ['completa', 'anulada'], completa: ['entregada', 'recaudando', 'anulada'], entregada: ['confirmada'] },
  guard: (r, to) => (to === 'entregada' && !r.slotId ? 'Primero adjudica o asigna el turno de esta ronda' : true)
});
export const PAY = stateMachine({
  states: {
    pendiente: { label: 'Pendiente', tone: '' },
    informado: { label: 'Por confirmar', tone: 'info' },
    atrasado: { label: 'Atrasado', tone: 'danger' },
    rechazado: { label: 'Rechazado', tone: 'warning', note: true },
    confirmado: { label: 'Pagado', tone: 'success', final: true },
    cubierto: { label: 'Cubierto (deuda)', tone: 'warning' },
    regularizado: { label: 'Regularizado', tone: 'success', final: true },
    anulado: { label: 'Anulado', tone: '', final: true }
  },
  transitions: {
    pendiente: ['informado', 'atrasado', 'confirmado', 'cubierto', 'anulado'],
    atrasado: ['informado', 'confirmado', 'cubierto', 'pendiente', 'anulado'],
    informado: ['confirmado', 'rechazado', 'anulado'],
    rechazado: ['informado', 'atrasado', 'confirmado', 'cubierto', 'pendiente', 'anulado'],
    cubierto: ['regularizado']
  }
});
export const SWAP = stateMachine({
  states: {
    solicitado: { label: 'Esperando al otro cupo', tone: 'info' },
    aceptado: { label: 'Esperando organizador/a', tone: 'warning' },
    aprobado: { label: 'Aprobado', tone: 'success', final: true },
    rechazado: { label: 'Rechazado', tone: 'danger', final: true, note: true },
    cancelado: { label: 'Cancelado', tone: '', final: true }
  },
  transitions: { solicitado: ['aceptado', 'rechazado', 'cancelado'], aceptado: ['aprobado', 'rechazado', 'cancelado'] }
});
export const REPORT = stateMachine({
  states: {
    abierto: { label: 'Abierto', tone: 'danger' },
    en_revision: { label: 'En revisión', tone: 'warning' },
    resuelto: { label: 'Resuelto', tone: 'success', final: true, note: true },
    descartado: { label: 'Descartado', tone: '', final: true, note: true }
  },
  transitions: { abierto: ['en_revision', 'descartado'], en_revision: ['resuelto', 'descartado', 'abierto'] }
});
export const PAID = ['confirmado', 'cubierto', 'regularizado'];     // cuentan como plata en el pozo
export const OPEN_PAY = ['pendiente', 'atrasado', 'rechazado', 'informado'];
export const MODES = { sorteo: 'Sorteo verificable', fijo: 'Orden fijo', llegada: 'Por orden de llegada', remate: 'Remate (puja)' };
export const MODE_ICON = { sorteo: '🎲', fijo: '↕️', llegada: '🏁', remate: '🔨' };

export const MOVE = {
  aporte: { label: 'Aporte', dir: 'in', group: 'ronda' },
  anticipo: { label: 'Anticipo (cubre cuota ajena)', dir: 'in', group: 'ronda' },
  pago_pozo: { label: 'Entrega del pozo', dir: 'out', group: 'ronda' },
  reparto_remate: { label: 'Reparto de remate', dir: 'out', group: 'ronda' },
  reembolso: { label: 'Reembolso de anticipo', dir: 'out', group: 'ronda' },
  multa: { label: 'Multa por atraso', dir: 'in', group: 'fondo' },
  reparto_fondo: { label: 'Reparto del fondo común', dir: 'out', group: 'fondo' },
  traspaso: { label: 'Traspaso de cupo', dir: 'in', group: 'ajuste' },
  devolucion: { label: 'Devolución', dir: 'out', group: 'ajuste' }
};

// ---------- Consultas ----------
export const pollaOf = (db, id) => db.get('pollas', id);
export const slotsOf = (db, pid) => db.query('slots', s => s.pollaId === pid).sort((a, b) => (a.turn ?? 999) - (b.turn ?? 999) || a.code.localeCompare(b.code));
export const membersOf = (db, pid, all = false) => db.query('members', m => m.pollaId === pid && (all || m.status === 'activo'));
export const roundsOf = (db, pid) => db.query('rounds', r => r.pollaId === pid).sort((a, b) => a.n - b.n);
export const paymentsOf = (db, pid) => db.query('payments', p => p.pollaId === pid);
export const movesOf = (db, pid) => db.query('movements', m => m.pollaId === pid).sort((a, b) => a.at.localeCompare(b.at) || a.seq - b.seq);
export const userName = (db, id) => db.get('users', id)?.name || '—';
export const holders = (db, slot) => (slot?.holders || []).map(id => db.get('members', id)).filter(Boolean);
export const slotLabel = (db, slot) => (slot ? holders(db, slot).map(m => userName(db, m.userId).split(' ').slice(0, 2).join(' ')).join(' + ') || 'Cupo libre' : '—');
export const slotOfMember = (db, m) => m && db.get('slots', m.slotId);
export const roundOfSlot = (db, slot) => slot && db.find('rounds', r => r.slotId === slot.id && r.status !== 'anulada');
export const received = (db, slot) => { const r = roundOfSlot(db, slot); return !!r && ['entregada', 'confirmada'].includes(r.status); };
export const potOf = p => p.amount * p.cupos;
export const isStaff = (p, u) => !!u && (u.role === 'admin' || p.organizerId === u.id || p.treasurerId === u.id);
// Qué puede hacer cada quien en una polla. El tesorero/a confirma pagos, entrega pozos y recuerda; no cambia reglas.
export function can(p, u, action) {
  if (!p || !u) return false;
  if (u.role === 'admin' || p.organizerId === u.id) return true;
  if (p.treasurerId === u.id) return ['pagos', 'entregas', 'recordatorios', 'muro', 'ver'].includes(action);
  return action === 'ver' && !!membershipOf(null, p, u);
}
export const membershipOf = (db, p, u) => (db || _db)?.find('members', m => m.pollaId === p.id && m.userId === u.id && m.status === 'activo');
let _db = null;
export const bindDB = db => { _db = db; };

// Cuota de un miembro (medio cupo: el primero en la lista paga el peso impar).
export function cuotaOf(db, member) {
  const p = pollaOf(db, member.pollaId), slot = slotOfMember(db, member);
  if (!slot || slot.holders.length < 2) return p.amount;
  return splitInt(p.amount, slot.holders.map(() => 1))[Math.max(0, slot.holders.indexOf(member.id))];
}
export const freeCupos = (db, p) => p.cupos - db.count('slots', s => s.pollaId === p.id);
export const halfOpen = (db, p) => db.find('slots', s => s.pollaId === p.id && s.half && s.holders.length < 2);
export const isFull = (db, p) => freeCupos(db, p) === 0 && !halfOpen(db, p);
export const takenTurns = (db, p) => db.query('slots', s => s.pollaId === p.id && s.turn).map(s => s.turn);

export function roundStats(db, round) {
  const pays = db.query('payments', x => x.roundId === round.id && x.status !== 'anulado');
  const expected = pays.reduce((s, x) => s + x.amount, 0);
  const collected = pays.filter(x => PAID.includes(x.status)).reduce((s, x) => s + x.amount, 0);
  const reported = pays.filter(x => x.status === 'informado').reduce((s, x) => s + x.amount, 0);
  const late = pays.filter(x => x.status === 'atrasado');
  return { pays, expected, collected, reported, pending: expected - collected - reported, late, paidCount: pays.filter(x => PAID.includes(x.status)).length, count: pays.length, pct: expected ? Math.round((collected / expected) * 100) : 0 };
}
export const currentRound = (db, pid) => roundsOf(db, pid).find(r => ['recaudando', 'completa'].includes(r.status)) || roundsOf(db, pid).find(r => r.status === 'programada');
export const nextPayout = (db, pid) => roundsOf(db, pid).find(r => !['entregada', 'confirmada', 'anulada'].includes(r.status));
export const dueOf = (db, pay) => db.get('rounds', pay.roundId)?.dueDate;
export const isOverdue = (db, pay, p = pollaOf(db, pay.pollaId)) => { const d = dueOf(db, pay); return !!d && diffDays(today(db), d) > (+p.graceDays || 0); };

// ---------- Libro y cuadratura ----------
export function cashOf(db, pid) {
  let inT = 0, outT = 0;
  db.query('movements', m => m.pollaId === pid).forEach(m => (m.dir === 'in' ? (inT += m.amount) : (outT += m.amount)));
  return { in: inT, out: outT, caja: inT - outT };
}
// Posición neta por persona dentro de la polla (aportado vs recibido).
export function positions(db, pid) {
  const map = new Map();
  const row = uid => map.get(uid) || map.set(uid, { userId: uid, aportado: 0, recibido: 0, multas: 0, anticipos: 0 }).get(uid);
  membersOf(db, pid, true).forEach(m => row(m.userId));
  db.query('movements', m => m.pollaId === pid).forEach(m => {
    const r = row(m.userId);
    if (m.dir === 'in') { r.aportado += m.amount; if (m.type === 'multa') r.multas += m.amount; if (m.type === 'anticipo') r.anticipos += m.amount; } else r.recibido += m.amount;
  });
  return [...map.values()].map(r => ({ ...r, net: r.recibido - r.aportado, debt: debtOf(db, pid, r.userId) }));
}
// Deuda viva: cuotas cubiertas por otro y aún no regularizadas (+ su multa) y cuotas atrasadas.
export function debtOf(db, pid, userId) {
  return db.query('payments', x => (!pid || x.pollaId === pid) && x.userId === userId && ['cubierto', 'atrasado'].includes(x.status))
    .reduce((s, x) => s + x.amount + (x.feeWaived ? 0 : x.lateFee || 0), 0);
}
export function reconcile(db, pid) {
  const moves = db.query('movements', m => m.pollaId === pid);
  const cash = cashOf(db, pid);
  const rounds = roundsOf(db, pid).map(r => {
    const mv = moves.filter(m => m.roundId === r.id);
    const sum = t => mv.filter(m => m.type === t).reduce((s, m) => s + m.amount, 0);
    const collected = sum('aporte') + sum('anticipo') - sum('reembolso');
    const paidOut = sum('pago_pozo') + sum('reparto_remate');
    const payTable = db.query('payments', x => x.roundId === r.id && PAID.includes(x.status)).reduce((s, x) => s + x.amount, 0);
    return { id: r.id, n: r.n, status: r.status, collected, paidOut, balance: collected - paidOut, payTable };
  });
  const fondoIn = moves.filter(m => m.type === 'multa').reduce((s, m) => s + m.amount, 0);
  const fondoOut = moves.filter(m => m.type === 'reparto_fondo').reduce((s, m) => s + m.amount, 0);
  const feesTable = db.query('payments', x => x.pollaId === pid && x.feePaid).reduce((s, x) => s + x.feePaid, 0);
  const ajuste = moves.filter(m => MOVE[m.type]?.group === 'ajuste').reduce((s, m) => s + (m.dir === 'in' ? m.amount : -m.amount), 0);
  const pos = positions(db, pid), netSum = pos.reduce((s, r) => s + r.net, 0);
  const delivered = rounds.filter(r => ['entregada', 'confirmada'].includes(r.status));
  const openBal = rounds.filter(r => !['entregada', 'confirmada'].includes(r.status)).reduce((s, r) => s + r.balance, 0);
  const checks = [
    { ok: delivered.every(r => r.balance === 0), label: 'Cada ronda entregada quedó en cero (recaudado = entregado + repartido)', detail: delivered.filter(r => r.balance !== 0).map(r => `Ronda ${r.n}: ${r.balance}`).join(', ') },
    { ok: rounds.every(r => r.collected === r.payTable), label: 'Los aportes del libro calzan con las cuotas pagadas de cada ronda', detail: rounds.filter(r => r.collected !== r.payTable).map(r => `Ronda ${r.n}`).join(', ') },
    { ok: fondoIn === feesTable, label: 'Las multas del libro calzan con las multas cobradas', detail: '' },
    { ok: cash.caja === openBal + (fondoIn - fondoOut) + ajuste, label: 'Caja = rondas por entregar + fondo común + ajustes', detail: '' },
    { ok: netSum === -cash.caja, label: 'La suma de posiciones netas es igual a la caja (con signo contrario)', detail: '' },
    { ok: cash.caja >= 0 && fondoIn - fondoOut >= 0, label: 'La caja y el fondo nunca quedan negativos', detail: '' }
  ];
  return { cash, rounds, fondo: fondoIn - fondoOut, fondoIn, fondoOut, ajuste, openBal, netSum, positions: pos, checks, ok: checks.every(c => c.ok) };
}

// ---------- Reputación (entre todas las pollas) ----------
export function reputation(db, userId) {
  const pays = db.query('payments', x => x.userId === userId && x.status !== 'anulado');
  const done = pays.filter(x => ['confirmado', 'regularizado'].includes(x.status));
  const late = pays.filter(x => (x.history || []).some(h => h.to === 'atrasado'));
  const covered = pays.filter(x => (x.history || []).some(h => h.to === 'cubierto'));
  const lateNow = pays.filter(x => x.status === 'atrasado').length + pays.filter(x => x.status === 'cubierto').length;
  const onTime = done.filter(x => !(x.history || []).some(h => h.to === 'atrasado')).length;
  const pollas = new Set(db.query('members', m => m.userId === userId).map(m => m.pollaId));
  const completed = [...pollas].filter(id => pollaOf(db, id)?.status === 'finalizada').length;
  const organized = db.count('pollas', p => p.organizerId === userId && p.status === 'finalizada');
  const confirmedReceipts = db.count('rounds', r => (r.receiptBy || []).includes(userId));
  let score = 70, label = 'Nuevo/a';
  if (done.length || lateNow) {
    const ratio = done.length ? onTime / done.length : 0;
    score = Math.round(55 + 40 * ratio + Math.min(completed, 4) * 2 + Math.min(organized, 3) * 2 - covered.length * 6 - lateNow * 5);
    score = Math.max(5, Math.min(100, score));
    label = score >= 90 ? 'Pagador/a estrella' : score >= 75 ? 'Confiable' : score >= 55 ? 'Regular' : 'En observación';
  }
  return { score, label, stars: Math.round(score / 20 * 2) / 2, payments: pays.length, done: done.length, onTime, late: late.length, covered: covered.length, lateNow, pollas: pollas.size, completed, organized, confirmedReceipts, tone: score >= 75 ? 'success' : score >= 55 ? 'warning' : 'danger' };
}

// Alertas de riesgo de una polla: quien ya recibió y dejó de pagar es el caso más grave.
export function risks(db, pid) {
  const p = pollaOf(db, pid), out = [];
  if (!p || !['en_curso'].includes(p.status)) return out;
  membersOf(db, pid).forEach(m => {
    const slot = slotOfMember(db, m), got = received(db, slot);
    const mine = db.query('payments', x => x.memberId === m.id);
    const late = mine.filter(x => x.status === 'atrasado'), cov = mine.filter(x => x.status === 'cubierto');
    const debt = [...late, ...cov].reduce((s, x) => s + x.amount + (x.feeWaived ? 0 : x.lateFee || 0), 0);
    const left = mine.filter(x => OPEN_PAY.includes(x.status)).reduce((s, x) => s + x.amount, 0);
    if (got && (late.length || cov.length)) out.push({ level: 'alto', member: m, debt, left, text: `Ya recibió el pozo (turno ${slot.turn}) y tiene ${late.length + cov.length} cuota${late.length + cov.length === 1 ? '' : 's'} impaga${late.length + cov.length === 1 ? '' : 's'}. Le quedan ${left ? fmtMoney(left) : '$0'} por aportar.` });
    else if (late.length || cov.length) out.push({ level: 'medio', member: m, debt, left, text: `${late.length + cov.length} cuota${late.length + cov.length === 1 ? '' : 's'} sin pagar. Aún no recibe (turno ${slot?.turn ?? '—'}).` });
    else if (!got && slot?.turn && reputation(db, m.userId).score < 55) {
      const r = roundOfSlot(db, slot);
      if (r && diffDays(r.dueDate, today(db)) <= periodDays(p) * 2) out.push({ level: 'bajo', member: m, debt: 0, left, text: `Reputación baja y su turno llega pronto (${fdate(r.dueDate)}). Conviene pedir garantía o aval.` });
    }
  });
  const order = { alto: 0, medio: 1, bajo: 2 };
  return out.sort((a, b) => order[a.level] - order[b.level] || b.debt - a.debt);
}
const fmtMoney = n => '$' + Math.round(n).toLocaleString('es-CL');

// ---------- Sorteo verificable ----------
// FNV-1a + mulberry32 + Fisher-Yates: con la misma semilla y la misma lista (ordenada por código de cupo)
// cualquiera obtiene el mismo orden en la página pública "Verificar sorteo".
export function hash32(str) { let h = 0x811c9dc5; for (const ch of String(str)) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
export function prng(seed) { let a = hash32(seed); return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function shuffle(list, seed) {
  const r = prng(seed), a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const WORDS = ['COPIHUE', 'ALERCE', 'QUILLAY', 'PEUMO', 'CHAGUAL', 'MAQUI', 'BOLDO', 'LITRE', 'ARAUCARIA', 'NALCA', 'CALAFATE', 'MURTA'];
export const newSeed = (r = Math.random) => `${WORDS[Math.floor(r() * WORDS.length)]}-${1000 + Math.floor(r() * 9000)}-${WORDS[Math.floor(r() * WORDS.length)]}`;
export const drawInput = (db, pid) => db.query('slots', s => s.pollaId === pid).sort((a, b) => a.code.localeCompare(b.code)).map(s => ({ id: s.id, label: `${s.code} ${slotLabel(db, s)}` }));

// ---------- Simulador (puro, lo usa el sitio público) ----------
// Remate: el turno 1 paga `discountPct` % del pozo y baja lineal hasta 0 en el último; cada descuento
// se reparte entre los otros cupos. Devuelve el calendario con lo que recibe y la posición neta por turno.
export function simulate({ amount = 50000, members = 10, freq = 'mensual', every = 10, start, remate = false, discountPct = 10 }) {
  amount = Math.max(0, Math.round(+amount || 0)); members = Math.max(2, Math.min(40, Math.round(+members || 2)));
  const pot = amount * members, dates = schedule(start, freq, members, every);
  const disc = dates.map((_, i) => (remate && members > 1 ? Math.round((pot * (discountPct / 100) * (members - 1 - i)) / (members - 1)) : 0));
  const share = disc.map((d, i) => splitInt(d, Array.from({ length: members - 1 }, () => 1)));
  const rows = dates.map((date, t) => {
    let reparto = 0;
    disc.forEach((d, r) => { if (r !== t) reparto += share[r][t < r ? t : t - 1]; });
    const receives = pot - disc[t];
    return { turn: t + 1, date, pot, discount: disc[t], receives, reparto, paid: amount * members, net: receives + reparto - amount * members };
  });
  const span = diffDays(dates.at(-1), dates[0]);
  return { pot, rows, total: pot * members, span, end: dates.at(-1), check: rows.reduce((s, r) => s + r.net, 0) };
}

// =====================================================================================
// Operaciones (escriben en la base, dejan bitácora y notificaciones). Lanzan Error con un
// mensaje para mostrar si algo no corresponde: el panel lo muestra en un aviso.
// =====================================================================================
function move(db, data) {
  const t = MOVE[data.type];
  if (!t) throw new Error('Tipo de movimiento desconocido');
  if (!(data.amount > 0)) return null;
  return db.insert('movements', { at: nowIso(db), seq: db.count('movements') + 1, dir: t.dir, group: t.group, roundId: null, memberId: null, note: '', ...data });
}
export function notify(db, userId, { pollaId = null, title, text = '', link = '', kind = 'info' }) {
  if (!userId) return;
  db.insert('notifs', { userId, pollaId, title, text, link, kind, read: false, at: nowIso(db) });
}
const tag = p => `${p.name}`;
const mv = (m, db, col, id, to, o) => m.move(db, col, id, to, { at: nowIso(db), log: o.log || col, ...o });
const pTitle = db => x => { const r = db.get('rounds', x.roundId), p = pollaOf(db, x.pollaId); return `${p?.code || ''} R${r?.n ?? '?'} · ${userName(db, x.userId)}`; };
const rTitle = db => r => `${pollaOf(db, r.pollaId)?.code || ''} ronda ${r.n}`;

export function createPolla(db, data, by) {
  const code = data.code || joinCode(db, data.name);
  const p = db.insert('pollas', { emoji: '🐣', approval: false, allowHalf: false, graceDays: 2, lateFee: 0, treasurerId: '', ...data, code, organizerId: data.organizerId || by, status: 'borrador', statusAt: nowIso(db), history: [{ at: nowIso(db), from: null, to: 'borrador', by, note: '' }], createdAt: nowIso(db) });
  db.log('polla', `Creada: ${p.name} (${p.code})`, by);
  return p;
}
export function joinCode(db, name) {
  const STOP = ['POLLA', 'DE', 'DEL', 'LA', 'LAS', 'LOS', 'EL', 'Y', 'EN', 'PARA', 'CON'];
  const words = String(name || '').normalize('NFD').replace(/[^A-Za-z ]/g, '').toUpperCase().split(/\s+/).filter(w => w && !STOP.includes(w));
  const base = (words[0] || 'POLLA').slice(0, 6);
  let code; let i = 0;
  do { code = `${base}-${(hash32(name + i + db.count('pollas')) % 900 + 100)}`; i++; } while (db.find('pollas', p => p.code === code));
  return code;
}
export function openPolla(db, pid, by) {
  const p = pollaOf(db, pid);
  if (p.status !== 'borrador') throw new Error('La polla ya está abierta');
  mv(POLLA, db, 'pollas', pid, 'inscripcion', { by, note: 'Se abren las inscripciones', log: 'polla', title: tag });
  return p;
}
// Unirse: cupo completo o medio cupo (se completa con otra persona). Si la polla pide aprobación,
// queda como solicitud sin ocupar cupo hasta que la organización la acepte.
export function joinPolla(db, pid, userId, { half = false, turn = null, by = userId, viaCode = true, note = '' } = {}) {
  const p = pollaOf(db, pid), u = db.get('users', userId);
  if (!p) throw new Error('Esa polla no existe');
  if (!['inscripcion', 'borrador'].includes(p.status) || (viaCode && p.status !== 'inscripcion')) throw new Error('Esta polla no está recibiendo inscripciones');
  if (db.find('members', m => m.pollaId === pid && m.userId === userId && ['activo', 'solicitud'].includes(m.status))) throw new Error('Ya eres parte de esta polla');
  if (half && !p.allowHalf) throw new Error('Esta polla no acepta medios cupos');
  if (!half && freeCupos(db, p) <= 0) throw new Error('No quedan cupos completos libres' + (halfOpen(db, p) ? ': queda medio cupo disponible' : ''));
  if (half && freeCupos(db, p) <= 0 && !halfOpen(db, p)) throw new Error('No quedan cupos libres');
  if (p.mode === 'llegada' && turn && takenTurns(db, p).includes(+turn)) throw new Error(`El turno ${turn} ya fue tomado`);
  if (p.approval && viaCode && by === userId) {
    const m = db.insert('members', { pollaId: pid, userId, slotId: null, share: half ? 0.5 : 1, status: 'solicitud', wantTurn: turn ? +turn : null, wantHalf: half, joinedAt: nowIso(db), note });
    notify(db, p.organizerId, { pollaId: pid, title: 'Nueva solicitud para unirse', text: `${u.name} pidió un ${half ? 'medio cupo' : 'cupo'} en ${p.name}.`, link: `organizador.html#/pollas/${pid}?tab=miembros`, kind: 'solicitud' });
    db.log('miembro', `${u.name} pidió unirse a ${p.code}`, userId);
    return m;
  }
  return seatMember(db, p, userId, { half, turn, by });
}
function seatMember(db, p, userId, { half, turn, by, memberId = null }) {
  let slot = half ? halfOpen(db, p) : null;
  const n = db.count('slots', s => s.pollaId === p.id);
  if (!slot) {
    if (n >= p.cupos) throw new Error('No quedan cupos libres');
    slot = db.insert('slots', { pollaId: p.id, code: 'C' + String(nextSlotNo(db, p.id)).padStart(2, '0'), turn: p.mode === 'llegada' ? (turn ? +turn : firstFreeTurn(db, p)) : null, half: !!half, holders: [] });
  }
  const m = memberId ? db.update('members', memberId, { slotId: slot.id, share: half ? 0.5 : 1, status: 'activo', joinedAt: nowIso(db) })
    : db.insert('members', { pollaId: p.id, userId, slotId: slot.id, share: half ? 0.5 : 1, status: 'activo', joinedAt: nowIso(db) });
  db.update('slots', slot.id, { holders: [...slot.holders, m.id] });
  const u = db.get('users', userId);
  db.log('miembro', `${u.name} se unió a ${p.code} (${slot.code}${half ? ', medio cupo' : ''}${slot.turn ? `, turno ${slot.turn}` : ''})`, by);
  if (by !== userId) notify(db, userId, { pollaId: p.id, title: `Te sumaron a ${p.name}`, text: `Tienes ${half ? 'medio cupo' : 'un cupo'} (${slot.code}). Cuota: ${fmtMoney(half ? p.amount / 2 : p.amount)} ${freqLabel(p).toLowerCase()}.`, link: `participante.html#/pollas/${p.id}`, kind: 'polla' });
  notify(db, p.organizerId, { pollaId: p.id, title: `${u.name} se unió`, text: `${p.name}: ${db.count('slots', s => s.pollaId === p.id)}/${p.cupos} cupos ocupados.`, link: `organizador.html#/pollas/${p.id}?tab=miembros`, kind: 'miembro' });
  return m;
}
const nextSlotNo = (db, pid) => Math.max(0, ...db.query('slots', s => s.pollaId === pid).map(s => +s.code.slice(1))) + 1;
const firstFreeTurn = (db, p) => { const t = takenTurns(db, p); for (let i = 1; i <= p.cupos; i++) if (!t.includes(i)) return i; return null; };
export function approveRequest(db, memberId, by, accept = true, note = '') {
  const m = db.get('members', memberId), p = pollaOf(db, m.pollaId), u = db.get('users', m.userId);
  if (m.status !== 'solicitud') throw new Error('Esa solicitud ya fue respondida');
  if (!accept) {
    db.update('members', memberId, { status: 'rechazado', note });
    notify(db, m.userId, { pollaId: p.id, title: 'Solicitud no aceptada', text: `${p.name}: ${note || 'la organización no aceptó tu solicitud.'}`, kind: 'polla' });
    db.log('miembro', `Solicitud de ${u.name} rechazada en ${p.code}`, by);
    return m;
  }
  if (p.mode === 'llegada' && m.wantTurn && takenTurns(db, p).includes(m.wantTurn)) m.wantTurn = null;
  seatMember(db, p, m.userId, { half: m.wantHalf, turn: m.wantTurn, by, memberId });
  notify(db, m.userId, { pollaId: p.id, title: `¡Bienvenido/a a ${p.name}!`, text: 'Tu solicitud fue aceptada.', link: `participante.html#/pollas/${p.id}`, kind: 'polla' });
  return db.get('members', memberId);
}
export function removeMember(db, memberId, by) {
  const m = db.get('members', memberId), p = pollaOf(db, m.pollaId);
  if (!['borrador', 'inscripcion'].includes(p.status)) throw new Error('Con la polla en curso no se retira a nadie: usa "Reemplazar"');
  const slot = slotOfMember(db, m);
  db.update('members', memberId, { status: 'retirado' });
  if (slot) { const h = slot.holders.filter(x => x !== memberId); h.length ? db.update('slots', slot.id, { holders: h }) : db.remove('slots', slot.id); }
  db.log('miembro', `${userName(db, m.userId)} salió de ${p.code}`, by);
}

// Asignación de turnos
export function draw(db, pid, by, seed = newSeed()) {
  const p = pollaOf(db, pid);
  if (p.mode !== 'sorteo') throw new Error('Esta polla no usa sorteo');
  if (!isFull(db, p)) throw new Error('Para sortear tienen que estar todos los cupos ocupados');
  if (p.draw) throw new Error('El sorteo ya se hizo: es definitivo y verificable');
  const input = drawInput(db, pid), order = shuffle(input, seed);
  order.forEach((s, i) => db.update('slots', s.id, { turn: i + 1 }));
  db.update('pollas', pid, { draw: { seed, at: nowIso(db), by, input: input.map(x => x.label), order: order.map(x => x.label) } });
  db.log('sorteo', `${p.code}: sorteo con semilla ${seed}`, by);
  membersOf(db, pid).forEach(m => { const s = slotOfMember(db, m); notify(db, m.userId, { pollaId: pid, title: `Sorteo realizado: te tocó el turno ${s.turn}`, text: `${p.name} · semilla ${seed}. Puedes verificarlo en el sitio.`, link: `participante.html#/pollas/${pid}?tab=turnos`, kind: 'sorteo' }); });
  return order;
}
export function setOrder(db, pid, slotIds, by) {
  const p = pollaOf(db, pid);
  if (!['borrador', 'inscripcion'].includes(p.status)) throw new Error('El orden solo se edita antes de iniciar');
  if (p.mode === 'remate') throw new Error('En remate los turnos se adjudican ronda a ronda');
  if (new Set(slotIds).size !== slotIds.length) throw new Error('Orden inválido');
  slotIds.forEach((id, i) => db.update('slots', id, { turn: i + 1 }));
  db.log('turnos', `${p.code}: orden de turnos actualizado`, by);
}
export function startPolla(db, pid, by) {
  const p = pollaOf(db, pid);
  if (p.status !== 'inscripcion') throw new Error('La polla debe estar con inscripción abierta');
  if (!isFull(db, p)) throw new Error(`Faltan cupos por llenar (${p.cupos - freeCupos(db, p)}/${p.cupos}${halfOpen(db, p) ? ', hay un medio cupo sin pareja' : ''})`);
  const slots = slotsOf(db, pid);
  if (p.mode !== 'remate' && slots.some(s => !s.turn)) throw new Error(p.mode === 'sorteo' ? 'Falta hacer el sorteo de turnos' : 'Falta asignar el orden de los turnos');
  if (db.count('members', m => m.pollaId === pid && m.status === 'solicitud')) throw new Error('Responde primero las solicitudes pendientes');
  const dates = schedule(p.startDate, p.frequency, p.cupos, p.everyDays);
  const members = membersOf(db, pid);
  dates.forEach((dueDate, i) => {
    const slot = p.mode === 'remate' ? (i === p.cupos - 1 && p.cupos === 1 ? slots[0] : null) : slots.find(s => s.turn === i + 1);
    const r = db.insert('rounds', { pollaId: pid, n: i + 1, dueDate, originalDate: dueDate, slotId: slot?.id || null, discount: 0, bids: [], status: 'programada', statusAt: nowIso(db), history: [{ at: nowIso(db), from: null, to: 'programada', by, note: '' }], dateChanges: [], receiptBy: [] });
    members.forEach(m => db.insert('payments', { pollaId: pid, roundId: r.id, memberId: m.id, userId: m.userId, amount: cuotaOf(db, m), lateFee: 0, feeWaived: false, feePaid: 0, status: 'pendiente', statusAt: nowIso(db), history: [{ at: nowIso(db), from: null, to: 'pendiente', by: null, note: '' }] }));
  });
  mv(POLLA, db, 'pollas', pid, 'en_curso', { by, note: `${p.cupos} rondas · pozo ${fmtMoney(potOf(p))}`, log: 'polla', title: tag });
  const r1 = roundsOf(db, pid)[0];
  mv(ROUND, db, 'rounds', r1.id, 'recaudando', { by, log: 'ronda', title: rTitle(db) });
  members.forEach(m => notify(db, m.userId, { pollaId: pid, title: `¡Partió ${p.name}!`, text: `Primera cuota: ${fmtMoney(cuotaOf(db, m))} hasta el ${fdate(r1.dueDate)}.`, link: `participante.html#/pollas/${pid}`, kind: 'polla' }));
}

// Pagos
export function reportPayment(db, payId, { method = 'transferencia', ref = '', file = '', by }) {
  const x = db.get('payments', payId), p = pollaOf(db, x.pollaId);
  if (p.status !== 'en_curso') throw new Error('La polla no está en curso');
  if (method === 'transferencia' && !String(ref).trim() && !file) throw new Error('Indica el N° de operación o adjunta el comprobante');
  mv(PAY, db, 'payments', payId, 'informado', { by, note: method === 'efectivo' ? 'Pago en efectivo, por confirmar' : `Transferencia ${ref}`.trim(), extra: { method, ref: String(ref).trim(), file, reportedAt: nowIso(db) }, log: 'pago', title: pTitle(db) });
  const r = db.get('rounds', x.roundId);
  [p.organizerId, p.treasurerId].filter(Boolean).forEach(uid => notify(db, uid, { pollaId: p.id, title: 'Pago por confirmar', text: `${userName(db, x.userId)} informó ${fmtMoney(x.amount + (x.feeWaived ? 0 : x.lateFee))} (${method}) · ronda ${r.n} de ${p.name}.`, link: 'organizador.html#/pagos', kind: 'pago' }));
}
export function confirmPayment(db, payId, by, { method } = {}) {
  const x = db.get('payments', payId), p = pollaOf(db, x.pollaId), r = db.get('rounds', x.roundId);
  if (p.status !== 'en_curso') throw new Error('La polla no está en curso');
  const fee = x.feeWaived ? 0 : x.lateFee || 0;
  const receipt = nextCode(db, 'cmp', 'CMP-', 10001);
  mv(PAY, db, 'payments', payId, 'confirmado', { by, note: x.status === 'informado' ? '' : `Registrado por organización (${method || 'efectivo'})`, extra: { confirmedAt: nowIso(db), confirmedBy: by, receipt, feePaid: fee, method: x.method || method || 'efectivo' }, log: 'pago', title: pTitle(db) });
  move(db, { pollaId: p.id, roundId: r.id, type: 'aporte', amount: x.amount, userId: x.userId, memberId: x.memberId, by, ref: receipt, note: `Ronda ${r.n}` });
  if (fee) move(db, { pollaId: p.id, type: 'multa', amount: fee, userId: x.userId, memberId: x.memberId, by, ref: receipt, note: `Atraso ronda ${r.n}` });
  notify(db, x.userId, { pollaId: p.id, title: 'Pago confirmado ✓', text: `${p.name} · ronda ${r.n}: ${fmtMoney(x.amount + fee)}. Comprobante ${receipt}.`, link: `participante.html#/comprobante/${receipt}`, kind: 'pago' });
  autoComplete(db, r.id, by);
  return receipt;
}
export function rejectPayment(db, payId, by, note) {
  const x = db.get('payments', payId), p = pollaOf(db, x.pollaId);
  if (!String(note || '').trim()) throw new Error('Indica el motivo del rechazo');
  mv(PAY, db, 'payments', payId, 'rechazado', { by, note, log: 'pago', title: pTitle(db) });
  notify(db, x.userId, { pollaId: p.id, title: 'Pago rechazado', text: `${p.name}: ${note}. Vuelve a informarlo cuando puedas.`, link: 'participante.html#/pagar', kind: 'alerta' });
}
export function coverPayment(db, payId, coverUserId, by, note = '') {
  const x = db.get('payments', payId), p = pollaOf(db, x.pollaId), r = db.get('rounds', x.roundId);
  if (coverUserId === x.userId) throw new Error('No se puede cubrir a sí mismo');
  mv(PAY, db, 'payments', payId, 'cubierto', { by, note: note || `Cubierto por ${userName(db, coverUserId)}`, extra: { coveredBy: coverUserId, coveredAt: nowIso(db) }, log: 'pago', title: pTitle(db) });
  move(db, { pollaId: p.id, roundId: r.id, type: 'anticipo', amount: x.amount, userId: coverUserId, memberId: null, by, note: `Cubre a ${userName(db, x.userId)} · ronda ${r.n}` });
  notify(db, x.userId, { pollaId: p.id, title: 'Cubrieron tu cuota', text: `${userName(db, coverUserId)} adelantó ${fmtMoney(x.amount)} de la ronda ${r.n} de ${p.name}. Quedas debiendo esa cuota${x.lateFee && !x.feeWaived ? ' más la multa' : ''}.`, link: 'participante.html#/pagar', kind: 'alerta' });
  autoComplete(db, r.id, by);
}
export function settleDebt(db, payId, by) {
  const x = db.get('payments', payId), p = pollaOf(db, x.pollaId), r = db.get('rounds', x.roundId);
  const fee = x.feeWaived ? 0 : x.lateFee || 0, receipt = nextCode(db, 'cmp', 'CMP-', 10001);
  mv(PAY, db, 'payments', payId, 'regularizado', { by, note: 'Deuda pagada', extra: { confirmedAt: nowIso(db), confirmedBy: by, receipt, feePaid: fee }, log: 'pago', title: pTitle(db) });
  move(db, { pollaId: p.id, roundId: r.id, type: 'aporte', amount: x.amount, userId: x.userId, memberId: x.memberId, by, ref: receipt, note: `Regulariza ronda ${r.n}` });
  move(db, { pollaId: p.id, roundId: r.id, type: 'reembolso', amount: x.amount, userId: x.coveredBy, by, ref: receipt, note: `Devuelve anticipo de ${userName(db, x.userId)}` });
  if (fee) move(db, { pollaId: p.id, type: 'multa', amount: fee, userId: x.userId, memberId: x.memberId, by, ref: receipt, note: `Atraso ronda ${r.n}` });
  notify(db, x.coveredBy, { pollaId: p.id, title: 'Te devolvieron un anticipo', text: `${userName(db, x.userId)} regularizó la ronda ${r.n} (${fmtMoney(x.amount)}).`, kind: 'pago' });
  notify(db, x.userId, { pollaId: p.id, title: 'Deuda regularizada ✓', text: `${p.name} · ronda ${r.n}. Comprobante ${receipt}.`, link: `participante.html#/comprobante/${receipt}`, kind: 'pago' });
  return receipt;
}
export function waiveFee(db, payId, by, note = '') {
  const x = db.get('payments', payId);
  if (!x.lateFee || x.feeWaived) throw new Error('No hay multa que condonar');
  if (['confirmado', 'regularizado'].includes(x.status)) throw new Error('La multa ya fue pagada');
  db.update('payments', payId, { feeWaived: true, feeNote: note });
  db.log('pago', `Multa condonada: ${pTitle(db)(x)}${note ? ` (${note})` : ''}`, by);
  notify(db, x.userId, { pollaId: x.pollaId, title: 'Te condonaron una multa', text: note || 'La organización perdonó la multa por atraso.', kind: 'pago' });
}
function autoComplete(db, roundId, by) {
  const r = db.get('rounds', roundId), st = roundStats(db, r);
  if (r.status === 'recaudando' && st.paidCount === st.count) {
    mv(ROUND, db, 'rounds', r.id, 'completa', { by, note: `${fmtMoney(st.collected)} recaudados`, log: 'ronda', title: rTitle(db) });
    const p = pollaOf(db, r.pollaId);
    [p.organizerId, p.treasurerId].filter(Boolean).forEach(uid => notify(db, uid, { pollaId: p.id, title: `Pozo completo · ronda ${r.n}`, text: `${p.name}: ya puedes entregar ${fmtMoney(st.collected)}.`, link: `organizador.html#/pollas/${p.id}/ronda/${r.id}`, kind: 'pozo' }));
  }
}
// Pasa a "atrasado" lo vencido (fecha + días de gracia) y aplica la multa. Idempotente.
export function sweepLate(db) {
  let n = 0;
  db.query('payments', x => ['pendiente', 'rechazado'].includes(x.status)).forEach(x => {
    const p = pollaOf(db, x.pollaId);
    if (!p || p.status !== 'en_curso' || !isOverdue(db, x, p)) return;
    mv(PAY, db, 'payments', x.id, 'atrasado', { by: null, note: `Venció el ${fdate(dueOf(db, x))} + ${p.graceDays} días de gracia`, extra: { lateFee: +p.lateFee || 0 }, log: false });
    notify(db, x.userId, { pollaId: p.id, title: 'Cuota atrasada', text: `${p.name}: ${fmtMoney(x.amount)}${p.lateFee ? ` + multa ${fmtMoney(p.lateFee)}` : ''}. Págala cuanto antes para no afectar a la gallada.`, link: 'participante.html#/pagar', kind: 'alerta' });
    n++;
  });
  // Al correr una fecha hacia adelante, lo que ya no está vencido vuelve a pendiente (sin multa).
  db.query('payments', x => x.status === 'atrasado').forEach(x => {
    const p = pollaOf(db, x.pollaId);
    if (p && p.status === 'en_curso' && !isOverdue(db, x, p)) mv(PAY, db, 'payments', x.id, 'pendiente', { by: null, note: 'La fecha de la ronda cambió', extra: { lateFee: 0, feeWaived: false }, log: false });
  });
  if (n) db.log('atrasos', `${n} cuota${n === 1 ? '' : 's'} pasaron a atrasadas`, null);
  return n;
}

// Remate
export function bid(db, roundId, memberId, amount) {
  const r = db.get('rounds', roundId), p = pollaOf(db, r.pollaId), m = db.get('members', memberId), slot = slotOfMember(db, m);
  amount = Math.round(+amount);
  if (p.mode !== 'remate') throw new Error('Esta polla no es de remate');
  if (r.slotId) throw new Error('Esta ronda ya fue adjudicada');
  if (!['programada', 'recaudando', 'completa'].includes(r.status)) throw new Error('La ronda no admite pujas');
  if (db.find('rounds', x => x.slotId === slot.id)) throw new Error('Tu cupo ya tiene su turno: no puede pujar de nuevo');
  const max = Math.floor(potOf(p) * (+p.maxBidPct || 30) / 100);
  if (!(amount >= 1000) || amount > max) throw new Error(`La puja debe ser entre $1.000 y ${fmtMoney(max)} (${p.maxBidPct || 30}% del pozo)`);
  const bids = (r.bids || []).filter(b => b.slotId !== slot.id).concat({ slotId: slot.id, userId: m.userId, amount, at: nowIso(db) });
  db.update('rounds', roundId, { bids });
  db.log('remate', `${userName(db, m.userId)} pujó ${fmtMoney(amount)} por la ronda ${r.n} de ${p.code}`, m.userId);
  notify(db, p.organizerId, { pollaId: p.id, title: `Nueva puja · ronda ${r.n}`, text: `${userName(db, m.userId)} ofrece ${fmtMoney(amount)} de descuento.`, link: `organizador.html#/pollas/${p.id}/ronda/${r.id}`, kind: 'remate' });
}
export function award(db, roundId, by, seed = newSeed()) {
  const r = db.get('rounds', roundId), p = pollaOf(db, r.pollaId);
  if (r.slotId) throw new Error('Ya está adjudicada');
  const taken = new Set(roundsOf(db, p.id).map(x => x.slotId).filter(Boolean));
  const free = slotsOf(db, p.id).filter(s => !taken.has(s.id));
  let winner, discount = 0, how;
  const bids = (r.bids || []).filter(b => free.some(s => s.id === b.slotId)).sort((a, b) => b.amount - a.amount || a.at.localeCompare(b.at));
  if (free.length === 1) { winner = free[0]; how = 'Último cupo: recibe sin descuento'; }
  else if (bids.length) { winner = free.find(s => s.id === bids[0].slotId); discount = bids[0].amount; how = `Mejor puja: ${fmtMoney(discount)}`; }
  else { winner = shuffle(free.sort((a, b) => a.code.localeCompare(b.code)), seed)[0]; how = `Sin pujas: sorteo entre ${free.length} cupos (semilla ${seed})`; }
  db.update('rounds', roundId, { slotId: winner.id, discount, awardedAt: nowIso(db), awardNote: how });
  db.update('slots', winner.id, { turn: r.n });
  db.log('remate', `${p.code} ronda ${r.n} adjudicada a ${slotLabel(db, winner)} · ${how}`, by);
  holders(db, winner).forEach(m => notify(db, m.userId, { pollaId: p.id, title: `¡Te adjudicaste la ronda ${r.n}!`, text: `${p.name}: recibirás ${fmtMoney(potOf(p) - discount)} el ${fdate(r.dueDate)}.`, link: `participante.html#/pollas/${p.id}?tab=turnos`, kind: 'remate' }));
  return winner;
}

// Entrega del pozo (y reparto del descuento del remate entre los demás cupos)
export function payout(db, roundId, by, { method = 'transferencia', ref = '' } = {}) {
  const r = db.get('rounds', roundId), p = pollaOf(db, r.pollaId);
  if (r.status !== 'completa') throw new Error('El pozo aún no está completo: confirma o cubre las cuotas pendientes');
  if (!r.slotId) throw new Error('Falta adjudicar el turno de esta ronda');
  const st = roundStats(db, r), pot = st.collected, discount = Math.min(r.discount || 0, pot);
  const slot = db.get('slots', r.slotId), hs = holders(db, slot);
  const net = pot - discount, parts = splitInt(net, hs.map(() => 1));
  const receipt = nextCode(db, 'ent', 'ENT-', 5001);
  hs.forEach((m, i) => move(db, { pollaId: p.id, roundId: r.id, type: 'pago_pozo', amount: parts[i], userId: m.userId, memberId: m.id, by, ref: receipt, note: `Pozo ronda ${r.n}${hs.length > 1 ? ' (medio cupo)' : ''}` }));
  const repartos = [];
  if (discount) {
    const others = slotsOf(db, p.id).filter(s => s.id !== slot.id);
    const perSlot = splitInt(discount, others.map(() => 1));
    others.forEach((s, i) => { const hh = holders(db, s), pp = splitInt(perSlot[i], hh.map(() => 1)); hh.forEach((m, j) => { move(db, { pollaId: p.id, roundId: r.id, type: 'reparto_remate', amount: pp[j], userId: m.userId, memberId: m.id, by, ref: receipt, note: `Descuento ronda ${r.n}` }); repartos.push([m.userId, pp[j]]); }); });
  }
  mv(ROUND, db, 'rounds', r.id, 'entregada', { by, note: `${fmtMoney(net)} a ${slotLabel(db, slot)}${discount ? ` · ${fmtMoney(discount)} repartidos` : ''}`, extra: { paidAt: nowIso(db), paidBy: by, payMethod: method, payRef: ref, receipt, netPaid: net }, log: 'ronda', title: rTitle(db) });
  hs.forEach((m, i) => notify(db, m.userId, { pollaId: p.id, title: '¡Recibiste el pozo! 🎉', text: `${p.name} · ronda ${r.n}: ${fmtMoney(parts[i])}. Confirma la recepción en la app.`, link: `participante.html#/pollas/${p.id}`, kind: 'pozo' }));
  repartos.forEach(([uid, amt]) => notify(db, uid, { pollaId: p.id, title: 'Te tocó reparto del remate', text: `${p.name} · ronda ${r.n}: ${fmtMoney(amt)}.`, kind: 'pozo' }));
  const next = roundsOf(db, p.id).find(x => x.n === r.n + 1);
  if (next && next.status === 'programada') {
    mv(ROUND, db, 'rounds', next.id, 'recaudando', { by, log: 'ronda', title: rTitle(db) });
    autoComplete(db, next.id, by);
  }
  return receipt;
}
export function confirmReceipt(db, roundId, userId, { byStaff = false } = {}) {
  const r = db.get('rounds', roundId), p = pollaOf(db, r.pollaId), slot = db.get('slots', r.slotId);
  if (r.status !== 'entregada') throw new Error('No hay una entrega por confirmar');
  const hs = holders(db, slot).map(m => m.userId);
  if (!byStaff && !hs.includes(userId)) throw new Error('Solo quien recibe puede confirmar');
  const list = byStaff ? hs : [...new Set([...(r.receiptBy || []), userId])];
  db.update('rounds', roundId, { receiptBy: list });
  db.log('ronda', `${rTitle(db)(r)}: ${byStaff ? 'recepción confirmada por la organización' : `${userName(db, userId)} confirmó que recibió`}`, userId);
  if (hs.every(u => list.includes(u))) {
    mv(ROUND, db, 'rounds', roundId, 'confirmada', { by: userId, note: byStaff ? 'Confirmada por la organización' : 'Recibido conforme', log: 'ronda', title: rTitle(db) });
    notify(db, p.organizerId, { pollaId: p.id, title: `Recepción confirmada · ronda ${r.n}`, text: `${slotLabel(db, slot)} confirmó el pozo de ${p.name}.`, kind: 'pozo' });
  }
}
export function changeDate(db, roundId, newDate, { shift = false, note = '', by }) {
  const r = db.get('rounds', roundId), p = pollaOf(db, r.pollaId), all = roundsOf(db, p.id);
  if (['entregada', 'confirmada', 'anulada'].includes(r.status)) throw new Error('Esa ronda ya se entregó');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate || '')) throw new Error('Fecha no válida');
  if (!String(note).trim()) throw new Error('Cuenta a la gallada por qué cambia la fecha');
  const prev = all.find(x => x.n === r.n - 1), next = all.find(x => x.n === r.n + 1);
  if (prev && newDate <= prev.dueDate) throw new Error(`Debe ser después de la ronda ${prev.n} (${fdate(prev.dueDate)})`);
  if (!shift && next && newDate >= next.dueDate) throw new Error(`Debe ser antes de la ronda ${next.n} (${fdate(next.dueDate)}) o marca "correr las siguientes"`);
  const delta = diffDays(newDate, r.dueDate);
  if (!delta) throw new Error('Es la misma fecha');
  const targets = shift ? all.filter(x => x.n >= r.n) : [r];
  targets.forEach(x => { const d = addDays(x.dueDate, delta); db.update('rounds', x.id, { dueDate: d, dateChanges: [...(x.dateChanges || []), { at: nowIso(db), from: x.dueDate, to: d, note, by }] }); });
  db.log('ronda', `${p.code} ronda ${r.n}: fecha ${fdate(r.dueDate)} → ${fdate(newDate)}${shift && targets.length > 1 ? ` (y ${targets.length - 1} siguientes)` : ''} · ${note}`, by);
  membersOf(db, p.id).forEach(m => notify(db, m.userId, { pollaId: p.id, title: `Cambio de fecha · ronda ${r.n}`, text: `${p.name}: ahora es el ${fdate(addDays(r.dueDate, 0))}${shift && targets.length > 1 ? ' y se corren las siguientes' : ''}. Motivo: ${note}`, link: `participante.html#/pollas/${p.id}`, kind: 'calendario' }));
  sweepLate(db);
}

// Reemplazo: la persona nueva hereda el cupo, el turno y las cuotas que faltan; además le devuelve
// a la anterior lo que ya había aportado (traspaso que pasa por la caja y queda en el libro).
export function replaceMember(db, memberId, newUserId, { by, note = '' }) {
  const m = db.get('members', memberId), p = pollaOf(db, m.pollaId), slot = slotOfMember(db, m);
  if (m.status !== 'activo') throw new Error('Ese miembro ya no está activo');
  if (newUserId === m.userId) throw new Error('Elige a otra persona');
  if (db.find('members', x => x.pollaId === p.id && x.userId === newUserId && x.status === 'activo')) throw new Error('Esa persona ya está en la polla');
  if (p.status === 'en_curso' && received(db, slot)) throw new Error('Este cupo ya recibió el pozo: no se puede traspasar. Cubre sus cuotas y registra la deuda.');
  if (['finalizada', 'cancelada'].includes(p.status)) throw new Error('La polla está cerrada');
  const nm = db.insert('members', { pollaId: p.id, userId: newUserId, slotId: slot.id, share: m.share, status: 'activo', joinedAt: nowIso(db), replaces: memberId });
  db.update('members', memberId, { status: 'reemplazado', replacedBy: nm.id, leftAt: nowIso(db), note });
  db.update('slots', slot.id, { holders: slot.holders.map(x => (x === memberId ? nm.id : x)) });
  let paidBack = 0;
  if (p.status === 'en_curso') {
    db.query('payments', x => x.memberId === memberId && OPEN_PAY.includes(x.status)).forEach(x => {
      db.update('payments', x.id, { memberId: nm.id, userId: newUserId, status: 'pendiente', lateFee: 0, feeWaived: false, history: [...(x.history || []), { at: nowIso(db), from: x.status, to: 'pendiente', by, note: `Traspasada a ${userName(db, newUserId)}` }] });
    });
    paidBack = db.query('movements', x => x.pollaId === p.id && x.memberId === memberId && x.type === 'aporte').reduce((s, x) => s + x.amount, 0);
    if (paidBack) {
      move(db, { pollaId: p.id, type: 'traspaso', amount: paidBack, userId: newUserId, memberId: nm.id, by, note: `Compra el cupo ${slot.code} a ${userName(db, m.userId)}` });
      move(db, { pollaId: p.id, type: 'devolucion', amount: paidBack, userId: m.userId, memberId, by, note: `Recupera lo aportado (cupo ${slot.code})` });
    }
  }
  db.log('miembro', `${p.code}: ${userName(db, newUserId)} reemplaza a ${userName(db, m.userId)} en ${slot.code}${paidBack ? ` (traspaso ${fmtMoney(paidBack)})` : ''}${note ? ` · ${note}` : ''}`, by);
  notify(db, newUserId, { pollaId: p.id, title: `Entraste a ${p.name}`, text: `Heredas el cupo ${slot.code}${slot.turn ? ` (turno ${slot.turn})` : ''}${paidBack ? ` y aportas ${fmtMoney(paidBack)} de traspaso` : ''}.`, link: `participante.html#/pollas/${p.id}`, kind: 'polla' });
  notify(db, m.userId, { pollaId: p.id, title: `Saliste de ${p.name}`, text: paidBack ? `Se te devuelven ${fmtMoney(paidBack)} aportados.` : 'Tu cupo pasó a otra persona.', kind: 'polla' });
  return nm;
}

// Cambios de turno entre dos cupos (con visto bueno del otro cupo y de la organización)
export function requestSwap(db, pid, fromMemberId, toSlotId, message = '') {
  const p = pollaOf(db, pid), m = db.get('members', fromMemberId), a = slotOfMember(db, m), b = db.get('slots', toSlotId);
  if (p.status !== 'en_curso' && p.status !== 'inscripcion') throw new Error('Ahora no se pueden pedir cambios');
  if (!a?.turn || !b?.turn) throw new Error('Ambos cupos deben tener turno asignado');
  if (a.id === b.id) throw new Error('Elige otro cupo');
  if (received(db, a) || received(db, b)) throw new Error('Uno de los cupos ya recibió el pozo');
  if (db.find('swaps', s => s.pollaId === pid && ['solicitado', 'aceptado'].includes(s.status) && [s.fromSlotId, s.toSlotId].some(x => [a.id, b.id].includes(x)))) throw new Error('Ya hay una solicitud abierta con uno de esos cupos');
  const s = db.insert('swaps', { pollaId: pid, fromMemberId, fromUserId: m.userId, fromSlotId: a.id, toSlotId: b.id, fromTurn: a.turn, toTurn: b.turn, message, status: 'solicitado', statusAt: nowIso(db), history: [{ at: nowIso(db), from: null, to: 'solicitado', by: m.userId, note: message }] });
  db.log('turnos', `${p.code}: ${userName(db, m.userId)} pide cambiar turno ${a.turn} ↔ ${b.turn}`, m.userId);
  holders(db, b).forEach(h => notify(db, h.userId, { pollaId: pid, title: 'Te piden cambiar de turno', text: `${userName(db, m.userId)} quiere su turno ${a.turn} por tu turno ${b.turn} en ${p.name}.`, link: 'participante.html#/cambios', kind: 'turno' }));
  return s;
}
export function answerSwap(db, swapId, to, by, note = '') {
  const s = db.get('swaps', swapId), p = pollaOf(db, s.pollaId);
  const title = x => `${p.code} turno ${x.fromTurn}↔${x.toTurn}`;
  if (to === 'aprobado') {
    const a = db.get('slots', s.fromSlotId), b = db.get('slots', s.toSlotId);
    if (received(db, a) || received(db, b)) throw new Error('Uno de los cupos ya recibió: el cambio no procede');
    const ra = roundOfSlot(db, a), rb = roundOfSlot(db, b);
    if (ra) db.update('rounds', ra.id, { slotId: b.id });
    if (rb) db.update('rounds', rb.id, { slotId: a.id });
    db.update('slots', a.id, { turn: b.turn }); db.update('slots', b.id, { turn: a.turn });
  }
  mv(SWAP, db, 'swaps', swapId, to, { by, note, log: 'turnos', title });
  const msg = { aceptado: 'aceptó: falta la aprobación de la organización', aprobado: 'fue aprobado: ¡ya tienen los turnos cambiados!', rechazado: `fue rechazado${note ? `: ${note}` : ''}`, cancelado: 'fue cancelado' }[to];
  const people = [s.fromUserId, ...holders(db, db.get('slots', s.toSlotId)).map(h => h.userId)];
  people.filter(u => u !== by).forEach(u => notify(db, u, { pollaId: p.id, title: 'Cambio de turno', text: `El cambio ${s.fromTurn} ↔ ${s.toTurn} en ${p.name} ${msg}.`, link: 'participante.html#/cambios', kind: 'turno' }));
  if (to === 'aceptado') [p.organizerId].forEach(u => notify(db, u, { pollaId: p.id, title: 'Cambio de turno por aprobar', text: `${p.name}: turnos ${s.fromTurn} ↔ ${s.toTurn}.`, link: 'organizador.html#/cambios', kind: 'turno' }));
}

// Cierre normal: reparte el fondo común (multas) por cupo y finaliza.
export function finishPolla(db, pid, by) {
  const p = pollaOf(db, pid), rounds = roundsOf(db, pid);
  if (p.status !== 'en_curso') throw new Error('La polla no está en curso');
  if (rounds.some(r => !['entregada', 'confirmada'].includes(r.status))) throw new Error('Quedan rondas sin entregar');
  if (db.count('payments', x => x.pollaId === pid && x.status === 'cubierto')) throw new Error('Hay deudas por cuotas cubiertas sin regularizar');
  const rec = reconcile(db, pid);
  if (rec.fondo > 0) {
    const slots = slotsOf(db, pid), per = splitInt(rec.fondo, slots.map(() => 1));
    slots.forEach((s, i) => { const hs = holders(db, s), pp = splitInt(per[i], hs.map(() => 1)); hs.forEach((m, j) => move(db, { pollaId: pid, type: 'reparto_fondo', amount: pp[j], userId: m.userId, memberId: m.id, by, note: 'Fondo de multas' })); });
  }
  mv(POLLA, db, 'pollas', pid, 'finalizada', { by, note: rec.fondo ? `Fondo repartido: ${fmtMoney(rec.fondo)}` : 'Sin fondo por repartir', extra: { closedAt: nowIso(db) }, log: 'polla', title: tag });
  membersOf(db, pid).forEach(m => notify(db, m.userId, { pollaId: pid, title: `${p.name} terminó 🎉`, text: 'Gracias por cumplir. Tu reputación sube con cada polla cerrada.', link: 'participante.html#/reputacion', kind: 'polla' }));
}
// Término anticipado: liquidación. Se devuelve la caja a quienes aportaron más de lo que recibieron
// (en proporción a lo que se les debe); lo que falte queda como deuda de quienes ya recibieron.
export function settlementPreview(db, pid) {
  const rec = reconcile(db, pid), caja = rec.cash.caja;
  const rows = rec.positions.filter(r => membersOf(db, pid, true).some(m => m.userId === r.userId) || r.aportado || r.recibido);
  const owed = rows.map(r => Math.max(0, -r.net)), totalOwed = owed.reduce((s, v) => s + v, 0);
  const refund = splitInt(Math.min(caja, totalOwed), owed);
  return { caja, totalOwed, rows: rows.map((r, i) => ({ ...r, owed: owed[i], refund: refund[i], pendingIn: owed[i] - refund[i], owes: Math.max(0, r.net) })) };
}
export function cancelPolla(db, pid, by, note) {
  const p = pollaOf(db, pid);
  if (!String(note || '').trim()) throw new Error('Indica el motivo del término');
  if (['finalizada', 'cancelada'].includes(p.status)) throw new Error('La polla ya está cerrada');
  const pre = p.status === 'en_curso' ? settlementPreview(db, pid) : null;
  if (pre) pre.rows.forEach(r => r.refund && move(db, { pollaId: pid, type: 'devolucion', amount: r.refund, userId: r.userId, by, note: 'Liquidación por término anticipado' }));
  db.query('payments', x => x.pollaId === pid && OPEN_PAY.includes(x.status)).forEach(x => mv(PAY, db, 'payments', x.id, 'anulado', { by, note: 'Polla terminada', log: false }));
  roundsOf(db, pid).filter(r => ['programada', 'recaudando', 'completa'].includes(r.status)).forEach(r => mv(ROUND, db, 'rounds', r.id, 'anulada', { by, note: 'Polla terminada', log: false }));
  mv(POLLA, db, 'pollas', pid, 'cancelada', { by, note, extra: { closedAt: nowIso(db), settlement: pre && { at: nowIso(db), caja: pre.caja, totalOwed: pre.totalOwed, rows: pre.rows.map(r => ({ userId: r.userId, aportado: r.aportado, recibido: r.recibido, net: r.net, refund: r.refund, pendingIn: r.pendingIn, owes: r.owes })) } }, log: 'polla', title: tag });
  membersOf(db, pid).forEach(m => notify(db, m.userId, { pollaId: pid, title: `${p.name} terminó antes`, text: `Motivo: ${note}. Revisa tu liquidación.`, link: `participante.html#/pollas/${pid}?tab=cuenta`, kind: 'alerta' }));
}

// Muro, reportes y recordatorios
export function post(db, pid, userId, text, { kind = 'mensaje', pinned = false } = {}) {
  text = String(text || '').trim();
  if (!text) throw new Error('Escribe algo primero');
  if (text.length > 600) throw new Error('Máximo 600 caracteres');
  return db.insert('posts', { pollaId: pid, userId, text, kind, pinned, at: nowIso(db) });
}
export function renderTemplate(text, vars) { return String(text || '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m)); }
export function reminderVars(db, pid, userId) {
  const p = pollaOf(db, pid), u = db.get('users', userId);
  const open = db.query('payments', x => x.pollaId === pid && x.userId === userId && OPEN_PAY.includes(x.status)).map(x => ({ x, r: db.get('rounds', x.roundId) })).sort((a, b) => a.r.n - b.r.n);
  const first = open[0], mine = db.find('members', m => m.pollaId === pid && m.userId === userId && m.status === 'activo'), slot = mine && slotOfMember(db, mine);
  const deuda = open.filter(o => ['atrasado'].includes(o.x.status)).reduce((s, o) => s + o.x.amount + (o.x.feeWaived ? 0 : o.x.lateFee || 0), 0);
  return { nombre: u?.name.split(' ')[0] || '', polla: p.name, monto: fmtMoney(first ? first.x.amount + (first.x.feeWaived ? 0 : first.x.lateFee || 0) : p.amount), fecha: first ? fdate(first.r.dueDate) : '—', ronda: first ? first.r.n : '—', turno: slot?.turn ?? 'por definir', pozo: fmtMoney(potOf(p)), deuda: fmtMoney(deuda), codigo: p.code, datos: p.paymentInfo || '', organizador: userName(db, p.organizerId) };
}
export function sendReminders(db, { pollaId, userIds, templateId, channel, by }) {
  const t = db.get('templates', templateId);
  if (!t) throw new Error('Elige una plantilla');
  if (!userIds.length) throw new Error('No hay destinatarios');
  const out = userIds.map(uid => {
    const text = renderTemplate(t.text, reminderVars(db, pollaId, uid));
    db.insert('outbox', { pollaId, userId: uid, channel: channel || t.channel, templateId, text, by, at: nowIso(db) });
    notify(db, uid, { pollaId, title: t.channel === 'email' ? 'Te escribieron por correo' : 'Recordatorio de tu polla', text, link: 'participante.html#/pagar', kind: 'recordatorio' });
    return text;
  });
  db.log('recordatorio', `${out.length} recordatorio${out.length === 1 ? '' : 's'} (${channel || t.channel}) · ${pollaOf(db, pollaId).code}`, by);
  return out;
}
