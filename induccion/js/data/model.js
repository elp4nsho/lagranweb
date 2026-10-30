// Reglas de negocio: progreso, estados, evaluaciones, certificados y asignaciones.
import { db } from './db.js';
import { SITE_DEFAULT } from './seed.js';

const DAY = 864e5;
export const site = () => ({ ...SITE_DEFAULT, ...(db.getValue('site') || {}) });

export const getModule = id => db.get('modules', id);
export const getPlan = id => db.get('plans', id);
export const getUser = id => db.get('users', id);
export const getCompany = id => db.get('companies', id);
export const modulesSorted = () => db.all('modules').sort((a, b) => (a.order || 0) - (b.order || 0));
export const planModules = plan => (plan?.moduleIds || []).map(getModule).filter(Boolean);

export const checkpoints = m => !m ? [] : m.mode === 'quiz' ? ['aprobado'] : [...(m.points || []).map(p => p.id), ...(m.extra || [])];
export function modulePct(a, m) {
  if (!a || !m) return 0;
  if (m.mode === 'quiz') return a.quizPassed ? 1 : 0;
  const all = checkpoints(m);
  if (!all.length) return 1;
  const done = a.progress?.[m.id] || [];
  return all.filter(c => done.includes(c)).length / all.length;
}
export function assignmentPct(a) {
  const mods = planModules(getPlan(a.planId));
  if (!mods.length) return 0;
  return Math.round(mods.reduce((s, m) => s + modulePct(a, m), 0) / mods.length * 100);
}
export const contentDone = a => planModules(getPlan(a.planId)).filter(m => m.mode !== 'quiz').every(m => modulePct(a, m) >= 1);

export const STATUS = {
  completada: ['Completada', 'success'], practica: ['Eval. práctica', 'info'], en_curso: ['En curso', 'primary'],
  pendiente: ['Pendiente', 'warning'], vencida: ['Vencida', 'danger'], cancelada: ['Cancelada', '']
};
export function assignmentStatus(a) {
  if (a.cancelled) return 'cancelada';
  if (a.completedAt) return 'completada';
  if (a.practical?.status === 'pendiente') return 'practica';
  if (new Date(a.dueAt) < Date.now()) return 'vencida';
  const started = Object.values(a.progress || {}).some(v => v.length) || a.bestScore > 0;
  return started ? 'en_curso' : 'pendiente';
}

export const CERT = { vigente: ['Vigente', 'success'], por_vencer: ['Por vencer', 'warning'], vencido: ['Vencido', 'danger'], revocado: ['Revocado', ''] };
export function certStatus(c) {
  if (c.status === 'revocado') return 'revocado';
  const left = (new Date(c.expiresAt) - Date.now()) / DAY;
  if (left < 0) return 'vencido';
  if (left <= site().reminderDays) return 'por_vencer';
  return 'vigente';
}
export const daysLeft = d => Math.ceil((new Date(d) - Date.now()) / DAY);

export function notify(userId, title, text, kind = 'info') {
  if (!userId) return;
  db.insert('notifications', { userId, title, text, kind, read: false, at: new Date().toISOString() });
}

export function markCheckpoint(aId, moduleId, cp) {
  const a = db.get('assignments', aId);
  if (!a) return;
  const list = a.progress?.[moduleId] || [];
  if (list.includes(cp)) return;
  db.update('assignments', aId, row => ({ progress: { ...row.progress, [moduleId]: [...list, cp] }, startedAt: row.startedAt || new Date().toISOString() }));
}
export function resetModule(aId, moduleId) {
  db.update('assignments', aId, row => ({ progress: { ...row.progress, [moduleId]: [] } }));
}
export function addTime(aId, moduleId, minutes) {
  if (!aId || minutes <= 0) return;
  db.update('assignments', aId, row => ({ time: { ...row.time, [moduleId]: Math.round(((row.time || {})[moduleId] || 0) + minutes) } }));
}

// Preguntas al azar del banco, de los módulos del plan.
export function drawQuestions(plan, count) {
  const ids = new Set(plan.moduleIds);
  let pool = db.query('questions', q => q.active !== false && ids.has(q.moduleId));
  if (pool.length < count) pool = db.query('questions', q => q.active !== false);
  pool = pool.slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, count);
}

function certCode(plan) {
  let c;
  do { c = `MA-${plan.code}-${new Date().getFullYear()}-${Math.floor(Math.random() * 36 ** 5).toString(36).toUpperCase().padStart(5, '0')}`; } while (db.find('certificates', x => x.code === c));
  return c;
}
export function issueCertificate(a) {
  const plan = getPlan(a.planId);
  const exp = new Date(); exp.setMonth(exp.getMonth() + (plan.validityMonths || 12));
  const c = db.insert('certificates', { code: certCode(plan), userId: a.userId, planId: plan.id, assignmentId: a.id, issuedAt: new Date().toISOString(), expiresAt: exp.toISOString(), score: a.bestScore, status: 'vigente' });
  db.update('assignments', a.id, { completedAt: new Date().toISOString(), certificateId: c.id });
  db.log('certificado emitido', `${c.code} · ${getUser(a.userId)?.name}`, a.userId);
  notify(a.userId, 'Certificado emitido', `Ya puedes descargar tu certificado de «${plan.name}» (código ${c.code}).`, 'success');
  return c;
}

// Registra un intento de evaluación y avanza el flujo.
export function recordAttempt(a, { correct, total, durationSec, answers }) {
  const plan = getPlan(a.planId);
  const score = Math.round(correct / total * 100);
  const passed = score >= (plan.passScore || 80);
  db.insert('attempts', { userId: a.userId, assignmentId: a.id, planId: plan.id, score, correct, total, passed, at: new Date().toISOString(), durationSec, answers });
  const best = Math.max(a.bestScore || 0, score);
  db.update('assignments', a.id, { bestScore: best, quizPassed: a.quizPassed || passed });
  db.log(passed ? 'evaluación aprobada' : 'evaluación reprobada', `${getUser(a.userId)?.name} · ${plan.name} · ${score}%`, a.userId);
  let cert = null;
  if (passed && !a.completedAt) {
    const fresh = db.get('assignments', a.id);
    if (plan.practical) {
      if (fresh.practical?.status !== 'aprobada') {
        db.update('assignments', a.id, { practical: { status: 'pendiente', requestedAt: new Date().toISOString() } });
        const u = getUser(a.userId);
        notify(u?.supervisorId, 'Evaluación práctica por aprobar', `${u?.name} aprobó la teoría de «${plan.name}» y espera su evaluación práctica.`, 'warning');
      } else cert = issueCertificate(fresh);
    } else cert = issueCertificate(fresh);
  }
  return { score, passed, cert };
}

export function decidePractical(aId, ok, notes, byId) {
  const a = db.get('assignments', aId);
  if (!a) return;
  const plan = getPlan(a.planId);
  db.update('assignments', aId, { practical: { ...a.practical, status: ok ? 'aprobada' : 'rechazada', by: byId, at: new Date().toISOString(), notes } });
  db.log(ok ? 'evaluación práctica aprobada' : 'evaluación práctica rechazada', `${getUser(a.userId)?.name} · ${plan.name}`, byId);
  if (ok) issueCertificate(db.get('assignments', aId));
  else {
    db.update('assignments', aId, { quizPassed: false });
    notify(a.userId, 'Evaluación práctica rechazada', `Debes reforzar los contenidos de «${plan.name}» y volver a rendir la evaluación. Observación: ${notes || '—'}`, 'danger');
  }
}

export function activeAssignment(userId, planId) {
  return db.find('assignments', a => a.userId === userId && a.planId === planId && !a.completedAt && !a.cancelled);
}
export function assignPlan(userId, planId, byId, dueDays) {
  const plan = getPlan(planId);
  if (!plan) return null;
  if (activeAssignment(userId, planId)) return null;
  const now = Date.now();
  const a = db.insert('assignments', { userId, planId, assignedBy: byId, assignedAt: new Date(now).toISOString(), dueAt: new Date(now + (dueDays || plan.deadlineDays) * DAY).toISOString(), progress: {}, time: {}, quizPassed: false, bestScore: 0, practical: plan.practical ? { status: 'no_iniciada' } : null });
  notify(userId, 'Nueva inducción asignada', `Se te asignó «${plan.name}». Plazo: ${dueDays || plan.deadlineDays} días.`, 'info');
  return a;
}

export const workers = () => db.query('users', u => u.role === 'trabajador');
export const rate = (n, d) => (d ? Math.round(n / d * 100) : 0);
