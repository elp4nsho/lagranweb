// Resumen de Dirección/UTP: KPIs, gráficos de asistencia, promedios, riesgo y admisión.
import { escape, lineChart, barChart, donutChart, date, ago } from '../../../assets/core/ui.js';
import { pageHead, statCard, hBars, badge } from '../shared/kit.js';
import { sortedCourses, courseStudents, attendanceOf, courseAvg, riskOf, fullName, course, fmtGrade, pctTxt, months, monthLabel, subject, user } from '../shared/academic.js';
import { ADM_STATUS, NOW, ymd } from '../shared/school.js';

export function render(el, { db, me }) {
  const studs = db.query('students', s => s.status === 'activo');
  const atts = new Map(studs.map(s => [s.id, attendanceOf(s.id)]));
  const tot = [...atts.values()].reduce((a, x) => ({ d: a.d + x.days, ab: a.ab + x.absent }), { d: 0, ab: 0 });
  const attPct = tot.d ? (1 - tot.ab / tot.d) * 100 : 0;
  const courses = sortedCourses();
  const avgs = courses.map(c => ({ c, v: courseAvg(c.id) }));
  const schoolAvg = avgs.filter(a => a.v != null).reduce((a, b, _, arr) => a + b.v / arr.length, 0);
  const risks = studs.map(s => ({ s, r: riskOf(s.id) })).filter(x => x.r.level).sort((a, b) => (a.r.level === 'alto' ? -1 : 1) - (b.r.level === 'alto' ? -1 : 1) || (a.r.avg ?? 7) - (b.r.avg ?? 7));
  const apps = db.all('applications');
  const pays = db.query('payments', p => p.status !== 'futuro');
  const paid = pays.filter(p => p.status === 'pagado').reduce((a, p) => a + p.amount, 0), due = pays.reduce((a, p) => a + p.amount, 0);

  // asistencia por mes (todas las familias)
  const byMonth = months().map(m => {
    let d = 0, ab = 0; atts.forEach(a => { const x = a.byMonth[m]; if (x) { d += x.days; ab += x.absent; } });
    return { label: monthLabel(m), value: d ? Math.round((1 - ab / d) * 1000) / 10 : 0 };
  }).filter(x => x.value);
  const funnel = [['Postulaciones', apps.length], ['En revisión o más', apps.filter(a => a.status !== 'recibida').length], ['Entrevistadas', apps.filter(a => ['entrevista', 'aceptada', 'matriculada', 'espera', 'rechazada'].includes(a.status)).length], ['Aceptadas', apps.filter(a => ['aceptada', 'matriculada'].includes(a.status)).length], ['Matriculadas', apps.filter(a => a.status === 'matriculada').length]];
  const anns = db.all('annotations');
  const today = ymd(NOW);
  const upcoming = db.query('evaluations', e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
  const pendingEval = db.count('evaluations', e => e.status === 'pendiente');

  el.innerHTML = `
    ${pageHead(`Hola, ${me.name.split(' ')[0]}`, `Resumen académico al ${date(NOW, { day: 'numeric', month: 'long', year: 'numeric' })}`, `<a class="btn btn-ghost btn-sm" href="#/informes">⎙ Informes</a><a class="btn btn-primary btn-sm" href="#/comunicados">📣 Nuevo comunicado</a>`)}
    <div class="kpi-row">
      ${statCard('Estudiantes activos', studs.length, `${courses.length} cursos · ${db.count('users', u => u.role === 'profesor' && u.active !== false)} docentes`)}
      ${statCard('Asistencia promedio', pctTxt(attPct), 'Meta institucional 90%', `<span class="delta ${attPct >= 90 ? 'up' : 'down'}">${attPct >= 90 ? '▲ sobre la meta' : '▼ bajo la meta'}</span>`)}
      ${statCard('Promedio general', `<span class="grade ${schoolAvg < 4 ? 'grade-low' : ''}">${fmtGrade(schoolAvg)}</span>`, 'Escala 1,0 – 7,0')}
      ${statCard('Estudiantes en riesgo', risks.length, `${risks.filter(r => r.r.level === 'alto').length} en riesgo alto`, `<span class="delta down">requieren seguimiento</span>`)}
      ${statCard('Recaudación mensualidades', `${due ? Math.round(paid / due * 100) : 0}%`, `${pays.filter(p => p.status === 'vencido').length} cuotas vencidas`)}
      ${statCard('Postulaciones ' + (db.getValue('site').admissionYear), apps.length, `${apps.filter(a => a.status === 'recibida').length} sin revisar · ${pendingEval} notas por ingresar`)}
    </div>
    <div class="grid-2">
      <div class="card"><div class="card-head"><h3>Asistencia mensual (%)</h3>${badge('Toda la matrícula', 'info')}</div><div class="chart-wrap">${byMonth.length ? lineChart(byMonth, { format: v => v + '%' }) : '<p class="muted">Sin datos</p>'}</div></div>
      <div class="card"><div class="card-head"><h3>Promedio por curso</h3><a class="small" href="#/cursos">Ver cursos</a></div><div class="chart-wrap">${barChart(avgs.map(a => ({ label: a.c.name.replace(' Básico', '°B').replace(' Medio', 'M').replace('°°', '°'), value: a.v || 0, color: a.v != null && a.v < 4.8 ? 'var(--warning)' : null })), { format: v => fmtGrade(v) })}</div></div>
    </div>
    <div class="split">
      <div class="card"><div class="card-head"><h3>Estudiantes en riesgo académico</h3><a class="small" href="#/estudiantes">Ver todos</a></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Estudiante</th><th>Curso</th><th>Prom.</th><th>Asist.</th><th>Motivo</th></tr></thead><tbody>
        ${risks.slice(0, 8).map(({ s, r }) => `<tr class="clickable" data-href="#/estudiantes/${s.id}"><td><a href="#/estudiantes/${s.id}">${escape(fullName(s))}</a></td><td class="nowrap">${escape(course(s.courseId).name)}</td><td><span class="grade ${r.avg < 4 ? 'grade-low' : ''}">${fmtGrade(r.avg)}</span></td><td class="${r.att < 85 ? 'text-danger' : ''}">${pctTxt(r.att)}</td><td>${badge(r.level === 'alto' ? 'Alto' : 'Medio', r.level === 'alto' ? 'danger' : 'warning')} <span class="small muted">${escape(r.reasons.join(', '))}</span></td></tr>`).join('') || '<tr><td colspan="5"><div class="empty">Sin estudiantes en riesgo 🎉</div></td></tr>'}
        </tbody></table></div></div>
      <div class="card"><div class="card-head"><h3>Embudo de admisión</h3><a class="small" href="#/admision">Revisar</a></div>
        <div class="funnel">${hBars(funnel.map(([label, value], i) => ({ label, value, cls: i === 4 ? 'success' : '' })))}</div>
        <hr><div class="row" style="gap:6px">${Object.entries(ADM_STATUS).map(([k, [l, kind]]) => `<span class="badge badge-${kind}">${l}: ${apps.filter(a => a.status === k).length}</span>`).join('')}</div>
      </div>
    </div>
    <div class="grid-3">
      <div class="card"><h3>Anotaciones del año</h3>${donutChart([{ label: 'Positivas', value: anns.filter(a => a.type === 'positiva').length, color: 'var(--success)' }, { label: 'Negativas', value: anns.filter(a => a.type === 'negativa').length, color: 'var(--danger)' }, { label: 'Observaciones', value: anns.filter(a => a.type === 'observacion').length, color: 'var(--info)' }], { size: 140, label: String(anns.length) })}</div>
      <div class="card"><div class="card-head"><h3>Próximas evaluaciones</h3><a class="small" href="#/evaluaciones">Calendario</a></div><ul class="list compact">${upcoming.map(e => `<li><span class="pill-num">${new Date(e.date + 'T12:00').getDate()}</span><span class="small"><b>${escape(subject(e.subjectId).short)}</b> · ${escape(course(e.courseId).name)}<br><span class="muted">${escape(e.type)} · ${date(e.date + 'T12:00', { weekday: 'short', day: 'numeric', month: 'short' })}</span></span></li>`).join('') || '<li class="muted">Sin evaluaciones próximas</li>'}</ul></div>
      <div class="card"><div class="card-head"><h3>Actividad reciente</h3>${me.role === 'admin' ? '<a class="small" href="#/bitacora">Bitácora</a>' : ''}</div><ul class="list compact">${db.all('_log').slice(0, 7).map(l => `<li class="feed-item"><span class="ico" aria-hidden="true">•</span><span class="small">${escape(l.detail || l.action)}<br><span class="muted">${ago(l.at)}${l.user && user(l.user) ? ' · ' + escape(user(l.user).name) : ''}</span></span></li>`).join('') || '<li class="muted small">Aún no hay actividad registrada.</li>'}</ul></div>
    </div>`;
  el.querySelectorAll('tr[data-href]').forEach(tr => tr.addEventListener('click', e => { if (!e.target.closest('a')) location.hash = tr.dataset.href; }));
  void courseStudents;
}
