// Vistas académicas del pupilo (también las usa la app del estudiante).
import { escape, date, dateTime, barChart, toast, modal } from '../../../assets/core/ui.js';
import { pageHead, statCard, badge, empty, formData } from '../shared/kit.js';
import { course, subject, user, generalAvg, attendanceOf, gradesTable, scheduleGrid, homeworkOf, hwStatus, annBadge, gradeSpan, pctTxt, fullName, months, monthLabel, evalsOf, subjectTone, commsFor } from '../shared/academic.js';
import { NOW, ymd, currentSemester } from '../shared/school.js';

export function renderSummary(el, ctx) {
  const { db, me, child: s } = ctx;
  const c = course(s.courseId), att = attendanceOf(s.id), today = ymd(NOW);
  const upcoming = db.query('evaluations', e => e.courseId === s.courseId && e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  const hw = homeworkOf(s.courseId).filter(h => h.due >= today && !h.submissions?.[s.id]).slice(0, 5);
  const recent = db.query('evaluations', e => e.courseId === s.courseId && e.scores?.[s.id] != null).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const newAnn = db.query('annotations', a => a.studentId === s.id && !a.seenByGuardian);
  const isGuardian = me.role === 'apoderado';
  const comms = isGuardian ? commsFor(ctx.kids.map(k => k.courseId)).filter(x => x.requireAck && !x.reads?.[me.id]) : [];
  const pend = isGuardian ? db.query('payments', p => p.guardianId === me.id && (p.status === 'vencido' || p.status === 'pendiente')) : [];
  el.innerHTML = `
    ${pageHead(isGuardian ? `${escape(s.firstName)} ${escape(s.lastName)}` : `Hola, ${escape(s.firstName)} 👋`, `${escape(c.name)} · Profesor/a jefe: ${escape(user(c.headTeacherId)?.name || '—')}`)}
    ${isGuardian && ctx.kids.length > 1 ? `<div class="child-switch">${ctx.kids.map(k => `<button class="chip ${k.id === s.id ? 'active' : ''}" data-child="${k.id}"><span class="avatar" style="--av:var(--accent)">${escape(k.firstName[0])}</span>${escape(k.firstName)} · ${escape(course(k.courseId).name)}</button>`).join('')}</div>` : ''}
    ${comms.length ? `<a class="notice warn" href="#/comunicados" style="display:block;text-decoration:none;color:inherit">📣 Tienes ${comms.length} comunicado(s) que requieren confirmación de lectura.</a>` : ''}
    <div class="kpi-row">
      ${statCard('Promedio general', gradeSpan(generalAvg(s.id)), `${currentSemester()}° semestre: ${gradeSpan(generalAvg(s.id, currentSemester()))}`)}
      ${statCard('Asistencia', `<span class="${att.pct < 85 ? 'text-danger' : ''}">${pctTxt(att.pct)}</span>`, `${att.absent} inasistencias · mínimo 85%`)}
      ${statCard('Anotaciones nuevas', newAnn.length, `${db.count('annotations', a => a.studentId === s.id && a.type === 'positiva')} positivas en el año`)}
      ${isGuardian ? statCard('Pagos pendientes', pend.length, pend.some(p => p.status === 'vencido') ? '<span class="text-danger">Hay cuotas vencidas</span>' : 'Al día con vencidos') : statCard('Tareas por entregar', hw.length, 'próximas fechas')}
    </div>
    <div class="grid-3">
      <div class="card"><div class="card-head"><h3>Últimas notas</h3><a class="small" href="#/notas">Ver todas</a></div><ul class="list compact">${recent.map(e => `<li style="justify-content:space-between"><span class="small"><b>${escape(subject(e.subjectId).short)}</b><br><span class="muted">${escape(e.name)}</span></span>${gradeSpan(e.scores[s.id])}</li>`).join('') || '<li class="muted small">Sin notas aún</li>'}</ul></div>
      <div class="card"><div class="card-head"><h3>Próximas evaluaciones</h3></div><ul class="list compact">${upcoming.map(e => `<li><span class="pill-num">${new Date(e.date + 'T12:00').getDate()}</span><span class="small"><b>${escape(subject(e.subjectId).short)}</b> · ${escape(e.type)}<br><span class="muted">${date(e.date + 'T12:00', { weekday: 'long', day: 'numeric', month: 'short' })}</span></span></li>`).join('') || '<li class="muted small">Sin evaluaciones programadas</li>'}</ul></div>
      <div class="card"><div class="card-head"><h3>Tareas pendientes</h3><a class="small" href="#/tareas">Ver</a></div><ul class="list compact">${hw.map(h => `<li><span class="dot-tone" style="--tone:${subjectTone(h.subjectId)};margin-top:6px"></span><span class="small"><b>${escape(h.title)}</b><br><span class="muted">${escape(subject(h.subjectId).short)} · entrega ${date(h.due + 'T12:00', { day: 'numeric', month: 'short' })}</span></span></li>`).join('') || '<li class="muted small">¡Nada pendiente!</li>'}</ul></div>
    </div>`;
  el.querySelectorAll('[data-child]').forEach(b => b.onclick = () => { ctx.state.child = b.dataset.child; try { localStorage.setItem('aula360:child:' + me.id, b.dataset.child); } catch (e) { /* */ } ctx.refresh(); });
}

let sem = null;
export function renderGrades(el, ctx) {
  const { child: s } = ctx;
  sem ||= currentSemester();
  el.innerHTML = `${pageHead('Notas', `${escape(fullName(s))} · ${escape(course(s.courseId).name)}`)}
    <div class="card stack"><div class="row">${[1, 2].map(x => `<button class="chip ${sem === x ? 'active' : ''}" data-sem="${x}">${x}° semestre</button>`).join('')}</div>
    ${gradesTable(s.id, sem)}
    <p class="small muted mb-0">Escala 1,0 – 7,0. Notas en rojo bajo 4,0 (insuficiente). Pasa el cursor o mantén presionada una nota para ver su detalle.</p></div>
    <div class="card"><h3>Detalle de evaluaciones</h3><div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Asignatura</th><th>Evaluación</th><th>Pond.</th><th>Nota</th></tr></thead><tbody>
    ${evalsOf(s.courseId, null, sem).sort((a, b) => b.date.localeCompare(a.date)).map(e => `<tr><td class="nowrap small">${date(e.date + 'T12:00')}</td><td>${escape(subject(e.subjectId).short)}</td><td class="small">${escape(e.name)}</td><td>${e.weight}%</td><td>${e.scores?.[s.id] != null ? gradeSpan(e.scores[s.id]) : `<span class="small muted">${e.status === 'programada' ? 'Programada' : 'Pendiente'}</span>`}</td></tr>`).join('')}
    </tbody></table></div></div>`;
  el.querySelectorAll('[data-sem]').forEach(b => b.onclick = () => { sem = +b.dataset.sem; renderGrades(el, ctx); });
}

export function renderAttendance(el, { db, child: s }) {
  const att = attendanceOf(s.id);
  const data = months().map(m => { const x = att.byMonth[m]; return { label: monthLabel(m), value: x && x.days ? Math.round((1 - x.absent / x.days) * 100) : 0, color: x && x.days && (1 - x.absent / x.days) < .85 ? 'var(--danger)' : null }; }).filter(d => d.value);
  const recent = db.query('sessions', x => x.courseId === s.courseId && x.abs?.[s.id]).sort((a, b) => b.date.localeCompare(a.date) || a.block - b.block).slice(0, 14);
  el.innerHTML = `${pageHead('Asistencia', `${escape(fullName(s))} · mínimo exigido para la promoción: 85%`)}
    <div class="kpi-row">${statCard('Asistencia anual', `<span class="${att.pct < 85 ? 'text-danger' : ''}">${pctTxt(att.pct)}</span>`)}${statCard('Días hábiles', att.days)}${statCard('Inasistencias', att.absent)}${statCard('Atrasos', att.late)}</div>
    ${att.pct < 85 ? '<div class="notice danger">La asistencia está bajo el 85% requerido. Justifica las inasistencias con certificado en secretaría o por mensaje al profesor/a jefe.</div>' : ''}
    <div class="grid-2"><div class="card"><h3>Asistencia por mes (%)</h3>${barChart(data, { format: v => v + '%' })}</div>
    <div class="card"><h3>Registro reciente en el libro de clases</h3><ul class="list compact">${recent.map(x => `<li>${x.abs[s.id] === 'A' ? badge('Ausente', 'danger') : badge('Atraso', 'warning')}<span class="small">${date(x.date + 'T12:00', { weekday: 'short', day: 'numeric', month: 'short' })} · Bloque ${x.block + 1} · ${escape(subject(x.subjectId).short)}</span></li>`).join('') || '<li class="muted small">Sin inasistencias ni atrasos recientes 🎉</li>'}</ul></div></div>`;
}

export function renderSchedule(el, { child: s }) {
  el.innerHTML = `${pageHead('Horario', `${escape(course(s.courseId).name)} · ${escape(course(s.courseId).room || '')}`)}<div class="card">${scheduleGrid(s.courseId)}</div>`;
}

export function renderHomework(el, ctx) {
  const { db, me, child: s } = ctx;
  const canSubmit = me.role === 'estudiante';
  const list = homeworkOf(s.courseId).sort((a, b) => b.due.localeCompare(a.due));
  const today = ymd(NOW);
  const open = list.filter(h => h.due >= today), past = list.filter(h => h.due < today);
  const card = h => {
    const [label, kind, sub] = hwStatus(h, s.id);
    return `<div class="card"><div class="row between"><div><span class="small muted"><span class="dot-tone" style="--tone:${subjectTone(h.subjectId)}"></span>${escape(subject(h.subjectId).short)} · ${escape(user(h.teacherId)?.name || '')}</span><h3 style="margin:6px 0">${escape(h.title)}</h3></div>${badge(label, kind)}</div>
      <p class="small">${escape(h.description || '')}</p>${h.attachment ? `<p class="small muted">📎 ${escape(h.attachment)}</p>` : ''}
      <div class="row between"><span class="small muted">Entrega: <b>${date(h.due + 'T12:00', { weekday: 'long', day: 'numeric', month: 'long' })}</b></span>
      ${sub ? `<span class="small">📎 ${escape(sub.file)} · ${dateTime(sub.at)}${sub.grade != null ? ` · Nota ${gradeSpan(sub.grade)}` : ''}</span>` : ''}
      ${canSubmit && !sub ? `<button class="btn btn-sm btn-primary" data-sub="${h.id}">Entregar tarea</button>` : ''}</div>
      ${sub?.feedback ? `<div class="notice ok small" style="margin-top:10px">💬 ${escape(sub.feedback)}</div>` : ''}</div>`;
  };
  el.innerHTML = `${pageHead('Tareas', `${escape(course(s.courseId).name)} · ${open.length} abiertas`)}
    <h3>Por entregar</h3><div class="grid-2">${open.map(card).join('') || `<div class="card">${empty('No hay tareas abiertas', '🎉')}</div>`}</div>
    <h3 style="margin-top:12px">Anteriores</h3><div class="grid-2">${past.map(card).join('')}</div>`;
  el.querySelectorAll('[data-sub]').forEach(b => b.onclick = () => {
    const h = db.get('homework', b.dataset.sub);
    const m = modal({ title: `Entregar: ${h.title}`, body: `<form class="stack" novalidate><div class="field"><label for="sb-f">Archivo (simulado)</label><input class="input" id="sb-f" type="file" name="file" accept=".pdf,.jpg,.png,.docx"></div><div class="field"><label for="sb-n">Comentario para el profesor/a</label><textarea class="textarea" id="sb-n" name="note" style="min-height:80px"></textarea></div></form>`, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Entregar</button>' });
    m.el.querySelector('[data-ok]').onclick = () => {
      const f = m.el.querySelector('form'), file = f.file.files[0]?.name || `tarea_${s.firstName.toLowerCase()}.pdf`, v = formData(f);
      db.update('homework', h.id, x => ({ submissions: { ...x.submissions, [s.id]: { at: new Date().toISOString(), status: h.due < ymd(NOW) ? 'atrasada' : 'entregada', note: v.note, file } } }));
      db.log('tarea', `${s.firstName} ${s.lastName} entregó "${h.title}"`, me.id);
      toast('¡Tarea entregada! Tu profesor/a ya puede revisarla.', 'success');
      m.close();
    };
  });
}

export function renderAnnotations(el, { db, me, child: s }) {
  const list = db.query('annotations', a => a.studentId === s.id).sort((a, b) => b.date.localeCompare(a.date));
  const unseen = list.filter(a => !a.seenByGuardian);
  el.innerHTML = `${pageHead('Anotaciones', `Hoja de vida de ${escape(s.firstName)}`, unseen.length && me.role === 'apoderado' ? `<button class="btn btn-sm btn-primary" data-seen>Marcar ${unseen.length} como vistas</button>` : '')}
    <div class="row">${badge(list.filter(a => a.type === 'positiva').length + ' positivas', 'success')}${badge(list.filter(a => a.type === 'negativa').length + ' negativas', 'danger')}${badge(list.filter(a => a.type === 'observacion').length + ' observaciones', 'info')}</div>
    <div class="card"><ul class="list">${list.map(a => `<li>${annBadge(a.type)}<span style="flex:1"><b class="small">${date(a.date + 'T12:00')} · ${escape(subject(a.subjectId).short)} · ${escape(user(a.teacherId)?.name || '')}</b>${!a.seenByGuardian ? ' ' + badge('Nueva', 'primary') : ''}<br>${escape(a.text)}</span></li>`).join('') || `<li>${empty('Sin anotaciones')}</li>`}</ul></div>`;
  el.querySelector('[data-seen]')?.addEventListener('click', () => { unseen.forEach(a => db.update('annotations', a.id, { seenByGuardian: true })); db.log('anotacion', `${me.name} revisó ${unseen.length} anotaciones`, me.id); toast('Anotaciones marcadas como vistas', 'success'); });
}
