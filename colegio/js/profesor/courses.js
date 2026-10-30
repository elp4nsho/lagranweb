// Mis cursos (profesor): tarjetas por curso y nómina con promedios y asistencia.
import { escape } from '../../../assets/core/ui.js';
import { pageHead, badge, smartTable, avatar } from '../shared/kit.js';
import { course, subject, teacherCourseIds, courseStudents, courseAvg, subjectAvg, generalAvg, attendanceOf, gradeSpan, pctTxt, fullName, riskOf, user } from '../shared/academic.js';
import { LEVELS } from '../shared/school.js';
import { annotationModal } from '../admin/students.js';

export function renderCourses(el, { db, me }) {
  const ids = teacherCourseIds(me.id);
  el.innerHTML = `${pageHead('Mis cursos', `${ids.length} cursos este año`)}
    <div class="grid-auto">${ids.map(id => {
      const c = course(id), mine = db.query('teaching', t => t.courseId === id && t.teacherId === me.id);
      return `<a class="card hover" href="#/cursos/${id}" style="text-decoration:none;color:inherit">
        <div class="row between"><h3 class="mb-0">${escape(c.name)}</h3>${c.headTeacherId === me.id ? badge('Jefatura', 'primary') : ''}</div>
        <p class="small muted">${LEVELS[c.level]} · ${escape(c.room || '')} · ${courseStudents(id).length} estudiantes</p>
        <div class="row" style="gap:6px">${mine.map(t => `<span class="chip">${escape(subject(t.subjectId).short)} · ${gradeSpan(courseAvg(id, t.subjectId))}</span>`).join('') || '<span class="small muted">Solo jefatura</span>'}</div>
      </a>`;
    }).join('')}</div>`;
}

export function renderCourse(el, { db, me }, { id }) {
  const c = db.get('courses', id);
  const mine = db.query('teaching', t => t.courseId === id && t.teacherId === me.id);
  const isHead = c?.headTeacherId === me.id;
  if (!c || (!mine.length && !isHead)) { el.innerHTML = '<div class="empty">No tienes acceso a este curso.</div>'; return; }
  const sid = mine[0]?.subjectId;
  const rows = courseStudents(id).map((s, i) => ({ ...s, n: i + 1, name: fullName(s), mineAvg: sid ? subjectAvg(s.id, sid, 'anual', id) : null, gen: generalAvg(s.id), att: attendanceOf(s.id).pct, risk: riskOf(s.id).level }));
  el.innerHTML = `
    ${pageHead(c.name, `${isHead ? 'Profesor/a jefe · ' : ''}${mine.map(t => subject(t.subjectId).short).join(', ')}`, `<a class="btn btn-ghost btn-sm" href="#/cursos">← Mis cursos</a>${sid ? `<a class="btn btn-sm" href="#/libro?curso=${id}&asig=${sid}">📘 Libro</a><a class="btn btn-sm btn-primary" href="#/notas?curso=${id}&asig=${sid}">✓ Notas</a>` : ''}`)}
    <div class="card" data-t></div>`;
  smartTable(el.querySelector('[data-t]'), {
    id: 'p-course-' + id, rows, pageSize: 20, search: r => r.name,
    columns: [
      { key: 'n', label: 'N°' },
      { key: 'name', label: 'Estudiante', render: r => `<div class="cell-user">${avatar({ name: r.firstName + ' ' + r.lastName, color: 'var(--accent)' }, 30)}<span><b>${escape(r.name)}</b><small>Apoderado/a: ${escape(user(r.guardianId)?.name || '—')}</small></span></div>` },
      ...(sid ? [{ key: 'mineAvg', label: `Prom. ${subject(sid).short}`, render: r => gradeSpan(r.mineAvg) }] : []),
      ...(isHead ? [{ key: 'gen', label: 'Prom. general', render: r => gradeSpan(r.gen) }] : []),
      { key: 'att', label: 'Asistencia', render: r => `<span class="${r.att < 85 ? 'text-danger' : ''}">${pctTxt(r.att)}</span>` },
      { key: 'risk', label: 'Alerta', render: r => r.risk ? badge(r.risk === 'alto' ? 'Riesgo alto' : 'Riesgo medio', r.risk === 'alto' ? 'danger' : 'warning') : '' },
      { key: 'x', label: '', sort: false, render: () => '<div class="actions"><button class="btn btn-sm btn-ghost" data-act="ann">+ Anotación</button></div>' }
    ],
    onAction: (act, r) => annotationModal(db, me, db.get('students', r.id), { subjectId: sid })
  });
}
