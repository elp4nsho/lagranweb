// Anotaciones (hoja de vida): registro positivo/negativo por estudiante.
import { escape, date, toast, confirm as ask, modal } from '../../../assets/core/ui.js';
import { pageHead, smartTable, formData } from '../shared/kit.js';
import { course, subject, courseStudents, fullName, teacherCourseIds, annBadge, student } from '../shared/academic.js';
import { annotationModal } from '../admin/students.js';

export function renderAnnotations(el, { db, me }) {
  const ids = teacherCourseIds(me.id);
  const rows = db.query('annotations', a => a.teacherId === me.id || (a.by === me.id)).map(a => ({ ...a, name: fullName(student(a.studentId)), courseName: course(a.courseId).name }));
  el.innerHTML = `${pageHead('Anotaciones', 'Registra conductas positivas, negativas u observaciones. El apoderado/a es notificado en su app.', '<button class="btn btn-primary btn-sm" data-new>+ Nueva anotación</button>')}<div class="card" data-t></div>`;
  smartTable(el.querySelector('[data-t]'), {
    id: 'p-ann', rows, search: r => r.name + r.text,
    filters: [{ key: 'courseId', label: 'Curso', options: ids.map(c => [c, course(c).name]) }, { key: 'type', label: 'Tipo', options: [['positiva', 'Positiva'], ['negativa', 'Negativa'], ['observacion', 'Observación']] }],
    columns: [
      { key: 'date', label: 'Fecha', render: r => `<span class="nowrap small">${date(r.date + 'T12:00')}</span>` },
      { key: 'name', label: 'Estudiante', render: r => `<b>${escape(r.name)}</b><div class="small muted">${escape(r.courseName)} · ${escape(subject(r.subjectId).short)}</div>` },
      { key: 'type', label: 'Tipo', render: r => annBadge(r.type) },
      { key: 'text', label: 'Descripción', render: r => `<span class="small">${escape(r.text)}</span>` },
      { key: 'seenByGuardian', label: 'Apoderado', render: r => r.seenByGuardian ? '<span class="small text-success">✓ Vista</span>' : '<span class="small muted">No vista</span>' },
      { key: 'x', label: '', sort: false, render: () => '<div class="actions"><button class="btn btn-sm btn-ghost" data-act="del" aria-label="Eliminar">🗑</button></div>' }
    ],
    onAction: async (act, r) => { if (await ask('¿Eliminar esta anotación?', { danger: true, ok: 'Eliminar' })) { db.remove('annotations', r.id); db.log('anotacion', `Anotación eliminada (${r.name})`, me.id); toast('Anotación eliminada', 'success'); } }
  });
  el.querySelector('[data-new]').onclick = () => {
    const m = modal({
      title: 'Elegir estudiante', body: `<form class="stack"><div class="field"><label for="pa-s">Estudiante</label><select class="select" id="pa-s" name="sid">${ids.map(c => `<optgroup label="${escape(course(c).name)}">${courseStudents(c).map(s => `<option value="${s.id}">${escape(fullName(s))}</option>`).join('')}</optgroup>`).join('')}</select></div></form>`,
      foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Continuar</button>'
    });
    m.el.querySelector('[data-ok]').onclick = () => { const { sid } = formData(m.el.querySelector('form')); m.close(); setTimeout(() => annotationModal(db, me, db.get('students', sid)), 50); };
  };
}
