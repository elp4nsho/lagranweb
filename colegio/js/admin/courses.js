// Cursos y secciones: CRUD, detalle con nómina, asignación docente y promedios.
import { escape, formModal, toast, confirm as ask, downloadCSV } from '../../../assets/core/ui.js';
import { pageHead, smartTable, badge, avatar } from '../shared/kit.js';
import { sortedCourses, courseStudents, courseSubjects, courseAvg, user, subject, fullName, generalAvg, attendanceOf, gradeSpan, pctTxt, riskOf, scheduleGrid } from '../shared/academic.js';
import { LEVELS, YEAR } from '../shared/school.js';

const teachersOpts = db => db.query('users', u => u.role === 'profesor' && u.active !== false).map(u => [u.id, u.name]);

async function edit(db, me, c = null) {
  const v = await formModal({
    title: c ? `Editar ${c.name}` : 'Nuevo curso', fields: [
      { name: 'name', label: 'Nombre del curso', required: true, value: c?.name, placeholder: 'Ej: 3° Básico B' },
      { name: 'level', label: 'Nivel', type: 'select', options: Object.entries(LEVELS), value: c?.level || 'basica' },
      { name: 'grade', label: 'Grado (0 = Kínder, 1–8 Básica, 9–12 Media)', type: 'number', value: c?.grade ?? 1, required: true },
      { name: 'room', label: 'Sala', value: c?.room },
      { name: 'headTeacherId', label: 'Profesor/a jefe', type: 'select', options: teachersOpts(db), value: c?.headTeacherId },
      { name: 'capacity', label: 'Capacidad', type: 'number', value: c?.capacity ?? 30 }
    ]
  });
  if (!v) return;
  if (c) { db.update('courses', c.id, v); db.log('curso', `Curso ${v.name} actualizado`, me.id); toast('Curso actualizado', 'success'); }
  else {
    const row = db.insert('courses', { ...v, year: YEAR, shift: 'Jornada completa' });
    // asignaturas por defecto según nivel
    const subs = v.level === 'media' ? ['len', 'mat', 'his', 'cie', 'ing', 'art', 'efi', 'tec'] : v.level === 'parvularia' ? ['len', 'mat', 'ing', 'art', 'efi', 'mus'] : ['len', 'mat', 'his', 'cie', 'ing', 'art', 'efi', 'mus'];
    subs.filter(s => db.get('subjects', s)).forEach(s => db.insert('teaching', { id: `${row.id}|${s}`, courseId: row.id, subjectId: s, teacherId: v.headTeacherId }));
    db.log('curso', `Curso ${v.name} creado`, me.id); toast('Curso creado con su plan de asignaturas', 'success');
  }
}

export function render(el, { db, me, isAdmin, go }) {
  el.innerHTML = `${pageHead('Cursos', `Año escolar ${YEAR} · ${db.count('courses')} cursos`, `<button class="btn btn-ghost btn-sm" data-csv>⭳ CSV</button><button class="btn btn-primary btn-sm" data-new>+ Nuevo curso</button>`)}<div class="card" data-t></div>`;
  const rows = sortedCourses().map(c => ({ ...c, n: courseStudents(c.id).length, head: user(c.headTeacherId)?.name || '—', avg: courseAvg(c.id) }));
  smartTable(el.querySelector('[data-t]'), {
    id: 'courses', rows, pageSize: 12, search: r => r.name + r.head + r.room,
    filters: [{ key: 'level', label: 'Nivel', options: Object.entries(LEVELS) }],
    columns: [
      { key: 'name', label: 'Curso', render: r => `<b>${escape(r.name)}</b><div class="small muted">${escape(r.room || '')}</div>`, sort: r => r.grade },
      { key: 'level', label: 'Nivel', render: r => badge(LEVELS[r.level] || r.level, r.level === 'media' ? 'success' : r.level === 'basica' ? 'primary' : 'info') },
      { key: 'head', label: 'Profesor/a jefe' },
      { key: 'n', label: 'Matrícula', render: r => `${r.n} / ${r.capacity || 30}` },
      { key: 'avg', label: 'Promedio', render: r => gradeSpan(r.avg) },
      { key: 'x', label: '', sort: false, render: () => `<div class="actions"><button class="btn btn-sm btn-ghost" data-act="edit">Editar</button>${isAdmin ? '<button class="btn btn-sm btn-ghost" data-act="del" aria-label="Eliminar">🗑</button>' : ''}</div>` }
    ],
    onRow: r => go('/cursos/' + r.id),
    onAction: async (act, r) => {
      if (act === 'edit') edit(db, me, db.get('courses', r.id));
      if (act === 'del') {
        if (r.n) return toast('No se puede eliminar un curso con estudiantes activos. Trasládalos primero.', 'warning');
        if (await ask(`¿Eliminar ${r.name}? Se borrarán su horario y asignaciones.`, { danger: true, ok: 'Eliminar' })) {
          db.query('teaching', t => t.courseId === r.id).forEach(t => db.remove('teaching', t.id));
          db.query('schedule', t => t.courseId === r.id).forEach(t => db.remove('schedule', t.id));
          db.remove('courses', r.id); db.log('curso', `Curso ${r.name} eliminado`, me.id); toast('Curso eliminado', 'success');
        }
      }
    }
  });
  el.querySelector('[data-new]').onclick = () => edit(db, me);
  el.querySelector('[data-csv]').onclick = () => downloadCSV('cursos.csv', rows.map(r => ({ curso: r.name, nivel: LEVELS[r.level], sala: r.room, profesor_jefe: r.head, matricula: r.n, promedio: r.avg ?? '' })));
}

let tab = 'nomina';
export function detail(el, { db, me, go }, id) {
  const c = db.get('courses', id);
  if (!c) { el.innerHTML = '<div class="empty">Curso no encontrado</div>'; return; }
  const kids = courseStudents(id), subs = courseSubjects(id);
  el.innerHTML = `
    ${pageHead(c.name, `${LEVELS[c.level]} · ${escape(c.room || '')} · Profesor/a jefe: ${escape(user(c.headTeacherId)?.name || '—')}`, `<a class="btn btn-ghost btn-sm" href="#/cursos">← Cursos</a><button class="btn btn-sm" data-edit>Editar</button><a class="btn btn-sm btn-primary" href="#/informes?curso=${id}">⎙ Informes</a>`)}
    <div class="kpi-row">
      <div class="card stat"><span class="label">Matrícula</span><span class="value">${kids.length}</span></div>
      <div class="card stat"><span class="label">Promedio del curso</span><span class="value">${gradeSpan(courseAvg(id))}</span></div>
      <div class="card stat"><span class="label">Asistencia</span><span class="value">${pctTxt(kids.reduce((a, k) => a + (attendanceOf(k.id).pct || 0), 0) / Math.max(1, kids.length))}</span></div>
      <div class="card stat"><span class="label">En riesgo</span><span class="value">${kids.filter(k => riskOf(k.id).level).length}</span></div>
    </div>
    <div class="tabs" role="tablist">${[['nomina', 'Nómina'], ['asignaturas', 'Asignaturas y docentes'], ['horario', 'Horario']].map(([k, l]) => `<button class="tab ${tab === k ? 'active' : ''}" data-tab="${k}" role="tab" aria-selected="${tab === k}">${l}</button>`).join('')}</div>
    <div data-body></div>`;
  const body = el.querySelector('[data-body]');
  if (tab === 'nomina') {
    body.innerHTML = '<div class="card" data-t></div>';
    smartTable(body.querySelector('[data-t]'), {
      id: 'course-kids-' + id, rows: kids.map((k, i) => ({ ...k, n: i + 1, name: fullName(k), avg: generalAvg(k.id), att: attendanceOf(k.id).pct, risk: riskOf(k.id).level })), pageSize: 15, search: r => r.name + r.rut,
      columns: [
        { key: 'n', label: 'N°' }, { key: 'name', label: 'Estudiante', render: r => `<a href="#/estudiantes/${r.id}">${escape(r.name)}</a>${r.pie ? ' ' + badge('PIE', 'info') : ''}` },
        { key: 'rut', label: 'RUT' }, { key: 'avg', label: 'Promedio', render: r => gradeSpan(r.avg) },
        { key: 'att', label: 'Asistencia', render: r => `<span class="${r.att < 85 ? 'text-danger' : ''}">${pctTxt(r.att)}</span>` },
        { key: 'risk', label: 'Riesgo', render: r => r.risk ? badge(r.risk === 'alto' ? 'Alto' : 'Medio', r.risk === 'alto' ? 'danger' : 'warning') : '<span class="muted small">—</span>' }
      ], onRow: r => go('/estudiantes/' + r.id)
    });
  } else if (tab === 'asignaturas') {
    const teachers = db.query('users', u => u.role === 'profesor' && u.active !== false);
    const free = db.query('subjects', s => s.active !== false && !subs.some(x => x.subjectId === s.id));
    body.innerHTML = `<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Asignatura</th><th>Docente</th><th>Promedio</th><th>Horas/sem.</th><th></th></tr></thead><tbody>
      ${subs.map(t => `<tr><td><b>${escape(t.subject.name)}</b></td><td><select class="select" data-teacher="${t.id}" aria-label="Docente de ${escape(t.subject.short)}">${teachers.map(u => `<option value="${u.id}" ${u.id === t.teacherId ? 'selected' : ''}>${escape(u.name)}${(u.subjects || []).includes(t.subjectId) ? '' : ' (otra especialidad)'}</option>`).join('')}</select></td>
        <td>${gradeSpan(courseAvg(id, t.subjectId))}</td><td>${db.count('schedule', x => x.courseId === id && x.subjectId === t.subjectId)}</td><td><button class="btn btn-sm btn-ghost" data-unassign="${t.id}" aria-label="Quitar asignatura">✕</button></td></tr>`).join('')}
    </tbody></table></div>
    ${free.length ? `<div class="row" style="margin-top:12px"><select class="select" data-addsub style="max-width:260px" aria-label="Agregar asignatura">${free.map(s => `<option value="${s.id}">${escape(s.name)}</option>`).join('')}</select><button class="btn btn-sm" data-add>+ Agregar asignatura</button></div>` : ''}</div>`;
    body.querySelectorAll('[data-teacher]').forEach(s => s.addEventListener('change', () => {
      const t = db.get('teaching', s.dataset.teacher);
      db.update('teaching', t.id, { teacherId: s.value });
      db.query('schedule', x => x.courseId === id && x.subjectId === t.subjectId).forEach(x => db.update('schedule', x.id, { teacherId: s.value }));
      db.query('evaluations', e => e.courseId === id && e.subjectId === t.subjectId).forEach(e => db.update('evaluations', e.id, { teacherId: s.value }));
      db.log('asignacion', `${subject(t.subjectId).short} de ${c.name} asignada a ${user(s.value).name}`, me.id);
      toast('Docente asignado (horario y evaluaciones actualizados)', 'success');
    }));
    body.querySelectorAll('[data-unassign]').forEach(b => b.addEventListener('click', async () => {
      const t = db.get('teaching', b.dataset.unassign);
      if (!await ask(`¿Quitar ${subject(t.subjectId).name} del plan de ${c.name}?`, { danger: true, ok: 'Quitar' })) return;
      db.remove('teaching', t.id); db.log('asignacion', `${subject(t.subjectId).short} quitada de ${c.name}`, me.id); toast('Asignatura quitada', 'success');
    }));
    body.querySelector('[data-add]')?.addEventListener('click', () => {
      const sid = body.querySelector('[data-addsub]').value;
      const t = teachers.find(u => (u.subjects || []).includes(sid)) || teachers[0];
      db.insert('teaching', { id: `${id}|${sid}`, courseId: id, subjectId: sid, teacherId: t.id });
      db.log('asignacion', `${subject(sid).short} agregada a ${c.name}`, me.id); toast('Asignatura agregada', 'success');
    });
  } else {
    body.innerHTML = `<div class="card"><div class="card-head"><h3>Horario semanal</h3><a class="btn btn-sm" href="#/horarios?curso=${id}">Editar en constructor</a></div>${scheduleGrid(id)}</div>`;
  }
  el.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; detail(el, { db, me, go }, id); }));
  el.querySelector('[data-edit]').onclick = () => edit(db, me, c);
  void avatar;
}
