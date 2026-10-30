// Reglas académicas (promedios escala 1,0–7,0, asistencia, riesgo) y vistas reutilizables.
import { db } from '../data/db.js';
import { escape, date as fmtDate } from '../../../assets/core/ui.js';
import { BLOCKS, DAYS, BREAK_AFTER, NOW, ymd, SUBJECT_TONES, currentSemester, monthLabel, YEAR } from './school.js';

export const site = () => db.getValue('site', {});
export const subject = id => db.get('subjects', id) || { id, name: id, short: id, code: '?' };
export const course = id => db.get('courses', id) || { id, name: '—' };
export const student = id => db.get('students', id);
export const user = id => db.get('users', id);
export const fullName = s => s ? `${s.firstName} ${s.lastName} ${s.lastName2 || ''}`.trim() : '—';
export const shortName = s => s ? `${s.firstName} ${s.lastName}` : '—';
export const subjectTone = id => { const i = db.all('subjects').findIndex(s => s.id === id); return SUBJECT_TONES[(i < 0 ? 0 : i) % SUBJECT_TONES.length]; };

export const courseStudents = (courseId, all = false) => db.query('students', s => s.courseId === courseId && (all || s.status === 'activo'))
  .sort((a, b) => (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName, 'es'));
export const courseSubjects = courseId => db.query('teaching', t => t.courseId === courseId).map(t => ({ ...t, subject: subject(t.subjectId) }))
  .sort((a, b) => db.all('subjects').findIndex(s => s.id === a.subjectId) - db.all('subjects').findIndex(s => s.id === b.subjectId));
export const teacherLoad = teacherId => db.query('teaching', t => t.teacherId === teacherId);
export const teacherCourseIds = teacherId => [...new Set([...teacherLoad(teacherId).map(t => t.courseId), ...db.query('courses', c => c.headTeacherId === teacherId).map(c => c.id)])]
  .sort((a, b) => course(a).grade - course(b).grade);
export const sortedCourses = () => db.all('courses').sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name));

// ---------- Notas ----------
const round1 = v => Math.round(v * 10 + 1e-9) / 10;
export const fmtGrade = v => (v == null || isNaN(v) ? '—' : v.toFixed(1).replace('.', ','));
export const gradeCls = v => (v == null ? '' : v < 4 ? 'grade-low' : v >= 6 ? 'grade-high' : '');
export const gradeSpan = v => `<span class="grade ${gradeCls(v)}">${fmtGrade(v)}</span>`;

export const evalsOf = (courseId, subjectId, sem) => db.query('evaluations', e => e.courseId === courseId && (!subjectId || e.subjectId === subjectId) && (!sem || e.semester === sem))
  .sort((a, b) => a.date.localeCompare(b.date));

export function weighted(evals, studentId) {
  let sw = 0, s = 0;
  evals.forEach(e => { const v = e.scores?.[studentId]; if (v != null) { s += v * e.weight; sw += e.weight; } });
  return sw ? round1(s / sw) : null;
}
export function subjectAvg(studentId, subjectId, sem, courseId = student(studentId)?.courseId) {
  if (sem === 'anual') {
    const a = [1, 2].map(x => subjectAvg(studentId, subjectId, x, courseId)).filter(v => v != null);
    return a.length ? round1(a.reduce((p, c) => p + c, 0) / a.length) : null;
  }
  return weighted(evalsOf(courseId, subjectId, sem), studentId);
}
export function generalAvg(studentId, sem = 'anual') {
  const s = student(studentId); if (!s) return null;
  const vals = courseSubjects(s.courseId).map(t => subjectAvg(studentId, t.subjectId, sem, s.courseId)).filter(v => v != null);
  return vals.length ? round1(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
}
export function courseAvg(courseId, subjectId = null, sem = 'anual') {
  const vals = courseStudents(courseId).map(s => subjectId ? subjectAvg(s.id, subjectId, sem, courseId) : generalAvg(s.id, sem)).filter(v => v != null);
  return vals.length ? round1(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
}

// ---------- Asistencia ----------
export function attendanceOf(studentId) {
  const s = student(studentId); if (!s) return { pct: null, days: 0, absent: 0, late: 0, byMonth: {} };
  const byMonth = {};
  let days = 0, absent = 0, late = 0;
  db.query('attendance', a => a.studentId === studentId).forEach(a => {
    days += a.days; absent += a.absent; late += a.late;
    byMonth[a.month] = { days: a.days, absent: a.absent };
  });
  const perDay = {};
  db.query('sessions', x => x.courseId === s.courseId).forEach(x => {
    const d = perDay[x.date] ||= { blocks: 0, a: 0, t: 0 };
    d.blocks++; const m = x.abs?.[studentId]; if (m === 'A') d.a++; if (m === 'T') d.t++;
  });
  Object.entries(perDay).forEach(([day, v]) => {
    const month = day.slice(0, 7);
    const isAbs = v.a > v.blocks / 2;
    const bm = byMonth[month] ||= { days: 0, absent: 0 };
    if (!bm.fromSessions && bm.days && db.find('attendance', a => a.studentId === studentId && a.month === month)) return; // mes ya resumido
    bm.fromSessions = true; bm.days++; days++;
    if (isAbs) { bm.absent++; absent++; }
    if (v.t) late++;
  });
  return { pct: days ? ((days - absent) / days) * 100 : null, days, absent, late, byMonth };
}
export const pctTxt = v => (v == null ? '—' : `${v.toFixed(1).replace('.', ',')}%`);

export function riskOf(studentId) {
  const s = student(studentId);
  const reds = courseSubjects(s.courseId).filter(t => { const v = subjectAvg(studentId, t.subjectId, 'anual', s.courseId); return v != null && v < 4; }).length;
  const avg = generalAvg(studentId), att = attendanceOf(studentId).pct;
  const reasons = [];
  if (reds >= 1) reasons.push(`${reds} asignatura${reds > 1 ? 's' : ''} bajo 4,0`);
  if (avg != null && avg < 4.5) reasons.push(`promedio ${fmtGrade(avg)}`);
  if (att != null && att < 85) reasons.push(`asistencia ${pctTxt(att)}`);
  const level = (reds >= 2 || (att != null && att < 85 && reds >= 1)) ? 'alto' : reasons.length ? 'medio' : null;
  return { level, reasons, reds, avg, att };
}

// ---------- Horario ----------
export function scheduleGrid(courseId, { teacherId = null, highlightToday = true, editable = false } = {}) {
  const rows = db.query('schedule', x => (courseId ? x.courseId === courseId : x.teacherId === teacherId));
  const today = (NOW.getDay() + 6) % 7;
  const cell = (day, b) => {
    const list = rows.filter(x => x.day === day && x.block === b && (!teacherId || x.teacherId === teacherId));
    if (!list.length) return `<td class="sched-cell empty-cell" ${editable ? `data-cell="${day}|${b}"` : ''}>${editable ? '<span class="muted small">+ Asignar</span>' : ''}</td>`;
    const x = list[0], s = subject(x.subjectId), t = user(x.teacherId);
    return `<td class="sched-cell" ${editable ? `data-cell="${day}|${b}"` : ''} style="--tone:${subjectTone(x.subjectId)}"><b>${escape(s.short)}</b><span class="small muted">${escape(teacherId ? course(x.courseId).name : (t?.name || '—'))}</span>${x.conflict ? '<span class="badge badge-danger plain">Choque</span>' : ''}</td>`;
  };
  return `<div class="table-wrap sched-wrap"><table class="table sched"><thead><tr><th>Bloque</th>${DAYS.map((d, i) => `<th class="${highlightToday && i === today ? 'is-today' : ''}">${d}</th>`).join('')}</tr></thead><tbody>
    ${BLOCKS.map(([a, b], bi) => `<tr><th scope="row" class="sched-time">${bi + 1}<small>${a}–${b}</small></th>${DAYS.map((_, di) => cell(di, bi)).join('')}</tr>${BREAK_AFTER[bi] ? `<tr class="sched-break"><td colspan="6">${BREAK_AFTER[bi]}</td></tr>` : ''}`).join('')}
  </tbody></table></div>`;
}

// ---------- Tabla de notas de un estudiante ----------
export function gradesTable(studentId, sem) {
  const s = student(studentId);
  const subs = courseSubjects(s.courseId);
  const maxN = Math.max(1, ...subs.map(t => evalsOf(s.courseId, t.subjectId, sem).length));
  const rows = subs.map(t => {
    const ev = evalsOf(s.courseId, t.subjectId, sem);
    const avg = subjectAvg(studentId, t.subjectId, sem, s.courseId);
    return `<tr><th scope="row"><span class="dot-tone" style="--tone:${subjectTone(t.subjectId)}"></span>${escape(t.subject.short)}</th>
      ${Array.from({ length: maxN }, (_, i) => { const e = ev[i]; if (!e) return '<td></td>'; const v = e.scores?.[studentId]; return `<td title="${escape(e.name)} · ${e.weight}% · ${fmtDate(e.date)}">${v != null ? gradeSpan(v) : `<span class="muted small">${e.status === 'programada' ? fmtDate(e.date, { day: '2-digit', month: 'short' }) : '·'}</span>`}</td>`; }).join('')}
      <td class="avg-col">${gradeSpan(avg)}</td></tr>`;
  }).join('');
  const gen = generalAvg(studentId, sem);
  return `<div class="table-wrap"><table class="table grades"><thead><tr><th>Asignatura</th>${Array.from({ length: maxN }, (_, i) => `<th>N${i + 1}</th>`).join('')}<th class="avg-col">Prom.</th></tr></thead>
    <tbody>${rows}</tbody><tfoot><tr><th>Promedio general</th><td colspan="${maxN}"></td><td class="avg-col">${gradeSpan(gen)}</td></tr></tfoot></table></div>`;
}

// ---------- Informe de notas imprimible ----------
export function reportCard(studentId) {
  const s = student(studentId), c = course(s.courseId), st = site(), att = attendanceOf(studentId);
  const head = user(c.headTeacherId);
  const subs = courseSubjects(s.courseId);
  const rows = subs.map(t => {
    const a = subjectAvg(studentId, t.subjectId, 1, s.courseId), b = subjectAvg(studentId, t.subjectId, 2, s.courseId), f = subjectAvg(studentId, t.subjectId, 'anual', s.courseId);
    return `<tr><td>${escape(t.subject.name)}</td><td>${gradeSpan(a)}</td><td>${gradeSpan(b)}</td><td><b>${gradeSpan(f)}</b></td></tr>`;
  }).join('');
  const anns = db.query('annotations', a => a.studentId === studentId);
  return `<article class="report-card">
    <header class="rc-head"><div class="rc-seal" aria-hidden="true">${seal()}</div><div><h2>${escape(st.name)}</h2><p class="muted">Informe de Notas · Año escolar ${YEAR} · Emitido el ${fmtDate(NOW)}</p></div></header>
    <dl class="rc-meta">
      <div><dt>Estudiante</dt><dd>${escape(fullName(s))}</dd></div><div><dt>RUT</dt><dd>${escape(s.rut)}</dd></div>
      <div><dt>Curso</dt><dd>${escape(c.name)}</dd></div><div><dt>Profesor/a jefe</dt><dd>${escape(head?.name || '—')}</dd></div>
    </dl>
    <table class="table rc-table"><thead><tr><th>Asignatura</th><th>1° Sem.</th><th>2° Sem.</th><th>Final</th></tr></thead><tbody>${rows}</tbody>
      <tfoot><tr><th>Promedio general</th><td>${gradeSpan(generalAvg(studentId, 1))}</td><td>${gradeSpan(generalAvg(studentId, 2))}</td><td><b>${gradeSpan(generalAvg(studentId))}</b></td></tr></tfoot></table>
    <div class="rc-foot"><p><b>Asistencia:</b> ${pctTxt(att.pct)} (${att.days - att.absent} de ${att.days} días) · <b>Anotaciones:</b> ${anns.filter(a => a.type === 'positiva').length} positivas, ${anns.filter(a => a.type === 'negativa').length} negativas</p>
      <p class="small muted">Escala de notas de 1,0 a 7,0. Nota mínima de aprobación 4,0. Documento generado por ${escape(st.platform)}.</p>
      <div class="rc-sign"><span>${escape(head?.name || '')}<br><small>Profesor/a jefe</small></span><span>${escape(db.find('users', u => u.role === 'admin')?.name || '')}<br><small>Dirección</small></span></div></div>
  </article>`;
}

// Sello/escudo ilustrado con tokens.
export function seal(size = 44) {
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true"><path d="M32 4l24 8v18c0 15-10 25-24 30C18 55 8 45 8 30V12z" fill="var(--primary)" stroke="var(--text)" stroke-width="2"/><path d="M32 16c-6 6-10 12-10 18a10 10 0 0020 0c0-6-4-12-10-18z" fill="var(--on-primary)"/><path d="M32 22v24M26 34l6 4 6-4" stroke="var(--primary)" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`;
}

// ---------- Tareas, comunicados ----------
export const homeworkOf = courseId => db.query('homework', h => h.courseId === courseId).sort((a, b) => a.due.localeCompare(b.due));
export function hwStatus(h, studentId) {
  const sub = h.submissions?.[studentId];
  const today = ymd(NOW);
  if (sub?.grade != null) return ['Revisada', 'success', sub];
  if (sub) return [sub.status === 'atrasada' ? 'Entregada con atraso' : 'Entregada', sub.status === 'atrasada' ? 'warning' : 'info', sub];
  if (h.due < today) return ['No entregada', 'danger', null];
  if (h.due === today) return ['Vence hoy', 'warning', null];
  return ['Pendiente', 'primary', null];
}
export function commsFor(guardianOrStudentCourses) {
  const courses = guardianOrStudentCourses.map(course);
  return db.query('communications', c => c.status === 'publicado' && (c.audience === 'todos' || (c.audience === 'curso' && courses.some(x => x.id === c.target)) || (c.audience === 'nivel' && courses.some(x => x.level === c.target))))
    .sort((a, b) => b.at.localeCompare(a.at));
}
export const audienceLabel = c => c.audience === 'todos' ? 'Toda la comunidad' : c.audience === 'curso' ? course(c.target).name : ({ parvularia: 'Ed. Parvularia', basica: 'Ed. Básica', media: 'Ed. Media' }[c.target] || c.target);
export function audienceGuardians(c) {
  const kids = db.query('students', s => s.status === 'activo' && (c.audience === 'todos' || (c.audience === 'curso' && s.courseId === c.target) || (c.audience === 'nivel' && course(s.courseId).level === c.target)));
  return [...new Set(kids.map(k => k.guardianId))];
}

export const annBadge = t => t === 'positiva' ? '<span class="badge badge-success">Positiva</span>' : t === 'negativa' ? '<span class="badge badge-danger">Negativa</span>' : '<span class="badge badge-info">Observación</span>';
export const months = () => { const out = []; for (let m = 3; m <= Math.min(12, NOW.getMonth() + 1); m++) out.push(`${YEAR}-${String(m).padStart(2, '0')}`); return out; };
export { monthLabel, currentSemester };
