// Reglas de negocio: catálogo, precios, cupones, compras, progreso, rachas, insignias, certificados y reembolsos.
import { db } from './db.js';
import { SITE_DEFAULT } from './seed.js';

const DAY = 864e5;
export const site = () => ({ ...SITE_DEFAULT, ...(db.getValue('site') || {}) });
export const getCourse = id => db.get('courses', id);
export const courseBySlug = s => db.find('courses', c => c.slug === s || c.id === s);
export const getUser = id => db.get('users', id);
export const getCategory = id => db.get('categories', id);
export const lessonsOf = c => (c?.sections || []).flatMap(s => s.lessons);
export const courseMinutes = c => lessonsOf(c).reduce((t, l) => t + (+l.minutes || 0), 0);
export const priceOf = c => (c.salePrice && c.salePrice < c.price ? c.salePrice : c.price);
export const isPublic = c => c && c.status === 'publicado';
export const fmtHours = min => min >= 60 ? `${Math.floor(min / 60)} h ${min % 60 ? (min % 60) + ' min' : ''}`.trim() : `${min} min`;

export function rating(courseId) {
  const rs = db.query('reviews', r => r.courseId === courseId && r.status === 'publicada');
  const dist = [5, 4, 3, 2, 1].map(n => rs.filter(r => r.rating === n).length);
  return { avg: rs.length ? Math.round(rs.reduce((t, r) => t + r.rating, 0) / rs.length * 10) / 10 : 0, count: rs.length, dist };
}
export const stars = v => { const f = Math.round(v); return '★'.repeat(f) + '☆'.repeat(5 - f); };
export const studentsCount = courseId => db.count('enrollments', e => e.courseId === courseId);
export const enrollment = (userId, courseId) => db.find('enrollments', e => e.userId === userId && e.courseId === courseId);
export function coursePct(e) {
  const c = getCourse(e?.courseId); const ls = lessonsOf(c);
  return ls.length ? Math.round(ls.filter(l => e.progress?.[l.id]).length / ls.length * 100) : 0;
}

export function notify(userId, title, text, kind = 'info') { if (userId) db.insert('notifications', { userId, title, text, kind, read: false, at: new Date().toISOString() }); }

// ---------- Cupones y compra ----------
export function validateCoupon(code, items) {
  const c = db.find('coupons', x => x.code.toUpperCase() === String(code || '').trim().toUpperCase());
  const subtotal = items.reduce((t, x) => t + x.price, 0);
  if (!c) return { ok: false, error: 'El cupón no existe' };
  if (!c.active) return { ok: false, error: 'El cupón no está activo' };
  if (new Date(c.expiresAt) < Date.now()) return { ok: false, error: 'El cupón está vencido' };
  if (c.maxUses && c.uses >= c.maxUses) return { ok: false, error: 'El cupón alcanzó su límite de usos' };
  if (c.minTotal && subtotal < c.minTotal) return { ok: false, error: `Requiere una compra mínima de $${c.minTotal.toLocaleString('es-CL')}` };
  const base = c.courseId ? items.filter(x => x.courseId === c.courseId).reduce((t, x) => t + x.price, 0) : subtotal;
  if (c.courseId && !base) return { ok: false, error: 'El cupón no aplica a los cursos del carrito' };
  const discount = Math.min(base, c.type === 'pct' ? Math.round(base * c.value / 100) : c.value);
  return { ok: true, coupon: c, discount };
}
export function checkout(user, courseIds, couponCode, method) {
  const items = courseIds.map(getCourse).filter(c => isPublic(c) && !enrollment(user.id, c.id)).map(c => ({ courseId: c.id, price: priceOf(c), title: c.title }));
  if (!items.length) throw new Error('No hay cursos válidos en el carrito');
  const subtotal = items.reduce((t, x) => t + x.price, 0);
  const cp = couponCode ? validateCoupon(couponCode, items) : null;
  if (cp && !cp.ok) throw new Error(cp.error);
  const discount = cp?.discount || 0;
  const number = Math.max(1000, ...db.all('orders').map(o => o.number || 0)) + 1;
  const o = db.insert('orders', { number, userId: user.id, items, subtotal, discount, total: subtotal - discount, couponCode: cp?.coupon.code || null, status: 'pagado', method: subtotal - discount === 0 ? 'Gratis' : method });
  if (cp) db.update('coupons', cp.coupon.id, { uses: (cp.coupon.uses || 0) + 1 });
  items.forEach(x => {
    const c = getCourse(x.courseId);
    db.insert('enrollments', { userId: user.id, courseId: x.courseId, orderId: o.id, enrolledAt: new Date().toISOString(), progress: {}, lastLessonId: lessonsOf(c)[0]?.id, notes: {}, quizScores: {}, assignments: {}, lastActivityAt: new Date().toISOString() });
    notify(c.instructorId, 'Nueva matrícula', `${user.name} se inscribió en «${c.title}».`, 'success');
  });
  db.log('compra', `Pedido #${number} · ${user.name} · $${o.total.toLocaleString('es-CL')}`, user.id);
  return o;
}

// ---------- Progreso, rachas e insignias ----------
const today = () => new Date().toISOString().slice(0, 10);
export function logActivity(userId, minutes = 1) {
  const d = today();
  const a = db.find('activity', x => x.userId === userId && x.date === d);
  if (a) db.update('activity', a.id, { minutes: a.minutes + minutes }); else db.insert('activity', { userId, date: d, minutes });
}
export function streak(userId) {
  const days = new Set(db.query('activity', a => a.userId === userId).map(a => a.date));
  let n = 0, t = Date.now();
  if (!days.has(new Date(t).toISOString().slice(0, 10))) t -= DAY; // la racha sigue viva si estudiaste ayer
  while (days.has(new Date(t).toISOString().slice(0, 10))) { n++; t -= DAY; }
  return n;
}
export function completeLesson(enrollmentId, lessonId, extra = {}) {
  const e = db.get('enrollments', enrollmentId);
  if (!e) return null;
  const was = !!e.progress?.[lessonId];
  db.update('enrollments', e.id, row => ({ progress: { ...row.progress, [lessonId]: true }, lastLessonId: lessonId, lastActivityAt: new Date().toISOString(), ...extra }));
  if (!was) logActivity(e.userId, 5);
  const fresh = db.get('enrollments', e.id), c = getCourse(e.courseId);
  if (!fresh.completedAt && coursePct(fresh) >= 100) {
    db.update('enrollments', e.id, { completedAt: new Date().toISOString() });
    const code = 'FARO-' + Math.floor(Math.random() * 36 ** 6).toString(36).toUpperCase().padStart(6, '0');
    const cert = db.insert('certificates', { code, userId: e.userId, courseId: c.id, issuedAt: new Date().toISOString() });
    db.log('curso completado', `${getUser(e.userId)?.name} · ${c.title}`, e.userId);
    notify(e.userId, '¡Curso completado!', `Terminaste «${c.title}». Tu certificado ${code} ya está disponible.`, 'success');
    return { completed: true, cert };
  }
  return { completed: false };
}
export function xp(userId) {
  const es = db.query('enrollments', e => e.userId === userId);
  const lessons = es.reduce((t, e) => t + Object.keys(e.progress || {}).length, 0);
  const quizzes = es.reduce((t, e) => t + Object.values(e.quizScores || {}).filter(s => s >= 70).length, 0);
  return lessons * 10 + quizzes * 25 + db.count('certificates', c => c.userId === userId) * 200 + db.count('reviews', r => r.userId === userId) * 15;
}
export function badges(userId) {
  const es = db.query('enrollments', e => e.userId === userId);
  const lessons = es.reduce((t, e) => t + Object.keys(e.progress || {}).length, 0);
  const certs = db.count('certificates', c => c.userId === userId);
  const perfect = es.some(e => Object.values(e.quizScores || {}).some(s => s === 100));
  const st = streak(userId), best = Math.max(st, bestStreak(userId));
  return [
    { id: 'start', icon: '🌱', name: 'Primer paso', desc: 'Completa tu primera lección', ok: lessons >= 1 },
    { id: 'ten', icon: '📚', name: 'Constante', desc: 'Completa 10 lecciones', ok: lessons >= 10 },
    { id: 'fifty', icon: '🏔️', name: 'Imparable', desc: 'Completa 50 lecciones', ok: lessons >= 50 },
    { id: 'streak3', icon: '🔥', name: 'En racha', desc: 'Estudia 3 días seguidos', ok: best >= 3 },
    { id: 'streak7', icon: '⚡', name: 'Semana perfecta', desc: 'Estudia 7 días seguidos', ok: best >= 7 },
    { id: 'perfect', icon: '🎯', name: 'Puntería', desc: 'Obtén 100% en un quiz', ok: perfect },
    { id: 'grad', icon: '🎓', name: 'Graduado', desc: 'Termina tu primer curso', ok: certs >= 1 },
    { id: 'three', icon: '🏆', name: 'Coleccionista', desc: 'Termina 3 cursos', ok: certs >= 3 },
    { id: 'voice', icon: '💬', name: 'Voz de la comunidad', desc: 'Escribe una reseña o pregunta', ok: db.count('reviews', r => r.userId === userId) + db.count('questions', q => q.userId === userId) > 0 }
  ];
}
function bestStreak(userId) {
  const ds = [...new Set(db.query('activity', a => a.userId === userId).map(a => a.date))].sort();
  let best = 0, cur = 0, prev = null;
  ds.forEach(d => { const t = new Date(d).getTime(); cur = prev && t - prev === DAY ? cur + 1 : 1; best = Math.max(best, cur); prev = t; });
  return best;
}

// ---------- Ganancias e instructores ----------
export const commission = () => site().commission ?? 30;
export function salesOf(instructorId, from = 0) {
  const mine = new Set(db.query('courses', c => c.instructorId === instructorId).map(c => c.id));
  return db.query('orders', o => o.status === 'pagado' && new Date(o.createdAt) >= from).flatMap(o => o.items.filter(x => mine.has(x.courseId)).map(x => ({ ...x, at: o.createdAt, orderId: o.id, net: Math.round(x.price * (o.total / (o.subtotal || 1))) })));
}
export const instructorShare = net => Math.round(net * (100 - commission()) / 100);

// ---------- Reembolsos ----------
export function requestRefund(orderId, reason) {
  db.update('orders', orderId, { status: 'reembolso_solicitado', refundReason: reason, refundRequestedAt: new Date().toISOString() });
  const o = db.get('orders', orderId);
  db.log('reembolso solicitado', `Pedido #${o.number} · ${reason}`, o.userId);
}
export function resolveRefund(orderId, approve, byId, note = '') {
  const o = db.get('orders', orderId);
  if (approve) {
    db.update('orders', orderId, { status: 'reembolsado', refundedAt: new Date().toISOString(), refundNote: note });
    o.items.forEach(x => { const e = enrollment(o.userId, x.courseId); if (e) db.remove('enrollments', e.id); });
    notify(o.userId, 'Reembolso aprobado', `Devolvimos $${o.total.toLocaleString('es-CL')} del pedido #${o.number}. Verás el abono en 5 a 10 días hábiles.`, 'success');
  } else {
    db.update('orders', orderId, { status: 'pagado', refundNote: note, refundRejectedAt: new Date().toISOString() });
    notify(o.userId, 'Reembolso rechazado', `Tu solicitud del pedido #${o.number} fue rechazada. ${note}`, 'warning');
  }
  db.log(approve ? 'reembolso aprobado' : 'reembolso rechazado', `Pedido #${o.number}`, byId);
}

export const ORDER = { pagado: ['Pagado', 'success'], reembolso_solicitado: ['Reembolso solicitado', 'warning'], reembolsado: ['Reembolsado', 'info'], fallido: ['Fallido', 'danger'] };
export const COURSE = { borrador: ['Borrador', ''], revision: ['En revisión', 'warning'], publicado: ['Publicado', 'success'], rechazado: ['Rechazado', 'danger'], archivado: ['Archivado', 'info'] };
export const LESSON = { video: ['▶', 'Video'], lectura: ['📄', 'Lectura'], quiz: ['❓', 'Quiz'], tarea: ['📝', 'Tarea'] };
// Monto compacto para KPIs: $1,6 M
export const moneyShort = n => Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(1).replace('.', ',')} M` : `$${Math.round(n).toLocaleString('es-CL')}`;
