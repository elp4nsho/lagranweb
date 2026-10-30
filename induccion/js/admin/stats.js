// Cálculos agregados para dashboard y reportes.
import { db } from '../data/db.js';
import { getUser, getCompany, assignmentStatus, certStatus, rate, modulesSorted } from '../data/model.js';

export function groupCompletion(keyFn, labelFn = k => k) {
  const g = {};
  db.query('assignments', a => !a.cancelled).forEach(a => {
    const u = getUser(a.userId); if (!u) return;
    const k = keyFn(u, a); if (k == null) return;
    const o = g[k] || (g[k] = { key: k, label: labelFn(k), total: 0, done: 0, overdue: 0, workers: new Set() });
    o.total++; o.workers.add(u.id);
    const st = assignmentStatus(a);
    if (st === 'completada') o.done++;
    if (st === 'vencida') o.overdue++;
  });
  return Object.values(g).map(o => ({ ...o, workers: o.workers.size, pct: rate(o.done, o.total) })).sort((a, b) => b.pct - a.pct);
}
export const byArea = () => groupCompletion(u => u.area);
export const byCompany = () => groupCompletion(u => u.companyId, k => getCompany(k)?.name || '—');
export const byPlan = () => groupCompletion((u, a) => a.planId, k => db.get('plans', k)?.name || '—');

export function avgTimePerModule() {
  return modulesSorted().filter(m => m.mode !== 'quiz').map(m => {
    const vals = db.all('assignments').map(a => a.time?.[m.id]).filter(v => v > 0);
    return { id: m.id, label: m.title, value: vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 10) / 10 : 0, expected: m.minutes, n: vals.length };
  });
}
export function passStats() {
  const at = db.all('attempts');
  const passed = at.filter(t => t.passed).length;
  const firstTry = {};
  at.slice().sort((a, b) => new Date(a.at) - new Date(b.at)).forEach(t => { if (!(t.assignmentId in firstTry)) firstTry[t.assignmentId] = t.passed; });
  const ft = Object.values(firstTry);
  return { total: at.length, passed, rate: rate(passed, at.length), firstTry: rate(ft.filter(Boolean).length, ft.length), avg: at.length ? Math.round(at.reduce((s, t) => s + t.score, 0) / at.length) : 0 };
}
export function statusCounts() {
  const c = { completada: 0, practica: 0, en_curso: 0, pendiente: 0, vencida: 0, cancelada: 0 };
  db.all('assignments').forEach(a => { c[assignmentStatus(a)]++; });
  return c;
}
export function certCounts() {
  const c = { vigente: 0, por_vencer: 0, vencido: 0, revocado: 0 };
  db.all('certificates').forEach(x => { c[certStatus(x)]++; });
  return c;
}
export const miniBars = rows => `<div class="mini-bars">${rows.map(r => `<div class="row" title="${r.label}: ${r.pct}% (${r.done}/${r.total})"><span>${r.label}</span><span class="progress"><i style="--v:${r.pct}%"></i></span><b class="small">${r.pct}%</b></div>`).join('')}</div>`;
