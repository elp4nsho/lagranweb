// Inicio del profesor: clases de hoy, pendientes y horario semanal.
import { escape, date, ago } from '../../../assets/core/ui.js';
import { pageHead, statCard, badge, empty } from '../shared/kit.js';
import { course, subject, subjectTone, scheduleGrid, teacherCourseIds, user, student, shortName } from '../shared/academic.js';
import { BLOCKS, NOW, ymd, schoolDay, dayIndex } from '../shared/school.js';

export function todayClasses(db, me) {
  const day = schoolDay(NOW), ds = ymd(day), di = dayIndex(day);
  return db.query('schedule', x => x.teacherId === me.id && x.day === di).sort((a, b) => a.block - b.block)
    .map(x => ({ ...x, date: ds, session: db.get('sessions', `${x.courseId}|${ds}|${x.block}`) }));
}

export function renderHome(el, { db, me }) {
  const classes = todayClasses(db, me);
  const day = schoolDay(NOW);
  const pendingEvals = db.query('evaluations', e => e.teacherId === me.id && e.status === 'pendiente');
  const myHw = db.query('homework', h => h.teacherId === me.id);
  const toReview = myHw.reduce((a, h) => a + Object.values(h.submissions || {}).filter(s => s.grade == null).length, 0);
  const unread = db.query('threads', t => t.teacherId === me.id && (t.unread || []).includes(me.id));
  const meets = db.query('meetings', m => m.teacherId === me.id && m.status === 'solicitada');
  const head = db.find('courses', c => c.headTeacherId === me.id);
  const nowMin = NOW.getHours() * 60 + NOW.getMinutes();
  el.innerHTML = `
    ${pageHead(`Hola, ${me.name.split(' ')[0]} 👋`, `${date(day, { weekday: 'long', day: 'numeric', month: 'long' })}${head ? ` · Profesor/a jefe de ${escape(head.name)}` : ''}`, '<a class="btn btn-primary btn-sm" href="#/libro">📘 Abrir libro de clases</a>')}
    <div class="kpi-row">
      ${statCard('Clases hoy', classes.length, `${classes.filter(c => c.session).length} registradas`)}
      ${statCard('Notas por ingresar', pendingEvals.length, 'evaluaciones rendidas')}
      ${statCard('Entregas por revisar', toReview, `${myHw.length} tareas publicadas`)}
      ${statCard('Mensajes sin leer', unread.length, `${meets.length} solicitudes de entrevista`)}
    </div>
    <div class="split">
      <div class="card"><div class="card-head"><h3>Mis clases de hoy</h3><a class="small" href="#/horario">Horario semanal</a></div>
        <div class="stack" style="gap:10px">${classes.map(c => {
          const [a, b] = BLOCKS[c.block]; const [h, m] = a.split(':').map(Number); const live = nowMin >= h * 60 + m && nowMin < h * 60 + m + 60 && ymd(NOW) === c.date;
          return `<a class="card class-card" style="--tone:${subjectTone(c.subjectId)};padding:12px;text-decoration:none;color:inherit" href="#/libro?curso=${c.courseId}&asig=${c.subjectId}&fecha=${c.date}&bloque=${c.block}">
            <span class="time">${a}<small>${b}</small></span><span class="bar"></span>
            <span style="flex:1;min-width:0"><b>${escape(subject(c.subjectId).short)} · ${escape(course(c.courseId).name)}</b><br><span class="small muted">${c.session ? escape(c.session.topic || 'Sin tema') : 'Asistencia y tema pendientes'}</span></span>
            ${live ? badge('En curso', 'primary') : c.session ? badge('Registrada', 'success') : badge('Pendiente', 'warning')}</a>`;
        }).join('') || empty('No tienes clases hoy', '☀')}</div></div>
      <div class="stack">
        <div class="card"><h3>Pendientes</h3><ul class="list compact">
          ${pendingEvals.map(e => `<li><span class="small">✓ Ingresar notas: <a href="#/notas?curso=${e.courseId}&asig=${e.subjectId}&sem=${e.semester}">${escape(e.name)}</a> <span class="muted">· ${escape(course(e.courseId).name)}</span></span></li>`).join('')}
          ${meets.map(m => `<li><span class="small">☕ Entrevista solicitada por <a href="#/entrevistas">${escape(user(m.guardianId)?.name || '')}</a></span></li>`).join('')}
          ${unread.map(t => `<li><span class="small">✉ <a href="#/mensajes">${escape(t.subject)}</a> <span class="muted">· ${ago(t.lastAt)}</span></span></li>`).join('')}
          ${!pendingEvals.length && !meets.length && !unread.length ? '<li class="muted small">¡Todo al día!</li>' : ''}
        </ul></div>
        <div class="card"><h3>Mis cursos</h3><div class="row" style="gap:6px">${teacherCourseIds(me.id).map(id => `<a class="chip" href="#/cursos/${id}">${escape(course(id).name)}</a>`).join('')}</div></div>
        <div class="card"><h3>Anotaciones recientes</h3><ul class="list compact">${db.query('annotations', a => a.teacherId === me.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4).map(a => `<li class="small">${a.type === 'positiva' ? '🟢' : a.type === 'negativa' ? '🔴' : '🔵'} <span><b>${escape(shortName(student(a.studentId)))}</b> · ${escape(a.text)}</span></li>`).join('') || '<li class="muted small">Sin anotaciones</li>'}</ul></div>
      </div>
    </div>`;
}

export function renderSchedule(el, { me }) {
  el.innerHTML = `${pageHead('Mi horario', 'Bloques semanales asignados por UTP')}<div class="card">${scheduleGrid(null, { teacherId: me.id })}</div>`;
}
