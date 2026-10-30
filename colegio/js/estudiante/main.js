// App del estudiante: inicio, horario, tareas (con entrega), notas y asistencia.
import { bootRoleApp } from '../shared/roleapp.js';
import { renderSummary, renderGrades, renderAttendance, renderSchedule, renderHomework } from '../apoderado/academic.js';
import { homeworkOf } from '../shared/academic.js';
import { NOW, ymd } from '../shared/school.js';

const withSelf = fn => (el, ctx, p, q) => {
  const s = ctx.db.get('students', ctx.me.studentId);
  if (!s) { el.innerHTML = '<div class="card empty">Tu cuenta no está vinculada a una ficha de estudiante. Contacta a secretaría.</div>'; return; }
  return fn(el, { ...ctx, child: s, kids: [s] }, p, q);
};

bootRoleApp({
  roles: ['estudiante'], sub: 'Estudiante',
  pages: [
    { path: '/', label: 'Inicio', ico: '⌂', render: withSelf(renderSummary) },
    { path: '/horario', label: 'Mi horario', ico: '⌚', render: withSelf(renderSchedule) },
    { path: '/tareas', label: 'Tareas', ico: '✎', render: withSelf(renderHomework), count: ({ db, me }) => { const s = db.get('students', me.studentId); return s ? homeworkOf(s.courseId).filter(h => h.due >= ymd(NOW) && !h.submissions?.[s.id]).length : 0; } },
    { path: '/notas', label: 'Mis notas', ico: '✓', render: withSelf(renderGrades) },
    { path: '/asistencia', label: 'Asistencia', ico: '◔', render: withSelf(renderAttendance) }
  ]
});
