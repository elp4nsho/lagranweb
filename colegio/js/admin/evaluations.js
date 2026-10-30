// Calendario de evaluaciones: vista mensual + listado con CRUD y control de ponderaciones.
import { escape, modal, toast, confirm as ask, downloadCSV, date } from '../../../assets/core/ui.js';
import { pageHead, smartTable, badge, monthCalendar, formData } from '../shared/kit.js';
import { sortedCourses, courseSubjects, subject, course, user } from '../shared/academic.js';
import { NOW, semesterOf } from '../shared/school.js';

const ST = { programada: ['Programada', 'info'], pendiente: ['Notas pendientes', 'warning'], calificada: ['Calificada', 'success'] };
export const TYPES = ['Prueba', 'Control', 'Trabajo', 'Disertación', 'Evaluación práctica', 'Proyecto'];

export function evalModal(db, me, e = null, { courseIds = null, teacherId = null, preset = {} } = {}) {
  const courses = sortedCourses().filter(c => !courseIds || courseIds.includes(c.id));
  const m = modal({
    title: e ? 'Editar evaluación' : 'Programar evaluación',
    body: `<form class="form-grid" novalidate>
      <div class="field"><label for="ev-c">Curso</label><select class="select" id="ev-c" name="courseId">${courses.map(c => `<option value="${c.id}" ${(e?.courseId || preset.courseId) === c.id ? 'selected' : ''}>${escape(c.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="ev-s">Asignatura</label><select class="select" id="ev-s" name="subjectId"></select></div>
      <div class="field full"><label for="ev-n">Nombre *</label><input class="input" id="ev-n" name="name" required value="${escape(e?.name || '')}" placeholder="Ej: Prueba 3: Funciones lineales"></div>
      <div class="field"><label for="ev-t">Tipo</label><select class="select" id="ev-t" name="type">${TYPES.map(t => `<option ${e?.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="field"><label for="ev-d">Fecha *</label><input class="input" id="ev-d" name="date" type="date" required value="${escape(e?.date || preset.date || '')}"></div>
      <div class="field"><label for="ev-w">Ponderación (%) *</label><input class="input" id="ev-w" name="weight" type="number" min="1" max="100" required value="${e?.weight ?? 25}"></div>
      <div class="field"><span class="label">Semestre</span><p class="mb-0" data-sem></p></div>
    </form>`,
    foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-save>Guardar</button>'
  });
  const f = m.el.querySelector('form');
  const fill = () => {
    const subs = courseSubjects(f.elements.courseId.value).filter(t => !teacherId || t.teacherId === teacherId);
    f.elements.subjectId.innerHTML = subs.map(t => `<option value="${t.subjectId}" ${(e?.subjectId || preset.subjectId) === t.subjectId ? 'selected' : ''}>${escape(t.subject.name)}</option>`).join('');
  };
  const semTxt = () => { m.el.querySelector('[data-sem]').textContent = f.elements.date.value ? `${semesterOf(f.elements.date.value + 'T12:00')}° semestre` : '—'; };
  f.elements.courseId.onchange = fill; f.elements.date.oninput = semTxt; fill(); semTxt();
  m.el.querySelector('[data-save]').onclick = () => {
    const v = formData(f);
    let ok = true;
    f.querySelectorAll('[required]').forEach(i => { const bad = !i.value.trim(); i.classList.toggle('invalid', bad); if (bad) ok = false; });
    if (!v.subjectId) ok = false;
    if (!ok) return toast('Completa los campos obligatorios', 'warning');
    v.weight = Number(v.weight);
    v.semester = semesterOf(v.date + 'T12:00');
    v.teacherId = db.get('teaching', `${v.courseId}|${v.subjectId}`)?.teacherId || teacherId;
    if (e) db.update('evaluations', e.id, v);
    else db.insert('evaluations', { ...v, status: new Date(v.date + 'T23:59') < NOW ? 'pendiente' : 'programada', scores: {} });
    const sum = db.query('evaluations', x => x.courseId === v.courseId && x.subjectId === v.subjectId && x.semester === v.semester).reduce((a, x) => a + x.weight, 0);
    db.log('evaluacion', `${e ? 'Editada' : 'Programada'}: ${v.name} (${course(v.courseId).name})`, me.id);
    toast(sum !== 100 ? `Guardada. Ojo: las ponderaciones del semestre suman ${sum}%` : 'Evaluación guardada', sum !== 100 ? 'warning' : 'success');
    m.close();
  };
}

let month = null, fCourse = '';
export function render(el, { db, me, isAdmin }) {
  month ||= new Date(NOW.getFullYear(), NOW.getMonth(), 1);
  const courses = sortedCourses();
  const all = db.all('evaluations');
  const rows = all.map(e => ({ ...e, courseName: course(e.courseId).name, grade: course(e.courseId).grade, subjectName: subject(e.subjectId).short, teacher: user(e.teacherId)?.name || '—' }));
  const evs = rows.filter(e => !fCourse || e.courseId === fCourse);
  el.innerHTML = `
    ${pageHead('Evaluaciones', `${all.filter(e => e.status === 'programada').length} programadas · ${all.filter(e => e.status === 'pendiente').length} con notas pendientes`, `<button class="btn btn-ghost btn-sm" data-csv>⭳ CSV</button><button class="btn btn-primary btn-sm" data-new>+ Programar evaluación</button>`)}
    <div class="card">
      <div class="row between" style="margin-bottom:10px">
        <div class="row" style="gap:6px"><button class="btn btn-sm" data-m="-1" aria-label="Mes anterior">←</button><button class="btn btn-sm" data-m="0">Hoy</button><button class="btn btn-sm" data-m="1" aria-label="Mes siguiente">→</button></div>
        <select class="select" data-fc style="max-width:220px" aria-label="Filtrar curso"><option value="">Todos los cursos</option>${courses.map(c => `<option value="${c.id}" ${fCourse === c.id ? 'selected' : ''}>${escape(c.name)}</option>`).join('')}</select>
      </div>
      ${monthCalendar(month.getFullYear(), month.getMonth(), evs.map(e => ({ date: e.date, label: `${e.subjectName} ${e.courseName.replace(' Básico', '°B').replace(' Medio', 'M').replace('°°', '°')}`, kind: e.type === 'Prueba' || e.type === 'Control' ? e.type : 'extra' })))}
      <p class="small muted" style="margin-top:8px">Haz clic en un día para programar una evaluación en esa fecha.</p>
    </div>
    <div class="card" data-t></div>`;
  smartTable(el.querySelector('[data-t]'), {
    id: 'evals', rows: evs, pageSize: 10, search: r => r.name + r.courseName + r.subjectName + r.teacher,
    filters: [{ key: 'status', label: 'Estado', options: Object.entries(ST).map(([k, v]) => [k, v[0]]) }, { key: 'semester', label: 'Semestre', options: [['1', '1° semestre'], ['2', '2° semestre']] }, { key: 'subjectId', label: 'Asignatura', options: db.all('subjects').map(s => [s.id, s.short]) }],
    columns: [
      { key: 'date', label: 'Fecha', render: r => `<span class="nowrap">${date(r.date + 'T12:00')}</span>` },
      { key: 'courseName', label: 'Curso', sort: r => r.grade }, { key: 'subjectName', label: 'Asignatura' },
      { key: 'name', label: 'Evaluación', render: r => `<b>${escape(r.name)}</b><div class="small muted">${escape(r.type)} · ${escape(r.teacher)}</div>` },
      { key: 'weight', label: 'Pond.', render: r => `${r.weight}%` },
      { key: 'status', label: 'Estado', render: r => badge(...ST[r.status]) },
      { key: 'x', label: '', sort: false, render: () => `<div class="actions"><button class="btn btn-sm btn-ghost" data-act="edit">Editar</button><button class="btn btn-sm btn-ghost" data-act="del" aria-label="Eliminar">🗑</button></div>` }
    ],
    onAction: async (act, r) => {
      if (act === 'edit') return evalModal(db, me, db.get('evaluations', r.id));
      const n = Object.keys(r.scores || {}).length;
      if (n && !isAdmin) return toast('Solo Dirección puede eliminar evaluaciones con notas registradas', 'warning');
      if (await ask(`¿Eliminar "${r.name}"?${n ? ` Se borrarán ${n} notas.` : ''}`, { danger: true, ok: 'Eliminar' })) { db.remove('evaluations', r.id); db.log('evaluacion', `Eliminada: ${r.name} (${r.courseName})`, me.id); toast('Evaluación eliminada', 'success'); }
    }
  });
  el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { month = +b.dataset.m === 0 ? new Date(NOW.getFullYear(), NOW.getMonth(), 1) : new Date(month.getFullYear(), month.getMonth() + +b.dataset.m, 1); render(el, { db, me, isAdmin }); });
  el.querySelector('[data-fc]').onchange = e => { fCourse = e.target.value; render(el, { db, me, isAdmin }); };
  el.querySelectorAll('.cal-cell[data-date]').forEach(c => c.addEventListener('click', () => evalModal(db, me, null, { preset: { date: c.dataset.date, courseId: fCourse } })));
  el.querySelector('[data-new]').onclick = () => evalModal(db, me);
  el.querySelector('[data-csv]').onclick = () => downloadCSV('evaluaciones.csv', evs.map(r => ({ fecha: r.date, curso: r.courseName, asignatura: r.subjectName, evaluacion: r.name, tipo: r.type, ponderacion: r.weight, estado: ST[r.status][0], docente: r.teacher })));
}
