// Reglas de negocio de Titán Fit: accesos, reservas con cupos y lista de espera, check-in, MRR.
import { db, auth } from '../data/db.js';
import { MEMBER_STATUS, BOOKING_STATUS } from '../data/catalog.js';
import { ymd, addDays, dow, toMin, nowHM, weekStart } from './dates.js';
import { escape, money } from '../../../assets/core/ui.js';

export const settings = () => db.getValue('settings', {});
export const plan = id => db.get('plans', id);
export const branch = id => db.get('branches', id);
export const trainer = id => db.get('trainers', id);
export const discipline = id => db.get('disciplines', id);
export const member = id => db.get('members', id);
export const klass = id => db.get('classes', id);
export const memberByCode = code => db.find('members', m => m.code.toUpperCase() === String(code).trim().toUpperCase());
export const activePlans = () => db.query('plans', p => p.active !== false).sort((a, b) => a.order - b.order);
export const activeBranches = () => db.query('branches', b => b.active !== false);

export const statusBadge = st => { const s = MEMBER_STATUS[st] || { label: st, badge: '' }; return `<span class="badge ${s.badge ? 'badge-' + s.badge : ''}">${escape(s.label)}</span>`; };
export const bookingBadge = st => { const s = BOOKING_STATUS[st] || { label: st, badge: '' }; return `<span class="badge ${s.badge ? 'badge-' + s.badge : ''}">${escape(s.label)}</span>`; };
export const monthlyEq = m => { const p = plan(m.planId); return !p ? 0 : m.billing === 'anual' ? Math.round(p.annual / 12) : p.monthly; };
export const mrr = () => db.query('members', m => m.status === 'activo' || m.status === 'moroso').reduce((s, m) => s + monthlyEq(m), 0);

// Estado de acceso para el kiosco
export function access(m) {
  if (!m) return { ok: false, kind: 'bad', title: 'Código no encontrado', msg: 'Revisa el código o busca al socio por nombre.' };
  if (m.status === 'baja') return { ok: false, kind: 'bad', title: 'Membresía inactiva', msg: 'El socio está de baja. Ofrécele volver con la promoción vigente.' };
  if (m.status === 'congelado') return { ok: false, kind: 'warn', title: 'Membresía congelada', msg: `Congelada hasta el ${m.freezeUntil || '—'}. Puede reactivarla en recepción.` };
  if (m.status === 'moroso' || (m.nextDue && m.nextDue < ymd())) return { ok: false, kind: 'bad', title: 'Pago pendiente', msg: `Mensualidad vencida el ${m.nextDue}. Debe regularizar para ingresar.` };
  return { ok: true, kind: 'ok', title: '¡Bienvenido/a!', msg: `Al día · próximo pago ${m.nextDue}` };
}

export function checkIn(m, branchId, by = 'kiosco') {
  const a = access(m);
  if (!a.ok) { db.log('check-in rechazado', `${m?.name || 'Desconocido'}: ${a.title}`, auth.current()?.id); return a; }
  const p = plan(m.planId);
  if (!p.allBranches && branchId && m.branchId !== branchId) { const r = { ok: false, kind: 'warn', title: 'Sede no incluida', msg: `Su plan ${p.name} es solo para ${branch(m.branchId)?.name}. Puede pagar pase diario.` }; return r; }
  db.insert('checkins', { memberId: m.id, branchId: branchId || m.branchId, at: new Date().toISOString(), by });
  // Marca asistencia en clases de hoy próximas a comenzar
  db.query('bookings', b => b.memberId === m.id && b.date === ymd() && b.status === 'reservada').forEach(b => { const c = klass(b.classId); if (c && Math.abs(toMin(c.time) - toMin(nowHM())) <= 60) db.update('bookings', b.id, { status: 'asistio' }); });
  db.log('check-in', `${m.name} ingresó a ${branch(branchId || m.branchId)?.name}`, auth.current()?.id);
  return a;
}

// Clases de una fecha (según plantilla semanal)
export const classesOn = (date, branchId) => db.query('classes', c => c.active !== false && c.day === dow(date) && (!branchId || c.branchId === branchId)).sort((a, b) => a.time.localeCompare(b.time));
export const bookingsOf = (classId, date) => db.query('bookings', b => b.classId === classId && b.date === date && b.status !== 'cancelada');
export function occupancy(c, date) {
  const l = bookingsOf(c.id, date);
  const taken = l.filter(b => b.status !== 'espera').length;
  return { taken, wait: l.filter(b => b.status === 'espera').length, free: Math.max(0, c.capacity - taken), pct: Math.round(taken / c.capacity * 100) };
}
export const classStart = (c, date) => new Date(`${date}T${c.time}:00`);
export const myBooking = (memberId, classId, date) => db.find('bookings', b => b.memberId === memberId && b.classId === classId && b.date === date && b.status !== 'cancelada');

export function weekCount(memberId, date) {
  const ws = weekStart(date), we = addDays(ws, 6);
  return db.count('bookings', b => b.memberId === memberId && b.date >= ws && b.date <= we && ['reservada', 'asistio', 'espera'].includes(b.status));
}

export function bookClass(m, c, date) {
  const a = access(m);
  if (!a.ok) throw new Error(a.title + ': ' + a.msg);
  const p = plan(m.planId);
  if (!p.allBranches && c.branchId !== m.branchId) throw new Error(`Tu plan ${p.name} no incluye la sede ${branch(c.branchId).name}`);
  if (classStart(c, date) < new Date()) throw new Error('La clase ya comenzó');
  if (myBooking(m.id, c.id, date)) throw new Error('Ya tienes esta clase reservada');
  if (weekCount(m.id, date) >= p.classesPerWeek) throw new Error(`Tu plan permite ${p.classesPerWeek} clases por semana`);
  const occ = occupancy(c, date);
  const status = occ.free > 0 ? 'reservada' : 'espera';
  const b = db.insert('bookings', { classId: c.id, date, memberId: m.id, status });
  db.log('reserva clase', `${m.name} → ${discipline(c.disciplineId)?.name} ${date} ${c.time} (${status})`, auth.current()?.id);
  return b;
}
export function cancelBooking(b) {
  const c = klass(b.classId);
  db.update('bookings', b.id, { status: 'cancelada' });
  // Sube al primero de la lista de espera
  if (b.status === 'reservada') {
    const next = db.query('bookings', x => x.classId === b.classId && x.date === b.date && x.status === 'espera').sort((x, y) => x.createdAt.localeCompare(y.createdAt))[0];
    if (next) { db.update('bookings', next.id, { status: 'reservada' }); db.log('lista de espera', `${member(next.memberId)?.name} obtuvo cupo en ${discipline(c.disciplineId)?.name}`, auth.current()?.id); }
  }
  db.log('cancelación clase', `${member(b.memberId)?.name} canceló ${discipline(c?.disciplineId)?.name} ${b.date}`, auth.current()?.id);
}

// Registra un pago y deja al socio al día
export function registerPayment(m, { amount, concept, method }) {
  const p = plan(m.planId);
  const base = m.nextDue && m.nextDue > ymd() ? m.nextDue : ymd();
  const nextDue = addDays(base, m.billing === 'anual' ? 365 : 30);
  db.insert('payments', { memberId: m.id, amount, concept, method, at: new Date().toISOString(), status: 'pagado' });
  db.update('members', m.id, { status: m.status === 'baja' || m.status === 'moroso' ? 'activo' : m.status, nextDue });
  db.log('pago', `${m.name} · ${money(amount)} · ${concept}`, auth.current()?.id);
  return nextDue;
}
export const planPrice = m => { const p = plan(m.planId); return m.billing === 'anual' ? p.annual : p.monthly; };

// "Código QR" decorativo y determinista a partir del código de socio
export function qrSvg(text, n = 25) {
  let h = 2166136261;
  for (const ch of text) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
  const finder = (x, y) => { for (const [fx, fy] of [[0, 0], [n - 7, 0], [0, n - 7]]) { const dx = x - fx, dy = y - fy; if (dx >= -1 && dx <= 7 && dy >= -1 && dy <= 7) return (dx >= 0 && dx < 7 && dy >= 0 && dy < 7) ? (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4)) ? 1 : 0 : 0; } return -1; };
  let rects = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const f = finder(x, y); if (f === 1 || (f === -1 && rnd() > .52)) rects += `M${x} ${y}h1v1h-1z`; }
  return `<svg viewBox="-1 -1 ${n + 2} ${n + 2}" role="img" aria-label="Código de acceso ${escape(text)}" shape-rendering="crispEdges"><path d="${rects}" fill="currentColor"/></svg>`;
}
