// Constructor de horarios: grilla por curso (asignatura/docente por bloque) con detección de choques.
import { escape, modal, toast, confirm as ask, downloadCSV } from '../../../assets/core/ui.js';
import { pageHead, badge, formData } from '../shared/kit.js';
import { sortedCourses, scheduleGrid, courseSubjects, subject, user, course } from '../shared/academic.js';
import { DAYS, BLOCKS } from '../shared/school.js';

export function conflicts(db) {
  const by = {};
  db.all('schedule').forEach(x => { (by[`${x.teacherId}|${x.day}|${x.block}`] ||= []).push(x); });
  return Object.values(by).filter(l => l.length > 1).flat();
}

let sel = null;
export function render(el, { db, me, params }) {
  const courses = sortedCourses();
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  sel = q.get('curso') || sel || courses[0]?.id;
  if (!db.get('courses', sel)) sel = courses[0]?.id;
  const conf = conflicts(db);
  const mine = conf.filter(x => x.courseId === sel);
  const plan = courseSubjects(sel);
  const rows = db.query('schedule', x => x.courseId === sel);
  el.innerHTML = `
    ${pageHead('Constructor de horarios', 'Haz clic en un bloque para asignar asignatura y docente. Los choques de docentes se marcan en rojo.', `<button class="btn btn-ghost btn-sm" data-csv>⭳ CSV</button><button class="btn btn-sm" data-clear>Vaciar curso</button>`)}
    <div class="row">
      <label class="label" for="tt-course">Curso</label>
      <select class="select" id="tt-course" style="max-width:240px">${courses.map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${escape(c.name)}</option>`).join('')}</select>
      ${conf.length ? badge(`${conf.length / 2 | 0} choque(s) en el colegio`, 'danger') : badge('Sin choques de horario', 'success')}
    </div>
    <div class="split">
      <div class="card">${scheduleGrid(sel, { editable: true, highlightToday: false })}</div>
      <div class="stack">
        <div class="card"><h3>Carga por asignatura</h3><ul class="list compact">${plan.map(t => { const n = rows.filter(x => x.subjectId === t.subjectId).length, goal = t.subject.hours || 0; return `<li style="justify-content:space-between"><span class="small"><span class="dot-tone" style="--tone:var(--primary)"></span>${escape(t.subject.short)}<br><span class="muted">${escape(user(t.teacherId)?.name || '—')}</span></span><span class="${n < goal ? 'text-warning' : n > goal ? 'text-danger' : 'text-success'}"><b>${n}</b>/${goal}</span></li>`; }).join('')}</ul>
          <p class="small muted mb-0">${rows.length} de ${DAYS.length * BLOCKS.length} bloques asignados.</p></div>
        <div class="card"><h3>Choques en este curso</h3>${mine.length ? `<ul class="list compact">${mine.map(x => { const other = conf.find(o => o !== x && o.teacherId === x.teacherId && o.day === x.day && o.block === x.block); return `<li class="small"><span>${badge('Choque', 'danger')} ${DAYS[x.day]} bloque ${x.block + 1}: ${escape(user(x.teacherId)?.name)} también en ${escape(course(other?.courseId).name)}</span></li>`; }).join('')}</ul>` : '<p class="muted small mb-0">Ninguno 🎉</p>'}</div>
      </div>
    </div>`;
  mine.forEach(x => el.querySelector(`[data-cell="${x.day}|${x.block}"]`)?.classList.add('conflict'));
  el.querySelector('#tt-course').onchange = e => { sel = e.target.value; location.hash = '#/horarios?curso=' + sel; };
  el.querySelectorAll('[data-cell]').forEach(td => td.addEventListener('click', () => editCell(db, me, sel, ...td.dataset.cell.split('|').map(Number))));
  el.querySelector('[data-csv]').onclick = () => downloadCSV(`horario-${sel}.csv`, BLOCKS.map(([a, b], bi) => ({ bloque: `${bi + 1} (${a}-${b})`, ...Object.fromEntries(DAYS.map((d, di) => { const x = rows.find(r => r.day === di && r.block === bi); return [d, x ? `${subject(x.subjectId).short} - ${user(x.teacherId)?.name || ''}` : '']; })) })));
  el.querySelector('[data-clear]').onclick = async () => {
    if (!await ask(`¿Vaciar todo el horario de ${course(sel).name}?`, { danger: true, ok: 'Vaciar' })) return;
    rows.forEach(r => db.remove('schedule', r.id)); db.log('horario', `Horario de ${course(sel).name} vaciado`, me.id); toast('Horario vaciado', 'success');
  };
  void params;
}

function editCell(db, me, courseId, day, block) {
  const id = `${courseId}|${day}|${block}`, cur = db.get('schedule', id);
  const plan = courseSubjects(courseId);
  const teachers = db.query('users', u => u.role === 'profesor' && u.active !== false);
  const busyMsg = tid => { const o = db.find('schedule', x => x.teacherId === tid && x.day === day && x.block === block && x.courseId !== courseId); return o ? ` — ocupado en ${course(o.courseId).name}` : ''; };
  const m = modal({
    title: `${course(courseId).name} · ${DAYS[day]} · Bloque ${block + 1} (${BLOCKS[block].join('–')})`,
    body: `<form class="stack" novalidate>
      <div class="field"><label for="c-sub">Asignatura</label><select class="select" id="c-sub" name="subjectId">${plan.map(t => `<option value="${t.subjectId}" ${cur?.subjectId === t.subjectId ? 'selected' : ''}>${escape(t.subject.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="c-tea">Docente</label><select class="select" id="c-tea" name="teacherId"></select><small class="muted" data-hint></small></div>
    </form>`,
    foot: `${cur ? '<button class="btn btn-danger" data-free>Dejar libre</button>' : ''}<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-save>Guardar bloque</button>`
  });
  const f = m.el.querySelector('form');
  const fillTeachers = () => {
    const sid = f.elements.subjectId.value, def = plan.find(t => t.subjectId === sid)?.teacherId;
    const chosen = cur && cur.subjectId === sid ? cur.teacherId : def;
    f.elements.teacherId.innerHTML = teachers.map(u => `<option value="${u.id}" ${u.id === chosen ? 'selected' : ''}>${escape(u.name)}${busyMsg(u.id)}</option>`).join('');
    hint();
  };
  const hint = () => { const b = busyMsg(f.elements.teacherId.value); m.el.querySelector('[data-hint]').innerHTML = b ? `<span class="text-danger">⚠ Docente${escape(b)}. Se generará un choque.</span>` : 'Docente disponible en este bloque.'; };
  f.elements.subjectId.onchange = fillTeachers; f.elements.teacherId.onchange = hint;
  fillTeachers();
  m.el.querySelector('[data-save]').onclick = () => {
    const v = formData(f);
    if (cur) db.update('schedule', id, v); else db.insert('schedule', { id, courseId, day, block, ...v });
    db.log('horario', `${course(courseId).name}: ${DAYS[day]} B${block + 1} → ${subject(v.subjectId).short} (${user(v.teacherId).name})`, me.id);
    toast(busyMsg(v.teacherId) ? 'Bloque guardado con choque de horario' : 'Bloque guardado', busyMsg(v.teacherId) ? 'warning' : 'success');
    m.close();
  };
  m.el.querySelector('[data-free]')?.addEventListener('click', () => { db.remove('schedule', id); db.log('horario', `${course(courseId).name}: ${DAYS[day]} B${block + 1} liberado`, me.id); toast('Bloque liberado', 'success'); m.close(); });
}
